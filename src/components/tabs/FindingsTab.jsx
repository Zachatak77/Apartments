import { scoreComp, poolStats, CEIL_PSF, buildPricingContext } from '../../lib/scoring'
import styles from './FindingsTab.module.css'

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
  const closed  = comps.filter(c => c.is_closed)
  const active  = comps.filter(c => !c.is_closed)
  const cuts    = comps.filter(c => c.original_list_price && c.last_list_price && c.original_list_price > c.last_list_price)
  const overCeil = active.filter(c => c.psf && c.psf > ceilPsf)
  const highDom  = active.filter(c => (c.days_on_market ?? 0) > 45)
  const overAsk  = closed.filter(c => c.over_ask)

  const psfs = comps.map(c => c.psf).filter(Boolean)
  const minPsf = psfs.length ? Math.min(...psfs) : null
  const maxPsf = psfs.length ? Math.max(...psfs) : null

  const closedFloor = [...closed.filter(c => c.psf && !c.over_ask)].sort((a, b) => a.psf - b.psf).slice(0, 2)

  const avgCut = cuts.length
    ? Math.round(cuts.reduce((s, c) => s + (c.original_list_price - c.last_list_price), 0) / cuts.length)
    : 0

  const findings = []

  if (cuts.length > 0) {
    findings.push({
      num: `Finding 01 — High Confidence`,
      title: 'Original List Price Is Systematically Misleading',
      body: `${cuts.length} of ${comps.length} comps had price cuts before going under contract${avgCut ? `, averaging <strong>−$${Math.round(avgCut / 1000)}K</strong>` : ''}. <strong>Final list price is the negotiating baseline — listing history is non-negotiable due diligence.</strong>`,
      type: '',
    })
  }

  if (closedFloor.length >= 2) {
    const f1 = closedFloor[0], f2 = closedFloor[1]
    findings.push({
      num: 'Finding 02 — High Confidence',
      title: `Closed Price Floor: $${f1.psf}–$${f2.psf}/SF`,
      body: `<strong>${f1.address}</strong> ($${f1.psf}/SF) and <strong>${f2.address}</strong> ($${f2.psf}/SF) establish a two-point closed floor. Two independent data points in the same band is a robust statistical floor. Any active listing above <strong>$${Math.round(f2.psf * 1.2)}/SF</strong> with a weaker profile has no comp support.`,
      type: 'g',
    })
  }

  if (stats.medianPsf) {
    findings.push({
      num: 'Finding 03 — High Confidence',
      title: `$/SF Spread: $${minPsf ?? '—'}–$${maxPsf ?? '—'} — ${maxPsf && minPsf ? maxPsf - minPsf : '?'}pt Composite Swing`,
      body: `The ${maxPsf && minPsf ? maxPsf - minPsf : '—'}/SF spread across your pool produces the largest composite score swing of any single dimension. <strong>If $/SF is not in the buy zone, nothing else compensates.</strong> Pool median: <strong>$${stats.medianPsf}/SF</strong>.`,
      type: '',
    })
  }

  if (overCeil.length > 0) {
    findings.push({
      num: `Finding 04 — High Confidence`,
      title: `${overCeil.length} Active Listing${overCeil.length > 1 ? 's' : ''} Above $${ceilPsf}/SF — Market Has Spoken`,
      body: `${overCeil.map(c => `<strong>${c.address}</strong> ($${c.psf}/SF)`).join(', ')} ${overCeil.length === 1 ? 'is' : 'are'} sitting unsold${highDom.length ? ` with ${highDom.map(c => c.days_on_market + '+ DOM').join(', ')}` : ''}. These require meaningful reductions before representing fair value.`,
      type: 'r',
    })
  }

  if (highDom.length > 0) {
    findings.push({
      num: 'Finding 05 — High Confidence',
      title: `${highDom.length} Active Listing${highDom.length > 1 ? 's' : ''} with 45+ DOM — Seller Leverage Is Gone`,
      body: `${highDom.map(c => `<strong>${c.address}</strong> (${c.days_on_market}d)`).join(', ')}. Extended DOM signals motivated sellers. These listings represent the strongest negotiating opportunities in your pool.`,
      type: 'g',
    })
  }

  if (overAsk.length > 0) {
    findings.push({
      num: 'Finding 06 — Moderate Confidence',
      title: `${overAsk.length} Comp${overAsk.length > 1 ? 's' : ''} Closed Over Ask — Bidding War Signal`,
      body: `${overAsk.map(c => `<strong>${c.address}</strong>`).join(', ')} sold above asking price. Accurately-priced, move-in ready product in your market generates competition. <strong>Fair initial pricing outperforms strategic over-asking in this dataset.</strong>`,
      type: 'b',
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
