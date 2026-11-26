import { Image as ImageIcon, Pencil, Trash2 } from 'lucide-react'
import type { Item } from '../store/useCategories'

export default function ItemRow({ item, onEdit, onDelete }: { item: Item; onEdit?: () => void; onDelete: () => void }) {
  return (
    <article className="item-row">
      {item.type === 'image' ? (
        <img className="item-thumbnail" src={item.imageDataUrl} alt="Category item" />
      ) : (
        <div className="text-item-mark" aria-hidden="true">Aa</div>
      )}
      <div className="item-value">
        {item.type === 'text' ? item.text : <span><ImageIcon size={17} /> Image from gallery</span>}
      </div>
      <div className="item-actions">
        {item.type === 'text' && <button className="icon-button soft" onClick={onEdit} aria-label="Edit text item"><Pencil size={17} /></button>}
        <button className="icon-button danger-soft" onClick={onDelete} aria-label="Delete item"><Trash2 size={17} /></button>
      </div>
    </article>
  )
}
