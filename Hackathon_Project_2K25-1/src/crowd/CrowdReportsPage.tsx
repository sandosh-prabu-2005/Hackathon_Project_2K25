import { useCallback, useEffect, useMemo, useState } from "react";
import { listCrowdReports } from "./api/crowdReportsApi";
import { reverseGeocode } from "./api/mapApi";
import { FiltersBar } from "./components/FiltersBar";
import { ReportForm } from "./components/ReportForm";
import { ReportsList } from "./components/ReportsList";
import { ReportsMap } from "./components/ReportsMap";
import type { CrowdReport, CrowdReportFilters } from "./types/crowd";
import { API_BASE } from "../config/apiBase";
import "leaflet/dist/leaflet.css";
import "./crowd-overrides.css";

const POLL_MS = 15000;
const WS_RECONNECT_MS = 5000;
const DEFAULT_RADIUS_KM = 30;
const MIN_RADIUS_KM = 5;
const MAX_RADIUS_KM = 100;

type ViewMode = "list" | "post";
type ScopeMode = "nearby" | "all";

type UserLocation = {
  latitude: number;
  longitude: number;
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

export default function CrowdReportsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [scopeMode, setScopeMode] = useState<ScopeMode>("nearby");
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [filters, setFilters] = useState<CrowdReportFilters>({});
  const [reports, setReports] = useState<CrowdReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocationName, setUserLocationName] = useState<string>("Resolving your location...");
  const [wsConnected, setWsConnected] = useState(false);
  const [wsDisabled, setWsDisabled] = useState(false);

  const loadData = useCallback(async () => {
    if (scopeMode === "nearby" && !userLocation) {
      setReports([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (scopeMode === "nearby" && userLocation) {
        const latDelta = radiusKm / 111.32;
        const lonDelta =
          radiusKm / (111.32 * Math.max(0.1, Math.cos((userLocation.latitude * Math.PI) / 180)));

        const reportResult = await listCrowdReports({
          ...filters,
          limit: 100,
          offset: 0,
          min_lat: userLocation.latitude - latDelta,
          max_lat: userLocation.latitude + latDelta,
          min_lon: userLocation.longitude - lonDelta,
          max_lon: userLocation.longitude + lonDelta
        });

        const nearbyReports = reportResult.items.filter(
          (item) => calcDistanceKm(userLocation, { latitude: item.latitude, longitude: item.longitude }) <= radiusKm
        );
        setReports(nearbyReports);
        setTotal(nearbyReports.length);
      } else {
        const reportResult = await listCrowdReports({ ...filters, limit: 100, offset: 0 });
        setReports(reportResult.items);
        setTotal(reportResult.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [filters, userLocation, scopeMode, radiusKm]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (wsConnected) return;
    const interval = window.setInterval(() => void loadData(), POLL_MS);
    return () => window.clearInterval(interval);
  }, [wsConnected, loadData]);

  useEffect(() => {
    if (wsDisabled) return;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let cancelled = false;
    let openedOnce = false;

    const connect = () => {
      if (cancelled) return;
      try {
        socket = new WebSocket(buildCrowdWsUrl(API_BASE, "/api/crowd-reports/ws"));
      } catch {
        setWsConnected(false);
        reconnectTimer = window.setTimeout(connect, WS_RECONNECT_MS);
        return;
      }

      socket.onopen = () => {
        openedOnce = true;
        setWsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as { event?: string };
          if (message.event) {
            void loadData();
          }
        } catch {
          void loadData();
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
        if (!openedOnce) {
          // If WS never opens (common in dev proxy without ws forwarding), fall back to polling only.
          setWsDisabled(true);
          return;
        }
        if (!cancelled) {
          reconnectTimer = window.setTimeout(connect, WS_RECONNECT_MS);
        }
      };

      socket.onerror = () => {
        setWsConnected(false);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (socket && socket.readyState === WebSocket.OPEN) socket.close();
    };
  }, [loadData, wsDisabled]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationError(null);
      },
      () => {
        setLocationError("Location permission denied. You can still enter coordinates manually.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  useEffect(() => {
    if (!userLocation) {
      setUserLocationName("Unavailable");
      return;
    }

    let cancelled = false;
    reverseGeocode(userLocation.latitude, userLocation.longitude)
      .then((name) => {
        if (!cancelled) setUserLocationName(name);
      })
      .catch(() => {
        if (!cancelled) setUserLocationName(`${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)}`);
      });

    return () => {
      cancelled = true;
    };
  }, [userLocation]);

  const locationLabel = useMemo(() => {
    if (userLocation) {
      return `${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)}`;
    }
    return "Unavailable";
  }, [userLocation]);

  return (
    <main className="crowd-root min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-2xl border border-sky-700/40 bg-gradient-to-r from-sky-950 via-sky-900 to-cyan-800 p-6 text-white shadow-xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Crowd Reporting Module</h1>
          <p className="mt-1 text-sm font-medium text-cyan-100">Live disaster reports with location-aware response.</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/25 bg-slate-900/25 px-3 py-1 text-xs font-semibold text-cyan-50">
              Your Coordinates: {locationLabel}
            </span>
            <span className="rounded-full border border-white/25 bg-slate-900/25 px-3 py-1 text-xs font-semibold text-cyan-50">
              Map Location: {userLocationName}
            </span>
            <span className="rounded-full border border-white/25 bg-slate-900/25 px-3 py-1 text-xs font-semibold text-cyan-50">
              Live Mode: {wsConnected ? "WebSocket" : "Polling"}
            </span>
            {scopeMode === "nearby" ? (
              <span className="rounded-full border border-white/25 bg-slate-900/25 px-3 py-1 text-xs font-semibold text-cyan-50">
                Radius: {radiusKm} km
              </span>
            ) : (
              <span className="rounded-full border border-white/25 bg-slate-900/25 px-3 py-1 text-xs font-semibold text-cyan-50">
                Scope: All reports
              </span>
            )}
            {locationError && (
              <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-medium text-amber-900">{locationError}</span>
            )}
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                viewMode === "list" ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-700"
              }`}
              onClick={() => setViewMode("list")}
              type="button"
            >
              Crowd Reports List
            </button>
            <button
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                viewMode === "post" ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-700"
              }`}
              onClick={() => setViewMode("post")}
              type="button"
            >
              Post Report
            </button>
          </div>
        </section>

        {viewMode === "list" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  scopeMode === "nearby" ? "bg-cyan-700 text-white" : "bg-slate-100 text-slate-700"
                }`}
                onClick={() => setScopeMode("nearby")}
                type="button"
              >
                Nearby
              </button>
              <button
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  scopeMode === "all" ? "bg-cyan-700 text-white" : "bg-slate-100 text-slate-700"
                }`}
                onClick={() => setScopeMode("all")}
                type="button"
              >
                All
              </button>
            </div>

            {scopeMode === "nearby" && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">Nearby Radius</p>
                  <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-700">
                    {radiusKm} km
                  </span>
                </div>
                <input
                  type="range"
                  min={MIN_RADIUS_KM}
                  max={MAX_RADIUS_KM}
                  step={5}
                  value={radiusKm}
                  onChange={(event) => setRadiusKm(Number(event.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-cyan-700"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {[10, 20, 30, 50].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        radiusKm === value ? "bg-cyan-700 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                      onClick={() => setRadiusKm(value)}
                    >
                      {value} km
                    </button>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                  <span>{MIN_RADIUS_KM} km</span>
                  <span>{MAX_RADIUS_KM} km</span>
                </div>
              </div>
            )}
          </section>
        )}

        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">{error}</p>
        )}
        {scopeMode === "nearby" && !userLocation && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
            Enable location to view reports within {radiusKm} km of your position.
          </p>
        )}
        {loading && <p className="text-sm text-slate-500">Refreshing reports...</p>}

        {viewMode === "list" ? (
          <>
            <FiltersBar value={filters} onChange={setFilters} />
            <ReportsMap reports={reports} currentLocation={userLocation} />
            <ReportsList reports={reports} total={total} currentLocation={userLocation} />
          </>
        ) : (
          <ReportForm onCreated={loadData} currentLocation={userLocation} />
        )}
      </div>
    </main>
  );
}

function buildCrowdWsUrl(base: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const wsProto = window.location.protocol === "https:" ? "wss" : "ws";

  if (base.startsWith("http://") || base.startsWith("https://")) {
    const url = new URL(base);
    url.protocol = `${wsProto}:`;
    url.pathname = `${url.pathname.replace(/\/$/, "")}${normalizedPath}`;
    return url.toString();
  }

  const normalizedBase = base.startsWith("/") ? base : `/${base}`;
  return `${wsProto}://${window.location.host}${normalizedBase.replace(/\/$/, "")}${normalizedPath}`;
}
