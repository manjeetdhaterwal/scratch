import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Moon, Plus, Settings, Share2, Sun, Trash2, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Dialog from '../components/Dialog'
import CategoryCard from '../components/GroupCard'
import TabBar from '../components/TabBar'
import ThemePicker from '../components/ThemePicker'
import { compressImage } from '../lib/image'
import { DEFAULT_THEME, getThemeStyle, type ThemeId } from '../lib/themes'
import { useCategories, type Category } from '../store/useCategories'

type Modal = { type: 'new' } | { type: 'delete'; category: Category } | null

export default function Groups() {
  const navigate = useNavigate()
  const { categories, appearance, updateAppearance, addCategory, deleteCategory, clearAllData, importBackup, exportBackup, storageError, clearStorageError } = useCategories()
  const [modal, setModal] = useState<Modal>(null)
  const [name, setName] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME)
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>()
  const [themeBusy, setThemeBusy] = useState(false)
  const [themeError, setThemeError] = useState<string | null>(null)
  const [clearAllOpen, setClearAllOpen] = useState(false)

  const openNameModal = (next: Exclude<Modal, null>) => {
    setName('')
    if (next.type === 'new') {
      setTheme(DEFAULT_THEME)
      setBackgroundImage(undefined)
      setThemeError(null)
    }
    setModal(next)
  }

  const submitName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) return
    const saved = await addCategory(name, theme, backgroundImage)
    if (saved) setModal(null)
  }

  const chooseThemePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setThemeBusy(true)
    setThemeError(null)
    try {
      setBackgroundImage(await compressImage(file))
    } catch (error) {
      setThemeError(error instanceof Error ? error.message : 'That photo could not be used.')
    } finally {
      setThemeBusy(false)
      event.target.value = ''
    }
  }

  const confirmDelete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (modal?.type === 'delete' && await deleteCategory(modal.category.id)) setModal(null)
  }

  const confirmClearAll = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (await clearAllData()) {
      setClearAllOpen(false)
      setSettingsOpen(false)
    }
  }

  const downloadBackupFile = (file: File) => {
    const link = document.createElement('a')
    const href = URL.createObjectURL(file)
    link.href = href
    link.download = file.name
    link.hidden = true
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(href), 1000)
  }

  const shareBackup = async () => {
    const file = new File(
      [exportBackup()],
      `Scratch-backup-${new Date().toISOString().slice(0, 10)}.scratch.txt`,
      { type: 'text/plain' },
    )

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: 'Scratch backup',
          text: 'Scratch categories backup',
          files: [file],
        })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }

    downloadBackupFile(file)
  }

  const openSettings = () => {
    setSettingsOpen(true)
  }

  const closeSettings = () => {
    setSettingsOpen(false)
  }

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const success = await importBackup(JSON.parse(await file.text()))
      if (success) closeSettings()
    } catch {
      await importBackup(null)
    }
    event.target.value = ''
  }

  return (
    <div className="screen with-tabs home-screen">
      <header className="page-header groups-header">
        <div className="header-actions categories-header-actions">
          <button className="new-category-banner" onClick={() => openNameModal({ type: 'new' })} aria-label="Add new category">
            <Plus size={18} />
            <span>New category</span>
            <span className="category-theme-dots" aria-hidden="true"><i /><i /><i /><i /></span>
          </button>
          <button className="icon-button" onClick={openSettings} aria-label="Open settings"><Settings size={21} /></button>
        </div>
      </header>

      {storageError && <div className="error-banner" role="alert"><span>{storageError}</span><button onClick={clearStorageError}>Dismiss</button></div>}

      <section className="stack" aria-label="Categories">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            onEdit={() => navigate(`/category/${category.id}`)}
            onDelete={() => setModal({ type: 'delete', category })}
          />
        ))}
        {!categories.length && (
          <div className="empty-state">
            <div className="empty-icon"><Plus size={28} /></div>
            <h2>Create your first category</h2>
            <p>Add ideas, dares, names, or photos—then turn them into scratch cards.</p>
            <button className="icon-button add-category-button" onClick={() => openNameModal({ type: 'new' })} aria-label="Add category" title="Add category"><Plus size={22} /></button>
          </div>
        )}
      </section>
      <TabBar />

      <Dialog open={modal?.type === 'new'} title="New category" onClose={() => setModal(null)} onSubmit={submitName} submitLabel="Create category" sheet>
        <label className="field-label" htmlFor="category-name">Category name</label>
        <input id="category-name" className="text-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Date night ideas" maxLength={60} required />
        {modal?.type === 'new' && (
          <>
            <ThemePicker
              selected={theme}
              backgroundImageDataUrl={backgroundImage}
              busy={themeBusy}
              onSelect={(next) => { setTheme(next); setBackgroundImage(undefined) }}
              onPhoto={chooseThemePhoto}
            />
            {themeError && <p className="inline-error" role="alert">{themeError}</p>}
            <div className="theme-preview themed-surface" style={getThemeStyle(theme, backgroundImage)}>
              <span className="theme-orb" aria-hidden="true" />
              <span className="preview-chip">Preview</span>
              <strong>{name.trim() || 'Your category name'}</strong>
            </div>
          </>
        )}
      </Dialog>

      <Dialog open={modal?.type === 'delete'} title="Delete category?" onClose={() => setModal(null)} onSubmit={confirmDelete} submitLabel="Delete" danger>
        <p className="dialog-message">This will permanently remove “{modal?.type === 'delete' ? modal.category.name : ''}” and all of its items and images.</p>
      </Dialog>

      <Dialog open={settingsOpen} title="Settings" onClose={closeSettings} sheet>
        <div className="appearance-setting">
          <span className="field-label">Appearance</span>
          <div className="appearance-options" role="radiogroup" aria-label="Appearance">
            <button className={`appearance-option ${appearance === 'aurora' ? 'selected' : ''}`} type="button" role="radio" aria-checked={appearance === 'aurora'} onClick={() => void updateAppearance('aurora')}>
              <Sun size={20} /><span><strong>Light</strong><small>Aurora</small></span>
            </button>
            <button className={`appearance-option midnight-option ${appearance === 'midnight' ? 'selected' : ''}`} type="button" role="radio" aria-checked={appearance === 'midnight'} onClick={() => void updateAppearance('midnight')}>
              <Moon size={20} /><span><strong>Dark</strong><small>Midnight</small></span>
            </button>
          </div>
        </div>
        <p className="settings-copy">Keep a copy of your categories and images, or restore them on another device.</p>
        <button className="settings-action" type="button" onClick={() => void shareBackup()}><Share2 size={20} /><span><strong>Export or share backup</strong><small>Save to Files, Drive, or Downloads</small></span></button>
        <label className="settings-action file-action"><Upload size={20} /><span><strong>Import backup file</strong><small>Choose a Scratch text or JSON backup</small></span><input type="file" accept="text/plain,application/json,.txt,.json,.scratch" onChange={importFile} /></label>
        <button className="settings-action destructive-action" type="button" onClick={() => setClearAllOpen(true)}><Trash2 size={20} /><span><strong>Clear whole app data</strong><small>Delete every category, item, and image</small></span></button>
        <p className="settings-note">All data is stored in this browser using IndexedDB.</p>
      </Dialog>

      <Dialog open={clearAllOpen} title="Clear the whole app?" onClose={() => setClearAllOpen(false)} onSubmit={confirmClearAll} submitLabel="Clear everything" danger>
        <p className="dialog-message">This permanently deletes every category, text item, image, and theme. This cannot be undone.</p>
      </Dialog>
    </div>
  )
}
