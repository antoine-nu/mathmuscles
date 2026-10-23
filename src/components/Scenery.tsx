import { shade } from '../game/color'

const OUTLINE = '#1c130c'

export function Pine({ x, y, s = 1, hue = 0 }: { x: number; y: number; s?: number; hue?: number }) {
  const g = ['#2f5a2a', '#36652c', '#2a5232', '#3b6b2f'][hue % 4]
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={4} cy={1} rx={14} ry={5} fill="rgba(0,0,0,0.28)" />
      <rect x={-2} y={-10} width={4} height={10} fill="#5a3a1e" stroke={OUTLINE} strokeWidth={0.6} />
      <path d="M0,-54 L13,-28 L7,-29 L17,-12 L-17,-12 L-7,-29 L-13,-28 Z" fill={g} stroke={OUTLINE} strokeWidth={0.8} strokeLinejoin="round" />
      <path d="M0,-54 L13,-28 L7,-29 L17,-12 L2,-12 Z" fill="#000" opacity={0.16} />
      <path d="M0,-54 L-6,-40 L-2,-41 L-8,-30" stroke={shade(g, 0.3)} strokeWidth={1.2} fill="none" opacity={0.7} />
    </g>
  )
}

export function Oak({ x, y, s = 1, hue = 0 }: { x: number; y: number; s?: number; hue?: number }) {
  const g = ['#4f7a2e', '#5a8434', '#46702a', '#628a38'][hue % 4]
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
