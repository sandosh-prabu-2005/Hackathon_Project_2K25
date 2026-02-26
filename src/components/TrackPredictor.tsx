import React, { useState, useEffect } from 'react';
import { trackApi } from '../api/client';
import { MapVisualization } from './MapVisualization';

export const TrackPredictor = () => {
  const [coordinates, setCoordinates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [numSteps, setNumSteps] = useState(3);
  const [stormSpeed, setStormSpeed] = useState(15);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [currentLat, setCurrentLat] = useState('');
  const [currentLon, setCurrentLon] = useState('');
  const [savedPaths, setSavedPaths] = useState([]);
  const [pathName, setPathName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  // Load saved paths from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cyclone_saved_paths');
    if (saved) {
      setSavedPaths(JSON.parse(saved));
    }
  }, []);

  // Save paths to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('cyclone_saved_paths', JSON.stringify(savedPaths));
  }, [savedPaths]);

  const validateCoordinate = (lat, lon) => {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    
    if (isNaN(latNum) || isNaN(lonNum)) {
      return { valid: false, message: 'Please enter valid numbers' };
    }
    if (latNum < -90 || latNum > 90) {
      return { valid: false, message: 'Latitude must be between -90 and 90' };
    }
    if (lonNum < -180 || lonNum > 180) {
      return { valid: false, message: 'Longitude must be between -180 and 180' };
    }
    return { valid: true };
  };

  const addCoordinate = () => {
    if (currentLat && currentLon) {
      const validation = validateCoordinate(currentLat, currentLon);
      if (!validation.valid) {
        setError(validation.message);
        return;
      }
      
      const lat = parseFloat(currentLat);
      const lon = parseFloat(currentLon);
      
      setCoordinates([...coordinates, { latitude: lat, longitude: lon }]);
      setCurrentLat('');
      setCurrentLon('');
      setError(null);
    }
  };

  const useMyLocation = () => {
    setGeoLoading(true);
    setError(null);
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setGeoLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLat(position.coords.latitude.toFixed(4));
        setCurrentLon(position.coords.longitude.toFixed(4));
        setGeoLoading(false);
      },
      (err) => {
        setError(`Geolocation error: ${err.message}`);
        setGeoLoading(false);
      }
    );
  };

  const savePath = () => {
    if (!pathName.trim()) {
      setError('Please enter a name for this path');
      return;
    }

    if (coordinates.length < 3) {
      setError('At least 3 coordinates required to save');
      return;
    }

    const newPath = {
      id: Date.now(),
      name: pathName,
      coordinates,
      timestamp: new Date().toLocaleString(),
    };

    setSavedPaths([...savedPaths, newPath]);
    setPathName('');
    setShowSaveDialog(false);
    setError(null);
  };

  const loadPath = (path) => {
    setCoordinates(path.coordinates);
    setError(null);
  };

  const deletePath = (id) => {
    setSavedPaths(savedPaths.filter(p => p.id !== id));
  };

  const clearAll = () => {
    setCoordinates([]);
    setCurrentLat('');
    setCurrentLon('');
    setResult(null);
    setError(null);
  };

  const removeCoordinate = (index) => {
    setCoordinates(coordinates.filter((_, i) => i !== index));
  };

  const handlePredict = async () => {
    if (coordinates.length < 3) {
      setError('At least 3 coordinate points required');
      return;
    }

    if (!month || month < 1 || month > 12) {
      setError('Please select a valid month (1-12)');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await trackApi.predict(coordinates, numSteps, stormSpeed, month);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card">
        <h2>Cyclone Track Predictor</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-dark)', marginBottom: '1rem' }}>
          Enter historical cyclone positions to predict future track. Minimum 3 coordinate points required. View the Wind Map tab for atmospheric context.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={useMyLocation}
              disabled={geoLoading}
              className="btn-primary"
              style={{ flex: '1', minWidth: '150px' }}
              title="Get current location from device"
            >
              📍 {geoLoading ? 'Getting Location...' : 'Use My Location'}
            </button>
            <button
              onClick={() => setShowSaveDialog(!showSaveDialog)}
              disabled={coordinates.length < 3}
              className="btn-primary"
              style={{ flex: '1', minWidth: '150px' }}
              title="Save current path for later use"
            >
              💾 Save Path
            </button>
            <button
              onClick={clearAll}
              className="btn-danger"
              style={{ flex: '1', minWidth: '150px' }}
              title="Clear all data and start over"
            >
              🗑️ Clear All
            </button>
          </div>

          {/* Save Dialog */}
          {showSaveDialog && (
            <div className="input-group" style={{ backgroundColor: 'rgba(52, 211, 153, 0.05)', padding: '1rem', borderRadius: '0.5rem', borderLeft: '3px solid var(--success-color)' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Save this path for future use:</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="E.g., Hurricane Maria 2017"
                  value={pathName}
                  onChange={(e) => setPathName(e.target.value)}
                  className="form-input"
                  style={{ flex: 1 }}
                />
                <button onClick={savePath} className="btn-success" title="Save this path">
                  Save
                </button>
                <button onClick={() => setShowSaveDialog(false)} className="btn-danger" title="Cancel saving">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Input Form */}
          <div className="input-group">
            <p className="upload-subtext">Enter historical coordinates (at least 3 points):</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <input
                type="number"
                placeholder="Latitude"
                value={currentLat}
                onChange={(e) => setCurrentLat(e.target.value)}
                className="form-input"
                step="0.01"
              />
              <input
                type="number"
                placeholder="Longitude"
                value={currentLon}
                onChange={(e) => setCurrentLon(e.target.value)}
                className="form-input"
                step="0.01"
              />
              <button
                onClick={addCoordinate}
                className="btn-success"
              >
                Add Point
              </button>
            </div>

            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}
          </div>

          {/* Month Selection */}
          <div className="input-group">
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
               Month
            </label>
            <select
              value={month || ''}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="form-input"
              style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
            >
              <option value="">-- Select Month --</option>
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
            <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
              When did this cyclone occur?
            </p>
          </div>

          {/* Coordinates List */}
          {coordinates.length > 0 && (
            <div className="input-group">
              <p style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                Added Coordinates ({coordinates.length}):
              </p>
              <div className="coordinate-list">
                {coordinates.map((coord, index) => (
                  <div key={index} className="coordinate-item">
                    <span>
                      #{index + 1}: {coord.latitude.toFixed(4)}, {coord.longitude.toFixed(4)}
                    </span>
                    <button
                      onClick={() => removeCoordinate(index)}
                      className="btn-danger"
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Storm Parameters */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Prediction Steps */}
            <div className="input-group">
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Prediction Steps: {numSteps}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={numSteps}
                onChange={(e) => setNumSteps(parseInt(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
                Adjust the number of future steps to predict (1-10)
              </p>
            </div>

            {/* Storm Speed */}
            <div className="input-group">
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Storm Speed: {stormSpeed} knots
              </label>
              <input
                type="range"
                min="0"
                max="150"
                value={stormSpeed}
                onChange={(e) => setStormSpeed(parseFloat(e.target.value))}
                step="1"
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
                Storm forward speed (0-150 knots typical range)
              </p>
            </div>
          </div>

          {/* Predict Button */}
          <button
            onClick={handlePredict}
            disabled={coordinates.length < 3 || loading}
            className="btn-primary"
            style={{ width: '100%' }}
          >
            {loading ? 'Predicting...' : 'Predict Track'}
          </button>
        </div>
      </div>

      {/* Saved Paths */}
      {savedPaths.length > 0 && (
        <div className="card">
          <h3>📚 Saved Paths ({savedPaths.length})</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-dark)', marginBottom: '1rem' }}>
            Click "Load" to use a previously saved cyclone path, or delete to remove it.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {savedPaths.map(path => (
              <div key={path.id} className="coordinate-item" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1rem', backgroundColor: 'rgba(96, 165, 250, 0.05)', borderLeft: '3px solid var(--primary-color)' }}>
                <div style={{ width: '100%', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--primary-color)' }}>{path.name}</h4>
                  <p style={{ margin: '0', fontSize: '0.75rem', color: 'var(--text-light)' }}>
                    {path.coordinates.length} points • {path.timestamp}
                  </p>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', marginBottom: '0.75rem', maxHeight: '3em', overflow: 'auto' }}>
                  {path.coordinates.map((c, i) => (
                    <div key={i}>{i + 1}. {c.latitude.toFixed(2)}, {c.longitude.toFixed(2)}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                  <button
                    onClick={() => loadPath(path)}
                    className="btn-success"
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
                    title="Load this saved path"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => deletePath(path.id)}
                    className="btn-danger"
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
                    title="Delete this saved path"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Map Visualization - Full Width */}
          <div className="card">
            <MapVisualization
              coordinates={coordinates}
              predictedTrack={result.predicted_track}
              title="🗺️ Cyclone Track Prediction Map"
            />
          </div>

          {/* Two Column Layout for Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
            
            {/* Historical Track Details */}
            <div className="card">
              <h3 style={{ marginTop: 0, color: 'var(--primary-color)' }}>📍 Historical Track</h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {coordinates.map((coord, index) => (
                  <div key={index} style={{
                    padding: '0.75rem',
                    marginBottom: '0.5rem',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    borderLeft: '3px solid #3b82f6',
                    borderRadius: '0.375rem',
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr 2fr',
                    gap: '1rem',
                    alignItems: 'center'
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#1e40af' }}>Point {index + 1}</div>
                    <div style={{ fontSize: '0.875rem' }}>
                      <div style={{ color: '#666' }}>Latitude</div>
                      <div style={{ fontWeight: '500' }}>{coord.latitude.toFixed(4)}°</div>
                    </div>
                    <div style={{ fontSize: '0.875rem' }}>
                      <div style={{ color: '#666' }}>Longitude</div>
                      <div style={{ fontWeight: '500' }}>{coord.longitude.toFixed(4)}°</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Predicted Track Details */}
            <div className="card">
              <h3 style={{ marginTop: 0, color: '#dc2626' }}>🔴 Predicted Track</h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {result.predicted_track.map((coord, index) => (
                  <div key={index} style={{
                    padding: '0.75rem',
                    marginBottom: '0.5rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    borderLeft: '3px solid #ef4444',
                    borderRadius: '0.375rem',
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr 2fr',
                    gap: '1rem',
                    alignItems: 'center'
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#991b1b' }}>Step {index + 1}</div>
                    <div style={{ fontSize: '0.875rem' }}>
                      <div style={{ color: '#666' }}>Latitude</div>
                      <div style={{ fontWeight: '500' }}>{coord.latitude.toFixed(4)}°</div>
                    </div>
                    <div style={{ fontSize: '0.875rem' }}>
                      <div style={{ color: '#666' }}>Longitude</div>
                      <div style={{ fontWeight: '500' }}>{coord.longitude.toFixed(4)}°</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trajectory Statistics */}
          {result.trajectory_stats && (
            <div className="card">
              <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>📊 Trajectory Analysis</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div className="stat-box">
                  <p className="result-label">📏 Average Speed</p>
                  <p className="result-value">{result.trajectory_stats.average_speed?.toFixed(1) || result.trajectory_stats.avg_speed?.toFixed(1) || '—'}</p>
                  <p className="result-unit">km/h</p>
                </div>
                <div className="stat-box">
                  <p className="result-label">📉 Max Speed</p>
                  <p className="result-value">{result.trajectory_stats.max_speed?.toFixed(1) || '—'}</p>
                  <p className="result-unit">km/h</p>
                </div>
                <div className="stat-box">
                  <p className="result-label">📍 Total Distance</p>
                  <p className="result-value">{result.trajectory_stats.total_distance?.toFixed(0) || '—'}</p>
                  <p className="result-unit">km</p>
                </div>
                <div className="stat-box">
                  <p className="result-label">🧭 Direction</p>
                  <p className="result-value">{result.trajectory_stats.avg_direction?.toFixed(0) || result.trajectory_stats.direction?.toFixed(0) || '—'}</p>
                  <p className="result-unit">° from North</p>
                </div>
                <div className="stat-box">
                  <p className="result-label">↔️ Direction Variance</p>
                  <p className="result-value">{result.trajectory_stats.direction_std?.toFixed(1) || '—'}</p>
                  <p className="result-unit">std (degrees)</p>
                </div>
                <div className="stat-box">
                  <p className="result-label">🔢 Data Points</p>
                  <p className="result-value">{result.trajectory_stats.num_points || coordinates.length}</p>
                  <p className="result-unit">positions</p>
                </div>
              </div>
            </div>
          )}

          {/* Export/Download Section */}
          <div className="card" style={{ backgroundColor: 'rgba(52, 211, 153, 0.05)', borderLeft: '4px solid var(--success-color)' }}>
            <h4 style={{ marginTop: 0, color: 'var(--success-color)' }}>💾 Export Results</h4>
            <button
              onClick={() => {
                const csvData = [
                  ['Type', 'Step', 'Latitude', 'Longitude'],
                  ...coordinates.map((c, i) => ['Historical', i + 1, c.latitude.toFixed(4), c.longitude.toFixed(4)]),
                  ...result.predicted_track.map((c) => ['Predicted', c.step, c.latitude.toFixed(4), c.longitude.toFixed(4)])
                ].map(row => row.join(',')).join('\n');
                
                const element = document.createElement('a');
                element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvData));
                element.setAttribute('download', `cyclone-track-${new Date().getTime()}.csv`);
                element.style.display = 'none';
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
              }}
              className="btn-success"
              style={{ width: '100%' }}
            >
              📥 Download as CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
};
