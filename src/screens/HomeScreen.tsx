import { useState } from 'react'
import { LEVELS, SUBJECTS, UPCOMING_LEVELS, maxPoints, type Level } from '../data/curriculum'
import { chaptersOf, houseOf, type PlayerState } from '../game/state'
import { levelPlayable, loadChosen } from '../game/selection'
import { SOLO_RULES } from '../game/rules'
import { Portrait } from '../components/Portrait'

export type HomeChoice = 'solo' | 'quest' | 'friend' | 'bot' | 'tables'

interface Props {
  getSolo: (levelId: string) => PlayerState
  name: string
  onName: (name: string) => void
  onPick: (level: Level, mode: HomeChoice) => void
  onOptions: (level: Level) => void
}

type Mode = { id: HomeChoice; title: string; text: string; icon: string }
/** Le village et l'assaut final. */
const CONQUEST: Mode[] = [
  { id: 'solo', title: 'Entraînement libre', text: 'Fais grandir ton royaume à ton rythme. Ta progression est sauvegardée.', icon: '⚒' },
  { id: 'friend', title: 'Défier un camarade', text: 'Duel en direct : un code à partager, un chrono, puis la grande bataille.', icon: '⚔' },
  { id: 'bot', title: 'Défier l’ordinateur', text: 'Choisis la note sur 20 de ton adversaire et mesure-toi à lui.', icon: '♜' },
]
/** L'entraînement, sans village ni bataille. */
const TRAINING: Mode[] = [
  { id: 'quest', title: 'La quête du savoir', text: 'Choisis tes chapitres : 10 exercices, 5 missions et 2 défis pour progresser pas à pas.', icon: '🗺' },
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

        <h2 className="ls-h">2 · La conquête</h2>
        <p className="ls-sub">Bâtis ton village, forme ton armée chapitre après chapitre, puis lance l’assaut final.</p>
        <div className="ls-options">
          <div className="ls-opt-text">
            <b>Tes 7 chapitres ({level.label})</b>
            <span>{loadChosen(level.id).map((id) => SUBJECTS.get(id)?.title).join(' · ')}</span>
          </div>
          <button className="hud-btn" onClick={() => onOptions(level)}>⚙ Options</button>
        </div>
        <label className="ls-name">
          <span>Ton nom de seigneur</span>
          <input id="player-name" value={name} maxLength={18} onChange={(e) => onName(e.target.value)} placeholder="ex. Léa la Brave" />
        </label>
        <ModeCards modes={CONQUEST} level={level} onPick={onPick} />

        <h2 className="ls-h">3 · L’entraînement</h2>
        <p className="ls-sub">Sans village ni bataille : des séances pour t’exercer et progresser à ton rythme.</p>
        <ModeCards modes={TRAINING} level={level} onPick={onPick} />

        <HomeFooter />
      </div>
    </div>
  )
}

function ModeCards({ modes, level, onPick }: { modes: Mode[]; level: Level; onPick: (level: Level, mode: HomeChoice) => void }) {
  return (
    <div className="ls-modes">
      {modes.map((m) => (
        <button key={m.id} className={`ls-mode ${m.id}`} onClick={() => onPick(level, m.id)}>
          <span className="ls-mode-icon">{m.icon}</span>
          <b>{m.title}</b>
          <span>{m.text}</span>
          <span className="ls-mode-cta">{m.id === 'tables' ? 'Tous niveaux' : level.label} →</span>
        </button>
      ))}
    </div>
  )
}

/** Bas de page : un paysage en ombres chinoises (château, camp, forêt), pour finir la page en douceur. */
function HomeFooter() {
  const ink = '#3a2614'
  return (
    <footer className="ls-footer" aria-hidden>
      <svg viewBox="0 0 1000 170" preserveAspectRatio="xMidYMax meet">
        <path d="M0,120 Q140,70 300,105 T620,95 T1000,100 L1000,170 L0,170 Z" fill="#2a1a0c" />
        {/* château */}
        <g transform="translate(0 30)">
          <g fill={ink}>
            <rect x={700} y={60} width={120} height={60} />
            <rect x={688} y={36} width={30} height={84} />
            <rect x={802} y={36} width={30} height={84} />
            <rect x={745} y={22} width={30} height={98} />
            {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={702 + i * 20} y={52} width={10} height={10} />)}
            <path d="M684,36 l19,-22 l19,22 Z M798,36 l19,-22 l19,22 Z M741,22 l19,-24 l19,24 Z" />
            <path d="M760,-2 v-14" stroke={ink} strokeWidth={2} />
          </g>
          <path className="flutter" d="M760,-16 l16,5 l-16,5 Z" fill="#b8362f" />
        </g>
        {/* camp de l'armée */}
        <g fill={ink}>
          <path d="M150,118 l26,-34 l26,34 Z M196,120 l20,-26 l20,26 Z M110,120 l18,-22 l18,22 Z" />
          <rect x={174} y={66} width={2.5} height={22} />
        </g>
        <path className="flutter" d="M176.5,66 l16,5 l-16,5 Z" fill="#2f5fb3" />
        {/* arbres */}
        {[40, 62, 300, 330, 470, 900, 930, 960].map((x, i) => (
          <path key={x} d={`M${x},${118 - (i % 2) * 6} l12,-${30 + (i % 3) * 6} l12,${30 + (i % 3) * 6} Z`} fill={ink} />
        ))}
        <path d="M0,140 Q250,120 500,140 T1000,135 L1000,170 L0,170 Z" fill="#140c05" />
      </svg>
      <p>Age of Equations · chaque bonne réponse forme tes troupes</p>
    </footer>
  )
}
