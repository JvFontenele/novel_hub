import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications'

const IS_MOCK = import.meta.env.VITE_MOCK_API === 'true'

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: 30_000,
  })

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const navItem = (to: string, label: string, end?: boolean, badge?: number) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative px-3.5 py-1.5 rounded-lg text-sm font-body transition-all duration-150 ${
          isActive
            ? 'bg-ink-3 text-parchment'
            : 'text-parchment-muted hover:text-parchment hover:bg-ink-2'
        }`
      }
    >
      {label}
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-amber text-ink text-[10px] font-semibold rounded-full w-4 h-4 flex items-center justify-center leading-none">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
  )

  return (
    <div className="min-h-screen bg-ink text-parchment">
      <header className="bg-ink-1 border-b border-ink-3 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 bg-ink-3 rounded-lg flex items-center justify-center text-base border border-ink-4">
              📚
            </div>
            <span className="font-display text-lg text-parchment font-light tracking-tight hidden sm:block">
              Novel Hub
            </span>
            {IS_MOCK && (
              <span className="text-[10px] bg-amber-muted/60 text-amber-light border border-amber-dim/40 px-1.5 py-0.5 rounded font-body tracking-wide hidden sm:block">
                DEMO
              </span>
            )}
          </Link>

          <nav className="flex items-center gap-1">
            {navItem('/', 'Novels', true)}
            {navItem('/notifications', 'Notificações', false, unreadCount)}
            {navItem('/admin', 'Admin')}
          </nav>

          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs text-parchment-muted font-body hidden md:block">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-parchment-muted hover:text-parchment transition-colors font-body border border-ink-3 hover:border-ink-4 px-2.5 py-1 rounded-md"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">
        <Outlet />
      </main>
    </div>
  )
}
