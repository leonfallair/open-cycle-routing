// ============================================================================
// elevation.js – renders a simple elevation chart for a route
// ============================================================================

const ElevationChart = (() => {
  function render(container, coordinates, distance) {
    if (!container) return;

    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      container.innerHTML = '<div class="elevation-empty">Kein Höhenprofil verfügbar</div>';
      return;
    }

    const values = coordinates
      .map((c) => (c && c[2] != null ? Number(c[2]) : null))
      .filter((v) => Number.isFinite(v));

    if (values.length < 2) {
      container.innerHTML = '<div class="elevation-empty">Kein Höhenprofil verfügbar</div>';
      return;
    }

    const width = Math.max(280, container.clientWidth || 320);
    const height = 140;
    const margin = 12;
    const chartWidth = width - margin * 2;
    const chartHeight = height - margin * 2;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = coordinates.map((c, i) => {
      const value = c && c[2] != null ? Number(c[2]) : (min + max) / 2;
      const x = margin + (i / (coordinates.length - 1)) * chartWidth;
      const y = margin + chartHeight - ((value - min) / range) * chartHeight;
      return { x, y };
    });

    const linePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const areaPoints = `${points[0].x.toFixed(1)},${height - margin} ${linePoints} ${points[points.length - 1].x.toFixed(1)},${height - margin}`;

    container.innerHTML = `
      <svg class="elevation-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Höhenprofil der Route">
        <line class="elevation-axis" x1="${margin}" y1="${height - margin}" x2="${width - margin}" y2="${height - margin}" />
        <line class="elevation-axis" x1="${margin}" y1="${margin}" x2="${margin}" y2="${height - margin}" />
        <polygon class="elevation-area" points="${areaPoints}" />
        <polyline class="elevation-line" points="${linePoints}" />
        <text class="elevation-label" x="${margin}" y="${margin + 10}">${Utils.formatDistance(distance || 0)}</text>
      </svg>
    `;
  }

  return { render };
})();
