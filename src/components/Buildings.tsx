import type { BuildingKind } from '../data/curriculum'
import { shade } from '../game/color'
import { TILE_H, TILE_W, lerp, pts, up, type Pt } from '../game/iso'

const OUTLINE = '#1c130c'

interface BoxProps {
  size: number
  height: number
  wall: string
  roof: string
  roofHeight: number
  roofType: 'gable' | 'pyramid' | 'flat'
  timber?: boolean
  stone?: boolean
}

/** Bâtiment isométrique générique : murs + toit + porte + fenêtres. Origine = centre au sol. */
function IsoBox({ size, height: h, wall, roof, roofHeight, roofType, timber, stone }: BoxProps) {
  const hw = (size * TILE_W) / 2
  const hh = (size * TILE_H) / 2
  const N: Pt = [0, -hh], E: Pt = [hw, 0], S: Pt = [0, hh], W: Pt = [-hw, 0]
  const Nt = up(N, h), Et = up(E, h), St = up(S, h), Wt = up(W, h)
  const leftWall = shade(wall, 0.08)
  const rightWall = shade(wall, -0.22)
  // point sur une façade : t le long de la base, v en hauteur
  const onFace = (a: Pt, b: Pt, t: number, v: number) => up(lerp(a, b, t), v)
  const quad = (a: Pt, b: Pt, t0: number, t1: number, v0: number, v1: number) =>
    pts([onFace(a, b, t0, v0), onFace(a, b, t1, v0), onFace(a, b, t1, v1), onFace(a, b, t0, v1)])

  const courses = stone ? Array.from({ length: Math.floor(h / 7) }, (_, i) => (i + 1) * 7) : []
  const beams = timber ? [0.2, 0.5, 0.8] : []

  // toit
  const over = 1.12
  const o = (p: Pt): Pt => [p[0] * over, (p[1] + h) * over - h]
  const [rN, rE, rS, rW] = [o(Nt), o(Et), o(St), o(Wt)]
  let roofEl = null
  if (roofType === 'gable') {
    const r1 = up(lerp(rW, rN, 0.5), roofHeight)
    const r2 = up(lerp(rS, rE, 0.5), roofHeight)
    roofEl = (
      <g>
        <polygon points={pts([rN, rE, r2, r1])} fill={shade(roof, -0.1)} stroke={OUTLINE} strokeWidth={1} />
        <polygon points={pts([rW, rS, r2, r1])} fill={roof} stroke={OUTLINE} strokeWidth={1} />
        {[0.2, 0.4, 0.6, 0.8].map((t) => (
          <line key={t} x1={lerp(rW, r1, t)[0]} y1={lerp(rW, r1, t)[1]} x2={lerp(rS, r2, t)[0]} y2={lerp(rS, r2, t)[1]} stroke={shade(roof, -0.3)} strokeWidth={0.8} opacity={0.6} />
        ))}
        <polygon points={pts([St, Et, up(lerp(St, Et, 0.5), roofHeight * 0.92)])} fill={shade(wall, -0.3)} stroke={OUTLINE} strokeWidth={1} />
        <line x1={r1[0]} y1={r1[1]} x2={r2[0]} y2={r2[1]} stroke={shade(roof, 0.25)} strokeWidth={2} />
      </g>
    )
  } else if (roofType === 'pyramid') {
    const apex: Pt = [0, -h - roofHeight]
    roofEl = (
      <g>
        <polygon points={pts([rN, rE, apex])} fill={shade(roof, -0.15)} stroke={OUTLINE} strokeWidth={1} />
        <polygon points={pts([rW, rN, apex])} fill={shade(roof, 0.05)} stroke={OUTLINE} strokeWidth={1} />
        <polygon points={pts([rW, rS, apex])} fill={roof} stroke={OUTLINE} strokeWidth={1} />
        <polygon points={pts([rS, rE, apex])} fill={shade(roof, -0.25)} stroke={OUTLINE} strokeWidth={1} />
      </g>
    )
  } else {
    roofEl = (
      <g>
        <polygon points={pts([Nt, Et, St, Wt])} fill={shade(wall, 0.15)} stroke={OUTLINE} strokeWidth={1} />
        {/* créneaux */}
        {[0.1, 0.3, 0.5, 0.7, 0.9].map((t) => (
          <g key={t}>
            <polygon points={quad(W, S, t - 0.06, t + 0.06, h, h + 6)} fill={leftWall} stroke={OUTLINE} strokeWidth={0.8} />
            <polygon points={quad(S, E, t - 0.06, t + 0.06, h, h + 6)} fill={rightWall} stroke={OUTLINE} strokeWidth={0.8} />
          </g>
        ))}
      </g>
    )
  }

  return (
    <g>
      <polygon points={pts([lerp(W, [0, 0], -0.08), lerp(S, [0, 0], -0.08), lerp(E, [0, 0], -0.08), lerp(N, [0, 0], -0.08)])} fill="rgba(0,0,0,0.25)" />
      <polygon points={pts([W, S, St, Wt])} fill={leftWall} stroke={OUTLINE} strokeWidth={1} />
      <polygon points={pts([S, E, Et, St])} fill={rightWall} stroke={OUTLINE} strokeWidth={1} />
      {courses.map((v) => (
        <g key={v} opacity={0.35}>
          <line x1={onFace(W, S, 0, v)[0]} y1={onFace(W, S, 0, v)[1]} x2={onFace(W, S, 1, v)[0]} y2={onFace(W, S, 1, v)[1]} stroke={OUTLINE} strokeWidth={0.6} />
          <line x1={onFace(S, E, 0, v)[0]} y1={onFace(S, E, 0, v)[1]} x2={onFace(S, E, 1, v)[0]} y2={onFace(S, E, 1, v)[1]} stroke={OUTLINE} strokeWidth={0.6} />
        </g>
      ))}
      {beams.map((t) => (
        <g key={t}>
          <polygon points={quad(W, S, t - 0.025, t + 0.025, 0, h)} fill={shade(wall, -0.55)} />
          <polygon points={quad(S, E, t - 0.025, t + 0.025, 0, h)} fill={shade(wall, -0.6)} />
        </g>
      ))}
      {timber && (
        <g>
          <polygon points={quad(W, S, 0, 1, h * 0.5, h * 0.55)} fill={shade(wall, -0.55)} />
          <polygon points={quad(S, E, 0, 1, h * 0.5, h * 0.55)} fill={shade(wall, -0.6)} />
        </g>
      )}
      {/* porte (façade droite) + fenêtres */}
      <polygon points={quad(S, E, 0.38, 0.62, 0, Math.min(h * 0.62, 26))} fill="#2a1a0e" stroke={OUTLINE} strokeWidth={0.8} />
      <polygon points={quad(S, E, 0.4, 0.6, 0, Math.min(h * 0.55, 23))} fill="#5b3a1e" />
      {h > 28 && (
        <g fill="#20140b">
          <polygon points={quad(W, S, 0.25, 0.35, h * 0.55, h * 0.78)} />
          <polygon points={quad(W, S, 0.65, 0.75, h * 0.55, h * 0.78)} />
          <polygon points={quad(S, E, 0.1, 0.2, h * 0.55, h * 0.78)} />
          <polygon points={quad(S, E, 0.8, 0.9, h * 0.55, h * 0.78)} />
        </g>
      )}
      {roofEl}
    </g>
  )
}

export function Banner({ x, y, color, emblem, height = 58 }: { x: number; y: number; color: string; emblem: string; height?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={0} rx={6} ry={2.4} fill="rgba(0,0,0,0.3)" />
      <line x1={0} y1={0} x2={0} y2={-height} stroke={OUTLINE} strokeWidth={3} />
      <line x1={0} y1={0} x2={0} y2={-height} stroke="#8a5a2e" strokeWidth={1.8} />
      <circle cx={0} cy={-height - 1.6} r={2.6} fill="#e2b43c" stroke={OUTLINE} strokeWidth={0.6} />
      <g className="flag-wave" style={{ transformOrigin: `0px ${-height}px` }}>
        <path d={`M1,${-height + 2} L27,${-height + 2} L24,${-height + 13} L27,${-height + 24} L1,${-height + 24} Z`} fill={color} stroke={OUTLINE} strokeWidth={0.9} />
        <path d={`M1,${-height + 2} L27,${-height + 2} L26,${-height + 5} L1,${-height + 5} Z`} fill="#e2b43c" />
        <text x={12} y={-height + 19.6} fontSize={emblem.length > 1 ? 9 : 13} fontFamily="Cinzel, Georgia, serif" fontWeight={900} textAnchor="middle" fill="#f6ecd2" stroke={OUTLINE} strokeWidth={0.4}>
          {emblem}
        </text>
      </g>
    </g>
  )
}

function ArcheryTarget({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <line x1={-5} y1={0} x2={-2} y2={-16} stroke="#5a3a1e" strokeWidth={1.6} />
      <line x1={5} y1={0} x2={2} y2={-16} stroke="#5a3a1e" strokeWidth={1.6} />
      <circle cx={0} cy={-16} r={8} fill="#e9dcb4" stroke={OUTLINE} strokeWidth={0.8} />
      <circle cx={0} cy={-16} r={5.4} fill="#b8362f" />
      <circle cx={0} cy={-16} r={3} fill="#e9dcb4" />
      <circle cx={0} cy={-16} r={1.3} fill="#b8362f" />
      <line x1={2} y1={-17} x2={9} y2={-19} stroke="#4a3220" strokeWidth={0.8} />
    </g>
  )
}

function HayBale({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={1} rx={9} ry={3.4} fill="rgba(0,0,0,0.25)" />
      <path d="M-8,0 L-8,-7 Q0,-11 8,-7 L8,0 Q0,3 -8,0Z" fill="#d9b44a" stroke={OUTLINE} strokeWidth={0.8} />
      <path d="M-8,-7 Q0,-3 8,-7" stroke="#a8832a" fill="none" strokeWidth={0.8} />
      <path d="M-3,-9 v9 M3,-9 v9" stroke="#a8832a" strokeWidth={0.6} />
    </g>
  )
}

function WeaponRack({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <line x1={-8} y1={0} x2={-8} y2={-14} stroke="#5a3a1e" strokeWidth={1.8} />
      <line x1={8} y1={0} x2={8} y2={-14} stroke="#5a3a1e" strokeWidth={1.8} />
      <line x1={-9} y1={-11} x2={9} y2={-11} stroke="#5a3a1e" strokeWidth={1.6} />
      {[-5, -1, 3, 6].map((sx) => (
        <line key={sx} x1={sx} y1={-1} x2={sx + 2} y2={-24} stroke="#c9d0d6" strokeWidth={1} />
      ))}
    </g>
  )
}

function Scrolls({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-9} y={-8} width={18} height={8} fill="#6b4524" stroke={OUTLINE} strokeWidth={0.8} />
      <rect x={-7} y={-12} width={14} height={4} rx={2} fill="#efe2bd" stroke={OUTLINE} strokeWidth={0.6} />
      <circle cx={8} cy={-14} r={2.4} fill="#efe2bd" stroke={OUTLINE} strokeWidth={0.6} />
    </g>
  )
}

const CONFIG: Record<BuildingKind, BoxProps> = {
  barracks: { size: 1.7, height: 30, wall: '#9b8f80', roof: '#9a3a2a', roofHeight: 26, roofType: 'gable', stone: true },
  range: { size: 1.6, height: 26, wall: '#b08a5a', roof: '#4f6b3a', roofHeight: 24, roofType: 'gable', timber: true },
  stable: { size: 1.8, height: 26, wall: '#a87a4c', roof: '#7a5a34', roofHeight: 22, roofType: 'gable', timber: true },
  workshop: { size: 1.7, height: 30, wall: '#8a6a44', roof: '#5a4a3a', roofHeight: 28, roofType: 'pyramid', timber: true },
  monastery: { size: 1.6, height: 38, wall: '#cfc3a6', roof: '#3a5a8a', roofHeight: 34, roofType: 'pyramid', stone: true },
}

export function Building({ kind, x, y }: { kind: BuildingKind; x: number; y: number }) {
  const cfg = CONFIG[kind]
  const hw = (cfg.size * TILE_W) / 2
  const hh = (cfg.size * TILE_H) / 2
  return (
    <g transform={`translate(${x} ${y})`}>
      {kind === 'monastery' && (
        // clocher à l'arrière du monastère
        <g transform={`translate(${hw * 0.15} ${-hh * 0.55})`}>
          <IsoBox size={0.62} height={74} wall="#d8cdb2" roof="#6b3f24" roofHeight={30} roofType="pyramid" stone />
          <rect x={-5} y={-66} width={10} height={12} rx={5} fill="#2a1a0e" />
          <circle cx={0} cy={-58} r={3.2} fill="#e2b43c" stroke={OUTLINE} strokeWidth={0.6} />
        </g>
      )}
      <IsoBox {...cfg} />
      {kind === 'range' && <ArcheryTarget x={-hw - 4} y={10} />}
      {kind === 'stable' && <><HayBale x={-hw + 2} y={14} /><HayBale x={-hw + 18} y={22} /></>}
      {kind === 'barracks' && <WeaponRack x={-hw + 4} y={16} />}
      {kind === 'monastery' && <Scrolls x={-hw + 8} y={18} />}
      {kind === 'workshop' && <g transform={`translate(${-hw + 6} 16)`}><rect x={-10} y={-6} width={20} height={6} fill="#6e4a26" stroke={OUTLINE} strokeWidth={0.7} /><rect x={-8} y={-10} width={16} height={4} fill="#8a5a2e" stroke={OUTLINE} strokeWidth={0.7} /></g>}
    </g>
  )
}

/** Hôtel de ville : son allure change avec l'âge (bois → pierre → tours → toits d'or). */
export function TownCenter({ x, y, color, age = 1 }: { x: number; y: number; color: string; age?: number }) {
  const tower = (tx: number, ty: number, roof: string) => (
    <g transform={`translate(${tx} ${ty})`}>
      <IsoBox size={0.7} height={78} wall="#b3a68f" roof={roof} roofHeight={34} roofType="pyramid" stone />
      <Banner x={0} y={-112} color={color} emblem="∑" height={22} />
    </g>
  )
  if (age === 0) {
    return (
      <g transform={`translate(${x} ${y})`}>
        <IsoBox size={2.5} height={34} wall="#9a7448" roof="#b8933f" roofHeight={52} roofType="pyramid" timber />
        <Banner x={0} y={-86} color={color} emblem="∑" height={30} />
        <g className="smoke">
          <circle cx={30} cy={-60} r={5} fill="#d9d4cc" opacity={0.55} />
          <circle cx={34} cy={-72} r={7} fill="#d9d4cc" opacity={0.4} />
          <circle cx={30} cy={-86} r={9} fill="#d9d4cc" opacity={0.25} />
        </g>
      </g>
    )
  }
  const roof = age >= 3 ? '#e2b43c' : '#8e3a2a'
  const towerRoof = age >= 3 ? '#e2b43c' : '#3a5a8a'
  return (
    <g transform={`translate(${x} ${y})`}>
      {age >= 2 && tower(0, -62, towerRoof)}
      {age >= 3 && <ellipse cx={0} cy={-60} rx={150} ry={80} fill="#ffe08a" opacity={0.12} className="glow" />}
      <IsoBox size={2.8} height={40} wall="#a99b86" roof="#7d3326" roofHeight={0} roofType="flat" stone />
      {age >= 2 && tower(-122, 2, towerRoof)}
      {age >= 2 && tower(122, 2, towerRoof)}
      <g transform="translate(0 -40)">
        <IsoBox size={1.4} height={42} wall="#b8ab95" roof={roof} roofHeight={46} roofType="pyramid" stone />
      </g>
      <Banner x={0} y={-128} color={color} emblem="∑" height={34} />
      <g className="smoke">
        <circle cx={44} cy={-74} r={5} fill="#d9d4cc" opacity={0.55} />
        <circle cx={48} cy={-86} r={7} fill="#d9d4cc" opacity={0.4} />
        <circle cx={44} cy={-100} r={9} fill="#d9d4cc" opacity={0.25} />
      </g>
      <rect x={38} y={-70} width={8} height={18} fill="#6e655a" stroke={OUTLINE} strokeWidth={0.8} />
    </g>
  )
}
