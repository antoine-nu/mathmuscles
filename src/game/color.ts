/** Éclaircit (amt > 0) ou assombrit (amt < 0) une couleur hexadécimale. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number) => {
    const target = amt > 0 ? 255 : 0
    return Math.round(c + (target - c) * Math.abs(amt))
  }
  const r = mix((n >> 16) & 255)
  const g = mix((n >> 8) & 255)
  const b = mix(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

/** Pseudo-aléatoire déterministe (pour que la carte soit identique à chaque rendu). */
export function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
