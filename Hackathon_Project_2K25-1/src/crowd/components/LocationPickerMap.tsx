import { useEffect, useRef } from "react";
import L from "leaflet";

type Props = {
  latitude: number;
  longitude: number;
  onPick: (lat: number, lon: number) => void;
  currentLocation: { latitude: number; longitude: number } | null;
};

const reportIcon = L.divIcon({
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:#dc2626;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const userIcon = L.divIcon({
  html: '<div style="width:16px;height:16px;border-radius:9999px;background:#0369a1;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

export function LocationPickerMap({ latitude, longitude, onPick, currentLocation }: Props) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const reportMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const onPickRef = useRef(onPick);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    const map = L.map(mapElementRef.current).setView([latitude, longitude], 8);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    reportMarkerRef.current = L.marker([latitude, longitude], { icon: reportIcon }).addTo(map);

    if (currentLocation) {
      userMarkerRef.current = L.marker([currentLocation.latitude, currentLocation.longitude], { icon: userIcon }).addTo(map);
    }

    map.on("click", (event: L.LeafletMouseEvent) => {
      onPickRef.current(event.latlng.lat, event.latlng.lng);
    });

    // Let layout settle before first size/view calculation.
    const timer = window.setTimeout(() => {
      if (!mapRef.current || mapRef.current !== map) return;
      map.invalidateSize();
      if (currentLocation) {
        const bounds = L.latLngBounds(
          [latitude, longitude],
          [currentLocation.latitude, currentLocation.longitude]
        ).pad(0.3);
        map.fitBounds(bounds, { animate: false });
      } else {
        map.setView([latitude, longitude], 8, { animate: false });
      }
    }, 0);

    const handleResize = () => {
      if (!mapRef.current) return;
      map.invalidateSize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
      // Prevent pending zoom/pan transitions from firing after unmount.
      map.off();
      map.stop();
      map.remove();
      mapRef.current = null;
      reportMarkerRef.current = null;
      userMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !reportMarkerRef.current) return;

    reportMarkerRef.current.setLatLng([latitude, longitude]);
    map.stop();
    if (currentLocation) {
      const bounds = L.latLngBounds(
        [latitude, longitude],
        [currentLocation.latitude, currentLocation.longitude]
      ).pad(0.3);
      map.fitBounds(bounds, { animate: false });
    } else {
      map.setView([latitude, longitude], map.getZoom(), { animate: false });
    }
  }, [latitude, longitude, currentLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    userMarkerRef.current?.remove();
    userMarkerRef.current = null;

    if (currentLocation) {
      userMarkerRef.current = L.marker([currentLocation.latitude, currentLocation.longitude], { icon: userIcon }).addTo(map);
    }
  }, [currentLocation]);

  return (
    <div
      ref={mapElementRef}
      className="w-full overflow-hidden rounded-xl border border-slate-200"
      style={{ height: "320px", minHeight: "320px", width: "100%" }}
    />
  );
}
