// import { Card, Badge } from '../ui/components';
import { AlertTriangle, CheckCircle, AlertCircle, Droplets, CloudRain, Activity } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Search, BarChart as BarChartIcon, Opacity, Warning, Error, Cloud, TrendingUp } from '@mui/icons-material';
import type { PredictionResult } from '../types';
import type { JSX } from 'react';

const PredictionPanel = ({ result }: { result: PredictionResult | null }): JSX.Element => {
  if (!result) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
          <Droplets className="mx-auto h-16 w-16 text-slate-400 mb-4" />
          <p className="text-slate-600 text-lg">Select a location and click "Predict Flood Risk"</p>
        </div>
      </div>
    );
  }
  
  const statusConfig = {
    'Danger': { color: 'bg-red-500', icon: AlertTriangle, textColor: 'text-red-500' },
    'Warning': { color: 'bg-amber-500', icon: AlertCircle, textColor: 'text-amber-500' },
    'Safe': { color: 'bg-emerald-500', icon: CheckCircle, textColor: 'text-emerald-500' }
  };
  
  const config = statusConfig[result.status as keyof typeof statusConfig] || statusConfig['Safe'];
  const StatusIcon = config.icon;
  
  // Prepare chart data
  const waterLevelData = result.water_levels.map((level: number, idx: number) => ({
    day: `Day ${idx + 1}`,
    level: level,
    warning: result.warning_level,
    danger: result.danger_level
  }));
  
  const rainfallData = result.rainfall_data.map((rain: number, idx: number) => ({
    day: `Day ${idx + 1}`,
    rainfall: rain
  }));
  
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header Card */}
      <div className="bg-white/90 backdrop-blur-md border-slate-200 shadow-lg p-6 rounded-lg">
        {/* <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {result.station_info.name}
            </h2>
            <p className="text-sm text-slate-600" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              {result.station_info.river} River • {result.station_info.district}, {result.station_info.state}
            </p>
          </div>
        </div> */}
        
        {/* Prediction Result Header */}
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: 'rgba(251,146,60,0.1)',
            border: '1px solid rgba(251,146,60,0.2)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginTop: 12,
            marginBottom: 12
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Search style={{ fontSize: 16 }} />
              Prediction
            </div>
            <div style={{ fontSize: 13, color: 'var(--accent-2)', fontWeight: 600 }}>
              Flood Risk
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <BarChartIcon style={{ fontSize: 16 }} />
              Probability
            </div>
            <div style={{ fontSize: 13, color: 'var(--accent-2)', fontWeight: 600 }}>
              Likelihood
            </div>
          </div>
        </div>

        {/* Prediction Result */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, justifyContent: 'space-between' }}>
          <div style={{ flex: 1, background: '#fff7ed', borderRadius: 5, padding: 8, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ fontSize: 9, color: 'var(--muted)', margin: '0 0 4px 0', fontFamily: 'IBM Plex Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Search style={{ fontSize: 14 }} />
              Prediction
            </div>
            <p style={{ fontSize: 13, fontWeight: 'bold', color: '#c2410c', fontFamily: 'Manrope, sans-serif', margin: 0 }} data-testid="prediction-label">
              {result.prediction}
            </p>
          </div>
          <div style={{ flex: 1, background: '#f5f3ff', borderRadius: 5, padding: 8, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ fontSize: 9, color: 'var(--muted)', margin: '0 0 4px 0', fontFamily: 'IBM Plex Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
              <BarChartIcon style={{ fontSize: 14 }} />
              Probability
            </div>
            <p style={{ fontSize: 13, fontWeight: 'bold', color: '#6d28d9', fontFamily: 'JetBrains Mono, monospace', margin: 0 }} data-testid="probability-value">
              {(result.probability * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
      
      {/* Water Level Header */}
      <div
        style={{
          padding: 12,
          borderRadius: 8,
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.2)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Opacity style={{ fontSize: 16 }} />
            Current
          </div>
          <div style={{ fontSize: 13, color: 'var(--accent-2)', fontWeight: 600 }}>Water Level</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Warning style={{ fontSize: 16 }} />
            Warning
          </div>
          <div style={{ fontSize: 13, color: 'var(--accent-2)', fontWeight: 600 }}>Threshold</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Error style={{ fontSize: 16 }} />
            Danger
          </div>
          <div style={{ fontSize: 13, color: 'var(--accent-2)', fontWeight: 600 }}>Threshold</div>
        </div>
      </div>

      {/* Water Level Metrics */}
      <div className="bg-white/90 backdrop-blur-md border-slate-200 shadow-lg p-6 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Water Levels
          </h3>
        </div>
        
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, justifyContent: 'space-between' }}>
          <div style={{ flex: 1, background: '#f0f9ff', borderRadius: 5, padding: 6, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <Opacity style={{ fontSize: 18, color: '#0EA5E9', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 9, color: 'var(--muted)', margin: '1px 0', fontFamily: 'IBM Plex Sans, sans-serif' }}>Current</p>
              <p style={{ fontSize: 12, fontWeight: 'bold', color: '#0369a1', fontFamily: 'JetBrains Mono, monospace', margin: 0 }} data-testid="current-level">
                {result.current_water_level.toFixed(2)}m
              </p>
            </div>
          </div>
          <div style={{ flex: 1, background: '#fffbeb', borderRadius: 5, padding: 6, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <Warning style={{ fontSize: 18, color: '#F59E0B', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 9, color: 'var(--muted)', margin: '1px 0', fontFamily: 'IBM Plex Sans, sans-serif' }}>Warning</p>
              <p style={{ fontSize: 12, fontWeight: 'bold', color: '#b45309', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
                {result.warning_level.toFixed(2)}m
              </p>
            </div>
          </div>
          <div style={{ flex: 1, background: '#fef2f2', borderRadius: 5, padding: 6, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <Error style={{ fontSize: 18, color: '#EF4444', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 9, color: 'var(--muted)', margin: '1px 0', fontFamily: 'IBM Plex Sans, sans-serif' }}>Danger</p>
              <p style={{ fontSize: 12, fontWeight: 'bold', color: '#dc2626', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
                {result.danger_level.toFixed(2)}m
              </p>
            </div>
          </div>
        </div>
        
        {/* Water Level Chart */}
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={waterLevelData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="day" style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '12px' }} />
            <YAxis style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }} />
            <Tooltip 
              contentStyle={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '12px' }}
              formatter={(value: unknown) => `${(value as number)?.toFixed?.(2) ?? 0}m`}
            />
            <ReferenceLine y={result.warning_level} stroke="#F59E0B" strokeDasharray="5 5" label="Warning" />
            <ReferenceLine y={result.danger_level} stroke="#EF4444" strokeDasharray="5 5" label="Danger" />
            <Area type="monotone" dataKey="level" stroke="#0EA5E9" fill="#0EA5E9" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Rainfall Header */}
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
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Cloud style={{ fontSize: 16 }} />
            Rainfall Data
          </div>
          <div style={{ fontSize: 13, color: 'var(--accent-2)', fontWeight: 600 }}>7-Day Trend</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp style={{ fontSize: 16 }} />
            Analysis
          </div>
          <div style={{ fontSize: 13, color: 'var(--accent-2)', fontWeight: 600 }}>Pattern</div>
        </div>
      </div>

      {/* Rainfall Chart */}
      <div className="bg-white/90 backdrop-blur-md border-slate-200 shadow-lg p-6 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Rainfall (Last 7 Days)
          </h3>
        </div>
        
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={rainfallData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="day" style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '12px' }} />
            <YAxis style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }} />
            <Tooltip 
              contentStyle={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '12px' }}
              formatter={(value: unknown) => `${(value as number)?.toFixed?.(1) ?? 0}mm`}
            />
            <Bar dataKey="rainfall" fill="#0EA5E9" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {result.is_mock && (
        <div className="bg-amber-50 border-amber-200 p-4 rounded">
          
        </div>
      )}
    </div>
  );
};

export default PredictionPanel;
