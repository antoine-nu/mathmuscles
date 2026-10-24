import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LEVELS, type Level } from '../data/curriculum'
import { Battle, type Side } from '../battle/sim'
import { LocalFeed, RemoteFeed, encodeSnapshot, frameOf, metaOf } from '../battle/feed'
import { RulesContext, duelRules } from '../game/rules'
import { ageOf, armyOf, emptyPlayer, populationOf, type ArmySpec, type PlayerState } from '../game/state'
import { PROTOCOL_VERSION, isLocalNetwork, newCode, normalizeCode, openTransport, type Msg, type Transport } from '../net/transport'
import { BattleScreen } from './BattleScreen'
import { BATTLE_INTRO, BLUE, RED, START_COUNTDOWN, TIME_UP_PAUSE } from './BotDuel'
import { PrepScreen } from './PrepScreen'
import { audio } from '../audio/engine'
import { DurationPicker, SetupFrame } from './DuelSetup'
import { TrainingScreen } from './TrainingScreen'
import { randomTheme, type ThemeId } from '../game/themes'

type Role = 'host' | 'guest'

type Phase =
  | { name: 'lobby' }
  | { name: 'prep' }
  | { name: 'training'; startsAt: number; deadline: number }
  | { name: 'battle'; feed: LocalFeed | RemoteFeed; armies: [ArmySpec, ArmySpec]; startAt: number }

interface Peer {
  name: string
  levelId: string
}

interface Props {
  level: Level
  playerName: string
  onQuit: () => void
}

/** Duel en direct contre un camarade : salle de jeu par code, chrono partagé, bataille calculée par l'hôte. */
export function FriendDuel({ level, playerName, onQuit }: Props) {
  const [role, setRole] = useState<Role | null>(null)
  const [code, setCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [peer, setPeer] = useState<Peer | null>(null)
  const [peerOnline, setPeerOnline] = useState(false)
  const [duration, setDuration] = useState(15)
  const [phase, setPhase] = useState<Phase>({ name: 'lobby' })
  const [player, setPlayer] = useState<PlayerState>(() => emptyPlayer(level.id))
  const [oppStatus, setOppStatus] = useState({ age: 0, pop: 0 })
  const [notice, setNotice] = useState<string | null>(null)
  const [meReady, setMeReady] = useState(false)
  const [peerReady, setPeerReady] = useState(false)
  const transport = useRef<Transport | null>(null)
  const oppArmy = useRef<ArmySpec | null>(null)
  const oppFinal = useRef(false)
  const playerRef = useRef(player)
  playerRef.current = player
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const rules = useMemo(() => duelRules(duration), [duration])
  const rulesRef = useRef(rules)
  rulesRef.current = rules
  const me = playerName.trim() || (role === 'host' ? 'Hôte' : 'Invité')
  const mySide: Side = role === 'guest' ? 1 : 0

  const send = useCallback((m: Msg) => transport.current?.send(m), [])

  // ── Démarrage de l'entraînement (les deux côtés) ──
  const beginTraining = useCallback((minutes: number, ms: number, startIn: number, theme?: ThemeId) => {
    setDuration(minutes)
    oppArmy.current = null
    oppFinal.current = false
    setPlayer(emptyPlayer(level.id, theme))
    setOppStatus({ age: 0, pop: 0 })
    setNotice(null)
    const startsAt = Date.now() + startIn
    setPhase({ name: 'training', startsAt, deadline: startsAt + ms })
  }, [level.id])

  // ── Réception des messages ──
  const handle = useCallback((m: Msg) => {
    switch (m.t) {
      case 'hello':
        if (m.v !== PROTOCOL_VERSION) setError('Ton adversaire utilise une autre version du jeu : recharge la page des deux côtés.')
        setPeer({ name: m.name || 'Adversaire', levelId: m.levelId })
        break
      case 'config':
        setDuration(m.duration)
        break
      case 'prep':
        setMeReady(false)
        setPeerReady(false)
        setPhase({ name: 'prep' })
        break
      case 'ready':
        setPeerReady(true)
        break
      case 'start':
        beginTraining(m.duration, m.ms, m.startIn, m.theme)
        break
      case 'status':
        setOppStatus({ age: m.age, pop: m.pop })
        break
      case 'army':
        oppArmy.current = m.army
        if (m.final) oppFinal.current = true
        break
      case 'battle': {
        // invité : on reconstruit le déploiement pour connaître les unités, l'hôte envoie le reste
        // (le déploiement est déterministe : on l'affiche tout de suite, comme chez l'hôte)
        const local = new Battle(m.armies, m.seed)
        setPhase({ name: 'battle', feed: new RemoteFeed(metaOf(local), frameOf(local)), armies: m.armies, startAt: Date.now() + m.startIn })
        break
      }
      case 'snap': {
        const ph = phaseRef.current
        if (ph.name === 'battle' && ph.feed instanceof RemoteFeed) ph.feed.push(m.s)
        break
      }
      case 'horn': {
        const ph = phaseRef.current
        if (ph.name === 'battle' && ph.feed instanceof LocalFeed) ph.feed.battle.blowHorn(1)
        break
      }
      case 'quit':
        setNotice('Ton adversaire a quitté la partie.')
        setPeerOnline(false)
        break
    }
  }, [beginTraining])

  const open = async (r: Role, c: string) => {
    audio.unlock()
    setConnecting(true)
    setError(null)
    try {
      transport.current?.close()
      const t = await openTransport(c)
      transport.current = t
      t.onMessage = (m) => handleRef.current(m)
      t.onPeer = (present) => {
        setPeerOnline(present)
        if (present) t.send({ t: 'hello', name: playerName.trim(), levelId: level.id, v: PROTOCOL_VERSION, role: r })
        else setNotice('Ton adversaire s’est déconnecté.')
      }
      setRole(r)
      setCode(c)
    } catch (e) {
      setError(`Connexion impossible : ${(e as Error).message}`)
    } finally {
      setConnecting(false)
    }
  }
  const handleRef = useRef(handle)
  handleRef.current = handle

  useEffect(() => () => {
    transport.current?.send({ t: 'quit' })
    transport.current?.close()
  }, [])

  // L'hôte tient l'invité au courant de la durée choisie.
  useEffect(() => {
    if (role === 'host' && peerOnline) send({ t: 'config', duration })
  }, [role, peerOnline, duration, send])

  // ── Pendant l'entraînement : état et armée envoyés régulièrement ──
  useEffect(() => {
    if (phase.name !== 'training') return
    const deadline = phase.deadline
    let sentFinal = false
    const t = window.setInterval(() => {
      const p = playerRef.current
      const r = rulesRef.current
      send({ t: 'status', age: ageOf(p, r), pop: populationOf(p) })
      const now = Date.now()
      if (now >= deadline && !sentFinal) {
        sentFinal = true
        send({ t: 'army', army: armyOf(p, r), final: true })
      } else if (!sentFinal && Math.floor(now / 1000) % 4 === 0) {
        send({ t: 'army', army: armyOf(p, r) })
      }
      // l'hôte lance la bataille après la pause « temps écoulé » (en attendant au plus 3 s l'armée finale)
      if (role === 'host' && now >= deadline + TIME_UP_PAUSE && (oppFinal.current || now >= deadline + TIME_UP_PAUSE + 3000)) {
        window.clearInterval(t)
        startBattle()
      }
    }, 1000)
    return () => window.clearInterval(t)
  }, [phase, role, send])

  // Invité : si l'hôte a disparu à la fin du chrono, on joue la bataille en local.
  useEffect(() => {
    if (phase.name !== 'training' || role !== 'guest') return
    const t = window.setTimeout(() => {
      if (phaseRef.current.name === 'training' && !peerOnline) {
        setNotice('L’hôte s’est déconnecté : la bataille est calculée sur ton appareil.')
        const armies: [ArmySpec, ArmySpec] = [oppArmy.current ?? { levelId: peer?.levelId ?? level.id, age: 0, regiments: [] }, armyOf(playerRef.current, rulesRef.current)]
        const feed = new LocalFeed(new Battle(armies, Date.now() % 1e9))
        setPhase({ name: 'battle', feed, armies, startAt: Date.now() + BATTLE_INTRO })
      }
    }, Math.max(0, phase.deadline + TIME_UP_PAUSE + 8000 - Date.now()))
    return () => window.clearTimeout(t)
  }, [phase, role, peerOnline, peer, level.id])

  const startBattle = () => {
    const mine = armyOf(playerRef.current, rulesRef.current)
    const theirs = oppArmy.current ?? { levelId: peer?.levelId ?? level.id, age: 0, regiments: [] }
    const armies: [ArmySpec, ArmySpec] = [mine, theirs]
    const seed = Math.floor(Math.random() * 1e9)
    const feed = new LocalFeed(new Battle(armies, seed))
    send({ t: 'battle', armies, seed, startIn: BATTLE_INTRO })
    setPhase({ name: 'battle', feed, armies, startAt: Date.now() + BATTLE_INTRO })
  }

  // Hôte : diffusion des images de la bataille (10 par seconde).
  useEffect(() => {
    if (phase.name !== 'battle' || role !== 'host' || !(phase.feed instanceof LocalFeed)) return
    const feed = phase.feed
    let cursor = 0
    let finals = 0
    const t = window.setInterval(() => {
      if (!feed.running) return
      const b = feed.battle
      const ev = feed.eventsSince(cursor)
      cursor = b.events.length
      send({ t: 'snap', s: encodeSnapshot(frameOf(b), ev, b.result) })
      if (b.result && ++finals >= 3) window.clearInterval(t)
    }, 100)
    return () => window.clearInterval(t)
  }, [phase, role, send])

  /** L'hôte ouvre la préparation : chacun consulte le codex puis se déclare prêt. */
  const hostPrep = () => {
    setMeReady(false)
    setPeerReady(false)
    send({ t: 'prep' })
    setPhase({ name: 'prep' })
  }

  // Les deux joueurs sont prêts : l'hôte donne le départ (compte à rebours identique des deux côtés).
  useEffect(() => {
    if (role !== 'host' || phase.name !== 'prep' || !meReady || !peerReady) return
    const override = Number(new URLSearchParams(location.search).get('chrono'))
    const ms = override > 0 ? override * 1000 : duration * 60_000
    // l'hôte tire le décor : les deux villages et la bataille le partagent
    const theme = randomTheme()
    send({ t: 'start', duration, ms, startIn: START_COUNTDOWN, theme })
    beginTraining(duration, ms, START_COUNTDOWN, theme)
  }, [role, phase.name, meReady, peerReady, duration, send, beginTraining])

  const quit = () => {
    send({ t: 'quit' })
    onQuit()
  }

  // ── Affichage ──
  if (phase.name === 'prep') {
    return (
      <PrepScreen
        level={level}
        durationMin={duration}
        me={{ name: me, ready: meReady, color: mySide === 0 ? BLUE : RED }}
        opponent={{ name: peer?.name ?? 'Adversaire', ready: peerReady, color: mySide === 0 ? RED : BLUE, detail: peerOnline ? 'Consulte le codex…' : 'Déconnecté' }}
        onReady={() => { setMeReady(true); send({ t: 'ready' }) }}
        onBack={quit}
      />
    )
  }

  if (phase.name === 'training') {
    const oppLevel = LEVELS.find((l) => l.id === peer?.levelId)
    return (
      <RulesContext.Provider value={rules}>
        <TrainingScreen
          player={player}
          update={setPlayer}
          mode="duel"
          teamColor={mySide === 0 ? BLUE : RED}
          playerName={me}
          opponent={{ name: `${peer?.name ?? 'Adversaire'}${oppLevel ? ` (${oppLevel.short})` : ''}`, color: mySide === 0 ? RED : BLUE, age: oppStatus.age, population: oppStatus.pop, online: peerOnline }}
          startsAt={phase.startsAt}
          deadline={phase.deadline}
          onQuit={quit}
        />
      </RulesContext.Provider>
    )
  }

  if (phase.name === 'battle') {
    const names: [string, string] = role === 'guest' ? [peer?.name ?? 'Hôte', me] : [me, peer?.name ?? 'Invité']
    const isLocal = phase.feed instanceof LocalFeed
    return (
      <BattleScreen
        feed={phase.feed}
        local={isLocal ? (phase.feed as LocalFeed) : undefined}
        armies={phase.armies}
        names={names}
        colors={[BLUE, RED]}
        mySide={mySide}
        startAt={phase.startAt}
        notice={notice}
        onHorn={() => {
          if (phase.feed instanceof LocalFeed) phase.feed.battle.blowHorn(mySide)
          else send({ t: 'horn' })
        }}
        onRematch={role === 'host' && peerOnline ? () => setPhase({ name: 'lobby' }) : undefined}
        endHint={role === 'guest' ? (peerOnline ? 'L’hôte peut lancer une revanche : reste sur cet écran, la partie redémarrera toute seule.' : undefined) : undefined}
        onMenu={quit}
        villages={mySide === 0 ? [player, null] : [null, player]}
        themeId={player.mapTheme}
      />
    )
  }

  // Salle d'attente
  const connected = !!role
  return (
    <SetupFrame title="Défier un camarade" subtitle={`${level.label}${isLocalNetwork() ? ' · test local (deux onglets)' : ''}`} onBack={quit}>
      {!connected && (
        <>
          <div className="setup-block">
            <h3>Créer une partie</h3>
            <p className="setup-note">Tu obtiens un code à 4 caractères à donner à ton camarade (SMS, message…).</p>
            <button className="btn gold big" disabled={connecting} onClick={() => void open('host', newCode())}>Créer une partie</button>
          </div>
          <div className="setup-block">
            <h3>Rejoindre une partie</h3>
            <input id="join-code" className="code-input" value={joinCode} onChange={(e) => setJoinCode(normalizeCode(e.target.value))} placeholder="CODE" maxLength={4} aria-label="Code de la partie" />
            <button className="btn gold big" disabled={connecting || joinCode.length !== 4} onClick={() => void open('guest', joinCode)}>Rejoindre</button>
          </div>
        </>
      )}

      {connected && (
        <>
          <div className="setup-block">
            <h3>{role === 'host' ? 'Code de la partie' : 'Partie'}</h3>
            <div className="code-box"><span className="code">{code}</span></div>
            <div className="status-line">
              <span className={`dot ${peerOnline && peer ? 'on' : 'wait'}`} />
              {peerOnline && peer
                ? <>Adversaire connecté : <b>{peer.name}</b> ({LEVELS.find((l) => l.id === peer.levelId)?.label ?? peer.levelId})</>
                : role === 'host' ? 'En attente de ton camarade… donne-lui ce code.' : 'Connexion à la partie…'}
            </div>
            {notice && <div className="status-line">{notice}</div>}
          </div>
          {role === 'host' ? (
            <>
              <DurationPicker value={duration} onChange={setDuration} />
              <button className="btn gold big" disabled={!peerOnline || !peer} onClick={() => { audio.unlock(); hostPrep() }}>Préparer la bataille ⚔</button>
            </>
          ) : (
            <div className="setup-block">
              <h3>Durée choisie par l’hôte</h3>
              <p className="setup-note"><b>{duration} minutes</b> d’entraînement, puis la bataille. L’hôte ouvre la préparation, puis chacun se déclare prêt.</p>
            </div>
          )}
        </>
      )}
      {error && <p className="setup-note error">{error}</p>}
      <p className="setup-note small">
        Les deux jeux se parlent directement (connexion pair-à-pair). Certains réseaux d’établissement bloquent ce type de connexion :
        en cas d’échec, essayez depuis un autre réseau (partage de connexion du téléphone, par exemple).
      </p>
    </SetupFrame>
  )
}
