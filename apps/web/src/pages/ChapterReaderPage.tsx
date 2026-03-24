import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { novelsApi } from '@/api/novels'
import type { ChapterListItem } from '@novel-hub/contracts'

export function ChapterReaderPage() {
  const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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
    queryKey: ['chapters', novelId],
    queryFn: () => novelsApi.chapters(novelId!),
    enabled: !!novelId,
  })

  const fetchContentMutation = useMutation({
    mutationFn: () => novelsApi.fetchChapterContent(novelId!, chapterId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-content', novelId, chapterId] })
      queryClient.invalidateQueries({ queryKey: ['chapters', novelId] })
    },
  })

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
      <div className="max-w-2xl mx-auto text-center py-16">
        <Link
          to={`/novels/${novelId}`}
          className="inline-flex items-center gap-1.5 text-xs text-parchment-muted hover:text-parchment transition-colors mb-8 font-body"
        >
          ← Voltar à novel
        </Link>
        <p className="text-parchment-muted font-body mb-6">
          O conteúdo deste capítulo ainda não foi buscado.
        </p>
        <button
          onClick={() => fetchContentMutation.mutate()}
          disabled={fetchContentMutation.isPending}
          className="bg-amber hover:bg-amber-light text-ink text-sm font-semibold px-6 py-2.5 rounded-lg transition-all disabled:opacity-40 font-body"
        >
          {fetchContentMutation.isPending ? 'Buscando...' : 'Buscar conteúdo agora'}
        </button>
        {fetchContentMutation.isError && (
          <p className="text-red-400 text-sm mt-4 font-body">
            Erro ao buscar conteúdo. Tente novamente.
          </p>
        )}
      </div>
    )
  }

  if (!chapter) return null

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <Link
          to={`/novels/${novelId}`}
          className="inline-flex items-center gap-1.5 text-xs text-parchment-muted hover:text-parchment transition-colors font-body flex-shrink-0"
        >
          ← Voltar
        </Link>

        <div className="min-w-0 text-center">
          {novel && (
            <p className="text-[11px] text-parchment-muted font-body truncate">{novel.title}</p>
          )}
          <p className="text-sm font-body text-parchment truncate">
            {chapter.title
              ? <><span className="text-parchment-muted">Cap. {chapter.chapterNumber}</span> — {chapter.title}</>
              : `Capítulo ${chapter.chapterNumber}`}
          </p>
        </div>

        <a
          href={chapter.url}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir no site original"
          className="text-parchment-muted hover:text-parchment transition-colors text-sm flex-shrink-0"
        >
          ↗
        </a>
      </div>

      {/* Chapter content */}
      <div
        className="card p-6 mb-6 font-body text-parchment text-base leading-relaxed chapter-content"
        dangerouslySetInnerHTML={{ __html: chapter.content }}
      />

      {/* Bottom navigation */}
      <div className="flex items-center justify-between gap-3 pb-8">
        <button
          onClick={() => prevChapter && navigate(`/novels/${novelId}/chapters/${prevChapter.chapterId}`)}
          disabled={!prevChapter}
          className="rounded-lg border border-ink-3 bg-ink-2 px-4 py-2 text-xs font-semibold text-parchment-muted hover:text-parchment hover:border-ink-4 transition-colors disabled:opacity-30 font-body"
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
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all font-body ${
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
          className="rounded-lg border border-ink-3 bg-ink-2 px-4 py-2 text-xs font-semibold text-parchment-muted hover:text-parchment hover:border-ink-4 transition-colors disabled:opacity-30 font-body"
        >
          Cap. seguinte →
        </button>
      </div>
    </div>
  )
}
