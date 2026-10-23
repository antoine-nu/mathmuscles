import {
  F, expression, fmt, fraction, fracText, gcd, interval, numeric, pair, par, pick, poly, radical,
  randInt, randNonZero, solutionSet, xPlus,
  type Tiers,
} from './utils'

// Chaque chapitre : 5 paliers de difficulté (palier n ↔ cran n − 1 de la jauge).

const SQUAREFREE = [2, 3, 5, 6, 7, 10, 11]

const nombres: Tiers = [
  [
    () => {
      const a = pick([2, 3, 5, 7, 10]), m = randInt(2, 9), n = randInt(2, 9)
      return numeric(`Écris ${a}^${m} × ${a}^${n} sous la forme ${a}^n. Que vaut n ?`, m + n, { explanation: `aᵐ × aⁿ = aᵐ⁺ⁿ : ${m} + ${n} = ${m + n}.` })
    },
    () => {
      const a = pick([2, 3, 5, 7]), m = randInt(5, 12), n = randInt(1, m - 1)
      return numeric(`Écris ${F(`${a}^${m}`, `${a}^${n}`)} sous la forme ${a}^n. Que vaut n ?`, m - n, { explanation: `aᵐ ÷ aⁿ = aᵐ⁻ⁿ : ${m} − ${n} = ${m - n}.` })
    },
  ],
  [
    () => {
      const a = pick([2, 3, 5, 10]), m = randInt(2, 5), n = randInt(2, 4), k = randInt(1, 12)
      return numeric(`Écris (${a}^${m})^${n} ÷ ${a}^${k} sous la forme ${a}^n. Que vaut n ?`, m * n - k, { explanation: `(aᵐ)ⁿ = a^${m * n}, puis ${m * n} − ${k} = ${m * n - k}.` })
    },
    () => {
      const digits = randInt(11, 99), e = randInt(3, 6)
      const v = digits / 10 ** (e + 1)
      return numeric(`On écrit ${fmt(v)} en notation scientifique a × 10^n. Que vaut n ?`, -e, {
        explanation: `${fmt(v)} = ${fmt(digits / 10)} × 10^${-e}.`,
      })
    },
  ],
  [
    () => {
      const k = randInt(2, 7), m = pick(SQUAREFREE)
      return radical(`Écris √{${k * k * m}} sous la forme a√b, avec b le plus petit possible.`, k, m, { explanation: `${k * k * m} = ${k * k} × ${m} et √${k * k} = ${k}.` })
    },
    () => {
      const m = pick(SQUAREFREE), a = randInt(1, 4), b = randInt(2, 5)
      return numeric(`Calcule √{${m * a * a}} × √{${m * b * b}}.`, m * a * b, {
        explanation: `√a × √b = √(ab) = √${m * m * a * a * b * b} = ${m * a * b}.`,
      })
    },
  ],
  [
    () => {
      const a = randInt(-6, 2), b = randInt(a + 2, 8), c = randInt(a + 1, b - 1), e = randInt(b + 1, 12)
      return interval(`Écris l'intervalle [${fmt(a)} ; ${fmt(b)}] ∩ ]${fmt(c)} ; ${fmt(e)}].`, { lo: c, hi: b, loClosed: false, hiClosed: true }, {
        explanation: `On garde les nombres communs : à partir de ${fmt(c)} (exclu) jusqu'à ${fmt(b)} (inclus).`,
      })
    },
    () => {
      const a = randInt(-8, 2), b = randInt(a + 1, 10)
      return interval(`Écris sous forme d'intervalle l'ensemble des réels x tels que ${fmt(a)} < x ≤ ${fmt(b)}.`, { lo: a, hi: b, loClosed: false, hiClosed: true }, {
        explanation: `Inégalité stricte → crochet ouvert, large → crochet fermé.`,
      })
    },
    () => {
      const c = randInt(-6, 6), r = randInt(1, 5)
      return interval(`Écris l'ensemble des réels x tels que |${xPlus(-c)}| ≤ ${r} sous forme d'intervalle.`, { lo: c - r, hi: c + r, loClosed: true, hiClosed: true }, {
        explanation: `La distance entre x et ${fmt(c)} est au plus ${r} : x ∈ [${fmt(c - r)} ; ${fmt(c + r)}].`,
      })
    },
  ],
  [
    () => {
      const k = randInt(2, 6), m = pick([2, 3, 5]), c = k * m
      return radical(`Écris ${F(c, `√${m}`)} sous la forme a√b.`, k, m, { explanation: `${c}/√${m} = ${c}√${m}/${m} = ${k}√${m}.` })
    },
    () => {
      const m = pick([2, 3, 5]), a = randInt(2, 5), b = pick([1, 2, 3, 4, 5, 6].filter((v) => v !== a))
      return radical(`Écris √{${a * a * m}} + √{${b * b * m}} sous la forme a√b.`, a + b, m, { explanation: `${a}√${m} + ${b}√${m} = ${a + b}√${m}.` })
    },
    () => {
      const p = randInt(2, 5), q = randInt(1, 4), r = randInt(p + q - 6, p + q + 3)
      const e = p - q - r
      return fraction(`Calcule ${F(`2^${p} × 2^${-q}`, `2^${r}`)}. (résultat sous forme de fraction ou d'entier)`, e >= 0 ? 2 ** e : 1, e >= 0 ? 1 : 2 ** -e, {
        explanation: `L'exposant vaut ${p} + ${par(-q)} − ${par(r)} = ${e}, donc 2^${e} = ${e >= 0 ? 2 ** e : `1/${2 ** -e}`}.`,
      })
    },
  ],
]

const lit: Tiers = [
  [
    () => {
      const k = randNonZero(-6, 6), a = randInt(1, 5), b = randNonZero(-9, 9)
      return expression(`Développe et réduis : ${k < 0 ? `−${-k === 1 ? '' : -k}` : k}(${xPlus(b, a)})`, poly([k * a, 'x'], [k * b, '']), 'developed', {
        explanation: `On distribue ${fmt(k)} sur chaque terme.`,
      })
    },
    () => {
      const a = randNonZero(-7, 7), b = randNonZero(-7, 7)
      return expression(`Développe et réduis : (${xPlus(a)})(${xPlus(b)})`, poly([1, 'x²'], [a + b, 'x'], [a * b, '']), 'developed', {
        explanation: `x × x + x × ${par(b)} + ${par(a)} × x + ${par(a)} × ${par(b)}.`,
      })
    },
  ],
  [
    () => {
      const a = randNonZero(-9, 9)
      return expression(`Développe : (${xPlus(a)})²`, poly([1, 'x²'], [2 * a, 'x'], [a * a, '']), 'developed', {
        explanation: `(a ${a < 0 ? '−' : '+'} b)² = a² ${a < 0 ? '−' : '+'} 2ab + b² avec b = ${Math.abs(a)}.`,
      })
    },
    () => {
      const a = randInt(1, 9)
      return expression(`Développe : (x + ${a})(x − ${a})`, poly([1, 'x²'], [-a * a, '']), 'developed', { explanation: `(a + b)(a − b) = a² − b².` })
    },
  ],
  [
    () => {
      const k = randInt(2, 5), a = randInt(1, 9)
      return expression(`Développe : (${k}x + ${a})(${k}x − ${a})`, poly([k * k, 'x²'], [-a * a, '']), 'developed', { explanation: `(a + b)(a − b) = a² − b² avec a = ${k}x.` })
    },
    () => {
      const k = randInt(2, 5), a = randNonZero(-7, 7)
      return expression(`Développe : (${xPlus(a, k)})²`, poly([k * k, 'x²'], [2 * k * a, 'x'], [a * a, '']), 'developed', {
        explanation: `(${k}x)² = ${k * k}x², 2 × ${k}x × ${par(a)} = ${fmt(2 * k * a)}x, ${par(a)}² = ${a * a}.`,
      })
    },
    () => {
      const a = randNonZero(-5, 5), b = randNonZero(-5, 5), c = randInt(1, 4)
      return expression(`Développe et réduis : (${xPlus(a)})(${xPlus(b)})${poly([1, ''], [-c, 'x²']).slice(1)}`, poly([1 - c, 'x²'], [a + b, 'x'], [a * b, '']), 'developed', {
        explanation: `(${xPlus(a)})(${xPlus(b)}) = ${poly([1, 'x²'], [a + b, 'x'], [a * b, ''])}, puis on retire ${poly([c, 'x²'])}.`,
      })
    },
  ],
  [
    () => {
      const a = randNonZero(-9, 9), k = randInt(1, 4)
      return expression(`Factorise : ${poly([k, 'x²'], [k * a, 'x'])}`, `${k === 1 ? '' : k}x(${xPlus(a)})`, 'factored', { explanation: `${k === 1 ? 'x' : `${k}x`} est un facteur commun.` })
    },
    () => {
      const a = randInt(2, 10)
      return expression(`Factorise : x² − ${a * a}`, `(x − ${a})(x + ${a})`, 'factored', { explanation: `a² − b² = (a − b)(a + b) avec b = ${a}.` })
    },
    () => {
      const a = randNonZero(-8, 8)
      return expression(`Factorise : ${poly([1, 'x²'], [2 * a, 'x'], [a * a, ''])}`, `(${xPlus(a)})²`, 'factored', {
        explanation: `On reconnaît a² ${a < 0 ? '−' : '+'} 2ab + b² avec b = ${Math.abs(a)}.`,
      })
    },
  ],
  [
    () => {
      const a = randNonZero(-6, 6), b = randInt(1, 4), c = randNonZero(-6, 6), d = randInt(1, 3), e = randNonZero(-6, 6)
      if (b + d === 0 || c + e === 0) return lit[4][0]()
      return expression(`Factorise : (${xPlus(a)})(${xPlus(c, b)}) + (${xPlus(a)})(${xPlus(e, d)})`, `(${xPlus(a)})(${xPlus(c + e, b + d)})`, 'factored', {
        explanation: `(${xPlus(a)}) est un facteur commun : (${xPlus(a)})[(${xPlus(c, b)}) + (${xPlus(e, d)})].`,
      })
    },
    () => {
      const k = randInt(2, 6), a = pick([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => gcd(v, k) === 1))
      return expression(`Factorise : ${k * k}x² − ${a * a}`, `(${k}x − ${a})(${k}x + ${a})`, 'factored', { explanation: `(${k}x)² − ${a}² = (${k}x − ${a})(${k}x + ${a}).` })
    },
    () => {
      const a = randNonZero(-5, 5), b = randNonZero(-5, 5)
      if (Math.abs(a - b) < 2) return lit[4][2]()
      return expression(`Factorise puis réduis chaque facteur : (${xPlus(a)})² − (${xPlus(b)})²`, `${fmt(a - b)}(${xPlus(a + b, 2)})`, 'factored', {
        explanation: `A² − B² = (A − B)(A + B) : (A − B) = ${fmt(a - b)} et (A + B) = ${xPlus(a + b, 2)}.`,
      })
    },
  ],
]

const eq: Tiers = [
  [
    () => {
      const a = randNonZero(-9, 9), x = randInt(-10, 10), b = randInt(-15, 15)
      return numeric(`Résous : ${poly([a, 'x'], [b, ''])} = ${fmt(a * x + b)}. x = ?`, x, {
        explanation: `${poly([a, 'x'])} = ${fmt(a * x + b)} − ${par(b)} = ${fmt(a * x)}, donc x = ${fmt(x)}.`,
      })
    },
  ],
  [
    () => {
      const a = randInt(2, 9), c = randInt(1, 9), b = randInt(-10, 10), d = randInt(-10, 10)
      if (a === c) return eq[1][0]()
      return fraction(`Résous : ${poly([a, 'x'], [b, ''])} = ${poly([c, 'x'], [d, ''])}. x = ?`, d - b, a - c, {
        explanation: `${poly([a - c, 'x'])} = ${fmt(d - b)}, donc x = ${fracText(d - b, a - c)}.`,
      })
    },
    () => {
      const k = randInt(2, 5), a = randNonZero(-6, 6), x = randInt(-6, 6), c = randInt(1, 4)
      const rhs = k * (x + a) + c * x
      return numeric(`Résous : ${k}(${xPlus(a)})${poly([1, ''], [c, 'x']).slice(1)} = ${fmt(rhs)}. x = ?`, x, {
        explanation: `${poly([k + c, 'x'], [k * a, ''])} = ${fmt(rhs)}, donc x = ${fmt(x)}.`,
      })
    },
  ],
  [
    () => {
      const p = randNonZero(-9, 9), q = randNonZero(-9, 9)
      return solutionSet(`Résous : (${xPlus(-p)})(${xPlus(-q)}) = 0`, [p, q], { explanation: `Un produit est nul si l'un de ses facteurs est nul : x = ${fmt(p)} ou x = ${fmt(q)}.` })
    },
    () => {
      const a = randInt(2, 5), p = randNonZero(-6, 6) * a, q = randNonZero(-8, 8)
      return solutionSet(`Résous : (${a}x ${p < 0 ? '+' : '−'} ${Math.abs(p)})(${xPlus(-q)}) = 0`, [p / a, q], { explanation: `${a}x = ${fmt(p)} donne x = ${fmt(p / a)} ; l'autre facteur donne x = ${fmt(q)}.` })
    },
  ],
  [
    () => {
      const a = randNonZero(-6, 6), v = randInt(-5, 5), b = randInt(-9, 9)
      const neg = a < 0
      return interval(`Résous ${poly([a, 'x'], [b, ''])} < ${fmt(a * v + b)} et donne l'ensemble des solutions sous forme d'intervalle.`,
        neg ? { lo: v, hi: Infinity, loClosed: false, hiClosed: false } : { lo: -Infinity, hi: v, loClosed: false, hiClosed: false }, {
          explanation: neg ? `On divise par ${fmt(a)} < 0 : le sens de l'inégalité change, x > ${fmt(v)}.` : `${poly([a, 'x'])} < ${fmt(a * v)}, donc x < ${fmt(v)}.`,
        })
    },
    () => {
      const a = randInt(2, 6), v = randInt(-5, 5), b = randInt(-9, 9)
      return interval(`Résous ${poly([a, 'x'], [b, ''])} ≥ ${fmt(a * v + b)} (réponse sous forme d'intervalle).`, { lo: v, hi: Infinity, loClosed: true, hiClosed: false }, {
        explanation: `x ≥ ${fmt(v)} : crochet fermé en ${fmt(v)}.`,
      })
    },
  ],
  [
    () => {
      const x = randInt(3, 20), d = randInt(2, 9)
      return numeric(`Un enclos rectangulaire a une longueur égale à sa largeur + ${d} m. Son périmètre vaut ${2 * (2 * x + d)} m. Quelle est sa largeur (en m) ?`, x, {
        explanation: `2(x + x + ${d}) = ${2 * (2 * x + d)}, soit 4x + ${2 * d} = ${2 * (2 * x + d)} et x = ${x}.`,
      })
    },
    () => {
      const k = randInt(2, 12)
      return solutionSet(`Résous : x² = ${k * k}`, [-k, k], { explanation: `x² = ${k * k} a deux solutions : ${k} et −${k}.` })
    },
    () => {
      const n = randInt(5, 40)
      return numeric(`La somme de trois nombres entiers consécutifs vaut ${3 * n + 3}. Quel est le plus petit ?`, n, {
        explanation: `n + (n + 1) + (n + 2) = 3n + 3 = ${3 * n + 3}, donc n = ${n}.`,
      })
    },
  ],
]

const fct: Tiers = [
  [
    () => {
      const a = randNonZero(-6, 6), b = randInt(-10, 10), x = randInt(-6, 6)
      return numeric(`f(x) = ${poly([a, 'x'], [b, ''])}. Calcule f(${fmt(x)}).`, a * x + b, { explanation: `On remplace x par ${par(x)} : f(${fmt(x)}) = ${fmt(a * x + b)}.` })
    },
  ],
  [
    () => {
      const a = randInt(-5, 5), b = randInt(-9, 9), x = randInt(-5, -1)
      return numeric(`f(x) = ${poly([1, 'x²'], [a, 'x'], [b, ''])}. Calcule f(${fmt(x)}).`, x * x + a * x + b, { explanation: `Attention : (${fmt(x)})² = ${x * x}.` })
    },
    () => {
      const k = randInt(1, 6), b = randInt(1, 6), x = randInt(-3, 6)
      if (x + b === 0) return fct[1][1]()
      return fraction(`f(x) = ${F(k, `x + ${b}`)}. Calcule f(${fmt(x)}).`, k, x + b, { explanation: `f(${fmt(x)}) = ${k} ÷ ${x + b}.` })
    },
  ],
  [
    () => {
      const a = randNonZero(-6, 6), b = randInt(-10, 10), y = randInt(-12, 12)
      return fraction(`f(x) = ${poly([a, 'x'], [b, ''])}. Quel est l'antécédent de ${fmt(y)} par f ?`, y - b, a, { explanation: `On résout ${poly([a, 'x'], [b, ''])} = ${fmt(y)} : x = ${fracText(y - b, a)}.` })
    },
    () => {
      const a = randInt(2, 4), b = randNonZero(-5, 5), x = randInt(-4, 4)
      return numeric(`f(x) = ${poly([a, 'x²'], [b, 'x'])} − 1. Calcule f(${fmt(x)}).`, a * x * x + b * x - 1, { explanation: `${a} × ${par(x)}² ${b < 0 ? '−' : '+'} ${Math.abs(b)} × ${par(x)} − 1 = ${a * x * x + b * x - 1}.` })
    },
  ],
  [
    () => {
      const k = randInt(1, 9), c = randInt(-5, 5)
      return solutionSet(`f(x) = ${poly([1, 'x²'], [c, ''])}. Trouve tous les antécédents de ${k * k + c} par f.`, [-k, k], { explanation: `x² = ${k * k}, donc x = ${k} ou x = −${k}.` })
    },
    () => {
      const a = randNonZero(-5, 5), k = randInt(1, 6)
      return solutionSet(`f(x) = (${xPlus(-a)})². Trouve tous les antécédents de ${k * k} par f.`, [a - k, a + k], { explanation: `x − ${par(a)} = ${k} ou −${k}.` })
    },
  ],
  [
    () => {
      const m = randNonZero(-4, 4), p = randInt(-6, 6), x1 = randInt(-3, 2), x2 = x1 + randInt(1, 4)
      return expression(`f est une fonction affine avec f(${fmt(x1)}) = ${fmt(m * x1 + p)} et f(${fmt(x2)}) = ${fmt(m * x2 + p)}. Donne l'expression de f(x).`, poly([m, 'x'], [p, '']), 'any', {
        inputHint: 'ex. 2x − 3',
        explanation: `a = (${fmt(m * x2 + p)} − ${par(m * x1 + p)}) ÷ (${fmt(x2)} − ${par(x1)}) = ${fmt(m)}, puis b = ${fmt(p)}.`,
      })
    },
    () => {
      const a = randInt(2, 6), b = randNonZero(-8, 8), c = randInt(1, a - 1), x = randInt(-6, 6), d = (a - c) * x + b
      return numeric(`f(x) = ${poly([a, 'x'], [b, ''])} et g(x) = ${poly([c, 'x'], [d, ''])}. Pour quelle valeur de x a-t-on f(x) = g(x) ?`, x, {
        explanation: `${poly([a - c, 'x'])} = ${fmt(d - b)}, donc x = ${fmt(x)}.`,
      })
    },
    () => {
      const v = pick([10, 15, 20, 25]), t = randInt(1, Math.floor((2 * v) / 10))
      return numeric(`La hauteur d'une flèche (en m) après t secondes est h(t) = −5t² + ${v}t. Quelle est sa hauteur à t = ${t} s ?`, -5 * t * t + v * t, {
        explanation: `−5 × ${t}² + ${v} × ${t} = ${-5 * t * t + v * t}.`,
      })
    },
  ],
]

const vect: Tiers = [
  [
    () => {
      const xa = randInt(-6, 6), ya = randInt(-6, 6), xb = randInt(-6, 6), yb = randInt(-6, 6)
      return pair(`A(${fmt(xa)} ; ${fmt(ya)}) et B(${fmt(xb)} ; ${fmt(yb)}). Donne les coordonnées du vecteur AB⃗.`, xb - xa, yb - ya, { explanation: `AB⃗(x_B − x_A ; y_B − y_A).` })
    },
  ],
  [
    () => {
      const xa = randInt(-6, 6), ya = randInt(-6, 6), xb = randInt(-6, 6), yb = randInt(-6, 6)
      return pair(`A(${fmt(xa)} ; ${fmt(ya)}) et B(${fmt(xb)} ; ${fmt(yb)}). Donne les coordonnées du milieu M de [AB].`, (xa + xb) / 2, (ya + yb) / 2, {
        explanation: `M((x_A + x_B)/2 ; (y_A + y_B)/2).`,
      })
    },
    () => {
      const u1 = randInt(-5, 5), u2 = randInt(-5, 5), v1 = randInt(-5, 5), v2 = randInt(-5, 5), k = randInt(2, 3)
      return pair(`u⃗(${fmt(u1)} ; ${fmt(u2)}) et v⃗(${fmt(v1)} ; ${fmt(v2)}). Donne les coordonnées de ${k}u⃗ + v⃗.`, k * u1 + v1, k * u2 + v2, {
        explanation: `${k}u⃗(${fmt(k * u1)} ; ${fmt(k * u2)}), puis on ajoute v⃗.`,
      })
    },
  ],
  [
    () => {
      const xa = randInt(-6, 6), ya = randInt(-6, 6)
      const [p, q, r] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 6, 10], [4, 3, 5]])
      const xb = xa + p * pick([1, -1]), yb = ya + q * pick([1, -1])
      return numeric(`A(${fmt(xa)} ; ${fmt(ya)}) et B(${fmt(xb)} ; ${fmt(yb)}) dans un repère orthonormé. Calcule AB.`, r, { explanation: `AB = √(${p}² + ${q}²) = √${p * p + q * q} = ${r}.` })
    },
    () => {
      const xa = randInt(-5, 5), ya = randInt(-5, 5), dx = randNonZero(-4, 4), dy = randNonZero(-4, 4)
      return pair(`A(${fmt(xa)} ; ${fmt(ya)}) et u⃗(${fmt(dx)} ; ${fmt(dy)}). B est l'image de A par la translation de vecteur u⃗. Coordonnées de B ?`, xa + dx, ya + dy, {
        explanation: `B = A + u⃗ : (${fmt(xa)} + ${par(dx)} ; ${fmt(ya)} + ${par(dy)}).`,
      })
    },
  ],
  [
    () => {
      const P = () => [randInt(-5, 5), randInt(-5, 5)]
      const [xa, ya] = P(), [xb, yb] = P(), [xc, yc] = P()
      return pair(`A(${fmt(xa)} ; ${fmt(ya)}), B(${fmt(xb)} ; ${fmt(yb)}), C(${fmt(xc)} ; ${fmt(yc)}). Donne les coordonnées de D tel que ABCD soit un parallélogramme.`, xa + xc - xb, ya + yc - yb, {
        explanation: `AD⃗ = BC⃗, donc D = A + BC⃗ = (${fmt(xa + xc - xb)} ; ${fmt(ya + yc - yb)}).`,
      })
    },
    () => {
      const u1 = randNonZero(-5, 5), u2 = randNonZero(-5, 5), v1 = randNonZero(-6, 6), v2 = randNonZero(-6, 6)
      return numeric(`Calcule le déterminant det(u⃗, v⃗) pour u⃗(${fmt(u1)} ; ${fmt(u2)}) et v⃗(${fmt(v1)} ; ${fmt(v2)}).`, u1 * v2 - u2 * v1, {
        explanation: `det = ${fmt(u1)} × ${par(v2)} − ${par(u2)} × ${par(v1)} = ${fmt(u1 * v2 - u2 * v1)}.`,
      })
    },
  ],
  [
    () => {
      const a = randNonZero(-4, 4), k = randNonZero(-3, 3), m = randNonZero(-5, 5)
      // u(a ; m) et v(k·a ; ?) colinéaires ⇔ ? = k·m
      return numeric(`Pour quelle valeur de y les vecteurs u⃗(${fmt(a)} ; ${fmt(m)}) et v⃗(${fmt(k * a)} ; y) sont-ils colinéaires ?`, k * m, {
        explanation: `det = ${fmt(a)} × y − ${par(m)} × ${par(k * a)} = 0, donc y = ${fmt(k * m)}.`,
      })
    },
    () => {
      const p = randInt(1, 6), q = randInt(1, 6)
      const n = p * p + q * q
      let k = 1, m = n
      for (let d = 2; d * d <= m; d++) while (m % (d * d) === 0) { m /= d * d; k *= d }
      if (m === 1) return vect[2][0]()
      return radical(`A(0 ; 0) et B(${p} ; ${q}) dans un repère orthonormé. Donne la valeur exacte de AB sous la forme a√b.`, k, m, {
        explanation: `AB = √(${p}² + ${q}²) = √${n} = ${k === 1 ? '' : k}√${m}.`,
      })
    },
  ],
]

const droites: Tiers = [
  [
    () => {
      const xa = randInt(-5, 5), ya = randInt(-5, 5), xb = xa + randNonZero(-5, 5), yb = randInt(-8, 8)
      return fraction(`Quel est le coefficient directeur de la droite (AB) avec A(${fmt(xa)} ; ${fmt(ya)}) et B(${fmt(xb)} ; ${fmt(yb)}) ?`, yb - ya, xb - xa, {
        explanation: `m = (y_B − y_A) ÷ (x_B − x_A) = ${yb - ya} ÷ ${xb - xa}.`,
      })
    },
  ],
  [
    () => {
      const m = randNonZero(-5, 5), p = randInt(-8, 8), x = randInt(-4, 4)
      return numeric(`La droite d a pour coefficient directeur ${fmt(m)} et passe par A(${fmt(x)} ; ${fmt(m * x + p)}). Quelle est son ordonnée à l'origine ?`, p, {
        explanation: `${fmt(m * x + p)} = ${fmt(m)} × ${par(x)} + p, donc p = ${fmt(p)}.`,
      })
    },
    () => {
      const m = randNonZero(-5, 5), p = randInt(-8, 8), x = randInt(-6, 6)
      return numeric(`Quelle est l'ordonnée du point de la droite y = ${poly([m, 'x'], [p, ''])} d'abscisse ${fmt(x)} ?`, m * x + p, { explanation: `y = ${fmt(m * x + p)}.` })
    },
  ],
  [
    () => {
      const m = randNonZero(-4, 4), p = randInt(-6, 6), x1 = randInt(-4, 1), x2 = x1 + randInt(1, 4)
      return expression(`Donne l'équation réduite de la droite passant par A(${fmt(x1)} ; ${fmt(m * x1 + p)}) et B(${fmt(x2)} ; ${fmt(m * x2 + p)}).`, poly([m, 'x'], [p, '']), 'any', {
        answer: `y = ${poly([m, 'x'], [p, ''])}`, inputHint: 'y = mx + p',
        explanation: `m = ${fmt(m)}, puis p = ${fmt(p)}.`,
      })
    },
  ],
  [
    () => {
      const x = randInt(-5, 5), m1 = randNonZero(-4, 4), m2 = randNonZero(-4, 4), y = randInt(-6, 6)
      if (m1 === m2) return droites[3][0]()
      const p1 = y - m1 * x, p2 = y - m2 * x
      return pair(`Donne les coordonnées du point d'intersection des droites y = ${poly([m1, 'x'], [p1, ''])} et y = ${poly([m2, 'x'], [p2, ''])}.`, x, y, {
        explanation: `${poly([m1, 'x'], [p1, ''])} = ${poly([m2, 'x'], [p2, ''])} donne x = ${fmt(x)}, puis y = ${fmt(y)}.`,
      })
    },
    () => {
      const m = randNonZero(-4, 4), p = randInt(-6, 6), xa = randInt(-4, 4), ya = randInt(-6, 6)
      return expression(`Donne l'équation réduite de la droite parallèle à y = ${poly([m, 'x'], [p, ''])} passant par A(${fmt(xa)} ; ${fmt(ya)}).`, poly([m, 'x'], [ya - m * xa, '']), 'any', {
        answer: `y = ${poly([m, 'x'], [ya - m * xa, ''])}`, inputHint: 'y = mx + p',
        explanation: `Même coefficient directeur ${fmt(m)}, puis p = ${fmt(ya)} − ${par(m)} × ${par(xa)} = ${fmt(ya - m * xa)}.`,
      })
    },
  ],
  [
    () => {
      const x = randInt(-5, 5), y = randInt(-5, 5)
      const a = randNonZero(1, 4), b = randNonZero(-4, 4), c = randNonZero(-4, 4), e = randNonZero(1, 4)
      if (a * e - b * c === 0) return droites[4][0]()
      return pair(`Résous le système : ${poly([a, 'x'], [b, 'y'])} = ${fmt(a * x + b * y)} et ${poly([c, 'x'], [e, 'y'])} = ${fmt(c * x + e * y)}. Donne le couple (x ; y).`, x, y, {
        explanation: `Par combinaison ou substitution : x = ${fmt(x)}, y = ${fmt(y)}.`,
      })
    },
    () => {
      const ep = randInt(10, 40), bo = randInt(5, 25), a = randInt(2, 4), b = randInt(1, 3), c = randInt(1, 2), d = randInt(2, 5)
      if (a * d === b * c) return droites[4][1]()
      return numeric(`${a} épées et ${b} bouclier${b > 1 ? 's' : ''} coûtent ${a * ep + b * bo} écus ; ${c} épée${c > 1 ? 's' : ''} et ${d} boucliers coûtent ${c * ep + d * bo} écus. Quel est le prix d'une épée (en écus) ?`, ep, {
        explanation: `Système ${a}e + ${b}b = ${a * ep + b * bo} et ${c}e + ${d}b = ${c * ep + d * bo} : e = ${ep}, b = ${bo}.`,
      })
    },
  ],
]

const stat: Tiers = [
  [
    () => {
      const n1 = randInt(6, 18), n2 = randInt(6, 18), c1 = randInt(1, 3), c2 = randInt(1, 3)
      const mean = Math.round(((n1 * c1 + n2 * c2) / (c1 + c2)) * 100) / 100
      return numeric(`Un élève a ${n1} (coef. ${c1}) et ${n2} (coef. ${c2}). Quelle est sa moyenne ? (arrondie au centième)`, mean, {
        explanation: `(${n1} × ${c1} + ${n2} × ${c2}) ÷ ${c1 + c2} ≈ ${fmt(mean)}.`,
      })
    },
  ],
  [
    () => {
      const v0 = randInt(2, 20) * 20, t = pick([5, 10, 15, 20, 25, 30, 40, 50]) * pick([1, -1])
      const v1 = v0 * (1 + t / 100)
      return numeric(`Un prix passe de ${v0} à ${fmt(v1)} écus. Quel est le taux d'évolution (en %) ?`, t, {
        explanation: `(${fmt(v1)} − ${v0}) ÷ ${v0} = ${fmt(t / 100)}, soit ${fmt(t)} %.`,
      })
    },
    () => {
      const t = pick([5, 10, 15, 20, 30, 40]) * pick([1, -1])
      return numeric(`Quel est le coefficient multiplicateur associé à une ${t > 0 ? 'hausse' : 'baisse'} de ${Math.abs(t)} % ?`, 1 + t / 100, {
        explanation: `1 ${t > 0 ? '+' : '−'} ${Math.abs(t)}/100 = ${fmt(1 + t / 100)}.`,
      })
    },
  ],
  [
    () => {
      const t = pick([10, 20, 25, 50])
      return numeric(`Un prix augmente de ${t} % puis baisse de ${t} %. Quelle est l'évolution globale (en %) ?`, ((1 + t / 100) * (1 - t / 100) - 1) * 100, {
        explanation: `${fmt(1 + t / 100)} × ${fmt(1 - t / 100)} = ${fmt((1 + t / 100) * (1 - t / 100))}.`,
      })
    },
    () => {
      const [t, r] = pick([[25, -20], [100, -50], [-20, 25], [-50, 100], [60, -37.5], [-60, 150]])
      return numeric(`Un prix ${t > 0 ? 'augmente' : 'baisse'} de ${Math.abs(t)} %. De quel pourcentage doit-il évoluer pour revenir à sa valeur initiale ? (réponse signée, en %)`, r, {
        explanation: `Coefficient réciproque : 1 ÷ ${fmt(1 + t / 100)} = ${fmt(1 + r / 100)}, soit ${fmt(r)} %.`,
      })
    },
  ],
  [
    () => {
      const pa = randInt(2, 6) / 10, pb = randInt(2, 6) / 10, pab = randInt(1, Math.round(Math.min(pa, pb) * 10)) / 10
      return numeric(`P(A) = ${fmt(pa)}, P(B) = ${fmt(pb)} et P(A ∩ B) = ${fmt(pab)}. Calcule P(A ∪ B).`, pa + pb - pab, { explanation: `P(A ∪ B) = P(A) + P(B) − P(A ∩ B).` })
    },
    () => {
      const n = pick([7, 9, 11])
      const vals = Array.from({ length: n }, () => randInt(1, 30)).sort((a, b) => a - b)
      const shuffled = [...vals].sort(() => Math.random() - 0.5)
      return numeric(`Voici une série : ${shuffled.join(' ; ')}. Quelle est sa médiane ?`, vals[(n - 1) / 2], {
        explanation: `On range la série dans l'ordre : la valeur centrale (rang ${(n + 1) / 2}) est ${vals[(n - 1) / 2]}.`,
      })
    },
  ],
  [
    () => {
      const total = pick([100, 200, 400]), arch = pick([0.4, 0.5, 0.6, 0.7]) * total, cav = total - arch
      const pa = pick([10, 20, 30, 40]), pc = pick([20, 25, 50])
      const g = (arch * pa) / 100 + (cav * pc) / 100
      return numeric(`Une armée de ${total} soldats compte ${arch} archers et ${cav} cavaliers. ${pa} % des archers et ${pc} % des cavaliers sont gradés. On choisit un soldat au hasard : quelle est la probabilité qu'il soit gradé ?`, g / total, {
        explanation: `Gradés : ${fmt((arch * pa) / 100)} + ${fmt((cav * pc) / 100)} = ${fmt(g)}, sur ${total}.`,
      })
    },
    () => {
      const a = randInt(2, 6)
      return fraction(`On lance un dé équilibré à 6 faces. Quelle est la probabilité d'obtenir un nombre pair OU un nombre supérieur ou égal à ${a} ?`,
        [1, 2, 3, 4, 5, 6].filter((v) => v % 2 === 0 || v >= a).length, 6, {
          explanation: `On compte les faces qui vérifient au moins une des deux conditions.`,
        })
    },
  ],
]

export const SECONDE: Record<string, Tiers> = {
  '2-nombres': nombres,
  '2-lit': lit,
  '2-eq': eq,
  '2-fct': fct,
  '2-vect': vect,
  '2-droites': droites,
  '2-stat': stat,
}
