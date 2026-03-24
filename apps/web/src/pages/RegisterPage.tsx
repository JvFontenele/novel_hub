import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'

function getErrorMessage(err: unknown): string {
  const status = (err as { response?: { status?: number } })?.response?.status
  if (status === 409) return 'Este email já está cadastrado.'
  if (status === 400) return 'Dados inválidos. Verifique os campos.'
  if (status && status >= 500) return 'Erro no servidor. Tente novamente em instantes.'
  if ((err as { code?: string })?.code === 'ERR_NETWORK' || !status) {
    return 'Servidor indisponível. Verifique se a API está rodando.'
  }
  return 'Erro ao criar conta. Tente novamente.'
}

export function RegisterPage() {
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.register({ name, email, password })
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
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <button onClick={toggleTheme} className="theme-toggle" type="button">
          <span>{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
          <span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span>
        </button>
      </div>

      <div className="w-full max-w-sm relative z-10 pt-12 sm:pt-0">
        <div className="text-center mb-8 sm:mb-10 animate-fade-up">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-ink-2 border border-ink-3 mb-4 sm:mb-5">
            <span className="text-2xl">📚</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-parchment font-semibold tracking-tight">
            Novel Hub
          </h1>
          <p className="text-parchment-muted text-sm mt-2 font-body">
            Organize leituras, fontes e progresso em um painel só seu.
          </p>
        </div>

        <div className="card p-5 sm:p-8 animate-fade-up animate-delay-1">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.26em] text-parchment-muted font-body">Registro</p>
            <h2 className="font-display text-[1.75rem] sm:text-[2rem] text-parchment font-semibold">Criar conta</h2>
          </div>

          {error && (
            <div className="bg-red-950/50 border border-red-900/60 text-red-300 text-sm rounded-lg px-4 py-3 mb-5 font-body">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-parchment-muted mb-2 font-body tracking-wide uppercase">
                Nome
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="Seu nome"
                autoComplete="name"
              />
            </div>

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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary mt-2">
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <div className="divider mt-6 mb-5" />

          <p className="text-center text-sm text-parchment-muted font-body">
            Já tem conta?{' '}
            <Link to="/login" className="text-amber-light hover:text-amber transition-colors font-semibold">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
