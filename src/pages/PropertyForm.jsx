import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import styles from './CompForm.module.css'

const EMPTY = {
  address: '', town: '', source_url: '',
  original_list_price: '', last_list_price: '', sold_price: '',
  list_date: '', last_price_date: '', sold_date: '',
  sqft: '', lot_sqft: '', year_built: '', beds: '', baths: '',
  taxes: '', days_on_market: '', days_to_contract: '',
  stories: '2', is_closed: false, over_ask: false,
  notes: '',
}

const fields = [
  { section: 'Property', items: [
    { key: 'address',    label: 'Address *',     type: 'text',   placeholder: '14 Ranch Rd' },
    { key: 'town',       label: 'Town / Area',   type: 'text',   placeholder: 'Upper Saddle River' },
    { key: 'source_url', label: 'Listing URL',   type: 'url',    placeholder: 'https://www.zillow.com/…' },
  ]},
  { section: 'Pricing', items: [
    { key: 'original_list_price', label: 'Original List Price', type: 'number', placeholder: '1749000' },
    { key: 'last_list_price',     label: 'Last List Price',     type: 'number', placeholder: '1625000' },
    { key: 'sold_price',          label: 'Sold Price',          type: 'number', placeholder: '1450000' },
  ]},
  { section: 'Dates', items: [
    { key: 'list_date',       label: 'List Date',         type: 'date' },
    { key: 'last_price_date', label: 'Last Price Change', type: 'date' },
    { key: 'sold_date',       label: 'Sold / Contract',   type: 'date' },
  ]},
  { section: 'Physical', items: [
    { key: 'sqft',       label: 'Interior Sq Ft', type: 'number', placeholder: '4475' },
    { key: 'lot_sqft',   label: 'Lot Sq Ft',      type: 'number', placeholder: '37897' },
    { key: 'year_built', label: 'Year Built',      type: 'number', placeholder: '1975' },
    { key: 'beds',       label: 'Beds',            type: 'number', placeholder: '4' },
    { key: 'baths',      label: 'Baths',           type: 'number', placeholder: '2.5', step: '0.5' },
    { key: 'stories',    label: 'Stories',         type: 'number', placeholder: '2' },
  ]},
  { section: 'Financial', items: [
    { key: 'taxes',            label: 'Annual Taxes ($)', type: 'number', placeholder: '23145' },
    { key: 'days_on_market',   label: 'Days on Market',   type: 'number', placeholder: '45' },
    { key: 'days_to_contract', label: 'Days to Contract', type: 'number', placeholder: '12' },
  ]},
]

export default function PropertyForm({ user, property, contextLabel, theme, onToggleTheme, onBack, onSaved }) {
  const isEdit = !!property
  const [form, setForm] = useState(() => {
    if (isEdit) {
      const f = {}
      Object.keys(EMPTY).forEach(k => { f[k] = property[k] ?? EMPTY[k] })
      return f
    }
    return { ...EMPTY }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const num = v => (v === '' || v == null) ? null : Number(v)

  async function submit(e) {
    e.preventDefault()
    if (!form.address.trim()) { setError('Address is required.'); return }
    setLoading(true)
    setError('')

    const listPrice = num(form.last_list_price) ?? num(form.original_list_price)
    const psf    = form.sqft && listPrice ? Math.round(listPrice / num(form.sqft)) : null
    const lotPsf = form.lot_sqft && listPrice ? +(listPrice / num(form.lot_sqft)).toFixed(2) : null

    const payload = {
      user_id:              user.id,
      address:              form.address.trim(),
      town:                 form.town.trim() || null,
      source_url:           form.source_url.trim() || null,
      original_list_price:  num(form.original_list_price),
      last_list_price:      num(form.last_list_price),
      sold_price:           num(form.sold_price),
      list_date:            form.list_date || null,
      last_price_date:      form.last_price_date || null,
      sold_date:            form.sold_date || null,
      sqft:                 num(form.sqft),
      lot_sqft:             num(form.lot_sqft),
      year_built:           num(form.year_built),
      beds:                 num(form.beds),
      baths:                num(form.baths),
      stories:              num(form.stories),
      taxes:                num(form.taxes),
      days_on_market:       num(form.days_on_market),
      days_to_contract:     num(form.days_to_contract),
      is_closed:            form.is_closed,
      over_ask:             form.over_ask,
      notes:                form.notes.trim() || null,
      psf,
      lot_psf: lotPsf,
    }

    const result = isEdit
      ? await supabase.from('properties').update(payload).eq('id', property.id).select().single()
      : await supabase.from('properties').insert(payload).select().single()

    setLoading(false)
    if (result.error) { setError(result.error.message); return }
    onSaved(result.data)
  }

  return (
    <div>
      <Header
        title={isEdit ? 'Edit Property' : 'Add Property'}
        eyebrow={contextLabel ?? 'Properties'}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onBack={onBack}
        backLabel="Back"
      />
      <div className={styles.page}>
        <form onSubmit={submit}>
          {fields.map(({ section, items }) => (
            <div key={section} className={styles.section}>
              <div className="sl">{section}</div>
              <div className={styles.grid}>
                {items.map(f => (
                  <div key={f.key} className={styles.field}>
                    <label className={styles.label}>{f.label}</label>
                    <input
                      className={styles.input}
                      type={f.type}
                      step={f.step}
                      placeholder={f.placeholder}
                      value={form[f.key]}
                      onChange={e => set(f.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className={styles.section}>
            <div className="sl">Status</div>
            <div className={styles.checkRow}>
              <label className={styles.checkLabel}>
                <input type="checkbox" checked={form.is_closed} onChange={e => set('is_closed', e.target.checked)} />
                Closed / Sold
              </label>
              <label className={styles.checkLabel}>
                <input type="checkbox" checked={form.over_ask} onChange={e => set('over_ask', e.target.checked)} />
                Sold Over Ask
              </label>
            </div>
          </div>

          <div className={styles.section}>
            <div className="sl">Notes</div>
            <textarea
              className={styles.textarea}
              rows={3}
              placeholder="Condition notes, features, renovation needed, etc."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Property'}
            </button>
            <button type="button" className={styles.cancel} onClick={onBack}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
