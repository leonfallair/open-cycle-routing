// ============================================================================
// waypoints.js – hält die Liste der Wegpunkte (Start, Via, Ziel) im Speicher
// ============================================================================

const WaypointStore = (() => {
  let waypoints = []; // { id, coords: [lng,lat], label }
  const listeners = [];

  function notify() {
    listeners.forEach((fn) => fn(waypoints));
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  function getAll() {
    return waypoints;
  }

  function add(coords, label = "") {
    waypoints.push({ id: Utils.uid(), coords, label });
    notify();
  }

  function insertBeforeEnd(coords, label = "") {
    // Fügt einen neuen Punkt als vorletzten ein (=neuer Via-Punkt vor dem Ziel)
    if (waypoints.length < 2) {
      add(coords, label);
      return;
    }
    waypoints.splice(waypoints.length - 1, 0, {
      id: Utils.uid(),
      coords,
      label,
    });
    notify();
  }

  function remove(id) {
    waypoints = waypoints.filter((w) => w.id !== id);
    notify();
  }

  function updateCoords(id, coords) {
    const wp = waypoints.find((w) => w.id === id);
    if (wp) {
      wp.coords = coords;
      wp.label = ""; // Label ungültig nach Verschieben, ggf. neu reverse-geocoden
      notify();
    }
  }

  function setLabel(id, label) {
    const wp = waypoints.find((w) => w.id === id);
    if (wp) {
      wp.label = label;
      notify();
    }
  }

  function move(id, direction) {
    const idx = waypoints.findIndex((w) => w.id === id);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= waypoints.length) return;
    [waypoints[idx], waypoints[targetIdx]] = [waypoints[targetIdx], waypoints[idx]];
    notify();
  }

  function clear() {
    waypoints = [];
    notify();
  }

  function reverseOrder() {
    waypoints.reverse();
    notify();
  }

  function coordsList() {
    return waypoints.map((w) => w.coords);
  }

  return {
    onChange,
    getAll,
    add,
    insertBeforeEnd,
    remove,
    updateCoords,
    setLabel,
    move,
    clear,
    reverseOrder,
    coordsList,
  };
})();
