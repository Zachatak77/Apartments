export const DEFAULT_PREFS = { rate: 7.0, downPct: 20, term: 30 }

const STORAGE_KEY = 'compiq_mortgage_prefs'

export function loadMortgagePrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function saveMortgagePrefs(prefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export function calcMonthlyPayment(principal, annualRatePct, termYears) {
  if (!principal || !annualRatePct || !termYears) return 0
  const r = annualRatePct / 100 / 12
  const n = termYears * 12
  if (r === 0) return Math.round(principal / n)
  return Math.round(principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1))
}
