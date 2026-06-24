import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { poolStats } from '../lib/scoring'
import { usePoolComps, isActive } from '../hooks/usePoolComps'
import { POOL_TABS } from '../lib/tabs'
import Header from '../components/Header'
import TabBar from '../components/TabBar'
import ImportModal from '../components/ImportModal'
import PropertyPicker from '../components/PropertyPicker'
import CompsTab from '../components/tabs/CompsTab'
import OffersTab from '../components/tabs/OffersTab'
import ExploreTab from '../components/tabs/ExploreTab'
import FindingsTab from '../components/tabs/FindingsTab'
import CompDetailModal from '../components/CompDetailModal'
import styles from './PoolView.module.css'

export default function PoolView({ pool, user, activeTab, onTabChange, onAddProperty, onEditProperty, onOpenCompare }) {
  const { comps, setComps, loading, refetch } = usePoolComps(pool.id)
  const [showImport,   setShowImport]   = useState(false)
  const [showPicker,   setShowPicker]   = useState(false)
  const [selectedComp, setSelectedComp] = useState(null)

  async function removeFromPool(propertyId) {
    if (!confirm('Remove this property from the pool? It stays in your property library.')) return
    await supabase
      .from('pool_properties')
      .delete()
      .match({ pool_id: pool.id, property_id: propertyId })
    await supabase
      .from('comp_pools')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', pool.id)
    setComps(c => c.filter(x => x.id !== propertyId))
  }

  const stats = poolStats(comps)
  const activeCount = comps.filter(isActive).length

  const contracted = comps.filter(c => c.list_date && c.contract_date)
  const avgDtc = contracted.length
    ? Math.round(contracted.reduce((s, c) => s + Math.round((new Date(c.contract_date) - new Date(c.list_date)) / 86400000), 0) / contracted.length)
    : null

  const headerStats = comps.length > 0 ? [
    { value: stats.medianPsf ? `$<em>${stats.medianPsf}</em>` : '—', label: 'Median $/SF'  },
    { value: stats.psfRange  ? `$<em>${stats.psfRange}</em>`  : '—', label: '$/SF Range'   },
    { value: `<em>${stats.closedCount}</em>/${stats.totalCount}`,     label: 'Closed Sales' },
    { value: avgDtc != null ? `<em>${avgDtc}</em>d` : '—',           label: 'Avg Days to Contract' },
  ] : []

  const tabProps = {
    comps, pool,
    onEdit:   onEditProperty,
    onDelete: removeFromPool,
    onSelect: setSelectedComp,
  }

  return (
    <div>
      <Header
        title={pool.name}
        eyebrow={pool.location || pool.role}
        stats={headerStats}
      />

      <div className={styles.addBar}>
        <button className={styles.addBtn} onClick={() => setShowPicker(true)}>+ Add to Pool</button>
        <button className={styles.importBtn} onClick={() => setShowImport(true)}>↑ Import</button>
        <button
          className={styles.compareBtn}
          onClick={onOpenCompare}
          disabled={activeCount === 0}
          title={activeCount === 0 ? 'No active listings to compare' : 'Compare active candidates'}
        >
          ⚖ Compare &amp; Decide
          {activeCount > 0 && <span className={styles.compareCount}>{activeCount}</span>}
        </button>
        <span className={styles.compCount}>{comps.length} propert{comps.length !== 1 ? 'ies' : 'y'}</span>
      </div>

      {comps.length > 0 && (
        <TabBar tabs={POOL_TABS} active={activeTab} onChange={onTabChange} />
      )}

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : comps.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No properties in this pool</p>
          <p className={styles.emptySub}>Add from your property library or import from a spreadsheet.</p>
          <div className={styles.emptyActions}>
            <button className={styles.addBtn} onClick={() => setShowPicker(true)}>+ Add to Pool</button>
            <button className={styles.importBtn} onClick={() => setShowImport(true)}>↑ Import</button>
          </div>
        </div>
      ) : (
        <div className={styles.panel}>
          {activeTab === 'comps'    && <CompsTab    {...tabProps} />}
          {activeTab === 'offers'   && <OffersTab   {...tabProps} />}
          {activeTab === 'explore'  && <ExploreTab  {...tabProps} />}
          {activeTab === 'findings' && <FindingsTab {...tabProps} />}
        </div>
      )}

      {selectedComp && (
        <CompDetailModal
          comp={selectedComp}
          comps={comps}
          onClose={() => setSelectedComp(null)}
          onEdit={prop => { setSelectedComp(null); onEditProperty(prop) }}
          onDelete={id => { setSelectedComp(null); removeFromPool(id) }}
        />
      )}

      {showPicker && (
        <PropertyPicker
          pool={pool}
          user={user}
          onClose={() => setShowPicker(false)}
          onAdded={refetch}
          onCreateNew={() => { setShowPicker(false); onAddProperty() }}
        />
      )}

      {showImport && (
        <ImportModal
          pool={pool}
          user={user}
          onClose={() => setShowImport(false)}
          onImported={refetch}
        />
      )}
    </div>
  )
}
