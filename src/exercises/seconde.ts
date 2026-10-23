import {
  choice, fmt, frac, numeric, par, pick, plain, poly, randInt, randNonZero,
  type Generator,
} from './utils'

const nombres: Generator = (d) => {
  if (d === 1) {
    const a = pick([2, 3, 5, 7, 10]), m = randInt(2, 9), n = randInt(2, 9)
    return numeric(`Écris ${a}^${m} × ${a}^${n} sous la forme ${a}^n. Que vaut n ?`, m + n, {
      explanation: `aᵐ × aⁿ = aᵐ⁺ⁿ : ${m} + ${n} = ${m + n}.`,
    })
  }
  if (d === 2) {
    const a = pick([2, 3, 5, 10]), m = randInt(2, 5), n = randInt(2, 4), k = randInt(1, 6)
    return numeric(`Écris (${a}^${m})^${n} ÷ ${a}^${k} sous la forme ${a}^n. Que vaut n ?`, m * n - k, {
      explanation: `(aᵐ)ⁿ = aᵐˣⁿ = ${a}^${m * n}, puis on soustrait ${k} : ${m * n - k}.`,
    })
  }
  if (Math.random() < 0.5) {
    const k = randInt(2, 7), m = pick([2, 3, 5, 6, 7])
    return choice(`Simplifie : √{${k * k * m}}`, `${k}√${m}`, [`${m}√${k}`, `${k * k}√${m}`, `${k * m}√${k}`, `${k}√${m * k}`],
      `${k * k * m} = ${k * k} × ${m} et √${k * k} = ${k}.`)
  }
  const a = randInt(-6, 2), b = randInt(a + 2, 8), c = randInt(a + 1, b - 1), e = randInt(b + 1, 12)
  return choice(`Que vaut [${fmt(a)} ; ${fmt(b)}] ∩ ]${fmt(c)} ; ${fmt(e)}] ?`, `]${fmt(c)} ; ${fmt(b)}]`,
    [`[${fmt(c)} ; ${fmt(b)}]`, `[${fmt(a)} ; ${fmt(e)}]`, `]${fmt(c)} ; ${fmt(b)}[`, `[${fmt(a)} ; ${fmt(c)}[`],
    `L'intersection contient les nombres communs aux deux intervalles ; ${fmt(c)} est exclu.`)
}

const lit: Generator = (d) => {
  const a = randInt(1, 9)
  if (d === 1) {
    const plus = Math.random() < 0.5
    const s = plus ? 1 : -1
    return choice(`Développe : (x ${plus ? '+' : '−'} ${a})²`, poly([1, 'x²'], [2 * a * s, 'x'], [a * a, '']),
      [poly([1, 'x²'], [a * a, '']), poly([1, 'x²'], [a * s, 'x'], [a * a, '']), poly([1, 'x²'], [-2 * a * s, 'x'], [a * a, ''])],
      `(a ${plus ? '+' : '−'} b)² = a² ${plus ? '+' : '−'} 2ab + b².`)
  }
  if (d === 2) {
    const k = randInt(2, 5)
    return choice(`Développe : (${k}x + ${a})(${k}x − ${a})`, poly([k * k, 'x²'], [-a * a, '']),
      [poly([k * k, 'x²'], [a * a, '']), poly([k, 'x²'], [-a * a, '']), poly([k * k, 'x²'], [-2 * k * a, 'x'], [-a * a, ''])],
      `(a + b)(a − b) = a² − b².`)
  }
  if (Math.random() < 0.5) {
    return choice(`Factorise : x² − ${a * a}`, `(x − ${a})(x + ${a})`, [`(x − ${a})²`, `(x + ${a})²`, `x(x − ${a * a})`],
      `a² − b² = (a − b)(a + b).`)
  }
  return choice(`Factorise : ${poly([1, 'x²'], [2 * a, 'x'], [a * a, ''])}`, `(x + ${a})²`, [`(x − ${a})²`, `(x − ${a})(x + ${a})`, `x(x + ${2 * a})`],
    `a² + 2ab + b² = (a + b)².`)
}

const eq: Generator = (d) => {
  if (d === 1) {
    const a = randNonZero(-9, 9), x = randInt(-10, 10), b = randInt(-15, 15)
    return numeric(`Résous : ${poly([a, 'x'], [b, ''])} = ${fmt(a * x + b)}. x = ?`, x, {
      explanation: `${poly([a, 'x'])} = ${fmt(a * x + b)} − ${par(b)} = ${fmt(a * x)}, donc x = ${fmt(x)}.`,
    })
  }
  if (d === 2) {
    const a = randInt(2, 9), c = randInt(1, 9), b = randInt(-10, 10), dd = randInt(-10, 10)
    if (a === c) return eq(2)
    return numeric(`Résous : ${poly([a, 'x'], [b, ''])} = ${poly([c, 'x'], [dd, ''])}. x = ?`, (dd - b) / (a - c), {
      answer: plain(frac(dd - b, a - c)), inputHint: 'Entier, décimal ou fraction a/b',
      explanation: `${poly([a - c, 'x'])} = ${fmt(dd - b)}, donc x = ${plain(frac(dd - b, a - c))}.`,
    })
  }
  if (Math.random() < 0.5) {
    const p = randNonZero(-9, 9), q = randNonZero(-9, 9)
    return choice(`Résous : (x ${p < 0 ? '+' : '−'} ${Math.abs(p)})(x ${q < 0 ? '−' : '+'} ${Math.abs(q)}) = 0`,
      `S = {${fmt(Math.min(p, -q))} ; ${fmt(Math.max(p, -q))}}`.replace(/\{(.+) ; \1\}/, '{$1}'),
      [`S = {${fmt(-p)} ; ${fmt(q)}}`, `S = {${fmt(p)} ; ${fmt(q)}}`, `S = {${fmt(-p)} ; ${fmt(-q)}}`],
      `Un produit est nul si l'un de ses facteurs est nul.`)
  }
  const a = randInt(-6, -1), v = randInt(-5, 5), b = randInt(-9, 9)
  return choice(`Résous : ${poly([a, 'x'], [b, ''])} < ${fmt(a * v + b)}`, `x ∈ ]${fmt(v)} ; +∞[`,
    [`x ∈ ]−∞ ; ${fmt(v)}[`, `x ∈ ]−∞ ; ${fmt(-v)}[`, `x ∈ ]${fmt(-v)} ; +∞[`],
    `On divise par ${fmt(a)} < 0 : le sens de l'inégalité change.`)
}

const fct: Generator = (d) => {
  if (d === 1) {
    const a = randNonZero(-6, 6), b = randInt(-10, 10), x = randInt(-6, 6)
    return numeric(`f(x) = ${poly([a, 'x'], [b, ''])}. Calcule f(${fmt(x)}).`, a * x + b, {
      explanation: `On remplace x par ${par(x)} : f(${fmt(x)}) = ${fmt(a * x + b)}.`,
    })
  }
  if (d === 2) {
    const a = randInt(-5, 5), b = randInt(-9, 9), x = randInt(-5, -1)
    return numeric(`f(x) = ${poly([1, 'x²'], [a, 'x'], [b, ''])}. Calcule f(${fmt(x)}).`, x * x + a * x + b, {
      explanation: `Attention : (${fmt(x)})² = ${x * x} (un carré est positif).`,
    })
  }
  const a = randNonZero(-6, 6), b = randInt(-10, 10), y = randInt(-12, 12)
  return numeric(`f(x) = ${poly([a, 'x'], [b, ''])}. Quel est l'antécédent de ${fmt(y)} par f ?`, (y - b) / a, {
    answer: plain(frac(y - b, a)), inputHint: 'Entier, décimal ou fraction a/b',
    explanation: `On résout ${poly([a, 'x'], [b, ''])} = ${fmt(y)} : x = ${plain(frac(y - b, a))}.`,
  })
}

const vect: Generator = (d) => {
  const xa = randInt(-6, 6), ya = randInt(-6, 6)
  if (d === 1) {
    const xb = randInt(-6, 6), yb = randInt(-6, 6)
    const pt = (x: number, y: number) => `(${fmt(x)} ; ${fmt(y)})`
    return choice(`A${pt(xa, ya)} et B${pt(xb, yb)}. Quelles sont les coordonnées du vecteur AB⃗ ?`, pt(xb - xa, yb - ya),
      [pt(xa - xb, ya - yb), pt(xa + xb, ya + yb), pt(xb - xa, ya - yb)],
      `AB⃗(x_B − x_A ; y_B − y_A).`)
  }
  if (d === 2) {
    const [p, q, r] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 6, 10]])
    const xb = xa + p * pick([1, -1]), yb = ya + q * pick([1, -1])
    return numeric(`A(${fmt(xa)} ; ${fmt(ya)}) et B(${fmt(xb)} ; ${fmt(yb)}) dans un repère orthonormé. Calcule AB.`, r, {
      explanation: `AB = √{${p}² + ${q}²} = √${p * p + q * q} = ${r}.`,
    })
  }
  const u1 = randNonZero(-5, 5), u2 = randNonZero(-5, 5), k = randNonZero(-3, 3)
  const col = Math.random() < 0.5
  const v2 = col ? k * u2 : k * u2 + randNonZero(-2, 2)
  return choice(`u⃗(${fmt(u1)} ; ${fmt(u2)}) et v⃗(${fmt(k * u1)} ; ${fmt(v2)}). Ces vecteurs sont-ils colinéaires ?`, col ? 'Oui' : 'Non', [col ? 'Non' : 'Oui'],
    `det(u⃗, v⃗) = ${fmt(u1)} × ${par(v2)} − ${par(u2)} × ${par(k * u1)} = ${fmt(u1 * v2 - u2 * k * u1)}.`)
}

const droites: Generator = (d) => {
  if (d === 1) {
    const xa = randInt(-5, 5), ya = randInt(-5, 5), xb = xa + randNonZero(-5, 5), yb = randInt(-8, 8)
    return numeric(`Quel est le coefficient directeur de la droite (AB) avec A(${fmt(xa)} ; ${fmt(ya)}) et B(${fmt(xb)} ; ${fmt(yb)}) ?`, (yb - ya) / (xb - xa), {
      answer: plain(frac(yb - ya, xb - xa)), inputHint: 'Entier, décimal ou fraction a/b',
      explanation: `m = (y_B − y_A) ÷ (x_B − x_A) = ${yb - ya} ÷ ${xb - xa}.`,
    })
  }
  if (d === 2) {
    const m = randNonZero(-5, 5), p = randInt(-8, 8), x = randInt(-4, 4)
    const on = Math.random() < 0.5
    const y = on ? m * x + p : m * x + p + randNonZero(-3, 3)
    return choice(`Le point M(${fmt(x)} ; ${fmt(y)}) appartient-il à la droite d'équation y = ${poly([m, 'x'], [p, ''])} ?`, on ? 'Oui' : 'Non', [on ? 'Non' : 'Oui'],
      `Pour x = ${fmt(x)}, on obtient y = ${fmt(m * x + p)}.`)
  }
  const x = randInt(-5, 5), y = randInt(-5, 5)
  const a = randNonZero(1, 4), b = randNonZero(-4, 4), c = randNonZero(-4, 4), e = randNonZero(1, 4)
  if (a * e - b * c === 0) return droites(3)
  return numeric(`Résous le système { ${poly([a, 'x'], [b, 'y'])} = ${fmt(a * x + b * y)} ; ${poly([c, 'x'], [e, 'y'])} = ${fmt(c * x + e * y)} }. Que vaut x ?`, x, {
    explanation: `Par combinaison ou substitution, on trouve x = ${fmt(x)} et y = ${fmt(y)}.`,
  })
}

const stat: Generator = (d) => {
  if (d === 1) {
    const n1 = randInt(6, 18), n2 = randInt(6, 18), c1 = randInt(1, 3), c2 = randInt(1, 3)
    const mean = (n1 * c1 + n2 * c2) / (c1 + c2)
    return numeric(`Un élève a ${n1}/20 (coef. ${c1}) et ${n2}/20 (coef. ${c2}). Quelle est sa moyenne ? (arrondie au centième si besoin)`, Math.round(mean * 100) / 100, {
      explanation: `(${n1} × ${c1} + ${n2} × ${c2}) ÷ ${c1 + c2} = ${fmt(Math.round(mean * 100) / 100)}.`,
    })
  }
  if (d === 2) {
    const pa = randInt(2, 6) / 10, pb = randInt(2, 6) / 10, pab = randInt(1, Math.round(Math.min(pa, pb) * 10)) / 10
    return numeric(`P(A) = ${fmt(pa)}, P(B) = ${fmt(pb)} et P(A ∩ B) = ${fmt(pab)}. Calcule P(A ∪ B).`, pa + pb - pab, {
      explanation: `P(A ∪ B) = P(A) + P(B) − P(A ∩ B).`,
    })
  }
  const t = pick([10, 20, 25, 50])
  return numeric(`Un prix augmente de ${t} % puis baisse de ${t} %. Quelle est l'évolution globale (en %) ?`, ((1 + t / 100) * (1 - t / 100) - 1) * 100, {
    explanation: `Coefficient global : ${fmt(1 + t / 100)} × ${fmt(1 - t / 100)} = ${fmt((1 + t / 100) * (1 - t / 100))}, soit ${fmt(((1 + t / 100) * (1 - t / 100) - 1) * 100)} %.`,
  })
}

export const SECONDE: Record<string, Generator> = {
  '2-nombres': nombres,
  '2-lit': lit,
  '2-eq': eq,
  '2-fct': fct,
  '2-vect': vect,
  '2-droites': droites,
  '2-stat': stat,
}
