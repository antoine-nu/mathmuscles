import { useCallback, useEffect, useState } from 'react'
import { AGES, levelFromPoints, maxPoints, type Chapter } from '../data/curriculum'
import { garrison } from '../battle/units'
import { difficultyForLevel, makeAgeProblem, makeSeries, makeUpgradeProblem, pickDrill } from '../exercises'
import type { Exercise } from '../exercises/utils'
import {
  addSeries, addUpgrade, ageOf, drillKey, houseOf, levelOf, maxPopulationOf, populationOf, setCooldown, setDrill, solveAgeProblem,
  type PlayerState,
} from '../game/state'
import { useRules } from '../game/rules'
import { useNow } from '../game/useNow'
import { CommandPanel, formatWait } from '../components/CommandPanel'
import { ExerciseModal, Recruits, type ScrollResult } from '../components/ExerciseModal'
import { ResIcon } from '../components/ResIcon'
import { TownHallModal } from '../components/TownHallModal'
import { WorldMap } from '../components/WorldMap'
import { CodexModal } from '../components/Codex'
import { MuteButton } from '../components/MuteButton'
import { audio } from '../audio/engine'
import { StartCountdown } from './PrepScreen'

export interface OpponentStatus {
  name: string
  color: string
  age: number
  population: number
  online: boolean
}

interface Props {
  player: PlayerState
  update: (fn: (p: PlayerState) => PlayerState) => void
  mode: 'solo' | 'duel'
  /** Duel : couleur des unités du joueur et nom affiché. */
  teamColor?: string
  playerName?: string
  opponent?: OpponentStatus
  /** Duel : fin de la phase d'entraînement (horodatage local). */
  deadline?: number
  /** Duel : départ du chrono (compte à rebours affiché avant). */
  startsAt?: number
  onQuit: () => void
}

type Session =
  | { kind: 'series'; chapter: Chapter; pointsBefore: number; exercises: Exercise[]; tier: number; nonce: number }
  | { kind: 'upgrade' | 'age'; chapter: Chapter; n: 1 | 2 | 3; exercises: Exercise[]; nonce: number }

export function TrainingScreen({ player, update, mode, teamColor, playerName, opponent, deadline, startsAt, onQuit }: Props) {
  const rules = useRules()
  const now = useNow(500)
  const level = levelOf(player)
  const chapters = level.chapters
  const [selected, setSelected] = useState(chapters[0].id)
  const [session, setSession] = useState<Session | null>(null)
  const [townHall, setTownHall] = useState(false)
  const [demo, setDemo] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [ageUp, setAgeUp] = useState<number | null>(null)
  const [codex, setCodex] = useState(false)
  const chapter = chapters.find((c) => c.id === selected) ?? chapters[0]
  const age = ageOf(player, rules)
  const thresholds = [0, ...rules.ageThresholds]
  const remaining = deadline ? deadline - now : null
  const timeUp = remaining !== null && remaining <= 0

  const flash = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 3400)
  }, [])

  // Le temps est écoulé : on ferme tout (le parchemin se ferme seul grâce à son échéance).
  useEffect(() => {
    if (timeUp) setTownHall(false)
  }, [timeUp])

  const startSeries = (c: Chapter) => {
    const cran = levelFromPoints(houseOf(player, c.id).points, rules.ppc)
    // un seul type d'exercice par cran : tiré la première fois, puis répété jusqu'au cran suivant
    const key = drillKey(c.id, cran)
    let model = player.drills?.[key]
    if (model === undefined) {
      const picked = pickDrill(c.id, cran)
      model = picked
      update((p) => setDrill(p, key, picked))
    }
    setSession({ kind: 'series', chapter: c, pointsBefore: houseOf(player, c.id).points, exercises: makeSeries(c.id, cran, model), tier: difficultyForLevel(cran), nonce: Date.now() })
  }
  const startUpgrade = (c: Chapter, n: 1 | 2 | 3) => setSession({ kind: 'upgrade', chapter: c, n, exercises: [makeUpgradeProblem(c.id, n)], nonce: Date.now() })
  const startAge = (c: Chapter, n: 1 | 2 | 3) => {
    setTownHall(false)
    setSession({ kind: 'age', chapter: c, n, exercises: [makeAgeProblem(c.id, n)], nonce: Date.now() })
  }

  const finish = (s: Session, result: ScrollResult | null) => {
    setSession(null)
    setSelected(s.chapter.id)
    if (!result) return
    const c = s.chapter
    if (s.kind === 'series') {
      update((p) => addSeries(p, c.id, result.correct, result.answered, rules))
      const after = Math.min(maxPoints(rules.ppc), s.pointsBefore + result.correct)
      const lvlBefore = levelFromPoints(s.pointsBefore, rules.ppc), lvlAfter = levelFromPoints(after, rules.ppc)
      if (lvlAfter > lvlBefore) flash(`${c.corpsName} : cran ${lvlAfter} terminé ! ${garrison(c.unit, after).units} unités sous ta bannière.`)
      return
    }
    const ok = result.correct > 0
    if (s.kind === 'upgrade') {
      if (ok) {
        update((p) => addUpgrade(p, c, s.n))
        flash(`Amélioration « ${c.upgrades[s.n - 1].name} » acquise pour ${c.corpsName} !`)
      } else if (result.answered > 0) {
        update((p) => setCooldown(p, `u:${c.id}:${s.n}`, Date.now() + rules.upgradeCooldown))
      }
      return
    }
    if (ok) {
      const before = ageOf(player, rules)
      update((p) => solveAgeProblem(p, c.id, s.n))
      const afterAge = ageOf({ ...player, agePoints: player.agePoints + s.n }, rules)
      if (afterAge > before) {
        setAgeUp(afterAge)
        audio.success(true)
        window.setTimeout(() => setAgeUp(null), 3200)
      } else flash(`+${s.n} point${s.n > 1 ? 's' : ''} d’âge pour l’hôtel de ville.`)
    } else if (result.answered > 0) {
      update((p) => setCooldown(p, `a:${c.id}:${s.n}`, Date.now() + rules.problemCooldown))
    }
  }

  const totalPoints = chapters.reduce((s, c) => s + houseOf(player, c.id).points, 0)
  const totalUpgrades = chapters.reduce((s, c) => s + houseOf(player, c.id).upgrades.length, 0)
  const population = populationOf(player)
  const maxPopulation = maxPopulationOf(player, rules)

  return (
    <div className={`game ${mode}`}>
      <header className="hud">
        <button className="hud-back" onClick={onQuit} title={mode === 'duel' ? 'Abandonner la partie' : 'Changer de classe'}>
          ◀ {mode === 'duel' ? 'Quitter' : level.short}
        </button>
        <div className="hud-era">
          <span className="hud-title">{playerName ?? 'MathMuscles'}</span>
          <span className="hud-age">{AGES[age]} · {level.label}</span>
        </div>
        <div className="resources">
          <span className="res" title="Bonnes réponses"><ResIcon kind="coin" />{totalPoints}</span>
          <span className="res" title="Points d'âge"><ResIcon kind="scroll" />{player.agePoints}{age < 3 ? `/${thresholds[age + 1]}` : ''}</span>
          <span className="res" title="Améliorations"><ResIcon kind="anvil" />{totalUpgrades}</span>
          <span className="res" title="Population"><ResIcon kind="pop" />{population}/{maxPopulation}</span>
        </div>
        <div className="hud-right">
          <button className="hud-btn" onClick={() => setCodex(true)} title="Caractéristiques des unités">📜 Codex</button>
          <MuteButton />
          {remaining !== null && (
            <div className={`hud-timer ${remaining < 60_000 ? 'urgent' : ''}`} title="Temps restant avant la bataille">
              ⏳ {formatWait(remaining)}
            </div>
          )}
          {opponent && (
            <div className="hud-opponent" title="Ton adversaire">
              <span className="opp-chip" style={{ background: opponent.color }} />
              <span className="opp-name">{opponent.name}{!opponent.online && ' (hors ligne)'}</span>
              <span className="opp-info">{AGES[opponent.age]} · {opponent.population} unités</span>
            </div>
          )}
          {mode === 'solo' && (
            <label className="demo-toggle" title="Pour tester : simuler la progression">
              <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
              Mode démo
            </label>
          )}
          {demo && (
            <button className="hud-btn" onClick={() => update((p) => ({ ...p, agePoints: p.agePoints + 3 }))}>+3 pts d’âge</button>
          )}
        </div>
      </header>

      <main className="map-wrap">
        <WorldMap
          chapters={chapters}
          getProgress={(id) => houseOf(player, id)}
          selected={chapter.id}
          onSelect={setSelected}
          age={age}
          agePoints={player.agePoints}
          nextAgeAt={age < 3 ? thresholds[age + 1] : null}
          teamColor={teamColor}
          onTownCenter={() => setTownHall(true)}
        />
        <div className="map-hint">Glisser pour se déplacer · molette pour zoomer · clic sur un camp ou sur l’hôtel de ville</div>
        {toast && <div className="toast">{toast}</div>}
        {ageUp !== null && (
          <div className="age-up" role="status">
            <div className="age-up-inner">
              <small>Ton royaume entre dans</small>
              <strong>{AGES[ageUp]}</strong>
              <span>Toute ton armée gagne en force. De nouvelles améliorations s’ouvrent.</span>
            </div>
          </div>
        )}
        {timeUp && (
          <div className="time-up" role="status">
            <strong>Le temps est écoulé !</strong>
            <span>Aux armes : la bataille va commencer…</span>
          </div>
        )}
      </main>

      <CommandPanel
        chapter={chapter}
        house={houseOf(player, chapter.id)}
        player={player}
        now={now}
        teamColor={teamColor}
        demo={demo}
        onTrain={() => startSeries(chapter)}
        onUpgrade={(n) => startUpgrade(chapter, n)}
        onDemoPoints={(delta) => update((p) => ({ ...p, houses: { ...p.houses, [chapter.id]: { ...houseOf(p, chapter.id), points: Math.max(0, Math.min(maxPoints(rules.ppc), houseOf(p, chapter.id).points + delta)) } } }))}
        onDemoUpgrades={() => update((p) => {
          const h = houseOf(p, chapter.id)
          const next = chapter.upgrades.find((u) => !h.upgrades.includes(u.id))
          return { ...p, houses: { ...p.houses, [chapter.id]: { ...h, points: maxPoints(rules.ppc), upgrades: next ? [...h.upgrades, next.id] : [] } } }
        })}
      />

      {codex && <CodexModal levelId={player.levelId} teamColor={teamColor} onClose={() => setCodex(false)} />}
      {startsAt && <StartCountdown startsAt={startsAt} />}

      {townHall && !timeUp && (
        <TownHallModal player={player} now={now} teamColor={teamColor} onPick={(id, n) => startAge(chapters.find((c) => c.id === id)!, n)} onClose={() => setTownHall(false)} />
      )}

      {session && (
        <ExerciseModal
          key={session.nonce}
          eyebrow={session.kind === 'series' ? `Entraînement · ${session.chapter.corpsName}` : session.kind === 'upgrade' ? `Amélioration · ${session.chapter.upgrades[session.n - 1].name}` : 'Hôtel de ville'}
          heading={session.chapter.title}
          exercises={session.exercises}
          tierLabel={session.kind === 'series'
            ? <>Palier {session.tier} <span aria-hidden>{'★'.repeat(session.tier)}{'☆'.repeat(5 - session.tier)}</span></>
            : session.kind === 'upgrade' ? <>Amélioration {session.n}/3</> : <>{'★'.repeat(session.n)} Problème à {session.n} point{session.n > 1 ? 's' : ''}</>}
          deadline={deadline}
          summary={(correct) => session.kind === 'series'
            ? <Recruits chapter={session.chapter} before={session.pointsBefore} after={session.pointsBefore + correct} ppc={rules.ppc} />
            : correct > 0
              ? <p className="levelup">{session.kind === 'upgrade'
                  ? <>Amélioration <b>{session.chapter.upgrades[session.n - 1].name}</b> acquise : {session.chapter.upgrades[session.n - 1].description}</>
                  : <>Problème résolu : <b>+{session.n} point{session.n > 1 ? 's' : ''} d’âge</b>.</>}</p>
              : <p>Pas cette fois ! Tu pourras retenter un autre problème après une courte attente.</p>}
          onClose={(r) => finish(session, r)}
        />
      )}
    </div>
  )
}
