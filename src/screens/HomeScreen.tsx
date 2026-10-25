import { useState } from 'react'
import { LEVELS, SUBJECTS, UPCOMING_LEVELS, maxPoints, type Level } from '../data/curriculum'
import { chaptersOf, houseOf, type PlayerState } from '../game/state'
import { levelPlayable, loadChosen } from '../game/selection'
import { SOLO_RULES } from '../game/rules'
import { Portrait } from '../components/Portrait'

export type HomeChoice = 'solo' | 'friend' | 'bot' | 'tables'

interface Props {
  getSolo: (levelId: string) => PlayerState
  name: string
  onName: (name: string) => void
  onPick: (level: Level, mode: HomeChoice) => void
  onOptions: (level: Level) => void
}

const MODES: { id: HomeChoice; title: string; text: string; icon: string }[] = [
  { id: 'solo', title: 'Entraînement libre', text: 'Fais grandir ton royaume à ton rythme. Ta progression est sauvegardée.', icon: '⚒' },
  { id: 'friend', title: 'Défier un camarade', text: 'Duel en direct : un code à partager, un chrono, puis la grande bataille.', icon: '⚔' },
  { id: 'bot', title: 'Défier l’ordinateur', text: 'Choisis la note sur 20 de ton adversaire et mesure-toi à lui.', icon: '♜' },
  { id: 'tables', title: 'Le siège des tables', text: 'Tables de multiplication et d’addition : chaque bonne réponse, un boulet sur le château !', icon: '🏰' },
]

export function HomeScreen({ getSolo, name, onName, onPick, onOptions }: Props) {
  const [levelId, setLevelId] = useState<string>(() => {
    try {
      return localStorage.getItem('mathmuscles:level') ?? LEVELS[0].id
    } catch {
      return LEVELS[0].id
    }
  })
  const level = LEVELS.find((l) => l.id === levelId && levelPlayable(l.id)) ?? LEVELS[0]
  const choose = (id: string) => {
    setLevelId(id)
    try {
      localStorage.setItem('mathmuscles:level', id)
    } catch {
      /* préférence non mémorisée */
    }
  }

  return (
    <div className="level-select">
      <div className="ls-inner">
        <div className="logo">
          <span className="logo-of">Age of</span>
          <span className="logo-main">Equations</span>
        </div>
        <p className="ls-tag">Chaque bonne réponse forme tes troupes. Chaque chapitre forge un corps d’armée.</p>

        <h2 className="ls-h">1 · Choisis ton niveau</h2>
        <div className="ls-cards">
          {LEVELS.map((lvl) => {
            const p = getSolo(lvl.id)
            const mine = chaptersOf(p)
            const pts = mine.reduce((s, c) => s + houseOf(p, c.id).points, 0)
            const ratio = pts / (maxPoints(SOLO_RULES.ppc) * mine.length)
            const playable = levelPlayable(lvl.id)
            return (
              <button key={lvl.id} className={`ls-card ${lvl.id === level.id ? 'selected' : ''} ${playable ? '' : 'locked'}`} disabled={!playable}
                onClick={() => choose(lvl.id)} aria-pressed={lvl.id === level.id}>
                <div className="ls-short">{lvl.short}</div>
                <div className="ls-label">{lvl.label}</div>
                <div className="ls-army">
                  {lvl.chapters.slice(0, 5).map((c, i) => (
                    <Portrait key={c.id} size={50} look={{ kind: c.unit, tier: Math.min(3, (i % 3) + 1), color: c.color, emblem: c.emblem, name: c.tierNames[Math.min(2, i % 3)], upgrades: 0 }} />
                  ))}
                </div>
                <p>{lvl.tagline}</p>
                <div className="ls-progress"><div style={{ width: `${Math.round(ratio * 100)}%` }} /></div>
                <div className="ls-pct">{playable ? <>Entraînement libre : {Math.round(ratio * 100)} % de l’armée formée</> : 'Exercices en préparation'}</div>
              </button>
            )
          })}
          {UPCOMING_LEVELS.map((l) => (
            <div key={l} className="ls-card locked">
              <div className="ls-short">{l}</div>
              <div className="ls-label">Bientôt</div>
            </div>
          ))}
        </div>

        <div className="ls-options">
          <div className="ls-opt-text">
            <b>Tes 7 chapitres ({level.label})</b>
            <span>{loadChosen(level.id).map((id) => SUBJECTS.get(id)?.title).join(' · ')}</span>
          </div>
          <button className="hud-btn" onClick={() => onOptions(level)}>⚙ Options</button>
        </div>

        <h2 className="ls-h">2 · Que veux-tu faire ?</h2>
        <label className="ls-name">
          <span>Ton nom de seigneur</span>
          <input id="player-name" value={name} maxLength={18} onChange={(e) => onName(e.target.value)} placeholder="ex. Léa la Brave" />
        </label>
        <div className="ls-modes">
          {MODES.map((m) => (
            <button key={m.id} className={`ls-mode ${m.id}`} onClick={() => onPick(level, m.id)}>
              <span className="ls-mode-icon">{m.icon}</span>
              <b>{m.title}</b>
              <span>{m.text}</span>
              <span className="ls-mode-cta">{m.id === 'tables' ? 'Tous niveaux' : level.label} →</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
