import { useEffect, useState } from "react";
import { reverseGeocode } from "../api/mapApi";
import type { CrowdReport } from "../types/crowd";

type Props = {
  reports: CrowdReport[];
  total: number;
  currentLocation: { latitude: number; longitude: number } | null;
};

function formatDate(value: string): string {
  const hasTimezone = /[zZ]|[+\-]\d{2}:\d{2}$/.test(value);
  const normalized = hasTimezone ? value : `${value}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

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

function severityClass(severity: string): string {
  if (severity === "critical") return "bg-rose-100 text-rose-700";
  if (severity === "high") return "bg-orange-100 text-orange-700";
  if (severity === "medium") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

export function ReportsList({ reports, total, currentLocation }: Props) {
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [locationNames, setLocationNames] = useState<Record<string, string>>({});

  const locationKey = (latitude: number, longitude: number): string =>
    `${latitude.toFixed(5)},${longitude.toFixed(5)}`;

  useEffect(() => {
    if (!previewImage) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewImage(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewImage]);

  useEffect(() => {
    const keys = Array.from(
      new Set(reports.slice(0, 50).map((report) => locationKey(report.latitude, report.longitude)))
    ).filter((key) => !locationNames[key]);

    if (keys.length === 0) return;
    let cancelled = false;

    void Promise.all(
      keys.map(async (key) => {
        const [latText, lonText] = key.split(",");
        const latitude = Number(latText);
        const longitude = Number(lonText);
        try {
          const name = await reverseGeocode(latitude, longitude);
          return [key, name] as const;
        } catch {
          return [key, key] as const;
        }
      })
    ).then((entries) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      entries.forEach(([key, name]) => {
        next[key] = name;
      });
      setLocationNames((prev) => ({ ...prev, ...next }));
    });

    return () => {
      cancelled = true;
    };
  }, [reports, locationNames]);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Crowd Reports</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{total} total</span>
      </div>

      {reports.length === 0 && <p className="text-sm text-slate-500">No reports match current filters.</p>}

      <div className="space-y-3">
        {reports.map((report) => {
          const distanceKm =
            currentLocation !== null
              ? calcDistanceKm(currentLocation, { latitude: report.latitude, longitude: report.longitude })
              : null;

          return (
            <article key={report.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-medium text-sky-700">{report.disaster_type}</span>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${severityClass(report.severity)}`}>
                  {report.severity}
                </span>
                <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700">{report.status}</span>
                <span className="text-xs text-slate-500">{formatDate(report.created_at)}</span>
              </div>

              <p className="mt-2 text-sm text-slate-700">{report.description}</p>

              {report.photo_urls.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Linked Media</p>
                  <div className="report-media-strip">
                  {report.photo_urls.slice(0, 4).map((url, index) => (
                    <button
                      key={`${report.id}-photo-${index}`}
                      type="button"
                      className="report-media-link"
                      title="View image"
                      onClick={() => setPreviewImage({ url, title: `Photo ${index + 1}` })}
                    >
                      <img
                        src={url}
                        alt={`Report photo ${index + 1}`}
                        className="report-media-thumb"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                      <span className="report-media-caption">Photo {index + 1}</span>
                    </button>
                  ))}
                  </div>
                </div>
              )}

              <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                <p>
                  <span className="font-semibold text-slate-700">Category:</span> {report.category.replace(/_/g, " ")}
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Location:</span> {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                  <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                    {locationNames[locationKey(report.latitude, report.longitude)] ?? "Resolving location..."}
                  </span>
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Confidence:</span> {Math.round(report.confidence_score * 100)}%
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Distance:</span>{" "}
                  {distanceKm === null ? "Enable location" : `${distanceKm.toFixed(2)} km`}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/70 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="w-full max-w-5xl rounded-xl bg-white p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">{previewImage.title}</p>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                onClick={() => setPreviewImage(null)}
              >
                Close
              </button>
            </div>
            <div className="flex max-h-[75vh] items-center justify-center overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
              <img src={previewImage.url} alt={previewImage.title} className="h-auto max-h-[70vh] w-auto max-w-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
