// ============================================================================
// routing.js – talks to the BRouter routing server
//
// BRouter is an open-source routing engine built specifically for bike/foot
// navigation on OpenStreetMap data. The public server is free to use.
// See https://github.com/abrensch/brouter
// ============================================================================

const Routing = (() => {
  /**
   * Builds the BRouter request URL.
   * @param {Array<[number,number]>} coordsList list of [lng, lat]
   * @param {string} profile BRouter profile name (e.g. "trekking")
   * @param {number} alternativeidx 0 = best route, 1/2/3 = alternatives
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
          `Routing server responded with ${res.status}${text ? ": " + text.slice(0, 200) : ""}`
        );
      }
      return await res.json();
    } catch (err) {
      if (err.name === "AbortError") {
        throw new Error("Route calculation timed out.");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Computes ascent/descent from the z-values of the coordinates */
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

  /** Extracts usable metadata from a BRouter GeoJSON response */
  function parseResult(geojson) {
    const feature = geojson.features?.[0];
    if (!feature) throw new Error("No route found in the server response.");

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
   * Calculates a route including optional alternatives.
   * @returns {Promise<{main: object, alternatives: object[]}>}
   */
  async function calculateRoute(coordsList, profile, wantAlternatives) {
    if (coordsList.length < 2) {
      throw new Error("At least a start and destination point are required.");
    }

    const mainUrl = buildUrl(coordsList, profile, 0);
    const mainJson = await fetchWithTimeout(mainUrl);
    const main = parseResult(mainJson);

    let alternatives = [];
    // BRouter only reliably returns alternatives without via points
    if (wantAlternatives && coordsList.length === 2 && CONFIG.ALTERNATIVE_ROUTES > 0) {
      const requests = [];
      for (let i = 1; i <= CONFIG.ALTERNATIVE_ROUTES; i++) {
        requests.push(
          fetchWithTimeout(buildUrl(coordsList, profile, i))
            .then(parseResult)
            .catch(() => null) // alternatives are optional – ignore failures
        );
      }
      alternatives = (await Promise.all(requests)).filter(Boolean);
    }

    return { main, alternatives };
  }

  /** Builds a GPX file (string) from a calculated route */
  function toGPX(route, name = "OpenRouting Track") {
    const points = route.coordinates
      .map(([lng, lat, ele]) => {
        const eleTag = ele != null ? `<ele>${ele.toFixed(1)}</ele>` : "";
        return `      <trkpt lat="${lat}" lon="${lng}">${eleTag}</trkpt>`;
      })
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="OpenRouting" xmlns="http://www.topografix.com/GPX/1/1">
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