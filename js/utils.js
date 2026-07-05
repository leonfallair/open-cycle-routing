// ============================================================================
// utils.js – small helper functions with no external dependencies
// ============================================================================

const Utils = {
  /** Generates a short unique id */
  uid() {
    return Math.random().toString(36).slice(2, 10);
  },

  /** Delays function calls (e.g. for live search) */
  debounce(fn, delay = 300) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  /** Haversine distance between two [lng, lat] points in meters */
  haversine([lng1, lat1], [lng2, lat2]) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  },

  /** Initial compass bearing (0-360°) from point A to point B, both [lng, lat] */
  bearing([lng1, lat1], [lng2, lat2]) {
    const toRad = (d) => (d * Math.PI) / 180;
    const toDeg = (r) => (r * 180) / Math.PI;
    const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
    const x =
      Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
      Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  },

  /** Smallest signed angle (-180..180) to turn from bearing a to bearing b */
  angleDiff(a, b) {
    let diff = (b - a + 540) % 360 - 180;
    return diff;
  },

  /** Formats meters as a human-readable string ("3.4 km" or "850 m") */
  formatDistance(meters) {
    if (meters == null || isNaN(meters)) return "–";
    if (meters >= 1000) {
      return (
        (meters / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 }) +
        " km"
      );
    }
    return Math.round(meters) + " m";
  },

  /** Formats seconds as "1 h 23 min" or "23 min" */
  formatDuration(seconds) {
    if (seconds == null || isNaN(seconds)) return "–";
    const totalMin = Math.round(seconds / 60);
    const h = Math.floor(totalMin / 60);
    const min = totalMin % 60;
    if (h > 0) return `${h} h ${min} min`;
    return `${min} min`;
  },

  /** Formats elevation in meters (e.g. "320 m") */
  formatElevation(meters) {
    if (meters == null || isNaN(meters)) return "–";
    return Math.round(meters) + " m";
  },

  /** Escapes HTML special characters for safe text output */
  escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  },

  /** Reads JSON from localStorage, returns fallback on error */
  loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },

  saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or disabled – safe to ignore */
    }
  },
};