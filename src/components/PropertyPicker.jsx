import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import styles from './PropertyPicker.module.css'

export default function PropertyPicker({ pool, user, onClose, onAdded, onCreateNew }) {
  const [available, setAvailable] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [adding,    setAdding]    = useState(null)

  useEffect(() => { fetchAvailable() }, [])

  async function fetchAvailable() {
    setLoading(true)
    const [allRes, inPoolRes] = await Promise.all([
      supabase.from('properties').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('pool_properties').select('property_id').eq('pool_id', pool.id),
    ])
    const inPoolIds = new Set((inPoolRes.data || []).map(r => r.property_id))
    setAvailable((allRes.data || []).filter(p => !inPoolIds.has(p.id)))
    setLoading(false)
  }

  async function addToPool(property) {
    setAdding(property.id)
    const { error } = await supabase.from('pool_properties').insert({
      pool_id: pool.id,
      property_id: property.id,
    })
    if (!error) {
      await supabase.from('comp_pools').update({ updated_at: new Date().toISOString() }).eq('id', pool.id)
      setAvailable(prev => prev.filter(p => p.id !== property.id))
      onAdded()
    }
    setAdding(null)
  }

  const fmt = v => v ? `$${Math.round(v / 1000)}K` : null

  const filtered = available.filter(p =>
    !search
    || p.address.toLowerCase().includes(search.toLowerCase())
    || (p.town || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Apply to pool</div>
            <h2 className={styles.title}>Add Properties to {pool.name}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.toolbar}>
          <input
            className={styles.search}
            type="text"
            placeholder="Search by address or town…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <button className={styles.createBtn} onClick={onCreateNew}>+ New Property</button>
        </div>

        <div className={styles.listWrap}>
          {loading ? (
            <div className={styles.empty}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              {available.length === 0
                ? 'Your property library is empty. Create a new property to get started.'
                : search
                ? `No properties match "${search}"`
                : 'All properties in your library are already in this pool.'}
            </div>
          ) : (
            filtered.map(p => {
              const price = p.sold_price ?? p.last_list_price ?? p.original_list_price
              const isAdding = adding === p.id
              return (
                <div key={p.id} className={styles.row}>
                  <div className={styles.info}>
                    <div className={styles.addr}>{p.address}</div>
                    <div className={styles.meta}>
                      {p.town && <span>{p.town}</span>}
                      {fmt(price) && <span>{fmt(price)}</span>}
                      {p.psf     && <span>${p.psf}/SF</span>}
                      {p.sqft    && <span>{Math.round(p.sqft).toLocaleString()} SF</span>}
                      <span className={p.is_closed ? styles.closed : styles.active}>
                        {p.is_closed ? 'Closed' : 'Active'}
                      </span>
                    </div>
                  </div>
                  <button
                    className={`${styles.addBtn} ${isAdding ? styles.addingBtn : ''}`}
                    onClick={() => addToPool(p)}
                    disabled={isAdding}
                  >
                    {isAdding ? '…' : '+ Add'}
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.footerNote}>
            {available.length - filtered.length > 0 && search
              ? `${available.length - filtered.length} propert${available.length - filtered.length !== 1 ? 'ies' : 'y'} hidden by search`
              : `${available.length} propert${available.length !== 1 ? 'ies' : 'y'} available`}
          </span>
          <button className={styles.doneBtn} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
