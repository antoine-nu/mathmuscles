// Salle de messages sur des relais publics Nostr (WebSocket, port 443) : les deux joueurs publient leurs messages
// sous forme d'événements éphémères signés, et chacun s'abonne aux événements de la salle. Pas de connexion directe
// entre les ordinateurs (WebRTC), souvent bloquée par les réseaux d'établissement : il suffit qu'un relais réponde.
import { schnorr } from '@noble/secp256k1'

const enc = new TextEncoder()
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
const sha256 = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))
const nowSec = () => Math.floor(Date.now() / 1000)

interface NostrEvent {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}

interface Relay {
  url: string
  ws: WebSocket | null
  retry: number
  timer: number
}

export interface RelayRoom {
  /** Identifiant (clé publique) de ce navigateur. */
  me: string
  publish(payload: unknown): void
  onPayload: ((from: string, payload: unknown) => void) | null
  status(): { open: number; total: number }
  close(): void
}

/** Rejoint la salle `room` sur les relais donnés. */
export async function openRelayRoom(urls: string[], room: string): Promise<RelayRoom> {
  const { secretKey, publicKey } = schnorr.keygen()
  const me = hex(publicKey)
  const topic = hex(await sha256(`mathmuscles:${room}`))
  // événements « éphémères » (20000 à 29999) : relayés aux abonnés mais pas conservés
  const kind = 20000 + (parseInt(topic.slice(0, 4), 16) % 10000)
  const subId = `mm${topic.slice(0, 12)}`
  const since = nowSec() - 30
  const seen = new Set<string>()
  let closed = false
  /** Derniers événements publiés, renvoyés à un relais qui se (re)connecte. */
  const recent: string[] = []

  const relays: Relay[] = urls.map((url) => ({ url, ws: null, retry: 0, timer: 0 }))

  const r: RelayRoom = {
    me,
    onPayload: null,
    publish: (payload) => void publish(payload),
    status: () => ({ open: relays.filter((x) => x.ws?.readyState === WebSocket.OPEN).length, total: relays.length }),
    close: () => {
      closed = true
      for (const x of relays) {
        window.clearTimeout(x.timer)
        try { x.ws?.close() } catch { /* déjà fermé */ }
      }
    },
  }

  function connect(x: Relay) {
    if (closed) return
    let ws: WebSocket
    try {
      ws = new WebSocket(x.url)
    } catch {
      return later(x)
    }
    x.ws = ws
    ws.onopen = () => {
      x.retry = 0
      ws.send(JSON.stringify(['REQ', subId, { kinds: [kind], '#x': [topic], since }]))
      for (const e of recent) ws.send(e)
    }
    ws.onmessage = (ev) => {
      let data: unknown
      try { data = JSON.parse(String(ev.data)) } catch { return }
      if (!Array.isArray(data) || data[0] !== 'EVENT' || data[1] !== subId) return
      const e = data[2] as NostrEvent
      if (!e || e.pubkey === me || seen.has(e.id)) return
      seen.add(e.id)
      if (seen.size > 5000) seen.clear()
      let payload: unknown
      try { payload = JSON.parse(e.content) } catch { return }
      r.onPayload?.(e.pubkey, payload)
    }
    ws.onclose = () => { if (x.ws === ws) { x.ws = null; later(x) } }
    ws.onerror = () => { /* onclose suit */ }
  }
  function later(x: Relay) {
    if (closed) return
    // relais injoignable : nouvel essai de plus en plus espacé (3 s, 6 s… jusqu'à 1 min)
    const delay = Math.min(60_000, 3000 * 2 ** x.retry++)
    x.timer = window.setTimeout(() => connect(x), delay)
  }

  async function publish(payload: unknown) {
    const created_at = nowSec()
    const tags = [['x', topic]]
    const content = JSON.stringify(payload)
    const idBytes = await sha256(JSON.stringify([0, me, created_at, kind, tags, content]))
    const sig = hex(await schnorr.signAsync(idBytes, secretKey))
    const msg = JSON.stringify(['EVENT', { id: hex(idBytes), pubkey: me, created_at, kind, tags, content, sig }])
    recent.push(msg)
    if (recent.length > 20) recent.shift()
    for (const x of relays) if (x.ws?.readyState === WebSocket.OPEN) x.ws.send(msg)
  }

  relays.forEach(connect)
  return r
}
