import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, RotateCcw, X } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import ScratchCard from '../components/ScratchCard'
import { shuffle } from '../lib/shuffle'
import { getBoardStyle, getTheme } from '../lib/themes'
import { useCategories, type Item } from '../store/useCategories'

const waitForAnimation = (animation: Animation) => animation.finished.catch(() => undefined)

export default function ScratchBoard() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { categories } = useCategories()
  const category = categories.find((candidate) => candidate.id === id)
  const sourceItems = category?.items ?? []
  const sourceItemsRef = useRef(sourceItems)
  sourceItemsRef.current = sourceItems

  const [items, setItems] = useState<Item[]>(() => [...sourceItems])
  const [resetKey, setResetKey] = useState(0)
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set())
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)
  const gridRef = useRef<HTMLElement>(null)
  const busyRef = useRef(false)
  const runRef = useRef(0)
  const animationsRef = useRef<Animation[]>([])
  const timersRef = useRef<number[]>([])

  const themeColors = useMemo(() => {
    const theme = getTheme(category?.theme ?? 'ocean')
    return [theme.start, theme.end, '#fde047', '#ffffff', '#38bdf8']
  }, [category?.theme])

  const stopActiveRun = useCallback(() => {
    runRef.current += 1
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current = []
    animationsRef.current.forEach((animation) => animation.cancel())
    animationsRef.current = []
  }, [])

  const runShuffle = useCallback(async (firstMount: boolean) => {
    if (busyRef.current && !firstMount) return
    stopActiveRun()
    const run = runRef.current
    const grid = gridRef.current
    if (!grid) return

    const cards = Array.from(grid.querySelectorAll<HTMLElement>('.scratch-card'))
    if (!cards.length) return
    busyRef.current = true
    setBusy(true)

    const addAnimation = (element: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = element.animate(keyframes, options)
      animationsRef.current.push(animation)
      return animation
    }
    const current = () => runRef.current === run
    const finish = () => {
      if (!current()) return
      cards.forEach((card) => {
        card.style.transform = ''
        card.style.zIndex = ''
      })
      animationsRef.current = []
      timersRef.current = []
      busyRef.current = false
      setBusy(false)
    }
    const resetDeck = () => {
      if (!current()) return
      setItems(shuffle(sourceItemsRef.current))
      setRevealed(new Set())
      setResetKey((value) => value + 1)
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      resetDeck()
      const fades = cards.map((card) => addAnimation(card, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' }))
      await Promise.all(fades.map(waitForAnimation))
      finish()
      return
    }

    const gridWidth = grid.offsetWidth
    const gridHeight = grid.offsetHeight
    const offsets = cards.map((card) => ({
      x: gridWidth / 2 - (card.offsetLeft + card.offsetWidth / 2),
      y: gridHeight / 2 - (card.offsetTop + card.offsetHeight / 2),
    }))
    const stack = (index: number) => `translate(${offsets[index].x}px, ${offsets[index].y - index * 1.5}px) rotate(${(index - 2) * 1.4}deg)`
    const split = (index: number, direction: number) => {
      const side = index % 2 ? 1 : -1
      return `translate(${offsets[index].x + side * direction * 84}px, ${offsets[index].y - index * 1.5}px) rotate(${side * direction * 9}deg)`
    }

    cards.forEach((card, index) => { card.style.zIndex = String(index) })

    if (firstMount) {
      cards.forEach((card, index) => { card.style.transform = stack(index) })
    } else {
      const gathers = cards.map(async (card, index) => {
        const animation = addAnimation(card, [
          { transform: getComputedStyle(card).transform },
          { transform: stack(index) },
        ], {
          duration: 450,
          delay: index * 40,
          easing: 'cubic-bezier(.4,0,.2,1)',
          fill: 'both',
        })
        await waitForAnimation(animation)
        if (!current()) return
        card.style.transform = stack(index)
        animation.cancel()
      })
      await Promise.all(gathers)
      if (!current()) return
    }

    const riffles = cards.map((card, index) => addAnimation(card, [
      { transform: stack(index) },
      { transform: split(index, 1), offset: .3 },
      { transform: stack(index), offset: .52 },
      { transform: split(index, -1), offset: .76 },
      { transform: stack(index) },
    ], {
      duration: 1200,
      delay: index * 30,
      easing: 'ease-in-out',
    }))

    timersRef.current.push(window.setTimeout(resetDeck, 600))
    timersRef.current.push(window.setTimeout(() => {
      if (!current()) return
      const zOrder = shuffle(cards.map((_, index) => index))
      cards.forEach((card, index) => { card.style.zIndex = String(zOrder[index]) })
    }, 620))

    await Promise.all(riffles.map(waitForAnimation))
    if (!current()) return
    cards.forEach((card, index) => { card.style.zIndex = String(index) })

    const deals = cards.map((card, index) => {
      const animation = addAnimation(card, [
        { transform: stack(index) },
        { transform: 'translate(0, 0) rotate(5deg) scale(1.06)', offset: .72 },
        { transform: 'none' },
      ], {
        duration: 540,
        delay: (cards.length - 1 - index) * 130,
        easing: 'cubic-bezier(.2,.8,.3,1)',
        fill: 'backwards',
      })
      card.style.transform = 'none'
      return animation
    })
    await Promise.all(deals.map(waitForAnimation))
    finish()
  }, [stopActiveRun])

  useLayoutEffect(() => {
    void runShuffle(true)
    return stopActiveRun
  }, [id, runShuffle, stopActiveRun])

  if (!category || !category.items.length) return <Navigate to="/play" replace />

  const markRevealed = (itemId: string) => setRevealed((current) => new Set(current).add(itemId))
  const allRevealed = revealed.size === items.length
  const hint = busy ? 'Shuffling…' : allRevealed ? 'All revealed! Tap Reshuffle to play again' : 'Swipe your finger over a card'

  return (
    <div className={`screen board-screen themed-board ${busy ? 'is-shuffling' : ''}`} style={getBoardStyle(category.theme, category.backgroundImageDataUrl)} aria-busy={busy}>
      <header className="board-header">
        <button className="icon-button board-icon" onClick={() => navigate('/play')} aria-label="Back to play"><ArrowLeft size={20} /></button>
        <div className="board-title"><h1>{category.name}</h1><p aria-live="polite">{revealed.size} of {items.length} revealed</p></div>
        <button className="button board-control reshuffle" onClick={() => void runShuffle(false)} disabled={busy}><RotateCcw size={16} /> Reshuffle</button>
      </header>
      <div className="reveal-progress" aria-hidden="true">
        <span style={{ width: `${(revealed.size / items.length) * 100}%` }} />
      </div>
      <div className="progress-percent">{Math.round((revealed.size / items.length) * 100)}%</div>
      <section ref={gridRef} className="scratch-grid" aria-label="Scratch cards">
        {items.map((item, index) => (
          <ScratchCard
            key={index}
            item={item}
            resetKey={resetKey}
            busy={busy}
            themeColors={themeColors}
            onReveal={() => markRevealed(item.id)}
            onPreview={setPreview}
          />
        ))}
      </section>
      <div className="scratch-hint" aria-live="polite">{hint}</div>
      {preview && (
        <div className="image-preview" role="dialog" aria-modal="true" aria-label="Image preview" onClick={() => setPreview(null)}>
          <button className="preview-close" onClick={() => setPreview(null)} aria-label="Close image preview"><X size={24} /></button>
          <img src={preview} alt="Full-screen scratch card reveal" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
