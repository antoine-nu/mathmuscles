import { useEffect, useRef, useState, type ReactNode } from 'react'
import { TIER_PER_LEVEL, armySize, levelFromPoints, maxPoints, pointsToNextRecruit, unitName, type Chapter } from '../data/curriculum'
import type { Exercise } from '../exercises/utils'
import { FigureView } from './FigureView'
import { MathText } from './MathText'
import { audio } from '../audio/engine'

export { MathText }

export interface ScrollResult {
  correct: number
  answered: number
}

interface Props {
  eyebrow: string
  heading: string
  exercises: Exercise[]
  /** Indication de difficulté (palier, points…), affichée à droite du numéro. */
  tierLabel?: ReactNode
  /** Horodatage de fin de partie : le parchemin se referme alors tout seul en comptant les réponses données. */
  deadline?: number
  /** Bilan affiché à la fin. */
  summary: (correct: number, total: number) => ReactNode
  /** null = abandon (fermé avant la fin). */
  onClose: (result: ScrollResult | null) => void
}

type Phase = 'question' | 'feedback' | 'done'

/** Parchemin d'exercices : une série de 5 ou un problème unique (titre, figure). */
export function ExerciseModal({ eyebrow, heading, exercises, tierLabel, deadline, summary, onClose }: Props) {
  const [index, setIndex] = useState(0)
  const [value, setValue] = useState('')
  const [results, setResults] = useState<boolean[]>([])
  const [phase, setPhase] = useState<Phase>('question')
  const [warning, setWarning] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const ex = exercises[index]
  const correct = results.filter(Boolean).length
  const single = exercises.length === 1

  useEffect(() => {
    if (phase === 'question') inputRef.current?.focus()
  }, [phase, index])

  // Fin du temps : on referme en comptant ce qui a été répondu.
  const latest = useRef({ correct, answered: results.length })
  latest.current = { correct, answered: results.length }
  useEffect(() => {
    if (!deadline) return
    const t = window.setTimeout(() => onClose(latest.current), Math.max(0, deadline - Date.now()))
    return () => window.clearTimeout(t)
  }, [deadline, onClose])

  const submit = (answer: string) => {
    if (phase !== 'question' || !answer.trim()) return
    if (ex.isValid && !ex.isValid(answer)) {
      audio.ui('click')
      setWarning(`Je n'arrive pas à lire cette réponse. Écris ${ex.format ?? 'ta réponse autrement'}.`)
      inputRef.current?.focus()
      return
    }
    setWarning(null)
    setValue(answer)
    const ok = ex.check(answer)
    if (ok) audio.correct()
    else audio.wrong()
    setResults((r) => [...r, ok])
    setPhase('feedback')
  }

  const next = () => {
    if (index + 1 < exercises.length) {
      setIndex(index + 1)
      setValue('')
      setWarning(null)
      setPhase('question')
    } else {
      if (correct > 0) audio.success()
      setPhase('done')
    }
  }

  // Outil de test en développement uniquement (scripts de capture) : réponse attendue de la question courante.
  if (import.meta.env.DEV) (window as unknown as { __mmAnswer?: string }).__mmAnswer = ex?.answer

  const lastOk = results[index]
  const diagnosis = phase === 'feedback' && !lastOk ? ex.diagnose?.(value) : undefined

  /** Insère un symbole du clavier à la position du curseur. */
  const insert = (sym: string) => {
    const el = inputRef.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    setValue(value.slice(0, start) + sym + value.slice(end))
    setWarning(null)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + sym.length, start + sym.length)
    })
  }

  return (
    <div className="modal-backdrop" onKeyDown={(e) => { if (e.key === 'Enter' && phase === 'feedback') next() }}>
      <div className={`scroll ${single ? 'wide' : ''}`} role="dialog" aria-label={heading}>
        <div className="scroll-rod top" />
        <div className="scroll-body">
          <header className="scroll-head">
            <div>
              <div className="eyebrow">{eyebrow}</div>
              <h2>{heading}</h2>
            </div>
            <button className="close" onClick={() => onClose(phase === 'done' ? { correct, answered: results.length } : null)} aria-label="Fermer">✕</button>
          </header>

          {!single && (
            <div className="pips">
              {exercises.map((_, i) => (
                <span key={i} className={`pip ${i < results.length ? (results[i] ? 'ok' : 'ko') : i === index && phase !== 'done' ? 'current' : ''}`} />
              ))}
            </div>
          )}

          {phase !== 'done' && ex && (
            <div className="question">
              <div className="q-num">
                {single ? (ex.title ? <span className="q-title">{ex.title}</span> : 'Problème') : <>Exercice {index + 1} / {exercises.length}</>}
                {tierLabel && <span className="q-tier">{tierLabel}</span>}
              </div>
              <p className="q-text"><MathText text={ex.prompt} /></p>
              {ex.figure && <FigureView figure={ex.figure} />}

              {ex.kind === 'input' && (
                <form className="answer-row" onSubmit={(e) => { e.preventDefault(); submit(value) }}>
                  <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => { setValue(e.target.value); setWarning(null) }}
                    disabled={phase !== 'question'}
                    placeholder={ex.inputHint ?? 'Ta réponse'}
                    inputMode="text"
                    autoComplete="off"
                    aria-label="Ta réponse"
                  />
                  {phase === 'question' && <button className="btn gold" type="submit" data-sfx="none">Valider</button>}
                </form>
              )}
              {ex.kind === 'input' && phase === 'question' && ex.keypad && (
                <div className="keypad" aria-label="Symboles">
                  {ex.keypad.map((k) => (
                    <button key={k} type="button" data-sfx="key" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(k)}>{k}</button>
                  ))}
                </div>
              )}
              {warning && <div className="warning" role="alert">{warning}</div>}
              {ex.kind === 'choice' && (
                <div className="choices">
                  {ex.choices!.map((c) => {
                    const state = phase === 'feedback' ? (c === ex.answer ? 'right' : c === value ? 'wrong' : 'dim') : ''
                    return (
                      <button key={c} data-sfx="none" className={`choice ${state}`} disabled={phase !== 'question'} onClick={() => submit(c)}>
                        <MathText text={c} />
                      </button>
                    )
                  })}
                </div>
              )}

              {phase === 'feedback' && (
                <div className={`feedback ${lastOk ? 'ok' : 'ko'}`}>
                  <strong>{lastOk ? 'Touché ! ⚔' : 'Raté…'}</strong>
                  {!lastOk && <span> Réponse attendue : <b><MathText text={ex.answer} /></b>.</span>}
                  {diagnosis && <div className="diag">{diagnosis}</div>}
                  {ex.explanation && <div className="expl"><MathText text={ex.explanation} /></div>}
                  <button className="btn gold" onClick={next} autoFocus>
                    {index + 1 < exercises.length ? 'Suivant →' : single ? 'Continuer' : 'Voir le bilan'}
                  </button>
                </div>
              )}
            </div>
          )}

          {phase === 'done' && (
            <div className="summary">
              {!single && <div className="score">{correct}<small>/{exercises.length}</small></div>}
              {summary(correct, exercises.length)}
              <div className="summary-actions">
                <button className="btn gold" data-sfx="close" onClick={() => onClose({ correct, answered: results.length })} autoFocus>Retour au camp</button>
              </div>
            </div>
          )}
        </div>
        <div className="scroll-rod bottom" />
      </div>
    </div>
  )
}

/** Bilan de recrutement : nouvelles recrues, cran atteint, nouveau rang. */
export function Recruits({ chapter, before, after, ppc }: { chapter: Chapter; before: number; after: number; ppc: number }) {
  const capped = Math.min(maxPoints(ppc), after)
  const recruits = armySize(capped, ppc) - armySize(before, ppc)
  const levelBefore = levelFromPoints(before, ppc)
  const levelAfter = levelFromPoints(capped, ppc)
  const tierAfter = TIER_PER_LEVEL[levelAfter]
  const promoted = tierAfter > TIER_PER_LEVEL[levelBefore]
  const next = pointsToNextRecruit(capped, ppc)
  if (capped === before) {
    return <p>{before >= maxPoints(ppc) ? 'Ton corps est déjà au complet : place aux améliorations !' : 'Aucune recrue cette fois… les forgerons t’attendent pour une revanche.'}</p>
  }
  return (
    <div className="recruits">
      <p>
        <b>+{capped - before} point{capped - before > 1 ? 's' : ''}</b> d’entraînement.{' '}
        {recruits > 0
          ? <>Le corps « {chapter.corpsName} » accueille <b>{recruits} recrue{recruits > 1 ? 's' : ''}</b> : il compte maintenant <b>{armySize(capped, ppc)} soldats</b>.</>
          : next > 0 ? <>Encore {next} bonne{next > 1 ? 's' : ''} réponse{next > 1 ? 's' : ''} pour la prochaine recrue.</> : null}
      </p>
      {levelAfter > levelBefore && (
        <p className="levelup">
          Cran {levelAfter} atteint ! {promoted && <>Tes soldats passent au rang de <b>{unitName(chapter, tierAfter)}</b>. </>}
          Les prochains exercices seront plus difficiles.
        </p>
      )}
    </div>
  )
}
