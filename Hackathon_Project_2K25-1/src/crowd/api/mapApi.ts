import { API_BASE } from "../../config/apiBase";

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const url = `${API_BASE}/api/reverse-geocode?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("Failed to fetch location details");
  }

  const data = (await response.json()) as {
    name?: string;
    display_name?: string;
    address?: { city?: string; town?: string; village?: string; county?: string; state?: string };
  };
  const candidate =
    data.display_name ||
    data.address?.city ||
    data.address?.town ||
    data.address?.village ||
    data.address?.county ||
    data.address?.state ||
    data.name ||
    data.display_name;
  const cleaned = (candidate ?? "").trim();
  if (cleaned && cleaned.toLowerCase() !== "current location" && cleaned.toLowerCase() !== "unknown location") {
    return cleaned;
  }
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}
