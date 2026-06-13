import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  buildPricingContext, buildPoolContext, scoreComp,
  buildFairValue, buildPrediction, predictOutcome, offerRange,
} from '../lib/scoring'
import { usePoolComps, isActive } from '../hooks/usePoolComps'
import Header from '../components/Header'
import CompDetailModal from '../components/CompDetailModal'
import CandidateColumn from '../components/compare/CandidateColumn'
import DimensionMatrix from '../components/compare/DimensionMatrix'
import { DIMENSIONS, velocityLabel, fmtPrice } from '../components/compare/compareUtils'
import styles from './CompareView.module.css'

export default function CompareView({ pool, onEditProperty }) {
  const { comps, setComps, loading } = usePoolComps(pool.id)
  const [selected, setSelected] = useState(null)
  const [decided,  setDecided]  = useState(null)   // session-only "top choice" pin

  const pricing = useMemo(() => buildPricingContext(comps), [comps])
  const poolCtx = useMemo(() => buildPoolContext(comps), [comps])
  const velLabel = useMemo(() => velocityLabel(comps), [comps])
  const medPsf  = useMemo(() => {
    const psfs = comps.map(c => c.psf).filter(Boolean).sort((a, b) => a - b)
    return psfs.length ? psfs[Math.floor(psfs.length / 2)] : null
  }, [comps])

  // Build the decision dataset: every ACTIVE listing, priced against the
  // closed-comp context the engine already derives.
  const candidates = useMemo(() => {
    return comps.filter(isActive).map(c => {
      const s    = scoreComp(c, poolCtx)
      const fv   = buildFairValue(c, comps)
      const pred = buildPrediction(c, comps)
      const out  = predictOutcome(c, comps, velLabel, medPsf)
      const off  = offerRange(c)
      const ask  = c.last_list_price ?? c.original_list_price ?? null
      const gap  = fv && ask ? ask - fv.fairValue : null
      const gapPct = fv && ask ? ((ask - fv.fairValue) / fv.fairValue) * 100 : null
      return { comp: c, score: s.comp, sub: s, fv, pred, out, off, ask, gap, gapPct }
    }).sort((a, b) => b.score - a.score)
  }, [comps, poolCtx, velLabel, medPsf])

  // Best-in-class value per dimension (for matrix highlighting)
  const bestByDim = useMemo(() => {
    const best = {}
    DIMENSIONS.forEach(d => {
      let topId = null, topVal = -Infinity
      candidates.forEach(c => {
        const v = c.sub[d.key]
        if (v != null && v > topVal) { topVal = v; topId = c.comp.id }
      })
      best[d.key] = topId
    })
    return best
  }, [candidates])

  const recommendedId = candidates[0]?.comp.id ?? null

  async function removeFromPool(propertyId) {
    if (!confirm('Remove this property from the pool? It stays in your property library.')) return
    await supabase.from('pool_properties').delete().match({ pool_id: pool.id, property_id: propertyId })
    await supabase.from('comp_pools').update({ updated_at: new Date().toISOString() }).eq('id', pool.id)
    setComps(c => c.filter(x => x.id !== propertyId))
  }

  const headerStats = pricing ? [
    { value: `$<em>${pricing.fair}</em>`,  label: 'Fair $/SF (μ)' },
    { value: `$<em>${pricing.floor}</em>`, label: 'Floor (μ−σ)'   },
    { value: `$<em>${pricing.ceil}</em>`,  label: 'Ceiling (μ+2σ)' },
    { value: `<em>${pricing.n}</em>`,      label: 'Closed Comps'  },
  ] : []

  return (
    <div>
      <Header title="Compare &amp; Decide" eyebrow={pool.name} stats={headerStats} />

      <div className={styles.panel}>
        <div className="sl">Decision surface · active candidates vs closed-comp context</div>

        {!pricing && (
          <div className="ic a" style={{ marginBottom: 20 }}>
            <div className="ih">Limited context</div>
            <div className="ib">
              This pool has no closed (sold) comps yet, so fair-value and prediction figures fall back to
              defaults. Add closed sales to sharpen the pricing context.
            </div>
          </div>
        )}

        {loading ? (
          <div className={styles.state}>Loading…</div>
        ) : candidates.length === 0 ? (
          <div className={styles.state}>
            <p className={styles.stateTitle}>No active listings to compare</p>
            <p className={styles.stateSub}>
              Compare &amp; Decide works on <strong>active</strong> candidates priced against your closed comps.
              Add active listings to this pool to start deciding.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.cardsGrid}>
              {candidates.map((cand, i) => (
                <CandidateColumn
                  key={cand.comp.id}
                  data={cand}
                  rank={i + 1}
                  recommended={cand.comp.id === recommendedId}
                  decided={cand.comp.id === decided}
                  onDecide={() => setDecided(d => d === cand.comp.id ? null : cand.comp.id)}
                  onDetails={() => setSelected(cand.comp)}
                />
              ))}
            </div>

            <DimensionMatrix candidates={candidates} bestByDim={bestByDim} />

            <p className={styles.note}>
              Showing {candidates.length} active candidate{candidates.length !== 1 ? 's' : ''} of {comps.length} pool
              propert{comps.length !== 1 ? 'ies' : 'y'}. Closed &amp; under-contract homes are excluded here — they
              build the pricing context. {pricing && `Fair value ${fmtPrice(pricing.fair)}·SF · ${pricing.n} closed comps.`}
            </p>
          </>
        )}
      </div>

      {selected && (
        <CompDetailModal
          comp={selected}
          comps={comps}
          onClose={() => setSelected(null)}
          onEdit={prop => { setSelected(null); onEditProperty(prop) }}
          onDelete={id => { setSelected(null); removeFromPool(id) }}
        />
      )}
    </div>
  )
}
