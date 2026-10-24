// Petites icônes de caractéristiques, dessinées en SVG (nettes à toutes les tailles).
export type StatKind = 'hp' | 'attack' | 'armor' | 'pierce' | 'range' | 'speed' | 'reload' | 'cost' | 'convert' | 'splash'

const OUT = '#1c130c'

export function StatIcon({ kind, size = 18 }: { kind: StatKind; size?: number }) {
  return (
    <svg className="stat-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {kind === 'hp' && <path d="M12 21 C5 15 2.5 11.5 2.5 8 A4.6 4.6 0 0 1 12 5.6 A4.6 4.6 0 0 1 21.5 8 C21.5 11.5 19 15 12 21Z" fill="#d6403a" stroke={OUT} strokeWidth={1.2} />}
      {kind === 'attack' && (
        <g stroke={OUT} strokeWidth={1.1} strokeLinejoin="round">
          <path d="M14.5 2.5 L21.5 2.5 L21.5 9.5 L10 21 L7 18 L3 21 L3 17 L6 13.5 L3 10.5 Z" fill="none" stroke="none" />
          <path d="M21 3 L20.5 7.5 L10.5 17.5 L6.5 13.5 L16.5 3.5 Z" fill="#dfe5ea" />
          <path d="M5 12 L12 19" stroke="#c9a54a" strokeWidth={2.6} strokeLinecap="round" />
          <path d="M8.5 15.5 L3.5 20.5" stroke="#7a4a26" strokeWidth={2.6} strokeLinecap="round" />
        </g>
      )}
      {kind === 'armor' && <path d="M12 2.5 L20 5.5 V11 C20 16 16.5 19.5 12 21.5 C7.5 19.5 4 16 4 11 V5.5Z" fill="#8d969e" stroke={OUT} strokeWidth={1.2} />}
      {kind === 'pierce' && (
        <g stroke={OUT} strokeWidth={1}>
          <path d="M12 2.5 L20 5.5 V11 C20 16 16.5 19.5 12 21.5 C7.5 19.5 4 16 4 11 V5.5Z" fill="#7a4a26" />
          <path d="M3 21 L17 7 M17 7 l-4 0.5 M17 7 l-0.5 4" stroke="#efe6cf" strokeWidth={1.6} />
        </g>
      )}
      {kind === 'range' && (
        <g stroke={OUT} strokeWidth={1.1}>
          <circle cx="12" cy="12" r="9" fill="#efe2bd" />
          <circle cx="12" cy="12" r="6" fill="#d6403a" />
          <circle cx="12" cy="12" r="3" fill="#efe2bd" />
          <circle cx="12" cy="12" r="1.2" fill="#d6403a" stroke="none" />
        </g>
      )}
      {kind === 'speed' && (
        <g stroke={OUT} strokeWidth={1.1}>
          <path d="M5 4 C3 10 3.5 17 8 20.5 L10.5 18.5 C7.5 16 6.8 10.5 8.5 5 Z M19 4 C21 10 20.5 17 16 20.5 L13.5 18.5 C16.5 16 17.2 10.5 15.5 5 Z" fill="#a3acb5" />
          <circle cx="6.6" cy="9" r="0.8" fill={OUT} stroke="none" /><circle cx="6.9" cy="13.5" r="0.8" fill={OUT} stroke="none" />
          <circle cx="17.4" cy="9" r="0.8" fill={OUT} stroke="none" /><circle cx="17.1" cy="13.5" r="0.8" fill={OUT} stroke="none" />
        </g>
      )}
      {kind === 'reload' && (
        <g stroke={OUT} strokeWidth={1}>
          <path d="M6 3 H18 L13 12 L18 21 H6 L11 12Z" fill="#e9dcb4" />
          <path d="M8.5 19 H15.5 L12 15Z" fill="#c9a54a" stroke="none" />
        </g>
      )}
      {kind === 'cost' && (
        <g stroke={OUT} strokeWidth={1}>
          <circle cx="12" cy="8" r="4" fill="#eab88a" />
          <path d="M4 21 C4 14 20 14 20 21Z" fill="#2f5fb3" />
        </g>
      )}
      {kind === 'convert' && (
        <g stroke={OUT} strokeWidth={1}>
          <circle cx="12" cy="12" r="5" fill="#ffe08a" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="12" y1="12" x2={12 + Math.cos((a * Math.PI) / 180) * 10} y2={12 + Math.sin((a * Math.PI) / 180) * 10} stroke="#e2b43c" strokeWidth={1.6} />
          ))}
        </g>
      )}
      {kind === 'splash' && (
        <g stroke={OUT} strokeWidth={1}>
          <path d="M12 2 L14 9 L21 7 L16 12 L21 17 L14 15 L12 22 L10 15 L3 17 L8 12 L3 7 L10 9Z" fill="#ff9a3c" />
          <circle cx="12" cy="12" r="3" fill="#6f6a62" />
        </g>
      )}
    </svg>
  )
}
