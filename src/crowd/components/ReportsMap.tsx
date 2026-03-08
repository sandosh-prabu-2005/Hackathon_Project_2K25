import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import type { CrowdReport } from "../types/crowd";

type Props = {
  reports: CrowdReport[];
  currentLocation: { latitude: number; longitude: number } | null;
};

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];

const userIcon = L.divIcon({
  html: '<div style="width:16px;height:16px;border-radius:9999px;background:#0369a1;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const reportIcon = L.divIcon({
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:#dc2626;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

export function ReportsMap({ reports, currentLocation }: Props) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const center = useMemo<[number, number]>(() => {
    if (currentLocation) return [currentLocation.latitude, currentLocation.longitude];
    if (reports.length > 0) return [reports[0].latitude, reports[0].longitude];
    return DEFAULT_CENTER;
  }, [currentLocation, reports]);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    mapRef.current = L.map(mapElementRef.current).setView(center, 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapRef.current);

    markersLayerRef.current = L.layerGroup().addTo(mapRef.current);

    const handleResize = () => {
      mapRef.current?.invalidateSize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      // Prevent pending zoom/pan transitions from firing after unmount.
      mapRef.current?.off();
      mapRef.current?.stop();
      mapRef.current?.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, [center]);

  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    if (currentLocation) {
      L.marker([currentLocation.latitude, currentLocation.longitude], { icon: userIcon })
        .bindPopup("You are here")
        .addTo(markersLayer);
    }

    reports.forEach((report) => {
      L.marker([report.latitude, report.longitude], { icon: reportIcon })
        .bindPopup(
          `<strong>${report.disaster_type} (${report.severity})</strong><br/>${report.description}<br/>${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`
        )
        .addTo(markersLayer);
    });

    map.setView(center, map.getZoom() < 6 ? 6 : map.getZoom(), { animate: false });
  }, [reports, currentLocation, center]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-slate-900">Live Reports Map</h2>
      <div
        ref={mapElementRef}
        className="w-full overflow-hidden rounded-xl"
        style={{ height: "420px", minHeight: "420px", width: "100%" }}
      />
    </section>
  );
}
