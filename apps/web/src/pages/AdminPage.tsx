import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

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
  const queryClient = useQueryClient()
  const [hostname, setHostname] = useState('www.empirenovel.com')
  const [cookies, setCookies] = useState('')
  const [userAgent, setUserAgent] = useState('')

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

  const { data: scraperSettings, isLoading: scraperSettingsLoading } = useQuery({
    queryKey: ['admin', 'scraper-settings'],
    queryFn: adminApi.scraperSettings,
  })

  const saveScraperSettingMutation = useMutation({
    mutationFn: adminApi.saveScraperSetting,
    onSuccess: (setting) => {
      setHostname(setting.hostname)
      setCookies(setting.cookies ?? '')
      setUserAgent(setting.userAgent ?? '')
      queryClient.invalidateQueries({ queryKey: ['admin', 'scraper-settings'] })
    },
  })

  useEffect(() => {
    const setting = scraperSettings?.find((item) => item.hostname === hostname)
    if (!setting) {
      setCookies('')
      setUserAgent('')
      return
    }

    setCookies(setting.cookies ?? '')
    setUserAgent(setting.userAgent ?? '')
  }, [hostname, scraperSettings])

  function handleSaveScraperSetting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    saveScraperSettingMutation.mutate({
      hostname,
      cookies,
      userAgent: userAgent || null,
    })
  }

  return (
    <div className="animate-fade-in space-y-10">
      <div>
        <h1 className="font-display text-2xl text-parchment font-light">Painel Admin</h1>
        <p className="text-xs text-parchment-muted mt-1 font-body">Monitoramento de coleta em tempo real</p>
      </div>

      <section>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-body font-medium text-parchment-muted uppercase tracking-widest">
              Cookies do scraper
            </p>
            <p className="mt-1 max-w-2xl text-xs text-parchment-muted font-body">
              Atualize a sessão dos sites protegidos por Cloudflare. O worker usa estes valores no próximo job, sem rebuild.
            </p>
          </div>
          <span className="badge border-accent/30 bg-accent-muted/50 text-parchment-muted">
            configuração dinâmica
          </span>
        </div>

        <div className="card overflow-hidden">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
            <form className="space-y-5 p-5 sm:p-6" onSubmit={handleSaveScraperSetting}>
              <div className="grid gap-4 md:grid-cols-[minmax(0,240px)_1fr]">
                <label className="space-y-2">
                  <span className="text-xs text-parchment-muted font-body">Domínio</span>
                  <select
                    className="input-field"
                    value={hostname}
                    onChange={(event) => setHostname(event.target.value)}
                  >
                    <option value="www.empirenovel.com">www.empirenovel.com</option>
                    <option value="empirenovel.com">empirenovel.com</option>
                    <option value="novelbin.com">novelbin.com</option>
                    <option value="www.novelbin.com">www.novelbin.com</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs text-parchment-muted font-body">User-Agent opcional</span>
                  <input
                    className="input-field"
                    value={userAgent}
                    onChange={(event) => setUserAgent(event.target.value)}
                    placeholder="Deixe vazio para usar o padrão"
                  />
                </label>
              </div>

              <label className="space-y-2 block">
                <span className="text-xs text-parchment-muted font-body">Cookie header</span>
                <textarea
                  className="input-field min-h-40 resize-y font-mono text-xs leading-relaxed"
                  value={cookies}
                  onChange={(event) => setCookies(event.target.value)}
                  placeholder="cf_clearance=...; connect.sid=...; outros=..."
                />
              </label>

              <div className="rounded-xl border border-ink-3/80 bg-ink-2/45 px-4 py-3">
                <p className="text-xs text-parchment-muted font-body">
                  Formato esperado: <span className="font-mono text-parchment-dim">nome=valor; nome2=valor2</span>
                </p>
                <p className="mt-1 text-[11px] text-parchment-muted font-body">
                  Copie o cabeçalho Cookie do navegador ou junte os cookies principais separados por ponto e vírgula.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-parchment-muted font-body">
                  Salvar substitui o cookie atual desse domínio.
                </p>
                <button className="btn-primary sm:w-auto sm:min-w-48 sm:px-6" type="submit" disabled={saveScraperSettingMutation.isPending}>
                  {saveScraperSettingMutation.isPending ? 'Salvando...' : 'Salvar cookies'}
                </button>
              </div>
            </form>

            <aside className="border-t border-ink-3/80 bg-ink-2/35 p-5 sm:p-6 lg:border-l lg:border-t-0">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-parchment-muted font-body">
                  Configurados
                </p>
                <p className="mt-1 text-[11px] text-parchment-muted font-body">
                  O valor completo não é exibido por segurança.
                </p>
              </div>

              {scraperSettingsLoading ? (
                <div className="h-24 animate-pulse rounded-xl bg-ink-2" />
              ) : !scraperSettings?.length ? (
                <div className="rounded-xl border border-dashed border-ink-3 px-4 py-8 text-center">
                  <p className="text-sm text-parchment-muted font-body">Nenhum cookie configurado ainda.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scraperSettings.map((setting) => (
                    <button
                      key={setting.hostname}
                      type="button"
                      onClick={() => {
                        setHostname(setting.hostname)
                        setCookies(setting.cookies ?? '')
                        setUserAgent(setting.userAgent ?? '')
                      }}
                      className="w-full rounded-xl border border-ink-3 bg-ink-1/60 p-4 text-left hover:border-accent/50 hover:bg-ink-1"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-parchment font-body">{setting.hostname}</p>
                          <p className="mt-1 truncate text-xs text-parchment-muted font-mono">
                            {setting.hasCookies ? setting.cookiesPreview : 'sem cookies'}
                          </p>
                        </div>
                        <span className={`badge flex-shrink-0 ${setting.hasCookies ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/60' : 'bg-amber-950/60 text-amber-400 border-amber-900/60'}`}>
                          {setting.hasCookies ? 'ativo' : 'vazio'}
                        </span>
                      </div>
                      <p className="mt-3 text-[10px] text-parchment-muted font-body">
                        Atualizado {formatDate(setting.updatedAt)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>

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
