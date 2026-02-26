import React, { useState, useEffect } from 'react';
import { CycloneMap } from './CycloneMap';
import { TrackVisualization } from './TrackVisualization';
import { intensityApi, trackApi } from '../api/client';

declare global {
  interface Window {
    windyInit: (options: any, callback: (api: any) => void) => void;
    windy: any;
    Windy: any;
  }
}

export const CycloneDashboard = () => {
  // Intensity prediction state
  const [intensityFile, setIntensityFile] = useState(null);
  const [intensityPreview, setIntensityPreview] = useState(null);
  const [intensityResult, setIntensityResult] = useState(null);
  const [intensityLoading, setIntensityLoading] = useState(false);
  
  // Track prediction state
  const [coordinates, setCoordinates] = useState([]);
  const [currentLat, setCurrentLat] = useState('');
  const [currentLon, setCurrentLon] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [numSteps, setNumSteps] = useState(3);
  const [trackResult, setTrackResult] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  
  // Auto-use intensity as storm speed
  const [predictedStormSpeed, setPredictedStormSpeed] = useState(null);
  
  // Error state
  const [error, setError] = useState(null);
  
  // Wind flow modal state
  const [showWindFlow, setShowWindFlow] = useState(false);

  // Initialize wind map when modal opens
  useEffect(() => {
    if (showWindFlow) {
      console.log('Modal opened');
      console.log('window.windyInit available:', !!window.windyInit);
      console.log('window.windy available:', !!window.windy);
      
      const initWindy = async () => {
        const windyContainer = document.getElementById('windy');
        console.log('Windy container found:', !!windyContainer);
        
        if (!windyContainer) return;
        
        // Try multiple ways to detect Windy library
        if (window.windyInit) {
          console.log('Using window.windyInit');
          initWithWindyInit(windyContainer);
        } else if (window.windy) {
          console.log('Using window.windy');
          initWithWindy(windyContainer);
        } else {
          console.log('Windy library not found, waiting...');
          // Wait for library to load
          let attempts = 0;
          const checkInterval = setInterval(() => {
            attempts++;
            if (window.windyInit || window.windy) {
              clearInterval(checkInterval);
              if (window.windyInit) {
                initWithWindyInit(windyContainer);
              } else if (window.windy) {
                initWithWindy(windyContainer);
              }
            } else if (attempts > 30) {
              // Stop after 15 seconds
              clearInterval(checkInterval);
              console.error('Windy library failed to load');
              // Fallback: show a message or use a static tile layer
              windyContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#f0f0f0;color:#666;font-size:14px;">Wind map loading failed. Check API key and network connection.</div>';
            }
          }, 500);
        }
      };
      
      function initWithWindyInit(container) {
        try {
          window.windyInit(
            {
              key: 'x1PZYs950IBWv2zNFKUElc2IcN0sbfyl',
              lat: 20,
              lon: 77,
              zoom: 4,
              container: container,
            },
            function(windyAPI) {
              console.log('Windy API initialized');
              const { store } = windyAPI;
              store.setState({ product: 'wind', level: 'surface' });
            }
          );
        } catch (error) {
          console.error('windyInit error:', error);
          // fallback to iframe embed
          try {
            const iframe = document.createElement('iframe');
            const src = `https://embed.windy.com/embed2.html?lat=20&lon=77&zoom=4&level=surface&overlay=wind`;
            iframe.src = src;
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = '0';
            container.innerHTML = '';
            container.appendChild(iframe);
          } catch (e) {
            console.error('iframe fallback failed:', e);
          }
        }
      }
      
      function initWithWindy(container) {
        try {
          // Some Windy builds expose a top-level object but not an init function.
          if (window.windy && typeof window.windy.init === 'function') {
            window.windy.init(
              {
                key: 'x1PZYs950IBWv2zNFKUElc2IcN0sbfyl',
                lat: 20,
                lon: 77,
                zoom: 4,
                container: container,
              },
              function(windyAPI) {
                console.log('Windy API initialized via window.windy');
                const { store } = windyAPI;
                store.setState({ product: 'wind', level: 'surface' });
              }
            );
          } else {
            console.warn('window.windy present but no init(); falling back to iframe embed');
            // Fallback to iframe embed which doesn't require the JS API
            const iframe = document.createElement('iframe');
            const src = `https://embed.windy.com/embed2.html?lat=20&lon=77&zoom=4&level=surface&overlay=wind&palette=default&menu=&message=true&marker=&calendar=now&pressure=&type=map&detail=&metricWind=kt`;
            iframe.src = src;
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = '0';
            iframe.style.display = 'block';
            // Clear any existing children and append iframe
            container.innerHTML = '';
            container.appendChild(iframe);
          }
        } catch (error) {
          console.error('windy.init error:', error);
          // fallback to iframe
          try {
            const iframe = document.createElement('iframe');
            const src = `https://embed.windy.com/embed2.html?lat=20&lon=77&zoom=4&level=surface&overlay=wind`;
            iframe.src = src;
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = '0';
            container.innerHTML = '';
            container.appendChild(iframe);
          } catch (e) {
            console.error('iframe fallback failed:', e);
          }
        }
      }
      
      initWindy();
    }
  }, [showWindFlow]);

  // Intensity file handler
  const handleIntensityFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setIntensityFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIntensityPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  // Intensity handlers
  // Intensity handlers
  const handleIntensityPredict = async () => {
    if (!intensityFile) {
      setError('Please select an image first');
      return;
    }

    setIntensityLoading(true);
    setError(null);
    
    try {
      const response = await intensityApi.predict(intensityFile);
      console.log('Intensity API Response:', response);
      
      const intensityValue = response.intensity_knots || response.intensity_value || 0;
      
      // Store intensity result
      const intensityRes = {
        intensity_value: intensityValue,
        category: response.intensity_category || response.category || 'Unknown',
        risk_level: response.risk_level || 'Unknown'
      };
      console.log('Processed intensity:', intensityRes);
      setIntensityResult(intensityRes);
      
      // ✅ AUTO-SET: Use predicted intensity as storm speed
      setPredictedStormSpeed(intensityValue);
      
    } catch (err) {
      console.error('Intensity error:', err);
      setError(`Intensity prediction failed: ${err.message}`);
    } finally {
      setIntensityLoading(false);
    }
  };

  // Track handlers
  const addCoordinate = () => {
    if (currentLat && currentLon) {
      const lat = parseFloat(currentLat);
      const lon = parseFloat(currentLon);
      
      if (isNaN(lat) || isNaN(lon)) {
        setError('Please enter valid numbers');
        return;
      }
      
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        setError('Invalid coordinates: latitude must be -90 to 90, longitude must be -180 to 180');
        return;
      }
      
      setCoordinates([...coordinates, { latitude: lat, longitude: lon }]);
      setCurrentLat('');
      setCurrentLon('');
      setError(null);
    }
  };

  const removeCoordinate = (index) => {
    setCoordinates(coordinates.filter((_, i) => i !== index));
  };

  // Combined prediction (always used)
  const handlePredict = async () => {
    setError(null);
    let intensityRes = null;
    let trackRes = null;

    // Predict intensity if file provided
    if (intensityFile) {
      setIntensityLoading(true);
      try {
        const response = await intensityApi.predict(intensityFile);
        console.log('Intensity API Response:', response);
        
        // Response has intensity_knots, intensity_category, risk_level from backend
        intensityRes = {
          intensity_value: response.intensity_knots || response.intensity_value || 0,
          category: response.intensity_category || response.category || 'Unknown',
          risk_level: response.risk_level || 'Unknown'
        };
        console.log('Processed intensity:', intensityRes);
        setIntensityResult(intensityRes);
      } catch (err) {
        console.error('Intensity error:', err);
        setError(`Intensity prediction failed: ${err.message}`);
      } finally {
        setIntensityLoading(false);
      }
    }

    // Predict track if coordinates provided
    if (coordinates.length >= 3) {
      setTrackLoading(true);
      try {
        // ✅ Use predicted intensity as storm speed
        const stormSpeed = predictedStormSpeed || 15;
        const response = await trackApi.predict(coordinates, numSteps, stormSpeed, month);
        console.log('Track API Response:', response);
        
        // Extract predicted positions from predicted_track or predicted_points
        const predictions = response.predicted_track || response.predicted_points || [];
        
        trackRes = {
          predicted_positions: predictions.map(p => ({
            latitude: p.latitude,
            longitude: p.longitude
          })),
          trajectory_stats: {
            avg_speed: calculateAverageSpeed(coordinates, predictions),
            total_distance: calculateTotalDistance(coordinates, predictions)
          }
        };
        console.log('Processed track:', trackRes);
        setTrackResult(trackRes);
      } catch (err) {
        console.error('Track error:', err);
        setError(`Track prediction failed: ${err.message}`);
      } finally {
        setTrackLoading(false);
      }
    }

    if (!intensityFile && coordinates.length < 3) {
      setError('Please provide either a satellite image or at least 3 coordinate points');
    }
  };

  // Helper function to calculate average speed
  const calculateAverageSpeed = (historical, predicted) => {
    if (!predicted || predicted.length === 0) return 0;
    
    let totalDistance = 0;
    const allPoints = [...historical, ...predicted];
    
    for (let i = 1; i < allPoints.length; i++) {
      const lat1 = allPoints[i - 1].latitude || allPoints[i - 1].lat;
      const lon1 = allPoints[i - 1].longitude || allPoints[i - 1].lon;
      const lat2 = allPoints[i].latitude || allPoints[i].lat;
      const lon2 = allPoints[i].longitude || allPoints[i].lon;
      
      // Simple distance calculation (in degrees, rough estimate)
      const dist = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
      totalDistance += dist;
    }
    
    return totalDistance / predicted.length; // Average distance per step
  };

  // Helper function to calculate total distance
  const calculateTotalDistance = (historical, predicted) => {
    if (!predicted || predicted.length === 0) return 0;
    
    let totalDistance = 0;
    const allPoints = [...historical, ...predicted];
    
    for (let i = 1; i < allPoints.length; i++) {
      const lat1 = allPoints[i - 1].latitude || allPoints[i - 1].lat;
      const lon1 = allPoints[i - 1].longitude || allPoints[i - 1].lon;
      const lat2 = allPoints[i].latitude || allPoints[i].lat;
      const lon2 = allPoints[i].longitude || allPoints[i].lon;
      
      // Distance in km (rough calculation: 1 degree ≈ 111 km)
      const dLat = (lat2 - lat1) * 111;
      const dLon = (lon2 - lon1) * 111 * Math.cos((lat1 + lat2) / 2 * Math.PI / 180);
      const dist = Math.sqrt(dLat * dLat + dLon * dLon);
      totalDistance += dist;
    }
    
    return totalDistance;
  };

  // Prepare map data
  const historicalTrack = coordinates.map((coord, index) => ({
    latitude: coord.latitude,
    longitude: coord.longitude,
    step: index + 1
  }));

  const predictedTrack = trackResult?.predicted_positions || [];
  const currentPosition = coordinates.length > 0 
    ? coordinates[coordinates.length - 1] 
    : null;
  const intensity = intensityResult?.intensity_value || null;

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '1fr',
      height: '100vh',
      gap: 0,
      backgroundColor: '#f3f4f6',
      width: '100%',
      margin: 0,
      padding: 0,
      overflow: 'hidden'
    }}>
      {/* Left Panel - Input Controls (FloodWatch Dark Sidebar) */}
      <div style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '280px',
        height: '100vh',
        backgroundColor: '#0f1419',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        overflowY: 'auto',
        color: 'white',
        boxSizing: 'border-box',
        borderRight: '1px solid #1a1f28'
      }}>
        {/* CycloneWatch Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '1rem 0.5rem',
          borderBottom: '1px solid #2a3038'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)',
            backgroundImage: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            fontWeight: 'bold',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
          }}>
            🌪️
          </div>
          <div>
            <div style={{
              fontSize: '1.1rem',
              fontWeight: 'bold',
              color: '#ffffff',
              lineHeight: '1.2'
            }}>
              CycloneWatch
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#94a3b8',
              lineHeight: '1.2'
            }}>
              Cyclone Track Prediction
            </div>
          </div>
        </div>

        {/* Section: Satellite Image */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontSize: '0.75rem', 
            fontWeight: '600', 
            color: '#ffffff'
          }}>
            🛰️ Satellite Image
          </label>
          <div style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '4px',
            border: '1px solid #2a3038',
            backgroundColor: '#1a1f28',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleIntensityFileChange}
              style={{ width: '100%', cursor: 'pointer', fontSize: '0.7rem' }}
            />
            <p style={{ fontSize: '0.65rem', color: '#a0aec0', margin: '0.3rem 0 0 0' }}>
              PNG or JPEG
            </p>
          </div>
          {intensityPreview && (
            <div style={{ marginTop: '0.5rem' }}>
              <img 
                src={intensityPreview} 
                alt="Preview" 
                style={{ 
                  width: '100%', 
                  maxHeight: '80px', 
                  objectFit: 'contain',
                  borderRadius: '4px',
                  border: '1px solid #2a3038'
                }} 
              />
            </div>
          )}
        </div>

        {/* Section: Historical Track - ONLY SHOW AFTER INTENSITY PREDICTION */}
        {intensityResult && (
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.65rem', 
            fontSize: '0.85rem', 
            fontWeight: '600', 
            color: '#ffffff'
          }}>
           Enter Coordinates
          </label>
          
          <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.5rem' }}>
            <input
              type="number"
              placeholder="Lat"
              value={currentLat}
              onChange={(e) => setCurrentLat(e.target.value)}
              disabled={!intensityResult}
              step="0.01"
              style={{
                width: '50px',
                padding: '0.35rem',
                borderRadius: '4px',
                border: '1px solid #2a3038',
                backgroundColor: intensityResult ? '#1a1f28' : '#151a22',
                color: intensityResult ? '#ffffff' : '#6b7280',
                fontSize: '0.65rem',
                cursor: intensityResult ? 'text' : 'not-allowed',
                opacity: intensityResult ? 1 : 0.5,
                boxSizing: 'border-box'
              }}
            />
            <input
              type="number"
              placeholder="Lon"
              value={currentLon}
              onChange={(e) => setCurrentLon(e.target.value)}
              disabled={!intensityResult}
              step="0.01"
              style={{
                width: '50px',
                padding: '0.35rem',
                borderRadius: '4px',
                border: '1px solid #2a3038',
                backgroundColor: intensityResult ? '#1a1f28' : '#151a22',
                color: intensityResult ? '#ffffff' : '#6b7280',
                fontSize: '0.65rem',
                cursor: intensityResult ? 'text' : 'not-allowed',
                opacity: intensityResult ? 1 : 0.5,
                boxSizing: 'border-box'
              }}
            />
            <button
              onClick={addCoordinate}
              disabled={!intensityResult}
              style={{
                padding: '0.35rem 0.5rem',
                backgroundColor: intensityResult ? '#10b981' : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: intensityResult ? 'pointer' : 'not-allowed',
                fontWeight: '600',
                fontSize: '0.65rem',
                transition: 'background 0.3s',
                opacity: intensityResult ? 1 : 0.6,
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                if (intensityResult) (e.target as HTMLElement).style.backgroundColor = '#059669';
              }}
              onMouseLeave={(e) => {
                if (intensityResult) (e.target as HTMLElement).style.backgroundColor = '#10b981';
              }}
            >
              Add
            </button>
          </div>

          {coordinates.length > 0 && (
            <div style={{
              backgroundColor: '#1a1f28',
              padding: '0.5rem',
              borderRadius: '4px',
              maxHeight: '110px',
              overflowY: 'auto',
              border: '1px solid #2a3038'
            }}>
              {coordinates.map((coord, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: index < coordinates.length - 1 ? '0.4rem' : 0,
                  fontSize: '0.7rem',
                  color: '#d1d5db',
                  padding: '0.3rem 0.3rem'
                }}>
                  <span>
                    <strong>#{index + 1}:</strong> {coord.latitude.toFixed(2)}, {coord.longitude.toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeCoordinate(index)}
                    style={{
                      padding: '0.15rem 0.4rem',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '0.65rem',
                      fontWeight: '600'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Section: Month Selection - SHOW AFTER INTENSITY PREDICTION */}
        {intensityResult && (
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.65rem', 
            fontSize: '0.85rem', 
            fontWeight: '600', 
            color: '#ffffff'
          }}>
            📅 Month
          </label>
          <select
            value={month || ''}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #2a3038',
              backgroundColor: '#1a1f28',
              color: '#ffffff',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
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
        </div>
        )}

        {/* Section: Prediction Steps - ONLY SHOW AFTER INTENSITY PREDICTION */}
        {intensityResult && (
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.65rem', 
            fontSize: '0.85rem', 
            fontWeight: '600', 
            color: '#ffffff'
          }}>
            ⏭️ Forecast Steps: <span style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: '700' }}>{numSteps}</span>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={numSteps}
            onChange={(e) => setNumSteps(parseInt(e.target.value))}
            style={{ width: '100%', cursor: 'pointer', accentColor: '#10b981' }}
          />
        </div>
        )}

        {/* Intensity Prediction Button - FIRST STEP */}
        {!intensityResult && (
          <button
            onClick={handleIntensityPredict}
            disabled={!intensityFile || intensityLoading}
            style={{
              padding: '0.75rem',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: !intensityFile || intensityLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: '700',
              transition: 'all 0.3s',
              opacity: !intensityFile || intensityLoading ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (intensityFile && !intensityLoading) {
                (e.target as HTMLButtonElement).style.backgroundColor = '#d97706';
                (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#f59e0b';
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            {intensityLoading ? '⏳ Predicting Intensity...' : '📡 Predict Intensity'}
          </button>
        )}


        {/* Track Prediction Button - SECOND STEP - ONLY SHOW AFTER INTENSITY PREDICTION */}
        {intensityResult && (
        <button
          onClick={handlePredict}
          disabled={coordinates.length < 3 || trackLoading}
          style={{
            padding: '0.75rem',
            backgroundColor: '#0ea5e9',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: coordinates.length < 3 || trackLoading ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            fontWeight: '700',
            transition: 'all 0.3s',
            opacity: coordinates.length < 3 || trackLoading ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (coordinates.length >= 3 && !trackLoading) {
              (e.target as HTMLButtonElement).style.backgroundColor = '#0284c7';
              (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = '#0ea5e9';
            (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          {trackLoading ? '⏳ Predicting Track...' : ' Predict Track'}
        </button>
        )}

        {/* Error Display */}
        {error && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#7f1d1d',
            color: '#fecaca',
            borderRadius: '4px',
            fontSize: '0.8rem',
            borderLeft: '4px solid #dc2626',
            fontWeight: '500'
          }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Middle Panel - Map */}
      <div style={{
        marginLeft: '280px',
        marginRight: '420px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        position: 'relative',
        backgroundColor: '#f3f4f6',
        overflow: 'hidden',
        height: '100vh',
        width: 'calc(100% - 700px)'
      }}>
        {/* Map Visualization - Full Height */}
        <div style={{
          flex: 1,
          backgroundColor: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <CycloneMap
            historicalTrack={historicalTrack}
            predictedTrack={predictedTrack}
            currentPosition={currentPosition}
            intensity={intensity}
          />
        </div>
      </div>

      {/* Results Panel - Right Sidebar */}
      <div style={{
        position: 'fixed',
        right: 0,
        top: 0,
        width: '420px',
        height: '100vh',
        backgroundColor: '#ffffff',
        borderLeft: '1px solid #e5e7eb',
        overflowY: 'auto',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        boxSizing: 'border-box'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', letterSpacing: '-0.5px' }}>
          Results
        </h3>
          
        {intensityResult || trackResult ? (
          <>
            {/* Intensity Results */}
            {intensityResult && (
              <div style={{ paddingBottom: '1.25rem', borderBottom: '2px solid #f1f5f9', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '0.7rem', marginBottom: '0.9rem', color: '#64748b', marginTop: 0, marginLeft: 0, marginRight: 0, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  🌀 Intensity
                </h4>
                
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    marginBottom: '0.75rem'
                  }}>
                    <div style={{ 
                      display: 'inline-block', 
                      width: '60px', 
                      height: '6px', 
                      background: 'linear-gradient(90deg, #0ea5e9, #06b6d4)',
                      borderRadius: '3px',
                      boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)'
                    }}></div>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>knots</span>
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0ea5e9', fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '-1px', marginBottom: '0.5rem' }}>
                    {intensityResult?.intensity_value ? intensityResult.intensity_value.toFixed(2) : 'N/A'}
                  </div>
                </div>

                <div style={{
                  display: 'inline-block',
                  padding: '0.5rem 1rem',
                  backgroundColor: intensityResult?.risk_level === 'Extreme' ? '#991b1b' :
                                   intensityResult?.risk_level === 'Very High' ? '#dc2626' :
                                   intensityResult?.risk_level === 'High' ? '#ef4444' :
                                   intensityResult?.risk_level === 'Moderate' ? '#f59e0b' : '#10b981',
                  color: 'white',
                  borderRadius: '24px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  marginBottom: '1rem',
                  textAlign: 'center',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  boxShadow: 'rgba(0,0,0,0.1) 0 4px 12px',
                  letterSpacing: '0.5px'
                }}>
                  {intensityResult?.category || 'Unknown'}
                </div>

                <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.8', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  <div style={{ marginBottom: '0.4rem' }}><strong style={{ color: '#0f172a', fontWeight: '700' }}>Risk Level:</strong> <span style={{ color: '#0ea5e9', fontWeight: '600' }}>{intensityResult?.risk_level || 'Unknown'}</span></div>
                  <div><strong style={{ color: '#0f172a', fontWeight: '700' }}>Category:</strong> <span style={{ color: '#0ea5e9', fontWeight: '600' }}>{intensityResult?.category || 'Unknown'}</span></div>
                </div>
              </div>
            )}

            {/* Track Results */}
            {trackResult && trackResult.predicted_positions && trackResult.predicted_positions.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.7rem', marginBottom: '1rem', color: '#64748b', fontWeight: '700', marginTop: 0, marginLeft: 0, marginRight: 0, textTransform: 'uppercase', letterSpacing: '1px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                   Track Prediction
                </h4>

                {/* Line Graph Visualization */}
                <div style={{ marginBottom: '1.25rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <TrackVisualization trackData={trackResult.predicted_positions} />
                </div>

                {trackResult.trajectory_stats && (
                  <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '1rem' }}>
                    <h5 style={{ fontSize: '0.7rem', color: '#0369a1', marginBottom: '0.8rem', fontWeight: '700', marginTop: 0, marginLeft: 0, marginRight: 0, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                      Trajectory Statistics
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.6rem 0.8rem',
                        backgroundColor: '#ffffff',
                        borderRadius: '6px',
                        border: '1px solid #cffafe',
                        fontSize: '0.85rem',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                      }}>
                        <strong style={{ color: '#0f172a', fontWeight: '700' }}>Avg Speed:</strong>
                        <span style={{ color: '#0369a1', fontWeight: '700', fontSize: '0.9rem' }}>
                          {trackResult.trajectory_stats.avg_speed?.toFixed(2) || '—'} <span style={{ fontWeight: '500', color: '#475569' }}>knots/step</span>
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.6rem 0.8rem',
                        backgroundColor: '#ffffff',
                        borderRadius: '6px',
                        border: '1px solid #cffafe',
                        fontSize: '0.85rem',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                      }}>
                        <strong style={{ color: '#0f172a', fontWeight: '700' }}>Total Distance:</strong>
                        <span style={{ color: '#0369a1', fontWeight: '700', fontSize: '0.9rem' }}>
                          {trackResult.trajectory_stats.total_distance?.toFixed(2) || '—'} <span style={{ fontWeight: '500', color: '#475569' }}>km</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{
            padding: '2rem 1.5rem',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '0.9rem',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            fontWeight: '500'
          }}>
            📈 Predictions will appear here
          </div>
        )}
        
        {/* Live Wind Flow Button (fixed, top-right) */}
        <button
          onClick={() => setShowWindFlow(true)}
          style={{
            position: 'fixed',
            top: '18px',
            right: '18px',
            padding: '0.45rem 0.9rem',
            backgroundColor: '#0ea5e9',
            color: 'white',
            border: 'none',
            borderRadius: '999px',
            fontSize: '0.9rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 6px 18px rgba(14,165,233,0.25)',
            zIndex: 9998,
            transition: 'transform 0.12s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <span style={{
            width: '6px',
            height: '6px',
            backgroundColor: '#ff0000',
            borderRadius: '50%',
            animation: 'blink 1s infinite',
            boxShadow: '0 0 6px #ff0000'
          }}></span>
          <span style={{ animation: 'blink 1s infinite', display: 'inline-block' }}>  Live Wind Flow</span>
        </button>

          <style>{`
            @keyframes blink {
              0%, 50% { opacity: 1; }
              51%, 100% { opacity: 0.3; }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
          `}</style>
      </div>
      {/* Wind Flow Modal - Rendered at Root Level */}
      {showWindFlow && (
        <>
          {/* Dark Overlay */}
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            pointerEvents: 'auto'
          }} onClick={() => setShowWindFlow(false)} />
          
          {/* Modal Container */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '85%',
            height: '85%',
            maxWidth: '1280px',
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10000
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              paddingBottom: '1rem',
              borderBottom: '2px solid #f1f5f9'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.3rem',
                color: '#0f172a',
                fontWeight: '800',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                🌬️ Live Wind Flow Visualization
              </h2>
              <button
                onClick={() => setShowWindFlow(false)}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                ✕ Close
              </button>
            </div>

            {/* Windy Map Container */}
            <div
              id="windy"
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc'
              }}
            />
          </div>
        </>
      )}    </div>
  );
};

