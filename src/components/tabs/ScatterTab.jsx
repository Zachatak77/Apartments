import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ReferenceLine,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { useChartColors, CHART_FONT } from '../charts/chartTheme'
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

function TipContent({ active, payload, xLabel, yLabel, colors }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 6,
      padding: '7px 10px', fontFamily: CHART_FONT, fontSize: 11, color: colors.text,
      boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.comp.address}</div>
      {d.comp.town && <div style={{ color: colors.dim, fontSize: 9, marginBottom: 4 }}>{d.comp.town}</div>}
      <div style={{ color: colors.text2 }}>{xLabel}: <strong>{Math.round(d.x * 10) / 10}</strong></div>
      <div style={{ color: colors.text2 }}>{yLabel}: <strong>{Math.round(d.y * 10) / 10}</strong></div>
    </div>
  )
}

// ── Chart component ───────────────────────────────────────────────────────────
function Chart({ title, pts, xLabel, yLabel, formulaFn }) {
  const colors = useChartColors()
  const data = pts.map(p => ({ x: p[0], y: p[1], comp: p[2] }))
  const reg  = linReg(pts)

  const xs = pts.map(p => p[0])
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const regSegment = reg ? [
    { x: minX, y: reg.slope * minX + reg.inter },
    { x: maxX, y: reg.slope * maxX + reg.inter },
  ] : null

  const r2Color = !reg ? colors.dim
    : reg.r2 >= 0.7 ? colors.green
    : reg.r2 >= 0.4 ? colors.amber
    : colors.dim

  const formula = reg ? formulaFn(reg) : null

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartHead}>
        <div className={styles.chartTitle}>{title}</div>
        <div className={styles.chartStats}>
          {reg ? (
            <>
              <span className={styles.r2} style={{ color: r2Color }}>R² = {reg.r2.toFixed(2)}</span>
              {formula && <span className={styles.formula}>{formula}</span>}
            </>
          ) : (
            <span className={styles.noData}>insufficient data</span>
          )}
        </div>
      </div>

      <div className={styles.canvasWrap}>
        <ResponsiveContainer width="100%" height={210}>
          <ScatterChart margin={{ top: 14, right: 16, bottom: 28, left: 6 }}>
            <CartesianGrid stroke={colors.border} strokeDasharray="2 4" />
            <XAxis
              type="number" dataKey="x" name={xLabel} domain={['dataMin', 'dataMax']}
              tick={{ fill: colors.dim, fontFamily: CHART_FONT, fontSize: 9 }}
              tickLine={false} axisLine={{ stroke: colors.border }}
              tickCount={4}
              label={{ value: xLabel, position: 'insideBottom', offset: -16, fill: colors.dim, fontFamily: CHART_FONT, fontSize: 9 }}
            />
            <YAxis
              type="number" dataKey="y" name={yLabel} domain={['auto', 'auto']}
              tick={{ fill: colors.dim, fontFamily: CHART_FONT, fontSize: 9 }}
              tickLine={false} axisLine={{ stroke: colors.border }} width={44}
            />
            <Tooltip
              cursor={{ stroke: colors.border2, strokeDasharray: '3 3' }}
              content={props => <TipContent {...props} xLabel={xLabel} yLabel={yLabel} colors={colors} />}
            />
            {regSegment && (
              <ReferenceLine
                segment={regSegment}
                stroke={colors.accent}
                strokeWidth={2}
                strokeDasharray="6 4"
                ifOverflow="extendDomain"
              />
            )}
            <Scatter
              data={data} fill={colors.accent} fillOpacity={0.6}
              stroke={colors.panel} strokeWidth={1.2} isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Tab ───────────────────────────────────────────────────────────────────────
export default function ScatterTab({ comps }) {
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
          <Chart key={c.id} {...c} />
        ))}
      </div>

      <div className={styles.note}>
        Regression lines computed from your current comp pool. R² &gt; 0.7 = strong, 0.4–0.7 = moderate, &lt; 0.4 = weak correlation.
      </div>
    </div>
  )
}
