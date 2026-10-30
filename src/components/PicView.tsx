// Dessin des images de maternelle (objets, formes, chiffres, lettres, scènes) : traits épais, couleurs franches.
import type { ReactNode } from 'react'
import { COLORS, THINGS, type ColorName, type Pic, type Placed, type Relation, type Shape, type Thing } from '../exercises/maternelle/pics'

const INK = '#2b1d10'

/** Un objet dessiné autour de l'origine (environ 40 × 40). */
export function ThingGlyph({ thing, color, silhouette }: { thing: Thing; color?: ColorName; silhouette?: boolean }) {
  const c = (dflt: string) => (silhouette ? '#1d1d1d' : color ? COLORS[color] : dflt)
  const k = silhouette ? '#1d1d1d' : INK
  const sw = 2.2
  switch (thing) {
    case 'pomme':
      return (
        <g>
          <path d="M0,-12 C-14,-22 -22,-6 -18,6 C-15,16 -6,20 0,16 C6,20 15,16 18,6 C22,-6 14,-22 0,-12 Z" fill={c('#e0392b')} stroke={k} strokeWidth={sw} />
          <path d="M0,-12 C0,-17 2,-20 4,-22" stroke={k} strokeWidth={2.4} fill="none" />
          <path d="M4,-19 C10,-24 16,-21 16,-18 C11,-15 7,-16 4,-19 Z" fill={silhouette ? k : '#3a9a3a'} stroke={k} strokeWidth={1.4} />
        </g>
      )
    case 'etoile':
      return <path d="M0,-20 L5.9,-7.4 L19,-6.2 L9,2.8 L11.8,16.2 L0,9.2 L-11.8,16.2 L-9,2.8 L-19,-6.2 L-5.9,-7.4 Z" fill={c('#f2c418')} stroke={k} strokeWidth={sw} strokeLinejoin="round" />
    case 'poisson':
      return (
        <g>
          <path d="M-8,0 C-2,-14 14,-14 20,0 C14,14 -2,14 -8,0 Z" fill={c('#f08a1c')} stroke={k} strokeWidth={sw} />
          <path d="M-8,0 L-20,-11 L-18,0 L-20,11 Z" fill={c('#f08a1c')} stroke={k} strokeWidth={sw} strokeLinejoin="round" />
          {!silhouette && <circle cx={11} cy={-3} r={2.4} fill={k} />}
        </g>
      )
    case 'fleur':
      return (
        <g>
          <path d="M0,4 L0,22" stroke={silhouette ? k : '#2f8a3a'} strokeWidth={3} />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={Math.cos((a * Math.PI) / 180 - Math.PI / 2) * 9} cy={-6 + Math.sin((a * Math.PI) / 180 - Math.PI / 2) * 9} r={7} fill={c('#e85aa8')} stroke={k} strokeWidth={1.8} />
          ))}
          <circle cx={0} cy={-6} r={5.5} fill={silhouette ? k : '#f2c418'} stroke={k} strokeWidth={1.8} />
        </g>
      )
    case 'ballon':
      return (
        <g>
          <ellipse cx={0} cy={-5} rx={14} ry={16} fill={c('#2f6fd6')} stroke={k} strokeWidth={sw} />
          <path d="M-2,11 l2,3 l2,-3 Z" fill={k} />
          <path d="M0,14 C-5,18 5,20 0,24" stroke={k} strokeWidth={1.6} fill="none" />
          {!silhouette && <ellipse cx={-5} cy={-11} rx={3} ry={5} fill="#fff" opacity={0.6} />}
        </g>
      )
    case 'coeur':
      return <path d="M0,18 C-20,4 -22,-8 -16,-14 C-10,-20 -2,-16 0,-9 C2,-16 10,-20 16,-14 C22,-8 20,4 0,18 Z" fill={c('#e0392b')} stroke={k} strokeWidth={sw} strokeLinejoin="round" />
    case 'soleil':
      return (
        <g>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4
            return <line key={i} x1={Math.cos(a) * 13} y1={Math.sin(a) * 13} x2={Math.cos(a) * 21} y2={Math.sin(a) * 21} stroke={silhouette ? k : '#f08a1c'} strokeWidth={3.4} strokeLinecap="round" />
          })}
          <circle r={11} fill={c('#f2c418')} stroke={k} strokeWidth={sw} />
        </g>
      )
    case 'champignon':
      return (
        <g>
          <path d="M-6,2 L-7,18 L7,18 L6,2 Z" fill={silhouette ? k : '#f4ead2'} stroke={k} strokeWidth={sw} />
          <path d="M-20,4 C-20,-14 20,-14 20,4 Z" fill={c('#e0392b')} stroke={k} strokeWidth={sw} />
          {!silhouette && <><circle cx={-9} cy={-4} r={3} fill="#fff" /><circle cx={5} cy={-7} r={2.6} fill="#fff" /><circle cx={11} cy={0} r={2} fill="#fff" /></>}
        </g>
      )
    case 'voiture':
      return (
        <g>
          <path d="M-20,8 L-20,-2 L-12,-4 L-7,-13 L8,-13 L14,-4 L20,-2 L20,8 Z" fill={c('#2fa84f')} stroke={k} strokeWidth={sw} strokeLinejoin="round" />
          {!silhouette && <path d="M-5,-10 L-1,-10 L-1,-4 L-9,-4 Z M2,-10 L7,-10 L11,-4 L2,-4 Z" fill="#cfe8f5" stroke={k} strokeWidth={1.2} />}
          <circle cx={-11} cy={9} r={5.5} fill={k} />
          <circle cx={11} cy={9} r={5.5} fill={k} />
        </g>
      )
    case 'maison':
      return (
        <g>
          <rect x={-15} y={-4} width={30} height={22} fill={c('#f2dcae')} stroke={k} strokeWidth={sw} />
          <path d="M-20,-3 L0,-21 L20,-3 Z" fill={silhouette ? k : '#c0392b'} stroke={k} strokeWidth={sw} strokeLinejoin="round" />
          {!silhouette && <rect x={-4} y={6} width={8} height={12} fill="#8a5a2e" stroke={k} strokeWidth={1.2} />}
        </g>
      )
    case 'arbre':
      return (
        <g>
          <rect x={-4} y={6} width={8} height={15} fill={silhouette ? k : '#8a5a2e'} stroke={k} strokeWidth={1.8} />
          <circle cx={0} cy={-6} r={15} fill={c('#2fa84f')} stroke={k} strokeWidth={sw} />
        </g>
      )
    case 'lune':
      return <path d="M6,-18 C-10,-16 -16,0 -10,10 C-4,19 10,20 17,12 C4,12 -4,2 -2,-8 C-1,-13 2,-16 6,-18 Z" fill={c('#f2c418')} stroke={k} strokeWidth={sw} strokeLinejoin="round" />
  }
}

export function ShapeGlyph({ shape, color, s = 1, rot = 0 }: { shape: Shape; color: ColorName; s?: number; rot?: number }) {
  const fill = COLORS[color]
  const p = { fill, stroke: INK, strokeWidth: 2.6, strokeLinejoin: 'round' as const }
  const body: Record<Shape, ReactNode> = {
    rond: <circle r={20} {...p} />,
    carre: <rect x={-18} y={-18} width={36} height={36} {...p} />,
    triangle: <path d="M0,-21 L21,16 L-21,16 Z" {...p} />,
    rectangle: <rect x={-25} y={-13} width={50} height={26} {...p} />,
    losange: <path d="M0,-23 L16,0 L0,23 L-16,0 Z" {...p} />,
    ovale: <ellipse rx={25} ry={15} {...p} />,
  }
  return <g transform={`rotate(${rot}) scale(${s})`}>{body[shape]}</g>
}

function Placed({ p }: { p: Placed }) {
  return (
    <g transform={`translate(${p.x} ${p.y}) scale(${p.s})`}>
      <g opacity={p.gone ? 0.35 : 1}><ThingGlyph thing={p.thing} color={p.color} /></g>
      {p.gone && <path d="M-18,-18 L18,18 M18,-18 L-18,18" stroke="#d9452b" strokeWidth={5} strokeLinecap="round" />}
    </g>
  )
}

/** Boîte ouverte (scènes « dessus », « dessous », « dedans »…). */
function SceneView({ rel, thing }: { rel: Relation; thing: Thing }) {
  const box = <g><rect x={70} y={70} width={60} height={44} fill="#c9935a" stroke={INK} strokeWidth={2.6} /><path d="M70,70 L80,58 L140,58 L130,70" fill="#e0b27a" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" /><path d="M130,70 L140,58 L140,102 L130,114 Z" fill="#a8743f" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" /></g>
  const table = <g><rect x={58} y={70} width={84} height={9} fill="#a8743f" stroke={INK} strokeWidth={2.4} /><rect x={64} y={79} width={7} height={46} fill="#8a5a2e" stroke={INK} strokeWidth={2} /><rect x={129} y={79} width={7} height={46} fill="#8a5a2e" stroke={INK} strokeWidth={2} /></g>
  const item = (x: number, y: number, s = 0.9) => <g transform={`translate(${x} ${y}) scale(${s})`}><ThingGlyph thing={thing} /></g>
  const ground = <line x1={20} y1={126} x2={180} y2={126} stroke="#7a9a4a" strokeWidth={3} />
  switch (rel) {
    case 'dessus': return <>{ground}{table}{item(100, 50)}</>
    case 'dessous': return <>{ground}{table}{item(100, 106, 0.8)}</>
    case 'a-cote': return <>{ground}{table}{item(165, 106, 0.8)}</>
    case 'dedans': return <>{ground}<g>{item(102, 72, 0.75)}</g>{box}<path d="M70,70 L130,70" stroke={INK} strokeWidth={2.2} /></>
    case 'devant': return <>{ground}{box}{item(96, 104, 0.95)}</>
    case 'derriere': return <>{ground}<g opacity={0.95}>{item(108, 50, 0.8)}</g>{box}</>
  }
}

const VIEW: Record<string, string> = { set: '0 0 200 150', scene: '10 20 180 112', row: '' }

/** Une image, dans son propre cadre SVG. */
export function PicView({ pic, className }: { pic: Pic; className?: string }) {
  if (pic.t === 'row') {
    const n = pic.items.length + (pic.hole === pic.items.length ? 1 : 0)
    const cells: ReactNode[] = []
    let k = 0
    for (let i = 0; i < n; i++) {
      const x = 30 + i * 60
      if (i === pic.hole) {
        cells.push(<g key={`h${i}`}><rect x={x - 25} y={5} width={50} height={50} rx={8} fill="#fff8e1" stroke={INK} strokeWidth={2.4} strokeDasharray="7 5" /><text x={x} y={42} className="pv-mark">?</text></g>)
        if (pic.hole < pic.items.length) k++
        continue
      }
      const item = pic.items[k++]
      cells.push(<g key={i} transform={`translate(${x} 30) scale(0.95)`}><Inner pic={item} /></g>)
    }
    return <svg className={`pv pv-row ${className ?? ''}`} viewBox={`0 0 ${n * 60} 60`} role="img"><g>{cells}</g></svg>
  }
  const vb = VIEW[pic.t] ?? (pic.t === 'word' ? '-40 -32 80 74' : pic.t === 'bar' ? '0 -18 200 36' : pic.t === 'tower' ? '-30 -112 60 116' : pic.t === 'text' ? `${-Math.max(1, pic.text.length) * 16} -30 ${Math.max(1, pic.text.length) * 32} 60` : '-30 -30 60 60')
  return <svg className={`pv pv-${pic.t} ${className ?? ''}`} viewBox={vb} role="img"><Inner pic={pic} /></svg>
}

/** Contenu d'une image (sans le cadre SVG), centré pour les images simples. */
function Inner({ pic }: { pic: Pic }) {
  switch (pic.t) {
    case 'set': return <g>{pic.items.map((p, i) => <Placed key={i} p={p} />)}</g>
    case 'thing': return <g transform={`scale(${(pic.flip ? -1 : 1) * (pic.s ?? 1.2)} ${pic.s ?? 1.2})`}><ThingGlyph thing={pic.thing} color={pic.color} silhouette={pic.silhouette} /></g>
    case 'digit': return <text y={16} className="pv-digit">{pic.n}</text>
    case 'text': return <text y={14} className={`pv-text ${pic.font === 'script' ? 'script' : ''}`}>{pic.text}</text>
    case 'word': return <g><g transform="translate(0 -8) scale(0.85)"><ThingGlyph thing={pic.thing} /></g><text y={34} className="pv-word">{THINGS[pic.thing].word}</text></g>
    case 'shape': return <ShapeGlyph shape={pic.shape} color={pic.color} s={pic.s} rot={pic.rot} />
    case 'dice': {
      const pts: Record<number, [number, number][]> = {
        1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
        5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
      }
      return <g><rect x={-24} y={-24} width={48} height={48} rx={9} fill="#fffdf6" stroke={INK} strokeWidth={2.6} />{pts[pic.n].map(([x, y], i) => <circle key={i} cx={x * 13} cy={y * 13} r={5} fill={INK} />)}</g>
    }
    case 'bar': {
      const w = 30 + pic.len * 160
      return <g><rect x={6} y={-9} width={w - 18} height={18} rx={3} fill={COLORS[pic.color]} stroke={INK} strokeWidth={2.2} /><path d={`M${w - 12},-9 L${w + 6},0 L${w - 12},9 Z`} fill="#f2dcae" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" /><path d={`M${w + 1},-2.5 L${w + 6},0 L${w + 1},2.5 Z`} fill={INK} /></g>
    }
    case 'tower': return <g>{Array.from({ length: pic.n }, (_, i) => <rect key={i} x={-14} y={-14 * (i + 1)} width={28} height={14} fill={COLORS[pic.color]} stroke={INK} strokeWidth={2} />)}</g>
    case 'scene': return <SceneView rel={pic.rel} thing={pic.thing} />
    case 'mark':
      // « voix » : haut-parleur (la consigne est dite à voix haute)
      if (pic.ch === 'voix') return <g><path d="M-16,-7 L-8,-7 L3,-17 L3,17 L-8,7 L-16,7 Z" fill="#4a3220" stroke={INK} strokeWidth={2} strokeLinejoin="round" /><path d="M9,-9 C14,-4 14,4 9,9 M14,-15 C23,-6 23,6 14,15" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" /></g>
      return <text y={14} className="pv-mark">{pic.ch}</text>
    case 'row': return <PicView pic={pic} />
  }
}

/** Pictogramme de consigne : une petite suite d'images (ex. « 🍎🍎🍎 = ? »). */
export function KidIcon({ icon }: { icon: Pic[] }) {
  return (
    <div className="kid-icon" aria-hidden>
      {icon.map((p, i) => <PicView key={i} pic={p} />)}
    </div>
  )
}
