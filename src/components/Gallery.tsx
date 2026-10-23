import { LEVELS, unitName } from '../data/curriculum'
import { Portrait } from './Portrait'

/** Galerie de toutes les unités (rangs × améliorations) : /?galerie */
export function Gallery() {
  return (
    <div className="gallery">
      <h1>Galerie des unités</h1>
      {LEVELS.map((lvl) => (
        <section key={lvl.id}>
          <h2>{lvl.label}</h2>
          {lvl.chapters.map((c) => (
            <div key={c.id} className="gallery-row">
              <div className="gallery-title"><b>{c.corpsName}</b><span>{c.title}</span></div>
              {[0, 1, 2, 3].map((tier) => (
                <figure key={tier}>
                  <Portrait size={110} look={{ kind: c.unit, tier, color: c.color, emblem: c.emblem, name: unitName(c, tier), upgrades: 0 }} />
                  <figcaption>{unitName(c, tier)}</figcaption>
                </figure>
              ))}
              {[1, 2, 3].map((u) => (
                <figure key={`u${u}`}>
                  <Portrait size={110} look={{ kind: c.unit, tier: 3, color: c.color, emblem: c.emblem, name: unitName(c, 3), upgrades: u }} />
                  <figcaption>+ {c.upgrades[u - 1].name}</figcaption>
                </figure>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
