import { useMemo, useState } from 'react'
import { LEVELS } from '../data/curriculum'
import { Bot } from '../bot/bot'
import { Battle } from '../battle/sim'
import { LocalFeed } from '../battle/feed'
import { duelRules } from '../game/rules'
import { armyOf, type ArmySpec, type Regiment } from '../game/state'
import { figuresFor } from '../battle/units'
import type { UnitKind } from '../data/curriculum'
import { BattleScreen } from './BattleScreen'
import { BATTLE_INTRO, BLUE, RED } from './BotDuel'

/** Bataille de démonstration entre deux armées d'ordinateurs (/?bataille) : pour voir le combat sans attendre. */
function makeArmy(levelId: string, grade: number): ArmySpec {
  const rules = duelRules(15)
  const bot = new Bot(levelId, grade, rules)
  for (let t = 0; t <= 15 * 60_000; t += 500) bot.tick(t)
  return armyOf(bot.state, rules)
}

/** Armée fixe pour la démonstration d'artillerie (/?bataille=artillerie). */
function siegeArmy(levelId: string): ArmySpec {
  const level = LEVELS.find((l) => l.id === levelId)!
  const want: Partial<Record<UnitKind, number>> = { siege: 11, infantry: 11, archer: 8, spear: 8 }
  const regiments: Regiment[] = level.chapters.filter((c) => want[c.unit]).map((c) => ({
    chapterId: c.id, kind: c.unit, tier: 2, upgrades: 1, soldiers: want[c.unit]!, figures: figuresFor(c.unit, 2, want[c.unit]!),
  }))
  return { levelId, age: 1, regiments }
}

export function DemoBattle({ onMenu }: { onMenu: () => void }) {
  const variant = new URLSearchParams(location.search).get('bataille')
  const [round, setRound] = useState(0)
  const { feed, armies } = useMemo(() => {
    const armies: [ArmySpec, ArmySpec] = variant === 'artillerie'
      ? [siegeArmy(LEVELS[0].id), siegeArmy(LEVELS[1].id)]
      : [makeArmy(LEVELS[0].id, 17), makeArmy(LEVELS[1].id, 17)]
    return { armies, feed: new LocalFeed(new Battle(armies, round * 7919 + 13)) }
  }, [round, variant])
  const startAt = useMemo(() => Date.now() + BATTLE_INTRO, [feed])
  return (
    <BattleScreen key={round} feed={feed} local={feed} armies={armies} names={['Armée bleue', 'Armée rouge']} colors={[BLUE, RED]}
      mySide={0} startAt={startAt} onHorn={() => feed.battle.blowHorn(0)} onRematch={() => setRound(round + 1)} onMenu={onMenu} />
  )
}
