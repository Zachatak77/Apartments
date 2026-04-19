import { useMemo } from 'react'
import { buildPricingContext } from '../../lib/scoring'
import { useSortable } from '../../hooks/useSortable.jsx'
import styles from './TornadoTab.module.css'

function median(arr) {
  if (!arr.length) return null
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}

function leverageScore(c, medPsf) {
  const dom = c.days_on_market ?? 0
  const cut = (c.original_list_price ?? 0) - (c.last_list_price ?? c.original_list_price ?? 0)
  const psfDiscount = medPsf && c.psf ? ((medPsf - c.psf) / medPsf) * 100 : 0

  const domPts = dom > 60 ? 3 : dom > 30 ? 2 : dom > 14 ? 1 : 0
  const cutPts = cut > 150000 ? 3 : cut > 75000 ? 2 : cut > 25000 ? 1 : 0
  const psfPts = psfDiscount > 10 ? 2 : psfDiscount > 2 ? 1 : 0
  return { total: domPts + cutPts + psfPts, domPts, cutPts, psfPts, dom, cut, psfDiscount }
}

const fmtK = v => v ? `$${Math.round(v / 1000)}K` : '—'

export default function TornadoTab({ comps }) {
  const pricing = useMemo(() => buildPricingContext(comps), [comps])

  const active     = comps.filter(c => !c.contract_date && !c.sold_date)
  const inContract = comps.filter(c => !!c.contract_date && !c.sold_date)
  const closed     = comps.filter(c => !!c.sold_date)

  const psfs   = comps.map(c => c.psf).filter(Boolean)
  const medPsf = median(psfs)

  const activeEnriched = useMemo(() => active.map(c => {
    const lev = leverageScore(c, medPsf)
    const ask = c.last_list_price ?? c.original_list_price
    return { ...c, _lev: lev.total, _levDetail: lev, _ask: ask }
  }), [active, medPsf])

  const { sorted, handleSort, SortIcon } = useSortable(activeEnriched, '_lev', 'desc')

  const avgDom = active.length
    ? Math.round(active.reduce((s, c) => s + (c.days_on_market ?? 0), 0) / active.length)
    : null

  const withCuts = active.filter(c => c.original_list_price && c.last_list_price && c.original_list_price > c.last_list_price)

  const Th = ({ colKey, label, left }) => (
    <th
      className={`${styles.th} ${styles.thSortable} ${left ? styles.thLeft : ''}`}
      onClick={() => handleSort(colKey)}
    >
      {label}<SortIcon colKey={colKey} />
    </th>
  )

  return (
    <div>
      <div className="sl">Negotiation intelligence</div>
      <h2 className={styles.title}>Active Listing Leverage</h2>
      <p className={styles.sub}>
        Active listings ranked by negotiating opportunity — a composite of days on market,
        price cut history, and $/SF discount to pool median.
      </p>

      {/* Pool pulse stat row */}
      <div className={styles.statRow}>
        <div className="stat-card">
          <div className="stat-card-val"><em>{active.length}</em> / {inContract.length} / {closed.length}</div>
          <div className="stat-card-lbl">Active / Contract / Sold</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-val">{avgDom != null ? <em>{avgDom}d</em> : '—'}</div>
          <div className="stat-card-lbl">Avg DOM (active)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-val"><em>{withCuts.length}</em> of {active.length}</div>
          <div className="stat-card-lbl">Active w/ price cut</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-val">{medPsf ? <em>${medPsf}</em> : '—'}</div>
          <div className="stat-card-lbl">Pool median $/SF</div>
        </div>
      </div>

      {/* Active leverage table */}
      {active.length === 0 ? (
        <div className={styles.empty}>No active listings in this pool.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <Th colKey="address"   label="Property"  left />
                <Th colKey="_ask"      label="Ask"       />
                <Th colKey="psf"       label="$/SF"      />
                <Th colKey="days_on_market" label="DOM"  />
                <th className={`${styles.th} ${styles.thRight}`}>Cut</th>
                <Th colKey="_lev"      label="Leverage"  />
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, i) => {
                const lev   = c._levDetail
                const label = lev.total >= 6 ? 'Strong' : lev.total >= 4 ? 'High' : lev.total >= 2 ? 'Moderate' : 'Low'
                const cls   = lev.total >= 6 ? styles.levStrong : lev.total >= 4 ? styles.levHigh : lev.total >= 2 ? styles.levMod : styles.levLow
                const psfCls = medPsf && c.psf
                  ? (c.psf < medPsf * 0.95 ? styles.psfGood : c.psf > medPsf * 1.05 ? styles.psfBad : '')
                  : ''
                const cut = lev.cut > 0 ? `−${fmtK(lev.cut)}` : '—'
                return (
                  <tr key={c.id} className={styles.row}>
                    <td className={styles.addrCell}>
                      <span className={styles.rank}>#{i + 1}</span>
                      <div>
                        <div className={styles.addr}>{c.address}</div>
                        {c.town && <div className={styles.town}>{c.town}</div>}
                      </div>
                    </td>
                    <td className={styles.num}>{fmtK(c._ask)}</td>
                    <td className={`${styles.num} ${psfCls}`}>{c.psf ? `$${c.psf}` : '—'}</td>
                    <td className={`${styles.num} ${lev.dom > 60 ? styles.domHot : lev.dom > 30 ? styles.domWarm : ''}`}>
                      {lev.dom > 0 ? `${lev.dom}d` : '—'}
                    </td>
                    <td className={`${styles.num} ${lev.cut > 0 ? styles.cutPos : ''}`}>{cut}</td>
                    <td className={styles.num}>
                      <span className={`${styles.levBadge} ${cls}`}>{label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Closed comps summary */}
      {closed.length > 0 && (
        <>
          <div className={styles.subhead}>Closed Comps</div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={`${styles.th} ${styles.thLeft}`}>Property</th>
                  <th className={styles.th}>Sold</th>
                  <th className={styles.th}>$/SF</th>
                  <th className={styles.th}>DOM</th>
                  <th className={styles.th}>vs Ask</th>
                </tr>
              </thead>
              <tbody>
                {closed.map(c => {
                  const r = c.sold_price && c.last_list_price
                    ? (c.sold_price / c.last_list_price * 100).toFixed(1)
                    : null
                  const rCls = r ? (parseFloat(r) >= 100 ? styles.psfBad : parseFloat(r) < 97 ? styles.psfGood : '') : ''
                  return (
                    <tr key={c.id} className={styles.row}>
                      <td className={styles.addrCell}>
                        <div className={styles.addr}>{c.address}</div>
                        {c.town && <div className={styles.town}>{c.town}</div>}
                      </td>
                      <td className={styles.num}>{fmtK(c.sold_price)}</td>
                      <td className={styles.num}>{c.psf ? `$${c.psf}` : '—'}</td>
                      <td className={styles.num}>{c.days_on_market ? `${c.days_on_market}d` : '—'}</td>
                      <td className={`${styles.num} ${rCls}`}>{r ? `${r}%` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {pricing && (
            <div className={styles.pricingNote}>
              Pool $/SF — Fair: <strong>${pricing.fair}</strong> · Floor: <strong>${pricing.floor}</strong> · Ceiling: <strong>${pricing.ceil}</strong> · based on {pricing.n} closed sale{pricing.n !== 1 ? 's' : ''}
            </div>
          )}
        </>
      )}
    </div>
  )
}
