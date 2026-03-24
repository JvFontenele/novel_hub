import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'

function formatDate(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m atrás`
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h atrás`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const STATUS_STYLES = {
  SUCCESS: 'bg-emerald-950/60 text-emerald-400 border-emerald-900/60',
  FAILED: 'bg-red-950/60 text-red-400 border-red-900/60',
  PARTIAL: 'bg-amber-950/60 text-amber-400 border-amber-900/60',
}

export function AdminPage() {
  const { data: runs, isLoading: runsLoading } = useQuery({
    queryKey: ['admin', 'runs'],
    queryFn: adminApi.collectorRuns,
    refetchInterval: 15_000,
  })

  const { data: failures, isLoading: failuresLoading } = useQuery({
    queryKey: ['admin', 'failures'],
    queryFn: adminApi.sourceFailures,
    refetchInterval: 30_000,
  })

  return (
    <div className="animate-fade-in space-y-10">
      <div>
        <h1 className="font-display text-2xl text-parchment font-light">Painel Admin</h1>
        <p className="text-xs text-parchment-muted mt-1 font-body">Monitoramento de coleta em tempo real</p>
      </div>

      {/* Collector Runs */}
      <section>
        <p className="text-[11px] font-body font-medium text-parchment-muted uppercase tracking-widest mb-4">
          Execuções recentes
        </p>

        {runsLoading ? (
          <div className="card animate-pulse h-32" />
        ) : !runs?.length ? (
          <p className="text-parchment-muted text-sm font-body">Nenhuma execução registrada.</p>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="divider border-t-0">
                  <th className="text-left px-4 py-3 text-[11px] text-parchment-muted font-body font-medium uppercase tracking-wider">Fonte</th>
                  <th className="text-left px-4 py-3 text-[11px] text-parchment-muted font-body font-medium uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] text-parchment-muted font-body font-medium uppercase tracking-wider hidden sm:table-cell">Caps</th>
                  <th className="text-left px-4 py-3 text-[11px] text-parchment-muted font-body font-medium uppercase tracking-wider hidden md:table-cell">Tempo</th>
                  <th className="text-left px-4 py-3 text-[11px] text-parchment-muted font-body font-medium uppercase tracking-wider">Quando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-3">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-ink-2 transition-colors">
                    <td className="px-4 py-3 max-w-[200px]">
                      <a
                        href={run.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-parchment-dim hover:text-amber-light font-body truncate block"
                        title={run.sourceUrl}
                      >
                        {new URL(run.sourceUrl).hostname}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_STYLES[run.status]}`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-parchment-muted font-body hidden sm:table-cell">
                      {run.chaptersFound}
                    </td>
                    <td className="px-4 py-3 text-xs text-parchment-muted font-body hidden md:table-cell">
                      {run.durationMs}ms
                    </td>
                    <td className="px-4 py-3 text-xs text-parchment-muted font-body">
                      {formatDate(run.startedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Source Failures */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <p className="text-[11px] font-body font-medium text-parchment-muted uppercase tracking-widest">
            Fontes com falhas
          </p>
          {failures && failures.length > 0 && (
            <span className="badge bg-red-950/60 text-red-400 border-red-900/60">
              {failures.length}
            </span>
          )}
        </div>

        {failuresLoading ? (
          <div className="card animate-pulse h-24" />
        ) : !failures?.length ? (
          <div className="card px-5 py-6 text-center">
            <p className="text-emerald-400 text-sm font-body">Nenhuma falha registrada ✓</p>
          </div>
        ) : (
          <div className="space-y-3">
            {failures.map((f) => (
              <div key={f.sourceId} className="card border-red-950/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-body text-parchment">{f.novelTitle}</p>
                    <a
                      href={f.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-light hover:underline font-body break-all"
                    >
                      {f.sourceUrl}
                    </a>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <span className="text-red-400 text-sm font-semibold font-body">{f.consecutiveFailures}×</span>
                    <p className="text-[10px] text-parchment-muted font-body mt-0.5">
                      {f.lastCheckedAt ? formatDate(f.lastCheckedAt) : 'sem registro'}
                    </p>
                  </div>
                </div>
                <div className="bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2">
                  <p className="text-xs text-red-300 font-mono leading-relaxed">{f.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
