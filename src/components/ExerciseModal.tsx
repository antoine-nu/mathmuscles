import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { SERIES_SIZE, UPGRADE_THRESHOLD, type Chapter, type Upgrade } from '../data/curriculum'
import { makeSeries } from '../exercises'
import type { Exercise } from '../exercises/utils'

/** Affiche la mini-syntaxe des énoncés : {a/b} fraction, ^n exposant, √{…} racine, x_B indice. */
export function MathText({ text }: { text: string }) {
  const out: ReactNode[] = []
  const re = /\{(-?[^{}/]+)\/([^{}/]+)\}|√\{([^}]+)\}|\^\{([^}]+)\}|\^(-?\d+|n)|_([A-Za-z])/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1] !== undefined) {
      out.push(<span key={k++} className="mfrac"><span>{m[1]}</span><span>{m[2]}</span></span>)
    } else if (m[3] !== undefined) {
      out.push(<span key={k++} className="msqrt">√<span>{m[3]}</span></span>)
    } else if (m[4] !== undefined || m[5] !== undefined) {
      out.push(<sup key={k++}>{m[4] ?? m[5]}</sup>)
    } else if (m[6] !== undefined) {
      out.push(<sub key={k++}>{m[6]}</sub>)
    }
    last = re.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}

interface Props {
  chapter: Chapter
  level: number
  /** Si défini : série d'élite pour débloquer cette amélioration. */
  upgrade?: Upgrade
  onClose: () => void
  onFinish: (correct: number) => void
}

type Phase = 'question' | 'feedback' | 'done'

export function ExerciseModal({ chapter, level, upgrade, onClose, onFinish }: Props) {
  const series = useMemo<Exercise[]>(() => makeSeries(chapter.id, level, !!upgrade), [chapter.id, level, upgrade])
  const [index, setIndex] = useState(0)
  const [value, setValue] = useState('')
  const [results, setResults] = useState<boolean[]>([])
  const [phase, setPhase] = useState<Phase>('question')
  const inputRef = useRef<HTMLInputElement>(null)
  const ex = series[index]
  const correct = results.filter(Boolean).length

  useEffect(() => {
    if (phase === 'question') inputRef.current?.focus()
  }, [phase, index])

  const submit = (answer: string) => {
    if (phase !== 'question' || !answer.trim()) return
    setValue(answer)
    setResults((r) => [...r, ex.check(answer)])
    setPhase('feedback')
  }

  const next = () => {
    if (index + 1 < series.length) {
      setIndex(index + 1)
      setValue('')
      setPhase('question')
    } else {
      setPhase('done')
      onFinish(correct)
    }
  }

  const lastOk = results[index]

  return (
    <div className="modal-backdrop" onKeyDown={(e) => { if (e.key === 'Enter' && phase === 'feedback') next() }}>
      <div className="scroll" role="dialog" aria-label="Série d'exercices">
        <div className="scroll-rod top" />
        <div className="scroll-body">
          <header className="scroll-head">
            <div>
              <div className="eyebrow">{upgrade ? `Amélioration · ${upgrade.name}` : `Entraînement · ${chapter.corpsName}`}</div>
              <h2>{chapter.title}</h2>
            </div>
            <button className="close" onClick={onClose} aria-label="Fermer">✕</button>
          </header>

          <div className="pips">
            {Array.from({ length: SERIES_SIZE }, (_, i) => (
              <span key={i} className={`pip ${i < results.length ? (results[i] ? 'ok' : 'ko') : i === index && phase !== 'done' ? 'current' : ''}`} />
            ))}
          </div>

          {phase !== 'done' && ex && (
            <div className="question">
              <div className="q-num">Exercice {index + 1} / {series.length}</div>
              <p className="q-text"><MathText text={ex.prompt} /></p>

              {ex.kind === 'input' ? (
                <form className="answer-row" onSubmit={(e) => { e.preventDefault(); submit(value) }}>
                  <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={phase !== 'question'}
                    placeholder={ex.inputHint ?? 'Ta réponse'}
                    inputMode="text"
                    autoComplete="off"
                  />
                  {phase === 'question' && <button className="btn gold" type="submit">Valider</button>}
                </form>
              ) : (
                <div className="choices">
                  {ex.choices!.map((c) => {
                    const state = phase === 'feedback' ? (c === ex.answer ? 'right' : c === value ? 'wrong' : 'dim') : ''
                    return (
                      <button key={c} className={`choice ${state}`} disabled={phase !== 'question'} onClick={() => submit(c)}>
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
                  {ex.explanation && <div className="expl"><MathText text={ex.explanation} /></div>}
                  <button className="btn gold" onClick={next} autoFocus>
                    {index + 1 < series.length ? 'Suivant →' : 'Voir le bilan'}
                  </button>
                </div>
              )}
            </div>
          )}

          {phase === 'done' && (
            <div className="summary">
              <div className="score">{correct}<small>/{series.length}</small></div>
              {upgrade ? (
                correct >= UPGRADE_THRESHOLD ? (
                  <p>Amélioration <b>{upgrade.name}</b> acquise ! {upgrade.description}</p>
                ) : (
                  <p>Il faut au moins {UPGRADE_THRESHOLD}/5 pour débloquer <b>{upgrade.name}</b>. Retente ta chance !</p>
                )
              ) : (
                <p>
                  {correct === 0
                    ? 'Aucune recrue cette fois… les forgerons t’attendent pour une revanche.'
                    : `+${correct} point${correct > 1 ? 's' : ''} d’entraînement pour ton corps de ${chapter.corpsName}.`}
                </p>
              )}
              <div className="summary-actions">
                <button className="btn gold" onClick={onClose}>Retour au camp</button>
              </div>
            </div>
          )}
        </div>
        <div className="scroll-rod bottom" />
      </div>
    </div>
  )
}
