import { useState, useMemo } from 'react'
import { scoreComp, buildPoolContext, buildPricingContext, CEIL_PSF, offerRange } from '../lib/scoring'
import { loadMortgagePrefs, calcMonthlyPayment, MORTGAGE_DEDUCTION_CAP } from '../lib/mortgage'
import { loadModelSettings } from '../lib/modelSettings'
import styles from './CompDetailModal.module.css'

function buildDims(ms) {
  return [
    { key: 'ps', label: '$/SF',    weight: ms.wPsf,     valKey: 'psf',        lower: true,  fmt: v => v ? `$${v}/SF`                       : '—' },
    { key: 'ts', label: 'Taxes',   weight: ms.wTax,     valKey: 'taxes',      lower: true,  fmt: v => v ? `$${Math.round(v / 1000)}K/yr`   : '—' },
    { key: 'ss', label: 'Size',    weight: ms.wSqft,    valKey: 'sqft',       lower: false, fmt: v => v ? `${v.toLocaleString()} SF`        : '—' },
    { key: 'ls', label: 'Lot',     weight: ms.wLot,     valKey: 'lot_sqft',   lower: false, fmt: v => v ? `${Math.round(v / 1000)}K SF`     : '—' },
    { key: 'as', label: 'Age',     weight: ms.wAge,     valKey: 'year_built', lower: false, fmt: v => v ? `Built ${v}`                      : '—' },
    { key: 'ms', label: 'Signal',  weight: ms.wMarket,  valKey: null,         lower: false, fmt: (_, c) => {
      if (!c) return '—'
      const dom = c.days_on_market ?? 0
      return (c.sold_price > c.original_list_price) ? '▲ over ask' : c.sold_date ? '✓ closed' : dom > 0 ? `${dom}d on market` : 'active'
    }},
    ...((ms.wMonthly ?? 0) > 0 ? [{ key: 'mm', label: 'Monthly', weight: ms.wMonthly, valKey: null, lower: true, fmt: (_, c) => {
      if (!c) return '—'
      const p = c.last_list_price ?? c.original_list_price
      if (!p) return '—'
      const prefs = loadMortgagePrefs()
      const loan  = p * (1 - prefs.downPct / 100)
      const pi    = calcMonthlyPayment(loan, prefs.rate, prefs.term)
      const ins   = p * (ms.insuranceRate / 100) / 12
      const tax   = c.taxes ? c.taxes / 12 : 0
      return `$${Math.round((pi + tax + ins) / 1000)}K/mo`
    }}] : []),
  ]
}

function median(arr) {
  if (!arr.length) return null
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}

function rankOf(arr, val, lower) {
  // 1 = best
  const sorted = [...arr].sort((a, b) => lower ? a - b : b - a)
  const idx = sorted.indexOf(val)
  return idx === -1 ? null : idx + 1
}

function dimText(key, score, comp, allComps, ms) {
  const vals = allComps.map(c => c[{ ps: 'psf', ts: 'taxes', ss: 'sqft', ls: 'lot_sqft', as: 'year_built' }[key]]).filter(Boolean)
  const med = median(vals)

  if (key === 'ps') {
    if (!comp.psf || !med) return 'No $/SF data to compare.'
    const diff = comp.psf - med
    if (diff <= -40) return `$${Math.abs(diff)}/SF below pool median ($${med}) — strong value signal.`
    if (diff <= -10) return `Slightly below pool median $/SF of $${med}.`
    if (diff <= 20)  return `Near pool median $/SF of $${med}.`
    if (diff <= 50)  return `$${diff}/SF above pool median ($${med}) — at a premium.`
    return `$${diff}/SF above pool median — limited comp support at this price.`
  }
  if (key === 'ts') {
    if (!comp.taxes || !med) return 'No tax data to compare.'
    const diff = comp.taxes - med
    if (diff < -3000) return `Taxes $${Math.round(Math.abs(diff) / 1000)}K below pool median ($${Math.round(med / 1000)}K) — meaningful recurring savings.`
    if (diff < -500)  return `Slightly below pool median taxes of $${Math.round(med / 1000)}K/yr.`
    if (diff <= 1000) return `Near pool median taxes ($${Math.round(med / 1000)}K/yr).`
    if (diff <= 4000) return `$${Math.round(diff / 1000)}K above pool median — adds to carrying cost.`
    return `Significantly above pool median taxes ($${Math.round(med / 1000)}K) — check for exemptions.`
  }
  if (key === 'ss') {
    if (!comp.sqft || !med) return 'No size data to compare.'
    const diff = comp.sqft - med
    if (diff > 500)   return `${diff.toLocaleString()} SF larger than pool median (${med.toLocaleString()} SF).`
    if (diff > 100)   return `Slightly above median size (${med.toLocaleString()} SF).`
    if (diff >= -100) return `At pool median size of ${med.toLocaleString()} SF.`
    if (diff >= -500) return `${Math.abs(diff).toLocaleString()} SF smaller than pool median.`
    return `Well below median size (${med.toLocaleString()} SF) — reduced value basis.`
  }
  if (key === 'ls') {
    if (!comp.lot_sqft || !med) return 'No lot data to compare.'
    const diff = comp.lot_sqft - med
    if (diff > 8000)  return `${Math.round(diff / 1000)}K SF more lot than pool median — strong land value.`
    if (diff > 2000)  return `Lot slightly above pool median (${Math.round(med / 1000)}K SF).`
    if (diff >= -2000) return `Near pool median lot size (${Math.round(med / 1000)}K SF).`
    return `${Math.round(Math.abs(diff) / 1000)}K SF less lot than pool median.`
  }
  if (key === 'ms') {
    const dom = comp.days_on_market ?? 0
    if (comp.sold_price > comp.original_list_price) return 'Sold over asking price — validated strong demand at this price point.'
    if (comp.sold_date)   return 'Closed at or below ask — normal market transaction.'
    if (dom > 50)         return `${dom} days on market — market has not validated ask price. Strong buyer negotiating position.`
    if (dom > 20)         return `${dom} days on market — moderate resistance. Some negotiating room likely.`
    if (dom > 0)          return `${dom} days on market — active and relatively fresh.`
    return 'Active listing with no DOM data.'
  }
  if (key === 'as') {
    const yr = comp.year_built
    if (!yr) return 'No year built data.'
    if (yr >= 2015) return `Built ${yr} — relatively new construction; lower deferred maintenance risk.`
    if (yr >= 2000) return `Built ${yr} — modern construction, likely updated systems.`
    if (yr >= 1985) return `Built ${yr} — mid-age; verify major systems (roof, HVAC, plumbing).`
    if (yr >= 1970) return `Built ${yr} — older build; budget for updates.`
    return `Built ${yr} — pre-1970 construction; expect significant deferred maintenance.`
  }
  if (key === 'mm') {
    const p = comp.last_list_price ?? comp.original_list_price
    if (!p) return 'No price data to estimate monthly cost.'
    const prefs = loadMortgagePrefs()
    const loan  = p * (1 - prefs.downPct / 100)
    const pi    = calcMonthlyPayment(loan, prefs.rate, prefs.term)
    const ins   = p * ((ms?.insuranceRate ?? 0.5) / 100) / 12
    const tax   = comp.taxes ? comp.taxes / 12 : 0
    const monthly = pi + tax + ins
    const poolMonthlies = allComps.map(c => {
      const cp = c.last_list_price ?? c.original_list_price
      if (!cp) return null
      const cl  = cp * (1 - prefs.downPct / 100)
      const cpi = calcMonthlyPayment(cl, prefs.rate, prefs.term)
      return cpi + (c.taxes ? c.taxes / 12 : 0) + cp * ((ms?.insuranceRate ?? 0.5) / 100) / 12
    }).filter(Boolean)
    const medM = median(poolMonthlies)
    if (!medM) return `Est. ~$${Math.round(monthly / 1000)}K/mo (P&I + tax + ins).`
    const diff = monthly - medM
    if (diff < -300) return `~$${Math.abs(Math.round(diff))}/mo below pool median ($${Math.round(medM / 1000)}K) — lighter carry.`
    if (diff < 300)  return `Near pool median monthly carrying cost (~$${Math.round(medM / 1000)}K/mo).`
    return `~$${Math.round(diff)}/mo above pool median ($${Math.round(medM / 1000)}K) — heavier carry.`
  }
  return ''
}

function generateFindings(comp, allComps, s, price) {
  const findings = []
  const psfs   = allComps.map(c => c.psf).filter(Boolean)
  const taxes  = allComps.map(c => c.taxes).filter(Boolean)
  const ctx      = buildPoolContext(allComps)
  const pricing  = buildPricingContext(allComps)
  const ceilPsf  = pricing?.ceil ?? CEIL_PSF
  const scores   = allComps.map(c => scoreComp({ ...c, psf: c.psf ?? 999 }, ctx).comp)
  const medPsf  = median(psfs)
  const medTax  = median(taxes)
  const scoreRank = rankOf(scores, s.comp, false)
  const n = allComps.length

  // Score position
  if (scoreRank && n > 1) {
    const top = scoreRank <= Math.ceil(n * 0.25)
    const bot = scoreRank > Math.floor(n * 0.75)
    if (top)      findings.push({ type: 'pos', text: `Composite score of ${s.comp} ranks #${scoreRank} of ${n} — top quartile of this pool.` })
    else if (bot) findings.push({ type: 'neg', text: `Composite score of ${s.comp} ranks #${scoreRank} of ${n} — bottom quartile. Weaker profile relative to pool.` })
    else          findings.push({ type: 'neu', text: `Composite score of ${s.comp} ranks #${scoreRank} of ${n} — middle of the pool.` })
  }

  // $/SF vs ceiling
  if (comp.psf && comp.psf > ceilPsf) {
    findings.push({ type: 'neg', text: `At $${comp.psf}/SF, this listing exceeds the pool ceiling of $${ceilPsf}/SF (μ + 1σ of closed sales). No closed comp supports this price per square foot.` })
  } else if (comp.psf && medPsf && comp.psf < medPsf * 0.9) {
    findings.push({ type: 'pos', text: `$/SF of $${comp.psf} is more than 10% below pool median ($${medPsf}) — meaningful value buffer against further declines.` })
  }

  // Price cut
  const cut = comp.original_list_price && comp.last_list_price && comp.original_list_price > comp.last_list_price
    ? comp.original_list_price - comp.last_list_price : 0
  if (cut > 0) {
    const pct = ((cut / comp.original_list_price) * 100).toFixed(1)
    findings.push({ type: 'pos', text: `Price reduced $${Math.round(cut / 1000)}K (${pct}%) from original list — seller motivation is evident.` })
  }

  // DOM signal
  const dom = comp.days_on_market ?? 0
  if (!comp.sold_date && dom > 60) {
    findings.push({ type: 'pos', text: `${dom} days on market without an accepted offer. Extended DOM eliminates competing buyer pressure — aggressive negotiation is warranted.` })
  } else if (!comp.sold_date && dom > 30) {
    findings.push({ type: 'neu', text: `${dom} days on market. Moderately stale — seller likely open to offers below ask.` })
  }

  // Over ask
  if (comp.sold_date && comp.sold_price > comp.original_list_price) {
    findings.push({ type: 'neg', text: `Closed over asking price — this comp reflects bidding-war conditions and may overstate market value for non-competitive listings.` })
  }

  // Tax burden vs median
  if (comp.taxes && medTax) {
    const diff = comp.taxes - medTax
    if (diff > 4000) {
      const monthly = Math.round(diff / 12)
      findings.push({ type: 'neg', text: `Annual taxes $${Math.round(diff / 1000)}K above pool median — adds ~$${monthly}/mo to carrying cost vs the median comp.` })
    } else if (diff < -4000) {
      const monthly = Math.round(Math.abs(diff) / 12)
      findings.push({ type: 'pos', text: `Annual taxes $${Math.round(Math.abs(diff) / 1000)}K below pool median — saves ~$${monthly}/mo vs the median comp.` })
    }
  }

  // Sold closed comp with sell-to-ask
  if (comp.sold_date && comp.sold_price && comp.last_list_price) {
    const ratio = (comp.sold_price / comp.last_list_price * 100).toFixed(1)
    if (!(comp.sold_price > comp.original_list_price)) {
      findings.push({ type: 'neu', text: `Closed at ${ratio}% of final list price ($${Math.round(comp.sold_price / 1000)}K of $${Math.round(comp.last_list_price / 1000)}K ask) — confirms real-world negotiating room.` })
    }
  }

  if (!findings.length) {
    findings.push({ type: 'neu', text: 'Add more comp data (taxes, DOM, price history) to generate specific insights for this property.' })
  }

  return findings
}

export default function CompDetailModal({ comp, comps, onClose, onEdit }) {
  const ctx      = useMemo(() => buildPoolContext(comps), [comps])
  const pricing  = useMemo(() => buildPricingContext(comps), [comps])
  const ceilPsf  = pricing?.ceil ?? CEIL_PSF
  const prefs    = useMemo(() => loadMortgagePrefs(), [])
  const ms       = useMemo(() => loadModelSettings(), [])

  const dims = useMemo(() => buildDims(ms), [ms])

  const s = useMemo(() => scoreComp({
    ...comp,
    psf: comp.psf ?? (comp.last_list_price && comp.sqft ? Math.round(comp.last_list_price / comp.sqft) : null) ?? 999,
  }, ctx, ms), [comp, ctx, ms])

  const price = (comp.sold_date ? comp.sold_price : null) ?? comp.last_list_price ?? comp.original_list_price

  // ── Scenario state ────────────────────────────────────────────────
  const listPrice = comp.last_list_price ?? comp.original_list_price ?? price ?? 1500000
  const [scenPrice, setScenPrice] = useState(listPrice)
  const [scenDom,   setScenDom]   = useState(comp.days_on_market ?? 0)
  const [scenReno,  setScenReno]  = useState(0)

  const scen = useMemo(() => {
    const scenPsf   = comp.sqft ? Math.round(scenPrice / comp.sqft) : null
    const scenAllin = comp.sqft ? Math.round((scenPrice + scenReno) / comp.sqft) : null

    const scenScore = scoreComp(
      { ...comp, psf: scenPsf ?? 999, days_on_market: scenDom },
      ctx,
      ms,
    )

    const verdict = scenScore.comp >= ms.strongBuyScore && (scenAllin == null || scenAllin < ceilPsf)
      ? 'Strong Buy'
      : scenScore.comp >= ms.considerScore && (scenAllin == null || scenAllin < ceilPsf)
        ? 'Consider'
        : 'Pass'

    // Carrying costs
    const downAmt    = Math.round(scenPrice * prefs.downPct / 100)
    const loanAmt    = scenPrice - downAmt
    const monthlyPI  = calcMonthlyPayment(loanAmt, prefs.rate, prefs.term)
    const monthlyTax = comp.taxes ? comp.taxes / 12 : null
    const monthlyIns = scenPrice * (ms.insuranceRate / 100) / 12
    const monthlyTotal = monthlyPI + (monthlyTax ?? 0) + monthlyIns

    // After-tax
    const deductibleLoan     = Math.min(loanAmt, MORTGAGE_DEDUCTION_CAP)
    const annualIntDeductible = deductibleLoan * (prefs.rate / 100)
    const taxSavingsMonthly  = ((annualIntDeductible + (comp.taxes ?? 0)) * ((prefs.taxRate ?? 32) / 100)) / 12
    const monthlyAfterTax    = monthlyTotal - taxSavingsMonthly

    const offer = offerRange(
      { ...comp, days_on_market: scenDom, last_list_price: scenPrice },
      ms,
    )

    return { scenPsf, scenAllin, scenScore, verdict, downAmt, loanAmt, monthlyPI, monthlyTax, monthlyIns, monthlyTotal, monthlyAfterTax, offer }
  }, [scenPrice, scenDom, scenReno, comp, ctx, prefs, ms, ceilPsf])
  const findings = useMemo(() => generateFindings(comp, comps, s, price), [comp, comps, s])

  const scoreColor = s.comp >= 70 ? '#2A5C42' : s.comp >= 50 ? '#7A9E8A' : s.comp >= 35 ? '#B8A87A' : '#8B3A2A'
  const scoreLabel = s.comp >= 70 ? 'Strong Value' : s.comp >= 50 ? 'Above Average' : s.comp >= 35 ? 'Average' : 'Weak Value'

  const dom = comp.days_on_market ?? 0
  const overAsk = comp.sold_price > comp.original_list_price
  const status = comp.sold_date ? (overAsk ? 'Closed Over Ask' : 'Closed') : dom > 0 ? `Active · ${dom}d` : 'Active'
  const statusCls = comp.sold_date ? (overAsk ? styles.badgeOver : styles.badgeClosed) : dom > 45 ? styles.badgeStale : styles.badgeActive

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.drawer}>
        <div className={styles.handle} />

        {/* Header */}
        <div className={styles.hdr}>
          <div className={styles.hdrTop}>
            <div>
              <div className={styles.address}>{comp.address}</div>
              {comp.town && <div className={styles.town}>{comp.town}</div>}
            </div>
            <div className={styles.hdrActions}>
              {onEdit && <button className={styles.hdrEditBtn} onClick={() => { onEdit(comp); onClose() }}>Edit</button>}
              <button className={styles.closeBtn} onClick={onClose}>✕</button>
            </div>
          </div>
          <div className={styles.hdrMeta}>
            <span className={`${styles.badge} ${statusCls}`}>{status}</span>
            {price && <span className={styles.price}>${Math.round(price / 1000)}K</span>}
            {comp.psf && <span className={styles.psf}>${comp.psf}/SF</span>}
            {pricing && comp.sqft && (
              <span className={styles.fairVal}>Fair ${Math.round(pricing.fair * comp.sqft / 1000)}K</span>
            )}
          </div>
        </div>

        <div className={styles.body}>
          {/* Composite Score */}
          <section className={styles.section}>
            <div className={styles.scoreHero}>
              <div className={styles.scoreNum} style={{ color: scoreColor }}>{s.comp}</div>
              <div className={styles.scoreRight}>
                <div className={styles.scoreLabel} style={{ color: scoreColor }}>{scoreLabel}</div>
                <div className={styles.scoreDesc}>Weighted composite out of 100</div>
                <div className={styles.scoreBar}>
                  <div className={styles.scoreBarFill} style={{ width: `${s.comp}%`, background: scoreColor }} />
                </div>
              </div>
            </div>
          </section>

          {/* Score Breakdown */}
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Score Breakdown</div>
            <div className={styles.dims}>
              {dims.map(d => {
                const rawScore = s[d.key] ?? 1.5
                const barPct   = ((rawScore - 1) / 2) * 100
                const val      = d.valKey ? comp[d.valKey] : null
                const text     = dimText(d.key, rawScore, comp, comps, ms)
                const good     = rawScore >= 2.2
                const weak     = rawScore < 1.6
                return (
                  <div key={d.key} className={styles.dim}>
                    <div className={styles.dimTop}>
                      <span className={styles.dimLabel}>{d.label}</span>
                      <span className={styles.dimWeight}>{d.weight}%</span>
                      <span className={styles.dimVal}>{d.fmt(val, comp)}</span>
                    </div>
                    <div className={styles.dimBarTrack}>
                      <div
                        className={styles.dimBarFill}
                        style={{
                          width: `${barPct}%`,
                          background: good ? '#2A5C42' : weak ? '#8B3A2A' : '#B8A87A',
                        }}
                      />
                    </div>
                    <div className={styles.dimText}>{text}</div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Pool Position */}
          {comps.length > 1 && (
            <section className={styles.section}>
              <div className={styles.sectionTitle}>Pool Position ({comps.length} comps)</div>
              <div className={styles.rankGrid}>
                {dims.filter(d => d.valKey).map(d => {
                  const vals = comps.map(c => c[d.valKey]).filter(Boolean)
                  if (!vals.length || comp[d.valKey] == null) return null
                  const r = rankOf(vals, comp[d.valKey], d.lower)
                  const isGood = r <= Math.ceil(vals.length * 0.33)
                  const isWeak = r > Math.floor(vals.length * 0.66)
                  return (
                    <div key={d.key} className={styles.rankCard}>
                      <div className={styles.rankLbl}>{d.label}</div>
                      <div
                        className={styles.rankNum}
                        style={{ color: isGood ? '#2A5C42' : isWeak ? '#8B3A2A' : 'var(--text)' }}
                      >
                        #{r}
                      </div>
                      <div className={styles.rankOf}>of {vals.length}</div>
                    </div>
                  )
                }).filter(Boolean)}
              </div>
            </section>
          )}

          {/* Findings */}
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Property Findings</div>
            <div className={styles.findings}>
              {findings.map((f, i) => (
                <div key={i} className={`${styles.finding} ${styles[f.type]}`}>
                  <span className={styles.findingDot} />
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Scenario */}
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Scenario</div>

            <div className={styles.scenSliders}>
              <ScenSlider
                label="Offer Price"
                min={Math.round(listPrice * 0.6 / 25000) * 25000}
                max={Math.round(listPrice * 1.3 / 25000) * 25000}
                step={25000}
                value={scenPrice}
                onChange={setScenPrice}
                display={`$${Math.round(scenPrice / 1000)}K`}
              />
              <ScenSlider
                label="Days on Market"
                min={0} max={180} step={1}
                value={scenDom}
                onChange={setScenDom}
                display={`${scenDom}d`}
              />
              <ScenSlider
                label="Renovation Budget"
                min={0} max={500000} step={10000}
                value={scenReno}
                onChange={setScenReno}
                display={scenReno ? `$${Math.round(scenReno / 1000)}K` : 'None'}
              />
            </div>

            {/* Score + verdict */}
            <div className={styles.scenResult}>
              <div className={styles.scenScoreBlock}>
                <div
                  className={styles.scenScore}
                  style={{ color: scen.scenScore.comp >= 70 ? '#2A5C42' : scen.scenScore.comp >= 50 ? '#7A9E8A' : '#8B3A2A' }}
                >
                  {scen.scenScore.comp}
                </div>
                <div className={styles.scenScoreSub}>score</div>
              </div>
              <div className={styles.scenVerdictBlock}>
                <div className={`${styles.scenVerdict} ${scen.verdict === 'Strong Buy' ? styles.vBuy : scen.verdict === 'Consider' ? styles.vConsider : styles.vPass}`}>
                  {scen.verdict}
                </div>
                {scen.scenPsf && <div className={styles.scenMeta}>${scen.scenPsf}/SF{scen.scenAllin ? ` · $${scen.scenAllin} all-in` : ''}</div>}
                {scen.offer && <div className={styles.scenMeta}>Offer range: ${Math.round(scen.offer.lo / 1000)}K – ${Math.round(scen.offer.hi / 1000)}K</div>}
              </div>
            </div>

            {/* Carrying costs */}
            <div className={styles.scenCosts}>
              <div className={styles.scenCostTitle}>Monthly Carrying Costs</div>
              <div className={styles.scenCostRow}>
                <span>P&amp;I ({prefs.rate.toFixed(2)}%, {prefs.term}yr)</span>
                <span>${Math.round(scen.monthlyPI).toLocaleString()}</span>
              </div>
              {scen.monthlyTax != null && (
                <div className={styles.scenCostRow}>
                  <span>Property tax</span>
                  <span>${Math.round(scen.monthlyTax).toLocaleString()}</span>
                </div>
              )}
              <div className={styles.scenCostRow}>
                <span>Insurance (est. {ms.insuranceRate}%/yr)</span>
                <span>${Math.round(scen.monthlyIns).toLocaleString()}</span>
              </div>
              <div className={`${styles.scenCostRow} ${styles.scenCostTotal}`}>
                <span>Total /mo</span>
                <span>${Math.round(scen.monthlyTotal).toLocaleString()}</span>
              </div>
              {scen.monthlyTax != null && (
                <div className={`${styles.scenCostRow} ${styles.scenCostAfterTax}`}>
                  <span>After-tax /mo</span>
                  <span>${Math.round(scen.monthlyAfterTax).toLocaleString()}</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function ScenSlider({ label, min, max, step, value, onChange, display }) {
  return (
    <div className={styles.scenSlider}>
      <div className={styles.scenSliderHead}>
        <span className={styles.scenSliderLabel}>{label}</span>
        <span className={styles.scenSliderVal}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} />
    </div>
  )
}
