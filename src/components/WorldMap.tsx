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
import { BareTree, Boat, Bush, Cactus, Deer, Mountain, Oak, Palm, Pine, Rocks } from './Scenery'
import { themeOf, type MapTheme, type ThemeId } from '../game/themes'
import { SpriteDefs, UnitSprite, type UnitLook } from './UnitSprite'

// Le village occupe toujours MAP_SIZE × MAP_SIZE tuiles ; la carte, plus grande, l'entoure d'un décor
// propre au thème (forêts, mer, montagnes…).
const WORLD = 32
const OFF = (WORLD - MAP_SIZE) / 2
const CENTER = WORLD / 2
const POND: Pt = [1.6 + OFF, 16.4 + OFF]
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
/** Côté gauche de l'écran (y − x grand) : plage puis mer ; côté droit (x − y grand) : montagnes. */
const BEACH_AT = 13
const SEA_AT = 14.6
const ROCK_AT = 13.6
/** Ondulation des limites (côte, pied des montagnes), le long de la diagonale x + y. */
const wave = (x: number, y: number, phase: number) => 1.1 * Math.sin((x + y) * 0.42 + phase) + 0.5 * Math.sin((x + y) * 1.07 + phase * 2)
const isSea = (t: MapTheme, x: number, y: number) => t.sea && y - x + wave(x, y, 0) > SEA_AT
const isBeach = (t: MapTheme, x: number, y: number) => t.sea && y - x + wave(x, y, 0) > BEACH_AT
const isRock = (t: MapTheme, x: number, y: number) => t.mountains && x - y + wave(x, y, 2) > ROCK_AT
const hasPond = (t: MapTheme) => !t.sea

const Terrain = memo(function Terrain({ camps, theme }: { camps: Pt[]; theme: MapTheme }) {
  const rnd = seeded(7)
  const tiles: ReactNode[] = []
  const details: ReactNode[] = []
  const g = theme.ground
  const sea = ['#2f6f98', '#33769f', '#2c6890', '#3a7ea6']
  const rock = theme.id === 'hiver' ? ['#c3ccd3', '#b6c0c8', '#cfd7dd'] : ['#8d8a80', '#837f76', '#979387']
  for (let x = 0; x < WORLD; x++) {
    for (let y = 0; y < WORLD; y++) {
      const v = Math.sin(x * 0.7) + Math.cos(y * 0.55) + Math.sin((x + y) * 0.33) * 0.8 + rnd() * 0.8
      const cx = x + 0.5, cy = y + 0.5
      let c = g[Math.max(0, Math.min(g.length - 1, Math.floor((v + 2.4) * 1.05)))]
      const water = isSea(theme, cx, cy)
      if (water) c = sea[Math.floor(rnd() * sea.length)]
      else if (isBeach(theme, cx, cy)) c = rnd() < 0.5 ? '#dcc790' : '#d4bd84'
      else if (isRock(theme, cx, cy)) c = rock[Math.floor(rnd() * rock.length)]
      const corners: Pt[] = [iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)]
      tiles.push(<polygon key={`t${x}-${y}`} points={pts(corners)} fill={c} stroke={c} strokeWidth={1} />)
      const [sx, sy] = iso(x + rnd(), y + rnd())
      if (water) {
        if (rnd() < 0.3) details.push(<path key={`w${x}-${y}`} className="shimmer" style={{ animationDelay: `${(x * 7 + y * 3) % 30 / 10}s` }} d={`M${sx - 9},${sy} q5,-4 9,0 q5,-4 9,0`} stroke="#bfe3f7" strokeWidth={1.4} fill="none" />)
        continue
      }
      if (theme.blades && rnd() < 0.55) {
        details.push(<path key={`g${x}-${y}`} d={`M${sx - 3},${sy} l1.5,-4 M${sx},${sy} l0,-5 M${sx + 3},${sy} l-1.5,-4`} stroke={shade(c, -0.25)} strokeWidth={1} opacity={0.7} />)
      } else if (theme.id === 'desert' && rnd() < 0.35) {
        details.push(<path key={`d${x}-${y}`} d={`M${sx - 12},${sy} q6,-3 12,0 t12,0`} stroke={shade(c, -0.12)} strokeWidth={1.2} fill="none" opacity={0.7} />)
      }
      if (theme.specks.length && rnd() < 0.07) {
        const [fx, fy] = iso(x + rnd(), y + rnd())
        details.push(<circle key={`f${x}-${y}`} cx={fx} cy={fy} r={1.6} fill={theme.specks[Math.floor(rnd() * theme.specks.length)]} />)
      }
    }
  }

  // bords de la carte : falaise de terre
  const depth = 46
  const L = iso(0, WORLD), B = iso(WORLD, WORLD), R = iso(WORLD, 0)
  const down = (p: Pt): Pt => [p[0], p[1] + depth]

  // chemins de terre de l'hôtel de ville vers chaque camp
  const [cx, cy] = iso(CENTER, CENTER)
  const paths = camps.map((t, i) => {
    const [tx, ty] = iso(t[0] + 0.4, t[1] + 0.8)
    const mx = (cx + tx) / 2 + (i % 2 ? 30 : -30)
    const my = (cy + ty) / 2 + (i % 2 ? -14 : 14)
    return `M${cx},${cy} Q${mx},${my} ${tx},${ty}`
  })

  // étang (oasis dans le désert, lac gelé en hiver)
  const [px, py] = iso(POND[0], POND[1])
  const pondRx = POND_R * TILE_W * 0.62
  const pondRy = POND_R * TILE_H * 0.62
  const w = theme.water

  return (
    <g>
      <polygon points={pts([L, B, down(B), down(L)])} fill={theme.cliff[0]} stroke="#3a2614" strokeWidth={1} />
      <polygon points={pts([B, R, down(R), down(B)])} fill={theme.cliff[1]} stroke="#3a2614" strokeWidth={1} />
      {[0.33, 0.66].map((t) => (
        <g key={t} stroke="#3a2614" strokeWidth={1} opacity={0.4}>
          <line x1={L[0]} y1={L[1] + depth * t} x2={B[0]} y2={B[1] + depth * t} />
          <line x1={B[0]} y1={B[1] + depth * t} x2={R[0]} y2={R[1] + depth * t} />
        </g>
      ))}
      {tiles}
      <g fill="none" strokeLinecap="round">
        {paths.map((d, i) => <path key={`pd${i}`} d={d} stroke={theme.path[0]} strokeWidth={30} opacity={0.55} />)}
        {paths.map((d, i) => <path key={`pl${i}`} d={d} stroke={theme.path[1]} strokeWidth={16} opacity={0.6} />)}
      </g>
      <ellipse cx={cx} cy={cy + 10} rx={190} ry={95} fill={theme.plaza} opacity={0.45} />
      {details}
      {hasPond(theme) && (
        <g>
          <ellipse cx={px} cy={py} rx={pondRx + 10} ry={pondRy + 6} fill={w.rim} />
          <ellipse cx={px} cy={py} rx={pondRx} ry={pondRy} fill={w.deep} stroke={shade(w.deep, -0.2)} strokeWidth={2} />
          <ellipse cx={px - 10} cy={py - 6} rx={pondRx * 0.7} ry={pondRy * 0.6} fill={w.light} opacity={0.6} />
          {w.frozen
            ? <path d={`M${px - 60},${py - 4} l30,8 l18,-12 l26,10 M${px - 20},${py + 14} l16,-10 l22,4`} stroke="#ffffff" strokeWidth={1.4} fill="none" opacity={0.8} />
            : [0, 1, 2, 3].map((i) => (
              <path key={i} className="shimmer" style={{ animationDelay: `${i * 0.7}s` }} d={`M${px - 50 + i * 28},${py - 20 + i * 12} q8,-4 16,0`} stroke="#d6efff" strokeWidth={1.6} fill="none" />
            ))}
        </g>
      )}
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
  /** Décor de la carte (plaine par défaut). */
  themeId?: ThemeId
}

export function WorldMap({ chapters, getProgress, selected, onSelect, age, agePoints, nextAgeAt, teamColor, onTownCenter, themeId }: Props) {
  const { ppc } = useRules()
  const theme = themeOf(themeId)
  const tiles = useMemo(() => campTiles(chapters.length), [chapters.length])
  const camps: Camp[] = chapters.map((chapter, i) => ({ chapter, tile: tiles[i], progress: getProgress(chapter.id) }))
  const [hover, setHover] = useState<string | null>(null)

  // décor statique : forêts autour du village, montagnes, bateaux, rochers, buissons, gibier
  const scenery = useMemo(() => {
    const rnd = seeded(42)
    const items: { depth: number; node: ReactNode }[] = []
    const free = (x: number, y: number, margin: number) =>
      tiles.every((t) => Math.hypot(t[0] - x + 0.4, t[1] - y + 0.4) > margin) &&
      Math.hypot(CENTER - x, CENTER - y) > 3.6 &&
      (!hasPond(theme) || Math.hypot(POND[0] - x, POND[1] - y) > POND_R + 0.4)
    const totalWeight = theme.trees.reduce((n, [, w]) => n + w, 0)
    const tree = (i: number, sx: number, sy: number) => {
      const s = 0.85 + rnd() * 0.4
      const hue = Math.floor(rnd() * 4)
      let r = rnd() * totalWeight
      const kind = theme.trees.find(([, w]) => (r -= w) < 0)?.[0] ?? theme.trees[0][0]
      const key = `tr${i}`
      if (kind === 'pine') return <Pine key={key} x={sx} y={sy} s={s} hue={hue} snow={theme.snow} leaves={theme.id === 'plaine' ? undefined : theme.leaves.map((c) => shade(c, -0.25))} />
      if (kind === 'oak') return <Oak key={key} x={sx} y={sy} s={s} hue={hue} leaves={theme.leaves} />
      if (kind === 'palm') return <Palm key={key} x={sx} y={sy} s={s} hue={hue} />
      if (kind === 'cactus') return <Cactus key={key} x={sx} y={sy} s={s * 0.9} />
      return <BareTree key={key} x={sx} y={sy} s={s} />
    }
    const sparse = theme.id === 'desert'
    for (let i = 0; i < 1500; i++) {
      const x = rnd() * WORLD
      const y = rnd() * WORLD
      if (isBeach(theme, x, y)) continue
      // hors du village : forêt (clairsemée dans le désert et sur les pentes) ; dans le village, quelques arbres
      const out = Math.max(Math.abs(x - CENTER), Math.abs(y - CENTER))
      const backEdge = Math.min(x, y)
      let p = out > MAP_SIZE / 2 ? 0.42 : out > MAP_SIZE / 2 - 1.5 ? 0.35 : 0.04
      if (backEdge < 2) p = 0.9
      if (isRock(theme, x, y)) p *= 0.25
      if (sparse) p *= 0.35
      if (rnd() > p || !free(x, y, 2.7)) continue
      const [sx, sy] = iso(x, y)
      items.push({ depth: sy, node: tree(i, sx, sy) })
    }
    // montagnes alignées le long du bord droit
    if (theme.mountains) {
      let n = 0
      for (let t = 3; t < 2 * WORLD - 3; t += 3.4) {
        for (const k of [16.5, 21, 25.5]) {
          const kk = k + (rnd() - 0.5) * 1.6
          const x = (t + kk) / 2, y = (t - kk) / 2
          if (x < 1 || y < 1 || x > WORLD - 1 || y > WORLD - 1) continue
          const [sx, sy] = iso(x, y)
          items.push({ depth: sy, node: <Mountain key={`m${n++}`} x={sx} y={sy} s={0.75 + rnd() * 0.55} snowy={theme.id === 'hiver' || rnd() < 0.7} /> })
        }
      }
    }
    // bateaux sur la mer
    if (theme.sea) {
      ;[[CENTER - 9, CENTER + 10], [CENTER - 5, CENTER + 13.5], [CENTER - 12, CENTER + 6.5]].forEach(([x, y], i) => {
        if (!isSea(theme, x, y)) return
        const [sx, sy] = iso(x, y)
        items.push({ depth: sy, node: <Boat key={`boat${i}`} x={sx} y={sy} color={['#b8362f', '#2f5fb3', '#d9b45a'][i]} /> })
      })
    }
    const props: [number, number, 'rock' | 'gold' | 'bush' | 'deer'][] = [
      [13.4, 3.2, 'gold'], [14.2, 4.0, 'gold'], [4.2, 9.6, 'rock'], [15.6, 12.2, 'rock'], [9.6, 15.8, 'bush'],
      [10.4, 16.2, 'bush'], [16.0, 15.6, 'deer'], [15.2, 16.4, 'deer'], [5.0, 16.8, 'bush'],
    ]
    props.forEach(([vx, vy, kind], i) => {
      const x = vx + OFF, y = vy + OFF
      if (!free(x, y, 2.2) || isBeach(theme, x, y)) return
      if ((kind === 'bush' && !theme.bushes) || (kind === 'deer' && !theme.deer)) return
      const [sx, sy] = iso(x, y)
      const node = kind === 'deer' ? <Deer key={`p${i}`} x={sx} y={sy} />
        : kind === 'bush' ? <Bush key={`p${i}`} x={sx} y={sy} />
          : <Rocks key={`p${i}`} x={sx} y={sy} gold={kind === 'gold'} />
      items.push({ depth: sy, node })
    })
    return items
  }, [tiles, theme])

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
  // cadrage initial sur le village (même taille qu'avant) ; on peut dézoomer pour voir les environs
  const L = iso(OFF, OFF + MAP_SIZE)
  const R = iso(OFF + MAP_SIZE, OFF)
  const base = { x: L[0] - 40, y: OFF * TILE_H - 150, w: R[0] - L[0] + 80, h: MAP_SIZE * TILE_H + 230 }
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
      style={{ background: theme.backdrop }}
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
        const zoom = Math.min(2.6, Math.max(0.55, view.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)))
        setView((v) => ({ ...v, zoom }))
      }}
    >
      <SpriteDefs />
      <defs>
        <filter id="labelShadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx={0} dy={2} stdDeviation={2} floodOpacity={0.5} />
        </filter>
      </defs>
      <Terrain camps={tiles} theme={theme} />

      {/* cercles de sélection sous les formations */}
      {camps.map((camp) => {
        if (selected !== camp.chapter.id && hover !== camp.chapter.id) return null
        const [sx, sy] = iso(camp.tile[0] + 0.55, camp.tile[1] + 0.95)
        if (selected !== camp.chapter.id) {
          return <ellipse key={`sel-${camp.chapter.id}`} cx={sx} cy={sy} rx={TILE_W * 1.35} ry={TILE_H * 1.35} fill="rgba(255,255,255,0.08)" stroke="#fff" strokeWidth={2} strokeDasharray="8 6" opacity={0.85} />
        }
        // maison choisie : large anneau doré qui pulse, bien visible sur tous les décors
        return (
          <g key={`sel-${camp.chapter.id}`} className="sel-ring">
            <ellipse cx={sx} cy={sy} rx={TILE_W * 1.45} ry={TILE_H * 1.45} fill="rgba(255, 214, 74, 0.22)" stroke="#1c130c" strokeWidth={9} opacity={0.55} />
            <ellipse className="sel-glow" cx={sx} cy={sy} rx={TILE_W * 1.45} ry={TILE_H * 1.45} fill="none" stroke="#ffd54a" strokeWidth={6} />
            <ellipse cx={sx} cy={sy} rx={TILE_W * 1.2} ry={TILE_H * 1.2} fill="none" stroke="#fff3b0" strokeWidth={2} strokeDasharray="10 8" />
          </g>
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
              {isSel && <path className="sel-arrow" d="M-16,-62 L16,-62 L0,-42 Z" fill="#ffd54a" stroke="#1c130c" strokeWidth={2.5} strokeLinejoin="round" />}
              <rect x={-112} y={-36} width={224} height={58} rx={4} fill={isSel ? '#5a3a14' : '#2a1a0c'} stroke={isSel ? '#ffd54a' : '#b8913a'} strokeWidth={isSel ? 4.5 : 1.4} opacity={isSel ? 1 : 0.94} />
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

/** Écusson posé sur le bâtiment : effectif au centre, anneau de progression dans le cran en cours, cran en dessous. */
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
        <text y={units > 99 ? 4 : 5} textAnchor="middle" className={`badge-lvl ${units > 99 ? 'small' : ''}`}>{units}</text>
        <g transform="translate(0 24)">
          <rect x={-26} y={-8} width={52} height={16} rx={8} fill="#24150a" stroke="#b8913a" strokeWidth={1} />
          <text y={4.5} textAnchor="middle" className="badge-count">{maxed ? '★ complet' : `cran ${ROMAN[level + 1]}`}</text>
        </g>
      </g>
    </g>
  )
}
