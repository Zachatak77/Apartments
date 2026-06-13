import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { useChartColors, scoreColor, CHART_FONT } from './chartTheme'

// Radial gauge for a 0–100 composite score, with the number centered.
export default function ScoreGauge({ score, size = 96, label }) {
  const colors = useChartColors()
  const val = Math.max(0, Math.min(100, score ?? 0))
  const fill = scoreColor(colors, val)

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          data={[{ value: val }]}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
          <RadialBar
            background={{ fill: colors.surface }}
            dataKey="value"
            cornerRadius={size / 2}
            fill={fill}
            isAnimationActive={false}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
      }}>
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
          fontSize: size * 0.3, lineHeight: 1, color: fill,
        }}>{val}</span>
        {label && (
          <span style={{
            fontFamily: CHART_FONT, fontSize: size * 0.1, letterSpacing: '.1em',
            textTransform: 'uppercase', color: colors.dim, marginTop: 2,
          }}>{label}</span>
        )}
      </div>
    </div>
  )
}
