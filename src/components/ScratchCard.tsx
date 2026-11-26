import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { Item } from '../store/useCategories'

type Point = { x: number; y: number }
type Stroke = Point[]

function getTextLengthClass(text = '') {
  const length = Array.from(text.trim()).length
  if (length <= 3) return 'text-content--short'
  if (length <= 16) return 'text-content--medium'
  if (length <= 42) return 'text-content--long'
  return 'text-content--extra-long'
}

type ScratchCardProps = {
  item: Item
  resetKey: number
  busy: boolean
  themeColors: string[]
  onReveal: () => void
  onPreview: (source: string) => void
}

export default function ScratchCard({ item, resetKey, busy, themeColors, onReveal, onPreview }: ScratchCardProps) {
  const cardRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokesRef = useRef<Stroke[]>([])
  const currentStroke = useRef<Stroke | null>(null)
  const moveCount = useRef(0)
  const [revealed, setRevealed] = useState(false)

  const celebrateReveal = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const card = cardRef.current
    const grid = card?.parentElement
    if (!card || !grid) return

    card.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.07)' },
      { transform: 'scale(1)' },
    ], { duration: 340, easing: 'ease-out' })

    const centerX = card.offsetLeft + card.offsetWidth / 2
    const centerY = card.offsetTop + card.offsetHeight / 2
    Array.from({ length: 10 }, (_, index) => {
      const bit = document.createElement('i')
      const angle = Math.random() * Math.PI * 2
      const distance = 60 + Math.random() * 50
      bit.className = 'confetti-bit'
      bit.style.left = `${centerX}px`
      bit.style.top = `${centerY}px`
      bit.style.background = themeColors[index % themeColors.length]
      grid.appendChild(bit)
      const animation = bit.animate([
        { transform: 'translate(0, 0) rotate(0)', opacity: 1 },
        { transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance + 30}px) rotate(${Math.random() * 540}deg)`, opacity: 0 },
      ], { duration: 750, easing: 'cubic-bezier(.2,.7,.3,1)' })
      animation.onfinish = () => bit.remove()
      animation.oncancel = () => bit.remove()
      return bit
    })
  }, [themeColors])

  const eraseStroke = useCallback((context: CanvasRenderingContext2D, points: Stroke, width: number, height: number) => {
    if (!points.length) return
    context.save()
    context.globalCompositeOperation = 'destination-out'
    context.lineWidth = 26
    context.lineCap = 'round'
    context.lineJoin = 'round'
    const first = points[0]
    context.beginPath()
    context.moveTo(first.x * width, first.y * height)
    if (points.length === 1) context.lineTo(first.x * width + 0.1, first.y * height)
    for (let index = 1; index < points.length; index += 1) {
      context.lineTo(points[index].x * width, points[index].y * height)
    }
    context.stroke()
    context.restore()
  }, [])

  const drawFoil = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    const gradient = context.createLinearGradient(0, 0, rect.width, rect.height)
    gradient.addColorStop(0, '#bfc5d2')
    gradient.addColorStop(0.28, '#f6f7fa')
    gradient.addColorStop(0.52, '#a9b0c0')
    gradient.addColorStop(0.74, '#eef0f5')
    gradient.addColorStop(1, '#b3bacb')
    context.fillStyle = gradient
    context.fillRect(0, 0, rect.width, rect.height)
    for (let index = 0; index < 95; index += 1) {
      const seed = (index * 47) % 101
      const x = ((seed * 29) % 100) / 100 * rect.width
      const y = ((seed * 61 + index * 13) % 100) / 100 * rect.height
      context.fillStyle = index % 3 === 0 ? 'rgba(255,255,255,.38)' : 'rgba(90,96,118,.14)'
      context.beginPath()
      context.arc(x, y, index % 4 === 0 ? 1.25 : 0.65, 0, Math.PI * 2)
      context.fill()
    }
    context.fillStyle = '#423b68'
    context.font = '700 13px system-ui, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText('SCRATCH', rect.width / 2, rect.height / 2)
    strokesRef.current.forEach((stroke) => eraseStroke(context, stroke, rect.width, rect.height))
  }, [eraseStroke])

  useEffect(() => {
    strokesRef.current = []
    currentStroke.current = null
    setRevealed(false)
    const canvas = canvasRef.current
    if (canvas) {
      canvas.style.transition = 'none'
      canvas.style.opacity = '1'
    }
    drawFoil()
    const frame = window.requestAnimationFrame(() => {
      if (!canvas) return
      canvas.style.transition = ''
      canvas.style.opacity = ''
    })
    return () => window.cancelAnimationFrame(frame)
  }, [drawFoil, resetKey])

  useEffect(() => {
    if (busy) currentStroke.current = null
  }, [busy])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(drawFoil)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [drawFoil])

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }
  }

  const scratchTo = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = currentStroke.current
    const canvas = canvasRef.current
    if (!stroke || !canvas || revealed || busy) return
    const point = pointFromEvent(event)
    const previous = stroke[stroke.length - 1]
    const distance = Math.hypot(point.x - previous.x, point.y - previous.y)
    const steps = Math.max(1, Math.ceil(distance * Math.max(canvas.clientWidth, canvas.clientHeight) / 6))
    const added: Point[] = []
    for (let index = 1; index <= steps; index += 1) {
      added.push({ x: previous.x + (point.x - previous.x) * (index / steps), y: previous.y + (point.y - previous.y) * (index / steps) })
    }
    stroke.push(...added)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (context) eraseStroke(context, [previous, ...added], canvas.clientWidth, canvas.clientHeight)

    moveCount.current += 1
    if (moveCount.current % 5 === 0 && context) {
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
      let transparent = 0
      let sampled = 0
      for (let index = 3; index < pixels.length; index += 64) {
        sampled += 1
        if (pixels[index] < 32) transparent += 1
      }
      if (transparent / sampled > 0.55) {
        setRevealed(true)
        currentStroke.current = null
        navigator.vibrate?.(15)
        celebrateReveal()
        onReveal()
      }
    }
  }

  const startScratch = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (revealed || busy) return
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Some embedded browsers do not expose pointer capture; scratching still works.
    }
    const stroke = [pointFromEvent(event)]
    strokesRef.current.push(stroke)
    currentStroke.current = stroke
    moveCount.current = 0
    scratchTo(event)
  }

  const endScratch = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    currentStroke.current = null
  }

  return (
    <article ref={cardRef} className={`scratch-card ${revealed ? 'revealed' : ''}`}>
      {item.type === 'image' ? (
        <button className="scratch-content image-content" type="button" onClick={() => revealed && onPreview(item.imageDataUrl!)} aria-label={revealed ? 'Open image preview' : 'Hidden image'}>
          <img src={item.imageDataUrl} alt="Scratch card reveal" />
        </button>
      ) : (
        <div className={`scratch-content text-content ${getTextLengthClass(item.text)}`}>{item.text}</div>
      )}
      <canvas
        ref={canvasRef}
        className="scratch-overlay"
        aria-label="Scratch to reveal"
        aria-disabled={busy}
        onPointerDown={startScratch}
        onPointerMove={scratchTo}
        onPointerUp={endScratch}
        onPointerCancel={endScratch}
      />
      <div className="foil-sparkles" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
    </article>
  )
}
