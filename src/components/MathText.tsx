import type { ReactNode } from 'react'

/** Affiche la mini-syntaxe des énoncés : {a/b} fraction, ^n exposant, √{…} racine, x_B indice. */
export function MathText({ text }: { text: string }) {
  const out: ReactNode[] = []
  const re = /\{(-?[^{}/]+)\/([^{}/]+)\}|√\{([^}]+)\}|\^\{([^}]+)\}|\^(-?\d+|n)|_([A-Za-z])/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1] !== undefined) {
      out.push(<span key={k++} className="mfrac"><span><MathText text={m[1]} /></span><span><MathText text={m[2]} /></span></span>)
    } else if (m[3] !== undefined) {
      out.push(<span key={k++} className="msqrt">√<span>{m[3]}</span></span>)
    } else if (m[4] !== undefined || m[5] !== undefined) {
      out.push(<sup key={k++}>{m[4] ?? m[5]}</sup>)
    } else if (m[6] !== undefined) {
      out.push(<sub key={k++}>{m[6]}</sub>)
    }
    last = re.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}
