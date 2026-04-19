import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import ImportModal from '../components/ImportModal'
import styles from './PropertiesPage.module.css'

export default function PropertiesPage({ user, onAddProperty, onEditProperty }) {
  const [properties, setProperties] = useState([])
  const [pools,      setPools]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [addPoolFor, setAddPoolFor] = useState(null)  // property id showing pool picker
  const [search,     setSearch]     = useState('')
  const [showImport, setShowImport] = useState(false)

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

  const filtered = properties.filter(p =>
    !search
    || p.address.toLowerCase().includes(search.toLowerCase())
    || (p.town || '').toLowerCase().includes(search.toLowerCase())
  )

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
