import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, History, Radar, RefreshCcw } from 'lucide-react'
import { novelsApi } from '@/api/novels'
import { resolveCoverImageUrl } from '@/lib/assets'
import { formatDateTime, formatRelativeDate } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const SOURCE_STATUS = {
  active: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  paused: 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
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

  const collectSourceMutation = useMutation({
    mutationFn: (sourceId: string) => novelsApi.collectSourceNow(sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['novel', novelId] })
      queryClient.invalidateQueries({ queryKey: ['chapters', novelId] })
      queryClient.invalidateQueries({ queryKey: ['events', novelId] })
      queryClient.invalidateQueries({ queryKey: ['novels'] })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-72 rounded-[1.75rem]" />
        <Skeleton className="h-96 rounded-[1.75rem]" />
      </div>
    )
  }

  if (!novel) {
    return <div className="py-20 text-center text-muted-foreground">Novel não encontrada.</div>
  }

  const pct = novel.lastChapterNumber
    ? Math.min(100, Math.round(((novel.lastReadChapterNumber ?? 0) / novel.lastChapterNumber) * 100))
    : 0

  const coverImageUrl = resolveCoverImageUrl(novel.coverUrl)
  const lastCheckedAt =
    novel.sources
      .map((source) => source.lastCheckedAt)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null

  return (
    <div className="space-y-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" />
        Voltar
      </Link>

      <section className="hero-panel p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <div className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-muted/60">
            {coverImageUrl ? (
              <img
                src={coverImageUrl}
                alt={novel.title}
                className="h-full min-h-[320px] w-full object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              <div className="flex min-h-[320px] items-center justify-center text-6xl">📖</div>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="max-w-4xl text-4xl leading-tight sm:text-5xl">{novel.title}</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {novel.lastReadChapterNumber ?? 0} de {novel.lastChapterNumber ?? 0}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="metric-tile">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Progresso</p>
                <p className="mt-2 text-3xl font-semibold">{pct}%</p>
              </div>
              <div className="metric-tile">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Lido</p>
                <p className="mt-2 text-3xl font-semibold">{novel.lastReadChapterNumber ?? 0}</p>
              </div>
              <div className="metric-tile">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fontes</p>
                <p className="mt-2 text-3xl font-semibold">{novel.sources.length}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Andamento da leitura</span>
                <span className="font-semibold">{pct}%</span>
              </div>
              <div className="h-3 rounded-full bg-muted">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-primary to-orange-300 dark:to-amber-200"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[160px_auto]">
              <Input
                type="number"
                min={0}
                max={novel.lastChapterNumber ?? undefined}
                value={progressInput}
                onChange={(e) => setProgressInput(e.target.value)}
                placeholder="Novo capítulo"
                className="h-11 rounded-xl bg-background/70"
              />
              <Button
                onClick={() => progressMutation.mutate(Number(progressInput))}
                disabled={!progressInput || progressMutation.isPending}
                className="h-11 rounded-xl"
              >
                {progressMutation.isPending ? 'Salvando...' : 'Atualizar progresso'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="surface-panel py-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radar className="size-5 text-primary" />
              Fontes monitoradas
            </CardTitle>
            <CardDescription>Controle rápido por source.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {novel.sources.map((source) => (
              <div key={source.sourceId} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block break-all text-sm font-medium hover:text-primary"
                    >
                      {source.url}
                    </a>
                    <Badge className={`rounded-full border-0 ${source.monitoringEnabled ? SOURCE_STATUS.active : SOURCE_STATUS.paused}`}>
                      {source.monitoringEnabled ? 'Monitoramento ativo' : 'Monitoramento pausado'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={() => collectSourceMutation.mutate(source.sourceId)}
                      disabled={collectSourceMutation.isPending}
                    >
                      <RefreshCcw className="size-4" />
                      {collectSourceMutation.isPending ? 'Coletando...' : 'Coletar agora'}
                    </Button>
                    <Button
                      variant={source.monitoringEnabled ? 'secondary' : 'default'}
                      className="rounded-full"
                      onClick={() =>
                        toggleSourceMutation.mutate({
                          sourceId: source.sourceId,
                          enabled: !source.monitoringEnabled,
                        })
                      }
                    >
                      {source.monitoringEnabled ? 'Pausar' : 'Ativar'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="surface-panel py-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="size-5 text-primary" />
              Resumo
            </CardTitle>
            <CardDescription>Visão geral da leitura.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Último capítulo lido</p>
              <p className="mt-2 text-3xl font-semibold">{novel.lastReadChapterNumber ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Último disponível</p>
              <p className="mt-2 text-3xl font-semibold">{novel.lastChapterNumber ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4 sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Última coleta</p>
              <p className="mt-2 text-base font-semibold">
                {lastCheckedAt ? formatDateTime(lastCheckedAt) : 'Sem data registrada'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {lastCheckedAt ? formatRelativeDate(lastCheckedAt) : 'Aguardando coleta'}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'chapters' | 'events')} className="space-y-4">
        <TabsList className="rounded-full bg-muted/70 p-1">
          <TabsTrigger value="chapters" className="rounded-full px-4">
            Capítulos
          </TabsTrigger>
          <TabsTrigger value="events" className="rounded-full px-4">
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chapters">
          <Card className="surface-panel py-0">
            <CardContent className="divide-y divide-border/70 px-0">
              {!chapters?.items.length ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Nenhum capítulo coletado ainda.</div>
              ) : (
                chapters.items.map((chapter) => (
                  <a
                    key={chapter.chapterId}
                    href={chapter.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 inline-flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {chapter.chapterNumber}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-6">
                          {chapter.title || `Capítulo ${chapter.chapterNumber}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {chapter.chapterNumber <= (novel.lastReadChapterNumber ?? 0) ? 'Lido' : 'Pendente'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDateTime(chapter.publishedAt)}</span>
                  </a>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card className="surface-panel py-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-5 text-primary" />
                Histórico da novel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!events?.length ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Nenhum evento registrado ainda.</div>
              ) : (
                events.map((event) => (
                  <div key={event.eventId} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <Badge variant="secondary" className="rounded-full">
                        {event.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
