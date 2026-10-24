import { chaptersFor, levelById, unitName } from '../data/curriculum'
import { kindName } from '../battle/units'
import { assignSubject, availableSubjects, normalizeSelection, randomSelection } from '../game/selection'
import { Portrait } from './Portrait'

interface Props {
  levelId: string
  selection: string[]
  onChange: (selection: string[]) => void
  teamColor?: string
  disabled?: boolean
}

/** Choix des 7 sujets : un chapitre du programme par maison (chaque maison forme un type d'unité). */
export function SubjectPicker({ levelId, selection, onChange, teamColor, disabled }: Props) {
  const lvl = levelById(levelId)
  const sel = normalizeSelection(levelId, selection)
  const chapters = chaptersFor(levelId, sel)
  const subjects = availableSubjects(levelId)
  const domains = [...new Set(subjects.map((s) => s.domain))]
  const missing = lvl.subjects.length - subjects.length
  return (
    <section className="subject-picker">
      <header className="sp-head">
        <div>
          <h3>Tes 7 maisons</h3>
          <p>Choisis le chapitre qui entraîne chaque maison. Un chapitre ne sert qu’une fois : en choisir un déjà pris échange les deux maisons.</p>
        </div>
        <div className="sp-actions">
          <button className="hud-btn" disabled={disabled} onClick={() => onChange(normalizeSelection(levelId, lvl.defaults))}>Par défaut</button>
          <button className="hud-btn" disabled={disabled} onClick={() => onChange(randomSelection(levelId))}>🎲 Au hasard</button>
        </div>
      </header>
      <div className="sp-grid">
        {chapters.map((c, i) => (
          <label key={c.unit} className="sp-house" style={{ borderColor: c.color }}>
            <Portrait look={{ kind: c.unit, tier: 1, color: teamColor ?? c.color, emblem: c.emblem, name: unitName(c, 1), upgrades: 0 }} size={52} />
            <span className="sp-text">
              <b>{c.corpsName}</b>
              <small>{c.buildingName} · {kindName(c.unit)}</small>
              <select value={sel[i]} disabled={disabled} onChange={(e) => onChange(assignSubject(sel, i, e.target.value))}>
                {domains.map((d) => (
                  <optgroup key={d} label={d}>
                    {subjects.filter((s) => s.domain === d).map((s) => {
                      const other = sel.indexOf(s.id)
                      return (
                        <option key={s.id} value={s.id}>
                          {s.title}{other >= 0 && other !== i ? ` (↔ ${chapters[other].corpsName})` : ''}
                        </option>
                      )
                    })}
                  </optgroup>
                ))}
              </select>
              <small className="sp-topics">{c.topics.join(' · ')}</small>
            </span>
          </label>
        ))}
      </div>
      {missing > 0 && <p className="sp-note">{missing} chapitre{missing > 1 ? 's' : ''} du programme {missing > 1 ? 'arrivent' : 'arrive'} bientôt.</p>}
    </section>
  )
}
