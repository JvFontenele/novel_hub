import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'

function getErrorMessage(err: unknown): string {
  const status = (err as { response?: { status?: number } })?.response?.status
  if (status === 401) return 'Email ou senha incorretos.'
  if (status === 404) return 'Conta não encontrada.'
  if (status && status >= 500) return 'Erro no servidor. Tente novamente em instantes.'
  if ((err as { code?: string })?.code === 'ERR_NETWORK' || !status) {
    return 'Servidor indisponível. Verifique se a API está rodando.'
  }
  return 'Ocorreu um erro inesperado.'
}

export function LoginPage() {
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.login({ email, password })
      login(data.user, data.token)
      navigate('/')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="absolute top-6 right-6 z-20">
        <button onClick={toggleTheme} className="theme-toggle" type="button">
          <span>{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
          <span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span>
        </button>
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10 animate-fade-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-ink-2 border border-ink-3 mb-5">
            <span className="text-2xl">📚</span>
          </div>
          <h1 className="font-display text-4xl text-parchment font-semibold tracking-tight">
            Novel Hub
          </h1>
          <p className="text-parchment-muted text-sm mt-2 font-body">
            Um arquivo elegante para acompanhar as suas histórias.
          </p>
        </div>

        <div className="card p-8 animate-fade-up animate-delay-1">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.26em] text-parchment-muted font-body">Acesso</p>
            <h2 className="font-display text-[2rem] text-parchment font-semibold">Entrar</h2>
          </div>

          {error && (
            <div className="bg-red-950/50 border border-red-900/60 text-red-300 text-sm rounded-lg px-4 py-3 mb-5 font-body">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-parchment-muted mb-2 font-body tracking-wide uppercase">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs text-parchment-muted mb-2 font-body tracking-wide uppercase">
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary mt-2">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="divider mt-6 mb-5" />

          <p className="text-center text-sm text-parchment-muted font-body">
            Não tem conta?{' '}
            <Link to="/register" className="text-amber-light hover:text-amber transition-colors font-semibold">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
