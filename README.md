# 🚴 OpenRadRoute

A free, open-source bicycle route planner based on OpenStreetMap.  
No login, no subscription, no ads — unlike Komoot or Strava, turn-by-turn navigation here is fully free because it relies exclusively on open, cost-free services.

[OpenCycleRouting Demo](https://leonfallair.github.io/open-cycle-routing/)


## Features

- 🗺️ Map using **OpenFreeMap** (lightweight, free, no API key) via **MapLibre GL JS**
- 🧭 Routing powered by **BRouter** — an open-source router specialized for bicycle/foot navigation on OSM data
- Five routing profiles: **Trekking**, **Road Bike** (prefers asphalt), **Shortest**, **Quiet** (avoids busy roads), **MTB/Gravel**
- Start, destination, and unlimited via points — by clicking on the map, using address search, or dragging markers
- Address search via **Nominatim** (OSM geocoding)
- Distance, travel time, elevation gain/loss
- Elevation profile as an SVG diagram
- Up to two alternative routes for comparison
- GPX export for bike computers, Komoot, OsmAnd, etc.
- Mobile-first UI (bottom sheet like Google Maps), desktop uses a fixed sidebar
- Installable as a PWA (“Add to Home Screen”)

## Why these services?

| Component | Service | Why |
|---|---|---|
| Map tiles | OpenFreeMap | Free, no key, no rate limits, OSM data |
| Routing | BRouter | Bicycle-focused, many profiles, fully free, open source |
| Geocoding | Nominatim | Official OSM geocoder, free |

All three services are public and free to use, but they have fair-use policies (see below).  
For production use with high traffic, it’s recommended to self-host BRouter and/or Nominatim — both provide Docker images.

## Custom routing profiles

BRouter profiles are simple text files (`.brf`).  
The five profiles in `js/config.js` (`trekking`, `fastbike`, `shortest`, `safety`, `mtb`) are standard profiles from the public BRouter server.

To use your own profiles (e.g., “Cargo Bike” or “Kid Trailer”), you have two options:

1. **Self-hosted BRouter server:**  
   Run BRouter via Docker (see [abrensch/brouter](https://github.com/abrensch/brouter)) and place your `.brf` files in the `profiles2` directory.  
   Then set `CONFIG.BROUTER_API_URL` to your server URL.

2. **Community profiles:**  
   The [BRouter profile collection](https://github.com/poutnikl/Brouter-profiles) contains many ready-to-use profiles.

## Fair-use notes for the free services

- **Nominatim:** max. 1 request/second, see  
  [Usage Policy](https://operations.osmfoundation.org/policies/nominatim/).  
  For higher traffic, run your own Nominatim or a **Photon** server.
- **BRouter:** the public server is intended for moderate usage.  
  For heavy or commercial use, please self-host (Docker image available).
- **OpenFreeMap:** explicitly intended for unlimited free usage, including production — see [openfreemap.org](https://openfreemap.org).

## Possible next steps

- Add custom PNG icons (192px/512px) for better Android “Install App” banners (currently only SVG)
- Offline routing using locally hosted BRouter segments for your region
- Make the elevation profile interactive (hover shows position on the map)
- Reorder waypoints via real drag-and-drop in the list
- Save/share routes via shortlinks (requires a small backend)

## License

MIT — see [LICENSE](./LICENSE).  
Map data © OpenStreetMap contributors.
