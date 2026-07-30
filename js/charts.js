function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const height = rect.height || Number(canvas.getAttribute("height")) || 220;
  canvas.style.height = height + "px";
  canvas.width = rect.width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: rect.width, height };
}

function roundRectTop(ctx, x, y, w, h, r) {
  if (h <= 0.5) return;
  const rr = Math.min(r, w / 2, h);
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

export function drawBarChart(canvas, labels, values, { color = "#2563eb", formatValue } = {}) {
  const { ctx, width, height } = setupCanvas(canvas);
  const padding = { top: 16, right: 12, bottom: 26, left: 54 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const max = Math.max(1, ...values);

  ctx.clearRect(0, 0, width, height);
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const y = padding.top + chartH - (chartH / steps) * i;
    const val = (max / steps) * i;
    ctx.strokeStyle = "#eef2f7";
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(formatValue ? formatValue(val) : String(Math.round(val)), padding.left - 8, y);
  }

  const gap = chartW / values.length;
  const barW = Math.min(36, gap * 0.55);
  ctx.textAlign = "center";
  values.forEach((v, i) => {
    const x = padding.left + gap * i + (gap - barW) / 2;
    const h = max === 0 ? 0 : (v / max) * chartH;
    const y = padding.top + chartH - h;
    ctx.fillStyle = color;
    roundRectTop(ctx, x, y, barW, h, 4);
    ctx.fill();
    ctx.fillStyle = "#64748b";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(labels[i], x + barW / 2, padding.top + chartH + 16);
  });
}

export function drawDonutChart(canvas, segments) {
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const legendW = 150;
  const cx = Math.min((width - legendW) / 2, height / 2);
  const cy = height / 2;
  const radius = Math.max(30, Math.min(cx, cy) - 8);
  const inner = radius * 0.62;

  if (total === 0) {
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = radius - inner;
    ctx.beginPath();
    ctx.arc(cx, cy, (radius + inner) / 2, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    let start = -Math.PI / 2;
    segments.forEach((seg) => {
      if (seg.value <= 0) return;
      const angle = (seg.value / total) * Math.PI * 2;
      ctx.fillStyle = seg.color;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, start + angle);
      ctx.closePath();
      ctx.fill();
      start += angle;
    });
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "12px system-ui, sans-serif";
  let ly = cy - (segments.length * 20) / 2 + 10;
  segments.forEach((seg) => {
    ctx.fillStyle = seg.color;
    ctx.fillRect(cx + radius + 16, ly - 5, 10, 10);
    ctx.fillStyle = "#334155";
    ctx.fillText(`${seg.label} (${seg.value})`, cx + radius + 32, ly);
    ly += 20;
  });
}
