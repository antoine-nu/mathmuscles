// Tuyauterie du duel : deux navigateurs reliés directement (WebRTC), mis en relation par Trystero via des
// relais publics Nostr — aucun serveur à héberger. Une variante locale (BroadcastChannel, deux onglets du
// même navigateur) sert aux tests : ajouter ?reseau=local à l'adresse.
import { joinRoom } from 'trystero'
import type { BattleResult } from '../battle/sim'
import type { Snapshot } from '../battle/feed'
import type { ArmySpec } from '../game/state'

export const PROTOCOL_VERSION = 1

export type Msg =
  | { t: 'hello'; name: string; levelId: string; v: number; role: 'host' | 'guest' }
  | { t: 'config'; duration: number }
  | { t: 'start'; duration: number; ms: number }
  | { t: 'status'; age: number; pop: number }
  | { t: 'army'; army: ArmySpec; final?: boolean }
  | { t: 'battle'; armies: [ArmySpec, ArmySpec]; seed: number; startIn: number }
  | { t: 'snap'; s: Snapshot }
  | { t: 'horn' }
  | { t: 'result'; res: BattleResult }
  | { t: 'quit' }

export interface Transport {
  kind: 'internet' | 'local'
  send(msg: Msg): void
  onMessage: ((msg: Msg) => void) | null
  /** Arrivée (true) ou départ (false) de l'adversaire. */
  onPeer: ((present: boolean) => void) | null
  close(): void
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

async function openInternet(code: string): Promise<Transport> {
  const room = joinRoom({ appId: 'mathmuscles-duel' }, `salle-${code}-v${PROTOCOL_VERSION}`)
  // les messages sont du JSON simple ; on les transmet tels quels
  const action = room.makeAction<never>('m') as unknown as { send: (d: unknown, o?: { target?: string }) => Promise<void>; onMessage: ((d: unknown, ctx: { peerId: string }) => void) | null }
  let partner: string | null = null
  const t: Transport = {
    kind: 'internet',
    onMessage: null,
    onPeer: null,
    send: (msg) => {
      if (partner) void action.send(msg, { target: partner })
    },
    close: () => void room.leave(),
  }
  room.onPeerJoin = (id) => {
    if (partner) return // un seul adversaire par salle
    partner = id
    t.onPeer?.(true)
  }
  room.onPeerLeave = (id) => {
    if (id !== partner) return
    partner = null
    t.onPeer?.(false)
  }
  action.onMessage = (data, ctx) => {
    if (ctx.peerId === partner) t.onMessage?.(data as Msg)
  }
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
