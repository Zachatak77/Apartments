import { useMemo } from 'react'
import { buildPricingContext, CEIL_PSF } from '../../lib/scoring'
import { useSortable } from '../../hooks/useSortable.jsx'
import styles from './OffersTab.module.css'

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
  return { total: domPts + cutPts + psfPts, dom, cut, psfDiscount }
}

function velocityStats(closed) {
  if (!closed.length) return null
  const withDom = closed.filter(c => c.days_on_market > 0)
  if (!withDom.length) return null

  const medAll = median(withDom.map(c => c.days_on_market))

  // Sort by sold_date for the timeline and trend calc
  const timeline = [...withDom].sort((a, b) => {
    if (!a.sold_date && !b.sold_date) return 0
    if (!a.sold_date) return 1
    if (!b.sold_date) return -1
    return new Date(a.sold_date) - new Date(b.sold_date)
  })

  // 90-day split: recent vs older
  const cutoff = new Date(Date.now() - 90 * 86400000)
  const recent = timeline.filter(c => c.sold_date && new Date(c.sold_date) >= cutoff)
  const older  = timeline.filter(c => !c.sold_date || new Date(c.sold_date) < cutoff)

  let trend = null
  if (recent.length >= 2 && older.length >= 2) {
    const medRecent = median(recent.map(c => c.days_on_market))
    const medOlder  = median(older.map(c => c.days_on_market))
    const diff = medOlder - medRecent   // positive = getting faster
    const pct  = medOlder ? Math.abs(diff / medOlder) : 0
    trend = {
      dir:       pct < 0.1 ? 'stable' : diff > 0 ? 'faster' : 'slower',
      diff:      Math.round(Math.abs(diff)),
      medRecent,
      medOlder,
    }
  } else if (timeline.length >= 4) {
    // Fall back to first-half / second-half split
    const half = Math.floor(timeline.length / 2)
    const medRecent = median(timeline.slice(half).map(c => c.days_on_market))
    const medOlder  = median(timeline.slice(0, half).map(c => c.days_on_market))
    const diff = medOlder - medRecent
    const pct  = medOlder ? Math.abs(diff / medOlder) : 0
    trend = {
      dir:       pct < 0.1 ? 'stable' : diff > 0 ? 'faster' : 'slower',
      diff:      Math.round(Math.abs(diff)),
      medRecent,
      medOlder,
    }
  }

  const label   = medAll < 14 ? 'Highly Competitive' : medAll < 30 ? 'Active' : medAll < 60 ? 'Moderate' : 'Cooling'
  const urgency = medAll < 14
    ? 'Act fast — limited negotiating room, expect competing offers.'
    : medAll < 30
    ? 'Active market — some flexibility, but don\'t delay your offer.'
    : medAll < 60
    ? 'Moderate pace — standard negotiating dynamics apply.'
    : 'Cooling market — extended DOM signals buyer leverage, negotiate aggressively.'

  return { medAll, trend, label, urgency, timeline, recent }
}

const fmtK = v => v ? `$${Math.round(v / 1000)}K` : '—'

export default function OffersTab({ comps }) {
  const ctx     = useMemo(() => buildPricingContext(comps), [comps])
  const fpsf    = ctx?.fair  ?? null
  const ceilPsf = ctx?.ceil  ?? CEIL_PSF

  const active     = comps.filter(c => !c.contract_date && !c.sold_date)
  const inContract = comps.filter(c => !!c.contract_date && !c.sold_date)
  const closed     = comps.filter(c => !!c.sold_date)

  const psfs   = comps.map(c => c.psf).filter(Boolean)
  const medPsf = median(psfs)

  const velocity = useMemo(() => velocityStats(closed), [closed])

  const avgDom   = active.length
    ? Math.round(active.reduce((s, c) => s + (c.days_on_market ?? 0), 0) / active.length)
    : null
  const withCuts = active.filter(c =>
    c.original_list_price && c.last_list_price && c.original_list_price > c.last_list_price
  )

  // ── Leverage table (active) ──────────────────────────────────────────────
  const activeEnriched = useMemo(() => active.map(c => {
    const lev = leverageScore(c, medPsf)
    return { ...c, _lev: lev.total, _levDetail: lev, _ask: c.last_list_price ?? c.original_list_price }
  }), [active, medPsf])

  const { sorted: sortedLev, handleSort: handleLevSort, SortIcon: LevIcon } = useSortable(activeEnriched, '_lev', 'desc')

  // ── Price targets table (all comps) ──────────────────────────────────────
  const enriched = useMemo(() => comps.map(c => {
    const actual    = (c.sold_date ? c.sold_price : null) ?? c.last_list_price ?? c.original_list_price
    const fairPrice = fpsf && c.sqft ? Math.round(fpsf * c.sqft / 1000) : null
    const maxOffer  = actual && c.sqft
      ? Math.round(Math.min(actual * 0.97, ceilPsf * c.sqft) / 1000)
      : null
    return { ...c, _actual: actual, _fairPrice: fairPrice, _maxOffer: maxOffer }
  }), [comps, fpsf, ceilPsf])

  const { sorted, handleSort, SortIcon } = useSortable(enriched, 'psf', 'asc')

  const maxDom = velocity ? Math.max(...velocity.timeline.map(c => c.days_on_market), 1) : 1
  const recentIds = new Set((velocity?.recent ?? []).map(c => c.id))

  const ThL = ({ colKey, label, left }) => (
    <th className={`${styles.th} ${styles.thSortable} ${left ? styles.thLeft : ''}`}
      onClick={() => handleLevSort(colKey)}>
      {label}<LevIcon colKey={colKey} />
    </th>
  )

  const Th = ({ colKey, label, left }) => (
    <th className={`${styles.th} ${styles.thSortable} ${left ? styles.thLeft : ''}`}
      onClick={() => handleSort(colKey)}>
      {label}<SortIcon colKey={colKey} />
    </th>
  )

  return (
    <div>
      <div className="sl">Offer strategy</div>
      <h2 className={styles.title}>Offers</h2>

      {/* ── SECTION 1: How quickly / how aggressively? ── */}
      <div className={styles.qLabel}>How quickly and aggressively should I move?</div>

      {velocity ? (
        <div className={styles.velPanel}>
          <div className={styles.velLeft}>
            <div className={styles.velNum}>{velocity.medAll}<span className={styles.velUnit}>d</span></div>
            <div className={styles.velSub}>median days to contract</div>
            <span className={`${styles.velBadge} ${styles['velBadge' + velocity.label.replace(' ', '')]}`}>
              {velocity.label}
            </span>
          </div>

          <div className={styles.velDivider} />

          <div className={styles.velMid}>
            <div className={styles.velUrgency}>{velocity.urgency}</div>
            {velocity.trend && (
              <div className={`${styles.velTrend} ${styles['velTrend' + velocity.trend.dir[0].toUpperCase() + velocity.trend.dir.slice(1)]}`}>
                <span className={styles.velArrow}>
                  {velocity.trend.dir === 'faster' ? '↑' : velocity.trend.dir === 'slower' ? '↓' : '→'}
                </span>
                {velocity.trend.dir === 'stable'
                  ? `Stable — pace consistent across pool`
                  : `${velocity.trend.dir === 'faster' ? 'Accelerating' : 'Cooling'} — recent sales contracting ${velocity.trend.diff}d ${velocity.trend.dir} (${velocity.trend.medRecent}d) than older comps (${velocity.trend.medOlder}d)`
                }
              </div>
            )}
          </div>

          {velocity.timeline.length > 1 && (
            <div className={styles.velRight}>
              <div className={styles.sparkLabel}>DOM over time (oldest → newest)</div>
              <div className={styles.spark}>
                {velocity.timeline.map((c, i) => (
                  <div
                    key={c.id ?? i}
                    className={`${styles.sparkBar} ${recentIds.has(c.id) ? styles.sparkBarRecent : ''}`}
                    style={{ height: `${Math.max(4, Math.round((c.days_on_market / maxDom) * 44))}px` }}
                    title={`${c.address}: ${c.days_on_market}d${c.sold_date ? ' · ' + c.sold_date : ''}`}
                  />
                ))}
              </div>
              {velocity.recent.length > 0 && (
                <div className={styles.sparkLegend}>
                  <span className={styles.sparkDotRecent} /> last 90d
                  <span className={styles.sparkDotOld} /> older
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.velEmpty}>Add closed comps with days-on-market data to see market velocity.</div>
      )}

      {/* Pool stats */}
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
      <div className={styles.subhead}>Active Listings — Negotiating Leverage</div>
      {active.length === 0 ? (
        <div className={styles.empty}>No active listings in this pool.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <ThL colKey="address"        label="Property" left />
                <ThL colKey="_ask"           label="Ask"           />
                <ThL colKey="psf"            label="$/SF"          />
                <ThL colKey="days_on_market" label="DOM"           />
                <th className={`${styles.th} ${styles.thRight}`}>Cut</th>
                <ThL colKey="_lev"           label="Leverage"      />
              </tr>
            </thead>
            <tbody>
              {sortedLev.map((c, i) => {
                const lev   = c._levDetail
                const badge = lev.total >= 6 ? 'Strong' : lev.total >= 4 ? 'High' : lev.total >= 2 ? 'Moderate' : 'Low'
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
                    <td><div className={styles.cell}>{fmtK(c._ask)}</div></td>
                    <td><div className={`${styles.cell} ${psfCls}`}>{c.psf ? `$${c.psf}` : '—'}</div></td>
                    <td><div className={`${styles.cell} ${lev.dom > 60 ? styles.domHot : lev.dom > 30 ? styles.domWarm : ''}`}>{lev.dom > 0 ? `${lev.dom}d` : '—'}</div></td>
                    <td><div className={`${styles.cell} ${lev.cut > 0 ? styles.cutPos : ''}`}>{cut}</div></td>
                    <td><div className={styles.cell}><span className={`${styles.levBadge} ${cls}`}>{badge}</span></div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── SECTION 2: What should I pay? ── */}
      <div className={styles.qLabel} style={{ marginTop: 36 }}>What should I pay?</div>

      {ctx ? (
        <div className={styles.ctxBar}>
          <div className={styles.ctxStat}>
            <span className={styles.ctxLbl}>Fair $/SF</span>
            <span className={styles.ctxVal}>${ctx.fair}</span>
          </div>
          <div className={styles.ctxDivider} />
          <div className={styles.ctxStat}>
            <span className={styles.ctxLbl}>Std Dev (σ)</span>
            <span className={styles.ctxVal}>±${ctx.stdDev}</span>
          </div>
          <div className={styles.ctxDivider} />
          <div className={styles.ctxStat}>
            <span className={styles.ctxLbl}>Floor (μ−σ)</span>
            <span className={styles.ctxVal} style={{ color: 'var(--accent)' }}>${ctx.floor}</span>
          </div>
          <div className={styles.ctxDivider} />
          <div className={styles.ctxStat}>
            <span className={styles.ctxLbl}>Ceiling (μ+σ)</span>
            <span className={styles.ctxVal} style={{ color: 'var(--red)' }}>${ctx.ceil}</span>
          </div>
          <div className={styles.ctxDivider} />
          <div className={styles.ctxStat}>
            <span className={styles.ctxLbl}>From</span>
            <span className={styles.ctxVal}>{ctx.n} closed sale{ctx.n !== 1 ? 's' : ''}</span>
          </div>
        </div>
      ) : (
        <p className={styles.noCtx}>Add closed comps to activate fair value calculations.</p>
      )}

      <div className={styles.subhead}>Price Targets</div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <Th colKey="address"    label="Property"  left />
              <Th colKey="_actual"    label="Ask / Sold"      />
              <Th colKey="psf"        label="$/SF"            />
              <Th colKey="_fairPrice" label="Fair Val"        />
              <Th colKey="_maxOffer"  label="Max Offer"       />
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => {
              const aboveCeil = c.psf && c.psf > ceilPsf
              const hasCut    = c.original_list_price && c.last_list_price && c.original_list_price > c.last_list_price
              return (
                <tr key={c.id} className={aboveCeil ? styles.rowAboveCeil : ''}>
                  <td className={styles.addrCellBlock}>
                    <span className={styles.addrLine}>{c.address}</span>
                    {c.town && <span className={styles.town}>{c.town}</span>}
                    {aboveCeil && <span className={styles.ceilTag}>above ceiling</span>}
                    {hasCut && <span className={styles.cutTag}>↓${Math.round((c.original_list_price - c.last_list_price) / 1000)}K cut</span>}
                  </td>
                  <td><div className={styles.cell}>${c._actual ? Math.round(c._actual / 1000) : '—'}K</div></td>
                  <td><div className={`${styles.cell} ${aboveCeil ? styles.psfBad : ''}`}>{c.psf ? `$${c.psf}` : '—'}</div></td>
                  <td><div className={`${styles.cell} ${styles.fairVal}`}>{c._fairPrice ? `$${c._fairPrice}K` : '—'}</div></td>
                  <td><div className={`${styles.cell} ${styles.maxOffer}`}>{c._maxOffer ? `$${c._maxOffer}K` : '—'}</div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {ctx && ctx.n < 4 && (
        <p className={styles.note}>
          Fair value = μ of closed $/SF · Ceiling = μ + 1σ · Max Offer = min(97% of ask, ceiling × sqft). Add more closed comps to improve confidence.
        </p>
      )}
    </div>
  )
}
