import { useState } from 'react'
import {
  MAX_POINTS, UPGRADE_THRESHOLD, armySize, eraFromRatio, levelFromPoints,
  type Level, type Upgrade,
} from './data/curriculum'
import { useProgress } from './game/progress'
import { CommandPanel } from './components/CommandPanel'
import { ExerciseModal } from './components/ExerciseModal'
import { LevelSelect } from './components/LevelSelect'
import { WorldMap } from './components/WorldMap'
import { ResIcon } from './components/ResIcon'

interface Session {
  chapterId: string
  level: number
  upgrade?: Upgrade
  nonce: number
}

export default function App() {
  const { progress, get, update, resetLevel } = useProgress()
  const [level, setLevel] = useState<Level | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [demo, setDemo] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  if (!level) {
    return <LevelSelect progress={progress} onPick={(l) => { setLevel(l); setSelected(l.chapters[0].id) }} />
  }

  const chapters = level.chapters
  const chapter = chapters.find((c) => c.id === selected) ?? chapters[0]
  const totalPoints = chapters.reduce((s, c) => s + get(level.id, c.id).points, 0)
  const totalSeries = chapters.reduce((s, c) => s + get(level.id, c.id).series, 0)
  const totalUpgrades = chapters.reduce((s, c) => s + get(level.id, c.id).upgrades.length, 0)
  const population = chapters.reduce((s, c) => s + armySize(get(level.id, c.id).points), 0)
  const maxPopulation = chapters.length * armySize(MAX_POINTS)
  const era = eraFromRatio(totalPoints / (MAX_POINTS * chapters.length))

  const flash = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 3200)
  }

  /** Résultat appliqué à la fermeture du parchemin, pour que les recrues arrivent sous les yeux de l'élève. */
  const applyResult = (ses: Session, correct: number) => {
    const ch = chapters.find((c) => c.id === ses.chapterId)!
    const pointsBefore = get(level.id, ch.id).points
    if (ses.upgrade) {
      const up = ses.upgrade
      const won = correct >= UPGRADE_THRESHOLD
      update(level.id, ch.id, (p) => ({ ...p, series: p.series + 1, upgrades: won ? [...new Set([...p.upgrades, up.id])] : p.upgrades }))
      if (won) flash(`Amélioration « ${up.name} » acquise pour ${ch.corpsName} !`)
      return
    }
    update(level.id, ch.id, (p) => ({ ...p, points: p.points + correct, series: p.series + 1 }))
    const pointsAfter = Math.min(MAX_POINTS, pointsBefore + correct)
    const recruits = armySize(pointsAfter) - armySize(pointsBefore)
    const levelAfter = levelFromPoints(pointsAfter)
    if (levelAfter > levelFromPoints(pointsBefore)) {
      flash(`${ch.corpsName} : cran ${levelAfter} atteint ! ${armySize(pointsAfter)} soldats sous ta bannière.`)
    } else if (recruits > 0) {
      flash(`${ch.corpsName} : +${recruits} recrue${recruits > 1 ? 's' : ''} !`)
    }
  }

  return (
    <div className="game">
      <header className="hud">
        <button className="hud-back" onClick={() => { setLevel(null); setSession(null) }} title="Changer de classe">
          ◀ {level.short}
        </button>
        <div className="hud-era">
          <span className="hud-title">MathMuscles</span>
          <span className="hud-age">{era}</span>
        </div>
        <div className="resources">
          <span className="res" title="Bonnes réponses"><ResIcon kind="coin" />{totalPoints}</span>
          <span className="res" title="Séries terminées"><ResIcon kind="scroll" />{totalSeries}</span>
          <span className="res" title="Améliorations"><ResIcon kind="anvil" />{totalUpgrades}</span>
          <span className="res" title="Population"><ResIcon kind="pop" />{population}/{maxPopulation}</span>
        </div>
        <div className="hud-right">
          <label className="demo-toggle" title="Pour la maquette : simuler la progression">
            <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
            Mode démo
          </label>
          {demo && (
            <>
              <button className="hud-btn" onClick={() => chapters.forEach((c, i) => update(level.id, c.id, (p) => ({ ...p, points: Math.min(MAX_POINTS, i * 9 + 2) })))}>Remplir en dégradé</button>
              <button className="hud-btn" onClick={() => resetLevel(level.id)}>Réinitialiser</button>
            </>
          )}
        </div>
      </header>

      <main className="map-wrap">
        <WorldMap
          chapters={chapters}
          getProgress={(id) => get(level.id, id)}
          selected={chapter.id}
          onSelect={setSelected}
        />
        <div className="map-hint">Glisser pour se déplacer · molette pour zoomer · clic sur un camp pour le sélectionner</div>
        {toast && <div className="toast">{toast}</div>}
      </main>

      <CommandPanel
        chapter={chapter}
        progress={get(level.id, chapter.id)}
        demo={demo}
        onTrain={() => setSession({ chapterId: chapter.id, level: levelFromPoints(get(level.id, chapter.id).points), nonce: Date.now() })}
        onUpgrade={(u) => setSession({ chapterId: chapter.id, level: 5, upgrade: u, nonce: Date.now() })}
        onDemoPoints={(delta) => update(level.id, chapter.id, (p) => ({ ...p, points: Math.max(0, p.points + delta) }))}
        onDemoUpgrades={() => update(level.id, chapter.id, (p) => {
          const next = chapter.upgrades.find((u) => !p.upgrades.includes(u.id))
          return { ...p, points: MAX_POINTS, upgrades: next ? [...p.upgrades, next.id] : [] }
        })}
      />

      {session && (
        <ExerciseModal
          key={session.nonce}
          chapter={chapters.find((c) => c.id === session.chapterId)!}
          level={session.level}
          upgrade={session.upgrade}
          points={get(level.id, session.chapterId).points}
          onClose={(correct) => {
            if (correct !== null) applyResult(session, correct)
            setSelected(session.chapterId)
            setSession(null)
          }}
        />
      )}
    </div>
  )
}
