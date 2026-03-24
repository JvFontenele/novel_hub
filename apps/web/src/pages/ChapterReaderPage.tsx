import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { novelsApi } from '@/api/novels'
import type { ChapterListItem } from '@novel-hub/contracts'
import { ConfirmDialog } from '@/components/ConfirmDialog'

export function ChapterReaderPage() {
  const READER_NAV_PAGE_SIZE = 10000
  const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isQueued, setIsQueued] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { data: chapter, isLoading, isError, error } = useQuery({
    queryKey: ['chapter-content', novelId, chapterId],
    queryFn: () => novelsApi.getChapterContent(novelId!, chapterId!),
    enabled: !!novelId && !!chapterId,
    retry: false,
  })

  const { data: novel } = useQuery({
    queryKey: ['novel', novelId],
    queryFn: () => novelsApi.get(novelId!),
    enabled: !!novelId,
  })

  const { data: chaptersData } = useQuery({
    queryKey: ['chapters-reader-nav', novelId],
    queryFn: () => novelsApi.chapters(novelId!, 1, READER_NAV_PAGE_SIZE),
    enabled: !!novelId,
  })

  const fetchContentMutation = useMutation({
    mutationFn: () => novelsApi.fetchChapterContent(novelId!, chapterId!),
    onSuccess: () => {
      setIsQueued(true)
      queryClient.invalidateQueries({ queryKey: ['chapter-content', novelId, chapterId] })
      queryClient.invalidateQueries({ queryKey: ['chapters', novelId] })
    },
  })

  const reprocessMutation = useMutation({
    mutationFn: () => novelsApi.reprocessChapterContent(novelId!, chapterId!),
    onSuccess: () => {
      setIsQueued(true)
      queryClient.removeQueries({ queryKey: ['chapter-content', novelId, chapterId] })
      queryClient.invalidateQueries({ queryKey: ['chapters', novelId] })
    },
  })

  const deleteContentMutation = useMutation({
    mutationFn: () => novelsApi.deleteChapterContent(novelId!, chapterId!),
    onSuccess: () => {
      setDeleteDialogOpen(false)
      setIsQueued(false)
      queryClient.removeQueries({ queryKey: ['chapter-content', novelId, chapterId] })
      queryClient.invalidateQueries({ queryKey: ['chapters', novelId] })
    },
  })

  useEffect(() => {
    if (chapter) {
      setIsQueued(false)
    }
  }, [chapter])

  useEffect(() => {
    if (!isQueued || !novelId || !chapterId) return

    const intervalId = window.setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['chapter-content', novelId, chapterId] })
      queryClient.invalidateQueries({ queryKey: ['chapters', novelId] })
    }, 3000)

    return () => window.clearInterval(intervalId)
  }, [chapterId, isQueued, novelId, queryClient])

  const progressMutation = useMutation({
    mutationFn: (n: number) => novelsApi.updateProgress(novelId!, n),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['novel', novelId] })
      queryClient.invalidateQueries({ queryKey: ['novels'] })
    },
  })

  // Derive prev/next from the cached chapter list
  const allChapters: ChapterListItem[] = chaptersData?.items ?? []
  const sortedChapters = [...allChapters].sort((a, b) => a.chapterNumber - b.chapterNumber)
  const currentIndex = sortedChapters.findIndex((c) => c.chapterId === chapterId)
  const prevChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null
  const nextChapter = currentIndex >= 0 && currentIndex < sortedChapters.length - 1
    ? sortedChapters[currentIndex + 1]
    : null

  const isRead = chapter && novel
    ? chapter.chapterNumber <= (novel.lastReadChapterNumber ?? 0)
    : false

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 max-w-2xl mx-auto">
        <div className="h-4 bg-ink-3 rounded w-32" />
        <div className="h-6 bg-ink-3 rounded w-3/4" />
        <div className="space-y-3 mt-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 bg-ink-3 rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
          ))}
        </div>
      </div>
    )
  }

  // Content not yet fetched — prompt to fetch
  const isNotFound = isError && (error as { response?: { status?: number } })?.response?.status === 404

  if (isNotFound || (!isLoading && !chapter)) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 sm:py-16">
        <Link
          to={`/novels/${novelId}`}
          className="inline-flex items-center gap-1.5 text-xs text-parchment-muted hover:text-parchment transition-colors mb-8 font-body"
        >
          ← Voltar à novel
        </Link>
        <p className="text-parchment-muted font-body mb-2">
          {isQueued
            ? 'O capítulo está sendo processado em segundo plano.'
            : 'O conteúdo deste capítulo ainda não foi buscado.'}
        </p>
        {isQueued && (
          <p className="text-parchment-muted/80 text-xs font-body mb-6">
            Esta página atualiza automaticamente quando o worker terminar.
          </p>
        )}
        {!isQueued && <div className="mb-4" />}
        <button
          onClick={() => fetchContentMutation.mutate()}
          disabled={fetchContentMutation.isPending || isQueued}
          className="bg-amber hover:bg-amber-light text-ink text-sm font-semibold px-6 py-2.5 rounded-lg transition-all disabled:opacity-40 font-body"
        >
          {fetchContentMutation.isPending ? 'Enfileirando...' : isQueued ? 'Processando...' : 'Buscar conteúdo agora'}
        </button>
        {fetchContentMutation.isError && (
          <p className="text-red-400 text-sm mt-4 font-body">
            Erro ao enfileirar conteúdo. Tente novamente.
          </p>
        )}
      </div>
    )
  }

  if (!chapter) return null

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Excluir conteúdo do capítulo"
        description="O texto salvo será removido e a leitura deste capítulo ficará indisponível até você buscar novamente."
        confirmLabel="Excluir conteúdo"
        cancelLabel="Cancelar"
        confirmTone="danger"
        isPending={deleteContentMutation.isPending}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={() => deleteContentMutation.mutate()}
      />
      {/* Header */}
      <div className="card p-4 sm:p-5 mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              to={`/novels/${novelId}`}
              className="inline-flex items-center gap-1.5 text-xs text-parchment-muted hover:text-parchment transition-colors font-body"
            >
              ← Voltar à novel
            </Link>
            {novel && (
              <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-parchment-muted font-body break-words">{novel.title}</p>
            )}
            <h1 className="mt-2 font-display text-xl sm:text-2xl text-parchment leading-tight break-words">
              {chapter.title ?? `Capítulo ${chapter.chapterNumber}`}
            </h1>
            <p className="mt-2 text-sm text-parchment-muted font-body">
              Capítulo {chapter.chapterNumber}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <a
              href={chapter.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir no site original"
              className="rounded-lg border border-ink-3 bg-ink-2 px-3 py-2 text-xs font-semibold text-parchment-muted hover:text-parchment hover:border-ink-4 transition-colors font-body"
            >
              Abrir original
            </a>
            <button
              onClick={() => reprocessMutation.mutate()}
              disabled={reprocessMutation.isPending}
              className="rounded-lg border border-amber/30 bg-amber/10 px-3 py-2 text-xs font-semibold text-amber-light transition-colors hover:bg-amber/20 disabled:opacity-40 font-body"
            >
              {reprocessMutation.isPending ? 'Reprocessando...' : 'Reprocessar'}
            </button>
            <button
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleteContentMutation.isPending}
              className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/15 disabled:opacity-40 font-body"
            >
              Excluir conteúdo
            </button>
          </div>
        </div>
      </div>

      {/* Chapter content */}
      <div
        className="card reader-surface p-5 sm:p-8 mb-6 font-body text-parchment text-[17px] sm:text-[18px] leading-8 chapter-content overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: chapter.content }}
      />

      {/* Bottom navigation */}
      <div className="flex flex-col gap-2 pb-8 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => prevChapter && navigate(`/novels/${novelId}/chapters/${prevChapter.chapterId}`)}
          disabled={!prevChapter}
          className="w-full sm:w-auto rounded-lg border border-ink-3 bg-ink-2 px-4 py-2 text-xs font-semibold text-parchment-muted hover:text-parchment hover:border-ink-4 transition-colors disabled:opacity-30 font-body"
        >
          ← Cap. anterior
        </button>

        <button
          onClick={() => {
            if (!isRead) {
              progressMutation.mutate(chapter.chapterNumber)
            }
          }}
          disabled={isRead || progressMutation.isPending}
          className={`w-full sm:w-auto rounded-lg px-4 py-2 text-xs font-semibold transition-all font-body ${
            isRead
              ? 'bg-amber/10 text-amber border border-amber/30 opacity-60 cursor-default'
              : 'bg-amber hover:bg-amber-light text-ink disabled:opacity-40'
          }`}
        >
          {isRead ? '✓ Lido' : progressMutation.isPending ? 'Salvando...' : 'Marcar como lido'}
        </button>

        <button
          onClick={() => nextChapter && navigate(`/novels/${novelId}/chapters/${nextChapter.chapterId}`)}
          disabled={!nextChapter}
          className="w-full sm:w-auto rounded-lg border border-ink-3 bg-ink-2 px-4 py-2 text-xs font-semibold text-parchment-muted hover:text-parchment hover:border-ink-4 transition-colors disabled:opacity-30 font-body"
        >
          Cap. seguinte →
        </button>
      </div>
    </div>
  )
}
