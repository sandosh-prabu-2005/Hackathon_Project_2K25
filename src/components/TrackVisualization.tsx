import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/* ---------- TYPES ---------- */
interface TrackPoint {
  latitude: number;
  longitude: number;
}

interface ChartPoint {
  latitude: number;
  longitude: number;
  step: number;
}

interface TrackVisualizationProps {
  trackData?: TrackPoint[];
}

export const TrackVisualization: React.FC<TrackVisualizationProps> = ({
  trackData = [],
}) => {
  if (!trackData || trackData.length === 0) {
    return null;
  }

  // Prepare data for the geographical path chart
  const chartData: ChartPoint[] = trackData.map((point, index) => ({
    longitude: parseFloat(point.longitude.toFixed(2)),
    latitude: parseFloat(point.latitude.toFixed(2)),
    step: index + 1,
  }));

  return (
    <div
      style={{
        marginTop: '0',
        backgroundColor: 'transparent',
        padding: '0.75rem',
        borderRadius: '0',
        border: 'none',
        width: '100%',
      }}
    >
      <h5
        style={{
          fontSize: '0.7rem',
          color: '#64748b',
          marginBottom: '0.75rem',
          fontWeight: '700',
          marginTop: 0,
          marginLeft: 0,
          marginRight: 0,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        Track Path
      </h5>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 18, left: 9, bottom: 15 }}
        >
          <CartesianGrid
            strokeDasharray="2 2"
            stroke="#cbd5e1"
            opacity={0.5}
          />
          <XAxis
            dataKey="longitude"
            label={{
              value: 'longitude',
              position: 'bottom',
              fontSize: 11,
              fill: '#475569',
              fontWeight: '600',
            }}
            stroke="#cbd5e1"
            style={{ fontSize: '0.6rem' }}
            tick={{ fontSize: 9, fill: '#64748b' }}
          />
          <YAxis
            label={{
              value: 'latitude',
              angle: -90,
              position: 'left',
              fontSize: 11,
              fill: '#475569',
              fontWeight: '600',
            }}
            stroke="#cbd5e1"
            style={{ fontSize: '0.6rem' }}
            tick={{ fontSize: 9, fill: '#64748b' }}
            width={38}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #bae6fd',
              borderRadius: '6px',
              fontSize: '0.7rem',
              padding: '0.5rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as ChartPoint;
                return (
                  <div
                    style={{
                      backgroundColor: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: '6px',
                      padding: '0.6rem',
                      fontSize: '0.7rem',
                      fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    }}
                  >
                    <p
                      style={{
                        margin: '0 0 0.2rem 0',
                        color: '#0369a1',
                        fontWeight: '700',
                      }}
                    >
                      Step {data.step}
                    </p>
                    <p
                      style={{
                        margin: '0 0 0.2rem 0',
                        color: '#0369a1',
                        fontWeight: '600',
                      }}
                    >
                      Lat: {data.latitude.toFixed(3)}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        color: '#0369a1',
                        fontWeight: '600',
                      }}
                    >
                      Lon: {data.longitude.toFixed(3)}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="latitude"
            stroke="#0ea5e9"
            dot={{ fill: '#06b6d4', r: 3.5 }}
            activeDot={{ r: 5, fill: '#0369a1' }}
            strokeWidth={2.5}
            isAnimationActive={false}
            name="Latitude"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
