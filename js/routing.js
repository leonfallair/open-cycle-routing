// ============================================================================
// routing.js – Kommunikation mit dem BRouter-Routing-Server
//
// BRouter ist ein Open-Source-Routing-Engine speziell für Fahrrad/Fuß-
// Navigation auf Basis von OpenStreetMap-Daten. Der öffentliche Server ist
// kostenlos nutzbar. Siehe https://github.com/abrensch/brouter
// ============================================================================

const Routing = (() => {
  /**
   * Baut die BRouter-Request-URL.
   * @param {Array<[number,number]>} coordsList Liste von [lng, lat]
   * @param {string} profile BRouter-Profilname (z.B. "trekking")
   * @param {number} alternativeidx 0 = beste Route, 1/2/3 = Alternativen
   */
  function buildUrl(coordsList, profile, alternativeidx = 0) {
    const lonlats = coordsList.map(([lng, lat]) => `${lng},${lat}`).join("|");
    const url = new URL(CONFIG.BROUTER_API_URL);
    url.searchParams.set("lonlats", lonlats);
    url.searchParams.set("profile", profile);
    url.searchParams.set("alternativeidx", String(alternativeidx));
    url.searchParams.set("format", "geojson");
    return url.toString();
  }

  async function fetchWithTimeout(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.ROUTING_TIMEOUT);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Routing-Server antwortete mit ${res.status}${text ? ": " + text.slice(0, 200) : ""}`
        );
      }
      return await res.json();
    } catch (err) {
      if (err.name === "AbortError") {
        throw new Error("Zeitüberschreitung bei der Routenberechnung.");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Berechnet Höhenmeter bergauf/bergab aus den z-Werten der Koordinaten */
  function computeElevation(coordinates) {
    let gain = 0;
    let loss = 0;
    let hasElevation = false;
    for (let i = 1; i < coordinates.length; i++) {
      const prevZ = coordinates[i - 1][2];
      const curZ = coordinates[i][2];
      if (prevZ == null || curZ == null) continue;
      hasElevation = true;
      const diff = curZ - prevZ;
      if (diff > 0) gain += diff;
      else loss += -diff;
    }
    return hasElevation ? { gain, loss } : { gain: null, loss: null };
  }

  /** Extrahiert nutzbare Metadaten aus einer BRouter-GeoJSON-Antwort */
  function parseResult(geojson) {
    const feature = geojson.features?.[0];
    if (!feature) throw new Error("Keine Route in der Server-Antwort gefunden.");

    const coords = feature.geometry.coordinates;
    const props = feature.properties || {};

    const distance = props["track-length"]
      ? parseFloat(props["track-length"])
      : coords.reduce((sum, c, i) => {
          if (i === 0) return 0;
          return sum + Utils.haversine(coords[i - 1], c);
        }, 0);

    const duration = props["total-time"] ? parseFloat(props["total-time"]) : null;
    const elevation = computeElevation(coords);

    return {
      geojson,
      coordinates: coords,
      distance,
      duration,
      elevationGain: elevation.gain,
      elevationLoss: elevation.loss,
    };
  }

  /**
   * Berechnet eine Route inkl. optionaler Alternativen.
   * @returns {Promise<{main: object, alternatives: object[]}>}
   */
  async function calculateRoute(coordsList, profile, wantAlternatives) {
    if (coordsList.length < 2) {
      throw new Error("Mindestens Start und Ziel werden benötigt.");
    }

    const mainUrl = buildUrl(coordsList, profile, 0);
    const mainJson = await fetchWithTimeout(mainUrl);
    const main = parseResult(mainJson);

    let alternatives = [];
    // Alternativrouten liefert BRouter zuverlässig nur ohne Zwischenpunkte
    if (wantAlternatives && coordsList.length === 2 && CONFIG.ALTERNATIVE_ROUTES > 0) {
      const requests = [];
      for (let i = 1; i <= CONFIG.ALTERNATIVE_ROUTES; i++) {
        requests.push(
          fetchWithTimeout(buildUrl(coordsList, profile, i))
            .then(parseResult)
            .catch(() => null) // Alternative optional – Fehler hier ignorieren
        );
      }
      alternatives = (await Promise.all(requests)).filter(Boolean);
    }

    return { main, alternatives };
  }

  /** Baut eine GPX-Datei (String) aus einer berechneten Route */
  function toGPX(route, name = "OpenRadRoute Track") {
    const points = route.coordinates
      .map(([lng, lat, ele]) => {
        const eleTag = ele != null ? `<ele>${ele.toFixed(1)}</ele>` : "";
        return `      <trkpt lat="${lat}" lon="${lng}">${eleTag}</trkpt>`;
      })
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="OpenRadRoute" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${Utils.escapeHtml(name)}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>`;
  }

  return { calculateRoute, toGPX, buildUrl };
})();
