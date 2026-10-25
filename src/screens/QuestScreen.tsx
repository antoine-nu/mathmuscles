// La quête du savoir : choix des chapitres, puis la carte de campagne en trois étapes (caserne, hôtel de ville,
// monastère), puis le bilan.
import { useState } from 'react'
import { SUBJECTS, type Level } from '../data/curriculum'
import { audio } from '../audio/engine'
import { availableSubjects, loadChosen } from '../game/selection'
import { ExerciseModal, type ScrollResult } from '../components/ExerciseModal'
import { MuteButton } from '../components/MuteButton'
import { Banner, Building, TownCenter } from '../components/Buildings'
import { Oak, Pine, Rocks, Bush } from '../components/Scenery'
import { SpriteDefs, UnitSprite } from '../components/UnitSprite'
import {
  STAGES, buildQuest, loadQuest, maxGlory, questRank, recordQuest, saveQuest, stageOf, stageSize, type StageId, type Trial,
} from '../quest/quest'

const BLUE = '#2f5fb3'

type Phase = { name: 'setup' } | { name: 'quest'; trials: Trial[]; key: number }

export function QuestScreen({ level, onQuit }: { level: Level; onQuit: () => void }) {
  const [chosen, setChosen] = useState<string[]>(() => {
    const ok = new Set(availableSubjects(level.id).map((s) => s.id))
    const saved = loadQuest(level.id).chosen.filter((id) => ok.has(id))
    return saved.length ? saved : loadChosen(level.id).slice(0, 1)
  })
  const [phase, setPhase] = useState<Phase>({ name: 'setup' })
  const start = () => {
    saveQuest(level.id, { ...loadQuest(level.id), chosen })
    audio.unlock()
    audio.play('calm')
    setPhase({ name: 'quest', trials: buildQuest(level.id, chosen), key: Date.now() })
  }
  if (phase.name === 'quest') {
    return <Quest key={phase.key} level={level} chapters={chosen} trials={phase.trials} onAgain={start}
      onSetup={() => setPhase({ name: 'setup' })} onQuit={() => { audio.play(null); onQuit() }} />
  }
  return <Setup level={level} chosen={chosen} onChange={setChosen} onStart={start} onQuit={onQuit} />
}

// ── Choix des chapitres ────────────────────────────────────────────────
function Setup({ level, chosen, onChange, onStart, onQuit }: { level: Level; chosen: string[]; onChange: (c: string[]) => void; onStart: () => void; onQuit: () => void }) {
  const subjects = availableSubjects(level.id)
  const domains = [...new Set(subjects.map((s) => s.domain))]
  const best = loadQuest(level.id).best
  const toggle = (id: string) => onChange(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id])
  return (
    <div className="level-select options quest-setup">
      <div className="opt-inner">
        <header className="opt-head">
          <button className="hud-back" data-sfx="close" onClick={onQuit}>◀ Accueil</button>
          <div>
            <div className="eyebrow">Entraînement · {level.label}</div>
            <h1>La quête du savoir</h1>
          </div>
        </header>
        <p className="opt-intro">
          Choisis un ou plusieurs chapitres, puis pars en quête : <b>10 exercices</b> à la caserne pour t’échauffer,
          <b> 5 missions</b> à l’hôtel de ville pour mettre le cours en situation, et <b>2 défis</b> au monastère
          pour aller un peu plus loin. Chaque bonne réponse rapporte de la gloire.
        </p>
        <div className="qs-stages">
          {STAGES.map((s, i) => (
            <div key={s.id} className="qs-stage">
              <span className="qs-stage-icon">{s.icon}</span>
              <b>{i + 1} · {s.place}</b>
              <small>{s.text}</small>
            </div>
          ))}
        </div>
        {domains.map((d) => (
          <section key={d} className="opt-domain">
            <h2>{d}</h2>
            <div className="opt-list">
              {subjects.filter((s) => s.domain === d).map((s) => {
                const on = chosen.includes(s.id)
                return (
                  <button key={s.id} data-sfx={on ? 'click' : 'select'} className={`opt-row ${on ? 'selected' : ''}`} aria-pressed={on} onClick={() => toggle(s.id)}>
                    <span className="opt-emblem">{s.emblem}</span>
                    <span className="opt-text">
                      <b>{s.title}</b>
                      <small>{s.topics.join(' · ')}</small>
                    </span>
                    {best[s.id] !== undefined && <span className="qs-best" title="Meilleure quête avec ce chapitre">{questRank(best[s.id] / 100).icon} {best[s.id]} %</span>}
                    <span className="opt-mark" aria-hidden>{on ? '⚔' : ''}</span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
      <footer className="opt-bar">
        <div className={`opt-count ${chosen.length ? 'ok' : ''}`}>
          <b>{chosen.length ? `${chosen.length} chapitre${chosen.length > 1 ? 's' : ''}` : 'Aucun chapitre'}</b>
          <small>{chosen.length ? chosen.map((id) => SUBJECTS.get(id)?.title).join(' · ') : 'choisis au moins un chapitre'}</small>
        </div>
        <button className="btn gold big" disabled={!chosen.length} onClick={onStart}>Partir en quête ⚑</button>
      </footer>
    </div>
  )
}

// ── La quête ───────────────────────────────────────────────────────────
interface QuestProps { level: Level; chapters: string[]; trials: Trial[]; onAgain: () => void; onSetup: () => void; onQuit: () => void }

function Quest({ level, chapters, trials, onAgain, onSetup, onQuit }: QuestProps) {
  // résultats de chaque épreuve terminée (dans l'ordre)
  const [done, setDone] = useState<boolean[][]>([])
  const [open, setOpen] = useState(false)
  const current = done.length < trials.length ? trials[done.length] : null
  const finished = !current
  const glory = done.reduce((s, r, i) => s + r.filter(Boolean).length * stageOf(trials[i].stage).glory, 0)
  const max = maxGlory(trials)
  const ratio = glory / max
  const rank = questRank(ratio)
  const stageIndex = current ? STAGES.findIndex((s) => s.id === current.stage) : STAGES.length

  /** Réussites d'une étape, exercice par exercice (undefined : pas encore joué). */
  const marks = (id: StageId) => {
    const out: (boolean | undefined)[] = []
    trials.forEach((t, i) => {
      if (t.stage !== id) return
      t.exercises.forEach((_, j) => out.push(done[i]?.[j]))
    })
    return out
  }

  const close = (r: ScrollResult | null) => {
    setOpen(false)
    if (!r || !current) return
    const results = r.results ?? current.exercises.map((_, i) => i < r.correct)
    const next = [...done, results]
    setDone(next)
    const nextTrial = trials[next.length]
    if (!nextTrial) {
      const total = next.reduce((s, res, i) => s + res.filter(Boolean).length * stageOf(trials[i].stage).glory, 0)
      recordQuest(level.id, chapters, Math.round((total / max) * 100))
      audio.play(null)
      window.setTimeout(() => audio.fanfare(total / max >= 0.4), 300)
    } else if (nextTrial.stage !== current.stage) {
      audio.battleHorn(true)
    }
  }

  const chapterTitle = (id: string) => SUBJECTS.get(id)?.title ?? id
  const stage = current ? stageOf(current.stage) : null

  return (
    <div className="quest">
      <header className="siege-hud quest-hud">
        <button className="hud-back" data-sfx="close" onClick={onQuit}>◀ Quitter</button>
        <div className="qh-title">
          <b>La quête du savoir</b>
          <small>{chapters.map(chapterTitle).join(' · ')}</small>
        </div>
        <div className="qh-glory" title="Gloire gagnée"><b>{glory}</b><small>/ {max} gloire</small></div>
        <MuteButton />
      </header>

      <div className="quest-map">
        <CampaignMap stageIndex={stageIndex} />
      </div>

      <div className="quest-stages">
        {STAGES.map((s, i) => {
          const m = marks(s.id)
          const state = i < stageIndex ? 'done' : i === stageIndex ? 'current' : 'locked'
          return (
            <div key={s.id} className={`quest-stage ${state}`}>
              <div className="qst-head">
                <span className="qst-icon">{s.icon}</span>
                <div>
                  <b>{s.place}</b>
                  <small>{s.name} · {s.text}</small>
                </div>
                <span className="qst-count">{m.filter((x) => x !== undefined).length} / {stageSize(trials, s.id)}</span>
              </div>
              <div className="qst-pips">
                {m.map((x, j) => <span key={j} className={`qst-pip ${x === undefined ? '' : x ? 'ok' : 'ko'}`} />)}
              </div>
              {state === 'current' && current && (
                <button className="btn gold" data-sfx="open" onClick={() => setOpen(true)}>
                  {current.exercises.length > 1 ? `▶ ${current.label}` : `▶ ${current.label} : ${chapterTitle(current.chapterIds[0])}`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {open && current && stage && (
        <ExerciseModal
          eyebrow={`${stage.place} · ${stage.name}`}
          heading={current.chapterIds.map(chapterTitle).join(' · ')}
          exercises={current.exercises}
          tierLabel={current.exercises.length > 1 ? current.label : `${stage.glory} gloire`}
          summary={(c, n) => (
            <p>{n > 1 ? `${c} bonne${c > 1 ? 's' : ''} réponse${c > 1 ? 's' : ''} sur ${n}` : c ? 'Mission accomplie !' : 'Ce sera pour la prochaine fois.'} · +{c * stage.glory} gloire</p>
          )}
          doneLabel="Reprendre la route"
          onClose={close}
        />
      )}

      {finished && (
        <div className="siege-end">
          <div className="be-card">
            <div className="be-title">{rank.icon} {rank.name}</div>
            <p>Quête accomplie : <b>{glory}</b> gloire sur {max} ({Math.round(ratio * 100)} %).</p>
            <div className="qe-stages">
              {STAGES.map((s) => {
                const m = marks(s.id)
                return <span key={s.id}>{s.icon} {s.place} : <b>{m.filter(Boolean).length} / {m.length}</b></span>
              })}
            </div>
            <div className="be-actions">
              <button className="btn gold" onClick={onAgain}>Nouvelle quête</button>
              <button className="btn gold" onClick={onSetup}>Changer de chapitres</button>
              <button className="btn gold" onClick={onQuit}>Accueil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Carte de campagne ──────────────────────────────────────────────────
const SPOTS = [{ x: 170, y: 210 }, { x: 480, y: 190 }, { x: 790, y: 205 }]

function CampaignMap({ stageIndex }: { stageIndex: number }) {
  // le chevalier attend devant l'étape en cours (ou au monastère à la fin)
  const at = SPOTS[Math.min(stageIndex, SPOTS.length - 1)]
  return (
    <svg viewBox="0 0 960 300" preserveAspectRatio="xMidYMax slice" role="img" aria-label="Carte de la quête">
      <SpriteDefs />
      <defs>
        <linearGradient id="qm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9cc4dc" />
          <stop offset="1" stopColor="#d8e6d0" />
        </linearGradient>
        <linearGradient id="qm-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fb35a" />
          <stop offset="1" stopColor="#5f8a3a" />
        </linearGradient>
      </defs>
      <rect width={960} height={300} fill="url(#qm-sky)" />
      <path d="M0,120 Q120,70 260,110 T540,95 T820,105 T960,90 L960,300 L0,300 Z" fill="#7d9a5a" opacity={0.6} />
      <path d="M0,140 Q200,110 420,135 T960,125 L960,300 L0,300 Z" fill="url(#qm-grass)" />
      {/* la route */}
      <path d="M40,250 C120,240 140,225 170,222 S330,250 480,205 S660,240 790,218 S900,200 940,205" fill="none" stroke="#c9a66b" strokeWidth={16} strokeLinecap="round" opacity={0.85} />
      <path d="M40,250 C120,240 140,225 170,222 S330,250 480,205 S660,240 790,218 S900,200 940,205" fill="none" stroke="#e4c88e" strokeWidth={3} strokeDasharray="10 12" />
      <Pine x={60} y={170} s={0.8} />
      <Pine x={90} y={182} s={0.7} />
      <Oak x={320} y={175} s={0.8} />
      <Bush x={355} y={250} />
      <Rocks x={620} y={250} />
      <Oak x={640} y={168} s={0.75} />
      <Pine x={905} y={168} s={0.8} />
      <Bush x={260} y={262} />
      {/* les trois étapes */}
      <g transform="translate(170 205) scale(0.62)"><Building kind="barracks" x={0} y={0} /></g>
      <g transform="translate(480 185) scale(0.42)"><TownCenter x={0} y={0} color={BLUE} age={1} /></g>
      <g transform="translate(790 200) scale(0.62)"><Building kind="monastery" x={0} y={0} /></g>
      {SPOTS.map((s, i) => (
        <g key={i}>
          {i < stageIndex && <Banner x={s.x + 46} y={s.y - 24} color={BLUE} emblem="✓" height={34} />}
          <g transform={`translate(${s.x} ${s.y + 52})`} className={`qm-label ${i === stageIndex ? 'current' : i < stageIndex ? 'done' : ''}`}>
            <rect x={-82} y={-14} width={164} height={26} rx={6} />
            <text y={4}>{STAGES[i].icon} {STAGES[i].place}</text>
          </g>
        </g>
      ))}
      <g transform={`translate(${at.x - 58} ${at.y + 30}) scale(1.4)`} className="qm-hero">
        <UnitSprite look={{ kind: 'knight', tier: 2, color: BLUE, emblem: '∑', name: '', upgrades: 0 }} />
      </g>
    </svg>
  )
}
