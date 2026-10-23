import { SpriteDefs, UnitSprite, type UnitLook } from './UnitSprite'

/** Un sprite isolé dans son cadre (portrait du panneau de commande, aperçus de rangs). */
export function Portrait({ look, size = 96, className }: { look: UnitLook; size?: number; className?: string }) {
  const wide = look.tier > 0 && (look.kind === 'siege' || look.kind === 'knight' || look.kind === 'scout')
  const tall = look.tier === 3 && look.kind === 'siege'
  const vb = tall ? '-34 -70 70 76' : wide ? '-26 -50 56 56' : '-18 -50 36 54'
  return (
    <svg className={className} width={size} height={size} viewBox={vb} preserveAspectRatio="xMidYMax meet">
      <SpriteDefs />
      <UnitSprite look={look} />
    </svg>
  )
}
