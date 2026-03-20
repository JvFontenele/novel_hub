import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCoverImageUrl, novelsApi } from '@/api/novels'
import type { NovelListItem } from '@novel-hub/contracts'

function progressPercent(novel: NovelListItem) {
  if (!novel.lastChapterNumber) return 0
  const current = novel.lastReadChapterNumber ?? 0
  return Math.min(100, Math.round((current / novel.lastChapterNumber) * 100))
}

const STATUS_MAP: Record<NovelListItem['status'], { label: string; cls: string }> = {
  ONGOING: { label: 'Em andamento', cls: 'bg-emerald-950/60 text-emerald-400 border-emerald-900/60' },
  COMPLETED: { label: 'Completo', cls: 'bg-sky-950/60 text-sky-400 border-sky-900/60' },
  HIATUS: { label: 'Hiato', cls: 'bg-amber-950/60 text-amber-400 border-amber-900/60' },
  DROPPED: { label: 'Dropada', cls: 'bg-red-950/60 text-red-400 border-red-900/60' },
  UNKNOWN: { label: 'Indefinido', cls: 'bg-zinc-900/60 text-zinc-300 border-zinc-700/60' },
}

export function NovelsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [sourceUrl, setSourceUrl] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [formError, setFormError] = useState('')

  const { data: novels, isLoading } = useQuery({
    queryKey: ['novels'],
    queryFn: novelsApi.list,
  })

  const addMutation = useMutation({
    mutationFn: novelsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['novels'] })
      setShowForm(false)
      setSourceUrl('')
      setDisplayName('')
      setFormError('')
    },
    onError: () => setFormError('Não foi possível adicionar a novel. Verifique a URL.'),
  })

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    addMutation.mutate({ sourceUrl, displayName })
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl text-parchment font-light">Minhas Novels</h1>
          {novels?.length != null && (
            <p className="text-xs text-parchment-muted mt-1 font-body">
              {novels.length} {novels.length === 1 ? 'novel' : 'novels'} na sua biblioteca
            </p>
          )}
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setFormError('') }}
          className={`text-sm font-body font-medium px-4 py-2 rounded-lg border transition-all duration-150 ${
            showForm
              ? 'border-ink-4 text-parchment-muted hover:text-parchment'
              : 'bg-amber text-ink border-amber hover:bg-amber-light'
          }`}
        >
          {showForm ? 'Cancelar' : '+ Adicionar'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card p-5 mb-7 animate-fade-up shadow-lg shadow-black/30">
          <h2 className="font-display text-base text-parchment font-light mb-4">Nova novel</h2>

          {formError && (
            <div className="bg-red-950/50 border border-red-900/60 text-red-300 text-sm rounded-lg px-4 py-2.5 mb-4 font-body">
              {formError}
            </div>
          )}

          <form onSubmit={handleAdd} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-parchment-muted mb-2 font-body tracking-wide uppercase">
                URL da fonte
              </label>
              <input
                type="url"
                required
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="input-field"
                placeholder="https://novelupdates.com/..."
              />
            </div>
            <div>
              <label className="block text-xs text-parchment-muted mb-2 font-body tracking-wide uppercase">
                Título
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field"
                placeholder="Nome da novel"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={addMutation.isPending}
                className="bg-amber hover:bg-amber-light text-ink font-semibold text-sm px-6 py-2.5 rounded-lg transition-all duration-150 disabled:opacity-40 font-body"
              >
                {addMutation.isPending ? 'Adicionando...' : 'Adicionar novel'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse h-28">
              <div className="flex gap-3">
                <div className="w-12 h-16 bg-ink-3 rounded-md" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-ink-3 rounded w-3/4" />
                  <div className="h-2 bg-ink-3 rounded w-1/3" />
                  <div className="h-1.5 bg-ink-3 rounded w-full mt-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !novels?.length ? (
        <div className="text-center py-24">
          <div className="font-display text-6xl mb-5 opacity-30">📖</div>
          <p className="font-display text-xl text-parchment-dim font-light">Biblioteca vazia</p>
          <p className="text-parchment-muted text-sm mt-2 font-body">
            Adicione uma novel para começar a acompanhar
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {novels.map((novel, i) => {
            const pct = progressPercent(novel)
            const st = STATUS_MAP[novel.status]
            const coverImageUrl = getCoverImageUrl(novel.coverUrl)
            return (
              <Link
                key={novel.novelId}
                to={`/novels/${novel.novelId}`}
                className="card p-4 hover:border-amber-dim/60 transition-all duration-200 hover:shadow-lg hover:shadow-black/40 group animate-fade-up"
                style={{ animationDelay: `${i * 0.05}s`, opacity: 0 }}
              >
                <div className="flex items-start gap-3">
                  {coverImageUrl ? (
                    <img
                      src={coverImageUrl}
                      alt={novel.title}
                      className="w-12 h-[68px] object-cover rounded-md flex-shrink-0 border border-ink-4"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-12 h-[68px] bg-ink-3 rounded-md flex-shrink-0 flex items-center justify-center text-xl border border-ink-4">
                      📕
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm text-parchment truncate group-hover:text-amber-light transition-colors leading-snug">
                      {novel.title}
                    </p>

                    <span className={`badge mt-1.5 inline-block ${st.cls}`}>
                      {st.label}
                    </span>

                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-parchment-muted mb-1 font-body">
                        <span>Cap. {novel.lastReadChapterNumber ?? 0}/{novel.lastChapterNumber ?? 0}</span>
                        <span className="text-amber-light">{pct}%</span>
                      </div>
                      <div className="h-1 bg-ink-4 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
