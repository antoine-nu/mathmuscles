import { FIG_H, FIG_W, type FigPoint, type Figure, type LabelPos } from '../exercises/figure'

const INK = '#3a2410'
const OFFSETS: Record<LabelPos, [number, number]> = {
  n: [0, -10], s: [0, 16], e: [10, 5], w: [-10, 5], ne: [8, -7], nw: [-8, -7], se: [8, 15], sw: [-8, 15],
}
const ANCHOR: Record<LabelPos, 'middle' | 'start' | 'end'> = {
  n: 'middle', s: 'middle', e: 'start', w: 'end', ne: 'start', nw: 'end', se: 'start', sw: 'end',
}

/** Dessin d'une figure de géométrie sur le parchemin (style « tracé à la plume »). */
export function FigureView({ figure }: { figure: Figure }) {
  const w = figure.w ?? FIG_W
  const h = figure.h ?? FIG_H
  const P = figure.points
  const visible = Object.values(P).filter((p) => !p.hidden)
  const cx = visible.reduce((s, p) => s + p.x, 0) / Math.max(1, visible.length)
  const cy = visible.reduce((s, p) => s + p.y, 0) / Math.max(1, visible.length)
  const get = (k: string): FigPoint => P[k] ?? { x: 0, y: 0 }

  const autoPos = (p: FigPoint): LabelPos => {
    const dx = p.x - cx, dy = p.y - cy
    const ang = Math.atan2(dy, dx) // écran : y vers le bas
    const dirs: LabelPos[] = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne']
    const i = Math.round(((ang + 2 * Math.PI) % (2 * Math.PI)) / (Math.PI / 4)) % 8
    return dirs[i]
  }

  return (
    <figure className="geo-figure">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Figure de l'énoncé">
        {figure.polygons?.map((poly, i) => (
          <polygon key={`pg${i}`} points={poly.pts.map((k) => `${get(k).x},${get(k).y}`).join(' ')} fill={poly.fill} opacity={0.35} />
        ))}

        {figure.segments?.map((s, i) => {
          const a = get(s.a), b = get(s.b)
          const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
          const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len
          const e = s.extend ?? 0
          const x1 = a.x - ux * e, y1 = a.y - uy * e, x2 = b.x + ux * e, y2 = b.y + uy * e
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
          // normale orientée vers l'extérieur de la figure
          let nx = -uy, ny = ux
          if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny }
          const color = s.color ?? INK
          return (
            <g key={`sg${i}`}>
              {color !== 'transparent' && (
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeDasharray={s.dashed ? '5 4' : undefined} />
              )}
              {s.mark === 'tick' && <line x1={mx - nx * 5} y1={my - ny * 5} x2={mx + nx * 5} y2={my + ny * 5} stroke={INK} strokeWidth={1.6} />}
              {s.mark === 'tick2' && [-2.5, 2.5].map((d) => (
                <line key={d} x1={mx + ux * d - nx * 5} y1={my + uy * d - ny * 5} x2={mx + ux * d + nx * 5} y2={my + uy * d + ny * 5} stroke={INK} strokeWidth={1.6} />
              ))}
              {(s.mark === 'arrow' || s.mark === 'arrow2') && [0, ...(s.mark === 'arrow2' ? [7] : [])].map((d) => (
                <path key={d} d={`M${mx + ux * (d - 4) - nx * 4},${my + uy * (d - 4) - ny * 4} L${mx + ux * (d + 2)},${my + uy * (d + 2)} L${mx + ux * (d - 4) + nx * 4},${my + uy * (d - 4) + ny * 4}`} fill="none" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
              ))}
              {s.label && (
                <text x={mx + nx * 13} y={my + ny * 13 + 4} textAnchor="middle" className="fig-label">{s.label}</text>
              )}
            </g>
          )
        })}

        {figure.angles?.map((an, i) => {
          const v = get(an.vertex), a = get(an.a), b = get(an.b)
          const r = an.radius ?? 20
          const t1 = Math.atan2(a.y - v.y, a.x - v.x)
          let t2 = Math.atan2(b.y - v.y, b.x - v.x)
          let d = t2 - t1
          while (d > Math.PI) d -= 2 * Math.PI
          while (d < -Math.PI) d += 2 * Math.PI
          t2 = t1 + d
          const mid = t1 + d / 2
          const color = an.color ?? INK
          if (an.right) {
            const s = 11
            const ax = Math.cos(t1) * s, ay = Math.sin(t1) * s, bx = Math.cos(t2) * s, by = Math.sin(t2) * s
            return (
              <g key={`an${i}`}>
                <path d={`M${v.x + ax},${v.y + ay} L${v.x + ax + bx},${v.y + ay + by} L${v.x + bx},${v.y + by}`} fill="none" stroke={color} strokeWidth={1.5} />
                {an.label && <text x={v.x + Math.cos(mid) * (r + 16)} y={v.y + Math.sin(mid) * (r + 16) + 4} textAnchor="middle" className="fig-label" fill={color}>{an.label}</text>}
              </g>
            )
          }
          const p1 = [v.x + Math.cos(t1) * r, v.y + Math.sin(t1) * r]
          const p2 = [v.x + Math.cos(t2) * r, v.y + Math.sin(t2) * r]
          const sweep = d > 0 ? 1 : 0
          return (
            <g key={`an${i}`}>
              <path d={`M${v.x},${v.y} L${p1[0]},${p1[1]} A${r},${r} 0 0 ${sweep} ${p2[0]},${p2[1]} Z`} fill={color} opacity={0.14} />
              <path d={`M${p1[0]},${p1[1]} A${r},${r} 0 0 ${sweep} ${p2[0]},${p2[1]}`} fill="none" stroke={color} strokeWidth={1.6} />
              {an.label && (
                <text x={v.x + Math.cos(mid) * (r + 15)} y={v.y + Math.sin(mid) * (r + 15) + 4} textAnchor="middle" className="fig-label" fill={color}>{an.label}</text>
              )}
            </g>
          )
        })}

        {Object.entries(P).map(([k, p]) => {
          if (p.hidden) return null
          const pos = p.pos ?? autoPos(p)
          const [ox, oy] = OFFSETS[pos]
          const label = p.label ?? k
          return (
            <g key={`pt${k}`}>
              <circle cx={p.x} cy={p.y} r={2.6} fill={INK} />
              {label && <text x={p.x + ox} y={p.y + oy} textAnchor={ANCHOR[pos]} className="fig-point">{label}</text>}
            </g>
          )
        })}

        {figure.notes?.map((n, i) => (
          <text key={`nt${i}`} x={n.x} y={n.y} textAnchor="middle" className="fig-label">{n.text}</text>
        ))}
      </svg>
      <figcaption>{figure.caption ?? 'La figure n’est pas à l’échelle.'}</figcaption>
    </figure>
  )
}
