import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'
import { buildPricingContext, buildPrediction, predictOutcome, CEIL_PSF } from '../../lib/scoring'
import { loadModelSettings } from '../../lib/modelSettings'
import { loadMortgagePrefs, calcMonthlyPayment } from '../../lib/mortgage'
import { useSortable } from '../../hooks/useSortable.jsx'
import { useChartColors, CHART_FONT } from '../charts/chartTheme'
import Sparkline from '../charts/Sparkline'
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

const OUTCOME_LABEL = {
  over_ask:      '↑ Contract over ask',
  near_ask:      '≈ Contract near ask',
  under_ask:     '↓ Contract under ask',
  price_cut:     '✂ Price cut',
  remain_active: '● Remains active',
}

// ── $/SF distribution — ranked horizontal bars (Recharts) ─────────────────────
// One bar per property sorted $/SF low → high, colored by listing status, with
// floor / median / ceiling reference lines from the pricing context.
function PsfDistTip({ active, payload, colors }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 6,
      padding: '7px 10px', fontFamily: CHART_FONT, fontSize: 11, color: colors.text,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.address}</div>
      <div style={{ color: colors.text2 }}>${d.psf}/SF · {d.statusLabel}</div>
    </div>
  )
}

function PsfDistributionChart({ comps, ctx }) {
  const colors  = useChartColors()
  const withPsf = comps.filter(c => c.psf)
  if (withPsf.length < 2) return null

  const statusOf = c => c.sold_date ? 'sold' : c.contract_date ? 'contract' : 'active'
  const labelOf  = s => s === 'sold' ? 'Sold' : s === 'contract' ? 'In Contract' : 'Active'
  const colorOf  = s => s === 'sold' ? colors.statusClosed : s === 'contract' ? colors.statusContract : colors.statusActive

  const data = [...withPsf].sort((a, b) => a.psf - b.psf).map(c => {
    const st = statusOf(c)
    return {
      name: (c.address ?? '').split(' ')[0],
      psf: c.psf, status: st, statusLabel: labelOf(st), address: c.address,
    }
  })
  const height = data.length * 26 + 34
  const maxX = ctx ? Math.max(ctx.ceil * 1.05, ...data.map(d => d.psf)) : Math.max(...data.map(d => d.psf)) * 1.08

  const refLabel = (txt, color) => ({
    value: txt, position: 'top', fill: color, fontFamily: CHART_FONT, fontSize: 9,
  })

  return (
    <div className={styles.histSection}>
      <div className={styles.subhead}>$/SF Distribution</div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 18, right: 44, bottom: 6, left: 6 }}>
          <CartesianGrid horizontal={false} stroke={colors.border} strokeDasharray="2 4" />
          <XAxis
            type="number" domain={[0, maxX]}
            tick={{ fill: colors.dim, fontFamily: CHART_FONT, fontSize: 9 }}
            tickLine={false} axisLine={{ stroke: colors.border }}
            tickFormatter={v => `$${v}`}
          />
          <YAxis
            type="category" dataKey="name" width={46}
            tick={{ fill: colors.dim, fontFamily: CHART_FONT, fontSize: 9 }}
            tickLine={false} axisLine={false}
          />
          <Tooltip cursor={{ fill: colors.surface }} content={props => <PsfDistTip {...props} colors={colors} />} />
          {ctx && <ReferenceLine x={ctx.floor} stroke={colors.accent} strokeDasharray="4 3" label={refLabel(`Floor $${ctx.floor}`, colors.accent)} />}
          {ctx && <ReferenceLine x={ctx.fair}  stroke={colors.dim}    strokeDasharray="4 3" label={refLabel(`Median $${ctx.fair}`, colors.dim)} />}
          {ctx && <ReferenceLine x={ctx.ceil}  stroke={colors.red}    strokeDasharray="4 3" label={refLabel(`Ceiling $${ctx.ceil}`, colors.red)} />}
          <Bar dataKey="psf" radius={[0, 2, 2, 0]} isAnimationActive={false}
            label={{ position: 'right', fill: colors.dim, fontFamily: CHART_FONT, fontSize: 9, formatter: v => `$${v}` }}>
            {data.map((d, i) => <Cell key={i} fill={colorOf(d.status)} fillOpacity={0.82} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className={styles.histLegend}>
        <span><span className={styles.histSwatch} style={{ background: colors.statusActive }} />Active</span>
        <span><span className={styles.histSwatch} style={{ background: colors.statusContract }} />In Contract</span>
        <span><span className={styles.histSwatch} style={{ background: colors.statusClosed }} />Sold</span>
      </div>
    </div>
  )
}

export default function OffersStrategy({ comps, onSelect }) {
  const ctx      = useMemo(() => buildPricingContext(comps), [comps])
  const ms       = useMemo(() => loadModelSettings(), [])
  const morPrefs = useMemo(() => loadMortgagePrefs(), [])
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
    const lev     = leverageScore(c, medPsf)
    const pred    = buildPrediction(c, comps, ms)
    const outcome = predictOutcome(c, comps, velocity?.label ?? null, medPsf)
    return {
      ...c,
      _lev:        lev.total,
      _levDetail:  lev,
      _ask:        c.last_list_price ?? c.original_list_price,
      _predicted:  pred ? Math.round(pred.predicted / 1000) : null,
      _vsAsk:      pred ? Math.round(pred.vsAsk     / 1000) : null,
      _outcome:    outcome,
    }
  }), [active, comps, medPsf, ms, velocity])

  const { sorted: sortedLev, handleSort: handleLevSort, SortIcon: LevIcon } = useSortable(activeEnriched, '_lev', 'desc')

  // ── Price targets table (sold + in-contract only) ────────────────────────
  const enriched = useMemo(() => {
    const target = comps.filter(c => c.sold_date || c.contract_date)
    return target.map(c => {
      const actual = (c.sold_date ? c.sold_price : null) ?? c.last_list_price ?? c.original_list_price
      const pred   = buildPrediction(c, comps, ms)
      const mo     = actual
        ? calcMonthlyPayment(actual * (1 - morPrefs.downPct / 100), morPrefs.rate, morPrefs.term)
          + (c.taxes ? c.taxes / 12 : 0)
          + actual * (ms.insuranceRate / 100) / 12
        : null
      return {
        ...c,
        _actual:    actual,
        _predicted: pred ? Math.round(pred.predicted / 1000) : null,
        _monthly:   mo   ? Math.round(mo)                   : null,
      }
    })
  }, [comps, ms, morPrefs])

  const { sorted, handleSort, SortIcon } = useSortable(enriched, 'psf', 'asc')

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
              <Sparkline data={velocity.timeline.map(c => c.days_on_market)} height={44} />
              {velocity.recent.length > 0 && (
                <div className={styles.sparkLegend}>
                  median {velocity.medAll}d · {velocity.recent.length} in last 90d
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
                <ThL colKey="_predicted"     label="Pred. Close"   />
                <th className={`${styles.th} ${styles.thRight}`}>Likely Outcome</th>
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
                  <tr
                    key={c.id}
                    className={styles.row}
                    onClick={() => onSelect?.(c)}
                    style={onSelect ? { cursor: 'pointer' } : undefined}
                  >
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
                    <td>
                      <div className={styles.predCell}>
                        <span className={styles.predVal}>{c._predicted ? `$${c._predicted}K` : '—'}</span>
                        {c._vsAsk != null && c._predicted && (
                          <span className={c._vsAsk < 0 ? styles.predDown : styles.predUp}>
                            {c._vsAsk >= 0 ? '+' : ''}{c._vsAsk}K vs ask
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {c._outcome ? (
                        <div className={styles.outcomeCell}>
                          <span className={`${styles.outcomeBadge} ${styles['outcome_' + c._outcome.outcome]}`}>
                            {OUTCOME_LABEL[c._outcome.outcome]}
                          </span>
                          <span className={styles.outcomeCnf}>{c._outcome.confidence} confidence</span>
                        </div>
                      ) : (
                        <div className={styles.cell}>—</div>
                      )}
                    </td>
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
            <span className={styles.ctxLbl}>Median $/SF</span>
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
            <span className={styles.ctxLbl}>Ceiling (μ+2σ)</span>
            <span className={styles.ctxVal} style={{ color: 'var(--red)' }}>${ctx.ceil}</span>
          </div>
          <div className={styles.ctxDivider} />
          <div className={styles.ctxStat}>
            <span className={styles.ctxLbl}>Closed ($/SF source)</span>
            <span className={styles.ctxVal}>{ctx.n}</span>
          </div>
          <div className={styles.ctxDivider} />
          <div className={styles.ctxStat}>
            <span className={styles.ctxLbl}>In Contract</span>
            <span className={styles.ctxVal}>{inContract.length}</span>
          </div>
        </div>
      ) : (
        <p className={styles.noCtx}>Add closed comps to activate fair value calculations.</p>
      )}

      <div className={styles.subhead}>Price Targets — Sold &amp; In Contract</div>
      {enriched.length === 0 ? (
        <div className={styles.empty}>No sold or in-contract properties in this pool.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <Th colKey="address"    label="Property"    left />
                <Th colKey="_actual"    label="Ask / Sold"       />
                <Th colKey="psf"        label="$/SF"             />
                <Th colKey="_predicted" label="Pred. Close"      />
                <Th colKey="taxes"      label="Taxes"            />
                <Th colKey="beds"       label="Beds"             />
                <Th colKey="baths"      label="Baths"            />
                <Th colKey="_monthly"   label="Total /mo"        />
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => {
                const aboveCeil = c.psf && c.psf > ceilPsf
                return (
                  <tr
                    key={c.id}
                    className={`${styles.row} ${aboveCeil ? styles.rowAboveCeil : ''}`}
                    onClick={() => onSelect?.(c)}
                    style={onSelect ? { cursor: 'pointer' } : undefined}
                  >
                    <td className={styles.addrCellBlock}>
                      <span className={styles.addrLine}>{c.address}</span>
                      {c.town && <span className={styles.town}>{c.town}</span>}
                      <div className={styles.tagRow}>
                        {c.sold_date
                          ? <span className={styles.soldTag}>sold</span>
                          : <span className={styles.contractTag}>in contract</span>
                        }
                        {aboveCeil && <span className={styles.ceilTag}>above ceiling</span>}
                      </div>
                    </td>
                    <td><div className={styles.cell}>{c._actual ? fmtK(c._actual) : '—'}</div></td>
                    <td><div className={`${styles.cell} ${aboveCeil ? styles.psfBad : ''}`}>{c.psf ? `$${c.psf}` : '—'}</div></td>
                    <td><div className={`${styles.cell} ${styles.predVal}`}>{c._predicted ? `$${c._predicted}K` : '—'}</div></td>
                    <td><div className={styles.cell}>{c.taxes ? `$${Math.round(c.taxes / 1000)}K` : '—'}</div></td>
                    <td><div className={styles.cell}>{c.beds ?? '—'}</div></td>
                    <td><div className={styles.cell}>{c.baths ?? '—'}</div></td>
                    <td><div className={styles.cell}>{c._monthly ? `$${(c._monthly / 1000).toFixed(1)}K` : '—'}</div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className={styles.note}>
        Pred. Close blends fair value with pool sale-to-list ratio — add closed comps to improve accuracy.
        Total /mo = P&amp;I ({morPrefs.rate}%, {morPrefs.downPct}% down, {morPrefs.term}yr) + taxes + insurance ({ms.insuranceRate}% of price/yr).
      </p>

      <PsfDistributionChart comps={comps} ctx={ctx} />
    </div>
  )
}
