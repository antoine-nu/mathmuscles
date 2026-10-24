import { useEffect, useMemo, useRef, useState } from 'react'
import type { Level } from '../data/curriculum'
import { Bot, BOT_NAMES } from '../bot/bot'
import { Battle } from '../battle/sim'
import { LocalFeed } from '../battle/feed'
import { RulesContext, duelRules } from '../game/rules'
import { ageOf, armyOf, emptyPlayer, populationOf, type ArmySpec, type PlayerState } from '../game/state'
import { BattleScreen } from './BattleScreen'
import { TrainingScreen } from './TrainingScreen'
import { DurationPicker, SetupFrame } from './DuelSetup'
import { PrepScreen } from './PrepScreen'
import { audio } from '../audio/engine'
import { randomTheme } from '../game/themes'

export const BLUE = '#2f5fb3'
export const RED = '#b8362f'
/** Pause entre la fin du chrono et la bataille (message « Le temps est écoulé »). */
export const TIME_UP_PAUSE = 2500
/** Compte à rebours avant le départ du chrono d'entraînement. */
export const START_COUNTDOWN = 3600
/** Présentation des armées et compte à rebours avant la charge. */
export const BATTLE_INTRO = 6000

const GRADE_LABELS: [number, string][] = [[6, 'Apprenti hésitant'], [10, 'Élève régulier'], [14, 'Bon élève'], [17, 'Très bon élève'], [20, 'Major de promo']]
const gradeLabel = (g: number) => GRADE_LABELS.find(([max]) => g <= max)?.[1] ?? 'Major de promo'

type Phase =
  | { name: 'setup' }
  | { name: 'prep' }
  | { name: 'training'; startsAt: number; deadline: number }
  | { name: 'battle'; feed: LocalFeed; armies: [ArmySpec, ArmySpec]; startAt: number }

interface Props {
  level: Level
  playerName: string
  onQuit: () => void
}

export function BotDuel({ level, playerName, onQuit }: Props) {
  const [duration, setDuration] = useState(15)
  const [grade, setGrade] = useState(13)
  const [botName] = useState(() => BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)])
  const [phase, setPhase] = useState<Phase>({ name: 'setup' })
  const [player, setPlayer] = useState<PlayerState>(() => emptyPlayer(level.id))
  const [botState, setBotState] = useState<PlayerState>(() => emptyPlayer(level.id))
  const botRef = useRef<Bot | null>(null)
  const playerRef = useRef(player)
  playerRef.current = player
  const rules = useMemo(() => duelRules(duration), [duration])
  const me = playerName.trim() || 'Toi'
  const them = `${botName} (${grade}/20)`

  const start = () => {
    botRef.current = new Bot(level.id, grade, rules)
    const theme = randomTheme()
    botRef.current.state = { ...botRef.current.state, mapTheme: theme }
    setPlayer(emptyPlayer(level.id, theme))
    setBotState(botRef.current.state)
    // ?chrono=30 : entraînement raccourci à 30 secondes (pour tester)
    const override = Number(new URLSearchParams(location.search).get('chrono'))
    const startsAt = Date.now() + START_COUNTDOWN
    setPhase({ name: 'training', startsAt, deadline: startsAt + (override > 0 ? override * 1000 : duration * 60_000) })
  }

  // L'ordinateur s'entraîne pendant que tu t'entraînes.
  useEffect(() => {
    if (phase.name !== 'training') return
    const t = window.setInterval(() => {
      const now = Date.now()
      if (now < phase.startsAt) return
      if (botRef.current) setBotState(botRef.current.tick(now))
      if (now >= phase.deadline + TIME_UP_PAUSE) {
        window.clearInterval(t)
        const armies: [ArmySpec, ArmySpec] = [armyOf(playerRef.current, rules), armyOf(botRef.current!.state, rules)]
        const feed = new LocalFeed(new Battle(armies, Math.floor(Math.random() * 1e9)))
        setPhase({ name: 'battle', feed, armies, startAt: Date.now() + BATTLE_INTRO })
      }
    }, 500)
    return () => window.clearInterval(t)
  }, [phase, rules])

  // Pendant la bataille, l'ordinateur sonne parfois le cor.
  useEffect(() => {
    if (phase.name !== 'battle') return
    const t = window.setInterval(() => {
      const b = phase.feed.battle
      if (phase.feed.running && !b.result && botRef.current?.wantsHorn()) b.blowHorn(1)
    }, 1000)
    return () => window.clearInterval(t)
  }, [phase])

  if (phase.name === 'setup') {
    return (
      <SetupFrame title="Défier l’ordinateur" subtitle={level.label} onBack={onQuit}>
        <DurationPicker value={duration} onChange={setDuration} />
        <div className="setup-block">
          <h3>Niveau de l’adversaire</h3>
          <div className="grade">
            <input id="bot-grade" type="range" min={4} max={20} value={grade} onChange={(e) => setGrade(Number(e.target.value))} aria-label="Note de l'ordinateur sur 20" />
            <div className="grade-value"><b>{grade}</b><small>/20</small></div>
          </div>
          <p className="setup-note"><b>{botName}</b> · {gradeLabel(grade)} : plus sa note est haute, plus il répond juste et vite, et plus il ose les problèmes de l’hôtel de ville.</p>
        </div>
        <button className="btn gold big" onClick={() => { audio.unlock(); setPhase({ name: 'prep' }) }}>Préparer la bataille ⚔</button>
      </SetupFrame>
    )
  }

  if (phase.name === 'prep') {
    return (
      <PrepScreen
        level={level}
        durationMin={duration}
        me={{ name: me, ready: false, color: BLUE }}
        opponent={{ name: them, ready: true, color: RED, detail: 'Prêt !' }}
        onReady={start}
        onBack={onQuit}
      />
    )
  }

  if (phase.name === 'training') {
    return (
      <RulesContext.Provider value={rules}>
        <TrainingScreen
          player={player}
          update={setPlayer}
          mode="duel"
          teamColor={BLUE}
          playerName={me}
          opponent={{ name: them, color: RED, age: ageOf(botState, rules), population: populationOf(botState), online: true }}
          startsAt={phase.startsAt}
          deadline={phase.deadline}
          onQuit={onQuit}
        />
      </RulesContext.Provider>
    )
  }

  return (
    <BattleScreen
      feed={phase.feed}
      local={phase.feed}
      armies={phase.armies}
      names={[me, them]}
      colors={[BLUE, RED]}
      mySide={0}
      startAt={phase.startAt}
      onHorn={() => phase.feed.battle.blowHorn(0)}
      onRematch={() => setPhase({ name: 'prep' })}
      onMenu={onQuit}
      villages={[player, botState]}
      themeId={player.mapTheme}
    />
  )
}
