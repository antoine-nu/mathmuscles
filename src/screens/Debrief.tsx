// Bilan d'après-bataille : comparaison des deux armées, conseils pour la prochaine fois, et visite des deux
// villages tels qu'ils étaient à la fin de l'entraînement.
import { useState } from 'react'
import { AGES, LEVELS, levelFromPoints, unitName, type Chapter, type UnitKind } from '../data/curriculum'
import { COUNTERS, garrison, kindName } from '../battle/units'
import type { BattleResult, RegimentReport, Side } from '../battle/sim'
import { houseOf, type ArmySpec, type PlayerState } from '../game/state'
import { SOLO_RULES } from '../game/rules'
import { Portrait } from '../components/Portrait'
import { WorldMap, lookFor } from '../components/WorldMap'
import { MuteButton } from '../components/MuteButton'

const CHAPTERS = new Map<string, Chapter>(LEVELS.flatMap((l) => l.chapters.map((c) => [c.id, c] as const)))

interface Props {
  armies: [ArmySpec, ArmySpec]
  villages: [PlayerState, PlayerState]
  names: [string, string]
  colors: [string, string]
  mySide: Side
  result: BattleResult
  onClose: () => void
  onRematch?: () => void
  onMenu: () => void
}

interface Row {
  chapter: Chapter
  kind: UnitKind
  tier: number
  upgrades: number
  points: number
  deployed: number
  survived: number
  kills: number
  nemesis: Chapter | null
  nemesisCount: number
}

function rowsOf(army: ArmySpec, reports: RegimentReport[] | undefined): Row[] {
  return army.regiments
    .filter((r) => r.figures > 0)
    .map((r) => {
      const rep = reports?.find((x) => x.id === r.chapterId)
      return {
        chapter: CHAPTERS.get(r.chapterId)!, kind: r.kind, tier: r.tier, upgrades: r.upgrades, points: r.points,
        deployed: rep?.deployed ?? r.figures, survived: rep?.survived ?? 0, kills: rep?.kills ?? 0,
        nemesis: rep?.nemesis ? CHAPTERS.get(rep.nemesis) ?? null : null, nemesisCount: rep?.nemesisCount ?? 0,
      }
    })
    .sort((a, b) => b.deployed - a.deployed)
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

/** Quelques constats simples, tirés des chiffres de la bataille, pour préparer la prochaine. */
function advice(me: Side, armies: [ArmySpec, ArmySpec], rows: [Row[], Row[]], names: [string, string]): string[] {
  const opp = (1 - me) as Side
  const tips: string[] = []
  const points = (s: Side) => armies[s].regiments.reduce((n, r) => n + r.points, 0)
  const ups = (s: Side) => armies[s].regiments.reduce((n, r) => n + r.upgrades, 0)
  if (points(opp) > points(me) * 1.15) {
    tips.push(`${names[opp]} avait ${points(opp)} bonnes réponses, toi ${points(me)} : la taille de l’armée pèse lourd. Chaque exercice réussi compte !`)
  } else if (points(me) > points(opp) * 1.15) {
    tips.push(`Tu avais plus de bonnes réponses (${points(me)} contre ${points(opp)}) : ton armée était la plus grande.`)
  }
  if (armies[opp].age > armies[me].age) {
    tips.push(`${names[opp]} avait atteint l’${AGES[armies[opp].age]} (toi : ${AGES[armies[me].age]}). Chaque âge donne +8 % de vie et d’attaque à toute l’armée : pense aux problèmes de l’hôtel de ville.`)
  }
  if (ups(opp) > ups(me) + 1) tips.push(`${names[opp]} avait ${plural(ups(opp), 'amélioration')}, toi ${ups(me)}. Les améliorations renforcent nettement un corps d’armée.`)

  // composition adverse : quel type dominait, et qu'est-ce qui le contre ?
  const byKind = new Map<UnitKind, number>()
  for (const r of rows[opp]) if (r.tier > 0) byKind.set(r.kind, (byKind.get(r.kind) ?? 0) + r.deployed)
  const top = [...byKind].sort((a, b) => b[1] - a[1])[0]
  if (top) {
    const counters = (Object.keys(COUNTERS) as UnitKind[]).filter((k) => COUNTERS[k].strong.includes(top[0]))
    const myLevel = LEVELS.find((l) => l.id === armies[me].levelId)
    const houses = myLevel?.chapters.filter((c) => counters.includes(c.unit)).map((c) => c.corpsName) ?? []
    tips.push(`L’armée adverse comptait surtout des ${kindName(top[0])} (${top[1]}). Pour les contrer : ${counters.map(kindName).join(', ')}${houses.length ? ` — chez toi, ${houses.join(', ')}` : ''}.`)
  }

  // le corps adverse le plus meurtrier, et ce qui le contre
  const killer = [...rows[opp]].filter((r) => r.tier > 0).sort((a, b) => b.kills - a.kills)[0]
  if (killer && killer.kills >= 5) {
    const answers = COUNTERS[killer.kind].weak
    tips.push(`Le corps adverse le plus meurtrier : « ${killer.chapter.corpsName} » (${kindName(killer.kind)}, ${plural(killer.kills, 'victime')}). Ce qui en vient à bout : ${answers.map(kindName).join(', ')}.`)
  }

  // le corps qui a le plus souffert, et face à qui
  const worst = rows[me].filter((r) => r.tier > 0 && r.nemesis).sort((a, b) => (b.deployed - b.survived) - (a.deployed - a.survived))[0]
  if (worst && worst.deployed - worst.survived > 0 && worst.nemesis) {
    const enemyKind = worst.nemesis.unit
    const why = COUNTERS[enemyKind].strong.includes(worst.kind) ? ` : les ${kindName(enemyKind)} sont forts contre les ${kindName(worst.kind)}` : ''
    tips.push(`Ton corps « ${worst.chapter.corpsName} » a perdu ${worst.deployed - worst.survived} soldats sur ${worst.deployed}, surtout face à « ${worst.nemesis.corpsName} » (${worst.nemesisCount})${why}.`)
  }

  // le corps le plus efficace
  const best = [...rows[me]].sort((a, b) => b.kills - a.kills)[0]
  if (best && best.kills > 0) tips.push(`Ton corps le plus redoutable : « ${best.tier === 0 ? 'Villageois' : best.chapter.corpsName} », avec ${plural(best.kills, 'ennemi')} hors de combat pour ${plural(best.deployed, 'soldat')}.`)

  const idle = rows[me].filter((r) => r.tier === 0).length
  if (idle >= 3) tips.push(`${idle} de tes maisons n’avaient formé aucun soldat (un simple villageois). Repère dans le Codex les unités qui t’auraient servi.`)
  return tips
}

export function Debrief({ armies, villages, names, colors, mySide, result, onClose, onRematch, onMenu }: Props) {
  const [tab, setTab] = useState<'bilan' | Side>('bilan')
  const rows: [Row[], Row[]] = [rowsOf(armies[0], result.regiments?.[0]), rowsOf(armies[1], result.regiments?.[1])]
  const order: Side[] = mySide === 0 ? [0, 1] : [1, 0]
  const tips = advice(mySide, armies, rows, names)

  return (
    <div className="debrief" role="dialog" aria-label="Bilan de la bataille">
      <header className="db-head">
        <button className="hud-back" onClick={onClose}>◀ Résultat</button>
        <nav className="db-tabs">
          <button className={tab === 'bilan' ? 'on' : ''} onClick={() => setTab('bilan')}>📜 Bilan</button>
          {order.map((s) => (
            <button key={s} className={tab === s ? 'on' : ''} onClick={() => setTab(s)} style={{ borderColor: colors[s] }}>
              🏰 {s === mySide ? 'Mon village' : `Village de ${names[s]}`}
            </button>
          ))}
        </nav>
        <div className="db-actions">
          {onRematch && <button className="hud-btn" onClick={onRematch}>Revanche</button>}
          <button className="hud-btn" onClick={onMenu}>Menu</button>
          <MuteButton />
        </div>
      </header>

      {tab === 'bilan' ? (
        <main className="db-bilan">
          <section className="db-tips">
            <h3>Pour la prochaine fois</h3>
            <ul>{tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </section>
          <div className="db-sides">
            {order.map((s) => {
              const total = rows[s].reduce((n, r) => n + r.deployed, 0)
              const pts = armies[s].regiments.reduce((n, r) => n + r.points, 0)
              return (
                <section key={s} className="db-side" style={{ borderColor: colors[s] }}>
                  <h3 style={{ color: colors[s] }}>{names[s]}{result.winner === s ? ' 🏆' : ''}</h3>
                  <p className="db-summary">
                    {AGES[armies[s].age]} · {pts} bonnes réponses · {total} unités · {result.survivors[s]} survivants
                  </p>
                  <table className="db-table">
                    <thead>
                      <tr><th>Corps</th><th title="Unités engagées">⚔</th><th title="Survivants">❤</th><th title="Ennemis tués ou convertis">☠</th><th>Plus grosses pertes face à</th></tr>
                    </thead>
                    <tbody>
                      {rows[s].map((r) => (
                        <tr key={r.chapter.id}>
                          <td className="db-corps">
                            <Portrait look={lookFor(r.chapter, houseOf(villages[s], r.chapter.id), colors[s])} size={34} />
                            <span>
                              <b>{r.tier === 0 ? 'Villageois' : r.chapter.corpsName}</b>
                              <small>{r.tier === 0 ? r.chapter.corpsName : unitName(r.chapter, r.tier)}{r.upgrades ? ` · ${'★'.repeat(r.upgrades)}` : ''}</small>
                            </span>
                          </td>
                          <td>{r.deployed}</td>
                          <td>{r.survived}</td>
                          <td>{r.kills}</td>
                          <td className="db-nemesis">{r.nemesis ? `${r.nemesis.corpsName} (${r.nemesisCount})` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )
            })}
          </div>
        </main>
      ) : (
        <Village side={tab} army={armies[tab]} village={villages[tab]} color={colors[tab]} reports={result.regiments?.[tab]} />
      )}
    </div>
  )
}

/** Le village d'un camp, tel qu'il était à la fin de l'entraînement, avec la fiche du camp choisi. */
function Village({ army, village, color, reports }: { side: Side; army: ArmySpec; village: PlayerState; color: string; reports?: RegimentReport[] }) {
  const level = LEVELS.find((l) => l.id === army.levelId) ?? LEVELS[0]
  const [selected, setSelected] = useState(level.chapters[0].id)
  const chapter = level.chapters.find((c) => c.id === selected) ?? level.chapters[0]
  const house = houseOf(village, chapter.id)
  const g = garrison(chapter.unit, house.points)
  const rep = reports?.find((r) => r.id === chapter.id)
  const nemesis = rep?.nemesis ? CHAPTERS.get(rep.nemesis) : null
  const thresholds = SOLO_RULES.ageThresholds
  const crans = levelFromPoints(house.points)
  return (
    <main className="db-village">
      <div className="map-wrap">
        <WorldMap
          chapters={level.chapters}
          getProgress={(id) => houseOf(village, id)}
          selected={chapter.id}
          onSelect={setSelected}
          age={army.age}
          agePoints={village.agePoints}
          nextAgeAt={army.age < 3 ? thresholds[army.age] : null}
          teamColor={color}
          onTownCenter={() => {}}
        />
        <div className="map-hint">Clic sur un camp pour voir son détail</div>
      </div>
      <aside className="db-card">
        <Portrait look={lookFor(chapter, house, color)} size={96} />
        <div className="eyebrow">{chapter.buildingName}</div>
        <h3>{chapter.corpsName}</h3>
        <p className="muted">{chapter.title}</p>
        <ul className="db-facts">
          <li><b>{house.points}</b> bonnes réponses · {crans === 0 ? 'aucun cran terminé' : `${plural(crans, 'cran')} terminé${crans > 1 ? 's' : ''}`}</li>
          <li>{g.tier === 0 ? <><b>1</b> villageois (aucun soldat formé)</> : <><b>{g.units}</b> unité{g.units > 1 ? 's' : ''} · rang {unitName(chapter, g.tier)}</>}</li>
          {rep && <li>Bataille : {rep.survived}/{rep.deployed} survivants · {plural(rep.kills, 'ennemi')} hors de combat</li>}
          {nemesis && <li>Plus grosses pertes face à « {nemesis.corpsName} » ({rep?.nemesisCount})</li>}
        </ul>
        <div className="db-ups">
          {chapter.upgrades.map((u) => (
            <span key={u.id} className={house.upgrades.includes(u.id) ? 'owned' : ''} title={u.description}>
              {house.upgrades.includes(u.id) ? '✓' : '✗'} {u.name}
            </span>
          ))}
        </div>
      </aside>
    </main>
  )
}
