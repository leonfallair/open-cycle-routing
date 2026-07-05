// ============================================================================
// config.js – central configuration for OpenRouting
// Change map style, routing server and routing profiles here.
// ============================================================================

const CONFIG = {
  // --- Base map ----------------------------------------------------------
  // OpenFreeMap: free, no API key needed, based on OSM data.
  // Alternative styles: "liberty" (more colorful) or your own style URL.
  MAP_STYLE_URL: "https://tiles.openfreemap.org/styles/bright",

  // Initial map view
  MAP_CENTER: [8.7864, 49.4001], // [lng, lat]
  MAP_ZOOM: 12,

  // --- Routing -------------------------------------------------------------
  // BRouter: free, open-source bike router based on OSM data.
  // Public server, no signup/cost. If you run your own server (e.g. via
  // Docker: https://github.com/abrensch/brouter) change the URL here.
  BROUTER_API_URL: "https://brouter.de/brouter",

  // Timeout for routing requests (ms)
  ROUTING_TIMEOUT: 25000,

  // Geocoding / address search: Nominatim (OSM), free.
  // Please respect the usage policy (max. 1 req/s, own user agent). For
  // heavy traffic, run your own Nominatim or Photon instance instead.
  NOMINATIM_URL: "https://nominatim.openstreetmap.org",

  // --- Routing profiles ----------------------------------------------------
  // Each profile maps to a BRouter default profile. If your BRouter server
  // ships different profile files, adjust "brouterProfile" here (see
  // https://github.com/abrensch/brouter -> profiles2/).
  PROFILES: [
    {
      id: "trekking",
      brouterProfile: "trekking",
      label: "Trekking",
      icon: "🚴",
      description: "Balanced for commuting & everyday touring",
    },
    {
      id: "fastbike",
      brouterProfile: "fastbike",
      label: "Road bike",
      icon: "🏁",
      description: "Prefers paved surfaces & fast connections",
    },
    {
      id: "shortest",
      brouterProfile: "shortest",
      label: "Shortest",
      icon: "📏",
      description: "Most direct connection, any surface",
    },
    {
      id: "safety",
      brouterProfile: "safety",
      label: "Quiet",
      icon: "🛡️",
      description: "Avoids busy, high-traffic roads",
    },
    {
      id: "mtb",
      brouterProfile: "mtb",
      label: "MTB / Gravel",
      icon: "⛰️",
      description: "For gravel, forest & farm tracks",
    },
  ],

  // Number of alternative routes fetched alongside the best route
  // (0 = best route only, 2 is a sensible max)
  ALTERNATIVE_ROUTES: 2,

  // localStorage key for persisting the last used settings
  STORAGE_KEY: "openrouting_state_v1",

  // --- Live navigation -----------------------------------------------------
  // Distance (m) a turn instruction is first announced ahead of time
  NAV_ANNOUNCE_FAR_M: 150,
  // Distance (m) at which the "do it now" announcement is triggered
  NAV_ANNOUNCE_NEAR_M: 30,
  // Perpendicular distance (m) from the route line that counts as "off route"
  NAV_OFFROUTE_THRESHOLD_M: 35,
  // How long (ms) the user must stay off-route before the "recalculate"
  // prompt is shown, to avoid reacting to brief GPS jitter
  NAV_OFFROUTE_CONFIRM_MS: 6000,
  // Minimum turn angle (degrees) considered a maneuver worth announcing;
  // smaller direction changes are treated as "continue straight"
  NAV_MIN_TURN_ANGLE: 25,
  // Distance (m) between resampled points used for maneuver detection
  NAV_RESAMPLE_STEP_M: 12,
  // Voice guidance on by default (Web Speech API, can be muted in the UI)
  NAV_VOICE_DEFAULT: true,
  // Assumed average cycling speed (km/h), used for ETA before the first GPS fix
  NAV_FALLBACK_SPEED_KMH: 16,
};