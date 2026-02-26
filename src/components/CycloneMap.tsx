import React, { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* ---------- TYPES ---------- */
interface Coordinate {
  latitude: number;
  longitude: number;
  step?: number;
}

interface MapViewUpdaterProps {
  center?: [number, number];
  zoom?: number;
  allPoints: Coordinate[];
}

interface CycloneMapProps {
  historicalTrack?: Coordinate[];
  predictedTrack?: Coordinate[];
  currentPosition?: Coordinate | null;
  intensity?: number | null;
}

/* ---------- WIND LAYER ---------- */
// Simple wind visualization layer - no authentication needed
function WindyLayer(): null {
  const map = useMap();

  useEffect(() => {
    const windTileLayer = L.tileLayer(
      'https://tiles.windy.com/tiles/wind10m/surface/{z}/{x}/{y}.png',
      {
        attribution: 'Wind data © <a href="https://www.windy.com">Windy</a>',
        opacity: 0.65,
        zIndex: 50,
        maxZoom: 18,
        minZoom: 1,
        crossOrigin: 'anonymous',
      }
    );

    windTileLayer.addTo(map);

    return () => {
      try {
        if (map.hasLayer(windTileLayer)) {
          map.removeLayer(windTileLayer);
        }
      } catch (e) {
        console.log('Layer cleanup:', e);
      }
    };
  }, [map]);

  return null;
}

/* ---------- FIX DEFAULT ICONS ---------- */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/* ---------- MAP VIEW UPDATER ---------- */
function MapViewUpdater({ center, zoom, allPoints }: MapViewUpdaterProps): null {
  const map = useMap();

  useEffect(() => {
    if (allPoints && allPoints.length > 0) {
      const bounds = L.latLngBounds(
        allPoints.map((p) => [p.latitude, p.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (center && center[0] && center[1]) {
      map.setView(center, zoom || 5);
    } else {
      const indiaBounds = L.latLngBounds([
        [8.0, 68.0],
        [35.5, 97.0],
      ]);
      map.fitBounds(indiaBounds, { padding: [50, 50] });
    }
  }, [center, zoom, map, allPoints]);

  return null;
}

/* ---------- MAIN COMPONENT ---------- */
export const CycloneMap: React.FC<CycloneMapProps> = ({
  historicalTrack = [],
  predictedTrack = [],
  currentPosition = null,
  intensity = null,
}) => {
  const mapRef = useRef<any>(null);

  // Determine map center
  const getMapCenter = (): LatLngExpression => {
    if (currentPosition) {
      return [currentPosition.latitude, currentPosition.longitude];
    }
    if (historicalTrack.length > 0) {
      const lastPoint = historicalTrack[historicalTrack.length - 1];
      return [lastPoint.latitude, lastPoint.longitude];
    }
    return [20.0, 77.0];
  };

  // Get intensity color
  const getIntensityColor = (intensityKnots?: number | null): string => {
    if (!intensityKnots) return '#3b82f6';
    if (intensityKnots < 34) return '#10b981';
    if (intensityKnots < 64) return '#f59e0b';
    if (intensityKnots < 96) return '#f97316';
    if (intensityKnots < 112) return '#ef4444';
    if (intensityKnots < 135) return '#dc2626';
    return '#991b1b';
  };

  // Create custom icon based on intensity
  const createIntensityIcon = (intensityKnots?: number | null) => {
    const color = getIntensityColor(intensityKnots);
    return L.divIcon({
      className: 'custom-intensity-marker',
      html: `<div style="
        width: 20px;
        height: 20px;
        background-color: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  // Prepare polyline data
  const historicalLine: LatLngExpression[] = historicalTrack.map((p) => [
    p.latitude,
    p.longitude,
  ]);
  const predictedLine: LatLngExpression[] = predictedTrack.map((p) => [
    p.latitude,
    p.longitude,
  ]);
  const allPoints = [...historicalTrack, ...predictedTrack];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={getMapCenter()}
        zoom={5}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Wind flow visualization */}
        <WindyLayer />

        <MapViewUpdater
          center={getMapCenter() as [number, number]}
          zoom={6}
          allPoints={allPoints}
        />

        {/* Historical track */}
        {historicalLine.length > 1 && (
          <Polyline
            positions={historicalLine}
            color="#3b82f6"
            weight={3}
            opacity={0.7}
          />
        )}

        {/* Predicted track */}
        {predictedLine.length > 1 && (
          <Polyline
            positions={predictedLine}
            color="#ef4444"
            weight={3}
            opacity={0.7}
            dashArray="10, 5"
          />
        )}

        {/* Historical track markers */}
        {historicalTrack.map((point, index) => (
          <Marker
            key={`hist-${index}`}
            position={[point.latitude, point.longitude]}
            icon={L.icon({
              iconUrl:
                'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            })}
          >
            <Popup>
              Historical Point {index + 1}
              <br />
              Lat: {point.latitude.toFixed(4)}
              <br />
              Lon: {point.longitude.toFixed(4)}
            </Popup>
          </Marker>
        ))}

        {/* Predicted track markers */}
        {predictedTrack.map((point, index) => (
          <Marker
            key={`pred-${index}`}
            position={[point.latitude, point.longitude]}
            icon={createIntensityIcon(intensity)}
          >
            <Popup>
              Predicted Step {point.step || index + 1}
              <br />
              Lat: {point.latitude.toFixed(4)}
              <br />
              Lon: {point.longitude.toFixed(4)}
            </Popup>
          </Marker>
        ))}

        {/* Current position marker */}
        {currentPosition && (
          <Marker
            position={[
              currentPosition.latitude,
              currentPosition.longitude,
            ]}
            icon={createIntensityIcon(intensity)}
          >
            <Popup>
              <strong>Current Position</strong>
              <br />
              Lat: {currentPosition.latitude.toFixed(4)}
              <br />
              Lon: {currentPosition.longitude.toFixed(4)}
              {intensity && (
                <>
                  <br />
                  Intensity: {intensity} knots
                </>
              )}
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Map legend */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          backgroundColor: 'white',
          padding: '10px',
          borderRadius: '5px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          zIndex: 1000,
          fontSize: '12px',
        }}
      >
        <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Legend</div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
          <div
            style={{
              width: '15px',
              height: '15px',
              backgroundColor: '#3b82f6',
              marginRight: '5px',
            }}
          ></div>
          Historical Track
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
          <div
            style={{
              width: '15px',
              height: '2px',
              background:
                'repeating-linear-gradient(to right, #ef4444 0, #ef4444 5px, transparent 5px, transparent 10px)',
              marginRight: '5px',
            }}
          ></div>
          Predicted Track
        </div>
        {intensity && (
          <div
            style={{
              marginTop: '5px',
              paddingTop: '5px',
              borderTop: '1px solid #ccc',
            }}
          >
            Intensity: {intensity} knots
          </div>
        )}
      </div>
    </div>
  );
};
