import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'
import { useChartColors } from './chartTheme'

// Compact trend sparkline from a numeric series. `data` is an array of numbers.
export default function Sparkline({ data, height = 32, color, fillOpacity = 0.18 }) {
  const colors = useChartColors()
  const stroke = color || colors.accent
  if (!data || data.length < 2) return null
  const series = data.map((v, i) => ({ i, v }))
  const id = `spark-${Math.random().toString(36).slice(2, 8)}`

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={fillOpacity} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Area
            type="monotone" dataKey="v" stroke={stroke} strokeWidth={1.5}
            fill={`url(#${id})`} isAnimationActive={false} dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
