import { useEffect, useRef } from 'react'
import styles from './HistoryTab.module.css'

function fmtK(v) { return v ? `$${Math.round(v / 1000)}K` : '—' }

function linReg(pts) {
  const n = pts.length
  if (n < 2) return null
  const sx  = pts.reduce((a, p) => a + p[0], 0)
  const sy  = pts.reduce((a, p) => a + p[1], 0)
  const sxy = pts.reduce((a, p) => a + p[0] * p[1], 0)
  const sxx = pts.reduce((a, p) => a + p[0] ** 2, 0)
  const d   = n * sxx - sx ** 2
  if (!d) return null
  const slope = (n * sxy - sx * sy) / d
  const inter = (sy - slope * sx) / n
  const yMean = sy / n
  const ssTot = pts.reduce((a, p) => a + (p[1] - yMean) ** 2, 0)
  const ssRes = pts.reduce((a, p) => a + (p[1] - (slope * p[0] + inter)) ** 2, 0)
  return { slope, inter, r2: ssTot ? Math.max(0, 1 - ssRes / ssTot) : 0 }
}

function PriceVsTaxChart({ comps, theme }) {
  const canvasRef = useRef(null)
  const isDark = theme === 'dark'

  const pts = comps
    .filter(c => c.taxes && (c.last_list_price || c.original_list_price))
    .map(c => [
      c.taxes / 1000,
      ((c.is_closed ? c.sold_price : null) ?? c.last_list_price ?? c.original_list_price) / 1000,
    ])

  const reg = pts.length >= 2 ? linReg(pts) : null

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !pts.length) return
    const W = canvas.parentElement.clientWidth - 2
    const H = 220
    canvas.width  = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    const pad = { t: 12, r: 16, b: 34, l: 52 }

    const xs  = pts.map(p => p[0])
    const ys  = pts.map(p => p[1])
    const mnX = Math.min(...xs), mxX = Math.max(...xs)
    const mnY = Math.min(...ys), mxY = Math.max(...ys)
    const rx  = mxX - mnX || 1
    const ry  = mxY - mnY || 1
    const tx  = v => pad.l + ((v - mnX) / rx) * (W - pad.l - pad.r)
    const ty  = v => H - pad.b - ((v - mnY) / ry) * (H - pad.t - pad.b)

    // grid
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (i / 4) * (H - pad.t - pad.b)
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke()
    }

    // regression line
    if (reg) {
      ctx.strokeStyle = 'rgba(42,92,66,0.35)'
      ctx.lineWidth   = 1.5
      ctx.setLineDash([5, 4])
      ctx.beginPath()
      ctx.moveTo(tx(mnX), ty(reg.slope * mnX + reg.inter))
      ctx.lineTo(tx(mxX), ty(reg.slope * mxX + reg.inter))
      ctx.stroke()
      ctx.setLineDash([])
    }

    // axis labels
    const lc = isDark ? 'rgba(200,220,210,0.4)' : 'rgba(0,0,0,0.32)'
    ctx.fillStyle = lc
    ctx.font = `400 9px 'JetBrains Mono', monospace`
    ctx.textAlign = 'right'
    for (let i = 0; i <= 4; i++) {
      const v = mnY + (i / 4) * ry
      ctx.fillText(`$${Math.round(v)}K`, pad.l - 5, ty(v) + 3)
    }
    ctx.textAlign = 'center'
    for (let i = 0; i <= 3; i++) {
      const v = mnX + (i / 3) * rx
      ctx.fillText(`$${v.toFixed(0)}K`, tx(v), H - 6)
    }

    // axis titles
    ctx.fillStyle = lc
    ctx.font = `400 8px 'JetBrains Mono', monospace`
    ctx.textAlign = 'center'
    ctx.fillText('Annual Taxes', pad.l + (W - pad.l - pad.r) / 2, H - 0)
    ctx.save()
    ctx.translate(11, pad.t + (H - pad.t - pad.b) / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('List Price', 0, 0)
    ctx.restore()

    // points
    pts.forEach(p => {
      ctx.beginPath()
      ctx.arc(tx(p[0]), ty(p[1]), 5, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(42,92,66,0.55)'
      ctx.fill()
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.8)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    })
  }, [pts, isDark])

  if (!pts.length) return (
    <p className={styles.chartEmpty}>Add comps with tax data to see this chart.</p>
  )

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartHead}>
        <span className={styles.chartTitle}>List Price vs. Annual Taxes</span>
        {reg && (
          <span className={styles.chartR2}>
            R² {reg.r2.toFixed(2)}
            {reg.slope > 0
              ? ` · +$${Math.round(reg.slope)}K per $1K tax`
              : ` · −$${Math.round(Math.abs(reg.slope))}K per $1K tax`}
          </span>
        )}
      </div>
      <canvas ref={canvasRef} height={220} className={styles.canvas} />
    </div>
  )
}

export default function HistoryTab({ comps, theme }) {
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

      <PriceVsTaxChart comps={comps} theme={theme} />

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
