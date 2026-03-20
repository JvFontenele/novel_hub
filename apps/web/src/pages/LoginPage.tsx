import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuth } from '@/context/AuthContext'

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
    <div className="min-h-screen bg-ink flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #c9943a 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-up">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-ink-2 border border-ink-4 mb-5 shadow-lg shadow-black/50">
            <span className="text-2xl">📚</span>
          </div>
          <h1 className="font-display text-3xl text-parchment font-light tracking-tight">
            Novel Hub
          </h1>
          <p className="text-parchment-muted text-sm mt-1.5 font-body">
            Sua biblioteca pessoal
          </p>
        </div>

        <div className="card p-7 shadow-2xl shadow-black/60 animate-fade-up animate-delay-1">
          <h2 className="font-display text-xl text-parchment font-light mb-6">Entrar</h2>

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
            <Link to="/register" className="text-amber-light hover:text-amber transition-colors">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
