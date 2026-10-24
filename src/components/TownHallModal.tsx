import { audio } from '../audio/engine'
import { AGES, AGE_BONUS, AGE_PROBLEM_CRAN, levelFromPoints } from '../data/curriculum'
import { ageOf, ageProblemAvailability, houseOf, levelOf, type PlayerState } from '../game/state'
import { useRules } from '../game/rules'
import { formatWait } from './CommandPanel'
import { Portrait } from './Portrait'
import { lookFor } from './WorldMap'

interface Props {
  player: PlayerState
  now: number
  teamColor?: string
  onPick: (chapterId: string, n: 1 | 2 | 3) => void
  onClose: () => void
}

/** Hôtel de ville : résoudre des problèmes (1, 2 ou 3 points) pour passer d'un âge à l'autre. */
export function TownHallModal({ player, now, teamColor, onPick, onClose }: Props) {
  const rules = useRules()
  const age = ageOf(player, rules)
  const thresholds = [0, ...rules.ageThresholds]
  const next = age < 3 ? thresholds[age + 1] : null
  const level = levelOf(player)

  return (
    <div className="modal-backdrop" onKeyDown={(e) => { if (e.key === 'Escape') { audio.ui('close'); onClose() } }}>
      <div className="townhall" role="dialog" aria-label="Hôtel de ville">
        <header className="th-head">
          <div>
            <div className="eyebrow">Hôtel de ville</div>
            <h2>{AGES[age]}</h2>
          </div>
          <button className="close light" onClick={onClose} aria-label="Fermer">✕</button>
        </header>

        <div className="ages-track">
          {AGES.map((name, i) => (
            <div key={name} className={`age-step ${i <= age ? 'reached' : ''} ${i === age ? 'current' : ''}`}>
              <span className="age-dot">{['I', 'II', 'III', 'IV'][i]}</span>
              <span className="age-name">{name.replace('Âge ', '')}</span>
              <span className="age-th">{i === 0 ? 'départ' : `${thresholds[i]} pts`}</span>
            </div>
          ))}
        </div>
        <div className="th-progress">
          <div className="th-bar"><div style={{ width: `${next ? Math.min(100, (player.agePoints / next) * 100) : 100}%` }} /></div>
          <span>{next ? `${player.agePoints} / ${next} points pour l’${AGES[age + 1]}` : `${player.agePoints} points · âge maximal atteint !`}</span>
        </div>
        <p className="th-help">
          Chaque âge renforce <b>toute ton armée</b> (+{Math.round(AGE_BONUS * 100)} % de points de vie et d’attaque) et ouvre les
          améliorations : la 1<sup>re</sup> demande l’Âge féodal, la 2<sup>e</sup> l’Âge des châteaux, la 3<sup>e</sup> l’Âge impérial.
          Chaque problème ne se résout qu’une fois par partie ; un problème raté se rouvre après une courte attente.
        </p>

        <div className="th-table" role="table">
          <div className="th-row th-header" role="row">
            <span role="columnheader">Maison</span>
            <span role="columnheader">1 point</span>
            <span role="columnheader">2 points</span>
            <span role="columnheader">3 points</span>
          </div>
          {level.chapters.map((c) => {
            const h = houseOf(player, c.id)
            const cran = levelFromPoints(h.points, rules.ppc)
            return (
              <div key={c.id} className="th-row" role="row">
                <span className="th-house" role="cell">
                  <Portrait look={lookFor(c, h, rules.ppc, teamColor)} size={40} />
                  <span>
                    <b>{c.corpsName}</b>
                    <small>{c.title} · {cran === 0 ? 'aucun cran terminé' : `${cran} cran${cran > 1 ? 's' : ''} terminé${cran > 1 ? 's' : ''}`}</small>
                  </span>
                </span>
                {([1, 2, 3] as const).map((n) => {
                  const av = ageProblemAvailability(player, c, n, rules, now)
                  return (
                    <span key={n} role="cell">
                      <button className={`th-cell ${av.state}`} disabled={av.state !== 'available'} onClick={() => onPick(c.id, n)}
                        title={av.state === 'locked' ? `Termine le cran ${AGE_PROBLEM_CRAN[n]} de cette maison` : undefined}>
                        {av.state === 'owned' && <>✓ Résolu</>}
                        {av.state === 'available' && <>{'★'.repeat(n)} Problème</>}
                        {av.state === 'cooldown' && <>⏳ {formatWait(av.until - now)}</>}
                        {av.state === 'locked' && <>🔒 cran {AGE_PROBLEM_CRAN[n]} à terminer</>}
                      </button>
                    </span>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
