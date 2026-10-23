import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  MAX_POINTS, SERIES_SIZE, TIER_PER_LEVEL, UPGRADE_THRESHOLD, armySize, levelFromPoints, pointsToNextRecruit, unitName,
  type Chapter, type Upgrade,
} from '../data/curriculum'
import { difficultyForLevel, makeSeries } from '../exercises'
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
      out.push(<span key={k++} className="mfrac"><span><MathText text={m[1]} /></span><span><MathText text={m[2]} /></span></span>)
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
  /** Points du corps avant la série (pour annoncer les recrues). */
  points: number
  /** correct = null si la série est abandonnée en cours de route. */
  onClose: (correct: number | null) => void
}

type Phase = 'question' | 'feedback' | 'done'

export function ExerciseModal({ chapter, level, upgrade, points, onClose }: Props) {
  const series = useMemo<Exercise[]>(() => makeSeries(chapter.id, level, !!upgrade), [chapter.id, level, upgrade])
  const [index, setIndex] = useState(0)
  const [value, setValue] = useState('')
  const [results, setResults] = useState<boolean[]>([])
  const [phase, setPhase] = useState<Phase>('question')
  const [warning, setWarning] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const difficulty = difficultyForLevel(level, !!upgrade)
  const ex = series[index]
  const correct = results.filter(Boolean).length

  useEffect(() => {
    if (phase === 'question') inputRef.current?.focus()
  }, [phase, index])

  const submit = (answer: string) => {
    if (phase !== 'question' || !answer.trim()) return
    if (ex.isValid && !ex.isValid(answer)) {
      setWarning(`Je n'arrive pas à lire cette réponse. Écris ${ex.format ?? 'ta réponse autrement'}.`)
      inputRef.current?.focus()
      return
    }
    setWarning(null)
    setValue(answer)
    setResults((r) => [...r, ex.check(answer)])
    setPhase('feedback')
  }

  const next = () => {
    if (index + 1 < series.length) {
      setIndex(index + 1)
      setValue('')
      setWarning(null)
      setPhase('question')
    } else {
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
    const next = value.slice(0, start) + sym + value.slice(end)
    setValue(next)
    setWarning(null)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + sym.length, start + sym.length)
    })
  }

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
            <button className="close" onClick={() => onClose(phase === 'done' ? correct : null)} aria-label="Fermer">✕</button>
          </header>

          <div className="pips">
            {Array.from({ length: SERIES_SIZE }, (_, i) => (
              <span key={i} className={`pip ${i < results.length ? (results[i] ? 'ok' : 'ko') : i === index && phase !== 'done' ? 'current' : ''}`} />
            ))}
          </div>

          {phase !== 'done' && ex && (
            <div className="question">
              <div className="q-num">
                Exercice {index + 1} / {series.length}
                <span className="q-tier" title="Palier de difficulté (il monte avec la jauge)">
                  Palier {difficulty} <span aria-hidden>{'★'.repeat(difficulty)}{'☆'.repeat(5 - difficulty)}</span>
                </span>
              </div>
              <p className="q-text"><MathText text={ex.prompt} /></p>

              {ex.kind === 'input' ? (
                <form className="answer-row" onSubmit={(e) => { e.preventDefault(); submit(value) }}>
                  <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => { setValue(e.target.value); setWarning(null) }}
                    disabled={phase !== 'question'}
                    placeholder={ex.inputHint ?? 'Ta réponse'}
                    inputMode="text"
                    autoComplete="off"
                  />
                  {phase === 'question' && <button className="btn gold" type="submit">Valider</button>}
                </form>
              ) : null}
              {ex.kind === 'input' && phase === 'question' && ex.keypad && (
                <div className="keypad" aria-label="Symboles">
                  {ex.keypad.map((k) => (
                    <button key={k} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(k)}>{k}</button>
                  ))}
                </div>
              )}
              {warning && <div className="warning" role="alert">{warning}</div>}
              {ex.kind === 'choice' && (
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
                  {diagnosis && <div className="diag">{diagnosis}</div>}
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
                <Recruits chapter={chapter} before={points} after={Math.min(MAX_POINTS, points + correct)} />
              )}
              <div className="summary-actions">
                <button className="btn gold" onClick={() => onClose(correct)} autoFocus>Retour au camp</button>
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
function Recruits({ chapter, before, after }: { chapter: Chapter; before: number; after: number }) {
  const recruits = armySize(after) - armySize(before)
  const levelBefore = levelFromPoints(before)
  const levelAfter = levelFromPoints(after)
  const tierAfter = TIER_PER_LEVEL[levelAfter]
  const promoted = tierAfter > TIER_PER_LEVEL[levelBefore]
  const next = pointsToNextRecruit(after)
  if (after === before) {
    return <p>Aucune recrue cette fois… les forgerons t’attendent pour une revanche.</p>
  }
  return (
    <div className="recruits">
      <p>
        <b>+{after - before} point{after - before > 1 ? 's' : ''}</b> d’entraînement.{' '}
        {recruits > 0
          ? <>Le corps « {chapter.corpsName} » accueille <b>{recruits} recrue{recruits > 1 ? 's' : ''}</b> : il compte maintenant <b>{armySize(after)} soldats</b>.</>
          : <>Encore {next} bonne{next > 1 ? 's' : ''} réponse{next > 1 ? 's' : ''} pour la prochaine recrue.</>}
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
