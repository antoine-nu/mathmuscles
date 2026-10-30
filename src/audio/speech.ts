// Voix qui lit les consignes (maternelle) : synthèse vocale du navigateur, en français, sans connexion requise
// quand le système fournit une voix française (Windows, macOS, ChromeOS, Android, iOS en ont une).

let cached: SpeechSynthesisVoice | null = null

function frenchVoice(): SpeechSynthesisVoice | null {
  if (cached) return cached
  const voices = speechSynthesis.getVoices().filter((v) => /^fr/i.test(v.lang))
  // les voix « naturelles » ou de qualité d'abord, puis n'importe quelle voix française de France
  cached = voices.find((v) => /fr[-_]FR/i.test(v.lang) && /natural|google|amélie|audrey|thomas|denise|hortense|julie|marie/i.test(v.name))
    ?? voices.find((v) => /fr[-_]FR/i.test(v.lang)) ?? voices[0] ?? null
  return cached
}

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/** Lit un texte à voix haute (en coupant la lecture précédente). */
export function speak(text: string) {
  if (!canSpeak()) return
  try {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'fr-FR'
    u.rate = 0.9
    u.pitch = 1.05
    const v = frenchVoice()
    if (v) u.voice = v
    speechSynthesis.speak(u)
  } catch {
    /* pas de voix disponible */
  }
}

export function stopSpeaking() {
  if (canSpeak()) speechSynthesis.cancel()
}

// les voix arrivent parfois après le chargement de la page
if (canSpeak()) speechSynthesis.addEventListener?.('voiceschanged', () => { cached = null })
