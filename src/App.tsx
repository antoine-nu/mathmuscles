import { useState } from 'react'
import type { Level } from './data/curriculum'
import { useSoloPlayers } from './game/state'
import { RulesContext, SOLO_RULES } from './game/rules'
import { HomeScreen, type HomeChoice } from './screens/HomeScreen'
import { TrainingScreen } from './screens/TrainingScreen'
import { BotDuel } from './screens/BotDuel'
import { DemoBattle } from './screens/DemoBattle'
import { FriendDuel } from './screens/FriendDuel'

type Screen =
  | { name: 'home' }
  | { name: 'demo' }
  | { name: 'solo'; level: Level }
  | { name: 'duel'; level: Level; mode: Exclude<HomeChoice, 'solo'> }

function loadName(): string {
  try {
    return localStorage.getItem('mathmuscles:name') ?? ''
  } catch {
    return ''
  }
}

export default function App() {
  const solo = useSoloPlayers()
  const [screen, setScreen] = useState<Screen>(() => (new URLSearchParams(location.search).has('bataille') ? { name: 'demo' } : { name: 'home' }))
  const [name, setName] = useState(loadName)
  const saveName = (n: string) => {
    setName(n)
    try {
      localStorage.setItem('mathmuscles:name', n)
    } catch {
      /* nom non mémorisé */
    }
  }

  if (screen.name === 'solo') {
    const level = screen.level
    return (
      <RulesContext.Provider value={SOLO_RULES}>
        <TrainingScreen
          player={solo.get(level.id)}
          update={(fn) => solo.update(level.id, fn)}
          mode="solo"
          onQuit={() => setScreen({ name: 'home' })}
        />
      </RulesContext.Provider>
    )
  }

  if (screen.name === 'demo') return <DemoBattle onMenu={() => setScreen({ name: 'home' })} />

  if (screen.name === 'duel' && screen.mode === 'bot') {
    return <BotDuel level={screen.level} playerName={name} onQuit={() => setScreen({ name: 'home' })} />
  }

  if (screen.name === 'duel') {
    return <FriendDuel level={screen.level} playerName={name} onQuit={() => setScreen({ name: 'home' })} />
  }

  return (
    <HomeScreen
      getSolo={solo.get}
      name={name}
      onName={saveName}
      onPick={(level, mode) => setScreen(mode === 'solo' ? { name: 'solo', level } : { name: 'duel', level, mode })}
    />
  )
}
