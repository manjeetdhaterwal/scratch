import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'

type DialogProps = {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
  submitLabel?: string
  danger?: boolean
  sheet?: boolean
}

export default function Dialog({ open, title, children, onClose, onSubmit, submitLabel = 'Save', danger, sheet }: DialogProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onCloseRef.current()
    document.addEventListener('keydown', onKeyDown)
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current
      const field = panel?.querySelector<HTMLElement>('input:not([type="hidden"]):not([type="file"]):not([disabled]), textarea:not([disabled]), select:not([disabled])')
      const fallback = panel?.querySelector<HTMLElement>('button:not([disabled])')
      ;(field ?? fallback)?.focus()
    })
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!open) return null
  const content = (
    <div ref={panelRef} className={`dialog-panel ${sheet ? 'dialog-sheet' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button>
      </div>
      <div className="dialog-content">{children}</div>
      {onSubmit && (
        <div className="dialog-actions">
          <button className="button button-ghost" type="button" onClick={onClose}>Cancel</button>
          <button className={`button ${danger ? 'button-danger' : 'button-primary'}`} type="submit">{submitLabel}</button>
        </div>
      )}
    </div>
  )

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      {onSubmit ? <form onSubmit={onSubmit}>{content}</form> : content}
    </div>
  )
}
