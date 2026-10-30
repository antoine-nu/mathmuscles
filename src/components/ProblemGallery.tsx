import { useState } from 'react'
import { DEFAULT_LEVEL, LEVELS, levelById } from '../data/curriculum'
import { AGE_PROBLEMS, TIERS, UPGRADE_PROBLEMS, hasContent } from '../exercises'
import type { Exercise, Maker } from '../exercises/utils'
import { MathText } from './ExerciseModal'
import { FigureView } from './FigureView'
import { KidIcon, PicView } from './PicView'

type Section = 'entrainement' | 'ameliorations' | 'hotel'

/** Page de relecture de tous les modèles d'exercices : /?problemes (option &chapitre=5e-geo). */
export function ProblemGallery() {
  const params = new URLSearchParams(location.search)
  const [chapterId, setChapterId] = useState(params.get('chapitre') ?? levelById(DEFAULT_LEVEL).chapters[0].id)
  const [section, setSection] = useState<Section>((params.get('section') as Section) ?? 'hotel')
  const [seed, setSeed] = useState(0)

  const groups: { label: string; pool: Maker[] }[] =
    section === 'entrainement'
      ? (TIERS[chapterId] ?? []).map((pool, i) => ({ label: `Palier ${i + 1}`, pool }))
      : ((section === 'ameliorations' ? UPGRADE_PROBLEMS : AGE_PROBLEMS)[chapterId] ?? []).map((pool, i) => ({
          label: section === 'ameliorations' ? `Amélioration ${i + 1}` : `Problème à ${i + 1} point${i ? 's' : ''}`,
          pool,
        }))

  return (
    <div className="problem-gallery">
      <h1>Relecture des exercices</h1>
      <div className="pg-controls">
        <select value={chapterId} onChange={(e) => setChapterId(e.target.value)} aria-label="Chapitre">
          {LEVELS.filter((l, i) => LEVELS.findIndex((m) => m.subjects === l.subjects) === i).map((l) => (
            <optgroup key={l.id} label={l.subjects[0].id.startsWith('T-') ? 'Terminale (adultes)' : l.label}>
              {l.subjects.map((c) => <option key={c.id} value={c.id} disabled={!hasContent(c.id)}>{c.title}{hasContent(c.id) ? '' : ' (à venir)'}</option>)}
            </optgroup>
          ))}
        </select>
        {(['entrainement', 'ameliorations', 'hotel'] as Section[]).map((s) => (
          <button key={s} className={section === s ? 'on' : ''} onClick={() => setSection(s)}>
            {s === 'entrainement' ? 'Entraînement' : s === 'ameliorations' ? 'Améliorations' : 'Hôtel de ville'}
          </button>
        ))}
        <button onClick={() => setSeed(seed + 1)}>Nouveaux tirages</button>
      </div>
      {groups.map((g) => (
        <section key={g.label + seed}>
          <h2>{g.label} <small>({g.pool.length} modèles)</small></h2>
          <div className="pg-grid">
            {g.pool.map((make, i) => <Card key={i} index={i} make={make} />)}
          </div>
        </section>
      ))}
    </div>
  )
}

function Card({ make, index }: { make: Maker; index: number }) {
  let ex: Exercise | null = null
  let error = ''
  try {
    ex = make()
  } catch (e) {
    error = (e as Error).message
  }
  return (
    <article className="pg-card">
      <div className="pg-index">#{index}</div>
      {error && <p className="pg-error">Erreur : {error}</p>}
      {ex && (
        <>
          {ex.title && <h3>{ex.title}</h3>}
          <p><MathText text={ex.prompt} /></p>
          {ex.code && <pre className="q-code"><code>{ex.code}</code></pre>}
          {ex.figure && <FigureView figure={ex.figure} />}
          {ex.kid && (
            <div className="pg-kid">
              <KidIcon icon={ex.kid.icon} />
              {ex.kid.scene && <div className={`kid-scene kid-scene-${ex.kid.scene.t}`}><PicView pic={ex.kid.scene} /></div>}
              <div className={`kid-choices n${ex.kid.options.length}`}>
                {ex.kid.options.map((p, i) => <div key={i} className={`kid-choice kid-choice-${p.t} ${String(i) === ex!.answer ? 'right' : ''}`}><PicView pic={p} /></div>)}
              </div>
            </div>
          )}
          {ex.choices && !ex.kid && <p className="pg-choices">Choix : {ex.choices.join(' · ')}</p>}
          <p className="pg-answer">⇒ <MathText text={ex.answer} /></p>
          {ex.explanation && <p className="pg-expl"><MathText text={ex.explanation} /></p>}
        </>
      )}
    </article>
  )
}
