import type { ReactNode } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications'
import { Bell, BookOpenText, LayoutDashboard, LogOut, LibraryBig } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Separator } from '@/components/ui/separator'

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

  const navItem = (
    to: string,
    label: string,
    icon: ReactNode,
    end?: boolean,
    badge?: number,
  ) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all ${
          isActive
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`
      }
    >
      {icon}
      {label}
      {badge != null && badge > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
  )

  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-50 bg-background/70 pt-4 backdrop-blur-xl">
        <div className="app-shell">
          <div className="glass-panel flex min-h-[72px] items-center justify-between gap-4 px-4 sm:px-5">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <BookOpenText className="size-5" />
              </div>
              <div className="hidden sm:block">
                <p className="text-base font-semibold tracking-tight">Novel Hub</p>
                <p className="text-xs text-muted-foreground">Biblioteca e scraping</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-2 md:flex">
              {navItem('/', 'Novels', <LibraryBig className="size-4" />, true)}
              {navItem('/notifications', 'Notificações', <Bell className="size-4" />, false, unreadCount)}
              {navItem('/admin', 'Admin', <LayoutDashboard className="size-4" />)}
            </nav>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Separator orientation="vertical" className="hidden h-7 md:block" />
              <div className="hidden items-center gap-3 md:flex">
                <Avatar>
                  <AvatarFallback>{user?.name?.slice(0, 2).toUpperCase() ?? 'NH'}</AvatarFallback>
                </Avatar>
                <p className="text-sm font-medium">{user?.name}</p>
              </div>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="hidden rounded-full md:inline-flex">
                  {unreadCount}
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="size-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="app-shell py-4 md:hidden">
        <nav className="glass-panel flex items-center justify-between gap-2 p-2">
          {navItem('/', 'Novels', <LibraryBig className="size-4" />, true)}
          {navItem('/notifications', 'Avisos', <Bell className="size-4" />, false, unreadCount)}
          {navItem('/admin', 'Admin', <LayoutDashboard className="size-4" />)}
        </nav>
      </div>

      <main className="app-shell py-8">
        <Outlet />
      </main>
    </div>
  )
}
