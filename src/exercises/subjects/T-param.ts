// Représentations paramétriques de droites et équations cartésiennes de plans (Terminale).
// Point d’une droite, appartenance, vecteurs directeur et normal, équation de plan, intersections, positions
// relatives, projeté orthogonal, distances. Public adulte : palier 1 guidé … palier 5 exigeant.
import {
  F, choice, fmt, fracText, fraction, fresh, gcd, numeric, par, parseNumber, pick, poly, randInt, randNonZero, variants, withMeta,
  type Exercise, type Ladder, type SubjectContent, type Tiers,
} from '../utils'
import type { Figure } from '../figure'
import { prenom } from '../contexts'
import {
  AXIS, BLUE, GOLD, NICE_NORMALS, RED, add3, axesFig, cross3, direction, dot3, exactRoot, frac, isZero3, mono, mul3, n2,
  orthoTo, parseTriplet, persp, planeBasis, planeSketch, reduce3, retry, rnz, rootText, rp, scramble, sub3, sumOf, t3, triplet,
  type V3,
} from './T-espace'

// ── Aides : écriture ─────────────────────────────────────────────────────
const XYZ = ['x', 'y', 'z']
/** Coordonnée paramétrée : 1 + 2t, −t, 4. */
const coordT = (a: number, u: number, t = 't') => poly([a, ''], [u, t])
/** Représentation paramétrique : x = 1 + 2t ; y = −3 − t ; z = 4. */
const paramTxt = (A: V3, u: V3, t = 't') => `x = ${coordT(A[0], u[0], t)} ; y = ${coordT(A[1], u[1], t)} ; z = ${coordT(A[2], u[2], t)}`
const lineTxt = (name: string, A: V3, u: V3, t = 't') => `${name} : ${paramTxt(A, u, t)} (${t} ∈ ℝ)`
/** Membre de gauche d’une équation de plan : 2x − y + 3z − 5. */
const lhs = (n: V3, d: number) => poly([n[0], 'x'], [n[1], 'y'], [n[2], 'z'], [d, ''])
const planeTxt = (n: V3, d: number) => `${lhs(n, d)} = 0`
/** Valeur d’une coordonnée paramétrée en t, détaillée : 1 + 2 × (−3) = −5. */
const evalT = (a: number, u: number, t: number) => {
  if (u === 0) return fmt(a)
  const prod = u === 1 ? par(t) : u === -1 ? `−${par(t)}` : `${par(u)} × ${par(t)}`
  if (a === 0) return `${u === 1 ? fmt(t) : prod} = ${fmt(u * t)}`
  return `${fmt(a)} ${u === -1 ? '−' : '+'} ${u === -1 ? par(t) : prod} = ${fmt(a + u * t)}`
}
/** Remplacement de x, y, z dans ax + by + cz + d, détaillé. */
const subst = (n: V3, d: number, M: V3) => sumOf([...[0, 1, 2].map((i) => (n[i] === 0 ? '' : `${par(n[i])} × ${par(M[i])}`)), d === 0 ? '' : par(d)])
/** Normale et d d’un plan passant par M : d = −n⃗ · M. */
const dOf = (n: V3, M: V3) => -dot3(n, M)
const rp4 = () => rp(4)
/** Petit vecteur normal non nul à coefficients modestes, au moins deux coordonnées non nulles. */
const rn = () => retry(() => { const n = rp(3); return n.filter((c) => c !== 0).length >= 2 ? n : null })

// ── Lecture des réponses ─────────────────────────────────────────────────
/** Coefficients d’une expression affine en les variables données (+ constante), null si illisible. */
function parseLin(raw: string, vars: string): number[] | null {
  const s = raw.replace(/[×·*]/g, '')
  if (!s) return null
  const out = new Array(vars.length + 1).fill(0)
  const re = new RegExp(`^([+-]?)(\\(\\d+(?:\\.\\d+)?\\/\\d+(?:\\.\\d+)?\\)|\\d+(?:\\.\\d+)?(?:\\/\\d+(?:\\.\\d+)?)?)?([${vars}])?(?:\\/(\\d+(?:\\.\\d+)?))?`)
  let i = 0
  while (i < s.length) {
    const m = re.exec(s.slice(i))
    if (!m || m[0] === '' || (!m[2] && !m[3]) || (i > 0 && !m[1])) return null
    let c = m[2] ? parseNumber(m[2].replace(/[()]/g, '')) : 1
    if (Number.isNaN(c)) return null
    if (m[4]) c /= Number(m[4])
    const k = m[3] ? vars.indexOf(m[3]) : vars.length
    out[k] += (m[1] === '-' ? -1 : 1) * c
    i += m[0].length
  }
  return out
}
const norm = (raw: string) => raw.trim().replace(/[−–—]/g, '-').replace(/,/g, '.').replace(/\s+/g, '').replace(/[XYZ]/g, (c) => c.toLowerCase())

/** Équation cartésienne ax + by + cz + d = 0 (sous n’importe quelle forme équivalente). */
function parsePlane(raw: string): number[] | null {
  const s = norm(raw).replace(/^[a-wA-W]\w*′?:/, '')
  const parts = s.split('=')
  if (parts.length > 2) return null
  const L = parseLin(parts[0], 'xyz'), R = parts.length === 2 ? parseLin(parts[1], 'xyz') : [0, 0, 0, 0]
  if (!L || !R) return null
  const c = L.map((v, i) => v - R[i])
  return c[0] === 0 && c[1] === 0 && c[2] === 0 ? null : c
}
const proportional = (a: number[], b: number[]) =>
  a.every((_, i) => a.every((__, j) => Math.abs(a[i] * b[j] - a[j] * b[i]) < 1e-6 * Math.max(1, Math.abs(a[i] * b[j]))))

/** Réponse : équation cartésienne de plan ; tout multiple non nul de l’équation attendue est accepté. */
function planeEq(prompt: string, n: V3, d: number, explanation: string): Exercise {
  const g = gcd(gcd(gcd(Math.abs(n[0]), Math.abs(n[1])), Math.abs(n[2])), Math.abs(d)) || 1
  const s = n.find((c) => c !== 0)! < 0 ? -1 : 1
  const N = mul3(s / g, n), D = (s * d) / g
  return {
    prompt, kind: 'input', answer: planeTxt(N, D), explanation,
    inputHint: 'ex. 2x − y + 3z − 5 = 0',
    format: 'une équation du type ax + by + cz + d = 0, par exemple 2x − y + 3z − 5 = 0',
    keypad: ['x', 'y', 'z', '=', '−', '+'],
    isValid: (v) => parsePlane(v) !== null,
    check: (v) => {
      const p = parsePlane(v)
      return !!p && proportional(p, [...N, D])
    },
  }
}

/** Représentation paramétrique saisie : « x = 1 + 2t ; y = 3 − t ; z = 4t » → point (t = 0) et vecteur directeur. */
function parseParam(raw: string): [V3, V3] | null {
  let s = raw.trim().replace(/[−–—]/g, '-').replace(/\(?[tskλ]\s*∈\s*(ℝ|R)\)?/g, '').replace(/[{}]/g, '').replace(/[XYZ]/g, (c) => c.toLowerCase())
  s = s.replace(/^\s*[a-wA-W]′?\s*:/, '')
  let parts = s.split(/;|\n|,(?=\s*[xyz]\s*=)|\bet\b/).map((p) => p.trim()).filter(Boolean)
  if (parts.length !== 3) return null
  const byName: Record<string, string> = {}
  parts = parts.map((p, i) => {
    const m = /^([xyz])\s*=(.*)$/.exec(p)
    if (m) { byName[m[1]] = m[2]; return m[2] }
    byName[XYZ[i]] = p
    return p
  })
  if (Object.keys(byName).length !== 3) return null
  const P: number[] = [], U: number[] = []
  for (const k of XYZ) {
    const e = norm(byName[k]).replace(/[skλ]/g, 't')
    const c = parseLin(e, 't')
    if (!c) return null
    U.push(c[0]); P.push(c[1])
  }
  return [P as V3, U as V3]
}
const colinear = (a: V3, b: V3) => cross3(a, b).every((c) => Math.abs(c) < 1e-6 * Math.max(1, n2(a) * n2(b)))

/** Réponse : une représentation paramétrique de la droite passant par A dirigée par u (toute écriture valable acceptée). */
function paramLine(prompt: string, A: V3, u: V3, explanation: string): Exercise {
  return {
    prompt, kind: 'input', answer: `${paramTxt(A, u)} (t ∈ ℝ)`, explanation,
    inputHint: 'x = … ; y = … ; z = …',
    format: 'x = … ; y = … ; z = … avec le paramètre t, par exemple x = 1 + 2t ; y = 3 − t ; z = 4t',
    keypad: ['t', ';', '=', '−', '+'],
    isValid: (v) => parseParam(v) !== null,
    diagnose: (v) => {
      const p = parseParam(v)
      if (p && !isZero3(p[1]) && colinear(p[1], u)) return 'Le vecteur directeur convient, mais le point obtenu pour t = 0 n’est pas sur la droite.'
      return undefined
    },
    check: (v) => {
      const p = parseParam(v)
      return !!p && !isZero3(p[1]) && colinear(p[1], u) && colinear(sub3(p[0], A), u)
    },
  }
}

/** Réponse : un point quelconque de la droite (A ; u). */
function pointOnLine(prompt: string, A: V3, u: V3, explanation: string): Exercise {
  const ex = triplet(prompt, A, { explanation })
  return { ...ex, check: (v) => { const p = parseTriplet(v); return !!p && colinear(sub3(p, A), u) } }
}

/** Quotient k/a écrit simplement : 4, ou {8/3}. */
const q = (k: number, a: number) => (k % a === 0 ? fmt(k / a) : F(k / gcd(k, a), a / gcd(k, a)))
const yesNo = (prompt: string, yes: boolean, explanation: string) => choice(prompt, yes ? 'Oui' : 'Non', [yes ? 'Non' : 'Oui'], explanation)
const REP = ['Dans un repère orthonormé de l’espace,', 'L’espace est muni d’un repère orthonormé ;', 'On travaille dans un repère orthonormé de l’espace :']
const rep = () => pick(REP)

// ════════════════════════════════════════════════════════════════════════
// Palier 1 — lecture et application directe
// ════════════════════════════════════════════════════════════════════════

const pointAt = variants(
  () => {
    const A = rp(5), u = rnz(4), t = pick([-3, -2, -1, 2, 3, 4]), P = add3(A, mul3(t, u))
    return triplet(`${rep()} on considère la droite ${lineTxt('d', A, u)}. Quelles sont les coordonnées du point de d de paramètre t = ${fmt(t)} ?`, P, {
      explanation: `On remplace t par ${fmt(t)} : x = ${evalT(A[0], u[0], t)} ; y = ${evalT(A[1], u[1], t)} ; z = ${evalT(A[2], u[2], t)}. Point ${t3(P)}.`,
    })
  },
  () => {
    const A: V3 = [randInt(-5, 5), randInt(-5, 5), randInt(0, 5)], u: V3 = [randNonZero(-3, 3), randInt(-3, 3), randInt(1, 3)], t = randInt(2, 6), P = add3(A, mul3(t, u))
    return triplet(`Un drone vole en ligne droite. À l’instant t (en secondes), sa position est donnée par x = ${coordT(A[0], u[0])} ; y = ${coordT(A[1], u[1])} ; z = ${coordT(A[2], u[2])} (en mètres). Où se trouve-t-il à l’instant t = ${t} ?`, P, {
      explanation: `On remplace t par ${t} : x = ${evalT(A[0], u[0], t)} ; y = ${evalT(A[1], u[1], t)} ; z = ${evalT(A[2], u[2], t)}. Position ${t3(P)}.`,
    })
  },
  () => {
    const A = rp(5), u = rnz(4), t = pick([-2, -1, 2, 3]), P = add3(A, mul3(t, u))
    return triplet(`La droite Δ est définie par ${paramTxt(A, u, 'k')}, où k décrit ℝ. Donne les coordonnées du point M de Δ obtenu pour k = ${fmt(t)}.`, P, {
      explanation: `Pour k = ${fmt(t)} : x = ${evalT(A[0], u[0], t)} ; y = ${evalT(A[1], u[1], t)} ; z = ${evalT(A[2], u[2], t)}. M${t3(P)}.`,
    })
  },
  () => {
    const A = rp(5), u = rnz(4)
    return triplet(`${rep()} on considère ${lineTxt('d', A, u)}. On note A et B les points de d de paramètres t = 0 et t = 1. Quelles sont les coordonnées du vecteur AB⃗ ?`, u, {
      explanation: `A${t3(A)} (t = 0) et B${t3(add3(A, u))} (t = 1) : AB⃗${t3(u)}, c’est le vecteur formé par les coefficients de t.`,
    })
  },
)

const readLine = variants(
  () => {
    const A = rp(5), u = rnz(4)
    return direction(`${rep()} on considère ${lineTxt('d', A, u)}. Donne un vecteur directeur de d.`, u, {
      explanation: `Les coefficients de t donnent un vecteur directeur : u⃗${t3(u)} (tout vecteur non nul colinéaire convient).`,
    })
  },
  () => {
    const A = rp(5), u = rnz(4)
    return pointOnLine(`${rep()} on considère ${lineTxt('d', A, u)}. Donne les coordonnées d’un point de d.`, A, u,
      `Pour t = 0, on obtient le point ${t3(A)} (pour t = 1, ${t3(add3(A, u))}, etc. : tout point de d convient).`)
  },
  () => {
    const A = rp(5), B = retry(() => { const B = rp(5); return isZero3(sub3(B, A)) ? null : B })
    return direction(`${rep()} on donne A${t3(A)} et B${t3(B)}. Donne un vecteur directeur de la droite (AB).`, sub3(B, A), {
      explanation: `AB⃗${t3(sub3(B, A))} dirige la droite (AB) (tout vecteur non nul colinéaire convient).`,
    })
  },
  () => {
    const yes = Math.random() < 0.5, A = rp(4), B = rp(4), u = rnz(3)
    const v = yes ? mul3(pick([-2, -1, 2, 3]), u) : retry(() => { const v = rnz(3); return isZero3(cross3(u, v)) ? null : v })
    return yesNo(`On considère ${lineTxt('d', A, u)} et ${lineTxt('d′', B, v, 's')}. Les droites d et d′ ont-elles la même direction (vecteurs directeurs colinéaires) ?`, yes,
      `Vecteurs directeurs u⃗${t3(u)} et v⃗${t3(v)} : ${yes ? `v⃗ = ${fmt(v.find((c) => c !== 0)! / u[v.findIndex((c) => c !== 0)])}u⃗, ils sont colinéaires.` : 'leurs coordonnées ne sont pas proportionnelles, ils ne sont pas colinéaires.'}`)
  },
)

const readPlane = variants(
  () => {
    const n = rn(), d = randInt(-9, 9)
    return direction(`${rep()} le plan P a pour équation ${planeTxt(n, d)}. Donne un vecteur normal à P.`, n, {
      explanation: `Pour ax + by + cz + d = 0, n⃗(a ; b ; c) est normal au plan : n⃗${t3(n)} (ou tout vecteur non nul colinéaire).`,
    })
  },
  () => {
    const yes = Math.random() < 0.5, n = rn(), M = rp(4), d = dOf(n, M) + (yes ? 0 : randNonZero(-3, 3))
    return yesNo(`Le point M${t3(M)} appartient-il au plan P : ${planeTxt(n, d)} ?`, yes,
      `On remplace : ${subst(n, d, M)} = ${fmt(dot3(n, M) + d)}${yes ? ' : l’équation est vérifiée, M ∈ P.' : ' ≠ 0 : M n’est pas dans P.'}`)
  },
  fresh(() => {
    const n = rn(), M = rp(4), d = dOf(n, M)
    return numeric(`Le plan P d’équation ${lhs(n, 0)} + d = 0 passe par le point A${t3(M)}. Que vaut d ?`, d, {
      explanation: `A ∈ P : ${subst(n, 0, M)} + d = 0, soit ${fmt(dot3(n, M))} + d = 0, donc d = ${fmt(d)}.`,
    })
  }),
  fresh(() => {
    const [n, M] = retry(() => { const n = rn(); return n[2] !== 0 ? [n, rp(4)] as [V3, V3] : null })
    const d = dOf(n, M)
    return numeric(`Le point M(${fmt(M[0])} ; ${fmt(M[1])} ; z) appartient au plan P : ${planeTxt(n, d)}. Que vaut z ?`, M[2], {
      explanation: `${sumOf([...[0, 1].map((i) => (n[i] === 0 ? '' : `${par(n[i])} × ${par(M[i])}`)), d === 0 ? '' : par(d), mono(n[2], 'z')])} = 0, donc ${poly([n[2], 'z'])} = ${fmt(n[2] * M[2])} et z = ${fmt(M[2])}.`,
    })
  }),
)

const writeLine = variants(
  () => {
    const A = rp(5), u = rnz(4)
    return paramLine(`${rep()} donne une représentation paramétrique de la droite d passant par A${t3(A)} et de vecteur directeur u⃗${t3(u)}.`, A, u,
      `M(x ; y ; z) ∈ d ⇔ AM⃗ = t u⃗ : ${paramTxt(A, u)} (t ∈ ℝ). D’autres écritures sont justes (autre point de d, vecteur colinéaire).`)
  },
  () => {
    const A = rp(5), k = randInt(0, 2), u = [0, 1, 2].map((i) => (i === k ? 1 : 0)) as V3
    const ax = ['des abscisses', 'des ordonnées', 'des cotes'][k]
    return paramLine(`Donne une représentation paramétrique de la droite passant par A${t3(A)} et parallèle à l’axe ${ax}.`, A, u,
      `Elle est dirigée par le vecteur ${['i⃗', 'j⃗', 'k⃗'][k]}${t3(u)} : ${paramTxt(A, u)} (t ∈ ℝ) — seule la coordonnée ${XYZ[k]} varie.`)
  },
  () => {
    const A: V3 = [randInt(-5, 5), randInt(-5, 5), randInt(0, 6)], u = rnz(3)
    return paramLine(`Un rayon laser part de la source S${t3(A)} dans la direction du vecteur u⃗${t3(u)}. Donne une représentation paramétrique de la droite qui porte ce rayon.`, A, u,
      `Droite passant par S dirigée par u⃗ : ${paramTxt(A, u)} (t ∈ ℝ).`)
  },
)

// ════════════════════════════════════════════════════════════════════════
// Palier 2
// ════════════════════════════════════════════════════════════════════════

const onLine = fresh(variants(
  () => {
    const [A, u] = retry(() => { const u = rnz(4); return u[0] !== 0 ? [rp(5), u] as [V3, V3] : null }), t = randNonZero(-4, 4), M = add3(A, mul3(t, u))
    return numeric(`Le point M${t3(M)} appartient à la droite ${lineTxt('d', A, u)}. Pour quelle valeur du paramètre t ?`, t, {
      explanation: `x : ${coordT(A[0], u[0])} = ${fmt(M[0])} donne t = ${fmt(t)} ; on vérifie avec y et z.`,
    })
  },
  () => {
    const [A, u, i, j] = retry(() => {
      const u = rnz(4), i = randInt(0, 2), j = pick([0, 1, 2].filter((k) => k !== i))
      return u[i] !== 0 ? [rp(5), u, i, j] as [V3, V3, number, number] : null
    })
    const t = randNonZero(-3, 3), M = add3(A, mul3(t, u))
    const ms = M.map((c, k) => (k === j ? XYZ[k] : fmt(c)))
    return numeric(`Le point M(${ms.join(' ; ')}) appartient à la droite ${lineTxt('d', A, u)}. Que vaut ${XYZ[j]} ?`, M[j], {
      explanation: `La coordonnée ${XYZ[i]} donne ${coordT(A[i], u[i])} = ${fmt(M[i])}, soit t = ${fmt(t)}. Alors ${XYZ[j]} = ${evalT(A[j], u[j], t)}.`,
    })
  },
  () => {
    const yes = Math.random() < 0.5, A = rp(4), u = rnz(3), t = randNonZero(-3, 3)
    const M = add3(add3(A, mul3(t, u)), yes ? [0, 0, 0] : scramble([0, 0, randNonZero(-2, 2)]))
    const ok = colinear(sub3(M, A), u)
    return yesNo(`Le point M${t3(M)} appartient-il à la droite ${lineTxt('d', A, u)} ?`, ok,
      ok ? `Pour t = ${fmt(t)}, on obtient bien ${t3(M)} : M ∈ d.`
        : `Il faudrait un même t pour les trois coordonnées : ${[0, 1, 2].filter((k) => u[k] !== 0).map((k) => `${XYZ[k]} donne t = ${fracText(M[k] - A[k], u[k])}`).join(', ')}${[0, 1, 2].some((k) => u[k] === 0 && M[k] !== A[k]) ? ` (et une coordonnée constante ne correspond pas)` : ''} : aucun t ne convient, M ∉ d.`)
  },
  () => {
    const A: V3 = [randInt(-5, 5), randInt(-5, 5), randInt(0, 4)], u: V3 = [randInt(-3, 3), randInt(-3, 3), randInt(1, 4)], t = randInt(2, 8), h = A[2] + u[2] * t
    return numeric(`Une montgolfière monte en ligne droite : à l’instant t (en minutes), sa position est x = ${coordT(A[0], u[0])} ; y = ${coordT(A[1], u[1])} ; z = ${coordT(A[2], u[2])} (en dizaines de mètres). À quel instant atteint-elle l’altitude z = ${h} ?`, t, {
      explanation: `${coordT(A[2], u[2])} = ${h} ⇔ ${u[2] === 1 ? 't' : `${u[2]}t`} = ${h - A[2]} ⇔ t = ${t} minutes.`,
    })
  },
))

const planeThrough = variants(
  () => {
    const n = rn(), A = rp4(), d = dOf(n, A)
    return planeEq(`${rep()} donne une équation cartésienne du plan P passant par A${t3(A)} et de vecteur normal n⃗${t3(n)}.`, n, d,
      `P : ${lhs(n, 0)} + d = 0 et A ∈ P : ${fmt(dot3(n, A))} + d = 0, d = ${fmt(d)}. P : ${planeTxt(n, d)}.`)
  },
  fresh(() => {
    const n = rn(), A = rp4(), d = dOf(n, A)
    return numeric(`Le plan P passe par A${t3(A)} et admet n⃗${t3(n)} pour vecteur normal. Son équation s’écrit ${lhs(n, 0)} + d = 0 : que vaut d ?`, d, {
      explanation: `A ∈ P : ${subst(n, 0, A)} + d = 0, soit ${fmt(dot3(n, A))} + d = 0, donc d = ${fmt(d)}.`,
    })
  }),
  () => {
    const A = rp4(), B = rp4(), C = retry(() => { const C = rp4(); return sub3(C, B).filter((c) => c !== 0).length >= 2 ? C : null }), n = sub3(C, B), d = dOf(n, A)
    return planeEq(`${rep()} on donne A${t3(A)}, B${t3(B)} et C${t3(C)}. Donne une équation cartésienne du plan passant par A et perpendiculaire à la droite (BC).`, n, d,
      `BC⃗${t3(n)} est normal au plan : ${lhs(n, 0)} + d = 0, et A donne d = ${fmt(d)}. Plan : ${planeTxt(n, d)}.`)
  },
  () => {
    const n = rn(), A = rp4(), d0 = randInt(-9, 9), d = dOf(n, A)
    return planeEq(`Donne une équation cartésienne du plan passant par A${t3(A)} et parallèle au plan P : ${planeTxt(n, d0)}.`, n, d,
      `Plans parallèles : même vecteur normal n⃗${t3(n)}. ${lhs(n, 0)} + d = 0 avec A : d = ${fmt(d)}. Plan : ${planeTxt(n, d)}.`)
  },
)

const axisInter = variants(
  () => {
    const [A, u, t] = retry(() => {
      const u: V3 = [randInt(-3, 3), randInt(-3, 3), randNonZero(-3, 3)], t = randNonZero(-3, 3), A = rp(4)
      A[2] = -t * u[2]
      return Math.abs(A[2]) <= 9 ? [A, u, t] as [V3, V3, number] : null
    })
    const P = add3(A, mul3(t, u))
    return triplet(`${rep()} on considère ${lineTxt('d', A, u)}. En quel point d coupe-t-elle le plan (xOy), d’équation z = 0 ?`, P, {
      explanation: `z = 0 ⇔ ${coordT(A[2], u[2])} = 0 ⇔ t = ${fmt(t)}. Puis x = ${evalT(A[0], u[0], t)} et y = ${evalT(A[1], u[1], t)} : point ${t3(P)}.`,
    })
  },
  () => {
    const [n, x] = retry(() => { const n = rn(), x = randNonZero(-5, 5); return n[0] !== 0 ? [n, x] as [V3, number] : null }), d = -n[0] * x
    return triplet(`Le plan P : ${planeTxt(n, d)} coupe l’axe des abscisses en un point. Quelles sont ses coordonnées ?`, [x, 0, 0], {
      explanation: `Sur l’axe des abscisses, y = z = 0 : ${poly([n[0], 'x'], [d, ''])} = 0, d’où x = ${fmt(x)}. Point (${fmt(x)} ; 0 ; 0).`,
    })
  },
  () => {
    const [A, u, k, t] = retry(() => {
      const u = rnz(3), A = rp(4), t = randNonZero(-3, 3)
      return u[0] !== 0 ? [A, u, A[0] + t * u[0], t] as [V3, V3, number, number] : null
    })
    const P = add3(A, mul3(t, u))
    return triplet(`On considère ${lineTxt('d', A, u)}. Quelles sont les coordonnées du point d’intersection de d avec le plan d’équation x = ${fmt(k)} ?`, P, {
      explanation: `x = ${fmt(k)} ⇔ ${coordT(A[0], u[0])} = ${fmt(k)} ⇔ t = ${fmt(t)}. Point ${t3(P)}.`,
    })
  },
  fresh(() => {
    const [n, z] = retry(() => { const n = rn(), z = randNonZero(-5, 5); return n[2] !== 0 ? [n, z] as [V3, number] : null }), d = -n[2] * z
    return numeric(`Le plan P : ${planeTxt(n, d)} coupe l’axe des cotes (Oz) en un point. Quelle est sa cote ?`, z, {
      explanation: `Sur (Oz), x = y = 0 : ${poly([n[2], 'z'], [d, ''])} = 0, d’où z = ${fmt(z)}.`,
    })
  }),
)

const planesParam = variants(
  fresh(() => {
    const [n, k, i] = retry(() => { const n = rn(), i = randInt(0, 2); return n[i] !== 0 && n.filter((c) => c !== 0).length >= 2 ? [n, pick([-2, 2, 3, -3]), i] as [V3, number, number] : null })
    const m = mul3(k, n), d1 = randInt(-6, 6), d2 = randInt(-9, 9)
    const q = poly(...[0, 1, 2].map((j) => (j === i ? [1, `m${XYZ[j]}`] : [m[j], XYZ[j]]) as [number, string]), [d2, ''])
    const j0 = [0, 1, 2].find((j) => j !== i && n[j] !== 0)!
    return numeric(`Pour quelle valeur de m les plans P : ${planeTxt(n, d1)} et Q : ${q} = 0 sont-ils parallèles ?`, m[i], {
      explanation: `Parallèles ⇔ vecteurs normaux colinéaires : la coordonnée ${XYZ[j0]} donne le coefficient ${F(fmt(m[j0]), par(n[j0]))} = ${fmt(k)}, donc m = ${fmt(k)} × ${par(n[i])} = ${fmt(m[i])}.`,
    })
  }),
  fresh(() => {
    const [n, w, i] = retry(() => {
      const n = rn(), w = rn(), i = randInt(0, 2)
      if (n[i] === 0) return null
      const rest = dot3(n, w) - n[i] * w[i]
      if (rest % n[i] !== 0 || Math.abs(rest / n[i]) > 12) return null
      w[i] = -rest / n[i]
      return [n, w, i] as [V3, V3, number]
    })
    const d1 = randInt(-6, 6), d2 = randInt(-9, 9)
    const q = poly(...[0, 1, 2].map((j) => (j === i ? [1, `m${XYZ[j]}`] : [w[j], XYZ[j]]) as [number, string]), [d2, ''])
    return numeric(`Pour quelle valeur de m les plans P : ${planeTxt(n, d1)} et Q : ${q} = 0 sont-ils perpendiculaires ?`, w[i], {
      explanation: `Perpendiculaires ⇔ vecteurs normaux orthogonaux : ${sumOf([0, 1, 2].map((j) => (j === i ? mono(n[i], 'm') : n[j] * w[j] === 0 ? '' : `${par(n[j])} × ${par(w[j])}`)))} = 0, donc m = ${fmt(w[i])}.`,
    })
  }),
  () => {
    const kind = pick(['parallèles', 'perpendiculaires', 'ni parallèles ni perpendiculaires'])
    const n = rn()
    const w = kind === 'parallèles' ? mul3(pick([-2, -1, 2, 3]), n)
      : retry(() => { const w = rn(); return !colinear(w, n) && (dot3(w, n) === 0) === (kind === 'perpendiculaires') ? w : null })
    const d1 = randInt(-6, 6), d2 = kind === 'parallèles' ? randInt(-9, 9) : randInt(-6, 6)
    return choice(`Les plans P : ${planeTxt(n, d1)} et Q : ${planeTxt(w, d2)} sont :`, kind, ['parallèles', 'perpendiculaires', 'ni parallèles ni perpendiculaires'],
      `n⃗${t3(n)} et n⃗′${t3(w)} : ${kind === 'parallèles' ? 'coordonnées proportionnelles, les plans sont parallèles (ou confondus).' : `n⃗ · n⃗′ = ${fmt(dot3(n, w))}${kind === 'perpendiculaires' ? ' : les plans sont perpendiculaires.' : ' ≠ 0 et les vecteurs ne sont pas colinéaires : ni parallèles ni perpendiculaires.'}`}`)
  },
  fresh(() => {
    const [n, k, i] = retry(() => { const n = rn(), i = randInt(0, 2); return n[i] !== 0 ? [n, pick([-2, -1, 2, 3]), i] as [V3, number, number] : null })
    const u = mul3(k, n), A = rp(4), d = randInt(-6, 6)
    const us = u.map((c, j) => (j === i ? 'm' : fmt(c))).join(' ; ')
    const j0 = [0, 1, 2].find((j) => j !== i && n[j] !== 0)
    if (j0 === undefined) return numeric(`La droite d passe par A${t3(A)} et est dirigée par u⃗(${us}) ; elle est perpendiculaire au plan P : ${planeTxt(n, d)}. Que vaut m ?`, u[i], { explanation: `u⃗ doit être colinéaire à n⃗${t3(n)} : m = ${fmt(u[i])}.` })
    return numeric(`La droite d passe par A${t3(A)} et est dirigée par u⃗(${us}). Pour quelle valeur de m est-elle perpendiculaire au plan P : ${planeTxt(n, d)} ?`, u[i], {
      explanation: `d ⊥ P ⇔ u⃗ colinéaire à n⃗${t3(n)}. La coordonnée ${XYZ[j0]} donne u⃗ = ${fmt(k)}n⃗, donc m = ${fmt(k)} × ${par(n[i])} = ${fmt(u[i])}.`,
    })
  }),
)

// ════════════════════════════════════════════════════════════════════════
// Palier 3 — exercices standard
// ════════════════════════════════════════════════════════════════════════

/** Droite (A ; u) et plan (n ; d) sécants au point de paramètre t0. */
function linePlane() {
  return retry(() => {
    const A = rp(4), u = rnz(3), n = rn(), t0 = randNonZero(-3, 3)
    if (dot3(n, u) === 0) return null
    const I = add3(A, mul3(t0, u)), d = dOf(n, I)
    return Math.abs(d) <= 20 ? { A, u, n, d, t0, I } : null
  })
}
const lpExpl = (A: V3, u: V3, n: V3, d: number, t0: number, I: V3) =>
  `On injecte x = ${coordT(A[0], u[0])}, y = ${coordT(A[1], u[1])}, z = ${coordT(A[2], u[2])} dans l’équation : ${fmt(dot3(n, A) + d)} + ${mono(dot3(n, u), 't')} = 0, d’où t = ${fmt(t0)} et le point ${t3(I)}.`
const interLP = variants(
  () => {
    const { A, u, n, d, t0, I } = linePlane()
    return triplet(`${rep()} on considère ${lineTxt('d', A, u)} et le plan P : ${planeTxt(n, d)}. Quelles sont les coordonnées du point d’intersection de d et P ?`, I, { explanation: lpExpl(A, u, n, d, t0, I) })
  },
  () => {
    const { A, u, n, d, t0, I } = linePlane()
    return withMeta(triplet(`Un rayon lumineux part du point S${t3(A)} et suit la direction u⃗${t3(u)}. Il frappe un miroir plan d’équation ${planeTxt(n, d)}. En quel point ?`, I, {
      explanation: `Le rayon est porté par la droite x = ${coordT(A[0], u[0])} ; y = ${coordT(A[1], u[1])} ; z = ${coordT(A[2], u[2])}. ${lpExpl(A, u, n, d, t0, I)}`,
    }), { figure: planeSketch({ on: { I: [0.5, 0.5] }, ray: 'I', name: 'miroir' }) })
  },
  fresh(() => {
    const { A, u, n, d, t0, I } = linePlane()
    return numeric(`La droite ${lineTxt('d', A, u)} coupe le plan P : ${planeTxt(n, d)}. Pour quelle valeur du paramètre t ?`, t0, { explanation: lpExpl(A, u, n, d, t0, I) })
  }),
  () => {
    const { A, u, n, d, t0, I } = linePlane(), B = add3(A, u)
    return triplet(`${rep()} on donne A${t3(A)}, B${t3(B)} et le plan P : ${planeTxt(n, d)}. En quel point la droite (AB) coupe-t-elle P ?`, I, {
      explanation: `(AB) : AB⃗${t3(u)}, donc x = ${coordT(A[0], u[0])}, y = ${coordT(A[1], u[1])}, z = ${coordT(A[2], u[2])}. ${lpExpl(A, u, n, d, t0, I)}`,
    })
  },
)

const LP_KINDS = ['sécante au plan', 'strictement parallèle au plan', 'contenue dans le plan']
const posLP = variants(
  ...LP_KINDS.map((kind) => () => {
    const n = rn(), A = rp(4)
    const u = kind === 'sécante au plan' ? retry(() => { const u = rnz(3); return dot3(u, n) !== 0 ? u : null }) : pick(orthoTo(n, 3))
    const d = dOf(n, A) + (kind === 'strictement parallèle au plan' ? randNonZero(-4, 4) : 0)
    const nu = dot3(n, u)
    return choice(`On considère ${lineTxt('d', A, u)} et le plan P : ${planeTxt(n, d)}. La droite d est :`, kind, LP_KINDS,
      `n⃗${t3(n)} est normal à P et u⃗${t3(u)} dirige d : n⃗ · u⃗ = ${fmt(nu)}. ` + (nu !== 0 ? 'Non nul : d coupe P en un point.'
        : `Nul : d est parallèle à P. Le point ${t3(A)} de d donne ${subst(n, d, A)} = ${fmt(dot3(n, A) + d)}${kind === 'contenue dans le plan' ? ' : il est dans P, donc d ⊂ P.' : ' ≠ 0 : il n’est pas dans P, d est strictement parallèle à P.'}`))
  }),
)

const writeLine2 = variants(
  () => {
    const A = rp(4), B = retry(() => { const B = rp(4); return sub3(B, A).filter((c) => c !== 0).length >= 2 ? B : null }), u = sub3(B, A)
    return paramLine(`${rep()} on donne A${t3(A)} et B${t3(B)}. Donne une représentation paramétrique de la droite (AB).`, A, u,
      `(AB) passe par A et est dirigée par AB⃗${t3(u)} : ${paramTxt(A, u)} (t ∈ ℝ).`)
  },
  () => {
    const n = rn(), A = rp(4), d = randInt(-8, 8)
    return paramLine(`Donne une représentation paramétrique de la droite passant par A${t3(A)} et perpendiculaire au plan P : ${planeTxt(n, d)}.`, A, n,
      `Une droite perpendiculaire à P est dirigée par un vecteur normal n⃗${t3(n)} : ${paramTxt(A, n)} (t ∈ ℝ).`)
  },
  () => {
    const A = rp(4), B = rp(4), u = rnz(3)
    return paramLine(`Donne une représentation paramétrique de la droite passant par A${t3(A)} et parallèle à ${lineTxt('d′', B, u, 's')}.`, A, u,
      `Même direction que d′ : u⃗${t3(u)} (coefficients de s). Droite : ${paramTxt(A, u)} (t ∈ ℝ).`)
  },
)

const LL_KINDS = ['parallèles', 'sécantes', 'non coplanaires']
function twoLines(kind: string) {
  return retry(() => {
    const A = rp(4), u = rnz(3)
    if (kind === 'parallèles') {
      const v = mul3(pick([-2, -1, 2]), u), B = rp(4)
      return colinear(sub3(B, A), u) ? null : { A, u, B, v }
    }
    const v = rnz(3)
    if (colinear(u, v)) return null
    if (kind === 'sécantes') {
      const t = randNonZero(-2, 2), s = randNonZero(-2, 2), I = add3(A, mul3(t, u)), B = sub3(I, mul3(s, v))
      return Math.max(...B.map(Math.abs)) <= 9 ? { A, u, B, v, t, s, I } : null
    }
    const B = rp(4)
    return dot3(cross3(u, v), sub3(B, A)) !== 0 ? { A, u, B, v } : null
  })
}
const posLL = variants(
  ...LL_KINDS.map((kind) => () => {
    const L = twoLines(kind)
    const expl = kind === 'parallèles'
      ? `Vecteurs directeurs ${t3(L.u)} et ${t3(L.v)} colinéaires, et le point ${t3(L.B)} de d′ n’est pas sur d : droites strictement parallèles.`
      : kind === 'sécantes'
        ? `Vecteurs directeurs non colinéaires. Le système (égalité des coordonnées) a pour solution t = ${fmt(L.t!)} et s = ${fmt(L.s!)} : les droites se coupent en ${t3(L.I!)}.`
        : `Vecteurs directeurs non colinéaires (pas parallèles), et le système formé par l’égalité des trois coordonnées n’a pas de solution (pas de point commun) : non coplanaires.`
    return choice(`On considère ${lineTxt('d', L.A, L.u)} et ${lineTxt('d′', L.B, L.v, 's')}. Les droites d et d′ sont :`, kind, LL_KINDS, expl)
  }),
)

// ════════════════════════════════════════════════════════════════════════
// Palier 4
// ════════════════════════════════════════════════════════════════════════

function projSetup() {
  return retry(() => {
    const n = rn(), H = rp(4), k = randNonZero(-2, 2), M = add3(H, mul3(k, n)), d = dOf(n, H)
    return Math.max(...M.map(Math.abs)) <= 10 && Math.abs(d) <= 20 ? { n, H, k, M, d } : null
  })
}
const projExpl = (n: V3, d: number, M: V3, k: number, H: V3) =>
  `La perpendiculaire à P passant par M : x = ${coordT(M[0], n[0])}, y = ${coordT(M[1], n[1])}, z = ${coordT(M[2], n[2])}. Dans l’équation de P : ${fmt(dot3(n, M) + d)} + ${mono(n2(n), 't')} = 0, t = ${fmt(-k)}, d’où H${t3(H)}.`
const projPlaneEq = variants(
  () => {
    const { n, H, k, M, d } = projSetup()
    return triplet(`${rep()} on donne le plan P : ${planeTxt(n, d)} et le point M${t3(M)}. Quelles sont les coordonnées du projeté orthogonal H de M sur P ?`, H, { explanation: projExpl(n, d, M, k, H) })
  },
  () => {
    const { n, H, k, M, d } = projSetup(), S = sub3(mul3(2, H), M)
    return triplet(`On donne le plan P : ${planeTxt(n, d)} et le point M${t3(M)}. Quelles sont les coordonnées du symétrique M′ de M par rapport à P ?`, S, {
      explanation: `${projExpl(n, d, M, k, H)} H est le milieu de [MM′] : M′ = 2H − M = ${t3(S)}.`,
    })
  },
  () => {
    const { n, H, k, M, d } = projSetup()
    return exactRoot(`On donne le plan P : ${planeTxt(n, d)} et le point M${t3(M)}. Calcule la distance MH, où H est le projeté orthogonal de M sur P (valeur exacte).`, k * k * n2(n),
      `${projExpl(n, d, M, k, H)} MH⃗ = ${fmt(-k)}n⃗, donc MH = ${Math.abs(k) === 1 ? '' : `${Math.abs(k)} × `}‖n⃗‖ = ${Math.abs(k) === 1 ? '' : `${Math.abs(k)}`}√{${n2(n)}} = ${rootText(k * k * n2(n))}.`)
  },
  () => {
    const { n, H, k, M, d } = projSetup()
    return withMeta(triplet(`Une lampe est fixée au point M${t3(M)} au-dessus d’une rampe plane d’équation ${planeTxt(n, d)}. On veut poser un capteur exactement à la verticale de la rampe, au pied H de la perpendiculaire issue de M. Coordonnées de H ?`, H, { explanation: projExpl(n, d, M, k, H) }),
      { figure: planeSketch({ above: 'M', name: 'rampe' }) })
  },
)

const interLL = variants(
  () => {
    const L = twoLines('sécantes')
    return triplet(`${rep()} les droites ${lineTxt('d', L.A, L.u)} et ${lineTxt('d′', L.B, L.v, 's')} sont sécantes. Quelles sont les coordonnées de leur point d’intersection ?`, L.I!, {
      explanation: `On égale les coordonnées : ${[0, 1, 2].map((i) => `${coordT(L.A[i], L.u[i])} = ${coordT(L.B[i], L.v[i], 's')}`).join(' ; ')}. Deux équations donnent t = ${fmt(L.t!)} et s = ${fmt(L.s!)} (la troisième est vérifiée) : point ${t3(L.I!)}.`,
    })
  },
  () => {
    const L = twoLines('sécantes'), C = add3(L.B, L.v)
    return triplet(`On donne ${lineTxt('d', L.A, L.u)}, et les points B${t3(L.B)} et C${t3(C)}. La droite (BC) coupe d : en quel point ?`, L.I!, {
      explanation: `(BC) : x = ${coordT(L.B[0], L.v[0], 's')}, y = ${coordT(L.B[1], L.v[1], 's')}, z = ${coordT(L.B[2], L.v[2], 's')}. En égalant avec d : t = ${fmt(L.t!)}, s = ${fmt(L.s!)}, point ${t3(L.I!)}.`,
    })
  },
  fresh(() => {
    const L = twoLines('sécantes')
    return numeric(`Les droites ${lineTxt('d', L.A, L.u)} et ${lineTxt('d′', L.B, L.v, 's')} se coupent en un point I. Quelle est la valeur du paramètre t de I sur d ?`, L.t!, {
      explanation: `On égale les coordonnées des deux représentations et on résout le système en (t ; s) : t = ${fmt(L.t!)}, s = ${fmt(L.s!)} ; I${t3(L.I!)}.`,
    })
  }),
)

const planeABC = variants(
  () => {
    const n = rn(), [u, v] = planeBasis(n, 3), A = rp(3), B = add3(A, u), C = add3(A, v), d = dOf(n, A)
    return planeEq(`${rep()} on donne A${t3(A)}, B${t3(B)} et C${t3(C)}. Donne une équation cartésienne du plan (ABC).`, n, d,
      `On cherche n⃗ orthogonal à AB⃗${t3(u)} et AC⃗${t3(v)} : par exemple n⃗${t3(reduce3(n))}. Puis d avec A : ${planeTxt(n, d)} (toute équation proportionnelle convient).`)
  },
  () => {
    const n = rn(), [u, w] = planeBasis(n, 3), P0 = rp(3), A = add3(P0, w), d = dOf(n, P0)
    return planeEq(`Donne une équation cartésienne du plan contenant la droite ${lineTxt('d', P0, u)} et le point A${t3(A)}.`, n, d,
      `Le plan contient le point ${t3(P0)} de d, il est dirigé par u⃗${t3(u)} et par le vecteur ${t3(w)} qui va de ce point à A. Un vecteur normal orthogonal aux deux : n⃗${t3(reduce3(n))}. Équation : ${planeTxt(n, d)}.`)
  },
  () => {
    const n = rn(), [u, v] = planeBasis(n, 3), A = rp(3), d = dOf(n, A)
    return planeEq(`Donne une équation cartésienne du plan passant par A${t3(A)} et dirigé par les vecteurs u⃗${t3(u)} et v⃗${t3(v)}.`, n, d,
      `n⃗(a ; b ; c) avec n⃗ · u⃗ = 0 et n⃗ · v⃗ = 0 : par exemple n⃗${t3(reduce3(n))}. Avec A : ${planeTxt(n, d)}.`)
  },
)

const NN = NICE_NORMALS.filter((n) => n.filter((c) => c !== 0).length >= 2)
const distEq = variants(
  () => {
    const n = scramble(pick(NN)), N = Math.sqrt(n2(n)), d = randInt(-9, 9), M = retry(() => { const M = rp(5); return dot3(n, M) + d !== 0 ? M : null })
    const v = Math.abs(dot3(n, M) + d)
    return fraction(`${rep()} calcule la distance du point M${t3(M)} au plan P : ${planeTxt(n, d)}.`, v, N, {
      explanation: `d = ${F('|ax_M + by_M + cz_M + d|', '√{a² + b² + c²}')} = ${F(`|${subst(n, d, M)}|`, `√{${n2(n)}}`)} = ${frac(v, N)}.`,
    })
  },
  () => {
    const n = scramble(pick(NN)), N = Math.sqrt(n2(n)), d = randNonZero(-12, 12)
    return fraction(`Quelle est la distance de l’origine O au plan P : ${planeTxt(n, d)} ?`, Math.abs(d), N, {
      explanation: `En O, ax + by + cz + d vaut ${fmt(d)} ; ‖n⃗‖ = √{${n2(n)}} = ${N}, donc la distance est ${frac(Math.abs(d), N)}.`,
    })
  },
  () => {
    const n = scramble(pick(NN)), N = Math.sqrt(n2(n)), d1 = randInt(-9, 9), d2 = retry(() => { const d2 = randInt(-12, 12); return d2 !== d1 ? d2 : null })
    return fraction(`Les plans P : ${planeTxt(n, d1)} et Q : ${planeTxt(n, d2)} sont parallèles. Quelle est la distance entre eux ?`, Math.abs(d1 - d2), N, {
      explanation: `Même vecteur normal n⃗${t3(n)}. Un point de Q est à la distance ${F(`|${fmt(d1)} − ${par(d2)}|`, `‖n⃗‖`)} de P = ${frac(Math.abs(d1 - d2), N)}.`,
    })
  },
  () => {
    const n = scramble(pick(NN)), N = Math.sqrt(n2(n)), d = randInt(-6, 6)
    const M: V3 = [randInt(0, 6), randInt(0, 6), randInt(6, 12)], v = Math.abs(dot3(n, M) + d)
    if (v === 0) return distEq()
    return withMeta(fraction(`Un drone est en vol stationnaire au point M${t3(M)}. Le versant d’une colline est modélisé par le plan d’équation ${planeTxt(n, d)} (unité : 10 m). À quelle distance du versant se trouve le drone (en unités) ?`, v, N, {
      explanation: `d = ${F(`|${subst(n, d, M)}|`, `√{${n2(n)}}`)} = ${frac(v, N)}.`,
    }), { figure: planeSketch({ above: 'M', name: 'versant' }) })
  },
)

// ════════════════════════════════════════════════════════════════════════
// Palier 5 — exigeant
// ════════════════════════════════════════════════════════════════════════

const distPointLine = variants(
  () => {
    const [A, u, t, w] = retry(() => {
      const u = rnz(3), w = pick(orthoTo(u, 3)), A = rp(3), t = randNonZero(-2, 2)
      return n2(w) <= 40 ? [A, u, t, w] as [V3, V3, number, V3] : null
    })
    const H = add3(A, mul3(t, u)), M = add3(H, w)
    return exactRoot(`${rep()} calcule la distance du point M${t3(M)} à la droite ${lineTxt('d', A, u)} (valeur exacte).`, n2(w),
      `Le point H(t) de d tel que HM⃗ · u⃗ = 0 : on trouve t = ${fmt(t)}, H${t3(H)}. HM⃗${t3(w)}, HM = √{${n2(w)}} = ${rootText(n2(w))}.`)
  },
  () => {
    const [A, u, t, w] = retry(() => {
      const u = rnz(3), w = pick(orthoTo(u, 3)), A = rp(3), t = randNonZero(-2, 2)
      return n2(w) <= 40 ? [A, u, t, w] as [V3, V3, number, V3] : null
    })
    const H = add3(A, mul3(t, u)), M = add3(H, w)
    return triplet(`${rep()} quel est le point H de la droite ${lineTxt('d', A, u)} le plus proche de M${t3(M)} ?`, H, {
      explanation: `H est le projeté orthogonal de M : HM⃗ · u⃗ = 0 avec H(t) = (${coordT(A[0], u[0])} ; ${coordT(A[1], u[1])} ; ${coordT(A[2], u[2])}). L’équation du premier degré donne t = ${fmt(t)}, H${t3(H)}.`,
    })
  },
)

const special = variants(
  () => {
    const [A, B] = retry(() => {
      const A = rp(4), B = rp(4), n = sub3(B, A)
      return n.filter((c) => c !== 0).length >= 2 && n.every((c) => c % 2 === 0) ? [A, B] : null
    })
    const n = sub3(B, A), I = mul3(0.5, add3(A, B)), d = dOf(n, I)
    return planeEq(`${rep()} on donne A${t3(A)} et B${t3(B)}. Donne une équation cartésienne du plan médiateur du segment [AB] (ensemble des points équidistants de A et B).`, n, d,
      `Il passe par le milieu I${t3(I)} de [AB] et a pour vecteur normal AB⃗${t3(n)} : ${lhs(n, 0)} + d = 0 avec I, d = ${fmt(d)}. ${planeTxt(n, d)} (ou une équation proportionnelle).`)
  },
  () => {
    const O = rp(3), w = rn(), M = add3(O, w), d = dOf(w, M)
    return planeEq(`La sphère de centre Ω${t3(O)} passe par le point M${t3(M)}. Donne une équation du plan tangent à la sphère en M (le plan passant par M et perpendiculaire au rayon [ΩM]).`, w, d,
      `ΩM⃗${t3(w)} est normal au plan tangent : ${lhs(w, 0)} + d = 0 et M donne d = ${fmt(d)}. ${planeTxt(w, d)}.`)
  },
  () => {
    const A = rp(4), u = rn(), B = rp(3), d = dOf(u, B)
    return planeEq(`Donne une équation cartésienne du plan passant par B${t3(B)} et perpendiculaire à la droite ${lineTxt('d', A, u)}.`, u, d,
      `Le vecteur directeur u⃗${t3(u)} de d est normal au plan : ${lhs(u, 0)} + d = 0, et B donne d = ${fmt(d)}. ${planeTxt(u, d)}.`)
  },
)

function twoPlanes() {
  return retry(() => {
    const n1 = rn(), n2v = rn(), D = cross3(n1, n2v)
    if (isZero3(D) || D[2] === 0) return null
    const P0: V3 = [randInt(-4, 4), randInt(-4, 4), 0]
    return { n1, n2: n2v, D: reduce3(D), P0, d1: dOf(n1, P0), d2: dOf(n2v, P0) }
  })
}
const twoPlanesInter = variants(
  () => {
    const { n1, n2: m, D, d1, d2 } = twoPlanes()
    return direction(`Les plans P : ${planeTxt(n1, d1)} et Q : ${planeTxt(m, d2)} sont sécants. Donne un vecteur directeur de leur droite d’intersection.`, D, {
      explanation: `Ce vecteur est orthogonal à n⃗${t3(n1)} et à n⃗′${t3(m)} : on résout u⃗ · n⃗ = 0, u⃗ · n⃗′ = 0 et on trouve par exemple ${t3(D)} (tout vecteur non nul colinéaire convient).`,
    })
  },
  () => {
    const { n1, n2: m, D, P0, d1, d2 } = twoPlanes()
    return triplet(`Les plans P : ${planeTxt(n1, d1)} et Q : ${planeTxt(m, d2)} se coupent selon une droite Δ. Quelles sont les coordonnées du point de Δ situé dans le plan (xOy) (z = 0) ?`, P0, {
      explanation: `Avec z = 0 : ${poly([n1[0], 'x'], [n1[1], 'y'], [d1, ''])} = 0 et ${poly([m[0], 'x'], [m[1], 'y'], [d2, ''])} = 0, système de solution x = ${fmt(P0[0])}, y = ${fmt(P0[1])}. Point ${t3(P0)} (Δ est dirigée par ${t3(D)}).`,
    })
  },
  () => {
    const { n1, n2: m, D, P0, d1, d2 } = twoPlanes()
    return paramLine(`Donne une représentation paramétrique de la droite d’intersection des plans P : ${planeTxt(n1, d1)} et Q : ${planeTxt(m, d2)}.`, P0, D,
      `Un point : avec z = 0, on résout le système et on trouve ${t3(P0)}. Une direction orthogonale à n⃗${t3(n1)} et n⃗′${t3(m)} : ${t3(D)}. D’où ${paramTxt(P0, D)} (t ∈ ℝ).`)
  },
)

const metricLine = variants(
  () => {
    const [A, u, t] = retry(() => {
      const u = rnz(3), t = randNonZero(-3, 3), H = rp(3)
      const w = H, A = sub3(H, mul3(t, u))
      // le point le plus proche de O est H si OH ⊥ u
      if (dot3(w, u) !== 0 || isZero3(H) || Math.max(...A.map(Math.abs)) > 10) return null
      return [A, u, t] as [V3, V3, number]
    })
    const H = add3(A, mul3(t, u))
    return triplet(`${rep()} quel est le point de la droite ${lineTxt('d', A, u)} le plus proche de l’origine O ?`, H, {
      explanation: `On cherche M(t) ∈ d avec OM⃗ · u⃗ = 0 : ${fmt(dot3(A, u))} + ${mono(n2(u), 't')} = 0, d’où t = ${fmt(t)} et M${t3(H)}.`,
    })
  },
  () => {
    const [A, u, B, C, t] = retry(() => {
      const A = rp(3), u = rnz(3), B = rp(4), C = rp(4), w = sub3(C, B), k = dot3(u, w)
      if (k === 0) return null
      const num = n2(C) - n2(B) - 2 * dot3(A, w)
      if (num % (2 * k) !== 0) return null
      return [A, u, B, C, num / (2 * k)] as [V3, V3, V3, V3, number]
    })
    const M = add3(A, mul3(t, u))
    return triplet(`On considère ${lineTxt('d', A, u)}, et les points B${t3(B)} et C${t3(C)}. Quel point M de d est à égale distance de B et de C ?`, M, {
      explanation: `MB² = MC² ; en développant avec M(t), les termes en t² s’éliminent et il reste une équation du premier degré : t = ${fmt(t)}, M${t3(M)}. (Vérification : MB² = ${n2(sub3(M, B))} = MC².)`,
    })
  },
  fresh(() => {
    const [A, u, t] = retry(() => {
      const u = rnz(3), A = rp(5), k = -dot3(A, u)
      return k % n2(u) === 0 && k !== 0 ? [A, u, k / n2(u)] as [V3, V3, number] : null
    })
    return numeric(`Pour quelle valeur de t la distance entre l’origine O et le point M(t) de la droite ${lineTxt('d', A, u)} est-elle minimale ?`, t, {
      explanation: `OM² = ${n2(u)}t² + ${par(2 * dot3(A, u))}t + ${n2(A)} est un trinôme minimal en t = ${F(fmt(-2 * dot3(A, u)), 2 * n2(u))} = ${fmt(t)}.`,
    })
  }),
)

// ════════════════════════════════════════════════════════════════════════
// Problèmes d’amélioration
// ════════════════════════════════════════════════════════════════════════

const T = (title: string, ex: Exercise, figure?: Figure): Exercise => withMeta(ex, figure ? { title, figure } : { title })

const upgrades: Ladder = [
  [
    () => {
      const [n, u, i] = retry(() => {
        const n = rn(), u = rnz(3), i = randInt(0, 2)
        if (n[i] === 0) return null
        const rest = dot3(n, u) - n[i] * u[i]
        if (rest % n[i] !== 0 || Math.abs(rest / n[i]) > 9 || rest === 0) return null
        u[i] = -rest / n[i]
        return [n, u, i] as [V3, V3, number]
      })
      const A = rp(4), d = dOf(n, A) + randNonZero(-5, 5)
      const coords = [0, 1, 2].map((k) => `${XYZ[k]} = ${k === i ? (A[k] === 0 ? 'mt' : `${fmt(A[k])} + mt`) : coordT(A[k], u[k])}`).join(' ; ')
      return T('Parallèle au plan', numeric(`Pour quelle valeur de m la droite d_m : ${coords} (t ∈ ℝ) est-elle parallèle au plan P : ${planeTxt(n, d)} ?`, u[i], {
        explanation: `d_m ∥ P ⇔ son vecteur directeur est orthogonal à n⃗${t3(n)} : ${sumOf([0, 1, 2].map((k) => (k === i ? mono(n[i], 'm') : n[k] * u[k] === 0 ? '' : `${par(n[k])} × ${par(u[k])}`)))} = 0, donc m = ${fmt(u[i])}.`,
      }))
    },
    () => {
      const [n, u, i] = retry(() => {
        const n = rn(), u = rnz(3), i = randInt(0, 2)
        if (u[i] === 0) return null
        const rest = dot3(n, u) - n[i] * u[i]
        if (rest % u[i] !== 0 || Math.abs(rest / u[i]) > 9) return null
        n[i] = -rest / u[i]
        return n[i] !== 0 ? [n, u, i] as [V3, V3, number] : null
      })
      const A = rp(3), d = dOf(n, A)
      const coef = poly(...[0, 1, 2].map((k) => (k === i ? [1, `m${XYZ[k]}`] : [n[k], XYZ[k]]) as [number, string]))
      return T('La droite dans le plan', numeric(`Le plan P_m a pour équation ${coef}${d === 0 ? '' : ` ${d < 0 ? '−' : '+'} ${Math.abs(d)}`} = 0, où m est un réel. Pour quelle valeur de m contient-il la droite ${lineTxt('d', A, u)} ?`, n[i], {
        explanation: `Deux conditions : u⃗${t3(u)} orthogonal au vecteur normal (${n.map((c, k) => (k === i ? 'm' : fmt(c))).join(' ; ')}), ce qui donne m = ${fmt(n[i])} ; puis le point ${t3(A)} de d est bien dans P_m : ${subst(n, d, A)} = 0.`,
      }))
    },
    () => {
      const n = rn(), [u, w] = planeBasis(n, 3), P0 = rp(3), A = add3(P0, w), d = dOf(n, P0)
      return T('Le plan du toit', planeEq(`Une arête de toit suit la droite ${lineTxt('d', P0, u)} et le sommet d’une lucarne est au point A${t3(A)}. Donne une équation du plan du pan de toit qui contient la droite d et le point A.`, n, d,
        `Le plan contient ${t3(P0)} (point de d) et A : il est dirigé par u⃗${t3(u)} et par ${t3(w)}. Un vecteur normal : ${t3(reduce3(n))}. Équation : ${planeTxt(n, d)}.`), planeSketch({ on: { A: [0.5, 0.75] }, inLine: true, name: 'toit' }))
    },
  ],
  [
    () => {
      const P0 = rp(4)
      const [a, b, c] = retry(() => { const a = rn(), b = rn(), c = rn(); return Math.abs(dot3(cross3(a, b), c)) >= 1 ? [a, b, c] : null })
      return T('Trois plans', triplet(`Les trois plans P₁ : ${planeTxt(a, dOf(a, P0))}, P₂ : ${planeTxt(b, dOf(b, P0))} et P₃ : ${planeTxt(c, dOf(c, P0))} ont un unique point commun. Quelles sont ses coordonnées ?`, P0, {
        explanation: `On résout le système des trois équations (par combinaisons ou substitution) : x = ${fmt(P0[0])}, y = ${fmt(P0[1])}, z = ${fmt(P0[2])}. Vérification dans P₁ : ${subst(a, dOf(a, P0), P0)} = 0.`,
      }))
    },
    () => {
      const n = scramble(pick(NN)), N = Math.sqrt(n2(n)), u = pick(orthoTo(n, 3)), A = rp(4)
      const d = dOf(n, A) + randNonZero(-14, 14)
      const v = Math.abs(dot3(n, A) + d)
      return T('La rambarde', fraction(`La droite ${lineTxt('d', A, u)} est parallèle au plan P : ${planeTxt(n, d)}. Quelle est la distance entre d et P (distance de n’importe quel point de d au plan) ?`, v, N, {
        explanation: `n⃗${t3(n)} · u⃗${t3(u)} = 0 : d ∥ P. Tous les points de d sont à la même distance de P ; avec A${t3(A)} : ${F(`|${subst(n, d, A)}|`, `√{${n2(n)}}`)} = ${frac(v, N)}.`,
      }))
    },
    () => {
      const { n1, n2: m, D, P0, d1, d2 } = twoPlanes()
      return T('Le pli de la tente', paramLine(`Deux pans de toile de tente sont portés par les plans P : ${planeTxt(n1, d1)} et Q : ${planeTxt(m, d2)}. Donne une représentation paramétrique de la ligne de faîte, intersection de P et Q.`, P0, D,
        `Point commun avec z = 0 : ${t3(P0)} ; direction orthogonale aux deux vecteurs normaux : ${t3(D)}. ${paramTxt(P0, D)} (t ∈ ℝ).`))
    },
  ],
  [
    () => {
      const [a, b, c, k] = retry(() => {
        const a = randInt(1, 6), b = randInt(1, 6), c = randInt(1, 6), k = randInt(2, 12)
        return new Set([a, b, c]).size >= 2 ? [a, b, c, k] : null
      })
      const num = k * k * k, den = 6 * a * b * c
      return T('Le coin coupé', fraction(`Le plan P : ${planeTxt([a, b, c], -k)} coupe les axes de coordonnées en A, B et C. Quel est le volume du tétraèdre OABC ?`, num, den, {
        explanation: `A(${q(k, a)} ; 0 ; 0), B(0 ; ${q(k, b)} ; 0), C(0 ; 0 ; ${q(k, c)}). Le tétraèdre est trirectangle en O : V = ${F(1, 6)} × OA × OB × OC = ${F(`${k}³`, `6 × ${a} × ${b} × ${c}`)} = ${frac(num, den)}.`,
      }), persp({ O: [0, 0, 0], A: [k / a, 0, 0], B: [0, k / b, 0], C: [0, 0, k / c] }, [
        { a: 'O', b: 'A' }, { a: 'O', b: 'B', dashed: true }, { a: 'O', b: 'C' }, { a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'A' },
      ], { pos: { O: 'sw', A: 'se', B: 'ne', C: 'n' }, polygons: [{ pts: ['A', 'B', 'C'], fill: GOLD }] }))
    },
    () => {
      const n = rn(), d1 = randInt(-10, 10), d2 = retry(() => { const d2 = randInt(-10, 10); return d2 !== d1 && (d1 + d2) % 2 === 0 ? d2 : null })
      return T('À mi-chemin', planeEq(`Donne une équation du plan situé à égale distance des plans parallèles P : ${planeTxt(n, d1)} et Q : ${planeTxt(n, d2)} (le plan parallèle « au milieu »).`, n, (d1 + d2) / 2,
        `M est à égale distance ⇔ |${lhs(n, d1)}| = |${lhs(n, d2)}| ; les deux expressions ne peuvent être égales (d₁ ≠ d₂), donc elles sont opposées : ${planeTxt(n, (d1 + d2) / 2)}.`))
    },
    () => {
      const [n, u] = retry(() => { const n = rn(), u = rnz(3); return !isZero3(cross3(n, u)) && dot3(n, u) !== 0 ? [n, u] : null })
      const A = rp(3), w = reduce3(cross3(u, n)), d = dOf(w, A), dP = randInt(-6, 6)
      return T('Le plan orthogonal', planeEq(`Donne une équation du plan qui contient la droite ${lineTxt('d', A, u)} et qui est perpendiculaire au plan P : ${planeTxt(n, dP)}.`, w, d,
        `Ce plan contient A${t3(A)}, il est dirigé par u⃗${t3(u)} et par n⃗${t3(n)} (normal à P). Un vecteur normal orthogonal à u⃗ et n⃗ : ${t3(w)}. Équation : ${planeTxt(w, d)}.`))
    },
  ],
]

// ════════════════════════════════════════════════════════════════════════
// Problèmes de l’hôtel de ville
// ════════════════════════════════════════════════════════════════════════

const age: Ladder = [
  [
    () => {
      const S: V3 = [randInt(1, 4), randInt(1, 4), randInt(2, 6) * 2], u: V3 = [randNonZero(-2, 2), randNonZero(-2, 2), -pick([1, 2])]
      const t = -S[2] / u[2], O = add3(S, mul3(t, u))
      return T('L’ombre du clocher', triplet(`Le sommet du clocher est au point S${t3(S)} (repère orthonormé, unité : le mètre, le sol est le plan z = 0). Les rayons du soleil sont dirigés par u⃗${t3(u)}. Où se trouve l’ombre du sommet sur le sol ?`, O, {
        explanation: `Le rayon passant par S : x = ${coordT(S[0], u[0])}, y = ${coordT(S[1], u[1])}, z = ${coordT(S[2], u[2])}. Au sol z = 0 ⇔ t = ${fmt(t)}, d’où l’ombre ${t3(O)}.`,
      }), axesFig({ S, Ω: O }, [{ a: 'S', b: 'Ω', color: GOLD, head: true }], { labels: { Ω: 'ombre' }, caption: 'Le rayon de soleil (en jaune) issu du sommet S. La figure n’est pas à l’échelle.' }))
    },
    () => {
      const [A, u, t] = retry(() => {
        const A: V3 = [randInt(-4, 4), randInt(-4, 4), randInt(0, 3)], u: V3 = [randNonZero(-3, 3), randInt(-3, 3), randInt(2, 5)], t = randInt(3, 9)
        return A[0] + u[0] * t !== 0 ? [A, u, t] as [V3, V3, number] : null
      })
      const h = A[2] + u[2] * t
      return T('Le drone livreur', numeric(`${prenom()} pilote un drone livreur. À l’instant t (en s), sa position est x = ${coordT(A[0], u[0])} ; y = ${coordT(A[1], u[1])} ; z = ${coordT(A[2], u[2])} (en m). La fenêtre de livraison est à ${h} m d’altitude. Quelle est l’abscisse x du drone au moment où il atteint cette altitude ?`, A[0] + u[0] * t, {
        explanation: `z = ${h} ⇔ ${coordT(A[2], u[2])} = ${h} ⇔ t = ${t} s. Alors x = ${evalT(A[0], u[0], t)} m.`,
      }), persp({ A, B: add3(A, mul3(t, u)), _fa: [A[0], A[1], 0], _fb: [A[0] + t * u[0], A[1] + t * u[1], 0] }, [
        { a: 'A', b: 'B', color: RED, head: true }, { a: 'A', b: '_fa', dashed: true, color: AXIS }, { a: 'B', b: '_fb', dashed: true, color: AXIS }, { a: '_fa', b: '_fb', dashed: true, color: AXIS },
      ], { labels: { A: 'départ', B: 'fenêtre' }, caption: 'Trajectoire rectiligne du drone ; en pointillés, sa projection au sol. La figure n’est pas à l’échelle.' }))
    },
    () => {
      const L = randInt(5, 9) * 6, A: V3 = [0, randInt(-2, 2), randInt(1, 2)], u: V3 = [pick([2, 3, 6]), randInt(-1, 1), pick([0, 1])], t = L / u[0], P = add3(A, mul3(t, u))
      return T('La flèche et la cible', triplet(`Un archer tire depuis A${t3(A)} ; sa flèche file en ligne droite, dirigée par u⃗${t3(u)} (unité : le mètre). La cible est sur le mur d’équation x = ${L}. En quel point la flèche touche-t-elle le mur ?`, P, {
        explanation: `Trajectoire : x = ${coordT(0, u[0])}, y = ${coordT(A[1], u[1])}, z = ${coordT(A[2], u[2])}. x = ${L} ⇔ t = ${fmt(t)}, d’où le point ${t3(P)}.`,
      }), (() => {
        const k = 6 / L, sc = (v: V3): V3 => [v[0] * k, v[1], v[2]]
        const y0 = Math.min(A[1], P[1]) - 2, y1 = Math.max(A[1], P[1]) + 2, z1 = Math.max(A[2], P[2]) + 2
        return persp({ A: sc(A), P: sc(P), _w1: [6, y0, 0], _w2: [6, y1, 0], _w3: [6, y1, z1], _w4: [6, y0, z1] }, [
          { a: 'A', b: 'P', color: RED, head: true }, { a: '_w1', b: '_w2' }, { a: '_w2', b: '_w3' }, { a: '_w3', b: '_w4' }, { a: '_w4', b: '_w1' },
        ], { polygons: [{ pts: ['_w1', '_w2', '_w3', '_w4'], fill: GOLD }], pos: { A: 'w', P: 'e' }, caption: `La flèche et le mur d’équation x = ${L} (en jaune). La figure n’est pas à l’échelle.` })
      })())
    },
  ],
  [
    () => {
      const L = twoLines('sécantes')
      return T('Les deux galeries', triplet(`Deux galeries de mine rectilignes sont creusées : l’une suit ${lineTxt('d', L.A, L.u)}, l’autre ${lineTxt('d′', L.B, L.v, 's')}. Elles se rejoignent en une salle. Où se trouve-t-elle ?`, L.I!, {
        explanation: `On égale les coordonnées : t = ${fmt(L.t!)} et s = ${fmt(L.s!)} vérifient les trois équations ; la salle est en ${t3(L.I!)}.`,
      }), persp({ A: L.A, I: L.I!, B: L.B, _a: add3(L.I!, mul3(0.4, sub3(L.I!, L.A))), _b: add3(L.I!, mul3(0.4, sub3(L.I!, L.B))) }, [
        { a: 'A', b: '_a', color: '#7a5a2c' }, { a: 'B', b: '_b', color: BLUE },
      ], { caption: 'Les deux galeries. La figure n’est pas à l’échelle.' }))
    },
    () => {
      const n: V3 = [randInt(-2, 2), randInt(-2, 2), randInt(2, 4)]
      const [u, v] = planeBasis(n, 3), A: V3 = [randInt(0, 4), randInt(0, 4), randInt(0, 3)], B = add3(A, u), C = add3(A, v), d = dOf(n, A)
      return T('La rampe du château', planeEq(`Une rampe d’accès plane passe par les trois points A${t3(A)}, B${t3(B)} et C${t3(C)} (repère orthonormé, unité : le mètre). Donne une équation cartésienne du plan de la rampe.`, n, d,
        `n⃗ orthogonal à AB⃗${t3(u)} et AC⃗${t3(v)} : par exemple ${t3(reduce3(n))} ; puis d avec A : ${planeTxt(n, d)}.`),
        planeSketch({ on: { A: [0.15, 0.2], B: [0.85, 0.3], C: [0.4, 0.85] }, name: 'rampe' }))
    },
    () => {
      const { A, u, n, d, t0, I } = linePlane()
      return T('Le faisceau du phare', triplet(`Le faisceau d’un phare part de la lanterne L${t3(A)} et suit la direction u⃗${t3(u)}. Il éclaire une falaise plane d’équation ${planeTxt(n, d)}. En quel point le faisceau frappe-t-il la falaise ?`, I, {
        explanation: lpExpl(A, u, n, d, t0, I),
      }), planeSketch({ on: { I: [0.5, 0.5] }, ray: 'I', name: 'falaise' }))
    },
  ],
  [
    () => {
      const [X, Y, Z] = retry(() => { const v = [randInt(2, 6), randInt(2, 6), randInt(2, 4)]; return (v[0] * v[1] * v[2]) % 6 === 0 && new Set(v).size >= 2 ? v : null })
      const L = [X, Y, Z].reduce((m, v) => (m * v) / gcd(m, v), 1), V = (X * Y * Z) / 6
      const n: V3 = [L / X, L / Y, L / Z]
      return T('La tente du campement', numeric(`Une tente a la forme d’un tétraèdre : son sol est le triangle OAB (dans le plan z = 0), ses murs verticaux sont dans les plans x = 0 et y = 0, et son pan incliné est dans le plan ${planeTxt(n, -L)} (unité : le mètre). Quel est le volume de la tente (en m³) ?`, V, {
        explanation: `Le pan coupe les axes en A(${X} ; 0 ; 0), B(0 ; ${Y} ; 0), C(0 ; 0 ; ${Z}) (par exemple y = z = 0 donne ${n[0] === 1 ? '' : n[0]}x = ${L}). Volume du tétraèdre trirectangle OABC : ${F(1, 6)} × ${X} × ${Y} × ${Z} = ${fmt(V)} m³.`,
      }), persp({ O: [0, 0, 0], A: [X, 0, 0], B: [0, Y, 0], C: [0, 0, Z] }, [
        { a: 'O', b: 'A' }, { a: 'O', b: 'B', dashed: true }, { a: 'O', b: 'C' }, { a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'A' },
      ], { pos: { O: 'sw', A: 'se', B: 'ne', C: 'n' }, polygons: [{ pts: ['A', 'B', 'C'], fill: GOLD }] }))
    },
    () => {
      const [A, u, B, v, t] = retry(() => {
        const A: V3 = [randInt(-9, 0), randInt(-5, 5), randInt(8, 12)], B: V3 = [randInt(0, 9), randInt(-9, 0), randInt(8, 12)]
        const u: V3 = [randInt(1, 3), randInt(-1, 2), 0], v: V3 = [randInt(-2, 1), randInt(1, 3), randInt(-1, 1)]
        const D0 = sub3(B, A), Dv = sub3(v, u), k = n2(Dv)
        if (k === 0) return null
        const num = -dot3(D0, Dv)
        if (num % k !== 0 || num / k <= 0 || num / k > 8) return null
        return [A, u, B, v, num / k] as [V3, V3, V3, V3, number]
      })
      const P = add3(A, mul3(t, u)), Q = add3(B, mul3(t, v)), dmin = n2(sub3(Q, P))
      return T('Deux avions', numeric(`Deux avions volent en ligne droite à vitesse constante. À l’instant t (en minutes), le premier est en (${coordT(A[0], u[0])} ; ${coordT(A[1], u[1])} ; ${coordT(A[2], u[2])}) et le second en (${coordT(B[0], v[0])} ; ${coordT(B[1], v[1])} ; ${coordT(B[2], v[2])}) (en km). À quel instant sont-ils le plus proches l’un de l’autre ?`, t, {
        explanation: `Le vecteur qui va du premier au second vaut ${t3(sub3(B, A))} + t${t3(sub3(v, u))} ; le carré de sa norme est un trinôme en t, minimal pour t = ${F(fmt(-dot3(sub3(B, A), sub3(v, u))), n2(sub3(v, u)))} = ${fmt(t)} min (distance minimale √{${dmin}} km).`,
      }), axesFig({ A, B, _ua: add3(A, mul3(3, u)), _vb: add3(B, mul3(3, v)) }, [{ a: 'A', b: '_ua', color: RED, head: true }, { a: 'B', b: '_vb', color: BLUE, head: true }], {
        caption: 'Positions à t = 0 et directions des deux avions. La figure n’est pas à l’échelle.',
      }))
    },
    () => {
      const n: V3 = retry(() => { const n = scramble(pick(NN)); return n[2] !== 0 ? [n[0], n[1], Math.abs(n[2])] as V3 : null })
      const N = Math.sqrt(n2(n)), [u, v] = planeBasis(n, 3), A: V3 = [randInt(0, 4), randInt(0, 4), randInt(3, 6)], B = add3(A, u), C = add3(A, v), d = dOf(n, A)
      const M = retry(() => { const M: V3 = [randInt(0, 6), randInt(0, 6), randInt(8, 14)]; return dot3(n, M) + d !== 0 ? M : null })
      const val = Math.abs(dot3(n, M) + d)
      return T('L’antenne et le toit', fraction(`Le pan d’un toit passe par les points A${t3(A)}, B${t3(B)} et C${t3(C)}. Le sommet d’une antenne est au point M${t3(M)} (unité : le mètre). Quelle est la distance du sommet de l’antenne au plan du toit ?`, val, N, {
        explanation: `Équation du toit : n⃗${t3(n)} est orthogonal à AB⃗${t3(u)} et AC⃗${t3(v)}, d’où ${planeTxt(n, d)}. Distance : ${F(`|${subst(n, d, M)}|`, `√{${n2(n)}}`)} = ${frac(val, N)} m.`,
      }), planeSketch({ on: { A: [0.12, 0.25], B: [0.75, 0.15], C: [0.2, 0.8] }, above: 'M', name: 'toit' }))
    },
  ],
]

const tiers: Tiers = [
  [pointAt, readLine, readPlane, writeLine],
  [onLine, planeThrough, axisInter, planesParam],
  [interLP, posLP, writeLine2, posLL],
  [projPlaneEq, interLL, planeABC, distEq],
  [distPointLine, special, twoPlanesInter, metricLine],
]

export const CONTENT: SubjectContent | null = { tiers, upgrades, age }
