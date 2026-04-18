import { useEffect, useRef } from 'react'
import styles from './ScatterTab.module.css'

function linReg(pts) {
  const n = pts.length
  if (n < 2) return null
  const sx = pts.reduce((a, p) => a + p[0], 0)
  const sy = pts.reduce((a, p) => a + p[1], 0)
  const sxy = pts.reduce((a, p) => a + p[0] * p[1], 0)
  const sxx = pts.reduce((a, p) => a + p[0] ** 2, 0)
  const denom = n * sxx - sx ** 2
  if (!denom) return null
  const slope = (n * sxy - sx * sy) / denom
  const inter = (sy - slope * sx) / n
  const yMean = sy / n
  const ssTot = pts.reduce((a, p) => a + (p[1] - yMean) ** 2, 0)
  const ssRes = pts.reduce((a, p) => a + (p[1] - (slope * p[0] + inter)) ** 2, 0)
  const r2 = ssTot ? 1 - ssRes / ssTot : 0
  return { slope, inter, r2: Math.max(0, r2) }
}

function drawScatter(canvas, pts, isDark) {
  if (!canvas || !pts.length) return
  const ctx = canvas.getContext('2d')
  const W = canvas.parentElement.clientWidth - 36
  const H = 180
  canvas.width = W
  canvas.height = H
  const pad = { t: 10, r: 12, b: 28, l: 44 }

  const xs = pts.map(p => p[0])
  const ys = pts.map(p => p[1])
  const mnX = Math.min(...xs), mxX = Math.max(...xs)
  const mnY = Math.min(...ys), mxY = Math.max(...ys)
  const rx = mxX - mnX || 1
  const ry = mxY - mnY || 1
  const tx = v => pad.l + ((v - mnX) / rx) * (W - pad.l - pad.r)
  const ty = v => H - pad.b - ((v - mnY) / ry) * (H - pad.t - pad.b)

  // grid lines
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (i / 4) * (H - pad.t - pad.b)
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke()
  }

  // regression line
  const reg = linReg(pts)
  if (reg) {
    ctx.strokeStyle = 'rgba(26,79,191,0.28)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    ctx.moveTo(tx(mnX), ty(reg.slope * mnX + reg.inter))
    ctx.lineTo(tx(mxX), ty(reg.slope * mxX + reg.inter))
    ctx.stroke()
    ctx.setLineDash([])
  }

  // axis labels
  const lc = isDark ? 'rgba(200,210,240,0.45)' : 'rgba(0,0,0,0.32)'
  ctx.fillStyle = lc
  ctx.font = `400 9px 'JetBrains Mono'`
  ctx.textAlign = 'right'
  for (let i = 0; i <= 4; i++) {
    const v = mnY + (i / 4) * ry
    ctx.fillText(Math.round(v), pad.l - 4, ty(v) + 3)
  }
  ctx.textAlign = 'center'
  for (let i = 0; i <= 3; i++) {
    const v = mnX + (i / 3) * rx
    ctx.fillText(Math.round(v), tx(v), H - 3)
  }

  // points
  pts.forEach(p => {
    ctx.beginPath()
    ctx.arc(tx(p[0]), ty(p[1]), 4.5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(26,79,191,0.55)'
    ctx.fill()
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
    ctx.lineWidth = 1
    ctx.stroke()
  })

  return reg
}

function Chart({ id, title, pts, subFn, isDark }) {
  const ref = useRef(null)
  const reg = useRef(null)

  useEffect(() => {
    reg.current = drawScatter(ref.current, pts, isDark)
  }, [pts, isDark])

  const r2 = reg.current?.r2
  const sub = subFn(reg.current)

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartTitle}>{title}</div>
      <div className={styles.chartSub}>{sub}</div>
      <canvas ref={ref} height={180} />
    </div>
  )
}

export default function ScatterTab({ comps, theme }) {
  const isDark = theme === 'dark'
  const valid = comps.filter(c => c.sqft && c.psf)

  const charts = [
    {
      id: 'sc1', title: 'Size vs. List Price',
      pts: valid.filter(c => c.last_list_price).map(c => [c.sqft, c.last_list_price / 1000]),
      subFn: r => r ? `R² ${r.r2.toFixed(2)} · Price ≈ $${Math.round(r.inter)}K + $${Math.round(r.slope * 100)}/100SF` : 'Insufficient data',
    },
    {
      id: 'sc2', title: 'Taxes vs. $/SF',
      pts: valid.filter(c => c.taxes).map(c => [c.taxes / 1000, c.psf]),
      subFn: r => r ? `R² ${r.r2.toFixed(2)} · $/SF ≈ $${Math.round(r.inter)} − $${Math.abs(r.slope).toFixed(1)} per $1K taxes` : 'Insufficient data',
    },
    {
      id: 'sc3', title: 'Lot Size vs. List Price',
      pts: valid.filter(c => c.lot_sqft && c.last_list_price).map(c => [c.lot_sqft / 1000, c.last_list_price / 1000]),
      subFn: r => r ? `R² ${r.r2.toFixed(2)}` : 'Insufficient data',
    },
    {
      id: 'sc4', title: 'Year Built vs. $/SF',
      pts: valid.filter(c => c.year_built).map(c => [c.year_built, c.psf]),
      subFn: r => r ? `R² ${r.r2.toFixed(2)}` : 'Insufficient data',
    },
  ]

  return (
    <div>
      <div className="sl">Regression analysis</div>
      <h2 className={styles.title}>Pairwise Correlations</h2>
      <p className={styles.sub}>R² measures how much of the price variation each factor explains. Higher = stronger predictor.</p>

      <div className={styles.grid}>
        {charts.map(c => (
          <Chart key={c.id} {...c} isDark={isDark} />
        ))}
      </div>

      <div className={styles.note}>
        Regression lines are computed from your current comp pool. Add more comps to improve accuracy.
      </div>
    </div>
  )
}
