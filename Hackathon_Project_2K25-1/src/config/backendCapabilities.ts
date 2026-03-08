import { API_BASE } from "./apiBase";

export type BackendCapabilities = {
  hasFlood: boolean;
};

let capabilitiesPromise: Promise<BackendCapabilities> | null = null;

async function detectBackendCapabilities(): Promise<BackendCapabilities> {
  // Try root endpoint first.
  try {
    const rootRes = await fetch(`${API_BASE}/`);
    const rootData = (await rootRes.json().catch(() => ({}))) as { endpoints?: Record<string, string> };
    const endpointValues = Object.values(rootData.endpoints ?? {});
    const hasFloodFromRoot = endpointValues.some((value) => value.includes("/flood/"));
    if (hasFloodFromRoot) return { hasFlood: true };
  } catch {
    // Continue to OpenAPI fallback.
  }

  // Fallback to OpenAPI path discovery.
  try {
    const openapiRes = await fetch(`${API_BASE}/openapi.json`);
    const openapi = (await openapiRes.json().catch(() => ({}))) as { paths?: Record<string, unknown> };
    const pathKeys = Object.keys(openapi.paths ?? {});
    return {
      hasFlood: pathKeys.some((path) => path.startsWith("/flood/"))
    };
  } catch {
    return { hasFlood: false };
  }
}

export function getBackendCapabilities(): Promise<BackendCapabilities> {
  if (!capabilitiesPromise) {
    capabilitiesPromise = detectBackendCapabilities();
  }
  return capabilitiesPromise;
}

