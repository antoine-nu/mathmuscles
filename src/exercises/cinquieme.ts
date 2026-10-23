import {
  choice, fmt, frac, gcd, numeric, par, pick, plain, poly, randInt, randNonZero, signed,
  type Generator,
} from './utils'

const prio: Generator = (d) => {
  if (d === 1) {
    const a = randInt(5, 30), b = randInt(2, 9), c = randInt(2, 9)
    if (Math.random() < 0.5) {
      return numeric(`Calcule : ${a} + ${b} × ${c}`, a + b * c, {
        explanation: `La multiplication est prioritaire : ${b} × ${c} = ${b * c}, puis ${a} + ${b * c} = ${a + b * c}.`,
      })
    }
    const p = a * b
    return numeric(`Calcule : ${a} × ${b} − ${c}`, p - c, {
      explanation: `D'abord ${a} × ${b} = ${p}, puis ${p} − ${c} = ${p - c}.`,
    })
  }
  if (d === 2) {
    const a = randInt(2, 12), b = randInt(2, 12), c = randInt(2, 6), e = randInt(1, 15)
    return numeric(`Calcule : (${a} + ${b}) × ${c} − ${e}`, (a + b) * c - e, {
      explanation: `Parenthèses : ${a} + ${b} = ${a + b} ; puis ${a + b} × ${c} = ${(a + b) * c} ; enfin − ${e}.`,
    })
  }
  const e = randInt(2, 6), k = randInt(2, 9), dd = e * k
  const a = randInt(8, 20), b = randInt(1, a - 2), c = randInt(2, 5)
  return numeric(`Calcule : (${a} − ${b}) × ${c} + ${dd} ÷ ${e}`, (a - b) * c + k, {
    explanation: `(${a} − ${b}) × ${c} = ${(a - b) * c} et ${dd} ÷ ${e} = ${k}, donc ${(a - b) * c + k}.`,
  })
}

const rel: Generator = (d) => {
  if (d === 1) {
    const a = randNonZero(-15, 15), b = randNonZero(-15, 15)
    return numeric(`Calcule : ${signed(a)} + ${signed(b)}`, a + b, {
      explanation: a * b < 0 ? 'Signes contraires : on soustrait les distances à zéro et on garde le signe de la plus grande.' : 'Même signe : on additionne les distances à zéro et on garde le signe.',
    })
  }
  if (d === 2) {
    const a = randNonZero(-15, 15), b = randNonZero(-15, 15)
    return numeric(`Calcule : ${signed(a)} − ${signed(b)}`, a - b, {
      explanation: `Soustraire ${signed(b)}, c'est ajouter son opposé ${signed(-b)}.`,
    })
  }
  const a = randNonZero(-12, 12), b = randNonZero(-12, 12), c = randNonZero(-12, 12), e = randNonZero(-12, 12)
  return numeric(`Calcule : ${fmt(a)} + ${par(b)} − ${par(c)} + ${par(e)}`, a + b - c + e, {
    explanation: `On transforme les soustractions en additions de l'opposé puis on regroupe positifs et négatifs.`,
  })
}

const fracs: Generator = (d) => {
  if (d === 1) {
    if (Math.random() < 0.5) {
      let n = randInt(1, 9), m = randInt(2, 11)
      while (gcd(n, m) !== 1 || n === m) { n = randInt(1, 9); m = randInt(2, 11) }
      const k = randInt(2, 9)
      return {
        ...numeric(`Simplifie au maximum : {${n * k}/${m * k}}`, n / m, {
          answer: plain(frac(n, m)), inputHint: 'Écris la fraction sous la forme a/b',
          explanation: `On divise numérateur et dénominateur par ${k}.`,
        }),
        check: (v) => v.replace(/\s/g, '') === `${n}/${m}`,
      }
    }
    const den = randInt(3, 12), a = randInt(1, 2 * den), b = randInt(1, 2 * den)
    const correct = a > b ? '>' : a < b ? '<' : '='
    return choice(`Compare : {${a}/${den}} ? {${b}/${den}}`, correct, ['<', '>', '='].filter((s) => s !== correct),
      'Même dénominateur : on compare les numérateurs.')
  }
  if (d === 2) {
    const den = randInt(3, 12), a = randInt(1, den), b = randInt(1, den)
    return numeric(`Calcule : {${a}/${den}} + {${b}/${den}}`, (a + b) / den, {
      answer: plain(frac(a + b, den)), inputHint: 'Fraction a/b ou nombre',
      explanation: `Même dénominateur : on additionne les numérateurs → ${a + b}/${den}.`,
    })
  }
  if (Math.random() < 0.5) {
    const den = randInt(2, 6), k = randInt(2, 4), a = randInt(1, den * 2), b = randInt(1, den * k)
    return numeric(`Calcule : {${a}/${den}} + {${b}/${den * k}}`, a / den + b / (den * k), {
      answer: plain(frac(a * k + b, den * k)), inputHint: 'Fraction a/b ou nombre',
      explanation: `On écrit {${a}/${den}} = ${a * k}/${den * k}, puis on additionne : ${a * k + b}/${den * k}.`,
    })
  }
  const den = pick([3, 4, 5, 6, 8, 10]), num = randInt(1, den - 1), q = den * randInt(2, 12)
  return numeric(`Calcule {${num}/${den}} de ${q}.`, (num * q) / den, {
    explanation: `${q} ÷ ${den} = ${q / den}, puis × ${num} = ${(num * q) / den}.`,
  })
}

const lit: Generator = (d) => {
  if (d === 1) {
    const a = randInt(2, 9), b = randInt(1, 12), x = randInt(1, 10)
    return numeric(`Calcule ${a}x + ${b} pour x = ${x}.`, a * x + b, {
      explanation: `On remplace x par ${x} : ${a} × ${x} + ${b} = ${a * x + b}.`,
    })
  }
  if (d === 2) {
    const a = randInt(2, 9), b = randInt(2, 9), c = randInt(1, a + b - 1)
    const r = a + b - c
    return choice(`Réduis : ${poly([a, 'x'], [b, 'x'], [-c, 'x'])}`, poly([r, 'x']),
      [poly([a + b + c, 'x']), poly([r, 'x²']), `${r}`, poly([a * b - c, 'x'])],
      `${a} + ${b} − ${c} = ${r}, donc ${poly([r, 'x'])}.`)
  }
  if (Math.random() < 0.5) {
    const k = randInt(2, 9), a = randInt(1, 9), b = randInt(1, 12)
    return choice(`Développe : ${k}(${poly([a, 'x'], [b, ''])})`, poly([k * a, 'x'], [k * b, '']),
      [poly([k * a, 'x'], [b, '']), poly([k + a, 'x'], [k + b, '']), poly([a, 'x'], [k * b, ''])],
      `On distribue ${k} sur chaque terme : ${k} × ${poly([a, 'x'])} et ${k} × ${b}.`)
  }
  const a = randInt(2, 6), b = randInt(1, 9), c = randInt(1, a - 1), x = randInt(1, 6)
  const dd = Math.random() < 0.5 ? (a - c) * x + b : (a - c) * x + b + randNonZero(-3, 3)
  const ok = a * x + b === c * x + dd
  return choice(`L'égalité ${poly([a, 'x'], [b, ''])} = ${poly([c, 'x'], [dd, ''])} est-elle vraie pour x = ${x} ?`, ok ? 'Oui' : 'Non', [ok ? 'Non' : 'Oui'],
    `À gauche : ${a * x + b}. À droite : ${c * x + dd}.`)
}

const prop: Generator = (d) => {
  if (d === 1) {
    const n = randInt(2, 6), price = randInt(3, 25) * 0.5, m = randInt(n + 1, 12)
    const items = pick(['cahiers', 'stylos', 'baguettes', 'flèches', 'boucliers'])
    return numeric(`${n} ${items} coûtent ${fmt(n * price)} €. Combien coûtent ${m} ${items} (en €) ?`, m * price, {
      explanation: `Un objet coûte ${fmt(n * price)} ÷ ${n} = ${fmt(price)} €, donc ${m} × ${fmt(price)} = ${fmt(m * price)} €.`,
    })
  }
  if (d === 2) {
    const p = pick([10, 20, 25, 30, 40, 50, 75]), base = randInt(2, 20) * 20
    return numeric(`Calcule ${p} % de ${base}.`, (p * base) / 100, {
      explanation: `${p} % de ${base} = ${base} × ${p} ÷ 100 = ${fmt((p * base) / 100)}.`,
    })
  }
  const v = randInt(3, 12) * 2, h = randInt(1, 3), half = Math.random() < 0.5
  const t = h + (half ? 0.5 : 0)
  return numeric(`Un messager à cheval galope à ${v} km/h pendant ${h} h${half ? ' 30 min' : ''}. Quelle distance parcourt-il (en km) ?`, v * t, {
    explanation: `Distance = vitesse × durée = ${v} × ${fmt(t)} = ${fmt(v * t)} km.`,
  })
}

const geo: Generator = (d) => {
  if (d === 1) {
    const a = randInt(20, 100), b = randInt(20, 160 - a)
    return numeric(`Dans un triangle, deux angles mesurent ${a}° et ${b}°. Combien mesure le troisième (en °) ?`, 180 - a - b, {
      explanation: `La somme des angles vaut 180° : 180 − ${a} − ${b} = ${180 - a - b}.`,
    })
  }
  if (d === 2) {
    const a = randInt(2, 10), b = randInt(2, 10)
    const c = Math.random() < 0.5 ? randInt(Math.abs(a - b) + 1, a + b - 1) : a + b + randInt(0, 4)
    const ok = c < a + b && c > Math.abs(a - b)
    return choice(`Peut-on construire un triangle de côtés ${a} cm, ${b} cm et ${c} cm ?`, ok ? 'Oui' : 'Non', [ok ? 'Non' : 'Oui'],
      `Le plus grand côté doit être strictement inférieur à la somme des deux autres.`)
  }
  if (Math.random() < 0.5) {
    const a = randInt(30, 150)
    return numeric(`ABCD est un parallélogramme et l'angle Â mesure ${a}°. Combien mesure l'angle B̂ (en °) ?`, 180 - a, {
      explanation: `Deux angles consécutifs d'un parallélogramme sont supplémentaires : 180 − ${a} = ${180 - a}.`,
    })
  }
  const apex = randInt(10, 80) * 2
  return numeric(`Un triangle isocèle a un angle au sommet de ${apex}°. Combien mesure chaque angle à la base (en °) ?`, (180 - apex) / 2, {
    explanation: `(180 − ${apex}) ÷ 2 = ${(180 - apex) / 2}.`,
  })
}

const stat: Generator = (d) => {
  if (d === 1) {
    const n = pick([3, 4, 5]), mean = randInt(8, 15)
    const vals = Array.from({ length: n - 1 }, () => mean + randInt(-5, 5))
    vals.push(mean * n - vals.reduce((s, v) => s + v, 0))
    return numeric(`Notes d'un élève : ${vals.join(' ; ')}. Quelle est sa moyenne ?`, mean, {
      explanation: `Somme = ${mean * n}, divisée par ${n} : ${mean}.`,
    })
  }
  if (d === 2) {
    const r = randInt(2, 9), b = randInt(1, 9), v = randInt(0, 5)
    const total = r + b + v
    return numeric(`Un sac contient ${r} jetons rouges, ${b} bleus${v ? ` et ${v} verts` : ''}. On tire un jeton au hasard. Quelle est la probabilité qu'il soit rouge ?`, r / total, {
      answer: plain(frac(r, total)), inputHint: 'Fraction a/b ou décimal',
      explanation: `${r} cas favorables sur ${total} cas possibles.`,
    })
  }
  const total = pick([20, 25, 40, 50]), part = randInt(1, total - 1)
  return numeric(`Dans une armée de ${total} soldats, ${part} sont des archers. Quelle est la fréquence des archers (en %) ?`, (part / total) * 100, {
    explanation: `${part} ÷ ${total} = ${fmt(part / total)}, soit ${fmt((part / total) * 100)} %.`,
  })
}

export const CINQUIEME: Record<string, Generator> = {
  '5e-prio': prio,
  '5e-rel': rel,
  '5e-frac': fracs,
  '5e-lit': lit,
  '5e-prop': prop,
  '5e-geo': geo,
  '5e-stat': stat,
}
