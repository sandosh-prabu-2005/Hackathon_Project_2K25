import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import '../styles/landslide.css'

function Landslide() {
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('Choose .h5 file')
  const [loading, setLoading] = useState(false)
  const [risk, setRisk] = useState('--')
  const [riskLevel, setRiskLevel] = useState('')
  const [riskPercent, setRiskPercent] = useState(0)
  const [rgbSrc, setRgbSrc] = useState('')
  const [maskSrc, setMaskSrc] = useState('')
  const [overlaySrc, setOverlaySrc] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(h5|hdf5)$/i)) {
        alert('Please select a .h5 or .hdf5 file')
        e.target.value = ''
        return
      }
      setFile(selectedFile)
      setFileName(selectedFile.name)
    } else {
      setFile(null)
      setFileName('Choose .h5 file')
    }
  }

  const predict = async () => {
    if (!file) {
      alert('Upload .h5 file first!')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('http://localhost:8080/predict_all', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        alert('Prediction failed: ' + (data.error || 'Unknown error'))
        return
      }

      setRisk(`${data.risk_percent}% (${data.risk_level})`)
      setRiskLevel(data.risk_level.toLowerCase())
      setRiskPercent(data.risk_percent)

      setRgbSrc('data:image/png;base64,' + data.rgb_png)
      setMaskSrc('data:image/png;base64,' + data.mask_png)
      setOverlaySrc('data:image/png;base64,' + data.overlay_png)

    } catch (err) {
      alert('Prediction failed: ' + (err as Error)?.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const resetUI = () => {
    setFile(null)
    setFileName('Choose .h5 file')
    if (fileInputRef.current) fileInputRef.current.value = ''
    setRisk('--')
    setRiskLevel('')
    setRiskPercent(0)
    setRgbSrc('')
    setMaskSrc('')
    setOverlaySrc('')
  }

  const downloadImage = (src: string, filename: string) => {
    const link = document.createElement('a')
    link.href = src
    link.download = filename
    link.click()
  }

  return (
    <div className="page">
      <header className="hero hero-compact" style={{ position: 'relative', overflow: 'hidden' }}>
        <Link to="/" className="back-link" aria-label="Back to Home">
          <i className="fas fa-arrow-left"></i>
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0 }}>
            <i className="fas fa-mountain" style={{ marginRight: 8 }}></i>
            Landslide Risk Prediction System
          </h1>
        </div>
      </header>

      <div className="panel" style={{ maxWidth: 900, margin: '20px auto' }}>
        <div>
          <p className="eyebrow">Geospatial AI • Disaster Intelligence</p>
          <h2 style={{ margin: '6px 0 12px' }}><i className="fas fa-brain" style={{ marginRight: 8 }}></i> AI-Powered Landslide Detection</h2>
          <p className="sub">Advanced machine learning for landslide risk assessment using satellite imagery and geospatial data.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge"><span className="dot"></span></span>
          <span className="sub" style={{ fontSize: 14 }}>Model: ResNet18</span>
        </div>
      </div>

      <section className="panel" style={{ maxWidth: 900, margin: '0 auto 24px', alignItems: 'flex-start' }}>
        <div className="controls">
          <label className="file-input">
            <input
              ref={fileInputRef}
              type="file"
              accept=".h5,.hdf5"
              onChange={handleFileChange}
            />
            <span>{fileName}</span>
          </label>

          <div className="btn-group">
            <button onClick={predict} disabled={loading} className="primary">
              <i className="fas fa-brain" style={{ marginRight: 8 }}></i> {loading ? 'Running Prediction...' : 'Run Prediction'}
            </button>
            <button onClick={resetUI} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.12)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
              <i className="fas fa-undo" style={{ marginRight: 8 }}></i> Reset
            </button>
          </div>
        </div>

        <div className="risk-card">
          <div className="risk-label">Overall Risk</div>
          <div className="risk-value">Risk: {risk}</div>
          <div className={`pill`}>
            {riskLevel ? `${riskLevel} • ${riskPercent}%` : '--'}
          </div>
          <div className="progress-bar" aria-hidden>
            <span style={{ width: `${riskPercent}%` }}></span>
          </div>
        </div>
      </section>

      <section className="grid" style={{ maxWidth: 1100, margin: '0 auto 40px' }}>
        <div className="card">
          <div className="card-head">
            <h3 style={{ margin: 0 }}>RGB Input</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="pill">Preview</span>
              {rgbSrc && (
                <a onClick={() => downloadImage(rgbSrc, 'rgb.png')} style={{ color: 'var(--accent-2)', textDecoration: 'none' }}>
                  <i className="fas fa-download" style={{ color: 'var(--success)', marginRight: 6 }}></i>Download
                </a>
              )}
            </div>
          </div>
          <div className="img-wrap">
            {rgbSrc ? <img src={rgbSrc} alt="RGB input preview" /> : null}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3 style={{ margin: 0 }}>Predicted Mask</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="pill">Binary</span>
              {maskSrc && (
                <a onClick={() => downloadImage(maskSrc, 'mask.png')} style={{ color: 'var(--accent-2)', textDecoration: 'none' }}>
                  <i className="fas fa-download" style={{ color: 'var(--success)', marginRight: 6 }}></i>Download
                </a>
              )}
            </div>
          </div>
          <div className="img-wrap">
            {maskSrc ? <img src={maskSrc} alt="Predicted mask" /> : null}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3 style={{ margin: 0 }}>Overlay Output</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="pill">Combined</span>
              {overlaySrc && (
                <a onClick={() => downloadImage(overlaySrc, 'overlay.png')} style={{ color: 'var(--accent-2)', textDecoration: 'none' }}>
                  <i className="fas fa-download" style={{ color: 'var(--success)', marginRight: 6 }}></i>Download
                </a>
              )}
            </div>
          </div>
          <div className="img-wrap">
            {overlaySrc ? <img src={overlaySrc} alt="Overlay output" /> : null}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Landslide