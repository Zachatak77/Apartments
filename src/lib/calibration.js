import { buildPrediction } from './scoring'
import { MODEL_DEFAULTS } from './modelSettings'

function hydrateDom(c) {
  if (!c.list_date) return c
  const listD = new Date(c.list_date)
  const endD  = c.contract_date ? new Date(c.contract_date)
              : c.sold_date     ? new Date(c.sold_date)
              : new Date()
  return { ...c, days_on_market: Math.max(0, Math.round((endD - listD) / 86400000)) }
}

// poolDatasets: array of { comps: Property[] } where comps are already hydrated
// settings: model settings object
// Returns { mape, mae } across all closed comps in all pools
export function leaveOneOutCV(poolDatasets, settings) {
  const errors = []

  for (const { comps } of poolDatasets) {
    const closed = comps.filter(c => c.sold_date && c.sold_price)
    for (const holdout of closed) {
      const context = comps.filter(c => c !== holdout)
      const pred = buildPrediction(holdout, context, settings)
      if (!pred) continue
      const pct = Math.abs(pred.predicted - holdout.sold_price) / holdout.sold_price
      errors.push({ pct, abs: Math.abs(pred.predicted - holdout.sold_price) })
    }
  }

  if (!errors.length) return null
  const mape = errors.reduce((s, e) => s + e.pct, 0) / errors.length * 100
  const mae  = Math.round(errors.reduce((s, e) => s + e.abs, 0) / errors.length)
  return { mape, mae, n: errors.length }
}

// Grid search over the three calibrated parameters.
// Returns { best: settings, bestResult, currentResult }
export function gridSearch(poolDatasets, currentSettings) {
  const fvWeights    = [30, 40, 45, 50, 55, 60, 65, 70]
  const taxMults     = [5, 7, 9, 11, 13, 15, 17, 20]
  const domDiscounts = [2, 4, 6, 8, 10, 12]

  const currentResult = leaveOneOutCV(poolDatasets, currentSettings)

  let best    = null
  let bestErr = Infinity

  for (const predFvWeight of fvWeights) {
    for (const taxCapMultiple of taxMults) {
      for (const predDomDiscount of domDiscounts) {
        const candidate = { ...MODEL_DEFAULTS, ...currentSettings, predFvWeight, taxCapMultiple, predDomDiscount }
        const result    = leaveOneOutCV(poolDatasets, candidate)
        if (!result) continue
        if (result.mape < bestErr) {
          bestErr = result.mape
          best    = { candidate, result }
        }
      }
    }
  }

  return { best, currentResult }
}

// Fetch all pool comps for a user via the Supabase client.
// Returns array of { poolId, comps } filtered to pools with >= minComps closed comps.
export async function fetchAllPoolDatasets(supabase, userId, minComps = 4) {
  const { data: pools, error: poolErr } = await supabase
    .from('comp_pools')
    .select('id')
    .eq('user_id', userId)

  if (poolErr || !pools?.length) return []

  const datasets = []
  for (const pool of pools) {
    const { data, error } = await supabase
      .from('pool_properties')
      .select('properties(*)')
      .eq('pool_id', pool.id)
    if (error || !data?.length) continue

    const comps = data.map(r => r.properties).filter(Boolean).map(hydrateDom)
    const closedCount = comps.filter(c => c.sold_date && c.sold_price).length
    if (closedCount >= minComps) {
      datasets.push({ poolId: pool.id, comps, closedCount })
    }
  }

  return datasets
}

// Count total closed comps and qualifying pools across all pools (for the pre-run summary).
export async function fetchCalibrationSummary(supabase, userId) {
  const { data: pools } = await supabase
    .from('comp_pools')
    .select('id')
    .eq('user_id', userId)

  if (!pools?.length) return { totalClosed: 0, qualifyingPools: 0, totalPools: 0 }

  let totalClosed = 0
  let qualifyingPools = 0

  for (const pool of pools) {
    const { data } = await supabase
      .from('pool_properties')
      .select('properties(sold_date, sold_price)')
      .eq('pool_id', pool.id)
    if (!data) continue
    const closed = data.map(r => r.properties).filter(c => c?.sold_date && c?.sold_price).length
    totalClosed += closed
    if (closed >= 4) qualifyingPools++
  }

  return { totalClosed, qualifyingPools, totalPools: pools.length }
}
