import React, { useState, useEffect } from 'react';

/* ---------- GLOBAL DECLARATION ---------- */
declare global {
  interface Window {
    windyInit: (options: any, callback: (api: any) => void) => void;
  }
}

export const WindMap: React.FC = () => {
  const [windyReady, setWindyReady] = useState<boolean>(false);

  // Initialize Windy Map
  useEffect(() => {
    const loadWindyScript = () => {
      if (window.windyInit) {
        initWindyMap();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://tiles.windy.com/initMap.js';
      script.async = true;
      script.onload = () => {
        if (window.windyInit) {
          initWindyMap();
        }
      };
      document.body.appendChild(script);
    };

    const initWindyMap = () => {
      const windyInit = window.windyInit;
      if (!windyInit) return;

      const options = {
        key: import.meta.env.VITE_WINDY_API_KEY || 'vv98ds5fcZCEgojbac9apTfHPxhAAz6p',
        lat: 20,
        lon: 70,
        zoom: 4,
        level: 'surface',
        overlay: 'wind',
        product: 'gfs',
        side: 'right',
      };

      windyInit(options, (windyAPI: any) => {
        const { map } = windyAPI;
        setWindyReady(true);
      });
    };

    loadWindyScript();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card">
        <h2>Wind Map - Real-time Weather Visualization</h2>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--text-dark)',
            marginBottom: '1rem',
          }}
        >
          Interactive wind speed and weather conditions from Windy API. Use this
          to understand atmospheric conditions for cyclone tracking and
          analysis.
        </p>

        <div className="wind-info-grid">
          <div className="info-box">
            <span className="info-icon">🌬️</span>
            <p>
              <strong>Wind Overlay</strong>
            </p>
            <p className="info-text">Wind speed & direction vectors</p>
          </div>
          <div className="info-box">
            <span className="info-icon">🌡️</span>
            <p>
              <strong>Temperature</strong>
            </p>
            <p className="info-text">Color-coded temperature gradient</p>
          </div>
          <div className="info-box">
            <span className="info-icon">💨</span>
            <p>
              <strong>Multiple Models</strong>
            </p>
            <p className="info-text">GFS, ECMWF, NAM, HRRR, ICON</p>
          </div>
          <div className="info-box">
            <span className="info-icon">📱</span>
            <p>
              <strong>Interactive</strong>
            </p>
            <p className="info-text">Pan, zoom, time scrub</p>
          </div>
        </div>

        <div
          id="windy-map"
          style={{
            width: '100%',
            height: '600px',
            borderRadius: '0.5rem',
            border: '1px solid var(--border-color)',
            backgroundColor: '#f0f0f0',
            marginTop: '1.5rem',
          }}
        >
          {!windyReady && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-dark)',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>
                Loading wind map...
              </p>
              <p style={{ fontSize: '0.875rem', color: '#666' }}>
                Get your free API key at{' '}
                <a
                  href="https://windy.com/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--primary-color)',
                    textDecoration: 'none',
                    fontWeight: '600',
                  }}
                >
                  windy.com/settings/api
                </a>
              </p>
              <p
                style={{
                  fontSize: '0.75rem',
                  color: '#999',
                  maxWidth: '300px',
                  textAlign: 'center',
                }}
              >
                Then add your key to TrackPredictor.jsx or WindMap.jsx (find
                "YOUR_WINDY_API_KEY")
              </p>
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#f0f4f8',
            borderRadius: '0.375rem',
            borderLeft: '4px solid var(--primary-color)',
          }}
        >
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-dark)',
              margin: '0 0 0.5rem 0',
            }}
          >
            <strong>💡 Tip:</strong> Use this wind map alongside the Track
            Predictor to validate cyclone movements against actual wind
            patterns.
          </p>
          <p
            style={{
              fontSize: '0.75rem',
              color: '#666',
              margin: '0',
            }}
          >
            The map shows real-time weather data with 15-30 minute latency.
            Switch between different overlays (wind, temperature, humidity,
            pressure) and forecast models (GFS, ECMWF, NAM) to analyze
            atmospheric conditions.
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="card">
        <h3>Available Features</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#f9fafb',
              borderRadius: '0.375rem',
              border: '1px solid var(--border-color)',
            }}
          >
            <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
              Weather Overlays
            </p>
            <ul
              style={{
                fontSize: '0.875rem',
                listStyle: 'none',
                padding: 0,
                margin: 0,
              }}
            >
              <li>✓ Wind</li>
              <li>✓ Temperature</li>
              <li>✓ Humidity</li>
              <li>✓ Pressure</li>
              <li>✓ Rainfall</li>
              <li>✓ Clouds & Waves</li>
            </ul>
          </div>
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#f9fafb',
              borderRadius: '0.375rem',
              border: '1px solid var(--border-color)',
            }}
          >
            <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
              Forecast Models
            </p>
            <ul
              style={{
                fontSize: '0.875rem',
                listStyle: 'none',
                padding: 0,
                margin: 0,
              }}
            >
              <li>✓ GFS (16 days)</li>
              <li>✓ ECMWF (10 days)</li>
              <li>✓ NAM</li>
              <li>✓ HRRR</li>
              <li>✓ ICON</li>
            </ul>
          </div>
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#f9fafb',
              borderRadius: '0.375rem',
              border: '1px solid var(--border-color)',
            }}
          >
            <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
              Interactions
            </p>
            <ul
              style={{
                fontSize: '0.875rem',
                listStyle: 'none',
                padding: 0,
                margin: 0,
              }}
            >
              <li>✓ Pan (drag)</li>
              <li>✓ Zoom (scroll)</li>
              <li>✓ Time scrub</li>
              <li>✓ Overlay switch</li>
              <li>✓ Model select</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="card">
        <h3>Quick Setup</h3>
        <ol
          style={{
            fontSize: '0.875rem',
            color: 'var(--text-dark)',
            paddingLeft: '1.5rem',
          }}
        >
          <li style={{ marginBottom: '0.75rem' }}>
            <strong>Get API Key:</strong> Visit{' '}
            <a
              href="https://windy.com/settings/api"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--primary-color)',
                textDecoration: 'none',
              }}
            >
              windy.com/settings/api
            </a>{' '}
            (free)
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong>Find the Key:</strong> Open{' '}
            <code
              style={{
                backgroundColor: '#f0f0f0',
                padding: '2px 4px',
                borderRadius: '2px',
              }}
            >
              frontend/src/components/WindMap.jsx
            </code>
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong>Replace Placeholder:</strong> Change{' '}
            <code
              style={{
                backgroundColor: '#f0f0f0',
                padding: '2px 4px',
                borderRadius: '2px',
              }}
            >
              YOUR_WINDY_API_KEY
            </code>{' '}
            to your actual key
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong>Save & Reload:</strong> Save the file and refresh your
            browser
          </li>
          <li>
            <strong>Enjoy:</strong> Interactive wind map will display!
          </li>
        </ol>
      </div>
    </div>
  );
};
