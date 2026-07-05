// ============================================================================
// geocoding.js – address search via Nominatim (OpenStreetMap)
// ============================================================================

const Geocoding = (() => {
  /**
   * Searches for places/addresses matching a text query.
   * Returns an array of { label, coords: [lng, lat] }.
   */
  async function search(query) {
    if (!query || query.trim().length < 3) return [];

    const url = new URL(CONFIG.NOMINATIM_URL + "/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "6");
    url.searchParams.set("addressdetails", "0");

    const res = await fetch(url, {
      headers: {
        // Nominatim usage policy: identify the app instead of a generic UA
        Accept: "application/json",
      },
    });
    if (!res.ok) throw new Error("Geocoding failed (" + res.status + ")");

    const data = await res.json();
    return data.map((item) => ({
      label: item.display_name,
      coords: [parseFloat(item.lon), parseFloat(item.lat)],
    }));
  }

  /** Reverse geocoding: coordinate -> readable name (for marker labels) */
  async function reverse([lng, lat]) {
    const url = new URL(CONFIG.NOMINATIM_URL + "/reverse");
    url.searchParams.set("lon", lng);
    url.searchParams.set("lat", lat);
    url.searchParams.set("format", "jsonv2");

    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return data.display_name ?? null;
    } catch {
      return null;
    }
  }

  return { search, reverse };
})();