import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BellRing, CheckCheck } from 'lucide-react'
import { notificationsApi } from '@/api/notifications'
import { formatRelativeDate } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function NotificationsPage() {
  const queryClient = useQueryClient()

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
  })

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unread = notifications?.filter((n) => !n.read) ?? []
  const read = notifications?.filter((n) => n.read) ?? []

  return (
    <div className="space-y-8">
      <section className="hero-panel p-6 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <span className="eyebrow">Central de alertas</span>
            <h1 className="text-4xl sm:text-5xl">Notificações</h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              Acompanhe novas coletas, capítulos detectados e pendências da sua biblioteca.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="metric-tile min-w-[140px]">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Não lidas</p>
              <p className="mt-2 text-3xl font-semibold">{unread.length}</p>
            </div>
            <div className="metric-tile min-w-[140px]">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Lidas</p>
              <p className="mt-2 text-3xl font-semibold">{read.length}</p>
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="surface-panel py-0">
              <CardContent className="space-y-3 py-6">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !notifications?.length ? (
        <Card className="hero-panel py-0">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-5 flex size-16 items-center justify-center rounded-3xl bg-secondary text-secondary-foreground">
              <BellRing className="size-8" />
            </div>
            <h2 className="text-3xl">Sem notificações</h2>
            <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">
              Quando uma fonte encontrar novos capítulos ou a coleta registrar eventos, eles aparecem aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl">Novas</h2>
              <Badge className="rounded-full">{unread.length}</Badge>
            </div>
            {unread.length === 0 ? (
              <Card className="surface-panel py-0">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Nada pendente por enquanto.
                </CardContent>
              </Card>
            ) : (
              unread.map((notification) => (
                <Card key={notification.id} className="surface-panel py-0">
                  <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-4">
                      <div className="mt-1 size-3 rounded-full bg-primary shadow-[0_0_16px_rgba(249,115,22,0.55)]" />
                      <div className="space-y-2">
                        <p className="text-sm leading-6">{notification.title}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {notification.novelId && (
                            <Link to={`/novels/${notification.novelId}`} className="font-medium text-primary hover:underline">
                              Abrir novel
                            </Link>
                          )}
                          <span>{formatRelativeDate(notification.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => markReadMutation.mutate(notification.id)}
                      disabled={markReadMutation.isPending}
                      className="rounded-full"
                    >
                      <CheckCheck className="size-4" />
                      Marcar como lida
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </section>

          <section>
            <Card className="surface-panel py-0">
              <CardHeader>
                <CardTitle>Arquivo recente</CardTitle>
                <CardDescription>Histórico de avisos já lidos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {read.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Você ainda não marcou nenhuma notificação como lida.</p>
                ) : (
                  read.map((notification) => (
                    <div key={notification.id} className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                      <p className="text-sm text-muted-foreground">{notification.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {notification.novelId && (
                          <Link to={`/novels/${notification.novelId}`} className="hover:text-foreground">
                            Abrir novel
                          </Link>
                        )}
                        <span>{formatRelativeDate(notification.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </div>
  )
}
