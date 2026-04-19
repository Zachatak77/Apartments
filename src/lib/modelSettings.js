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
