import type { ReactNode } from 'react'

export const DURATIONS: { min: number; label: string; hint: string }[] = [
  { min: 15, label: '15 min', hint: 'Escarmouche' },
  { min: 30, label: '30 min', hint: 'Campagne' },
  { min: 45, label: '45 min', hint: 'Grande guerre' },
  { min: 60, label: '1 heure', hint: 'Épopée' },
]

/** Partie express réservée aux tests du développeur : chrono de 5 min et outils de démonstration (+1 cran…). */
export const TEST_DURATION = 5

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
      <button className={`dev-test ${value === TEST_DURATION ? 'on' : ''}`} disabled={disabled} onClick={() => onChange(TEST_DURATION)}
        title="Pour le développeur : partie de 5 minutes, avec les outils de démonstration pour former une armée rapidement">
        🛠 test 5 min
      </button>
    </div>
  )
}
