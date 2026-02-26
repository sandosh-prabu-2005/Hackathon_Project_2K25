import React, { useState, useEffect } from 'react';
import { trackApi } from '../api/client';
import { MapVisualization } from './MapVisualization';

export const EnhancedTrackPredictor = () => {
  const [coordinates, setCoordinates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [numSteps, setNumSteps] = useState(5);
  const [currentLat, setCurrentLat] = useState('');
  const [currentLon, setCurrentLon] = useState('');
  const [savedPaths, setSavedPaths] = useState([]);
  const [pathName, setPathName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('input');

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
    setActiveTab('input');
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

    setLoading(true);
    setError(null);
    try {
      console.log('Sending prediction request with coordinates:', coordinates, 'steps:', numSteps);
      const response = await trackApi.predict(coordinates, numSteps);
      console.log('Full API Response:', response);
      console.log('Response type:', typeof response);
      console.log('Has predicted_track:', !!response?.predicted_track);
      console.log('Has predicted_points:', !!response?.predicted_points);
      
      if (!response) {
        setError('Empty response from server');
        return;
      }
      
      setResult(response);
      console.log('Result state set to:', response);
      
      // Force tab switch after state update
      setTimeout(() => setActiveTab('results'), 100);
    } catch (err) {
      console.error('Prediction error:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError(err instanceof Error ? err.message : 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!result) return;
    
    const csvData = [
      ['Type', 'Step', 'Latitude', 'Longitude', 'Confidence'],
      ...coordinates.map((c, i) => ['Historical', i + 1, c.latitude.toFixed(4), c.longitude.toFixed(4), '100%']),
      ...result.predicted_track.map((c) => ['Predicted', c.step, c.latitude.toFixed(4), c.longitude.toFixed(4), `${Math.round(c.confidence * 100)}%`])
    ].map(row => row.join(',')).join('\n');
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvData));
    element.setAttribute('download', `cyclone-track-${new Date().getTime()}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '2rem 0' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '3rem 2rem',
        textAlign: 'center',
        marginBottom: '2rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem', fontWeight: '700' }}>🌪️ Cyclone Track Predictor</h1>
        <p style={{ margin: 0, fontSize: '1.1rem', opacity: 0.9 }}>
          Advanced CNN-GRU Model for Storm Path Forecasting
        </p>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1rem' }}>
        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
          borderBottom: '2px solid #e2e8f0',
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'input', label: '📝 Input Data', icon: '📝' },
            { id: 'results', label: '📊 Results', icon: '📊', disabled: !result },
            { id: 'saved', label: '💾 Saved Paths', icon: '💾', badge: savedPaths.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              style={{
                padding: '1rem 1.5rem',
                border: 'none',
                background: activeTab === tab.id ? '#667eea' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#64748b',
                fontSize: '1rem',
                fontWeight: activeTab === tab.id ? '600' : '500',
                cursor: tab.disabled ? 'not-allowed' : 'pointer',
                borderRadius: '0.5rem 0.5rem 0 0',
                opacity: tab.disabled ? 0.5 : 1,
                position: 'relative',
                transition: 'all 0.3s ease'
              }}
            >
              {tab.label}
              {tab.badge && (
                <span style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '10px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Input Tab */}
        {activeTab === 'input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Quick Actions */}
            <div className="card" style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ marginTop: 0, color: '#1e293b', marginBottom: '1rem' }}>⚡ Quick Actions</h3>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={useMyLocation}
                  disabled={geoLoading}
                  style={{
                    flex: '1',
                    minWidth: '150px',
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                    opacity: geoLoading ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => (e.target as HTMLButtonElement).style.transform = 'translateY(0)'}
                >
                  📍 {geoLoading ? 'Getting Location...' : 'Use My Location'}
                </button>
                <button
                  onClick={() => setShowSaveDialog(!showSaveDialog)}
                  disabled={coordinates.length < 3}
                  style={{
                    flex: '1',
                    minWidth: '150px',
                    padding: '0.75rem 1.5rem',
                    background: coordinates.length >= 3 ? 'linear-gradient(135deg, #34d399 0%, #10b981 100%)' : '#d1d5db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: coordinates.length >= 3 ? 'pointer' : 'not-allowed',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: coordinates.length >= 3 ? '0 4px 12px rgba(16, 185, 129, 0.4)' : 'none'
                  }}
                  onMouseEnter={(e) => coordinates.length >= 3 && ((e.target as HTMLButtonElement).style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.transform = 'translateY(0)'}
                >
                  💾 Save Path
                </button>
                <button
                  onClick={clearAll}
                  style={{
                    flex: '1',
                    minWidth: '150px',
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                  }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.transform = 'translateY(0)'}
                >
                  🗑️ Clear All
                </button>
              </div>
            </div>

            {/* Save Dialog */}
            {showSaveDialog && (
              <div className="card" style={{
                background: '#f0fdf4',
                padding: '1.5rem',
                borderRadius: '0.75rem',
                borderLeft: '4px solid #10b981',
                border: '1px solid #d1fae5'
              }}>
                <p style={{ marginTop: 0, fontSize: '0.875rem', fontWeight: '600', color: '#047857' }}>
                  Save this path for future use:
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="E.g., Hurricane Maria 2017"
                    value={pathName}
                    onChange={(e) => setPathName(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid #d1e7dd',
                      borderRadius: '0.375rem',
                      fontSize: '1rem'
                    }}
                  />
                  <button onClick={savePath} style={{
                    padding: '0.75rem 1.5rem',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}>Save</button>
                  <button onClick={() => setShowSaveDialog(false)} style={{
                    padding: '0.75rem 1.5rem',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Input Form */}
            <div className="card" style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ marginTop: 0, color: '#1e293b', marginBottom: '1rem' }}>📍 Enter Coordinates</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                <input
                  type="number"
                  placeholder="Latitude"
                  value={currentLat}
                  onChange={(e) => setCurrentLat(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    fontFamily: 'monospace'
                  }}
                  step="0.01"
                />
                <input
                  type="number"
                  placeholder="Longitude"
                  value={currentLon}
                  onChange={(e) => setCurrentLon(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    fontFamily: 'monospace'
                  }}
                  step="0.01"
                />
                <button
                  onClick={addCoordinate}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.background = '#5568d3'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.background = '#667eea'}
                >
                  ➕ Add Point
                </button>
              </div>

              {error && (
                <div style={{
                  padding: '1rem',
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.375rem',
                  color: '#991b1b',
                  marginBottom: '1rem'
                }}>
                  ⚠️ {error}
                </div>
              )}
            </div>

            {/* Coordinates List */}
            {coordinates.length > 0 && (
              <div className="card" style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '0.75rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ marginTop: 0, color: '#1e293b', marginBottom: '1rem' }}>
                  📌 Added Coordinates ({coordinates.length})
                </h3>
                <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                  {coordinates.map((coord, index) => (
                    <div key={index} style={{
                      padding: '0.75rem',
                      background: '#f1f5f9',
                      borderLeft: '3px solid #667eea',
                      borderRadius: '0.375rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        <strong>#{index + 1}</strong> {coord.latitude.toFixed(4)}°, {coord.longitude.toFixed(4)}°
                      </span>
                      <button
                        onClick={() => removeCoordinate(index)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prediction Steps */}
            <div className="card" style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0'
            }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1e293b' }}>
                🔮 Prediction Steps: <span style={{ color: '#667eea', fontSize: '1.25rem' }}>{numSteps}</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={numSteps}
                onChange={(e) => setNumSteps(parseInt(e.target.value))}
                style={{ width: '100%', height: '8px', borderRadius: '4px' }}
              />
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', margin: '0.5rem 0 0 0' }}>
                Predict 1-10 future steps (each ~6-12 hours in cyclone tracking)
              </p>
            </div>

            {/* Predict Button */}
            <button
              onClick={handlePredict}
              disabled={coordinates.length < 3 || loading}
              style={{
                width: '100%',
                padding: '1.25rem',
                background: coordinates.length >= 3 && !loading 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                fontSize: '1.125rem',
                fontWeight: '700',
                cursor: coordinates.length >= 3 && !loading ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s',
                boxShadow: coordinates.length >= 3 && !loading ? '0 8px 20px rgba(102, 126, 234, 0.4)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (coordinates.length >= 3 && !loading) {
                  (e.target as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.target as HTMLElement).style.boxShadow = '0 12px 30px rgba(102, 126, 234, 0.6)';
                }
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.transform = 'translateY(0)';
                (e.target as HTMLElement).style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)';
              }}
            >
              {loading ? '⏳ Predicting...' : '🚀 Predict Track'}
            </button>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div>
            {!result ? (
              <div className="card" style={{
                background: 'white',
                padding: '3rem',
                borderRadius: '0.75rem',
                textAlign: 'center',
                color: '#64748b',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                border: '1px solid #e2e8f0'
              }}>
                <p style={{ fontSize: '1.125rem', fontWeight: '600', margin: '0 0 0.5rem 0' }}>
                  {error ? '❌ Prediction Failed' : '📊 No predictions yet'}
                </p>
                {error && (
                  <div style={{
                    padding: '1rem',
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: '0.375rem',
                    color: '#991b1b',
                    marginTop: '1rem',
                    textAlign: 'left'
                  }}>
                    ⚠️ {error}
                  </div>
                )}
                <p style={{ margin: '1rem 0 0 0', fontSize: '0.875rem' }}>
                  Use the input panel to enter coordinates and make a prediction.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Map */}
                <div className="card" style={{
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  border: '1px solid #e2e8f0'
                }}>
                  <MapVisualization
                    coordinates={coordinates}
                    predictedTrack={result?.predicted_track || result?.predicted_points || []}
                    title="🗺️ Cyclone Track Visualization"
                  />
                </div>

                {/* Model Info */}
                <div className="card" style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                    <div>
                      <p style={{ margin: '0 0 0.25rem 0', opacity: 0.9, fontSize: '0.875rem' }}>Model</p>
                      <p style={{ margin: 0, fontWeight: '700', fontSize: '1.125rem' }}>{result?.model || 'CNN-GRU'}</p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 0.25rem 0', opacity: 0.9, fontSize: '0.875rem' }}>Confidence</p>
                      <p style={{ margin: 0, fontWeight: '700', fontSize: '1.125rem' }}>{Math.round((result?.confidence || 0.85) * 100)}%</p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 0.25rem 0', opacity: 0.9, fontSize: '0.875rem' }}>Features</p>
                      <p style={{ margin: 0, fontWeight: '700', fontSize: '1.125rem' }}>{result?.features_used || 15}</p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 0.25rem 0', opacity: 0.9, fontSize: '0.875rem' }}>Historical</p>
                      <p style={{ margin: 0, fontWeight: '700', fontSize: '1.125rem' }}>{result?.historical_points?.length || coordinates.length}</p>
                    </div>
                  </div>
                </div>

                {/* Dual Column Results */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  {/* Historical */}
                  <div className="card" style={{
                    background: 'white',
                    padding: '1.5rem',
                    borderRadius: '0.75rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    border: '2px solid #3b82f6'
                  }}>
                    <h3 style={{ marginTop: 0, color: '#1e40af', marginBottom: '1rem' }}>📍 Historical Track</h3>
                    <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {coordinates.map((coord, index) => (
                        <div key={index} style={{
                          padding: '0.75rem',
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '0.375rem',
                          display: 'grid',
                          gridTemplateColumns: '40px 1fr'
                        }}>
                          <div style={{ fontWeight: '700', color: '#1e40af', fontSize: '0.875rem' }}>#{index + 1}</div>
                          <div style={{ fontSize: '0.75rem', color: '#1e40af' }}>
                            <div>{coord.latitude.toFixed(4)}°</div>
                            <div>{coord.longitude.toFixed(4)}°</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Predicted */}
                  <div className="card" style={{
                    background: 'white',
                    padding: '1.5rem',
                    borderRadius: '0.75rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    border: '2px solid #ef4444'
                  }}>
                    <h3 style={{ marginTop: 0, color: '#991b1b', marginBottom: '1rem' }}>🔴 Predicted Track</h3>
                    <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {(result?.predicted_track || result?.predicted_points || []).map((coord, index) => (
                        <div key={index} style={{
                          padding: '0.75rem',
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '0.375rem',
                          display: 'grid',
                          gridTemplateColumns: '40px 1fr 60px'
                        }}>
                          <div style={{ fontWeight: '700', color: '#991b1b', fontSize: '0.875rem' }}>S{index + 1}</div>
                          <div style={{ fontSize: '0.75rem', color: '#991b1b' }}>
                            <div>{(coord?.latitude || 0).toFixed(4)}°</div>
                            <div>{(coord?.longitude || 0).toFixed(4)}°</div>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: '600' }}>
                            {Math.round((coord?.confidence || 0.85) * 100)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Export */}
                <button
                  onClick={exportToCSV}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.75rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.background = '#059669'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.background = '#10b981'}
                >
                  📥 Download as CSV
                </button>
              </div>
            )}
          </div>
        )}

        {/* Saved Paths Tab */}
        {activeTab === 'saved' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {savedPaths.length === 0 ? (
              <div className="card" style={{
                background: 'white',
                padding: '3rem',
                borderRadius: '0.75rem',
                textAlign: 'center',
                color: '#64748b',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                border: '1px solid #e2e8f0'
              }}>
                <p style={{ fontSize: '1.125rem', fontWeight: '600', margin: '0 0 0.5rem 0' }}>No saved paths yet</p>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>Create a prediction and save it to access it later!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {savedPaths.map(path => (
                  <div key={path.id} className="card" style={{
                    background: 'white',
                    padding: '1.5rem',
                    borderRadius: '0.75rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0', color: '#1e293b' }}>{path.name}</h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                        {path.coordinates.length} points • {path.timestamp}
                      </p>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#475569', maxHeight: '80px', overflowY: 'auto' }}>
                      {path.coordinates.map((c, i) => (
                        <div key={i}>{i + 1}. {c.latitude.toFixed(2)}°, {c.longitude.toFixed(2)}°</div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => loadPath(path)}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          background: '#667eea',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deletePath(path.id)}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};