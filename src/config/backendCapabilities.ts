import { API_BASE, CROWD_API_BASE, getCrowdAuthHeaders } from "./apiBase";

export type BackendCapabilities = {
  hasFlood: boolean;
  hasCrowdReports: boolean;
  hasReverseGeocode: boolean;
  hasCrowdReportsWs: boolean;
};

let capabilitiesPromise: Promise<BackendCapabilities> | null = null;

async function detectBackendCapabilities(): Promise<BackendCapabilities> {
  // Try general backend root endpoint first.
  try {
    const rootRes = await fetch(`${API_BASE}/`);
    const rootData = (await rootRes.json().catch(() => ({}))) as { endpoints?: Record<string, string> };
    const endpointValues = Object.values(rootData.endpoints ?? {});
    const hasFloodFromRoot = endpointValues.some((value) => value.includes("/flood/"));
    if (hasFloodFromRoot) {
      // Continue detection for crowd on crowd base before returning.
      const crowd = await detectCrowdCapabilities();
      return { hasFlood: true, ...crowd };
    }
  } catch {
    // Continue to OpenAPI fallback.
  }

  // Fallback to OpenAPI path discovery for general backend.
  try {
    const openapiRes = await fetch(`${API_BASE}/openapi.json`);
    const openapi = (await openapiRes.json().catch(() => ({}))) as { paths?: Record<string, unknown> };
    const pathKeys = Object.keys(openapi.paths ?? {});
    const crowd = await detectCrowdCapabilities();
    return {
      hasFlood: pathKeys.some((path) => path.startsWith("/flood/")),
      ...crowd
    };
  } catch {
    const crowd = await detectCrowdCapabilities();
    return { hasFlood: false, ...crowd };
  }
}

async function detectCrowdCapabilities(): Promise<Pick<BackendCapabilities, "hasCrowdReports" | "hasReverseGeocode" | "hasCrowdReportsWs">> {
  try {
    const openapiRes = await fetch(`${CROWD_API_BASE}/openapi.json`, {
      headers: {
        ...getCrowdAuthHeaders()
      }
    });
    const openapi = (await openapiRes.json().catch(() => ({}))) as { paths?: Record<string, unknown> };
    const pathKeys = Object.keys(openapi.paths ?? {});
    return {
      hasCrowdReports: pathKeys.some((path) => path.startsWith("/api/crowd-reports")),
      hasReverseGeocode: pathKeys.includes("/api/reverse-geocode"),
      hasCrowdReportsWs: pathKeys.some((path) => path === "/api/crowd-reports/ws" || path.startsWith("/api/crowd-reports/ws/"))
    };
  } catch {
    return { hasCrowdReports: false, hasReverseGeocode: false, hasCrowdReportsWs: false };
  }
}

export function getBackendCapabilities(): Promise<BackendCapabilities> {
  if (!capabilitiesPromise) {
    capabilitiesPromise = detectBackendCapabilities();
  }
  return capabilitiesPromise;
}
