import { useMemo } from 'react'
import { scoreComp, buildPoolContext, CEIL_PSF } from '../lib/scoring'
import styles from './CompDetailModal.module.css'

const DIMS = [
  { key: 'ps', label: '$/SF',   weight: 32, valKey: 'psf',        lower: true,  fmt: v => v ? `$${v}/SF`                          : '—' },
  { key: 'ts', label: 'Taxes',  weight: 20, valKey: 'taxes',       lower: true,  fmt: v => v ? `$${Math.round(v / 1000)}K/yr`       : '—' },
  { key: 'ss', label: 'Size',   weight: 13, valKey: 'sqft',        lower: false, fmt: v => v ? `${v.toLocaleString()} SF`           : '—' },
  { key: 'ls', label: 'Lot',    weight: 13, valKey: 'lot_sqft',    lower: false, fmt: v => v ? `${Math.round(v / 1000)}K SF`        : '—' },
  { key: 'as', label: 'Age',    weight: 12, valKey: 'year_built',  lower: false, fmt: v => v ? `Built ${v}`                        : '—' },
  { key: 'ms', label: 'Signal', weight: 10, valKey: null,          lower: false, fmt: (_, c) => {
    if (!c) return '—'
    const dom = c.days_on_market ?? 0
    return c.over_ask ? '▲ over ask' : c.is_closed ? '✓ closed' : dom > 0 ? `${dom}d on market` : 'active'
  }},
]

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

function dimText(key, score, comp, allComps) {
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
    if (comp.over_ask)    return 'Sold over asking price — validated strong demand at this price point.'
    if (comp.is_closed)   return 'Closed at or below ask — normal market transaction.'
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
  return ''
}

function generateFindings(comp, allComps, s, price) {
  const findings = []
  const psfs   = allComps.map(c => c.psf).filter(Boolean)
  const taxes  = allComps.map(c => c.taxes).filter(Boolean)
  const ctx     = buildPoolContext(allComps)
  const scores  = allComps.map(c => scoreComp({ ...c, psf: c.psf ?? 999 }, ctx).comp)
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
  if (comp.psf && comp.psf > CEIL_PSF) {
    findings.push({ type: 'neg', text: `At $${comp.psf}/SF, this listing exceeds the pool ceiling of $${CEIL_PSF}/SF. No closed comp supports this price per square foot.` })
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
  if (!comp.is_closed && dom > 60) {
    findings.push({ type: 'pos', text: `${dom} days on market without an accepted offer. Extended DOM eliminates competing buyer pressure — aggressive negotiation is warranted.` })
  } else if (!comp.is_closed && dom > 30) {
    findings.push({ type: 'neu', text: `${dom} days on market. Moderately stale — seller likely open to offers below ask.` })
  }

  // Over ask
  if (comp.is_closed && comp.over_ask) {
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
  if (comp.is_closed && comp.sold_price && comp.last_list_price) {
    const ratio = (comp.sold_price / comp.last_list_price * 100).toFixed(1)
    if (!comp.over_ask) {
      findings.push({ type: 'neu', text: `Closed at ${ratio}% of final list price ($${Math.round(comp.sold_price / 1000)}K of $${Math.round(comp.last_list_price / 1000)}K ask) — confirms real-world negotiating room.` })
    }
  }

  if (!findings.length) {
    findings.push({ type: 'neu', text: 'Add more comp data (taxes, DOM, price history) to generate specific insights for this property.' })
  }

  return findings
}

export default function CompDetailModal({ comp, comps, onClose }) {
  const ctx = useMemo(() => buildPoolContext(comps), [comps])
  const s   = useMemo(() => scoreComp({
    ...comp,
    psf: comp.psf ?? (comp.last_list_price && comp.sqft ? Math.round(comp.last_list_price / comp.sqft) : null) ?? 999,
  }, ctx), [comp, ctx])

  const price = (comp.is_closed ? comp.sold_price : null) ?? comp.last_list_price ?? comp.original_list_price
  const findings = useMemo(() => generateFindings(comp, comps, s, price), [comp, comps, s])

  const scoreColor = s.comp >= 70 ? '#2A5C42' : s.comp >= 50 ? '#7A9E8A' : s.comp >= 35 ? '#B8A87A' : '#8B3A2A'
  const scoreLabel = s.comp >= 70 ? 'Strong Value' : s.comp >= 50 ? 'Above Average' : s.comp >= 35 ? 'Average' : 'Weak Value'

  const dom = comp.days_on_market ?? 0
  const status = comp.is_closed ? (comp.over_ask ? 'Closed Over Ask' : 'Closed') : dom > 0 ? `Active · ${dom}d` : 'Active'
  const statusCls = comp.is_closed ? (comp.over_ask ? styles.badgeOver : styles.badgeClosed) : dom > 45 ? styles.badgeStale : styles.badgeActive

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
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
          <div className={styles.hdrMeta}>
            <span className={`${styles.badge} ${statusCls}`}>{status}</span>
            {price && <span className={styles.price}>${Math.round(price / 1000)}K</span>}
            {comp.psf && <span className={styles.psf}>${comp.psf}/SF</span>}
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
              {DIMS.map(d => {
                const rawScore = s[d.key]  // 1–3
                const barPct   = ((rawScore - 1) / 2) * 100
                const val      = d.valKey ? comp[d.valKey] : null
                const text     = dimText(d.key, rawScore, comp, comps)
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
                {DIMS.filter(d => d.valKey).map(d => {
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
        </div>
      </div>
    </div>
  )
}
