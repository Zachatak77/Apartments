import { useMemo } from 'react'
import { useSortable } from '../../hooks/useSortable.jsx'
import styles from './PhysicalTab.module.css'

const SQFT_TO_ACRES = 1 / 43560

function lotAcres(sqft) { return sqft ? sqft * SQFT_TO_ACRES : null }

function fmtAcres(acres) {
  if (acres == null) return '—'
  return acres < 0.10
    ? `${Math.round(acres * 43560).toLocaleString()} sf`
    : `${acres.toFixed(2)} ac`
}

function pctRank(val, vals) {
  if (val == null || vals.length < 2) return null
  const sorted = [...vals].sort((a, b) => a - b)
  const idx = sorted.filter(v => v <= val).length - 1
  return idx / (sorted.length - 1)
}

function dimCls(rank) {
  if (rank == null) return ''
  if (rank >= 0.80) return styles.c5
  if (rank >= 0.60) return styles.c4
  if (rank >= 0.40) return styles.c3
  if (rank >= 0.20) return styles.c2
  return styles.c1
}

export default function PhysicalTab({ comps, onSelect }) {
  const enriched = useMemo(() => {
    const sqfts    = comps.map(c => c.sqft).filter(Boolean)
    const lots     = comps.map(c => lotAcres(c.lot_sqft)).filter(Boolean)
    const baths    = comps.map(c => c.baths).filter(Boolean)
    const beds     = comps.map(c => c.beds).filter(Boolean)
    const years    = comps.map(c => c.year_built).filter(Boolean)
    const sfPerBeds = comps.map(c => c.sqft && c.beds ? Math.round(c.sqft / c.beds) : null).filter(Boolean)
    const intPcts  = comps.map(c => c.sqft && c.lot_sqft ? c.sqft / c.lot_sqft : null).filter(Boolean)

    return comps.map(c => {
      const sfPerBed = c.sqft && c.beds ? Math.round(c.sqft / c.beds) : null
      const intPct   = c.sqft && c.lot_sqft ? c.sqft / c.lot_sqft : null
      return {
        ...c,
        _acres:         lotAcres(c.lot_sqft),
        _sfPerBed:      sfPerBed,
        _intPct:        intPct,
        _sqftRank:      pctRank(c.sqft,             sqfts),
        _lotRank:       pctRank(lotAcres(c.lot_sqft), lots),
        _bathRank:      pctRank(c.baths,            baths),
        _bedRank:       pctRank(c.beds,             beds),
        _yearRank:      pctRank(c.year_built,       years),
        _sfPerBedRank:  pctRank(sfPerBed,           sfPerBeds),
        _intPctRank:    intPct != null ? 1 - pctRank(intPct, intPcts) : null,
      }
    })
  }, [comps])

  const { sorted, handleSort, SortIcon } = useSortable(enriched, 'sqft', 'desc')

  const sqfts    = enriched.map(c => c.sqft).filter(Boolean)
  const lots     = enriched.map(c => c._acres).filter(Boolean)
  const bedsArr  = enriched.map(c => c.beds).filter(Boolean)
  const avgSqft  = sqfts.length  ? Math.round(sqfts.reduce((s, v) => s + v, 0) / sqfts.length) : null
  const avgAcres = lots.length   ? lots.reduce((s, v) => s + v, 0) / lots.length : null
  const avgBeds  = bedsArr.length ? (bedsArr.reduce((s, v) => s + v, 0) / bedsArr.length).toFixed(1) : null

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
      <div className="sl">Physical comparison</div>
      <h2 className={styles.title}>Property Attributes</h2>
      <p className={styles.sub}>Click a column header to sort. Color intensity reflects rank within the pool. Lot size uses industry breakpoints.</p>

      <div className={styles.statRow}>
        <div className="stat-card">
          <div className="stat-card-val">{comps.length}</div>
          <div className="stat-card-lbl">Properties</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-val">{avgSqft ? avgSqft.toLocaleString() : '—'}</div>
          <div className="stat-card-lbl">Avg Interior SF</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-val">{avgAcres ? avgAcres.toFixed(2) : '—'} ac</div>
          <div className="stat-card-lbl">Avg Lot Size</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-val">{avgBeds ?? '—'}</div>
          <div className="stat-card-lbl">Avg Bedrooms</div>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <Th colKey="address"    label="Property"    left />
              <Th colKey="beds"       label="Beds"        />
              <Th colKey="baths"      label="Baths"       />
              <Th colKey="sqft"       label="Interior SF" />
              <Th colKey="_sfPerBed"  label="SF / Bed"    />
              <Th colKey="_acres"     label="Lot"         />
              <Th colKey="_intPct"    label="Interior %"  />
              <Th colKey="year_built" label="Built"       />
              <Th colKey="stories"    label="Stories"     />
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => {
              const status = c.sold_date ? 'Sold'
                : (c.contract_date && !c.sold_date) ? 'In Contract'
                : 'Active'
              const statusCls = status === 'Sold' ? styles.tagSold
                : status === 'In Contract' ? styles.tagContract
                : styles.tagActive
              return (
                <tr
                  key={c.id}
                  className={styles.row}
                  onClick={() => onSelect?.(c)}
                  style={onSelect ? { cursor: 'pointer' } : undefined}
                >
                  <td className={styles.addrCell}>
                    <span className={styles.addr}>{c.address}</span>
                    {c.town && <span className={styles.town}>{c.town}</span>}
                    <span className={`${styles.statusTag} ${statusCls}`}>{status}</span>
                  </td>
                  <td><div className={`${styles.cell} ${styles.dim} ${dimCls(c._bedRank)}`}>{c.beds ?? '—'}</div></td>
                  <td><div className={`${styles.cell} ${styles.dim} ${dimCls(c._bathRank)}`}>{c.baths ?? '—'}</div></td>
                  <td><div className={`${styles.cell} ${styles.dim} ${dimCls(c._sqftRank)}`}>{c.sqft ? c.sqft.toLocaleString() : '—'}</div></td>
                  <td><div className={`${styles.cell} ${styles.dim} ${dimCls(c._sfPerBedRank)}`}>{c._sfPerBed ? c._sfPerBed.toLocaleString() : '—'}</div></td>
                  <td><div className={`${styles.cell} ${styles.dim} ${dimCls(c._lotRank)}`}>{fmtAcres(c._acres)}</div></td>
                  <td><div className={`${styles.cell} ${styles.dim} ${dimCls(c._intPctRank)}`}>{c._intPct != null ? `${(c._intPct * 100).toFixed(1)}%` : '—'}</div></td>
                  <td><div className={`${styles.cell} ${styles.dim} ${dimCls(c._yearRank)}`}>{c.year_built ?? '—'}</div></td>
                  <td><div className={`${styles.cell} ${styles.dim}`}>{c.stories ?? '—'}</div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.legend}>
        <span className={`${styles.legendDot} ${styles.c5}`} /> Large / New
        <span className={`${styles.legendDot} ${styles.c3}`} style={{ marginLeft: 14 }} /> Average
        <span className={`${styles.legendDot} ${styles.c1}`} style={{ marginLeft: 14 }} /> Small / Older
      </div>
    </div>
  )
}
