import { useEffect, useState, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Link } from 'react-router-dom'
import '../styles/landslide.css'

function Earthquake() {
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [depth, setDepth] = useState('')
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const marker = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      const map = L.map(mapRef.current).setView([20, 0], 2)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map)

      map.on('click', (e: L.LeafletMouseEvent) => {
        const lat = e.latlng.lat.toFixed(5)
        const lng = e.latlng.lng.toFixed(5)
        setLatitude(lat)
        setLongitude(lng)
        placeMarker(lat, lng, map)
      })

      mapInstance.current = map
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  const placeMarker = (lat: string, lng: string, map?: L.Map) => {
    const m = map || mapInstance.current
    if (!m) return
    if (marker.current) {
      marker.current.setLatLng([parseFloat(lat), parseFloat(lng)])
    } else {
      marker.current = L.marker([parseFloat(lat), parseFloat(lng)]).addTo(m)
    }
    m.setView([parseFloat(lat), parseFloat(lng)], 6)
  }

  const updateMarkerFromInput = () => {
    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)
    if (isNaN(lat) || isNaN(lng)) {
      alert("Please enter valid latitude and longitude")
      return
    }
    placeMarker(lat.toString(), lng.toString())
  }

  const predict = async () => {
    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)
    const dep = parseFloat(depth)
    const yr = parseInt(year)
    const mnth = parseInt(month)

    if (isNaN(lat) || lat < -90 || lat > 90) {
      alert("Please enter a valid latitude (-90 to 90).")
      return
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      alert("Please enter a valid longitude (-180 to 180).")
      return
    }
    if (isNaN(dep) || dep < 0) {
      alert("Please enter a valid depth (>= 0).")
      return
    } 
    if (isNaN(mnth) || mnth < 1 || mnth > 12) {
      alert("Please select a valid month.")
      return
    }

    setLoading(true)
    setResult('')

    try {
      const response = await fetch('http://localhost:8080/earthquake/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng, depth: dep, year: yr, month: mnth })
      })
      const data = await response.json()
      if (data.error) {
        setResult(`Error: ${data.error}`)
      } else {
        setResult(`Risk Level: ${data.risk_level}`)
      }
    } catch (error) {
      setResult('Error: Unable to connect to server.')
    } finally {
      setLoading(false)
    }
  }

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude.toString()
        const lng = position.coords.longitude.toString()
        setLatitude(lat)
        setLongitude(lng)
        placeMarker(lat, lng)
      }, () => {
        alert('Unable to retrieve your location.')
      })
    } else {
      alert('Geolocation is not supported by this browser.')
    }
  }

  const clearInputs = () => {
    setLatitude('')
    setLongitude('')
    setDepth('')
    setYear('')
    setMonth('')
    setResult('')
    if (marker.current) {
      mapInstance.current?.removeLayer(marker.current)
      marker.current = null
    }
  }

  return (
    <div className="page">
      <header className="hero hero-compact" style={{ position: 'relative', overflow: 'hidden' }}>
        <Link to="/" className="back-link" aria-label="Back to Home">
          <i className="fas fa-arrow-left"></i>
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0 }}>
            <i className="fas fa-globe" style={{ marginRight: 8 }}></i>
            Earthquake Risk Prediction System
          </h1>
        </div>
      </header>

      <div style={{ display: 'flex', gap: 20, alignItems: 'stretch', maxWidth: '100%', margin: '18px auto', paddingLeft: 20, paddingRight: 20 }}>
        <div id="map" ref={mapRef} style={{ flex: 1, minHeight: 620, borderRadius: 12, overflow: 'hidden' }} />

        <div style={{ width: 500, minHeight: 620 }} className="panel" aria-hidden={false}>
          <div style={{ position: 'relative', width: '100%' }}>
            <i className="fas fa-trash" style={{ position: 'absolute', right: 8, top: 8, color: 'var(--muted)', cursor: 'pointer' }} onClick={clearInputs} title="Clear All"></i>
            <h3 style={{ color: 'var(--accent-2)', margin: '8px 0 12px', textAlign: 'center', fontWeight: 600 }}>Location Input</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>
                  <i className="fas fa-map-marker-alt" style={{ marginRight: 6, color: '#ef4444' }}></i> Latitude
                </label>
                <input type="number" step="0.00001" placeholder="e.g., 37.7749" value={latitude} onChange={(e) => setLatitude(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(148,163,184,0.08)', background: 'rgba(17,24,39,0.6)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>
                  <i className="fas fa-map-marker-alt" style={{ marginRight: 6, color: '#ef4444' }}></i> Longitude
                </label>
                <input type="number" step="0.00001" placeholder="e.g., -122.4194" value={longitude} onChange={(e) => setLongitude(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(148,163,184,0.08)', background: 'rgba(17,24,39,0.6)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>
                  <i className="fas fa-ruler-vertical" style={{ marginRight: 6, color: '#3b82f6' }}></i> Depth (km)
                </label>
                <input type="number" step="0.1" placeholder="e.g., 10.0" value={depth} onChange={(e) => setDepth(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(148,163,184,0.08)', background: 'rgba(17,24,39,0.6)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>
                  <i className="fas fa-calendar" style={{ marginRight: 6, color: '#10b981' }}></i> Year
                </label>
                <input type="number" placeholder="e.g., 2027" value={year} onChange={(e) => setYear(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(148,163,184,0.08)', background: 'rgba(17,24,39,0.6)', color: 'var(--text)' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>
                  <i className="fas fa-calendar-alt" style={{ marginRight: 6, color: '#f97316' }}></i> Month
                </label>
                <select value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(148,163,184,0.08)', background: 'rgba(17,24,39,0.6)', color: 'var(--text)' }}>
                  <option value="">Select Month</option>
                  <option value="1">January</option>
                  <option value="2">February</option>
                  <option value="3">March</option>
                  <option value="4">April</option>
                  <option value="5">May</option>
                  <option value="6">June</option>
                  <option value="7">July</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={updateMarkerFromInput} style={{ flex: 1 }} className="primary"><i className="fas fa-crosshairs" style={{ marginRight: 8 }}></i> Update</button>
              <button onClick={getLocation} style={{ padding: '8px 10px', borderRadius: 8, background: 'linear-gradient(90deg,#10b981,#059669)', color: '#fff', border: 'none', cursor: 'pointer' }}><i className="fas fa-location-arrow"></i></button>
            </div>

            <button onClick={predict} disabled={loading} style={{ width: '100%', marginTop: 10 }} className="primary"><i className="fas fa-brain" style={{ marginRight: 8 }}></i>{loading ? 'Predicting...' : 'Predict Risk'}</button>

            {result && (
              <div style={{ marginTop: 12, padding: 10, background: 'rgba(2,6,23,0.6)', border: '1px solid rgba(34,197,94,0.12)', borderRadius: 8, color: 'var(--accent-2)', fontWeight: 700, textAlign: 'center' }}>
                {result}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Earthquake