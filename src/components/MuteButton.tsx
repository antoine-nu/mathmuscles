import { useMuted } from '../audio/engine'

/** Bouton de sourdine (musique et bruitages). */
export function MuteButton() {
  const [muted, toggle] = useMuted()
  return (
    <button className="hud-btn mute" onClick={toggle} aria-pressed={muted} title={muted ? 'Activer le son' : 'Couper le son'} aria-label={muted ? 'Activer le son' : 'Couper le son'}>
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
