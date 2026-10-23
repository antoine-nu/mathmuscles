// Projection isométrique 2:1, comme Age of Empires II.
export const TILE_W = 96
export const TILE_H = 48
export const MAP_SIZE = 18

export type Pt = [number, number]

/** Coordonnées de tuile → pixels écran. */
export function iso(x: number, y: number): Pt {
  return [((x - y) * TILE_W) / 2, ((x + y) * TILE_H) / 2]
}

/** Pixels écran → coordonnées de tuile. */
export function unIso(sx: number, sy: number): Pt {
  return [(sx / (TILE_W / 2) + sy / (TILE_H / 2)) / 2, (sy / (TILE_H / 2) - sx / (TILE_W / 2)) / 2]
}

export const pts = (list: Pt[]) => list.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
export const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
export const up = (p: Pt, h: number): Pt => [p[0], p[1] - h]
