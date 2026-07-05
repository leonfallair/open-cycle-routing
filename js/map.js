// ============================================================================
// map.js – MapLibre GL Karte, Marker & Routen-Layer
// ============================================================================

const MapModule = (() => {
  let map = null;
  let markers = []; // { id, marker, type: 'start'|'via'|'end' }
  let onWaypointDrag = null;
  let onMapClick = null;

  function init() {
    map = new maplibregl.Map({
      container: "map",
      style: CONFIG.MAP_STYLE_URL,
      center: CONFIG.MAP_CENTER,
      zoom: CONFIG.MAP_ZOOM,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right"
    );
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right"
    );
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showUserHeading: true,
      }),
      "top-right"
    );

    map.on("click", (e) => {
      if (onMapClick) onMapClick([e.lngLat.lng, e.lngLat.lat]);
    });

    return new Promise((resolve) => {
      map.on("load", () => {
        setupRouteLayers();
        resolve(map);
      });
    });
  }

  function setupRouteLayers() {
    // Alternativrouten (dünn, gedämpft) – unter der Hauptroute
    map.addSource("route-alt", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: "route-alt-line",
      type: "line",
      source: "route-alt",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#94a3b8",
        "line-width": 4,
        "line-opacity": 0.55,
        "line-dasharray": [2, 1.5],
      },
    });

    // Hauptroute
    map.addSource("route-main", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: "route-main-outline",
      type: "line",
      source: "route-main",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#ffffff",
        "line-width": 8,
        "line-opacity": 0.9,
      },
    });
    map.addLayer({
      id: "route-main-line",
      type: "line",
      source: "route-main",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#2563eb",
        "line-width": 5,
      },
    });
  }

  function setAlternativeRoutes(featureCollection) {
    const src = map.getSource("route-alt");
    if (src) src.setData(featureCollection);
  }

  function setMainRoute(featureCollection) {
    const src = map.getSource("route-main");
    if (src) src.setData(featureCollection);
  }

  function clearRoutes() {
    setMainRoute({ type: "FeatureCollection", features: [] });
    setAlternativeRoutes({ type: "FeatureCollection", features: [] });
  }

  function markerColor(type) {
    if (type === "start") return "#16a34a";
    if (type === "end") return "#dc2626";
    return "#f59e0b";
  }

  function createMarkerEl(type, index) {
    const el = document.createElement("div");
    el.className = "wp-marker wp-marker--" + type;
    el.style.setProperty("--marker-color", markerColor(type));
    if (type === "via") {
      el.textContent = index;
    } else {
      el.innerHTML =
        type === "start"
          ? '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="white" d="M12 2 4 22l8-4 8 4z"/></svg>'
          : '<svg viewBox="0 0 24 24" width="12" height="12"><rect x="4" y="4" width="16" height="16" fill="white"/></svg>';
    }
    return el;
  }

  /** Rendert alle Marker neu anhand der Waypoint-Liste */
  function renderMarkers(waypoints) {
    markers.forEach((m) => m.marker.remove());
    markers = [];

    waypoints.forEach((wp, i) => {
      let type = "via";
      if (i === 0) type = "start";
      else if (i === waypoints.length - 1) type = "end";

      const el = createMarkerEl(type, i);
      const marker = new maplibregl.Marker({
        element: el,
        draggable: true,
        anchor: "center",
      })
        .setLngLat(wp.coords)
        .addTo(map);

      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        if (onWaypointDrag) onWaypointDrag(wp.id, [lngLat.lng, lngLat.lat]);
      });

      markers.push({ id: wp.id, marker, type });
    });
  }

  function flyTo(coords, zoom) {
    map.flyTo({ center: coords, zoom: zoom ?? Math.max(map.getZoom(), 14) });
  }

  function fitToBounds(coordsList, padding = 60) {
    if (!coordsList || coordsList.length === 0) return;
    if (coordsList.length === 1) {
      flyTo(coordsList[0]);
      return;
    }
    const bounds = coordsList.reduce(
      (b, c) => b.extend(c),
      new maplibregl.LngLatBounds(coordsList[0], coordsList[0])
    );
    map.fitBounds(bounds, { padding, maxZoom: 17, duration: 600 });
  }

  return {
    init,
    getMap: () => map,
    renderMarkers,
    setMainRoute,
    setAlternativeRoutes,
    clearRoutes,
    flyTo,
    fitToBounds,
    set onWaypointDrag(fn) {
      onWaypointDrag = fn;
    },
    set onMapClick(fn) {
      onMapClick = fn;
    },
  };
})();
