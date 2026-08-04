/* ===== Charts — SVG 图表工具 ===== */
const Charts = {
  line(data, opts = {}) {
    const w = opts.width || 640, h = opts.height || 200, pad = 30;
    const labels = data.map(d => d.label);
    const values = data.map(d => d.value);
    const maxV = Math.max(...values, opts.targetLine || 0, 1);
    const stepX = (w - pad * 2) / Math.max(values.length - 1, 1);
    const pts = values.map((v, i) => `${pad + i * stepX},${h - pad - (v / maxV) * (h - pad * 2)}`);
    const areaPts = `${pad},${h - pad} ${pts.join(' ')} ${pad + (values.length - 1) * stepX},${h - pad}`;
    const grid = [0, 0.25, 0.5, 0.75, 1].map(p => {
      const y = h - pad - p * (h - pad * 2);
      return `<line x1="${pad}" y1="${y}" x2="${w - pad}" y2="${y}" stroke="rgba(166,183,161,0.2)" stroke-width="1"/><text x="${pad - 8}" y="${y + 4}" font-size="10" fill="#777" text-anchor="end">${Math.round(maxV * p)}</text>`;
    }).join('');
    const xLabels = labels.map((l, i) => `<text x="${pad + i * stepX}" y="${h - pad + 16}" font-size="10" fill="#777" text-anchor="middle">${l}</text>`).join('');
    const dots = pts.map(p => { const [x, y] = p.split(','); return `<circle cx="${x}" cy="${y}" r="4" fill="${opts.color || '#829E8E'}"/>`; }).join('');
    const lineColor = opts.color || '#829E8E';
    let targetSvg = '';
    if (opts.targetLine) {
      const ty = h - pad - (opts.targetLine / maxV) * (h - pad * 2);
      targetSvg = `<line x1="${pad}" y1="${ty}" x2="${w - pad}" y2="${ty}" stroke="#E8A87C" stroke-width="1.5" stroke-dasharray="6,4"/><text x="${w - pad + 4}" y="${ty + 4}" font-size="10" fill="#E8A87C">${opts.targetLabel || '目标'}</text>`;
    }
    return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      ${grid}${xLabels}
      <polygon points="${areaPts}" fill="rgba(130,158,142,0.15)"/>
      <polyline points="${pts.join(' ')}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linejoin="round"/>
      ${dots}${targetSvg}
    </svg>`;
  },

  bar(data, opts = {}) {
    const w = opts.width || 640, h = opts.height || 200, pad = 30;
    const labels = data.map(d => d.label);
    const values = data.map(d => d.value);
    const maxV = Math.max(...values, opts.targetLine || 0, 1);
    const barW = (w - pad * 2) / values.length * 0.6;
    const gap = (w - pad * 2) / values.length;
    const bars = values.map((v, i) => {
      const bh = (v / maxV) * (h - pad * 2);
      const x = pad + i * gap + (gap - barW) / 2;
      const y = h - pad - bh;
      const color = opts.colors ? opts.colors[i % opts.colors.length] : '#829E8E';
      return `<rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="4" fill="${color}"/>
        <text x="${x + barW / 2}" y="${y - 6}" font-size="10" fill="#444" text-anchor="middle">${v}</text>
        <text x="${x + barW / 2}" y="${h - pad + 16}" font-size="10" fill="#777" text-anchor="middle">${labels[i]}</text>`;
    }).join('');
    let targetSvg = '';
    if (opts.targetLine) {
      const ty = h - pad - (opts.targetLine / maxV) * (h - pad * 2);
      targetSvg = `<line x1="${pad}" y1="${ty}" x2="${w - pad}" y2="${ty}" stroke="#E8A87C" stroke-width="1.5" stroke-dasharray="6,4"/><text x="${pad - 8}" y="${ty + 4}" font-size="10" fill="#E8A87C" text-anchor="end">${opts.targetLine}</text>`;
    }
    return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${bars}${targetSvg}</svg>`;
  },

  radar(labels, values, opts = {}) {
    const size = opts.size || 240, cx = size / 2, cy = size / 2, r = size / 2 - 36;
    const n = labels.length, maxV = Math.max(...values, 5);
    const angle = i => -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const gridRings = [0.25, 0.5, 0.75, 1].map(p => {
      const pts = labels.map((_, i) => `${cx + Math.cos(angle(i)) * r * p},${cy + Math.sin(angle(i)) * r * p}`).join(' ');
      return `<polygon points="${pts}" fill="none" stroke="rgba(166,183,161,0.3)" stroke-width="1"/>`;
    }).join('');
    const axes = labels.map((l, i) => {
      const x = cx + Math.cos(angle(i)) * r, y = cy + Math.sin(angle(i)) * r;
      const lx = cx + Math.cos(angle(i)) * (r + 18), ly = cy + Math.sin(angle(i)) * (r + 18);
      return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(166,183,161,0.2)" stroke-width="1"/>
        <text x="${lx}" y="${ly}" font-size="10" fill="#777" text-anchor="middle" dy="3">${l}</text>`;
    }).join('');
    const dataPts = values.map((v, i) => `${cx + Math.cos(angle(i)) * r * (v / maxV)},${cy + Math.sin(angle(i)) * r * (v / maxV)}`).join(' ');
    return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      ${gridRings}${axes}
      <polygon points="${dataPts}" fill="rgba(130,158,142,0.3)" stroke="#829E8E" stroke-width="2"/>
      ${values.map((v, i) => `<circle cx="${cx + Math.cos(angle(i)) * r * (v / maxV)}" cy="${cy + Math.sin(angle(i)) * r * (v / maxV)}" r="3" fill="#829E8E"/>`).join('')}
    </svg>`;
  },

  pie(data, opts = {}) {
    const size = opts.size || 200, cx = size / 2, cy = size / 2, r = size / 2 - 20;
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const colors = opts.colors || ['#829E8E', '#A6B7A1', '#B8C8B3', '#C9D5C5', '#DAE2D8', '#5E7A6E'];
    let cum = 0;
    const slices = data.map((d, i) => {
      const start = cum / total * 2 * Math.PI - Math.PI / 2;
      cum += d.value;
      const end = cum / total * 2 * Math.PI - Math.PI / 2;
      const x1 = cx + Math.cos(start) * r, y1 = cy + Math.sin(start) * r;
      const x2 = cx + Math.cos(end) * r, y2 = cy + Math.sin(end) * r;
      const large = end - start > Math.PI ? 1 : 0;
      return `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z" fill="${colors[i % colors.length]}" stroke="#F3F7F1" stroke-width="2"/>`;
    }).join('');
    const legend = data.map((d, i) => {
      const pct = Math.round(d.value / total * 100);
      return `<div style="display:flex;align-items:center;gap:6px;font-size:12px;margin:2px 0;"><span style="width:12px;height:12px;border-radius:3px;background:${colors[i % colors.length]};display:inline-block;"></span>${d.label}: ${pct}%</div>`;
    }).join('');
    return `<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
      <svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">${slices}<text x="${cx}" y="${cy + 4}" font-size="14" fill="#444" text-anchor="middle" font-weight="bold">${opts.centerText || ''}</text></svg>
      <div>${legend}</div></div>`;
  },

  progress(current, total, opts = {}) {
    const pct = total > 0 ? Math.min(100, Math.round(current / total * 100)) : 0;
    const cls = pct >= 100 ? '' : pct >= 80 ? '' : pct >= 50 ? 'warn' : 'danger';
    return `<div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div><div class="text-sm text-light text-center mt-8">${current}/${total} (${pct}%)</div>`;
  }
};
