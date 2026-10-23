import {
  MAX_LEVEL, MAX_POINTS, POINTS_PER_LEVEL, TIER_PER_LEVEL, UNITS_PER_LEVEL, levelFromPoints, unitName,
  type Chapter, type Upgrade,
} from '../data/curriculum'
import type { ChapterProgress } from '../game/progress'
import { Portrait } from './Portrait'
import { displayedUnits, lookFor } from './WorldMap'

interface Props {
  chapter: Chapter
  progress: ChapterProgress
  demo: boolean
  onTrain: () => void
  onUpgrade: (u: Upgrade) => void
  onDemoPoints: (delta: number) => void
  onDemoUpgrades: () => void
}

const UPGRADE_ICONS = ['🛡', '⚒', '⚑']

export function CommandPanel({ chapter, progress, demo, onTrain, onUpgrade, onDemoPoints, onDemoUpgrades }: Props) {
  const level = levelFromPoints(progress.points)
  const look = lookFor(chapter, progress)
  const maxed = level >= MAX_LEVEL
  const inLevel = maxed ? POINTS_PER_LEVEL : progress.points % POINTS_PER_LEVEL
  const nextTier = TIER_PER_LEVEL.findIndex((t) => t > look.tier)

  return (
    <section className="command">
      <div className="cmd-portrait">
        <div className="portrait-frame">
          <Portrait look={look} size={112} />
        </div>
        <div className="portrait-name">{look.name}</div>
        <div className="portrait-count">× {displayedUnits(chapter, level)}</div>
      </div>

      <div className="cmd-info">
        <div className="eyebrow">{chapter.buildingName}</div>
        <h3>{chapter.corpsName} <span className="muted">— {chapter.title}</span></h3>
        <div className="topics">{chapter.topics.map((t) => <span key={t}>{t}</span>)}</div>

        <div className="gauge" aria-label={`Jauge ${level}/${MAX_LEVEL}`}>
          {Array.from({ length: MAX_LEVEL }, (_, i) => {
            const fill = i < level ? 1 : i === level ? inLevel / POINTS_PER_LEVEL : 0
            return (
              <div key={i} className={`gauge-seg ${i < level ? 'full' : ''}`}>
                <div className="gauge-fill" style={{ width: `${fill * 100}%`, background: chapter.color }} />
                <span className="gauge-lbl">{UNITS_PER_LEVEL[i + 1]}</span>
              </div>
            )
          })}
        </div>
        <div className="gauge-caption">
          {maxed
            ? 'Corps d’armée au complet ! Débloque les améliorations →'
            : `${progress.points}/${MAX_POINTS} bonnes réponses · encore ${POINTS_PER_LEVEL - inLevel} pour le cran ${level + 1}`}
        </div>

        <div className="ranks">
          {[0, 1, 2, 3].map((tier) => {
            const reached = look.tier >= tier
            return (
              <div key={tier} className={`rank ${reached ? 'reached' : ''} ${tier === look.tier ? 'current' : ''}`}>
                <Portrait look={{ ...look, tier, name: unitName(chapter, tier), upgrades: 0 }} size={44} />
                <span>{unitName(chapter, tier)}</span>
              </div>
            )
          })}
          {nextTier > 0 && !maxed && <div className="rank-hint">Prochain rang au cran {nextTier}</div>}
        </div>
      </div>

      <div className="cmd-actions">
        <button className="train" onClick={onTrain}>
          <span className="train-icon">⚔</span>
          <span>
            <b>Entraîner</b>
            <small>Série de 5 exercices</small>
          </span>
        </button>
        <div className="upgrades">
          {chapter.upgrades.map((u, i) => {
            const owned = progress.upgrades.includes(u.id)
            const available = maxed && !owned && (i === 0 || progress.upgrades.includes(chapter.upgrades[i - 1].id))
            return (
              <button key={u.id} className={`upgrade ${owned ? 'owned' : available ? 'available' : 'locked'}`}
                disabled={!available} onClick={() => onUpgrade(u)}
                title={`${u.name} — ${u.description}${owned ? ' (acquise)' : available ? ' · Série d’élite : 4/5 requis' : ' · Verrouillée'}`}>
                <span className="up-icon">{owned ? UPGRADE_ICONS[i] : available ? UPGRADE_ICONS[i] : '🔒'}</span>
                <span className="up-name">{u.name}</span>
              </button>
            )
          })}
        </div>
        {demo && (
          <div className="demo-tools">
            <button onClick={() => onDemoPoints(-POINTS_PER_LEVEL)}>−10</button>
            <button onClick={() => onDemoPoints(POINTS_PER_LEVEL)}>+10 pts</button>
            <button onClick={onDemoUpgrades}>Améliorer</button>
          </div>
        )}
      </div>
    </section>
  )
}
