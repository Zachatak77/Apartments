import styles from './HistoryTab.module.css'

function fmtK(v) { return v ? `$${Math.round(v / 1000)}K` : '—' }

export default function HistoryTab({ comps }) {
  const closed = comps.filter(c => c.is_closed && c.sold_price)
  const cuts   = comps.filter(c => c.original_list_price && c.last_list_price && c.original_list_price > c.last_list_price)
    .sort((a, b) => (b.original_list_price - b.last_list_price) - (a.original_list_price - a.last_list_price))
  const active = comps.filter(c => !c.is_closed && c.days_on_market > 0)
    .sort((a, b) => b.days_on_market - a.days_on_market)

  const avgCut = cuts.length
    ? Math.round(cuts.reduce((s, c) => s + (c.original_list_price - c.last_list_price), 0) / cuts.length)
    : null

  const s2l    = closed.filter(c => c.last_list_price)
  const avgS2L = s2l.length
    ? (s2l.reduce((s, c) => s + c.sold_price / c.last_list_price, 0) / s2l.length * 100).toFixed(1)
    : null

  const maxCutComp = cuts[0]

  return (
    <div>
      <div className="sl">Listing history</div>
      <h2 className={styles.title}>Price Cuts, DOM &amp; Sell-to-Ask</h2>
      <p className={styles.sub}>The gap between original ask and close price is your real negotiating room.</p>

      <div className={styles.statRow}>
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
          <div className="stat-card-val">{maxCutComp ? `−$${Math.round((maxCutComp.original_list_price - maxCutComp.last_list_price) / 1000)}K` : '—'}</div>
          <div className="stat-card-lbl">Largest Single Cut</div>
          <div className="stat-card-sub">{maxCutComp?.address || '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-val">{avgS2L ? `${avgS2L}%` : '—'}</div>
          <div className="stat-card-lbl">Avg Sell-to-List</div>
          <div className="stat-card-sub">{closed.filter(c => c.sold_price >= (c.last_list_price ?? Infinity)).length} over ask</div>
        </div>
      </div>

      <div className={styles.domGrid}>
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

        <Card title="Closed — Sell to Final List">
          {closed.length === 0 && <Row addr="No closed sales" val="" cls="" />}
          {[...closed].sort((a, b) => (b.sold_price / b.last_list_price) - (a.sold_price / a.last_list_price)).map(c => {
            const r = c.last_list_price ? (c.sold_price / c.last_list_price * 100).toFixed(1) : null
            return <Row key={c.id} addr={c.address} val={r ? `${r}% · ${fmtK(c.sold_price)}` : fmtK(c.sold_price)} cls={c.sold_price >= (c.last_list_price ?? 0) ? 'pos' : 'neg'} />
          })}
        </Card>

        <Card title="Active — Days on Market">
          {active.length === 0 && <Row addr="No active comps with DOM" val="" cls="" />}
          {active.map(c => (
            <Row
              key={c.id}
              addr={c.address}
              val={`${c.days_on_market}+ days`}
              cls={c.days_on_market > 50 ? 'neg' : c.days_on_market > 25 ? 'neu' : 'pos'}
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
