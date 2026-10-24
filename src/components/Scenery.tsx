import { shade } from '../game/color'

const OUTLINE = '#1c130c'

export function Pine({ x, y, s = 1, hue = 0, leaves, snow = false }: { x: number; y: number; s?: number; hue?: number; leaves?: string[]; snow?: boolean }) {
  const g = (leaves ?? ['#2f5a2a', '#36652c', '#2a5232', '#3b6b2f'])[hue % 4]
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={4} cy={1} rx={14} ry={5} fill="rgba(0,0,0,0.28)" />
      <rect x={-2} y={-10} width={4} height={10} fill="#5a3a1e" stroke={OUTLINE} strokeWidth={0.6} />
      <path d="M0,-54 L13,-28 L7,-29 L17,-12 L-17,-12 L-7,-29 L-13,-28 Z" fill={g} stroke={OUTLINE} strokeWidth={0.8} strokeLinejoin="round" />
      <path d="M0,-54 L13,-28 L7,-29 L17,-12 L2,-12 Z" fill="#000" opacity={0.16} />
      <path d="M0,-54 L-6,-40 L-2,-41 L-8,-30" stroke={shade(g, 0.3)} strokeWidth={1.2} fill="none" opacity={0.7} />
      {snow && (
        <g fill="#f7fbfd" stroke="#b9cad6" strokeWidth={0.5}>
          <path d="M0,-54 L6,-42 L2,-40 L-1,-43 L-4,-40 L-6,-42 Z" />
          <path d="M-9,-29 L-3,-31 L1,-29 L5,-31 L9,-29 L7,-27 L-7,-27 Z" />
          <path d="M-15,-13 L-8,-15 L0,-13 L8,-15 L15,-13 L13,-11 L-13,-11 Z" />
        </g>
      )}
    </g>
  )
}

export function Oak({ x, y, s = 1, hue = 0, leaves }: { x: number; y: number; s?: number; hue?: number; leaves?: string[] }) {
  const g = (leaves ?? ['#4f7a2e', '#5a8434', '#46702a', '#628a38'])[hue % 4]
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={5} cy={1} rx={17} ry={6} fill="rgba(0,0,0,0.28)" />
      <path d="M-3,0 L-2,-16 L-7,-24 M-2,-16 L4,-26 M2,0 L1,-16" stroke="#5a3a1e" strokeWidth={4} fill="none" strokeLinecap="round" />
      <circle cx={-9} cy={-28} r={11} fill={shade(g, -0.08)} stroke={OUTLINE} strokeWidth={0.8} />
      <circle cx={8} cy={-29} r={12} fill={shade(g, -0.15)} stroke={OUTLINE} strokeWidth={0.8} />
      <circle cx={-1} cy={-38} r={13} fill={g} stroke={OUTLINE} strokeWidth={0.8} />
      <circle cx={-5} cy={-42} r={5} fill={shade(g, 0.25)} opacity={0.7} />
      <circle cx={-12} cy={-31} r={3.4} fill={shade(g, 0.2)} opacity={0.6} />
    </g>
  )
}

export function Rocks({ x, y, gold = false }: { x: number; y: number; gold?: boolean }) {
  const base = gold ? '#8a8172' : '#8d8f8c'
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={2} cy={2} rx={22} ry={8} fill="rgba(0,0,0,0.25)" />
      <path d="M-18,0 L-14,-12 L-4,-16 L2,-8 L-2,2 Z" fill={base} stroke={OUTLINE} strokeWidth={0.8} />
      <path d="M-4,-16 L8,-20 L16,-10 L14,2 L-2,2 L2,-8 Z" fill={shade(base, -0.15)} stroke={OUTLINE} strokeWidth={0.8} />
      <path d="M-14,-12 L-4,-16 L8,-20 L2,-18 Z" fill={shade(base, 0.25)} />
      {gold && (
        <g fill="#f2c94c" stroke="#8a6512" strokeWidth={0.5}>
          <path d="M-10,-6 l3,-3 l3,2 l-2,3z" />
          <path d="M6,-12 l3,-2 l2,3 l-3,2z" />
          <path d="M2,-3 l2,-2 l3,1 l-1,3z" />
          <circle cx={-12} cy={2} r={1.4} />
        </g>
      )}
    </g>
  )
}

export function Bush({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={1} cy={1} rx={10} ry={3.6} fill="rgba(0,0,0,0.25)" />
      <circle cx={-4} cy={-5} r={6} fill="#3f6b2a" stroke={OUTLINE} strokeWidth={0.6} />
      <circle cx={4} cy={-6} r={6.4} fill="#467530" stroke={OUTLINE} strokeWidth={0.6} />
      {[[-5, -7], [2, -9], [5, -4], [-2, -3], [-7, -3]].map(([bx, by], i) => (
        <circle key={i} cx={bx} cy={by} r={1.3} fill="#c0392b" />
      ))}
    </g>
  )
}

export function Deer({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={0.6} rx={9} ry={3} fill="rgba(0,0,0,0.25)" />
      <g className="graze">
        <rect x={-6} y={-9} width={1.6} height={9} fill="#7a4e2a" />
        <rect x={4} y={-9} width={1.6} height={9} fill="#7a4e2a" />
        <ellipse cx={0} cy={-11} rx={8} ry={4} fill="#a8703e" stroke={OUTLINE} strokeWidth={0.6} />
        <path d="M6,-13 L10,-19 L12,-18 L9,-12Z" fill="#a8703e" stroke={OUTLINE} strokeWidth={0.6} />
        <path d="M10,-19 l-1,-4 M11,-19 l2,-4" stroke="#5a3a1e" strokeWidth={0.8} />
      </g>
    </g>
  )
}

export function Palm({ x, y, s = 1, hue = 0 }: { x: number; y: number; s?: number; hue?: number }) {
  const g = ['#5e8a34', '#6a963a', '#557e30', '#729e40'][hue % 4]
  const lean = hue % 2 ? 1 : -1
  return (
    <g transform={`translate(${x} ${y}) scale(${s * lean} ${s})`}>
      <ellipse cx={6} cy={1} rx={16} ry={5} fill="rgba(0,0,0,0.25)" />
      <path d="M-2,0 Q-1,-22 6,-44 L9,-43 Q3,-22 3,0 Z" fill="#8a6238" stroke={OUTLINE} strokeWidth={0.7} />
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${-1 + i * 0.5},${-6 - i * 8} l5,-1.5`} stroke="#5e4022" strokeWidth={1} />)}
      {[[-24, -36], [-18, -52], [4, -58], [24, -50], [26, -34], [-6, -30]].map(([fx, fy], i) => (
        <path key={i} d={`M7,-44 Q${(7 + fx) / 2},${fy - 8} ${fx},${fy}`} stroke={i % 2 ? g : shade(g, -0.15)} strokeWidth={6} fill="none" strokeLinecap="round" />
      ))}
      <circle cx={6} cy={-42} r={2.6} fill="#6b4a26" /><circle cx={9} cy={-41} r={2.4} fill="#6b4a26" />
    </g>
  )
}

export function Cactus({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const c = '#5f8f4a'
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={3} cy={1} rx={11} ry={4} fill="rgba(0,0,0,0.25)" />
      <path d="M-4,0 V-34 Q0,-40 4,-34 V0 Z" fill={c} stroke={OUTLINE} strokeWidth={0.8} />
      <path d="M-4,-16 H-10 V-26 Q-7,-30 -4,-26" fill="none" stroke={c} strokeWidth={5} strokeLinecap="round" />
      <path d="M4,-20 H10 V-30 Q13,-34 16,-30" fill="none" stroke={shade(c, -0.1)} strokeWidth={5} strokeLinecap="round" />
      <path d="M0,-36 V-2" stroke={shade(c, -0.25)} strokeWidth={1} />
      <circle cx={0} cy={-37} r={2} fill="#e85a7a" />
    </g>
  )
}

export function BareTree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={4} cy={1} rx={14} ry={5} fill="rgba(0,0,0,0.22)" />
      <path d="M-2,0 L-1,-22 L-10,-36 M-1,-22 L6,-40 M-1,-14 L8,-24 M6,-40 L12,-46 M6,-40 L2,-50 M-10,-36 L-16,-40" stroke="#4a3220" strokeWidth={3} fill="none" strokeLinecap="round" />
      <path d="M-11,-37 l5,-1 M5,-41 l5,-1 M7,-25 l4,-1" stroke="#f7fbfd" strokeWidth={2} strokeLinecap="round" />
    </g>
  )
}

/** Montagne : massif rocheux, sommet enneigé. */
export function Mountain({ x, y, s = 1, snowy = true }: { x: number; y: number; s?: number; snowy?: boolean }) {
  const rock = '#7d7a76'
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={10} cy={4} rx={120} ry={30} fill="rgba(0,0,0,0.25)" />
      <path d="M-115,0 L-40,-120 L-10,-90 L25,-170 L115,0 Z" fill={rock} stroke={OUTLINE} strokeWidth={1} strokeLinejoin="round" />
      <path d="M25,-170 L115,0 L30,0 L40,-60 Z" fill={shade(rock, -0.22)} />
      <path d="M-40,-120 L-10,-90 L-30,-40 L-60,-60 Z" fill={shade(rock, 0.12)} />
      {snowy && (
        <g fill="#f4f8fa" stroke="#c4d2dc" strokeWidth={0.8}>
          <path d="M25,-170 L48,-126 L36,-132 L28,-118 L18,-134 L8,-128 Z" />
          <path d="M-40,-120 L-28,-101 L-36,-104 L-44,-96 L-50,-104 Z" />
        </g>
      )}
      <path d="M-70,-30 l12,-8 M60,-50 l14,10 M-20,-60 l10,-10" stroke={shade(rock, -0.3)} strokeWidth={1.4} />
    </g>
  )
}

/** Petit voilier sur la mer. */
export function Boat({ x, y, color = '#b8362f' }: { x: number; y: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y})`} className="bob">
      <path d="M-22,-4 L22,-4 L14,6 L-14,6 Z" fill="#6b4a26" stroke={OUTLINE} strokeWidth={0.8} />
      <path d="M0,-4 V-40" stroke="#4a3220" strokeWidth={2} />
      <path d="M2,-38 L22,-10 L2,-10 Z" fill="#f1e2bd" stroke={OUTLINE} strokeWidth={0.6} />
      <path d="M-2,-34 L-18,-10 L-2,-10 Z" fill={color} stroke={OUTLINE} strokeWidth={0.6} />
      <path d="M-28,8 q8,-3 16,0 M14,8 q8,-3 16,0" stroke="#d6efff" strokeWidth={1.4} fill="none" />
    </g>
  )
}
