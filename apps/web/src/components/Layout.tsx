import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications'
import { useTheme } from '@/context/ThemeContext'

export function Layout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const isReaderRoute = /^\/novels\/[^/]+\/chapters\/[^/]+$/.test(location.pathname)

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
        `nav-pill ${
          isActive
            ? 'bg-amber/12 text-amber-light border border-amber/20'
            : 'text-parchment-muted hover:text-parchment hover:bg-ink-2/80'
        }`
      }
    >
      {label}
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-amber text-white text-[10px] font-semibold rounded-md w-4 h-4 flex items-center justify-center leading-none">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
  )

  return (
    <div className="app-shell">
      <header className={isReaderRoute ? 'topbar topbar-static' : 'topbar'}>
        <div className="max-w-5xl mx-auto px-4 sm:px-5 py-3 sm:h-14 sm:py-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-3 sm:contents">
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base border border-ink-3 bg-ink-2 flex-shrink-0">
                📚
              </div>
              <span className="font-display text-xl sm:text-[1.55rem] text-parchment font-semibold tracking-tight truncate">
                Novel Hub
              </span>
            </Link>

            <div className="flex items-center gap-2 sm:hidden">
              <button onClick={toggleTheme} className="theme-toggle !px-2.5 !py-1.5" type="button">
                <span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span>
              </button>
              <button
                onClick={handleLogout}
                className="text-xs text-parchment-muted hover:text-parchment transition-colors font-body border border-ink-3 hover:border-amber/35 px-2.5 py-1.5 rounded-lg"
              >
                Sair
              </button>
            </div>
          </div>

          <nav className="flex flex-wrap items-center justify-center sm:justify-start gap-1">
            {navItem('/', 'Novels', true)}
            {navItem('/notifications', 'Notificações', false, unreadCount)}
            {navItem('/admin', 'Admin')}
          </nav>

          <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
            <button onClick={toggleTheme} className="theme-toggle" type="button">
              <span>{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
              <span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span>
            </button>
            <span className="text-xs text-parchment-muted font-body hidden md:block">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-parchment-muted hover:text-parchment transition-colors font-body border border-ink-3 hover:border-amber/35 px-3 py-1.5 rounded-lg"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-5 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
