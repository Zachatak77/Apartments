export const MED_PSF = 449
export const CEIL_PSF = 508

export function scoreComp(c) {
  const ps = c.psf < 340 ? 3 : c.psf < 400 ? 2.5 : c.psf < 450 ? 2 : c.psf < 510 ? 1.5 : 1
  const ts = c.taxes < 19000 ? 3 : c.taxes < 23000 ? 2.8 : c.taxes < 27000 ? 2 : c.taxes < 31000 ? 1.5 : 1
  const ss = c.sqft > 4600 ? 3 : c.sqft > 4100 ? 2.5 : c.sqft > 3700 ? 2 : c.sqft > 3300 ? 1.5 : 1
  const ls = c.lot_sqft > 40000 ? 3 : c.lot_sqft > 33000 ? 2.5 : c.lot_sqft > 25000 ? 2 : c.lot_sqft > 18000 ? 1.5 : 1
  const as = c.year_built >= 2010 ? 3 : c.year_built >= 2000 ? 2.8 : c.year_built >= 1990 ? 2.2 : c.year_built >= 1975 ? 1.8 : 1.5
  const dom = c.days_on_market ?? 0
  const ms = c.over_ask ? 3 : c.is_closed ? 2 : dom > 50 ? 1 : dom > 20 ? 1.8 : 2.2

  const weighted = (ps * 35 + ts * 20 + ss * 15 + ls * 15 + as * 15) / 100
  return {
    ps, ts, ss, ls, as, ms,
    comp: Math.round((weighted / 3) * 100),
  }
}

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

export function offerRange(comp) {
  const price = comp.last_list_price ?? comp.original_list_price
  if (!price) return null
  const dom = comp.days_on_market ?? 0
  const cut = (comp.original_list_price ?? 0) - (comp.last_list_price ?? comp.original_list_price ?? 0)

  let lo, hi
  if (dom > 60)      { lo = .84; hi = .89 }
  else if (dom > 40) { lo = .87; hi = .92 }
  else if (dom > 20) { lo = .92; hi = .96 }
  else if (dom > 10) { lo = .95; hi = .98 }
  else               { lo = .97; hi = 1.02 }

  if (cut > 150000) { lo *= .97; hi *= .97 }
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
  const cuts = comps.filter(c => c.original_list_price && c.last_list_price && c.original_list_price > c.last_list_price)
  const avgCut = cuts.length
    ? Math.round(cuts.reduce((s, c) => s + (c.original_list_price - c.last_list_price), 0) / cuts.length)
    : 0

  return {
    medianPsf: psfs.length ? median(psfs) : 0,
    psfRange: psfs.length ? Math.max(...psfs) - Math.min(...psfs) : 0,
    closedCount: closed.length,
    totalCount: comps.length,
    avgCut,
  }
}
