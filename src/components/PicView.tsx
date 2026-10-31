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
    // une case de 60 de large par image ; une collection (boîte 200 × 150) prend une case plus large
    // items ne contient pas la case vide : elle s'insère à la position hole
    const n = pic.items.length + (pic.hole !== undefined ? 1 : 0)
    const hasSet = pic.items.some((p) => p.t === 'set')
    const H = hasSet ? 90 : 60
    const cells: ReactNode[] = []
    let k = 0, x = 0
    for (let i = 0; i < n; i++) {
      if (i === pic.hole) {
        cells.push(<g key={`h${i}`}><rect x={x + 5} y={H / 2 - 25} width={50} height={50} rx={8} fill="#fff8e1" stroke={INK} strokeWidth={2.4} strokeDasharray="7 5" /><text x={x + 30} y={H / 2 + 12} className="pv-mark">?</text></g>)
        x += 60
        continue
      }
      const item = pic.items[k++]
      if (item.t === 'set') {
        cells.push(<g key={i} transform={`translate(${x} 0) scale(${H / 150})`}><Inner pic={item} /></g>)
        x += (200 * H) / 150
      } else {
        // un nombre à deux chiffres prend une case plus large
        const w = item.t === 'digit' && item.n >= 10 ? 84 : 60
        cells.push(<g key={i} transform={`translate(${x + w / 2} ${H / 2}) scale(0.95)`}><Inner pic={item} /></g>)
        x += w
      }
    }
    return <svg className={`pv pv-row ${className ?? ''}`} viewBox={`0 0 ${x} ${H}`} role="img"><g>{cells}</g></svg>
  }
  const vb = VIEW[pic.t] ?? (pic.t === 'word' ? '-40 -32 80 74' : pic.t === 'bar' ? '0 -18 230 36' : pic.t === 'tower' ? '-34 -206 68 210' : pic.t === 'hands' ? (pic.n > 5 ? '-62 -46 124 76' : '-32 -46 64 76') : pic.t === 'frame' ? (pic.n > 10 ? '-84 -68 168 136' : '-84 -34 168 68') : pic.t === 'balance' ? '-86 -76 172 128' : pic.t === 'glass' ? '-34 -46 68 92' : pic.t === 'hole' ? '-44 -40 88 80' : pic.t === 'text' ? `${-Math.max(1, pic.text.length) * 16} -30 ${Math.max(1, pic.text.length) * 32} 60` : '-30 -30 60 60')
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
      const x0 = 6 + (pic.from ?? 0) * 200, w = 24 + pic.len * 130
      return <g><rect x={x0} y={-9} width={w - 18} height={18} rx={3} fill={COLORS[pic.color]} stroke={INK} strokeWidth={2.2} /><path d={`M${x0 + w - 18},-9 L${x0 + w},0 L${x0 + w - 18},9 Z`} fill="#f2dcae" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" /><path d={`M${x0 + w - 5},-2.5 L${x0 + w},0 L${x0 + w - 5},2.5 Z`} fill={INK} /></g>
    }
    case 'tower': {
      const h = pic.size ?? 14
      const w = Math.min(2 * h, 56)
      return <g>{Array.from({ length: pic.n }, (_, i) => <rect key={i} x={-w / 2} y={-h * (i + 1)} width={w} height={h} fill={COLORS[pic.color]} stroke={INK} strokeWidth={2} />)}</g>
    }
    case 'hands': return pic.n <= 5 ? <Hand n={pic.n} /> : <g><g transform="translate(-30 0)"><Hand n={5} /></g><g transform="translate(30 0) scale(-1 1)"><Hand n={pic.n - 5} /></g></g>
    case 'frame': {
      const frames = pic.n > 10 ? 2 : 1
      return (
        <g>
          {Array.from({ length: frames }, (_, f) => (
            <g key={f} transform={`translate(0 ${frames === 1 ? 0 : f === 0 ? -34 : 34})`}>
              <rect x={-80} y={-30} width={160} height={60} rx={6} fill="#fffdf6" stroke={INK} strokeWidth={2.6} />
              {Array.from({ length: 10 }, (_, i) => {
                const x = -64 + (i % 5) * 32, y = i < 5 ? -15 : 15
                const on = f * 10 + i < pic.n
                return <g key={i}><rect x={x - 16} y={y - 15} width={32} height={30} fill="none" stroke={INK} strokeWidth={1.4} />{on && <circle cx={x} cy={y} r={11} fill={COLORS[pic.color]} stroke={INK} strokeWidth={1.8} />}</g>
              })}
            </g>
          ))}
        </g>
      )
    }
    case 'balance': {
      const tilt = pic.heavier === 'left' ? -11 : 11
      const pan = (side: -1 | 1, th: Thing) => {
        const dy = side * Math.sin((tilt * Math.PI) / 180) * 55
        return <g transform={`translate(${side * 55} ${dy})`}><line x1={0} y1={-34} x2={0} y2={-6} stroke={INK} strokeWidth={1.6} /><path d="M-24,-6 L24,-6 L16,4 L-16,4 Z" fill="#c9a24a" stroke={INK} strokeWidth={2} /><g transform="translate(0 -24) scale(0.85)"><ThingGlyph thing={th} /></g></g>
      }
      return <g transform="translate(0 6)"><path d="M-14,40 L14,40 L4,-30 L-4,-30 Z" fill="#8a5a2e" stroke={INK} strokeWidth={2.2} /><g transform={`translate(0 -32) rotate(${tilt})`}><rect x={-62} y={-3} width={124} height={6} rx={3} fill="#a8743f" stroke={INK} strokeWidth={2} /></g><g transform="translate(0 -2)">{pan(-1, pic.left)}{pan(1, pic.right)}</g><circle cx={0} cy={-32} r={4} fill="#e2b43c" stroke={INK} strokeWidth={1.6} /></g>
    }
    case 'glass': {
      const top = -40, bottom = 40, lv = bottom - pic.level * (bottom - top - 6)
      const wAt = (y: number) => 22 + ((bottom - y) / (bottom - top)) * 6
      return <g><path d={`M${-wAt(lv)},${lv} L${wAt(lv)},${lv} L22,${bottom} L-22,${bottom} Z`} fill="#5aa9e6" opacity={0.85} /><path d={`M-28,${top} L-22,${bottom} L22,${bottom} L28,${top}`} fill="none" stroke={INK} strokeWidth={2.8} strokeLinejoin="round" /></g>
    }
    case 'hole': return <g><rect x={-40} y={-36} width={80} height={72} rx={8} fill="#c9935a" stroke={INK} strokeWidth={2.6} /><g transform={`rotate(${pic.rot ?? 0})`}><HoleShape shape={pic.shape} /></g></g>
    case 'scene': return <SceneView rel={pic.rel} thing={pic.thing} />
    case 'mark':
      // « voix » : haut-parleur (la consigne est dite à voix haute)
      if (pic.ch === 'voix') return <g><path d="M-16,-7 L-8,-7 L3,-17 L3,17 L-8,7 L-16,7 Z" fill="#4a3220" stroke={INK} strokeWidth={2} strokeLinejoin="round" /><path d="M9,-9 C14,-4 14,4 9,9 M14,-15 C23,-6 23,6 14,15" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" /></g>
      return <text y={14} className="pv-mark">{pic.ch}</text>
    case 'row': return <PicView pic={pic} />
  }
}

/** Une main : n doigts levés (le pouce d'abord, puis l'index, le majeur…). */
function Hand({ n }: { n: number }) {
  const skin = '#f5c9a0'
  const fingers = [-13, -4.5, 4.5, 13] // index, majeur, annulaire, auriculaire
  return (
    <g transform="translate(0 6)">
      {fingers.map((x, i) => {
        const up = n >= i + 2
        const h = up ? [30, 33, 30, 24][i] : 7
        return <rect key={i} x={x - 4} y={-12 - h} width={8} height={h + 6} rx={4} fill={skin} stroke={INK} strokeWidth={1.8} />
      })}
      <path d="M-18,-12 L18,-12 L17,14 C17,22 -17,22 -17,14 Z" fill={skin} stroke={INK} strokeWidth={2} />
      <g transform={`translate(-17 2) rotate(${n >= 1 ? -50 : -10})`}><rect x={-4} y={n >= 1 ? -24 : -10} width={8} height={n >= 1 ? 26 : 12} rx={4} fill={skin} stroke={INK} strokeWidth={1.8} /></g>
    </g>
  )
}

/** Trou d'encastrement (forme sombre, un peu plus grande que la pièce). */
function HoleShape({ shape }: { shape: Shape }) {
  const p = { fill: '#4a2e14', stroke: '#2b1d10', strokeWidth: 1.6 }
  switch (shape) {
    case 'rond': return <circle r={21} {...p} />
    case 'carre': return <rect x={-19} y={-19} width={38} height={38} {...p} />
    case 'triangle': return <path d="M0,-22 L22,17 L-22,17 Z" {...p} />
    case 'rectangle': return <rect x={-27} y={-14} width={54} height={28} {...p} />
    case 'losange': return <path d="M0,-25 L17,0 L0,25 L-17,0 Z" {...p} />
    case 'ovale': return <ellipse rx={27} ry={16} {...p} />
  }
}
