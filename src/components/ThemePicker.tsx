import { ImagePlus } from 'lucide-react'
import { useRef, type ChangeEvent } from 'react'
import { getThemeStyle, THEMES, type ThemeId } from '../lib/themes'

type ThemePickerProps = {
  selected: ThemeId
  backgroundImageDataUrl?: string
  busy?: boolean
  onSelect: (theme: ThemeId) => void
  onPhoto: (event: ChangeEvent<HTMLInputElement>) => void
}

export default function ThemePicker({ selected, backgroundImageDataUrl, busy, onSelect, onPhoto }: ThemePickerProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="theme-picker">
      <span className="field-label">Theme</span>
      <div className="theme-swatches" role="radiogroup" aria-label="Category theme">
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            className={`theme-swatch ${selected === theme.id && !backgroundImageDataUrl ? 'selected' : ''}`}
            style={getThemeStyle(theme.id)}
            type="button"
            role="radio"
            aria-checked={selected === theme.id && !backgroundImageDataUrl}
            aria-label={theme.name}
            onClick={() => onSelect(theme.id)}
          />
        ))}
      </div>
      <button className={`button photo-theme-button ${backgroundImageDataUrl ? 'selected' : ''}`} type="button" onClick={() => fileRef.current?.click()} disabled={busy}>
        <ImagePlus size={18} /> {busy ? 'Preparing photo…' : backgroundImageDataUrl ? 'Change background photo' : 'Use my own photo as background'}
      </button>
      <input ref={fileRef} className="sr-only" type="file" accept="image/*" onChange={onPhoto} />
    </div>
  )
}
