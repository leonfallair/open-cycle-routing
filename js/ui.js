// ============================================================================
// ui.js – verdrahtet alle Module: Karte, Suche, Wegpunkte, Profile, Routing
// ============================================================================

const UI = (() => {
  let dom = {};
  let selectedProfileId = CONFIG.PROFILES[0].id;
  let pendingViaSlots = 0; // Anzahl leerer "Zwischenstopp über Suche"-Zeilen
  let lastResult = null; // { main, alternatives }
  let activeRouteIdx = 0; // 0 = Hauptroute, 1..n = Alternative
  let calcToken = 0; // verhindert Race-Conditions bei schnellen Änderungen

  // ---------------------------------------------------------------- init --
  function init() {
    cacheDom();
    restoreProfile();
    buildProfileChips();
    wireEvents();
    WaypointStore.onChange(handleWaypointsChanged);
    MapModule.onMapClick = handleMapClick;
    MapModule.onWaypointDrag = (id, coords) => {
      WaypointStore.updateCoords(id, coords);
      Geocoding.reverse(coords).then((label) => {
        if (label) WaypointStore.setLabel(id, label);
      });
    };
    Navigation.onUpdate = handleNavigationUpdate;
    Navigation.onOffRoute = () => toast("You left the route.");
    Navigation.onArrive = () => {
      toast("Destination reached.");
      updateNavigationUi();
    };
    renderWaypointList([]);
    updateNavigationUi();
  }

  function cacheDom() {
    dom.sheet = document.getElementById("sheet");
    dom.sheetHandle = document.getElementById("sheetHandle");
    dom.profileChips = document.getElementById("profileChips");
    dom.profileDesc = document.getElementById("profileDesc");
    dom.waypointList = document.getElementById("waypointList");
    dom.addViaBtn = document.getElementById("addViaBtn");
    dom.locateBtn = document.getElementById("locateBtn");
    dom.clearBtn = document.getElementById("clearBtn");
    dom.reverseBtn = document.getElementById("reverseBtn");
    dom.gpxBtn = document.getElementById("gpxBtn");
    dom.statsPanel = document.getElementById("statsPanel");
    dom.statDistance = document.getElementById("statDistance");
    dom.statDuration = document.getElementById("statDuration");
    dom.statUp = document.getElementById("statUp");
    dom.statDown = document.getElementById("statDown");
    dom.altList = document.getElementById("altList");
    dom.elevationChart = document.getElementById("elevationChart");
    dom.startNavBtn = document.getElementById("startNavBtn");
    dom.navigationInfo = document.getElementById("navigationInfo");
    dom.routeStatus = document.getElementById("routeStatus");
    dom.toastContainer = document.getElementById("toastContainer");
    dom.hint = document.getElementById("mapHint");
  }

  // ------------------------------------------------------------ profile --
  function restoreProfile() {
    const saved = Utils.loadJSON(CONFIG.STORAGE_KEY, null);
    if (saved?.profile && CONFIG.PROFILES.some((p) => p.id === saved.profile)) {
      selectedProfileId = saved.profile;
    }
  }

  function persistProfile() {
    Utils.saveJSON(CONFIG.STORAGE_KEY, { profile: selectedProfileId });
  }

  function buildProfileChips() {
    dom.profileChips.innerHTML = "";
    CONFIG.PROFILES.forEach((p) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (p.id === selectedProfileId ? " chip--active" : "");
      chip.dataset.profile = p.id;
      chip.innerHTML = `<span class="chip-icon">${p.icon}</span><span>${Utils.escapeHtml(p.label)}</span>`;
      chip.addEventListener("click", () => selectProfile(p.id));
      dom.profileChips.appendChild(chip);
    });
    updateProfileDesc();
  }

  function updateProfileDesc() {
    const p = CONFIG.PROFILES.find((x) => x.id === selectedProfileId);
    dom.profileDesc.textContent = p ? p.description : "";
  }

  function selectProfile(id) {
    selectedProfileId = id;
    persistProfile();
    [...dom.profileChips.children].forEach((chip) => {
      chip.classList.toggle("chip--active", chip.dataset.profile === id);
    });
    updateProfileDesc();
    if (Navigation.isActive()) {
      Navigation.stop();
    }
    triggerRouteCalculation();
  }

  // ---------------------------------------------------------- waypoints --
  function handleMapClick(coords) {
    const wps = WaypointStore.getAll();
    if (wps.length === 0) {
      WaypointStore.add(coords);
      reverseGeocodeLatest();
      expandSheet();
    } else if (wps.length === 1) {
      WaypointStore.add(coords);
      reverseGeocodeLatest();
    } else {
      WaypointStore.insertBeforeEnd(coords);
      reverseGeocodeLatest();
    }
  }

  function reverseGeocodeLatest() {
    const wps = WaypointStore.getAll();
    const last = wps[wps.length - 1];
    if (!last) return;
    Geocoding.reverse(last.coords).then((label) => {
      if (label) WaypointStore.setLabel(last.id, label);
    });
  }

  function handleWaypointsChanged(waypoints) {
    if (Navigation.isActive()) {
      Navigation.stop();
    }
    renderWaypointList(waypoints);
    MapModule.renderMarkers(waypoints);
    if (waypoints.length >= 2) {
      triggerRouteCalculation();
      if (dom.hint) dom.hint.style.display = "none";
    } else {
      MapModule.clearRoutes();
      showStats(null);
      if (dom.hint) dom.hint.style.display = "";
    }
    updateNavigationUi();
  }

  function rowMeta(index, total) {
    if (index === 0) return { type: "start", label: "Start", icon: "A" };
    if (index === total - 1) return { type: "end", label: "Destination", icon: "B" };
    return { type: "via", label: `Stop ${index}`, icon: String(index) };
  }

  function renderWaypointList(waypoints) {
    dom.waypointList.innerHTML = "";

    // Anzeige-Liste: mind. 2 Zeilen (Start/Ziel), auch wenn noch leer
    const display = waypoints.length === 0
      ? [null, null]
      : waypoints.length === 1
      ? [waypoints[0], null]
      : waypoints.slice();

    display.forEach((wp, i) => {
      const meta = rowMeta(i, display.length);
      dom.waypointList.appendChild(buildRow(wp, meta, i, display.length));
    });

    // Zusätzliche leere "Zwischenstopp"-Zeilen (über Suche) vor dem Ziel
    for (let i = 0; i < pendingViaSlots; i++) {
      const row = buildRow(null, { type: "via", label: "Via point", icon: "+" }, -1, -1);
      dom.waypointList.insertBefore(row, dom.waypointList.lastElementChild);
    }

    dom.addViaBtn.style.display = waypoints.length >= 2 ? "" : "none";
  }

  function buildRow(wp, meta, index, total) {
    const row = document.createElement("div");
    row.className = "wp-row";

    const badge = document.createElement("div");
    badge.className = `wp-badge wp-badge--${meta.type}`;
    badge.textContent = meta.icon;
    row.appendChild(badge);

    const field = document.createElement("div");
    field.className = "wp-field";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = meta.type === "start"
      ? "Search start point or tap the map"
      : meta.type === "end"
      ? "Search destination or tap the map"
      : "Search via point";
    input.value = wp?.label || (wp ? formatCoords(wp.coords) : "");
    input.autocomplete = "off";
    field.appendChild(input);

    const suggestions = document.createElement("div");
    suggestions.className = "wp-suggestions";
    field.appendChild(suggestions);

    input.addEventListener(
      "input",
      Utils.debounce(async () => {
        const q = input.value.trim();
        if (q.length < 3) {
          suggestions.innerHTML = "";
          return;
        }
        try {
          const results = await Geocoding.search(q);
          renderSuggestions(suggestions, results, (picked) => {
            input.value = picked.label;
            suggestions.innerHTML = "";
            assignCoords(wp, index, picked.coords, picked.label);
          });
        } catch {
          suggestions.innerHTML =
            '<div class="wp-suggestion wp-suggestion--error">Search failed</div>';
        }
      }, 400)
    );

    row.appendChild(field);

    if (wp) {
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "wp-remove";
      removeBtn.setAttribute("aria-label", "Entfernen");
      removeBtn.innerHTML = "✕";
      removeBtn.addEventListener("click", () => WaypointStore.remove(wp.id));
      row.appendChild(removeBtn);
    } else if (meta.icon === "+") {
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "wp-remove";
      removeBtn.innerHTML = "✕";
      removeBtn.addEventListener("click", () => {
        pendingViaSlots = Math.max(0, pendingViaSlots - 1);
        renderWaypointList(WaypointStore.getAll());
      });
      row.appendChild(removeBtn);
    }

    return row;
  }

  function renderSuggestions(container, results, onPick) {
    container.innerHTML = "";
    if (results.length === 0) {
      container.innerHTML = '<div class="wp-suggestion wp-suggestion--empty">No results</div>';
      return;
    }
    results.forEach((r) => {
      const el = document.createElement("div");
      el.className = "wp-suggestion";
      el.textContent = r.label;
      el.addEventListener("click", () => onPick(r));
      container.appendChild(el);
    });
  }

  function assignCoords(wp, index, coords, label) {
    if (wp) {
      // Bestehenden Punkt aktualisieren
      WaypointStore.updateCoords(wp.id, coords);
      WaypointStore.setLabel(wp.id, label);
      return;
    }
    const current = WaypointStore.getAll();
    if (current.length === 0) {
      WaypointStore.add(coords, label);
    } else if (current.length === 1) {
      WaypointStore.add(coords, label);
    } else {
      // Pending-Via-Slot wurde befüllt
      WaypointStore.insertBeforeEnd(coords, label);
      pendingViaSlots = Math.max(0, pendingViaSlots - 1);
    }
    MapModule.fitToBounds(WaypointStore.coordsList());
  }

  function formatCoords([lng, lat]) {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  // ------------------------------------------------------------ routing --
  const triggerRouteCalculation = Utils.debounce(calculateRoute, 350);

  async function calculateRoute() {
    const coords = WaypointStore.coordsList();
    if (coords.length < 2) return;

    const profile = CONFIG.PROFILES.find((p) => p.id === selectedProfileId);
    const token = ++calcToken;

    setStatus("loading", "Calculating route…");

    try {
      const result = await Routing.calculateRoute(coords, profile.brouterProfile, true);
      if (token !== calcToken) return; // veraltete Antwort ignorieren

      lastResult = result;
      activeRouteIdx = 0;
      renderResult();
      setStatus("ok", "");
      updateNavigationUi();
    } catch (err) {
      if (token !== calcToken) return;
      console.error(err);
      setStatus("error", err.message || "Could not calculate the route.");
      MapModule.clearRoutes();
      showStats(null);
    }
  }

  function renderResult() {
    if (!lastResult) return;
    const routes = [lastResult.main, ...lastResult.alternatives];
    const active = routes[activeRouteIdx] || routes[0];
    const others = routes.filter((_, i) => i !== activeRouteIdx);

    MapModule.setMainRoute(active.geojson);
    MapModule.setAlternativeRoutes({
      type: "FeatureCollection",
      features: others.map((r) => r.geojson.features[0]),
    });
    MapModule.fitToBounds(active.coordinates.map(([lng, lat]) => [lng, lat]));

    showStats(active);
    renderAlternatives(routes);
    ElevationChart.render(dom.elevationChart, active.coordinates, active.distance);
    MapModule.requestUserLocation({ flyTo: true, zoom: 15, silent: true });
  }

  function renderAlternatives(routes) {
    dom.altList.innerHTML = "";
    if (routes.length <= 1) return;

    routes.forEach((r, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "alt-btn" + (i === activeRouteIdx ? " alt-btn--active" : "");
      const letter = i === 0 ? "Beste" : "Alt. " + i;
      btn.innerHTML = `<strong>${letter}</strong><span>${Utils.formatDistance(r.distance)}</span>`;
      btn.addEventListener("click", () => {
        activeRouteIdx = i;
        renderResult();
      });
      dom.altList.appendChild(btn);
    });
  }

  function showStats(route) {
    if (!route) {
      dom.statsPanel.style.display = "none";
      dom.altList.innerHTML = "";
      dom.elevationChart.innerHTML = "";
      return;
    }
    dom.statsPanel.style.display = "";
    dom.statDistance.textContent = Utils.formatDistance(route.distance);
    dom.statDuration.textContent = Utils.formatDuration(route.duration);
    dom.statUp.textContent = route.elevationGain != null ? "+" + Utils.formatElevation(route.elevationGain) : "–";
    dom.statDown.textContent = route.elevationLoss != null ? "−" + Utils.formatElevation(route.elevationLoss) : "–";
  }

  function updateNavigationUi() {
    if (!dom.startNavBtn) return;
    const hasRoute = !!lastResult && WaypointStore.getAll().length >= 2;
    const active = Navigation.isActive();
    dom.startNavBtn.disabled = !hasRoute;
    dom.startNavBtn.textContent = active ? "⏹ End navigation" : "▶ Start route";
    dom.startNavBtn.classList.toggle("btn-danger", active);
    if (dom.navigationInfo) {
      dom.navigationInfo.style.display = active ? "" : "none";
      if (!active) dom.navigationInfo.innerHTML = "";
    }
  }

  function handleNavigationUpdate(state) {
    if (!dom.navigationInfo) return;
    dom.navigationInfo.style.display = "";
    const parts = [];
    if (state?.nextManeuver) {
      const distText = state.distanceToManeuver != null ? ` · ${Utils.formatDistance(state.distanceToManeuver)}` : "";
      parts.push(`${state.nextManeuver.text}${distText}`);
    } else {
      parts.push("Continue on route");
    }
    if (state?.distanceRemaining != null) {
      parts.push(`remaining ${Utils.formatDistance(state.distanceRemaining)}`);
    }
    if (state?.etaSeconds != null) {
      parts.push(`ETA ${Utils.formatDuration(state.etaSeconds)}`);
    }
    if (state?.speedKmh != null) {
      parts.push(`${Math.round(state.speedKmh)} km/h`);
    }
    dom.navigationInfo.innerHTML = `<strong>Live navigation</strong><br>${parts.join(" · ")}`;
  }

  function toggleNavigation() {
    if (Navigation.isActive()) {
      Navigation.stop();
      toast("Navigation ended.");
      updateNavigationUi();
      return;
    }

    if (!lastResult) {
      toast("Bitte zuerst eine Route berechnen.");
      return;
    }

    const waypoints = WaypointStore.getAll();
    if (waypoints.length < 2) {
      toast("Please set a start and destination.");
      return;
    }

    const routes = [lastResult.main, ...lastResult.alternatives];
    const activeRoute = routes[activeRouteIdx] || routes[0];

    try {
      MapModule.requestUserLocation({ flyTo: true, zoom: 16, silent: true });
      Navigation.start(activeRoute, waypoints);
      toast("Live navigation started.");
      updateNavigationUi();
    } catch (err) {
      toast(err.message || "Navigation could not be started.");
    }
  }

  function setStatus(kind, message) {
    if (!dom.routeStatus) return;
    dom.routeStatus.className = "route-status route-status--" + kind;
    dom.routeStatus.textContent = message;
    dom.routeStatus.style.display = message ? "" : "none";
    if (kind === "error") toast(message);
  }

  // ------------------------------------------------------------- events --
  function wireEvents() {
    dom.addViaBtn.addEventListener("click", () => {
      pendingViaSlots += 1;
      renderWaypointList(WaypointStore.getAll());
    });

    dom.clearBtn.addEventListener("click", () => {
      if (Navigation.isActive()) {
        Navigation.stop();
      }
      WaypointStore.clear();
      lastResult = null;
      pendingViaSlots = 0;
      dom.altList.innerHTML = "";
      updateNavigationUi();
    });

    dom.reverseBtn.addEventListener("click", () => {
      WaypointStore.reverseOrder();
    });

    dom.gpxBtn.addEventListener("click", exportGPX);
    dom.startNavBtn.addEventListener("click", toggleNavigation);

    dom.locateBtn.addEventListener("click", useMyLocation);

    dom.sheetHandle.addEventListener("click", toggleSheet);
    setupSheetDrag();
  }

  function exportGPX() {
    if (!lastResult) {
      toast("Please calculate a route first.");
      return;
    }
    const routes = [lastResult.main, ...lastResult.alternatives];
    const active = routes[activeRouteIdx] || routes[0];
    const gpx = Routing.toGPX(active, "OpenCycleRouting Track");
    const blob = new Blob([gpx], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "opencyclerouting-track.gpx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast("Location detection is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.longitude, pos.coords.latitude];
        handleMapClick(coords);
        MapModule.flyTo(coords, 15);
      },
      () => toast("Your location could not be determined."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  // --------------------------------------------------------- bottom sheet--
  function toggleSheet() {
    dom.sheet.classList.toggle("sheet--expanded");
  }

  function expandSheet() {
    dom.sheet.classList.add("sheet--expanded");
  }

  function setupSheetDrag() {
    let startY = 0;
    let startExpanded = false;
    let dragging = false;

    const onStart = (y) => {
      startY = y;
      startExpanded = dom.sheet.classList.contains("sheet--expanded");
      dragging = true;
    };
    const onMove = (y) => {
      if (!dragging) return;
      const delta = y - startY;
      if (delta < -40 && !startExpanded) dom.sheet.classList.add("sheet--expanded");
      if (delta > 40 && startExpanded) dom.sheet.classList.remove("sheet--expanded");
    };
    const onEnd = () => {
      dragging = false;
    };

    dom.sheetHandle.addEventListener("touchstart", (e) => onStart(e.touches[0].clientY), { passive: true });
    dom.sheetHandle.addEventListener("touchmove", (e) => onMove(e.touches[0].clientY), { passive: true });
    dom.sheetHandle.addEventListener("touchend", onEnd);

    dom.sheetHandle.addEventListener("mousedown", (e) => onStart(e.clientY));
    window.addEventListener("mousemove", (e) => onMove(e.clientY));
    window.addEventListener("mouseup", onEnd);
  }

  // ----------------------------------------------------------------toast--
  function toast(message) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    dom.toastContainer.appendChild(el);
    requestAnimationFrame(() => el.classList.add("toast--show"));
    setTimeout(() => {
      el.classList.remove("toast--show");
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }

  return { init };
})();
