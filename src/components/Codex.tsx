import { AGE_BONUS, LEVELS, type Chapter, type UnitKind } from '../data/curriculum'
import { COUNTERS, SPECIALS, UNIT_STATS, kindName } from '../battle/units'
import { Portrait } from './Portrait'
import { StatIcon, type StatKind } from './StatIcon'
import type { UnitLook } from './UnitSprite'

const MAX = { hp: 150, attack: 15, armor: 6, range: 20, speed: 1.8 }

function lookOf(c: Chapter, tier: number, color?: string): UnitLook {
  return { kind: c.unit, tier, color: color ?? c.color, emblem: c.emblem, name: c.tierNames[Math.max(0, tier - 1)], upgrades: 0 }
}

function Stat({ icon, label, value, ratio, text }: { icon: StatKind; label: string; value: string; ratio: number; text?: string }) {
  return (
    <div className="cx-stat" title={label}>
      <StatIcon kind={icon} />
      <span className="cx-label">{label}</span>
      <span className="cx-bar"><span style={{ width: `${Math.max(4, Math.min(100, ratio * 100))}%` }} /></span>
      <span className="cx-value">{value}{text && <small> {text}</small>}</span>
    </div>
  )
}

/**
 * Codex des armées : caractéristiques, forces et faiblesses de chaque unité de la classe, avec la maison
 * (le thème mathématique) qui la forme. Pour préparer sa stratégie avant et pendant la partie.
 */
export function Codex({ levelId, teamColor }: { levelId: string; teamColor?: string }) {
  const level = LEVELS.find((l) => l.id === levelId) ?? LEVELS[0]
  const chapterOf = (k: UnitKind) => level.chapters.find((c) => c.unit === k)!

  return (
    <div className="codex">
      <div className="cx-legend">
        <span><StatIcon kind="hp" size={16} /> points de vie</span>
        <span><StatIcon kind="attack" size={16} /> attaque</span>
        <span><StatIcon kind="armor" size={16} /> armure au corps à corps</span>
        <span><StatIcon kind="pierce" size={16} /> armure contre les flèches</span>
        <span><StatIcon kind="range" size={16} /> portée</span>
        <span><StatIcon kind="speed" size={16} /> vitesse</span>
        <span><StatIcon kind="cost" size={16} /> coût en soldats</span>
      </div>

      <div className="cx-grid">
        {level.chapters.map((c) => {
          const st = UNIT_STATS[c.unit]
          const monk = c.unit === 'monk'
          return (
            <article key={c.id} className="cx-card" style={{ borderTopColor: c.color }}>
              <header className="cx-head">
                <div className="cx-portrait"><Portrait look={lookOf(c, 2, teamColor)} size={74} /></div>
                <div>
                  <h4>{c.corpsName}</h4>
                  <div className="cx-house">{c.buildingName} · <b>{c.title}</b></div>
                  <div className="cx-ranks">{c.tierNames.join(' → ')}</div>
                </div>
              </header>
              <div className="cx-stats">
                <Stat icon="hp" label="Vie" value={String(st.hp)} ratio={st.hp / MAX.hp} />
                {monk
                  ? <Stat icon="convert" label="Conversion" value={`${Math.round((st.convert?.chance ?? 0) * 100)} %`} ratio={(st.convert?.chance ?? 0) / 0.5} text={`/ ${String(st.convert?.channel).replace('.', ',')} s`} />
                  : <Stat icon={st.splash ? 'splash' : 'attack'} label="Attaque" value={String(st.attack)} ratio={st.attack / MAX.attack} text={st.splash ? 'zone' : `/ ${String(st.reload).replace('.', ',')} s`} />}
                <Stat icon="armor" label="Armure" value={String(st.armor)} ratio={st.armor / MAX.armor} />
                <Stat icon="pierce" label="Anti-flèches" value={String(st.pierce)} ratio={st.pierce / MAX.armor} />
                <Stat icon="range" label="Portée" value={st.range > 2 ? `${st.range} m` : 'contact'} ratio={st.range / MAX.range} />
                <Stat icon="speed" label="Vitesse" value={String(st.speed).replace('.', ',')} ratio={st.speed / MAX.speed} />
                <Stat icon="cost" label="Coût" value={String(st.cost).replace('.', ',')} ratio={st.cost / 3} text={st.cost > 1 ? '(moins nombreux)' : ''} />
              </div>
              <p className="cx-special">{SPECIALS[c.unit]}</p>
              <div className="cx-vs">
                <div>
                  <span className="cx-vs-title good">Fort contre</span>
                  <div className="cx-chips">
                    {COUNTERS[c.unit].strong.map((k) => (
                      <span key={k} className="cx-chip" title={kindName(k)}><Portrait look={lookOf(chapterOf(k), 1, '#6b7a8c')} size={30} /><small>{kindName(k)}</small></span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="cx-vs-title bad">Faible contre</span>
                  <div className="cx-chips">
                    {COUNTERS[c.unit].weak.map((k) => (
                      <span key={k} className="cx-chip" title={kindName(k)}><Portrait look={lookOf(chapterOf(k), 1, '#6b7a8c')} size={30} /><small>{kindName(k)}</small></span>
                    ))}
                  </div>
                </div>
              </div>
              <ul className="cx-upgrades">
                {c.upgrades.map((u, i) => (
                  <li key={u.id}><span>{['🛡', '⚒', '⚑'][i]}</span><b>{u.name}</b> {u.description}</li>
                ))}
              </ul>
            </article>
          )
        })}
      </div>

      <div className="cx-rules">
        <div><b>Rangs.</b> Vétéran (crans 3-4) : ×1,3 vie, +2 attaque, +1 armure. Élite (cran 5) : ×1,6 vie, +4 attaque, +2 armure.</div>
        <div><b>Âges.</b> Chaque âge donne +{Math.round(AGE_BONUS * 100)} % de vie et d’attaque à toute l’armée.</div>
        <div><b>Coût.</b> Une maison de chevaliers (coût 2) aligne deux fois moins d’unités qu’une maison de lanciers (coût 1).</div>
        <div><b>Bataille.</b> Fantassins devant, tireurs derrière, artillerie et moines au fond, cavalerie sur les ailes. Le cor de guerre (+25 % d’attaque, 5 s) s’obtient par le calcul mental.</div>
        <div><b>Duel.</b> Ton adversaire dispose des mêmes 7 types d’unités, quelle que soit sa classe.</div>
      </div>
    </div>
  )
}

/** Le codex dans une fenêtre, consultable pendant l'entraînement. */
export function CodexModal({ levelId, teamColor, onClose }: { levelId: string; teamColor?: string; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}>
      <div className="townhall codex-modal" role="dialog" aria-label="Codex des armées">
        <header className="th-head">
          <div>
            <div className="eyebrow">Stratégie</div>
            <h2>Codex des armées</h2>
          </div>
          <button className="close light" onClick={onClose} aria-label="Fermer" autoFocus>✕</button>
        </header>
        <Codex levelId={levelId} teamColor={teamColor} />
      </div>
    </div>
  )
}
