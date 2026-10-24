// Conversion des sprites vectoriels (UnitSprite) en images, pour les dessiner vite dans le canvas de bataille.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SpriteDefs, UnitSprite, type UnitLook } from '../components/UnitSprite'

/** Cadre de dessin commun à tous les sprites (unités SVG) : origine aux pieds. */
export const SPRITE_BOX = { x: -36, y: -78, w: 72, h: 84 }
const SCALE = 2 // résolution de l'image (net sur écrans haute densité)

const cache = new Map<string, HTMLImageElement>()

export const lookKey = (l: UnitLook) => `${l.kind}|${l.tier}|${l.color}|${l.upgrades}|${l.name}`

/** Image d'un sprite (créée à la première demande ; peut ne pas être encore chargée). */
export function spriteImage(look: UnitLook): HTMLImageElement {
  const key = lookKey(look)
  let img = cache.get(key)
  if (img) return img
  const inner = renderToStaticMarkup(createElement('g', null, createElement(SpriteDefs), createElement(UnitSprite, { look })))
  const { x, y, w, h } = SPRITE_BOX
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * SCALE}" height="${h * SCALE}" viewBox="${x} ${y} ${w} ${h}">${inner}</svg>`
  img = new Image()
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  cache.set(key, img)
  return img
}

/** Précharge une liste de sprites (avant le début de la bataille). */
export function preloadSprites(looks: UnitLook[]): Promise<void> {
  return Promise.all(
    looks.map((l) => {
      const img = spriteImage(l)
      return img.complete ? Promise.resolve() : new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res() })
    }),
  ).then(() => undefined)
}
