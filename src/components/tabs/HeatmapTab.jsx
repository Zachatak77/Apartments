import { useMemo } from 'react'
import { scoreComp, buildPoolContext, cellClass } from '../../lib/scoring'
import { useSortable } from '../../hooks/useSortable.jsx'
import styles from './HeatmapTab.module.css'

function fmt(val, type) {
  if (val == null) return '—'
  if (type === 'psf')   return `$${val}`
  if (type === 'tax')   return `$${Math.round(val / 1000)}K`
  if (type === 'lot') {
    const ac = val / 43560
    return ac < 0.10 ? `${Math.round(val).toLocaleString()} sf` : `${ac.toFixed(2)} ac`
  }
  if (type === 'price') return `$${Math.round(val / 1000)}K`
  return val
}

export default function HeatmapTab({ comps, onEdit, onDelete, onSelect }) {
  const ctx = useMemo(() => buildPoolContext(comps), [comps])

  const enriched = useMemo(() => comps.map(c => {
    const s = scoreComp({
      ...c,
      psf: c.psf ?? (c.last_list_price && c.sqft ? Math.round(c.last_list_price / c.sqft) : null) ?? 999,
    }, ctx)
    const price = (c.is_closed ? c.sold_price : null) ?? c.last_list_price ?? c.original_list_price
    return { ...c, _score: s.comp, _s: s, _price: price }
  }), [comps])

  const { sorted, handleSort, SortIcon } = useSortable(enriched, '_score', 'desc')

  const Th = ({ colKey, label, left }) => (
    <th
      className={`${styles.thSortable} ${left ? styles.thLeft : ''}`}
      onClick={() => handleSort(colKey)}
    >
      {label}<SortIcon colKey={colKey} />
    </th>
  )

  return (
    <div>
      <div className="sl">Value heatmap</div>
      <h2 className={styles.title}>Comparative Value</h2>
      <p className={styles.sub}>Click a column header to sort. Score is the weighted composite.</p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <Th colKey="address"  label="Property" left />
              <Th colKey="psf"      label="$/SF"     />
              <Th colKey="taxes"    label="Taxes"    />
              <Th colKey="lot_sqft" label="Lot"      />
              <Th colKey="_price"   label="Price"    />
              <Th colKey="_score"   label="Score"    />
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => {
              const s = c._s
              const status = c.sold_date ? 'Sold'
                : (c.contract_date && !c.sold_date) ? 'In Contract'
                : 'Active'
              const statusCls = status === 'Sold' ? styles.tagSold
                : status === 'In Contract' ? styles.tagContract
                : styles.tagActive
              return (
                <tr key={c.id} className={styles.row} onClick={() => onSelect?.(c)}>
                  <td className={styles.addrCell}>
                    <span className={styles.addr}>{c.address}</span>
                    {c.town && <span className={styles.town}>{c.town}</span>}
                    <span className={`${styles.statusTag} ${statusCls}`}>{status}</span>
                  </td>
                  <td><div className={`${styles.cell} ${styles.dim} ${cellClass(s.ps, 3)}`}>{fmt(c.psf, 'psf')}</div></td>
                  <td><div className={`${styles.cell} ${styles.dim} ${cellClass(s.ts, 3)}`}>{fmt(c.taxes, 'tax')}</div></td>
                  <td><div className={`${styles.cell} ${styles.dim} ${cellClass(s.ls, 3)}`}>{fmt(c.lot_sqft, 'lot')}</div></td>
                  <td><div className={`${styles.cell} ${styles.dim} ${cellClass(s.ps, 3)}`}>{fmt(c._price, 'price')}</div></td>
                  <td>
                    <div className={`${styles.cell} ${styles.scoreCell} ${cellClass(s.comp, 100)}`}>
                      {s.comp}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.legend}>
        <span className={`${styles.legendDot} c5`} /> Strong
        <span className={`${styles.legendDot} c3`} style={{ marginLeft: 14 }} /> Average
        <span className={`${styles.legendDot} c1`} style={{ marginLeft: 14 }} /> Weak
      </div>
    </div>
  )
}
