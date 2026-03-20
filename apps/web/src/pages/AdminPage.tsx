import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Activity, DatabaseZap } from 'lucide-react'
import { adminApi } from '@/api/admin'
import { formatDateTime, formatRelativeDate } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_STYLES = {
  SUCCESS: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  FAILED: 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
  PARTIAL: 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
} as const

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
    <div className="space-y-8">
      <section className="hero-panel p-6 sm:p-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 space-y-3">
            <span className="eyebrow">Observabilidade</span>
            <h1 className="text-4xl sm:text-5xl">Painel Admin</h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              Veja execuções do coletor, fontes problemáticas e o comportamento geral do worker em uma interface mais legível.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
            <div className="metric-tile">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Execuções</p>
              <p className="mt-2 text-3xl font-semibold">{runs?.length ?? 0}</p>
            </div>
            <div className="metric-tile">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Falhas</p>
              <p className="mt-2 text-3xl font-semibold">{failures?.length ?? 0}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="surface-panel py-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5 text-primary" />
              Execuções recentes
            </CardTitle>
            <CardDescription>Últimas coletas executadas pelo worker.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {runsLoading ? (
              Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-2xl" />)
            ) : !runs?.length ? (
              <p className="text-sm text-muted-foreground">Nenhuma execução registrada.</p>
            ) : (
              runs.map((run) => (
                <div key={run.id} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">{new URL(run.sourceUrl).hostname}</p>
                      <a
                        href={run.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block max-w-xl truncate text-xs text-muted-foreground hover:text-foreground"
                      >
                        {run.sourceUrl}
                      </a>
                    </div>
                    <Badge className={`rounded-full border-0 ${STATUS_STYLES[run.status]}`}>{run.status}</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em]">Capítulos</p>
                      <p className="mt-1 text-base font-semibold text-foreground">{run.chaptersFound}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em]">Duração</p>
                      <p className="mt-1 text-base font-semibold text-foreground">{run.durationMs}ms</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em]">Início</p>
                      <p className="mt-1 text-base font-semibold text-foreground">{formatRelativeDate(run.startedAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="surface-panel py-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DatabaseZap className="size-5 text-primary" />
              Fontes com falhas
            </CardTitle>
            <CardDescription>Monitoramento de fontes com erro consecutivo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {failuresLoading ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)
            ) : !failures?.length ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-5 text-sm text-emerald-700 dark:text-emerald-300">
                Nenhuma falha registrada.
              </div>
            ) : (
              failures.map((failure) => (
                <div key={failure.sourceId} className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{failure.novelTitle}</p>
                      <a
                        href={failure.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block text-xs text-muted-foreground hover:text-foreground"
                      >
                        {failure.sourceUrl}
                      </a>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-sm text-rose-700 dark:text-rose-300">
                      <AlertTriangle className="size-4" />
                      {failure.consecutiveFailures}x
                    </div>
                  </div>
                  <p className="mt-4 rounded-xl border border-border/60 bg-background/70 px-3 py-2 font-mono text-xs text-muted-foreground">
                    {failure.status}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Última verificação: {formatDateTime(failure.lastCheckedAt)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
