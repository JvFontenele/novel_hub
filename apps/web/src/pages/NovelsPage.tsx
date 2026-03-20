import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookMarked, Plus } from 'lucide-react'
import { novelsApi } from '@/api/novels'
import { resolveCoverImageUrl } from '@/lib/assets'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { NovelListItem } from '@novel-hub/contracts'

function progressPercent(novel: NovelListItem) {
  if (!novel.lastChapterNumber) return 0
  const current = novel.lastReadChapterNumber ?? 0
  return Math.min(100, Math.round((current / novel.lastChapterNumber) * 100))
}

const STATUS_MAP: Record<NovelListItem['status'], { label: string; className: string }> = {
  ONGOING: { label: 'Em andamento', className: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300' },
  COMPLETED: { label: 'Completa', className: 'bg-sky-500/12 text-sky-700 dark:text-sky-300' },
  HIATUS: { label: 'Hiato', className: 'bg-amber-500/12 text-amber-700 dark:text-amber-300' },
  DROPPED: { label: 'Dropada', className: 'bg-rose-500/12 text-rose-700 dark:text-rose-300' },
  UNKNOWN: { label: 'Indefinida', className: 'bg-muted text-muted-foreground' },
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
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl sm:text-5xl">Minhas Novels</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {novels?.length ?? 0} {novels?.length === 1 ? 'novel' : 'novels'} na biblioteca
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" className="rounded-full px-5" onClick={() => { setShowForm((v) => !v); setFormError('') }}>
            <Plus className="size-4" />
            {showForm ? 'Cancelar' : 'Adicionar'}
          </Button>
          {novels?.length ? (
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-sm">
              {Math.round(novels.reduce((acc, novel) => acc + progressPercent(novel), 0) / novels.length)}% lido
            </Badge>
          ) : null}
        </div>
      </section>

      {showForm && (
        <Card className="surface-panel py-0">
          <CardHeader className="pb-0">
            <CardTitle>Adicionar novel</CardTitle>
            <CardDescription>URL da fonte e nome de exibição.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {formError && (
              <div className="mb-4 rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {formError}
              </div>
            )}

            <form onSubmit={handleAdd} className="grid gap-4 lg:grid-cols-[1.5fr_1fr_auto]">
              <Input
                type="url"
                required
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://www.webnovel.com/book/..."
                className="h-11 rounded-xl bg-background/70"
              />
              <Input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nome da novel"
                className="h-11 rounded-xl bg-background/70"
              />
              <Button type="submit" disabled={addMutation.isPending} className="h-11 rounded-xl px-5">
                {addMutation.isPending ? 'Adicionando...' : 'Salvar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="surface-panel py-0">
              <CardContent className="flex gap-4 py-6">
                <Skeleton className="h-28 w-20 rounded-2xl" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-2 w-full rounded-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !novels?.length ? (
        <Card className="hero-panel py-0">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-5 flex size-16 items-center justify-center rounded-3xl bg-primary/12 text-primary">
              <BookMarked className="size-8" />
            </div>
            <h2 className="text-3xl">Biblioteca vazia</h2>
            <Button className="mt-6 rounded-full px-5" onClick={() => setShowForm(true)}>
              <Plus className="size-4" />
              Adicionar primeira novel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {novels.map((novel) => {
            const pct = progressPercent(novel)
            const status = STATUS_MAP[novel.status]
            const coverImageUrl = resolveCoverImageUrl(novel.coverUrl)

            return (
              <Link key={novel.novelId} to={`/novels/${novel.novelId}`} className="group">
                <Card className="surface-panel h-full py-0 transition-transform duration-200 hover:-translate-y-1">
                  <CardContent className="flex h-full flex-col gap-5 py-5">
                    <div className="flex gap-4">
                      {coverImageUrl ? (
                        <img
                          src={coverImageUrl}
                          alt={novel.title}
                          className="h-32 w-24 rounded-2xl object-cover ring-1 ring-border"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="flex h-32 w-24 items-center justify-center rounded-2xl bg-muted text-2xl">
                          📚
                        </div>
                      )}

                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="line-clamp-2 text-xl leading-snug transition-colors group-hover:text-primary">
                            {novel.title}
                          </h3>
                        </div>
                        <Badge className={`mt-3 w-fit rounded-full border-0 ${status.className}`}>
                          {status.label}
                        </Badge>
                        <p className="mt-auto pt-4 text-sm text-muted-foreground">
                          Capítulo {novel.lastReadChapterNumber ?? 0} de {novel.lastChapterNumber ?? 0}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progresso</span>
                        <span className="font-semibold text-foreground">{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-primary to-orange-300 dark:to-amber-200"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
