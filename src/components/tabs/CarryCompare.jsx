import { useState, useMemo } from 'react'
import { loadMortgagePrefs, calcMonthlyPayment, MORTGAGE_DEDUCTION_CAP } from '../../lib/mortgage'
import { loadModelSettings } from '../../lib/modelSettings'
import styles from './CarryCompare.module.css'

const fmt = n => n == null ? '—' : '$' + Math.round(Math.abs(n)).toLocaleString('en-US')
const priceOf = c => c.sold_price ?? c.last_list_price ?? c.original_list_price ?? null
const shortAddr = a => (a ?? '').split(',')[0]

export default function CarryCompare({ comps, onSelect, onEditSelection }) {
  const prefs = useMemo(() => loadMortgagePrefs(), [])
  const ms    = useMemo(() => loadModelSettings(), [])

  const seedFed = (prefs.taxRate === 24 || prefs.taxRate === 32) ? prefs.taxRate : 32
  const [fedRate,        setFedRate]        = useState(seedFed)
  const [mortRate,       setMortRate]       = useState(prefs.rate)
  const [priceOverrides, setPriceOverrides] = useState({})
  const [editingPrice,   setEditingPrice]   = useState(null)
  const [editVal,        setEditVal]        = useState('')

  const { downPct, term } = prefs
  const insRate = ms.insuranceRate
  const saltCap = ms.saltCap ?? 40000

  function commitPriceEdit(id) {
    setEditingPrice(null)
    const raw = editVal.replace(/[$,\s]/g, '').trim()
    const lower = raw.toLowerCase()
    let n
    if (lower.endsWith('k'))      n = parseFloat(lower) * 1_000
    else if (lower.endsWith('m')) n = parseFloat(lower) * 1_000_000
    else                          n = parseFloat(raw)
    if (!isNaN(n) && n > 0) {
      setPriceOverrides(prev => ({ ...prev, [id]: Math.round(n) }))
    } else if (raw === '') {
      setPriceOverrides(prev => { const next = { ...prev }; delete next[id]; return next })
    }
  }

  const rows = useMemo(() => comps.map(c => {
    const price = priceOverrides[c.id] ?? priceOf(c)
    if (!price) return { c, price: null }
    const down  = Math.round(price * downPct / 100)
    const loan  = price - down
    const piMo  = calcMonthlyPayment(loan, mortRate, term)
    const taxMo = c.taxes ? Math.round(c.taxes / 12) : 0
    const insMo = Math.round(price * (insRate / 100) / 12)
    const grossMo = piMo + taxMo + insMo
    const mortShieldAnn = Math.round(Math.min(loan, MORTGAGE_DEDUCTION_CAP) * (mortRate / 100) * (fedRate / 100))
    const saltShieldAnn = Math.round(Math.min(c.taxes ?? 0, saltCap) * (fedRate / 100))
    const mortShieldMo  = Math.round(mortShieldAnn / 12)
    const saltShieldMo  = Math.round(saltShieldAnn / 12)
    const netMo = grossMo - mortShieldMo - saltShieldMo
    return { c, price, down, loan, piMo, taxMo, insMo, grossMo, mortShieldAnn, saltShieldAnn, mortShieldMo, saltShieldMo, netMo }
  }), [comps, downPct, term, mortRate, insRate, saltCap, fedRate, priceOverrides])

  const valid = rows.filter(r => r.price != null)
  const minOf = key => valid.length ? Math.min(...valid.map(r => r[key])) : null
  const best = { piMo: minOf('piMo'), taxMo: minOf('taxMo'), grossMo: minOf('grossMo'), netMo: minOf('netMo') }
  const ranked = [...valid].sort((a, b) => a.netMo - b.netMo)

  const dataRow = ({ label, sub, get, bestVal, fmtFn = fmt }) => (
    <tr className={sub ? styles.subRow : styles.row}>
      <td className={`${styles.rowLabel} ${sub ? styles.rowLabelSub : ''}`}>{label}</td>
      {rows.map((r, i) => {
        const v = r.price == null ? null : get(r)
        const isBest = bestVal != null && v != null && v === bestVal
        return (
          <td key={i} className={`${styles.cell} ${isBest ? styles.cellBest : ''}`}>
            {v == null ? '—' : fmtFn(v)}
          </td>
        )
      })}
    </tr>
  )

  const totalRow = ({ label, get, bestVal, emphasize }) => (
    <tr className={emphasize ? styles.netRow : styles.totalRow}>
      <td className={`${styles.rowLabel} ${styles.totalLabel}`}>{label}</td>
      {rows.map((r, i) => {
        const v = r.price == null ? null : get(r)
        const isBest = bestVal != null && v != null && v === bestVal
        return (
          <td key={i} className={`${styles.cell} ${styles.totalCell} ${isBest ? styles.cellBest : ''}`}>
            {v == null ? '—' : fmt(v)}
          </td>
        )
      })}
    </tr>
  )

  const savRow = ({ label, get }) => (
    <tr className={styles.subRow}>
      <td className={`${styles.rowLabel} ${styles.rowLabelSub}`}>{label}</td>
      {rows.map((r, i) => (
        <td key={i} className={`${styles.cell} ${styles.savCell}`}>
          {r.price == null ? '—' : `(${fmt(get(r))})`}
        </td>
      ))}
    </tr>
  )

  return (
    <div>
      <div className={styles.headRow}>
        <div>
          <div className="sl">Annual carry comparison</div>
          <h2 className={styles.title}>Cost to Carry</h2>
        </div>
        {onEditSelection && (
          <button className={styles.editBtn} onClick={onEditSelection}>← Edit selection</button>
        )}
      </div>
      <p className={styles.sub}>
        {downPct}% down · {term}yr · ${Math.round(saltCap / 1000)}K SALT cap · $750K mortgage-interest cap ·
        insurance {insRate}%/yr. Green = lowest in row. Click a price to override it.
      </p>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.ctrlRow}>
          <span className={styles.ctrlLabel}>Federal Tax Rate</span>
          <div className={styles.segGroup}>
            {[24, 32].map(rate => (
              <button
                key={rate}
                className={`${styles.segBtn} ${fedRate === rate ? styles.segActive : ''}`}
                onClick={() => setFedRate(rate)}
              >{rate}%</button>
            ))}
          </div>
        </div>
        <div className={styles.ctrlRow}>
          <span className={styles.ctrlLabel}>Mortgage Rate</span>
          <input
            className={styles.slider}
            type="range" min={5.0} max={8.0} step={0.125} value={mortRate}
            onChange={e => setMortRate(parseFloat(e.target.value))}
          />
          <span className={styles.rateVal}>{mortRate.toFixed(3).replace(/\.?0+$/, '')}%</span>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.cornerHead} />
              {rows.map((r, i) => (
                <th key={i} className={styles.colHead}>
                  <button className={styles.colBtn} onClick={() => onSelect?.(r.c)} title="View details">
                    <span className={styles.colShort}>{shortAddr(r.c.address)}</span>
                    {r.c.town && <span className={styles.colTown}>{r.c.town}</span>}
                    {editingPrice === r.c.id ? (
                      <input
                        className={styles.priceInput}
                        value={editVal}
                        autoFocus
                        onChange={e => setEditVal(e.target.value)}
                        onBlur={() => commitPriceEdit(r.c.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitPriceEdit(r.c.id)
                          if (e.key === 'Escape') setEditingPrice(null)
                        }}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className={`${styles.colPrice} ${priceOverrides[r.c.id] != null ? styles.colPriceEdited : ''}`}
                        onClick={e => {
                          e.stopPropagation()
                          setEditingPrice(r.c.id)
                          setEditVal(r.price != null ? String(r.price) : '')
                        }}
                        title="Click to edit price"
                      >
                        {fmt(r.price)}
                      </span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className={styles.sectionRow}><td colSpan={rows.length + 1}>Property</td></tr>
            <tr className={styles.subRow}>
              <td className={styles.rowLabel}>Beds / Baths</td>
              {rows.map((r, i) => (
                <td key={i} className={styles.cell}>{r.c.beds ?? '—'} / {r.c.baths ?? '—'}</td>
              ))}
            </tr>
            {dataRow({ label: 'Down payment', get: r => r.down })}
            {dataRow({ label: 'Loan amount',  get: r => r.loan })}

            <tr className={styles.sectionRow}><td colSpan={rows.length + 1}>Monthly Carry</td></tr>
            {dataRow({ label: 'P&I',            get: r => r.piMo,  bestVal: best.piMo })}
            {dataRow({ label: 'Property taxes', get: r => r.taxMo, bestVal: best.taxMo })}
            {dataRow({ label: 'Insurance', sub: true, get: r => r.insMo })}

            {totalRow({ label: 'Gross monthly', get: r => r.grossMo,      bestVal: best.grossMo })}
            {totalRow({ label: 'Gross annual',  get: r => r.grossMo * 12, bestVal: best.grossMo == null ? null : best.grossMo * 12 })}

            <tr className={styles.sectionRow}><td colSpan={rows.length + 1}>Tax Savings ({fedRate}% rate, annual)</td></tr>
            {savRow({ label: 'Mortgage interest',  get: r => r.mortShieldAnn })}
            {savRow({ label: 'SALT — property tax', get: r => r.saltShieldAnn })}

            {totalRow({ label: 'Net monthly', get: r => r.netMo,      bestVal: best.netMo })}
            {totalRow({ label: 'Net annual',  get: r => r.netMo * 12, bestVal: best.netMo == null ? null : best.netMo * 12, emphasize: true })}
          </tbody>
        </table>
      </div>

      {/* Ranked summary */}
      <div className={styles.rankWrap}>
        <div className="sl">Ranked by after-tax annual cost</div>
        <div className={styles.rankGrid}>
          {ranked.map((r, rank) => (
            <div key={r.c.id} className={`${styles.rankCard} ${rank === 0 ? styles.rankBest : ''}`}>
              <div className={styles.rankNum}>#{rank + 1}</div>
              <div className={styles.rankShort}>{shortAddr(r.c.address)}</div>
              <div className={styles.rankNet}>{fmt(r.netMo * 12)}<span className={styles.rankUnit}>/yr</span></div>
              <div className={styles.rankMo}>{fmt(r.netMo)}/mo</div>
            </div>
          ))}
        </div>
      </div>

      <p className={styles.note}>
        After-tax assumes you itemize. Mortgage interest deductible on the first $750K of loan principal;
        property tax deductible up to the SALT cap (configurable in Model Settings). Insurance estimated at
        {' '}{insRate}% of price per year. Adjust down payment, term, and the marginal rate seed in Model Settings.
      </p>
    </div>
  )
}
