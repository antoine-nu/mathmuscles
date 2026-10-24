import type { ReactNode } from 'react'

export const DURATIONS: { min: number; label: string; hint: string }[] = [
  { min: 5, label: '5 min', hint: 'Partie éclair' },
  { min: 10, label: '10 min', hint: 'Courte' },
  { min: 15, label: '15 min', hint: 'Classique' },
  { min: 20, label: '20 min', hint: 'Longue' },
]

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
  return (
    <div className="setup-block">
      <h3>Durée de l’entraînement</h3>
      <div className="durations" role="radiogroup" aria-label="Durée">
        {DURATIONS.map((d) => (
          <button key={d.min} role="radio" aria-checked={value === d.min} className={`duration ${value === d.min ? 'on' : ''}`} disabled={disabled} onClick={() => onChange(d.min)}>
            <b>{d.label}</b>
            <small>{d.hint}</small>
          </button>
        ))}
      </div>
      <p className="setup-note">Pendant ce temps, chacun forme la plus grande armée possible. Puis les armées s’affrontent.</p>
    </div>
  )
}
