import { useMemo } from 'react'
import { scoreComp, cellClass } from '../../lib/scoring'
import { useSortable } from '../../hooks/useSortable'
import styles from './HeatmapTab.module.css'

function fmt(val, type) {
  if (val == null) return '—'
  if (type === 'psf')  return `$${val}`
  if (type === 'tax')  return `$${Math.round(val / 1000)}K`
  if (type === 'sqft') return `${(val / 1000).toFixed(1)}K`
  if (type === 'lot')  return `${Math.round(val / 1000)}K`
  if (type === 'year') return val || '—'
  return val
}

export default function HeatmapTab({ comps, onEdit, onDelete }) {
  // Enrich comps with computed score so we can sort by it
  const enriched = useMemo(() => comps.map(c => {
    const s = scoreComp({
      ...c,
      psf: c.psf ?? (c.last_list_price && c.sqft ? Math.round(c.last_list_price / c.sqft) : null) ?? 999,
    })
    return { ...c, _score: s.comp, _s: s }
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
      <h2 className={styles.title}>Comparative Value by Dimension</h2>
      <p className={styles.sub}>Click any column header to sort. Green = strong value; terracotta = weak.</p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <Th colKey="address"        label="Property"  left />
              <Th colKey="psf"            label="$/SF"      />
              <Th colKey="taxes"          label="Taxes"     />
              <Th colKey="sqft"           label="Size"      />
              <Th colKey="lot_sqft"       label="Lot"       />
              <Th colKey="year_built"     label="Age"       />
              <Th colKey="days_on_market" label="Signal"    />
              <Th colKey="_score"         label="Score"     />
              <th className={styles.thAct} />
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => {
              const s = c._s
              const dom = c.days_on_market ?? 0
              const signal = c.is_closed ? (c.over_ask ? '▲ over' : '✓ sold') : dom > 0 ? `${dom}d` : 'active'
              const cut = c.original_list_price && c.last_list_price && c.original_list_price > c.last_list_price
                ? `↓$${Math.round((c.original_list_price - c.last_list_price) / 1000)}K`
                : null

              return (
                <tr key={c.id}>
                  <td className={styles.addrCell}>
                    <span className={styles.addr}>{c.address}</span>
                    {c.town && <span className={styles.town}>{c.town}</span>}
                    {cut && <span className={styles.cut}>{cut}</span>}
                  </td>
                  <td><div className={`${styles.cell} ${cellClass(s.ps, 3)}`}>{fmt(c.psf, 'psf')}</div></td>
                  <td><div className={`${styles.cell} ${cellClass(s.ts, 3)}`}>{fmt(c.taxes, 'tax')}</div></td>
                  <td><div className={`${styles.cell} ${cellClass(s.ss, 3)}`}>{fmt(c.sqft, 'sqft')}</div></td>
                  <td><div className={`${styles.cell} ${cellClass(s.ls, 3)}`}>{fmt(c.lot_sqft, 'lot')}</div></td>
                  <td><div className={`${styles.cell} ${cellClass(s.as, 3)}`}>{fmt(c.year_built, 'year')}</div></td>
                  <td><div className={`${styles.cell} ${cellClass(s.ms, 3)}`}>{signal}</div></td>
                  <td><div className={`${styles.cell} ${cellClass(s.comp, 100)}`} style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.comp}</div></td>
                  <td className={styles.actCell}>
                    <button className={styles.editBtn} onClick={() => onEdit(c)}>Edit</button>
                    <button className={styles.delBtn}  onClick={() => onDelete(c.id)}>✕</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.legend}>
        <span className={`${styles.legendDot} c5`} /> Strong value
        <span className={`${styles.legendDot} c3`} style={{ marginLeft: 16 }} /> Average
        <span className={`${styles.legendDot} c1`} style={{ marginLeft: 16 }} /> Weak value
      </div>
    </div>
  )
}
