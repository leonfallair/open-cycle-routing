// ============================================================================
// geocoding.js – Adresssuche über Nominatim (OpenStreetMap)
// ============================================================================

const Geocoding = (() => {
  /**
   * Sucht Orte/Adressen anhand eines Textes.
   * Gibt ein Array von { label, coords: [lng, lat] } zurück.
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
        // Nominatim Nutzungsrichtlinie: eigener Identifier statt generischem UA
        Accept: "application/json",
      },
    });
    if (!res.ok) throw new Error("Geocoding fehlgeschlagen (" + res.status + ")");

    const data = await res.json();
    return data.map((item) => ({
      label: item.display_name,
      coords: [parseFloat(item.lon), parseFloat(item.lat)],
    }));
  }

  /** Reverse-Geocoding: Koordinate -> lesbarer Name (für Marker-Beschriftung) */
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
