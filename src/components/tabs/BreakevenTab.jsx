import { useMemo } from 'react'
import { buildPricingContext, CEIL_PSF } from '../../lib/scoring'
import { useSortable } from '../../hooks/useSortable.jsx'
import styles from './BreakevenTab.module.css'

export default function BreakevenTab({ comps }) {
  const ctx = useMemo(() => buildPricingContext(comps), [comps])

  const fpsf   = ctx?.fair  ?? null
  const ceilPsf = ctx?.ceil ?? CEIL_PSF

  const enriched = useMemo(() => comps.map(c => {
    const actual    = (c.is_closed ? c.sold_price : null) ?? c.last_list_price ?? c.original_list_price
    const fairPrice = fpsf && c.sqft ? Math.round(fpsf * c.sqft / 1000) : null
    const gap       = fairPrice && actual ? Math.round(actual / 1000 - fairPrice) : null
    const maxOffer  = actual && c.sqft
      ? Math.round(Math.min(actual * 0.97, ceilPsf * c.sqft) / 1000)
      : null
    return { ...c, _actual: actual, _fairPrice: fairPrice, _gap: gap, _maxOffer: maxOffer }
  }), [comps, fpsf, ceilPsf])

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
          Add closed comps (without over-ask) to activate fair value calculations.
        </p>
      )}

      {ctx && (
        <p className={styles.sub}>
          Fair value = μ of closed $/SF · Ceiling = μ + 1σ · Max Offer = min(97% of ask, ceiling × sqft).
          {ctx.n < 4 && ' Add more closed comps to improve confidence.'}
        </p>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <Th colKey="address"             label="Property"  left />
              <Th colKey="_actual"             label="Ask / Sold"     />
              <Th colKey="original_list_price" label="Orig List"      />
              <Th colKey="psf"                 label="$/SF"           />
              <Th colKey="lot_psf"             label="Lot $/SF"       />
              <th className={styles.thStatic}>Fair $/SF</th>
              <th className={styles.thStatic}>Fair Val.</th>
              <Th colKey="_gap"                label="Gap"            />
              <Th colKey="_maxOffer"           label="Max Offer"      />
              <Th colKey="days_on_market"      label="Signal"         />
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
              const signal    = c.is_closed
                ? (c.over_ask ? '▲ over' : '✓ closed')
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
                  </td>
                  <td>${actual ? Math.round(actual / 1000) : '—'}K</td>
                  <td style={{ color: cutTag !== '—' ? 'var(--accent)' : undefined }}>{cutTag}</td>
                  <td style={{ color: aboveCeil ? 'var(--red)' : undefined }}>{c.psf ? `$${c.psf}` : '—'}</td>
                  <td>{c.lot_psf ? `$${c.lot_psf}` : '—'}</td>
                  <td>{fpsf ? `$${fpsf}` : '—'}</td>
                  <td>{fairPrice ? `$${fairPrice}K` : '—'}</td>
                  <td style={{ color: gap === null ? undefined : gap > 80 ? 'var(--red)' : gap < -30 ? 'var(--accent)' : 'var(--dim)' }}>
                    {gap !== null ? `${gap >= 0 ? '+' : ''}${gap}K` : '—'}
                  </td>
                  <td className={styles.maxOffer}>{maxOffer ? `$${maxOffer}K` : '—'}</td>
                  <td className={styles.signal}>
                    <span className={c.is_closed ? (c.over_ask ? styles.sigOver : styles.sigClosed) : dom > 45 ? styles.sigHot : styles.sigActive}>
                      {signal}
                    </span>
                    {domAtCut !== null && (
                      <span className={styles.domCut}>cut @{domAtCut}d</span>
                    )}
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
