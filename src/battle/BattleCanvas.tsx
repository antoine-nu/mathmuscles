import { useEffect, useRef } from 'react'
import { LEVELS, unitName, type Chapter } from '../data/curriculum'
import type { UnitLook } from '../components/UnitSprite'
import { seeded } from '../game/color'
import type { Feed, UnitMeta } from './feed'
import type { BattleEvent } from './sim'
import { FIELD_H, FIELD_W, type Side } from './sim'
import { SPRITE_BOX, preloadSprites, spriteImage } from './sprites'

/** Écrasement vertical de la vue « trois-quarts ». */
const TILT = 0.62

const CHAPTERS = new Map<string, Chapter>(LEVELS.flatMap((l) => l.chapters.map((c) => [c.id, c] as const)))

export function lookOf(m: UnitMeta, color: string): UnitLook {
  const c = CHAPTERS.get(m.regiment)
  return {
    kind: m.kind === 'villager' ? (c?.unit ?? 'infantry') : m.kind,
    tier: m.tier,
    color,
    emblem: c?.emblem ?? '',
    name: c ? unitName(c, m.tier) : '',
    upgrades: m.upgrades,
  }
}

interface Effect {
  kind: 'dust' | 'convert' | 'impact'
  x: number
  y: number
  t0: number
  side?: Side
}

interface Props {
  feed: Feed
  colors: [string, string]
  /** Appelé à chaque image (pour faire avancer une simulation locale). */
  onTick?: (dt: number) => void
  /** Événements de la bataille (pour les sons). */
  onEvents?: (events: BattleEvent[]) => void
}

/** Terrain vague : herbe, plaques de terre, un peu de marais, cailloux et fleurs. */
/** Marge de terrain autour du champ de bataille (m) et résolution de l'image du sol (px par m). */
const PAD = 10
const GROUND_RES = 26

function paintGround(ctx: CanvasRenderingContext2D, w: number, h: number, field: { ox: number; oy: number; k: number }) {
  const rnd = seeded(99)
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#5f8a36')
  g.addColorStop(1, '#6f9a3c')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const blob = (color: string, n: number, size: number, alpha: number) => {
    for (let i = 0; i < n; i++) {
      const x = rnd() * w, y = rnd() * h
      const rx = size * (0.5 + rnd()), ry = rx * (0.35 + rnd() * 0.25)
      ctx.globalAlpha = alpha * (0.5 + rnd() * 0.5)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(x, y, rx, ry, rnd() * 0.4 - 0.2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  const k = field.k
  blob('#7fa84a', 26, k * 6, 0.5)
  blob('#4f7a2e', 22, k * 5, 0.35)
  blob('#a3865a', 12, k * 5, 0.55) // terre
  blob('#b8955c', 10, k * 3, 0.45)
  // marais : deux nappes au milieu, qui ne gênent personne
  for (const [mx, my] of [[FIELD_W * 0.42, FIELD_H * 0.2], [FIELD_W * 0.6, FIELD_H * 0.8]] as const) {
    const cx = field.ox + mx * k, cy = field.oy + my * k * TILT
    ctx.fillStyle = 'rgba(70, 110, 90, 0.55)'
    ctx.beginPath(); ctx.ellipse(cx, cy, k * 4.5, k * 1.6, 0.1, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(120, 170, 170, 0.45)'
    ctx.beginPath(); ctx.ellipse(cx - k * 0.6, cy - k * 0.3, k * 2.8, k * 0.8, 0.1, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#3f5f2a'; ctx.lineWidth = 1.2
    for (let i = 0; i < 18; i++) {
      const rx = cx + (rnd() - 0.5) * k * 8, ry = cy + (rnd() - 0.5) * k * 2.6
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + (rnd() - 0.5) * 3, ry - 6 - rnd() * 5); ctx.stroke()
    }
  }
  // brins d'herbe, cailloux, fleurs
  for (let i = 0; i < 900; i++) {
    const x = rnd() * w, y = rnd() * h
    ctx.strokeStyle = rnd() < 0.5 ? 'rgba(40, 70, 25, 0.5)' : 'rgba(140, 180, 80, 0.5)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 3, y - 3 - rnd() * 3); ctx.stroke()
  }
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = rnd() < 0.7 ? '#8d8f8c' : '#f3e37c'
    ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, 1 + rnd() * 2, 0, Math.PI * 2); ctx.fill()
  }
}

export function BattleCanvas({ feed, colors, onTick, onEvents }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tickRef = useRef(onTick)
  tickRef.current = onTick
  const eventsRef = useRef(onEvents)
  eventsRef.current = onEvents

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let ground: HTMLCanvasElement | null = null
    let W = 0, H = 0, dpr = 1
    const effects: Effect[] = []
    const lastPos = new Map<number, { x: number; y: number; moving: number }>()
    const metaById = new Map(feed.meta.map((m) => [m.id, m]))

    // préchargement des sprites des deux couleurs (une unité convertie change de couleur)
    void preloadSprites(feed.meta.flatMap((m) => [lookOf(m, colors[0]), lookOf(m, colors[1])]))

    // sol peint une fois, en coordonnées du monde
    ground = document.createElement('canvas')
    ground.width = (FIELD_W + 2 * PAD) * GROUND_RES
    ground.height = Math.round((FIELD_H * TILT + 2 * PAD) * GROUND_RES)
    paintGround(ground.getContext('2d')!, ground.width, ground.height, { ox: PAD * GROUND_RES, oy: PAD * GROUND_RES, k: GROUND_RES })
    // caméra : centre (m, y déjà écrasé) et zoom (px par m)
    const cam = { x: FIELD_W / 2, y: (FIELD_H * TILT) / 2, zoom: 0 }
    let fitZoom = 10
    const resize = () => {
      dpr = window.devicePixelRatio || 1
      W = canvas.clientWidth
      H = canvas.clientHeight
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      fitZoom = Math.min(W / (FIELD_W + 4), (H - 40) / (FIELD_H * TILT + 6))
      if (!cam.zoom) cam.zoom = fitZoom
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const sx = (x: number) => W / 2 + (x - cam.x) * cam.zoom
    const sy = (y: number) => H / 2 + (y * TILT - cam.y) * cam.zoom

    let raf = 0
    let last = performance.now()
    let shake = 0
    const draw = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      tickRef.current?.(dt)
      const f = feed.frame()
      const drained = feed.drain()
      if (drained.length) eventsRef.current?.(drained)
      for (const ev of drained) {
        if (ev.type === 'death') {
          const u = f.units.find((x) => x.id === ev.id)
          if (u) effects.push({ kind: 'dust', x: u.x, y: u.y, t0: f.t })
        } else if (ev.type === 'convert') {
          const u = f.units.find((x) => x.id === ev.id)
          if (u) effects.push({ kind: 'convert', x: u.x, y: u.y, t0: f.t, side: ev.side })
        } else if (ev.type === 'impact') {
          effects.push({ kind: 'impact', x: ev.x, y: ev.y, t0: f.t })
          shake = Math.max(shake, 0.35)
        }
      }

      // la caméra suit la mêlée : cadre les unités vivantes, avec un zoom doux et borné
      const alive = f.units.filter((u) => u.state !== 2)
      if (alive.length) {
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
        for (const u of alive) { x0 = Math.min(x0, u.x); x1 = Math.max(x1, u.x); y0 = Math.min(y0, u.y); y1 = Math.max(y1, u.y) }
        const bw = x1 - x0 + 14, bh = (y1 - y0) * TILT + 9
        const z = Math.max(fitZoom, Math.min(fitZoom * 2.1, Math.min(W / bw, H / bh)))
        const ease = Math.min(1, dt * 1.2)
        cam.zoom += (z - cam.zoom) * ease
        cam.x += ((x0 + x1) / 2 - cam.x) * ease
        cam.y += (((y0 + y1) / 2) * TILT - 1 - cam.y) * ease
      }
      shake = Math.max(0, shake - dt)
      const sh = shake > 0 ? shake * 9 : 0
      ctx.setTransform(dpr, 0, 0, dpr, (Math.random() - 0.5) * sh * dpr, (Math.random() - 0.5) * sh * dpr)
      ctx.fillStyle = '#4f7a2e'
      ctx.fillRect(0, 0, W, H)
      if (ground) {
        const gx = sx(-PAD), gy = H / 2 + (-PAD - cam.y) * cam.zoom
        ctx.drawImage(ground, gx, gy, (ground.width / GROUND_RES) * cam.zoom, (ground.height / GROUND_RES) * cam.zoom)
      }
      const k = cam.zoom
      const scale = (k * 4.4) / 84 // taille des sprites

      // auras du cor de guerre
      const hornOn: [boolean, boolean] = [f.horn[0] > f.t, f.horn[1] > f.t]

      const units = [...f.units].sort((a, b) => a.y - b.y)
      // morts d'abord (au sol)
      for (const u of units) {
        if (u.state !== 2) continue
        const m = metaById.get(u.id)
        if (!m) continue
        const age = f.t - u.deadAt
        const img = spriteImage(lookOf(m, colors[u.side]))
        if (!img.complete) continue
        ctx.save()
        ctx.translate(sx(u.x), sy(u.y))
        ctx.globalAlpha = Math.max(0.22, 1 - age / 1.8)
        ctx.rotate((u.facing === 1 ? -1 : 1) * Math.min(1, age / 0.4) * 1.45)
        ctx.scale(scale * u.facing, scale)
        ctx.drawImage(img, SPRITE_BOX.x, SPRITE_BOX.y, SPRITE_BOX.w, SPRITE_BOX.h)
        ctx.restore()
      }
      for (const u of units) {
        if (u.state === 2) continue
        const m = metaById.get(u.id)
        if (!m) continue
        const x = sx(u.x), y = sy(u.y)
        const prev = lastPos.get(u.id)
        const movedDist = prev ? Math.hypot(u.x - prev.x, u.y - prev.y) : 0
        const moving = prev ? prev.moving * 0.8 + (movedDist > 0.004 ? 0.2 : 0) : 0
        lastPos.set(u.id, { x: u.x, y: u.y, moving })
        // anneau de couleur du camp ; sous l'effet du cor, aura dorée pulsante et étincelles qui montent
        if (hornOn[u.side]) {
          const pulse = 0.5 + 0.5 * Math.sin(f.t * 9 + u.id)
          const glow = ctx.createRadialGradient(x, y - k * 0.6, 0, x, y - k * 0.6, k * 1.5)
          glow.addColorStop(0, `rgba(255, 220, 100, ${0.35 + 0.2 * pulse})`)
          glow.addColorStop(1, 'rgba(255, 200, 60, 0)')
          ctx.fillStyle = glow
          ctx.beginPath(); ctx.ellipse(x, y - k * 0.6, k * 1.5, k * 1.5, 0, 0, Math.PI * 2); ctx.fill()
          ctx.strokeStyle = `rgba(255, 225, 120, ${0.7 + 0.3 * pulse})`
          ctx.lineWidth = 2
          ctx.beginPath(); ctx.ellipse(x, y, k * (0.6 + 0.12 * pulse), k * (0.24 + 0.05 * pulse), 0, 0, Math.PI * 2); ctx.stroke()
          for (let j = 0; j < 2; j++) {
            const ph = (f.t * 0.9 + u.id * 0.37 + j * 0.5) % 1
            ctx.fillStyle = `rgba(255, 230, 140, ${1 - ph})`
            ctx.fillRect(x + Math.sin(u.id * 7 + j * 3) * k * 0.5, y - k * (0.4 + ph * 2.4), 2.5, 2.5)
          }
        } else {
          ctx.fillStyle = u.side === 0 ? 'rgba(80, 140, 255, 0.35)' : 'rgba(255, 90, 80, 0.35)'
          ctx.beginPath(); ctx.ellipse(x, y, k * 0.55, k * 0.22, 0, 0, Math.PI * 2); ctx.fill()
        }

        const img = spriteImage(lookOf(m, colors[u.side]))
        const bob = moving > 0.5 ? Math.abs(Math.sin(f.t * 10 + u.id)) * 2.2 : 0
        const tilt = moving > 0.5 ? Math.sin(f.t * 10 + u.id) * 0.06 : 0
        const lunge = u.state === 1 && u.swing < 0.25 && m.kind !== 'archer' && m.kind !== 'siege' ? (0.25 - u.swing) * 14 * u.facing : 0
        // recul de l'engin de siège au moment du tir
        const recoil = m.kind === 'siege' && u.swing < 0.4 ? -Math.sin((u.swing / 0.4) * Math.PI) * 0.12 * u.facing : 0
        if (img.complete) {
          ctx.save()
          ctx.translate(x + lunge, y - bob)
          ctx.rotate(tilt + recoil)
          ctx.scale(scale * u.facing, scale)
          ctx.drawImage(img, SPRITE_BOX.x, SPRITE_BOX.y, SPRITE_BOX.w, SPRITE_BOX.h)
          ctx.restore()
        }
        // prière du moine : rayon doré vers sa cible
        if (u.state === 3 && u.target) {
          const t = f.units.find((o) => o.id === u.target)
          if (t) {
            ctx.strokeStyle = `rgba(255, 220, 120, ${0.4 + 0.3 * Math.sin(f.t * 8)})`
            ctx.lineWidth = 2
            ctx.setLineDash([4, 4])
            ctx.beginPath(); ctx.moveTo(x, y - k * 1.6); ctx.lineTo(sx(t.x), sy(t.y) - k * 1.2); ctx.stroke()
            ctx.setLineDash([])
          }
        }
        // barre de vie
        if (u.hp < m.maxHp) {
          const bw = k * 1.1, bh = 3
          const top = y - (m.kind === 'knight' || m.kind === 'scout' ? k * 2.7 : m.kind === 'siege' ? k * 2.6 : k * 2.1)
          ctx.fillStyle = 'rgba(0,0,0,0.6)'
          ctx.fillRect(x - bw / 2 - 1, top - 1, bw + 2, bh + 2)
          const r = Math.max(0, u.hp / m.maxHp)
          ctx.fillStyle = r > 0.5 ? '#5fd35f' : r > 0.25 ? '#e8c23a' : '#e8553a'
          ctx.fillRect(x - bw / 2, top, bw * r, bh)
        }
      }

      // projectiles
      for (const p of f.projectiles) {
        const r = Math.min(1, Math.max(0, (f.t - p.t0) / p.dur))
        const px = p.x0 + (p.x1 - p.x0) * r, py = p.y0 + (p.y1 - p.y0) * r
        const arc = Math.sin(r * Math.PI) * (p.kind === 'stone' ? 7 : 1.6) * k
        const X = sx(px), Y = sy(py) - k * 1.2 - arc
        if (p.kind === 'arrow') {
          const r2 = Math.min(1, r + 0.04)
          const X2 = sx(p.x0 + (p.x1 - p.x0) * r2), Y2 = sy(p.y0 + (p.y1 - p.y0) * r2) - k * 1.2 - Math.sin(r2 * Math.PI) * 1.6 * k
          const ang = Math.atan2(Y2 - Y, X2 - X)
          ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 1.4
          ctx.beginPath(); ctx.moveTo(X - Math.cos(ang) * 7, Y - Math.sin(ang) * 7); ctx.lineTo(X, Y); ctx.stroke()
        } else {
          // boulet : ombre au sol, traînée de fumée, pierre enflammée
          const R = Math.max(4, k * 0.34)
          ctx.fillStyle = `rgba(0,0,0,${0.18 + 0.2 * r})`
          ctx.beginPath(); ctx.ellipse(sx(px), sy(py), R * 1.3, R * 0.55, 0, 0, Math.PI * 2); ctx.fill()
          for (let j = 1; j <= 4; j++) {
            const rj = Math.max(0, r - j * 0.035)
            const tx = sx(p.x0 + (p.x1 - p.x0) * rj), ty = sy(p.y0 + (p.y1 - p.y0) * rj) - k * 1.2 - Math.sin(rj * Math.PI) * 7 * k
            ctx.fillStyle = `rgba(210, 200, 185, ${0.35 - j * 0.07})`
            ctx.beginPath(); ctx.arc(tx, ty, R * (1 - j * 0.12), 0, Math.PI * 2); ctx.fill()
          }
          ctx.fillStyle = '#4a4540'
          ctx.strokeStyle = '#1c130c'
          ctx.lineWidth = 1
          ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
          ctx.fillStyle = 'rgba(255, 150, 50, 0.85)'
          ctx.beginPath(); ctx.arc(X - R * 0.25, Y - R * 0.25, R * 0.45, 0, Math.PI * 2); ctx.fill()
        }
      }

      // effets
      for (let i = effects.length - 1; i >= 0; i--) {
        const e = effects[i]
        const age = f.t - e.t0
        const life = e.kind === 'convert' ? 1.2 : e.kind === 'impact' ? 0.9 : 0.6
        if (age > life || age < 0) { effects.splice(i, 1); continue }
        const a = 1 - age / life
        const X = sx(e.x), Y = sy(e.y)
        if (e.kind === 'convert') {
          ctx.strokeStyle = `rgba(255, 225, 120, ${a})`
          ctx.lineWidth = 2
          for (let j = 0; j < 8; j++) {
            const ang = (j / 8) * Math.PI * 2 + age * 2
            ctx.beginPath()
            ctx.moveTo(X + Math.cos(ang) * k * 0.4, Y - k + Math.sin(ang) * k * 0.4)
            ctx.lineTo(X + Math.cos(ang) * k * (0.6 + age * 1.5), Y - k + Math.sin(ang) * k * (0.6 + age * 1.5))
            ctx.stroke()
          }
        } else if (e.kind === 'impact') {
          // gerbe de terre et cratère
          const rad = k * (0.6 + age * 3.4)
          ctx.fillStyle = `rgba(95, 70, 40, ${a * 0.55})`
          ctx.beginPath(); ctx.ellipse(X, Y, rad, rad * 0.45, 0, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = `rgba(255, 170, 70, ${a * a * 0.7})`
          ctx.beginPath(); ctx.ellipse(X, Y - k * 0.3, k * 0.9 * a, k * 0.45 * a, 0, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = `rgba(80, 60, 35, ${a})`
          for (let j = 0; j < 7; j++) {
            const ang = (j / 7) * Math.PI * 2 + e.x
            const d = age * k * 4
            ctx.fillRect(X + Math.cos(ang) * d, Y - Math.abs(Math.sin(ang)) * d * 0.8 - Math.sin(age * 4) * k * 1.2, 3, 3)
          }
        } else {
          ctx.fillStyle = `rgba(180, 160, 120, ${a * 0.5})`
          const rad = k * (0.4 + age * 1.4)
          ctx.beginPath(); ctx.ellipse(X, Y, rad, rad * 0.45, 0, 0, Math.PI * 2); ctx.fill()
        }
      }

      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.75)
      vg.addColorStop(0, 'rgba(0,0,0,0)')
      vg.addColorStop(1, 'rgba(0,0,0,0.4)')
      ctx.fillStyle = vg
      ctx.fillRect(0, 0, W, H)
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [feed, colors])

  return <canvas ref={canvasRef} className="battle-canvas" />
}
