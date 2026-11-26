import { ListChecks, Trash2 } from 'lucide-react'
import { getThemeStyle } from '../lib/themes'
import type { Category } from '../store/useCategories'

type CategoryCardProps = {
  category: Category
  mode?: 'manage' | 'play'
  onEdit?: () => void
  onDelete?: () => void
  onPlay?: () => void
}

export default function CategoryCard({ category, mode = 'manage', onEdit, onDelete, onPlay }: CategoryCardProps) {
  const itemLabel = `${category.items.length} ${category.items.length === 1 ? 'card' : 'cards'}`

  return (
    <article className={`group-card themed-surface ${mode === 'play' ? 'play-deck' : 'manage-deck'}`} style={getThemeStyle(category.theme, category.backgroundImageDataUrl)}>
      <span className="theme-orb" aria-hidden="true" />
      <div className="group-copy">
        <span className="count-chip">{itemLabel}</span>
        <h2>{category.name}</h2>
      </div>
      {mode === 'manage' ? (
        <div className="card-actions">
          <button className="icon-button soft" onClick={onEdit} aria-label={`Edit items in ${category.name}`} title="Edit items"><ListChecks size={18} /></button>
          <button className="icon-button danger-soft" onClick={onDelete} aria-label={`Delete ${category.name}`} title="Delete category"><Trash2 size={18} /></button>
        </div>
      ) : (
        <button className="deck-play" onClick={onPlay} disabled={!category.items.length} aria-label={`Play ${category.name}`}>Play</button>
      )}
    </article>
  )
}
