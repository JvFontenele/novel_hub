import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { novelsApi } from '@/api/novels'
import type { ChapterListItem } from '@novel-hub/contracts'

type Phase = 'idle' | 'loading' | 'ready' | 'scrolling' | 'capturing' | 'done'

const SCROLL_DELAY_MS = 800   // ms entre passos de scroll
const CAPTURE_DELAY_MS = 2500 // ms após scroll para browser traduzir

export function TranslatePage() {
  const { novelId } = useParams<{ novelId: string }>()
  const [phase, setPhase] = useState<Phase>('idle')
  const [language, setLanguage] = useState('pt-br')
  const [chapters, setChapters] = useState<(ChapterListItem & { content: string })[]>([])
  const [progress, setProgress] = useState({ done: 0, total: 0, current: '' })
  const [errors, setErrors] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const chapterRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const abortRef = useRef(false)

  async function loadChapters() {
    if (!novelId) return
    setPhase('loading')
    setErrors([])

    const allChapters: (ChapterListItem & { content: string })[] = []
    let page = 1
    const pageSize = 50

    while (true) {
      const res = await novelsApi.chapters(novelId, page, pageSize, 'asc')
      const withContent = res.items.filter((ch) => ch.hasContent)

      await Promise.all(
        withContent.map(async (ch) => {
          try {
            const data = await novelsApi.getChapterContent(novelId, ch.chapterId)
            allChapters.push({ ...ch, content: data.content })
          } catch {
            // skip chapters that fail to load
          }
        }),
      )

      if (res.items.length < pageSize) break
      page++
    }

    allChapters.sort((a, b) => a.chapterNumber - b.chapterNumber)
    setChapters(allChapters)
    setProgress({ done: 0, total: allChapters.length, current: '' })
    setPhase('ready')
  }

  async function startTranslation() {
    if (!novelId || chapters.length === 0) return
    abortRef.current = false
    setPhase('scrolling')

    // Scroll through all content so browser translates it
    const container = containerRef.current
    if (container) {
      const totalHeight = container.scrollHeight
      const step = window.innerHeight
      for (let pos = 0; pos <= totalHeight; pos += step) {
        if (abortRef.current) return
        window.scrollTo({ top: pos, behavior: 'smooth' })
        await delay(SCROLL_DELAY_MS)
      }
    }

    // Wait for browser translation to apply
    await delay(CAPTURE_DELAY_MS)
    setPhase('capturing')

    let done = 0
    const errs: string[] = []

    for (const ch of chapters) {
      if (abortRef.current) break

      const el = chapterRefs.current.get(ch.chapterId)
      if (!el) continue

      setProgress({ done, total: chapters.length, current: `Cap. ${ch.chapterNumber}` })

      // Scroll to this chapter so browser has translated it
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      await delay(400)

      const translated = el.innerText.trim()
      if (translated && translated !== stripHtml(ch.content)) {
        try {
          await novelsApi.saveTranslation(novelId, ch.chapterId, language, translated)
        } catch {
          errs.push(`Cap. ${ch.chapterNumber}`)
        }
      }

      done++
    }

    setErrors(errs)
    setProgress({ done, total: chapters.length, current: '' })
    setPhase('done')
  }

  function stop() {
    abortRef.current = true
    setPhase('done')
  }

  useEffect(() => {
    return () => { abortRef.current = true }
  }, [])

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div>
      {/* Control panel — sticky */}
      <div className="sticky top-0 z-50 bg-ink-1 border-b border-ink-3 px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Link to={`/novels/${novelId}`} className="text-xs text-parchment-muted hover:text-parchment font-body">
              ← Voltar
            </Link>
            <span className="text-sm font-display text-parchment">Modo Tradução</span>
          </div>

          {phase === 'idle' && (
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="input-field !py-1.5 !text-xs w-auto"
              >
                <option value="pt-br">Português (pt-br)</option>
                <option value="es">Español (es)</option>
                <option value="fr">Français (fr)</option>
                <option value="de">Deutsch (de)</option>
                <option value="ja">日本語 (ja)</option>
                <option value="ko">한국어 (ko)</option>
              </select>
              <button onClick={loadChapters} className="rounded-lg bg-amber px-4 py-1.5 text-xs font-semibold text-ink font-body">
                Carregar capítulos
              </button>
            </div>
          )}

          {phase === 'loading' && (
            <p className="text-xs text-parchment-muted font-body animate-pulse">Carregando capítulos...</p>
          )}

          {phase === 'ready' && (
            <div className="space-y-2">
              <p className="text-xs text-parchment-muted font-body">
                {chapters.length} capítulos carregados. <strong className="text-parchment">Ative a tradução do seu browser</strong> para <strong className="text-amber">{language}</strong> e clique em Iniciar.
              </p>
              <button onClick={startTranslation} className="rounded-lg bg-amber px-4 py-1.5 text-xs font-semibold text-ink font-body">
                Iniciar tradução automática
              </button>
            </div>
          )}

          {(phase === 'scrolling' || phase === 'capturing') && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-ink-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-parchment-muted font-body tabular w-20 text-right">
                  {progress.done}/{progress.total}
                </span>
                <button onClick={stop} className="rounded-lg border border-red-500/30 px-3 py-1 text-xs text-red-400 font-body">
                  Parar
                </button>
              </div>
              <p className="text-xs text-parchment-muted font-body">
                {phase === 'scrolling' ? 'Percorrendo página para tradução...' : `Capturando: ${progress.current}`}
              </p>
            </div>
          )}

          {phase === 'done' && (
            <div className="space-y-1">
              <p className="text-xs text-parchment font-body">
                ✓ Concluído — {progress.done} capítulos processados em <span className="text-amber">{language}</span>.
              </p>
              {errors.length > 0 && (
                <p className="text-xs text-red-400 font-body">Erros nos capítulos: {errors.join(', ')}</p>
              )}
              <button onClick={() => { setPhase('idle'); setChapters([]) }} className="rounded-lg border border-ink-3 px-3 py-1 text-xs text-parchment-muted font-body">
                Novo idioma
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chapter content — tiny font for speed */}
      <div ref={containerRef} className="max-w-4xl mx-auto px-4 py-2">
        {chapters.map((ch) => (
          <div key={ch.chapterId} className="mb-1">
            <div
              ref={(el) => {
                if (el) chapterRefs.current.set(ch.chapterId, el)
                else chapterRefs.current.delete(ch.chapterId)
              }}
              style={{ fontSize: '5px', lineHeight: 1.2, userSelect: 'none' }}
              dangerouslySetInnerHTML={{ __html: ch.content }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').trim()
}
