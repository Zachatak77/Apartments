import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import styles from './Dashboard.module.css'

export default function Dashboard({ user, onOpenPool, onOpenProfile, onOpenProperties, onOpenModelSettings, onSignOut }) {
  const [pools, setPools] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newRole, setNewRole] = useState('buyer')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchPools() }, [])

  async function fetchPools() {
    setLoading(true)
    const { data, error } = await supabase
      .from('comp_pools')
      .select('*, pool_properties(count)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    if (!error) setPools(data || [])
    setLoading(false)
  }

  async function createPool(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError('')
    const { data, error } = await supabase
      .from('comp_pools')
      .insert({ user_id: user.id, name: newName.trim(), location: newLocation.trim(), role: newRole })
      .select()
      .single()
    setCreating(false)
    if (error) { setError(error.message); return }
    setShowForm(false)
    setNewName('')
    setNewLocation('')
    setNewRole('buyer')
    setPools(p => [data, ...p])
  }

  async function deletePool(id) {
    if (!confirm('Delete this comp pool and all its comps?')) return
    await supabase.from('comp_pools').delete().eq('id', id)
    setPools(p => p.filter(x => x.id !== id))
  }

  const fmt = dateStr => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div>
      <Header
        title="Comp Analysis"
        eyebrow={user.email}
      />

      <div className={styles.page}>
        <div className={styles.topRow}>
          <div>
            <div className="sl">Your comp pools</div>
            <h2 className={styles.pageTitle}>Pricing Analysis</h2>
          </div>
          <div className={styles.topActions}>
            <button className={styles.newBtn} onClick={() => setShowForm(true)}>+ New Pool</button>
          </div>
        </div>

        {showForm && (
          <form className={styles.createForm} onSubmit={createPool}>
            <div className={styles.formTitle}>New Comp Pool</div>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Pool Name *</label>
                <input
                  className={styles.input}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Bergen County Q2 2026"
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Location</label>
                <input
                  className={styles.input}
                  value={newLocation}
                  onChange={e => setNewLocation(e.target.value)}
                  placeholder="e.g. Wyckoff, NJ"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Your Role</label>
                <select className={styles.input} value={newRole} onChange={e => setNewRole(e.target.value)}>
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                </select>
              </div>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.formActions}>
              <button type="submit" className={styles.newBtn} disabled={creating}>
                {creating ? 'Creating…' : 'Create Pool'}
              </button>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        {loading ? (
          <div className={styles.empty}>Loading…</div>
        ) : pools.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No comp pools yet</p>
            <p className={styles.emptySub}>Create a pool to start tracking properties and running analysis.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {pools.map(pool => (
              <div key={pool.id} className={styles.poolCard} onClick={() => onOpenPool(pool)}>
                <div className={styles.poolTop}>
                  <div>
                    <div className={styles.poolBadge}>{pool.role}</div>
                    <div className={styles.poolName}>{pool.name}</div>
                    {pool.location && <div className={styles.poolLocation}>{pool.location}</div>}
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={e => { e.stopPropagation(); deletePool(pool.id) }}
                    title="Delete pool"
                  >✕</button>
                </div>
                <div className={styles.poolFooter}>
                  <span className={styles.poolCount}>
                    {pool.pool_properties?.[0]?.count ?? 0} propert{pool.pool_properties?.[0]?.count !== 1 ? 'ies' : 'y'}
                  </span>
                  <span className={styles.poolDate}>Updated {fmt(pool.updated_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
