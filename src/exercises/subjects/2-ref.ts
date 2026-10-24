// Fonctions de référence (2nde) : fonctions affines (coefficient directeur, ordonnée à l'origine, sens de
// variation), carré, inverse, racine carrée (et cube) : images, antécédents, comparaisons, inéquations,
// positions relatives des courbes, lectures graphiques.
import {
  F, choice, expression, fmt, fraction, fracText, gcd, numeric, pair, par, pick, poly, randInt, randNonZero,
  solutionSet, variants, fresh, withMeta,
  type Exercise, type Ladder, type SubjectContent, type Tiers,
} from '../utils'
import { graphFigure, type Figure } from '../figure'
import { prenom } from '../contexts'
import { T, retry, unionEx, iv, ivText, type Iv } from './2-ens'
import { cap } from '../contexts'

// ── Aides locales ───────────────────────────────────────────────────────
const rnd = randInt
const INF = Infinity
const BLUE = '#3f6fb0'
const GREEN = '#4f8a3a'
const R = (lo: number, hi: number) => iv(lo, hi, false, false)
const ALL: Iv[] = [R(-INF, INF)]
/** Réel écrit simplement : fraction réduite si besoin. */
const q = (n: number, d = 1) => fracText(n, d)
/** k√m réduit : 12 → [2, 3]. */
function rootParts(n: number): [number, number] {
  let k = 1, m = n
  for (let d = 2; d * d <= m; d++) while (m % (d * d) === 0) { m /= d * d; k *= d }
  return [k, m]
}
const rootText = (n: number) => { const [k, m] = rootParts(n); return m === 1 ? fmt(k) : `${k === 1 ? '' : k}√${m}` }
/** Équation réduite y = mx + p lisible. */
const lin = (m: number, p: number, v = 'x') => poly([m, v], [p, ''])
const word = (up: boolean) => (up ? 'croissante' : 'décroissante')

/** Repère avec des courbes et des points (coordonnées mathématiques). */
function plotFig(win: { xMin: number; xMax: number; yMin: number; yMax: number; labelStep?: number; ystep?: number; ylabelStep?: number },
  curves: { f: (x: number) => number; color?: string; a?: number; b?: number; dashed?: boolean }[],
  points: { name: string; x: number; y: number; label?: string }[] = [], notes: { x: number; y: number; text: string }[] = []): Figure {
  const g = graphFigure({ ...win, h: 240 })
  // on coupe la courbe à la sortie du cadre (sinon graphFigure l'écrase sur le bord)
  const inside = (f: (x: number) => number) => (x: number) => { const y = f(x); return y >= win.yMin && y <= win.yMax ? y : NaN }
  for (const c of curves) g.plot(inside(c.f), { a: c.a, b: c.b, color: c.color, dashed: c.dashed })
  for (const p of points) g.point(p.name, p.x, p.y, p.label)
  for (const n of notes) g.note(n.x, n.y, n.text)
  return g.figure
}
const sq = (x: number) => x * x
const inv = (x: number) => 1 / x
const rt = (x: number) => (x < 0 ? NaN : Math.sqrt(x))
const cube = (x: number) => x * x * x
/** Une droite y = ax + b à coefficients lisibles sur un quadrillage. */
function niceLine(): { a: number; b: number; n: number; d: number } {
  return retry(() => {
    const d = pick([1, 1, 1, 2]), n = randNonZero(-3 * d, 3 * d), b = rnd(-3, 3)
    if (gcd(Math.abs(n), d) !== 1 && d > 1) return null
    return { a: n / d, b, n, d }
  })
}
const lineWin = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 }
/** Ajoute une figure à l'exercice si la condition est remplie (petites valeurs lisibles sur un repère). */
const figIf = (ex: Exercise, cond: boolean, figure: () => Figure): Exercise => (cond ? withMeta(ex, { figure: figure() }) : ex)
const sqFig = (k: number) => plotFig({ xMin: -4, xMax: 4, yMin: -1, yMax: 10, ylabelStep: 2 }, [{ f: sq }, { f: () => k, color: BLUE }])
const invFig = (k: number) => plotFig({ xMin: -3, xMax: 3, yMin: -5, yMax: 5 }, [{ f: inv }, { f: () => k, color: BLUE }])
const rtFig = (k: number) => plotFig({ xMin: -1, xMax: 10, yMin: -1, yMax: 4 }, [{ f: rt, a: 0 }, { f: () => k, color: BLUE }])

// ── Entraînement ────────────────────────────────────────────────────────
const tiers: Tiers = [
  // Palier 1 : affine (lecture), images, sens de variation, droite tracée
  [
    // Coefficient directeur et ordonnée à l'origine
    fresh(variants(
      () => { const a = randNonZero(-9, 9), b = randNonZero(1, 9); return numeric(`f(x) = ${b} ${a < 0 ? '+' : '−'} ${Math.abs(a) === 1 ? 'x' : `${Math.abs(a)}x`}. Quel est le coefficient directeur de f ?`, -a, { explanation: `On réordonne : f(x) = ${lin(-a, b)}. Le coefficient directeur est le nombre devant x : ${fmt(-a)}.` }) },
      () => { const k = pick([-5, -4, -3, -2, 2, 3, 4, 5]), p = randNonZero(-6, 6), c = randInt(-9, 9); return numeric(`f(x) = ${fmt(k)}(${lin(1, -p)})${c ? ` ${c < 0 ? '−' : '+'} ${Math.abs(c)}` : ''}. Quelle est l'ordonnée à l'origine de f ?`, c - k * p, { explanation: `C'est la valeur de f(x) pour x = 0 : ${fmt(k)} × (0 ${p < 0 ? '+' : '−'} ${Math.abs(p)})${c ? ` ${c < 0 ? '−' : '+'} ${Math.abs(c)}` : ''} = ${fmt(c - k * p)}.` }) },
      () => { const d = pick([2, 3, 4]), a = randNonZero(-5, 5), b = randNonZero(-5, 5); return numeric(`f(x) = ${F(lin(a * d, b * d), d)}. Quel est le coefficient directeur de f ?`, a, { explanation: `f(x) = ${F(lin(a * d, 0), d)} ${b * d < 0 ? '−' : '+'} ${F(Math.abs(b * d), d)} = ${lin(a, b)} : le coefficient directeur est ${fmt(a)}.` }) },
      () => { const { a, b } = niceLine(); return withMeta(numeric(`La droite tracée représente une fonction affine f. Quelle est l'ordonnée à l'origine de f ?`, b, { explanation: `La droite coupe l'axe des ordonnées au point (0 ; ${fmt(b)}) : l'ordonnée à l'origine est ${fmt(b)}.` }), { figure: plotFig(lineWin, [{ f: (x) => a * x + b }]) }) },
      () => { const a = randNonZero(-9, 9), b = randNonZero(-9, 9); return numeric(`La droite d'équation y = ${lin(a, b)} coupe l'axe des ordonnées en un point. Quelle est l'ordonnée de ce point ?`, b, { explanation: `Pour x = 0, y = ${fmt(b)} : c'est l'ordonnée à l'origine.` }) },
    )),
    // Images par les fonctions de référence
    fresh(variants(
      () => pick([
        () => { const n = rnd(2, 12); return numeric(`f est la fonction carré. Calcule f(−${n}).`, n * n, { explanation: `(−${n})² = (−${n}) × (−${n}) = ${n * n} : un carré est toujours positif.` }) },
        () => { const n = pick([0.2, 0.3, 0.5, 0.7, 0.9, 1.1, 1.2, 1.5]); return numeric(`f(x) = x². Calcule f(−${fmt(n)}).`, Math.round(n * n * 100) / 100, { explanation: `(−${fmt(n)})² = ${fmt(Math.round(n * n * 100) / 100)}.` }) },
      ])(),
      () => pick([
        () => { const p = rnd(1, 5), r = retry(() => { const v = rnd(2, 9); return gcd(p, v) === 1 && v !== p ? v : null }); return fraction(`g est la fonction inverse. Calcule g(${F(p, r)}).`, r, p, { explanation: `L'inverse de ${F(p, r)} est ${F(r, p)}${p === 1 ? ` = ${r}` : ''} : on « retourne » la fraction.` }) },
        () => { const v = pick([0.1, 0.2, 0.25, 0.5, 4, 5, 8, 10, -2, -4, -5]); return numeric(`g(x) = ${F(1, 'x')}. Calcule g(${fmt(v)}).`, 1 / v, { explanation: `${F(1, fmt(v))} = ${fmt(1 / v)}.` }) },
      ])(),
      () => pick([
        () => { const n = rnd(2, 15); return numeric(`h est la fonction racine carrée. Calcule h(${n * n}).`, n, { explanation: `√${n * n} = ${n} car ${n}² = ${n * n} et ${n} ≥ 0.` }) },
        () => { const n = pick([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12]); return numeric(`h(x) = √x. Calcule h(${fmt((n * n) / 100)}).`, n / 10, { explanation: `${fmt(n / 10)}² = ${fmt((n * n) / 100)}, donc √${fmt((n * n) / 100)} = ${fmt(n / 10)}.` }) },
      ])(),
      () => { const n = randNonZero(-5, 5); return numeric(`c est la fonction cube : c(x) = x³. Calcule c(${fmt(n)}).`, n ** 3, { explanation: `${par(n)}³ = ${par(n)} × ${par(n)} × ${par(n)} = ${fmt(n ** 3)}${n < 0 ? ' (le cube d’un négatif est négatif)' : ''}.` }) },
    )),
    // Sens de variation
    variants(
      () => { const a = randNonZero(-9, 9), b = randInt(-9, 9), form = pick([0, 1, 2]); const txt = form === 0 ? lin(a, b) : form === 1 ? `${fmt(b)} ${a < 0 ? '−' : '+'} ${Math.abs(a) === 1 ? 'x' : `${Math.abs(a)}x`}`.replace(/^0 \+ /, '').replace(/^0 − /, '−') : `${F(lin(a, b), pick([2, 3, 5]))}`; return choice(`Quel est le sens de variation de la fonction f définie sur ℝ par f(x) = ${txt} ?`, a > 0 ? 'Croissante' : 'Décroissante', ['Croissante', 'Décroissante', 'Constante'], `Le coefficient directeur est ${a > 0 ? 'positif' : 'négatif'} (${a > 0 ? '' : '−'}${Math.abs(a)}${form === 2 ? ' divisé par un nombre positif' : ''}) : f est ${word(a > 0)} sur ℝ.`) },
      () => { const [name, I, ans, why] = pick<[string, string, string, string]>([
        ['carré', `[${rnd(1, 4)} ; ${rnd(5, 9)}]`, 'Croissante', 'la fonction carré est croissante sur [0 ; +∞['],
        ['carré', `[−${rnd(5, 9)} ; −${rnd(1, 4)}]`, 'Décroissante', 'la fonction carré est décroissante sur ]−∞ ; 0]'],
        ['carré', `[−${rnd(2, 6)} ; ${rnd(2, 6)}]`, 'Ni croissante ni décroissante', 'la fonction carré décroît sur la partie négative puis croît sur la partie positive'],
        ['inverse', `[${rnd(1, 4)} ; ${rnd(5, 9)}]`, 'Décroissante', 'la fonction inverse est décroissante sur ]0 ; +∞['],
        ['inverse', `[−${rnd(5, 9)} ; −${rnd(1, 4)}]`, 'Décroissante', 'la fonction inverse est décroissante sur ]−∞ ; 0['],
        ['racine carrée', `[${rnd(0, 4)} ; ${rnd(5, 49)}]`, 'Croissante', 'la fonction racine carrée est croissante sur [0 ; +∞['],
        ['cube', `[−${rnd(1, 9)} ; ${rnd(1, 9)}]`, 'Croissante', 'la fonction cube est croissante sur ℝ'],
      ]); return choice(`Quel est le sens de variation de la fonction ${name} sur l'intervalle ${I} ?`, ans, ['Croissante', 'Décroissante', 'Ni croissante ni décroissante'], `${why[0].toUpperCase()}${why.slice(1)}.`) },
      () => { const p = rnd(2, 9), c = rnd(0, 20), item = pick(['places de cinéma', 'trajets en bateau', 'repas à la cantine', 'tickets de manège']), up = pick([true, false]); const txt = up ? `Le prix à payer pour x ${item} est f(x) = ${p}x${c ? ` + ${c}` : ''} (en €).` : `Il reste g(x) = ${c + 10 * p} − ${p}x euros sur la carte après x ${item}.`; return choice(`${txt} Cette fonction est-elle croissante ou décroissante ?`, up ? 'Croissante' : 'Décroissante', ['Croissante', 'Décroissante', 'Constante'], `Le coefficient directeur vaut ${fmt(up ? p : -p)} : ${up ? 'positif, la fonction est croissante (plus on achète, plus on paie)' : 'négatif, la fonction est décroissante (le solde baisse à chaque achat)'}.`) },
      () => { const { a, b } = niceLine(); return withMeta(choice('La droite représente une fonction affine f. Quel est le sens de variation de f ?', a > 0 ? 'Croissante' : 'Décroissante', ['Croissante', 'Décroissante', 'Constante'], `La droite ${a > 0 ? 'monte' : 'descend'} de gauche à droite : son coefficient directeur (${fmt(a)}) est ${a > 0 ? 'positif' : 'négatif'}.`), { figure: plotFig(lineWin, [{ f: (x) => a * x + b }]) }) },
    ),
    // Lecture graphique sur une droite
    fresh(variants(
      () => { const { a, b, d } = niceLine(); const k = d * randNonZero(-2, 2); const y = a * k + b; return Math.abs(y) > 5 ? withMeta(numeric(`La droite représente la fonction affine f. Lis l'ordonnée à l'origine de f.`, b, { explanation: `La droite coupe l'axe des ordonnées en (0 ; ${fmt(b)}).` }), { figure: plotFig(lineWin, [{ f: (x) => a * x + b }]) }) : withMeta(numeric(`La droite représente la fonction affine f. Lis f(${fmt(k)}).`, y, { explanation: `Le point de la droite d'abscisse ${fmt(k)} a pour ordonnée ${fmt(y)} : f(${fmt(k)}) = ${fmt(y)}.` }), { figure: plotFig(lineWin, [{ f: (x) => a * x + b }]) }) },
      () => { const { a, b, n, d } = niceLine(); return withMeta(fraction(`La droite représente la fonction affine ${pick(['f', 'g', 'h'])}. Quel est son coefficient directeur ?`, n, d, { explanation: `Quand x augmente de ${d}, y ${n > 0 ? 'augmente' : 'diminue'} de ${Math.abs(n)} : le coefficient directeur est ${d === 1 ? fmt(n) : `${F(fmt(n), d)} = ${fmt(a)}`}.` }), { figure: plotFig(lineWin, [{ f: (x) => a * x + b }]) }) },
      () => retry(() => { const { a, b, d } = niceLine(); const k = d * randNonZero(-2, 2), y = a * k + b; if (Math.abs(y) > 4 || k === 0) return null; return withMeta(numeric(`La droite représente g. Lis l'antécédent de ${fmt(y)} par g.`, k, { explanation: `On part de ${fmt(y)} sur l'axe des ordonnées, on rejoint la droite, puis on descend sur l'axe des abscisses : x = ${fmt(k)}.` }), { figure: plotFig(lineWin, [{ f: (x) => a * x + b }]) }) }),
      () => retry(() => { const { a, b } = niceLine(); const z = -b / a; if (Math.abs(z) > 4.5 || z === 0 || Math.abs(z * 2 - Math.round(z * 2)) > 1e-9) return null; return withMeta(numeric(`En quelle abscisse la droite représentant f coupe-t-elle l'axe des abscisses ?`, z, { explanation: `On lit le point où la droite traverse l'axe horizontal : x = ${fmt(z)} (c'est la solution de f(x) = 0).` }), { figure: plotFig(lineWin, [{ f: (x) => a * x + b }]) }) }),
    )),
  ],
  // Palier 2 : antécédents, coefficient directeur par deux points, comparaisons, courbes de référence
  [
    // Antécédents
    variants(
      () => { const n = rnd(2, 12); return solutionSet(`Résous l'équation x² = ${n * n}.`, [-n, n], { explanation: `x² = ${n * n} ⟺ x = √${n * n} ou x = −√${n * n}, soit x = ${n} ou x = −${n}.` }) },
      () => { const n = pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.9, 1.1, 1.2]); return solutionSet(`Quels sont les antécédents de ${fmt(Math.round(n * n * 100) / 100)} par la fonction carré ?`, [-n, n], { explanation: `${fmt(n)}² = ${fmt(Math.round(n * n * 100) / 100)} et (−${fmt(n)})² aussi : deux antécédents, ${fmt(n)} et −${fmt(n)}.` }) },
      () => { const c = pick([2, 3, 4, 5, 6, 7, 8, 9, 1.5, 1.2, 0.5, 0.3]); return numeric(`Résous l'équation √x = ${fmt(c)}.`, Math.round(c * c * 100) / 100, { explanation: `√x = ${fmt(c)} ⟺ x = ${fmt(c)}² = ${fmt(Math.round(c * c * 100) / 100)} (${fmt(c)} est bien positif).` }) },
      () => { const c = pick([2, 3, 4, 5, -2, -4, -5, 10]); return numeric(`Quel est l'antécédent de ${fmt(c)} par la fonction inverse ?`, 1 / c, { explanation: `${F(1, 'x')} = ${fmt(c)} ⟺ x = ${F(1, fmt(c))} = ${fmt(1 / c)}.` }) },
      () => { const n = randNonZero(-5, 5); return numeric(`Résous l'équation x³ = ${fmt(n ** 3)}.`, n, { explanation: `${par(n)}³ = ${fmt(n ** 3)} et la fonction cube est strictement croissante : une seule solution, x = ${fmt(n)}.` }) },
    ),
    // Coefficient directeur à partir de deux points
    fresh(variants(
      () => retry(() => { const x1 = rnd(-6, 4), x2 = x1 + rnd(1, 5), y1 = rnd(-9, 9), y2 = rnd(-9, 9); if (y1 === y2) return null; return fraction(`La droite (AB) passe par A(${fmt(x1)} ; ${fmt(y1)}) et B(${fmt(x2)} ; ${fmt(y2)}). Quel est son coefficient directeur ?`, y2 - y1, x2 - x1, { explanation: `m = ${F('y_B − y_A', 'x_B − x_A')} = ${F(`${fmt(y2)} − ${par(y1)}`, `${fmt(x2)} − ${par(x1)}`)} = ${F(fmt(y2 - y1), x2 - x1)}${x2 - x1 === 1 ? '' : ` = ${q(y2 - y1, x2 - x1)}`}.` }) }),
      () => retry(() => { const x1 = rnd(-6, 4), x2 = x1 + rnd(1, 5), m = randNonZero(-4, 4), y1 = rnd(-9, 9), y2 = y1 + m * (x2 - x1); if (x1 * x2 === 0) return null; return numeric(`f est affine, f(${fmt(x1)}) = ${fmt(y1)} et f(${fmt(x2)}) = ${fmt(y2)}. Quel est le coefficient directeur de f ?`, m, { explanation: `a = ${F(`f(${fmt(x2)}) − f(${fmt(x1)})`, `${fmt(x2)} − ${par(x1)}`)} = ${F(fmt(y2 - y1), x2 - x1)} = ${fmt(m)}.` }) }),
      () => { const m = randNonZero(-5, 5), b = randInt(-9, 9), xs = [1, 2, 3, 4].map((t) => t + rnd(-2, 0)); return numeric(`Tableau de valeurs d'une fonction affine f : pour x = ${xs.map(fmt).join(' ; ')}, f(x) = ${xs.map((x) => fmt(m * x + b)).join(' ; ')}. Quel est le coefficient directeur de f ?`, m, { explanation: `Quand x augmente de 1, f(x) varie de ${fmt(m)} : c'est le coefficient directeur.` }) },
      () => retry(() => { const { a, b, n, d } = niceLine(); const x1 = rnd(-4, 0), x2 = x1 + d * rnd(1, 2); const y1 = a * x1 + b, y2 = a * x2 + b; if ([y1, y2].some((y) => Math.abs(y) > 4.5 || !Number.isInteger(y))) return null; return withMeta(fraction(`Les points A et B sont sur la droite représentant f. Calcule le coefficient directeur de f.`, n, d, { explanation: `A(${fmt(x1)} ; ${fmt(y1)}) et B(${fmt(x2)} ; ${fmt(y2)}) : a = ${F(fmt(y2 - y1), fmt(x2 - x1))} = ${q(n, d)}.` }), { figure: plotFig(lineWin, [{ f: (x) => a * x + b }], [{ name: 'A', x: x1, y: y1 }, { name: 'B', x: x2, y: y2 }]) }) }),
    )),
    // Comparaisons par monotonie
    variants(
      () => { const a = rnd(11, 39) / 10, b = Math.round((a + pick([-1, 1]) * rnd(1, 9) / 10) * 10) / 10; const A = `(−${fmt(a)})²`, B = `(−${fmt(b)})²`; const ans = a > b ? `${A} > ${B}` : `${A} < ${B}`; return choice(`Sans calculatrice, compare ${A} et ${B}.`, ans, [a > b ? `${A} < ${B}` : `${A} > ${B}`, `${A} = ${B}`], `−${fmt(a)} et −${fmt(b)} sont négatifs ; la fonction carré est décroissante sur ]−∞ ; 0], donc elle inverse l'ordre : −${fmt(Math.max(a, b))} < −${fmt(Math.min(a, b))} donne ${ans}.`) },
      () => { const a = rnd(2, 9) / 10, b = Math.round((a + pick([-0.1, 0.1, 0.05])) * 100) / 100; const A = F(1, fmt(a)), B = F(1, fmt(b)); const ans = a > b ? `${A} < ${B}` : `${A} > ${B}`; return choice(`Sans calculer, compare ${A} et ${B}.`, ans, [a > b ? `${A} > ${B}` : `${A} < ${B}`, `${A} = ${B}`], `${fmt(a)} et ${fmt(b)} sont positifs et la fonction inverse est décroissante sur ]0 ; +∞[ : elle inverse l'ordre, donc ${ans}.`) },
      () => { const a = rnd(20, 99) / 10, b = Math.round((a + pick([-1, 1]) * pick([0.01, 0.1, 0.05])) * 100) / 100; const A = `√${fmt(a)}`, B = `√${fmt(b)}`; const ans = a > b ? `${A} > ${B}` : `${A} < ${B}`; return choice(`Compare ${A} et ${B}.`, ans, [a > b ? `${A} < ${B}` : `${A} > ${B}`, `${A} = ${B}`], `La fonction racine carrée est croissante sur [0 ; +∞[ : elle conserve l'ordre, donc ${ans}.`) },
      () => { const a = rnd(11, 49) / 10, b = Math.round((a + pick([-1, 1]) * rnd(1, 5) / 10) * 10) / 10; const A = F(1, `−${fmt(a)}`), B = F(1, `−${fmt(b)}`); const ans = a > b ? `${A} > ${B}` : `${A} < ${B}`; return choice(`Compare ${A} et ${B}.`, ans, [a > b ? `${A} < ${B}` : `${A} > ${B}`, `${A} = ${B}`], `La fonction inverse est décroissante sur ]−∞ ; 0[ : −${fmt(Math.max(a, b))} < −${fmt(Math.min(a, b))} donne ${F(1, `−${fmt(Math.max(a, b))}`)} > ${F(1, `−${fmt(Math.min(a, b))}`)}, donc ${ans}.`) },
      () => retry(() => { const a = rnd(-30, 30) / 10, b = Math.round((a + pick([-1, 1]) * rnd(1, 9) / 10) * 10) / 10; if (a === 0 || b === 0) return null; const A = `${par(a)}³`, B = `${par(b)}³`; const ans = a > b ? `${A} > ${B}` : `${A} < ${B}`; return choice(`Compare ${A} et ${B}.`, ans, [a > b ? `${A} < ${B}` : `${A} > ${B}`, `${A} = ${B}`], `La fonction cube est croissante sur ℝ : elle conserve l'ordre, donc ${ans}.`) }),
    ),
    // Courbes des fonctions de référence
    variants(
      () => { const n = rnd(1, 3); return withMeta(solutionSet(`La courbe est celle de la fonction carré. Lis les antécédents de ${n * n}.`, [-n, n], { explanation: `La droite y = ${n * n} coupe la parabole en deux points, d'abscisses −${n} et ${n}.` }), { figure: plotFig({ xMin: -4, xMax: 4, yMin: -1, yMax: 10, ylabelStep: 2 }, [{ f: sq }]) }) },
      () => { const n = rnd(1, 3); return withMeta(numeric(`La courbe est celle de la fonction racine carrée. Lis l'antécédent de ${n}.`, n * n, { explanation: `Le point de la courbe d'ordonnée ${n} a pour abscisse ${n * n} (√${n * n} = ${n}).` }), { figure: plotFig({ xMin: -1, xMax: 10, yMin: -1, yMax: 4 }, [{ f: rt, a: 0 }]) }) },
      () => { const v = pick([1, 2, 4, -1, -2]); return withMeta(numeric(`La courbe est celle de la fonction inverse. Lis l'image de ${fmt(v)}.`, 1 / v, { explanation: `Le point de l'hyperbole d'abscisse ${fmt(v)} a pour ordonnée ${fmt(1 / v)} = ${F(1, fmt(v))}.` }), { figure: plotFig({ xMin: -5, xMax: 5, yMin: -4, yMax: 4, ystep: 0.5, ylabelStep: 1 }, [{ f: inv }]) }) },
      () => { const [nm, f, win] = pick<[string, (x: number) => number, { xMin: number; xMax: number; yMin: number; yMax: number; ylabelStep?: number }]>([
        ['la fonction carré', sq, { xMin: -4, xMax: 4, yMin: -2, yMax: 9, ylabelStep: 2 }], ['la fonction inverse', inv, { xMin: -4, xMax: 4, yMin: -4, yMax: 4 }],
        ['la fonction racine carrée', rt, { xMin: -1, xMax: 9, yMin: -1, yMax: 4 }], ['la fonction cube', cube, { xMin: -3, xMax: 3, yMin: -5, yMax: 5 }],
      ]); const k = pick(['f', 'g', 'h']); return withMeta(choice(`On a tracé la courbe d'une fonction ${k}. De quelle fonction de référence s'agit-il ?`, nm, ['la fonction carré', 'la fonction inverse', 'la fonction racine carrée', 'la fonction cube'], `${nm === 'la fonction carré' ? 'Une parabole symétrique par rapport à l’axe des ordonnées, de sommet O' : nm === 'la fonction inverse' ? 'Une hyperbole en deux morceaux, la fonction n’est pas définie en 0' : nm === 'la fonction racine carrée' ? 'Une demi-branche qui part de O, définie seulement pour x ≥ 0' : 'Une courbe symétrique par rapport à O, qui monte toujours'} : c'est ${nm}.`), { figure: plotFig(win, [{ f }]) }) },
    ),
  ],
  // Palier 3 : inéquations x² ≤ a, 1/x > a, √x < a ; encadrements
  [
    // Inéquations avec le carré (a carré parfait)
    variants(
      () => { const n = rnd(1, 12); return figIf(unionEx(`Résous x² ≤ ${n * n}.${n <= 3 ? ' (La parabole y = x² et la droite y = ' + n * n + ' sont tracées.)' : ''}`, [iv(-n, n, true, true)], `x² ≤ ${n * n} ⟺ −${n} ≤ x ≤ ${n} (les nombres dont le carré ne dépasse pas ${n * n}) : [−${n} ; ${n}].`, 'ex. [−2 ; 2]'), n <= 3, () => sqFig(n * n)) },
      () => { const n = rnd(1, 12); return unionEx(`Donne l'ensemble des solutions de x² < ${n * n}.`, [iv(-n, n, false, false)], `x² < ${n * n} ⟺ −${n} < x < ${n} : ]−${n} ; ${n}[.`, 'ex. ]−2 ; 2[') },
      () => { const n = rnd(1, 12); return figIf(unionEx(`Résous x² > ${n * n}.`, [R(-INF, -n), R(n, INF)], `x² > ${n * n} ⟺ x < −${n} ou x > ${n} (la parabole est au-dessus de la droite y = ${n * n} à l'extérieur de [−${n} ; ${n}]) : ]−∞ ; −${n}[ ∪ ]${n} ; +∞[.`), n <= 3, () => sqFig(n * n)) },
      () => { const n = pick([0.5, 0.3, 0.2, 1.5, 1.2, 0.7]); return unionEx(`Résous x² ≥ ${fmt(Math.round(n * n * 100) / 100)}.`, [iv(-INF, -n, false, true), iv(n, INF, true, false)], `${fmt(Math.round(n * n * 100) / 100)} = ${fmt(n)}² ; x² ≥ ${fmt(n)}² ⟺ x ≤ −${fmt(n)} ou x ≥ ${fmt(n)}.`) },
      () => { const n = rnd(1, 9), s = pick([true, false]); return s ? unionEx(`Résous x² ≤ −${n}.`, [], `Un carré est toujours positif : il ne peut pas être ≤ −${n}. Aucune solution : ∅.`, 'un intervalle, une réunion, ℝ ou ∅') : unionEx(`Résous x² > −${n}.`, ALL, `Un carré est toujours positif, donc toujours > −${n} : tout réel convient, ℝ.`, 'un intervalle, une réunion, ℝ ou ∅') },
    ),
    // Inéquations avec l'inverse
    variants(
      () => { const c = rnd(2, 9); return figIf(unionEx(`Résous ${F(1, 'x')} > ${c} (x ≠ 0).`, [iv(0, 1 / c, false, false, undefined, q(1, c))], `Il faut x > 0 (sinon ${F(1, 'x')} < 0). Sur ]0 ; +∞[, la fonction inverse est décroissante et ${c} est l'inverse de ${q(1, c)} : ${F(1, 'x')} > ${c} ⟺ x < ${q(1, c)}. Solution : ]0 ; ${q(1, c)}[.`, 'ex. ]0 ; 1/4['), c <= 4, () => invFig(c)) },
      () => { const c = rnd(2, 9); return figIf(unionEx(`Résous ${F(1, 'x')} ≤ ${c} (x ≠ 0).`, [R(-INF, 0), iv(1 / c, INF, true, false, q(1, c))], `Si x < 0, ${F(1, 'x')} < 0 ≤ ${c} : tous les négatifs conviennent. Si x > 0 : ${F(1, 'x')} ≤ ${c} ⟺ x ≥ ${q(1, c)}. Solution : ]−∞ ; 0[ ∪ [${q(1, c)} ; +∞[.`), c <= 4, () => invFig(c)) },
      () => { const c = rnd(2, 9); return unionEx(`Résous ${F(1, 'x')} < −${c} (x ≠ 0).`, [iv(-1 / c, 0, false, false, `−${q(1, c)}`)], `Il faut x < 0. Sur ]−∞ ; 0[, l'inverse est décroissante et −${c} est l'inverse de −${q(1, c)} : ${F(1, 'x')} < −${c} ⟺ x > −${q(1, c)}. Solution : ]−${q(1, c)} ; 0[.`, 'ex. ]−1/3 ; 0[') },
      () => { const c = pick([0.5, 0.25, 0.2, 0.1]); return unionEx(`Résous ${F(1, 'x')} ≥ ${fmt(c)} (x ≠ 0).`, [iv(0, 1 / c, false, true)], `Il faut x > 0 ; la fonction inverse est décroissante sur ]0 ; +∞[ et ${F(1, fmt(1 / c))} = ${fmt(c)}, donc x ≤ ${fmt(1 / c)}. Solution : ]0 ; ${fmt(1 / c)}].`, 'ex. ]0 ; 5]') },
    ),
    // Inéquations avec la racine carrée
    variants(
      () => { const c = pick([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1.5, 0.5]); const c2 = Math.round(c * c * 100) / 100; return figIf(unionEx(`Résous √x < ${fmt(c)}.`, [iv(0, c2, true, false)], `√x n'existe que pour x ≥ 0 ; la fonction racine est croissante : √x < ${fmt(c)} ⟺ 0 ≤ x < ${fmt(c2)}. Solution : [0 ; ${fmt(c2)}[.`, 'ex. [0 ; 9['), c2 <= 9, () => rtFig(c)) },
      () => { const c = pick([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1.5, 0.5]); const c2 = Math.round(c * c * 100) / 100; return figIf(unionEx(`Résous √x ≥ ${fmt(c)}.`, [iv(c2, INF, true, false)], `√x ≥ ${fmt(c)} ⟺ x ≥ ${fmt(c)}² = ${fmt(c2)} (la racine est croissante). Solution : [${fmt(c2)} ; +∞[.`, 'ex. [9 ; +∞['), c2 <= 9, () => rtFig(c)) },
      () => { const c = pick([2, 3, 4, 5, 6, 7, 8, 9, 1.2, 0.3]); const c2 = Math.round(c * c * 100) / 100; return unionEx(`Pour quels réels x a-t-on √x ≤ ${fmt(c)} ?`, [iv(0, c2, true, true)], `0 ≤ x ≤ ${fmt(c2)}, car ${fmt(c)}² = ${fmt(c2)} et √ n'est définie que pour x ≥ 0.`, 'ex. [0 ; 9]') },
      () => { const c = rnd(1, 9), s = pick([true, false]); return s ? unionEx(`Résous √x < −${c}.`, [], `Une racine carrée est toujours positive : jamais < −${c}. Solution : ∅.`, 'un intervalle, une réunion, ℝ ou ∅') : unionEx(`Résous √x > ${c * c}, puis donne l'ensemble des solutions.`, [R(c ** 4, INF)], `√x > ${c * c} ⟺ x > ${c * c}² = ${c ** 4}. Solution : ]${c ** 4} ; +∞[.`, 'ex. ]9 ; +∞[') },
    ),
    // Encadrements
    variants(
      () => { const a = rnd(1, 6), b = a + rnd(1, 5); return unionEx(`On sait que ${a} ≤ x ≤ ${b}. Encadre x² (donne l'intervalle).`, [iv(a * a, b * b, true, true)], `La fonction carré est croissante sur [0 ; +∞[ : ${a}² ≤ x² ≤ ${b}², soit x² ∈ [${a * a} ; ${b * b}].`, 'ex. [4 ; 25]') },
      () => { const a = rnd(1, 6), b = a + rnd(1, 5); return unionEx(`On sait que −${b} ≤ x ≤ −${a}. Encadre x² (donne l'intervalle).`, [iv(a * a, b * b, true, true)], `Sur ]−∞ ; 0], la fonction carré est décroissante : l'ordre s'inverse, (−${a})² ≤ x² ≤ (−${b})², soit [${a * a} ; ${b * b}].`, 'ex. [4 ; 25]') },
      () => { const a = rnd(1, 6), b = a + rnd(1, 5); return unionEx(`On sait que ${a} ≤ x ≤ ${b}. À quel intervalle appartient ${F(1, 'x')} ?`, [iv(1 / b, 1 / a, true, true, q(1, b), q(1, a))], `L'inverse est décroissante sur ]0 ; +∞[ : l'ordre s'inverse, ${F(1, b)} ≤ ${F(1, 'x')} ≤ ${F(1, a)}${a === 1 ? ' = 1' : ''}.`, 'ex. [1/5 ; 1/2]') },
      () => { const a = rnd(0, 6), b = a + rnd(1, 5); return unionEx(`On sait que ${a * a} ≤ x ≤ ${b * b}. Encadre √x (donne l'intervalle).`, [iv(a, b, true, true)], `La racine carrée est croissante : √${a * a} ≤ √x ≤ √${b * b}, soit [${a} ; ${b}].`, 'ex. [2 ; 5]') },
    ),
  ],
  // Palier 4 : encadrements délicats, positions relatives, expression d'une fonction affine, intersections
  [
    // Encadrement de x² quand x change de signe
    variants(
      () => retry(() => { const a = rnd(1, 7), b = rnd(1, 7); if (a === b) return null; const M = Math.max(a, b) ** 2; return unionEx(`On sait que −${a} ≤ x ≤ ${b}. Encadre x² le plus précisément possible.`, [iv(0, M, true, true)], `x peut valoir 0, donc x² peut valoir 0 (minimum). Le carré le plus grand est celui de la borne la plus éloignée de 0 : ${Math.max(a, b)}² = ${M}. Donc x² ∈ [0 ; ${M}].`, 'ex. [0 ; 16]') }),
      () => retry(() => { const a = rnd(1, 7), b = rnd(1, 7); if (a === b) return null; const big = Math.max(a, b), M = big * big, closedBig = b > a; return unionEx(`On sait que x ∈ ]−${a} ; ${b}]. À quel intervalle appartient x² ?`, [iv(0, M, true, closedBig)], `0 est dans l'intervalle, donc x² peut valoir 0. La plus grande valeur absolue est ${big}, ${closedBig ? 'atteinte (crochet fermé) : x² ≤ ' + M : 'non atteinte (crochet ouvert) : x² < ' + M}. Donc x² ∈ [0 ; ${M}${closedBig ? ']' : '['}.`, 'ex. [0 ; 16[') }),
      () => { const a = rnd(1, 6), b = a + rnd(1, 5); return unionEx(`On sait que −${b} ≤ x ≤ −${a}. Encadre ${F(1, 'x')}.`, [iv(-1 / a, -1 / b, true, true, `−${q(1, a)}`, `−${q(1, b)}`)], `L'inverse est décroissante sur ]−∞ ; 0[ : ${F(1, `−${a}`)} ≤ ${F(1, 'x')} ≤ ${F(1, `−${b}`)}, soit [−${q(1, a)} ; −${q(1, b)}].`, 'ex. [−1/2 ; −1/5]') },
      () => { const a = rnd(1, 4), b = a + rnd(1, 4); return unionEx(`On sait que ${a} ≤ x ≤ ${b}. Encadre −x² + ${b * b} (donne l'intervalle).`, [iv(0, b * b - a * a, true, true)], `${a * a} ≤ x² ≤ ${b * b}, donc −${b * b} ≤ −x² ≤ −${a * a} (multiplier par −1 inverse l'ordre), puis 0 ≤ −x² + ${b * b} ≤ ${b * b - a * a}.`, 'ex. [0 ; 12]') },
    ),
    // Positions relatives
    variants(
      () => withMeta(unionEx('Pour quels réels x > 0 la courbe de la fonction carré est-elle au-dessous de la droite y = x ?', [R(0, 1)], 'x² < x ⟺ x(x − 1) < 0 ; pour x > 0 il faut x < 1. Solution : ]0 ; 1[ (par exemple 0,5² = 0,25 < 0,5).', 'ex. ]0 ; 2['), { figure: plotFig({ xMin: -1, xMax: 3, yMin: -1, yMax: 4 }, [{ f: sq }, { f: (x) => x, color: BLUE }]) }),
      () => withMeta(unionEx('Pour quels réels x ≥ 0 a-t-on √x > x ?', [R(0, 1)], '√x et x sont égaux en 0 et en 1 ; entre les deux, √x > x (par exemple √0,25 = 0,5 > 0,25). Au-delà de 1, x > √x. Solution : ]0 ; 1[.', 'ex. ]0 ; 2['), { figure: plotFig({ xMin: -1, xMax: 4, yMin: -1, yMax: 3 }, [{ f: rt, a: 0 }, { f: (x) => x, color: BLUE }]) }),
      () => withMeta(unionEx(`Pour quels réels x > 0 a-t-on ${F(1, 'x')} < x ?`, [R(1, INF)], `Pour x > 0, ${F(1, 'x')} < x ⟺ 1 < x² ⟺ x > 1. Solution : ]1 ; +∞[.`, 'ex. ]1 ; +∞['), { figure: plotFig({ xMin: -1, xMax: 4, yMin: -1, yMax: 4 }, [{ f: inv, a: 0.01 }, { f: (x) => x, color: BLUE }]) }),
      () => { const a = pick([0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9]); return choice(`On pose a = ${fmt(a)}. Range a, a² et √a dans l'ordre croissant.`, 'a² < a < √a', ['a < a² < √a', '√a < a < a²', 'a < √a < a²'], `Pour 0 < a < 1 : a² < a < √a. Ici a² = ${fmt(Math.round(a * a * 100) / 100)} et √a ≈ ${fmt(Math.round(Math.sqrt(a) * 1000) / 1000)}.`) },
      () => { const a = pick([1.2, 1.5, 2, 2.5, 3, 4, 6.25]); return choice(`On pose a = ${fmt(a)}. Range a, a² et √a dans l'ordre croissant.`, '√a < a < a²', ['a² < a < √a', 'a < √a < a²', '√a < a² < a'], `Pour a > 1 : √a < a < a². Ici a² = ${fmt(Math.round(a * a * 100) / 100)} et √a ${Number.isInteger(Math.sqrt(a)) ? '=' : '≈'} ${fmt(Math.round(Math.sqrt(a) * 1000) / 1000)}.`) },
    ),
    // Expression d'une fonction affine
    variants(
      () => retry(() => { const m = randNonZero(-4, 4), p = randInt(-6, 6), x1 = randNonZero(-4, 4), x2 = randNonZero(-4, 4); if (x1 === x2) return null; return expression(`f est affine avec f(${fmt(x1)}) = ${fmt(m * x1 + p)} et f(${fmt(x2)}) = ${fmt(m * x2 + p)}. Donne f(x).`, lin(m, p), 'developed', { inputHint: 'ex. 2x − 3', explanation: `a = ${F(`${fmt(m * x2 + p)} − ${par(m * x1 + p)}`, `${fmt(x2)} − ${par(x1)}`)} = ${fmt(m)} ; puis b = f(${fmt(x1)}) − a × ${par(x1)} = ${fmt(p)}. Donc f(x) = ${lin(m, p)}.` }) }),
      () => { const m = randNonZero(-5, 5), p = randInt(-6, 6), x1 = randNonZero(-4, 4); return expression(`La droite représentant f a pour coefficient directeur ${fmt(m)} et passe par le point (${fmt(x1)} ; ${fmt(m * x1 + p)}). Donne f(x).`, lin(m, p), 'developed', { inputHint: 'ex. 2x − 3', explanation: `f(x) = ${lin(m, 0)} + b et f(${fmt(x1)}) = ${fmt(m * x1 + p)}, donc b = ${fmt(m * x1 + p)} − ${par(m)} × ${par(x1)} = ${fmt(p)}.` }) },
      () => retry(() => { const { a, b, n, d } = niceLine(); if (d !== 1) return null; return withMeta(expression('La droite représente la fonction affine f. Donne f(x).', lin(a, b), 'developed', { inputHint: 'ex. 2x − 3', explanation: `Ordonnée à l'origine ${fmt(b)} (point (0 ; ${fmt(b)})) ; quand x augmente de 1, y ${n > 0 ? 'augmente' : 'diminue'} de ${Math.abs(n)} : f(x) = ${lin(a, b)}.` }), { figure: plotFig(lineWin, [{ f: (x) => a * x + b }]) }) }),
      () => { const m = randNonZero(-5, 5), p = randInt(-6, 6), x1 = randNonZero(-4, 4), c = retry(() => { const v = randInt(-6, 6); return v !== p ? v + 100 : null }) - 100; return expression(`La droite (d) est parallèle à la droite d'équation y = ${lin(m, c)} et passe par le point (${fmt(x1)} ; ${fmt(m * x1 + p)}). Donne l'équation réduite de (d) sous la forme y = …`, lin(m, p), 'developed', { inputHint: 'ex. 2x − 3', explanation: `Deux droites parallèles ont le même coefficient directeur ${fmt(m)} ; puis ${fmt(m * x1 + p)} = ${par(m)} × ${par(x1)} + p donne p = ${fmt(p)} : y = ${lin(m, p)}.` }) },
    ),
    // Intersection de deux droites
    variants(
      () => retry(() => { const x0 = randInt(-4, 4), y0 = randInt(-4, 4), m1 = randNonZero(-3, 3), m2 = randNonZero(-3, 3); if (m1 === m2) return null; const p1 = y0 - m1 * x0, p2 = y0 - m2 * x0; return numeric(`Résous ${lin(m1, p1)} = ${lin(m2, p2)} : c'est l'abscisse du point d'intersection des deux droites.`, x0, { explanation: `${lin(m1 - m2, 0)} = ${fmt(p2 - p1)}, donc x = ${F(fmt(p2 - p1), par(m1 - m2))} = ${fmt(x0)}.` }) }),
      () => retry(() => { const x0 = randInt(-4, 4), y0 = randInt(-4, 4), m1 = randNonZero(-3, 3), m2 = randNonZero(-3, 3); if (m1 === m2) return null; const p1 = y0 - m1 * x0, p2 = y0 - m2 * x0; return pair(`Donne les coordonnées du point d'intersection des droites d'équations y = ${lin(m1, p1)} et y = ${lin(m2, p2)}.`, x0, y0, { explanation: `${lin(m1, p1)} = ${lin(m2, p2)} donne x = ${fmt(x0)}, puis y = ${fmt(y0)}.` }) }),
      () => retry(() => { const x0 = randInt(-3, 3), y0 = randInt(-3, 3), m1 = pick([1, 2, -1, -2]), m2 = pick([1, 2, -1, -2, 0.5, -0.5]); if (m1 === m2) return null; const p1 = y0 - m1 * x0, p2 = y0 - m2 * x0; if (!Number.isInteger(p2)) return null; return withMeta(pair('Lis les coordonnées du point d\'intersection des deux droites.', x0, y0, { explanation: `Les deux droites se croisent au point (${fmt(x0)} ; ${fmt(y0)}) ; on peut vérifier : ${fmt(m1)} × ${par(x0)}${p1 ? ` ${p1 < 0 ? '−' : '+'} ${fmt(Math.abs(p1))}` : ''} = ${fmt(y0)}.` }), { figure: plotFig(lineWin, [{ f: (x) => m1 * x + p1 }, { f: (x) => m2 * x + p2, color: BLUE }]) }) }),
      () => retry(() => { const x0 = randInt(-4, 4), y0 = randInt(-4, 4), m1 = randNonZero(-3, 3), m2 = randNonZero(-3, 3); if (m1 === m2) return null; const p1 = y0 - m1 * x0, p2 = y0 - m2 * x0, below = m1 - m2 > 0; return unionEx(`Résous ${lin(m1, p1)} ≤ ${lin(m2, p2)}.`, [below ? iv(-INF, x0, false, true) : iv(x0, INF, true, false)], `${lin(m1 - m2, 0)} ≤ ${fmt(p2 - p1)} ; on divise par ${fmt(m1 - m2)} ${m1 - m2 > 0 ? '(positif, le sens est conservé)' : '(négatif : on change le sens)'} : x ${below ? '≤' : '≥'} ${fmt(x0)}.`, 'ex. ]−∞ ; 2]') }),
    ),
  ],
  // Palier 5 : racines, translations, lecture parabole / droite, comparaisons de a, a², √a, 1/a
  [
    // x² ≤ a avec a non carré
    variants(
      () => retry(() => { const a = rnd(2, 50), [k, m] = rootParts(a); if (m === 1) return null; const t = rootText(a); return unionEx(`Résous x² < ${a}. (Donne les valeurs exactes.)`, [iv(-Math.sqrt(a), Math.sqrt(a), false, false, `−${t}`, t)], `x² < ${a} ⟺ −√${a} < x < √${a}${k > 1 ? `, et √${a} = ${t}` : ''}.`, 'ex. ]−√5 ; √5[') }),
      () => retry(() => { const a = rnd(2, 50), [k, m] = rootParts(a); if (m === 1) return null; const t = rootText(a); return unionEx(`Résous x² ≥ ${a}. (Valeurs exactes.)`, [iv(-INF, -Math.sqrt(a), false, true, undefined, `−${t}`), iv(Math.sqrt(a), INF, true, false, t)], `x² ≥ ${a} ⟺ x ≤ −√${a} ou x ≥ √${a}${k > 1 ? ` (√${a} = ${t})` : ''}.`) }),
      () => retry(() => { const a = rnd(2, 30), c = rnd(1, 9), [, m] = rootParts(a); if (m === 1) return null; const t = rootText(a); return unionEx(`Résous x² + ${c} ≤ ${a + c}. (Valeurs exactes.)`, [iv(-Math.sqrt(a), Math.sqrt(a), true, true, `−${t}`, t)], `x² ≤ ${a} ⟺ −${t} ≤ x ≤ ${t}.`, 'ex. [−√5 ; √5]') }),
      () => retry(() => { const a = rnd(2, 30), k = pick([2, 3]), [, m] = rootParts(a); if (m === 1) return null; const t = rootText(a); return unionEx(`Résous ${k}x² > ${k * a}. (Valeurs exactes.)`, [R(-INF, -Math.sqrt(a)), R(Math.sqrt(a), INF)].map((I, i) => (i === 0 ? { ...I, hiT: `−${t}` } : { ...I, loT: t })), `On divise par ${k} > 0 : x² > ${a} ⟺ x < −${t} ou x > ${t}.`) }),
    ),
    // Translations : (x − a)² ≤ r², √(x − a) ≤ r…
    variants(
      () => { const a = randNonZero(-6, 6), r = rnd(1, 6); return unionEx(`Résous (${lin(1, -a)})² ≤ ${r * r}.`, [iv(a - r, a + r, true, true)], `On pose X = ${lin(1, -a)} : X² ≤ ${r * r} ⟺ −${r} ≤ X ≤ ${r} ⟺ ${fmt(a - r)} ≤ x ≤ ${fmt(a + r)}.`, 'ex. [−1 ; 5]') },
      () => { const a = randNonZero(-6, 6), r = rnd(1, 6); return unionEx(`Résous (${lin(1, -a)})² > ${r * r}.`, [R(-INF, a - r), R(a + r, INF)], `${lin(1, -a)} < −${r} ou ${lin(1, -a)} > ${r}, soit x < ${fmt(a - r)} ou x > ${fmt(a + r)}.`) },
      () => { const a = randNonZero(-6, 6), r = rnd(1, 5); return unionEx(`Résous √{${lin(1, -a)}} ≤ ${r}.`, [iv(a, a + r * r, true, true)], `Il faut ${lin(1, -a)} ≥ 0, soit x ≥ ${fmt(a)} ; puis ${lin(1, -a)} ≤ ${r * r}, soit x ≤ ${fmt(a + r * r)}. Solution : [${fmt(a)} ; ${fmt(a + r * r)}].`, 'ex. [2 ; 11]') },
      () => { const a = randNonZero(-6, 6), c = rnd(2, 6); return unionEx(`Résous ${F(1, lin(1, -a))} > ${c} (x ≠ ${fmt(a)}).`, [iv(a, a + 1 / c, false, false, undefined, q(a * c + 1, c))], `On pose X = ${lin(1, -a)} : ${F(1, 'X')} > ${c} ⟺ 0 < X < ${q(1, c)}, soit ${fmt(a)} < x < ${q(a * c + 1, c)}.`, 'ex. ]2 ; 7/3[') },
    ),
    // Parabole et droite tracées
    variants(
      () => { const r1 = randInt(-3, 0), r2 = r1 + rnd(2, 4), m = r1 + r2, p = -r1 * r2; return withMeta(unionEx(`On a tracé la parabole y = x² et la droite y = ${lin(m, p)}. Résous graphiquement x² ≤ ${lin(m, p)}.`, [iv(r1, r2, true, true)], `La parabole est au-dessous (ou sur) la droite entre les points d'intersection, d'abscisses ${fmt(r1)} et ${fmt(r2)} : [${fmt(r1)} ; ${fmt(r2)}].`, 'ex. [−1 ; 3]'), { figure: parFig(r1, r2) }) },
      () => { const r1 = randInt(-3, 0), r2 = r1 + rnd(2, 4), m = r1 + r2, p = -r1 * r2; return withMeta(unionEx(`On a tracé la parabole y = x² et la droite y = ${lin(m, p)}. Résous graphiquement x² > ${lin(m, p)}.`, [R(-INF, r1), R(r2, INF)], `La parabole est strictement au-dessus de la droite à gauche de x = ${fmt(r1)} et à droite de x = ${fmt(r2)}.`), { figure: parFig(r1, r2) }) },
      () => { const r1 = randInt(-3, 0), r2 = r1 + rnd(2, 4), m = r1 + r2, p = -r1 * r2; return withMeta(solutionSet(`Résous graphiquement l'équation x² = ${lin(m, p)}.`, [r1, r2], { explanation: `On lit les abscisses des points d'intersection de la parabole et de la droite : ${fmt(r1)} et ${fmt(r2)}. Vérification : ${par(r1)}² = ${r1 * r1} = ${fmt(m * r1 + p)}.` }), { figure: parFig(r1, r2) }) },
      () => { const r1 = randInt(-3, 0), r2 = r1 + rnd(2, 4), m = r1 + r2, p = -r1 * r2; return withMeta(unionEx(`Les courbes de f(x) = x² et g(x) = ${lin(m, p)} sont tracées. Pour quels x la droite est-elle au-dessus de la parabole ?`, [R(r1, r2)], `g(x) > f(x) entre les deux points d'intersection, strictement : ]${fmt(r1)} ; ${fmt(r2)}[.`, 'ex. ]−1 ; 3['), { figure: parFig(r1, r2) }) },
    ),
    // a, a², √a, 1/a
    variants(
      () => { const a = pick([0.25, 0.36, 0.49, 0.64, 0.81, 0.5, 0.2]); return choice(`On pose a = ${fmt(a)}. Lequel de ces nombres est le plus grand : a, a², √a ou ${F(1, 'a')} ?`, F(1, 'a'), ['a', 'a²', '√a'], `Pour 0 < a < 1 : a² < a < √a < 1 < ${F(1, 'a')}. Ici ${F(1, 'a')} = ${fmt(Math.round(1e4 / a) / 1e4)}.`) },
      () => { const a = pick([1.44, 2.25, 4, 6.25, 9, 1.21]); return choice(`On pose a = ${fmt(a)}. Lequel de ces nombres est le plus petit : a, a², √a ou ${F(1, 'a')} ?`, F(1, 'a'), ['a', 'a²', '√a'], `Pour a > 1 : ${F(1, 'a')} < 1 < √a < a < a². Ici ${F(1, 'a')} ≈ ${fmt(Math.round(1e3 / a) / 1e3)}.`) },
      () => { const a = pick([0.25, 0.36, 0.49, 0.64, 0.81, 0.04]); return choice(`On pose a = ${fmt(a)}. Range a, a², √a et ${F(1, 'a')} dans l'ordre croissant.`, `a² < a < √a < ${F(1, 'a')}`, [`${F(1, 'a')} < √a < a < a²`, `a < a² < √a < ${F(1, 'a')}`, `√a < a² < a < ${F(1, 'a')}`], `a² = ${fmt(Math.round(a * a * 1e4) / 1e4)}, √a = ${fmt(Math.sqrt(a))}, ${F(1, 'a')} = ${fmt(Math.round(1e4 / a) / 1e4)} : a² < a < √a < ${F(1, 'a')}.`) },
      () => { const a = pick([1.44, 2.25, 4, 6.25, 9, 1.21]); return choice(`On pose a = ${fmt(a)}. Range a, a², √a et ${F(1, 'a')} dans l'ordre croissant.`, `${F(1, 'a')} < √a < a < a²`, [`a² < a < √a < ${F(1, 'a')}`, `√a < ${F(1, 'a')} < a < a²`, `${F(1, 'a')} < a < √a < a²`], `√a = ${fmt(Math.sqrt(a))}, a² = ${fmt(Math.round(a * a * 1e4) / 1e4)}, ${F(1, 'a')} < 1 : ${F(1, 'a')} < √a < a < a².`) },
      () => { const a = -pick([0.5, 2, 3, 0.2]); return choice(`On pose a = ${fmt(a)}. Lequel de ces nombres est le plus grand : a, a² ou ${F(1, 'a')} ?`, 'a²', ['a', F(1, 'a')], `a est négatif, ${F(1, 'a')} aussi ; seul a² = ${fmt(a * a)} est positif : c'est le plus grand.`) },
    ),
  ],
]

/** Parabole y = x² et droite passant par ses points d'abscisses r1 et r2. */
function parFig(r1: number, r2: number): Figure {
  const m = r1 + r2, p = -r1 * r2
  const yMax = Math.max(r1 * r1, r2 * r2) + 1
  return plotFig({ xMin: Math.min(-2, r1 - 1), xMax: Math.max(2, r2 + 1), yMin: -1, yMax, ylabelStep: yMax > 10 ? 2 : 1 }, [{ f: sq }, { f: (x) => m * x + p, color: BLUE }])
}

// ── Problèmes d'amélioration ────────────────────────────────────────────
const upgrades: Ladder = [
  [
    // Zéro d'une fonction affine
    () => retry(() => {
      const x1 = rnd(-5, 3), x2 = x1 + rnd(1, 4), y1 = randNonZero(-9, 9), y2 = randNonZero(-9, 9)
      if (y1 === y2 || x1 * x2 === 0) return null
      // zéro : x = x1 − y1 (x2 − x1)/(y2 − y1)
      const num = x1 * (y2 - y1) - y1 * (x2 - x1), den = y2 - y1
      return T('Le passage à zéro', fraction(`f est affine, f(${fmt(x1)}) = ${fmt(y1)} et f(${fmt(x2)}) = ${fmt(y2)}. Pour quelle valeur de x a-t-on f(x) = 0 ?`, num, den, {
        explanation: `a = ${F(`${fmt(y2)} − ${par(y1)}`, `${fmt(x2)} − ${par(x1)}`)} = ${q(y2 - y1, x2 - x1)}. En partant du point (${fmt(x1)} ; ${fmt(y1)}), il faut faire varier f(x) de ${fmt(-y1)} pour atteindre 0, donc faire varier x de ${F(fmt(-y1), 'a')} = ${q(-y1 * (x2 - x1), y2 - y1)} : x = ${fmt(x1)} + ${par(-y1 * (x2 - x1) / (y2 - y1)) === fmt(-y1 * (x2 - x1) / (y2 - y1)) ? q(-y1 * (x2 - x1), y2 - y1) : `(${q(-y1 * (x2 - x1), y2 - y1)})`} = ${q(num, den)}.`,
      }))
    }),
    // Solutions oubliées
    () => pick([
      () => { const k = randNonZero(-9, 9); return T('Les solutions oubliées', solutionSet(`Résous x² = ${k === 1 ? '' : k === -1 ? '−' : fmt(k)}x. Attention : on ne divise pas par x sans précaution !`, [0, k], { explanation: `${poly([1, 'x²'], [-k, 'x'])} = 0 ⟺ x(${lin(1, -k)}) = 0 ⟺ x = 0 ou x = ${fmt(k)}.` })) },
      () => { const k = rnd(2, 6); return T('Les solutions oubliées', solutionSet(`Résous x³ = ${k * k}x.`, [-k, 0, k], { explanation: `x³ − ${k * k}x = x(x² − ${k * k}) = x(x − ${k})(x + ${k}) = 0 : x = 0, x = ${k} ou x = −${k}.` })) },
      () => { const k = rnd(2, 6); return T('Les solutions oubliées', solutionSet(`Résous √x = ${F('x', k)}.`, [0, k * k], { explanation: `Pour x ≥ 0 : en élevant au carré, x = ${F('x²', k * k)}, donc x(x − ${k * k}) = 0 : x = 0 ou x = ${k * k} (les deux conviennent).` })) },
    ])(),
    // Prévoir
    () => {
      const m = rnd(2, 15), p = rnd(10, 80), x1 = rnd(2, 4), x2 = x1 + rnd(2, 5), x3 = x2 + rnd(3, 10)
      const item = pick(['tonneaux', 'sacs de blé', 'boucliers', 'lanternes'])
      return T('Prévoir la suite', numeric(`Le prix (en écus) d'une commande de x ${item} est une fonction affine de x : ${x1} ${item} coûtent ${m * x1 + p} écus et ${x2} ${item} coûtent ${m * x2 + p} écus. Combien coûtent ${x3} ${item} ?`, m * x3 + p, {
        explanation: `Chaque unité de plus coûte ${F(m * (x2 - x1), x2 - x1)} = ${m} écus (coefficient directeur). Donc ${x3} ${item} coûtent ${m * x2 + p} + ${x3 - x2} × ${m} = ${m * x3 + p} écus.`,
      }))
    },
  ],
  [
    // 1/x ≤ x/k²
    () => {
      const k = rnd(1, 5), strict = pick([true, false])
      const rhs = k === 1 ? 'x' : F('x', k * k)
      const L = strict ? [R(-k, 0), R(k, INF)] : [iv(-k, 0, true, false), iv(k, INF, true, false)]
      return T('L’inverse sous la droite', unionEx(`Résous ${F(1, 'x')} ${strict ? '<' : '≤'} ${rhs} (x ≠ 0).`, L, `Si x > 0 : on multiplie par ${k === 1 ? 'x' : `${k * k}x`} > 0 : ${k * k} ${strict ? '<' : '≤'} x², soit x ${strict ? '>' : '≥'} ${k}. Si x < 0 : on multiplie par ${k === 1 ? 'x' : `${k * k}x`} < 0, le sens change : ${k * k} ${strict ? '>' : '≥'} x², soit ${strict ? '−' + k + ' < x' : '−' + k + ' ≤ x'} < 0. Solution : ${L.map(ivText).join(' ∪ ')}.`))
    },
    // Encadrer 1/x²
    () => {
      const a = rnd(2, 5), b = a + rnd(1, 4)
      return T('Double inversion', unionEx(`On sait que ${a} ≤ x ≤ ${b}. Encadre ${F(1, 'x²')} (donne l'intervalle).`, [iv(1 / (b * b), 1 / (a * a), true, true, q(1, b * b), q(1, a * a))], `D'abord ${a * a} ≤ x² ≤ ${b * b} (carré croissant sur [0 ; +∞[), puis l'inverse, décroissante sur ]0 ; +∞[, renverse l'ordre : ${F(1, b * b)} ≤ ${F(1, 'x²')} ≤ ${F(1, a * a)}.`, 'ex. [1/25 ; 1/4]'))
    },
    // Inéquation du second degré par le graphique
    () => {
      const r1 = randInt(-3, 0), r2 = r1 + rnd(2, 4), m = r1 + r2, p = -r1 * r2, lt = pick([true, false])
      const L = lt ? [iv(r1, r2, false, false)] : [iv(-INF, r1, false, true), iv(r2, INF, true, false)]
      return T('Le graphique à la rescousse', withMeta(unionEx(`Résous ${poly([1, 'x²'], [-m, 'x'], [-p, ''])} ${lt ? '<' : '≥'} 0 à l'aide de la parabole y = x² et de la droite y = ${lin(m, p)} tracées ci-dessous.`, L, `${poly([1, 'x²'], [-m, 'x'], [-p, ''])} ${lt ? '<' : '≥'} 0 ⟺ x² ${lt ? '<' : '≥'} ${lin(m, p)} : la parabole est ${lt ? 'strictement sous' : 'au-dessus ou sur'} la droite ${lt ? `entre ${fmt(r1)} et ${fmt(r2)}` : `à l’extérieur de [${fmt(r1)} ; ${fmt(r2)}]`}. Solution : ${L.map(ivText).join(' ∪ ')}.`), { figure: parFig(r1, r2) }))
    },
  ],
  [
    // (x − a)² < (x − b)²
    () => {
      const a = randInt(-8, 8), b = a + randNonZero(-8, 8), m = (a + b) / 2
      const I = a < b ? iv(-INF, m, false, false, undefined, q(a + b, 2)) : iv(m, INF, false, false, q(a + b, 2))
      const sq2 = (c: number) => (c === 0 ? 'x²' : `(${lin(1, -c)})²`)
      return T('Le plus proche', unionEx(`Résous ${sq2(a)} < ${sq2(b)}.`, [I], `En développant : ${poly([-2 * a, 'x'], [a * a, ''])} < ${poly([-2 * b, 'x'], [b * b, ''])}, soit ${lin(2 * (b - a), 0)} < ${fmt(b * b - a * a)}. Autre lecture : x est plus proche de ${fmt(a)} que de ${fmt(b)}, donc du côté de ${fmt(a)} par rapport au milieu ${q(a + b, 2)}. Solution : ${ivText(I)}.`, 'ex. ]−∞ ; 3/2['))
    },
    // 1/(x − a) < −c
    () => {
      const a = randNonZero(-6, 6), c = rnd(2, 6)
      const I = iv(a - 1 / c, a, false, false, q(a * c - 1, c))
      return T('L’inverse décalé', unionEx(`Résous ${F(1, lin(1, -a))} < −${c} (x ≠ ${fmt(a)}).`, [I], `Avec X = ${lin(1, -a)} : ${F(1, 'X')} < −${c} ⟺ −${q(1, c)} < X < 0 (X négatif, inverse décroissante). Donc ${q(a * c - 1, c)} < x < ${fmt(a)}.`, 'ex. ]5/3 ; 2['))
    },
    // Deux solutions dans un intervalle
    () => {
      const a = rnd(2, 6), b = a + rnd(1, 5), neg = pick([true, false])
      const lo = neg ? a : b, hi = neg ? b : a
      // intervalle [−lo ; hi] ; deux solutions ±√k ⟺ 0 < √k ≤ min(lo, hi)
      const mn = Math.min(lo, hi)
      return T('Deux solutions exactement', unionEx(`Pour quelles valeurs du réel k l'équation x² = k admet-elle exactement deux solutions dans l'intervalle [−${lo} ; ${hi}] ?`, [iv(0, mn * mn, false, true)], `Pour k > 0, les solutions sont −√k et √k ; il faut −√k ≥ −${lo} et √k ≤ ${hi}, soit √k ≤ ${mn}, donc 0 < k ≤ ${mn * mn}. (Pour k = 0, une seule solution.)`, 'ex. ]0 ; 9]'))
    },
  ],
]

// ── Problèmes de l'hôtel de ville ───────────────────────────────────────
const age: Ladder = [
  [
    // Le droit de passage
    () => {
      const fixe = rnd(1, 4), prix = pick([0.5, 1, 1.5, 2]), askFixe = pick([true, false])
      const n = 8, yMax = Math.ceil(fixe + prix * n) + 1
      const fig = plotFig({ xMin: -1, xMax: n + 1, yMin: -1, yMax, ylabelStep: yMax > 12 ? 2 : 1 }, [{ f: (x) => fixe + prix * x, a: 0, b: n }])
      if (fig.axes) fig.axes.names = ['charrettes', 'écus']
      return T('Le droit de passage', numeric(`Pour franchir ${pick(['le pont', 'la porte de la ville', 'le gué', 'le col'])}, ${pick(['un marchand', 'une marchande', 'un colporteur', 'une caravane'])} paie un droit fixe, plus une somme par charrette. La droite donne le prix total (en écus) selon le nombre de charrettes. ${askFixe ? 'Quel est le droit fixe (en écus) ?' : 'Combien coûte chaque charrette supplémentaire (en écus) ?'}`, askFixe ? fixe : prix, {
        explanation: `La fonction est affine : p(x) = ${lin(prix, fixe)}. L'ordonnée à l'origine ${fixe} est le droit fixe ; le coefficient directeur ${fmt(prix)} est le prix par charrette (on monte de ${fmt(prix)} quand on avance de 1).`,
      }), fig)
    },
    // Le jardin carré
    () => {
      const a = rnd(2, 8), b = a + rnd(1, 6), who = pick(['La reine', 'Le seigneur', 'L’abbesse', 'Le jardinier'])
      const fig: Figure = {
        w: 320, h: 180, caption: 'La figure n’est pas à l’échelle.',
        points: { A: { x: 100, y: 150, label: '' }, B: { x: 220, y: 150, label: '' }, C: { x: 220, y: 30, label: '' }, D: { x: 100, y: 30, label: '' } },
        segments: [{ a: 'A', b: 'B', label: 'x' }, { a: 'B', b: 'C' }, { a: 'C', b: 'D' }, { a: 'D', b: 'A' }],
        polygons: [{ pts: ['A', 'B', 'C', 'D'], fill: GREEN }],
      }
      return T('Le jardin carré', unionEx(`${who} veut un jardin carré de côté x mètres dont l'aire soit comprise entre ${a * a} m² et ${b * b} m² (bornes comprises). À quel intervalle doit appartenir x ?`, [iv(a, b, true, true)], `${a * a} ≤ x² ≤ ${b * b} avec x > 0 ; la racine carrée est croissante, donc ${a} ≤ x ≤ ${b} : x ∈ [${a} ; ${b}].`, 'ex. [3 ; 7]'), fig)
    },
    // Le partage du butin
    () => fresh(() => {
      const k = rnd(15, 60), B = k * rnd(8, 30) + rnd(0, k - 1)
      return T('Le partage du butin', numeric(`Un butin de ${B} écus est partagé équitablement entre n pirates : chacun reçoit f(n) = ${F(B, 'n')} écus. Chaque pirate veut au moins ${k} écus. Combien de pirates peuvent participer au maximum ?`, Math.floor(B / k), {
        explanation: `f est décroissante : plus il y a de pirates, moins chacun reçoit. ${F(B, 'n')} ≥ ${k} ⟺ n ≤ ${F(B, k)} ≈ ${fmt(Math.round((B / k) * 100) / 100)}, donc au plus ${Math.floor(B / k)} pirates.`,
      }))
    })(),
  ],
  [
    // Deux forfaits
    () => retry(() => {
      const fa = pick([0, 2, 3, 4, 5, 6]), pa = rnd(3, 6), fb = fa + rnd(4, 15), pb = rnd(1, pa - 1)
      const x0 = (fb - fa) / (pa - pb)
      if (Number.isInteger(x0)) return null
      const n = Math.floor(x0) + 1, xm = Math.max(10, Math.ceil(x0) + 3)
      const yM = Math.max(fa + pa * xm, fb + pb * xm)
      const step = yM > 60 ? 10 : yM > 30 ? 5 : 2
      const fig = plotFig({ xMin: -1, xMax: xm, yMin: -step, yMax: yM + step, labelStep: 2, ystep: step, ylabelStep: step * 2 }, [{ f: (x) => fa + pa * x, a: 0 }, { f: (x) => fb + pb * x, a: 0, color: BLUE }], [], [])
      return T('Deux forfaits', numeric(`Le passeur propose deux tarifs : A, ${fa ? `${fa} écus d'inscription puis ` : ''}${pa} écus par traversée (en rouge) ; B, ${fb} écus d'inscription puis ${pb} écu${pb > 1 ? 's' : ''} par traversée (en bleu). À partir de combien de traversées le tarif B est-il strictement moins cher ?`, n, {
        explanation: `B < A ⟺ ${fb} + ${lin(pb, 0)} < ${fa ? `${fa} + ` : ''}${pa}x ⟺ ${fb - fa} < ${lin(pa - pb, 0)} ⟺ x > ${q(fb - fa, pa - pb)} ≈ ${fmt(Math.round(x0 * 100) / 100)}. Le nombre de traversées est entier : à partir de ${n}.`,
      }), fig)
    }),
    // La pierre dans le puits
    () => {
      const t = pick([2, 3, 4, 5]), d = 5 * t * t, askT = pick([true, false])
      const fig = plotFig({ xMin: -1, xMax: 6, yMin: -10, yMax: 130, ystep: 10, ylabelStep: 20 }, [{ f: (x) => 5 * x * x, a: 0, b: 5.2 }])
      if (fig.axes) fig.axes.names = ['t', 'd']
      return T('La pierre dans le puits', numeric(askT ? `${prenom()} lâche une pierre dans un puits de ${d} m. Elle a parcouru d(t) = 5t² mètres au bout de t secondes. Au bout de combien de secondes touche-t-elle le fond ?` : `${prenom()} lâche une pierre dans un puits ; elle touche le fond au bout de ${t} s. Elle a parcouru d(t) = 5t² mètres au bout de t secondes. Quelle est la profondeur du puits (en m) ?`, askT ? t : d, {
        explanation: askT ? `5t² = ${d} ⟺ t² = ${d / 5} ⟺ t = √${d / 5} = ${t} s (t > 0).` : `d(${t}) = 5 × ${t}² = ${d} m.`,
      }), fig)
    },
    // Le temps de trajet
    () => {
      const d = pick([60, 120, 180, 240, 360]), a = pick([4, 5, 6, 10, 12]), b = a + pick([2, 3, 5, 6, 8])
      return T('Le temps de trajet', unionEx(`Un messager doit parcourir ${d} km. Sa vitesse moyenne v (en km/h) est comprise entre ${a} et ${b}. Le temps de trajet est t = ${F(d, 'v')} heures. Dans quel intervalle se trouve t ?`, [iv(d / b, d / a, true, true, q(d, b), q(d, a))], `La fonction v ↦ ${F(d, 'v')} est décroissante sur ]0 ; +∞[ : ${a} ≤ v ≤ ${b} donne ${F(d, b)} ≤ t ≤ ${F(d, a)}, soit [${q(d, b)} ; ${q(d, a)}].`, 'ex. [12 ; 30]'))
    },
  ],
  [
    // L'arche du pont
    () => {
      const c = rnd(2, 5), H = pick([4, 9, 16]) + c, w = 2 * Math.sqrt(H - c)
      const s = Math.ceil(Math.sqrt(H)) + 1
      const fig = plotFig({ xMin: -s, xMax: s, yMin: -1, yMax: H + 2, ylabelStep: H > 12 ? 4 : 2 }, [{ f: (x) => H - x * x, a: -Math.sqrt(H), b: Math.sqrt(H) }, { f: () => c, color: BLUE, dashed: true, a: -w / 2, b: w / 2 }])
      return T('L’arche du pont', numeric(`Sous un pont, l'arche a la forme de la parabole y = ${H} − x² (en mètres, le sol est l'axe des abscisses). Un chariot de ${c} m de haut, à toit plat, doit passer dessous. Quelle largeur maximale (en m) peut avoir son toit ?`, w, {
        explanation: `Le toit, à ${c} m de haut, doit rester sous l'arche : ${H} − x² ≥ ${c} ⟺ x² ≤ ${H - c} ⟺ −${Math.sqrt(H - c)} ≤ x ≤ ${Math.sqrt(H - c)}. Largeur maximale : 2 × ${Math.sqrt(H - c)} = ${w} m.`,
      }), fig)
    },
    // Le carré et le rectangle
    () => {
      const r = rnd(2, 6), p = r * (r - 1), it = pick([{ pl: 'tapisseries', f: true }, { pl: 'bannières', f: true }, { pl: 'tapis', f: false }, { pl: 'vitraux', f: false }])
      const fig = plotFig({ xMin: -1, xMax: r + 2, yMin: -2, yMax: r * r + 6, ystep: r > 4 ? 5 : 2, ylabelStep: r > 4 ? 10 : 4 }, [{ f: sq, a: 0 }, { f: (x) => x + p, a: 0, color: BLUE }])
      return T('Le carré et le rectangle', numeric(`${cap(prenom())} compare deux ${it.pl} : ${it.f ? 'l’une carrée' : 'l’un carré'} de côté x m (aire x², en rouge), l'autre rectangulaire de 1 m sur (x + ${p}) m (aire x + ${p}, en bleu). Quelle est la plus grande valeur de x pour laquelle l'aire du carré ne dépasse pas celle du rectangle ?`, r, {
        explanation: `On veut x² ≤ x + ${p}. Les courbes se coupent pour x = ${r} (${r}² = ${r * r} = ${r} + ${p}) ; pour x > 0, la parabole est sous la droite jusqu'à x = ${r} : la plus grande valeur est ${r} m.`,
      }), fig)
    },
    // La tour de guet
    () => {
      const h = pick([9, 16, 25, 36, 49]), k = pick([3, 4]), askH = pick([true, false])
      const d = k * Math.sqrt(h)
      return T('La tour de guet', numeric(askH ? `Depuis une tour de hauteur h (en m), un guetteur voit jusqu'à environ d = ${k}√h kilomètres. On veut voir les navires à ${d} km. Quelle hauteur minimale (en m) doit avoir la tour ?` : `Depuis une tour de hauteur h (en m), un guetteur voit jusqu'à environ d = ${k}√h kilomètres. On remplace une tour de ${h} m par une tour quatre fois plus haute. De combien de kilomètres la vue gagne-t-elle ?`, askH ? h : d, {
        explanation: askH ? `${k}√h ≥ ${d} ⟺ √h ≥ ${d / k} ⟺ h ≥ ${h} (racine croissante) : il faut au moins ${h} m.` : `Avant : ${k}√${h} = ${d} km. Après : ${k}√${4 * h} = ${k} × ${2 * Math.sqrt(h)} = ${2 * d} km. Gain : ${d} km (multiplier h par 4 multiplie d par 2).`,
      }))
    },
  ],
]

export const CONTENT: SubjectContent | null = { tiers, upgrades, age }
