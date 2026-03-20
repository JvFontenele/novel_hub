import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications'
import { Link } from 'react-router-dom'

function formatDate(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m atrás`
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h atrás`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

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
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-2xl text-parchment font-light">Notificações</h1>
        {unread.length > 0 && (
          <p className="text-xs text-parchment-muted mt-1 font-body">
            {unread.length} não {unread.length === 1 ? 'lida' : 'lidas'}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : !notifications?.length ? (
        <div className="text-center py-24">
          <div className="font-display text-6xl mb-5 opacity-30">🔔</div>
          <p className="font-display text-xl text-parchment-dim font-light">Sem notificações</p>
          <p className="text-parchment-muted text-sm mt-2 font-body">
            Você será notificado quando novos capítulos chegarem
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {unread.length > 0 && (
            <section>
              <p className="text-[11px] font-body font-medium text-parchment-muted uppercase tracking-widest mb-3">
                Não lidas
              </p>
              <div className="space-y-2">
                {unread.map((n) => (
                  <div
                    key={n.id}
                    className="card border-amber-dim/30 bg-ink-2 px-4 py-4 flex items-start justify-between gap-4 animate-fade-up"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber mt-2 flex-shrink-0 shadow-[0_0_6px_#c9943a]" />
                      <div>
                        <p className="text-sm text-parchment font-body">{n.title}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <Link
                            to={`/novels/${n.novelId}`}
                            className="text-xs text-amber-light hover:text-amber transition-colors font-body"
                          >
                            Ver novel →
                          </Link>
                          <span className="text-xs text-parchment-muted font-body">{formatDate(n.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => markReadMutation.mutate(n.id)}
                      disabled={markReadMutation.isPending}
                      className="text-xs text-parchment-muted hover:text-parchment transition-colors flex-shrink-0 border border-ink-4 hover:border-ink-5 px-2.5 py-1 rounded font-body"
                    >
                      Marcar lida
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {read.length > 0 && (
            <section>
              <p className="text-[11px] font-body font-medium text-parchment-muted uppercase tracking-widest mb-3">
                Lidas
              </p>
              <div className="space-y-2 opacity-50">
                {read.map((n) => (
                  <div key={n.id} className="card px-4 py-3.5 flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-ink-5 mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-parchment-dim font-body">{n.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <Link
                          to={`/novels/${n.novelId}`}
                          className="text-xs text-parchment-muted hover:text-amber-light transition-colors font-body"
                        >
                          Ver novel →
                        </Link>
                        <span className="text-xs text-parchment-muted font-body">{formatDate(n.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
