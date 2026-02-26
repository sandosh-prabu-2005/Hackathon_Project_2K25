import React, { useEffect, useRef } from 'react';

/* ---------- TYPES ---------- */
interface Coordinate {
  latitude: number;
  longitude: number;
}

interface MapVisualizationProps {
  coordinates: Coordinate[];
  predictedTrack?: Coordinate[];
  title?: string;
}

export const MapVisualization: React.FC<MapVisualizationProps> = ({
  coordinates,
  predictedTrack,
  title = 'Cyclone Track Map',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !coordinates || coordinates.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#f0f9ff';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#e0e7ff';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width;
      const y = (i / 10) * height;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Calculate bounds
    const allCoords = [...coordinates, ...(predictedTrack || [])];
    const lats = allCoords.map((c) => c.latitude);
    const lons = allCoords.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const latRange = maxLat - minLat || 1;
    const lonRange = maxLon - minLon || 1;

    // Padding
    const padding = 40;
    const mapWidth = width - 2 * padding;
    const mapHeight = height - 2 * padding;

    // Conversion functions
    const latToY = (lat: number) =>
      padding + mapHeight * (1 - (lat - minLat) / latRange);
    const lonToX = (lon: number) =>
      padding + mapWidth * ((lon - minLon) / lonRange);

    // Draw historical track
    if (coordinates.length > 0) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.beginPath();
      const firstPoint = coordinates[0];
      ctx.moveTo(
        lonToX(firstPoint.longitude),
        latToY(firstPoint.latitude)
      );

      for (let i = 1; i < coordinates.length; i++) {
        const point = coordinates[i];
        ctx.lineTo(
          lonToX(point.longitude),
          latToY(point.latitude)
        );
      }
      ctx.stroke();

      // Draw historical points
      coordinates.forEach((point, index) => {
        ctx.fillStyle = '#1e40af';
        ctx.beginPath();
        ctx.arc(
          lonToX(point.longitude),
          latToY(point.latitude),
          6,
          0,
          2 * Math.PI
        );
        ctx.fill();

        // Draw number
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          String(index + 1),
          lonToX(point.longitude),
          latToY(point.latitude)
        );
      });
    }

    // Draw predicted track
    if (predictedTrack && predictedTrack.length > 0) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();

      const startPoint = coordinates[coordinates.length - 1];
      ctx.moveTo(
        lonToX(startPoint.longitude),
        latToY(startPoint.latitude)
      );

      for (let i = 0; i < predictedTrack.length; i++) {
        const point = predictedTrack[i];
        ctx.lineTo(
          lonToX(point.longitude),
          latToY(point.latitude)
        );
      }
      ctx.stroke();

      // Draw predicted points
      predictedTrack.forEach((point, index) => {
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(
          lonToX(point.longitude),
          latToY(point.latitude),
          5,
          0,
          2 * Math.PI
        );
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          'P' + (index + 1),
          lonToX(point.longitude),
          latToY(point.latitude)
        );
      });
    }

    // Draw axes labels
    ctx.fillStyle = '#374151';
    ctx.font = '10px Arial';

    // Latitude labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const lat = minLat + (i / 4) * latRange;
      const y = latToY(lat);
      ctx.fillText(lat.toFixed(1) + '°', padding - 10, y + 5);
    }

    // Longitude labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= 4; i++) {
      const lon = minLon + (i / 4) * lonRange;
      const x = lonToX(lon);
      ctx.fillText(lon.toFixed(1) + '°', x, height - padding + 10);
    }

    // Draw legend
    const legendX = width - 140;
    const legendY = 20;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(legendX - 5, legendY - 5, 140, 90);
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX - 5, legendY - 5, 140, 90);

    // Historical line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(legendX, legendY + 10);
    ctx.lineTo(legendX + 20, legendY + 10);
    ctx.stroke();
    ctx.fillStyle = '#1f2937';
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Historical', legendX + 25, legendY + 10);

    // Predicted line
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(legendX, legendY + 35);
    ctx.lineTo(legendX + 20, legendY + 35);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#1f2937';
    ctx.fillText('Predicted', legendX + 25, legendY + 35);

    // Point legend
    ctx.fillStyle = '#1e40af';
    ctx.beginPath();
    ctx.arc(legendX + 10, legendY + 60, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#1f2937';
    ctx.textAlign = 'left';
    ctx.fillText('Actual', legendX + 25, legendY + 60);
  }, [coordinates, predictedTrack]);

  return (
    <div
      style={{
        padding: '1rem',
        backgroundColor: '#f8fafc',
        borderRadius: '0.5rem',
      }}
    >
      <h3
        style={{
          marginTop: 0,
          marginBottom: '0.75rem',
          color: '#1e293b',
        }}
      >
        {title}
      </h3>
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        style={{
          width: '100%',
          maxWidth: '600px',
          border: '1px solid #e2e8f0',
          borderRadius: '0.375rem',
          backgroundColor: '#f0f9ff',
        }}
      />
      <p
        style={{
          fontSize: '0.875rem',
          color: '#64748b',
          marginTop: '0.75rem',
          marginBottom: 0,
        }}
      >
        📍 Blue points: Historical positions | 🔴 Red dashed: Predicted positions
      </p>
    </div>
  );
};
