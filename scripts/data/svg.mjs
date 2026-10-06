// 题图 SVG 生成辅助（轻量、浅色主题、可离线渲染）
const NS = 'xmlns="http://www.w3.org/2000/svg"';
const wrap = (w, h, body) =>
  `<svg ${NS} viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="max-width:100%;height:auto">${body}</svg>`;

const C = {
  ink: '#1e293b',
  blue: '#3b82f6',
  blueSoft: '#dbeafe',
  green: '#22c55e',
  greenSoft: '#dcfce7',
  amber: '#f59e0b',
  amberSoft: '#fef3c7',
  pink: '#ec4899',
  pinkSoft: '#fce7f3',
  purple: '#a855f7',
  purpleSoft: '#f3e8ff',
  gray: '#94a3b8',
  grid: '#e2e8f0',
  white: '#ffffff',
};
export { C };

/** 圆形阵列（数一数） */
export function svgCircles(count, color = C.blue) {
  const per = 5, r = 18, gx = 54, gy = 54, pad = 18;
  const rows = Math.ceil(count / per);
  const cols = Math.min(count, per);
  const w = cols * gx + pad * 2, h = rows * gy + pad * 2;
  let body = '';
  for (let i = 0; i < count; i++) {
    const cx = pad + r + (i % per) * gx;
    const cy = pad + r + Math.floor(i / per) * gy;
    body += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" fill-opacity="0.75" stroke="${C.ink}" stroke-width="2"/>`;
  }
  return { type: 'svg', width: w, height: h, content: wrap(w, h, body) };
}

/** 钟面 */
export function svgClock(hour, minute = 0) {
  const size = 200, c = size / 2, R = 88;
  let body = `<circle cx="${c}" cy="${c}" r="${R}" fill="${C.white}" stroke="${C.ink}" stroke-width="3"/>`;
  for (let i = 1; i <= 12; i++) {
    const a = (i * 30 - 90) * Math.PI / 180;
    const x = c + Math.cos(a) * (R - 22), y = c + Math.sin(a) * (R - 22);
    body += `<text x="${x}" y="${y + 6}" text-anchor="middle" font-size="17" font-weight="700" fill="${C.ink}" font-family="system-ui">${i}</text>`;
  }
  for (let i = 0; i < 60; i++) {
    if (i % 5 === 0) continue;
    const a = (i * 6 - 90) * Math.PI / 180;
    body += `<line x1="${c + Math.cos(a) * (R - 6)}" y1="${c + Math.sin(a) * (R - 6)}" x2="${c + Math.cos(a) * (R - 1)}" y2="${c + Math.sin(a) * (R - 1)}" stroke="${C.gray}" stroke-width="1.5"/>`;
  }
  const ha = ((hour % 12) * 30 + minute * 0.5 - 90) * Math.PI / 180;
  const ma = (minute * 6 - 90) * Math.PI / 180;
  body += `<line x1="${c}" y1="${c}" x2="${c + Math.cos(ha) * 44}" y2="${c + Math.sin(ha) * 44}" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>`;
  body += `<line x1="${c}" y1="${c}" x2="${c + Math.cos(ma) * 68}" y2="${c + Math.sin(ma) * 68}" stroke="${C.blue}" stroke-width="3.5" stroke-linecap="round"/>`;
  body += `<circle cx="${c}" cy="${c}" r="5" fill="${C.pink}"/>`;
  return { type: 'svg', width: size, height: size, content: wrap(size, size, body) };
}

/** 方格纸（作图题底图） */
export function svgGrid(cols = 10, rows = 7, cell = 30, extra = '', pad = 14) {
  const w = cols * cell + pad * 2, h = rows * cell + pad * 2;
  let body = `<rect x="${pad}" y="${pad}" width="${cols * cell}" height="${rows * cell}" fill="${C.white}" stroke="${C.gray}" stroke-width="1.5"/>`;
  for (let i = 1; i < cols; i++) body += `<line x1="${pad + i * cell}" y1="${pad}" x2="${pad + i * cell}" y2="${h - pad}" stroke="${C.grid}" stroke-width="1"/>`;
  for (let j = 1; j < rows; j++) body += `<line x1="${pad}" y1="${pad + j * cell}" x2="${w - pad}" y2="${pad + j * cell}" stroke="${C.grid}" stroke-width="1"/>`;
  body += extra;
  const g = { type: 'svg', width: w, height: h, content: wrap(w, h, body), grid: { cols, rows, cell, pad } };
  return g;
}

/** 带刻度的线段（测量题） */
export function svgRuler(cm) {
  const w = 420, h = 130, pad = 40;
  const px = (w - 2 * pad) / 10;
  let body = `<rect x="${pad}" y="70" width="${10 * px}" height="34" rx="4" fill="${C.amberSoft}" stroke="${C.amber}" stroke-width="2"/>`;
  for (let i = 0; i <= 10; i++) {
    const x = pad + i * px;
    body += `<line x1="${x}" y1="70" x2="${x}" y2="${i % 5 === 0 ? 82 : 76}" stroke="${C.ink}" stroke-width="1.6"/>`;
    body += `<text x="${x}" y="100" text-anchor="middle" font-size="12" fill="${C.ink}" font-family="system-ui">${i}</text>`;
  }
  body = `<line x1="${pad}" y1="40" x2="${pad + cm * px}" y2="40" stroke="${C.blue}" stroke-width="4" stroke-linecap="round"/>` +
    `<circle cx="${pad}" cy="40" r="4" fill="${C.blue}"/><circle cx="${pad + cm * px}" cy="40" r="4" fill="${C.blue}"/>` + body;
  return { type: 'svg', width: w, height: h, content: wrap(w, h, body) };
}

/** 可点击图形（交互图形题 / figure-interactive） */
export function svgPickable(items, opts = {}) {
  const { w = 420, h = 220, extra = '' } = opts;
  const regions = [];
  let body = '';
  const palette = [C.blueSoft, C.greenSoft, C.amberSoft, C.pinkSoft, C.purpleSoft];
  const strokes = [C.blue, C.green, C.amber, C.pink, C.purple];
  items.forEach((it, i) => {
    const cx = it.cx, cy = it.cy, s = it.size || 34;
    const col = it.color ? palette[it.color % palette.length] : palette[i % palette.length];
    const st = it.color ? strokes[it.color % strokes.length] : strokes[i % strokes.length];
    if (it.kind === 'custom') {
      body += it.custom;
      regions.push({ id: it.id, kind: 'custom', cx, cy, r: it.r || 48, label: it.label || it.id });
    } else if (it.kind === 'circle') {
      body += `<circle cx="${cx}" cy="${cy}" r="${s}" fill="${col}" stroke="${st}" stroke-width="2.5"/>`;
      regions.push({ id: it.id, kind: 'circle', cx, cy, r: s + 8, label: it.label || it.id });
    } else if (it.kind === 'triangle') {
      body += `<polygon points="${cx},${cy - s} ${cx - s},${cy + s * 0.8} ${cx + s},${cy + s * 0.8}" fill="${col}" stroke="${st}" stroke-width="2.5"/>`;
      regions.push({ id: it.id, kind: 'triangle', cx, cy: cy + s * 0.2, r: s + 8, label: it.label || it.id });
    } else {
      body += `<rect x="${cx - s}" y="${cy - s}" width="${s * 2}" height="${s * 2}" rx="5" fill="${col}" stroke="${st}" stroke-width="2.5"/>`;
      regions.push({ id: it.id, kind: 'rect', cx, cy, r: s + 8, label: it.label || it.id });
    }
  });
  return { type: 'svg-interactive', width: w, height: h, content: wrap(w, h, extra + body), regions };
}

/**
 * 多边形（可标注顶点与边长）
 * @param {Array<{x:number,y:number}>} pts 顶点坐标（逻辑坐标，会自动缩放居中）
 * @param {object} opts labels:[{x,y,text,dx,dy}] extra:附加 SVG
 */
export function svgPolygon(pts, opts = {}) {
  const {
    labels = [], fill = C.blueSoft, stroke = C.blue, w = 280, h = 200,
    margin = 46, extra = '', grid = null,
  } = opts;
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const iw = w - margin * 2, ih = h - margin * 2;
  const k = Math.min(iw / Math.max(1e-6, maxX - minX || 1), ih / Math.max(1e-6, maxY - minY || 1));
  const sx = (x) => margin + (x - minX) * k + (iw - (maxX - minX) * k) / 2;
  const sy = (y) => h - margin - (y - minY) * k - (ih - (maxY - minY) * k) / 2;
  let body = grid ? grid : '';
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ') + ' Z';
  body += `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round"/>`;
  labels.forEach((lb) => {
    const px = sx(lb.x), py = sy(lb.y);
    body += `<circle cx="${px}" cy="${py}" r="3.5" fill="${C.ink}"/>`;
    body += `<text x="${px + (lb.dx || 0)}" y="${py + (lb.dy || -12)}" text-anchor="middle" font-size="14" font-weight="700" fill="${C.ink}" font-family="system-ui">${lb.text}</text>`;
  });
  body += extra;
  return { type: 'svg', width: w, height: h, content: wrap(w, h, body) };
}

/** 圆（半径/直径/扇形标注） */
export function svgCircle(opts = {}) {
  const { r = 70, labels = [], fill = C.blueSoft, stroke = C.blue, size = 220, extra = '' } = opts;
  const c = size / 2;
  let body = `<circle cx="${c}" cy="${c}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`;
  body += `<circle cx="${c}" cy="${c}" r="4" fill="${C.ink}"/>`;
  labels.forEach((lb) => {
    body += `<line x1="${c}" y1="${c}" x2="${c + lb.x}" y2="${c + lb.y}" stroke="${lb.color || C.ink}" stroke-width="2" stroke-dasharray="${lb.dash || 'none'}"/>`;
    if (lb.text) body += `<text x="${c + lb.x * 0.58 + (lb.tx || 8)}" y="${c + lb.y * 0.58 + (lb.ty || 0)}" font-size="14" font-weight="700" fill="${C.ink}" font-family="system-ui">${lb.text}</text>`;
  });
  body += extra;
  return { type: 'svg', width: size, height: size, content: wrap(size, size, body) };
}

/** 条形图 / 象形统计图 */
export function svgBars(data, opts = {}) {
  const { w = 380, h = 200, unit = '', color = C.blue, horizontal = false, showAxis = true } = opts;
  const pad = 38, max = Math.max(...data.map((d) => d.value), 1);
  let body = '';
  if (horizontal) {
    const bh = (h - 2 * pad) / data.length;
    data.forEach((d, i) => {
      const bw = ((w - 2 * pad - 60) * d.value) / max;
      const y = pad + i * bh;
      body += `<rect x="${pad + 60}" y="${y + bh * 0.15}" width="${bw}" height="${bh * 0.7}" rx="5" fill="${color}" fill-opacity="0.85"/>`;
      body += `<text x="${pad + 52}" y="${y + bh * 0.6}" text-anchor="end" font-size="13" font-weight="600" fill="${C.ink}" font-family="system-ui">${d.label}</text>`;
      body += `<text x="${pad + 66 + bw}" y="${y + bh * 0.6}" font-size="13" font-weight="700" fill="${C.ink}" font-family="system-ui">${d.value}${unit}</text>`;
    });
  } else {
    const bw = (w - 2 * pad) / data.length;
    body += `<line x1="${pad}" y1="${h - pad}" x2="${w - pad / 2}" y2="${h - pad}" stroke="${C.gray}" stroke-width="1.5"/>`;
    if (showAxis) body += `<line x1="${pad}" y1="${pad / 2}" x2="${pad}" y2="${h - pad}" stroke="${C.gray}" stroke-width="1.5"/>`;
    data.forEach((d, i) => {
      const bh2 = ((h - 2 * pad) * d.value) / max;
      const x = pad + bw * 0.2 + i * bw;
      body += `<rect x="${x}" y="${h - pad - bh2}" width="${bw * 0.6}" height="${bh2}" rx="5" fill="${color}" fill-opacity="0.85"/>`;
      body += `<text x="${x + bw * 0.3}" y="${h - pad - bh2 - 6}" text-anchor="middle" font-size="13" font-weight="700" fill="${C.ink}" font-family="system-ui">${d.value}${unit}</text>`;
      body += `<text x="${x + bw * 0.3}" y="${h - pad + 17}" text-anchor="middle" font-size="13" font-weight="600" fill="${C.ink}" font-family="system-ui">${d.label}</text>`;
    });
  }
  return { type: 'svg', width: w, height: h, content: wrap(w, h, body) };
}

/** 温度计（负数） */
export function svgNumberLine(opts = {}) {
  const { min = -10, max = 10, marks = [], w = 460, h = 110 } = opts;
  const pad = 34, y = h - 40;
  const sx = (v) => pad + ((v - min) / (max - min)) * (w - 2 * pad);
  let body = `<line x1="${pad}" y1="${y}" x2="${w - pad}" y2="${y}" stroke="${C.ink}" stroke-width="2"/>`;
  body += `<polygon points="${w - pad},${y} ${w - pad - 10},${y - 5} ${w - pad - 10},${y + 5}" fill="${C.ink}"/>`;
  for (let v = min; v <= max; v++) {
    const x = sx(v);
    body += `<line x1="${x}" y1="${y - 4}" x2="${x}" y2="${y + 4}" stroke="${C.gray}" stroke-width="1.5"/>`;
    body += `<text x="${x}" y="${y + 20}" text-anchor="middle" font-size="11" fill="${C.ink}" font-family="system-ui">${v}</text>`;
  }
  body += `<text x="${sx(0)}" y="${y - 12}" text-anchor="middle" font-size="12" font-weight="700" fill="${C.gray}" font-family="system-ui">0</text>`;
  marks.forEach((m) => {
    const x = sx(m.value);
    body += `<circle cx="${x}" cy="${y}" r="5" fill="${m.color || C.pink}"/>`;
    body += `<text x="${x}" y="${y - 14}" text-anchor="middle" font-size="13" font-weight="700" fill="${m.color || C.pink}" font-family="system-ui">${m.label}</text>`;
  });
  return { type: 'svg', width: w, height: h, content: wrap(w, h, body) };
}

/** 立体图形（长方体 / 圆柱 / 圆锥 / 球 侧面示意） */
export function svgSolid(kind) {
  const w = 240, h = 180, s = '#1e293b';
  let body = '';
  if (kind === 'cuboid') {
    body = `<polygon points="50,60 150,60 150,140 50,140" fill="${C.blueSoft}" stroke="${s}" stroke-width="2.5"/>
    <polygon points="50,60 86,32 186,32 150,60" fill="${C.greenSoft}" stroke="${s}" stroke-width="2.5"/>
    <polygon points="150,60 186,32 186,112 150,140" fill="${C.amberSoft}" stroke="${s}" stroke-width="2.5"/>`;
  } else if (kind === 'cube') {
    body = `<polygon points="70,65 160,65 160,155 70,155" fill="${C.blueSoft}" stroke="${s}" stroke-width="2.5"/>
    <polygon points="70,65 100,40 190,40 160,65" fill="${C.greenSoft}" stroke="${s}" stroke-width="2.5"/>
    <polygon points="160,65 190,40 190,130 160,155" fill="${C.amberSoft}" stroke="${s}" stroke-width="2.5"/>`;
  } else if (kind === 'cylinder') {
    body = `<rect x="80" y="50" width="80" height="80" fill="${C.blueSoft}" stroke="none"/>
    <line x1="80" y1="50" x2="80" y2="130" stroke="${s}" stroke-width="2.5"/>
    <line x1="160" y1="50" x2="160" y2="130" stroke="${s}" stroke-width="2.5"/>
    <ellipse cx="120" cy="130" rx="40" ry="15" fill="${C.blueSoft}" stroke="${s}" stroke-width="2.5"/>
    <ellipse cx="120" cy="50" rx="40" ry="15" fill="${C.greenSoft}" stroke="${s}" stroke-width="2.5"/>`;
  } else if (kind === 'cone') {
    body = `<path d="M120,30 L80,130 A40,15 0 0 0 160,130 Z" fill="${C.amberSoft}" stroke="${s}" stroke-width="2.5"/>
    <ellipse cx="120" cy="130" rx="40" ry="15" fill="none" stroke="${s}" stroke-width="2.5" stroke-dasharray="5 4"/>`;
  } else {
    body = `<circle cx="120" cy="90" r="52" fill="${C.pinkSoft}" stroke="${s}" stroke-width="2.5"/>
    <ellipse cx="120" cy="90" rx="52" ry="18" fill="none" stroke="${s}" stroke-width="1.6" stroke-dasharray="5 4"/>`;
  }
  return { type: 'svg', width: w, height: h, content: wrap(w, h, body) };
}
