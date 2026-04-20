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

  const closed  = comps.filter(c => !!c.sold_date)
  const active  = comps.filter(c => !c.sold_date)
  const cuts    = comps.filter(c => c.original_list_price && c.last_list_price && c.original_list_price > c.last_list_price)
  const overCeil = active.filter(c => c.psf && c.psf > ceilPsf)
  const highDom  = active.filter(c => (c.days_on_market ?? 0) > 45)
  const overAsk  = closed.filter(c => c.sold_price > c.original_list_price)

  const closedFloor = [...closed.filter(c => c.psf && !(c.sold_price > c.original_list_price))].sort((a, b) => a.psf - b.psf).slice(0, 2)

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
  const medClosedPsf = median(closed.filter(c => c.psf && !(c.sold_price > c.original_list_price)).map(c => c.psf))

  // Land plays: below-median $/SF driven by lot size, not cheap structure
  const medPoolPsf  = median(comps.filter(c => c.psf).map(c => c.psf))
  const poolIntPcts = comps.filter(c => c.sqft && c.lot_sqft).map(c => c.sqft / c.lot_sqft)
  const medIntPct   = poolIntPcts.length ? [...poolIntPcts].sort((a, b) => a - b)[Math.floor(poolIntPcts.length / 2)] : null
  const landPlays   = active.filter(c => {
    if (!c.psf || !c.sqft || !c.lot_sqft || !medPoolPsf || !medIntPct) return false
    return c.psf < medPoolPsf * 0.97 && (c.sqft / c.lot_sqft) <= medIntPct
  })
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
    const cutRate = cuts.length / comps.length
    const avgCutK = avgCut ? Math.round(avgCut / 1000) : 0
    const title = cutRate >= 0.7
      ? `${cuts.length} of ${comps.length} Sellers Listed Too High — Original Prices Are Not Anchor Points`
      : cutRate >= 0.4
      ? avgCutK >= 50
        ? `Price Cutting Is the Pattern Here — ${cuts.length} of ${comps.length} Cut, Averaging −$${avgCutK}K`
        : `Price Cuts Are the Norm, Not the Exception — ${cuts.length} of ${comps.length} Comps Reduced`
      : `Selective Overpricing — ${cuts.length} of ${comps.length} Comps Were Listed Above Market`
    findings.push({
      num: label('High Confidence'),
      title,
      body: `Averaging <strong>−$${avgCutK}K</strong> per cut${avgDomAtCut !== null ? `; sellers in this pool reduced at an average of <strong>${avgDomAtCut} DOM</strong>` : ''}. <strong>Final list price is the negotiating baseline — listing history is non-negotiable due diligence.</strong>`,
    })
  }

  // 2. Closed price floor
  if (closedFloor.length >= 2) {
    const f1 = closedFloor[0], f2 = closedFloor[1]
    const band = f2.psf - f1.psf
    const title = band <= 10
      ? `Two Closings in Tight Agreement — Hard Floor Confirmed at $${f1.psf}–$${f2.psf}/SF`
      : band <= 30
      ? `Closed Floor at $${f1.psf}–$${f2.psf}/SF — Profile Differences Explain the $${band}/SF Spread`
      : `Wide Closed Range: $${f1.psf}–$${f2.psf}/SF — Condition Is Driving a $${band}/SF Variance`
    findings.push({
      num: label('High Confidence'),
      title,
      body: `<strong>${f1.address}</strong> ($${f1.psf}/SF) and <strong>${f2.address}</strong> ($${f2.psf}/SF) establish a two-point closed floor. Any active listing above <strong>$${Math.round(f2.psf * 1.2)}/SF</strong> with a weaker profile has no comp support.`,
      type: 'g',
    })
  }

  // 3. Active-to-closed $/SF gap
  if (psfGap !== null && medClosedPsf && medActivePsf) {
    const absPct = psfGapPct
    const conf   = Math.abs(psfGap) > 30 ? 'High Confidence' : 'Moderate Confidence'
    const title = psfGap >= 50
      ? `Sellers Are Living in a Different Market — Active Asks Run $${psfGap}/SF Above Last Closings`
      : psfGap >= 20
      ? `Sellers Are Asking $${psfGap}/SF More Than This Market Has Cleared`
      : psfGap > 5
      ? `Active Listings Asking $${psfGap}/SF Above Where Buyers Last Paid`
      : psfGap < -20
      ? `Active Listings Running $${Math.abs(psfGap)}/SF Below Recent Closings — An Unusual Entry Point`
      : psfGap < -5
      ? `Active $/SF Is $${Math.abs(psfGap)} Below Closed Comps — Buyers Have More Pricing Leverage Than Usual`
      : `Active $/SF Aligned With Recent Closings — Sellers Are Pricing in Line With Evidence`
    findings.push({
      num: label(conf),
      title,
      body: psfGap > 5
        ? `Active median $/SF is <strong>$${medActivePsf}</strong> vs. closed median of <strong>$${medClosedPsf}</strong> — a <strong>${absPct}% gap</strong> ($${psfGap}/SF) above where this market last transacted. Gaps of this size typically resolve through price reductions, not appreciation. <strong>$/SF is the single largest driver of composite score — no other variable compensates for an overpriced ask.</strong>`
        : psfGap < -5
        ? `Active median $/SF is <strong>$${medActivePsf}</strong> vs. closed median of <strong>$${medClosedPsf}</strong> — active listings are priced <strong>${absPct}% below</strong> recent closed comps. Unusually favorable entry conditions. <strong>$/SF drives more composite score variance than any other dimension — pricing at this level provides a meaningful value buffer.</strong>`
        : `Active median $/SF (<strong>$${medActivePsf}</strong>) is closely aligned with closed comps (<strong>$${medClosedPsf}</strong>). Sellers are pricing in line with evidence. <strong>$/SF is the dominant scoring variable — evaluate each listing on its own position within this range.</strong>`,
      type: psfGap > 20 ? 'r' : psfGap < -10 ? 'g' : '',
    })
  }

  // 3b. Land plays
  if (landPlays.length > 0 && medIntPct) {
    const s = landPlays.length === 1
    const title = s
      ? `${landPlays[0].address} Looks Cheap on $/SF — Its Lot Is the Value, Not the House`
      : `${landPlays.length} Listings Read as Value on $/SF Because of Outsized Lots, Not Low Pricing`
    findings.push({
      num: label('Moderate Confidence'),
      title,
      body: `${landPlays.map(c => `<strong>${c.address}</strong> ($${c.psf}/SF, ${(c.sqft / c.lot_sqft * 100).toFixed(1)}% interior coverage)`).join('; ')} ${s ? 'sits' : 'sit'} below the pool median of <strong>$${medPoolPsf}/SF</strong> but ${s ? 'also has' : 'also have'} below-median interior coverage — a large share of the purchase price is land, not structure. $/SF understates the true cost of the house in isolation. <strong>Evaluate these as lot plays: compare on land value and teardown/renovation potential, not $/SF alone.</strong>`,
      type: 'b',
    })
  }

  // 4. Above ceiling
  if (overCeil.length > 0) {
    const ceilPct = Math.round(overCeil.length / Math.max(1, active.length) * 100)
    const title = ceilPct >= 66
      ? `${overCeil.length} of ${active.length} Active Listings Are Priced Beyond Market Evidence — Most of This Pool Has No Comp Support`
      : overCeil.length === 1
      ? `One Listing Is Priced Above Where This Market Clears — $${overCeil[0].psf}/SF With No Comparable Closings`
      : `${overCeil.length} Listings Above $${ceilPsf}/SF — Sellers Pricing for a Ceiling the Market Hasn't Set`
    findings.push({
      num: label('High Confidence'),
      title,
      body: `${overCeil.map(c => `<strong>${c.address}</strong> ($${c.psf}/SF)`).join(', ')} ${overCeil.length === 1 ? 'is' : 'are'} sitting unsold${highDom.length ? ` with ${highDom.map(c => c.days_on_market + '+ DOM').join(', ')}` : ''}. These require meaningful reductions before representing fair value.`,
      type: 'r',
    })
  }

  // 5. High DOM
  if (highDom.length > 0) {
    const maxDom = Math.max(...highDom.map(c => c.days_on_market ?? 0))
    const title = maxDom >= 120
      ? `Up to ${maxDom} DOM — ${highDom.length > 1 ? 'These Sellers Are' : 'This Seller Is'} Running Out of Options`
      : maxDom >= 90
      ? `${highDom.length} Listing${highDom.length > 1 ? 's' : ''} Past 90 Days — Seller Urgency Is Real`
      : maxDom >= 60
      ? `${highDom.length} Listing${highDom.length > 1 ? 's' : ''} Past 60 DOM — Negotiating Position Has Shifted to Buyers`
      : `${highDom.length} Listing${highDom.length > 1 ? 's' : ''} Past 45 DOM — Early Signs of Seller Fatigue`
    findings.push({
      num: label('High Confidence'),
      title,
      body: `${highDom.map(c => `<strong>${c.address}</strong> (${c.days_on_market}d)`).join(', ')}. Extended DOM signals motivated sellers. These listings represent the strongest negotiating opportunities in your pool.`,
      type: 'g',
    })
  }

  // 6. Over-ask signal
  if (overAsk.length > 0) {
    const overAskRate = overAsk.length / Math.max(1, closed.length)
    const title = overAskRate >= 0.5
      ? `${overAsk.length} of ${closed.length} Closings Went Over Ask — Accurate Pricing Creates Bidding Competition Here`
      : overAsk.length === 1
      ? `One Closing Went Over Ask — Well-Priced Product Still Commands Attention`
      : `${overAsk.length} of ${closed.length} Closings Over Ask — Competition Exists but Remains Selective`
    findings.push({
      num: label('Moderate Confidence'),
      title,
      body: `${overAsk.map(c => `<strong>${c.address}</strong>`).join(', ')} sold above asking price. Accurately-priced, move-in ready product in your market generates competition. <strong>Fair initial pricing outperforms strategic over-asking in this dataset.</strong>`,
      type: 'b',
    })
  }

  // 7. Monthly cost range + tax spread
  if (minMonthly && maxMonthly && maxMonthly > minMonthly) {
    const spread  = maxMonthly - minMonthly
    const annualK = Math.round(spread * 12 / 1000)
    const taxNote = taxSpreadMo && taxSpreadMo > 200
      ? ` Most of that spread is taxes — a <strong>$${taxSpreadMo.toLocaleString()}/mo</strong> difference that is permanent, not negotiable.`
      : ''
    const title = spread >= 3000
      ? `The Cheapest and Most Expensive Listing Here Differ by $${annualK}K/yr in Carrying Cost`
      : spread >= 1500
      ? `$${spread.toLocaleString()}/mo Swing in Obligations — These Are Not Comparable Decisions`
      : `Monthly Cost Varies $${spread.toLocaleString()}/mo Across This Pool — Price Tag Doesn't Tell the Full Story`
    findings.push({
      num: label('High Confidence'),
      title,
      body: `Estimated carrying cost (P&I at ${prefs.rate}%, ${prefs.downPct}% down + taxes + insurance) ranges <strong>$${minMonthly.toLocaleString()}–$${maxMonthly.toLocaleString()}/mo</strong> — a gap that compounds to <strong>$${annualK}K/yr</strong>.${taxNote} <strong>Evaluate each listing on monthly cost, not just purchase price.</strong>`,
      type: spread > 1500 ? 'r' : '',
    })
  }

  // 8. Negotiating room aggregate
  if (totalNegRoom > 0 && activeWithOffer.length > 0) {
    const totalK = Math.round(totalNegRoom / 1000)
    const avgK   = Math.round(avgNegRoom / 1000)
    const title = avgK >= 75
      ? `Sellers Are Materially Overpriced — ~$${avgK}K Per Listing of Estimated Negotiating Room`
      : avgK >= 40
      ? `Real Negotiating Room Exists — ~$${avgK}K Average Gap Per Active Listing`
      : `Limited Slack in Current Asks — ~$${avgK}K Per Listing Based on DOM and $/SF Position`
    findings.push({
      num: label('Moderate Confidence'),
      title,
      body: `Based on DOM, price cut history, and $/SF position, the estimated gap between current asks and reasonable offer midpoints totals <strong>~$${totalK}K</strong> across ${activeWithOffer.length} active listing${activeWithOffer.length > 1 ? 's' : ''} — an average of <strong>~$${avgK}K per listing</strong>. Sellers in aggregate have more room to move than individual negotiations suggest.`,
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
