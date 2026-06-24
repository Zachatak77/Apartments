import { useState } from 'react'
import SubNav from '../SubNav'
import ScatterTab from './ScatterTab'
import MapTab from './MapTab'

// Consolidated exploration: pairwise correlations + the geographic map.
// Map only mounts when its sub-view is selected, so Leaflet/geocoding stays idle.
const VIEWS = [
  { id: 'correlations', label: 'Correlations' },
  { id: 'map',          label: 'Map'          },
]

export default function ExploreTab({ comps, onSelect }) {
  const [view, setView] = useState('correlations')
  return (
    <div>
      <SubNav tabs={VIEWS} active={view} onChange={setView} />
      {view === 'correlations' && <ScatterTab comps={comps} onSelect={onSelect} />}
      {view === 'map'          && <MapTab comps={comps} onSelect={onSelect} />}
    </div>
  )
}
