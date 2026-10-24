// Algorithmique et programmation en Python (Terminale) — public adulte.
// Chaque exercice affiche un programme (champ `code`) ; la réponse est calculée ici en simulant le programme
// (mêmes opérations, dans le même ordre, sur des flottants IEEE identiques à ceux de Python).
// PY_CHECKS garde, pour chaque exercice, de quoi rejouer le programme dans un vrai Python (vérification hors jeu).
import { F, fmt, fresh, gcd, numeric, pick, randInt, shuffle, variants, type Exercise, type Maker, type SubjectContent } from '../utils'
import { graphFigure, type Figure } from '../figure'
import { prenom } from '../contexts'

// ── Aides locales ───────────────────────────────────────────────────────
/** Mode de vérification : 'out' = tout ce qu'affiche le programme (+ `run`) ; 'last' = dernière ligne affichée ;
 * 'count' = nombre de lignes affichées ; 'fill' = la réponse remplace « … » et l'affichage doit valoir `expect`. */
export interface PyCheck { mode: 'out' | 'last' | 'count' | 'fill' | 'none'; run?: string; expect?: string }
export const PY_CHECKS = new WeakMap<Exercise, PyCheck>()

const C = (...lines: string[]) => lines.join('\n')
const I1 = '    '
const I2 = '        '
const I3 = '            '
/** Liste en Python (code). */
const pyL = (L: number[]) => `[${L.join(', ')}]`
/** Liste affichée (réponse, explication) : signe moins typographique. */
const listText = (L: number[]) => `[${L.map(fmt).join(', ')}]`
/** Valeurs successives d'une variable. */
const trace = (vals: number[]) => vals.map(fmt).join(' → ')
/** Grand entier avec espaces : 1 000 000. */
const big = (n: number) => fmt(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const sumArr = (a: number[]) => a.reduce((s, v) => s + v, 0)
const range = (a: number, b: number, s = 1) => {
  const out: number[] = []
  for (let k = a; s > 0 ? k < b : k > b; k += s) out.push(k)
  return out
}
/** Appel affiché dans un énoncé : f(−2), avec le vrai signe moins. */
const callText = (name: string, ...args: (number | string)[]) => `${name}(${args.map((a) => (typeof a === 'number' ? fmt(a) : a)).join(', ')})`
const callCode = (name: string, ...args: (number | string)[]) => `${name}(${args.join(', ')})`

function retry<R>(gen: () => R | null | undefined | false, tries = 2000): R {
  for (let i = 0; i < tries; i++) {
    const r = gen()
    if (r) return r
  }
  throw new Error('tirage impossible')
}

function parseList(raw: string): number[] | null {
  let s = raw.trim().replace(/[−–—]/g, '-').replace(/\s+/g, '')
  if (s.startsWith('[') !== s.endsWith(']')) return null
  s = s.replace(/^\[/, '').replace(/\]$/, '')
  if (!s) return []
  const parts = s.split(/[,;]/)
  const nums = parts.map((p) => (/^-?\d+(\.\d+)?$/.test(p) ? Number(p) : NaN))
  return nums.some(Number.isNaN) ? null : nums
}

/** Réponse : une liste Python d'entiers, saisie « [1, 4, 9] » (espaces libres, crochets conseillés). */
function listAnswer(prompt: string, L: number[], explanation: string): Exercise {
  return {
    prompt,
    kind: 'input',
    answer: listText(L),
    explanation,
    inputHint: 'ex. [1, 4, 9]',
    format: 'une liste entre crochets, éléments séparés par des virgules, par exemple [1, 4, 9]',
    keypad: ['[', ']', ',', '−'],
    isValid: (v) => parseList(v) !== null,
    check: (v) => {
      const got = parseList(v)
      return !!got && got.length === L.length && got.every((x, i) => x === L[i])
    },
  }
}

/** Réponse approchée (simulation aléatoire) : valeur exacte ou approchée à `tol` près. */
function near(prompt: string, value: number, tol: number, answer: string, explanation: string): Exercise {
  const parse = (v: string) => {
    const s = v.trim().replace(/[−–—]/g, '-').replace(/\s+/g, '').replace(/,/g, '.')
    if (/^-?\d+(\.\d+)?\/\d+(\.\d+)?$/.test(s)) { const [a, b] = s.split('/').map(Number); return b ? a / b : NaN }
    return /^-?\d*\.?\d+$/.test(s) ? Number(s) : NaN
  }
  return {
    prompt, kind: 'input', answer, explanation,
    inputHint: 'Valeur exacte (fraction) ou décimale',
    format: 'un nombre, par exemple 1/6 ou 0,17',
    keypad: ['/', ','],
    isValid: (v) => !Number.isNaN(parse(v)),
    check: (v) => Math.abs(parse(v) - value) <= tol,
  }
}

interface Prog {
  prompt: string
  code: string
  ans: number | number[] | Exercise
  expl: string
  check?: PyCheck
  title?: string
  figure?: Figure
}
/** Exercice « programme » : énoncé + code + réponse (nombre ou liste), enregistré pour la vérification. */
function prog(p: Prog): Exercise {
  const ex: Exercise = Array.isArray(p.ans)
    ? listAnswer(p.prompt, p.ans, p.expl)
    : typeof p.ans === 'number'
      ? numeric(p.prompt, p.ans, { explanation: p.expl })
      : { ...p.ans, prompt: p.prompt, explanation: p.expl }
  ex.code = p.code
  if (p.title) ex.title = p.title
  if (p.figure) ex.figure = p.figure
  PY_CHECKS.set(ex, p.check ?? { mode: 'out' })
  return ex
}

const OUT = [
  'Qu’affiche ce programme ?',
  'Quel nombre ce programme affiche-t-il ?',
  'Quelle valeur s’affiche quand on exécute ce programme ?',
  'Que voit-on à l’écran à la fin de ce programme ?',
]
const out = () => pick(OUT)
const OUT_L = ['Quelle liste ce programme affiche-t-il ?', 'Qu’affiche ce programme ?', 'Quelle est la liste affichée ?', 'Que voit-on à l’écran à la fin du programme ?']
const outL = () => pick(OUT_L)
/** Entier non nul. */
const nz = (a: number, b: number) => retry(() => randInt(a, b) || false)
const RET = (call: string) => pick([`Que renvoie l’appel ${call} ?`, `Quelle valeur renvoie ${call} ?`, `Que vaut ${call} ?`])

// ── Palier 1 : lire un programme court ──────────────────────────────────
const p1: Maker[] = [
  // Affectations successives
  fresh(variants(
    () => {
      const a = randInt(2, 9), b = randInt(2, 9), s = a + b
      return prog({
        prompt: `On suit les variables ligne par ligne. ${out()}`,
        code: C(`a = ${a}`, `b = ${b}`, 'a = a + b', 'b = a * b', 'print(b)'),
        ans: s * b,
        expl: `a devient ${a} + ${b} = ${s}, puis b devient ${s} × ${b} = ${s * b} (b valait encore ${b}).`,
      })
    },
    () => {
      const x = randInt(3, 12), k = randInt(2, 5), m = randInt(2, 15)
      return prog({
        prompt: `La variable x est modifiée deux fois. ${out()}`,
        code: C(`x = ${x}`, `x = x * ${k}`, `x = x - ${m}`, 'print(x)'),
        ans: x * k - m,
        expl: `x vaut ${x}, puis ${x} × ${k} = ${x * k}, puis ${x * k} − ${m} = ${x * k - m}.`,
      })
    },
    () => {
      const p = randInt(3, 15), q = randInt(2, 9), r = randInt(2, 10)
      return prog({
        prompt: `Ce programme calcule le montant d’une commande après une remise. ${out()}`,
        code: C(`prix = ${p}`, `quantite = ${q}`, 'total = prix * quantite', `total = total - ${r}`, 'print(total)'),
        ans: p * q - r,
        expl: `total = ${p} × ${q} = ${p * q}, puis ${p * q} − ${r} = ${p * q - r}.`,
      })
    },
    () => {
      const a = randInt(2, 20), b = retry(() => { const v = randInt(2, 20); return v !== a && v })
      return prog({
        prompt: `Ce programme échange le contenu de deux variables à l’aide d’une troisième. ${out()}`,
        code: C(`a = ${a}`, `b = ${b}`, 'c = a', 'a = b', 'b = c', 'print(a - b)'),
        ans: b - a,
        expl: `Après l’échange, a = ${b} et b = ${a}, donc a − b = ${b} − ${a} = ${fmt(b - a)}.`,
      })
    },
    () => {
      const n = randInt(2, 9), k = randInt(1, 20)
      return prog({
        prompt: `En Python, ** désigne la puissance. ${out()}`,
        code: C(`n = ${n}`, 'n = n ** 2', `n = n - ${k}`, 'print(n)'),
        ans: n * n - k,
        expl: `n ** 2 = ${n}² = ${n * n}, puis ${n * n} − ${k} = ${fmt(n * n - k)}.`,
      })
    },
  )),
  // Quotient entier et reste : // et %
  fresh(variants(
    () => {
      const b = randInt(3, 9), a = retry(() => { const v = randInt(20, 99); return v % b !== 0 && v })
      return prog({
        prompt: `En Python, a // b donne le quotient de la division euclidienne de a par b. ${out()}`,
        code: C(`print(${a} // ${b})`),
        ans: Math.floor(a / b),
        expl: `${a} = ${b} × ${Math.floor(a / b)} + ${a % b} : le quotient entier est ${Math.floor(a / b)}.`,
      })
    },
    () => {
      const b = randInt(3, 9), a = retry(() => { const v = randInt(20, 99); return v % b !== 0 && v })
      return prog({
        prompt: `En Python, a % b donne le reste de la division euclidienne de a par b. ${out()}`,
        code: C(`n = ${a}`, `print(n % ${b})`),
        ans: a % b,
        expl: `${a} = ${b} × ${Math.floor(a / b)} + ${a % b} : le reste est ${a % b}.`,
      })
    },
    () => {
      const mn = retry(() => { const v = randInt(70, 600); return v % 60 !== 0 && v })
      const hours = Math.random() < 0.5
      return prog({
        prompt: `Ce programme convertit une durée donnée en minutes. ${hours ? 'Combien d’heures complètes affiche-t-il ?' : 'Quel nombre de minutes restantes affiche-t-il ?'}`,
        code: C(`minutes = ${mn}`, 'h = minutes // 60', 'm = minutes % 60', hours ? 'print(h)' : 'print(m)'),
        ans: hours ? Math.floor(mn / 60) : mn % 60,
        expl: `${mn} = 60 × ${Math.floor(mn / 60)} + ${mn % 60} : h = ${Math.floor(mn / 60)} et m = ${mn % 60}.`,
      })
    },
    () => {
      const n = retry(() => { const v = randInt(102, 987); return new Set(String(v)).size === 3 && !String(v).includes('0') && v })
      const which = pick([0, 1, 2])
      const code = ['print(n % 10)', 'print(n // 10 % 10)', 'print(n // 100)'][which]
      const val = [n % 10, Math.floor(n / 10) % 10, Math.floor(n / 100)][which]
      return prog({
        prompt: `Ce programme extrait un chiffre d’un nombre entier. Quel chiffre affiche-t-il ?`,
        code: C(`n = ${n}`, code),
        ans: val,
        expl: [
          `n % 10 est le reste de la division par 10 : c’est le chiffre des unités, ${val}.`,
          `n // 10 = ${Math.floor(n / 10)} (on retire les unités), puis % 10 donne son dernier chiffre : ${val}, le chiffre des dizaines.`,
          `n // 100 = ${val} : c’est le chiffre des centaines.`,
        ][which],
      })
    },
    () => {
      const e = retry(() => { const v = randInt(25, 150); return v % 6 !== 0 && v })
      const boxes = Math.random() < 0.5
      return prog({
        prompt: `On range des œufs dans des boîtes de 6. ${boxes ? 'Combien de boîtes pleines ce programme affiche-t-il ?' : 'Combien d’œufs restent hors des boîtes pleines, d’après ce programme ?'}`,
        code: C(`oeufs = ${e}`, 'boites = oeufs // 6', 'reste = oeufs % 6', boxes ? 'print(boites)' : 'print(reste)'),
        ans: boxes ? Math.floor(e / 6) : e % 6,
        expl: `${e} = 6 × ${Math.floor(e / 6)} + ${e % 6} : ${Math.floor(e / 6)} boîtes pleines et ${e % 6} œuf${e % 6 > 1 ? 's' : ''} en plus.`,
      })
    },
  )),
  // Instructions conditionnelles
  fresh(variants(
    () => {
      const s = randInt(5, 20), x = retry(() => { const v = randInt(1, 30); return v !== s && v })
      return prog({
        prompt: `Ce programme calcule un écart à l’aide d’un test. ${out()}`,
        code: C(`x = ${x}`, `if x > ${s}:`, `${I1}y = x - ${s}`, 'else:', `${I1}y = ${s} - x`, 'print(y)'),
        ans: Math.abs(x - s),
        expl: `${x} ${x > s ? '>' : '<'} ${s}, donc on exécute ${x > s ? `y = ${x} − ${s}` : `y = ${s} − ${x}`} = ${Math.abs(x - s)}.`,
      })
    },
    () => {
      const p = [randInt(3, 6), randInt(7, 10), randInt(11, 15)], age = randInt(5, 70)
      const v = age < 12 ? p[0] : age < 18 ? p[1] : p[2]
      return prog({
        prompt: `Ce programme donne le prix d’un billet selon l’âge du visiteur. ${out()}`,
        code: C(`age = ${age}`, 'if age < 12:', `${I1}prix = ${p[0]}`, 'elif age < 18:', `${I1}prix = ${p[1]}`, 'else:', `${I1}prix = ${p[2]}`, 'print(prix)'),
        ans: v,
        expl: `${age} ${age < 12 ? '< 12 : premier cas' : age < 18 ? '≥ 12 mais < 18 : deuxième cas' : '≥ 18 : cas « else »'}, donc prix = ${v}.`,
      })
    },
    () => {
      const n = randInt(5, 60)
      const v = n % 2 === 0 ? n / 2 : 3 * n + 1
      return prog({
        prompt: `Le test n % 2 == 0 regarde si n est pair. ${out()}`,
        code: C(`n = ${n}`, 'if n % 2 == 0:', `${I1}n = n // 2`, 'else:', `${I1}n = 3 * n + 1`, 'print(n)'),
        ans: v,
        expl: n % 2 === 0 ? `${n} est pair : n devient ${n} // 2 = ${v}.` : `${n} est impair : n devient 3 × ${n} + 1 = ${v}.`,
      })
    },
    () => {
      const a = randInt(2, 30), b = retry(() => { const v = randInt(2, 30); return v !== a && v }), k = randInt(2, 4)
      return prog({
        prompt: `Ce programme compare deux nombres. ${out()}`,
        code: C(`a = ${a}`, `b = ${b}`, 'if a > b:', `${I1}m = a`, 'else:', `${I1}m = b`, `print(${k} * m)`),
        ans: k * Math.max(a, b),
        expl: `m reçoit le plus grand des deux nombres, ${Math.max(a, b)} ; le programme affiche ${k} × ${Math.max(a, b)} = ${k * Math.max(a, b)}.`,
      })
    },
    () => {
      const pts = randInt(20, 99), b1 = pick([5, 10, 15]), b2 = pick([20, 25, 30])
      const bonus = pts >= 50 && pts < 80 ? b1 : pts >= 80 ? b2 : 0
      return prog({
        prompt: `Un jeu ajoute un bonus selon le score obtenu. ${out()}`,
        code: C(`points = ${pts}`, 'if points >= 50 and points < 80:', `${I1}bonus = ${b1}`, 'elif points >= 80:', `${I1}bonus = ${b2}`, 'else:', `${I1}bonus = 0`, 'print(points + bonus)'),
        ans: pts + bonus,
        expl: `${pts} ${pts >= 50 && pts < 80 ? 'est entre 50 et 80' : pts >= 80 ? 'est au moins 80' : 'est inférieur à 50'} : bonus = ${bonus}, d’où ${pts + bonus}.`,
      })
    },
  )),
  // Boucle for et range
  fresh(variants(
    () => {
      const n = randInt(4, 15)
      return prog({
        prompt: 'Quel est le dernier nombre affiché par ce programme ?',
        code: C(`for i in range(${n}):`, `${I1}print(i)`),
        ans: n - 1,
        expl: `range(${n}) parcourt les entiers de 0 à ${n - 1} (${n} est exclu) : le dernier affiché est ${n - 1}.`,
        check: { mode: 'last' },
      })
    },
    () => {
      const a = randInt(1, 9), b = randInt(a + 3, a + 15)
      return prog({
        prompt: 'Combien de nombres ce programme affiche-t-il ?',
        code: C(`for i in range(${a}, ${b}):`, `${I1}print(i)`),
        ans: b - a,
        expl: `range(${a}, ${b}) va de ${a} à ${b - 1} : cela fait ${b} − ${a} = ${b - a} nombres.`,
        check: { mode: 'count' },
      })
    },
    () => {
      const a = randInt(0, 5), s = randInt(2, 5), b = a + s * randInt(3, 6) + randInt(1, s)
      const vals = range(a, b, s)
      return prog({
        prompt: 'Le troisième nombre de range est le pas. Quel est le dernier nombre affiché ?',
        code: C(`for i in range(${a}, ${b}, ${s}):`, `${I1}print(i)`),
        ans: vals[vals.length - 1],
        expl: `On part de ${a} et on avance de ${s} tant qu’on reste strictement sous ${b} : ${vals.join(', ')}.`,
        check: { mode: 'last' },
      })
    },
    () => {
      const a = randInt(2, 6), b = randInt(a + 3, a + 12)
      const msg = pick(['Hourra !', 'Bonjour', 'Victoire', 'Au travail !'])
      return prog({
        prompt: `Combien de fois le message « ${msg} » est-il affiché ?`,
        code: C(`for k in range(${a}, ${b}):`, `${I1}print("${msg}")`),
        ans: b - a,
        expl: `k prend les valeurs de ${a} à ${b - 1}, soit ${b} − ${a} = ${b - a} passages dans la boucle.`,
        check: { mode: 'count' },
      })
    },
    () => {
      const x = randInt(0, 10), n = randInt(3, 9), d = randInt(2, 7)
      return prog({
        prompt: `La boucle répète la même instruction plusieurs fois. ${out()}`,
        code: C(`x = ${x}`, `for i in range(${n}):`, `${I1}x = x + ${d}`, 'print(x)'),
        ans: x + n * d,
        expl: `range(${n}) donne ${n} passages : x augmente ${n} fois de ${d}, donc ${x} + ${n} × ${d} = ${x + n * d}.`,
      })
    },
  )),
  // Fonctions simples
  fresh(variants(
    () => {
      const a = randInt(2, 6), b = nz(-9, 9), k = nz(-5, 8)
      return prog({
        prompt: RET(callText('f', k)),
        code: C('def f(x):', `${I1}return ${a} * x ${b < 0 ? '-' : '+'} ${Math.abs(b)}`),
        ans: a * k + b,
        expl: `f(${fmt(k)}) = ${a} × ${k < 0 ? `(${fmt(k)})` : k} ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${fmt(a * k + b)}.`,
        check: { mode: 'out', run: `print(${callCode('f', k)})` },
      })
    },
    () => {
      const L = randInt(3, 20), l = randInt(2, 15)
      return prog({
        prompt: `Cette fonction calcule le périmètre d’un rectangle. ${RET(callText('perimetre', L, l))}`,
        code: C('def perimetre(L, l):', `${I1}return 2 * (L + l)`),
        ans: 2 * (L + l),
        expl: `perimetre(${L}, ${l}) = 2 × (${L} + ${l}) = ${2 * (L + l)}.`,
        check: { mode: 'out', run: `print(${callCode('perimetre', L, l)})` },
      })
    },
    () => {
      const k = nz(-12, 12)
      return prog({
        prompt: `Une fonction peut contenir plusieurs return : le premier exécuté termine la fonction. ${RET(callText('g', k))}`,
        code: C('def g(x):', `${I1}if x < 0:`, `${I2}return -x`, `${I1}return 2 * x`),
        ans: k < 0 ? -k : 2 * k,
        expl: k < 0 ? `${fmt(k)} < 0 : g renvoie −x = ${-k}.` : `${k} n’est pas négatif : g renvoie 2 × ${k} = ${2 * k}.`,
        check: { mode: 'out', run: `print(${callCode('g', k)})` },
      })
    },
    () => {
      const [c, k] = retry(() => { const c = nz(-3, 4), k = randInt(1, 3); return k * k + c !== 0 && [c, k] })
      const f = (x: number) => x * x + c
      return prog({
        prompt: `On applique deux fois la fonction f. ${RET(`f(f(${k}))`)}`,
        code: C('def f(x):', `${I1}return x ** 2 ${c < 0 ? '-' : '+'} ${Math.abs(c)}`),
        ans: f(f(k)),
        expl: `f(${k}) = ${k}² ${c < 0 ? '−' : '+'} ${Math.abs(c)} = ${fmt(f(k))}, puis f(${fmt(f(k))}) = ${f(k) < 0 ? `(${fmt(f(k))})` : fmt(f(k))}² ${c < 0 ? '−' : '+'} ${Math.abs(c)} = ${fmt(f(f(k)))}.`,
        check: { mode: 'out', run: `print(f(f(${k})))` },
      })
    },
    () => {
      const p1 = randInt(8, 15), p2 = p1 - randInt(1, 3), n = randInt(3, 20)
      return prog({
        prompt: `Cette fonction donne le prix de n repas, avec un tarif de groupe à partir de 10 repas. ${RET(callText('prix', n))}`,
        code: C('def prix(n):', `${I1}if n >= 10:`, `${I2}return ${p2} * n`, `${I1}return ${p1} * n`),
        ans: n >= 10 ? p2 * n : p1 * n,
        expl: n >= 10 ? `${n} ≥ 10 : prix = ${p2} × ${n} = ${p2 * n}.` : `${n} < 10 : on ne passe pas dans le if, prix = ${p1} × ${n} = ${p1 * n}.`,
        check: { mode: 'out', run: `print(${callCode('prix', n)})` },
      })
    },
  )),
]

// ── Palier 2 : boucles, accumulateurs, listes ───────────────────────────
const p2: Maker[] = [
  // Accumulateurs
  fresh(variants(
    () => {
      const n = randInt(5, 12)
      return prog({
        prompt: `La variable s sert d’accumulateur. ${out()}`,
        code: C('s = 0', `for k in range(1, ${n + 1}):`, `${I1}s = s + k`, 'print(s)'),
        ans: (n * (n + 1)) / 2,
        expl: `k va de 1 à ${n} : s = 1 + 2 + … + ${n} = ${(n * (n + 1)) / 2}.`,
      })
    },
    () => {
      const n = randInt(4, 10)
      return prog({
        prompt: `On ajoute à s des nombres impairs. ${out()}`,
        code: C('s = 0', `for k in range(${n}):`, `${I1}s = s + 2 * k + 1`, 'print(s)'),
        ans: n * n,
        expl: `k va de 0 à ${n - 1}, donc on ajoute 1 + 3 + … + ${2 * n - 1}, soit ${range(0, n).map((k) => 2 * k + 1).join(' + ')} = ${n * n}.`,
      })
    },
    () => {
      const n = randInt(4, 7)
      let p = 1
      for (let k = 2; k <= n; k++) p *= k
      return prog({
        prompt: `Ici l’accumulateur est un produit. ${out()}`,
        code: C('p = 1', `for k in range(2, ${n + 1}):`, `${I1}p = p * k`, 'print(p)'),
        ans: p,
        expl: `p = 2 × 3 × … × ${n} = ${p}.`,
      })
    },
    () => {
      const a = randInt(1, 10), b = a + randInt(10, 20), m = pick([3, 4, 5])
      const ks = range(a, b).filter((k) => k % m === 0)
      return prog({
        prompt: `On n’ajoute que certains entiers. ${out()}`,
        code: C('s = 0', `for k in range(${a}, ${b}):`, `${I1}if k % ${m} == 0:`, `${I2}s = s + k`, 'print(s)'),
        ans: sumArr(ks),
        expl: `On ajoute les multiples de ${m} compris entre ${a} et ${b - 1} : ${ks.join(' + ')} = ${sumArr(ks)}.`,
      })
    },
    () => {
      const a = randInt(1, 6), s = randInt(2, 5), b = a + s * randInt(3, 5) + randInt(0, s - 1)
      const ks = range(a, b, s)
      return prog({
        prompt: `La boucle avance avec un pas. ${out()}`,
        code: C('total = 0', `for k in range(${a}, ${b}, ${s}):`, `${I1}total = total + k`, 'print(total)'),
        ans: sumArr(ks),
        expl: `k prend les valeurs ${ks.join(', ')} (${b} est exclu) : total = ${sumArr(ks)}.`,
      })
    },
  )),
  // Boucle while
  fresh(variants(
    () => {
      const d = randInt(3, 9), s = randInt(5, 30), x = s + randInt(10, 60)
      let v = x, n = 0
      while (v > s) { v -= d; n++ }
      return prog({
        prompt: `Ce programme compte des passages dans une boucle while. ${out()}`,
        code: C(`x = ${x}`, 'n = 0', `while x > ${s}:`, `${I1}x = x - ${d}`, `${I1}n = n + 1`, 'print(n)'),
        ans: n,
        expl: `x diminue de ${d} tant qu’il dépasse ${s} : ${trace(range(0, n + 1).map((k) => x - k * d))}. La boucle a tourné ${n} fois.`,
      })
    },
    () => {
      const q = pick([2, 3]), s = randInt(20, 900), showX = Math.random() < 0.5
      const vals = [1]
      while (vals[vals.length - 1] < s) vals.push(vals[vals.length - 1] * q)
      return prog({
        prompt: showX ? 'La boucle s’arrête dès que x atteint le seuil. Quelle valeur de x est affichée ?' : 'Combien de fois la boucle a-t-elle tourné ? Le programme l’affiche : quelle valeur ?',
        code: C('x = 1', 'n = 0', `while x < ${s}:`, `${I1}x = ${q} * x`, `${I1}n = n + 1`, showX ? 'print(x)' : 'print(n)'),
        ans: showX ? vals[vals.length - 1] : vals.length - 1,
        expl: `x prend les valeurs ${trace(vals)} ; on s’arrête car ${vals[vals.length - 1]} ≥ ${s}, après ${vals.length - 1} passages.`,
      })
    },
    () => {
      const x = randInt(50, 999)
      const vals = [x]
      while (vals[vals.length - 1] >= 10) vals.push(Math.floor(vals[vals.length - 1] / 2))
      return prog({
        prompt: `On divise par 2 (division entière) tant que le nombre a au moins deux chiffres. ${out()}`,
        code: C(`x = ${x}`, 'while x >= 10:', `${I1}x = x // 2`, 'print(x)'),
        ans: vals[vals.length - 1],
        expl: `x : ${trace(vals)}. La boucle s’arrête quand x < 10.`,
      })
    },
    () => {
      const e = randInt(2, 6), o = pick([1, 3, 5, 7, 9, 11]), x = 2 ** e * o
      return prog({
        prompt: 'Combien de fois peut-on diviser ce nombre par 2 ? Quel nombre ce programme affiche-t-il ?',
        code: C(`x = ${x}`, 'n = 0', 'while x % 2 == 0:', `${I1}x = x // 2`, `${I1}n = n + 1`, 'print(n)'),
        ans: e,
        expl: `x : ${trace(range(0, e + 1).map((k) => x / 2 ** k))}. ${o} est impair : on s’arrête après ${e} divisions.`,
      })
    },
    () => {
      const c = randInt(0, 50), a = pick([15, 20, 25, 30, 40]), s = c + randInt(80, 250)
      let v = c, n = 0
      while (v < s) { v += a; n++ }
      return prog({
        prompt: `${prenom()} met chaque mois la même somme dans sa tirelire et attend d’atteindre son objectif. ${out()}`,
        code: C(`tirelire = ${c}`, 'mois = 0', `while tirelire < ${s}:`, `${I1}tirelire = tirelire + ${a}`, `${I1}mois = mois + 1`, 'print(mois)'),
        ans: n,
        expl: `Après ${n - 1} mois : ${c + (n - 1) * a} < ${s} ; après ${n} mois : ${c + n * a} ≥ ${s}. Le programme affiche ${n}.`,
      })
    },
  )),
  // Listes : indices
  fresh(variants(
    () => {
      const L = Array.from({ length: randInt(5, 7) }, () => randInt(1, 30)), i = randInt(1, L.length - 1)
      return prog({
        prompt: `Attention, le premier élément d’une liste a l’indice 0. ${out()}`,
        code: C(`L = ${pyL(L)}`, `print(L[${i}])`),
        ans: L[i],
        expl: `L[0] = ${L[0]}, L[1] = ${L[1]}… donc L[${i}] est le ${i + 1}e élément : ${L[i]}.`,
      })
    },
    () => {
      const L = Array.from({ length: randInt(5, 7) }, () => randInt(1, 30))
      return prog({
        prompt: `L’indice −1 désigne le dernier élément d’une liste. ${out()}`,
        code: C(`L = ${pyL(L)}`, 'print(L[-1] + L[0])'),
        ans: L[L.length - 1] + L[0],
        expl: `L[−1] = ${L[L.length - 1]} (dernier) et L[0] = ${L[0]} (premier) : ${L[L.length - 1] + L[0]}.`,
      })
    },
    () => {
      const L = Array.from({ length: randInt(4, 7) }, () => randInt(1, 30)), a = randInt(1, 9), b = randInt(1, 9)
      return prog({
        prompt: `La méthode append ajoute un élément en fin de liste et len donne la longueur. ${out()}`,
        code: C(`L = ${pyL(L)}`, `L.append(${a})`, `L.append(${b})`, 'print(len(L) + L[1])'),
        ans: L.length + 2 + L[1],
        expl: `La liste a maintenant ${L.length + 2} éléments et L[1] = ${L[1]} : ${L.length + 2} + ${L[1]} = ${L.length + 2 + L[1]}.`,
      })
    },
    () => {
      const L = Array.from({ length: 5 }, () => randInt(1, 20)), i = randInt(0, 4), j = retry(() => { const v = randInt(0, 4); return v !== i && v + 1 })! - 1
      const M = [...L]
      M[i] = L[i] + L[j]
      return prog({
        prompt: `On modifie un élément de la liste. ${outL()}`,
        code: C(`L = ${pyL(L)}`, `L[${i}] = L[${i}] + L[${j}]`, 'print(L)'),
        ans: M,
        expl: `L[${i}] = ${L[i]} et L[${j}] = ${L[j]} : l’élément d’indice ${i} devient ${M[i]}, les autres ne changent pas.`,
      })
    },
    () => {
      const L = Array.from({ length: randInt(4, 6) }, () => nz(-10, 25))
      return prog({
        prompt: `La boucle « for x in L » parcourt les éléments de la liste. ${out()}`,
        code: C(`L = ${pyL(L)}`, 't = 0', 'for x in L:', `${I1}t = t + x`, 'print(t)'),
        ans: sumArr(L),
        expl: `t est la somme des éléments : ${L.map((v, k) => (k && v < 0 ? `(${fmt(v)})` : fmt(v))).join(' + ')} = ${fmt(sumArr(L))}.`,
      })
    },
  )),
  // Termes de suites récurrentes
  fresh(variants(
    () => {
      const u = randInt(-5, 20), r = pick([-4, -3, -2, 2, 3, 4, 5, 7]), n = randInt(3, 10)
      return prog({
        prompt: `Ce programme calcule un terme d’une suite arithmétique. ${out()}`,
        code: C(`u = ${u}`, `for i in range(${n}):`, `${I1}u = u ${r < 0 ? '-' : '+'} ${Math.abs(r)}`, 'print(u)'),
        ans: u + n * r,
        expl: `La boucle tourne ${n} fois : u = ${fmt(u)} ${r < 0 ? '−' : '+'} ${n} × ${Math.abs(r)} = ${fmt(u + n * r)}.`,
      })
    },
    () => {
      const u = randInt(1, 6), q = pick([2, 3]), n = randInt(3, 5)
      const vals = range(0, n + 1).map((k) => u * q ** k)
      return prog({
        prompt: `Ce programme calcule un terme d’une suite géométrique. ${out()}`,
        code: C(`u = ${u}`, `for i in range(${n}):`, `${I1}u = ${q} * u`, 'print(u)'),
        ans: vals[n],
        expl: `u : ${trace(vals)} (${n} multiplications par ${q}).`,
      })
    },
    () => {
      const u0 = randInt(1, 5), a = pick([2, 3]), b = pick([-3, -2, -1, 1, 2, 3]), n = randInt(3, 4)
      const vals = [u0]
      for (let k = 0; k < n; k++) vals.push(a * vals[k] + b)
      return prog({
        prompt: `On répète la même transformation affine. ${out()}`,
        code: C(`u = ${u0}`, `for i in range(${n}):`, `${I1}u = ${a} * u ${b < 0 ? '-' : '+'} ${Math.abs(b)}`, 'print(u)'),
        ans: vals[n],
        expl: `u : ${trace(vals)}.`,
      })
    },
    () => {
      const u0 = randInt(0, 10), n = randInt(4, 8)
      return prog({
        prompt: `Le compteur de boucle intervient dans le calcul. ${out()}`,
        code: C(`u = ${u0}`, `for n in range(1, ${n + 1}):`, `${I1}u = u + n`, 'print(u)'),
        ans: u0 + (n * (n + 1)) / 2,
        expl: `On ajoute successivement 1, 2, …, ${n} : u = ${u0} + ${(n * (n + 1)) / 2} = ${u0 + (n * (n + 1)) / 2}.`,
      })
    },
    () => {
      const u0 = randInt(1, 4), n = randInt(3, 4)
      const vals = [u0]
      for (let k = 1; k <= n; k++) vals.push(k * vals[k - 1] + 1)
      return prog({
        prompt: `Le terme suivant dépend du rang. ${out()}`,
        code: C(`u = ${u0}`, `for n in range(1, ${n + 1}):`, `${I1}u = n * u + 1`, 'print(u)'),
        ans: vals[n],
        expl: `u : ${vals.map((v, k) => (k ? `${k} × ${vals[k - 1]} + 1 = ${v}` : `${v}`)).join(' ; ')}.`,
      })
    },
  )),
]

// ── Palier 3 : seuils, compréhensions, fonctions, listes construites ─────
const p3: Maker[] = [
  // Algorithme de seuil
  fresh(variants(
    () => {
      const ctx = pick([
        { t: 'la valeur d’une machine, qui perd', v: 'valeur' },
        { t: 'le stock d’un entrepôt, qui diminue de', v: 'stock' },
        { t: 'la masse d’un produit radioactif, qui diminue de', v: 'masse' },
      ])
      const u0 = pick([1000, 2000, 5000, 800, 1200]), q = pick([0.9, 0.8, 0.75, 0.85, 0.7]), s = Math.round(u0 * pick([0.2, 0.3, 0.4, 0.5]))
      let u = u0, n = 0
      while (u > s) { u = q * u; n++ }
      return prog({
        prompt: `Ce programme modélise ${ctx.t} ${fmt(Math.round((1 - q) * 100))} % chaque année. ${out()}`,
        code: C(`${ctx.v} = ${u0}`, 'n = 0', `while ${ctx.v} > ${s}:`, `${I1}${ctx.v} = ${q} * ${ctx.v}`, `${I1}n = n + 1`, 'print(n)'),
        ans: n,
        expl: `On cherche le premier n tel que ${u0} × ${fmt(q)}^n ≤ ${s}. Au rang ${n - 1} : ≈ ${fmt(Math.round(u0 * q ** (n - 1) * 100) / 100)} > ${s} ; au rang ${n} : ≈ ${fmt(Math.round(u0 * q ** n * 100) / 100)} ≤ ${s}.`,
      })
    },
    () => {
      const u0 = pick([100, 200, 500, 50]), q = pick([1.5, 1.2, 1.25, 2]), s = u0 * pick([3, 5, 8, 10])
      let u = u0, n = 0
      while (u < s) { u = u * q; n++ }
      return prog({
        prompt: `Une population est multipliée chaque année par le même coefficient. Le programme cherche quand elle atteint un seuil. ${out()}`,
        code: C(`p = ${u0}`, 'annee = 0', `while p < ${s}:`, `${I1}p = p * ${q}`, `${I1}annee = annee + 1`, 'print(annee)'),
        ans: n,
        expl: `p = ${u0} × ${fmt(q)}^n : au rang ${n - 1}, ≈ ${fmt(Math.round(u0 * q ** (n - 1) * 100) / 100)} < ${s} ; au rang ${n}, ≈ ${fmt(Math.round(u0 * q ** n * 100) / 100)} ≥ ${s}.`,
      })
    },
    () => {
      const u0 = randInt(100, 500), r = pick([12, 15, 25, 35, 40, 45]), s = u0 + randInt(150, 600)
      const n = Math.ceil((s - u0) / r)
      return prog({
        prompt: `Un site gagne chaque mois le même nombre d’abonnés. Le programme cherche quand il atteint son objectif. ${out()}`,
        code: C(`abonnes = ${u0}`, 'mois = 0', `while abonnes < ${s}:`, `${I1}abonnes = abonnes + ${r}`, `${I1}mois = mois + 1`, 'print(mois)'),
        ans: n,
        expl: `Il faut ${u0} + ${r}n ≥ ${s}, soit n ≥ ${F(s - u0, r)} ≈ ${fmt(Math.round(((s - u0) / r) * 100) / 100)} : le premier entier est ${n}.`,
      })
    },
    () => {
      const q = pick([1.1, 1.2, 1.25, 1.5, 1.05, 1.08]), c0 = pick([1000, 500, 2000, 3000])
      let c = c0, n = 0
      while (c < 2 * c0) { c = c * q; n++ }
      return prog({
        prompt: `Un capital placé à intérêts composés : au bout de combien d’années a-t-il doublé ? ${out()}`,
        code: C(`c = ${c0}`, 'n = 0', `while c < ${2 * c0}:`, `${I1}c = c * ${q}`, `${I1}n = n + 1`, 'print(n)'),
        ans: n,
        expl: `On cherche le premier n tel que ${fmt(q)}^n ≥ 2 : ${fmt(q)}^${n - 1} ≈ ${fmt(Math.round(q ** (n - 1) * 1000) / 1000)} < 2 et ${fmt(q)}^${n} ≈ ${fmt(Math.round(q ** n * 1000) / 1000)} ≥ 2.`,
      })
    },
    () => {
      const b = pick([5, 10, 20, 50]), lim = 2 * b, u0 = lim + pick([64, 128, 100, 200]), e = pick([1, 2, 5])
      const vals = [u0]
      while (vals[vals.length - 1] > lim + e) vals.push(0.5 * vals[vals.length - 1] + b)
      return prog({
        prompt: `La suite uₙ₊₁ = 0,5u_n + ${b} se rapproche de ${lim}. Ce programme cherche quand l’écart devient petit. ${out()}`,
        code: C(`u = ${u0}`, 'n = 0', `while u > ${lim + e}:`, `${I1}u = 0.5 * u + ${b}`, `${I1}n = n + 1`, 'print(n)'),
        ans: vals.length - 1,
        expl: `L’écart u − ${lim} est divisé par 2 à chaque passage : ${trace(vals.map((v) => Math.round(v * 1000) / 1000))}. On s’arrête au premier u ≤ ${lim + e}.`,
      })
    },
  )),
  // Listes en compréhension
  fresh(variants(
    () => {
      const a = randInt(0, 3), b = a + randInt(3, 5)
      const L = range(a, b).map((k) => k * k)
      return prog({
        prompt: `On garde des carrés. ${outL()}`,
        code: C(`L = [k ** 2 for k in range(${a}, ${b})]`, 'print(L)'),
        ans: L,
        expl: `k va de ${a} à ${b - 1} et on garde les carrés : ${listText(L)}.`,
      })
    },
    () => {
      const m = pick([2, 3, 5, 10]), c = nz(-3, 4), n = randInt(4, 6)
      const L = range(0, n).map((k) => m * k + c)
      return prog({
        prompt: `On construit une liste en compréhension. ${outL()}`,
        code: C(`L = [${m} * k ${c < 0 ? '-' : '+'} ${Math.abs(c)} for k in range(${n})]`, 'print(L)'),
        ans: L,
        expl: `k prend les valeurs 0 à ${n - 1} : ${range(0, n).map((k) => `${m} × ${k} ${c < 0 ? '−' : '+'} ${Math.abs(c)} = ${fmt(m * k + c)}`).join(' ; ')}.`,
      })
    },
    () => {
      const m = pick([3, 4, 6, 7]), a = randInt(1, 10), b = a + randInt(12, 25)
      const L = range(a, b).filter((k) => k % m === 0)
      return prog({
        prompt: `La condition « if » filtre les éléments. ${outL()}`,
        code: C(`L = [k for k in range(${a}, ${b}) if k % ${m} == 0]`, 'print(L)'),
        ans: L,
        expl: `On garde les entiers de ${a} à ${b - 1} divisibles par ${m} : ${listText(L)}.`,
      })
    },
    () => {
      const T = Array.from({ length: 6 }, () => randInt(1, 30)), s = randInt(8, 20), d = randInt(1, 5)
      if (!T.some((x) => x > s)) T[0] = s + 3
      const L2 = T.filter((x) => x > s).map((x) => x - d)
      return prog({
        prompt: `On transforme et on filtre une liste de mesures. ${outL()}`,
        code: C(`T = ${pyL(T)}`, `M = [x - ${d} for x in T if x > ${s}]`, 'print(M)'),
        ans: L2,
        expl: `On garde les éléments strictement supérieurs à ${s} (${T.filter((x) => x > s).join(', ')}) et on leur retire ${d} : ${listText(L2)}.`,
      })
    },
    () => {
      const n = randInt(10, 30), a = pick([2, 3, 4]), b = pick([5, 7])
      const L = range(1, n).filter((k) => k % a === 0 || k % b === 0)
      return prog({
        prompt: `len donne le nombre d’éléments de la liste construite. ${out()}`,
        code: C(`L = [k for k in range(1, ${n}) if k % ${a} == 0 or k % ${b} == 0]`, 'print(len(L))'),
        ans: L.length,
        expl: `Les entiers de 1 à ${n - 1} multiples de ${a} ou de ${b} sont ${L.join(', ')} : il y en a ${L.length}.`,
      })
    },
  )),
  // Fonctions contenant une boucle
  fresh(variants(
    () => {
      const n = randInt(3, 6)
      const v = sumArr(range(1, n + 1).map((k) => k * k))
      return prog({
        prompt: RET(callText('somme', n)),
        code: C('def somme(n):', `${I1}s = 0`, `${I1}for k in range(1, n + 1):`, `${I2}s = s + k * k`, `${I1}return s`),
        ans: v,
        expl: `somme(${n}) = ${range(1, n + 1).map((k) => `${k}²`).join(' + ')} = ${v}.`,
        check: { mode: 'out', run: `print(somme(${n}))` },
      })
    },
    () => {
      const n = pick([12, 18, 20, 24, 28, 30, 36, 40, 42, 45, 48, 50, 60, 16, 27, 32])
      const ds = range(1, n + 1).filter((d) => n % d === 0)
      return prog({
        prompt: `Cette fonction compte quelque chose. ${RET(callText('mystere', n))}`,
        code: C('def mystere(n):', `${I1}c = 0`, `${I1}for d in range(1, n + 1):`, `${I2}if n % d == 0:`, `${I3}c = c + 1`, `${I1}return c`),
        ans: ds.length,
        expl: `La fonction compte les diviseurs de ${n} : ${ds.join(', ')}, soit ${ds.length}.`,
        check: { mode: 'out', run: `print(mystere(${n}))` },
      })
    },
    () => {
      const L = Array.from({ length: randInt(5, 8) }, () => randInt(0, 20)), s = randInt(6, 14)
      const c = L.filter((x) => x >= s).length
      return prog({
        prompt: `On appelle compte(notes, ${s}) avec notes = ${listText(L)}. Que renvoie cet appel ?`,
        code: C('def compte(L, seuil):', `${I1}c = 0`, `${I1}for x in L:`, `${I2}if x >= seuil:`, `${I3}c = c + 1`, `${I1}return c`),
        ans: c,
        expl: `On compte les éléments supérieurs ou égaux à ${s} : ${L.filter((x) => x >= s).join(', ') || 'aucun'}, soit ${c}.`,
        check: { mode: 'out', run: `print(compte(${pyL(L)}, ${s}))` },
      })
    },
    () => {
      const u0 = randInt(1, 5), a = pick([2, 3]), b = pick([-2, -1, 1, 2]), n = randInt(3, 4)
      const vals = [u0]
      for (let k = 0; k < n; k++) vals.push(a * vals[k] + b)
      return prog({
        prompt: `La fonction terme(n) renvoie u_n. ${RET(callText('terme', n))}`,
        code: C('def terme(n):', `${I1}u = ${u0}`, `${I1}for i in range(n):`, `${I2}u = ${a} * u ${b < 0 ? '-' : '+'} ${Math.abs(b)}`, `${I1}return u`),
        ans: vals[n],
        expl: `u : ${trace(vals)}.`,
        check: { mode: 'out', run: `print(terme(${n}))` },
      })
    },
    () => {
      const n = randInt(1000, 99999)
      const digits = String(n).split('').map(Number)
      return prog({
        prompt: `Cette fonction utilise % et //. ${RET(callText('chiffres', n))}`,
        code: C('def chiffres(n):', `${I1}s = 0`, `${I1}while n > 0:`, `${I2}s = s + n % 10`, `${I2}n = n // 10`, `${I1}return s`),
        ans: sumArr(digits),
        expl: `n % 10 est le dernier chiffre et n // 10 l’efface : la fonction additionne les chiffres de ${n}, ${digits.filter((d) => d).join(' + ')} = ${sumArr(digits)}${digits.includes(0) ? ' (les 0 n’ajoutent rien)' : ''}.`,
        check: { mode: 'out', run: `print(chiffres(${n}))` },
      })
    },
  )),
  // Listes construites avec append
  fresh(variants(
    () => {
      const a = pick([2, 3, 4, 5, -2]), b = randInt(-3, 5), n = randInt(4, 6)
      const L = range(0, n).map((i) => a * i + b)
      return prog({
        prompt: `La liste se remplit à chaque passage dans la boucle. ${outL()}`,
        code: C('L = []', `for i in range(${n}):`, `${I1}L.append(${a} * i ${b < 0 ? '-' : '+'} ${Math.abs(b)})`, 'print(L)'),
        ans: L,
        expl: `i va de 0 à ${n - 1} : on ajoute ${a} × i ${b < 0 ? '−' : '+'} ${Math.abs(b)}, d’où ${listText(L)}.`,
      })
    },
    () => {
      const u0 = randInt(1, 4), q = pick([2, 3]), n = randInt(3, 4)
      const L = range(0, n + 1).map((k) => u0 * q ** k)
      return prog({
        prompt: `L[−1] est le dernier élément de la liste au moment du calcul. ${outL()}`,
        code: C(`L = [${u0}]`, `for i in range(${n}):`, `${I1}L.append(${q} * L[-1])`, 'print(L)'),
        ans: L,
        expl: `Chaque nouvel élément vaut ${q} fois le précédent : ${listText(L)}.`,
      })
    },
    () => {
      const T = Array.from({ length: 7 }, () => randInt(1, 40))
      if (!T.some((x) => x % 2 === 1)) T[2] = 7
      const L = T.filter((x) => x % 2 === 1)
      return prog({
        prompt: `On recopie certains éléments de T dans L. ${outL()}`,
        code: C(`T = ${pyL(T)}`, 'L = []', 'for x in T:', `${I1}if x % 2 == 1:`, `${I2}L.append(x)`, 'print(L)'),
        ans: L,
        expl: `x % 2 == 1 signifie « x impair » : on recopie les impairs dans l’ordre, ${listText(L)}.`,
      })
    },
    () => {
      const T = Array.from({ length: 5 }, () => randInt(1, 30))
      const D = range(1, T.length).map((i) => T[i] - T[i - 1])
      return prog({
        prompt: `On calcule les écarts entre éléments voisins. ${outL()}`,
        code: C(`T = ${pyL(T)}`, 'D = []', 'for i in range(1, len(T)):', `${I1}D.append(T[i] - T[i - 1])`, 'print(D)'),
        ans: D,
        expl: `i va de 1 à ${T.length - 1} : ${range(1, T.length).map((i) => `${T[i]} − ${T[i - 1]} = ${fmt(T[i] - T[i - 1])}`).join(' ; ')}.`,
      })
    },
  )),
]

// ── Palier 4 : dichotomie, boucles imbriquées, algorithmes classiques ───
/** Dichotomie sur [a ; b] pour f croissante (f(a) < 0 < f(b)). */
function dicho(f: (x: number) => number, a: number, b: number, steps: number) {
  const hist: [number, number][] = [[a, b]]
  for (let i = 0; i < steps; i++) {
    const m = (a + b) / 2
    if (f(m) < 0) a = m
    else b = m
    hist.push([a, b])
  }
  return hist
}
const histText = (h: [number, number][]) => h.map(([a, b]) => `[${fmt(a)} ; ${fmt(b)}]`).join(' → ')
/** Fonction croissante ayant une racine dans ]n ; n + 1[ (x² − K ou x³ − K). */
function dichoSetup() {
  const cube = Math.random() < 0.4
  const K = cube ? pick([2, 3, 5, 7, 10, 20, 30, 50]) : pick([2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 15, 17, 20, 30])
  const n = Math.floor(cube ? Math.cbrt(K) : Math.sqrt(K))
  const f = cube ? (x: number) => x ** 3 - K : (x: number) => x ** 2 - K
  return { K, n, f, cube, py: cube ? `x ** 3 - ${K}` : `x ** 2 - ${K}`, root: cube ? `∛${K}` : `√${K}` }
}
const dichoCode = (py: string, a: number, b: number, loop: string, tail: string[]) => C(
  'def f(x):', `${I1}return ${py}`, `a = ${a}`, `b = ${b}`, ...loop.split('\n'),
  `${I1}m = (a + b) / 2`, `${I1}if f(m) < 0:`, `${I2}a = m`, `${I1}else:`, `${I2}b = m`, ...tail,
)

const p4: Maker[] = [
  // Dichotomie
  fresh(variants(
    () => {
      const d = dichoSetup(), s = randInt(2, 4)
      const h = dicho(d.f, d.n, d.n + 1, s)
      return prog({
        prompt: `Ce programme encadre ${d.root} par dichotomie. ${out()}`,
        code: dichoCode(d.py, d.n, d.n + 1, `for i in range(${s}):`, ['print(a)']),
        ans: h[s][0],
        expl: `À chaque étape on garde la moitié qui contient la racine : ${histText(h)}. Le programme affiche a = ${fmt(h[s][0])}.`,
      })
    },
    () => {
      const d = dichoSetup(), s = randInt(2, 4)
      const h = dicho(d.f, d.n, d.n + 1, s)
      return prog({
        prompt: `Algorithme de dichotomie : quelle valeur de b est affichée à la fin ?`,
        code: dichoCode(d.py, d.n, d.n + 1, `for i in range(${s}):`, ['print(b)']),
        ans: h[s][1],
        expl: `Intervalles successifs : ${histText(h)}. Le programme affiche b = ${fmt(h[s][1])}.`,
      })
    },
    () => {
      const d = dichoSetup(), e = pick([0.1, 0.01, 0.05, 0.2, 0.001])
      let n = 0, w = 1
      while (w > e) { w /= 2; n++ }
      return prog({
        prompt: `Ce programme de dichotomie compte ses étapes. ${out()}`,
        code: dichoCode(d.py, d.n, d.n + 1, `n = 0\nwhile b - a > ${e}:\n${I1}n = n + 1`, ['print(n)']),
        ans: n,
        expl: `La largeur de l’intervalle est divisée par 2 à chaque étape : après n étapes elle vaut ${F(1, '2^n')}. Il faut ${F(1, '2^n')} ≤ ${fmt(e)} : 2^${n - 1} = ${2 ** (n - 1)} ne suffit pas, 2^${n} = ${2 ** n} convient.`,
      })
    },
    () => {
      const d = dichoSetup(), s = randInt(2, 3)
      const h = dicho(d.f, d.n, d.n + 1, s)
      return prog({
        prompt: `Après la boucle, le programme affiche le centre de l’intervalle obtenu. Quelle valeur ?`,
        code: dichoCode(d.py, d.n, d.n + 1, `for i in range(${s}):`, ['print((a + b) / 2)']),
        ans: (h[s][0] + h[s][1]) / 2,
        expl: `Intervalles successifs : ${histText(h)}. Centre : (${fmt(h[s][0])} + ${fmt(h[s][1])}) ÷ 2 = ${fmt((h[s][0] + h[s][1]) / 2)}.`,
      })
    },
  )),
  // Boucles imbriquées
  fresh(variants(
    () => {
      const n = randInt(4, 9)
      return prog({
        prompt: 'La boucle intérieure dépend de la boucle extérieure. Qu’affiche ce programme ?',
        code: C('c = 0', `for i in range(${n}):`, `${I1}for j in range(i):`, `${I2}c = c + 1`, 'print(c)'),
        ans: (n * (n - 1)) / 2,
        expl: `Pour i = 0, 1, …, ${n - 1}, la boucle intérieure tourne i fois : 0 + 1 + … + ${n - 1} = ${(n * (n - 1)) / 2}.`,
      })
    },
    () => {
      const n = randInt(4, 8)
      return prog({
        prompt: `Ce programme compte les matchs d’un tournoi où chaque équipe rencontre une fois chacune des autres. ${out()}`,
        code: C('matchs = 0', `for i in range(1, ${n + 1}):`, `${I1}for j in range(i + 1, ${n + 1}):`, `${I2}matchs = matchs + 1`, 'print(matchs)'),
        ans: (n * (n - 1)) / 2,
        expl: `On compte les couples (i ; j) avec 1 ≤ i < j ≤ ${n} : ${range(1, n).map((i) => n - i).join(' + ')} = ${(n * (n - 1)) / 2}.`,
      })
    },
    () => {
      const a = randInt(2, 4), b = randInt(2, 4)
      const sa = (a * (a + 1)) / 2, sb = (b * (b + 1)) / 2
      return prog({
        prompt: `On additionne des produits i × j. ${out()}`,
        code: C('s = 0', `for i in range(1, ${a + 1}):`, `${I1}for j in range(1, ${b + 1}):`, `${I2}s = s + i * j`, 'print(s)'),
        ans: sa * sb,
        expl: `s = (1 + … + ${a}) × (1 + … + ${b}) = ${sa} × ${sb} = ${sa * sb}, car chaque produit i × j apparaît une fois.`,
      })
    },
    () => {
      const k = randInt(3, 11)
      const c = range(1, 7).reduce((s, i) => s + range(1, 7).filter((j) => i + j === k).length, 0)
      return prog({
        prompt: `On lance deux dés à six faces. Ce programme compte les issues donnant une certaine somme. ${out()}`,
        code: C('c = 0', 'for i in range(1, 7):', `${I1}for j in range(1, 7):`, `${I2}if i + j == ${k}:`, `${I3}c = c + 1`, 'print(c)'),
        ans: c,
        expl: `Couples (i ; j) de somme ${k} : ${range(1, 7).filter((i) => k - i >= 1 && k - i <= 6).map((i) => `(${i} ; ${k - i})`).join(', ')}, soit ${c}.`,
      })
    },
  )),
  // Algorithmes classiques avec while
  fresh(variants(
    () => {
      const [a, b] = retry(() => { const g = randInt(2, 12), x = g * randInt(5, 25), y = g * randInt(2, 15); return x > y && [x, y] })
      const steps: string[] = []
      let x = a, y = b
      while (y !== 0) { steps.push(`(${x} ; ${y})`); [x, y] = [y, x % y] }
      steps.push(`(${x} ; 0)`)
      return prog({
        prompt: `Algorithme d’Euclide appliqué à ${a} et ${b} : ${out().toLowerCase()}`,
        code: C(`a = ${a}`, `b = ${b}`, 'while b != 0:', `${I1}a, b = b, a % b`, 'print(a)'),
        ans: x,
        expl: `(a ; b) : ${steps.join(' → ')}. Le programme affiche le PGCD, ${x}.`,
      })
    },
    () => {
      const n = pick([6, 7, 9, 10, 11, 12, 13, 14, 15, 17, 18, 20, 22, 24])
      const vals = [n]
      while (vals[vals.length - 1] !== 1) { const v = vals[vals.length - 1]; vals.push(v % 2 === 0 ? v / 2 : 3 * v + 1) }
      return prog({
        prompt: `Suite de Syracuse partant de ${n} : combien d’étapes faut-il pour atteindre 1 ? Le programme l’affiche.`,
        code: C(`n = ${n}`, 'etapes = 0', 'while n != 1:', `${I1}if n % 2 == 0:`, `${I2}n = n // 2`, `${I1}else:`, `${I2}n = 3 * n + 1`, `${I1}etapes = etapes + 1`, 'print(etapes)'),
        ans: vals.length - 1,
        expl: `n : ${vals.join(' → ')}, soit ${vals.length - 1} étapes.`,
      })
    },
    () => {
      const n = randInt(5, 60)
      const bits: number[] = []
      for (let v = n; v > 0; v = Math.floor(v / 2)) bits.push(v % 2)
      return prog({
        prompt: `On divise ${n} successivement par 2 en notant les restes. ${outL()}`,
        code: C(`n = ${n}`, 'L = []', 'while n > 0:', `${I1}L.append(n % 2)`, `${I1}n = n // 2`, 'print(L)'),
        ans: bits,
        expl: `Restes successifs : ${bits.join(', ')} (ce sont les chiffres de ${n} en binaire, ${[...bits].reverse().join('')}, lus à l’envers).`,
      })
    },
    () => {
      const base = pick([10, 10, 2]), nb = base === 2 ? randInt(20, 300) : randInt(1000, 999999)
      let cb = 0
      for (let v = nb; v > 0; v = Math.floor(v / base)) cb++
      return prog({
        prompt: base === 2 ? `Ce programme compte les divisions entières par 2 avant d’arriver à 0. ${out()}` : `Ce programme compte les chiffres d’un entier. ${out()}`,
        code: C(`n = ${nb}`, 'c = 0', 'while n > 0:', `${I1}n = n // ${base}`, `${I1}c = c + 1`, 'print(c)'),
        ans: cb,
        expl: base === 2
          ? `On cherche combien de fois diviser ${nb} par 2 pour arriver à 0 : 2^${cb - 1} = ${2 ** (cb - 1)} ≤ ${nb} < 2^${cb} = ${2 ** cb}, donc ${cb} divisions.`
          : `Chaque division par 10 efface un chiffre : ${nb} a ${cb} chiffres.`,
      })
    },
  )),
  // Seuils avec cumul
  fresh(variants(
    () => {
      const s = randInt(30, 200)
      let t = 0, n = 0
      while (t < s) { n++; t += n }
      return prog({
        prompt: `On empile des rangées : 1 objet, puis 2, puis 3… Le programme cherche combien de rangées il faut pour en utiliser au moins ${s}. ${out()}`,
        code: C('s = 0', 'n = 0', `while s < ${s}:`, `${I1}n = n + 1`, `${I1}s = s + n`, 'print(n)'),
        ans: n,
        expl: `s = 1 + 2 + … + n = ${F('n(n + 1)', 2)}. Pour n = ${n - 1} : ${((n - 1) * n) / 2} < ${s} ; pour n = ${n} : ${(n * (n + 1)) / 2} ≥ ${s}.`,
      })
    },
    () => {
      const s = randInt(50, 400)
      let t = 0, n = 0
      while (t <= s) { n++; t += n * n }
      return prog({
        prompt: `On additionne des carrés jusqu’à dépasser un seuil. ${out()}`,
        code: C('s = 0', 'n = 0', `while s <= ${s}:`, `${I1}n = n + 1`, `${I1}s = s + n * n`, 'print(n)'),
        ans: n,
        expl: `Sommes successives : ${range(1, n + 1).map((k) => sumArr(range(1, k + 1).map((j) => j * j))).join(', ')}. La première strictement supérieure à ${s} est atteinte pour n = ${n}.`,
      })
    },
    () => {
      const u0 = pick([1, 2, 3, 5]), s = randInt(100, 2000)
      let u = u0, t = u0, n = 0
      const sums = [t]
      while (t < s) { u = 2 * u; t += u; n++; sums.push(t) }
      return prog({
        prompt: `Chaque jour, on récolte deux fois plus que la veille. Le programme cherche quand le total atteint ${s}. ${out()}`,
        code: C(`u = ${u0}`, `total = ${u0}`, 'n = 0', `while total < ${s}:`, `${I1}u = 2 * u`, `${I1}total = total + u`, `${I1}n = n + 1`, 'print(n)'),
        ans: n,
        expl: `total : ${trace(sums)}. Le premier total au moins égal à ${s} est obtenu pour n = ${n}.`,
      })
    },
    () => {
      const p0 = pick([100, 200, 500, 1000]), s = p0 * pick([2, 3]), k = pick([10, 5, 4])
      let p = p0, n = 0
      const vals = [p]
      while (p < s) { p = p + Math.floor(p / k); n++; vals.push(p) }
      return prog({
        prompt: `Une colonie d’abeilles gagne chaque année un ${k === 10 ? 'dixième' : k === 5 ? 'cinquième' : 'quart'} de son effectif (arrondi à l’unité inférieure). ${out()}`,
        code: C(`p = ${p0}`, 'n = 0', `while p < ${s}:`, `${I1}p = p + p // ${k}`, `${I1}n = n + 1`, 'print(n)'),
        ans: n,
        expl: `p : ${trace(vals)}. On s’arrête dès que p ≥ ${s}, après ${n} années.`,
      })
    },
  )),
  // Simulation : fréquence et probabilité
  variants(
    () => {
      const face = randInt(1, 6), N = pick([10000, 100000])
      return prog({
        prompt: `Ce programme simule ${N} lancers d’un dé équilibré et compte les ${face}. De quelle probabilité la valeur affichée est-elle proche ? (valeur exacte)`,
        code: C('from random import randint', 'c = 0', `for i in range(${N}):`, `${I1}if randint(1, 6) == ${face}:`, `${I2}c = c + 1`, `print(c / ${N})`),
        ans: near('', 1 / 6, 0.006, '1/6', ''),
        expl: `On affiche la fréquence de la face ${face} sur ${N} lancers : elle est proche de la probabilité ${F(1, 6)} ≈ 0,167.`,
        check: { mode: 'none' },
      })
    },
    () => {
      const k = randInt(4, 10), N = 100000
      const c = range(1, 7).reduce((s, i) => s + range(1, 7).filter((j) => i + j === k).length, 0)
      const g = gcd(c, 36)
      return prog({
        prompt: `On lance deux dés et on regarde si la somme vaut ${k}. De quelle probabilité la valeur affichée est-elle proche ? (valeur exacte, sous forme de fraction)`,
        code: C('from random import randint', 'c = 0', `for i in range(${N}):`, `${I1}if randint(1, 6) + randint(1, 6) == ${k}:`, `${I2}c = c + 1`, `print(c / ${N})`),
        ans: near('', c / 36, 0.006, `${c / g}/${36 / g}`, ''),
        expl: `${c} couples sur 36 donnent une somme de ${k} : la fréquence est proche de ${F(c, 36)}${g > 1 ? ` = ${F(c / g, 36 / g)}` : ''}.`,
        check: { mode: 'none' },
      })
    },
    () => {
      const p = pick([0.3, 0.25, 0.7, 0.4, 0.15, 0.6]), n = pick([3, 4, 5])
      return prog({
        prompt: `random() renvoie un nombre aléatoire de [0 ; 1[, et random() < ${fmt(p)} se produit avec une probabilité ${fmt(p)}. La valeur affichée est proche de l’espérance de la variable c. Laquelle ?`,
        code: C('from random import random', 'total = 0', 'for essai in range(100000):', `${I1}c = 0`, `${I1}for k in range(${n}):`, `${I2}if random() < ${p}:`, `${I3}c = c + 1`, `${I1}total = total + c`, 'print(total / 100000)'),
        ans: near('', n * p, 0.02, fmt(n * p), ''),
        expl: `c compte les succès sur ${n} épreuves de probabilité ${fmt(p)} : c suit la loi binomiale B(${n} ; ${fmt(p)}), d’espérance ${n} × ${fmt(p)} = ${fmt(n * p)}.`,
        check: { mode: 'none' },
      })
    },
    () => {
      const N = pick([4, 6, 8, 10, 12, 20])
      return prog({
        prompt: `Ce programme calcule la moyenne de 100 000 tirages d’un entier au hasard entre 1 et ${N}. De quel nombre la valeur affichée est-elle proche ?`,
        code: C('from random import randint', 's = 0', 'for i in range(100000):', `${I1}s = s + randint(1, ${N})`, 'print(s / 100000)'),
        ans: near('', (N + 1) / 2, 0.03, fmt((N + 1) / 2), ''),
        expl: `randint(1, ${N}) tire un entier de 1 à ${N} (${N} inclus) de façon équiprobable : la moyenne est proche de ${F(`1 + ${N}`, 2)} = ${fmt((N + 1) / 2)}.`,
        check: { mode: 'none' },
      })
    },
  ),
]

// ── Palier 5 : programmes plus riches ───────────────────────────────────
const p5: Maker[] = [
  // Affectation simultanée
  fresh(variants(
    () => {
      const a = randInt(0, 3), b = randInt(1, 4), n = randInt(4, 7)
      let x = a, y = b
      const vals = [x]
      for (let i = 0; i < n; i++) { [x, y] = [y, x + y]; vals.push(x) }
      return prog({
        prompt: 'L’affectation a, b = b, a + b calcule les deux membres de droite avant de modifier a et b. Qu’affiche ce programme ?',
        code: C(`a, b = ${a}, ${b}`, `for i in range(${n}):`, `${I1}a, b = b, a + b`, 'print(a)'),
        ans: x,
        expl: `Valeurs successives de a : ${trace(vals)} (type Fibonacci : chaque terme est la somme des deux précédents).`,
      })
    },
    () => {
      const a = randInt(1, 3), b = randInt(1, 3), n = randInt(3, 5)
      let x = a, y = b
      const vals = [`(${x} ; ${y})`]
      for (let i = 0; i < n; i++) { [x, y] = [y, 2 * x + y]; vals.push(`(${x} ; ${y})`) }
      return prog({
        prompt: `Ici b dépend des anciennes valeurs de a et b. ${out()}`,
        code: C(`a, b = ${a}, ${b}`, `for i in range(${n}):`, `${I1}a, b = b, 2 * a + b`, 'print(b)'),
        ans: y,
        expl: `(a ; b) : ${vals.join(' → ')}.`,
      })
    },
    () => {
      const u = randInt(1, 5), v = randInt(1, 5), n = randInt(3, 4)
      let x = u, y = v
      const vals = [`(${x} ; ${y})`]
      for (let i = 0; i < n; i++) { [x, y] = [x + y, x - y]; vals.push(`(${fmt(x)} ; ${fmt(y)})`) }
      return prog({
        prompt: `Deux suites couplées sont calculées simultanément. Quelle valeur de u + v est affichée ?`,
        code: C(`u, v = ${u}, ${v}`, `for i in range(${n}):`, `${I1}u, v = u + v, u - v`, 'print(u + v)'),
        ans: x + y,
        expl: `(u ; v) : ${vals.join(' → ')}, donc u + v = ${fmt(x + y)}.`,
      })
    },
    () => {
      const a = randInt(1, 3), b = randInt(2, 4), n = randInt(3, 4)
      let x = a, y = b
      const vals = [`(${x} ; ${y})`]
      for (let i = 0; i < n; i++) { const nx = x + y, ny = x * y; x = nx; y = ny; vals.push(`(${x} ; ${y})`) }
      return prog({
        prompt: `Attention : sans affectation simultanée, le résultat serait différent. ${out()}`,
        code: C(`a, b = ${a}, ${b}`, `for i in range(${n}):`, `${I1}a, b = a + b, a * b`, 'print(a)'),
        ans: x,
        expl: `(a ; b) : ${vals.join(' → ')} ; à chaque étape, a + b et a × b sont calculés avec les anciennes valeurs.`,
      })
    },
  )),
  // Compréhensions plus fines
  fresh(variants(
    () => {
      const n = pick([12, 18, 20, 24, 28, 30, 36, 40, 42, 45, 48, 50, 54, 56, 60, 72])
      const L = range(1, n + 1).filter((d) => n % d === 0)
      return prog({
        prompt: 'Quelle liste ce programme affiche-t-il ?',
        code: C(`n = ${n}`, 'D = [d for d in range(1, n + 1) if n % d == 0]', 'print(D)'),
        ans: L,
        expl: `On garde les d qui divisent ${n} : la liste des diviseurs, ${listText(L)}.`,
      })
    },
    () => {
      const m = pick([5, 6, 7, 8, 9, 10])
      const L = range(0, m).map((k) => (k * k) % m)
      return prog({
        prompt: 'On calcule des restes de carrés. Quelle liste est affichée ?',
        code: C(`R = [k * k % ${m} for k in range(${m})]`, 'print(R)'),
        ans: L,
        expl: `k * k % ${m} est le reste de k² dans la division par ${m} : ${range(0, m).map((k) => `${k * k} → ${(k * k) % m}`).join(' ; ')}.`,
      })
    },
    () => {
      const a = randInt(1, 10), b = a + randInt(12, 20)
      const L = range(a, b).filter((n) => n % 2 === 1 && n % 3 !== 0)
      return prog({
        prompt: 'Deux conditions sont combinées par « and ». Quelle liste ce programme affiche-t-il ?',
        code: C(`L = [n for n in range(${a}, ${b}) if n % 2 == 1 and n % 3 != 0]`, 'print(L)'),
        ans: L,
        expl: `On garde les entiers impairs non multiples de 3 entre ${a} et ${b - 1} : ${listText(L)}.`,
      })
    },
    () => {
      const n = pick([6, 12, 18, 20, 24, 28, 30, 36, 40, 45, 496, 100, 64, 81, 48])
      const L = range(1, n).filter((k) => n % k === 0)
      return prog({
        prompt: `Ce programme additionne certains diviseurs. ${out()}`,
        code: C(`n = ${n}`, 'print(sum([k for k in range(1, n) if n % k == 0]))'),
        ans: sumArr(L),
        expl: `On additionne les diviseurs de ${n} autres que ${n} lui-même : ${L.join(' + ')} = ${sumArr(L)}.`,
      })
    },
    () => {
      const n = randInt(3, 4)
      const L: number[] = []
      for (let i = 1; i <= n; i++) for (let j = 1; j <= n; j++) if (i < j) L.push(i * j)
      return prog({
        prompt: 'Une compréhension peut contenir deux boucles. Quelle liste est affichée ?',
        code: C(`P = [i * j for i in range(1, ${n + 1}) for j in range(1, ${n + 1}) if i < j]`, 'print(P)'),
        ans: L,
        expl: `On parcourt i puis j (boucle intérieure), en ne gardant que i < j : ${listText(L)}.`,
      })
    },
  )),
  // Seuils plus délicats
  fresh(variants(
    () => {
      const c0 = pick([1000, 2000, 500]), r = pick([1.02, 1.03, 1.05]), d = pick([100, 200, 50]), s = c0 * pick([2, 3])
      let c = c0, n = 0
      const vals = [c]
      while (c < s) { c = c * r + d; n++; vals.push(c) }
      return prog({
        prompt: `Un épargnant place son argent à intérêts composés et ajoute la même somme chaque année. ${out()}`,
        code: C(`c = ${c0}`, 'n = 0', `while c < ${s}:`, `${I1}c = c * ${r} + ${d}`, `${I1}n = n + 1`, 'print(n)'),
        ans: n,
        expl: `c : ${trace(vals.map((v) => Math.round(v)))} (arrondis). Le seuil ${s} est atteint au bout de ${n} ans.`,
      })
    },
    () => {
      const [a0, b0, q, d, n] = retry(() => {
        const a0 = pick([100, 200, 300]), b0 = a0 * pick([2, 3]), q = pick([1.1, 1.2, 1.5]), d = pick([10, 20, 30])
        let a = a0, b = b0, n = 0
        while (a < b && n < 100) { a = a * q; b = b + d; n++ }
        return n >= 2 && n <= 15 && ([a0, b0, q, d, n] as const)
      })
      return prog({
        prompt: `Un village grandit de ${Math.round((q - 1) * 100)} % par an, un autre gagne ${d} habitants par an. ${out()}`,
        code: C(`a = ${a0}`, `b = ${b0}`, 'n = 0', 'while a < b:', `${I1}a = a * ${q}`, `${I1}b = b + ${d}`, `${I1}n = n + 1`, 'print(n)'),
        ans: n,
        expl: `Au rang ${n - 1} : a ≈ ${fmt(Math.round(a0 * q ** (n - 1)))} < b = ${b0 + (n - 1) * d} ; au rang ${n} : a ≈ ${fmt(Math.round(a0 * q ** n))} ≥ b = ${b0 + n * d}.`,
      })
    },
    () => {
      const r = pick([0.5, 0.6, 0.7, 0.8]), D = pick([10, 20, 30, 40]), lim = D / (1 - r), s = Math.floor(lim * pick([0.8, 0.9]))
      let q = 0, n = 0
      const vals = [0]
      while (q < s) { q = r * q + D; n++; vals.push(q) }
      return prog({
        prompt: `Un patient prend ${D} mg d’un médicament chaque jour ; il en élimine ${Math.round((1 - r) * 100)} % par jour. La quantité se rapproche de ${fmt(lim)} mg. ${out()}`,
        code: C('q = 0', 'n = 0', `while q < ${s}:`, `${I1}q = ${r} * q + ${D}`, `${I1}n = n + 1`, 'print(n)'),
        ans: n,
        expl: `q : ${trace(vals.map((v) => Math.round(v * 100) / 100))}. Le seuil ${s} mg est atteint au bout de ${n} jours.`,
      })
    },
    () => {
      const e = pick([0.1, 0.01, 0.001]), q = pick([0.5, 0.2, 0.25])
      let u = 1, n = 0
      while (u > e) { u = u * q; n++ }
      return prog({
        prompt: `Ce programme cherche le premier n tel que ${fmt(q)}^n ≤ ${fmt(e)}. ${out()}`,
        code: C('u = 1', 'n = 0', `while u > ${e}:`, `${I1}u = u * ${q}`, `${I1}n = n + 1`, 'print(n)'),
        ans: n,
        expl: `${fmt(q)}^n = ${F(1, `${fmt(1 / q)}^n`)} ≤ ${fmt(e)} ⇔ ${fmt(1 / q)}^n ≥ ${fmt(1 / e)}. Or ${fmt(1 / q)}^${n - 1} = ${fmt(Math.round((1 / q) ** (n - 1)))} < ${fmt(1 / e)} ≤ ${fmt(1 / q)}^${n} = ${fmt(Math.round((1 / q) ** n))} : la boucle s’arrête au rang ${n}.`,
      })
    },
  )),
  // Fonctions travaillant sur des listes
  fresh(variants(
    () => {
      const L = Array.from({ length: 8 }, () => randInt(1, 6))
      const R: number[] = []
      for (const x of L) if (!R.includes(x)) R.push(x)
      return prog({
        prompt: `On appelle f(${listText(L)}). Quelle liste est renvoyée ?`,
        code: C('def f(L):', `${I1}R = []`, `${I1}for x in L:`, `${I2}if x not in R:`, `${I3}R.append(x)`, `${I1}return R`),
        ans: R,
        expl: `f recopie chaque valeur à sa première apparition (elle supprime les doublons) : ${listText(R)}.`,
        check: { mode: 'out', run: `print(f(${pyL(L)}))` },
      })
    },
    () => {
      const L = Array.from({ length: 7 }, () => randInt(1, 20))
      const c = range(0, L.length - 1).filter((i) => L[i] < L[i + 1]).length
      return prog({
        prompt: `Que renvoie hausses(${listText(L)}) ?`,
        code: C('def hausses(L):', `${I1}c = 0`, `${I1}for i in range(len(L) - 1):`, `${I2}if L[i] < L[i + 1]:`, `${I3}c = c + 1`, `${I1}return c`),
        ans: c,
        expl: `On compte les i tels que L[i] < L[i + 1] (une hausse d’un élément au suivant) : ${range(0, L.length - 1).filter((i) => L[i] < L[i + 1]).map((i) => `${L[i]} < ${L[i + 1]}`).join(', ') || 'aucune'}, soit ${c}.`,
        check: { mode: 'out', run: `print(hausses(${pyL(L)}))` },
      })
    },
    () => {
      const L = Array.from({ length: 5 }, () => randInt(-5, 15))
      const S = [L[0]]
      for (let i = 1; i < L.length; i++) S.push(S[i - 1] + L[i])
      return prog({
        prompt: `Que renvoie cumul(${listText(L)}) ?`,
        code: C('def cumul(L):', `${I1}S = [L[0]]`, `${I1}for i in range(1, len(L)):`, `${I2}S.append(S[-1] + L[i])`, `${I1}return S`),
        ans: S,
        expl: `Chaque élément de S est la somme des éléments de L jusqu’au même rang (sommes cumulées) : ${listText(S)}.`,
        check: { mode: 'out', run: `print(cumul(${pyL(L)}))` },
      })
    },
    () => {
      const L = shuffle(Array.from({ length: 7 }, (_, k) => k * 3 + randInt(0, 2)))
      let i = 0
      for (let k = 0; k < L.length; k++) if (L[k] > L[i]) i = k
      return prog({
        prompt: `Que renvoie position(${listText(L)}) ?`,
        code: C('def position(L):', `${I1}i = 0`, `${I1}for k in range(len(L)):`, `${I2}if L[k] > L[i]:`, `${I3}i = k`, `${I1}return i`),
        ans: i,
        expl: `La fonction renvoie l’indice du plus grand élément : ${L[i]} est à l’indice ${i} (les indices commencent à 0).`,
        check: { mode: 'out', run: `print(position(${pyL(L)}))` },
      })
    },
  )),
  // Remonter le programme : quelle entrée donne ce résultat ?
  fresh(variants(
    () => {
      const n = randInt(5, 15)
      return prog({
        prompt: `Pour quel entier n l’appel f(n) renvoie-t-il ${n * n} ?`,
        code: C('def f(n):', `${I1}s = 0`, `${I1}for k in range(1, n + 1):`, `${I2}s = s + 2 * k - 1`, `${I1}return s`),
        ans: n,
        expl: `f(n) = 1 + 3 + … + (2n − 1) = n² (somme des n premiers impairs). n² = ${n * n} donne n = ${n}.`,
        check: { mode: 'fill', run: 'print(f(…))', expect: String(n * n) },
      })
    },
    () => {
      const k = randInt(3, 9)
      return prog({
        prompt: `Quel est le plus petit entier n tel que g(n) renvoie ${k} ?`,
        code: C('def g(n):', `${I1}c = 0`, `${I1}while n > 1:`, `${I2}n = n // 2`, `${I2}c = c + 1`, `${I1}return c`),
        ans: 2 ** k,
        expl: `g compte les divisions entières par 2 nécessaires pour descendre à 1 : g(n) = ${k} pour 2^${k} ≤ n < 2^${k + 1}. Le plus petit est 2^${k} = ${2 ** k}.`,
        check: { mode: 'fill', run: 'print(g(…), g(… - 1))', expect: `${k} ${k - 1}` },
      })
    },
    () => {
      const x0 = randInt(1, 9), a = pick([2, 3]), b = pick([1, -1, 2, 3]), n = randInt(2, 3)
      let x = x0
      for (let i = 0; i < n; i++) x = a * x + b
      return prog({
        prompt: `Ce programme affiche ${x}. Quelle valeur a-t-on écrite à la place de … ?`,
        code: C('x = …', `for i in range(${n}):`, `${I1}x = ${a} * x ${b < 0 ? '-' : '+'} ${Math.abs(b)}`, 'print(x)'),
        ans: x0,
        expl: `On remonte les calculs en inversant x ↦ ${a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)} (on ${b < 0 ? 'ajoute' : 'retire'} ${Math.abs(b)} puis on divise par ${a}), ${n} fois à partir de ${x} : on trouve ${x0}.`,
        check: { mode: 'fill', expect: String(x) },
      })
    },
    () => {
      const n = randInt(6, 20), v = (n * (n + 1)) / 2
      return prog({
        prompt: `Par quel entier faut-il remplacer … pour que ce programme affiche ${v} ?`,
        code: C('s = 0', 'for k in range(1, …):', `${I1}s = s + k`, 'print(s)'),
        ans: n + 1,
        expl: `s = 1 + 2 + … + N = ${F('N(N + 1)', 2)} où N est le dernier entier parcouru. ${F('N(N + 1)', 2)} = ${v} donne N = ${n}. Comme range exclut sa borne, il faut écrire range(1, ${n + 1}).`,
        check: { mode: 'fill', expect: String(v) },
      })
    },
  )),
]

// ── Problèmes d'amélioration : généraliser ──────────────────────────────
const upgrades: [Maker[], Maker[], Maker[]] = [
  [
    // Somme pour un grand n
    () => {
      const kind = pick(['k', 'odd', 'mult'] as const), n = pick([100, 200, 500, 1000, 50, 2000])
      if (kind === 'k') {
        return prog({
          prompt: `Impossible de suivre la boucle à la main : que renvoie somme(${n}) ?`,
          code: C('def somme(n):', `${I1}s = 0`, `${I1}for k in range(1, n + 1):`, `${I2}s = s + k`, `${I1}return s`),
          ans: (n * (n + 1)) / 2,
          expl: `somme(n) = 1 + 2 + … + n = ${F('n(n + 1)', 2)} : ${F(`${n} × ${n + 1}`, 2)} = ${(n * (n + 1)) / 2}.`,
          check: { mode: 'out', run: `print(somme(${n}))` },
        })
      }
      if (kind === 'odd') {
        return prog({
          prompt: `Que renvoie impairs(${n}) ? (on reconnaîtra une somme classique)`,
          code: C('def impairs(n):', `${I1}s = 0`, `${I1}for k in range(n):`, `${I2}s = s + 2 * k + 1`, `${I1}return s`),
          ans: n * n,
          expl: `On additionne les n premiers impairs 1 + 3 + … + (2n − 1) = n² : ${n}² = ${n * n}.`,
          check: { mode: 'out', run: `print(impairs(${n}))` },
        })
      }
      const m = pick([3, 5, 7])
      const N = Math.floor((n - 1) / m)
      return prog({
        prompt: `Que renvoie multiples(${n}) ?`,
        code: C('def multiples(n):', `${I1}s = 0`, `${I1}for k in range(0, n, ${m}):`, `${I2}s = s + k`, `${I1}return s`),
        ans: (m * N * (N + 1)) / 2,
        expl: `k parcourt 0, ${m}, ${2 * m}, …, ${m * N} (le plus grand multiple de ${m} inférieur à ${n}). s = ${m} × (1 + 2 + … + ${N}) = ${m} × ${F(`${N} × ${N + 1}`, 2)} = ${(m * N * (N + 1)) / 2}.`,
        check: { mode: 'out', run: `print(multiples(${n}))` },
      })
    },
    // Nombre de passages dans une boucle range(a, b, s)
    () => {
      const a = randInt(0, 20), s = pick([3, 4, 6, 7, 9, 11]), b = randInt(200, 1000)
      const n = Math.ceil((b - a) / s)
      return prog({
        prompt: `${prenom()} lance ce programme ; la boucle est trop longue pour être suivie à la main. Combien de fois le message est-il affiché ?`,
        code: C(`for i in range(${a}, ${b}, ${s}):`, `${I1}print("Encore !")`),
        ans: n,
        expl: `i prend les valeurs ${a} + ${s}k avec ${a} + ${s}k < ${b}, soit k < ${F(b - a, s)} ≈ ${fmt(Math.round(((b - a) / s) * 100) / 100)}. k va de 0 à ${n - 1} : ${n} affichages.`,
        check: { mode: 'count' },
      })
    },
    // Puissance de 2 dépassant un grand seuil
    () => {
      const e = pick([3, 4, 5, 6, 9]), q = pick([2, 2, 10, 3])
      const s = 10 ** e
      let x = 1, n = 0
      while (x < s) { x *= q; n++ }
      return prog({
        prompt: `Ce programme cherche la première puissance de ${q} au moins égale à ${big(s)}. Sans faire tourner la boucle à la main, que va-t-il afficher ?`,
        code: C('x = 1', 'n = 0', `while x < ${s}:`, `${I1}x = ${q} * x`, `${I1}n = n + 1`, 'print(n)'),
        ans: n,
        expl: q === 10
          ? `x = 10^n, et la boucle s’arrête dès que 10^n ≥ 10^${e} : n = ${n}.`
          : `x = ${q}^n ; on cherche le premier n tel que ${q}^n ≥ ${s} : ${q}^${n - 1} = ${q ** (n - 1)} < ${s} ≤ ${q}^${n} = ${q ** n}.${q === 2 ? ' (Repère : 2^{10} = 1024 ≈ 10^3.)' : ''}`,
      })
    },
  ],
  [
    // Coût d'une double boucle pour un grand n
    () => {
      const n = randInt(15, 120), strict = Math.random() < 0.5
      return prog({
        prompt: `La boucle extérieure tourne ${n} fois. Combien de fois l’instruction c = c + 1 est-elle exécutée en tout ? Le programme affiche ce nombre : lequel ?`,
        code: C('c = 0', `for i in range(${n}):`, `${I1}for j in range(${strict ? 'i + 1, ' : ''}${n}):`, `${I2}c = c + 1`, 'print(c)'),
        ans: strict ? (n * (n - 1)) / 2 : n * n,
        expl: strict
          ? `Pour i donné, j va de i + 1 à ${n - 1} : ${n - 1} − i passages. Total : ${n - 1} + ${n - 2} + … + 1 = ${F(`${n} × ${n - 1}`, 2)} = ${(n * (n - 1)) / 2}.`
          : `Les deux boucles sont indépendantes : ${n} × ${n} = ${n * n} passages.`,
      })
    },
    // Dichotomie : nombre d'étapes pour une précision donnée
    () => {
      const d = dichoSetup(), w = pick([1, 2, 4]), k = pick([2, 3, 4, 5, 6])
      const e = 10 ** -k
      let n = 0, width = w
      while (width > e) { width /= 2; n++ }
      return prog({
        prompt: `Combien d’étapes faut-il à cette dichotomie pour obtenir un encadrement de ${d.root} d’amplitude au plus 10^{−${k}} ? Le programme l’affiche : quelle valeur ?`,
        code: dichoCode(d.py, d.n, d.n + w, `n = 0\nwhile b - a > ${e}:\n${I1}n = n + 1`, ['print(n)']),
        ans: n,
        expl: `L’amplitude vaut ${F(w, '2^n')} après n étapes. Il faut 2^n ≥ ${w} × 10^${k} = ${fmt(w * 10 ** k)} : 2^${n - 1} = ${2 ** (n - 1)} < ${fmt(w * 10 ** k)} ≤ 2^${n} = ${2 ** n}, donc n = ${n}.`,
      })
    },
    // Alternance de signes pour un grand n
    () => {
      const n = pick([100, 101, 2026, 2025, 1000, 999, 50, 51])
      const v = n % 2 === 0 ? n / 2 : -(n + 1) / 2
      return prog({
        prompt: `On admet que le programme se termine vite pour un ordinateur. Que renvoie alterne(${n}) ?`,
        code: C('def alterne(n):', `${I1}s = 0`, `${I1}for k in range(1, n + 1):`, `${I2}s = s + (-1) ** k * k`, `${I1}return s`),
        ans: v,
        expl: `s = −1 + 2 − 3 + 4 − … On groupe par paires (−(2j − 1) + 2j) = 1. ${n % 2 === 0 ? `Pour n = ${n} pair : ${n / 2} paires, s = ${n / 2}.` : `Pour n = ${n} impair : ${(n - 1) / 2} paires, puis − ${n} : s = ${(n - 1) / 2} − ${n} = ${fmt(v)}.`}`,
        check: { mode: 'out', run: `print(alterne(${n}))` },
      })
    },
  ],
  [
    // Comptage par inclusion-exclusion
    () => {
      const [a, b] = pick([[3, 5], [2, 7], [4, 6], [3, 7], [5, 7], [2, 3], [6, 10]]), n = pick([100, 1000, 500, 200])
      const c = range(1, n).filter((k) => k % a === 0 || k % b === 0).length
      const l = (a * b) / gcd(a, b)
      return prog({
        prompt: `Ce programme compte les entiers de 1 à ${n - 1} multiples de ${a} ou de ${b}. Qu’affiche-t-il ? (pas question de suivre la boucle à la main)`,
        code: C('c = 0', `for k in range(1, ${n}):`, `${I1}if k % ${a} == 0 or k % ${b} == 0:`, `${I2}c = c + 1`, 'print(c)'),
        ans: c,
        expl: `Entre 1 et ${n - 1} : ${Math.floor((n - 1) / a)} multiples de ${a}, ${Math.floor((n - 1) / b)} multiples de ${b}, dont ${Math.floor((n - 1) / l)} multiples de ${l} comptés deux fois. ${Math.floor((n - 1) / a)} + ${Math.floor((n - 1) / b)} − ${Math.floor((n - 1) / l)} = ${c}.`,
      })
    },
    // Euclide : nombre de divisions
    () => {
      const fib = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233]
      const useFib = Math.random() < 0.5
      const i = randInt(5, 10)
      const [a, b] = useFib ? [fib[i + 1], fib[i]] : retry(() => { const x = randInt(100, 900), y = randInt(30, x - 1); return gcd(x, y) < 10 && [x, y] })!
      let x = a, y = b, n = 0
      const steps = [`(${x} ; ${y})`]
      while (y !== 0) { [x, y] = [y, x % y]; n++; steps.push(`(${x} ; ${y})`) }
      return prog({
        prompt: `Combien de divisions euclidiennes l’algorithme d’Euclide effectue-t-il pour ${a} et ${b} ? Le programme l’affiche : quel nombre ?`,
        code: C(`a, b = ${a}, ${b}`, 'n = 0', 'while b != 0:', `${I1}a, b = b, a % b`, `${I1}n = n + 1`, 'print(n)'),
        ans: n,
        expl: `(a ; b) : ${steps.join(' → ')}. ${n} divisions.${useFib ? ' Deux termes consécutifs de la suite de Fibonacci donnent le pire cas : chaque quotient vaut 1.' : ''}`,
      })
    },
    // Programme à compléter : seuil en fonction d'un paramètre
    () => {
      const q = pick([2, 3]), k = q === 2 ? randInt(5, 12) : randInt(4, 8)
      return prog({
        prompt: `Chaque passage dans la boucle multiplie x par ${q}. On remplace … par un entier N. Quelle est la plus grande valeur de N pour laquelle ce programme affiche ${k} ?`,
        code: C('x = 1', 'n = 0', 'while x < …:', `${I1}x = ${q} * x`, `${I1}n = n + 1`, 'print(n)'),
        ans: q ** k,
        expl: `Le programme affiche le premier n tel que ${q}^n ≥ N. Il affiche ${k} si ${q}^${k - 1} < N ≤ ${q}^${k}, soit ${q ** (k - 1)} < N ≤ ${q ** k}. La plus grande valeur est ${q ** k}.`,
        check: { mode: 'fill', expect: String(k) },
      })
    },
  ],
]

// ── Problèmes de l'hôtel de ville ───────────────────────────────────────
const age: [Maker[], Maker[], Maker[]] = [
  [
    () => {
      const p = [randInt(2, 4), randInt(5, 8), randInt(10, 15)], kg = randInt(100, 2500)
      const v = kg <= 500 ? p[0] : kg <= 1500 ? p[1] : p[2]
      return prog({
        title: 'Le péage du pont',
        prompt: `Le seigneur fait payer le passage du pont selon la charge des chariots, grâce à la fonction ci-dessous. Combien d’écus paie un chariot de ${kg} kg ?`,
        code: C('def peage(poids):', `${I1}if poids <= 500:`, `${I2}return ${p[0]}`, `${I1}elif poids <= 1500:`, `${I2}return ${p[1]}`, `${I1}else:`, `${I2}return ${p[2]}`),
        ans: v,
        expl: `${kg} kg ${kg <= 500 ? '≤ 500 : premier cas' : kg <= 1500 ? '> 500 et ≤ 1 500 : deuxième cas' : '> 1 500 : dernier cas'}, d’où ${v} écus.`,
        check: { mode: 'out', run: `print(peage(${kg}))` },
      })
    },
    () => {
      const s = randInt(300, 1200), c = randInt(25, 70)
      const n = Math.ceil(s / c)
      return prog({
        title: 'La réserve de grain',
        prompt: `Le grenier du château contient ${s} sacs de blé et la garnison en consomme ${c} par semaine. Le programme simule la réserve. Qu’affiche-t-il ?`,
        code: C(`stock = ${s}`, 'semaines = 0', 'while stock > 0:', `${I1}stock = stock - ${c}`, `${I1}semaines = semaines + 1`, 'print(semaines)'),
        ans: n,
        expl: `Après ${n - 1} semaines, il reste ${s - (n - 1) * c} sacs (> 0) ; la ${n}e semaine épuise le stock. ${F(s, c)} ≈ ${fmt(Math.round((s / c) * 100) / 100)}, arrondi à l’entier supérieur : ${n}.`,
      })
    },
    () => {
      const h = randInt(6, 12), half = Math.random() < 0.5
      const total = sumArr(range(1, h + 1)) + (half ? h : 0)
      return prog({
        title: 'Les cloches du beffroi',
        prompt: `Le beffroi sonne autant de coups que l’heure${half ? ', plus un coup à chaque demi-heure' : ''}, de 1 h à ${h} h${half ? ' 30' : ''}. Le programme compte les coups sonnés. Qu’affiche-t-il ?`,
        code: C('coups = 0', `for heure in range(1, ${h + 1}):`, `${I1}coups = coups + heure${half ? ' + 1' : ''}`, 'print(coups)'),
        ans: total,
        expl: half
          ? `Pour chaque heure de 1 à ${h}, on ajoute heure + 1 : (1 + 2 + … + ${h}) + ${h} = ${(h * (h + 1)) / 2} + ${h} = ${total}.`
          : `coups = 1 + 2 + … + ${h} = ${F(`${h} × ${h + 1}`, 2)} = ${total}.`,
      })
    },
  ],
  [
    () => {
      const p0 = pick([50, 80, 100, 120]), q = pick([1.2, 1.5, 1.25]), s = p0 * pick([4, 5, 6])
      const vals = [p0]
      let p = p0
      while (p < s) { p = p * q; vals.push(p) }
      const n = vals.length - 1
      const g = graphFigure({ xMin: 0, xMax: n + 1, yMin: 0, yMax: Math.ceil((vals[n] * 1.1) / 100) * 100, step: 1, ystep: 100, ylabelStep: Math.ceil(vals[n] / 400) * 100 })
      vals.forEach((v, k) => g.point(`P${k}`, k, v, ''))
      g.plot(() => s, { color: '#9c8a6c', dashed: true })
      g.note(0.9, s + vals[n] * 0.06, `seuil ${s}`)
      g.figure.caption = 'Effectif de la garenne année après année.'
      return prog({
        title: 'Les lapins de la garenne',
        prompt: `Une garenne compte ${p0} lapins ; l’effectif est multiplié par ${fmt(q)} chaque année. Le garde-chasse interviendra dès que l’effectif atteindra ${s}. Qu’affiche le programme ?`,
        code: C(`lapins = ${p0}`, 'annee = 0', `while lapins < ${s}:`, `${I1}lapins = lapins * ${q}`, `${I1}annee = annee + 1`, 'print(annee)'),
        ans: n,
        expl: `Effectifs : ${trace(vals.map((v) => Math.round(v * 100) / 100))}. Le seuil ${s} est atteint au bout de ${n} ans.`,
        figure: g.figure,
      })
    },
    () => {
      const d = dichoSetup(), s = 3
      const h = dicho(d.f, d.n, d.n + 1, s)
      const g = graphFigure({ xMin: d.n - 0.5, xMax: d.n + 1.5, yMin: Math.floor(d.f(d.n - 0.5)), yMax: Math.ceil(d.f(d.n + 1.5)), step: 0.5, labelStep: 1, ystep: Math.max(1, Math.ceil((d.f(d.n + 1.5) - d.f(d.n - 0.5)) / 8)) })
      g.plot(d.f)
      g.point('a', d.n, 0, 'a', 'n')
      g.point('b', d.n + 1, 0, 'b', 'n')
      g.figure.caption = `Courbe de f(x) = ${d.cube ? `x³ − ${d.K}` : `x² − ${d.K}`}.`
      const want = pick(['a', 'b'] as const)
      return prog({
        title: 'La mesure de l’arpenteur',
        prompt: `Pour tailler une pierre, l’arpenteur a besoin de ${d.root}. Il programme une dichotomie sur [${d.n} ; ${d.n + 1}]. Quelle valeur de ${want} est affichée ?`,
        code: dichoCode(d.py, d.n, d.n + 1, `for i in range(${s}):`, [`print(${want})`]),
        ans: want === 'a' ? h[s][0] : h[s][1],
        expl: `Intervalles successifs : ${histText(h)}. On garde à chaque fois la moitié où f change de signe.`,
        figure: g.figure,
      })
    },
    () => {
      const c0 = pick([1000, 1500, 2000]), t = pick([0.02, 0.03, 0.04]), dep = pick([100, 150, 200]), s = c0 + pick([500, 800, 1000])
      let c = c0, n = 0
      const vals = [c]
      while (c < s) { c = c * (1 + t) + dep; n++; vals.push(c) }
      return prog({
        title: 'Le coffre du marchand',
        prompt: `Un marchand dépose ${c0} écus chez un banquier lombard qui lui verse ${Math.round(t * 100)} % d’intérêts par an ; il ajoute en plus ${dep} écus à chaque fin d’année. Au bout de combien d’années son capital atteindra-t-il au moins ${s} écus ? Qu’affiche le programme ?`,
        code: C(`c = ${c0}`, 'n = 0', `while c < ${s}:`, `${I1}c = c * ${1 + t} + ${dep}`, `${I1}n = n + 1`, 'print(n)'),
        ans: n,
        expl: `Capital : ${trace(vals.map((v) => Math.round(v * 100) / 100))}. Il atteint ${s} écus au bout de ${n} ans.`,
      })
    },
  ],
  [
    () => {
      const n = randInt(6, 16), m = (n * (n - 1)) / 2
      return prog({
        title: 'Le grand tournoi',
        prompt: `Au tournoi du roi, chaque chevalier affronte une fois chacun des autres. Le héraut a lancé le programme ci-dessous, en remplaçant … par le nombre de chevaliers : il affiche ${m}. Combien de chevaliers participent ?`,
        code: C('n = …', 'joutes = 0', 'for i in range(n):', `${I1}for j in range(i + 1, n):`, `${I2}joutes = joutes + 1`, 'print(joutes)'),
        ans: n,
        expl: `Le programme compte ${F('n(n − 1)', 2)} joutes. ${F('n(n − 1)', 2)} = ${m} ⇔ n(n − 1) = ${2 * m} = ${n} × ${n - 1}, donc n = ${n}.`,
        check: { mode: 'fill', expect: String(m) },
      })
    },
    () => {
      const a = pick([3, 5, 7, 9, 11, 15]), b = randInt(1, 25)
      const msg = pick(['ROI', 'OR', 'FEU', 'CLE', 'TOUR', 'EPEE', 'ARC', 'PAIX'])
      const L = msg.split('').map((ch) => ch.charCodeAt(0) - 65)
      const E = L.map((x) => (a * x + b) % 26)
      return prog({
        title: 'Le message chiffré',
        prompt: `Pour transmettre le mot « ${msg} » (A = 0, B = 1, …, Z = 25), l’espion code chaque lettre avec le programme ci-dessous. Quelle liste obtient-il ?`,
        code: C(`mot = ${pyL(L)}`, `code = [(${a} * x + ${b}) % 26 for x in mot]`, 'print(code)'),
        ans: E,
        expl: `Pour chaque lettre x, on calcule le reste de ${a}x + ${b} dans la division par 26 : ${L.map((x, i) => `${a} × ${x} + ${b} = ${a * x + b} → ${E[i]}`).join(' ; ')}.`,
      })
    },
    () => {
      const [a0, b0, q, d] = retry(() => {
        const a0 = pick([200, 300, 400]), b0 = a0 + pick([100, 200, 300]), q = pick([1.1, 1.2]), d = pick([20, 30, 40])
        let a = a0, b = b0, n = 0
        while (a <= b) { a = a * q; b = b + d; n++ }
        return n >= 3 && n <= 10 && ([a0, b0, q, d] as const)
      })
      let a = a0, b = b0, n = 0
      const va = [a], vb = [b]
      while (a <= b) { a = a * q; b = b + d; n++; va.push(a); vb.push(b) }
      return prog({
        title: 'Les deux bourgs',
        prompt: `Le bourg de Montfort compte ${a0} habitants et gagne ${Math.round((q - 1) * 100)} % par an ; celui de Belval compte ${b0} habitants et en gagne ${d} par an. Au bout de combien d’années Montfort sera-t-il plus peuplé que Belval ? Qu’affiche le programme ?`,
        code: C(`m = ${a0}`, `b = ${b0}`, 'n = 0', 'while m <= b:', `${I1}m = m * ${q}`, `${I1}b = b + ${d}`, `${I1}n = n + 1`, 'print(n)'),
        ans: n,
        expl: `Montfort : ${trace(va.map((v) => Math.round(v * 10) / 10))} ; Belval : ${trace(vb)}. Montfort dépasse Belval au bout de ${n} ans.`,
      })
    },
  ],
]

export const CONTENT: SubjectContent | null = { tiers: [p1, p2, p3, p4, p5], upgrades, age }
