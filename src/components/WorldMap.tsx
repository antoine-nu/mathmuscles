import { audio } from '../audio/engine'
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  AGES, MAX_LEVEL, ROMAN, levelFromPoints, unitName,
  type Chapter,
} from '../data/curriculum'
import type { HouseState } from '../game/state'
import { useRules } from '../game/rules'
import { garrison } from '../battle/units'
import { seeded, shade } from '../game/color'
import { MAP_SIZE, TILE_H, TILE_W, iso, pts, unIso, type Pt } from '../game/iso'
import { Banner, Building, TownCenter } from './Buildings'
import { Bush, Deer, Oak, Pine, Rocks } from './Scenery'
import { SpriteDefs, UnitSprite, type UnitLook } from './UnitSprite'

const CENTER = MAP_SIZE / 2
const POND: Pt = [1.6, 16.4]
const POND_R = 2.4
const UNIT_SCALE = 1.35

interface Camp {
  chapter: Chapter
  tile: Pt
  progress: HouseState
}

/** Emplacements des camps : une ellipse autour de l'hôtel de ville. */
function campTiles(n: number): Pt[] {
  const [cx, cy] = iso(CENTER, CENTER)
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    const [tx, ty] = unIso(cx + Math.cos(a) * 570, cy + Math.sin(a) * 300)
    return [tx, ty] as Pt
  })
}

/** Au-delà, le camp n'affiche pas toutes ses unités (l'écusson donne l'effectif exact). */
const MAX_CAMP_FIGURES = 20

export function lookFor(chapter: Chapter, progress: HouseState, teamColor?: string): UnitLook {
  const { tier } = garrison(chapter.unit, progress.points)
  return {
    kind: chapter.unit,
    tier,
    color: teamColor ?? chapter.color,
    emblem: chapter.emblem,
    name: unitName(chapter, tier),
    upgrades: progress.upgrades.length,
  }
}

function formation(camp: Camp, teamColor?: string): { pos: Pt; look: UnitLook; key: string }[] {
  const { chapter, tile, progress } = camp
  const look = lookFor(chapter, progress, teamColor)
  const count = Math.min(MAX_CAMP_FIGURES, garrison(chapter.unit, progress.points).units)
  const cav = look.tier > 0 && (chapter.unit === 'knight' || chapter.unit === 'scout')
  const siege = look.tier > 0 && chapter.unit === 'siege'
  const sp = siege ? 1.05 : cav ? 0.72 : 0.5
  const cols = siege ? 3 : cav ? 4 : 5
  return Array.from({ length: count }, (_, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const jitter = ((i * 37) % 7) / 70
    return {
      pos: [tile[0] - 0.3 + col * sp + jitter, tile[1] + 0.55 + row * sp - jitter] as Pt,
      look,
      key: `${chapter.id}-${i}`,
    }
  })
}

// ── Terrain (statique, mémoïsé) ─────────────────────────────────────────
const Terrain = memo(function Terrain({ camps }: { camps: Pt[] }) {
  const rnd = seeded(7)
  const tiles: ReactNode[] = []
  const details: ReactNode[] = []
  const grass = ['#6f9a3c', '#77a142', '#68923a', '#80a84a', '#5f8a36']
  for (let x = 0; x < MAP_SIZE; x++) {
    for (let y = 0; y < MAP_SIZE; y++) {
      const v = Math.sin(x * 0.7) + Math.cos(y * 0.55) + Math.sin((x + y) * 0.33) * 0.8 + rnd() * 0.8
      const c = grass[Math.max(0, Math.min(grass.length - 1, Math.floor((v + 2.4) * 1.05)))]
      const corners: Pt[] = [iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)]
      tiles.push(<polygon key={`t${x}-${y}`} points={pts(corners)} fill={c} stroke={c} strokeWidth={1} />)
      if (rnd() < 0.55) {
        const [sx, sy] = iso(x + rnd(), y + rnd())
        details.push(
          <path key={`g${x}-${y}`} d={`M${sx - 3},${sy} l1.5,-4 M${sx},${sy} l0,-5 M${sx + 3},${sy} l-1.5,-4`} stroke={shade(c, -0.25)} strokeWidth={1} opacity={0.7} />,
        )
      }
      if (rnd() < 0.06) {
        const [sx, sy] = iso(x + rnd(), y + rnd())
        details.push(<circle key={`f${x}-${y}`} cx={sx} cy={sy} r={1.6} fill={rnd() < 0.5 ? '#f3e37c' : '#f4f1ea'} />)
      }
    }
  }

  // bords de la carte : falaise de terre
  const depth = 46
  const L = iso(0, MAP_SIZE), B = iso(MAP_SIZE, MAP_SIZE), R = iso(MAP_SIZE, 0)
  const down = (p: Pt): Pt => [p[0], p[1] + depth]

  // chemins de terre de l'hôtel de ville vers chaque camp
  const [cx, cy] = iso(CENTER, CENTER)
  const paths = camps.map((t, i) => {
    const [tx, ty] = iso(t[0] + 0.4, t[1] + 0.8)
    const mx = (cx + tx) / 2 + (i % 2 ? 30 : -30)
    const my = (cy + ty) / 2 + (i % 2 ? -14 : 14)
    return `M${cx},${cy} Q${mx},${my} ${tx},${ty}`
  })

  // étang
  const [px, py] = iso(POND[0], POND[1])
  const pondRx = POND_R * TILE_W * 0.62
  const pondRy = POND_R * TILE_H * 0.62

  return (
    <g>
      <polygon points={pts([L, B, down(B), down(L)])} fill="#7a5532" stroke="#3a2614" strokeWidth={1} />
      <polygon points={pts([B, R, down(R), down(B)])} fill="#5c3e22" stroke="#3a2614" strokeWidth={1} />
      {[0.33, 0.66].map((t) => (
        <g key={t} stroke="#3a2614" strokeWidth={1} opacity={0.4}>
          <line x1={L[0]} y1={L[1] + depth * t} x2={B[0]} y2={B[1] + depth * t} />
          <line x1={B[0]} y1={B[1] + depth * t} x2={R[0]} y2={R[1] + depth * t} />
        </g>
      ))}
      {tiles}
      <g fill="none" strokeLinecap="round">
        {paths.map((d, i) => <path key={`pd${i}`} d={d} stroke="#9a7a4a" strokeWidth={30} opacity={0.55} />)}
        {paths.map((d, i) => <path key={`pl${i}`} d={d} stroke="#b8955c" strokeWidth={16} opacity={0.6} />)}
      </g>
      <ellipse cx={cx} cy={cy + 10} rx={190} ry={95} fill="#a78656" opacity={0.45} />
      {details}
      <g>
        <ellipse cx={px} cy={py} rx={pondRx + 10} ry={pondRy + 6} fill="#c9b27a" />
        <ellipse cx={px} cy={py} rx={pondRx} ry={pondRy} fill="#3f7fa8" stroke="#2c5f80" strokeWidth={2} />
        <ellipse cx={px - 10} cy={py - 6} rx={pondRx * 0.7} ry={pondRy * 0.6} fill="#5598c0" opacity={0.6} />
        {[0, 1, 2, 3].map((i) => (
          <path key={i} className="shimmer" style={{ animationDelay: `${i * 0.7}s` }} d={`M${px - 50 + i * 28},${py - 20 + i * 12} q8,-4 16,0`} stroke="#d6efff" strokeWidth={1.6} fill="none" />
        ))}
      </g>
    </g>
  )
})

// ── Carte complète ──────────────────────────────────────────────────────
interface Props {
  chapters: Chapter[]
  getProgress: (chapterId: string) => HouseState
  /** Âge atteint (0 à 3) : change l'allure de l'hôtel de ville. */
  age: number
  /** Points d'âge et seuil du prochain âge (pour la jauge de l'hôtel de ville). */
  agePoints: number
  nextAgeAt: number | null
  /** Couleur imposée aux unités (duel : bleu ou rouge). */
  teamColor?: string
  onTownCenter: () => void
  selected: string | null
  onSelect: (id: string) => void
}

export function WorldMap({ chapters, getProgress, selected, onSelect, age, agePoints, nextAgeAt, teamColor, onTownCenter }: Props) {
  const { ppc } = useRules()
  const tiles = useMemo(() => campTiles(chapters.length), [chapters.length])
  const camps: Camp[] = chapters.map((chapter, i) => ({ chapter, tile: tiles[i], progress: getProgress(chapter.id) }))
  const [hover, setHover] = useState<string | null>(null)

  // décor statique : forêts, rochers, buissons, gibier
  const scenery = useMemo(() => {
    const rnd = seeded(42)
    const items: { depth: number; node: ReactNode }[] = []
    const free = (x: number, y: number, margin: number) =>
      tiles.every((t) => Math.hypot(t[0] - x + 0.4, t[1] - y + 0.4) > margin) &&
      Math.hypot(CENTER - x, CENTER - y) > 3.6 &&
      Math.hypot(POND[0] - x, POND[1] - y) > POND_R + 0.4
    for (let i = 0; i < 520; i++) {
      const x = rnd() * MAP_SIZE
      const y = rnd() * MAP_SIZE
      const edge = Math.min(x, y, MAP_SIZE - x, MAP_SIZE - y)
      const backEdge = Math.min(x, y)
      const p = backEdge < 2.2 ? 0.95 : edge < 1.5 ? 0.6 : 0.05
      if (rnd() > p || !free(x, y, 2.7)) continue
      const [sx, sy] = iso(x, y)
      const s = 0.85 + rnd() * 0.4
      const hue = Math.floor(rnd() * 4)
      items.push({ depth: sy, node: rnd() < 0.65 ? <Pine key={`tr${i}`} x={sx} y={sy} s={s} hue={hue} /> : <Oak key={`tr${i}`} x={sx} y={sy} s={s} hue={hue} /> })
    }
    const props: [number, number, 'rock' | 'gold' | 'bush' | 'deer'][] = [
      [13.4, 3.2, 'gold'], [14.2, 4.0, 'gold'], [4.2, 9.6, 'rock'], [15.6, 12.2, 'rock'], [9.6, 15.8, 'bush'],
      [10.4, 16.2, 'bush'], [16.0, 15.6, 'deer'], [15.2, 16.4, 'deer'], [5.0, 16.8, 'bush'],
    ]
    props.forEach(([x, y, kind], i) => {
      if (!free(x, y, 2.2)) return
      const [sx, sy] = iso(x, y)
      const node = kind === 'deer' ? <Deer key={`p${i}`} x={sx} y={sy} />
        : kind === 'bush' ? <Bush key={`p${i}`} x={sx} y={sy} />
          : <Rocks key={`p${i}`} x={sx} y={sy} gold={kind === 'gold'} />
      items.push({ depth: sy, node })
    })
    return items
  }, [tiles])

  // recrues apparues depuis le rendu précédent → animation d'arrivée
  const seenUnits = useRef<Set<string> | null>(null)
  const allKeys: string[] = []
  let freshCount = 0

  // objets triés par profondeur (peintre)
  const objects: { depth: number; node: ReactNode }[] = [...scenery]
  const [tcx, tcy] = iso(CENTER, CENTER)
  objects.push({ depth: tcy + 30, node: <TownCenter key="tc" x={tcx} y={tcy} color={teamColor ?? '#2f5fb3'} age={age} /> })
  for (const camp of camps) {
    const { chapter, tile } = camp
    const [bx, by] = iso(tile[0] - 0.7, tile[1] - 0.9)
    const active = selected === chapter.id || hover === chapter.id
    objects.push({ depth: by + 20, node: <g key={`b-${chapter.id}`} className={active ? 'building active' : 'building'}><Building kind={chapter.building} x={bx} y={by} /></g> })
    const [fx, fy] = iso(tile[0] + 0.75, tile[1] - 1.05)
    objects.push({ depth: fy, node: <Banner key={`f-${chapter.id}`} x={fx} y={fy} color={chapter.color} emblem={chapter.emblem} /> })
    formation(camp, teamColor).forEach(({ pos, look, key }, i) => {
      const [sx, sy] = iso(pos[0], pos[1])
      allKeys.push(key)
      const fresh = seenUnits.current !== null && !seenUnits.current.has(key)
      const delay = fresh ? `${0.3 + 0.35 * freshCount++}s` : undefined
      objects.push({
        depth: sy,
        node: (
          <g key={key} transform={`translate(${sx.toFixed(1)} ${sy.toFixed(1)})`}>
            {fresh && <ellipse className="recruit-ring" style={{ animationDelay: delay }} cx={0} cy={0} rx={20} ry={8} fill="none" stroke="#ffe08a" strokeWidth={3} />}
            <g className={fresh ? 'recruit' : undefined} style={{ animationDelay: delay }}>
              <g className="bob" style={{ animationDelay: `${(i * 0.37) % 2.4}s` }}>
                <g transform={`scale(${UNIT_SCALE})`}><UnitSprite look={look} /></g>
              </g>
            </g>
          </g>
        ),
      })
    })
  }
  objects.sort((a, b) => a.depth - b.depth)
  useEffect(() => {
    seenUnits.current = new Set(allKeys)
  })

  // ── pan & zoom ──
  const L = iso(0, MAP_SIZE)
  const R = iso(MAP_SIZE, 0)
  const base = { x: L[0] - 40, y: -150, w: R[0] - L[0] + 80, h: MAP_SIZE * TILE_H + 230 }
  const [view, setView] = useState({ cx: base.x + base.w / 2, cy: base.y + base.h / 2 - 50, zoom: 1.25 })
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const vw = base.w / view.zoom
  const vh = base.h / view.zoom

  const pxToUnits = () => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r) return 1
    return Math.max(vw / r.width, vh / r.height)
  }

  return (
    <svg
      ref={svgRef}
      className="world"
      viewBox={`${view.cx - vw / 2} ${view.cy - vh / 2} ${vw} ${vh}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy, moved: false }
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d) return
        const dx = e.clientX - d.x
        const dy = e.clientY - d.y
        if (!d.moved && Math.hypot(dx, dy) < 5) return
        if (!d.moved) (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId)
        d.moved = true
        const k = pxToUnits()
        setView((v) => ({ ...v, cx: d.cx - dx * k, cy: d.cy - dy * k }))
      }}
      onPointerUp={() => {
        setTimeout(() => (drag.current = null), 0)
      }}
      onWheel={(e) => {
        const zoom = Math.min(2.6, Math.max(0.8, view.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)))
        setView((v) => ({ ...v, zoom }))
      }}
    >
      <SpriteDefs />
      <defs>
        <filter id="labelShadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx={0} dy={2} stdDeviation={2} floodOpacity={0.5} />
        </filter>
      </defs>
      <Terrain camps={tiles} />

      {/* cercles de sélection sous les formations */}
      {camps.map((camp) => {
        if (selected !== camp.chapter.id && hover !== camp.chapter.id) return null
        const [sx, sy] = iso(camp.tile[0] + 0.55, camp.tile[1] + 0.95)
        return (
          <ellipse key={`sel-${camp.chapter.id}`} cx={sx} cy={sy} rx={TILE_W * 1.35} ry={TILE_H * 1.35}
            fill="rgba(255,255,255,0.08)" stroke="#fff" strokeWidth={2} strokeDasharray={selected === camp.chapter.id ? '0' : '8 6'} opacity={0.85} />
        )
      })}

      {objects.map((o) => o.node)}

      {/* hôtel de ville : clic → âges */}
      <g className="camp-hit" onClick={() => { if (!drag.current?.moved) { audio.ui('open'); onTownCenter() } }}>
        <ellipse cx={tcx} cy={tcy - 40} rx={TILE_W * 1.7} ry={TILE_H * 2.4} fill="transparent" />
        <g transform={`translate(${tcx} ${tcy + 92})`} filter="url(#labelShadow)">
          <rect x={-104} y={-30} width={208} height={50} rx={4} fill="#3a2410" stroke="#f2d27a" strokeWidth={2} opacity={0.95} />
          <text x={0} y={-11} textAnchor="middle" className="lbl-title">Hôtel de ville</text>
          <text x={0} y={5} textAnchor="middle" className="lbl-sub">{AGES[age]}{nextAgeAt !== null ? ` · ${agePoints}/${nextAgeAt} pts` : ' · âge maximal'}</text>
          <rect x={-80} y={10} width={160} height={5} rx={2} fill="#4a3a28" />
          <rect x={-80} y={10} width={160 * (nextAgeAt ? Math.min(1, agePoints / nextAgeAt) : 1)} height={5} rx={2} fill="#e2b43c" />
        </g>
      </g>

      {/* zones cliquables + étiquettes */}
      {camps.map((camp) => {
        const { chapter, tile, progress } = camp
        const level = levelFromPoints(progress.points, ppc)
        const [lx, ly] = iso(tile[0] - 0.7, tile[1] - 0.9)
        const [hx, hy] = iso(tile[0] + 0.2, tile[1] + 0.3)
        const isSel = selected === chapter.id
        return (
          <g key={`lbl-${chapter.id}`} className="camp-hit"
            onPointerEnter={() => setHover(chapter.id)} onPointerLeave={() => setHover(null)}
            onClick={() => { if (!drag.current?.moved) { audio.ui('select'); onSelect(chapter.id) } }}>
            <ellipse cx={hx} cy={hy - 20} rx={TILE_W * 1.6} ry={TILE_H * 2.2} fill="transparent" />
            <CampBadge x={lx + 44} y={ly - 8} level={level} points={progress.points} ppc={ppc} color={chapter.color} units={garrison(chapter.unit, progress.points).units} />
            <g transform={`translate(${lx} ${ly - 112})`} filter="url(#labelShadow)">
              <rect x={-112} y={-36} width={224} height={58} rx={4} fill={isSel ? '#3a2410' : '#2a1a0c'} stroke={isSel ? '#f2d27a' : '#b8913a'} strokeWidth={isSel ? 2.4 : 1.4} opacity={0.94} />
              <text x={0} y={-16} textAnchor="middle" className="lbl-title">{chapter.corpsName}</text>
              <text x={0} y={1} textAnchor="middle" className="lbl-sub">{chapter.title}</text>
              {Array.from({ length: MAX_LEVEL }, (_, i) => {
                const fill = i < level ? 1 : i === level ? (progress.points % ppc) / ppc : 0
                return (
                  <g key={i}>
                    <rect x={-75 + i * 30.4} y={8} width={26} height={8} rx={2} fill="#4a3a28" stroke={i < level ? '#f2d27a' : '#6b5638'} strokeWidth={0.8} />
                    {fill > 0 && <rect x={-75 + i * 30.4} y={8} width={26 * fill} height={8} rx={2} fill={chapter.color} opacity={i < level ? 1 : 0.7} />}
                  </g>
                )
              })}
              {progress.upgrades.length > 0 && (
                <text x={92} y={-14} textAnchor="middle" className="lbl-star">{'★'.repeat(progress.upgrades.length)}</text>
              )}
            </g>
          </g>
        )
      })}
    </svg>
  )
}

/** Écusson posé sur le bâtiment : cran (chiffres romains), anneau de progression vers le cran suivant, effectif. */
function CampBadge({ x, y, level, points, ppc, color, units }: { x: number; y: number; level: number; points: number; ppc: number; color: string; units: number }) {
  const maxed = level >= MAX_LEVEL
  const within = maxed ? 1 : (points % ppc) / ppc
  const r = 15
  const C = 2 * Math.PI * r
  return (
    <g transform={`translate(${x} ${y}) scale(1.4)`} pointerEvents="none">
      <g key={`lvl-${level}`} className="badge-pop">
        <circle r={20} fill="#24150a" stroke={maxed ? '#ffe08a' : '#b8913a'} strokeWidth={2} />
        <circle r={r} fill="none" stroke="#4a3a28" strokeWidth={4} />
        <circle r={r} fill="none" stroke={maxed ? '#e2b43c' : color} strokeWidth={4} strokeDasharray={`${within * C} ${C}`} transform="rotate(-90)" strokeLinecap="butt" />
        <text y={5} textAnchor="middle" className="badge-lvl">{ROMAN[level]}</text>
        <g transform="translate(0 24)">
          <rect x={-24} y={-8} width={48} height={16} rx={8} fill="#24150a" stroke="#b8913a" strokeWidth={1} />
          <text y={4.5} textAnchor="middle" className="badge-count">⚔ {units}</text>
        </g>
      </g>
    </g>
  )
}
