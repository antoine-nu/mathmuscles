/** Petites icônes de ressources façon barre du haut d'AoE. */
export function ResIcon({ kind }: { kind: 'coin' | 'scroll' | 'anvil' | 'pop' }) {
  return (
    <svg className="res-ico" viewBox="0 0 24 24" aria-hidden>
      {kind === 'coin' && (
        <g stroke="#5a3d0a" strokeWidth={1}>
          <ellipse cx={13} cy={16} rx={8} ry={4} fill="#b8862a" />
          <ellipse cx={11} cy={12} rx={8} ry={4} fill="#d9a83a" />
          <ellipse cx={12} cy={8} rx={8} ry={4} fill="#f2cf5e" />
          <text x={12} y={10} fontSize={6} textAnchor="middle" fill="#7a5410" stroke="none" fontWeight={900}>∑</text>
        </g>
      )}
      {kind === 'scroll' && (
        <g stroke="#4a3220" strokeWidth={1}>
          <rect x={5} y={4} width={14} height={16} fill="#efe2bd" />
          <rect x={3} y={2} width={18} height={4} rx={2} fill="#c9a96a" />
          <rect x={3} y={18} width={18} height={4} rx={2} fill="#c9a96a" />
          <path d="M8,10 h8 M8,13 h6" stroke="#8a6a3c" />
        </g>
      )}
      {kind === 'anvil' && (
        <g stroke="#1c1c1c" strokeWidth={1}>
          <path d="M2,7 h16 l4,-2 v4 h-4 l-3,4 v3 h3 v4 h-14 v-4 h3 v-3 l-5,-4z" fill="#8d969e" />
          <path d="M3,8 h14" stroke="#dfe5ea" />
        </g>
      )}
      {kind === 'pop' && (
        <g stroke="#1c130c" strokeWidth={1}>
          <path d="M4,22 C4,14 20,14 20,22Z" fill="#2f5fb3" />
          <circle cx={12} cy={10} r={5} fill="#eab88a" />
          <path d="M6.6,10 C6.6,2 17.4,2 17.4,10Z" fill="#a3acb5" />
          <rect x={11.4} y={9} width={1.4} height={5} fill="#a3acb5" />
        </g>
      )}
    </svg>
  )
}
