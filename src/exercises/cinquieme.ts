import {
  F, choice, expression, fmt, fraction, gcd, numeric, par, pick, poly, randInt, randNonZero, signed,
  type Tiers,
} from './utils'

// Chaque chapitre : 5 paliers de difficulté (palier n ↔ cran n − 1 de la jauge).

const prio: Tiers = [
  [
    () => {
      const a = randInt(5, 30), b = randInt(2, 9), c = randInt(2, 9)
      return numeric(`Calcule : ${a} + ${b} × ${c}`, a + b * c, {
        explanation: `La multiplication est prioritaire : ${b} × ${c} = ${b * c}, puis ${a} + ${b * c} = ${a + b * c}.`,
      })
    },
    () => {
      const a = randInt(3, 12), b = randInt(2, 9), c = randInt(1, a * b - 1)
      return numeric(`Calcule : ${a} × ${b} − ${c}`, a * b - c, {
        explanation: `D'abord ${a} × ${b} = ${a * b}, puis ${a * b} − ${c} = ${a * b - c}.`,
      })
    },
  ],
  [
    () => {
      const a = randInt(2, 12), b = randInt(2, 12), c = randInt(2, 6), e = randInt(1, 15)
      return numeric(`Calcule : (${a} + ${b}) × ${c} − ${e}`, (a + b) * c - e, {
        explanation: `Parenthèses : ${a + b} ; puis × ${c} = ${(a + b) * c} ; enfin − ${e}.`,
      })
    },
    () => {
      const b = randInt(2, 9), c = randInt(2, 9), a = b * c + randInt(1, 20), d = randInt(2, 15)
      return numeric(`Calcule : ${a} − ${b} × ${c} + ${d}`, a - b * c + d, {
        explanation: `${b} × ${c} = ${b * c}, puis de gauche à droite : ${a} − ${b * c} + ${d} = ${a - b * c + d}.`,
      })
    },
  ],
  [
    () => {
      const e = randInt(2, 6), k = randInt(2, 9), a = randInt(8, 20), b = randInt(1, a - 2), c = randInt(2, 5)
      return numeric(`Calcule : (${a} − ${b}) × ${c} + ${e * k} ÷ ${e}`, (a - b) * c + k, {
        explanation: `(${a} − ${b}) × ${c} = ${(a - b) * c} et ${e * k} ÷ ${e} = ${k}, total ${(a - b) * c + k}.`,
      })
    },
    () => {
      const a = randInt(2, 9), b = randInt(2, 9), c = randInt(2, 9), d = randInt(2, 5), e = randInt(1, Math.min(9, Math.floor((a * (b + c)) / d)))
      return numeric(`Calcule : ${a} × (${b} + ${c}) − ${d} × ${e}`, a * (b + c) - d * e, {
        explanation: `${a} × ${b + c} = ${a * (b + c)} et ${d} × ${e} = ${d * e}.`,
      })
    },
  ],
  [
    () => {
      const d = randInt(1, 6), e = randInt(d + 1, d + 5), c = randInt(2, 6), b = randInt(1, 9), a = randInt(2, 6)
      const v = a * (b + c * (e - d))
      return numeric(`Calcule : ${a} × [${b} + ${c} × (${e} − ${d})]`, v, {
        explanation: `On part des parenthèses les plus intérieures : ${e} − ${d} = ${e - d}, puis ${b} + ${c} × ${e - d} = ${b + c * (e - d)}, enfin × ${a}.`,
      })
    },
    () => {
      const den = randInt(2, 9), q = randInt(2, 9), b = randInt(1, den * q - 1), a = den * q - b, d = randInt(1, 9)
      return numeric(`Calcule : {${a} + ${b}/${den + d} − ${d}}`, q, {
        explanation: `Le trait de fraction joue le rôle de parenthèses : ${a + b} ÷ ${den} = ${q}.`,
      })
    },
  ],
  [
    () => {
      const ne = randInt(2, 6), pe = randInt(15, 40), nb = randInt(2, 6), pb = randInt(8, 25), r = randInt(5, 30)
      return numeric(`Le forgeron vend ${ne} épées à ${pe} écus pièce et ${nb} boucliers à ${pb} écus pièce. Il rend ${r} écus à un client mécontent. Combien d'écus a-t-il gagnés ?`, ne * pe + nb * pb - r, {
        explanation: `${ne} × ${pe} + ${nb} × ${pb} − ${r} = ${ne * pe} + ${nb * pb} − ${r} = ${ne * pe + nb * pb - r}.`,
      })
    },
    () => {
      const a = randInt(10, 40), b = randInt(3, 9), c = randInt(3, 9)
      return numeric(`Calcule la somme de ${a} et du produit de ${b} par ${c}, puis multiplie le résultat par 2.`, (a + b * c) * 2, {
        explanation: `(${a} + ${b} × ${c}) × 2 = ${a + b * c} × 2 = ${(a + b * c) * 2}.`,
      })
    },
    () => {
      const rows = randInt(4, 9), cols = randInt(5, 12), gone = randInt(3, 12), groups = pick([2, 3, 4, 5])
      const total = rows * cols - gone
      const fix = total % groups
      const g2 = gone + fix
      return numeric(`Une armée de ${rows} rangs de ${cols} soldats perd ${g2} soldats, puis se répartit en ${groups} groupes égaux. Combien de soldats par groupe ?`, (rows * cols - g2) / groups, {
        explanation: `(${rows} × ${cols} − ${g2}) ÷ ${groups} = ${rows * cols - g2} ÷ ${groups} = ${(rows * cols - g2) / groups}.`,
      })
    },
  ],
]

const rel: Tiers = [
  [
    () => {
      const a = randNonZero(-15, 15), b = randNonZero(-15, 15)
      return numeric(`Calcule : ${signed(a)} + ${signed(b)}`, a + b, {
        explanation: a * b < 0 ? 'Signes contraires : on soustrait les distances à zéro et on garde le signe de la plus grande.' : 'Même signe : on additionne les distances à zéro et on garde le signe.',
      })
    },
  ],
  [
    () => {
      const a = randNonZero(-15, 15), b = randNonZero(-15, 15)
      return numeric(`Calcule : ${signed(a)} − ${signed(b)}`, a - b, {
        explanation: `Soustraire ${signed(b)}, c'est ajouter son opposé ${signed(-b)}.`,
      })
    },
    () => {
      const a = randNonZero(-20, 20), b = randNonZero(-20, 20)
      return numeric(`Quel nombre faut-il ajouter à ${fmt(a)} pour obtenir ${fmt(b)} ?`, b - a, {
        explanation: `On calcule ${fmt(b)} − ${par(a)} = ${fmt(b - a)}.`,
      })
    },
  ],
  [
    () => {
      const a = randNonZero(-12, 12), b = randNonZero(-12, 12), c = randNonZero(-12, 12), e = randNonZero(-12, 12)
      return numeric(`Calcule : ${fmt(a)} + ${par(b)} − ${par(c)} + ${par(e)}`, a + b - c + e, {
        explanation: `On remplace chaque soustraction par l'addition de l'opposé, puis on regroupe positifs et négatifs.`,
      })
    },
    () => {
      const a = randNonZero(-15, 0), b = randNonZero(1, 15)
      return numeric(`Sur une droite graduée, A a pour abscisse ${fmt(a)} et B a pour abscisse ${fmt(b)}. Quelle est la distance AB ?`, b - a, {
        explanation: `AB = ${fmt(b)} − ${par(a)} = ${b - a}.`,
      })
    },
  ],
  [
    () => {
      const a = randNonZero(-12, 12), b = randNonZero(-12, 12), c = randNonZero(-12, 12)
      return numeric(`Calcule : ${fmt(a)} − (${fmt(b)} + ${par(c)})`, a - (b + c), {
        explanation: `Parenthèse d'abord : ${fmt(b)} + ${par(c)} = ${fmt(b + c)}, puis ${fmt(a)} − ${par(b + c)} = ${fmt(a - b - c)}.`,
      })
    },
    () => {
      const a = 2 * randInt(-9, 9), b = a + 2 * randInt(1, 9)
      return numeric(`A a pour abscisse ${fmt(a)} et B a pour abscisse ${fmt(b)}. Quelle est l'abscisse du milieu de [AB] ?`, (a + b) / 2, {
        explanation: `(${fmt(a)} + ${par(b)}) ÷ 2 = ${fmt((a + b) / 2)}.`,
      })
    },
  ],
  [
    () => {
      const t0 = randInt(-15, -2), up = randInt(5, 18), down = randInt(4, 20)
      return numeric(`À l'aube, il fait ${fmt(t0)} °C au campement. La température monte de ${up} °C, puis baisse de ${down} °C la nuit. Quelle est la température finale (en °C) ?`, t0 + up - down, {
        explanation: `${fmt(t0)} + ${up} − ${down} = ${fmt(t0 + up - down)}.`,
      })
    },
    () => {
      const d = randInt(20, 60), u = randInt(5, 18), dd = randInt(5, 25)
      return numeric(`Un plongeur est à −${d} m. Il remonte de ${u} m, puis redescend de ${dd} m. À quelle altitude se trouve-t-il (en m) ?`, -d + u - dd, {
        explanation: `−${d} + ${u} − ${dd} = ${fmt(-d + u - dd)}.`,
      })
    },
    () => {
      const y1 = -randInt(100, 600), y2 = randInt(1000, 1500)
      return numeric(`Un empire naît en ${fmt(y1)} (c'est-à-dire ${-y1} av. J.-C.) et s'effondre en ${y2}. Combien de temps a-t-il duré (en années, sans année 0) ?`, y2 - y1 - 1, {
        explanation: `${y2} − ${par(y1)} = ${y2 - y1}, moins 1 car il n'y a pas d'année 0 : ${y2 - y1 - 1}.`,
      })
    },
  ],
]

const fracs: Tiers = [
  [
    () => {
      let n = randInt(1, 9), m = randInt(2, 11)
      while (gcd(n, m) !== 1 || n === m) { n = randInt(1, 9); m = randInt(2, 11) }
      const k = randInt(2, 9)
      return fraction(`Simplifie au maximum : ${F(n * k, m * k)}`, n, m, { irreducible: true, explanation: `On divise numérateur et dénominateur par ${k}.` })
    },
    () => {
      const n = randInt(1, 8), m = randInt(n + 1, 10), k = randInt(2, 6)
      return numeric(`Complète l'égalité : ${F(n, m)} = ${F('?', m * k)}. Quel est le numérateur manquant ?`, n * k, {
        explanation: `${m} × ${k} = ${m * k}, donc on multiplie aussi ${n} par ${k} : ${n * k}.`,
      })
    },
  ],
  [
    () => {
      const den = randInt(3, 12), a = randInt(1, den - 1), b = randInt(1, den - 1)
      return fraction(`Calcule : ${F(a, den)} + ${F(b, den)}`, a + b, den, { explanation: `Même dénominateur : ${a} + ${b} = ${a + b}, donc ${a + b}/${den}.` })
    },
    () => {
      const den = randInt(4, 12), b = randInt(1, den - 2), a = randInt(b + 1, den - 1)
      return fraction(`Calcule : ${F(a, den)} − ${F(b, den)}`, a - b, den, { explanation: `Même dénominateur : ${a} − ${b} = ${a - b}.` })
    },
    () => {
      const den = pick([2, 3, 4, 5]), num = randInt(1, den - 1), q = den * randInt(2, 12)
      return numeric(`Calcule ${F(num, den)} de ${q}.`, (num * q) / den, {
        explanation: `${q} ÷ ${den} = ${q / den}, puis × ${num} = ${(num * q) / den}.`,
      })
    },
  ],
  [
    () => {
      const den = randInt(2, 6), k = randInt(2, 4), a = randInt(1, den * 2), b = randInt(1, den * k)
      return fraction(`Calcule : ${F(a, den)} + ${F(b, den * k)}`, a * k + b, den * k, {
        explanation: `${F(a, den)} = ${a * k}/${den * k}, puis ${a * k} + ${b} = ${a * k + b} : ${a * k + b}/${den * k}.`,
      })
    },
    () => {
      const den = pick([3, 4, 5, 6, 8, 10]), num = pick([2, 3, 5, 7, 9].filter((n) => n < den && gcd(n, den) === 1)), q = den * randInt(3, 15)
      return numeric(`Un trésor contient ${q} pièces d'or. Le roi en garde les ${F(num, den)}. Combien de pièces garde-t-il ?`, (num * q) / den, {
        explanation: `${q} ÷ ${den} × ${num} = ${(num * q) / den}.`,
      })
    },
  ],
  [
    () => {
      const den = randInt(2, 5), k = randInt(2, 3), b = randInt(1, den * k - 1)
      let a = randInt(Math.ceil((b + 1) / k), den * 2)
      if (a % den === 0) a += 1
      return fraction(`Calcule et donne le résultat sous forme irréductible : ${F(a, den)} − ${F(b, den * k)}`, a * k - b, den * k, {
        irreducible: true, explanation: `${a * k}/${den * k} − ${b}/${den * k} = ${a * k - b}/${den * k}, puis on simplifie.`,
      })
    },
    () => {
      const n = randInt(2, 4), den = randInt(2, 9), a = randInt(1, den - 1)
      return fraction(`Calcule : ${n} − ${F(a, den)}`, n * den - a, den, { explanation: `${n} = ${n * den}/${den}, donc ${n * den - a}/${den}.` })
    },
    () => {
      const den = pick([4, 6, 8, 10, 12]), a = randInt(1, den - 1), b = randInt(1, den - 1)
      return choice(`Range dans l'ordre croissant : ${F(a, den)} et ${F(b, den / 2)}. Quelle est la plus petite ?`,
        a < 2 * b ? `${a}/${den}` : a > 2 * b ? `${b}/${den / 2}` : 'Elles sont égales',
        [`${a}/${den}`, `${b}/${den / 2}`, 'Elles sont égales'],
        `${F(b, den / 2)} = ${2 * b}/${den}, on compare ${a} et ${2 * b}.`)
    },
  ],
  [
    () => {
      const total = pick([24, 36, 48, 60, 72, 84, 96, 120])
      return numeric(`Une armée de ${total} soldats compte ${F(1, 3)} d'archers et ${F(1, 4)} de lanciers ; le reste sont des chevaliers. Combien y a-t-il de chevaliers ?`, total - total / 3 - total / 4, {
        explanation: `Archers : ${total / 3}, lanciers : ${total / 4}, donc ${total} − ${total / 3} − ${total / 4} = ${total - total / 3 - total / 4}.`,
      })
    },
    () => {
      const [a, b] = pick([[2, 6], [3, 6], [2, 8], [4, 8], [3, 9], [2, 10], [3, 12], [4, 12], [5, 10]])
      return reste(a, b)
    },
  ],
]

/** Problème du forgeron : il reste 1 − 1/a − 1/b. */
function reste(a: number, b: number) {
  const den = (a * b) / gcd(a, b)
  const num = den - den / a - den / b
  return fraction(`Un forgeron utilise ${F(1, a)} de son fer le lundi et ${F(1, b)} le mardi. Quelle fraction du stock lui reste-t-il ? (forme irréductible)`, num, den, {
    irreducible: true, explanation: `${F(1, a)} + ${F(1, b)} = ${den / a + den / b}/${den}, il reste ${num}/${den}.`,
  })
}

const lit: Tiers = [
  [
    () => {
      const a = randInt(2, 9), b = randInt(1, 12), x = randInt(1, 10)
      return numeric(`Calcule ${a}x + ${b} pour x = ${x}.`, a * x + b, { explanation: `${a} × ${x} + ${b} = ${a * x + b}.` })
    },
    () => {
      const a = randInt(2, 9), b = randInt(1, 9), x = randInt(b + 1, 12)
      return numeric(`Calcule ${a}(x − ${b}) pour x = ${x}.`, a * (x - b), { explanation: `${a} × (${x} − ${b}) = ${a} × ${x - b} = ${a * (x - b)}.` })
    },
  ],
  [
    () => {
      const a = randInt(2, 9), b = randInt(2, 9), c = randInt(1, a + b - 1)
      return expression(`Réduis : ${poly([a, 'x'], [b, 'x'], [-c, 'x'])}`, poly([a + b - c, 'x']), 'developed', {
        explanation: `${a} + ${b} − ${c} = ${a + b - c}.`,
      })
    },
    () => {
      const a = randInt(2, 5), b = randInt(1, 9), x = randInt(2, 6)
      return numeric(`Calcule ${a}x² + ${b} pour x = ${x}.`, a * x * x + b, { explanation: `x² = ${x * x}, puis ${a} × ${x * x} + ${b} = ${a * x * x + b}.` })
    },
  ],
  [
    () => {
      const a = randInt(3, 9), b = randInt(1, 9), c = randInt(1, a - 1), d = randInt(1, 9)
      return expression(`Réduis : ${poly([a, 'x'], [b, ''], [-c, 'x'], [d, ''])}`, poly([a - c, 'x'], [b + d, '']), 'developed', {
        explanation: `On regroupe les x : ${a} − ${c} = ${a - c}, puis les nombres : ${b} + ${d} = ${b + d}.`,
      })
    },
    () => {
      const k = randInt(2, 9), a = randInt(1, 9), b = randInt(1, 12)
      return expression(`Développe : ${k}(${poly([a, 'x'], [b, ''])})`, poly([k * a, 'x'], [k * b, '']), 'developed', {
        explanation: `${k} × ${poly([a, 'x'])} + ${k} × ${b}.`,
      })
    },
  ],
  [
    () => {
      const k = randInt(2, 6), a = randInt(1, 5), b = randInt(1, 9), c = randInt(1, 9)
      return expression(`Développe et réduis : ${k}(${poly([a, 'x'], [b, ''])})${poly([1, ''], [c, 'x']).slice(1)}`, poly([k * a + c, 'x'], [k * b, '']), 'developed', {
        explanation: `${k}(${poly([a, 'x'], [b, ''])}) = ${poly([k * a, 'x'], [k * b, ''])}, puis on ajoute ${poly([c, 'x'])}.`,
      })
    },
    () => {
      const k = pick([2, 3, 4, 5, 6]), a = randInt(1, 6), b = randInt(1, 7)
      if (gcd(a, b) !== 1) return lit[3][1]()
      return expression(`Factorise : ${poly([k * a, 'x'], [k * b, ''])}`, `${k}(${poly([a, 'x'], [b, ''])})`, 'factored', {
        explanation: `${k} est un facteur commun : ${k * a}x = ${k} × ${poly([a, 'x'])} et ${k * b} = ${k} × ${b}.`,
      })
    },
  ],
  [
    () => {
      const b = randInt(2, 9)
      return expression(`Un enclos rectangulaire mesure x + ${b} mètres de long et x mètres de large. Exprime son périmètre en fonction de x (développé et réduit).`, poly([4, 'x'], [2 * b, '']), 'developed', {
        explanation: `P = 2 × (x + ${b} + x) = 4x + ${2 * b}.`,
      })
    },
    () => {
      const a = randInt(2, 9), x = randInt(2, 12), b = randInt(1, 20)
      return numeric(`Quel nombre x vérifie l'égalité ${a}x + ${b} = ${a * x + b} ?`, x, {
        explanation: `${a}x = ${a * x + b} − ${b} = ${a * x}, donc x = ${x}.`,
      })
    },
    () => {
      const a = randInt(2, 6), b = randInt(1, 9), c = randInt(1, a - 1), x = randInt(1, 6)
      const dd = Math.random() < 0.5 ? (a - c) * x + b : (a - c) * x + b + randNonZero(-3, 3)
      const ok = a * x + b === c * x + dd
      return choice(`L'égalité ${poly([a, 'x'], [b, ''])} = ${poly([c, 'x'], [dd, ''])} est-elle vraie pour x = ${x} ?`, ok ? 'Oui' : 'Non', [ok ? 'Non' : 'Oui'],
        `À gauche : ${a * x + b}. À droite : ${c * x + dd}.`)
    },
  ],
]

const prop: Tiers = [
  [
    () => {
      const n = randInt(2, 6), price = randInt(2, 15), m = randInt(n + 1, 12)
      const items = pick(['flèches', 'pains', 'torches', 'boucliers', 'cordes'])
      return numeric(`${n} ${items} coûtent ${n * price} écus. Combien coûtent ${m} ${items} (en écus) ?`, m * price, {
        explanation: `Un objet coûte ${n * price} ÷ ${n} = ${price} écus, donc ${m} × ${price} = ${m * price}.`,
      })
    },
  ],
  [
    () => {
      const p = pick([10, 20, 25, 50]), base = randInt(2, 20) * 20
      return numeric(`Calcule ${p} % de ${base}.`, (p * base) / 100, { explanation: `${base} × ${p} ÷ 100 = ${fmt((p * base) / 100)}.` })
    },
    () => {
      const n = randInt(2, 5), price = randInt(3, 25) * 0.5, m = randInt(n + 1, 12)
      return numeric(`${n} cahiers coûtent ${fmt(n * price)} €. Combien coûtent ${m} cahiers (en €) ?`, m * price, {
        explanation: `Prix d'un cahier : ${fmt(price)} €, donc ${m} × ${fmt(price)} = ${fmt(m * price)} €.`,
      })
    },
  ],
  [
    () => {
      const a = pick([4, 5, 8, 10]), b = pick([3, 6, 7, 9]), k = randInt(2, 9)
      return numeric(`${a} kg de blé donnent ${b} kg de farine. Combien de farine obtient-on avec ${a * k} kg de blé (en kg) ?`, b * k, {
        explanation: `${a * k} = ${a} × ${k}, donc ${b} × ${k} = ${b * k} kg.`,
      })
    },
    () => {
      const p = pick([5, 15, 30, 35, 40, 60, 75]), base = randInt(2, 30) * 20
      return numeric(`Calcule ${p} % de ${base}.`, (p * base) / 100, { explanation: `${base} × ${p} ÷ 100 = ${fmt((p * base) / 100)}.` })
    },
  ],
  [
    () => {
      const v = randInt(3, 12) * 4, mins = pick([15, 30, 45, 75, 90, 105])
      return numeric(`Un messager galope à ${v} km/h pendant ${mins} minutes. Quelle distance parcourt-il (en km) ?`, (v * mins) / 60, {
        explanation: `${mins} min = ${fmt(mins / 60)} h, donc ${v} × ${fmt(mins / 60)} = ${fmt((v * mins) / 60)} km.`,
      })
    },
    () => {
      const v = pick([4, 5, 6, 8, 10, 12]), d = v * pick([0.5, 1.5, 2, 2.5, 3])
      return numeric(`Une troupe marche à ${v} km/h. Combien de minutes lui faut-il pour parcourir ${fmt(d)} km ?`, (d / v) * 60, {
        explanation: `Durée = ${fmt(d)} ÷ ${v} = ${fmt(d / v)} h = ${fmt((d / v) * 60)} min.`,
      })
    },
    () => {
      const cm = randInt(2, 14), scale = pick([25000, 50000, 100000])
      return numeric(`Sur une carte à l'échelle 1/${scale}, deux châteaux sont à ${cm} cm l'un de l'autre. Quelle est la distance réelle (en km) ?`, (cm * scale) / 100000, {
        explanation: `${cm} × ${scale} = ${cm * scale} cm = ${fmt((cm * scale) / 100000)} km.`,
      })
    },
  ],
  [
    () => {
      const price = randInt(8, 40) * 20, r = pick([10, 15, 20, 25, 30, 40])
      return numeric(`Une armure coûte ${price} écus. Le marchand fait une remise de ${r} %. Quel est le nouveau prix (en écus) ?`, price * (1 - r / 100), {
        explanation: `Remise : ${price} × ${r} ÷ 100 = ${fmt((price * r) / 100)}, donc ${price} − ${fmt((price * r) / 100)} = ${fmt(price * (1 - r / 100))}.`,
      })
    },
    () => {
      const total = pick([20, 25, 40, 50, 80]), pct = pick([10, 20, 25, 30, 40, 60, 75])
      const part = (total * pct) / 100
      return numeric(`Sur ${total} soldats, ${part} sont blessés. Quel pourcentage de l'armée est blessé ?`, pct, {
        explanation: `${part} ÷ ${total} = ${fmt(part / total)}, soit ${pct} %.`,
      })
    },
    () => {
      const p = randInt(2, 6), per = pick([50, 75, 100, 120, 150]), g = p * per, m = randInt(p + 1, 20)
      return numeric(`Pour un banquet de ${p} convives, le cuisinier utilise ${g} g de viande. Combien de grammes pour ${m} convives ?`, per * m, {
        explanation: `${g} ÷ ${p} = ${per} g par convive, puis × ${m} = ${per * m} g.`,
      })
    },
  ],
]

const geo: Tiers = [
  [
    () => {
      const a = randInt(20, 100), b = randInt(20, 160 - a)
      return numeric(`Dans un triangle, deux angles mesurent ${a}° et ${b}°. Combien mesure le troisième (en °) ?`, 180 - a - b, {
        explanation: `La somme des angles vaut 180° : 180 − ${a} − ${b} = ${180 - a - b}.`,
      })
    },
  ],
  [
    () => {
      const apex = randInt(10, 80) * 2
      return numeric(`Un triangle isocèle a un angle au sommet de ${apex}°. Combien mesure chaque angle à la base (en °) ?`, (180 - apex) / 2, {
        explanation: `(180 − ${apex}) ÷ 2 = ${(180 - apex) / 2}.`,
      })
    },
    () => {
      const a = randInt(15, 75)
      return numeric(`ABC est rectangle en A et l'angle B̂ mesure ${a}°. Combien mesure Ĉ (en °) ?`, 90 - a, {
        explanation: `Les deux angles aigus d'un triangle rectangle sont complémentaires : 90 − ${a} = ${90 - a}.`,
      })
    },
  ],
  [
    () => {
      const base = randInt(20, 85)
      return numeric(`Un triangle isocèle a deux angles à la base de ${base}°. Combien mesure son angle au sommet (en °) ?`, 180 - 2 * base, {
        explanation: `180 − 2 × ${base} = ${180 - 2 * base}.`,
      })
    },
    () => {
      const a = randInt(3, 12), b = randInt(3, 12)
      return numeric(`Un triangle a deux côtés de ${a} cm et ${b} cm. Le troisième côté mesure un nombre entier de cm. Quelle est sa longueur maximale (en cm) ?`, a + b - 1, {
        explanation: `Inégalité triangulaire : il doit être strictement inférieur à ${a} + ${b} = ${a + b}.`,
      })
    },
  ],
  [
    () => {
      const a = randInt(30, 150)
      return numeric(`ABCD est un parallélogramme et Â mesure ${a}°. Combien mesure B̂ (en °) ?`, 180 - a, {
        explanation: `Deux angles consécutifs d'un parallélogramme sont supplémentaires : 180 − ${a} = ${180 - a}.`,
      })
    },
    () => {
      const a = randInt(3, 12), b = randInt(a + 2, 15)
      return numeric(`Un triangle a deux côtés de ${a} cm et ${b} cm. Le troisième côté mesure un nombre entier de cm. Quelle est sa longueur minimale (en cm) ?`, b - a + 1, {
        explanation: `Il doit être strictement supérieur à ${b} − ${a} = ${b - a}.`,
      })
    },
    () => {
      const a = randInt(20, 80), b = randInt(20, 160 - a - 10)
      return numeric(`Dans le triangle ABC, Â = ${a}° et B̂ = ${b}°. On prolonge [BC] au-delà de C. Combien mesure l'angle extérieur en C (en °) ?`, a + b, {
        explanation: `Ĉ = 180 − ${a} − ${b} = ${180 - a - b}, l'angle extérieur vaut 180 − ${180 - a - b} = ${a + b}.`,
      })
    },
  ],
  [
    () => {
      const [k, b] = pick([[1, 60], [2, 45], [3, 36], [4, 30], [7, 20], [8, 18]])
      return numeric(`Dans un triangle isocèle, l'angle au sommet est ${k === 1 ? 'égal à' : `${k} fois plus grand que`} chaque angle à la base. Combien mesure un angle à la base (en °) ?`, b, {
        explanation: `Si la base mesure b, alors b + b + ${k}b = 180, soit ${k + 2}b = 180 et b = ${b}.`,
      })
    },
    () => {
      const c = 15 * randInt(2, 8), x = (180 - c) / 3
      return numeric(`Dans un triangle ABC, Ĉ = ${c}° et Â = 2 × B̂. Combien mesure Â (en °) ?`, 2 * x, {
        explanation: `B̂ + 2B̂ = 180 − ${c} = ${180 - c}, donc B̂ = ${fmt(x)} et Â = ${fmt(2 * x)}.`,
      })
    },
  ],
]

const stat: Tiers = [
  [
    () => {
      const n = pick([3, 4]), mean = randInt(8, 15)
      const vals = Array.from({ length: n - 1 }, () => mean + randInt(-4, 4))
      vals.push(mean * n - vals.reduce((s, v) => s + v, 0))
      return numeric(`Notes d'un élève : ${vals.join(' ; ')}. Quelle est sa moyenne ?`, mean, { explanation: `Somme ${mean * n}, divisée par ${n} : ${mean}.` })
    },
  ],
  [
    () => {
      const r = randInt(2, 9), b = randInt(1, 9), v = randInt(0, 5), total = r + b + v
      return fraction(`Un sac contient ${r} jetons rouges, ${b} bleu${b > 1 ? 's' : ''}${v ? ` et ${v} vert${v > 1 ? 's' : ''}` : ''}. On tire un jeton au hasard. Quelle est la probabilité qu'il soit rouge ?`, r, total, {
        explanation: `${r} cas favorables sur ${total} cas possibles.`,
      })
    },
    () => {
      const vals = Array.from({ length: 6 }, () => randInt(2, 30))
      return numeric(`Voici les âges des soldats d'une patrouille : ${vals.join(' ; ')}. Quelle est l'étendue de la série ?`, Math.max(...vals) - Math.min(...vals), {
        explanation: `Étendue = plus grande valeur − plus petite = ${Math.max(...vals)} − ${Math.min(...vals)}.`,
      })
    },
  ],
  [
    () => {
      const n = 5, mean = randInt(9, 16)
      const vals = Array.from({ length: n - 1 }, () => mean + randInt(-6, 6))
      vals.push(mean * n - vals.reduce((s, v) => s + v, 0))
      return numeric(`Un archer marque ${vals.join(' ; ')} points en 5 tirs. Quelle est sa moyenne ?`, mean, { explanation: `Somme ${mean * n} ÷ ${n} = ${mean}.` })
    },
    () => {
      const total = pick([20, 25, 40, 50]), part = randInt(1, total - 1)
      return numeric(`Dans une armée de ${total} soldats, ${part} sont des archers. Quelle est la fréquence des archers (en %) ?`, (part / total) * 100, {
        explanation: `${part} ÷ ${total} = ${fmt(part / total)}, soit ${fmt((part / total) * 100)} %.`,
      })
    },
  ],
  [
    () => {
      const r = randInt(2, 9), b = randInt(2, 9), v = randInt(1, 6), total = r + b + v
      return fraction(`Un coffre contient ${r} rubis, ${b} saphirs et ${v} émeraudes. On en prend un au hasard. Quelle est la probabilité que ce ne soit PAS un rubis ?`, b + v, total, {
        explanation: `${b + v} pierres ne sont pas des rubis, sur ${total}.`,
      })
    },
    () => {
      const v1 = randInt(8, 14), n1 = randInt(1, 5), v2 = randInt(15, 20), n2 = randInt(1, 5)
      const mean = (v1 * n1 + v2 * n2) / (n1 + n2)
      return numeric(`${n1} soldats ont ${v1} ans d'expérience et ${n2} soldats en ont ${v2}. Quelle est l'expérience moyenne (arrondie au dixième) ?`, Math.round(mean * 10) / 10, {
        explanation: `(${v1} × ${n1} + ${v2} × ${n2}) ÷ ${n1 + n2} ≈ ${fmt(Math.round(mean * 10) / 10)}.`,
      })
    },
  ],
  [
    () => {
      const target = randInt(10, 14), a = randInt(6, 18), b = randInt(6, 18), c = randInt(6, 18)
      const need = 4 * target - a - b - c
      if (need < 0 || need > 20) return stat[4][0]()
      return numeric(`Un élève a eu ${a}, ${b} et ${c}. Quelle note doit-il obtenir au 4ᵉ devoir pour avoir exactement ${target} de moyenne ?`, need, {
        explanation: `Il faut un total de 4 × ${target} = ${4 * target}, donc ${4 * target} − ${a + b + c} = ${need}.`,
      })
    },
    () => {
      const r = randInt(2, 6), b = r + randInt(2, 8)
      return numeric(`Un sac contient ${r} boules rouges et ${b} boules bleues. Combien de boules rouges faut-il ajouter pour que la probabilité de tirer une rouge soit de ${F(1, 2)} ?`, b - r, {
        explanation: `Il faut autant de rouges que de bleues : ${b} − ${r} = ${b - r}.`,
      })
    },
  ],
]

export const CINQUIEME: Record<string, Tiers> = {
  '5e-prio': prio,
  '5e-rel': rel,
  '5e-frac': fracs,
  '5e-lit': lit,
  '5e-prop': prop,
  '5e-geo': geo,
  '5e-stat': stat,
}
