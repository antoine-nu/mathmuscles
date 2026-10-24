import type { ReactNode } from 'react'
import type { UnitKind } from '../data/curriculum'
import { shade } from '../game/color'

// Sprites vectoriels dessinés à la main, origine = pieds du personnage, regard vers la droite.
// Rang 0 = villageois, 1 = recrue, 2 = vétéran (armure de fer), 3 = élite (acier, or, panache).

export interface UnitLook {
  kind: UnitKind
  tier: number
  color: string
  emblem: string
  name: string
  /** Améliorations acquises (0 à 3) : armure dorée, arme forgée, cape. */
  upgrades: number
}

const OUTLINE = '#1c130c'
const SKIN = '#eab88a'
const STEEL = '#a3acb5'
const STEEL_LIGHT = '#dfe5ea'
const GOLD = '#e2b43c'
const WOOD = '#8a5a2e'
const LEATHER = '#7a4a26'

const o = { stroke: OUTLINE, strokeWidth: 0.7, strokeLinejoin: 'round' as const }

export function UnitSprite({ look }: { look: UnitLook }) {
  if (look.tier === 0) return <Villager look={look} />
  if (look.kind === 'knight' || look.kind === 'scout') return <Rider look={look} />
  if (look.kind === 'siege') return <Siege look={look} />
  return <Footman look={look} />
}

function Shadow({ rx = 9 }: { rx?: number }) {
  return <ellipse cx={0} cy={0} rx={rx} ry={rx * 0.38} fill="rgba(0,0,0,0.32)" />
}

function Head({ y = -28.5, beard = false, hair }: { y?: number; beard?: boolean; hair?: string }) {
  return (
    <g>
      <rect x={-1.6} y={y + 3} width={3.2} height={3} fill={shade(SKIN, -0.15)} />
      <circle cx={0} cy={y} r={4.6} fill={SKIN} {...o} />
      <path d={`M1,${y + 1.8} q2,0.6 3.4,-0.6`} stroke={shade(SKIN, -0.35)} strokeWidth={0.6} fill="none" />
      <circle cx={2.1} cy={y - 0.6} r={0.62} fill={OUTLINE} />
      {beard && <path d={`M-3.6,${y + 1.2} Q0,${y + 7} 3.8,${y + 1.6} Q1,${y + 3.4} -3.6,${y + 1.2}Z`} fill="#6b4126" />}
      {hair && <path d={`M-4.7,${y + 0.6} C-5.6,${y - 6} 3.8,${y - 7.4} 4.8,${y - 1.8} C2,${y - 3.6} -1,${y - 3.4} -2.2,${y - 1} Z`} fill={hair} {...o} />}
    </g>
  )
}

function Helmet({ style, y = -28.5, plume }: { style: 'cap' | 'nasal' | 'great' | 'kettle' | 'hood' | 'feather'; y?: number; plume?: string }) {
  switch (style) {
    case 'cap':
      return <path d={`M-5,${y + 0.4} C-5.2,${y - 6.4} 5.2,${y - 6.4} 5,${y + 0.4} L5.6,${y + 0.8} L-5.6,${y + 0.8} Z`} fill={LEATHER} {...o} />
    case 'nasal':
      return (
        <g>
          <path d={`M-5,${y + 0.6} C-5.4,${y - 7.6} 5.4,${y - 7.6} 5,${y + 0.6} Z`} fill={STEEL} {...o} />
          <path d={`M-2.6,${y - 4.6} C-1.4,${y - 6} 1,${y - 6.2} 2.4,${y - 5}`} stroke={STEEL_LIGHT} strokeWidth={0.9} fill="none" />
          <rect x={1.4} y={y - 0.6} width={1.1} height={4} fill={STEEL} {...o} strokeWidth={0.5} />
        </g>
      )
    case 'kettle':
      return (
        <g>
          <path d={`M-4.6,${y} C-4.8,${y - 7} 4.8,${y - 7} 4.6,${y} Z`} fill={STEEL} {...o} />
          <path d={`M-7.6,${y + 0.2} Q0,${y - 2} 7.6,${y + 0.2} Q0,${y + 1.8} -7.6,${y + 0.2}Z`} fill={shade(STEEL, -0.15)} {...o} />
        </g>
      )
    case 'great':
      return (
        <g>
          {plume && <path d={`M-1,${y - 6} C-3,${y - 13} -9,${y - 12} -11,${y - 6} C-7,${y - 9} -4,${y - 8} -1,${y - 5}Z`} fill={plume} {...o} />}
          <path d={`M-5.2,${y + 4.4} L-5.2,${y - 2.6} C-5.2,${y - 7.6} 5.2,${y - 7.6} 5.2,${y - 2.6} L5.2,${y + 4.4} Z`} fill={STEEL_LIGHT} {...o} />
          <path d={`M-5.2,${y + 4.4} L-5.2,${y - 2.6} C-5.2,${y - 5} -3,${y - 6.6} -1,${y - 7}`} stroke="#fff" strokeOpacity={0.6} strokeWidth={0.8} fill="none" />
          <rect x={-0.3} y={y - 1.6} width={5.4} height={1} fill={OUTLINE} />
          <rect x={0.8} y={y - 6.6} width={0.9} height={11} fill={GOLD} />
        </g>
      )
    case 'hood':
      return <path d={`M-5.6,${y + 4} C-7,${y - 9} 6.6,${y - 9} 5.4,${y - 1} L3.4,${y - 3.4} C1,${y - 5} -3,${y - 4} -3.6,${y + 4} Z`} fill={plume ?? '#4c6b2c'} {...o} />
    case 'feather':
      return (
        <g>
          <path d={`M-5,${y} C-5,${y - 6.4} 5,${y - 6.4} 5,${y} Z`} fill={plume ?? '#2b5a2b'} {...o} />
          <path d={`M-3,${y - 3.6} C-8,${y - 10} -12,${y - 10} -14,${y - 9} C-10,${y - 7} -7,${y - 5} -3,${y - 3}Z`} fill="#f4efe0" {...o} strokeWidth={0.5} />
        </g>
      )
  }
}

function Shield({ color, emblem, rim, x = -8, y = -16 }: { color: string; emblem: string; rim: string; x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-5.6,-7.4 L5.6,-7.4 L5.6,-1 C5.6,4.6 0,8.2 0,8.2 C0,8.2 -5.6,4.6 -5.6,-1 Z" fill={color} stroke={rim} strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M-5.6,-7.4 L5.6,-7.4 L5.6,-1 C5.6,4.6 0,8.2 0,8.2 C0,8.2 -5.6,4.6 -5.6,-1 Z" fill="none" stroke={OUTLINE} strokeWidth={0.5} />
      <path d="M0,-7 L0,8 L5.4,-1 L5.4,-7Z" fill="#000" opacity={0.14} />
      <text x={0} y={2.2} fontSize={emblem.length > 1 ? 5.4 : 7.6} fontFamily="Cinzel, Georgia, serif" fontWeight={900} textAnchor="middle" fill="#f6ecd2" stroke={OUTLINE} strokeWidth={0.25}>
        {emblem}
      </text>
    </g>
  )
}

function Cape({ color, long = true }: { color: string; long?: boolean }) {
  return <path d={`M-6,-23 C-11,-17 -12,${long ? -6 : -10} -10,${long ? -2 : -7} L4,${long ? -4 : -8} L5,-22 Z`} fill={shade(color, -0.3)} {...o} />
}

/** Corps humain (tunique, bras, tête). Les armes sont ajoutées par l'appelant. */
function Body({ tunic, armor, tabard, trim, legs = true, robe = false }: { tunic: string; armor?: 'mail' | 'plate'; tabard?: string; trim?: string; legs?: boolean; robe?: boolean }) {
  return (
    <g>
      {legs && !robe && (
        <g>
          <rect x={-4.6} y={-12} width={3.3} height={10} fill="#4a3a2c" {...o} />
          <rect x={1.3} y={-12} width={3.3} height={10} fill="#3f3226" {...o} />
          <path d="M-5.2,-3 h4.4 v3 h-5.4 z" fill="#2e2016" />
          <path d="M1,-3 h4.4 l1.4,3 h-5.8 z" fill="#2e2016" />
          {armor === 'plate' && <rect x={-4.6} y={-12} width={9.2} height={5} fill={STEEL} opacity={0.85} />}
        </g>
      )}
      {robe ? (
        <path d="M-6.6,-23 C-3,-25.6 3,-25.6 6.6,-23 L8.6,-1 C3,1 -3,1 -8.6,-1 Z" fill={tunic} {...o} />
      ) : (
        <path d="M-6.6,-23 C-3,-25.6 3,-25.6 6.6,-23 L8.2,-8.6 C3,-7 -3,-7 -8.2,-8.6 Z" fill={tunic} {...o} />
      )}
      {armor === 'mail' && <path d="M-6.4,-22.8 C-3,-25 3,-25 6.4,-22.8 L7.2,-12 C3,-11 -3,-11 -7.2,-12 Z" fill="url(#mail)" stroke={OUTLINE} strokeWidth={0.5} />}
      {armor === 'plate' && (
        <g>
          <path d="M-6.2,-22.8 C-3,-25 3,-25 6.2,-22.8 L6.8,-13.6 C3,-12.4 -3,-12.4 -6.8,-13.6 Z" fill={STEEL} {...o} />
          <path d="M-3.8,-21.6 C-2,-22.8 0,-23 1,-22.6 L0.4,-15" stroke={STEEL_LIGHT} strokeWidth={1.1} fill="none" />
        </g>
      )}
      {tabard && (
        <path d={`M-3.2,-23.4 L3.2,-23.4 L3.8,${robe ? -1 : -8} L-3.8,${robe ? -1 : -8} Z`} fill={tabard} stroke={trim ?? OUTLINE} strokeWidth={trim ? 0.9 : 0.6} />
      )}
      <path d={`M0.5,-25 C3,-25 6.6,-23 6.6,-23 L${robe ? 8.6 : 8.2},${robe ? -1 : -8.6} C5,${robe ? 0 : -7.4} 2,${robe ? 0.4 : -7} 0.5,${robe ? 0.4 : -7}Z`} fill="#000" opacity={0.13} />
      <rect x={-7.4} y={-14.8} width={14.8} height={1.9} fill="#3d2614" />
      <rect x={-0.9} y={-15.1} width={2.2} height={2.4} fill={trim ?? '#c9a54a'} />
    </g>
  )
}

function Arm({ from, to, sleeve }: { from: [number, number]; to: [number, number]; sleeve: string }) {
  return (
    <g>
      <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={OUTLINE} strokeWidth={4.2} strokeLinecap="round" />
      <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={sleeve} strokeWidth={2.9} strokeLinecap="round" />
      <circle cx={to[0]} cy={to[1]} r={1.7} fill={SKIN} {...o} strokeWidth={0.5} />
    </g>
  )
}

function Sword({ x, y, gold, big }: { x: number; y: number; gold: boolean; big?: boolean }) {
  const len = big ? 20 : 15
  const blade = gold ? '#f3d98a' : STEEL_LIGHT
  return (
    <g transform={`translate(${x} ${y}) rotate(28)`}>
      {gold && <line x1={0} y1={-2} x2={0} y2={-len} stroke="#ffd75e" strokeWidth={4} opacity={0.35} />}
      <path d={`M-0.9,-2 L-0.9,-${len - 2} L0,-${len} L0.9,-${len - 2} L0.9,-2 Z`} fill={blade} {...o} strokeWidth={0.5} />
      <rect x={-3.2} y={-2.4} width={6.4} height={1.3} rx={0.5} fill={gold ? GOLD : '#6b5a3a'} {...o} strokeWidth={0.4} />
      <rect x={-0.6} y={-1.2} width={1.2} height={3} fill={LEATHER} />
      <circle cx={0} cy={2.2} r={0.9} fill={GOLD} />
    </g>
  )
}

function Footman({ look }: { look: UnitLook }) {
  const { kind, tier, color, emblem, upgrades, name } = look
  const goldArmor = upgrades >= 1
  const goldWeapon = upgrades >= 2
  const cape = upgrades >= 3 || tier === 3
  const rim = goldArmor ? GOLD : tier >= 2 ? STEEL : WOOD

  if (kind === 'monk') {
    const robe = tier === 3 ? shade(color, -0.25) : tier === 2 ? shade(color, -0.1) : '#8a7a5c'
    return (
      <g>
        <Shadow />
        {cape && <Cape color={color} />}
        <Body tunic={robe} robe tabard={tier >= 2 ? color : undefined} trim={goldArmor || tier === 3 ? GOLD : undefined} />
        <Arm from={[-5.6, -21.5]} to={[-7, -14]} sleeve={robe} />
        {/* grimoire */}
        <g transform="translate(-8 -14) rotate(-12)">
          <rect x={-3} y={-3.4} width={6} height={6.8} rx={0.6} fill={tier === 3 ? '#7a1f1f' : '#5a3a1e'} {...o} strokeWidth={0.5} />
          <rect x={-2} y={-2.4} width={4} height={4.8} fill="none" stroke={GOLD} strokeWidth={0.5} />
        </g>
        <Head beard={tier >= 2} />
        <Helmet style="hood" plume={shade(robe, -0.1)} />
        {/* bâton à orbe */}
        <line x1={9} y1={1} x2={9} y2={-38} stroke={OUTLINE} strokeWidth={2.2} />
        <line x1={9} y1={1} x2={9} y2={-38} stroke={goldWeapon ? GOLD : WOOD} strokeWidth={1.3} />
        <circle cx={9} cy={-40} r={tier === 3 ? 3.4 : 2.6} fill={tier >= 2 ? '#8fe3ff' : '#d6c89a'} {...o} />
        {tier >= 2 && <circle cx={9} cy={-40} r={6} fill="#8fe3ff" opacity={0.25} className="glow" />}
        <Arm from={[5.6, -21.5]} to={[8.6, -17]} sleeve={robe} />
      </g>
    )
  }

  const tunic = tier === 1 ? color : shade(color, -0.12)
  const armor = tier >= 2 ? (tier === 3 ? 'plate' : 'mail') : undefined
  const helmet = kind === 'archer'
    ? tier === 1 ? 'hood' : tier === 2 ? 'kettle' : 'feather'
    : kind === 'spear'
      ? tier === 1 ? 'cap' : tier === 2 ? 'kettle' : 'great'
      : tier === 1 ? 'cap' : tier === 2 ? 'nasal' : 'great'
  const crossbow = name.includes('Arbalétrier')

  let weapon: ReactNode = null
  let backArmTo: [number, number] = [-8, -15]
  let frontArmTo: [number, number] = [8.6, -15.5]
  if (kind === 'infantry') {
    weapon = <Sword x={8.6} y={-15.5} gold={goldWeapon} big={tier === 3} />
  } else if (kind === 'spear') {
    const tip = goldWeapon ? '#f3d98a' : STEEL_LIGHT
    frontArmTo = [8.8, -18]
    weapon = (
      <g>
        <line x1={9.6} y1={2} x2={9.6} y2={-46} stroke={OUTLINE} strokeWidth={2.1} />
        <line x1={9.6} y1={2} x2={9.6} y2={-46} stroke={WOOD} strokeWidth={1.2} />
        {tier === 3 ? (
          <g>
            <path d="M9.6,-53 L11,-46 L8.2,-46 Z" fill={tip} {...o} strokeWidth={0.5} />
            <path d="M10.2,-46 C15,-47 16.4,-43 15.6,-40 C13.6,-41.4 12,-41.4 10.2,-41 Z" fill={tip} {...o} strokeWidth={0.5} />
            <path d="M9,-45 L6,-43 L9,-42Z" fill={tip} {...o} strokeWidth={0.4} />
          </g>
        ) : (
          <path d="M9.6,-53 L11.4,-46.5 L9.6,-45 L7.8,-46.5 Z" fill={tip} {...o} strokeWidth={0.5} />
        )}
        {tier >= 2 && <path d={`M9.6,-44 L${9.6 - 6},-42 L9.6,-40 Z`} fill={color} {...o} strokeWidth={0.4} />}
      </g>
    )
  } else if (kind === 'archer') {
    const string = '#efe6cf'
    const bowWood = goldWeapon ? GOLD : '#6e4220'
    if (crossbow) {
      backArmTo = [-1, -18]
      frontArmTo = [7, -17]
      weapon = (
        <g transform="translate(3 -18)">
          <rect x={-4} y={-1} width={14} height={2} rx={0.6} fill={WOOD} {...o} strokeWidth={0.5} />
          <path d="M9,-7 Q12,0 9,7" stroke={bowWood} strokeWidth={1.6} fill="none" />
          <path d="M9,-7 L5,0 L9,7" stroke={string} strokeWidth={0.5} fill="none" />
        </g>
      )
    } else {
      const big = tier >= 2
      backArmTo = [10, -20]
      frontArmTo = [5, -19]
      weapon = (
        <g transform="translate(11 -20)">
          <path d={big ? 'M0,-17 Q8,0 0,17' : 'M0,-12 Q6,0 0,12'} stroke={OUTLINE} strokeWidth={2.4} fill="none" />
          <path d={big ? 'M0,-17 Q8,0 0,17' : 'M0,-12 Q6,0 0,12'} stroke={bowWood} strokeWidth={1.4} fill="none" />
          <path d={big ? 'M0,-17 L0,17' : 'M0,-12 L0,12'} stroke={string} strokeWidth={0.45} />
        </g>
      )
    }
  }

  return (
    <g>
      <Shadow />
      {cape && <Cape color={color} />}
      {kind === 'archer' && (
        <g transform="translate(-6 -22) rotate(-24)">
          <rect x={-2} y={0} width={4} height={11} rx={1} fill={LEATHER} {...o} strokeWidth={0.5} />
          <path d="M-1.6,0 l-0.6,-3 M0,0 l0,-3.4 M1.6,0 l0.6,-3" stroke="#f4efe0" strokeWidth={1.1} />
        </g>
      )}
      {kind !== 'archer' && <Arm from={[-5.6, -21.5]} to={backArmTo} sleeve={armor ? STEEL : tunic} />}
      <Body tunic={tunic} armor={armor} tabard={tier === 3 ? color : undefined} trim={goldArmor ? GOLD : undefined} />
      {kind === 'archer' && <Arm from={[-5.6, -21.5]} to={backArmTo} sleeve={armor ? STEEL : tunic} />}
      <Head beard={tier === 2} />
      <Helmet style={helmet} plume={tier === 3 ? shade(color, 0.15) : kind === 'archer' ? shade(color, -0.35) : undefined} />
      {weapon}
      <Arm from={[5.6, -21.5]} to={frontArmTo} sleeve={armor ? STEEL : tunic} />
      {(kind === 'infantry' || (kind === 'spear' && tier >= 2)) && (
        <Shield color={color} emblem={emblem} rim={rim} x={kind === 'spear' ? -8.5 : -8} />
      )}
    </g>
  )
}

function Villager({ look }: { look: UnitLook }) {
  return (
    <g>
      <Shadow />
      <Arm from={[-5.6, -21.5]} to={[-7.6, -14.6]} sleeve="#b89a6a" />
      <Body tunic="#b89a6a" />
      <path d="M-6.4,-22.8 C-3,-25 3,-25 6.4,-22.8 L5.4,-20.6 C2,-22 -2,-22 -5.4,-20.6Z" fill={look.color} {...o} strokeWidth={0.5} />
      <Head hair="#5a3418" />
      {/* marteau */}
      <g transform="translate(8.4 -15.4) rotate(32)">
        <line x1={0} y1={3} x2={0} y2={-12} stroke={OUTLINE} strokeWidth={2} />
        <line x1={0} y1={3} x2={0} y2={-12} stroke={WOOD} strokeWidth={1.1} />
        <rect x={-3.4} y={-14.6} width={6.8} height={3.4} rx={0.6} fill="#7d838a" {...o} strokeWidth={0.5} />
      </g>
      <Arm from={[5.6, -21.5]} to={[8.4, -15.4]} sleeve="#b89a6a" />
    </g>
  )
}

function Rider({ look }: { look: UnitLook }) {
  const { kind, tier, color, emblem, upgrades } = look
  const knight = kind === 'knight'
  const horse = knight ? (tier === 3 ? '#ece6da' : tier === 2 ? '#3b2a20' : '#7a4a2a') : tier === 3 ? '#4a3427' : '#a5713f'
  const hoof = '#231812'
  const barding = upgrades >= 1 || (knight && tier === 3)
  const goldWeapon = upgrades >= 2
  const cape = upgrades >= 3 || tier === 3
  const armor = knight ? (tier >= 2 ? 'plate' : 'mail') : tier >= 2 ? 'mail' : undefined
  const mane = shade(horse, -0.45)
  return (
    <g>
      <Shadow rx={16} />
      {/* pattes arrière-plan */}
      <rect x={-10.6} y={-12} width={2.6} height={11.4} fill={shade(horse, -0.25)} {...o} />
      <rect x={6.8} y={-12} width={2.6} height={11.4} fill={shade(horse, -0.25)} {...o} />
      {/* queue */}
      <path d="M-12,-18 C-17,-16 -17,-8 -15,-4 C-14,-9 -13,-13 -10.6,-15Z" fill={mane} {...o} />
      {/* corps */}
      <ellipse cx={0} cy={-15.6} rx={12.6} ry={6.6} fill={horse} {...o} />
      <path d="M-11,-12 C-4,-8.6 6,-8.6 11.6,-12.6 C8,-10 -4,-9.4 -11,-12Z" fill="#000" opacity={0.18} />
      {/* encolure + tête */}
      <path d="M7,-19 C9,-25 11,-29 14,-31 C16.6,-31.6 21,-27.6 21.6,-25 C21,-23.6 19.4,-23.4 18,-24.4 C16,-23 14,-20 12.4,-15 Z" fill={horse} {...o} />
      <path d="M8.6,-20.6 C10,-26 12,-29.6 14.4,-31.4 L13,-32.8 C10,-31 7.6,-26 6.6,-21Z" fill={mane} />
      <path d="M14.6,-32 l0.6,-3 l1.6,2.6Z" fill={horse} {...o} strokeWidth={0.5} />
      <circle cx={16.6} cy={-28.4} r={0.6} fill={OUTLINE} />
      {barding && (
        <g>
          <path d="M-12.6,-17 C-12,-23 12,-23 12.8,-17 L13.6,-9 C6,-6.6 -6,-6.6 -13.4,-9 Z" fill={color} stroke={GOLD} strokeWidth={0.9} />
          <path d="M-12.6,-17 C-12,-23 12,-23 12.8,-17 L13.6,-9 C6,-6.6 -6,-6.6 -13.4,-9 Z" fill="none" {...o} strokeWidth={0.4} />
          <text x={-4} y={-11.4} fontSize={6} fontFamily="Cinzel, Georgia, serif" fontWeight={900} textAnchor="middle" fill="#f6ecd2">{emblem}</text>
          <path d="M14,-31 C16.6,-31.6 21,-27.6 21.6,-25 L18,-24.4 C17,-27 15.6,-29 13,-29.8Z" fill={STEEL} {...o} strokeWidth={0.5} />
        </g>
      )}
      {/* pattes avant-plan */}
      <rect x={-7.6} y={-11} width={2.8} height={10.4} fill={horse} {...o} />
      <rect x={9.6} y={-11} width={2.8} height={10.4} fill={horse} {...o} />
      <rect x={-7.8} y={-1.4} width={3.2} height={1.8} fill={hoof} />
      <rect x={9.4} y={-1.4} width={3.2} height={1.8} fill={hoof} />
      {/* selle */}
      <path d="M-5,-21.6 C-3,-23 3,-23 5,-21.6 L4,-19 L-4,-19Z" fill={LEATHER} {...o} strokeWidth={0.5} />
      {/* cavalier */}
      <g transform="translate(-0.6 -14)">
        {cape && <Cape color={color} long={false} />}
        <rect x={0} y={-12} width={3.2} height={9} rx={1} fill={armor === 'plate' ? STEEL : '#4a3a2c'} {...o} />
        <Body tunic={tier === 1 ? color : shade(color, -0.12)} armor={armor} legs={false} tabard={tier === 3 ? color : undefined} trim={upgrades >= 1 ? GOLD : undefined} />
        <Head beard={tier === 2 && !knight} />
        <Helmet style={knight ? (tier === 3 ? 'great' : 'nasal') : tier === 1 ? 'cap' : 'kettle'} plume={tier === 3 ? shade(color, 0.15) : undefined} />
        {knight ? (
          <g>
            <line x1={-10} y1={-12} x2={24} y2={-30} stroke={OUTLINE} strokeWidth={2.4} strokeLinecap="round" />
            <line x1={-10} y1={-12} x2={24} y2={-30} stroke={goldWeapon ? GOLD : '#c9b48a'} strokeWidth={1.4} strokeLinecap="round" />
            <path d="M24,-30 L28.4,-33 L25,-28Z" fill={STEEL_LIGHT} {...o} strokeWidth={0.4} />
            <path d="M19,-27.4 L24,-21 L16,-24 Z" fill={color} {...o} strokeWidth={0.4} className="flutter" />
            <Arm from={[5.6, -21.5]} to={[7, -16.4]} sleeve={armor ? STEEL : color} />
          </g>
        ) : (
          <g>
            <Sword x={8.4} y={-17} gold={goldWeapon} />
            <Arm from={[5.6, -21.5]} to={[8.4, -17]} sleeve={armor ? STEEL : color} />
          </g>
        )}
      </g>
    </g>
  )
}

function Wheel({ x, y, r = 4.4 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={shade(WOOD, -0.2)} {...o} />
      <circle cx={x} cy={y} r={r * 0.32} fill={STEEL} />
      <path d={`M${x - r},${y} h${2 * r} M${x},${y - r} v${2 * r}`} stroke={shade(WOOD, -0.45)} strokeWidth={0.7} />
    </g>
  )
}

function Siege({ look }: { look: UnitLook }) {
  const { color, name, upgrades, emblem } = look
  const iron = upgrades >= 1
  const fire = upgrades >= 2
  const plank = WOOD
  const band = iron ? '#4a4f55' : shade(WOOD, -0.35)
  const flag = (x: number, y: number) => (
    <g>
      <line x1={x} y1={y} x2={x} y2={y - 12} stroke={OUTLINE} strokeWidth={1} />
      <path d={`M${x},${y - 12} l8,2.4 l-8,2.6Z`} fill={color} {...o} strokeWidth={0.4} className="flutter" />
    </g>
  )

  if (name.includes('Bélier')) {
    return (
      <g>
        <Shadow rx={20} />
        <path d="M-16,-6 L14,-6 L18,-10 L-12,-10Z" fill={shade(plank, -0.2)} {...o} />
        <path d="M-14,-10 L0,-26 L16,-10Z" fill={plank} {...o} />
        <path d="M0,-26 L16,-10 L18,-10 L3,-27Z" fill={shade(plank, -0.3)} {...o} />
        <path d="M-10,-12 L0,-23 L10,-12Z" fill={color} opacity={0.85} />
        <text x={0} y={-13.6} fontSize={6} textAnchor="middle" fontFamily="Cinzel, Georgia, serif" fontWeight={900} fill="#f6ecd2">{emblem}</text>
        <rect x={12} y={-14} width={14} height={4} rx={1.6} fill={shade(plank, 0.1)} {...o} />
        <path d="M24,-15 L29,-14 L29,-10 L24,-9Z" fill={iron ? STEEL : '#6d6d6d'} {...o} />
        <Wheel x={-10} y={-4} />
        <Wheel x={10} y={-4} />
        {flag(-2, -26)}
      </g>
    )
  }

  if (name.includes('Trébuchet')) {
    return (
      <g>
        <Shadow rx={24} />
        <rect x={-20} y={-8} width={40} height={4} fill={shade(plank, -0.15)} {...o} />
        <Wheel x={-15} y={-3} r={3.6} />
        <Wheel x={15} y={-3} r={3.6} />
        <path d="M-12,-8 L-2,-44 L0,-44 L-8,-8Z" fill={plank} {...o} />
        <path d="M12,-8 L2,-44 L0,-44 L8,-8Z" fill={shade(plank, -0.2)} {...o} />
        <rect x={-6} y={-26} width={12} height={2} fill={band} />
        <g className="sway">
          <line x1={-24} y1={-62} x2={14} y2={-34} stroke={OUTLINE} strokeWidth={3.6} strokeLinecap="round" />
          <line x1={-24} y1={-62} x2={14} y2={-34} stroke={shade(plank, 0.15)} strokeWidth={2.4} strokeLinecap="round" />
          <rect x={10} y={-34} width={10} height={10} fill={iron ? '#5c636a' : shade(plank, -0.3)} {...o} />
          <path d="M-24,-62 Q-28,-50 -22,-42" stroke="#d8c9a3" strokeWidth={0.7} fill="none" />
          <circle cx={-22} cy={-41} r={2.4} fill={fire ? '#ff8a2a' : '#8c8c8c'} {...o} strokeWidth={0.5} />
          {fire && <circle cx={-22} cy={-41} r={4.6} fill="#ffb347" opacity={0.4} className="glow" />}
        </g>
        <circle cx={0} cy={-44} r={1.8} fill={STEEL} {...o} />
        {flag(-18, -8)}
      </g>
    )
  }

  // Mangonneau / Onagre
  const big = name.includes('Onagre')
  return (
    <g>
      <Shadow rx={18} />
      <path d="M-15,-6 L15,-6 L15,-11 L-15,-11Z" fill={shade(plank, -0.15)} {...o} />
      <path d="M-11,-11 L-6,-24 L-3,-24 L-6,-11Z" fill={plank} {...o} />
      <path d="M7,-11 L2,-24 L-1,-24 L3,-11Z" fill={shade(plank, -0.2)} {...o} />
      <rect x={-8} y={-25} width={12} height={2.4} fill={band} {...o} strokeWidth={0.5} />
      <g className="sway">
        <line x1={10} y1={-10} x2={-14} y2={big ? -34 : -30} stroke={OUTLINE} strokeWidth={3.2} strokeLinecap="round" />
        <line x1={10} y1={-10} x2={-14} y2={big ? -34 : -30} stroke={shade(plank, 0.15)} strokeWidth={2} strokeLinecap="round" />
        <path d={`M-18,${big ? -38 : -34} q4,-2 7,2 q-2,4 -7,2z`} fill={shade(plank, -0.3)} {...o} strokeWidth={0.5} />
        <circle cx={-15} cy={big ? -37.6 : -33.6} r={2.2} fill={fire ? '#ff8a2a' : '#8c8c8c'} {...o} strokeWidth={0.4} />
        {fire && <circle cx={-15} cy={big ? -37.6 : -33.6} r={4.4} fill="#ffb347" opacity={0.4} className="glow" />}
      </g>
      <Wheel x={-11} y={-4} />
      <Wheel x={11} y={-4} />
      <rect x={-4} y={-10.6} width={8} height={4} fill={color} {...o} strokeWidth={0.4} />
      {flag(13, -11)}
    </g>
  )
}

/** Motif de cotte de mailles, à déclarer une fois par SVG. */
export function SpriteDefs() {
  return (
    <defs>
      <pattern id="mail" width={2} height={2} patternUnits="userSpaceOnUse">
        <rect width={2} height={2} fill="#8d969e" />
        <circle cx={1} cy={1} r={0.62} fill="none" stroke="#c9d0d6" strokeWidth={0.45} />
      </pattern>
    </defs>
  )
}
