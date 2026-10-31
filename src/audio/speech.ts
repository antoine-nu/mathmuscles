// Voix qui lit les consignes (maternelle) : synthèse vocale du navigateur, en français uniquement.
// Si l'ordinateur n'a aucune voix française (fréquent sous Windows avec Chrome ou Firefox), on se tait plutôt que de
// laisser une voix anglaise massacrer la consigne, et l'écran explique comment ajouter une voix française.

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

let voices: SpeechSynthesisVoice[] = []
let loaded = false
const listeners = new Set<() => void>()

function refresh() {
  voices = speechSynthesis.getVoices()
  if (voices.length) loaded = true
  listeners.forEach((f) => f())
}

if (canSpeak()) {
  refresh()
  speechSynthesis.addEventListener?.('voiceschanged', refresh)
  // certains navigateurs ne préviennent jamais : au bout de 2 s, la liste est ce qu'elle est
  window.setTimeout(() => { loaded = true; refresh() }, 2000)
}

/** Meilleure voix française disponible : voix « naturelles » en ligne d'Edge, voix Google de Chrome, puis voix du système. */
export function frenchVoice(): SpeechSynthesisVoice | null {
  const fr = voices.filter((v) => /^fr\b|^fr[-_]/i.test(v.lang))
  const rank = (v: SpeechSynthesisVoice) =>
    (/fr[-_]FR/i.test(v.lang) ? 0 : 10) + (/natural|online/i.test(v.name) ? 0 : /google/i.test(v.name) ? 1 : 2)
  return fr.sort((a, b) => rank(a) - rank(b))[0] ?? null
}

/** État de la voix : 'ok', 'absente' (aucune voix française), 'inconnue' (liste pas encore chargée), 'impossible'. */
export type VoiceState = 'ok' | 'absente' | 'inconnue' | 'impossible'
export function voiceState(): VoiceState {
  if (!canSpeak()) return 'impossible'
  if (frenchVoice()) return 'ok'
  return loaded ? 'absente' : 'inconnue'
}
export function onVoicesChange(f: () => void): () => void {
  listeners.add(f)
  return () => listeners.delete(f)
}

let pending: string | null = null
onVoicesChange(() => {
  // une consigne demandée avant que les voix soient chargées est lue dès qu'elles arrivent
  if (pending && frenchVoice()) {
    const t = pending
    pending = null
    speak(t)
  }
})

/** Lit un texte à voix haute avec une voix française (en coupant la lecture précédente) ; ne dit rien sans voix française. */
export function speak(text: string) {
  if (!canSpeak()) return
  const v = frenchVoice()
  if (!v) {
    if (!loaded) pending = text
    return
  }
  try {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.voice = v
    u.lang = v.lang
    u.rate = 0.9
    u.pitch = 1.05
    speechSynthesis.speak(u)
  } catch {
    /* lecture impossible */
  }
}

export function stopSpeaking() {
  pending = null
  if (canSpeak()) speechSynthesis.cancel()
}
