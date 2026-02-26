import { useEffect, useState } from "react";
import { Cloud, WaterDrop, Visibility, Brightness4, Compress, Air, Opacity, Grain } from '@mui/icons-material';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CloudIcon from '@mui/icons-material/Cloud';
import AcUnitIcon from '@mui/icons-material/AcUnit';

type WeatherData = any;

export default function WeatherCard() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Get location name from reverse geocoding
  const getLocationName = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const data = await res.json();
      return data.address?.city || data.address?.town || data.address?.county || "Unknown Location";
    } catch {
      return "Current Location";
    }
  };

  // Fetch weather data for given coordinates
  const fetchWeatherData = async (latitude: number, longitude: number) => {
    try {
      setLoading(true);
      const weatherRes = await fetch(
        `http://localhost:8080/api/weather?lat=${latitude}&lon=${longitude}`
      );
      const weatherData = await weatherRes.json();
      setWeather(weatherData);
    } catch (err) {
      console.error("Failed to fetch weather data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const locationName = await getLocationName(latitude, longitude);
        setLocation({ lat: latitude, lon: longitude, name: locationName });
        fetchWeatherData(latitude, longitude);
      },
      () => setLoading(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  if (loading) return <div style={styles.card}><p>Loading weather...</p></div>;
  if (!weather) return <div style={styles.card}><p>Weather data unavailable</p></div>;

  const current = weather.currentConditions;
  const tomorrow = weather.days?.[1];
  const displayLocation = location?.name || weather.resolvedAddress || "Current Location";

  // Get weather icon based on condition
  const getWeatherIcon = (condition: string) => {
    const lower = condition.toLowerCase();
    if (lower.includes("clear") || lower.includes("sunny")) return <WbSunnyIcon sx={{ fontSize: 40, color: "#fbbf24" }} />;
    if (lower.includes("cloud")) return <CloudIcon sx={{ fontSize: 40, color: "#94a3b8" }} />;
    if (lower.includes("rain")) return <Opacity sx={{ fontSize: 40, color: "#3b82f6" }} />;
    if (lower.includes("snow")) return <AcUnitIcon sx={{ fontSize: 40, color: "#06b6d4" }} />;
    if (lower.includes("wind")) return <Air sx={{ fontSize: 40, color: "#10b981" }} />;
    if (lower.includes("fog")) return <CloudIcon sx={{ fontSize: 40, color: "#6b7280" }} />;
    return <CloudIcon sx={{ fontSize: 40, color: "#cbd5e1" }} />;
  };

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>TODAY'S WEATHER</h3>
        <span style={styles.date}>
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </span>
      </div>

      {/* Today's Forecast */}
      <div style={styles.forecast}>
        <div style={styles.forecastItem}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {getWeatherIcon(current.conditions)}
            <span style={styles.forecastText}>
              {current.conditions} Hi: {current.temp}°
            </span>
          </div>
        </div>
        {tomorrow && (
          <div style={styles.forecastItem}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Brightness4 sx={{ fontSize: 24, color: "#6366f1" }} />
              <span style={styles.forecastText}>
                Tonight: {tomorrow.conditions} Lo: {tomorrow.tempmin}°
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={styles.divider}></div>

      {/* Current Weather Details */}
      <div style={styles.currentHeader}>
        <h4 style={styles.currentTitle}>CURRENT WEATHER</h4>
        <span style={styles.time}>
          {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* Weather Grid */}
      <div style={styles.weatherGrid}>
        {/* Temperature */}
        <div style={{ ...styles.weatherItem, background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)', gridColumn: '1 / -1' }}>
          <div style={styles.tempContainer}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {getWeatherIcon(current.conditions)}
              <div>
                <div style={{ ...styles.tempValue, color: '#fff' }}>{current.temp}°C</div>
                <div style={{ ...styles.tempLabel, color: 'rgba(255,255,255,0.9)' }}>RealFeel® {current.feelslike || current.temp}°</div>
                <div style={{ ...styles.condition, color: 'rgba(255,255,255,0.85)' }}>{current.conditions}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Wind */}
        <div style={{ ...styles.weatherItem, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}>
            <Air sx={{ fontSize: 32 }} />
            <div>
              <div style={styles.detailLabel}>Wind</div>
              <div style={{ ...styles.detailValue, color: '#fff' }}>{current.windspeed} km/h</div>
            </div>
          </div>
        </div>

        {/* Humidity */}
        <div style={{ ...styles.weatherItem, background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}>
            <WaterDrop sx={{ fontSize: 32 }} />
            <div>
              <div style={styles.detailLabel}>Humidity</div>
              <div style={{ ...styles.detailValue, color: '#fff' }}>{current.humidity}%</div>
            </div>
          </div>
        </div>

        {/* Visibility */}
        <div style={{ ...styles.weatherItem, background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}>
            <Visibility sx={{ fontSize: 32 }} />
            <div>
              <div style={styles.detailLabel}>Visibility</div>
              <div style={{ ...styles.detailValue, color: '#fff' }}>{current.visibility || "Good"}</div>
            </div>
          </div>
        </div>

        {/* UV Index */}
        <div style={{ ...styles.weatherItem, background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}>
            <WbSunnyIcon sx={{ fontSize: 32 }} />
            <div>
              <div style={styles.detailLabel}>UV Index</div>
              <div style={{ ...styles.detailValue, color: '#fff' }}>{current.uvindex || "N/A"}</div>
            </div>
          </div>
        </div>

        {/* Pressure */}
        <div style={{ ...styles.weatherItem, background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}>
            <Compress sx={{ fontSize: 32 }} />
            <div>
              <div style={styles.detailLabel}>Pressure</div>
              <div style={{ ...styles.detailValue, color: '#fff' }}>{current.pressure || "N/A"} mb</div>
            </div>
          </div>
        </div>
      </div>

      {/* Location */}
      <div style={styles.location}>
        📍 {displayLocation}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  card: {
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    borderRadius: 16,
    padding: 28,
    boxShadow: "0 20px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
    fontFamily: "Inter, sans-serif",
    border: '1px solid rgba(255,255,255,0.1)',
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    margin: 0,
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#94a3b8",
    letterSpacing: "0.05em",
  },
  date: {
    fontSize: "0.875rem",
    color: "#94a3b8",
    fontWeight: 600,
  },
  forecast: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 16,
  },
  forecastItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: "1.1rem",
  },
  forecastText: {
    color: "#e2e8f0",
    fontWeight: 500,
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.1)",
    margin: "16px 0",
  },
  currentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  currentTitle: {
    margin: 0,
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#94a3b8",
    letterSpacing: "0.05em",
  },
  time: {
    fontSize: "0.875rem",
    color: "#94a3b8",
    fontWeight: 600,
  },
  weatherGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginBottom: 20,
  },
  weatherItem: {
    padding: 16,
    background: "#f8fafc",
    borderRadius: 12,
    transition: 'all 0.3s ease',
  },
  tempContainer: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
  },
  tempIcon: {
    fontSize: "2.5rem",
    lineHeight: 1,
  },
  tempValue: {
    fontSize: "1.875rem",
    fontWeight: 700,
    color: "#1e293b",
    lineHeight: 1,
  },
  tempLabel: {
    fontSize: "0.875rem",
    color: "#64748b",
    marginTop: 4,
  },
  condition: {
    fontSize: "0.875rem",
    color: "#475569",
    marginTop: 4,
    fontWeight: 500,
  },
  detailLabel: {
    fontSize: "0.75rem",
    color: "rgba(255,255,255,0.7)",
    fontWeight: 600,
    letterSpacing: "0.05em",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: "1.125rem",
    fontWeight: 700,
    color: "#1e293b",
  },
  location: {
    fontSize: "0.875rem",
    color: "#cbd5e1",
    paddingTop: 12,
    borderTop: "1px solid rgba(255,255,255,0.1)",
    textAlign: "center",
  },
};
