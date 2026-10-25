// Le siège des tables : choix des tables et du niveau, puis le siège (une bonne réponse = un boulet), puis le bilan.
import { useEffect, useMemo, useRef, useState } from 'react'
import { audio } from '../audio/engine'
import { MuteButton } from '../components/MuteButton'
import { StartCountdown } from './PrepScreen'
import { SHOT_FLIGHT, SiegeScene, TARGETS, type Shot } from '../tables/SiegeScene'
import {
  FactDeck, OPERATIONS, SIEGE_LEVELS, TABLES, awardMedals, factAnswer, factText, loadChoice, loadMedals, saveChoice, siegeLevel,
  type Fact, type SiegeChoice, type SiegeLevelId,
} from '../tables/tables'

type Phase =
  | { name: 'setup' }
  | { name: 'play'; startsAt: number; key: number }

export function TablesScreen({ onQuit }: { onQuit: () => void }) {
  const [choice, setChoice] = useState<SiegeChoice>(loadChoice)
  const [phase, setPhase] = useState<Phase>({ name: 'setup' })
  const start = () => {
    saveChoice(choice)
    audio.unlock()
    audio.play('siege')
    setPhase({ name: 'play', startsAt: Date.now() + 3600, key: Date.now() })
  }
  const back = () => {
    audio.play(null)
    setPhase({ name: 'setup' })
  }
  if (phase.name === 'play') {
    return <Siege key={phase.key} choice={choice} startsAt={phase.startsAt} onAgain={start} onSetup={back} onQuit={() => { audio.play(null); onQuit() }} />
  }
  return <Setup choice={choice} onChange={setChoice} onStart={start} onQuit={onQuit} />
}

// ── Choix ──────────────────────────────────────────────────────────────
const MEDAL_COLORS: Record<SiegeLevelId, string> = { ecuyer: '#c98a4a', chevalier: '#c9ccd2', conquerant: '#f2d27a' }

function Setup({ choice, onChange, onStart, onQuit }: { choice: SiegeChoice; onChange: (c: SiegeChoice) => void; onStart: () => void; onQuit: () => void }) {
  const medals = loadMedals()[choice.op]
  const toggle = (t: number) => onChange({ ...choice, tables: choice.tables.includes(t) ? choice.tables.filter((x) => x !== t) : [...choice.tables, t].sort((a, b) => a - b) })
  const sign = OPERATIONS.find((o) => o.id === choice.op)!.sign
  const lvl = siegeLevel(choice.level)
  return (
    <div className="level-select tables-setup">
      <div className="opt-inner">
        <header className="opt-head">
          <button className="hud-back" data-sfx="close" onClick={onQuit}>◀ Accueil</button>
          <div>
            <div className="eyebrow">Entraînement aux tables</div>
            <h1>Le siège des tables</h1>
          </div>
        </header>
        <p className="opt-intro">
          Chaque bonne réponse fait tirer une catapulte sur le château. Abats-le avant que sa garnison n’ait décimé ton
          armée ! Une réponse fausse ne coûte rien… sauf du temps : il faut trouver la bonne pour tirer.
        </p>

        <h2 className="ts-h">1 · Quelles tables ?</h2>
        <div className="ts-ops">
          {OPERATIONS.map((o) => (
            <button key={o.id} className={`opt-row ts-op ${choice.op === o.id ? 'selected' : ''}`} data-sfx="select" onClick={() => onChange({ ...choice, op: o.id })}>
              <span className="opt-emblem">{o.sign}</span>
              <span className="opt-text"><b>{o.name}</b><small>{o.id === 'mult' ? 'de 1 × 1 à 10 × 10' : 'de 1 + 1 à 10 + 10'}</small></span>
            </button>
          ))}
        </div>
        <div className="ts-tables">
          {TABLES.map((t) => {
            const on = choice.tables.includes(t)
            const got = medals[t] ?? []
            return (
              <button key={t} className={`opt-row ts-table ${on ? 'selected' : ''}`} data-sfx="select" aria-pressed={on} onClick={() => toggle(t)}>
                <span className="ts-num">{sign} {t}</span>
                <span className="ts-medals" title="Médailles : château abattu en Écuyer, Chevalier, Conquérant">
                  {SIEGE_LEVELS.map((l) => (
                    <span key={l.id} className={`ts-medal ${got.includes(l.id) ? 'won' : ''}`} style={{ background: got.includes(l.id) ? MEDAL_COLORS[l.id] : undefined }}>{l.icon}</span>
                  ))}
                </span>
              </button>
            )
          })}
        </div>
        <div className="ts-row-actions">
          <button className="hud-btn" onClick={() => onChange({ ...choice, tables: [...TABLES] })}>Toutes</button>
          <button className="hud-btn" onClick={() => onChange({ ...choice, tables: [] })}>Aucune</button>
        </div>

        <h2 className="ts-h">2 · Quelle garnison ?</h2>
        <div className="ts-levels">
          {SIEGE_LEVELS.map((l) => (
            <button key={l.id} className={`opt-row ts-level ${choice.level === l.id ? 'selected' : ''}`} data-sfx="select" onClick={() => onChange({ ...choice, level: l.id })}>
              <span className="opt-emblem" style={{ background: `radial-gradient(circle at 35% 30%, #fff6d8, ${MEDAL_COLORS[l.id]})` }}>{l.icon}</span>
              <span className="opt-text">
                <b>{l.name}</b>
                <small>{l.hint} · environ {Math.round((l.seconds / l.hits) * 10) / 10} s par réponse</small>
              </span>
            </button>
          ))}
        </div>
      </div>
      <footer className="opt-bar">
        <div className="opt-count ok">
          <b>{choice.tables.length ? `${choice.tables.length} table${choice.tables.length > 1 ? 's' : ''}` : 'Aucune table'}</b>
          <small>{lvl.icon} {lvl.name} · {lvl.hits} boulets pour abattre le château</small>
        </div>
        <button className="btn gold big" disabled={!choice.tables.length} onClick={onStart}>Lancer le siège 🏰</button>
      </footer>
    </div>
  )
}

// ── Le siège ───────────────────────────────────────────────────────────
/** Horloge à chaque image (pour les animations de la scène). */
function useFrameClock() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    let raf = 0
    const loop = () => { setNow(Date.now()); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return now
}

interface Props { choice: SiegeChoice; startsAt: number; onAgain: () => void; onSetup: () => void; onQuit: () => void }

function Siege({ choice, startsAt, onAgain, onSetup, onQuit }: Props) {
  const lvl = siegeLevel(choice.level)
  const now = useFrameClock()
  const deck = useMemo(() => new FactDeck(choice.op, choice.tables), [choice])
  const [fact, setFact] = useState<Fact>(() => deck.next())
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(0) // horodatage de la dernière erreur (secousse)
  const [shots, setShots] = useState<Shot[]>([])
  const [errors, setErrors] = useState<Fact[]>([])
  const [ended, setEnded] = useState<{ result: 'won' | 'lost'; t0: number } | null>(null)
  const [medalsWon, setMedalsWon] = useState<number[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const heard = useRef(0)
  const started = now >= startsAt
  const fired = shots.length
  // le temps de l'armée s'arrête quand le dernier boulet est parti (ou à la fin)
  const stopAt = ended ? ended.t0 : fired >= lvl.hits ? shots[lvl.hits - 1].t0 : null
  const elapsed = Math.max(0, (stopAt ?? now) - startsAt)
  const armyHp = Math.max(0, 1 - elapsed / (lvl.seconds * 1000))
  const landed = shots.filter((s) => now >= s.t0 + SHOT_FLIGHT)
  const castleHp = Math.max(0, 1 - landed.length / lvl.hits)
  const impacts = landed.map((s) => ({ t: s.t0 + SHOT_FLIGHT, target: s.target }))
  const volleyEvery = lvl.seconds * 1000 / 45
  const volleys = useMemo(() => {
    if (!started || ended) return []
    const k = Math.floor(elapsed / volleyEvery)
    return [k - 1, k].filter((i) => i >= 0).map((i) => ({ id: i, t0: startsAt + i * volleyEvery }))
  }, [started, ended, elapsed, volleyEvery, startsAt])

  // bruitages des impacts
  useEffect(() => {
    if (landed.length > heard.current) {
      heard.current = landed.length
      audio.impact()
    }
  }, [landed.length])

  // victoire / défaite
  useEffect(() => {
    if (ended || !started) return
    if (landed.length >= lvl.hits) {
      setEnded({ result: 'won', t0: Date.now() })
      audio.play(null)
      audio.collapse()
      window.setTimeout(() => audio.fanfare(true), 1500)
      setMedalsWon(awardMedals(choice.op, choice.tables, choice.level))
    } else if (armyHp <= 0 && fired < lvl.hits) {
      setEnded({ result: 'lost', t0: Date.now() })
      audio.play(null)
      window.setTimeout(() => audio.fanfare(false), 1200)
    }
  }, [landed.length, armyHp, ended, started, fired, lvl.hits, choice])

  useEffect(() => {
    if (started && !ended) inputRef.current?.focus()
  }, [started, ended, fact])

  const submit = () => {
    if (!started || ended || fired >= lvl.hits || !value) return
    if (Number(value) === factAnswer(fact)) {
      audio.launch()
      setShots((s) => [...s, { id: s.length, t0: Date.now(), from: s.length % 3, target: Math.floor(Math.random() * TARGETS.length) }])
      setValue('')
      setFact(deck.next())
    } else {
      audio.wrong()
      setWrong(Date.now())
      setErrors((e) => [...e, fact])
      deck.missed(fact)
      setValue('')
    }
  }
  const press = (k: string) => {
    if (k === '⌫') setValue((v) => v.slice(0, -1))
    else if (k === '✓') submit()
    else setValue((v) => (v.length < 3 ? v + k : v))
  }

  const shaking = now - wrong < 450
  const toReview = [...new Map(errors.map((f) => [factText(f), f])).values()]
  const secs = Math.round(elapsed / 1000)

  return (
    <div className="siege">
      <header className="siege-hud">
        <button className="hud-back" data-sfx="close" onClick={onQuit}>◀ Quitter</button>
        <div className="sh-bars">
          <div className="sh-bar army">
            <span>Ton armée</span>
            <div><i style={{ width: `${armyHp * 100}%` }} /></div>
          </div>
          <div className="sh-hits"><b>{Math.min(fired, lvl.hits)}</b><small>/ {lvl.hits} boulets</small></div>
          <div className="sh-bar castle">
            <span>Le château</span>
            <div><i style={{ width: `${castleHp * 100}%` }} /></div>
          </div>
        </div>
        <span className="sh-level">{lvl.icon} {lvl.name}</span>
        <MuteButton />
      </header>

      <div className="siege-stage">
        <SiegeScene now={now} castleHp={castleHp} armyHp={armyHp} shots={shots} impacts={impacts} volleys={volleys} ended={ended} />
        {!started && <StartCountdown startsAt={startsAt} label="À l’assaut !" />}
      </div>

      <footer className={`siege-question ${shaking ? 'wrong' : ''}`}>
        {!ended && (
          <>
            <form className="sq-form" onSubmit={(e) => { e.preventDefault(); submit() }}>
              <span className="sq-fact">{factText(fact)} =</span>
              <input ref={inputRef} value={value} inputMode="numeric" autoComplete="off" aria-label="Ta réponse"
                disabled={!started || fired >= lvl.hits} onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 3))} />
              <button className="btn gold" type="submit" data-sfx="none" disabled={!started || fired >= lvl.hits}>Feu !</button>
            </form>
            <div className="sq-msg">{shaking ? 'Raté ! Essaie encore : la catapulte attend la bonne réponse.' : fired >= lvl.hits ? 'Le dernier boulet est parti…' : ' '}</div>
            <div className="sq-pad">
              {['7', '8', '9', '4', '5', '6', '1', '2', '3', '⌫', '0', '✓'].map((k) => (
                <button key={k} type="button" data-sfx={k === '✓' ? 'none' : 'key'} onMouseDown={(e) => e.preventDefault()} onClick={() => press(k)} className={k === '✓' ? 'ok' : ''}>{k}</button>
              ))}
            </div>
          </>
        )}
      </footer>

      {ended && now - ended.t0 > (ended.result === 'won' ? 2400 : 2000) && (
        <div className="siege-end">
          <div className="be-card">
            <div className="be-title" style={{ color: ended.result === 'won' ? 'var(--gold-bright)' : '#e6a07a' }}>
              {ended.result === 'won' ? 'Le château est tombé !' : 'Le château a tenu bon…'}
            </div>
            <p>
              {ended.result === 'won'
                ? <>Victoire en {secs} secondes, avec {errors.length} erreur{errors.length > 1 ? 's' : ''}.</>
                : <>Il manquait {lvl.hits - fired} boulet{lvl.hits - fired > 1 ? 's' : ''}. Encore un effort !</>}
            </p>
            {ended.result === 'won' && medalsWon.length > 0 && (
              <p className="se-medals">
                {siegeLevel(choice.level).icon} Nouvelle{medalsWon.length > 1 ? 's' : ''} médaille{medalsWon.length > 1 ? 's' : ''} « {lvl.name} » :
                {' '}{medalsWon.map((t) => `table de ${t}`).join(', ')}
              </p>
            )}
            {toReview.length > 0 && (
              <div className="se-review">
                <b>À revoir :</b>
                {toReview.slice(0, 12).map((f) => <span key={factText(f)}>{factText(f)} = {factAnswer(f)}</span>)}
              </div>
            )}
            <div className="be-actions">
              <button className="btn gold" onClick={onAgain}>Rejouer</button>
              <button className="btn gold" onClick={onSetup}>Changer de tables</button>
              <button className="btn gold" onClick={onQuit}>Accueil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

