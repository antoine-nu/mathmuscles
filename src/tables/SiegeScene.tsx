// Scène du siège : l'armée du joueur (catapultes, soldats) à gauche, le château à droite.
// Le château se dégrade par étapes (fissures, créneaux tombés, brèche, tour éventrée, incendie) puis s'effondre ;
// s'il tient, ses tirs détruisent les catapultes. Tout est dessiné en SVG, animé à partir de l'horloge `now`.
import type { ReactNode } from 'react'
import { SpriteDefs, UnitSprite } from '../components/UnitSprite'

export const SHOT_FLIGHT = 1100
const W = 960, H = 480, GROUND = 352
const BLUE = '#2f5fb3', RED = '#b8362f'
const INK = '#1c130c'

/** Catapultes du joueur (position du bras = point de départ des boulets). */
export const CATAPULTS = [{ x: 150, y: 372 }, { x: 255, y: 388 }, { x: 360, y: 372 }]
/** Points d'impact possibles sur le château. */
export const TARGETS = [
  { x: 640, y: 250 }, { x: 700, y: 290 }, { x: 760, y: 230 }, { x: 815, y: 280 }, { x: 870, y: 245 }, { x: 735, y: 300 },
]

export interface Shot { id: number; t0: number; from: number; target: number }
export interface Volley { id: number; t0: number }

interface Props {
  now: number
  /** Points de vie (0 à 1). */
  castleHp: number
  armyHp: number
  shots: Shot[]
  /** Coups au but (impacts déjà arrivés) : instants, pour les éclats et le tremblement. */
  impacts: { t: number; target: number }[]
  volleys: Volley[]
  ended: { result: 'won' | 'lost'; t0: number } | null
  /** Instant où chaque catapulte est détruite par une pierre enflammée du château (Infinity : jamais). */
  falls: number[]
}

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const ease = (t: number) => 1 - Math.pow(1 - t, 3)

export function SiegeScene({ now, castleHp, armyHp, shots, impacts, volleys, ended, falls }: Props) {
  // seul le château vibre un peu sous l'impact
  const lastImpact = impacts.length ? impacts[impacts.length - 1].t : -1e9
  const shake = clamp(1 - (now - lastImpact) / 260) * 2.2
  const collapse = ended?.result === 'won' ? clamp((now - ended.t0) / 2200) : 0

  return (
    <svg className="siege-scene" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Le siège du château">
      <SpriteDefs />
      <defs>
        <linearGradient id="sg-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fb8d8" />
          <stop offset="0.65" stopColor="#f2d7a6" />
          <stop offset="1" stopColor="#f6c98c" />
        </linearGradient>
        <linearGradient id="sg-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7aa04a" />
          <stop offset="1" stopColor="#557a2e" />
        </linearGradient>
        <radialGradient id="sg-fire" cx="0.5" cy="0.7" r="0.6">
          <stop offset="0" stopColor="#fff2a0" />
          <stop offset="0.5" stopColor="#ff9a3c" />
          <stop offset="1" stopColor="#d9452b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <Landscape />
      <g transform={shake ? `translate(${Math.sin(now / 15) * shake} ${Math.cos(now / 21) * shake * 0.5})` : undefined}>
        <Castle hp={castleHp} collapse={collapse} now={now} />
      </g>
      <Army hp={armyHp} now={now} shots={shots} falls={falls} />
      {volleys.map((v) => <Arrows key={v.id} v={v} now={now} />)}
      {shots.map((s) => <Boulder key={s.id} s={s} now={now} />)}
      {impacts.map((im, i) => <Impact key={i} t={im.t} target={im.target} now={now} />)}
      <FireStones now={now} falls={falls} />
      {collapse > 0 && <Dust p={collapse} />}
    </svg>
  )
}

// ── Décor ──────────────────────────────────────────────────────────────
function Landscape() {
  return (
    <g>
      <rect x={-20} y={-20} width={W + 40} height={H + 40} fill="url(#sg-sky)" />
      <circle cx={180} cy={92} r={34} fill="#fff1c4" opacity={0.85} />
      <path d={`M-20,${GROUND - 40} Q120,${GROUND - 120} 260,${GROUND - 70} T560,${GROUND - 90} T980,${GROUND - 60} V${H} H-20Z`} fill="#9bb07a" opacity={0.6} />
      <path d={`M-20,${GROUND - 15} Q200,${GROUND - 70} 420,${GROUND - 25} T980,${GROUND - 40} V${H} H-20Z`} fill="#86a35a" opacity={0.75} />
      {[[60, 70], [330, 55], [520, 90], [900, 62]].map(([x, y], i) => (
        <g key={i} opacity={0.75} fill="#fff">
          <ellipse cx={x} cy={y} rx={34} ry={11} /><ellipse cx={x + 22} cy={y - 7} rx={22} ry={11} /><ellipse cx={x - 20} cy={y - 4} rx={18} ry={9} />
        </g>
      ))}
      <rect x={-20} y={GROUND} width={W + 40} height={H - GROUND + 20} fill="url(#sg-ground)" />
      <path d={`M440,${H} Q520,${GROUND + 40} 610,${GROUND + 6}`} stroke="#b8955c" strokeWidth={30} fill="none" opacity={0.55} />
      {Array.from({ length: 40 }, (_, i) => {
        const x = (i * 97) % W, y = GROUND + 12 + ((i * 53) % 110)
        return <path key={i} d={`M${x},${y} l2,-6 M${x + 4},${y} l0,-7 M${x + 8},${y} l-2,-6`} stroke="#3f6b2a" strokeWidth={1.2} opacity={0.6} />
      })}
    </g>
  )
}

// ── Château ────────────────────────────────────────────────────────────
const STONE = '#b9ad96', STONE_DARK = '#8f8470', STONE_LIGHT = '#d4c9b2'

function Merlons({ x, y, w, n, missing = [] as number[] }: { x: number; y: number; w: number; n: number; missing?: number[] }) {
  const step = w / n
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (i % 2 === 0 && !missing.includes(i) ? (
        <rect key={i} x={x + i * step} y={y - 12} width={step} height={12} fill={STONE} stroke={INK} strokeWidth={1} />
      ) : null))}
    </g>
  )
}

function Tower({ x, w, top, roofOff = false, missing }: { x: number; w: number; top: number; roofOff?: boolean; missing?: number[] }) {
  return (
    <g>
      <rect x={x} y={top} width={w} height={GROUND - top} fill={STONE} stroke={INK} strokeWidth={1.2} />
      <rect x={x + w * 0.62} y={top} width={w * 0.38} height={GROUND - top} fill={STONE_DARK} opacity={0.45} />
      {[0.3, 0.55].map((f) => <rect key={f} x={x + w / 2 - 4} y={top + (GROUND - top) * f} width={8} height={16} rx={4} fill="#3a2a1c" />)}
      {!roofOff && (
        <g>
          <Merlons x={x - 4} y={top} w={w + 8} n={7} missing={missing} />
          <path d={`M${x - 6},${top - 12} L${x + w / 2},${top - 62} L${x + w + 6},${top - 12} Z`} fill={RED} stroke={INK} strokeWidth={1.2} />
          <path d={`M${x + w / 2},${top - 62} L${x + w + 6},${top - 12} L${x + w / 2},${top - 12} Z`} fill="#000" opacity={0.18} />
          <line x1={x + w / 2} y1={top - 62} x2={x + w / 2} y2={top - 90} stroke={INK} strokeWidth={2} />
          <path className="sg-flag" d={`M${x + w / 2},${top - 90} l26,7 l-26,7 Z`} fill={RED} stroke={INK} strokeWidth={0.8} />
        </g>
      )}
    </g>
  )
}

function Castle({ hp, collapse, now }: { hp: number; collapse: number; now: number }) {
  const stage = Math.min(4, Math.floor((1 - hp) * 5 + 1e-6)) // 0 intact → 4 très abîmé
  const fall = ease(collapse)
  const leftTowerOff = stage >= 4
  const pieces: ReactNode[] = []
  // fissures
  if (stage >= 1) pieces.push(<path key="c1" d="M680,250 l10,18 l-6,14 l12,20 M800,262 l-8,16 l10,12" stroke={INK} strokeWidth={1.6} fill="none" />)
  if (stage >= 2) pieces.push(<path key="c2" d="M620,190 l8,16 l-5,12 M872,200 l-6,18 l8,14 l-4,16" stroke={INK} strokeWidth={1.6} fill="none" />)
  // brèche dans la courtine
  if (stage >= 3) pieces.push(
    <g key="breach">
      <path d="M720,262 l18,-10 l22,6 l10,22 l-8,24 l-30,4 l-16,-20 Z" fill="#2a1f16" stroke={INK} strokeWidth={1} />
      {[0, 1, 2].map((i) => <rect key={i} x={716 + i * 18} y={322 + (i % 2) * 6} width={14} height={9} fill={STONE_DARK} stroke={INK} strokeWidth={0.8} transform={`rotate(${i * 25 - 20} ${720 + i * 18} 326)`} />)}
    </g>,
  )
  return (
    <g>
      {/* le château s'enfonce et se disloque quand il tombe */}
      <g transform={`translate(0 ${fall * 150}) rotate(${fall * 4} 760 ${GROUND})`} opacity={1 - Math.max(0, fall - 0.55) * 2.2}>
        <clipPath id="sg-castle-clip"><rect x={560} y={0} width={400} height={GROUND} /></clipPath>
        <g clipPath="url(#sg-castle-clip)">
          {/* donjon central */}
          <rect x={700} y={150} width={120} height={GROUND - 150} fill={STONE_LIGHT} stroke={INK} strokeWidth={1.2} />
          <Merlons x={696} y={150} w={128} n={9} missing={stage >= 2 ? [2, 6] : []} />
          <rect x={752} y={185} width={16} height={26} rx={8} fill="#3a2a1c" />
          {/* tours */}
          <Tower x={600} w={70} top={170} roofOff={leftTowerOff} missing={stage >= 2 ? [4] : []} />
          <Tower x={850} w={70} top={160} missing={stage >= 3 ? [0, 2] : []} />
          {leftTowerOff && <path d="M600,196 l14,-22 l12,10 l16,-16 l10,18 l18,-8 V214 H600 Z" fill={STONE} stroke={INK} strokeWidth={1.2} />}
          {/* courtine et porte */}
          <rect x={640} y={236} width={240} height={GROUND - 236} fill={STONE} stroke={INK} strokeWidth={1.2} />
          <Merlons x={636} y={236} w={248} n={15} missing={stage >= 2 ? [4, 8, 12] : stage >= 1 ? [8] : []} />
          {[0, 1, 2, 3].map((r) => <line key={r} x1={640} y1={258 + r * 24} x2={880} y2={258 + r * 24} stroke={STONE_DARK} strokeWidth={1} opacity={0.6} />)}
          <path d={`M735,${GROUND} V292 Q760,262 785,292 V${GROUND} Z`} fill="#3a2a1c" stroke={INK} strokeWidth={1.2} />
          {[743, 753, 763, 773].map((x) => <line key={x} x1={x} y1={280} x2={x} y2={GROUND} stroke="#6b5a44" strokeWidth={2} />)}
          {pieces}
          {/* défenseurs sur le chemin de ronde : ils disparaissent au fil des dégâts */}
          {[660, 700, 820, 860].slice(0, Math.max(0, 4 - stage)).map((x) => (
            <g key={x} transform={`translate(${x} 232) scale(0.75)`}>
              <UnitSprite look={{ kind: 'archer', tier: 1, color: RED, emblem: '♜', name: '', upgrades: 0 }} />
            </g>
          ))}
        </g>
      </g>
      {/* incendie et fumée sur un château très abîmé */}
      {stage >= 3 && collapse < 1 && <Smoke x={750} y={250} now={now} />}
      {stage >= 4 && collapse < 1 && <Flames x={630} y={200} now={now} />}
      {/* tas de décombres une fois tombé */}
      {collapse > 0.4 && (
        <g opacity={clamp((collapse - 0.4) / 0.4)}>
          <path d={`M580,${GROUND + 4} Q640,${GROUND - 40} 700,${GROUND - 30} Q760,${GROUND - 60} 820,${GROUND - 34} Q880,${GROUND - 46} 940,${GROUND + 4} Z`} fill={STONE_DARK} stroke={INK} strokeWidth={1.2} />
          {Array.from({ length: 14 }, (_, i) => (
            <rect key={i} x={600 + i * 23} y={GROUND - 30 - ((i * 37) % 26)} width={18} height={11} fill={i % 2 ? STONE : STONE_LIGHT} stroke={INK} strokeWidth={0.8}
              transform={`rotate(${(i * 47) % 60 - 30} ${609 + i * 23} ${GROUND - 25})`} />
          ))}
          <path className="sg-flag" d={`M760,${GROUND - 58} l0,-36 l24,7 l-24,7`} fill={BLUE} stroke={INK} strokeWidth={1} />
        </g>
      )}
    </g>
  )
}

function Smoke({ x, y, now }: { x: number; y: number; now: number }) {
  return (
    <g>
      {[0, 1, 2, 3].map((i) => {
        const p = ((now / 2600 + i / 4) % 1)
        return <circle key={i} cx={x + Math.sin(p * 6 + i) * 10 + p * 30} cy={y - p * 120} r={10 + p * 26} fill="#6b6460" opacity={0.45 * (1 - p)} />
      })}
    </g>
  )
}

function Flames({ x, y, now }: { x: number; y: number; now: number }) {
  const f = 1 + Math.sin(now / 90) * 0.12
  return (
    <g transform={`translate(${x} ${y}) scale(1 ${f})`}>
      <ellipse cx={0} cy={0} rx={26} ry={34} fill="url(#sg-fire)" />
      <ellipse cx={14} cy={8} rx={16} ry={22} fill="url(#sg-fire)" />
    </g>
  )
}

function Dust({ p }: { p: number }) {
  return (
    <g opacity={1 - p * 0.8}>
      {Array.from({ length: 9 }, (_, i) => (
        <circle key={i} cx={600 + i * 40} cy={GROUND - 30 - p * 60 - (i % 3) * 18} r={30 + p * 50} fill="#c9b99a" opacity={0.55} />
      ))}
    </g>
  )
}

// ── Armée du joueur ────────────────────────────────────────────────────
const SOLDIERS = [
  { x: 70, y: 420, k: 'infantry' }, { x: 120, y: 436, k: 'spear' }, { x: 180, y: 420, k: 'archer' }, { x: 230, y: 438, k: 'infantry' },
  { x: 300, y: 422, k: 'archer' }, { x: 345, y: 440, k: 'spear' }, { x: 400, y: 424, k: 'infantry' }, { x: 440, y: 442, k: 'knight' },
] as const

/** Ordre dans lequel les soldats tombent (mélangé, pour ne pas vider l'armée de gauche à droite). */
const DEATH_ORDER = [5, 1, 7, 3, 0, 6, 2, 4]
/** Seuil de vie de l'armée sous lequel la catapulte i est menacée (elle tombe à 2/3, 1/3 puis 0). */
const fallAt = (i: number) => 1 - (i + 1) / 3

function Army({ hp, now, shots, falls }: { hp: number; now: number; shots: Shot[]; falls: number[] }) {
  const dead = SOLDIERS.length - Math.ceil(hp * SOLDIERS.length)
  return (
    <g>
      {CATAPULTS.map((c, i) => {
        // recul du bras au départ d'un boulet
        const fired = shots.filter((s) => s.from === i).map((s) => now - s.t0).filter((d) => d >= 0 && d < 400)
        const kick = fired.length ? Math.sin((fired[0] / 400) * Math.PI) : 0
        const broken = now >= falls[i]
        const damaged = !broken && hp < fallAt(i) + 0.17
        return (
          <g key={i}>
            <g transform={`translate(${c.x} ${c.y}) scale(1.9) rotate(${broken ? 22 : -kick * 8})`} opacity={broken ? 0.55 : 1}
              style={broken ? { filter: 'grayscale(0.7) brightness(0.55)' } : undefined}>
              <UnitSprite look={{ kind: 'siege', tier: 2, color: BLUE, emblem: '∑', name: '', upgrades: 1 }} />
              {(damaged || broken) && <path d="M-16,-10 l10,6 M4,-14 l8,10 M-6,-2 l6,-6 M-12,-20 l6,4" stroke={INK} strokeWidth={1.4} />}
            </g>
            {broken && <g transform={`translate(${c.x} ${c.y - 30}) scale(0.6)`}><Smoke x={0} y={0} now={now + i * 400} /></g>}
            {broken && <g transform={`translate(${c.x - 18} ${c.y - 6})`}><Flames x={0} y={0} now={now + i * 300} /></g>}
          </g>
        )
      })}
      {SOLDIERS.map((s, i) => {
        const fallen = DEATH_ORDER.indexOf(i) < dead
        return (
          <g key={i} transform={`translate(${s.x} ${s.y})`}>
            {/* un soldat tombé reste allongé au sol */}
            <g style={{ transform: fallen ? 'translate(4px, -4px) rotate(-84deg)' : 'none', transition: 'transform 0.5s ease-in', filter: fallen ? 'grayscale(0.5) brightness(0.8)' : undefined }}>
              <g transform="scale(1.35)">
                <UnitSprite look={{ kind: s.k, tier: 2, color: BLUE, emblem: '∑', name: '', upgrades: 0 }} />
              </g>
            </g>
          </g>
        )
      })}
      <line x1={30} y1={440} x2={30} y2={340} stroke={INK} strokeWidth={2.5} />
      <path className="sg-flag" d="M30,340 l46,10 l-46,12 Z" fill={BLUE} stroke={INK} strokeWidth={1} />
      <text x={44} y={356} className="sg-emblem">∑</text>
    </g>
  )
}

// ── Projectiles ────────────────────────────────────────────────────────
function Boulder({ s, now }: { s: Shot; now: number }) {
  const t = (now - s.t0) / SHOT_FLIGHT
  if (t < 0 || t > 1) return null
  const c = CATAPULTS[s.from], g = TARGETS[s.target]
  const x0 = c.x + 10, y0 = c.y - 60
  const x = x0 + (g.x - x0) * t
  const y = y0 + (g.y - y0) * t - Math.sin(t * Math.PI) * 150
  return (
    <g>
      {[1, 2, 3].map((k) => {
        const tk = Math.max(0, t - k * 0.035)
        const tx = x0 + (g.x - x0) * tk, ty = y0 + (g.y - y0) * tk - Math.sin(tk * Math.PI) * 150
        return <circle key={k} cx={tx} cy={ty} r={9 - k * 2} fill="#d9cfbf" opacity={0.5 - k * 0.12} />
      })}
      <circle cx={x} cy={y} r={9} fill="#4a4540" stroke={INK} strokeWidth={1.2} />
      <circle cx={x - 3} cy={y - 3} r={3} fill="#ff9a3c" opacity={0.8} />
    </g>
  )
}

function Impact({ t, target, now }: { t: number; target: number; now: number }) {
  const p = (now - t) / 700
  if (p < 0 || p > 1) return null
  const g = TARGETS[target]
  return (
    <g>
      <circle cx={g.x} cy={g.y} r={10 + p * 46} fill="#fff1a8" opacity={0.85 * (1 - p)} />
      <circle cx={g.x} cy={g.y} r={6 + p * 30} fill="#ff9a3c" opacity={0.7 * (1 - p)} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return <rect key={i} x={g.x + Math.cos(a) * p * 60} y={g.y + Math.sin(a) * p * 50 + p * p * 60} width={6} height={5} fill={STONE_DARK} opacity={1 - p} />
      })}
    </g>
  )
}

/** Volée de flèches tirées depuis le château vers l'armée. */
function Arrows({ v, now }: { v: Volley; now: number }) {
  const t = (now - v.t0) / 900
  if (t < 0 || t > 1) return null
  return (
    <g>
      {[0, 1, 2, 3].map((i) => {
        const x0 = 650 + i * 60, y0 = 230, x1 = 120 + i * 90, y1 = 420
        const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * 90
        const dx = x1 - x0, dy = (y1 - y0) - Math.cos(t * Math.PI) * 90 * Math.PI
        const a = Math.atan2(dy, dx)
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${(a * 180) / Math.PI})`}>
            <line x1={-14} y1={0} x2={0} y2={0} stroke={INK} strokeWidth={2} />
            <path d="M0,0 l-5,-3 l0,6 Z" fill={INK} />
          </g>
        )
      })}
    </g>
  )
}

/** Pierres enflammées du château : chacune détruit une catapulte (à l'instant falls[i]). */
const FIRE_FLIGHT = 900
function FireStones({ now, falls }: { now: number; falls: number[] }) {
  return (
    <g>
      {CATAPULTS.map((c, i) => {
        const t = (now - (falls[i] - FIRE_FLIGHT)) / FIRE_FLIGHT
        if (!Number.isFinite(falls[i]) || t < 0 || t > 1.7) return null
        if (t > 1) {
          const p = (t - 1) / 0.7
          return (
            <g key={i}>
              <circle cx={c.x} cy={c.y - 20} r={20 + p * 50} fill="#fff1a8" opacity={0.8 * (1 - p)} />
              <circle cx={c.x} cy={c.y - 20} r={14 + p * 36} fill="#ff9a3c" opacity={0.8 * (1 - p)} />
              {Array.from({ length: 7 }, (_, k) => {
                const a = (k / 7) * Math.PI * 2
                return <rect key={k} x={c.x + Math.cos(a) * p * 50} y={c.y - 20 + Math.sin(a) * p * 40 + p * p * 40} width={7} height={4} fill="#6b4a26" opacity={1 - p} />
              })}
            </g>
          )
        }
        const x = 760 + (c.x - 760) * t, y = 220 + (c.y - 30 - 220) * t - Math.sin(t * Math.PI) * 120
        return <circle key={i} cx={x} cy={y} r={10} fill="url(#sg-fire)" stroke="#d9452b" strokeWidth={2} />
      })}
    </g>
  )
}
