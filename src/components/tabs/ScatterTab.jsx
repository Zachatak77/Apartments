import { useEffect, useRef, useState, useCallback } from 'react'
import styles from './ScatterTab.module.css'

// ── Math ─────────────────────────────────────────────────────────────────────
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

// ── Canvas draw ───────────────────────────────────────────────────────────────
// pts = [[x, y, comp], ...]
// Returns { reg, pixels: [[cx,cy],...] } in CSS-pixel space
function drawChart(canvas, pts, isDark, hoveredIdx) {
  if (!canvas || !pts.length) return null
  const dpr = window.devicePixelRatio || 1
  const W   = canvas.parentElement.clientWidth
  const H   = 210
  canvas.width  = W * dpr
  canvas.height = H * dpr
  canvas.style.width  = W + 'px'
  canvas.style.height = H + 'px'

  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, W, H)

  const pad = { t: 14, r: 16, b: 34, l: 50 }
  const xs  = pts.map(p => p[0])
  const ys  = pts.map(p => p[1])
  let mnX = Math.min(...xs), mxX = Math.max(...xs)
  let mnY = Math.min(...ys), mxY = Math.max(...ys)
  const rx = mxX - mnX || 1
  const ry = mxY - mnY || 1
  // Add 10% padding to axes
  mnX -= rx * 0.05; mxX += rx * 0.05
  mnY -= ry * 0.08; mxY += ry * 0.08
  const tx = v => pad.l + ((v - mnX) / (mxX - mnX)) * (W - pad.l - pad.r)
  const ty = v => H - pad.b - ((v - mnY) / (mxY - mnY)) * (H - pad.t - pad.b)

  // grid
  const gridC = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
  ctx.strokeStyle = gridC
  ctx.lineWidth   = 1
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (i / 4) * (H - pad.t - pad.b)
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke()
  }
  for (let i = 0; i <= 3; i++) {
    const x = pad.l + (i / 3) * (W - pad.l - pad.r)
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, H - pad.b); ctx.stroke()
  }

  // regression line
  const reg = linReg(pts)
  if (reg) {
    const r2Strength = reg.r2 > 0.7 ? 0.55 : reg.r2 > 0.4 ? 0.38 : 0.22
    ctx.strokeStyle = `rgba(42,92,66,${r2Strength})`
    ctx.lineWidth   = 2
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    ctx.moveTo(tx(mnX), ty(reg.slope * mnX + reg.inter))
    ctx.lineTo(tx(mxX), ty(reg.slope * mxX + reg.inter))
    ctx.stroke()
    ctx.setLineDash([])
  }

  // axis tick labels
  const lc = isDark ? 'rgba(200,215,205,0.4)' : 'rgba(30,30,30,0.35)'
  ctx.fillStyle = lc
  ctx.font = `400 9px 'JetBrains Mono', monospace`
  ctx.textAlign = 'right'
  for (let i = 0; i <= 4; i++) {
    const v = mnY + (i / 4) * (mxY - mnY)
    ctx.fillText(Math.round(v), pad.l - 5, ty(v) + 3)
  }
  ctx.textAlign = 'center'
  for (let i = 0; i <= 3; i++) {
    const v = mnX + (i / 3) * (mxX - mnX)
    ctx.fillText(Math.round(v * 10) / 10, tx(v), H - 4)
  }

  // points — draw un-hovered first, hovered on top
  const pixels = pts.map(p => [tx(p[0]), ty(p[1])])
  pixels.forEach(([cx, cy], i) => {
    if (i === hoveredIdx) return
    ctx.beginPath()
    ctx.arc(cx, cy, 5, 0, Math.PI * 2)
    ctx.fillStyle = isDark ? 'rgba(42,92,66,0.6)' : 'rgba(42,92,66,0.5)'
    ctx.fill()
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  })
  if (hoveredIdx != null && pixels[hoveredIdx]) {
    const [cx, cy] = pixels[hoveredIdx]
    ctx.beginPath()
    ctx.arc(cx, cy, 7, 0, Math.PI * 2)
    ctx.fillStyle = '#2A5C42'
    ctx.fill()
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.6)' : '#fff'
    ctx.lineWidth   = 2
    ctx.stroke()
    // cross-hair lines
    ctx.strokeStyle = 'rgba(42,92,66,0.25)'
    ctx.lineWidth   = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath(); ctx.moveTo(cx, pad.t); ctx.lineTo(cx, H - pad.b); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(pad.l, cy); ctx.lineTo(W - pad.r, cy); ctx.stroke()
    ctx.setLineDash([])
  }

  return { reg, pixels }
}

// ── Chart component ───────────────────────────────────────────────────────────
function Chart({ title, pts, xLabel, yLabel, formulaFn, isDark }) {
  const canvasRef  = useRef(null)
  const pixelsRef  = useRef([])
  const [reg, setReg]           = useState(null)
  const [hovIdx, setHovIdx]     = useState(null)
  const [tooltip, setTooltip]   = useState(null)

  const redraw = useCallback((hov) => {
    const result = drawChart(canvasRef.current, pts, isDark, hov)
    if (result) {
      pixelsRef.current = result.pixels
      setReg(result.reg)
    }
  }, [pts, isDark])

  useEffect(() => { redraw(null); setHovIdx(null); setTooltip(null) }, [pts, isDark])

  // Redraw when hovered index changes
  useEffect(() => { redraw(hovIdx) }, [hovIdx])

  // Resize observer
  useEffect(() => {
    const el = canvasRef.current?.parentElement
    if (!el) return
    const ro = new ResizeObserver(() => redraw(hovIdx))
    ro.observe(el)
    return () => ro.disconnect()
  }, [pts, isDark, hovIdx])

  function handleMouseMove(e) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    const mx = (e.clientX - rect.left) * scaleX / (window.devicePixelRatio || 1)
    const my = (e.clientY - rect.top)  * scaleY / (window.devicePixelRatio || 1)

    let closest = null, minDist = 22
    pixelsRef.current.forEach(([cx, cy], i) => {
      const d = Math.hypot(mx - cx, my - cy)
      if (d < minDist) { minDist = d; closest = i }
    })

    setHovIdx(closest)
    if (closest != null) {
      const p   = pts[closest]
      const c   = p[2]
      const tipX = e.clientX - rect.left
      const tipY = e.clientY - rect.top
      setTooltip({ x: tipX, y: tipY, comp: c, px: p[0], py: p[1] })
    } else {
      setTooltip(null)
    }
  }

  const r2Color = !reg ? 'var(--dim)'
    : reg.r2 >= 0.7 ? '#2A5C42'
    : reg.r2 >= 0.4 ? '#7A5200'
    : 'var(--dim)'

  const formula = reg ? formulaFn(reg) : null

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartHead}>
        <div className={styles.chartTitle}>{title}</div>
        <div className={styles.chartStats}>
          {reg && (
            <>
              <span className={styles.r2} style={{ color: r2Color }}>
                R² = {reg.r2.toFixed(2)}
              </span>
              {formula && <span className={styles.formula}>{formula}</span>}
            </>
          )}
          {!reg && <span className={styles.noData}>insufficient data</span>}
        </div>
      </div>

      <div className={styles.canvasWrap}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { setHovIdx(null); setTooltip(null) }}
          className={styles.canvas}
        />
        {tooltip && (
          <div
            className={styles.tooltip}
            style={{
              left: tooltip.x + 14,
              top:  Math.max(8, tooltip.y - 60),
            }}
          >
            <div className={styles.tipAddr}>{tooltip.comp.address}</div>
            {tooltip.comp.town && <div className={styles.tipTown}>{tooltip.comp.town}</div>}
            <div className={styles.tipVals}>
              <span>{xLabel}: <strong>{Math.round(tooltip.px * 10) / 10}</strong></span>
              <span>{yLabel}: <strong>{Math.round(tooltip.py * 10) / 10}</strong></span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.axisLabels}>
        <span className={styles.axisY}>{yLabel}</span>
        <span className={styles.axisX}>{xLabel}</span>
      </div>
    </div>
  )
}

// ── Tab ───────────────────────────────────────────────────────────────────────
export default function ScatterTab({ comps, theme }) {
  const isDark    = theme === 'dark'
  const withPrice = comps.filter(c => c.last_list_price || c.original_list_price || c.sold_price)
  const price     = c => ((c.sold_date ? c.sold_price : null) ?? c.last_list_price ?? c.original_list_price) / 1000
  const sgn       = (r, abs) => `${r.slope >= 0 ? '+' : '−'} $${Math.abs(abs)}`

  const charts = [
    {
      id: 'sc1',
      title: 'Sq Ft vs. List Price',
      xLabel: 'Sq Ft', yLabel: 'Price ($K)',
      pts: withPrice.filter(c => c.sqft).map(c => [c.sqft, price(c), c]),
      formulaFn: r => `y = $${Math.round(r.inter)}K ${sgn(r, Math.round(r.slope * 100))}/100SF`,
    },
    {
      id: 'sc2',
      title: 'Lot Size vs. List Price',
      xLabel: 'Lot (K SF)', yLabel: 'Price ($K)',
      pts: withPrice.filter(c => c.lot_sqft).map(c => [c.lot_sqft / 1000, price(c), c]),
      formulaFn: r => `y = $${Math.round(r.inter)}K ${sgn(r, Math.abs(r.slope).toFixed(1))}K per 1K lot SF`,
    },
    {
      id: 'sc3',
      title: 'Taxes vs. List Price',
      xLabel: 'Taxes ($K)', yLabel: 'Price ($K)',
      pts: withPrice.filter(c => c.taxes).map(c => [c.taxes / 1000, price(c), c]),
      formulaFn: r => `y = $${Math.round(r.inter)}K ${sgn(r, Math.abs(r.slope).toFixed(1))}K per $1K taxes`,
    },
    {
      id: 'sc4',
      title: 'Bedrooms vs. List Price',
      xLabel: 'Bedrooms', yLabel: 'Price ($K)',
      pts: withPrice.filter(c => c.beds).map(c => [c.beds, price(c), c]),
      formulaFn: r => `y = $${Math.round(r.inter)}K ${sgn(r, Math.round(r.slope))}K per bedroom`,
    },
    {
      id: 'sc5',
      title: 'Bathrooms vs. List Price',
      xLabel: 'Bathrooms', yLabel: 'Price ($K)',
      pts: withPrice.filter(c => c.baths).map(c => [c.baths, price(c), c]),
      formulaFn: r => `y = $${Math.round(r.inter)}K ${sgn(r, Math.round(r.slope))}K per bathroom`,
    },
    {
      id: 'sc6',
      title: '$/SF vs. $/Lot SF',
      xLabel: '$/SF', yLabel: '$/Lot SF',
      pts: comps.filter(c => c.psf && c.lot_psf).map(c => [c.psf, c.lot_psf, c]),
      formulaFn: r => `y = $${r.inter.toFixed(2)} ${sgn(r, Math.abs(r.slope).toFixed(3))} per $/SF`,
    },
    {
      id: 'sc7',
      title: 'Interior % vs. $/SF',
      xLabel: 'Interior % (sqft ÷ lot)', yLabel: '$/SF',
      pts: comps.filter(c => c.sqft && c.lot_sqft && c.psf).map(c => [(c.sqft / c.lot_sqft) * 100, c.psf, c]),
      formulaFn: r => `y = $${Math.round(r.inter)} ${sgn(r, Math.abs(r.slope).toFixed(1))} per 1% coverage`,
    },
  ]

  return (
    <div>
      <div className="sl">Regression analysis</div>
      <h2 className={styles.title}>Pairwise Correlations</h2>
      <p className={styles.sub}>
        Hover any point to see the property. R² measures how strongly each factor explains price — closer to 1.0 = stronger predictor.
      </p>

      <div className={styles.grid}>
        {charts.map(c => (
          <Chart key={c.id} {...c} isDark={isDark} />
        ))}
      </div>

      <div className={styles.note}>
        Regression lines computed from your current comp pool. R² &gt; 0.7 = strong, 0.4–0.7 = moderate, &lt; 0.4 = weak correlation.
      </div>
    </div>
  )
}
