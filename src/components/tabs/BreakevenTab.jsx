import { scoreComp, CEIL_PSF } from '../../lib/scoring'
import styles from './BreakevenTab.module.css'

function fairPsf(comps) {
  const closed = comps.filter(c => c.is_closed && c.psf && !c.over_ask)
  if (!closed.length) return null
  const sorted = [...closed].sort((a, b) => a.psf - b.psf)
  const n = sorted.length
  const bottom = sorted.slice(0, Math.max(1, Math.ceil(n * 0.4)))
  return Math.round(bottom.reduce((s, c) => s + c.psf, 0) / bottom.length)
}

export default function BreakevenTab({ comps }) {
  const fpsf = fairPsf(comps)
  const sorted = [...comps].sort((a, b) => (a.psf ?? 999) - (b.psf ?? 999))

  return (
    <div>
      <div className="sl">Fair value analysis</div>
      <h2 className={styles.title}>Breakeven &amp; Maximum Offer</h2>
      <p className={styles.sub}>
        Fair $/SF anchored to the bottom 40% of closed sales in your pool. Ceiling: ${CEIL_PSF}/SF or your highest closed price.
        {!fpsf && ' Add closed comps to activate fair value calculations.'}
      </p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Property</th>
              <th>Ask / Sold</th>
              <th>Orig List</th>
              <th>$/SF</th>
              <th>Lot $/SF</th>
              <th>Fair $/SF</th>
              <th>Fair Val.</th>
              <th>Gap</th>
              <th>Max Offer</th>
              <th>Signal</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => {
              const actual = (c.is_closed ? c.sold_price : null) ?? c.last_list_price ?? c.original_list_price
              const fairPrice = fpsf && c.sqft ? Math.round(fpsf * c.sqft / 1000) : null
              const gap = fairPrice && actual ? Math.round(actual / 1000 - fairPrice) : null
              const ceilPrice = c.sqft ? Math.round(Math.min(actual ?? Infinity, CEIL_PSF * c.sqft) / 1000) : null
              const maxOffer = actual && c.sqft
                ? Math.round(Math.min(actual * 0.97, CEIL_PSF * c.sqft) / 1000)
                : null
              const dom = c.days_on_market ?? 0
              const signal = c.is_closed
                ? (c.over_ask ? '▲ over' : '✓ closed')
                : dom > 45 ? `●${dom}d` : dom > 0 ? `○${dom}d` : 'new'
              const cutTag = c.original_list_price && c.last_list_price && c.original_list_price > c.last_list_price
                ? `↓$${Math.round((c.original_list_price - c.last_list_price) / 1000)}K`
                : '—'

              return (
                <tr key={c.id}>
                  <td className={styles.addrCell}>
                    <span>{c.address}</span>
                    {c.town && <span className={styles.town}>{c.town}</span>}
                  </td>
                  <td>${actual ? Math.round(actual / 1000) : '—'}K</td>
                  <td className={cutTag !== '—' ? 'neg' : ''}>{cutTag}</td>
                  <td>{c.psf ? `$${c.psf}` : '—'}</td>
                  <td>{c.lot_psf ? `$${c.lot_psf}` : '—'}</td>
                  <td>{fpsf ? `$${fpsf}` : '—'}</td>
                  <td>{fairPrice ? `$${fairPrice}K` : '—'}</td>
                  <td className={gap === null ? '' : gap > 80 ? 'neg' : gap < -30 ? 'pos' : 'neu'}>
                    {gap !== null ? `${gap >= 0 ? '+' : ''}${gap}K` : '—'}
                  </td>
                  <td className={styles.maxOffer}>{maxOffer ? `$${maxOffer}K` : '—'}</td>
                  <td className={styles.signal}>
                    <span className={c.is_closed ? (c.over_ask ? styles.sigOver : styles.sigClosed) : dom > 45 ? styles.sigHot : styles.sigActive}>
                      {signal}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className={styles.note}>
        Max Offer = min(97% of ask, ${CEIL_PSF} × sqft). Fair $/SF derived from bottom 40% of non-bidding-war closed sales.
        Add more closed comps to improve accuracy.
      </p>
    </div>
  )
}
