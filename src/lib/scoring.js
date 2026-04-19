import { loadModelSettings } from './modelSettings'

export const MED_PSF  = 449  // fallback when pool has no closed comps
export const CEIL_PSF = 508  // fallback when pool has no closed comps

// ── Pricing context (replaces hardcoded CEIL_PSF / fairPsf) ─────────────────
// Derives fair value, ceiling, and floor from the pool's own closed-sale
// distribution using mean ± 1 sample std dev. Re-run whenever comps change.
//
// Returns null when there are no qualifying closed comps.
// With 1 comp: stdDev = 0, ceil = floor = fair = that comp's psf.
export function buildPricingContext(comps) {
  const psfs = comps
    .filter(c => c.is_closed && c.psf && !c.over_ask)
    .map(c => c.psf)

  const n = psfs.length
  if (!n) return null

  const mean   = psfs.reduce((s, v) => s + v, 0) / n
  const stdDev = n > 1
    ? Math.sqrt(psfs.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1))
    : 0

  return {
    n,
    mean:   Math.round(mean),
    stdDev: Math.round(stdDev),
    fair:   Math.round(mean),
    ceil:   Math.round(mean + stdDev),
    floor:  Math.round(Math.max(1, mean - stdDev)),
  }
}


// ── Pool context ────────────────────────────────────────────────────────────
// Call once per render with the full comps array; pass result to scoreComp.
// Returns null-safe percentile objects — null when < 3 data points exist.
export function buildPoolContext(comps) {
  function pcts(vals) {
    const s = [...vals].sort((a, b) => a - b)
    if (s.length < 3) return null
    const at = p => {
      const i = p * (s.length - 1)
      const lo = Math.floor(i), hi = Math.ceil(i)
      return s[lo] + (s[hi] - s[lo]) * (i - lo)
    }
    return { p10: at(.1), p25: at(.25), p50: at(.5), p75: at(.75), p90: at(.9) }
  }
  return {
    psf:        pcts(comps.map(c => c.psf).filter(Boolean)),
    taxes:      pcts(comps.map(c => c.taxes).filter(Boolean)),
    sqft:       pcts(comps.map(c => c.sqft).filter(Boolean)),
    lot_sqft:   pcts(comps.map(c => c.lot_sqft).filter(Boolean)),
    year_built: pcts(comps.map(c => c.year_built).filter(Boolean)),
  }
}

// ── Sub-scorers ─────────────────────────────────────────────────────────────
// Dynamic path: score relative to pool percentiles.
// Fallback path (p == null): original hardcoded thresholds.

function scoreLow(val, p, fallback) {
  if (val == null) return 1
  if (!p) return fallback(val)
  if (val <= p.p10) return 3.0
  if (val <= p.p25) return 2.6
  if (val <= p.p50) return 2.1
  if (val <= p.p75) return 1.5
  if (val <= p.p90) return 1.2
  return 1.0
}

function scoreHigh(val, p, fallback) {
  if (val == null) return 1
  if (!p) return fallback(val)
  if (val >= p.p90) return 3.0
  if (val >= p.p75) return 2.6
  if (val >= p.p50) return 2.1
  if (val >= p.p25) return 1.5
  if (val >= p.p10) return 1.2
  return 1.0
}

// ── Main scorer ─────────────────────────────────────────────────────────────
// ctx is optional. When provided (pool has 3+ data points per metric),
// thresholds are derived from the pool's own percentile distribution.
// Falls back to hardcoded thresholds for small pools or missing metrics.
export function scoreComp(c, ctx, weights) {
  const s = weights ?? loadModelSettings()
  const W = { ps: s.wPsf, ts: s.wTax, ss: s.wSqft, ls: s.wLot, as: s.wAge, ms: s.wMarket }
  const ps = scoreLow(c.psf, ctx?.psf,
    v => v < 340 ? 3 : v < 400 ? 2.5 : v < 450 ? 2 : v < 510 ? 1.5 : 1)

  const ts = scoreLow(c.taxes, ctx?.taxes,
    v => v < 19000 ? 3 : v < 23000 ? 2.8 : v < 27000 ? 2 : v < 31000 ? 1.5 : 1)

  const ss = scoreHigh(c.sqft, ctx?.sqft,
    v => v > 4600 ? 3 : v > 4100 ? 2.5 : v > 3700 ? 2 : v > 3300 ? 1.5 : 1)

  const ls = scoreHigh(c.lot_sqft, ctx?.lot_sqft,
    v => v > 40000 ? 3 : v > 33000 ? 2.5 : v > 25000 ? 2 : v > 18000 ? 1.5 : 1)

  const as = scoreHigh(c.year_built, ctx?.year_built,
    v => v >= 2010 ? 3 : v >= 2000 ? 2.8 : v >= 1990 ? 2.2 : v >= 1975 ? 1.8 : 1.5)

  // Market signal: validated demand (over ask) → 3, normal closed → 2,
  // stale active (50+ DOM) → 1, moderate DOM → 1.8, new active → 2.2
  const dom = c.days_on_market ?? 0
  const ms  = c.over_ask ? 3 : c.is_closed ? 2 : dom > 50 ? 1 : dom > 20 ? 1.8 : 2.2

  const weighted = (ps * W.ps + ts * W.ts + ss * W.ss + ls * W.ls + as * W.as + ms * W.ms) / 100
  return { ps, ts, ss, ls, as, ms, comp: Math.round((weighted / 3) * 100) }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
export function cellClass(val, max) {
  const p = val / max
  return p >= .85 ? 'c5' : p >= .7 ? 'c4' : p >= .5 ? 'c3' : p >= .35 ? 'c2' : 'c1'
}

export function calcPsf(comp) {
  const price = comp.sold_price ?? comp.last_list_price ?? comp.original_list_price
  if (!price || !comp.sqft) return null
  return Math.round(price / comp.sqft)
}

export function calcLotPsf(comp) {
  const price = comp.sold_price ?? comp.last_list_price ?? comp.original_list_price
  if (!price || !comp.lot_sqft) return null
  return +(price / comp.lot_sqft).toFixed(2)
}

export function offerRange(comp, settings) {
  const price = comp.last_list_price ?? comp.original_list_price
  if (!price) return null
  const s   = settings ?? loadModelSettings()
  const dom = comp.days_on_market ?? 0
  const cut = (comp.original_list_price ?? 0) - (comp.last_list_price ?? comp.original_list_price ?? 0)

  let lo, hi
  if (dom > 60)      { lo = .84; hi = .89 }
  else if (dom > 40) { lo = .87; hi = .92 }
  else if (dom > 20) { lo = .92; hi = .96 }
  else if (dom > 10) { lo = .95; hi = .98 }
  else               { lo = .97; hi = 1.02 }

  if (cut > s.largeCutThresh) { lo *= .97; hi *= .97 }
  return { lo: Math.round(price * lo), hi: Math.round(price * hi) }
}

export function poolStats(comps) {
  if (!comps.length) return {}
  const psfs = comps.map(c => c.psf).filter(Boolean)
  const median = arr => {
    const s = [...arr].sort((a, b) => a - b)
    const m = Math.floor(s.length / 2)
    return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
  }
  const closed = comps.filter(c => c.is_closed)
  const cuts   = comps.filter(c => c.original_list_price && c.last_list_price && c.original_list_price > c.last_list_price)
  const avgCut = cuts.length
    ? Math.round(cuts.reduce((s, c) => s + (c.original_list_price - c.last_list_price), 0) / cuts.length)
    : 0
  return {
    medianPsf:  psfs.length ? median(psfs) : 0,
    psfRange:   psfs.length ? Math.max(...psfs) - Math.min(...psfs) : 0,
    closedCount: closed.length,
    totalCount:  comps.length,
    avgCut,
  }
}
