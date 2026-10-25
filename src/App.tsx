import { useState } from 'react'
import type { Level } from './data/curriculum'
import { useSoloPlayers } from './game/state'
import { RulesContext, SOLO_RULES } from './game/rules'
import { HomeScreen } from './screens/HomeScreen'
import { TrainingScreen } from './screens/TrainingScreen'
import { BotDuel } from './screens/BotDuel'
import { DemoBattle } from './screens/DemoBattle'
import { FriendDuel } from './screens/FriendDuel'
import { OptionsScreen } from './screens/OptionsScreen'
import { TablesScreen } from './screens/TablesScreen'
import { QuestScreen } from './screens/QuestScreen'
import { loadChosen, randomAssignment, sameChapters } from './game/selection'
import { audio, useUiSounds } from './audio/engine'

type Screen =
  | { name: 'home' }
  | { name: 'demo' }
  | { name: 'solo'; level: Level }
  | { name: 'options'; level: Level }
  | { name: 'tables' }
  | { name: 'quest'; level: Level }
  | { name: 'duel'; level: Level; mode: 'friend' | 'bot' }

function loadName(): string {
  try {
    return localStorage.getItem('mathmuscles:name') ?? ''
  } catch {
    return ''
  }
}

export default function App() {
  const solo = useSoloPlayers()
  useUiSounds()
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

  const home = () => {
    audio.play(null)
    setScreen({ name: 'home' })
  }

  if (screen.name === 'solo') {
    const level = screen.level
    return (
      <RulesContext.Provider value={SOLO_RULES}>
        <TrainingScreen
          player={solo.get(level.id)}
          update={(fn) => solo.update(level.id, fn)}
          mode="solo"
          onQuit={home}
        />
      </RulesContext.Provider>
    )
  }

  if (screen.name === 'demo') return <DemoBattle onMenu={home} />
  if (screen.name === 'tables') return <TablesScreen onQuit={home} />
  if (screen.name === 'quest') return <QuestScreen level={screen.level} onQuit={home} />
  if (screen.name === 'options') return <OptionsScreen level={screen.level} onBack={() => setScreen({ name: 'home' })} />

  if (screen.name === 'duel' && screen.mode === 'bot') {
    return <BotDuel level={screen.level} playerName={name} onQuit={home} />
  }

  if (screen.name === 'duel') {
    return <FriendDuel level={screen.level} playerName={name} onQuit={home} />
  }

  return (
    <HomeScreen
      getSolo={solo.get}
      name={name}
      onName={saveName}
      onOptions={(level) => setScreen({ name: 'options', level })}
      onPick={(level, mode) => {
        audio.unlock()
        // entraînement libre : si les chapitres choisis ont changé, nouvelle répartition au hasard entre les maisons
        // (la progression de chaque chapitre est conservée)
        const p = solo.get(level.id)
        if (mode === 'solo' && (!p.selection || !sameChapters(p.selection, loadChosen(level.id)))) {
          solo.update(level.id, (q) => ({ ...q, selection: randomAssignment(level.id) }))
        }
        if (mode === 'tables') return setScreen({ name: 'tables' })
        if (mode === 'quest') return setScreen({ name: 'quest', level })
        if (mode === 'solo') audio.play('calm')
        setScreen(mode === 'solo' ? { name: 'solo', level } : { name: 'duel', level, mode })
      }}
    />
  )
}
