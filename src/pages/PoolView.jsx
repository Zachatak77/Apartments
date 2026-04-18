import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { poolStats } from '../lib/scoring'
import Header from '../components/Header'
import TabBar from '../components/TabBar'
import ImportModal from '../components/ImportModal'
import HeatmapTab from '../components/tabs/HeatmapTab'
import HistoryTab from '../components/tabs/HistoryTab'
import TornadoTab from '../components/tabs/TornadoTab'
import ScatterTab from '../components/tabs/ScatterTab'
import ScenarioTab from '../components/tabs/ScenarioTab'
import BreakevenTab from '../components/tabs/BreakevenTab'
import FindingsTab from '../components/tabs/FindingsTab'
import MapTab from '../components/tabs/MapTab'
import CompDetailModal from '../components/CompDetailModal'
import styles from './PoolView.module.css'

const TABS = [
  { id: 'heatmap',   label: 'Heatmap'      },
  { id: 'history',   label: 'History'      },
  { id: 'tornado',   label: 'Tornado'      },
  { id: 'scatter',   label: 'Correlations' },
  { id: 'scenario',  label: 'Scenario'     },
  { id: 'breakeven', label: 'Breakeven'    },
  { id: 'findings',  label: 'Findings'     },
  { id: 'map',       label: 'Map'          },
]

export default function PoolView({ pool, theme, onToggleTheme, onBack, onAddComp, onEditComp }) {
  const [comps, setComps]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('heatmap')
  const [showImport, setShowImport] = useState(false)
  const [selectedComp, setSelectedComp] = useState(null)

  useEffect(() => { fetchComps() }, [pool.id])

  async function fetchComps() {
    setLoading(true)
    const { data } = await supabase
      .from('comps')
      .select('*')
      .eq('pool_id', pool.id)
      .order('created_at', { ascending: true })
    setComps(data || [])
    setLoading(false)
  }

  async function deleteComp(id) {
    if (!confirm('Remove this comp?')) return
    await supabase.from('comps').delete().eq('id', id)
    setComps(c => c.filter(x => x.id !== id))
  }

  const stats = poolStats(comps)

  const headerStats = comps.length > 0 ? [
    { value: stats.medianPsf ? `$<em>${stats.medianPsf}</em>` : '—', label: 'Median $/SF' },
    { value: stats.psfRange  ? `$<em>${stats.psfRange}</em>`  : '—', label: '$/SF Range'  },
    { value: `<em>${stats.closedCount}</em>/${stats.totalCount}`,     label: 'Closed Sales' },
    { value: stats.avgCut    ? `−$<em>${Math.round(stats.avgCut / 1000)}K</em>` : '—', label: 'Avg Price Cut' },
  ] : []

  const tabProps = { comps, pool, onEdit: onEditComp, onDelete: deleteComp, onSelect: setSelectedComp, theme }

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
        <button className={styles.addBtn} onClick={onAddComp}>+ Add Comp</button>
        <button className={styles.importBtn} onClick={() => setShowImport(true)}>↑ Import</button>
        <span className={styles.compCount}>{comps.length} comp{comps.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading comps…</div>
      ) : comps.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No comps yet</p>
          <p className={styles.emptySub}>Add comps manually or import from a spreadsheet.</p>
          <div className={styles.emptyActions}>
            <button className={styles.addBtn} onClick={onAddComp}>+ Add Comp</button>
            <button className={styles.importBtn} onClick={() => setShowImport(true)}>↑ Import CSV</button>
          </div>
        </div>
      ) : (
        <div className={styles.panel}>
          {activeTab === 'heatmap'   && <HeatmapTab   {...tabProps} />}
          {activeTab === 'history'   && <HistoryTab   {...tabProps} />}
          {activeTab === 'tornado'   && <TornadoTab   {...tabProps} />}
          {activeTab === 'scatter'   && <ScatterTab   {...tabProps} />}
          {activeTab === 'scenario'  && <ScenarioTab  {...tabProps} />}
          {activeTab === 'breakeven' && <BreakevenTab {...tabProps} />}
          {activeTab === 'findings'  && <FindingsTab  {...tabProps} />}
          {activeTab === 'map'       && <MapTab       comps={comps} />}
        </div>
      )}

      {selectedComp && (
        <CompDetailModal
          comp={selectedComp}
          comps={comps}
          onClose={() => setSelectedComp(null)}
        />
      )}

      {showImport && (
        <ImportModal
          pool={pool}
          onClose={() => setShowImport(false)}
          onImported={fetchComps}
        />
      )}
    </div>
  )
}
