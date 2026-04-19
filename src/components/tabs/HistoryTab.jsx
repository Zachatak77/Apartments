import { useState } from 'react'
import styles from './HistoryTab.module.css'

function fmtK(v) { return v ? `$${Math.round(v / 1000)}K` : '—' }

const TODAY = new Date()

const BAR_COLOR = {
  active:   '#2A5C42',
  contract: '#7A5200',
  closed:   '#4A8C62',
}

function compStatus(c) {
  if (c.sold_date)      return 'closed'
  if (c.contract_date)  return 'contract'
  return 'active'
}

function endDateOf(c) {
  if (c.sold_date)     return new Date(c.sold_date)
  if (c.contract_date) return new Date(c.contract_date)
  return TODAY
}

function fmtAxisDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
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
  const span    = Math.max(maxTime - minTime, 86400000) // at least 1 day

  const toPct = (date) => ((new Date(date).getTime() - minTime) / span) * 100

  const sorted = [...dated].sort((a, b) => new Date(a.list_date) - new Date(b.list_date))

  const axisDates = [0, 0.5, 1].map(f => new Date(minTime + span * f))

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
        const status   = compStatus(c)
        const color    = BAR_COLOR[status]
        const startPct = toPct(c.list_date)
        const endPct   = toPct(endDateOf(c))
        const widthPct = Math.max(endPct - startPct, 0.4)

        const hasCut     = c.last_price_date && c.original_list_price && c.last_list_price && c.original_list_price > c.last_list_price
        const cutPctAbs  = hasCut ? toPct(c.last_price_date) : null
        const cutWithin  = hasCut ? ((cutPctAbs - startPct) / widthPct) * 100 : null
        const showCutTick = cutWithin !== null && cutWithin > 4 && cutWithin < 96

        const isHovered  = hoveredId === c.id
        const tooltipLeft = Math.min(Math.max(startPct + widthPct / 2, 5), 82)

        return (
          <div key={c.id} className={styles.chartRow}>
            <div className={styles.rowLabel} title={c.address}>
              {c.address.split(',')[0]}
            </div>

            <div className={styles.rowTrack}>
              <div
                className={`${styles.bar} ${styles[`bar_${status}`]}`}
                style={{ left: `${startPct}%`, width: `${widthPct}%`, background: color }}
                onMouseEnter={() => setHoveredId(c.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {showCutTick && (
                  <div className={styles.cutTick} style={{ left: `${cutWithin}%` }} />
                )}
              </div>

              {isHovered && (
                <div className={styles.tooltip} style={{ left: `${tooltipLeft}%` }}>
                  <span className={styles.ttAddr}>{c.address}</span>
                  {c.days_on_market != null && <span>{c.days_on_market} days on market</span>}
                  {hasCut && (
                    <span>
                      Cut −{fmtK(c.original_list_price - c.last_list_price)} on{' '}
                      {new Date(c.last_price_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  <span className={status === 'closed' ? 'pos' : status === 'contract' ? 'neu' : ''}>
                    {status === 'closed'
                      ? `Sold ${fmtK(c.sold_price)}`
                      : status === 'contract'
                      ? 'In Contract'
                      : 'Active'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Legend */}
      <div className={styles.legend}>
        {[
          { key: 'active',   label: 'Active'      },
          { key: 'contract', label: 'In Contract' },
          { key: 'closed',   label: 'Closed'      },
        ].map(({ key, label }) => (
          <span key={key} className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: BAR_COLOR[key] }} />
            {label}
          </span>
        ))}
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

  const avgCut = cuts.length
    ? Math.round(cuts.reduce((s, c) => s + (c.original_list_price - c.last_list_price), 0) / cuts.length)
    : null

  const s2l    = closed.filter(c => c.sold_price && c.last_list_price)
  const avgS2L = s2l.length
    ? (s2l.reduce((s, c) => s + c.sold_price / c.last_list_price, 0) / s2l.length * 100).toFixed(1)
    : null

  return (
    <div>
      <div className="sl">Listing history</div>
      <h2 className={styles.title}>Price Cuts, DOM &amp; Sell-to-Ask</h2>
      <p className={styles.sub}>The gap between original ask and close price is your real negotiating room.</p>

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
          <div className="stat-card-val">{avgCut ? `−$${Math.round(avgCut / 1000)}K` : '—'}</div>
          <div className="stat-card-lbl">Avg Cut Amount</div>
          <div className="stat-card-sub">Orig list → final list</div>
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
            const r   = c.last_list_price && c.sold_price ? (c.sold_price / c.last_list_price * 100).toFixed(1) : null
            const dom = c.days_on_market != null ? `${c.days_on_market}d` : null
            const val = [r ? `${r}% · ${fmtK(c.sold_price)}` : fmtK(c.sold_price), dom].filter(Boolean).join(' · ')
            return <Row key={c.id} addr={c.address} val={val} cls={c.sold_price >= (c.last_list_price ?? 0) ? 'pos' : 'neg'} />
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
