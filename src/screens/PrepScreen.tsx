import { useEffect, useState } from 'react'
import type { Level } from '../data/curriculum'
import { audio } from '../audio/engine'
import { Codex } from '../components/Codex'
import { MuteButton } from '../components/MuteButton'

interface Side {
  name: string
  ready: boolean
  detail?: string
  color: string
}

interface Props {
  level: Level
  durationMin: number
  me: Side
  opponent: Side
  onReady: () => void
  onBack: () => void
}

/** Avant la partie : on consulte le codex des armées, puis chacun déclare « Je suis prêt ». */
export function PrepScreen({ level, durationMin, me, opponent, onReady, onBack }: Props) {
  return (
    <div className="prep">
      <header className="prep-head">
        <button className="hud-back" onClick={onBack}>◀ Menu</button>
        <div className="prep-title">
          <span className="eyebrow">Préparation · {level.label} · {durationMin} min d’entraînement</span>
          <h1>Prépare ta stratégie</h1>
        </div>
        <MuteButton />
      </header>
      <main className="prep-body">
        <p className="prep-intro">
          Chaque maison de ton royaume forme un type de soldat. Pendant le chrono, entraîne celles que tu veux :
          beaucoup d’unités (chacune coûte quelques bonnes réponses), des améliorations, des âges… Les forces et faiblesses ci-dessous t’aident à
          composer une armée qui résiste à tout.
        </p>
        <Codex levelId={level.id} teamColor={me.color} />
      </main>
      <footer className="prep-bar">
        <div className="prep-players">
          {[me, opponent].map((p, i) => (
            <div key={i} className={`prep-player ${p.ready ? 'ready' : ''}`} style={{ borderColor: p.color }}>
              <span className="dot" style={{ background: p.ready ? '#7fbf6a' : '#e2b43c' }} />
              <b style={{ color: p.color }}>{p.name}</b>
              <small>{p.ready ? 'Prêt !' : p.detail ?? 'Se prépare…'}</small>
            </div>
          ))}
        </div>
        <button className="btn gold ready-btn" disabled={me.ready} onClick={() => { audio.unlock(); audio.play('calm'); onReady() }}>
          {me.ready ? `Prêt ✓ — en attente de ${opponent.name}` : 'Je suis prêt ⚔'}
        </button>
      </footer>
    </div>
  )
}

/** Compte à rebours plein écran avant le départ du chrono (3, 2, 1… à l'entraînement !). */
export function StartCountdown({ startsAt, label = 'À l’entraînement !' }: { startsAt: number; label?: string }) {
  const [now, setNow] = useState(Date.now())
  const left = Math.ceil((startsAt - now) / 1000)
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(t)
  }, [])
  useEffect(() => {
    if (left > 0 && left <= 3) audio.tick(false)
    if (left === 0) audio.tick(true)
  }, [left])
  if (now > startsAt + 900) return null
  return (
    <div className="start-countdown" role="status">
      <div className="sc-num" key={left}>{left > 0 ? left : label}</div>
      <small>Le chrono démarre…</small>
    </div>
  )
}
