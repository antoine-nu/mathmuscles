import { useEffect, useMemo, useRef, useState } from 'react'
import { LEVELS, type Chapter } from '../data/curriculum'
import { BattleCanvas } from '../battle/BattleCanvas'
import type { Feed, LocalFeed } from '../battle/feed'
import { hornQuestion } from '../battle/hornQuestions'
import { HORN_DURATION, HORN_MAX, MAX_DURATION, type BattleResult, type Side } from '../battle/sim'
import { UNIT_STATS } from '../battle/units'
import { playerFromArmy, type ArmySpec, type PlayerState } from '../game/state'
import { SOLO_RULES } from '../game/rules'
import { Debrief } from './Debrief'
import type { Exercise } from '../exercises/utils'
import { MathText } from '../components/MathText'
import { formatWait } from '../components/CommandPanel'
import { MuteButton } from '../components/MuteButton'
import { audio } from '../audio/engine'

const CHAPTERS = new Map<string, Chapter>(LEVELS.flatMap((l) => l.chapters.map((c) => [c.id, c] as const)))

interface Props {
  feed: Feed
  /** Simulation locale (contre l'ordinateur, ou côté hôte) : contrôle du départ et de la vitesse. */
  local?: LocalFeed
  armies: [ArmySpec, ArmySpec]
  names: [string, string]
  colors: [string, string]
  mySide: Side
  /** Horodatage local du coup d'envoi. */
  startAt: number
  onHorn: () => void
  onRematch?: () => void
  onMenu: () => void
  /** Villages des deux camps à la fin de l'entraînement (bilan) ; à défaut, reconstitués à partir des armées. */
  villages?: [PlayerState | null, PlayerState | null]
  /** Message d'état réseau (ex. adversaire déconnecté). */
  notice?: string | null
  /** Message sous le bilan quand il n'y a pas de bouton « Revanche » (invité d'un duel). */
  endHint?: string
}

interface Hud {
  t: number
  alive: [number, number]
  hornsUsed: [number, number]
  hornOn: [boolean, boolean]
  /** Secondes d'effet restantes pour chaque cor. */
  hornLeft: [number, number]
}

export function BattleScreen({ feed, local, armies, names, colors, mySide, startAt, onHorn, onRematch, onMenu, notice, endHint, villages }: Props) {
  const [debrief, setDebrief] = useState(false)
  const [hud, setHud] = useState<Hud>({ t: 0, alive: [0, 0], hornsUsed: [0, 0], hornOn: [false, false], hornLeft: [0, 0] })
  const [now, setNow] = useState(Date.now())
  const [result, setResult] = useState<BattleResult | null>(null)
  const [showEnd, setShowEnd] = useState(false)
  const [question, setQuestion] = useState<{ ex: Exercise } | null>(null)
  const [answer, setAnswer] = useState('')
  const [hornCd, setHornCd] = useState(0)
  const [speed, setSpeed] = useState(1)
  const inputRef = useRef<HTMLInputElement>(null)
  const myLevel = armies[mySide].levelId
  const started = now >= startAt
  const initial = useMemo(() => [0, 1].map((s) => feed.meta.filter((m) => m.origin === s).length) as [number, number], [feed])

  // Rafraîchissement du bandeau (5 fois par seconde) et départ de la simulation locale.
  useEffect(() => {
    const t = window.setInterval(() => {
      const n = Date.now()
      setNow(n)
      if (local && n >= startAt) local.running = true
      const f = feed.frame()
      const alive: [number, number] = [0, 0]
      for (const u of f.units) if (u.state !== 2) alive[u.side]++
      setHud({ t: f.t, alive, hornsUsed: f.hornsUsed, hornOn: [f.horn[0] > f.t, f.horn[1] > f.t], hornLeft: [Math.max(0, f.horn[0] - f.t), Math.max(0, f.horn[1] - f.t)] })
      const r = feed.result()
      if (r) setResult((old) => old ?? r)
    }, 200)
    return () => window.clearInterval(t)
  }, [feed, local, startAt])

  // Ambiance : cornes de guerre à l'ouverture, musique de combat à la charge, fanfare à la fin.
  useEffect(() => {
    audio.play(null)
    audio.warHorns()
    return () => audio.play(null)
  }, [feed])
  useEffect(() => {
    if (started) audio.play('battle')
  }, [started])
  const countdownSec = Math.ceil((startAt - now) / 1000)
  useEffect(() => {
    if (countdownSec > 0 && countdownSec <= 3) audio.tick(false)
  }, [countdownSec])

  useEffect(() => {
    if (!result) return
    audio.fanfare(result.winner === mySide || result.winner === -1)
    setQuestion(null)
    const t = window.setTimeout(() => setShowEnd(true), 1800)
    return () => window.clearTimeout(t)
  }, [result])

  useEffect(() => {
    if (local) local.speed = speed
  }, [local, speed])

  useEffect(() => {
    if (question) inputRef.current?.focus()
  }, [question])

  const hornsLeft = HORN_MAX - hud.hornsUsed[mySide]
  const canHorn = started && !result && hornsLeft > 0 && !hud.hornOn[mySide] && now > hornCd && !question

  const submitHorn = () => {
    if (!question) return
    if (question.ex.check(answer)) {
      audio.battleHorn(true)
      onHorn()
      setQuestion(null)
    } else {
      audio.wrong()
      setQuestion(null)
      setHornCd(Date.now() + 4000)
    }
    setAnswer('')
  }

  // Outil de test en développement uniquement : réponse attendue de la question du cor.
  if (import.meta.env.DEV && question) (window as unknown as { __mmAnswer?: string }).__mmAnswer = question.ex.answer

  const countdown = Math.ceil((startAt - now) / 1000)
  const pct = (s: Side) => Math.round((hud.alive[s] / Math.max(1, initial[s])) * 100)
  const winnerName = result ? (result.winner === -1 ? null : names[result.winner]) : null
  const iWon = result?.winner === mySide

  return (
    <div className="battle">
      <header className="battle-hud">
        <div className="bh-side left">
          <span className="bh-name" style={{ color: colors[0] }}>{names[0]}</span>
          <div className="bh-bar"><div style={{ width: `${pct(0)}%`, background: colors[0] }} /></div>
          <span className="bh-count">{hud.alive[0]} unités</span>
        </div>
        <div className="bh-center">
          <span className="bh-title">Bataille</span>
          <span className="bh-time">{started ? formatWait((MAX_DURATION - hud.t) * 1000) : '—'}</span>
        </div>
        <div className="bh-side right">
          <span className="bh-name" style={{ color: colors[1] }}>{names[1]}</span>
          <div className="bh-bar"><div style={{ width: `${pct(1)}%`, background: colors[1] }} /></div>
          <span className="bh-count">{hud.alive[1]} unités</span>
        </div>
      </header>

      <div className="battle-field">
        <BattleCanvas
          feed={feed}
          colors={colors}
          onTick={local ? (dt) => local.advance(dt) : undefined}
          onEvents={(evs) => {
            for (const ev of evs) {
              // son propre cor sonne dès la bonne réponse ; ici, celui de l'adversaire
              if (ev.type === 'horn') { if (ev.side !== mySide) audio.battleHorn(false) }
              else if (ev.type === 'impact') audio.impact()
            }
          }}
        />

        {/* bandeau du cor de guerre : visible tant que son effet dure */}
        <div className="horn-banners" aria-live="polite">
          {([0, 1] as const).filter((s) => hud.hornOn[s]).map((s) => (
            <div key={s} className={`horn-banner ${s === mySide ? 'mine' : 'theirs'}`} style={{ borderColor: colors[s] }}>
              <span className="hb-icon">📯</span>
              <span className="hb-text">
                <b>{s === mySide ? 'Ton cor de guerre retentit !' : `Cor de guerre de ${names[s]}`}</b>
                <small>+25 % d’attaque</small>
              </span>
              <span className="hb-bar"><span style={{ width: `${(hud.hornLeft[s] / HORN_DURATION) * 100}%`, background: colors[s] }} /></span>
            </div>
          ))}
        </div>

        {!started && (
          <div className="battle-intro">
            <div className="bi-armies">
              {([0, 1] as Side[]).map((s) => (
                <div key={s} className="bi-army" style={{ borderColor: colors[s] }}>
                  <b style={{ color: colors[s] }}>{names[s]}</b>
                  <ul>
                    {armies[s].regiments.filter((r) => r.figures > 0 && r.tier > 0).sort((a, b) => b.figures - a.figures).map((r) => (
                      <li key={r.chapterId}>
                        <span>{CHAPTERS.get(r.chapterId)?.corpsName}</span>
                        <span>{r.figures}{r.upgrades ? ` · ${'★'.repeat(r.upgrades)}` : ''}</span>
                      </li>
                    ))}
                    {armies[s].regiments.some((r) => r.tier === 0 && r.figures > 0) && (
                      <li><span>Villageois</span><span>{armies[s].regiments.filter((r) => r.tier === 0).reduce((n, r) => n + r.figures, 0)}</span></li>
                    )}
                  </ul>
                  <small>{['Âge sombre', 'Âge féodal', 'Âge des châteaux', 'Âge impérial'][armies[s].age]}</small>
                </div>
              ))}
            </div>
            <div className="bi-count" key={countdown}>{countdown > 0 ? countdown : 'À l’attaque !'}</div>
          </div>
        )}

        {notice && <div className="battle-notice">{notice}</div>}

        {debrief && result && (
          <Debrief
            armies={armies}
            villages={[villages?.[0] ?? playerFromArmy(armies[0], SOLO_RULES), villages?.[1] ?? playerFromArmy(armies[1], SOLO_RULES)]}
            names={names}
            colors={colors}
            mySide={mySide}
            result={result}
            onClose={() => setDebrief(false)}
            onRematch={onRematch}
            onMenu={onMenu}
          />
        )}

        {showEnd && result && (
          <div className="battle-end">
            <div className="be-card">
              <div className="be-title" style={{ color: result.winner === -1 ? 'var(--gold-bright)' : colors[result.winner] }}>
                {result.winner === -1 ? 'Égalité !' : iWon ? 'Victoire !' : 'Défaite…'}
              </div>
              <p>{winnerName ? `${winnerName} remporte la bataille en ${Math.round(result.duration)} secondes.` : 'Les deux armées se sont neutralisées.'}</p>
              <div className="be-stats">
                {([0, 1] as Side[]).map((s) => {
                  const heroReg = armies[s].regiments.find((r) => r.chapterId === result.heroes[s])
                  const heroName = heroReg ? (heroReg.tier === 0 ? 'Villageois' : CHAPTERS.get(heroReg.chapterId)?.corpsName) : null
                  return (
                    <div key={s} className="be-col" style={{ borderColor: colors[s] }}>
                      <b style={{ color: colors[s] }}>{names[s]}</b>
                      <span>Survivants : {result.survivors[s]}</span>
                      <span>Pertes : {result.losses[s]}</span>
                      <span>Conversions : {result.conversions[s]}</span>
                      {heroName && <span>Corps héroïque : {heroName}</span>}
                    </div>
                  )
                })}
              </div>
              <div className="be-actions">
                <button className="btn gold" onClick={() => setDebrief(true)}>🔍 Bilan et villages</button>
                {onRematch && <button className="btn gold" onClick={onRematch}>Revanche</button>}
                {!onRematch && endHint && <p className="be-hint">{endHint}</p>}
                <button className="btn gold" onClick={onMenu}>Menu principal</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="battle-bar">
        <div className="horn">
          <button className="horn-btn" disabled={!canHorn} onClick={() => { setAnswer(''); setQuestion({ ex: hornQuestion(myLevel) }) }}>
            <span className="horn-icon">📯</span>
            <span>
              <b>Cor de guerre</b>
              <small>{hud.hornOn[mySide] ? 'Tes troupes chargent !' : `Calcul mental juste : +25 % d’attaque pendant ${HORN_DURATION} s · ${hornsLeft} restant${hornsLeft > 1 ? 's' : ''}`}</small>
            </span>
          </button>
          {question && (
            <form className="horn-q" onSubmit={(e) => { e.preventDefault(); submitHorn() }}>
              <span className="horn-text"><MathText text={question.ex.prompt} /></span>
              <input ref={inputRef} value={answer} onChange={(e) => setAnswer(e.target.value)} inputMode="decimal" autoComplete="off" aria-label="Réponse" />
              <button className="btn gold" type="submit" data-sfx="none">Sonner !</button>
            </form>
          )}
        </div>
        <div className="legend">
          {Object.entries(UNIT_STATS).filter(([k]) => k !== 'villager').length > 0 && (
            <span className="legend-hint">Lanciers ▸ cavalerie · Archers ▸ fantassins · Éclaireurs ▸ archers, siège, moines · Moines ▸ chevaliers</span>
          )}
          {local && (
            <button className="hud-btn" onClick={() => setSpeed(speed === 1 ? 2 : 1)}>Vitesse ×{speed === 1 ? 2 : 1}</button>
          )}
          <MuteButton />
        </div>
      </footer>
    </div>
  )
}
