import { useEffect, useState } from "react";

type WeatherData = any;
type NewsArticle = {
  title: string;
  description: string;
  url: string;
  source: { name: string };
};

export default function WeatherDashboard() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [error, setError] = useState<string>("");
  const [location, setLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompact, setIsCompact] = useState(true);

  // Fetch weather data for given coordinates
  const fetchWeatherData = async (latitude: number, longitude: number) => {
    try {
      setLoading(true);
      const weatherRes = await fetch(
        `http://localhost:8080/api/weather?lat=${latitude}&lon=${longitude}`
      );
      const weatherData = await weatherRes.json();
      setWeather(weatherData);

      const newsRes = await fetch(`http://localhost:8080/api/news`);
      const newsData = await newsRes.json();
      setNews(newsData.articles || []);
    } catch (err) {
      setError("Failed to fetch weather data");
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    const getLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const locationName = await getLocationName(latitude, longitude);
          setLocation({ lat: latitude, lon: longitude, name: locationName });
          fetchWeatherData(latitude, longitude);
        },
        () => setError("Location access denied. Please enable location services."),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    getLocation();
    // Update location every 5 minutes
    const interval = setInterval(getLocation, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (error) return <div style={styles.error}>{error}</div>;
  if (loading || !weather) return <div style={styles.loading}>📍 Getting weather…</div>;

  const current = weather.currentConditions;
  const displayLocation = location?.name || weather.resolvedAddress || "Current Location";

  // Compact single-line display
  return (
    <div style={styles.compactContainer}>
      <div style={styles.compactWeather}>
        <span style={styles.compactLocation}>📍 {displayLocation}</span>
        <span style={styles.compactSeparator}>•</span>
        <span style={styles.compactTemp}>{current.temp}°C</span>
        <span style={styles.compactSeparator}>•</span>
        <span style={styles.compactCondition}>{current.conditions}</span>
        <span style={styles.compactSeparator}>•</span>
        <span style={styles.compactWind}>💨 {current.windspeed} km/h</span>
        <button
          onClick={() => {
            navigator.geolocation.getCurrentPosition(async (pos) => {
              const { latitude, longitude } = pos.coords;
              const locationName = await getLocationName(latitude, longitude);
              setLocation({ lat: latitude, lon: longitude, name: locationName });
              fetchWeatherData(latitude, longitude);
            });
          }}
          style={styles.compactRefreshBtn}
        >
          🔄
        </button>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  compactContainer: {
    width: "100%",
    padding: "12px 20px",
    background: "transparent",
    borderBottom: "1px solid #333",
  },
  compactWeather: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.95rem",
    color: "#cbd5e1",
    flexWrap: "wrap",
  },
  compactLocation: {
    fontWeight: 600,
    color: "#60a5fa",
  },
  compactSeparator: {
    color: "#475569",
    opacity: 0.7,
  },
  compactTemp: {
    fontWeight: 700,
    color: "#fbbf24",
  },
  compactCondition: {
    color: "#a0aec0",
  },
  compactWind: {
    color: "#34d399",
  },
  compactRefreshBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "1rem",
    padding: "4px 8px",
    marginLeft: "8px",
    transition: "transform 0.3s ease",
    opacity: 0.8,
  },
  container: {
    padding: 20,
    background: "#f1f5f9",
    minHeight: "100vh",
    fontFamily: "Inter, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  refreshBtn: {
    padding: "8px 16px",
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: 600,
  },
  card: {
    background: "#ffffff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
  },
  temp: {
    fontSize: 48,
    fontWeight: 700,
  },
  alertBox: {
    background: "#fee2e2",
    border: "1px solid #ef4444",
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    color: "#7f1d1d",
  },
  news: {
    background: "#ffffff",
    padding: 20,
    borderRadius: 12,
  },
  newsItem: {
    display: "block",
    marginBottom: 12,
    color: "#1e40af",
    textDecoration: "none",
  },
  loading: {
    padding: "8px 20px",
    fontSize: "0.9rem",
    color: "#a0aec0",
    background: "transparent",
  },
  error: {
    padding: "8px 20px",
    color: "#ef4444",
    background: "transparent",
  },
};
