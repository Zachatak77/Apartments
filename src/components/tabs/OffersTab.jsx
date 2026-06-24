import { useState } from 'react'
import SubNav from '../SubNav'
import OffersStrategy from './OffersStrategy'
import HistoryTab from './HistoryTab'
import ScenarioTab from './ScenarioTab'

// Consolidated offer decision-making: market leverage / predictions (Strategy),
// the listing timeline (Timeline), and the interactive what-if pricing tool.
const VIEWS = [
  { id: 'strategy', label: 'Offer Strategy' },
  { id: 'timeline', label: 'Timeline'       },
  { id: 'whatif',   label: 'What-If'         },
]

export default function OffersTab({ comps, onSelect }) {
  const [view, setView] = useState('strategy')
  return (
    <div>
      <SubNav tabs={VIEWS} active={view} onChange={setView} />
      {view === 'strategy' && <OffersStrategy comps={comps} onSelect={onSelect} />}
      {view === 'timeline' && <HistoryTab comps={comps} onSelect={onSelect} />}
      {view === 'whatif'   && <ScenarioTab comps={comps} />}
    </div>
  )
}
