import { useMemo, useState } from 'react'
import { LEVELS } from '../data/curriculum'
import { Bot } from '../bot/bot'
import { Battle } from '../battle/sim'
import { LocalFeed } from '../battle/feed'
import { duelRules } from '../game/rules'
import { armyOf, type ArmySpec } from '../game/state'
import { BattleScreen } from './BattleScreen'
import { BATTLE_INTRO, BLUE, RED } from './BotDuel'

/** Bataille de démonstration entre deux armées d'ordinateurs (/?bataille) : pour voir le combat sans attendre. */
function makeArmy(levelId: string, grade: number): ArmySpec {
  const rules = duelRules(15)
  const bot = new Bot(levelId, grade, rules)
  for (let t = 0; t <= 15 * 60_000; t += 500) bot.tick(t)
  return armyOf(bot.state, rules)
}

export function DemoBattle({ onMenu }: { onMenu: () => void }) {
  const [round, setRound] = useState(0)
  const { feed, armies } = useMemo(() => {
    const armies: [ArmySpec, ArmySpec] = [makeArmy(LEVELS[0].id, 17), makeArmy(LEVELS[1].id, 17)]
    return { armies, feed: new LocalFeed(new Battle(armies, round * 7919 + 13)) }
  }, [round])
  const startAt = useMemo(() => Date.now() + BATTLE_INTRO, [feed])
  return (
    <BattleScreen key={round} feed={feed} local={feed} armies={armies} names={['Armée bleue', 'Armée rouge']} colors={[BLUE, RED]}
      mySide={0} startAt={startAt} onHorn={() => feed.battle.blowHorn(0)} onRematch={() => setRound(round + 1)} onMenu={onMenu} />
  )
}
