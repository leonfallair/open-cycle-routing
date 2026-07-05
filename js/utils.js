// ============================================================================
// utils.js – kleine Helferfunktionen ohne Abhängigkeiten
// ============================================================================

const Utils = {
  /** Erzeugt eine kurze eindeutige ID */
  uid() {
    return Math.random().toString(36).slice(2, 10);
  },

  /** Verzögert Funktionsaufrufe (z.B. für Live-Suche) */
  debounce(fn, delay = 300) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  /** Haversine-Distanz zwischen zwei [lng, lat]-Punkten in Metern */
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

  /** Formatiert Meter menschenlesbar (z.B. "3,4 km" oder "850 m") */
  formatDistance(meters) {
    if (meters == null || isNaN(meters)) return "–";
    if (meters >= 1000) {
      return (meters / 1000).toLocaleString("de-DE", {
        maximumFractionDigits: 1,
      }) + " km";
    }
    return Math.round(meters) + " m";
  },

  /** Formatiert Sekunden als "1 h 23 min" oder "23 min" */
  formatDuration(seconds) {
    if (seconds == null || isNaN(seconds)) return "–";
    const totalMin = Math.round(seconds / 60);
    const h = Math.floor(totalMin / 60);
    const min = totalMin % 60;
    if (h > 0) return `${h} h ${min} min`;
    return `${min} min`;
  },

  /** Formatiert Höhenmeter (z.B. "+320 m") */
  formatElevation(meters) {
    if (meters == null || isNaN(meters)) return "–";
    return Math.round(meters) + " m";
  },

  /** Escaped HTML-Sonderzeichen für sichere Textausgabe */
  escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  },

  /** Liest JSON aus localStorage, gibt Fallback bei Fehler zurück */
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
      /* Speicher voll oder deaktiviert – einfach ignorieren */
    }
  },
};
