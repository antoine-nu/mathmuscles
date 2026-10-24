import { useState } from 'react'
import { levelById, type Level } from '../data/curriculum'
import { audio } from '../audio/engine'
import { availableSubjects, loadChosen, normalizeSelection, saveChosen } from '../game/selection'
import { shuffle } from '../exercises/utils'

/** Options du niveau : choix des 7 chapitres qui entraîneront les maisons (répartis au hasard à chaque partie). */
export function OptionsScreen({ level, onBack }: { level: Level; onBack: () => void }) {
  const n = level.houses.length
  const subjects = availableSubjects(level.id)
  const domains = [...new Set(subjects.map((s) => s.domain))]
  const [chosen, setChosen] = useState<string[]>(() => loadChosen(level.id))
  const missing = levelById(level.id).subjects.length - subjects.length
  const full = chosen.length >= n
  const [refused, setRefused] = useState<string | null>(null)

  const toggle = (id: string) => {
    if (chosen.includes(id)) {
      audio.ui('click')
      setChosen(chosen.filter((x) => x !== id))
    } else if (!full) {
      audio.ui('select')
      setChosen([...chosen, id])
    } else {
      // déjà 7 chapitres : on signale qu'il faut d'abord en retirer un
      audio.wrong()
      setRefused(id)
      window.setTimeout(() => setRefused((r) => (r === id ? null : r)), 600)
    }
  }
  const save = () => {
    saveChosen(level.id, chosen)
    onBack()
  }

  return (
    <div className="level-select options">
      <div className="opt-inner">
        <header className="opt-head">
          <button className="hud-back" data-sfx="close" onClick={onBack}>◀ Retour</button>
          <div>
            <div className="eyebrow">Options · {level.label}</div>
            <h1>Chapitres de ton royaume</h1>
          </div>
        </header>
        <p className="opt-intro">
          Choisis les <b>{n} chapitres</b> sur lesquels tu veux t’entraîner. À chaque partie, ils sont répartis au hasard
          entre les {n} maisons de ton village (infanterie, lanciers, archers, chevaliers, éclaireurs, siège, moines).
        </p>

        {domains.map((d) => (
          <section key={d} className="opt-domain">
            <h2>{d}</h2>
            <div className="opt-list">
              {subjects.filter((s) => s.domain === d).map((s) => {
                const on = chosen.includes(s.id)
                return (
                  <button key={s.id} data-sfx="none" className={`opt-row ${on ? 'selected' : ''} ${refused === s.id ? 'refused' : ''}`}
                    aria-pressed={on} onClick={() => toggle(s.id)}>
                    <span className="opt-emblem">{s.emblem}</span>
                    <span className="opt-text">
                      <b>{s.title}</b>
                      <small>{s.topics.join(' · ')}</small>
                    </span>
                    <span className="opt-mark" aria-hidden>{on ? '⚔' : ''}</span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
        {missing > 0 && <p className="sp-note">{missing} chapitre{missing > 1 ? 's' : ''} du programme {missing > 1 ? 'arrivent' : 'arrive'} bientôt.</p>}
      </div>

      <footer className="opt-bar">
        <div className={`opt-count ${chosen.length === n ? 'ok' : ''}`}>
          <b>{chosen.length} / {n}</b>
          <small>{chosen.length === n ? 'chapitres choisis' : chosen.length < n ? `encore ${n - chosen.length} à choisir` : 'trop de chapitres'}</small>
        </div>
        <div className="opt-actions">
          <button className="hud-btn" onClick={() => setChosen(normalizeSelection(level.id, level.defaults))}>Par défaut</button>
          <button className="hud-btn" onClick={() => setChosen(shuffle(subjects.map((s) => s.id)).slice(0, n))}>🎲 Au hasard</button>
          <button className="btn gold" disabled={chosen.length !== n} onClick={save}>Valider</button>
        </div>
      </footer>
    </div>
  )
}
