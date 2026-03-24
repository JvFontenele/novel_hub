import { useState } from 'react'
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
  const { novelId } = useParams<{ novelId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [progressInput, setProgressInput] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'chapters' | 'events'>('chapters')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { data: novel, isLoading } = useQuery({
    queryKey: ['novel', novelId],
    queryFn: () => novelsApi.get(novelId!),
    enabled: !!novelId,
  })

  const { data: chapters } = useQuery({
    queryKey: ['chapters', novelId],
    queryFn: () => novelsApi.chapters(novelId!),
    enabled: !!novelId && activeTab === 'chapters',
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', novelId] })
    },
  })

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
      <div className="card p-6 mb-5 shadow-none">
        <div className="flex gap-5">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={novel.title}
              className="w-20 h-28 object-cover rounded-lg flex-shrink-0 border border-ink-4"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="w-20 h-28 bg-ink-3 rounded-lg flex-shrink-0 flex items-center justify-center text-3xl border border-ink-4">
              📕
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="font-display text-xl text-parchment font-light leading-snug">{novel.title}</h1>
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

            <div className="flex items-center gap-2 mt-3">
              <input
                type="number"
                min={0}
                max={novel.lastChapterNumber ?? undefined}
                value={progressInput}
                onChange={(e) => setProgressInput(e.target.value)}
                placeholder={`Atualizar capítulo…`}
                className="input-field !py-2 !text-xs w-44"
              />
              <button
                onClick={() => progressMutation.mutate(Number(progressInput))}
                disabled={!progressInput || progressMutation.isPending}
                className="bg-amber hover:bg-amber-light text-ink text-xs font-semibold px-4 py-2 rounded-lg transition-all disabled:opacity-40 font-body"
              >
                {progressMutation.isPending ? '...' : 'Salvar'}
              </button>
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
                <div className="flex items-start justify-between gap-4">
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
                    className={`badge flex-shrink-0 transition-colors ${
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
                    className="rounded-lg border border-amber/30 bg-amber/10 px-3 py-1.5 text-xs font-semibold text-amber-light transition-colors hover:bg-amber/20 disabled:opacity-40 font-body"
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
      <div className="flex gap-1 mb-4 bg-ink-1 p-1 rounded-xl border border-ink-3 w-fit">
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
              const fetchError =
                fetchContentMutation.isError && fetchContentMutation.variables === ch.chapterId
                  ? ((fetchContentMutation.error as AxiosError<{ message: string }>)?.response?.data?.message ?? 'Erro ao buscar conteúdo.')
                  : null

              return (
                <div key={ch.chapterId} className="flex flex-col px-4 py-3 hover:bg-ink-2 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {isRead && (
                        <span className="w-4 h-4 rounded-full bg-amber/20 text-amber text-[9px] flex items-center justify-center flex-shrink-0">✓</span>
                      )}
                      <span className={`text-sm font-body truncate ${isRead ? 'text-parchment-muted' : 'text-parchment'}`}>
                        {ch.title ? (
                          <><span className="text-parchment-muted">Cap. {ch.chapterNumber}</span> — {ch.title}</>
                        ) : (
                          `Capítulo ${ch.chapterNumber}`
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] text-parchment-muted font-body hidden sm:block">{formatDate(ch.publishedAt)}</span>

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
                          disabled={isFetching}
                          className="rounded-md border border-ink-3 bg-ink-2 px-2.5 py-1 text-[11px] font-semibold text-parchment-muted hover:text-parchment hover:border-ink-4 transition-colors disabled:opacity-50 font-body"
                        >
                          {isFetching ? 'Buscando...' : 'Buscar'}
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
                </div>
              )
            })
          )}
        </div>
      )}

      {activeTab === 'events' && (
        <div className="space-y-2">
          {!events?.length ? (
            <p className="text-center text-parchment-muted text-sm py-8 font-body">Nenhum evento ainda.</p>
          ) : (
            events.map((ev) => (
              <div key={ev.eventId} className="card px-4 py-3 flex justify-between items-center">
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
