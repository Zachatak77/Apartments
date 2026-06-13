import { DIMENSIONS } from './compareUtils'
import styles from './DimensionMatrix.module.css'

// Aligned dimension grid: rows = the 7 weighted dimensions, columns = active
// candidates. Best-in-class cell per row is highlighted so the strongest
// candidate on each axis reads at a glance.
export default function DimensionMatrix({ candidates, bestByDim }) {
  if (candidates.length < 2) return null

  return (
    <div className={styles.wrap}>
      <div className={styles.subhead}>Dimension comparison</div>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.dimHead}>Dimension</th>
              {candidates.map(c => (
                <th key={c.comp.id} className={styles.candHead} title={c.comp.address}>
                  {(c.comp.address ?? '').split(' ').slice(0, 2).join(' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DIMENSIONS.map(d => (
              <tr key={d.key}>
                <td className={styles.dimCell} title={d.hint}>{d.label}</td>
                {candidates.map(c => {
                  const val  = c.sub[d.key] ?? 0
                  const best = bestByDim[d.key] === c.comp.id
                  return (
                    <td key={c.comp.id} className={styles.valCell}>
                      <div className={styles.barTrack}>
                        <div
                          className={`${styles.barFill} ${best ? styles.barBest : ''}`}
                          style={{ width: `${(val / 3) * 100}%` }}
                        />
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr className={styles.totalRow}>
              <td className={styles.dimCell}>Composite</td>
              {candidates.map(c => (
                <td key={c.comp.id} className={styles.valCell}>
                  <span className={styles.scoreTag}>{c.score}</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
