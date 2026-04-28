import { useMemo } from 'react'
import { buildPricingContext, buildPrediction, predictOutcome, CEIL_PSF } from '../../lib/scoring'
import { loadModelSettings } from '../../lib/modelSettings'
import { loadMortgagePrefs, calcMonthlyPayment } from '../../lib/mortgage'
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

const OUTCOME_LABEL = {
  over_ask:      '↑ Contract over ask',
  near_ask:      '≈ Contract near ask',
  under_ask:     '↓ Contract under ask',
  price_cut:     '✂ Price cut',
  remain_active: '● Remains active',
}

// ── Version A: Strip / dot plot ───────────────────────────────────────────────
// Each property as a circle on a $/SF axis. Circles stack upward on overlap.
function PsfStripPlot({ comps, ctx }) {
  const withPsf = comps.filter(c => c.psf)
  if (withPsf.length < 2) return null

  const W = 460, padX = 30, r = 5.5, spacing = r * 2.5
  const psfs  = withPsf.map(c => c.psf)
  const rawLo = Math.min(...psfs), rawHi = Math.max(...psfs)
  const span  = rawHi - rawLo || 50
  const domLo = rawLo - span * 0.08, domHi = rawHi + span * 0.08
  const xOf   = v => padX + ((v - domLo) / (domHi - domLo)) * (W - 2 * padX)

  const sorted = [...withPsf].sort((a, b) => a.psf - b.psf)
  const placed = []
  for (const c of sorted) {
    const x = xOf(c.psf)
    let row = 0
    while (placed.filter(p => p.row === row).some(p => Math.abs(p.x - x) < spacing * 2)) row++
    placed.push({ c, x, row })
  }
  const maxRow = Math.max(...placed.map(p => p.row), 0)
  const H      = Math.max(80, (maxRow + 2) * spacing + 36)
  const axisY  = H - 18
  const yOf    = row => axisY - r - 2 - row * spacing

  const dotFill = c => c.sold_date ? '#4a7fa8' : c.contract_date ? '#8a7030' : '#2A5C42'
  const refs    = ctx ? [
    { v: ctx.floor, label: `$${ctx.floor}`, color: 'var(--accent)' },
    { v: ctx.fair,  label: `$${ctx.fair}`,  color: 'var(--dim)'    },
    { v: ctx.ceil,  label: `$${ctx.ceil}`,  color: 'var(--red)'    },
  ] : []

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.histSvg}>
      {ctx && (
        <rect x={xOf(ctx.floor)} y={10} width={xOf(ctx.ceil) - xOf(ctx.floor)} height={axisY - 10}
          fill="rgba(42,92,66,0.04)" />
      )}
      <line x1={padX} y1={axisY} x2={W - padX} y2={axisY} stroke="var(--border2)" strokeWidth="0.7" />
      {refs.map(({ v, label, color }) => (
        <g key={v}>
          <line x1={xOf(v)} y1={14} x2={xOf(v)} y2={axisY}
            stroke={color} strokeWidth="0.7" strokeDasharray="2.5,2" />
          <text x={xOf(v)} y={H - 4} textAnchor="middle"
            fontSize="5.5" fontFamily="var(--font-m)" fill={color}>{label}</text>
        </g>
      ))}
      {placed.map(({ c, x, row }, i) => (
        <circle key={i} cx={x} cy={yOf(row)} r={r} fill={dotFill(c)} opacity="0.82" />
      ))}
    </svg>
  )
}

// ── Version B: Zone track ─────────────────────────────────────────────────────
// A horizontal band divided into floor / sweet-zone / above-ceiling regions.
// Each property is a tick + dot above the track.
function PsfZoneTrack({ comps, ctx }) {
  const withPsf = comps.filter(c => c.psf)
  if (withPsf.length < 2) return null

  const W = 460, H = 76, padX = 30
  const psfs  = withPsf.map(c => c.psf)
  const rawLo = Math.min(...psfs), rawHi = Math.max(...psfs)
  const span  = rawHi - rawLo || 50
  const domLo = rawLo - span * 0.1, domHi = rawHi + span * 0.1
  const xOf   = v => padX + ((v - domLo) / (domHi - domLo)) * (W - 2 * padX)

  const trackY = 36, trackH = 12
  const zones = ctx ? [
    { lo: domLo,     hi: ctx.floor, fill: 'rgba(42,92,66,0.07)'    },
    { lo: ctx.floor, hi: ctx.ceil,  fill: 'rgba(42,92,66,0.18)'    },
    { lo: ctx.ceil,  hi: domHi,     fill: 'rgba(139,58,42,0.08)'   },
  ] : []
  const refs = ctx ? [
    { v: ctx.floor, label: `Floor $${ctx.floor}`,   color: 'var(--accent)' },
    { v: ctx.fair,  label: `Median $${ctx.fair}`,   color: 'var(--dim)'    },
    { v: ctx.ceil,  label: `Ceiling $${ctx.ceil}`,  color: 'var(--red)'    },
  ] : []

  const tickFill = c => c.sold_date ? '#4a7fa8' : c.contract_date ? '#8a7030' : '#2A5C42'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.histSvg}>
      <rect x={padX} y={trackY} width={W - 2 * padX} height={trackH}
        fill="var(--surface)" stroke="var(--border)" strokeWidth="0.6" />
      {zones.map((z, i) => {
        const x1 = Math.max(padX, xOf(z.lo))
        const x2 = Math.min(W - padX, xOf(z.hi))
        if (x2 <= x1) return null
        return <rect key={i} x={x1} y={trackY} width={x2 - x1} height={trackH} fill={z.fill} />
      })}
      {refs.map(({ v, color }) => (
        <line key={v} x1={xOf(v)} y1={trackY} x2={xOf(v)} y2={trackY + trackH}
          stroke={color} strokeWidth="0.8" />
      ))}
      {withPsf.map((c, i) => (
        <g key={i}>
          <line x1={xOf(c.psf)} y1={trackY - 14} x2={xOf(c.psf)} y2={trackY - 2}
            stroke={tickFill(c)} strokeWidth="1.8" opacity="0.85" />
          <circle cx={xOf(c.psf)} cy={trackY - 17} r="3.5" fill={tickFill(c)} opacity="0.85" />
        </g>
      ))}
      {refs.map(({ v, label, color }) => (
        <text key={v} x={xOf(v)} y={H - 2} textAnchor="middle"
          fontSize="5.2" fontFamily="var(--font-m)" fill={color}>{label}</text>
      ))}
    </svg>
  )
}

// ── Version C: Ranked horizontal bars ────────────────────────────────────────
// One bar per property sorted $/SF low → high. Street number as row label.
function PsfRankBars({ comps, ctx }) {
  const withPsf = comps.filter(c => c.psf)
  if (withPsf.length < 2) return null

  const sorted  = [...withPsf].sort((a, b) => a.psf - b.psf)
  const maxDom  = ctx ? ctx.ceil * 1.08 : Math.max(...sorted.map(c => c.psf)) * 1.08
  const W = 460, rowH = 16, padX = 44, padY = 8, padR = 44
  const barMaxW = W - padX - padR
  const H       = sorted.length * rowH + padY * 2 + 14

  const bw      = psf => Math.min((psf / maxDom) * barMaxW, barMaxW)
  const barFill = c => c.sold_date
    ? 'rgba(74,127,168,0.72)' : c.contract_date
    ? 'rgba(138,112,48,0.72)' : 'rgba(42,92,66,0.72)'

  const medX  = ctx ? padX + (ctx.fair / maxDom) * barMaxW : null
  const ceilX = ctx ? padX + (ctx.ceil / maxDom) * barMaxW : null

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.histSvg}>
      {medX && <>
        <line x1={medX} y1={padY} x2={medX} y2={H - 14}
          stroke="var(--dim)" strokeWidth="0.6" strokeDasharray="2,2" opacity="0.5" />
        <text x={medX} y={H - 2} textAnchor="middle"
          fontSize="5" fontFamily="var(--font-m)" fill="var(--dim)">Med ${ctx.fair}</text>
      </>}
      {ceilX && <>
        <line x1={ceilX} y1={padY} x2={ceilX} y2={H - 14}
          stroke="var(--red)" strokeWidth="0.6" strokeDasharray="2,2" opacity="0.5" />
        <text x={ceilX} y={H - 2} textAnchor="middle"
          fontSize="5" fontFamily="var(--font-m)" fill="var(--red)">Ceil ${ctx.ceil}</text>
      </>}
      {sorted.map((c, i) => {
        const y   = padY + i * rowH
        const num = (c.address ?? '').split(' ')[0]
        const w   = bw(c.psf)
        const over = ctx && c.psf > ctx.ceil
        return (
          <g key={c.id ?? i}>
            <text x={padX - 5} y={y + rowH * 0.72} textAnchor="end"
              fontSize="5.5" fontFamily="var(--font-m)" fill="var(--dim)">{num}</text>
            <rect x={padX} y={y + 3} width={w} height={rowH - 6}
              fill={barFill(c)} rx="1.5"
              stroke={over ? 'var(--red)' : 'none'} strokeWidth="0.6" />
            <text x={padX + w + 4} y={y + rowH * 0.72}
              fontSize="5.5" fontFamily="var(--font-m)" fill={over ? 'var(--red)' : 'var(--dim)'}>
              ${c.psf}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function PsfHistogramVariants({ comps, ctx }) {
  const variants = [
    {
      id: 'a', label: 'A · Strip Plot',
      desc: 'Each property as a dot on a $/SF axis — stacks on overlap.',
      chart: <PsfStripPlot comps={comps} ctx={ctx} />,
    },
    {
      id: 'b', label: 'B · Price Zone Track',
      desc: 'Properties as ticks above a track divided into floor / sweet-zone / above-ceiling bands.',
      chart: <PsfZoneTrack comps={comps} ctx={ctx} />,
    },
    {
      id: 'c', label: 'C · Ranked Bars',
      desc: 'One bar per property sorted low → high. Street number as label.',
      chart: <PsfRankBars comps={comps} ctx={ctx} />,
    },
  ]

  return (
    <div className={styles.histSection}>
      <div className={styles.subhead}>$/SF Distribution</div>
      <div className={styles.variantGrid}>
        {variants.map(v => (
          <div key={v.id} className={styles.variantCard}>
            <div className={styles.variantMeta}>
              <span className={styles.variantLabel}>{v.label}</span>
              <span className={styles.variantDesc}>{v.desc}</span>
            </div>
            {v.chart}
            <div className={styles.histLegend}>
              <span><span className={`${styles.histSwatch} ${styles.histSwatchActive}`} />Active</span>
              <span><span className={`${styles.histSwatch} ${styles.histSwatchContract}`} />In Contract</span>
              <span><span className={`${styles.histSwatch} ${styles.histSwatchSold}`} />Sold</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function OffersTab({ comps }) {
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
                  <tr key={c.id} className={`${styles.row} ${aboveCeil ? styles.rowAboveCeil : ''}`}>
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

      <PsfHistogramVariants comps={comps} ctx={ctx} />
    </div>
  )
}
