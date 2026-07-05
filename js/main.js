// ============================================================================
// main.js – Startpunkt der Anwendung
// ============================================================================

(async function main() {
  await MapModule.init();
  UI.init();

  // Service Worker für Offline-Fähigkeit der App-Hülle (nicht der Kartenkacheln)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* Offline-Unterstützung ist optional – Fehler hier sind unkritisch */
    });
  }
})();
