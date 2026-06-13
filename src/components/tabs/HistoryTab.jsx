import { useState } from 'react'
import styles from './HistoryTab.module.css'

function fmtK(v) { return v ? `$${Math.round(v / 1000)}K` : '—' }

const TODAY    = new Date()
const GREEN    = 'var(--accent)'   // active phase
const AMBER    = 'var(--amber)'    // under-contract phase
const SOLD_CLR = 'var(--green)'    // closed

function endDateOf(c) {
  if (c.sold_date)     return new Date(c.sold_date)
  if (c.contract_date) return new Date(c.contract_date)
  return TODAY
}

function fmtAxisDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function fmtShortDate(str) {
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function TimelineChart({ comps }) {
  const [hoveredId, setHoveredId] = useState(null)

  const dated    = comps.filter(c => c.list_date)
  const excluded = comps.length - dated.length

  if (dated.length === 0) return (
    <p className={styles.chartEmpty}>Add list dates to properties to see the market timeline.</p>
  )

  const minTime = Math.min(...dated.map(c => new Date(c.list_date).getTime()))
  const maxTime = Math.max(...dated.map(c => endDateOf(c).getTime()))
  const span    = Math.max(maxTime - minTime, 86400000)

  const toPct = (dateStr) => ((new Date(dateStr).getTime() - minTime) / span) * 100

  const axisDates = [0, 0.5, 1].map(f => new Date(minTime + span * f))
  const sorted    = [...dated].sort((a, b) => new Date(a.list_date) - new Date(b.list_date))

  return (
    <div className={styles.chart}>
      {/* X-axis */}
      <div className={styles.xAxis}>
        {axisDates.map((d, i) => (
          <span
            key={i}
            className={`${styles.xTick} ${i === 0 ? styles.xTickStart : i === 2 ? styles.xTickEnd : ''}`}
            style={{ left: `${i * 50}%` }}
          >
            {fmtAxisDate(d)}
          </span>
        ))}
      </div>

      {/* Rows */}
      {sorted.map(c => {
        const startPct    = toPct(c.list_date)
        const contractPct = c.contract_date ? toPct(c.contract_date) : null
        const soldPct     = c.sold_date ? toPct(c.sold_date) : null
        const endPct      = toPct(endDateOf(c))

        // Green phase: list → contract (or end)
        const greenEndPct   = contractPct ?? endPct
        const greenWidth    = Math.max(greenEndPct - startPct, 0.3)

        // Amber phase: contract → end (only if contract exists)
        const amberWidth    = contractPct !== null ? Math.max(endPct - contractPct, 0.3) : 0

        // Price-cut tick within green phase
        const hasCut     = c.last_price_date && c.original_list_price && c.last_list_price && c.original_list_price > c.last_list_price
        const cutPctAbs  = hasCut ? toPct(c.last_price_date) : null
        const cutWithin  = hasCut ? ((cutPctAbs - startPct) / greenWidth) * 100 : null
        const showCut    = cutWithin != null && cutWithin > 3 && cutWithin < 97

        const fullSpan      = endPct - startPct
        const midPct        = startPct + fullSpan / 2
        const tooltipLeft   = Math.min(Math.max(midPct, 8), 82)
        const isHovered     = hoveredId === c.id

        // Days in each phase for tooltip
        const daysToContract = c.list_date && c.contract_date
          ? Math.round((new Date(c.contract_date) - new Date(c.list_date)) / 86400000)
          : null
        const daysUnderContract = c.contract_date && c.sold_date
          ? Math.round((new Date(c.sold_date) - new Date(c.contract_date)) / 86400000)
          : null

        return (
          <div
            key={c.id}
            className={styles.chartRow}
            onMouseEnter={() => setHoveredId(c.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className={styles.rowLabel} title={c.address}>
              {c.address.split(',')[0]}
            </div>

            <div className={styles.rowTrack}>
              {/* Green active phase */}
              <div
                className={`${styles.bar} ${styles.barGreen}`}
                style={{ left: `${startPct}%`, width: `${greenWidth}%`, background: GREEN }}
              >
                {showCut && <div className={styles.cutTick} style={{ left: `${cutWithin}%` }} />}
              </div>

              {/* Amber contract phase */}
              {contractPct !== null && (
                <div
                  className={`${styles.bar} ${styles.barAmber}`}
                  style={{ left: `${contractPct}%`, width: `${amberWidth}%`, background: AMBER }}
                />
              )}

              {/* Sold diamond */}
              {soldPct !== null && (
                <div className={styles.diamond} style={{ left: `${soldPct}%` }} />
              )}

              {/* Tooltip */}
              {isHovered && (
                <div className={styles.tooltip} style={{ left: `${tooltipLeft}%` }}>
                  <span className={styles.ttAddr}>{c.address}</span>
                  {c.days_on_market != null && <span>{c.days_on_market}d total on market</span>}
                  {daysToContract != null && <span>{daysToContract}d to contract</span>}
                  {daysUnderContract != null && <span>{daysUnderContract}d under contract</span>}
                  {hasCut && (
                    <span>
                      Cut −{fmtK(c.original_list_price - c.last_list_price)} on {fmtShortDate(c.last_price_date)}
                    </span>
                  )}
                  <span className={c.sold_date ? 'pos' : c.contract_date ? 'neu' : ''}>
                    {c.sold_date ? `Sold ${fmtK(c.sold_price)}` : c.contract_date ? 'In Contract' : 'Active'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: GREEN, opacity: 0.7 }} />
          Active
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: AMBER, opacity: 0.85 }} />
          Under Contract
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDiamond} />
          Sold
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendCutSwatch}>
            <span className={styles.legendCutLine} />
          </span>
          Price Cut
        </span>
        {excluded > 0 && (
          <span className={styles.excludedNote}>
            {excluded} comp{excluded > 1 ? 's' : ''} excluded — no list date
          </span>
        )}
      </div>
    </div>
  )
}

export default function HistoryTab({ comps }) {
  const closed     = comps.filter(c => !!c.sold_date)
    .sort((a, b) => (b.sold_price / b.last_list_price ?? 0) - (a.sold_price / a.last_list_price ?? 0))
  const inContract = comps.filter(c => !!c.contract_date && !c.sold_date)
    .sort((a, b) => (b.days_on_market ?? 0) - (a.days_on_market ?? 0))
  const active     = comps.filter(c => !c.contract_date && !c.sold_date)
    .sort((a, b) => (b.days_on_market ?? 0) - (a.days_on_market ?? 0))

  const cuts = comps.filter(c => c.original_list_price && c.last_list_price && c.original_list_price > c.last_list_price)
    .sort((a, b) => (b.original_list_price - b.last_list_price) - (a.original_list_price - a.last_list_price))

  const contracted = comps.filter(c => c.list_date && c.contract_date)
  const avgDaysToContract = contracted.length
    ? Math.round(contracted.reduce((s, c) => s + Math.round((new Date(c.contract_date) - new Date(c.list_date)) / 86400000), 0) / contracted.length)
    : null

  const s2l    = closed.filter(c => c.sold_price && c.last_list_price)
  const avgS2L = s2l.length
    ? (s2l.reduce((s, c) => s + c.sold_price / c.last_list_price, 0) / s2l.length * 100).toFixed(1)
    : null

  return (
    <div>
      <div className="sl">Timeline &amp; velocity</div>
      <h2 className={styles.title}>Days to Contract, DOM &amp; Sell-to-Ask</h2>
      <p className={styles.sub}>How long properties sat before going under contract reveals true market velocity and negotiating room.</p>

      <div className={styles.statRow}>
        <div className="stat-card">
          <div className="stat-card-val">{closed.length} / {inContract.length} / {active.length}</div>
          <div className="stat-card-lbl">Closed / Contract / Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-val">{cuts.length} of {comps.length}</div>
          <div className="stat-card-lbl">Comps w/ Price Cut</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-val">{avgDaysToContract != null ? `${avgDaysToContract}d` : '—'}</div>
          <div className="stat-card-lbl">Avg Days to Contract</div>
          <div className="stat-card-sub">{contracted.length} with contract date</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-val">{avgS2L ? `${avgS2L}%` : '—'}</div>
          <div className="stat-card-lbl">Avg Sell-to-List</div>
          <div className="stat-card-sub">{closed.filter(c => c.sold_price >= (c.last_list_price ?? Infinity)).length} over ask</div>
        </div>
      </div>

      <div className="sl">Market timeline</div>
      <TimelineChart comps={comps} />

      <div className={styles.domGrid}>
        <Card title="Closed — Sell to Final List">
          {closed.length === 0 && <Row addr="No closed sales" val="" cls="" />}
          {closed.map(c => {
            const listPrice = c.last_list_price ?? c.original_list_price
            const r   = listPrice && c.sold_price ? (c.sold_price / listPrice * 100).toFixed(1) : null
            const dom = c.days_on_market != null ? `${c.days_on_market}d` : null
            const val = [r ? `${r}% · ${fmtK(c.sold_price)}` : fmtK(c.sold_price), dom].filter(Boolean).join(' · ')
            return <Row key={c.id} addr={c.address} val={val} cls={c.sold_price >= (listPrice ?? 0) ? 'pos' : 'neg'} />
          })}
        </Card>

        <Card title="In Contract — Days to Contract">
          {inContract.length === 0 && <Row addr="No properties in contract" val="" cls="" />}
          {inContract.map(c => (
            <Row
              key={c.id}
              addr={c.address}
              val={c.days_on_market != null ? `${c.days_on_market}d` : '—'}
              cls={c.days_on_market > 50 ? 'neg' : c.days_on_market > 25 ? 'neu' : 'pos'}
            />
          ))}
        </Card>

        <Card title="Active — Days on Market">
          {active.length === 0 && <Row addr="No active listings" val="" cls="" />}
          {active.map(c => (
            <Row
              key={c.id}
              addr={c.address}
              val={c.days_on_market != null ? `${c.days_on_market}d` : '—'}
              cls={c.days_on_market > 50 ? 'neg' : c.days_on_market > 25 ? 'neu' : 'pos'}
            />
          ))}
        </Card>

        <Card title="Price Cuts — Orig to Final">
          {cuts.length === 0 && <Row addr="No cuts recorded" val="" cls="" />}
          {cuts.map(c => (
            <Row
              key={c.id}
              addr={c.address}
              val={`−$${Math.round((c.original_list_price - c.last_list_price) / 1000)}K (−${((c.original_list_price - c.last_list_price) / c.original_list_price * 100).toFixed(1)}%)`}
              cls="neg"
            />
          ))}
        </Card>
      </div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>{title}</div>
      {children}
    </div>
  )
}

function Row({ addr, val, cls }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowAddr}>{addr}</span>
      <span className={`${styles.rowVal} ${cls}`}>{val}</span>
    </div>
  )
}
