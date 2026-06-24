import { useState } from 'react'
import SubNav from '../SubNav'
import HeatmapTab from './HeatmapTab'
import CostTab from './CostTab'
import PhysicalTab from './PhysicalTab'

// Consolidated comps table: one tab, three column sets.
const VIEWS = [
  { id: 'valuation', label: 'Valuation' },
  { id: 'costs',     label: 'Costs'     },
  { id: 'physical',  label: 'Physical'  },
]

export default function CompsTab(props) {
  const [view, setView] = useState('valuation')
  return (
    <div>
      <SubNav tabs={VIEWS} active={view} onChange={setView} />
      {view === 'valuation' && <HeatmapTab {...props} />}
      {view === 'costs'     && <CostTab comps={props.comps} />}
      {view === 'physical'  && <PhysicalTab comps={props.comps} />}
    </div>
  )
}
