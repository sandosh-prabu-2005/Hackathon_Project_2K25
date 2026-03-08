import { CROWD_API_BASE, getCrowdAuthHeaders } from "../../config/apiBase";
import { getBackendCapabilities } from "../../config/backendCapabilities";

function extractLocationName(
  data: Partial<{
    name: string;
    display_name: string;
    address: { city?: string; town?: string; village?: string; county?: string; state?: string };
  }>,
  lat: number,
  lon: number
): string {
  const candidate =
    data.display_name ||
    data.address?.city ||
    data.address?.town ||
    data.address?.village ||
    data.address?.county ||
    data.address?.state ||
    data.name ||
    data.display_name;
  const cleaned = String(candidate || "").trim();
  if (cleaned && cleaned.toLowerCase() !== "current location" && cleaned.toLowerCase() !== "unknown location") {
    return cleaned;
  }
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const capabilities = await getBackendCapabilities();
    if (capabilities.hasReverseGeocode) {
      const apiUrl = `${CROWD_API_BASE}/api/reverse-geocode?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
      const apiResponse = await fetch(apiUrl, {
        headers: {
          Accept: "application/json",
          ...getCrowdAuthHeaders()
        }
      });
      if (apiResponse.ok) {
        const apiData = (await apiResponse.json()) as {
          name?: string;
          display_name?: string;
          address?: { city?: string; town?: string; village?: string; county?: string; state?: string };
        };
        return extractLocationName(apiData, lat, lon);
      }
    }
  } catch {
    // Fallback to public geocoding provider below.
  }

  try {
    const fallbackUrl =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1`;
    const fallbackResponse = await fetch(fallbackUrl, {
      headers: {
        Accept: "application/json"
      }
    });
    if (!fallbackResponse.ok) {
      throw new Error("Failed to fetch location details");
    }
    const fallbackData = (await fallbackResponse.json()) as {
      display_name?: string;
      address?: { city?: string; town?: string; village?: string; county?: string; state?: string };
    };
    return extractLocationName(fallbackData, lat, lon);
  } catch {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
}
