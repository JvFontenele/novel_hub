import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { novelsApi } from '@/api/novels'
import type { ChapterListItem } from '@novel-hub/contracts'
import DOMPurify from 'dompurify'

type ContentState = 'pending' | 'loading' | 'loaded' | 'saved' | 'error'
type Phase = 'idle' | 'listing' | 'ready' | 'running' | 'done'

// Delay between API fetches to avoid 429
const FETCH_GAP_MS = 400
// Delay after scrolling to a chapter for browser to translate it
const TRANSLATE_WAIT_MS = 2000

export function TranslatePage() {
  const { novelId } = useParams<{ novelId: string }>()
  const [phase, setPhase] = useState<Phase>('idle')
  const [language, setLanguage] = useState('pt-br')
  const [chapterList, setChapterList] = useState<ChapterListItem[]>([])
  const [contentMap, setContentMap] = useState<Map<string, string>>(new Map())
  const [stateMap, setStateMap] = useState<Map<string, ContentState>>(new Map())
  const [progress, setProgress] = useState({ done: 0, total: 0, current: '' })
  const [errors, setErrors] = useState<string[]>([])

  const abortRef = useRef(false)
  const fetchQueueRef = useRef<string[]>([])
  const fetchRunningRef = useRef(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const placeholderRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const contentRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Rate-limited fetch queue
  const enqueueFetch = useCallback((chapterId: string) => {
    if (!novelId) return
    setStateMap((prev) => {
      if (prev.get(chapterId) !== 'pending') return prev
      const next = new Map(prev)
      next.set(chapterId, 'loading')
      return next
    })
    fetchQueueRef.current.push(chapterId)
    if (!fetchRunningRef.current) processFetchQueue()
  }, [novelId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function processFetchQueue() {
    if (!novelId) return
    fetchRunningRef.current = true
    while (fetchQueueRef.current.length > 0 && !abortRef.current) {
      const chapterId = fetchQueueRef.current.shift()!
      try {
        const data = await novelsApi.getChapterContent(novelId, chapterId)
        setContentMap((prev) => new Map(prev).set(chapterId, data.content))
        setStateMap((prev) => new Map(prev).set(chapterId, 'loaded'))
      } catch {
        setStateMap((prev) => new Map(prev).set(chapterId, 'error'))
      }
      await delay(FETCH_GAP_MS)
    }
    fetchRunningRef.current = false
  }

  // Load chapter metadata list (no content)
  async function loadList() {
    if (!novelId) return
    setPhase('listing')
    const all: ChapterListItem[] = []
    let page = 1
    while (true) {
      const res = await novelsApi.chapters(novelId, page, 50, 'asc')
      all.push(...res.items.filter((ch) => ch.hasContent))
      if (res.items.length < 50) break
      page++
    }
    const initialState = new Map(all.map((ch) => [ch.chapterId, 'pending' as ContentState]))
    setChapterList(all)
    setStateMap(initialState)
    setProgress({ done: 0, total: all.length, current: '' })
    setPhase('ready')
  }

  // Setup IntersectionObserver after chapter list is ready
  useEffect(() => {
    if (phase !== 'ready' && phase !== 'running') return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const chapterId = (entry.target as HTMLElement).dataset.chapterId
          if (!chapterId) return
          setStateMap((prev) => {
            if (prev.get(chapterId) === 'pending') enqueueFetch(chapterId)
            return prev
          })
        })
      },
      { rootMargin: '400px 0px', threshold: 0 },
    )

    placeholderRefs.current.forEach((el) => observerRef.current?.observe(el))

    return () => observerRef.current?.disconnect()
  }, [phase, enqueueFetch])

  // Auto-scroll and capture translations
  async function startTranslation() {
    if (!novelId || chapterList.length === 0) return
    abortRef.current = false
    setPhase('running')

    let done = 0
    const errs: string[] = []

    for (const ch of chapterList) {
      if (abortRef.current) break

      setProgress({ done, total: chapterList.length, current: `Cap. ${ch.chapterNumber}` })

      // Scroll to chapter placeholder to trigger IntersectionObserver load
      const placeholder = placeholderRefs.current.get(ch.chapterId)
      placeholder?.scrollIntoView({ behavior: 'smooth', block: 'center' })

      // Wait for content to load (up to 10s)
      const loaded = await waitFor(
        () => stateMapRef.current.get(ch.chapterId) === 'loaded',
        10_000,
      )

      if (!loaded) {
        errs.push(`Cap. ${ch.chapterNumber}`)
        done++
        continue
      }

      // Scroll content into view and wait for browser translation
      const contentEl = contentRefs.current.get(ch.chapterId)
      contentEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      await delay(TRANSLATE_WAIT_MS)

      if (abortRef.current) break

      // Capture translated HTML, sanitize to keep only structural tags
      // (removes <font>, data-* attrs and other artifacts added by browser translation)
      const raw = contentEl?.innerHTML?.trim()
      const translated = raw
        ? DOMPurify.sanitize(raw, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li',
                           'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'div', 'span'],
            ALLOWED_ATTR: [],
          })
        : null
      if (translated) {
        try {
          await novelsApi.saveTranslation(novelId, ch.chapterId, language, translated)
          setStateMap((prev) => new Map(prev).set(ch.chapterId, 'saved'))
        } catch {
          errs.push(`Cap. ${ch.chapterNumber}`)
        }
      }

      done++
      setProgress({ done, total: chapterList.length, current: '' })
    }

    setErrors(errs)
    setPhase('done')
  }

  // Keep a ref to stateMap for use inside async loops
  const stateMapRef = useRef(stateMap)
  useEffect(() => { stateMapRef.current = stateMap }, [stateMap])

  function stop() {
    abortRef.current = true
    setPhase('done')
  }

  useEffect(() => () => { abortRef.current = true }, [])

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
  const loadedCount = [...stateMap.values()].filter((s) => s === 'loaded' || s === 'saved').length
  const savedCount = [...stateMap.values()].filter((s) => s === 'saved').length

  return (
    <div>
      {/* Sticky control panel */}
      <div className="sticky top-0 z-50 bg-ink-1 border-b border-ink-3 px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={`/novels/${novelId}`} className="text-xs text-parchment-muted hover:text-parchment font-body">
                ← Voltar
              </Link>
              <span className="text-sm font-display text-parchment">Modo Tradução</span>
            </div>
            {phase === 'running' && (
              <button onClick={stop} className="rounded-lg border border-red-500/30 px-3 py-1 text-xs text-red-400 font-body">
                Parar
              </button>
            )}
          </div>

          {phase === 'idle' && (
            <div className="flex items-center gap-3 flex-wrap">
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input-field !py-1.5 !text-xs w-auto">
                <option value="pt-br">Português (pt-br)</option>
                <option value="es">Español (es)</option>
                <option value="fr">Français (fr)</option>
                <option value="de">Deutsch (de)</option>
                <option value="ja">日本語 (ja)</option>
                <option value="ko">한국어 (ko)</option>
              </select>
              <button onClick={loadList} className="rounded-lg bg-amber px-4 py-1.5 text-xs font-semibold text-ink font-body">
                Carregar lista
              </button>
            </div>
          )}

          {phase === 'listing' && (
            <p className="text-xs text-parchment-muted font-body animate-pulse">Carregando lista de capítulos...</p>
          )}

          {phase === 'ready' && (
            <div className="space-y-1">
              <p className="text-xs text-parchment-muted font-body">
                {chapterList.length} capítulos. Conteúdo carregado sob demanda ao rolar.{' '}
                <strong className="text-parchment">Ative a tradução do browser</strong> para{' '}
                <strong className="text-amber">{language}</strong> e clique Iniciar.
              </p>
              <div className="flex items-center gap-3">
                <button onClick={startTranslation} className="rounded-lg bg-amber px-4 py-1.5 text-xs font-semibold text-ink font-body">
                  Iniciar
                </button>
                <span className="text-xs text-parchment-muted font-body tabular">{loadedCount} carregados</span>
              </div>
            </div>
          )}

          {phase === 'running' && (
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-ink-3 rounded-full overflow-hidden">
                  <div className="h-full bg-amber rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-parchment-muted font-body tabular w-20 text-right">
                  {progress.done}/{progress.total}
                </span>
              </div>
              <p className="text-xs text-parchment-muted font-body">
                {progress.current ? `Traduzindo ${progress.current}` : 'Processando...'} · {savedCount} salvos
              </p>
            </div>
          )}

          {phase === 'done' && (
            <div className="space-y-1">
              <p className="text-xs text-parchment font-body">
                ✓ Concluído — {savedCount} capítulos salvos em <span className="text-amber">{language}</span>.
              </p>
              {errors.length > 0 && (
                <p className="text-xs text-red-400 font-body">Erros: {errors.join(', ')}</p>
              )}
              <button onClick={() => { setPhase('idle'); setChapterList([]); setContentMap(new Map()); setStateMap(new Map()) }}
                className="rounded-lg border border-ink-3 px-3 py-1 text-xs text-parchment-muted font-body">
                Novo idioma
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chapter list — lazy loaded */}
      <div className="max-w-4xl mx-auto px-4 py-2">
        {chapterList.map((ch) => {
          const s = stateMap.get(ch.chapterId) ?? 'pending'
          const html = contentMap.get(ch.chapterId)
          return (
            <div
              key={ch.chapterId}
              data-chapter-id={ch.chapterId}
              ref={(el) => {
                if (el) placeholderRefs.current.set(ch.chapterId, el)
                else placeholderRefs.current.delete(ch.chapterId)
              }}
              className="mb-1 min-h-[20px]"
            >
              {s === 'pending' && (
                <div className="h-4 bg-ink-3/30 rounded animate-pulse" />
              )}
              {s === 'loading' && (
                <div className="h-4 bg-amber/10 rounded animate-pulse" />
              )}
              {(s === 'loaded' || s === 'saved') && html && (
                <div
                  ref={(el) => {
                    if (el) contentRefs.current.set(ch.chapterId, el)
                    else contentRefs.current.delete(ch.chapterId)
                  }}
                  style={{ fontSize: '5px', lineHeight: 1.2 }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
                />
              )}
              {s === 'error' && (
                <div className="h-4 bg-red-500/10 rounded" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function waitFor(condition: () => boolean, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now()
    const check = () => {
      if (condition()) return resolve(true)
      if (Date.now() - start > timeoutMs) return resolve(false)
      setTimeout(check, 200)
    }
    check()
  })
}
