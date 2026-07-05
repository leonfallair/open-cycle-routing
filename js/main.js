// ============================================================================
// main.js – Startpunkt der Anwendung
// ============================================================================

(async function main() {
  await MapModule.init();
  UI.init();

  // Service Worker für Offline-Fähigkeit der App-Hülle (nicht der Kartenkacheln)
  if ("serviceWorker" in navigator) {
    const registerServiceWorker = () => {
      navigator.serviceWorker
        .register("./sw.js")
        .then((registration) => {
          const applyUpdate = () => {
            if (registration.waiting) {
              registration.waiting.postMessage({ type: "SKIP_WAITING" });
              return;
            }
            registration.update().catch(() => {});
          };

          registration.addEventListener("updatefound", () => {
            const installingWorker = registration.installing;
            if (!installingWorker) return;
            installingWorker.addEventListener("statechange", () => {
              if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                applyUpdate();
              }
            });
          });

          navigator.serviceWorker.addEventListener("controllerchange", () => {
            window.location.reload();
          });

          applyUpdate();
        })
        .catch(() => {
          /* Offline-Unterstützung ist optional – Fehler hier sind unkritisch */
        });
    };

    registerServiceWorker();
    window.addEventListener("focus", () => {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) registration.update().catch(() => {});
      });
    });
  }
})();
