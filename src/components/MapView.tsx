import { useEffect, useRef, type JSX } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Station, PredictionResult } from '../types';

// Fix for default markers
(L.Icon.Default.prototype as any)._getIconUrl = function() {
  return (this.options as any).iconUrl;
};
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewProps {
  stations: Station[];
  predictionResult: PredictionResult | null;
  onStationClick?: (station: Station) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  focusLocation?: { latitude: number; longitude: number; zoom?: number } | null;
}

const MapView = ({ stations, predictionResult, onStationClick, initialCenter = [22.5, 78.0], initialZoom = 5, focusLocation = null }: MapViewProps): JSX.Element => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Layer[]>([]);
  
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView(initialCenter, initialZoom);
      
      // Add tile layer - CartoDB Positron (clean and professional)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '©OpenStreetMap, ©CartoDB',
        maxZoom: 20
      }).addTo(mapInstanceRef.current);
    }
    
    // Clear existing markers
    markersRef.current.forEach((marker: L.CircleMarker) => marker.remove());
    markersRef.current = [];
    
    // Add station markers
    if (stations && stations.length > 0) {
      stations.forEach((station: Station) => {
        const marker = L.circleMarker([station.latitude, station.longitude], {
          radius: 6,
          fillColor: '#10B981',
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        });
        
        marker.bindPopup(`
          <div style="font-family: 'IBM Plex Sans', sans-serif;">
            <strong style="font-size: 14px;">${station.station_name}</strong><br/>
            <span style="font-size: 12px; color: #64748b;">
              ${station.river} River<br/>
              ${station.district}, ${station.state}
            </span>
          </div>
        `);
        
        marker.on('click', () => {
          if (onStationClick) {
            onStationClick(station);
          }
        });
        
        marker.addTo(mapInstanceRef.current!);
        markersRef.current.push(marker);
      });
    }
    
    // Highlight prediction station
    if (predictionResult && predictionResult.station_info) {
      const info = predictionResult.station_info;
      const color = predictionResult.status === 'Danger' ? '#EF4444' : 
                    predictionResult.status === 'Warning' ? '#F59E0B' : '#10B981';

      // Create a pin-like HTML SVG and use a divIcon so the highlighted station looks like a pin
      const pinSvg = `
        <svg width="28" height="38" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}"/>
          <circle cx="12" cy="9" r="2.5" fill="#ffffff"/>
        </svg>
      `;

      const icon = L.divIcon({
        className: '',
        html: `<div style="display:flex;align-items:center;justify-content:center;transform:translateY(-4px);">${pinSvg}</div>`,
        iconSize: [28, 38],
        iconAnchor: [14, 38],
        popupAnchor: [0, -36]
      });

      const marker = L.marker([info.latitude, info.longitude], { icon });

      marker.bindPopup(`
        <div style="font-family: 'IBM Plex Sans', sans-serif;">
          <strong style="font-size: 14px;">${info.name}</strong><br/>
          <span style="font-size: 12px;">
            <strong style="color: ${color};">${predictionResult.status}</strong><br/>
            Probability: ${(predictionResult.probability * 100).toFixed(1)}%<br/>
            Level: <span style="font-family: 'JetBrains Mono', monospace;">${predictionResult.current_water_level.toFixed(2)}m</span>
          </span>
        </div>
      `).openPopup();

      marker.addTo(mapInstanceRef.current!);
      markersRef.current.push(marker);

      // Center map on this station with animation
      mapInstanceRef.current?.setView([info.latitude, info.longitude], 8, {
        animate: true,
        duration: 1
      });
    }
    
    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        markersRef.current.forEach(marker => marker.remove());
      }
    };
  }, [stations, predictionResult, onStationClick, initialCenter, initialZoom]);

  // Fly to a focused location when requested (e.g., selected station)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (!focusLocation) return;

    const { latitude, longitude, zoom } = focusLocation;
    try {
      mapInstanceRef.current.flyTo([latitude, longitude], zoom || 8, { animate: true, duration: 0.9 });
    } catch (e) {
      mapInstanceRef.current.setView([latitude, longitude], zoom || 8);
    }

    // Try to open popup for matching marker after map movement
    setTimeout(() => {
      const match = markersRef.current.find((mk: any) => {
        if (!mk || !mk.getLatLng) return false;
        const latlng = mk.getLatLng();
        return Math.abs(latlng.lat - latitude) < 1e-4 && Math.abs(latlng.lng - longitude) < 1e-4;
      });
      if (match && (match as any).openPopup) (match as any).openPopup();
    }, 600);
  }, [focusLocation]);

  
  return <div ref={mapRef} className="h-full w-full" data-testid="map-container" />;
};

export default MapView;
