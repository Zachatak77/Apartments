import { useEffect, useState, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { scoreComp, buildPoolContext } from '../../lib/scoring'
import styles from './MapTab.module.css'

// Leaflet's default icon resolution breaks in Vite — patch it
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const CACHE_KEY = 'geocode_cache_v1'
const RATE_DELAY = 1100 // Nominatim: 1 req/sec

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') } catch { return {} }
}
function saveCache(c) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)) } catch {}
}

function scoreColor(score) {
  if (score >= 70) return '#2A5C42'
  if (score >= 50) return '#7A9E8A'
  if (score >= 35) return '#B8A87A'
  return '#8B3A2A'
}

function makeIcon(score, isSubject) {
  const color = isSubject ? '#1a2b1e' : scoreColor(score)
  const size = isSubject ? 16 : 13
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,0.35);
    "></div>`,
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  })
}

// Fly to bounds when markers change
function BoundsController({ coords }) {
  const map = useMap()
  const didFit = useRef(false)
  useEffect(() => {
    if (coords.length === 0 || didFit.current) return
    if (coords.length === 1) {
      map.setView(coords[0], 14)
    } else {
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] })
    }
    didFit.current = true
  }, [coords.length])
  return null
}

async function geocodeAddress(address, town) {
  const query = [address, town].filter(Boolean).join(', ')
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
  if (!res.ok) return null
  const data = await res.json()
  if (!data.length) return null
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
}

export default function MapTab({ comps }) {
  const [points, setPoints] = useState([]) // { comp, lat, lng }
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  useEffect(() => {
    if (!comps.length) return
    let cancelled = false

    async function run() {
      setStatus('loading')
      const cache = loadCache()
      const results = []

      for (let i = 0; i < comps.length; i++) {
        if (cancelled) return
        const c = comps[i]
        const key = `${c.address}|${c.town || ''}`

        if (cache[key]) {
          results.push({ comp: c, ...cache[key] })
        } else {
          if (i > 0) await new Promise(r => setTimeout(r, RATE_DELAY))
          if (cancelled) return
          const coord = await geocodeAddress(c.address, c.town)
          if (coord) {
            cache[key] = coord
            saveCache(cache)
            results.push({ comp: c, ...coord })
          }
        }
        if (!cancelled) setProgress({ done: i + 1, total: comps.length })
      }

      if (!cancelled) {
        setPoints(results)
        setStatus('done')
      }
    }

    run()
    return () => { cancelled = true }
  }, [comps])

  const ctx = useMemo(() => buildPoolContext(comps), [comps])
  const coords = points.map(p => [p.lat, p.lng])
  const center = coords.length
    ? [coords.reduce((s, c) => s + c[0], 0) / coords.length, coords.reduce((s, c) => s + c[1], 0) / coords.length]
    : [40.7128, -74.006]

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0
  const missing = comps.length - points.length

  return (
    <div>
      <div className="sl">Location map</div>
      <h2 className={styles.title}>Comp Map</h2>
      <p className={styles.sub}>
        Addresses geocoded via OpenStreetMap. Click a marker for details.
        {status === 'loading' && ` Geocoding… ${progress.done}/${progress.total}`}
        {status === 'done' && missing > 0 && ` (${missing} address${missing > 1 ? 'es' : ''} not found)`}
      </p>

      {status === 'loading' && (
        <div className={styles.progress}>
          <div className={styles.progressBar} style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className={styles.mapWrap}>
        <MapContainer center={center} zoom={12} className={styles.map} zoomControl>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <BoundsController coords={coords} />
          {points.map(({ comp: c, lat, lng }) => {
            const s = scoreComp({
              ...c,
              psf: c.psf ?? (c.last_list_price && c.sqft ? Math.round(c.last_list_price / c.sqft) : null) ?? 999,
            }, ctx)
            const actual = (c.sold_date ? c.sold_price : null) ?? c.last_list_price ?? c.original_list_price
            const dom = c.days_on_market ?? 0
            const signal = c.sold_date ? (c.sold_price > c.original_list_price ? '▲ over ask' : '✓ closed') : dom > 0 ? `${dom}d on market` : 'active'

            return (
              <Marker key={c.id} position={[lat, lng]} icon={makeIcon(s.comp, false)}>
                <Popup className={styles.popup}>
                  <div className={styles.popupAddr}>{c.address}</div>
                  {c.town && <div className={styles.popupTown}>{c.town}</div>}
                  <div className={styles.popupGrid}>
                    <span>Price</span><span>${actual ? Math.round(actual / 1000) : '—'}K</span>
                    <span>$/SF</span><span>{c.psf ? `$${c.psf}` : '—'}</span>
                    <span>Size</span><span>{c.sqft ? `${(c.sqft / 1000).toFixed(1)}K` : '—'} sf</span>
                    <span>Score</span><span style={{ color: scoreColor(s.comp), fontWeight: 600 }}>{s.comp}</span>
                    <span>Signal</span><span>{signal}</span>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      <div className={styles.legend}>
        {[
          { color: '#2A5C42', label: 'Strong (70+)' },
          { color: '#7A9E8A', label: 'Good (50–69)' },
          { color: '#B8A87A', label: 'Average (35–49)' },
          { color: '#8B3A2A', label: 'Weak (<35)' },
        ].map(({ color, label }) => (
          <span key={label} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>

      {comps.length === 0 && (
        <p className={styles.empty}>Add comps to see them on the map.</p>
      )}
    </div>
  )
}
