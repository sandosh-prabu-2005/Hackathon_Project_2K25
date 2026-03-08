import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  GpsFixed,
  Terrain,
  Waves,
  ArrowForward,
  Map,
  Vibration,
  LayersOutlined,
  SmartToy,
  Cloud,
  Security,
  Warning,
  Public,
  Flood,
  LocalFireDepartment,
  Route,
  Landscape,
  Cyclone,
} from "@mui/icons-material";
import ChatBot from "../components/ChatBot";
import Weather from "../components/WeatherDashboard";
import WeatherCard from "../components/WeatherCard";
import NewsCard from "../components/NewsCard";
import DisasterNewsCarousel from "../components/DisasterNewsCarousel";
import { listCrowdReports } from "../crowd/api/crowdReportsApi";
import type { CrowdReport } from "../crowd/types/crowd";
import { API_BASE, CROWD_API_BASE } from "../config/apiBase";
import { getBackendCapabilities } from "../config/backendCapabilities";

const HOME_ALERT_RADIUS_KM = 2;
const HOME_ALERT_POLL_MS = 15000;
const HOME_ALERT_LOOKBACK_HOURS = 1;
const HOME_ALERT_WS_RECONNECT_MS = 5000;

type HomeAlert = {
  id: string;
  title: string;
  message: string;
};

type FloodStation = {
  station_name: string;
  state: string;
  district: string;
  basin: string;
  river: string;
  latitude: number;
  longitude: number;
};

type LandingAiSafety = {
  overallSafePercentage: number;
  lastUpdated: string;
  rainfall7DayTotal: number | null;
  floodSafePercentage: number;
  floodSignal: string;
  floodNote: string;
};

function calcDistanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function Home() {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [alerts, setAlerts] = useState<HomeAlert[]>([]);
  const [wsDisabled, setWsDisabled] = useState(false);
  const [crowdRoutesAvailable, setCrowdRoutesAvailable] = useState(false);
  const [aiSafety, setAiSafety] = useState<LandingAiSafety | null>(null);
  const [aiSafetyLoading, setAiSafetyLoading] = useState(false);
  const [aiSafetyError, setAiSafetyError] = useState<string | null>(null);
  const shownAlertIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const capabilities = await getBackendCapabilities();
      if (cancelled) return;
      setCrowdRoutesAvailable(capabilities.hasCrowdReports);
      if (!capabilities.hasCrowdReports || !capabilities.hasCrowdReportsWs) {
        setWsDisabled(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      () => {
        setUserLocation(null);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const checkNearbyAlerts = useCallback(async () => {
    if (!crowdRoutesAvailable) return;
    if (!userLocation) return;

    const latDelta = HOME_ALERT_RADIUS_KM / 111.32;
    const lonDelta =
      HOME_ALERT_RADIUS_KM / (111.32 * Math.max(0.1, Math.cos((userLocation.latitude * Math.PI) / 180)));
    const result = await listCrowdReports({
      limit: 100,
      offset: 0,
      min_lat: userLocation.latitude - latDelta,
      max_lat: userLocation.latitude + latDelta,
      min_lon: userLocation.longitude - lonDelta,
      max_lon: userLocation.longitude + lonDelta
    });

    const now = Date.now();
    const lookbackMs = HOME_ALERT_LOOKBACK_HOURS * 60 * 60 * 1000;
    const nearby = result.items
      .filter((item) => {
        const distance = calcDistanceKm(userLocation, { latitude: item.latitude, longitude: item.longitude });
        const severityMatch = item.severity !== "low";
        const statusMatch = item.status !== "rejected";
        const createdAtMs = parseReportTimestampMs(item.created_at, now);
        const recent = createdAtMs !== null && now - createdAtMs <= lookbackMs;
        return distance <= HOME_ALERT_RADIUS_KM && severityMatch && statusMatch && recent;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2);

    const newAlerts: HomeAlert[] = nearby
      .filter((item) => !shownAlertIdsRef.current.has(item.id))
      .map((item) => buildHomeAlert(item, userLocation));

    if (newAlerts.length > 0) {
      newAlerts.forEach((alert) => shownAlertIdsRef.current.add(alert.id));
      setAlerts((prev) => [...newAlerts, ...prev].slice(0, 3));
      window.setTimeout(() => {
        setAlerts((prev) => prev.filter((entry) => !newAlerts.some((n) => n.id === entry.id)));
      }, 10000);
    }
  }, [crowdRoutesAvailable, userLocation]);

  useEffect(() => {
    if (!crowdRoutesAvailable) return;
    if (!userLocation) return;

    let cancelled = false;
    const run = async () => {
      try {
        await checkNearbyAlerts();
      } catch {
        // Home page should remain silent on polling failures.
      }
    };

    void run();
    const interval = window.setInterval(() => {
      if (!cancelled) void run();
    }, HOME_ALERT_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [crowdRoutesAvailable, userLocation, checkNearbyAlerts]);

  useEffect(() => {
    if (!crowdRoutesAvailable) return;
    if (!userLocation || wsDisabled) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let cancelled = false;
    let openedOnce = false;

    const connect = () => {
      if (cancelled) return;
      try {
        socket = new WebSocket(buildCrowdWsUrl(CROWD_API_BASE, "/api/crowd-reports/ws"));
      } catch {
        reconnectTimer = window.setTimeout(connect, HOME_ALERT_WS_RECONNECT_MS);
        return;
      }

      socket.onopen = () => {
        openedOnce = true;
      };

      socket.onmessage = () => {
        void checkNearbyAlerts().catch(() => undefined);
      };

      socket.onclose = () => {
        if (!openedOnce) {
          setWsDisabled(true);
          return;
        }
        if (!cancelled) reconnectTimer = window.setTimeout(connect, HOME_ALERT_WS_RECONNECT_MS);
      };

      socket.onerror = () => {
        // Keep silent; polling fallback remains active.
      };
    };

    connect();
    return () => {
      cancelled = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (socket && socket.readyState === WebSocket.OPEN) socket.close();
    };
  }, [crowdRoutesAvailable, userLocation, wsDisabled, checkNearbyAlerts]);

  const fetchAiSafety = useCallback(async () => {
    if (!userLocation) return;

    setAiSafetyLoading(true);
    setAiSafetyError(null);

    let floodSafe = 60;
    let floodSignal = "Monitoring";
    let floodNote = "Flood model data is loading.";
    let rainfall7DayTotal: number | null = null;
    const capabilities = await getBackendCapabilities();

    if (capabilities.hasFlood) {
      try {
        const stationRes = await fetch(`${API_BASE}/flood/stations`);
        const stationData = (await stationRes.json().catch(() => ({}))) as { stations?: FloodStation[] };
        const stations = Array.isArray(stationData.stations) ? stationData.stations : [];

        if (stationRes.ok && stations.length > 0) {
          let nearest = stations[0];
          let nearestDist = calcDistanceKm(userLocation, {
            latitude: nearest.latitude,
            longitude: nearest.longitude
          });

          for (const station of stations) {
            const dist = calcDistanceKm(userLocation, { latitude: station.latitude, longitude: station.longitude });
            if (dist < nearestDist) {
              nearest = station;
              nearestDist = dist;
            }
          }

          const floodRes = await fetch(`${API_BASE}/flood/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: nearest.station_name,
              latitude: nearest.latitude,
              longitude: nearest.longitude,
              state: nearest.state,
              district: nearest.district,
              basin: nearest.basin,
              river: nearest.river
            })
          });

          const floodData = (await floodRes.json().catch(() => ({}))) as {
            status?: string;
            probability?: number;
            rainfall_data?: number[];
            station_info?: { name?: string };
            detail?: string;
          };

          if (floodRes.ok) {
            const status = String(floodData.status ?? "Unknown");
            const probability = Number(floodData.probability ?? 0.5);
            const rain = Array.isArray(floodData.rainfall_data) ? floodData.rainfall_data : [];
            rainfall7DayTotal = rain.length > 0 ? Number(rain.reduce((acc, value) => acc + Number(value || 0), 0).toFixed(1)) : null;

            if (status.toLowerCase().includes("safe")) {
              floodSafe = clampScore(90 - probability * 40);
              floodSignal = "Low";
            } else if (status.toLowerCase().includes("warning")) {
              floodSafe = clampScore(60 - probability * 25);
              floodSignal = "Moderate";
            } else if (status.toLowerCase().includes("danger")) {
              floodSafe = clampScore(30 - probability * 15);
              floodSignal = "High";
            } else {
              floodSafe = clampScore(55 - probability * 20);
              floodSignal = "Unknown";
            }

            floodNote = `${status} at ${floodData.station_info?.name ?? nearest.station_name}.`;
          } else {
            floodNote = String(floodData.detail ?? "Flood response unavailable.");
          }
        } else {
          floodNote = "Could not load flood station list.";
        }
      } catch {
        floodNote = "Could not reach flood endpoints.";
      }
    } else {
      floodSignal = "Unavailable";
      floodSafe = 50;
      floodNote = "Flood routes are not exposed by the running backend instance.";
    }

    const overallSafePercentage = clampScore(floodSafe);

    setAiSafety({
      overallSafePercentage,
      lastUpdated: new Date().toLocaleTimeString(),
      rainfall7DayTotal,
      floodSafePercentage: floodSafe,
      floodSignal,
      floodNote
    });
    setAiSafetyError(null);
    setAiSafetyLoading(false);
  }, [userLocation]);

  useEffect(() => {
    if (!userLocation) return;
    void fetchAiSafety();
  }, [userLocation, fetchAiSafety]);

  return (
    <div className="container site home-root" style={{ background: "#000" }}>
      {alerts.length > 0 && (
        <div className="fixed right-4 top-24 z-[9999] flex w-[min(92vw,380px)] flex-col gap-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-xl border border-amber-200 bg-amber-50/95 p-3 shadow-lg backdrop-blur"
              role="status"
            >
              <p className="text-sm font-semibold text-amber-900">{alert.title}</p>
              <p className="mt-1 text-xs text-amber-800">{alert.message}</p>
            </div>
          ))}
        </div>
      )}
      {/* Professional Header */}
      <header className="home-header" style={{ background: "#000" }}>
        <div className="header-inner">
          <div className="brand">
            <div className="logo">
              <i className="fas fa-shield-alt"></i>
            </div>
            <div className="brand-info">
              <h1>AWS Ai For Bharat</h1>
              <p>Disaster Intelligence Platform</p>
            </div>
          </div>
          <nav className="nav-links">
            <a href="#features">Features</a>
            <Link to="/crowd-reports">Crowd Reports</Link>
            <a href="/about">About</a>
            <a href="#contact">Contact</a>
          </nav>
        </div>
      </header>
      <Weather />
      <DisasterNewsCarousel />
      <section style={{ padding: "28px 20px 8px", background: "#000" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            borderRadius: 18,
            border: "1px solid rgba(59,130,246,0.35)",
            background: "linear-gradient(135deg, rgba(2,6,23,0.98), rgba(15,23,42,0.95))",
            boxShadow: "0 24px 50px rgba(2,6,23,0.45)",
            padding: "22px 20px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, color: "#dbeafe", fontSize: "1.55rem", fontWeight: 700 }}>AI Safety Index</h2>
              <p style={{ margin: "6px 0 0", color: "#93c5fd", fontSize: 13 }}>
                Computed from live Flood prediction model endpoint.
              </p>
              <p style={{ margin: "6px 0 0", color: "#93c5fd", fontSize: 12, lineHeight: 1.5 }}>
                With real-time satellite image feeds, we can estimate landslide and cyclone safety percentages too.
                Earthquake cannot be reliably predicted in real time.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void fetchAiSafety()}
              disabled={!userLocation || aiSafetyLoading}
              style={{
                border: "1px solid rgba(125,211,252,0.45)",
                background: aiSafetyLoading ? "rgba(30,41,59,0.8)" : "rgba(14,116,144,0.3)",
                color: "#e0f2fe",
                borderRadius: 10,
                padding: "8px 14px",
                cursor: !userLocation || aiSafetyLoading ? "not-allowed" : "pointer",
                fontWeight: 600
              }}
            >
              {aiSafetyLoading ? "Refreshing..." : "Refresh AI Score"}
            </button>
          </div>

          {!userLocation && (
            <p style={{ marginTop: 12, color: "#fca5a5", fontSize: 13 }}>
              Enable location to calculate your local safety percentage.
            </p>
          )}

          {userLocation && aiSafety && (
            <>
              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "minmax(180px,220px) 1fr", gap: 14 }}>
                <div
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(59,130,246,0.35)",
                    background: "rgba(15,23,42,0.8)",
                    padding: 14
                  }}
                >
                  <p style={{ margin: 0, color: "#93c5fd", fontSize: 12 }}>Overall Safe</p>
                  <p style={{ margin: "6px 0 0", color: "#ecfeff", fontSize: 34, fontWeight: 800 }}>
                    {aiSafety.overallSafePercentage}%
                  </p>
                  <p style={{ margin: "8px 0 0", color: "#7dd3fc", fontSize: 12 }}>
                    Updated: {aiSafety.lastUpdated}
                  </p>
                  <p style={{ margin: "5px 0 0", color: "#7dd3fc", fontSize: 12 }}>
                    Rainfall (7d): {aiSafety.rainfall7DayTotal === null ? "N/A" : `${aiSafety.rainfall7DayTotal} mm`}
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(59,130,246,0.25)",
                      background: "rgba(15,23,42,0.65)",
                      padding: "12px 13px"
                    }}
                  >
                    <p style={{ margin: 0, color: "#bfdbfe", fontWeight: 700, fontSize: 14 }}>Flood Final Result</p>
                    <p style={{ margin: "7px 0 0", color: "#e0f2fe", fontSize: 27, fontWeight: 800 }}>{aiSafety.floodSafePercentage}%</p>
                    <p style={{ margin: "5px 0 0", color: "#93c5fd", fontSize: 12 }}>Signal: {aiSafety.floodSignal}</p>
                    <p style={{ margin: "5px 0 0", color: "#cbd5e1", fontSize: 12, lineHeight: 1.4 }}>{aiSafety.floodNote}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
      {/* Hero Section */}
      <section
        className="hero home-hero"
        style={{ minHeight: "90vh", paddingTop: 80, paddingBottom: 80 }}
      >
        <div className="home-hero-inner" style={{ maxWidth: 900 }}>
          <div
            className="hero-pill"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "#000",
              border: "1px solid #111",
              padding: "10px 20px",
              borderRadius: 20,
              fontSize: 14,
              color: "#60a5fa",
              marginBottom: 30,
              fontWeight: 500,
            }}
          >
            <i className="fas fa-brain"></i>
            AI-Powered Early Warning System
          </div>

          <h1
            className="hero-title"
            style={{
              fontSize: "3.5rem",
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: 30,
              background: "linear-gradient(135deg, #fff 0%, #cbd5e1 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Disaster Intelligence
            <span
              className="hero-accent"
              style={{
                display: "block",
                background: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Platform
            </span>
          </h1>

          <p
            className="lead"
            style={{
              fontSize: "1.25rem",
              color: "#a0aec0",
              lineHeight: 1.8,
              marginBottom: 50,
              maxWidth: 700,
            }}
          >
            Advanced AI-driven early warning systems for earthquakes,
            landslides, floods, and cyclones. Harnessing machine learning and
            geospatial data to protect communities worldwide.
          </p>

          {/* CTA Cards */}
          <div
            className="home-hero-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            {/* Earthquake Card */}
            <Link to="/earthquake" style={{ textDecoration: "none" }}>
              <div
                className="home-card"
                style={{
                  background: "#000",
                  border: "1px solid #111",
                  borderRadius: 16,
                  padding: 28,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  cursor: "pointer",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 6px 30px rgba(0,0,0,0.6)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.borderColor = "rgba(244,63,94,0.5)";
                  e.currentTarget.style.boxShadow =
                    "0 20px 40px rgba(244,63,94,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(244,63,94,0.2)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 20px rgba(244,63,94,0.1)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      padding: 12,
                      background: "rgba(244,63,94,0.15)",
                      borderRadius: 12,
                    }}
                  >
                    <GpsFixed style={{ fontSize: 32, color: "#f43f5e" }} />
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    Earthquake Analysis
                  </h3>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    color: "#a0aec0",
                    lineHeight: 1.7,
                  }}
                >
                  Real-time seismic risk assessment with advanced ML algorithms
                  for accurate predictions
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#f43f5e",
                    fontWeight: 600,
                    marginTop: 10,
                    fontSize: 15,
                  }}
                >
                  Explore <ArrowForward style={{ fontSize: 20 }} />
                </div>
              </div>
            </Link>

            {/* Landslide Card */}
            <Link to="/landslide" style={{ textDecoration: "none" }}>
              <div
                className="home-card"
                style={{
                  background: "#000",
                  border: "1px solid #111",
                  borderRadius: 16,
                  padding: 28,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  cursor: "pointer",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 6px 30px rgba(0,0,0,0.6)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.borderColor = "rgba(217,119,6,0.5)";
                  e.currentTarget.style.boxShadow =
                    "0 20px 40px rgba(217,119,6,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(217,119,6,0.2)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 20px rgba(217,119,6,0.1)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      padding: 12,
                      background: "rgba(217,119,6,0.15)",
                      borderRadius: 12,
                    }}
                  >
                    <Terrain style={{ fontSize: 32, color: "#d97706" }} />
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    Landslide Detection
                  </h3>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    color: "#a0aec0",
                    lineHeight: 1.7,
                  }}
                >
                  AI-powered segmentation using satellite imagery and deep
                  learning for risk identification
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#d97706",
                    fontWeight: 600,
                    marginTop: 10,
                    fontSize: 15,
                  }}
                >
                  Explore <ArrowForward style={{ fontSize: 20 }} />
                </div>
              </div>
            </Link>

            {/* Flood Card */}
            <Link to="/flood" style={{ textDecoration: "none" }}>
              <div
                className="home-card"
                style={{
                  background: "#000",
                  border: "1px solid #111",
                  borderRadius: 16,
                  padding: 28,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  cursor: "pointer",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 6px 30px rgba(0,0,0,0.6)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.borderColor = "rgba(14,165,233,0.5)";
                  e.currentTarget.style.boxShadow =
                    "0 20px 40px rgba(14,165,233,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(14,165,233,0.2)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 20px rgba(14,165,233,0.1)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      padding: 12,
                      background: "rgba(14,165,233,0.15)",
                      borderRadius: 12,
                    }}
                  >
                    <Waves style={{ fontSize: 32, color: "#0ea5e9" }} />
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    Flood Prediction
                  </h3>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    color: "#a0aec0",
                    lineHeight: 1.7,
                  }}
                >
                  Water level prediction with rainfall analysis for proactive
                  flood risk management
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#0ea5e9",
                    fontWeight: 600,
                    marginTop: 10,
                    fontSize: 15,
                  }}
                >
                  Explore <ArrowForward style={{ fontSize: 20 }} />
                </div>
              </div>
            </Link>

            {/* Cyclone Card */}
            <Link to="/cyclone" style={{ textDecoration: "none" }}>
              <div
                className="home-card"
                style={{
                  background: "#000",
                  border: "1px solid #111",
                  borderRadius: 16,
                  padding: 28,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  cursor: "pointer",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 6px 30px rgba(0,0,0,0.6)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.borderColor = "rgba(34,197,94,0.5)";
                  e.currentTarget.style.boxShadow =
                    "0 20px 40px rgba(34,197,94,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(34,197,94,0.2)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 20px rgba(34,197,94,0.1)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      padding: 12,
                      background: "rgba(34,197,94,0.15)",
                      borderRadius: 12,
                    }}
                  >
                    <Cloud style={{ fontSize: 32, color: "#22c55e" }} />
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    Cyclone Tracking
                  </h3>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    color: "#a0aec0",
                    lineHeight: 1.7,
                  }}
                >
                  Real-time tropical cyclone path prediction and intensity
                  forecasting for coastal protection
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#22c55e",
                    fontWeight: 600,
                    marginTop: 10,
                    fontSize: 15,
                  }}
                >
                  Explore <ArrowForward style={{ fontSize: 20 }} />
                </div>
              </div>
            </Link>
          </div>

          {/* disaster-roadmap Card */}
          <Link to="/disaster-vd" style={{ textDecoration: "none" }}>
  <div
    className="home-card home-roadmap-card"
    style={{
      background: "#000",
      border: "1px solid #111",
      borderRadius: 16,
      padding: 28,
      height: "100%",
      display: "flex",
      flexDirection: "column",
      gap: 18,
      marginTop: "40px",
      gridColumn: "span 2",
      cursor: "pointer",
      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      boxShadow: "0 6px 30px rgba(0,0,0,0.6)",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-8px)";
      e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)";
      e.currentTarget.style.boxShadow =
        "0 20px 40px rgba(99,102,241,0.25)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.borderColor = "#111";
      e.currentTarget.style.boxShadow =
        "0 6px 30px rgba(0,0,0,0.6)";
    }}
  >
    {/* Header */}
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div
        style={{
          padding: 12,
          background: "rgba(99,102,241,0.15)",
          borderRadius: 12,
        }}
      >
        <Route style={{ fontSize: 32, color: "#6366f1" }} />
      </div>

      <h3
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 700,
          color: "#fff",
        }}
      >
        Disaster Roadmap
      </h3>
    </div>

    {/* Description */}
    <p
      style={{
        margin: 0,
        fontSize: 15,
        color: "#a0aec0",
        lineHeight: 1.7,
      }}
    >
      A unified disaster prediction and response roadmap integrating
      multi-hazard intelligence, simulations, and mission-based analysis.
    </p>

    {/* Disaster Prediction Icons */}
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 6,
      }}
    >
      {[
        { icon: <Flood />, label: "Flood" },
        { icon: <Landscape />, label: "Landslide" },
        { icon: <Cyclone />, label: "Cyclone" },
      ].map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            background: "rgba(99,102,241,0.12)",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            color: "#c7d2fe",
          }}
        >
          {item.icon}
          {item.label}
        </div>
      ))}
    </div>

    {/* CTA */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: "#6366f1",
        fontWeight: 600,
        marginTop: 10,
        fontSize: 15,
      }}
    >
      Explore <ArrowForward style={{ fontSize: 20 }} />
    </div>
  </div>
</Link>

        </div>
      </section>

      {/* Weather Card Section */}
      <section className="home-weather-section" style={{ background: "#000", padding: "60px 20px" }}>
        <div className="home-section-inner" style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              color: "#fff",
              marginBottom: 40,
              textAlign: "center",
              background: "linear-gradient(135deg, #fff 0%, #cbd5e1 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Real-Time Weather & News
          </h2>

          <div
            className="home-weather-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
              gap: 24,
            }}
          >
            <WeatherCard />
            <NewsCard />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-40 dark-section home-features-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2
              className="text-3xl md:text-5xl font-bold mb-6 section-heading"
              style={{ fontSize: "2.5rem", fontWeight: 800 }}
            >
              Advanced Technology Solutions
            </h2>
            <p
              className="text-xl max-w-3xl mx-auto text-muted"
              style={{ fontSize: "1.1rem", color: "#a0aec0" }}
            >
              Our cutting-edge AI models provide unprecedented accuracy in
              disaster prediction and risk assessment
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 features">
            {/* Earthquake Card */}
            <Link to="/earthquake" style={{ textDecoration: "none" }}>
              <div
                className="home-card home-feature-card"
                style={{
                  background: "#000",
                  border: "1px solid #111",
                  borderRadius: 20,
                  padding: 40,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  cursor: "pointer",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
                  backdropFilter: "none",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-12px)";
                  e.currentTarget.style.borderColor = "rgba(244,63,94,0.4)";
                  e.currentTarget.style.boxShadow =
                    "0 36px 64px rgba(0,0,0,0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(244,63,94,0.25)";
                  e.currentTarget.style.boxShadow =
                    "0 12px 48px rgba(0,0,0,0.6)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <div
                    style={{
                      padding: 16,
                      background: "rgba(244,63,94,0.2)",
                      borderRadius: 14,
                    }}
                  >
                    <Vibration style={{ fontSize: 36, color: "#f43f5e" }} />
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 24,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    Earthquake Risk Analysis
                  </h3>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    color: "#a0aec0",
                    lineHeight: 1.8,
                  }}
                >
                  Comprehensive seismic risk assessment using global earthquake
                  data, geographical parameters, and advanced machine learning
                  algorithms for accurate risk classification.
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 20,
                    marginTop: 16,
                    fontSize: 14,
                    color: "#cbd5e1",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#f43f5e",
                      }}
                    ></div>
                    Real-time Analysis
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#f43f5e",
                      }}
                    ></div>
                    Global Coverage
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#f43f5e",
                    fontWeight: 700,
                    marginTop: 16,
                    fontSize: 16,
                  }}
                >
                  Start Analysis <ArrowForward style={{ fontSize: 22 }} />
                </div>
              </div>
            </Link>

            {/* Landslide Card */}
            <Link to="/landslide" style={{ textDecoration: "none" }}>
              <div
                className="home-card home-feature-card"
                style={{
                  background: "#000",
                  border: "1px solid #111",
                  borderRadius: 20,
                  padding: 40,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  cursor: "pointer",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
                  backdropFilter: "none",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-12px)";
                  e.currentTarget.style.borderColor = "rgba(217,119,6,0.4)";
                  e.currentTarget.style.boxShadow =
                    "0 36px 64px rgba(0,0,0,0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(217,119,6,0.25)";
                  e.currentTarget.style.boxShadow =
                    "0 12px 48px rgba(0,0,0,0.6)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <div
                    style={{
                      padding: 16,
                      background: "rgba(217,119,6,0.2)",
                      borderRadius: 14,
                    }}
                  >
                    <LayersOutlined
                      style={{ fontSize: 36, color: "#d97706" }}
                    />
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 24,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    Landslide Detection & Segmentation
                  </h3>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    color: "#a0aec0",
                    lineHeight: 1.8,
                  }}
                >
                  Advanced image processing and deep learning segmentation for
                  landslide-prone area identification using satellite imagery
                  and ResNet18 neural networks.
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 20,
                    marginTop: 16,
                    fontSize: 14,
                    color: "#cbd5e1",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#d97706",
                      }}
                    ></div>
                    AI-Powered
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#d97706",
                      }}
                    ></div>
                    Satellite Imagery
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#d97706",
                    fontWeight: 700,
                    marginTop: 16,
                    fontSize: 16,
                  }}
                >
                  Start Analysis <ArrowForward style={{ fontSize: 22 }} />
                </div>
              </div>
            </Link>

            {/* Cyclone Card */}
            <Link to="/cyclone" style={{ textDecoration: "none" }}>
              <div
                className="home-card home-feature-card"
                style={{
                  background: "#000",
                  border: "1px solid #111",
                  borderRadius: 20,
                  padding: 40,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  cursor: "pointer",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
                  backdropFilter: "none",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-12px)";
                  e.currentTarget.style.borderColor = "rgba(34,197,94,0.4)";
                  e.currentTarget.style.boxShadow =
                    "0 36px 64px rgba(0,0,0,0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(34,197,94,0.25)";
                  e.currentTarget.style.boxShadow =
                    "0 12px 48px rgba(0,0,0,0.6)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <div
                    style={{
                      padding: 16,
                      background: "rgba(34,197,94,0.2)",
                      borderRadius: 14,
                    }}
                  >
                    <Cloud style={{ fontSize: 36, color: "#22c55e" }} />
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 24,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    Cyclone Tracking & Prediction
                  </h3>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    color: "#a0aec0",
                    lineHeight: 1.8,
                  }}
                >
                  Real-time tropical cyclone path tracking and intensity
                  forecasting using CNN-GRU neural networks for coastal storm
                  preparedness and early warning systems.
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 20,
                    marginTop: 16,
                    fontSize: 14,
                    color: "#cbd5e1",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#22c55e",
                      }}
                    ></div>
                    Path Prediction
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#22c55e",
                      }}
                    ></div>
                    Intensity Forecast
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#22c55e",
                    fontWeight: 700,
                    marginTop: 16,
                    fontSize: 16,
                  }}
                >
                  Start Analysis <ArrowForward style={{ fontSize: 22 }} />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-40 dark-section home-tech-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2
              className="text-3xl md:text-5xl font-bold mb-6 section-heading"
              style={{ fontSize: "2.5rem", fontWeight: 800 }}
            >
              Enterprise-Grade Technology
            </h2>
            <p
              className="text-xl max-w-3xl mx-auto text-muted"
              style={{ fontSize: "1.1rem", color: "#a0aec0" }}
            >
              Built with industry-leading AI frameworks and deployed on scalable
              cloud infrastructure
            </p>
          </div>

          <div
            className="home-tech-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 32,
            }}
          >
            {/* Machine Learning Card */}
            <div
              className="home-card home-tech-card"
              style={{
                background: "#000",
                border: "1px solid #111",
                borderRadius: 20,
                padding: 40,
                display: "flex",
                flexDirection: "column",
                gap: 20,
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-12px)";
                e.currentTarget.style.borderColor = "rgba(96,165,250,0.4)";
                e.currentTarget.style.boxShadow = "0 36px 64px rgba(0,0,0,0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "rgba(96,165,250,0.25)";
                e.currentTarget.style.boxShadow = "0 12px 48px rgba(0,0,0,0.6)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div
                  style={{
                    padding: 18,
                    background: "rgba(96,165,250,0.2)",
                    borderRadius: 16,
                  }}
                >
                  <SmartToy style={{ fontSize: 42, color: "#60a5fa" }} />
                </div>
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                Machine Learning
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 16,
                  color: "#a0aec0",
                  lineHeight: 1.7,
                }}
              >
                Advanced neural networks trained on extensive geological
                datasets
              </p>
            </div>

            {/* Cloud Infrastructure Card */}
            <div
              className="home-card home-tech-card"
              style={{
                background: "#000",
                border: "1px solid #111",
                borderRadius: 20,
                padding: 40,
                display: "flex",
                flexDirection: "column",
                gap: 20,
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-12px)";
                e.currentTarget.style.borderColor = "rgba(103,232,249,0.4)";
                e.currentTarget.style.boxShadow = "0 36px 64px rgba(0,0,0,0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "rgba(103,232,249,0.25)";
                e.currentTarget.style.boxShadow = "0 12px 48px rgba(0,0,0,0.6)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div
                  style={{
                    padding: 18,
                    background: "rgba(103,232,249,0.2)",
                    borderRadius: 16,
                  }}
                >
                  <Cloud style={{ fontSize: 42, color: "#67e8f9" }} />
                </div>
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                Cloud Infrastructure
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 16,
                  color: "#a0aec0",
                  lineHeight: 1.7,
                }}
              >
                Scalable deployment with real-time processing capabilities
              </p>
            </div>

            {/* Data Security Card */}
            <div
              className="home-card home-tech-card"
              style={{
                background: "#000",
                border: "1px solid #111",
                borderRadius: 20,
                padding: 40,
                display: "flex",
                flexDirection: "column",
                gap: 20,
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-12px)";
                e.currentTarget.style.borderColor = "rgba(250,204,21,0.4)";
                e.currentTarget.style.boxShadow = "0 36px 64px rgba(0,0,0,0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "rgba(250,204,21,0.25)";
                e.currentTarget.style.boxShadow = "0 12px 48px rgba(0,0,0,0.6)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div
                  style={{
                    padding: 18,
                    background: "rgba(250,204,21,0.2)",
                    borderRadius: 16,
                  }}
                >
                  <Security style={{ fontSize: 42, color: "#facc15" }} />
                </div>
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                Data Security
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 16,
                  color: "#a0aec0",
                  lineHeight: 1.7,
                }}
              >
                Enterprise-grade security with encrypted data processing
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-divider" aria-hidden>
          <svg
            viewBox="0 0 1200 100"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0,0 C300,80 900,0 1200,60 L1200,100 L0,100 Z"
              fill="rgba(255,255,255,0.02)"
            ></path>
            <path
              d="M0,20 C350,100 850,10 1200,60 L1200,100 L0,100 Z"
              fill="rgba(79,70,229,0.06)"
            ></path>
          </svg>
        </div>
        <div className="footer-inner max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="footer-top">
            <div className="footer-col footer-brand">
              <div className="brand-row">
                <div className="brand-badge">
                  <i className="fas fa-shield-alt"></i>
                </div>
                <span className="brand-name">AWS Ai For Bharat</span>
              </div>
              <p className="footer-desc">
                Leading provider of AI-powered disaster intelligence solutions
                for safer communities.
              </p>
              <div className="social">
                <a href="#" aria-label="Twitter">
                  <i className="fab fa-twitter"></i>
                </a>
                <a href="#" aria-label="LinkedIn">
                  <i className="fab fa-linkedin"></i>
                </a>
                <a href="#" aria-label="GitHub">
                  <i className="fab fa-github"></i>
                </a>
              </div>

              <form
                className="newsletter"
                onSubmit={(e) => {
                  e.preventDefault();
                  alert("Thanks — demo only");
                }}
              >
                <label htmlFor="nl-email" className="sr-only">
                  Join newsletter
                </label>
                <div className="nl-row">
                  <input
                    id="nl-email"
                    type="email"
                    placeholder="Your email address"
                    required
                  />
                  <button className="btn btn-primary" type="submit">
                    Join
                  </button>
                </div>
                <div className="nl-note">
                  Get product updates and research highlights.
                </div>
              </form>
            </div>

            <div className="footer-col">
              <h4>Platform</h4>
              <ul className="footer-list">
                <li>
                  <a href="#">Earthquake Analysis</a>
                </li>
                <li>
                  <a href="#">Landslide Detection</a>
                </li>
                <li>
                  <a href="#">Risk Assessment</a>
                </li>
                <li>
                  <a href="#">API Access</a>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Resources</h4>
              <ul className="footer-list">
                <li>
                  <a href="#">Documentation</a>
                </li>
                <li>
                  <a href="#">Research Papers</a>
                </li>
                <li>
                  <a href="#">Case Studies</a>
                </li>
                <li>
                  <a href="#">Support</a>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Company</h4>
              <ul className="footer-list">
                <li>
                  <a href="#">About Us</a>
                </li>
                <li>
                  <a href="#">Careers</a>
                </li>
                <li>
                  <a href="#">Contact</a>
                </li>
                <li>
                  <a href="#">Privacy Policy</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom border-t">
            <div className="footer-bottom-inner">
              <p className="copyright">
                © 2026 AWS Ai For Bharat Disaster Intelligence. All rights reserved.
              </p>
              <div className="footer-links">
                <a href="#">Terms of Service</a>
                <a href="#">Privacy Policy</a>
                <a href="#">Cookie Policy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Chatbot */}
      <ChatBot />

      <button
        className="back-to-top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
      >
        ↑
      </button>
    </div>
  );
}

function buildHomeAlert(report: CrowdReport, userLocation: { latitude: number; longitude: number }): HomeAlert {
  const distance = calcDistanceKm(userLocation, { latitude: report.latitude, longitude: report.longitude });
  const km = distance.toFixed(1);
  const title = report.severity === "critical" ? "Critical warning near you" : "Warning near your location";
  const message =
    report.severity === "critical"
      ? `${report.disaster_type.toUpperCase()} report about ${km} km away. Stay safe and monitor updates.`
      : `${report.disaster_type.toUpperCase()} report about ${km} km away. If safe, consider helping nearby responders.`;
  return { id: report.id, title, message };
}

function buildCrowdWsUrl(base: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (base.startsWith("http://") || base.startsWith("https://")) {
    const url = new URL(base);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = `${url.pathname.replace(/\/$/, "")}${normalizedPath}`;
    return url.toString();
  }

  const wsProto = window.location.protocol === "https:" ? "wss" : "ws";
  const normalizedBase = base.startsWith("/") ? base : `/${base}`;
  return `${wsProto}://${window.location.host}${normalizedBase.replace(/\/$/, "")}${normalizedPath}`;
}

function clampScore(value: number): number {
  return Math.max(5, Math.min(99, Math.round(value)));
}

function parseReportTimestampMs(value: string, nowMs: number): number | null {
  if (!value) return null;

  // Backend timestamps without timezone are UTC-origin in our system.
  const hasTimezone = /[zZ]|[+\-]\d{2}:\d{2}$/.test(value);
  if (!hasTimezone) {
    const utcMs = Date.parse(`${value}Z`);
    if (!Number.isNaN(utcMs)) return utcMs;
  }

  const localMs = Date.parse(value);
  return Number.isNaN(localMs) ? null : localMs;
}
