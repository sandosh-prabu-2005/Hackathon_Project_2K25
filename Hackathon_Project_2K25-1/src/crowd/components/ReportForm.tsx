import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createCrowdReport, uploadCrowdReportImage } from "../api/crowdReportsApi";
import { reverseGeocode } from "../api/mapApi";
import type { CrowdReportCreate, DisasterType, ReportCategory, SeverityLevel } from "../types/crowd";
import { LocationPickerMap } from "./LocationPickerMap";

type Props = {
  onCreated: () => void;
  currentLocation: { latitude: number; longitude: number } | null;
};

const disasterTypes: Array<DisasterType> = ["flood", "cyclone", "landslide", "earthquake", "fire", "other"];
const categories: Array<ReportCategory> = [
  "trapped",
  "medical",
  "road_blocked",
  "shelter_needed",
  "food_water_needed",
  "infrastructure_damage",
  "other"
];
const severities: Array<SeverityLevel> = ["low", "medium", "high", "critical"];
const MAX_UPLOAD_IMAGE_BYTES = 1 * 1024 * 1024; // 1MB limit for testing

const initialState: CrowdReportCreate = {
  disaster_type: "flood",
  category: "trapped",
  severity: "medium",
  description: "",
  latitude: 20.5937,
  longitude: 78.9629,
  photo_urls: [],
  reporter_contact: "",
  source: "citizen"
};

export function ReportForm({ onCreated, currentLocation }: Props) {
  const [form, setForm] = useState<CrowdReportCreate>(initialState);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [didAutoFillLocation, setDidAutoFillLocation] = useState(false);
  const [selectedLocationName, setSelectedLocationName] = useState<string>("Resolving location...");
  const uploadFileRef = useRef<HTMLInputElement | null>(null);
  const cameraFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!currentLocation || didAutoFillLocation) return;
    setForm((prev) => ({
      ...prev,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude
    }));
    setDidAutoFillLocation(true);
  }, [currentLocation, didAutoFillLocation]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const name = await reverseGeocode(form.latitude, form.longitude);
        setSelectedLocationName(name);
      } catch {
        setSelectedLocationName(`${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [form.latitude, form.longitude]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await createCrowdReport({
        ...form,
        description: form.description.trim(),
        reporter_contact: form.reporter_contact?.trim() || undefined
      });
      setForm({
        ...initialState,
        latitude: currentLocation?.latitude ?? initialState.latitude,
        longitude: currentLocation?.longitude ?? initialState.longitude
      });
      setSuccess("Report posted successfully.");
      onCreated();
      window.setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  const uploadPhotoFile = async (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_IMAGE_BYTES) {
      setError("Image size must be under 1MB");
      setSuccess(null);
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const uploadedUrl = await uploadCrowdReportImage(file);
      setForm((prev) => ({ ...prev, photo_urls: [...prev.photo_urls, uploadedUrl].slice(0, 5) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setForm((prev) => ({
      ...prev,
      photo_urls: prev.photo_urls.filter((_, i) => i !== index)
    }));
  };

  const useCurrentLocation = () => {
    if (!currentLocation) return;
    setForm((prev) => ({
      ...prev,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude
    }));
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Post New Report</h2>
      <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <label className="text-sm font-medium text-slate-700">
          <span>Disaster Type</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-200 focus:ring-2"
            value={form.disaster_type}
            onChange={(e) => setForm({ ...form, disaster_type: e.target.value as DisasterType })}
          >
            {disasterTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          <span>Category</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-200 focus:ring-2"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as ReportCategory })}
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          <span>Severity</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-200 focus:ring-2"
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value as SeverityLevel })}
          >
            {severities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          <span>Latitude</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-200 focus:ring-2"
            type="number"
            step="0.000001"
            value={form.latitude}
            onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })}
            required
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          <span>Longitude</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-200 focus:ring-2"
            type="number"
            step="0.000001"
            value={form.longitude}
            onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })}
            required
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          <span>Reporter Contact (optional)</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-200 focus:ring-2"
            value={form.reporter_contact}
            onChange={(e) => setForm({ ...form, reporter_contact: e.target.value })}
            placeholder="Phone or email"
          />
        </label>

        <div className="md:col-span-2 space-y-2">
          <p className="text-sm font-medium text-slate-700">Pick report location on map (click map to set marker)</p>
          <LocationPickerMap
            latitude={form.latitude}
            longitude={form.longitude}
            currentLocation={currentLocation}
            onPick={(lat, lon) => setForm((prev) => ({ ...prev, latitude: lat, longitude: lon }))}
          />
          <p className="text-xs text-slate-600">Selected location: {selectedLocationName}</p>
        </div>

        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          <span>Description</span>
          <textarea
            className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-200 focus:ring-2"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            minLength={5}
            maxLength={2000}
            required
          />
        </label>

        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">
            <span>Photo (optional)</span>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-medium text-white"
                type="button"
                onClick={() => uploadFileRef.current?.click()}
              >
                Upload Image
              </button>
              <button
                className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-white"
                type="button"
                onClick={() => cameraFileRef.current?.click()}
              >
                Open Camera
              </button>
            </div>
          </label>
          <input
            ref={uploadFileRef}
            className="hidden"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={(e) => void uploadPhotoFile(e.target.files?.[0] ?? null)}
          />
          <input
            ref={cameraFileRef}
            className="hidden"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            capture="environment"
            onChange={(e) => void uploadPhotoFile(e.target.files?.[0] ?? null)}
          />
          {uploading && <p className="mt-1 text-xs text-slate-500">Uploading image...</p>}
          {form.photo_urls.length > 0 && (
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {form.photo_urls.map((url, i) => (
                <li key={`${url}-${i}`} className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <a href={url} target="_blank" rel="noreferrer" title="Open full image">
                    <img
                      src={url}
                      alt={`Selected photo ${i + 1}`}
                      className="h-28 w-full rounded-lg border border-slate-200 object-cover"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  </a>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-700">{url}</span>
                    <button className="rounded-full bg-rose-600 px-2 py-0.5 text-xs text-white" type="button" onClick={() => removePhoto(i)}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2 md:col-span-2 md:flex-row md:items-center">
          <button
            className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={useCurrentLocation}
            disabled={!currentLocation}
          >
            Use Current Location
          </button>
          <button
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={loading || uploading}
          >
            {loading ? "Submitting..." : "Submit Report"}
          </button>
        </div>
        {success && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 md:col-span-2">
            {success}
          </p>
        )}
        {error && <p className="text-sm font-medium text-rose-600 md:col-span-2">{error}</p>}
      </form>
    </section>
  );
}
