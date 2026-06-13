import { useState, useEffect } from 'react'

// Recharts needs explicit color strings — it can't read CSS variables.
// This resolves the current token palette from the document and re-reads it
// whenever the [data-theme] attribute flips, so charts follow light/dark.
function readColors() {
  if (typeof document === 'undefined') return {}
  const cs = getComputedStyle(document.documentElement)
  const g = name => cs.getPropertyValue(name).trim()
  return {
    accent:  g('--accent'),
    green:   g('--green'),
    red:     g('--red'),
    amber:   g('--amber'),
    dim:     g('--dim'),
    text:    g('--text'),
    text2:   g('--text-2'),
    border:  g('--border'),
    border2: g('--border2'),
    surface: g('--surface'),
    panel:   g('--panel'),
    statusActive:   g('--status-active'),
    statusContract: g('--status-contract'),
    statusClosed:   g('--status-closed'),
  }
}

export function useChartColors() {
  const [colors, setColors] = useState(readColors)

  useEffect(() => {
    const obs = new MutationObserver(() => setColors(readColors()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  return colors
}

// Shared font family for chart text (matches the data/mono token).
export const CHART_FONT = "'JetBrains Mono', ui-monospace, monospace"

// Map a 0–100 composite score to a semantic color name.
export function scoreColor(colors, score) {
  if (score >= 70) return colors.green
  if (score >= 50) return colors.amber
  return colors.red
}
