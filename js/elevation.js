// ============================================================================
// elevation.js – zeichnet ein einfaches SVG-Höhenprofil für eine Route
// ============================================================================

const ElevationChart = (() => {
  /**
   * Rendert ein Höhenprofil in das übergebene Container-Element.
   * @param {HTMLElement} container
   * @param {Array<[number,number,number]>} coordinates [lng,lat,ele]
   * @param {number} totalDistance in Metern (für die X-Achse)
   */
  function render(container, coordinates, totalDistance) {
    const withEle = coordinates.filter((c) => c[2] != null);
    if (withEle.length < 2) {
      container.innerHTML =
        '<p class="elevation-empty">Keine Höhendaten für diese Route verfügbar.</p>';
      return;
    }

    // Distanz je Punkt kumulieren
    let cum = 0;
    const points = [cum, withEle[0][2]];
    const series = [{ d: 0, ele: withEle[0][2] }];
    for (let i = 1; i < withEle.length; i++) {
      cum += Utils.haversine(withEle[i - 1], withEle[i]);
      series.push({ d: cum, ele: withEle[i][2] });
    }

    const eles = series.map((p) => p.ele);
    const minEle = Math.min(...eles);
    const maxEle = Math.max(...eles);
    const eleRange = Math.max(maxEle - minEle, 10);

    const width = 600;
    const height = 140;
    const padL = 38;
    const padB = 20;
    const padT = 10;
    const innerW = width - padL - 10;
    const innerH = height - padT - padB;
    const dist = cum || totalDistance || 1;

    const toX = (d) => padL + (d / dist) * innerW;
    const toY = (ele) => padT + innerH - ((ele - minEle) / eleRange) * innerH;

    const linePoints = series
      .map((p) => `${toX(p.d).toFixed(1)},${toY(p.ele).toFixed(1)}`)
      .join(" ");

    const areaPoints = `${padL},${padT + innerH} ${linePoints} ${toX(dist).toFixed(1)},${padT + innerH}`;

    // Y-Achsenbeschriftung (min/max)
    const svg = `
<svg viewBox="0 0 ${width} ${height}" class="elevation-svg" preserveAspectRatio="none">
  <polyline points="${areaPoints}" class="elevation-area"></polyline>
  <polyline points="${linePoints}" class="elevation-line"></polyline>
  <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + innerH}" class="elevation-axis"></line>
  <line x1="${padL}" y1="${padT + innerH}" x2="${width - 10}" y2="${padT + innerH}" class="elevation-axis"></line>
  <text x="4" y="${padT + 8}" class="elevation-label">${Math.round(maxEle)} m</text>
  <text x="4" y="${padT + innerH}" class="elevation-label">${Math.round(minEle)} m</text>
  <text x="${padL}" y="${height - 4}" class="elevation-label">0 km</text>
  <text x="${width - 30}" y="${height - 4}" class="elevation-label">${(dist / 1000).toFixed(1)} km</text>
</svg>`;

    container.innerHTML = svg;
  }

  return { render };
})();
