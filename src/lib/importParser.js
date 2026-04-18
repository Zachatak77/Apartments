// Column definitions — order matches the downloadable CSV template
export const TEMPLATE_COLUMNS = [
  { key: 'address',             label: 'Address',              required: true  },
  { key: 'town',                label: 'Town',                 required: false },
  { key: 'source_url',          label: 'Source URL',           required: false },
  { key: 'original_list_price', label: 'Original List Price',  required: false },
  { key: 'last_list_price',     label: 'Last List Price',      required: false },
  { key: 'sold_price',          label: 'Sold Price',           required: false },
  { key: 'list_date',           label: 'List Date (YYYY-MM-DD)',      required: false },
  { key: 'last_price_date',     label: 'Last Price Date (YYYY-MM-DD)',required: false },
  { key: 'contract_date',       label: 'Contract Date (YYYY-MM-DD)',  required: false },
  { key: 'sold_date',           label: 'Sold Date (YYYY-MM-DD)',      required: false },
  { key: 'sqft',                label: 'Interior Sq Ft',       required: false },
  { key: 'lot_sqft',            label: 'Lot Sq Ft',            required: false },
  { key: 'year_built',          label: 'Year Built',           required: false },
  { key: 'beds',                label: 'Beds',                 required: false },
  { key: 'baths',               label: 'Baths',                required: false },
  { key: 'stories',             label: 'Stories',              required: false },
  { key: 'taxes',               label: 'Annual Taxes',         required: false },
  { key: 'days_on_market',      label: 'Days on Market',       required: false },
  { key: 'days_to_contract',    label: 'Days to Contract',     required: false },
  { key: 'is_closed',           label: 'Closed (true/false)',  required: false },
  { key: 'over_ask',            label: 'Over Ask (true/false)',required: false },
  { key: 'notes',               label: 'Notes',                required: false },
]

const NUM_KEYS = new Set([
  'original_list_price','last_list_price','sold_price',
  'sqft','lot_sqft','year_built','beds','baths','stories',
  'taxes','days_on_market','days_to_contract',
])
const BOOL_KEYS  = new Set(['is_closed','over_ask'])
const DATE_KEYS  = new Set(['list_date','last_price_date','contract_date','sold_date'])

function parseValue(key, raw) {
  const v = (raw ?? '').toString().trim()
  if (!v) return null

  if (NUM_KEYS.has(key))  return isNaN(Number(v.replace(/[$,]/g, ''))) ? null : Number(v.replace(/[$,]/g, ''))
  if (BOOL_KEYS.has(key)) return /^(true|yes|1)$/i.test(v)
  if (DATE_KEYS.has(key)) {
    // Accept YYYY-MM-DD or M/D/YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
    const d = new Date(v)
    if (!isNaN(d)) return d.toISOString().slice(0, 10)
    return null
  }
  return v
}

function computeDerived(row) {
  const price = row.last_list_price ?? row.original_list_price ?? row.sold_price
  const psf     = price && row.sqft     ? Math.round(price / row.sqft)        : null
  const lot_psf = price && row.lot_sqft ? +(price / row.lot_sqft).toFixed(2)  : null
  const days_on_market = (row.contract_date && row.list_date)
    ? Math.max(0, Math.round((new Date(row.contract_date) - new Date(row.list_date)) / 86400000))
    : (row.days_on_market ?? null)
  return { ...row, psf, lot_psf, days_on_market }
}

// Parse a 2D array of strings (header row + data rows) into comp objects
function rowsToComps(headers, dataRows) {
  // Map header labels → column keys (case-insensitive, trimmed)
  const labelMap = {}
  TEMPLATE_COLUMNS.forEach(c => { labelMap[c.label.toLowerCase()] = c.key })
  // Also allow key names directly
  TEMPLATE_COLUMNS.forEach(c => { labelMap[c.key.toLowerCase()] = c.key })

  const colKeys = headers.map(h => labelMap[h.trim().toLowerCase()] ?? null)

  const comps = []
  const errors = []

  dataRows.forEach((row, i) => {
    if (row.every(cell => !cell.trim())) return // skip blank rows

    const obj = {}
    colKeys.forEach((key, j) => {
      if (!key) return
      obj[key] = parseValue(key, row[j])
    })

    // Default booleans
    if (obj.is_closed == null) obj.is_closed = false
    if (obj.over_ask  == null) obj.over_ask  = false

    if (!obj.address) {
      errors.push(`Row ${i + 2}: missing Address — skipped`)
      return
    }

    comps.push(computeDerived(obj))
  })

  return { comps, errors }
}

// Parse CSV text (handles quoted fields with commas)
export function parseCsv(text) {
  const rows = []
  let row = [], cell = '', inQuote = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (inQuote && text[i + 1] === '"') { cell += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      row.push(cell); cell = ''
    } else if ((ch === '\n' || ch === '\r') && !inQuote) {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      rows.push(row); row = []
    } else {
      cell += ch
    }
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }

  const nonEmpty = rows.filter(r => r.some(c => c.trim()))
  if (nonEmpty.length < 2) return { comps: [], errors: ['File appears empty or has only a header row.'] }
  return rowsToComps(nonEmpty[0], nonEmpty.slice(1))
}

// Parse tab-separated text pasted from Excel / Google Sheets
export function parsePaste(text) {
  const rows = text.split(/\r?\n/).map(r => r.split('\t'))
  const nonEmpty = rows.filter(r => r.some(c => c.trim()))
  if (nonEmpty.length < 2) return { comps: [], errors: ['Paste appears empty or has only a header row.'] }
  return rowsToComps(nonEmpty[0], nonEmpty.slice(1))
}

// Generate CSV template file content
export function generateTemplate() {
  const header = TEMPLATE_COLUMNS.map(c => `"${c.label}"`).join(',')
  const example = TEMPLATE_COLUMNS.map(c => {
    const eg = {
      address: '14 Ranch Rd', town: 'Upper Saddle River',
      source_url: 'https://zillow.com/...',
      original_list_price: '1749000', last_list_price: '1625000', sold_price: '1450000',
      list_date: '2025-09-01', last_price_date: '2025-11-15', contract_date: '2025-12-20', sold_date: '2026-01-10',
      sqft: '4475', lot_sqft: '37897', year_built: '1975',
      beds: '4', baths: '2.5', stories: '2',
      taxes: '23145', days_on_market: '45', days_to_contract: '12',
      is_closed: 'true', over_ask: 'false', notes: 'Renovated kitchen',
    }
    return `"${eg[c.key] ?? ''}"`
  }).join(',')
  return `${header}\n${example}\n`
}
