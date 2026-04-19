import { poolStats, CEIL_PSF, buildPricingContext, offerRange } from '../../lib/scoring'
import { loadMortgagePrefs, calcMonthlyPayment } from '../../lib/mortgage'
import { loadModelSettings } from '../../lib/modelSettings'
import styles from './FindingsTab.module.css'

function median(arr) {
  if (!arr.length) return null
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}

function Finding({ num, title, body, type = '' }) {
  return (
    <div className={`${styles.finding} ${type ? styles[type] : ''}`}>
      <div className={styles.findingNum}>{num}</div>
      <div className={styles.findingTitle}>{title}</div>
      <div className={styles.findingBody} dangerouslySetInnerHTML={{ __html: body }} />
    </div>
  )
}

export default function FindingsTab({ comps }) {
  if (!comps.length) return <div className={styles.empty}>Add comps to generate findings.</div>

  const stats   = poolStats(comps)
  const pricing = buildPricingContext(comps)
  const ceilPsf = pricing?.ceil ?? CEIL_PSF
  const prefs   = loadMortgagePrefs()
  const ms      = loadModelSettings()

  const closed  = comps.filter(c => c.is_closed)
  const active  = comps.filter(c => !c.is_closed)
  const cuts    = comps.filter(c => c.original_list_price && c.last_list_price && c.original_list_price > c.last_list_price)
  const overCeil = active.filter(c => c.psf && c.psf > ceilPsf)
  const highDom  = active.filter(c => (c.days_on_market ?? 0) > 45)
  const overAsk  = closed.filter(c => c.over_ask)

  const closedFloor = [...closed.filter(c => c.psf && !c.over_ask)].sort((a, b) => a.psf - b.psf).slice(0, 2)

  const avgCut = cuts.length
    ? Math.round(cuts.reduce((s, c) => s + (c.original_list_price - c.last_list_price), 0) / cuts.length)
    : 0

  const cutsWithDates = cuts.filter(c => c.list_date && c.last_price_date)
  const avgDomAtCut   = cutsWithDates.length > 0
    ? Math.round(cutsWithDates.reduce((sum, c) =>
        sum + Math.max(0, Math.round((new Date(c.last_price_date) - new Date(c.list_date)) / 86400000)), 0
      ) / cutsWithDates.length)
    : null

  // Active-to-closed $/SF gap
  const medActivePsf = median(active.filter(c => c.psf).map(c => c.psf))
  const medClosedPsf = median(closed.filter(c => c.psf && !c.over_ask).map(c => c.psf))
  const psfGap       = medActivePsf && medClosedPsf ? medActivePsf - medClosedPsf : null
  const psfGapPct    = psfGap && medClosedPsf ? Math.abs((psfGap / medClosedPsf) * 100).toFixed(1) : null

  // Monthly carrying cost range + tax spread
  const monthlyRows = comps.map(c => {
    const price = c.last_list_price ?? c.original_list_price ?? c.sold_price
    if (!price) return null
    const loan     = price * (1 - prefs.downPct / 100)
    const pi       = calcMonthlyPayment(loan, prefs.rate, prefs.term)
    const ins      = price * (ms.insuranceRate / 100) / 12
    const taxMo    = c.taxes ? Math.round(c.taxes / 12) : 0
    return { monthly: Math.round(pi + ins + taxMo), taxMo }
  }).filter(Boolean)
  const minMonthly    = monthlyRows.length ? Math.min(...monthlyRows.map(x => x.monthly)) : null
  const maxMonthly    = monthlyRows.length ? Math.max(...monthlyRows.map(x => x.monthly)) : null
  const taxSpreadMo   = monthlyRows.length
    ? Math.max(...monthlyRows.map(x => x.taxMo)) - Math.min(...monthlyRows.map(x => x.taxMo))
    : null

  // Negotiating room aggregate
  const activeWithOffer = active
    .filter(c => c.last_list_price ?? c.original_list_price)
    .map(c => {
      const ask = c.last_list_price ?? c.original_list_price
      const r   = offerRange(c, ms)
      if (!r) return null
      const mid  = Math.round((r.lo + r.hi) / 2)
      return Math.max(0, ask - mid)
    })
    .filter(v => v !== null)
  const totalNegRoom  = activeWithOffer.reduce((s, v) => s + v, 0)
  const avgNegRoom    = activeWithOffer.length ? Math.round(totalNegRoom / activeWithOffer.length) : null

  const findings = []
  let n = 0
  const label = (conf) => `Finding ${String(++n).padStart(2, '0')} — ${conf}`

  // 1. Price cut pattern
  if (cuts.length > 0) {
    findings.push({
      num: label('High Confidence'),
      title: 'Original List Price Is Systematically Misleading',
      body: `${cuts.length} of ${comps.length} comps had price cuts${avgCut ? `, averaging <strong>−$${Math.round(avgCut / 1000)}K</strong>` : ''}${avgDomAtCut !== null ? ` — sellers in this pool cut at an average of <strong>${avgDomAtCut} DOM</strong>` : ''}. <strong>Final list price is the negotiating baseline — listing history is non-negotiable due diligence.</strong>`,
    })
  }

  // 2. Closed price floor
  if (closedFloor.length >= 2) {
    const f1 = closedFloor[0], f2 = closedFloor[1]
    findings.push({
      num: label('High Confidence'),
      title: `Closed Price Floor: $${f1.psf}–$${f2.psf}/SF`,
      body: `<strong>${f1.address}</strong> ($${f1.psf}/SF) and <strong>${f2.address}</strong> ($${f2.psf}/SF) establish a two-point closed floor. Two independent data points in the same band is a robust statistical floor. Any active listing above <strong>$${Math.round(f2.psf * 1.2)}/SF</strong> with a weaker profile has no comp support.`,
      type: 'g',
    })
  }

  // 3. Active-to-closed $/SF gap (replaces raw $/SF spread)
  if (psfGap !== null && medClosedPsf && medActivePsf) {
    const direction = psfGap > 0 ? 'above' : 'below'
    const absPct    = psfGapPct
    const conf      = Math.abs(psfGap) > 30 ? 'High Confidence' : 'Moderate Confidence'
    findings.push({
      num: label(conf),
      title: psfGap > 5
        ? `Active Listings Asking $${psfGap}/SF Above Where Market Last Cleared`
        : psfGap < -5
        ? `Active Listings Pricing $${Math.abs(psfGap)}/SF Below Closed Comps — Unusual Buyer Advantage`
        : `Active Listings Aligned With Closed $/SF — Rational Pricing`,
      body: psfGap > 5
        ? `Active median $/SF is <strong>$${medActivePsf}</strong> vs. closed median of <strong>$${medClosedPsf}</strong> — a <strong>${absPct}% gap</strong> (${psfGap}/SF) above where this market last transacted. Gaps of this size typically resolve through price reductions, not appreciation. <strong>$/SF is the single largest driver of composite score — no other variable compensates for an overpriced ask.</strong>`
        : psfGap < -5
        ? `Active median $/SF is <strong>$${medActivePsf}</strong> vs. closed median of <strong>$${medClosedPsf}</strong> — active listings are priced <strong>${absPct}% below</strong> recent closed comps. Unusually favorable entry conditions. <strong>$/SF drives more composite score variance than any other dimension — pricing at this level provides a meaningful value buffer.</strong>`
        : `Active median $/SF (<strong>$${medActivePsf}</strong>) is closely aligned with closed comps (<strong>$${medClosedPsf}</strong>). Sellers are pricing in line with evidence. <strong>$/SF is the dominant scoring variable — evaluate each listing on its own position within this range.</strong>`,
      type: psfGap > 20 ? 'r' : psfGap < -10 ? 'g' : '',
    })
  }

  // 4. Above ceiling
  if (overCeil.length > 0) {
    findings.push({
      num: label('High Confidence'),
      title: `${overCeil.length} Active Listing${overCeil.length > 1 ? 's' : ''} Above $${ceilPsf}/SF — Market Has Spoken`,
      body: `${overCeil.map(c => `<strong>${c.address}</strong> ($${c.psf}/SF)`).join(', ')} ${overCeil.length === 1 ? 'is' : 'are'} sitting unsold${highDom.length ? ` with ${highDom.map(c => c.days_on_market + '+ DOM').join(', ')}` : ''}. These require meaningful reductions before representing fair value.`,
      type: 'r',
    })
  }

  // 5. High DOM
  if (highDom.length > 0) {
    findings.push({
      num: label('High Confidence'),
      title: `${highDom.length} Active Listing${highDom.length > 1 ? 's' : ''} with 45+ DOM — Seller Leverage Is Gone`,
      body: `${highDom.map(c => `<strong>${c.address}</strong> (${c.days_on_market}d)`).join(', ')}. Extended DOM signals motivated sellers. These listings represent the strongest negotiating opportunities in your pool.`,
      type: 'g',
    })
  }

  // 6. Over-ask signal
  if (overAsk.length > 0) {
    findings.push({
      num: label('Moderate Confidence'),
      title: `${overAsk.length} Comp${overAsk.length > 1 ? 's' : ''} Closed Over Ask — Bidding War Signal`,
      body: `${overAsk.map(c => `<strong>${c.address}</strong>`).join(', ')} sold above asking price. Accurately-priced, move-in ready product in your market generates competition. <strong>Fair initial pricing outperforms strategic over-asking in this dataset.</strong>`,
      type: 'b',
    })
  }

  // 7. Monthly cost range + tax spread
  if (minMonthly && maxMonthly && maxMonthly > minMonthly) {
    const spread = maxMonthly - minMonthly
    const taxNote = taxSpreadMo && taxSpreadMo > 200
      ? ` Most of that spread is taxes — a <strong>$${taxSpreadMo.toLocaleString()}/mo</strong> difference that is permanent, not negotiable.`
      : ''
    findings.push({
      num: label('High Confidence'),
      title: `Monthly Cost Spans $${minMonthly.toLocaleString()}–$${maxMonthly.toLocaleString()} Across This Pool`,
      body: `Estimated carrying cost (P&I at ${prefs.rate}%, ${prefs.downPct}% down + taxes + insurance) ranges <strong>$${spread.toLocaleString()}/mo</strong> across your comps — a difference that compounds to <strong>$${Math.round(spread * 12 / 1000)}K/yr</strong>.${taxNote} <strong>Evaluate each listing on monthly cost, not just purchase price.</strong>`,
      type: spread > 1500 ? 'r' : '',
    })
  }

  // 8. Negotiating room aggregate
  if (totalNegRoom > 0 && activeWithOffer.length > 0) {
    findings.push({
      num: label('Moderate Confidence'),
      title: `~$${Math.round(totalNegRoom / 1000)}K in Combined Negotiating Room Across ${activeWithOffer.length} Active Listing${activeWithOffer.length > 1 ? 's' : ''}`,
      body: `Based on DOM, price cut history, and $/SF position, the estimated gap between current asks and reasonable offer midpoints totals <strong>~$${Math.round(totalNegRoom / 1000)}K</strong> — an average of <strong>~$${Math.round(avgNegRoom / 1000)}K per listing</strong>. Sellers in aggregate have more room to move than individual negotiations suggest.`,
      type: 'g',
    })
  }

  if (!findings.length) {
    findings.push({
      num: 'Finding 01',
      title: 'Add More Comps to Generate Insights',
      body: 'Findings are derived from patterns in your comp pool. Add at least 5–10 comps (including some closed sales) to generate meaningful pricing insights.',
      type: 'a',
    })
  }

  return (
    <div>
      <div className="sl">Executive summary</div>
      <h2 className={styles.title}>Key Findings — {comps.length}-Comp Dataset</h2>
      <p className={styles.sub}>Data-derived conclusions from your comp pool. Confidence levels reflect data coverage.</p>
      {findings.map((f, i) => <Finding key={i} {...f} />)}
    </div>
  )
}
