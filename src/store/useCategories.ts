import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_THEME, isThemeId, THEMES, type ThemeId } from '../lib/themes'

export type Item = {
  id: string
  type: 'text' | 'image'
  text?: string
  imageDataUrl?: string
}

export type Category = {
  id: string
  name: string
  items: Item[]
  theme: ThemeId
  backgroundImageDataUrl?: string
}

export type Appearance = 'aurora' | 'midnight'

type CategoriesContextValue = {
  categories: Category[]
  appearance: Appearance
  storageError: string | null
  clearStorageError: () => void
  addCategory: (name: string, theme: ThemeId, backgroundImageDataUrl?: string) => Promise<boolean>
  renameCategory: (id: string, name: string) => Promise<boolean>
  updateCategoryTheme: (id: string, theme: ThemeId, backgroundImageDataUrl?: string) => Promise<boolean>
  deleteCategory: (id: string) => Promise<boolean>
  clearCategoryItems: (id: string) => Promise<boolean>
  clearAllData: () => Promise<boolean>
  updateAppearance: (appearance: Appearance) => Promise<boolean>
  addItem: (categoryId: string, item: Omit<Item, 'id'>) => Promise<boolean>
  editTextItem: (categoryId: string, itemId: string, text: string) => Promise<boolean>
  deleteItem: (categoryId: string, itemId: string) => Promise<boolean>
  importBackup: (value: unknown) => Promise<boolean>
  exportBackup: () => string
}

const DB_NAME = 'scratch-db'
const DB_VERSION = 1
const STORE_NAME = 'app-data'
const STATE_KEY = 'state'
const LEGACY_STORAGE_KEY = 'scratch:v1'
const CategoriesContext = createContext<CategoriesContextValue | null>(null)

function makeId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction was cancelled'))
  })
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB could not be opened'))
    request.onblocked = () => reject(new Error('IndexedDB is blocked by another open tab'))
  })
}

async function readStoredState(): Promise<unknown> {
  const database = await openDatabase()
  try {
    return await requestResult(database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(STATE_KEY))
  } finally {
    database.close()
  }
}

async function writeStoredState(categories: Category[], appearance: Appearance): Promise<void> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put({ version: 3, categories, appearance }, STATE_KEY)
    await transactionDone(transaction)
  } finally {
    database.close()
  }
}

async function clearStoredState(): Promise<void> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).clear()
    await transactionDone(transaction)
  } finally {
    database.close()
  }
}

function isItem(value: unknown): value is Item {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    (item.type === 'text' || item.type === 'image') &&
    (item.type === 'text' ? typeof item.text === 'string' : typeof item.imageDataUrl === 'string')
  )
}

type StoredCategory = Omit<Category, 'theme'> & { theme?: unknown }

function isStoredCategory(value: unknown): value is StoredCategory {
  if (!value || typeof value !== 'object') return false
  const category = value as Record<string, unknown>
  return (
    typeof category.id === 'string' &&
    typeof category.name === 'string' &&
    Array.isArray(category.items) &&
    category.items.every(isItem) &&
    (category.backgroundImageDataUrl === undefined || typeof category.backgroundImageDataUrl === 'string')
  )
}

function parseCategories(value: unknown): Category[] | null {
  const objectValue = value && typeof value === 'object' ? (value as Record<string, unknown>) : null
  const candidate = Array.isArray(value)
    ? value
    : Array.isArray(objectValue?.categories)
      ? objectValue.categories
      : Array.isArray(objectValue?.groups)
        ? objectValue.groups
        : null
  if (!candidate?.every(isStoredCategory)) return null
  return candidate.map((category, index) => ({
    ...category,
    theme: isThemeId(category.theme) ? category.theme : THEMES[index % THEMES.length]?.id ?? DEFAULT_THEME,
  }))
}

function parseAppearance(value: unknown): Appearance {
  return value && typeof value === 'object' && (value as Record<string, unknown>).appearance === 'midnight' ? 'midnight' : 'aurora'
}

async function loadAppState(): Promise<{ categories: Category[]; appearance: Appearance }> {
  const storedState = await readStoredState()
  const indexedCategories = parseCategories(storedState)
  if (indexedCategories) return { categories: indexedCategories, appearance: parseAppearance(storedState) }

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!legacy) return { categories: [], appearance: 'aurora' }
  const migrated = parseCategories(JSON.parse(legacy))
  if (!migrated) throw new Error('Legacy Scratch data is invalid')
  await writeStoredState(migrated, 'aurora')
  localStorage.removeItem(LEGACY_STORAGE_KEY)
  return { categories: migrated, appearance: 'aurora' }
}

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [appearance, setAppearance] = useState<Appearance>('aurora')
  const [ready, setReady] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    loadAppState()
      .then((loaded) => {
        if (!active) return
        setCategories(loaded.categories)
        setAppearance(loaded.appearance)
      })
      .catch(() => active && setStorageError('Scratch could not open its browser database. Check that site storage is allowed, then reload.'))
      .finally(() => active && setReady(true))
    return () => { active = false }
  }, [])

  const commit = useCallback(async (next: Category[], nextAppearance: Appearance = appearance) => {
    try {
      await writeStoredState(next, nextAppearance)
      setCategories(next)
      setAppearance(nextAppearance)
      setStorageError(null)
      return true
    } catch {
      setStorageError('Scratch could not save that change to IndexedDB. Check your browser storage settings and available space.')
      return false
    }
  }, [appearance])

  const value = useMemo<CategoriesContextValue>(
    () => ({
      categories,
      appearance,
      storageError,
      clearStorageError: () => setStorageError(null),
      addCategory: (name, theme, backgroundImageDataUrl) =>
        commit([...categories, { id: makeId(), name: name.trim(), items: [], theme, backgroundImageDataUrl }]),
      renameCategory: (id, name) => commit(categories.map((category) => (category.id === id ? { ...category, name: name.trim() } : category))),
      updateCategoryTheme: (id, theme, backgroundImageDataUrl) =>
        commit(categories.map((category) => (category.id === id ? { ...category, theme, backgroundImageDataUrl } : category))),
      deleteCategory: (id) => commit(categories.filter((category) => category.id !== id)),
      clearCategoryItems: (id) => commit(categories.map((category) => (category.id === id ? { ...category, items: [] } : category))),
      clearAllData: async () => {
        try {
          await clearStoredState()
          localStorage.removeItem(LEGACY_STORAGE_KEY)
          setCategories([])
          setAppearance('aurora')
          setStorageError(null)
          return true
        } catch {
          setStorageError('Scratch could not clear its IndexedDB data. Close other tabs using the app and try again.')
          return false
        }
      },
      updateAppearance: (nextAppearance) => commit(categories, nextAppearance),
      addItem: (categoryId, item) =>
        commit(categories.map((category) => (category.id === categoryId ? { ...category, items: [...category.items, { ...item, id: makeId() }] } : category))),
      editTextItem: (categoryId, itemId, text) =>
        commit(
          categories.map((category) =>
            category.id === categoryId
              ? { ...category, items: category.items.map((item) => (item.id === itemId ? { ...item, text: text.trim() } : item)) }
              : category,
          ),
        ),
      deleteItem: (categoryId, itemId) =>
        commit(categories.map((category) => (category.id === categoryId ? { ...category, items: category.items.filter((item) => item.id !== itemId) } : category))),
      importBackup: async (input) => {
        const parsed = parseCategories(input)
        if (!parsed) {
          setStorageError('That file is not a valid Scratch backup.')
          return false
        }
        return commit(parsed, parseAppearance(input))
      },
      exportBackup: () => JSON.stringify({ version: 3, exportedAt: new Date().toISOString(), appearance, categories }, null, 2),
    }),
    [appearance, categories, commit, storageError],
  )

  return createElement(
    CategoriesContext.Provider,
    { value },
    ready ? children : createElement('div', { className: 'app-loading', role: 'status' }, 'Opening Scratch…'),
  )
}

export function useCategories() {
  const value = useContext(CategoriesContext)
  if (!value) throw new Error('useCategories must be used inside CategoriesProvider')
  return value
}
