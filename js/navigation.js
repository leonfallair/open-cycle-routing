// ============================================================================
// navigation.js – turn-by-turn live navigation along a calculated route
//
// This works entirely from the route geometry returned by BRouter (no
// separate directions API is used), so instructions are geometry-based
// ("turn right", "bear left", ...) rather than referencing street names.
// ============================================================================

const Navigation = (() => {
  let active = false;
  let watchId = null;
  let route = null; // { coordinates, cumDist, distance, maneuvers }
  let lastSegmentHint = 0;
  let offRouteSince = null;
  let announced = new Map(); // maneuver index -> Set("far"|"near")
  let voiceEnabled = CONFIG.NAV_VOICE_DEFAULT;
  let lastHeading = null;
  let cameraFollowSuspended = false;

  let onUpdate = null;
  let onOffRoute = null;
  let onArrive = null;

  // ----------------------------------------------------- maneuver setup --
  function buildCumDist(coords) {
    const cum = [0];
    for (let i = 1; i < coords.length; i++) {
      cum.push(cum[i - 1] + Utils.haversine(coords[i - 1], coords[i]));
    }
    return cum;
  }

  function resampleRoute(coords, cumDist, step) {
    const total = cumDist[cumDist.length - 1];
    const points = [];
    let segIdx = 0;
    for (let d = 0; d <= total; d += step) {
      while (segIdx < cumDist.length - 2 && cumDist[segIdx + 1] < d) segIdx++;
      const segStart = cumDist[segIdx];
      const segEnd = cumDist[segIdx + 1] ?? segStart;
      const segLen = segEnd - segStart || 1;
      const t = Math.min(1, Math.max(0, (d - segStart) / segLen));
      const A = coords[segIdx];
      const B = coords[segIdx + 1] ?? A;
      points.push({
        d,
        coord: [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t],
      });
    }
    return points;
  }

  function classifyTurn(angle) {
    const abs = Math.abs(angle);
    const dir = angle > 0 ? "right" : "left";
    if (abs >= 150) return { type: "uturn", text: "Make a U-turn" };
    if (abs >= 100) return { type: `sharp-${dir}`, text: `Sharp turn ${dir}` };
    if (abs >= 45) return { type: dir, text: `Turn ${dir}` };
    return { type: `slight-${dir}`, text: `Bear ${dir}` };
  }

  function detectManeuvers(coords, cumDist) {
    const points = resampleRoute(coords, cumDist, CONFIG.NAV_RESAMPLE_STEP_M);
    if (points.length < 3) return [];

    const bearings = [];
    for (let i = 0; i < points.length - 1; i++) {
      bearings.push(Utils.bearing(points[i].coord, points[i + 1].coord));
    }

    const raw = [];
    let i = 1;
    while (i < bearings.length) {
      const diff = Utils.angleDiff(bearings[i - 1], bearings[i]);
      if (Math.abs(diff) < 8) {
        i++;
        continue;
      }
      const sign = Math.sign(diff);
      let sum = diff;
      let j = i + 1;
      while (j < bearings.length) {
        const d2 = Utils.angleDiff(bearings[j - 1], bearings[j]);
        if (Math.sign(d2) === sign && Math.abs(d2) >= 3) {
          sum += d2;
          j++;
        } else {
          break;
        }
      }
      if (Math.abs(sum) >= CONFIG.NAV_MIN_TURN_ANGLE) {
        const midIdx = Math.min(points.length - 1, Math.floor((i + j) / 2));
        const { type, text } = classifyTurn(sum);
        raw.push({
          distanceAlongRoute: points[midIdx].d,
          coord: points[midIdx].coord,
          type,
          text,
        });
      }
      i = j;
    }

    // Merge maneuvers that ended up very close together
    const merged = [];
    for (const m of raw) {
      const prev = merged[merged.length - 1];
      if (prev && m.distanceAlongRoute - prev.distanceAlongRoute < 20) {
        continue; // keep the first of the pair, close enough to matter once
      }
      merged.push(m);
    }
    return merged;
  }

  function nearestIndexTo(coord, coords) {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const d = Utils.haversine(coord, coords[i]);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }

  function buildManeuvers(coordinates, cumDist, waypoints) {
    const maneuvers = detectManeuvers(coordinates, cumDist);

    // Add a "waypoint reached" cue for intermediate stops
    if (waypoints && waypoints.length > 2) {
      for (let i = 1; i < waypoints.length - 1; i++) {
        const idx = nearestIndexTo(waypoints[i].coords, coordinates);
        maneuvers.push({
          distanceAlongRoute: cumDist[idx],
          coord: coordinates[idx],
          type: "waypoint",
          text: "Waypoint reached",
        });
      }
    }

    maneuvers.push({
      distanceAlongRoute: cumDist[cumDist.length - 1],
      coord: coordinates[coordinates.length - 1],
      type: "arrive",
      text: "Arrive at destination",
    });

    maneuvers.sort((a, b) => a.distanceAlongRoute - b.distanceAlongRoute);
    return maneuvers;
  }

  // --------------------------------------------------- map matching --
  /**
   * Projects a GPS fix onto the route polyline. Searches a window around
   * the last known segment first (cheap, works for continuous movement),
   * falling back to a full scan if nothing close enough is found.
   */
  function projectOntoRoute(position, coords, cumDist) {
    const windowSize = 60;
    const from = Math.max(0, lastSegmentHint - windowSize);
    const to = Math.min(coords.length - 2, lastSegmentHint + windowSize);

    let result = scanSegments(position, coords, cumDist, from, to);
    if (!result || result.distance > CONFIG.NAV_OFFROUTE_THRESHOLD_M) {
      const full = scanSegments(position, coords, cumDist, 0, coords.length - 2);
      if (full && (!result || full.distance < result.distance)) result = full;
    }
    if (result) lastSegmentHint = result.segmentIndex;
    return result;
  }

  function scanSegments(position, coords, cumDist, from, to) {
    let best = null;
    const [plng, plat] = position;
    for (let i = from; i <= to; i++) {
      const A = coords[i];
      const B = coords[i + 1];
      if (!A || !B) continue;

      const latRef = ((A[1] + B[1]) / 2) * (Math.PI / 180);
      const mPerDegLat = 111320;
      const mPerDegLng = 111320 * Math.cos(latRef);

      const ax = 0, ay = 0;
      const bx = (B[0] - A[0]) * mPerDegLng, by = (B[1] - A[1]) * mPerDegLat;
      const px = (plng - A[0]) * mPerDegLng, py = (plat - A[1]) * mPerDegLat;

      const segLenSq = bx * bx + by * by;
      const t = segLenSq > 0 ? Math.min(1, Math.max(0, (px * bx + py * by) / segLenSq)) : 0;
      const projX = ax + t * bx, projY = ay + t * by;
      const dist = Math.hypot(px - projX, py - projY);

      if (!best || dist < best.distance) {
        const segLen = Math.sqrt(segLenSq);
        best = {
          segmentIndex: i,
          distance: dist,
          coord: [A[0] + projX / mPerDegLng, A[1] + projY / mPerDegLat],
          distanceAlongRoute: cumDist[i] + t * segLen,
        };
      }
    }
    return best;
  }

  function buildTraveledGeoJSON(coords, segmentIndex, projCoord) {
    const line = coords.slice(0, segmentIndex + 1).map((c) => [c[0], c[1]]);
    line.push(projCoord);
    return {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: { type: "LineString", coordinates: line }, properties: {} }],
    };
  }

  // -------------------------------------------------------------- voice --
  function speak(text) {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 1;
    window.speechSynthesis.speak(utter);
  }

  function maybeAnnounce(maneuverIdx, maneuver, distanceToManeuver) {
    if (!maneuver || maneuver.type === "waypoint") return;
    if (!announced.has(maneuverIdx)) announced.set(maneuverIdx, new Set());
    const flags = announced.get(maneuverIdx);

    if (distanceToManeuver <= CONFIG.NAV_ANNOUNCE_FAR_M && !flags.has("far")) {
      flags.add("far");
      const label = maneuver.type === "arrive" ? maneuver.text : `${maneuver.text} in ${Math.round(distanceToManeuver / 10) * 10} meters`;
      speak(label);
    }
    if (distanceToManeuver <= CONFIG.NAV_ANNOUNCE_NEAR_M && !flags.has("near")) {
      flags.add("near");
      speak(maneuver.type === "arrive" ? "You have arrived" : maneuver.text + " now");
    }
  }

  // ------------------------------------------------------------- tracking--
  function handlePosition(position) {
    if (!active || !route) return;

    const coords = [position.coords.longitude, position.coords.latitude];
    const gpsHeading = position.coords.heading;
    const speedMs = position.coords.speed;

    const proj = projectOntoRoute(coords, route.coordinates, route.cumDist);
    if (!proj) return;

    const offRoute = proj.distance > CONFIG.NAV_OFFROUTE_THRESHOLD_M;
    if (offRoute) {
      if (offRouteSince == null) offRouteSince = Date.now();
      if (Date.now() - offRouteSince > CONFIG.NAV_OFFROUTE_CONFIRM_MS) {
        onOffRoute && onOffRoute(coords);
      }
    } else {
      offRouteSince = null;
    }

    const distanceRemaining = Math.max(0, route.distance - proj.distanceAlongRoute);

    let nextIdx = route.maneuvers.findIndex(
      (m) => m.distanceAlongRoute > proj.distanceAlongRoute + 2
    );
    const nextManeuver = nextIdx >= 0 ? route.maneuvers[nextIdx] : null;
    const distanceToManeuver = nextManeuver
      ? Math.max(0, nextManeuver.distanceAlongRoute - proj.distanceAlongRoute)
      : null;

    if (nextManeuver) maybeAnnounce(nextIdx, nextManeuver, distanceToManeuver);

    const routeBearing = Utils.bearing(
      route.coordinates[proj.segmentIndex],
      route.coordinates[Math.min(route.coordinates.length - 1, proj.segmentIndex + 1)]
    );
    const heading =
      gpsHeading != null && speedMs != null && speedMs > 0.5 ? gpsHeading : routeBearing;
    lastHeading = heading;

    const speedKmh = speedMs != null && speedMs > 0 ? speedMs * 3.6 : CONFIG.NAV_FALLBACK_SPEED_KMH;
    const etaSeconds = (distanceRemaining / 1000 / speedKmh) * 3600;

    MapModule.showUserPuck(coords, heading);
    MapModule.setTraveledRoute(buildTraveledGeoJSON(route.coordinates, proj.segmentIndex, proj.coord));
    if (!cameraFollowSuspended) {
      MapModule.followCamera(coords, heading);
    }

    onUpdate &&
      onUpdate({
        distanceRemaining,
        etaSeconds,
        nextManeuver,
        distanceToManeuver,
        offRoute,
        speedKmh: speedMs != null ? speedMs * 3.6 : null,
      });

    if (distanceRemaining < 15) {
      onArrive && onArrive();
    }
  }

  function handleError(err) {
    console.error("Geolocation error", err);
    onUpdate && onUpdate({ error: "Could not get your location. Check location permissions." });
  }

  // -------------------------------------------------------------- public --
  function start(calculatedRoute, waypoints) {
    if (!navigator.geolocation) {
      throw new Error("Geolocation is not supported by this browser.");
    }
    const coordinates = calculatedRoute.coordinates;
    const cumDist = buildCumDist(coordinates);
    route = {
      coordinates,
      cumDist,
      distance: calculatedRoute.distance ?? cumDist[cumDist.length - 1],
      maneuvers: buildManeuvers(coordinates, cumDist, waypoints),
    };
    lastSegmentHint = 0;
    offRouteSince = null;
    announced = new Map();
    cameraFollowSuspended = false;
    active = true;

    MapModule.setMarkersVisible(false);

    watchId = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000,
    });
  }

  function stop() {
    active = false;
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    route = null;
    window.speechSynthesis?.cancel();
    MapModule.hideUserPuck();
    MapModule.setMarkersVisible(true);
    MapModule.setTraveledRoute({ type: "FeatureCollection", features: [] });
    MapModule.resetCameraNorth();
  }

  function isActive() {
    return active;
  }

  function suspendCameraFollow() {
    cameraFollowSuspended = true;
  }

  function resumeCameraFollow() {
    cameraFollowSuspended = false;
  }

  function setVoiceEnabled(enabled) {
    voiceEnabled = enabled;
    if (!enabled) window.speechSynthesis?.cancel();
  }

  function isVoiceEnabled() {
    return voiceEnabled;
  }

  return {
    start,
    stop,
    isActive,
    suspendCameraFollow,
    resumeCameraFollow,
    setVoiceEnabled,
    isVoiceEnabled,
    set onUpdate(fn) {
      onUpdate = fn;
    },
    set onOffRoute(fn) {
      onOffRoute = fn;
    },
    set onArrive(fn) {
      onArrive = fn;
    },
  };
})();