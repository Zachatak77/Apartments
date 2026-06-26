import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Derive days_on_market from the listing's date span (list -> contract|sold|today).
export function hydrateDom(c) {
  if (!c.list_date) return c
  const listD = new Date(c.list_date)
  const endD  = c.contract_date ? new Date(c.contract_date)
              : c.sold_date     ? new Date(c.sold_date)
              : new Date()
  return { ...c, days_on_market: Math.max(0, Math.round((endD - listD) / 86400000)) }
}

// Inferred listing status — the backbone of the active-vs-context model.
// Active = decision surface; In Contract / Sold = pricing context.
export function compStatus(c) {
  if (c.sold_date) return 'sold'
  if (c.contract_date) return 'contract'
  return 'active'
}

export function isActive(c)  { return compStatus(c) === 'active' }
export function isContext(c) { return compStatus(c) !== 'active' }

// Shared loader for a pool's properties, hydrated with days_on_market.
export function usePoolComps(poolId) {
  const [comps,   setComps]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetchComps = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('pool_properties')
      .select('properties(*)')
      .eq('pool_id', poolId)
      .order('added_at', { ascending: true })
    setComps((data || []).map(r => r.properties).filter(Boolean).map(hydrateDom))
    setLoading(false)
  }, [poolId])

  useEffect(() => { fetchComps() }, [fetchComps])

  return { comps, setComps, loading, refetch: fetchComps }
}
