export async function geocodeAddress(
  address: string,
  city: string,
  state: string,
  zip: string
): Promise<{ lat: number; lng: number } | null> {
  const parts = [address, city, state, zip].filter(Boolean);
  if (parts.length < 2) return null;

  const query = encodeURIComponent(parts.join(", ") + ", USA");
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=us`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "TradeBase/1.0 (tradebase.contractors)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data?.[0]?.lat || !data?.[0]?.lon) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

/**
 * Geocodes a loose "City, State" (or similar free-text) service-area string.
 * Returns null if it doesn't look like enough to geocode.
 */
export async function geocodeServiceArea(serviceArea: string): Promise<{ lat: number; lng: number } | null> {
  const trimmed = serviceArea.trim();
  if (!trimmed) return null;
  const bits = trimmed.split(",").map((b) => b.trim()).filter(Boolean);
  if (bits.length < 1) return null;
  const city = bits[0] || "";
  const state = bits[1] || "";
  return geocodeAddress("", city, state, "");
}
