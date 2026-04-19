import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { poolStats } from '../lib/scoring'
import Header from '../components/Header'
import TabBar from '../components/TabBar'
import ImportModal from '../components/ImportModal'
import PropertyPicker from '../components/PropertyPicker'
import HeatmapTab from '../components/tabs/HeatmapTab'
import HistoryTab from '../components/tabs/HistoryTab'
import OffersTab from '../components/tabs/OffersTab'
import ScatterTab from '../components/tabs/ScatterTab'
import ScenarioTab from '../components/tabs/ScenarioTab'
import FindingsTab from '../components/tabs/FindingsTab'
import MapTab from '../components/tabs/MapTab'
import CostTab from '../components/tabs/CostTab'
import CompDetailModal from '../components/CompDetailModal'
import styles from './PoolView.module.css'

const TABS = [
  { id: 'heatmap',  label: 'Heatmap'      },
  { id: 'history',  label: 'History'      },
  { id: 'offers',   label: 'Offers'       },
  { id: 'scatter',  label: 'Correlations' },
  { id: 'scenario', label: 'Scenario'     },
  { id: 'findings', label: 'Findings'     },
  { id: 'cost',     label: 'Cost'         },
  { id: 'map',      label: 'Map'          },
]

export default function PoolView({ pool, user, theme, onToggleTheme, onBack, onAddProperty, onEditProperty }) {
  const [comps,        setComps]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [activeTab,    setActiveTab]    = useState('heatmap')
  const [showImport,   setShowImport]   = useState(false)
  const [showPicker,   setShowPicker]   = useState(false)
  const [selectedComp, setSelectedComp] = useState(null)

  useEffect(() => { fetchComps() }, [pool.id])

  async function fetchComps() {
    setLoading(true)
    const { data } = await supabase
      .from('pool_properties')
      .select('properties(*)')
      .eq('pool_id', pool.id)
      .order('added_at', { ascending: true })
    setComps((data || []).map(r => r.properties).filter(Boolean))
    setLoading(false)
  }

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

  const headerStats = comps.length > 0 ? [
    { value: stats.medianPsf ? `$<em>${stats.medianPsf}</em>` : '—', label: 'Median $/SF'  },
    { value: stats.psfRange  ? `$<em>${stats.psfRange}</em>`  : '—', label: '$/SF Range'   },
    { value: `<em>${stats.closedCount}</em>/${stats.totalCount}`,     label: 'Closed Sales' },
    { value: stats.avgCut    ? `−$<em>${Math.round(stats.avgCut / 1000)}K</em>` : '—', label: 'Avg Price Cut' },
  ] : []

  const tabProps = {
    comps, pool,
    onEdit:   onEditProperty,
    onDelete: removeFromPool,
    onSelect: setSelectedComp,
    theme,
  }

  return (
    <div>
      <Header
        title={pool.name}
        eyebrow={pool.location || pool.role}
        stats={headerStats}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onBack={onBack}
        backLabel="All Pools"
      />
      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <div className={styles.addBar}>
        <button className={styles.addBtn} onClick={() => setShowPicker(true)}>+ Add to Pool</button>
        <button className={styles.importBtn} onClick={() => setShowImport(true)}>↑ Import</button>
        <span className={styles.compCount}>{comps.length} propert{comps.length !== 1 ? 'ies' : 'y'}</span>
      </div>

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
          {activeTab === 'heatmap'  && <HeatmapTab  {...tabProps} />}
          {activeTab === 'history'  && <HistoryTab  {...tabProps} />}
          {activeTab === 'offers'   && <OffersTab   comps={comps} />}
          {activeTab === 'scatter'  && <ScatterTab  {...tabProps} />}
          {activeTab === 'scenario' && <ScenarioTab {...tabProps} />}
          {activeTab === 'findings' && <FindingsTab {...tabProps} />}
          {activeTab === 'cost'      && <CostTab      comps={comps} />}
          {activeTab === 'map'       && <MapTab       comps={comps} />}
        </div>
      )}

      {selectedComp && (
        <CompDetailModal
          comp={selectedComp}
          comps={comps}
          onClose={() => setSelectedComp(null)}
          onEdit={prop => { setSelectedComp(null); onEditProperty(prop) }}
        />
      )}

      {showPicker && (
        <PropertyPicker
          pool={pool}
          user={user}
          onClose={() => setShowPicker(false)}
          onAdded={fetchComps}
          onCreateNew={() => { setShowPicker(false); onAddProperty() }}
        />
      )}

      {showImport && (
        <ImportModal
          pool={pool}
          user={user}
          onClose={() => setShowImport(false)}
          onImported={fetchComps}
        />
      )}
    </div>
  )
}
