import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, ReferenceLine, Cell, ResponsiveContainer,
} from 'recharts'
import { useChartColors, CHART_FONT } from './chartTheme'

// One-dimensional strip showing where `value` sits among the pool's `values`,
// with the median marked. Highlights the candidate's dot in accent.
export default function DistributionStrip({ values, value, height = 44, median }) {
  const colors = useChartColors()
  const nums = (values || []).filter(v => v != null)
  if (nums.length < 2) return null

  const lo = Math.min(...nums, value ?? Infinity)
  const hi = Math.max(...nums, value ?? -Infinity)
  const pad = (hi - lo) * 0.06 || 1
  const med = median ?? [...nums].sort((a, b) => a - b)[Math.floor(nums.length / 2)]

  const data = nums.map(v => ({ x: v, y: 0, self: false }))
  if (value != null) data.push({ x: value, y: 0, self: true })

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 12, bottom: 16, left: 12 }}>
          <XAxis
            type="number" dataKey="x" domain={[lo - pad, hi + pad]}
            tick={{ fill: colors.dim, fontFamily: CHART_FONT, fontSize: 8 }}
            tickLine={false} axisLine={{ stroke: colors.border }}
            tickCount={4}
          />
          <YAxis type="number" dataKey="y" domain={[-1, 1]} hide />
          <ZAxis range={[60, 60]} />
          {med != null && (
            <ReferenceLine x={med} stroke={colors.dim} strokeDasharray="3 3" strokeWidth={1} />
          )}
          <Scatter data={data} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.self ? colors.accent : colors.border2}
                fillOpacity={d.self ? 1 : 0.7}
                stroke={d.self ? colors.accent : 'none'}
                r={d.self ? 6 : 4}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
