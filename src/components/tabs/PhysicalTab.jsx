import { useMemo } from 'react'
import { useSortable } from '../../hooks/useSortable.jsx'
import styles from './PhysicalTab.module.css'

const SQFT_TO_ACRES = 1 / 43560

function lotAcres(sqft) {
  return sqft ? sqft * SQFT_TO_ACRES : null
}

function lotCategory(acres) {
  if (acres == null) return null
  if (acres < 0.10)  return { label: 'Micro',        cls: styles.lotMicro }
  if (acres < 0.25)  return { label: 'Small',         cls: styles.lotSmall }
  if (acres < 0.50)  return { label: 'Suburban',      cls: styles.lotSuburban }
  if (acres < 1.00)  return { label: 'Large Suburban',cls: styles.lotLargeSub }
  if (acres < 2.00)  return { label: 'Estate',        cls: styles.lotEstate }
  if (acres < 5.00)  return { label: 'Grand Estate',  cls: styles.lotGrandEstate }
  return               { label: 'Estate+',            cls: styles.lotEstatePlus }
}

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

function heatCls(rank) {
  if (rank == null) return ''
  if (rank >= 0.80) return 'c5'
  if (rank >= 0.60) return 'c4'
  if (rank >= 0.40) return 'c3'
  if (rank >= 0.20) return 'c2'
  return 'c1'
}

export default function PhysicalTab({ comps }) {
  const enriched = useMemo(() => {
    const sqfts     = comps.map(c => c.sqft).filter(Boolean)
    const lots      = comps.map(c => lotAcres(c.lot_sqft)).filter(Boolean)
    const baths     = comps.map(c => c.bathrooms).filter(Boolean)
    const beds      = comps.map(c => c.bedrooms).filter(Boolean)
    const years     = comps.map(c => c.year_built).filter(Boolean)

    return comps.map(c => {
      const acres  = lotAcres(c.lot_sqft)
      const cat    = lotCategory(acres)
      const age    = c.year_built ? new Date().getFullYear() - c.year_built : null
      return {
        ...c,
        _acres:    acres,
        _cat:      cat,
        _age:      age,
        _sqftRank: pctRank(c.sqft,       sqfts),
        _lotRank:  pctRank(acres,         lots),
        _bathRank: pctRank(c.bathrooms,   baths),
        _bedRank:  pctRank(c.bedrooms,    beds),
        _yearRank: pctRank(c.year_built,  years),
      }
    })
  }, [comps])

  const { sorted, handleSort, SortIcon } = useSortable(enriched, 'sqft', 'desc')

  const sqfts  = enriched.map(c => c.sqft).filter(Boolean)
  const lots   = enriched.map(c => c._acres).filter(Boolean)
  const avgSqft = sqfts.length ? Math.round(sqfts.reduce((s, v) => s + v, 0) / sqfts.length) : null
  const avgAcres = lots.length ? lots.reduce((s, v) => s + v, 0) / lots.length : null
  const avgBeds  = enriched.filter(c => c.bedrooms).length
    ? (enriched.reduce((s, c) => s + (c.bedrooms || 0), 0) / enriched.filter(c => c.bedrooms).length).toFixed(1)
    : null

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
      <p className={styles.sub}>Color intensity reflects rank within the pool. Lot size converted to acres at industry breakpoints.</p>

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
              <Th colKey="bedrooms"   label="Beds"        />
              <Th colKey="bathrooms"  label="Baths"       />
              <Th colKey="sqft"       label="Interior SF" />
              <Th colKey="_acres"     label="Lot"         />
              <th className={styles.thLeft}>Lot Type</th>
              <Th colKey="year_built" label="Built"       />
              <Th colKey="_age"       label="Age"         />
              <Th colKey="stories"    label="Stories"     />
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => (
              <tr key={c.id}>
                <td className={styles.addrCell}>
                  <div className={styles.addr}>{c.address.split(',')[0]}</div>
                  {c.town && <div className={styles.town}>{c.town}</div>}
                </td>
                <td className={`${styles.cell} ${heatCls(c._bedRank)}`}>
                  {c.bedrooms ?? '—'}
                </td>
                <td className={`${styles.cell} ${heatCls(c._bathRank)}`}>
                  {c.bathrooms ?? '—'}
                </td>
                <td className={`${styles.cell} ${heatCls(c._sqftRank)}`}>
                  {c.sqft ? c.sqft.toLocaleString() : '—'}
                </td>
                <td className={`${styles.cell} ${heatCls(c._lotRank)}`}>
                  {fmtAcres(c._acres)}
                </td>
                <td className={styles.catCell}>
                  {c._cat ? (
                    <span className={`${styles.lotBadge} ${c._cat.cls}`}>{c._cat.label}</span>
                  ) : '—'}
                </td>
                <td className={`${styles.cell} ${heatCls(c._yearRank)}`}>
                  {c.year_built ?? '—'}
                </td>
                <td className={`${styles.cell} ${c._age != null && c._age > 50 ? styles.old : ''}`}>
                  {c._age != null ? `${c._age}y` : '—'}
                </td>
                <td className={styles.cell}>
                  {c.stories ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
