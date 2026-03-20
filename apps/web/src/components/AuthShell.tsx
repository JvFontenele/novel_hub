import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BookOpenText } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.12),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(45,212,191,0.12),transparent_24%)]" />
      <div className="absolute right-6 top-6 z-20">
        <ThemeToggle />
      </div>
      <div className="app-shell relative z-10 flex min-h-screen items-center justify-center py-10">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_0.9fr]">
          <section className="hero-panel hidden min-h-[560px] p-12 lg:flex lg:flex-col lg:justify-between">
            <div className="space-y-6">
              <div className="inline-flex size-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <BookOpenText className="size-8" />
              </div>
              <div className="max-w-md space-y-4">
                <h1 className="text-5xl leading-[0.98] text-balance">Leitura e monitoramento no mesmo lugar.</h1>
                <p className="text-sm leading-7 text-muted-foreground">
                  Interface leve para acompanhar novels, fontes e novas coletas.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="metric-tile text-sm">Biblioteca</div>
              <div className="metric-tile text-sm">Fontes</div>
              <div className="metric-tile text-sm">Atualizações</div>
            </div>
          </section>

          <section className="surface-panel self-center p-6 sm:p-8">
            <div className="mb-10 flex items-center justify-between">
              <Link to="/" className="inline-flex items-center gap-3">
                <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <BookOpenText className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight">Novel Hub</p>
                  <p className="text-xs text-muted-foreground">Biblioteca pessoal</p>
                </div>
              </Link>
              <div className="lg:hidden">
                <ThemeToggle />
              </div>
            </div>
            <div className="mb-8 space-y-2">
              <h2 className="text-3xl">{title}</h2>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {children}
          </section>
        </div>
      </div>
    </div>
  )
}
