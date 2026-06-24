import { useState } from 'react'
import SubNav from '../SubNav'
import OffersStrategy from './OffersStrategy'
import ScenarioTab from './ScenarioTab'

// Consolidated offer decision-making: market leverage / predictions (Strategy)
// plus the interactive what-if pricing tool (Scenario).
const VIEWS = [
  { id: 'strategy', label: 'Offer Strategy' },
  { id: 'whatif',   label: 'What-If'        },
]

export default function OffersTab({ comps }) {
  const [view, setView] = useState('strategy')
  return (
    <div>
      <SubNav tabs={VIEWS} active={view} onChange={setView} />
      {view === 'strategy' && <OffersStrategy comps={comps} />}
      {view === 'whatif'   && <ScenarioTab comps={comps} />}
    </div>
  )
}
