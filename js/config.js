// ============================================================================
// config.js – zentrale Konfiguration von OpenRadRoute
// Hier änderst du Kartenstil, Routing-Server und Routing-Profile.
// ============================================================================

const CONFIG = {
  // --- Hintergrundkarte ------------------------------------------------
  // OpenFreeMap: kostenlos, kein API-Key nötig, basiert auf OSM-Daten.
  // Alternative Styles: "liberty" (bunter) oder eigener Style-URL.
  MAP_STYLE_URL: "https://tiles.openfreemap.org/styles/bright",

  // Startansicht der Karte (hier: Neckargemünd/Heidelberg als Default)
  MAP_CENTER: [8.7864, 49.4001], // [lng, lat]
  MAP_ZOOM: 12,

  // --- Routing -----------------------------------------------------------
  // BRouter: kostenloser, quelloffener Fahrrad-Router auf OSM-Basis.
  // Öffentlicher Server, keine Anmeldung/Kosten. Bei eigenem Server (z.B.
  // via Docker: https://github.com/abrensch/brouter) hier die URL anpassen.
  BROUTER_API_URL: "https://brouter.de/brouter",

  // Zeitlimit für Routing-Anfragen (ms)
  ROUTING_TIMEOUT: 25000,

  // Geokodierung / Adresssuche: Nominatim (OSM), kostenlos.
  // Bitte fair benutzen (Nominatim Usage Policy: max. 1 req/s, eigener
  // User-Agent). Für viel Traffic besser einen eigenen Nominatim-Server
  // oder Photon-Instanz betreiben.
  NOMINATIM_URL: "https://nominatim.openstreetmap.org",

  // --- Routing-Profile -----------------------------------------------
  // Jedes Profil entspricht einem BRouter-Standardprofil. Falls dein
  // BRouter-Server andere Profildateien enthält, hier "brouterProfile"
  // anpassen (siehe https://github.com/abrensch/brouter -> profiles2/).
  PROFILES: [
    {
      id: "trekking",
      brouterProfile: "trekking",
      label: "Trekking",
      icon: "🚴",
      description: "Ausgewogen für Alltag, Pendeln & Touren",
    },
    {
      id: "fastbike",
      brouterProfile: "fastbike",
      label: "Rennrad",
      icon: "🏁",
      description: "Bevorzugt Asphalt & zügige Strecken",
    },
    {
      id: "shortest",
      brouterProfile: "shortest",
      label: "Kürzeste",
      icon: "📏",
      description: "Direkteste Verbindung, egal welcher Belag",
    },
    {
      id: "safety",
      brouterProfile: "safety",
      label: "Ruhig",
      icon: "🛡️",
      description: "Meidet stark befahrene Straßen",
    },
    {
      id: "mtb",
      brouterProfile: "mtb",
      label: "MTB / Gravel",
      icon: "⛰️",
      description: "Für Schotter, Wald- & Feldwege",
    },
  ],

  // Anzahl Alternativrouten, die zusätzlich zur besten Route geladen werden
  // (0 = nur beste Route, max. sinnvoll 2)
  ALTERNATIVE_ROUTES: 2,

  // localStorage-Key zum Speichern der letzten Einstellungen
  STORAGE_KEY: "openradroute_state_v1",
};
