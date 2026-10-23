import { LEVELS, MAX_POINTS, UPCOMING_LEVELS, type Level } from '../data/curriculum'
import type { Progress } from '../game/progress'
import { Portrait } from './Portrait'

export function LevelSelect({ progress, onPick }: { progress: Progress; onPick: (l: Level) => void }) {
  return (
    <div className="level-select">
      <div className="ls-inner">
        <div className="logo">
          <span className="logo-math">Math</span><span className="logo-muscles">Muscles</span>
        </div>
        <p className="ls-tag">Chaque exercice réussi entraîne un soldat. Chaque chapitre forge un corps d’armée.</p>
        <h2 className="ls-h">Choisis ta classe</h2>
        <div className="ls-cards">
          {LEVELS.map((lvl) => {
            const pts = lvl.chapters.reduce((s, c) => s + (progress[lvl.id]?.[c.id]?.points ?? 0), 0)
            const ratio = pts / (MAX_POINTS * lvl.chapters.length)
            return (
              <button key={lvl.id} className="ls-card" onClick={() => onPick(lvl)}>
                <div className="ls-short">{lvl.short}</div>
                <div className="ls-label">{lvl.label}</div>
                <div className="ls-era">{lvl.era}</div>
                <div className="ls-army">
                  {lvl.chapters.slice(0, 4).map((c, i) => (
                    <Portrait key={c.id} size={54} look={{ kind: c.unit, tier: Math.min(3, i + 1), color: c.color, emblem: c.emblem, name: c.tierNames[Math.min(2, i)], upgrades: 0 }} />
                  ))}
                </div>
                <p>{lvl.tagline}</p>
                <div className="ls-progress"><div style={{ width: `${Math.round(ratio * 100)}%` }} /></div>
                <div className="ls-pct">{Math.round(ratio * 100)} % de l’armée formée · {lvl.chapters.length} corps</div>
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
      </div>
    </div>
  )
}
