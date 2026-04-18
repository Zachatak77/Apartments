import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { parseCsv, parsePaste, generateTemplate, TEMPLATE_COLUMNS } from '../lib/importParser'
import styles from './ImportModal.module.css'

const PREVIEW_COLS = ['address', 'town', 'last_list_price', 'sold_price', 'sqft', 'taxes', 'days_on_market', 'is_closed']

export default function ImportModal({ pool, user, onClose, onImported }) {
  const [tab, setTab]         = useState('upload')
  const [paste, setPaste]     = useState('')
  const [preview, setPreview] = useState(null)  // { comps, errors }
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(0)
  const fileRef = useRef(null)

  function downloadTemplate() {
    const blob = new Blob([generateTemplate()], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = 'comp-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPreview(parseCsv(ev.target.result))
    reader.readAsText(file)
  }

  function handleParse() {
    if (!paste.trim()) return
    setPreview(parsePaste(paste))
  }

  function clearPreview() {
    setPreview(null)
    setPaste('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleImport() {
    if (!preview?.comps?.length) return
    setSaving(true)

    const rows = preview.comps.map(c => ({ ...c, user_id: user.id }))

    // Insert properties in batches, collect returned IDs
    let insertedIds = []
    for (let i = 0; i < rows.length; i += 50) {
      const { data, error } = await supabase
        .from('properties')
        .insert(rows.slice(i, i + 50))
        .select('id')
      if (!error && data) insertedIds = [...insertedIds, ...data.map(r => r.id)]
    }

    // Link each new property to this pool
    if (insertedIds.length > 0) {
      const links = insertedIds.map(id => ({ pool_id: pool.id, property_id: id }))
      for (let i = 0; i < links.length; i += 50) {
        await supabase.from('pool_properties').insert(links.slice(i, i + 50))
      }
    }

    await supabase.from('comp_pools')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', pool.id)

    setSaving(false)
    setSaved(insertedIds.length)
    setTimeout(() => { onImported(); onClose() }, 1200)
  }

  const fmt = (key, val) => {
    if (val == null || val === '') return <span className={styles.empty}>—</span>
    if (key === 'is_closed') return val ? <span className={styles.yes}>Closed</span> : <span className={styles.no}>Active</span>
    if (['last_list_price','sold_price','taxes'].includes(key)) return `$${Number(val).toLocaleString()}`
    return String(val)
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div>
            <div className={styles.eyebrow}>Bulk Import</div>
            <h2 className={styles.title}>Import Properties</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {!preview ? (
          <>
            <div className={styles.tabs}>
              <button className={`${styles.tab} ${tab === 'upload' ? styles.tabActive : ''}`} onClick={() => setTab('upload')}>Upload CSV</button>
              <button className={`${styles.tab} ${tab === 'paste'  ? styles.tabActive : ''}`} onClick={() => setTab('paste')}>Paste from Spreadsheet</button>
            </div>

            {tab === 'upload' && (
              <div className={styles.body}>
                <div className={styles.templateRow}>
                  <div>
                    <div className={styles.sectionLabel}>Step 1 — Download template</div>
                    <p className={styles.hint}>Fill it in Excel or Google Sheets, then upload below.</p>
                  </div>
                  <button className={styles.dlBtn} onClick={downloadTemplate}>↓ Download Template</button>
                </div>

                <div className={styles.sectionLabel}>Step 2 — Upload completed file</div>
                <label className={styles.fileZone}>
                  <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className={styles.fileInput} />
                  <div className={styles.fileZoneInner}>
                    <div className={styles.fileIcon}>CSV</div>
                    <div className={styles.fileText}>Click to choose a CSV file</div>
                    <div className={styles.fileHint}>or drag and drop here</div>
                  </div>
                </label>

                <div className={styles.colList}>
                  <div className={styles.sectionLabel}>Expected columns</div>
                  <div className={styles.cols}>
                    {TEMPLATE_COLUMNS.map(c => (
                      <span key={c.key} className={`${styles.col} ${c.required ? styles.colReq : ''}`}>
                        {c.label}{c.required ? ' *' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'paste' && (
              <div className={styles.body}>
                <div className={styles.sectionLabel}>Instructions</div>
                <p className={styles.hint}>
                  Copy rows from Excel or Google Sheets (including the header row) and paste below.
                  Columns should match the template — <button className={styles.inlineLink} onClick={downloadTemplate}>download it</button> to see the format.
                </p>
                <textarea
                  className={styles.pasteArea}
                  rows={10}
                  placeholder={"Address\tTown\tOriginal List Price\t...\n14 Ranch Rd\tUpper Saddle River\t1749000\t..."}
                  value={paste}
                  onChange={e => setPaste(e.target.value)}
                />
                <div className={styles.actions}>
                  <button className={styles.primaryBtn} onClick={handleParse} disabled={!paste.trim()}>
                    Preview Import
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={styles.body}>
            {saved > 0 ? (
              <div className={styles.successBanner}>✓ Imported {saved} propert{saved !== 1 ? 'ies' : 'y'} successfully</div>
            ) : (
              <>
                <div className={styles.previewHeader}>
                  <div>
                    <div className={styles.sectionLabel}>Preview</div>
                    <p className={styles.hint}><strong>{preview.comps.length}</strong> propert{preview.comps.length !== 1 ? 'ies' : 'y'} ready to import</p>
                  </div>
                  <button className={styles.clearBtn} onClick={clearPreview}>← Back</button>
                </div>

                {preview.errors.length > 0 && (
                  <div className={styles.errorList}>
                    {preview.errors.map((e, i) => <div key={i} className={styles.errorItem}>{e}</div>)}
                  </div>
                )}

                {preview.comps.length > 0 && (
                  <div className={styles.previewWrap}>
                    <table className={styles.previewTable}>
                      <thead>
                        <tr>
                          {PREVIEW_COLS.map(k => (
                            <th key={k}>{TEMPLATE_COLUMNS.find(c => c.key === k)?.label ?? k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.comps.map((c, i) => (
                          <tr key={i}>
                            {PREVIEW_COLS.map(k => <td key={k}>{fmt(k, c[k])}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className={styles.actions}>
                  <button
                    className={styles.primaryBtn}
                    onClick={handleImport}
                    disabled={saving || !preview.comps.length}
                  >
                    {saving ? 'Importing…' : `Import ${preview.comps.length} Propert${preview.comps.length !== 1 ? 'ies' : 'y'}`}
                  </button>
                  <button className={styles.cancelBtn} onClick={clearPreview}>Back</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
