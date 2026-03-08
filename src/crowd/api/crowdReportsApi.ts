import type {
  CrowdReport,
  CrowdReportCreate,
  CrowdReportFilters,
  CrowdReportListResponse,
  HeatmapPoint
} from "../types/crowd";
import { CROWD_API_BASE, getCrowdAuthHeaders } from "../../config/apiBase";

function apiBasePrefix(): string {
  if (CROWD_API_BASE.startsWith("http://") || CROWD_API_BASE.startsWith("https://")) {
    const parsed = new URL(CROWD_API_BASE);
    return parsed.pathname.replace(/\/$/, "");
  }
  return CROWD_API_BASE.replace(/\/$/, "");
}

function withApiPrefix(pathOrRelative: string): string {
  const value = pathOrRelative.trim();
  if (!value) return value;

  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  if (CROWD_API_BASE.startsWith("http://") || CROWD_API_BASE.startsWith("https://")) {
    const parsed = new URL(CROWD_API_BASE);
    parsed.pathname = `${parsed.pathname.replace(/\/$/, "")}${normalizedPath}`;
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  }

  const prefix = apiBasePrefix();
  return `${prefix}${normalizedPath}`;
}

function normalizePhotoUrl(url: string): string {
  const value = url.trim();
  if (!value) return value;

  const toCrowdImageApi = (pathname: string): string | null => {
    const uploadsMatch = pathname.match(/^\/uploads\/crowd_reports\/([^/?#]+)$/i);
    if (uploadsMatch) {
      return withApiPrefix(`/api/crowd-reports/image/${uploadsMatch[1]}`);
    }

    const apiMatch = pathname.match(/^\/api\/crowd-reports\/image\/([^/?#]+)$/i);
    if (apiMatch) {
      return withApiPrefix(`/api/crowd-reports/image/${apiMatch[1]}`);
    }

    return null;
  };

  try {
    const parsed = new URL(value);
    if (parsed.protocol === "ws:") parsed.protocol = "http:";
    if (parsed.protocol === "wss:") parsed.protocol = "https:";

    const mapped = toCrowdImageApi(parsed.pathname);
    if (mapped) return mapped;

    // In dev/proxy mode backend can return same-origin /uploads URLs that need API prefix.
    if (
      typeof window !== "undefined" &&
      parsed.origin === window.location.origin &&
      parsed.pathname.startsWith("/uploads/") &&
      apiBasePrefix()
    ) {
      return withApiPrefix(parsed.pathname);
    }
    return parsed.toString();
  } catch {
    const mapped = toCrowdImageApi(value.startsWith("/") ? value : `/${value}`);
    if (mapped) return mapped;
    return withApiPrefix(value);
  }
}

function normalizeReport(report: CrowdReport): CrowdReport {
  return {
    ...report,
    photo_urls: Array.isArray(report.photo_urls) ? report.photo_urls.map(normalizePhotoUrl).filter(Boolean) : []
  };
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });
  return query.toString();
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${CROWD_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...getCrowdAuthHeaders(),
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(body.detail ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function createCrowdReport(payload: CrowdReportCreate): Promise<CrowdReport> {
  const report = await http<CrowdReport>("/api/crowd-reports", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return normalizeReport(report);
}

export async function listCrowdReports(filters: CrowdReportFilters = {}): Promise<CrowdReportListResponse> {
  const query = toQuery({
    disaster_type: filters.disaster_type,
    status: filters.status,
    severity: filters.severity,
    min_lat: filters.min_lat,
    max_lat: filters.max_lat,
    min_lon: filters.min_lon,
    max_lon: filters.max_lon,
    limit: filters.limit ?? 50,
    offset: filters.offset ?? 0
  });

  const response = await http<CrowdReportListResponse>(`/api/crowd-reports${query ? `?${query}` : ""}`);
  return {
    ...response,
    items: response.items.map(normalizeReport)
  };
}

export async function getHeatmapPoints(filters: CrowdReportFilters = {}): Promise<HeatmapPoint[]> {
  const query = toQuery({
    disaster_type: filters.disaster_type,
    status: filters.status,
    severity: filters.severity
  });

  return http<HeatmapPoint[]>(`/api/crowd-reports/heatmap${query ? `?${query}` : ""}`);
}

export async function uploadCrowdReportImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${CROWD_API_BASE}/api/crowd-reports/upload-image`, {
    method: "POST",
    headers: {
      ...getCrowdAuthHeaders()
    },
    body: formData
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "Image upload failed" }));
    throw new Error(body.detail ?? `HTTP ${response.status}`);
  }

  const data = (await response.json()) as { url: string };
  return normalizePhotoUrl(data.url);
}
