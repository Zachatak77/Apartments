// Shared metadata + helpers for the Compare & Decide workspace.

// The 7 weighted dimensions, aligned with scoreComp() sub-score keys.
export const DIMENSIONS = [
  { key: 'ps', label: '$/SF',    hint: 'Price per sq ft (lower is better)' },
  { key: 'ts', label: 'Taxes',   hint: 'Annual taxes (lower is better)'   },
  { key: 'ss', label: 'Size',    hint: 'Interior size (higher is better)' },
  { key: 'ls', label: 'Lot',     hint: 'Lot size (higher is better)'      },
  { key: 'as', label: 'Age',     hint: 'Year built (newer is better)'     },
  { key: 'ms', label: 'Market',  hint: 'Demand signal'                    },
  { key: 'mm', label: 'Monthly', hint: 'Carrying cost (lower is better)'  },
]

export const OUTCOME_LABEL = {
  over_ask:      'Contract over ask',
  near_ask:      'Contract near ask',
  under_ask:     'Contract under ask',
  price_cut:     'Likely price cut',
  remain_active: 'Likely stays active',
}

// Lightweight market velocity label (mirrors OffersTab thresholds) feeding
// predictOutcome's velocity signal.
export function velocityLabel(comps) {
  const doms = comps
    .filter(c => c.sold_date && c.days_on_market > 0)
    .map(c => c.days_on_market)
    .sort((a, b) => a - b)
  if (!doms.length) return null
  const med = doms[Math.floor(doms.length / 2)]
  return med < 14 ? 'Highly Competitive' : med < 30 ? 'Active' : med < 60 ? 'Moderate' : 'Cooling'
}

export function fmtPrice(v) {
  if (v == null) return '—'
  if (Math.abs(v) >= 1_000_000) return `$${parseFloat((v / 1_000_000).toFixed(2))}M`
  return `$${Math.round(v / 1000)}K`
}

export function fmtSigned(v) {
  if (v == null) return '—'
  const s = fmtPrice(Math.abs(v))
  return v >= 0 ? `+${s}` : `−${s}`
}

export function fmtPct(v, digits = 1) {
  if (v == null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)}%`
}
