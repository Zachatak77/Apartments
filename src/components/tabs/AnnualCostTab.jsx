import { useState } from 'react'
import { compStatus } from '../../hooks/usePoolComps'
import CarryCompare from './CarryCompare'
import styles from './AnnualCostTab.module.css'

const STATUS_LABEL = { active: 'Active', contract: 'In Contract', sold: 'Sold' }
const fmtPrice = c => {
  const p = c.sold_price ?? c.last_list_price ?? c.original_list_price
  return p ? `$${Math.round(p / 1000)}K` : '—'
}

export default function AnnualCostTab({ comps, onSelect }) {
  const [phase, setPhase]       = useState('select')   // 'select' | 'compare'
  const [selected, setSelected] = useState(() => new Set())

  // Order properties newest -> oldest by list date (undated last)
  const ts = c => c.list_date ? new Date(c.list_date).getTime() : -Infinity
  const ordered = [...comps].sort((a, b) => ts(b) - ts(a))

  const toggle = id => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const selectAll = () => setSelected(new Set(ordered.map(c => c.id)))
  const clear     = () => setSelected(new Set())

  const chosen = ordered.filter(c => selected.has(c.id))

  if (phase === 'compare') {
    return (
      <CarryCompare
        comps={chosen}
        onSelect={onSelect}
        onEditSelection={() => setPhase('select')}
      />
    )
  }

  return (
    <div>
      <div className="sl">Annual cost comparison</div>
      <h2 className={styles.title}>Compare Carrying Costs</h2>
      <p className={styles.sub}>
        Pick the properties you want to compare, then generate a side-by-side all-in annual cost breakdown.
      </p>

      <div className={styles.actionsBar}>
        <button className={styles.linkBtn} onClick={selectAll}>Select all</button>
        <button className={styles.linkBtn} onClick={clear}>Clear</button>
        <span className={styles.count}>{selected.size} selected</span>
        <button
          className={styles.generateBtn}
          disabled={selected.size < 2}
          onClick={() => setPhase('compare')}
          title={selected.size < 2 ? 'Select at least 2 properties' : 'Generate comparison'}
        >
          Generate comparison →
        </button>
      </div>

      <div className={styles.list}>
        {ordered.map(c => {
          const on = selected.has(c.id)
          const status = compStatus(c)
          return (
            <button
              key={c.id}
              className={`${styles.item} ${on ? styles.itemOn : ''}`}
              onClick={() => toggle(c.id)}
            >
              <span className={`${styles.check} ${on ? styles.checkOn : ''}`} aria-hidden="true">
                {on && (
                  <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 6.5l2.5 2.5L10 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className={styles.itemMain}>
                <span className={styles.itemAddr}>{c.address}</span>
                {c.town && <span className={styles.itemTown}>{c.town}</span>}
              </span>
              <span className={styles.itemPrice}>{fmtPrice(c)}</span>
              <span className={`${styles.itemStatus} ${styles['st_' + status]}`}>{STATUS_LABEL[status]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
