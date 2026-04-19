import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import ImportModal from '../components/ImportModal'
import styles from './PropertiesPage.module.css'

const EMPTY_FILTERS = { status: 'all', town: 'all', minBeds: '', minBaths: '', minSqft: '', builtAfter: '' }

export default function PropertiesPage({ user, onAddProperty, onEditProperty }) {
  const [properties, setProperties] = useState([])
  const [pools,      setPools]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [addPoolFor, setAddPoolFor] = useState(null)
  const [search,     setSearch]     = useState('')
  const [showImport, setShowImport] = useState(false)
  const [filters,    setFilters]    = useState(EMPTY_FILTERS)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [propsRes, poolsRes] = await Promise.all([
      supabase
        .from('properties')
        .select('*, pool_properties(pool_id, comp_pools(id, name))')
        .order('created_at', { ascending: false }),
      supabase
        .from('comp_pools')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name'),
    ])
    setProperties(propsRes.data || [])
    setPools(poolsRes.data || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { fetchData() }, [fetchData])

  async function deleteProperty(id, membershipCount) {
    const msg = membershipCount > 0
      ? `This property is in ${membershipCount} pool${membershipCount !== 1 ? 's' : ''}. Delete it from all pools permanently?`
      : 'Delete this property permanently?'
    if (!confirm(msg)) return
    await supabase.from('properties').delete().eq('id', id)
    setProperties(p => p.filter(x => x.id !== id))
  }

  async function addToPool(propertyId, poolId) {
    const { error } = await supabase
      .from('pool_properties')
      .insert({ pool_id: poolId, property_id: propertyId })
    if (!error) {
      await supabase.from('comp_pools').update({ updated_at: new Date().toISOString() }).eq('id', poolId)
      fetchData()
    }
    setAddPoolFor(null)
  }

  const fmt = v => v ? `$${Math.round(v / 1000)}K` : '—'

  const towns = [...new Set(properties.map(p => p.town).filter(Boolean))].sort()

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }))
  const clearFilters = () => setFilters(EMPTY_FILTERS)

  const activeFilterCount = Object.entries(filters).filter(([, v]) => v && v !== 'all').length

  const filtered = properties.filter(p => {
    if (search && !p.address.toLowerCase().includes(search.toLowerCase()) && !(p.town || '').toLowerCase().includes(search.toLowerCase())) return false
    if (filters.status !== 'all') {
      if (filters.status === 'closed' && !p.is_closed) return false
      if (filters.status === 'active' && p.is_closed) return false
    }
    if (filters.town !== 'all' && p.town !== filters.town) return false
    if (filters.minBeds && (p.bedrooms == null || p.bedrooms < Number(filters.minBeds))) return false
    if (filters.minBaths && (p.bathrooms == null || p.bathrooms < Number(filters.minBaths))) return false
    if (filters.minSqft && (p.sqft == null || p.sqft < Number(filters.minSqft))) return false
    if (filters.builtAfter && (p.year_built == null || p.year_built < Number(filters.builtAfter))) return false
    return true
  })

  return (
    <div>
      <Header
        title="Properties"
        eyebrow={user.email}
      />
      <div className={styles.page}>
        <div className={styles.topRow}>
          <div>
            <div className="sl">Property library</div>
            <h2 className={styles.pageTitle}>All Properties</h2>
          </div>
          <div className={styles.topActions}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className={styles.importBtn} onClick={() => setShowImport(true)}>↑ Import</button>
            <button className={styles.addBtn} onClick={onAddProperty}>+ New Property</button>
          </div>
        </div>

        <div className={styles.filterBar}>
          <select className={styles.filterSelect} value={filters.status} onChange={e => setFilter('status', e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
          {towns.length > 0 && (
            <select className={styles.filterSelect} value={filters.town} onChange={e => setFilter('town', e.target.value)}>
              <option value="all">All Towns</option>
              {towns.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <select className={styles.filterSelect} value={filters.minBeds} onChange={e => setFilter('minBeds', e.target.value)}>
            <option value="">Any Beds</option>
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}+ Beds</option>)}
          </select>
          <select className={styles.filterSelect} value={filters.minBaths} onChange={e => setFilter('minBaths', e.target.value)}>
            <option value="">Any Baths</option>
            {[1, 1.5, 2, 2.5, 3, 4].map(n => <option key={n} value={n}>{n}+ Baths</option>)}
          </select>
          <select className={styles.filterSelect} value={filters.minSqft} onChange={e => setFilter('minSqft', e.target.value)}>
            <option value="">Any Size</option>
            <option value="500">500+ SF</option>
            <option value="750">750+ SF</option>
            <option value="1000">1,000+ SF</option>
            <option value="1250">1,250+ SF</option>
            <option value="1500">1,500+ SF</option>
            <option value="2000">2,000+ SF</option>
            <option value="2500">2,500+ SF</option>
            <option value="3000">3,000+ SF</option>
          </select>
          <select className={styles.filterSelect} value={filters.builtAfter} onChange={e => setFilter('builtAfter', e.target.value)}>
            <option value="">Any Year</option>
            <option value="2020">Built 2020+</option>
            <option value="2015">Built 2015+</option>
            <option value="2010">Built 2010+</option>
            <option value="2000">Built 2000+</option>
            <option value="1990">Built 1990+</option>
            <option value="1980">Built 1980+</option>
          </select>
          {activeFilterCount > 0 && (
            <button className={styles.clearBtn} onClick={clearFilters}>
              Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
            </button>
          )}
          <span className={styles.filterSummary}>{filtered.length} of {properties.length}</span>
        </div>

        {loading ? (
          <div className={styles.empty}>Loading…</div>
        ) : filtered.length === 0 && properties.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>No properties yet</p>
            <p className={styles.emptySub}>
              Add properties to your library, then apply them to comp pools for analysis.
              A single property can appear in multiple pools.
            </p>
            <div className={styles.emptyBtns}>
              <button className={styles.importBtn} onClick={() => setShowImport(true)}>↑ Import</button>
              <button className={styles.addBtn} onClick={onAddProperty}>+ Add First Property</button>
            </div>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thLeft}>Property</th>
                  <th>Price</th>
                  <th>$/SF</th>
                  <th>Bed/Bath</th>
                  <th>Sqft</th>
                  <th>Status</th>
                  <th className={styles.thLeft}>Pools</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const memberships  = p.pool_properties || []
                  const poolNames    = memberships.map(m => m.comp_pools?.name).filter(Boolean)
                  const availPools   = pools.filter(pl => !memberships.some(m => m.pool_id === pl.id))
                  const price        = p.sold_price ?? p.last_list_price ?? p.original_list_price
                  const showPicker   = addPoolFor === p.id

                  return (
                    <tr key={p.id}>
                      <td className={styles.addrCell}>
                        <div className={styles.addr}>{p.address}</div>
                        {p.town && <div className={styles.town}>{p.town}</div>}
                      </td>
                      <td className={styles.numCell}>{fmt(price)}</td>
                      <td className={styles.numCell}>{p.psf ? `$${p.psf}` : '—'}</td>
                      <td className={styles.numCell}>{p.bedrooms != null ? p.bedrooms : '—'} / {p.bathrooms != null ? p.bathrooms : '—'}</td>
                      <td className={styles.numCell}>{p.sqft ? p.sqft.toLocaleString() : '—'}</td>
                      <td>
                        <span className={p.is_closed ? styles.badgeClosed : styles.badgeActive}>
                          {p.is_closed ? 'Closed' : 'Active'}
                        </span>
                      </td>
                      <td className={styles.poolsCell}>
                        <div className={styles.poolBadges}>
                          {poolNames.map(name => (
                            <span key={name} className={styles.poolBadge}>{name}</span>
                          ))}
                          {showPicker ? (
                            <div className={styles.poolPicker}>
                              {availPools.length === 0 ? (
                                <span className={styles.allPoolsNote}>In all pools</span>
                              ) : (
                                availPools.map(pl => (
                                  <button
                                    key={pl.id}
                                    className={styles.poolPickBtn}
                                    onClick={() => addToPool(p.id, pl.id)}
                                  >
                                    {pl.name}
                                  </button>
                                ))
                              )}
                              <button className={styles.poolPickCancel} onClick={() => setAddPoolFor(null)}>✕</button>
                            </div>
                          ) : (
                            availPools.length > 0 && (
                              <button
                                className={styles.addPoolBtn}
                                onClick={() => setAddPoolFor(p.id)}
                              >
                                + pool
                              </button>
                            )
                          )}
                        </div>
                      </td>
                      <td className={styles.actCell}>
                        <button className={styles.editBtn} onClick={() => onEditProperty(p)}>Edit</button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => deleteProperty(p.id, memberships.length)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className={styles.noResults}>No properties match &ldquo;{search}&rdquo;</div>
            )}
          </div>
        )}
      </div>
      {showImport && (
        <ImportModal
          user={user}
          onClose={() => setShowImport(false)}
          onImported={() => { fetchData(); setShowImport(false) }}
        />
      )}
    </div>
  )
}
