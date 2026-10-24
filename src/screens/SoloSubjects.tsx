import { useState } from 'react'
import type { Level } from '../data/curriculum'
import { normalizeSelection } from '../game/selection'
import { SubjectPicker } from '../components/SubjectPicker'
import { SetupFrame } from './DuelSetup'

/** Entraînement libre, première visite d'un niveau : choix des 7 sujets du village. */
export function SoloSubjects({ level, initial, onConfirm, onBack }: { level: Level; initial?: string[]; onConfirm: (selection: string[]) => void; onBack: () => void }) {
  const [selection, setSelection] = useState(() => normalizeSelection(level.id, initial))
  return (
    <SetupFrame title="Fonde ton village" subtitle={`${level.label} · entraînement libre`} onBack={onBack}>
      <SubjectPicker levelId={level.id} selection={selection} onChange={setSelection} />
      <button className="btn gold big" onClick={() => onConfirm(selection)}>Bâtir mon village ⚒</button>
      <p className="setup-note">Tu pourras changer de chapitres plus tard (bouton 📚 Sujets) : la progression de chaque chapitre est conservée.</p>
    </SetupFrame>
  )
}
