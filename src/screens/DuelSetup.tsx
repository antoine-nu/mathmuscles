import { useState, type ReactNode } from 'react'

export const DURATIONS: { min: number; label: string; hint: string }[] = [
  { min: 15, label: '15 min', hint: 'Escarmouche' },
  { min: 30, label: '30 min', hint: 'Campagne' },
  { min: 45, label: '45 min', hint: 'Grande guerre' },
  { min: 60, label: '1 heure', hint: 'Épopée' },
]

/** Durée personnalisée : bornes (minutes). Jusqu'à 5 minutes, le « Mode démo » est disponible pendant
 *  l'entraînement (+1 cran, améliorations…) pour tester une bataille sans attendre. */
export const CUSTOM_MIN = 1
export const CUSTOM_MAX = 180
export const DEMO_MAX_DURATION = 5

/** Cadre commun des écrans de préparation de partie. */
export function SetupFrame({ title, subtitle, onBack, children }: { title: string; subtitle: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className="level-select">
      <div className="setup">
        <button className="hud-back setup-back" onClick={onBack}>◀ Menu</button>
        <div className="eyebrow">{subtitle}</div>
        <h1>{title}</h1>
        {children}
      </div>
    </div>
  )
}

export function DurationPicker({ value, onChange, disabled }: { value: number; onChange: (m: number) => void; disabled?: boolean }) {
  const preset = DURATIONS.some((d) => d.min === value)
  const [custom, setCustom] = useState(!preset)
  const [text, setText] = useState(preset ? '20' : String(value))
  // l'invité d'un duel reçoit la durée de l'hôte : une durée hors des propositions s'affiche en « Autre »
  const isCustom = custom || !preset
  const shown = !preset && Number(text) !== value ? String(value) : text
  const apply = (raw: string) => {
    setText(raw)
    const n = Math.round(Number(raw.replace(',', '.')))
    if (Number.isFinite(n) && n >= CUSTOM_MIN && n <= CUSTOM_MAX) onChange(n)
  }
  return (
    <div className="setup-block">
      <h3>Durée de l’entraînement</h3>
      <div className="durations" role="radiogroup" aria-label="Durée">
        {DURATIONS.map((d) => (
          <button key={d.min} role="radio" aria-checked={!isCustom && value === d.min} className={`duration ${!isCustom && value === d.min ? 'on' : ''}`} disabled={disabled}
            onClick={() => { setCustom(false); onChange(d.min) }}>
            <b>{d.label}</b>
            <small>{d.hint}</small>
          </button>
        ))}
        <button role="radio" aria-checked={isCustom} className={`duration ${isCustom ? 'on' : ''}`} disabled={disabled} onClick={() => { setCustom(true); apply(text) }}>
          <b>Autre</b>
          <small>À la carte</small>
        </button>
      </div>
      {isCustom && (
        <label className="custom-duration">
          <input type="number" min={CUSTOM_MIN} max={CUSTOM_MAX} step={1} value={shown} disabled={disabled} onChange={(e) => apply(e.target.value)} aria-label="Durée en minutes" />
          <span>minutes {value <= DEMO_MAX_DURATION ? '· mode démo disponible (tests)' : ''}</span>
        </label>
      )}
      <p className="setup-note">Pendant ce temps, chacun forme la plus grande armée possible. Puis les armées s’affrontent.</p>
    </div>
  )
}
