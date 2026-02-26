import { useEffect, useState } from 'react'
import axios, { AxiosError } from 'axios'
import { Link } from 'react-router-dom'
import '../styles/Flood.css'
import MapView from './MapView'
import PredictionPanel from './PredictionPanel'
import type { Station, PredictionResult, StationInfo } from '../types'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'
const API = `${BACKEND_URL}/flood`

function Flood() {
  /* ===============================
     FLOOD STATES (NO EXTRA INPUTS)
  ================================ */
  const [stations, setStations] = useState<Station[]>([])
  const [selectedStation, setSelectedStation] = useState<StationInfo | null>(null)
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null)
  const [loading, setLoading] = useState(false)

  /* ===============================
     FETCH STATIONS
  ================================ */
  useEffect(() => {
    fetchStations()
  }, [])

  const fetchStations = async () => {
    try {
      const response = await axios.get(`${API}/stations`)
      setStations(response.data.stations)
    } catch (error) {
      console.error('Failed to fetch stations:', error)
      alert('Failed to load station data')
    }
  }

  /* ===============================
     FLOOD PREDICTION (Station-based)
  ================================ */
  const handlePredict = async (station: StationInfo) => {
    setSelectedStation(station)
    setLoading(true)
    setPredictionResult(null)

    try {
      // ✅ ONLY StationInfo passed
      const response = await axios.post(`${API}/predict`, station)
      setPredictionResult(response.data)
    } catch (error) {
      console.error('Prediction failed:', error)
      const axiosError = error as AxiosError<{ detail: string }>
      alert(axiosError.response?.data?.detail || 'Prediction failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const clearSelection = () => {
    setSelectedStation(null)
    setPredictionResult(null)
  }

  // Use device geolocation to get user's coords and select nearest station (no prediction)
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude
      const lon = pos.coords.longitude

      // Find nearest station by haversine distance
      if (!stations || stations.length === 0) {
        setLoading(false)
        alert('Station data not loaded yet. Please try again.')
        return
      }

      const toRad = (v: number) => (v * Math.PI) / 180
      const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371 // km
        const dLat = toRad(lat2 - lat1)
        const dLon = toRad(lon2 - lon1)
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        return R * c
      }

      let best: Station | null = null
      let bestDist = Infinity
      stations.forEach((s) => {
        const d = distanceKm(lat, lon, s.latitude, s.longitude)
        if (d < bestDist) {
          bestDist = d
          best = s
        }
      })

      if (best) {
        setSelectedStation({
          name: best.station_name || best.name || 'Nearest Station',
          latitude: best.latitude,
          longitude: best.longitude,
          state: best.state || '',
          district: best.district || '',
          basin: best.basin || '',
          river: best.river || ''
        })
      } else {
        alert('No station found nearby')
      }

      setLoading(false)
    }, (err) => {
      setLoading(false)
      alert('Unable to retrieve your location.')
    })
  }

  /* ===============================
     UI (EARTHQUAKE LAYOUT + FLOOD INPUTS)
  ================================ */
  return (
    <div className="page flood-page">
      <header className="hero hero-compact" style={{ position: 'relative', overflow: 'hidden' }}>
        <Link to="/" className="back-link" aria-label="Back to Home">
          <i className="fas fa-arrow-left"></i>
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0 }}>
            <i className="fas fa-water" style={{ marginRight: 8 }}></i>
            Flood Risk Prediction System
          </h1>
        </div>
      </header>
              Select Station from Map
      {/* SAME STRUCTURE AS EARTHQUAKE */}

            <button
              onClick={useMyLocation}
              style={{ width: '100%', marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'linear-gradient(90deg,#06b6d4,#0ea5e9)', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              <i className="fas fa-location-arrow" style={{ marginRight: 8 }}></i>
              Use My Location
            </button>
      <div
        style={{
          display: 'flex',
          gap: 20,
          alignItems: 'stretch',
          maxWidth: '100%',
          margin: '18px auto',
          paddingLeft: 20,
          paddingRight: 20
        }}
      >
        {/* MAP (LEFT) */}
        <div
          style={{
            flex: 1,
            minHeight: 620,
            borderRadius: 12,
            overflow: 'hidden',
            background: '#181f2e'
          }}
        >
          <MapView
            stations={stations}
            predictionResult={predictionResult}
            onStationClick={(station) => {
              // Convert Station to StationInfo
              const stationInfo: StationInfo = {
                name: station.name,
                latitude: station.latitude,
                longitude: station.longitude,
                state: station.state,
                district: station.district,
                basin: station.basin,
                river: station.river
              }
              handlePredict(stationInfo)
            }}
            initialCenter={[22.5, 78.0]}
            initialZoom={5.2}
            focusLocation={selectedStation ? { latitude: selectedStation.latitude, longitude: selectedStation.longitude, zoom: 8 } : null}
          />
        </div>

        {/* PANEL (RIGHT) */}
        <div style={{ width: 500, minHeight: 620 }} className="panel" aria-hidden={false}>
          <div style={{ position: 'relative', width: '100%', padding: 16, overflowY: 'scroll', maxHeight: 620 }}>
            <i
              className="fas fa-trash"
              style={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: 'var(--muted)',
                cursor: 'pointer'
              }}
              onClick={clearSelection}
              title="Clear Selection"
            ></i>

            <h3
              style={{
                color: 'var(--accent-2)',
                margin: '8px 0 12px',
                textAlign: 'center',
                fontWeight: 600
              }}
            >
              Station Information
            </h3>

            {/* FLOOD INPUTS (Station-based, NOT manual) */}
            {!selectedStation && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: 'rgba(2,6,23,0.6)',
                  border: '1px dashed rgba(148,163,184,0.2)',
                  textAlign: 'center',
                  color: 'var(--muted)'
                }}
              >
                Click a station on the map to predict flood risk.
              </div>
            )}

            {selectedStation && (
              <div
                style={{
                  marginTop: 8,
                  maxHeight: 280,
                  paddingRight: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                

                {/* Geographic Coordinates */}
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'rgba(34,197,94,0.1)',
                    border: '1px solid rgba(34,197,94,0.2)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Latitude</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--accent-2)' }}>
                      {selectedStation.latitude.toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Longitude</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--accent-2)' }}>
                      {selectedStation.longitude.toFixed(4)}
                    </div>
                  </div>
                </div>

                {/* Location Details */}
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'rgba(168,85,247,0.1)',
                    border: '1px solid rgba(168,85,247,0.2)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>State</div>
                    <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                      {selectedStation.state}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>District</div>
                    <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                      {selectedStation.district}
                    </div>
                  </div>
                </div>

                {/* Water Body Info */}
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'rgba(14,165,233,0.1)',
                    border: '1px solid rgba(14,165,233,0.2)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Basin</div>
                    <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                      {selectedStation.basin}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>River</div>
                    <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                      {selectedStation.river}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => selectedStation && handlePredict(selectedStation)}
              disabled={!selectedStation || loading}
              style={{ width: '100%', marginTop: 16 }}
              className="primary"
            >
              <i className="fas fa-map-marked-alt" style={{ marginRight: 8 }}></i>
              {loading ? 'Predicting...' : selectedStation ? `Predict for ${selectedStation.name || 'Selected Station'}` : 'Select Station from Map'}
            </button>

            {loading && (
              <div style={{ marginTop: 12, textAlign: 'center', color: 'var(--muted)' }}>
                Predicting flood risk...
              </div>
            )}

            {predictionResult && (
              <>
                <div
                  style={{
                    marginTop: 12,
                    padding: 10,
                    borderRadius: 8,
                    background: 'rgba(2,6,23,0.6)',
                    border: '1px solid rgba(34,197,94,0.12)',
                    fontWeight: 700,
                    textAlign: 'center'
                  }}
                >
                  Status: {predictionResult.status}
                </div>
                {predictionResult && (
                  <div style={{ marginTop: 16 }}>
                    <PredictionPanel result={predictionResult} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Flood
