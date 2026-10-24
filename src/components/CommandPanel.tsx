import { MAX_LEVEL, TIER_PER_LEVEL, UNITS_PER_LEVEL, armySize, levelFromPoints, maxPoints, pointsToNextRecruit, unitName, type Chapter } from '../data/curriculum'
import { MATCHUPS, UNIT_STATS } from '../battle/units'
import { upgradeAvailability, type HouseState, type PlayerState } from '../game/state'
import { useRules } from '../game/rules'
import { difficultyForLevel } from '../exercises'
import { Portrait } from './Portrait'
import { displayedUnits, lookFor } from './WorldMap'

interface Props {
  chapter: Chapter
  house: HouseState
  player: PlayerState
  now: number
  teamColor?: string
  demo: boolean
  onTrain: () => void
  onUpgrade: (n: 1 | 2 | 3) => void
  onDemoPoints: (delta: number) => void
  onDemoUpgrades: () => void
}

const UPGRADE_ICONS = ['🛡', '⚒', '⚑']

export const formatWait = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function CommandPanel({ chapter, house, player, now, teamColor, demo, onTrain, onUpgrade, onDemoPoints, onDemoUpgrades }: Props) {
  const rules = useRules()
  const { ppc } = rules
  const level = levelFromPoints(house.points, ppc)
  const look = lookFor(chapter, house, ppc, teamColor)
  const maxed = level >= MAX_LEVEL
  const inLevel = maxed ? ppc : house.points % ppc
  const nextTier = TIER_PER_LEVEL.findIndex((t) => t > look.tier)
  const soldiers = armySize(house.points, ppc)
  const figures = displayedUnits(chapter, house.points, ppc)
  const stats = UNIT_STATS[chapter.unit]
  const role = MATCHUPS[chapter.unit]

  return (
    <section className="command">
      <div className="cmd-portrait">
        <div className="portrait-frame">
          <Portrait look={look} size={112} />
        </div>
        <div className="portrait-name">{look.name}</div>
        <div className="portrait-count">
          {soldiers} soldat{soldiers > 1 ? 's' : ''}{figures !== soldiers ? ` · ${figures} ${chapter.unit === 'siege' ? 'engin' : 'unité'}${figures > 1 ? 's' : ''}` : ''}
        </div>
      </div>

      <div className="cmd-info">
        <div className="eyebrow">{chapter.buildingName}</div>
        <h3>{chapter.corpsName} <span className="muted">— {chapter.title}</span></h3>
        <div className="topics">{chapter.topics.map((t) => <span key={t}>{t}</span>)}</div>

        <div className="gauge" aria-label={`Jauge ${level}/${MAX_LEVEL}`}>
          {Array.from({ length: MAX_LEVEL }, (_, i) => {
            const fill = i < level ? 1 : i === level ? inLevel / ppc : 0
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
            ? 'Corps d’armée au complet ! Il reste les améliorations →'
            : `${house.points}/${maxPoints(ppc)} bonnes réponses · prochaine recrue dans ${pointsToNextRecruit(house.points, ppc)} · cran ${level + 1} dans ${ppc - inLevel}`}
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
          <div className="unit-role">
            {nextTier > 0 && !maxed && <div className="rank-hint">Prochain rang au cran {nextTier}</div>}
            <div><b>Fort contre</b> {role.strong}</div>
            <div><b>Faible contre</b> {role.weak}</div>
            <div className="unit-stats">
              ❤ {stats.hp} · ⚔ {stats.attack || '—'} · 🛡 {stats.armor} · {stats.range > 2 ? `🎯 ${stats.range} m · ` : ''}🐎 {stats.speed} m/s{stats.cost !== 1 ? ` · coût ${String(stats.cost).replace('.', ',')}` : ''}
            </div>
          </div>
        </div>
      </div>

      <div className="cmd-actions">
        <button className="train" onClick={onTrain}>
          <span className="train-icon">⚔</span>
          <span>
            <b>Entraîner</b>
            <small>Série de 5 · palier {difficultyForLevel(level)}/5 {'★'.repeat(difficultyForLevel(level))}</small>
          </span>
        </button>
        <div className="upgrades">
          {chapter.upgrades.map((u, i) => {
            const n = (i + 1) as 1 | 2 | 3
            const av = upgradeAvailability(player, chapter, n, rules, now)
            const cls = av.state === 'owned' ? 'owned' : av.state === 'available' ? 'available' : 'locked'
            const info = av.state === 'owned' ? 'acquise' : av.state === 'available' ? 'un problème à résoudre' : av.state === 'cooldown' ? `nouvel essai dans ${formatWait(av.until - now)}` : av.reason
            return (
              <button key={u.id} className={`upgrade ${cls}`} disabled={av.state !== 'available'} onClick={() => onUpgrade(n)}
                title={`${u.name} — ${u.description} (${info})`}>
                <span className="up-icon">{av.state === 'locked' ? '🔒' : av.state === 'cooldown' ? '⏳' : UPGRADE_ICONS[i]}</span>
                <span className="up-name">{u.name}</span>
                <span className="up-req">{av.state === 'owned' ? '✓ acquise' : av.state === 'cooldown' ? formatWait(av.until - now) : av.state === 'locked' ? av.reason.replace('Requis : ', '') : 'Problème'}</span>
              </button>
            )
          })}
        </div>
        {demo && (
          <div className="demo-tools">
            <button onClick={() => onDemoPoints(-ppc)}>−1 cran</button>
            <button onClick={() => onDemoPoints(ppc)}>+1 cran</button>
            <button onClick={onDemoUpgrades}>Améliorer</button>
          </div>
        )}
      </div>
    </section>
  )
}
