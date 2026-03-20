import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { novelsApi } from '@/api/novels'

function formatDate(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 86_400_000) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function NovelDetailPage() {
  const { novelId } = useParams<{ novelId: string }>()
  const queryClient = useQueryClient()
  const [progressInput, setProgressInput] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'chapters' | 'events'>('chapters')

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
    ? Math.min(100, Math.round((novel.lastReadChapterNumber / novel.lastChapterNumber) * 100))
    : 0

  return (
    <div className="animate-fade-in">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-parchment-muted hover:text-parchment transition-colors mb-6 font-body"
      >
        ← Voltar à biblioteca
      </Link>

      {/* Hero */}
      <div className="card p-6 mb-5 shadow-lg shadow-black/30">
        <div className="flex gap-5">
          {novel.coverUrl ? (
            <img
              src={novel.coverUrl}
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
            <h1 className="font-display text-xl text-parchment font-light leading-snug">{novel.title}</h1>
            <p className="text-xs text-parchment-muted mt-1 font-body">
              {novel.lastChapterNumber} capítulos disponíveis
            </p>

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
                Lido até capítulo {novel.lastReadChapterNumber}
              </p>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <input
                type="number"
                min={0}
                max={novel.lastChapterNumber}
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
              <div key={src.sourceId} className="flex items-center justify-between gap-4">
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-light hover:text-amber hover:underline truncate font-body"
                >
                  {src.url}
                </a>
                <button
                  onClick={() => toggleSourceMutation.mutate({ sourceId: src.sourceId, enabled: !src.monitoringEnabled })}
                  className={`badge flex-shrink-0 transition-colors ${
                    src.monitoringEnabled
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/60 hover:bg-red-950/60 hover:text-red-400 hover:border-red-900/60'
                      : 'bg-red-950/60 text-red-400 border-red-900/60 hover:bg-emerald-950/60 hover:text-emerald-400 hover:border-emerald-900/60'
                  }`}
                >
                  {src.monitoringEnabled ? '● Ativo' : '○ Pausado'}
                </button>
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
            chapters.items.map((ch) => (
              <a
                key={ch.chapterId}
                href={ch.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 hover:bg-ink-2 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  {ch.number <= novel.lastReadChapterNumber && (
                    <span className="w-4 h-4 rounded-full bg-amber/20 text-amber text-[9px] flex items-center justify-center flex-shrink-0">✓</span>
                  )}
                  <span className={`text-sm font-body ${ch.number <= novel.lastReadChapterNumber ? 'text-parchment-muted' : 'text-parchment'} group-hover:text-parchment transition-colors`}>
                    {ch.title ? (
                      <><span className="text-parchment-muted">Cap. {ch.number}</span> — {ch.title}</>
                    ) : (
                      `Capítulo ${ch.number}`
                    )}
                  </span>
                </div>
                <span className="text-[11px] text-parchment-muted font-body">{formatDate(ch.publishedAt)}</span>
              </a>
            ))
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
                <span className="text-xs text-amber font-mono bg-amber-muted/30 px-2 py-0.5 rounded">
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
