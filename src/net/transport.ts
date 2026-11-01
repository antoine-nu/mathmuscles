// Tuyauterie du duel : les deux navigateurs échangent leurs messages par des relais publics Nostr (voir relay.ts),
// sans connexion directe entre eux (souvent bloquée dans les établissements) et sans serveur à héberger. Les messages
// sont numérotés, acquittés et renvoyés au besoin : un relais peut en perdre, un autre les livre. Une variante
// locale (BroadcastChannel, deux onglets du même navigateur) sert aux tests : ajouter ?reseau=local à l'adresse.
// ?relais=wss://mon-relais.fr,wss://autre.org remplace la liste des relais (ex. un relais installé dans l'école).
import type { ThemeId } from '../game/themes'
import type { BattleResult, Side } from '../battle/sim'
import type { ArmySpec } from '../game/state'
import { openRelayRoom } from './relay'

export const PROTOCOL_VERSION = 2

export type Msg =
  | { t: 'hello'; name: string; levelId: string; v: number; role: 'host' | 'guest' }
  | { t: 'config'; duration: number }
  | { t: 'prep' }
  | { t: 'ready' }
  | { t: 'start'; duration: number; ms: number; startIn: number; theme?: ThemeId }
  | { t: 'status'; age: number; pop: number }
  | { t: 'army'; army: ArmySpec; final?: boolean }
  | { t: 'battle'; armies: [ArmySpec, ArmySpec]; seed: number; startIn: number }
  /** Invité → hôte : je sonne le cor. */
  | { t: 'horn' }
  /** Hôte → invité : cor du camp `side` à l'instant `at` de la bataille (les deux calculent la même bataille). */
  | { t: 'hornAt'; side: Side; at: number }
  /** Hôte → invité : aucun cor ne sera programmé avant `upTo` (l'invité peut calculer jusque-là). */
  | { t: 'clock'; upTo: number }
  | { t: 'result'; res: BattleResult }
  | { t: 'quit' }

export interface Transport {
  kind: 'internet' | 'local'
  send(msg: Msg): void
  onMessage: ((msg: Msg) => void) | null
  /** Arrivée (true) ou départ (false) de l'adversaire. */
  onPeer: ((present: boolean) => void) | null
  close(): void
  /** Relais de mise en relation joignables (internet seulement). */
  relays?: () => { open: number; total: number }
}

/**
 * Relais Nostr publics. Les deux joueurs les essaient tous et publient sur chacun : il suffit qu'un seul réponde.
 * (Retirés : chorus.pjv.me, relay.artio.inf.unibe.ch, relay.mostr.pub, hors service.)
 */
const RELAYS = [
  'nos.lol', 'relay.damus.io', 'relay.primal.net', 'nostr.mom', 'relay.nostr.net', 'offchain.pub',
  'purplerelay.com', 'nostr-01.yakihonne.com', 'strfry.shock.network', 'relay.sigit.io', 'yabu.me/v2',
].map((u) => `wss://${u}`)

function relayUrls(): string[] {
  const custom = new URLSearchParams(location.search).get('relais')
  return custom ? custom.split(',').map((u) => u.trim()).filter(Boolean) : RELAYS
}

const ALPHABET = 'BCDFGHJKLMNPQRSTVWXZ23456789'
export function newCode(): string {
  let s = ''
  for (let i = 0; i < 4; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return s
}
export const normalizeCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)

export function isLocalNetwork(): boolean {
  return new URLSearchParams(location.search).get('reseau') === 'local'
}

/** Ouvre la salle de jeu identifiée par le code (les deux joueurs saisissent le même). */
export async function openTransport(code: string): Promise<Transport> {
  return isLocalNetwork() ? openLocal(code) : openInternet(code)
}

/** Enveloppe d'un message : s = numéro (messages), a = acquittement (dernier numéro reçu dans l'ordre), p = présence. */
interface Envelope {
  s?: number
  m?: Msg
  a?: number
  p?: 1
  bye?: 1
}

async function openInternet(code: string): Promise<Transport> {
  const room = await openRelayRoom(relayUrls(), `salle-${code}-v${PROTOCOL_VERSION}`)
  let partner: string | null = null
  let lastPartner: string | null = null
  let lastHeard = 0
  // envoi : messages numérotés, gardés jusqu'à leur acquittement et renvoyés régulièrement
  let seq = 0
  const outbox = new Map<number, { env: Envelope; sentAt: number }>()
  // réception : remise dans l'ordre, sans doublon
  let expected = 1
  const inbox = new Map<number, Msg>()
  let gapSince = 0
  let ackDue = false

  const t: Transport = {
    kind: 'internet',
    onMessage: null,
    onPeer: null,
    send: (msg) => {
      const env: Envelope = { s: ++seq, m: msg }
      outbox.set(env.s!, { env, sentAt: Date.now() })
      room.publish(env)
    },
    close: () => {
      room.publish({ bye: 1 } satisfies Envelope)
      window.clearInterval(timer)
      window.setTimeout(() => room.close(), 500)
    },
    relays: () => room.status(),
  }

  const deliver = () => {
    while (inbox.has(expected)) {
      const m = inbox.get(expected)!
      inbox.delete(expected)
      expected++
      t.onMessage?.(m)
    }
    gapSince = inbox.size ? gapSince || Date.now() : 0
  }

  room.onPayload = (from, payload) => {
    const env = payload as Envelope
    if (!partner) {
      if (env.bye) return
      // nouvel adversaire (ou le même revenu avec une page rechargée) : sa numérotation repart de 1
      if (from !== lastPartner) { expected = 1; inbox.clear(); gapSince = 0 }
      partner = lastPartner = from
      lastHeard = Date.now()
      t.onPeer?.(true)
      // l'adversaire vient d'arriver : il doit recevoir tout ce qui n'a pas été acquitté
      for (const o of outbox.values()) { o.sentAt = Date.now(); room.publish(o.env) }
    }
    if (from !== partner) return // un seul adversaire par salle
    lastHeard = Date.now()
    if (env.bye) {
      partner = null
      t.onPeer?.(false)
      return
    }
    if (typeof env.a === 'number') for (const k of [...outbox.keys()]) if (k <= env.a) outbox.delete(k)
    if (typeof env.s === 'number' && env.m) {
      if (env.s >= expected) inbox.set(env.s, env.m)
      ackDue = true
      deliver()
    }
  }

  const timer = window.setInterval(() => {
    const now = Date.now()
    // présence + acquittement
    if (ackDue || now % 3000 < 500) {
      room.publish({ a: expected - 1, p: 1 } satisfies Envelope)
      ackDue = false
    }
    // renvois des messages non acquittés
    if (partner) for (const o of outbox.values()) if (now - o.sentAt > 1500) { o.sentAt = now; room.publish(o.env) }
    // un trou qui ne se comble pas (message perdu partout) : on passe au suivant
    if (gapSince && now - gapSince > 8000 && inbox.size) {
      expected = Math.min(...inbox.keys())
      deliver()
    }
    // plus de nouvelles depuis 20 s : l'adversaire est parti
    if (partner && now - lastHeard > 20_000) {
      partner = null
      t.onPeer?.(false)
    }
  }, 500)
  return t
}

function openLocal(code: string): Transport {
  const ch = new BroadcastChannel(`mathmuscles-${code}`)
  const me = Math.random().toString(36).slice(2)
  let partner: string | null = null
  let lastSeen = 0
  const t: Transport = {
    kind: 'local',
    onMessage: null,
    onPeer: null,
    send: (msg) => ch.postMessage({ from: me, msg }),
    close: () => {
      ch.postMessage({ from: me, bye: true })
      window.clearInterval(ping)
      ch.close()
    },
  }
  ch.onmessage = (e: MessageEvent<{ from: string; msg?: Msg; ping?: boolean; bye?: boolean }>) => {
    const d = e.data
    if (d.from === me) return
    if (d.bye) {
      if (d.from === partner) { partner = null; t.onPeer?.(false) }
      return
    }
    if (!partner) { partner = d.from; t.onPeer?.(true) }
    if (d.from !== partner) return
    lastSeen = Date.now()
    if (d.msg) t.onMessage?.(d.msg)
  }
  const ping = window.setInterval(() => {
    ch.postMessage({ from: me, ping: true })
    if (partner && Date.now() - lastSeen > 6000) { partner = null; t.onPeer?.(false) }
  }, 1000)
  ch.postMessage({ from: me, ping: true })
  return t
}
