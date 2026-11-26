import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowLeft, ImagePlus, ListX, Pencil, Plus, SwatchBook } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import Dialog from '../components/Dialog'
import ItemRow from '../components/ItemRow'
import ThemePicker from '../components/ThemePicker'
import { compressImage } from '../lib/image'
import { getThemeStyle, type ThemeId } from '../lib/themes'
import { useCategories, type Item } from '../store/useCategories'

export default function EditCategory() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const { categories, renameCategory, updateCategoryTheme, clearCategoryItems, addItem, editTextItem, deleteItem, storageError, clearStorageError } = useCategories()
  const category = categories.find((candidate) => candidate.id === id)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Item | null>(null)
  const [editValue, setEditValue] = useState('')
  const [renameOpen, setRenameOpen] = useState(false)
  const [name, setName] = useState('')
  const [themeOpen, setThemeOpen] = useState(false)
  const [theme, setTheme] = useState<ThemeId>('ocean')
  const [themeImage, setThemeImage] = useState<string | undefined>()
  const [themeBusy, setThemeBusy] = useState(false)
  const [clearItemsOpen, setClearItemsOpen] = useState(false)

  if (!category) return <Navigate to="/" replace />

  const addText = async (event: FormEvent) => {
    event.preventDefault()
    if (text.trim() && await addItem(category.id, { type: 'text', text: text.trim() })) setText('')
  }

  const pickImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setBusy(true)
    setImageError(null)
    try {
      const imageDataUrl = await compressImage(file)
      await addItem(category.id, { type: 'image', imageDataUrl })
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'The image could not be added.')
    } finally {
      setBusy(false)
      event.target.value = ''
    }
  }

  const submitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (editing && editValue.trim() && await editTextItem(category.id, editing.id, editValue)) setEditing(null)
  }

  const submitRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (name.trim() && await renameCategory(category.id, name)) setRenameOpen(false)
  }

  const openTheme = () => {
    setTheme(category.theme)
    setThemeImage(category.backgroundImageDataUrl)
    setThemeOpen(true)
  }

  const pickThemeImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setThemeBusy(true)
    try {
      setThemeImage(await compressImage(file))
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'That photo could not be used.')
    } finally {
      setThemeBusy(false)
      event.target.value = ''
    }
  }

  const submitTheme = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (await updateCategoryTheme(category.id, theme, themeImage)) setThemeOpen(false)
  }

  const confirmClearItems = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (await clearCategoryItems(category.id)) setClearItemsOpen(false)
  }

  return (
    <div className="screen edit-screen">
      <header className="group-hero themed-surface" style={getThemeStyle(category.theme, category.backgroundImageDataUrl)}>
        <span className="theme-orb" aria-hidden="true" />
        <div className="hero-toolbar">
          <button className="icon-button hero-icon" onClick={() => navigate('/')} aria-label="Back to categories"><ArrowLeft size={20} /></button>
          <button className="button change-theme" type="button" onClick={openTheme}><SwatchBook size={16} /> Change theme</button>
        </div>
        <div className="hero-title-row">
          <div><h1>{category.name}</h1><span className="count-chip">{category.items.length} {category.items.length === 1 ? 'card' : 'cards'}</span></div>
          <div className="hero-actions">
            <button className="icon-button hero-icon" onClick={() => { setName(category.name); setRenameOpen(true) }} aria-label="Rename category" title="Rename category"><Pencil size={18} /></button>
            <button className="icon-button hero-icon danger-hero" onClick={() => setClearItemsOpen(true)} aria-label="Clear all category items" title="Clear category items" disabled={!category.items.length}><ListX size={19} /></button>
          </div>
        </div>
      </header>
      {(storageError || imageError) && <div className="error-banner" role="alert"><span>{storageError || imageError}</span><button onClick={() => { clearStorageError(); setImageError(null) }}>Dismiss</button></div>}
      <section className="stack items-stack" aria-label="Category items">
        {category.items.map((item) => <ItemRow key={item.id} item={item} onEdit={() => { setEditing(item); setEditValue(item.text ?? '') }} onDelete={() => void deleteItem(category.id, item.id)} />)}
        {!category.items.length && <div className="empty-state compact"><div className="empty-icon"><Plus size={28} /></div><h2>No items yet</h2><p>Add a text surprise or choose a photo from your gallery.</p></div>}
      </section>
      <div className="composer">
        <form className="add-text-row" onSubmit={addText}>
          <label className="sr-only" htmlFor="new-item">New text item</label>
          <input id="new-item" className="text-input" value={text} onChange={(event) => setText(event.target.value)} placeholder="Type a text surprise" maxLength={140} />
          <button className="button button-primary add-button" type="submit" disabled={!text.trim()}><Plus size={18} /> Add</button>
        </form>
        <button className="button gallery-button" type="button" onClick={() => fileRef.current?.click()} disabled={busy}><ImagePlus size={19} /> {busy ? 'Preparing image…' : 'Add image from gallery'}</button>
        <input ref={fileRef} className="sr-only" type="file" accept="image/*" onChange={pickImage} />
      </div>

      <Dialog open={Boolean(editing)} title="Edit item" onClose={() => setEditing(null)} onSubmit={submitEdit}>
        <label className="field-label" htmlFor="edit-item">Text</label>
        <input id="edit-item" className="text-input" value={editValue} onChange={(event) => setEditValue(event.target.value)} maxLength={140} required />
      </Dialog>
      <Dialog open={renameOpen} title="Rename category" onClose={() => setRenameOpen(false)} onSubmit={submitRename} submitLabel="Rename">
        <label className="field-label" htmlFor="rename-category">Category name</label>
        <input id="rename-category" className="text-input" value={name} onChange={(event) => setName(event.target.value)} maxLength={60} required />
      </Dialog>
      <Dialog open={themeOpen} title="Change theme" onClose={() => setThemeOpen(false)} onSubmit={submitTheme} submitLabel="Save theme">
        <ThemePicker
          selected={theme}
          backgroundImageDataUrl={themeImage}
          busy={themeBusy}
          onSelect={(next) => { setTheme(next); setThemeImage(undefined) }}
          onPhoto={pickThemeImage}
        />
        <div className="theme-preview themed-surface" style={getThemeStyle(theme, themeImage)}>
          <span className="theme-orb" aria-hidden="true" />
          <span className="preview-chip">Preview</span>
          <strong>{category.name}</strong>
        </div>
      </Dialog>
      <Dialog open={clearItemsOpen} title="Clear category items?" onClose={() => setClearItemsOpen(false)} onSubmit={confirmClearItems} submitLabel="Clear items" danger>
        <p className="dialog-message">This removes every text item and image from “{category.name}”, but keeps the category and its theme.</p>
      </Dialog>
    </div>
  )
}
