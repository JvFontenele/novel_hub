import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCoverImageUrl, novelsApi } from '@/api/novels'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { AxiosError } from 'axios'

function formatDate(iso: string | null) {
  if (!iso) return 'sem data'
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 86_400_000) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function NovelDetailPage() {
  const CHAPTERS_PAGE_SIZE = 20
  const CONTINUE_READING_PAGE_SIZE = 10000
  const { novelId } = useParams<{ novelId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [progressInput, setProgressInput] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'chapters' | 'events'>('chapters')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [queuedChapterIds, setQueuedChapterIds] = useState<string[]>([])
  const [chapterPage, setChapterPage] = useState(1)

  const { data: novel, isLoading } = useQuery({
    queryKey: ['novel', novelId],
    queryFn: () => novelsApi.get(novelId!),
    enabled: !!novelId,
  })

  const { data: chapters } = useQuery({
    queryKey: ['chapters', novelId, chapterPage, CHAPTERS_PAGE_SIZE],
    queryFn: () => novelsApi.chapters(novelId!, chapterPage, CHAPTERS_PAGE_SIZE),
    enabled: !!novelId && activeTab === 'chapters',
  })

  const { data: allChapters } = useQuery({
    queryKey: ['chapters-continue-reading', novelId],
    queryFn: () => novelsApi.chapters(novelId!, 1, CONTINUE_READING_PAGE_SIZE),
    enabled: !!novelId,
  })

  const { data: events } = useQuery({
    queryKey: ['events', novelId],
    queryFn: () => novelsApi.events(novelId!),
    enabled: !!novelId && activeTab === 'events',
  })

  const progressMutation = useMutation({
    mutationFn: (n: number) => novelsApi.updateProgress(novelId!, n),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['novel', novelId] })
      queryClient.invalidateQueries({ queryKey: ['novels'] })
      setProgressInput('')
    },
  })

  const toggleSourceMutation = useMutation({
    mutationFn: ({ sourceId, enabled }: { sourceId: string; enabled: boolean }) =>
      novelsApi.toggleSource(sourceId, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['novel', novelId] }),
  })

  const reprocessSourceMutation = useMutation({
    mutationFn: (sourceId: string) => novelsApi.triggerSourceCollection(sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['novel', novelId] })
      queryClient.invalidateQueries({ queryKey: ['events', novelId] })
      queryClient.invalidateQueries({ queryKey: ['chapters', novelId] })
      queryClient.invalidateQueries({ queryKey: ['novels'] })
    },
  })

  const fetchContentMutation = useMutation({
    mutationFn: (chapterId: string) => novelsApi.fetchChapterContent(novelId!, chapterId),
    onSuccess: (_, chapterId) => {
      setQueuedChapterIds((current) => (current.includes(chapterId) ? current : [...current, chapterId]))
      queryClient.invalidateQueries({ queryKey: ['chapters', novelId] })
    },
  })

  const fetchAllContentMutation = useMutation({
    mutationFn: () => novelsApi.fetchAllChapterContent(novelId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', novelId] })
    },
  })

  useEffect(() => {
    if (!chapters?.items.length || queuedChapterIds.length === 0) return

    const completedIds = new Set(
      chapters.items.filter((chapter) => chapter.hasContent).map((chapter) => chapter.chapterId),
    )

    setQueuedChapterIds((current) => current.filter((chapterId) => !completedIds.has(chapterId)))
  }, [chapters, queuedChapterIds.length])

  useEffect(() => {
    if (!novelId || queuedChapterIds.length === 0) return

    const intervalId = window.setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['chapters', novelId] })
    }, 3000)

    return () => window.clearInterval(intervalId)
  }, [novelId, queryClient, queuedChapterIds.length])

  const deleteNovelMutation = useMutation({
    mutationFn: () => novelsApi.remove(novelId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['novels'] })
      queryClient.removeQueries({ queryKey: ['novel', novelId] })
      queryClient.removeQueries({ queryKey: ['chapters', novelId] })
      queryClient.removeQueries({ queryKey: ['events', novelId] })
      setDeleteDialogOpen(false)
      navigate('/')
    },
  })

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-ink-3 rounded w-24" />
        <div className="card p-6 h-40" />
      </div>
    )
  }

  if (!novel) return (
    <div className="text-center py-24 text-parchment-muted font-body">Novel não encontrada.</div>
  )

  const pct = novel.lastChapterNumber
    ? Math.min(100, Math.round(((novel.lastReadChapterNumber ?? 0) / novel.lastChapterNumber) * 100))
    : 0
  const coverImageUrl = getCoverImageUrl(novel.coverUrl)
  const totalPages = Math.max(1, Math.ceil((chapters?.total ?? 0) / CHAPTERS_PAGE_SIZE))
  const orderedChapters = [...(allChapters?.items ?? [])].sort(
    (left, right) => left.chapterNumber - right.chapterNumber,
  )
  const continueReadingChapter =
    orderedChapters.find((chapter) => chapter.chapterNumber > (novel.lastReadChapterNumber ?? 0))
    ?? orderedChapters[orderedChapters.length - 1]

  return (
    <div className="animate-fade-in">
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Excluir novel"
        description={
          <>
            Você vai remover <strong className="text-parchment">{novel.title}</strong> da sua biblioteca.
            Essa ação não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        confirmTone="danger"
        isPending={deleteNovelMutation.isPending}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={() => deleteNovelMutation.mutate()}
      />
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-parchment-muted hover:text-parchment transition-colors mb-6 font-body"
      >
        ← Voltar à biblioteca
      </Link>

      {/* Hero */}
      <div className="card p-4 sm:p-6 mb-5 shadow-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={novel.title}
              className="w-20 h-28 object-cover rounded-lg flex-shrink-0 border border-ink-4 mx-auto sm:mx-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="w-20 h-28 bg-ink-3 rounded-lg flex-shrink-0 flex items-center justify-center text-3xl border border-ink-4 mx-auto sm:mx-0">
              📕
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="font-display text-lg sm:text-xl text-parchment font-light leading-snug break-words">{novel.title}</h1>
                <p className="text-xs text-parchment-muted mt-1 font-body">
                  {novel.lastChapterNumber} capítulos disponíveis
                </p>
              </div>

              <button
                onClick={() => {
                  if (!novelId || deleteNovelMutation.isPending) return
                  setDeleteDialogOpen(true)
                }}
                disabled={deleteNovelMutation.isPending}
                className="rounded-lg border border-red-500/30 bg-red-500/8 px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/14 disabled:opacity-40 font-body sm:flex-shrink-0"
              >
                {deleteNovelMutation.isPending ? 'Excluindo...' : 'Excluir novel'}
              </button>
            </div>

            <div className="mt-4 mb-1">
              <div className="flex justify-between text-xs font-body mb-1.5">
                <span className="text-parchment-muted">Progresso</span>
                <span className="text-amber font-medium">{pct}%</span>
              </div>
              <div className="h-1.5 bg-ink-4 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[11px] text-parchment-muted mt-1.5 font-body">
                Lido até capítulo {novel.lastReadChapterNumber ?? 0}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-3">
              <input
                type="number"
                min={0}
                max={novel.lastChapterNumber ?? undefined}
                value={progressInput}
                onChange={(e) => setProgressInput(e.target.value)}
                placeholder={`Atualizar capítulo…`}
                className="input-field !py-2 !text-xs w-full sm:w-44"
              />
              <button
                onClick={() => progressMutation.mutate(Number(progressInput))}
                disabled={!progressInput || progressMutation.isPending}
                className="w-full sm:w-auto bg-amber hover:bg-amber-light text-ink text-xs font-semibold px-4 py-2 rounded-lg transition-all disabled:opacity-40 font-body"
              >
                {progressMutation.isPending ? '...' : 'Salvar'}
              </button>
              {continueReadingChapter && (
                <button
                  onClick={() => navigate(`/novels/${novelId}/chapters/${continueReadingChapter.chapterId}`)}
                  className="w-full sm:w-auto rounded-lg border border-amber/30 bg-amber/10 px-4 py-2 text-xs font-semibold text-amber-light transition-colors hover:bg-amber/20 font-body"
                >
                  Continuar lendo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sources */}
      {novel.sources.length > 0 && (
        <div className="card p-4 mb-5">
          <h2 className="text-[11px] font-body font-medium text-parchment-muted uppercase tracking-widest mb-3">
            Fontes monitoradas
          </h2>
          <div className="space-y-2">
            {novel.sources.map((src) => (
              <div key={src.sourceId} className="rounded-lg border border-ink-3 bg-ink-2/50 px-3 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-light hover:text-amber hover:underline break-all font-body"
                    >
                      {src.url}
                    </a>
                    <p className="mt-1 text-[11px] text-parchment-muted font-body">
                      Status: {src.status} • Última verificação: {formatDate(src.lastCheckedAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleSourceMutation.mutate({ sourceId: src.sourceId, enabled: !src.monitoringEnabled })}
                    className={`badge w-full sm:w-auto justify-center text-center flex-shrink-0 transition-colors ${
                      src.monitoringEnabled
                        ? 'status-ongoing hover:bg-red-950/60 hover:text-red-400 hover:border-red-900/60'
                        : 'bg-red-950/60 text-red-400 border-red-900/60 hover:bg-emerald-950/60 hover:text-emerald-400 hover:border-emerald-900/60'
                    }`}
                  >
                    {src.monitoringEnabled ? '● Ativo' : '○ Pausado'}
                  </button>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => reprocessSourceMutation.mutate(src.sourceId)}
                    disabled={reprocessSourceMutation.isPending}
                    className="w-full sm:w-auto rounded-lg border border-amber/30 bg-amber/10 px-3 py-1.5 text-xs font-semibold text-amber-light transition-colors hover:bg-amber/20 disabled:opacity-40 font-body"
                  >
                    {reprocessSourceMutation.isPending && reprocessSourceMutation.variables === src.sourceId
                      ? 'Reprocessando...'
                      : 'Reprocessar agora'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-ink-1 p-1 rounded-xl border border-ink-3 w-full sm:w-fit">
        {(['chapters', 'events'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-xs font-body font-medium rounded-lg transition-all duration-150 ${
              activeTab === tab
                ? 'bg-ink-3 text-parchment shadow-sm'
                : 'text-parchment-muted hover:text-parchment'
            }`}
          >
            {tab === 'chapters' ? 'Capítulos' : 'Histórico'}
          </button>
        ))}
      </div>

      {activeTab === 'chapters' && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-parchment-muted font-body">
              {chapters?.total ?? 0} capítulos
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                onClick={() => fetchAllContentMutation.mutate()}
                disabled={fetchAllContentMutation.isPending}
                className="w-full sm:w-auto rounded-lg bg-amber px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-amber-light disabled:opacity-40 font-body"
              >
                {fetchAllContentMutation.isPending ? 'Enfileirando...' : 'Buscar todos os capítulos'}
              </button>
              <div className="flex items-center gap-2">
              <button
                onClick={() => setChapterPage((current) => Math.max(1, current - 1))}
                disabled={chapterPage <= 1}
                className="rounded-lg border border-ink-3 bg-ink-2 px-3 py-1.5 text-xs font-semibold text-parchment-muted hover:text-parchment hover:border-ink-4 transition-colors disabled:opacity-40 font-body"
              >
                Anterior
              </button>
              <span className="text-xs text-parchment-muted font-body">
                Página {chapterPage} de {totalPages}
              </span>
              <button
                onClick={() => setChapterPage((current) => Math.min(totalPages, current + 1))}
                disabled={chapterPage >= totalPages}
                className="rounded-lg border border-ink-3 bg-ink-2 px-3 py-1.5 text-xs font-semibold text-parchment-muted hover:text-parchment hover:border-ink-4 transition-colors disabled:opacity-40 font-body"
              >
                Próxima
              </button>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden divide-y divide-ink-3">
            {!chapters?.items.length ? (
            <p className="text-center text-parchment-muted text-sm py-8 font-body">
              Nenhum capítulo coletado ainda.
            </p>
            ) : (
              chapters.items.map((ch) => {
              const isRead = ch.chapterNumber <= (novel.lastReadChapterNumber ?? 0)
              const isFetching =
                fetchContentMutation.isPending && fetchContentMutation.variables === ch.chapterId
              const isQueued = queuedChapterIds.includes(ch.chapterId)
              const fetchError =
                fetchContentMutation.isError && fetchContentMutation.variables === ch.chapterId
                  ? ((fetchContentMutation.error as AxiosError<{ message: string }>)?.response?.data?.message ?? 'Erro ao buscar conteúdo.')
                  : null

                return (
                  <div key={ch.chapterId} className="flex flex-col px-4 py-3 hover:bg-ink-2 transition-colors">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      {isRead && (
                        <span className="w-4 h-4 rounded-full bg-amber/20 text-amber text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">✓</span>
                      )}
                      <span className={`text-sm font-body break-words ${isRead ? 'text-parchment-muted' : 'text-parchment'}`}>
                        {ch.title ? (
                          <><span className="text-parchment-muted">Cap. {ch.chapterNumber}</span> — {ch.title}</>
                        ) : (
                          `Capítulo ${ch.chapterNumber}`
                        )}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0 sm:justify-end">
                      <span className="text-[11px] text-parchment-muted font-body w-full sm:w-auto order-3 sm:order-none">{formatDate(ch.publishedAt)}</span>

                      {ch.hasContent ? (
                        <Link
                          to={`/novels/${novelId}/chapters/${ch.chapterId}`}
                          className="rounded-md bg-amber/15 border border-amber/30 px-2.5 py-1 text-[11px] font-semibold text-amber-light hover:bg-amber/25 transition-colors font-body"
                        >
                          Ler
                        </Link>
                      ) : (
                        <button
                          onClick={() => fetchContentMutation.mutate(ch.chapterId)}
                          disabled={isFetching || isQueued}
                          className="rounded-md border border-ink-3 bg-ink-2 px-2.5 py-1 text-[11px] font-semibold text-parchment-muted hover:text-parchment hover:border-ink-4 transition-colors disabled:opacity-50 font-body"
                        >
                          {isFetching ? 'Enfileirando...' : isQueued ? 'Processando...' : 'Buscar'}
                        </button>
                      )}

                      <a
                        href={ch.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir no site original"
                        className="text-parchment-muted hover:text-parchment transition-colors text-xs"
                      >
                        ↗
                      </a>
                    </div>
                  </div>

                  {fetchError && (
                    <p className="text-[11px] text-red-400 mt-1 font-body">{fetchError}</p>
                  )}
                  {!fetchError && isQueued && (
                    <p className="text-[11px] text-parchment-muted mt-1 font-body">
                      Conteúdo na fila. A lista atualiza automaticamente quando o worker concluir.
                    </p>
                  )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="space-y-2">
          {!events?.length ? (
            <p className="text-center text-parchment-muted text-sm py-8 font-body">Nenhum evento ainda.</p>
          ) : (
            events.map((ev) => (
              <div key={ev.eventId} className="card px-4 py-3 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
                <span className="text-xs text-amber font-mono bg-amber-muted/30 px-2 py-0.5 rounded-md">
                  {ev.type}
                </span>
                <span className="text-xs text-parchment-muted font-body">{formatDate(ev.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
