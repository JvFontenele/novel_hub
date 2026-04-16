import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { novelsApi } from '@/api/novels'
import type { ChapterListItem } from '@novel-hub/contracts'
import { ConfirmDialog } from '@/components/ConfirmDialog'

type ReaderFont = 'site' | 'arial' | 'georgia' | 'verdana'

const READER_NAV_PAGE_SIZE = 10000
const READER_FONT_STORAGE_KEY = 'novel-hub-reader-font'
const READER_FONT_SIZE_STORAGE_KEY = 'novel-hub-reader-font-size'
const DEFAULT_READER_FONT_SIZE = 18
const MIN_READER_FONT_SIZE = 14
const MAX_READER_FONT_SIZE = 28

const READER_FONT_OPTIONS: Array<{ value: ReaderFont; label: string }> = [
  { value: 'site', label: 'Original do site' },
  { value: 'arial', label: 'Arial' },
  { value: 'georgia', label: 'Georgia' },
  { value: 'verdana', label: 'Verdana' },
]

const READER_FONT_FAMILIES: Record<ReaderFont, string> = {
  site: 'Inter, "Segoe UI", sans-serif',
  arial: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  verdana: 'Verdana, Geneva, sans-serif',
}

function getStoredReaderFont(): ReaderFont {
  if (typeof window === 'undefined') return 'site'
  const stored = window.localStorage.getItem(READER_FONT_STORAGE_KEY)
  if (stored === 'serif') return 'georgia'
  if (stored === 'sans') return 'site'
  return READER_FONT_OPTIONS.some((option) => option.value === stored) ? (stored as ReaderFont) : 'site'
}

function getStoredReaderFontSize(): number {
  if (typeof window === 'undefined') return DEFAULT_READER_FONT_SIZE
  const stored = window.localStorage.getItem(READER_FONT_SIZE_STORAGE_KEY)
  const parsed = Number(stored)
  if (Number.isFinite(parsed)) {
    return Math.min(MAX_READER_FONT_SIZE, Math.max(MIN_READER_FONT_SIZE, parsed))
  }
  return DEFAULT_READER_FONT_SIZE
}

export function ChapterReaderPage() {
  const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isQueued, setIsQueued] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [readerFont, setReaderFont] = useState<ReaderFont>(getStoredReaderFont)
  const [readerFontSize, setReaderFontSize] = useState<number>(getStoredReaderFontSize)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement | null>(null)
  const actionsRef = useRef<HTMLDivElement | null>(null)

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
    queryFn: () => novelsApi.chapters(novelId!, 1, READER_NAV_PAGE_SIZE, 'asc'),
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

  const progressMutation = useMutation({
    mutationFn: (chapterNumber: number) => novelsApi.updateProgress(novelId!, chapterNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['novel', novelId] })
      queryClient.invalidateQueries({ queryKey: ['novels'] })
    },
  })

  useEffect(() => {
    if (chapter) {
      setIsQueued(false)
    }
  }, [chapter])

  useEffect(() => {
    window.localStorage.setItem(READER_FONT_STORAGE_KEY, readerFont)
  }, [readerFont])

  useEffect(() => {
    window.localStorage.setItem(READER_FONT_SIZE_STORAGE_KEY, String(readerFontSize))
  }, [readerFontSize])

  useEffect(() => {
    setSettingsOpen(false)
    setActionsOpen(false)
  }, [chapterId])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node

      if (settingsRef.current && !settingsRef.current.contains(target)) {
        setSettingsOpen(false)
      }

      if (actionsRef.current && !actionsRef.current.contains(target)) {
        setActionsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    if (!isQueued || !novelId || !chapterId) return

    const intervalId = window.setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['chapter-content', novelId, chapterId] })
      queryClient.invalidateQueries({ queryKey: ['chapters', novelId] })
    }, 3000)

    return () => window.clearInterval(intervalId)
  }, [chapterId, isQueued, novelId, queryClient])

  const allChapters: ChapterListItem[] = chaptersData?.items ?? []
  const currentIndex = allChapters.findIndex((item) => item.chapterId === chapterId)
  const currentChapterMeta = currentIndex >= 0 ? allChapters[currentIndex] : null
  const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null
  const nextChapter = currentIndex >= 0 && currentIndex < allChapters.length - 1
    ? allChapters[currentIndex + 1]
    : null

  const chapterNumber = chapter?.chapterNumber ?? currentChapterMeta?.chapterNumber ?? null
  const chapterTitle = chapter?.title ?? currentChapterMeta?.title ?? null
  const chapterSourceUrl = chapter?.url ?? currentChapterMeta?.url ?? null
  const hasChapterContent = Boolean(chapter?.content)
  const chapterContentHtml = chapter?.content ?? ''
  const isNotFound = isError && (error as { response?: { status?: number } })?.response?.status === 404
  const isMissingChapter = !isLoading && !chapter && !currentChapterMeta && !isNotFound
  const isRead = chapterNumber != null && novel
    ? chapterNumber <= (novel.lastReadChapterNumber ?? 0)
    : false
  const normalizedReaderFontSize = Math.min(MAX_READER_FONT_SIZE, Math.max(MIN_READER_FONT_SIZE, readerFontSize || DEFAULT_READER_FONT_SIZE))
  const selectedReaderFontFamily = READER_FONT_FAMILIES[readerFont]
  const isSerifReaderFont = readerFont === 'georgia'
  const readerContentStyle = {
    fontFamily: selectedReaderFontFamily,
    fontSize: `${normalizedReaderFontSize}px`,
    lineHeight: isSerifReaderFont
      ? Math.max(1.85, Number((1.62 + normalizedReaderFontSize / 38).toFixed(2)))
      : Math.max(1.75, Number((1.55 + normalizedReaderFontSize / 40).toFixed(2))),
  } satisfies CSSProperties
  const readerEmptyStateStyle = {
    fontFamily: selectedReaderFontFamily,
  } satisfies CSSProperties

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 reader-wrap mx-auto">
        <div className="h-4 bg-ink-3 rounded w-32" />
        <div className="h-6 bg-ink-3 rounded w-3/4" />
        <div className="space-y-3 mt-8">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-4 bg-ink-3 rounded" style={{ width: `${70 + (index % 3) * 10}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (isMissingChapter) {
    return (
      <div className="reader-wrap mx-auto text-center py-12 sm:py-16">
        <p className="text-parchment-muted font-body">Capítulo não encontrado.</p>
      </div>
    )
  }

  if (!currentChapterMeta && !chapter && !isNotFound) return null

  return (
    <div className="reader-wrap mx-auto animate-fade-in">
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

      <div className="card reader-header p-5 sm:p-6 mb-7">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <Link
              to={`/novels/${novelId}`}
              className="inline-flex items-center gap-1.5 text-xs text-parchment-muted hover:text-parchment transition-colors font-body"
            >
              ← Voltar à novel
            </Link>

            <div className="reader-actions flex items-center gap-2 flex-shrink-0">
              <div ref={settingsRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen((current) => !current)
                    setActionsOpen(false)
                  }}
                  aria-label="Abrir configurações de leitura"
                  title="Configurações"
                  className="rounded-lg border border-ink-3 bg-ink-2 px-3 py-2 text-sm font-semibold text-parchment-muted hover:text-parchment hover:border-ink-4 transition-colors font-body"
                >
                  ⚙
                </button>
                {settingsOpen && (
                  <div className="reader-popover absolute right-0 top-[calc(100%+0.55rem)] z-20 w-56 rounded-xl border border-ink-3 bg-ink-1 p-3 shadow-xl">
                    <p className="reader-meta text-[11px] uppercase tracking-[0.16em] font-body mb-3">Leitura</p>
                    <div className="space-y-3">
                      <label className="block">
                        <span className="reader-meta text-xs font-body mb-1.5 block">Fonte</span>
                        <select
                          value={readerFont}
                          onChange={(e) => setReaderFont(e.target.value as ReaderFont)}
                          className="input-field !py-2 !px-3 !text-xs"
                        >
                          {READER_FONT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="reader-meta text-xs font-body mb-1.5 block">Tamanho</span>
                        <input
                          type="number"
                          min={MIN_READER_FONT_SIZE}
                          max={MAX_READER_FONT_SIZE}
                          value={readerFontSize}
                          onChange={(e) => setReaderFontSize(Number(e.target.value) || DEFAULT_READER_FONT_SIZE)}
                          className="input-field !py-2 !px-3 !text-xs"
                        />
                        <span className="reader-meta text-[11px] font-body mt-1.5 block">
                          Entre {MIN_READER_FONT_SIZE}px e {MAX_READER_FONT_SIZE}px
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div ref={actionsRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen((current) => !current)
                    setSettingsOpen(false)
                  }}
                  aria-label="Abrir ações do capítulo"
                  title="Ações"
                  className="rounded-lg border border-ink-3 bg-ink-2 px-3 py-2 text-sm font-semibold text-parchment-muted hover:text-parchment hover:border-ink-4 transition-colors font-body"
                >
                  ⋯
                </button>
                {actionsOpen && (
                  <div className="reader-popover absolute right-0 top-[calc(100%+0.55rem)] z-20 w-56 rounded-xl border border-ink-3 bg-ink-1 p-2 shadow-xl">
                    <div className="flex flex-col">
                      {chapterSourceUrl && (
                        <a
                          href={chapterSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir no site original"
                          className="reader-menu-item"
                        >
                          Abrir original
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setActionsOpen(false)
                          reprocessMutation.mutate()
                        }}
                        disabled={reprocessMutation.isPending}
                        className="reader-menu-item text-left disabled:opacity-40"
                      >
                        {reprocessMutation.isPending ? 'Reprocessando...' : 'Reprocessar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActionsOpen(false)
                          setDeleteDialogOpen(true)
                        }}
                        disabled={deleteContentMutation.isPending || !hasChapterContent}
                        className="reader-menu-item reader-menu-item-danger text-left disabled:opacity-40"
                      >
                        Excluir conteúdo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="min-w-0">
            {novel && (
              <p className="reader-meta text-[11px] uppercase tracking-[0.22em] font-body break-words">{novel.title}</p>
            )}
            <h1 className="mt-2 font-display text-xl sm:text-2xl text-parchment leading-tight break-words">
              {chapterTitle ?? (chapterNumber != null ? `Capítulo ${chapterNumber}` : 'Capítulo')}
            </h1>
            <p className="reader-meta mt-2 text-sm font-body">
              {chapterNumber != null ? `Capítulo ${chapterNumber}` : 'Capítulo sem número'}
            </p>
          </div>
        </div>
      </div>

      {hasChapterContent ? (
        <div
          className="card reader-surface reader-content chapter-content overflow-x-auto px-6 py-7 sm:px-10 sm:py-11 mb-7"
          style={readerContentStyle}
          dangerouslySetInnerHTML={{ __html: chapterContentHtml }}
        />
      ) : (
        <div className="card reader-surface px-6 py-8 sm:px-10 sm:py-11 mb-7">
          <div className="reader-empty-state text-center" style={readerEmptyStateStyle}>
            <p className="reader-meta font-body text-sm mb-2">
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
              className="btn-primary max-w-xs mx-auto"
            >
              {fetchContentMutation.isPending ? 'Enfileirando...' : isQueued ? 'Processando...' : 'Buscar conteúdo agora'}
            </button>
            {fetchContentMutation.isError && (
              <p className="text-red-400 text-sm mt-4 font-body">
                Erro ao enfileirar conteúdo. Tente novamente.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="reader-actions flex flex-col gap-2 pb-8 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => prevChapter && navigate(`/novels/${novelId}/chapters/${prevChapter.chapterId}`)}
          disabled={!prevChapter}
          className="w-full sm:w-auto rounded-lg border border-ink-3 bg-ink-2 px-4 py-2 text-xs font-semibold text-parchment-muted hover:text-parchment hover:border-ink-4 transition-colors disabled:opacity-30 font-body"
        >
          ← Cap. anterior
        </button>

        <button
          onClick={() => {
            if (!isRead && chapterNumber != null) {
              progressMutation.mutate(chapterNumber)
            }
          }}
          disabled={isRead || progressMutation.isPending || chapterNumber == null}
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
