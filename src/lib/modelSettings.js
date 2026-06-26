const STORAGE_KEY = 'compiq_model_settings'

export const MODEL_DEFAULTS = {
  // Scoring weights — should sum to 100
  wPsf:     28,
  wTax:     18,
  wSqft:    12,
  wLot:     12,
  wAge:     10,
  wMarket:  10,
  wMonthly: 10,

  // Verdict thresholds (score 0–100)
  strongBuyScore: 70,
  considerScore:  50,

  // Flag thresholds
  psfBuyZone:     390,
  psfAbove:       460,
  taxHighThresh:  30000,
  domLeverage:    40,
  largeCutThresh: 150000,

  // Carrying cost assumptions
  closingCostPct: 2.5,
  insuranceRate:  0.5,
  saltCap:        40000,  // deductible property-tax cap (SALT) for after-tax carrying cost

  // Fair value internals (used by buildFairValue; not surfaced in UI)
  taxCapMultiple:  11,
  ageAdjPerYear:    0,
  maxDomDiscount:  10,

  // Predicted close
  predFvWeight:    55,   // base % weight of fair value in blended prediction (30–80)
  predDomDiscount:  6,   // extra % discount on predicted close for 60+ DOM listings
  predCutDiscount:  1.5, // extra % discount when seller has already cut price

  // Likely outcome classifier
  outcomeHotDom:        7,  // DOM below this = bullish fresh-to-market signal
  outcomeStallDom:     30,  // DOM above this = bearish stalling signal
  outcomeOverpricedPct: 5,  // ask X% above fair value starts triggering bearish signals
}

export function loadModelSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...MODEL_DEFAULTS }
    return { ...MODEL_DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...MODEL_DEFAULTS }
  }
}

export function saveModelSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
