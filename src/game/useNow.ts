import { useEffect, useState } from 'react'

/** Horloge qui se met à jour toutes les `interval` ms (comptes à rebours, temps d'attente). */
export function useNow(interval = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), interval)
    return () => window.clearInterval(t)
  }, [interval])
  return now
}
