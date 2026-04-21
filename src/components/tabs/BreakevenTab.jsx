import { useMemo } from 'react'
import { buildPricingContext, buildFairValue, CEIL_PSF } from '../../lib/scoring'
import { loadModelSettings } from '../../lib/modelSettings'
import { useSortable } from '../../hooks/useSortable.jsx'
import styles from './BreakevenTab.module.css'

export default function BreakevenTab({ comps }) {
  const ctx      = useMemo(() => buildPricingContext(comps), [comps])
  const ms       = useMemo(() => loadModelSettings(), [])
  const ceilPsf  = ctx?.ceil ?? CEIL_PSF

  const enriched = useMemo(() => comps.map(c => {
    const actual    = (c.sold_date ? c.sold_price : null) ?? c.last_list_price ?? c.original_list_price
    const fv        = buildFairValue(c, comps, ms)
    const fairPrice = fv ? Math.round(fv.fairValue / 1000) : null
    const gap       = fairPrice && actual ? Math.round(actual / 1000 - fairPrice) : null
    const maxOffer  = fv ? Math.round(fv.maxPrice / 1000) : null
    return { ...c, _actual: actual, _fairPrice: fairPrice, _gap: gap, _maxOffer: maxOffer, _fv: fv }
  }), [comps, ms])

  const { sorted, handleSort, SortIcon } = useSortable(enriched, 'psf', 'asc')

  const Th = ({ colKey, label, left }) => (
    <th
      className={`${styles.thSortable} ${left ? styles.thLeft : ''}`}
      onClick={() => handleSort(colKey)}
    >
      {label}<SortIcon colKey={colKey} />
    </th>
  )

  return (
    <div>
      <div className="sl">Fair value analysis</div>
      <h2 className={styles.title}>Breakeven &amp; Maximum Offer</h2>

      {ctx ? (
        <div className={styles.ctxBar}>
          <div className={styles.ctxStat}>
            <span className={styles.ctxLbl}>Fair $/SF</span>
            <span className={styles.ctxVal}>${ctx.fair}</span>
          </div>
          <div className={styles.ctxDivider} />
          <div className={styles.ctxStat}>
            <span className={styles.ctxLbl}>Std Dev (σ)</span>
            <span className={styles.ctxVal}>±${ctx.stdDev}</span>
          </div>
          <div className={styles.ctxDivider} />
          <div className={styles.ctxStat}>
            <span className={styles.ctxLbl}>Floor (μ−σ)</span>
            <span className={styles.ctxVal} style={{ color: 'var(--accent)' }}>${ctx.floor}</span>
          </div>
          <div className={styles.ctxDivider} />
          <div className={styles.ctxStat}>
            <span className={styles.ctxLbl}>Ceiling (μ+σ)</span>
            <span className={styles.ctxVal} style={{ color: 'var(--red)' }}>${ctx.ceil}</span>
          </div>
          <div className={styles.ctxDivider} />
          <div className={styles.ctxStat}>
            <span className={styles.ctxLbl}>From</span>
            <span className={styles.ctxVal}>{ctx.n} closed sale{ctx.n !== 1 ? 's' : ''}</span>
          </div>
        </div>
      ) : (
        <p className={styles.sub}>
          Add closed comps to activate fair value calculations. Fair value incorporates structure $/SF, lot value, and tax capitalization.
        </p>
      )}

      {ctx && (
        <p className={styles.sub}>
          Fair value = structure (μ $/SF × sqft) blended with land (lot_psf × lot sqft) weighted by interior coverage,
          adjusted for tax delta vs. pool median (×{ms.taxCapMultiple}){ms.ageAdjPerYear ? ` and age ($${ms.ageAdjPerYear.toLocaleString()}/yr)` : ''}.
          Max price = fair value less DOM leverage discount, bounded by floor/ceiling.
          {ctx.n < 4 && ' Add more closed comps to improve confidence.'}
        </p>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <Th colKey="address"        label="Property"   left />
              <Th colKey="_actual"        label="Ask / Sold"      />
              <Th colKey="psf"            label="$/SF"            />
              <Th colKey="_fairPrice"     label="Fair Val"        />
              <Th colKey="_gap"           label="Gap to Fair"     />
              <Th colKey="_maxOffer"      label="Max Offer"       />
              <Th colKey="days_on_market" label="Signal"          />
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => {
              const actual    = c._actual
              const fairPrice = c._fairPrice
              const gap       = c._gap
              const maxOffer  = c._maxOffer
              const dom       = c.days_on_market ?? 0
              const hasCut    = c.original_list_price && c.last_list_price && c.original_list_price > c.last_list_price
              const domAtCut  = hasCut && c.list_date && c.last_price_date
                ? Math.max(0, Math.round((new Date(c.last_price_date) - new Date(c.list_date)) / 86400000))
                : null
              const signal    = c.sold_date
                ? (c.sold_price > c.original_list_price ? '▲ over' : '✓ closed')
                : dom > 45 ? `●${dom}d` : dom > 0 ? `○${dom}d` : 'new'
              const cutTag = hasCut
                ? `↓$${Math.round((c.original_list_price - c.last_list_price) / 1000)}K`
                : '—'
              const aboveCeil = c.psf && c.psf > ceilPsf

              return (
                <tr key={c.id} className={aboveCeil ? styles.rowAboveCeil : ''}>
                  <td className={styles.addrCell}>
                    <span className={styles.addrLine}>{c.address}</span>
                    {c.town && <span className={styles.town}>{c.town}</span>}
                    {aboveCeil && <span className={styles.ceilTag}>above ceiling</span>}
                    {hasCut && <span className={styles.cutTag}>↓${Math.round((c.original_list_price - c.last_list_price) / 1000)}K cut</span>}
                  </td>
                  <td>${actual ? Math.round(actual / 1000) : '—'}K</td>
                  <td style={{ color: aboveCeil ? 'var(--red)' : undefined }}>{c.psf ? `$${c.psf}` : '—'}</td>
                  <td style={{ color: 'var(--accent)' }}>
                    {fairPrice ? `$${fairPrice}K` : '—'}
                    {c._fv && (c._fv.taxAdj || c._fv.ageAdj) ? (
                      <div style={{ fontSize: '0.58rem', color: 'var(--dim)', marginTop: 2, lineHeight: 1.3 }}>
                        ${Math.round(c._fv.baseValue / 1000)}K base
                        {c._fv.taxAdj ? ` ${c._fv.taxAdj > 0 ? '+' : ''}${Math.round(c._fv.taxAdj / 1000)}K tax` : ''}
                        {c._fv.ageAdj ? ` ${c._fv.ageAdj > 0 ? '+' : ''}${Math.round(c._fv.ageAdj / 1000)}K age` : ''}
                      </div>
                    ) : null}
                  </td>
                  <td style={{ color: gap === null ? undefined : gap > 80 ? 'var(--red)' : gap < -30 ? 'var(--accent)' : 'var(--dim)' }}>
                    {gap !== null ? `${gap >= 0 ? '+' : ''}${gap}K` : '—'}
                  </td>
                  <td className={styles.maxOffer}>{maxOffer ? `$${maxOffer}K` : '—'}</td>
                  <td className={styles.signal}>
                    <span className={c.sold_date ? (c.sold_price > c.original_list_price ? styles.sigOver : styles.sigClosed) : dom > 45 ? styles.sigHot : styles.sigActive}>
                      {signal}
                    </span>
                    {domAtCut !== null && <span className={styles.domCut}>cut @{domAtCut}d</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
