// Musique et bruitages entièrement synthétisés (Web Audio) : aucun fichier à charger, fonctionne hors ligne.
// - « calm »   : préparation et entraînement — bourdon grave, pulsation de cœur, arpèges et flûte en ré dorien ;
//                doux pour se concentrer, avec une tension sourde (la guerre approche).
// - « battle » : tambours de guerre, basse obstinée et cuivres en ré mineur.
// - cornes de guerre, cor de bataille, fanfares de victoire et de défaite, impacts.
import { useEffect, useState } from 'react'

type Track = 'calm' | 'battle'
const MUTE_KEY = 'mathmuscles:muted'

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)
// ré dorien / ré mineur (numéros MIDI)
const D2 = 38, D3 = 50, D4 = 62
const DORIAN = [0, 2, 3, 5, 7, 9, 10]

class AudioEngine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private musicBus!: GainNode
  private sfxBus!: GainNode
  private reverb!: ConvolverNode
  private delay!: DelayNode
  private noise!: AudioBuffer
  private trackGain: GainNode | null = null
  private drones: OscillatorNode[] = []
  private timer = 0
  private nextTime = 0
  private step = 0
  private current: Track | null = null
  private lastImpact = 0
  muted: boolean
  private listeners = new Set<(m: boolean) => void>()

  constructor() {
    let m = false
    try {
      m = localStorage.getItem(MUTE_KEY) === '1'
    } catch {
      /* préférence indisponible */
    }
    this.muted = m
  }

  /** À appeler lors d'un geste de l'utilisateur (clic) : les navigateurs exigent une interaction avant le son. */
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      this.ctx = ctx
      this.master = ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 0.9
      this.master.connect(ctx.destination)
      this.musicBus = ctx.createGain()
      this.musicBus.gain.value = 0.55
      this.musicBus.connect(this.master)
      this.sfxBus = ctx.createGain()
      this.sfxBus.gain.value = 0.8
      this.sfxBus.connect(this.master)
      // réverbération synthétique (salle de pierre)
      this.reverb = ctx.createConvolver()
      const len = ctx.sampleRate * 2.6
      const ir = ctx.createBuffer(2, len, ctx.sampleRate)
      for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c)
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6)
      }
      this.reverb.buffer = ir
      const wet = ctx.createGain()
      wet.gain.value = 0.32
      this.reverb.connect(wet).connect(this.master)
      // écho pour la flûte et les arpèges
      this.delay = ctx.createDelay(2)
      this.delay.delayTime.value = 0.45
      const fb = ctx.createGain()
      fb.gain.value = 0.32
      const dl = ctx.createGain()
      dl.gain.value = 0.35
      this.delay.connect(fb).connect(this.delay)
      this.delay.connect(dl).connect(this.musicBus)
      // bruit blanc réutilisable (tambours, impacts)
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
      const nd = this.noise.getChannelData(0)
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  // ── Sourdine ──
  setMuted(m: boolean) {
    this.muted = m
    try {
      localStorage.setItem(MUTE_KEY, m ? '1' : '0')
    } catch {
      /* préférence non mémorisée */
    }
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05)
    this.listeners.forEach((l) => l(m))
  }
  toggleMuted() {
    this.unlock()
    this.setMuted(!this.muted)
  }
  subscribe(l: (m: boolean) => void) {
    this.listeners.add(l)
    return () => { this.listeners.delete(l) }
  }

  // ── Pistes ──
  play(track: Track | null) {
    if (track === this.current) return
    this.stopTrack()
    this.current = track
    if (!track || !this.ctx) return
    const ctx = this.ctx
    this.trackGain = ctx.createGain()
    this.trackGain.gain.setValueAtTime(0, ctx.currentTime)
    this.trackGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.5)
    this.trackGain.connect(this.musicBus)
    this.step = 0
    this.nextTime = ctx.currentTime + 0.1
    if (track === 'calm') this.startDrone()
    const stepDur = track === 'calm' ? 60 / 66 / 2 : 60 / 116 / 4
    this.timer = window.setInterval(() => {
      while (this.nextTime < ctx.currentTime + 0.3) {
        if (track === 'calm') this.calmStep(this.step, this.nextTime, stepDur)
        else this.battleStep(this.step, this.nextTime, stepDur)
        this.nextTime += stepDur
        this.step++
      }
    }, 60)
  }

  private stopTrack() {
    window.clearInterval(this.timer)
    if (this.ctx && this.trackGain) {
      const g = this.trackGain
      g.gain.cancelScheduledValues(this.ctx.currentTime)
      g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5)
      const drones = this.drones
      window.setTimeout(() => { drones.forEach((o) => { try { o.stop() } catch { /* déjà arrêté */ } }); g.disconnect() }, 3000)
    }
    this.drones = []
    this.trackGain = null
  }

  private startDrone() {
    const ctx = this.ctx!
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 520
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.06
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 180
    lfo.connect(lfoGain).connect(filter.frequency)
    const g = ctx.createGain()
    g.gain.value = 0.05
    filter.connect(g).connect(this.trackGain!)
    for (const [n, det] of [[D2, -4], [D2, 5], [D2 + 7, 0], [D3, 3]] as const) {
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.value = midi(n)
      o.detune.value = det
      o.connect(filter)
      o.start()
      this.drones.push(o)
    }
    lfo.start()
    this.drones.push(lfo)
  }

  // ── Instruments ──
  private tone(freq: number, t: number, dur: number, opts: { type?: OscillatorType; gain: number; attack?: number; release?: number; vibrato?: number; filter?: number; to?: AudioNode; send?: boolean; reverb?: number }) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    o.type = opts.type ?? 'sine'
    o.frequency.setValueAtTime(freq, t)
    const g = ctx.createGain()
    const a = opts.attack ?? 0.01, r = opts.release ?? 0.3
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(opts.gain, t + a)
    g.gain.setValueAtTime(opts.gain, t + Math.max(a, dur - r))
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    let node: AudioNode = o
    if (opts.filter) {
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = opts.filter
      o.connect(f)
      node = f
    }
    if (opts.vibrato) {
      const v = ctx.createOscillator()
      v.frequency.value = 5
      const vg = ctx.createGain()
      vg.gain.value = opts.vibrato
      v.connect(vg).connect(o.frequency)
      v.start(t)
      v.stop(t + dur + 0.05)
    }
    node.connect(g)
    g.connect(opts.to ?? this.trackGain ?? this.sfxBus)
    if (opts.send) g.connect(this.delay)
    if (opts.reverb) {
      const rg = this.ctx!.createGain()
      rg.gain.value = opts.reverb
      g.connect(rg).connect(this.reverb)
    }
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  private drum(t: number, opts: { from: number; to: number; gain: number; decay: number; noise?: number; dest?: AudioNode }) {
    const ctx = this.ctx!
    const dest = opts.dest ?? this.trackGain ?? this.sfxBus
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(opts.from, t)
    o.frequency.exponentialRampToValueAtTime(opts.to, t + opts.decay)
    const g = ctx.createGain()
    g.gain.setValueAtTime(opts.gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.decay)
    o.connect(g).connect(dest)
    o.start(t)
    o.stop(t + opts.decay + 0.05)
    if (opts.noise) {
      const n = ctx.createBufferSource()
      n.buffer = this.noise
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = 900
      const ng = ctx.createGain()
      ng.gain.setValueAtTime(opts.noise, t)
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
      n.connect(f).connect(ng).connect(dest)
      n.start(t)
      n.stop(t + 0.15)
    }
  }

  private calmStep(step: number, t: number, dur: number) {
    const bar = Math.floor(step / 8), pos = step % 8
    // pulsation de cœur (tension sourde)
    if (pos === 0) {
      this.drum(t, { from: 62, to: 38, gain: 0.32, decay: 0.35 })
      this.drum(t + 0.22, { from: 58, to: 36, gain: 0.2, decay: 0.3 })
    }
    if (pos === 4) this.drum(t, { from: 55, to: 36, gain: 0.14, decay: 0.3 })
    // arpèges (harpe) sur une progression Ré m – Do – Si♭ – Do
    const chords = [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-2, 2, 5]]
    const chord = chords[Math.floor(bar / 2) % 4]
    if (Math.random() < 0.42) {
      const n = D3 + chord[Math.floor(Math.random() * 3)] + (Math.random() < 0.5 ? 12 : 0)
      this.tone(midi(n), t, 1.6, { type: 'triangle', gain: 0.05, attack: 0.005, release: 1.4, send: true })
    }
    // phrase de flûte toutes les 4 mesures
    if (bar % 4 === 2 && pos === 0) {
      let tt = t
      let deg = 4 + Math.floor(Math.random() * 3)
      for (let i = 0; i < 5; i++) {
        const len = dur * (1 + Math.floor(Math.random() * 3))
        deg = Math.max(0, Math.min(9, deg + Math.floor(Math.random() * 5) - 2))
        const n = D4 + DORIAN[deg % 7] + 12 * Math.floor(deg / 7)
        this.tone(midi(n), tt, len * 1.6, { type: 'sine', gain: 0.045, attack: 0.09, release: 0.6, vibrato: 3, send: true, reverb: 0.5 })
        tt += len
      }
    }
    // roulement lointain toutes les 16 mesures : la guerre approche
    if (bar % 16 === 15 && pos >= 4) this.drum(t, { from: 90, to: 60, gain: 0.05 + (pos - 4) * 0.025, decay: 0.25 })
  }

  private battleStep(step: number, t: number, dur: number) {
    const bar = Math.floor(step / 16), pos = step % 16
    const roots = [D2, D2 - 4, D2 + 3, D2 + 7] // Ré m – Si♭ – Fa – La
    const root = roots[bar % 4]
    const third = bar % 4 === 3 ? 4 : bar % 4 === 2 ? 4 : bar % 4 === 1 ? 4 : 3
    // tambours de guerre
    const taiko = 'X.....x.X..x.x..'
    if (taiko[pos] === 'X') this.drum(t, { from: 70, to: 34, gain: 0.55, decay: 0.5, noise: 0.25 })
    if (taiko[pos] === 'x') this.drum(t, { from: 90, to: 45, gain: 0.35, decay: 0.35, noise: 0.15 })
    if (bar % 4 === 3 && pos >= 12) this.drum(t, { from: 160, to: 90, gain: 0.22, decay: 0.18, noise: 0.1 })
    // basse obstinée en croches
    if (pos % 2 === 0) {
      const pattern = [0, 0, 12, 0, third, 0, 7, 0]
      this.tone(midi(root + pattern[(pos / 2) % 8]), t, dur * 1.8, { type: 'sawtooth', gain: 0.05, attack: 0.005, release: 0.12, filter: 700 })
    }
    // cuivres : accord tenu à chaque mesure
    if (pos === 0) {
      for (const iv of [0, third, 7]) {
        this.tone(midi(root + 12 + iv), t, dur * 14, { type: 'sawtooth', gain: 0.022, attack: 0.12, release: 0.5, filter: 1100, reverb: 0.4 })
      }
    }
    // appel de cuivre toutes les 4 mesures
    if (bar % 4 === 0 && pos === 8) {
      this.tone(midi(D4), t, dur * 3, { type: 'sawtooth', gain: 0.03, attack: 0.05, release: 0.2, filter: 1600, reverb: 0.5 })
      this.tone(midi(D4 + 5), t + dur * 3, dur * 3, { type: 'sawtooth', gain: 0.03, attack: 0.05, release: 0.2, filter: 1600, reverb: 0.5 })
      this.tone(midi(D4 + 7), t + dur * 6, dur * 6, { type: 'sawtooth', gain: 0.034, attack: 0.05, release: 0.4, filter: 1600, reverb: 0.5 })
    }
  }

  // ── Bruitages ──
  private hornCall(t: number, len: number, notes: number[], gain = 0.08) {
    const ctx = this.ctx!
    for (const n of notes) {
      for (const type of ['sawtooth', 'square'] as OscillatorType[]) {
        const o = ctx.createOscillator()
        o.type = type
        o.frequency.setValueAtTime(midi(n - 1), t)
        o.frequency.linearRampToValueAtTime(midi(n), t + 0.18)
        const f = ctx.createBiquadFilter()
        f.type = 'lowpass'
        f.frequency.setValueAtTime(300, t)
        f.frequency.linearRampToValueAtTime(1100, t + 0.3)
        f.Q.value = 2
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, t)
        g.gain.linearRampToValueAtTime(gain * (type === 'square' ? 0.4 : 1), t + 0.28)
        g.gain.setValueAtTime(gain * (type === 'square' ? 0.4 : 1), t + len - 0.35)
        g.gain.exponentialRampToValueAtTime(0.0001, t + len)
        o.connect(f).connect(g)
        g.connect(this.sfxBus)
        const rg = ctx.createGain()
        rg.gain.value = 0.7
        g.connect(rg).connect(this.reverb)
        o.start(t)
        o.stop(t + len + 0.05)
      }
    }
  }

  /** Cornes de guerre : annoncent la bataille. */
  warHorns() {
    this.unlock()
    if (!this.ctx) return
    const t = this.ctx.currentTime + 0.05
    this.hornCall(t, 1.8, [D2 + 12, D2 + 19])
    this.hornCall(t + 2.1, 0.9, [D2 + 12, D2 + 19])
    this.hornCall(t + 3.1, 2.6, [D2 + 12, D2 + 19, D2 + 24], 0.07)
    this.drum(t + 3.1, { from: 70, to: 34, gain: 0.6, decay: 0.6, noise: 0.3, dest: this.sfxBus })
  }

  /** Cor de guerre (bonus pendant la bataille). */
  battleHorn() {
    if (!this.ctx) return
    const t = this.ctx.currentTime + 0.02
    this.hornCall(t, 1.2, [D3 + 7, D3 + 14], 0.07)
  }

  /** Coup de tambour (compte à rebours). */
  tick(strong = false) {
    this.unlock()
    if (!this.ctx) return
    this.drum(this.ctx.currentTime + 0.01, { from: strong ? 80 : 110, to: 45, gain: strong ? 0.6 : 0.35, decay: 0.4, noise: 0.2, dest: this.sfxBus })
  }

  /** Impact d'un boulet (limité pour ne pas saturer). */
  impact() {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    if (now - this.lastImpact < 0.25) return
    this.lastImpact = now
    this.drum(now, { from: 55, to: 28, gain: 0.25, decay: 0.45, noise: 0.18, dest: this.sfxBus })
  }

  fanfare(victory: boolean) {
    if (!this.ctx) return
    this.play(null)
    const t = this.ctx.currentTime + 0.1
    const seq = victory ? [D3, D3 + 4, D3 + 7, D3 + 12, D3 + 12] : [D3 + 7, D3 + 5, D3 + 3, D3 + 2, D3 - 2]
    seq.forEach((n, i) => {
      const len = i === seq.length - 1 ? 1.6 : 0.32
      const at = t + i * 0.34
      this.tone(midi(n), at, len, { type: 'sawtooth', gain: 0.06, attack: 0.03, release: 0.3, filter: victory ? 2200 : 900, to: this.sfxBus, reverb: 0.6 })
      if (victory) this.tone(midi(n + 7), at, len, { type: 'sawtooth', gain: 0.035, attack: 0.03, release: 0.3, filter: 2200, to: this.sfxBus, reverb: 0.6 })
    })
    this.drum(t, { from: 70, to: 34, gain: 0.5, decay: 0.6, noise: 0.25, dest: this.sfxBus })
  }
}

export const audio = new AudioEngine()

/** Sourdine partagée par tous les boutons. */
export function useMuted(): [boolean, () => void] {
  const [m, setM] = useState(audio.muted)
  useEffect(() => audio.subscribe(setM), [])
  return [m, () => audio.toggleMuted()]
}
