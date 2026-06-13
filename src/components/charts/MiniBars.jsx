import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useChartColors, CHART_FONT } from './chartTheme'

// Horizontal comparison bars from [{ label, value, highlight }].
// `max` sets the value axis upper bound (defaults to data max).
export default function MiniBars({ data, max, height, barColor, formatValue }) {
  const colors = useChartColors()
  if (!data || !data.length) return null
  const h = height ?? data.length * 26 + 8
  const upper = max ?? Math.max(...data.map(d => d.value || 0), 1)

  return (
    <div style={{ width: '100%', height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data} layout="vertical"
          margin={{ top: 2, right: 12, bottom: 2, left: 4 }}
          barCategoryGap={4}
        >
          <XAxis type="number" domain={[0, upper]} hide />
          <YAxis
            type="category" dataKey="label" width={64}
            tick={{ fill: colors.dim, fontFamily: CHART_FONT, fontSize: 9 }}
            tickLine={false} axisLine={false}
          />
          <Tooltip
            cursor={{ fill: colors.surface }}
            contentStyle={{
              background: colors.panel, border: `1px solid ${colors.border}`,
              borderRadius: 6, fontFamily: CHART_FONT, fontSize: 11, color: colors.text,
            }}
            formatter={v => [formatValue ? formatValue(v) : v, '']}
            labelStyle={{ color: colors.dim }}
          />
          <Bar dataKey="value" radius={[2, 2, 2, 2]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.highlight ? colors.accent : (barColor || colors.border2)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
