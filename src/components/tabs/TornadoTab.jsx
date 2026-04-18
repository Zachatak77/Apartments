import { scoreComp } from '../../lib/scoring'
import styles from './TornadoTab.module.css'

function getDimStats(comps, key, scoreKey) {
  if (!comps.length) return { min: 0, max: 0, swing: 0 }
  const scores = comps.map(c => {
    const s = scoreComp({
      psf: c.psf ?? 999, taxes: c.taxes ?? 25000,
      sqft: c.sqft ?? 3500, lot_sqft: c.lot_sqft ?? 25000,
      year_built: c.year_built ?? 1980, is_closed: c.is_closed,
      over_ask: c.over_ask, days_on_market: c.days_on_market ?? 0,
    })
    return s[scoreKey]
  })
  return { min: Math.min(...scores), max: Math.max(...scores), swing: Math.max(...scores) - Math.min(...scores) }
}

export default function TornadoTab({ comps }) {
  const dims = [
    { name: '$/Sq Ft',  scoreKey: 'ps', weight: 35 },
    { name: 'Taxes',    scoreKey: 'ts', weight: 20 },
    { name: 'Size',     scoreKey: 'ss', weight: 15 },
    { name: 'Lot',      scoreKey: 'ls', weight: 15 },
    { name: 'Age',      scoreKey: 'as', weight: 15 },
  ].map(d => ({ ...d, ...getDimStats(comps, null, d.scoreKey) }))
   .sort((a, b) => b.swing - a.swing)

  const maxSwing = Math.max(...dims.map(d => d.swing), 0.01)

  return (
    <div>
      <div className="sl">Impact analysis</div>
      <h2 className={styles.title}>Dimension Sensitivity</h2>
      <p className={styles.sub}>Score swing when each dimension moves from worst to best observed value in your comp pool.</p>

      <div className={styles.legend}>
        <span className={styles.negLegend}>◀ Worst case</span>
        <span className={styles.posLegend}>Best case ▶</span>
      </div>

      <div className={styles.chart}>
        {dims.map(d => {
          const negW = (d.min / 3) * 48
          const posW = ((d.swing) / maxSwing) * 48
          return (
            <div key={d.name} className={styles.row}>
              <div className={styles.label}>
                {d.name}
                <small>Wt {d.weight}%</small>
              </div>
              <div className={styles.track}>
                <div className={styles.neg} style={{ width: `${negW}%` }} />
                <div className={styles.pos} style={{ width: `${posW}%` }} />
                <div className={styles.ctr} />
              </div>
              <div className={styles.val}>±{d.swing.toFixed(1)}pt</div>
            </div>
          )
        })}
      </div>

      <div className={styles.insights}>
        <div className="ic b">
          <div className="ih">Dominant Driver</div>
          <div className="ib">
            <strong>{dims[0]?.name}</strong> produces the largest score swing in your pool.
            Properties at opposite ends of this dimension can differ by <strong>{dims[0]?.swing.toFixed(1)} composite points</strong>.
          </div>
        </div>
        <div className="ic a">
          <div className="ih">Tax-Adjusted Pricing</div>
          <div className="ib">
            A $10K annual tax difference equals roughly <strong>$182K of equivalent mortgage principal</strong> at 5.5%.
            Always compute tax-adjusted price before comparing listings.
          </div>
        </div>
      </div>
    </div>
  )
}
