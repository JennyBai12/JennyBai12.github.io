/* ===== Utils 通用工具 ===== */
const Utils = {
  today() { return new Date().toISOString().slice(0, 10); },
  now() { return new Date().toISOString(); },
  formatDate(d) {
    if (!d) return '';
    const dt = typeof d === 'string' ? new Date(d) : d;
    return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  },
  daysBetween(d1, d2) {
    const a = new Date(d1), b = new Date(d2);
    return Math.ceil((b - a) / 86400000);
  },
  addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return this.formatDate(d);
  },
  weekStart() {
    const d = new Date();
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return this.formatDate(d);
  },
  monthStart() { return this.today().slice(0, 8) + '01'; },
  yearStart() { return this.today().slice(0, 4) + '-01-01'; },
  last7Days() {
    const arr = [];
    for (let i = 6; i >= 0; i--) arr.push(this.addDays(this.today(), -i));
    return arr;
  },
  last30Days() {
    const arr = [];
    for (let i = 29; i >= 0; i--) arr.push(this.addDays(this.today(), -i));
    return arr;
  },

  escape(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  /* ===== 真实图像分析（浏览器 Canvas 像素级，无需任何外部服务） ===== */
  hexOf(c) {
    if (!c) return '#000000';
    const h = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return '#' + h(c.r) + h(c.g) + h(c.b);
  },

  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('图片加载失败'));
      im.src = src;
    });
  },

  _luminance(r, g, b) { return 0.299 * r + 0.587 * g + 0.114 * b; },

  /* 对图片做真实像素分析：主色调、亮度、对比度、配色构成、泛红指数等 */
  async analyzeImage(dataUrl, opts = {}) {
    const img = await Utils._loadImage(dataUrl);
    const maxDim = 220;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    let lumSum = 0, lumSq = 0;
    const buckets = {};
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 125) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      sumR += r; sumG += g; sumB += b; count++;
      const lum = Utils._luminance(r, g, b);
      lumSum += lum; lumSq += lum * lum;
      const key = (r >> 4) + '-' + (g >> 4) + '-' + (b >> 4);
      let bk = buckets[key];
      if (!bk) { bk = buckets[key] = { r: 0, g: 0, b: 0, n: 0 }; }
      bk.r += r; bk.g += g; bk.b += b; bk.n++;
    }
    if (count === 0) return { error: 'empty', width: img.width, height: img.height };
    const avg = { r: Math.round(sumR / count), g: Math.round(sumG / count), b: Math.round(sumB / count) };
    const mean = lumSum / count;
    const brightness = +(mean / 255 * 100).toFixed(1);
    const variance = Math.max(0, lumSq / count - mean * mean);
    const contrast = +(Math.sqrt(variance) / 255 * 100).toFixed(1);
    const arr = Object.values(buckets)
      .map(b => ({ r: Math.round(b.r / b.n), g: Math.round(b.g / b.n), b: Math.round(b.b / b.n), ratio: b.n / count }))
      .sort((a, b) => b.ratio - a.ratio);
    // 过滤掉过亮/过暗的"背景色"，优先呈现衣物主色
    const dominant = (opts.clothing
      ? arr.filter(c => { const lum = Utils._luminance(c.r, c.g, c.b); return lum > 28 && lum < 232; })
      : arr).filter(c => c.ratio >= 0.025).slice(0, 6);
    const redness = +(avg.r - (avg.g + avg.b) / 2).toFixed(1);
    return {
      width: img.width, height: img.height,
      avg, brightness, contrast, redness,
      dominant: dominant.length ? dominant : (arr[0] ? [arr[0]] : []),
      topColor: (dominant[0] || arr[0] || avg)
    };
  },

  /* 把分析结果渲染成配色色块 */
  paletteHTML(analysis) {
    if (!analysis || !analysis.dominant || !analysis.dominant.length) return '';
    return `<div class="color-palette">${analysis.dominant.map(c =>
      `<span class="color-swatch" style="background:${Utils.hexOf(c)}" title="${Utils.hexOf(c)} (${Math.round(c.ratio * 100)}%)"></span>`
    ).join('')}</div>`;
  },

  /* ===== 离线 OCR（Tesseract.js 本地自托管，无需 API Key、无需外网） ===== */
  _tesseractPromise: null,

  /* 本地引擎目录的绝对地址 */
  _ocrBase() {
    try { return new URL('vendor/tesseract/', document.baseURI).href; }
    catch (e) { return 'vendor/tesseract/'; }
  },

  _loadScript(src, timeout = 20000) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true; s.remove(); reject(new Error('timeout: ' + src));
      }, timeout);
      s.src = src;
      s.async = true;
      s.onload = () => { if (!done) { done = true; clearTimeout(timer); resolve(src); } };
      s.onerror = () => { if (!done) { done = true; clearTimeout(timer); s.remove(); reject(new Error('load failed: ' + src)); } };
      document.head.appendChild(s);
    });
  },

  /* 加载 OCR 引擎：本地自托管优先，失败再依次回退到国内 CDN */
  _ensureTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (Utils._tesseractPromise) return Utils._tesseractPromise;

    const sources = [
      Utils._ocrBase() + 'tesseract.min.js',
      'https://cdn.staticfile.net/tesseract.js/4.1.4/tesseract.min.js',
      'https://cdn.bootcdn.net/ajax/libs/tesseract.js/4.1.4/tesseract.min.js',
      'https://cdn.jsdelivr.net/npm/tesseract.js@4.1.4/dist/tesseract.min.js',
    ];

    Utils._tesseractPromise = (async () => {
      for (const src of sources) {
        try {
          await Utils._loadScript(src);
          if (window.Tesseract) { Utils._ocrLoadedFrom = src; return window.Tesseract; }
        } catch (e) { /* 换下一个源 */ }
      }
      Utils._tesseractPromise = null;
      throw new Error('OCR_ENGINE_UNAVAILABLE');
    })();

    return Utils._tesseractPromise;
  },

  /**
   * 识别图片中的文字（中文+英文），返回纯文本
   * @param {string} dataUrl 图片 dataURL / URL / File
   * @param {string} langs   语言，默认 chi_sim+eng
   * @param {function} onProgress (labelText, percent) 进度回调
   */
  async ocrImage(dataUrl, langs = 'chi_sim+eng', onProgress) {
    const T = await Utils._ensureTesseract();
    const base = Utils._ocrBase().replace(/\/$/, '');
    const report = (txt, pct) => { try { onProgress && onProgress(txt, pct); } catch (e) {} };

    const LABEL = {
      'loading tesseract core': '加载识别核心',
      'loaded tesseract core': '识别核心就绪',
      'initializing tesseract': '初始化引擎',
      'initialized tesseract': '引擎就绪',
      'loading language traineddata': '加载中文语言包',
      'loading language traineddata (from cache)': '读取已缓存语言包',
      'loaded language traineddata': '语言包就绪',
      'initializing api': '准备识别',
      'initialized api': '准备就绪',
      'recognizing text': '识别文字中',
    };

    const opts = {
      cacheMethod: 'write',
      logger: (m) => {
        if (!m || !m.status) return;
        const label = LABEL[m.status] || m.status;
        report(label + '…', Math.round((m.progress || 0) * 100));
      },
    };

    // 本地有 worker + core + tessdata 时全用本地路径，完全离线可用
    const loadedFrom = Utils._ocrLoadedFrom || '';
    if (loadedFrom.includes('vendor/tesseract/')) {
      opts.workerPath = base + '/worker.min.js';
      opts.langPath = base + '/tessdata';
      opts.corePath = base + '/';  // 本地已有 tesseract-core.wasm.js
    }

    let worker = null;
    try {
      report('正在启动识别引擎…', 1);
      // tesseract.js v4 与 v5 都支持 createWorker(langs, oem, options)
      // v4 返回的 worker 仍有 loadLanguage/initialize 方法，需要手动再初始化一次确保语言包生效
      worker = await T.createWorker(langs, 1, opts);
      if (worker && typeof worker.loadLanguage === 'function') {
        await worker.loadLanguage(langs);
        await worker.initialize(langs);
      }
      report('识别文字中…', 0);
      const { data } = await worker.recognize(dataUrl);
      return (data && data.text) ? data.text : '';
    } finally {
      if (worker) { try { await worker.terminate(); } catch (e) {} }
    }
  },

  /* 图片预处理：灰度 + 自适应二值化 + 放大，提高中文识别率 */
  async preprocessForOCR(dataUrl, maxDim = 1600) {
    const img = await Utils._loadImage(dataUrl);
    const scale = Math.min(2.5, Math.max(1, maxDim / Math.max(img.width, img.height)));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    // 灰度
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = g;
    }
    // 简单自适应阈值（ Sauvola 简化版：局部均值阈值）
    const gray = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        gray[y * w + x] = d[(y * w + x) * 4];
      }
    }
    const r = 15;
    const out = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0, sum2 = 0, n = 0;
        for (let dy = -r; dy <= r; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -r; dx <= r; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            const v = gray[yy * w + xx];
            sum += v; sum2 += v * v; n++;
          }
        }
        const mean = sum / n;
        const std = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
        const threshold = mean * (1 + 0.2 * ((std / 128) - 1));
        out[y * w + x] = gray[y * w + x] < threshold ? 0 : 255;
      }
    }
    for (let i = 0; i < out.length; i++) {
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = out[i];
      d[i * 4 + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
  },

  /* 统一的 OCR 执行器：负责进度条 UI、错误兜底与「粘贴文字」降级入口 */
  runOCR(areaId, file, onText, opts = {}) {
    const area = document.getElementById(areaId);
    if (!area) return;
    const pasteBtn = opts.pasteHandler
      ? `<button type="button" class="btn-cancel btn-mini" onclick="${opts.pasteHandler}">📋 改用粘贴文字</button>`
      : '';

    area.innerHTML = `
      <div class="ocr-progress-box">
        <div class="ocr-loading"><div class="ocr-spinner"></div><span id="${areaId}-label">正在启动识别引擎…</span></div>
        <div class="ocr-bar"><div class="ocr-bar-inner" id="${areaId}-bar" style="width:2%"></div></div>
        <div class="text-sm text-light mt-8">首次使用需加载约 6MB 识别模型，之后会自动缓存、秒开。</div>
      </div>`;

    Utils.readFileAsDataURL(file, async (url) => {
      try {
        const processed = await Utils.preprocessForOCR(url);
        const text = await Utils.ocrImage(processed, 'chi_sim+eng', (label, pct) => {
          const l = document.getElementById(areaId + '-label');
          const b = document.getElementById(areaId + '-bar');
          if (l) l.textContent = `${label} ${pct}%`;
          if (b) b.style.width = Math.max(2, pct) + '%';
        });
        const clean = String(text || '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        if (!clean) {
          area.innerHTML = `<div class="ocr-result">⚠️ 没能识别出文字。建议：光线充足、文字端正、尽量拍清楚一点再试。${pasteBtn}</div>`;
          return;
        }
        if (opts.renderResult === false) {
          // 由回调自行渲染结果区（例如解析成表单）
          area.innerHTML = '';
          onText(clean);
        } else {
          onText(clean);
          area.innerHTML = `<div class="ocr-result">✅ 识别结果（已填入，可直接修改）：\n${Utils.escape(clean)}</div>`;
        }
      } catch (e) {
        const offline = String(e && e.message) === 'OCR_ENGINE_UNAVAILABLE';
        area.innerHTML = `<div class="ocr-result">⚠️ ${offline ? '识别引擎加载失败，请检查网络后重试。' : '识别过程出错：' + Utils.escape(String(e && e.message || e))}
提示：手机相册（iOS「实况文本」）、微信长按图片「提取文字」也能取字，复制后用下面按钮粘贴。${pasteBtn}</div>`;
      }
    });
  },

  /* ===== 真实文本解析：购物小票 ===== */
  parseReceiptText(text) {
    const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let buyDate = '';
    const dateRe = /(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})/;
    for (const l of lines) { const m = l.match(dateRe); if (m) { buyDate = `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`; break; } }
    let total = '';
    const totalRe = /(总计|合计|总价|应付|实付|应收|小计|金额)[^0-9]*?([0-9]+(\.[0-9]{1,2})?)/;
    for (const l of lines) { const m = l.match(totalRe); if (m) { total = m[2]; break; } }
    if (!total) {
      let best = 0;
      for (const l of lines) { const ms = l.match(/[¥￥]?\s*([0-9]+(\.[0-9]{1,2})?)\s*元?/g); if (ms) ms.forEach(x => { const v = parseFloat(x.replace(/[¥￥元\s]/g, '')); if (v > best) best = v; }); }
      if (best > 0) total = best.toFixed(2);
    }
    const items = [];
    const priceRe = /[¥￥]?\s*([0-9]+(\.[0-9]{1,2})?)\s*元?/;
    for (const l of lines) {
      if (/(总计|合计|小计|应付|实付|应收|找零|现金|微信|支付宝)/.test(l)) continue;
      const m = l.match(priceRe);
      if (m) {
        const price = parseFloat(m[1]);
        const name = l.replace(priceRe, '').replace(/[¥￥]/g, '').replace(/[xX×]\s*\d+/g, '').replace(/[^\u4e00-\u9fa5A-Za-z0-9·•\-]/g, ' ').trim();
        if (name && name.length <= 30) items.push({ name, price: price.toFixed(2) });
      }
    }
    return { name: items.length ? items[0].name : '', totalPrice: total, buyDate, items: items.slice(0, 10), raw: text };
  },

  /* ===== 真实文本解析：会议纪要提取待办 ===== */
  parseMeetingTodos(content) {
    const lines = String(content || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const todos = [];
    lines.forEach(line => {
      if (!/(负责|完成|提交|跟进|处理|交付|推进|截止|前|安排)/.test(line)) return;
      const numM = line.match(/^\d+[\.、\)]\s*(.+)$/) || line.match(/\d+[\.、]\s*(.+)/);
      const body = numM ? numM[1] : line;
      const personM = body.match(/([\u4e00-\u9fa5]{2,4})(?=负责|完成|提交|跟进|处理|交付|推进)/);
      const assignee = personM ? personM[1] : '待分配';
      let deadline = '';
      const d = body.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/) || body.match(/(\d{1,2})月(\d{1,2})[日号]?/) || body.match(/(\d{1,2})[-\/](\d{1,2})日?/);
      if (d) {
        if (d[3]) deadline = `${d[1]}-${String(d[2]).padStart(2, '0')}-${String(d[3]).padStart(2, '0')}`;
        else if (d[2]) deadline = `${new Date().getFullYear()}-${String(d[1]).padStart(2, '0')}-${String(d[2]).padStart(2, '0')}`;
      }
      let priority = '中';
      if (/紧急|立即|尽快|马上|务必/.test(body)) priority = '高';
      else if (/不急|暂缓|低优先级|可选/.test(body)) priority = '低';
      todos.push({
        title: body.length > 40 ? body.slice(0, 40) + '...' : body,
        assignee, deadline, detail: body, priority, status: '未开始'
      });
    });
    return todos.length ? todos : [{ title: '跟进会议事项', assignee: '待分配', deadline: '', detail: '需进一步确认会议任务', priority: '中', status: '未开始' }];
  },

  /* ===== 真实文本解析：影音（电影票根 / 海报 / 播放页截图） ===== */
  parseMediaText(text) {
    const raw = String(text || '');
    const lines = raw.split(/\r?\n/).map(l => l.replace(/\s{2,}/g, ' ').trim()).filter(Boolean);
    const joined = lines.join('\n');
    const res = {
      title: '', category: '', tags: '', cinema: '', hall: '', showDate: '', showTime: '',
      ticketPrice: '', seat: '', totalEpisodes: '', currentEpisode: '', channel: '', raw
    };

    /* --- 作品名称 --- */
    const bracketM = joined.match(/[《<【]\s*([^》>】\n]{1,40})\s*[》>】]/);
    if (bracketM) res.title = bracketM[1].trim();
    if (!res.title) {
      const labelM = joined.match(/(?:片\s*名|影\s*片|影片名称|剧\s*名|节目名称|作品名称|名\s*称)\s*[：:]\s*([^\n]{1,40})/);
      if (labelM) res.title = labelM[1].trim();
    }
    if (!res.title) {
      // 兜底：取第一条不像影院/日期/价格/订单号的短行
      const bad = /(影城|影院|电影城|巨幕|大厅|[0-9]号厅|排\s*\d+\s*座|票价|售价|价格|合计|实付|应付|订单|流水|二维码|取票|入场|检票|时间|日期|地址|请|凭|微信|支付宝|美团|猫眼|淘票票|ticket|cinema|order|www|http)/i;
      for (const l of lines) {
        const t = l.replace(/^[\s\-–—•·*]+/, '').trim();
        if (t.length < 2 || t.length > 30) continue;
        if (bad.test(t)) continue;
        if (/^[\d\s:：\-\/\.￥¥元%]+$/.test(t)) continue;
        res.title = t; break;
      }
    }
    if (res.title) {
      res.title = res.title
        .replace(/\s*[\(（\[【]?\s*(2D|3D|4D|4DX|IMAX|中文版|国语|粤语|原版|数字|杜比[^\)）\]】]{0,6}|字幕版)\s*[\)）\]】]?\s*$/gi, '')
        .replace(/[，,。;；:：]+$/, '').trim();
    }

    /* --- 影院 / 影厅 --- */
    for (const l of lines) {
      if (/(影城|影院|电影城|电影院|CGV|万达|金逸|大地|博纳|横店|星轶|卢米埃|保利|中影|嘉禾|SFC|上影)/i.test(l)) {
        res.cinema = l.replace(/[，,。;；]+$/, '').trim();
        break;
      }
    }
    const hallM = joined.match(/(\d+\s*号\s*[厅廳]|IMAX\s*厅|杜比[^\s\n]{0,4}厅|巨幕厅|激光厅|VIP\s*厅|LUXE\s*厅)/i);
    if (hallM) {
      res.hall = hallM[1].replace(/\s+/g, '');
      if (!res.cinema) res.cinema = res.hall;
      else if (!res.cinema.includes(res.hall)) res.cinema = res.cinema + ' ' + res.hall;
    }

    /* --- 观看日期 / 场次时间 --- */
    const dM = joined.match(/(20\d{2})\s*[年\-\/\.]\s*(\d{1,2})\s*[月\-\/\.]\s*(\d{1,2})/);
    if (dM) {
      res.showDate = `${dM[1]}-${String(dM[2]).padStart(2, '0')}-${String(dM[3]).padStart(2, '0')}`;
    } else {
      const mdM = joined.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/);
      if (mdM) res.showDate = `${new Date().getFullYear()}-${String(mdM[1]).padStart(2, '0')}-${String(mdM[2]).padStart(2, '0')}`;
    }
    const tM = joined.match(/\b([0-2]?\d)\s*[:：]\s*([0-5]\d)\b/);
    if (tM && +tM[1] <= 23) res.showTime = `${String(tM[1]).padStart(2, '0')}:${tM[2]}`;

    /* --- 票价 --- */
    let price = '';
    const pM = joined.match(/(票\s*价|售\s*价|价\s*格|实\s*付|应\s*付|支付金额|合\s*计|总\s*价|金\s*额)[^0-9\n]{0,8}([0-9]+(?:\.[0-9]{1,2})?)/);
    if (pM) price = pM[2];
    if (!price) { const y = joined.match(/[¥￥]\s*([0-9]+(?:\.[0-9]{1,2})?)/); if (y) price = y[1]; }
    if (!price) { const e = joined.match(/([0-9]+(?:\.[0-9]{1,2})?)\s*元/); if (e) price = e[1]; }
    const pv = parseFloat(price);
    if (pv > 0 && pv < 100000) res.ticketPrice = String(+pv.toFixed(2));

    /* --- 座位 --- */
    const seatM = joined.match(/(\d{1,2})\s*排\s*(\d{1,2})\s*座/);
    if (seatM) res.seat = `${seatM[1]}排${seatM[2]}座`;

    /* --- 集数（播放页截图） --- */
    const totalM = joined.match(/(?:全|共)\s*(\d{1,3})\s*集/) || joined.match(/(\d{1,3})\s*集\s*全/);
    if (totalM) res.totalEpisodes = totalM[1];
    const curM = joined.match(/更新至\s*第?\s*(\d{1,3})\s*集/) ||
                 joined.match(/(?:看|播放|观看)\s*到\s*第?\s*(\d{1,3})\s*集/) ||
                 joined.match(/第\s*(\d{1,3})\s*集/) ||
                 joined.match(/\bEP\s*\.?\s*(\d{1,3})\b/i);
    if (curM) res.currentEpisode = curM[1];

    /* --- 品类判定 --- */
    if (/纪录片|记录片|自然纪录|BBC|Discovery|探索频道|National\s*Geographic|国家地理/i.test(joined)) res.category = '纪录片';
    else if (/综艺|真人秀|脱口秀|选秀|访谈节目/.test(joined)) res.category = '综艺';
    else if (res.totalEpisodes || res.currentEpisode || /电视剧|剧集|连续剧|第\s*\d+\s*季|Season\s*\d/i.test(joined)) res.category = '电视剧';
    else if (res.cinema || res.seat || /影票|票根|取票|观影|排片|场次|电影票/.test(joined)) res.category = '电影';

    /* --- 观看渠道 --- */
    if (res.cinema || res.seat) res.channel = '影院观影';
    else if (/爱奇艺|腾讯视频|优酷|芒果TV|哔哩哔哩|B\s*站|Netflix|网飞|迪士尼|Disney|HBO|咪咕|搜狐视频|西瓜视频|Apple\s*TV/i.test(joined)) res.channel = '线上观看';

    /* --- 题材标签 --- */
    const GENRES = ['科幻', '悬疑', '动作', '爱情', '喜剧', '恐怖', '惊悚', '动画', '剧情', '犯罪', '奇幻',
      '冒险', '战争', '历史', '武侠', '家庭', '青春', '治愈', '推理', '传记', '歌舞', '运动',
      '美食', '自然', '海洋', '宇宙', '人文', '职场', '古装', '都市', '谍战', '国产'];
    const hit = GENRES.filter(g => joined.includes(g));
    if (hit.length) res.tags = hit.slice(0, 4).join(',');

    return res;
  },

  /* 导出 CSV */
  downloadCSV(filename, csv) {
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  },

  /* 导出 JSON */
  downloadJSON(filename, json) {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  },

  /* 读取文件为 DataURL（模拟图片上传） */
  readFileAsDataURL(file, callback) {
    const reader = new FileReader();
    reader.onload = e => callback(e.target.result);
    reader.readAsDataURL(file);
  },

  /* 复制文本到剪贴板（兼容不支持 navigator.clipboard 的环境） */
  copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => {
        return Utils._fallbackCopy(text);
      });
    }
    return Promise.resolve(Utils._fallbackCopy(text));
  },

  _fallbackCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  },

  /* 农历转公历（简化版：农历日期大约比公历晚一个月左右，这里返回原始日期作为近似值）
   * 注意：这是简化实现，不进行真正的农历计算。如需精确转换请引入农历库。 */
  lunarToSolar(lunarDate) {
    if (!lunarDate) return '';
    return this.formatDate(lunarDate);
  },

  /* 货币格式化 */
  formatMoney(amount, currency) {
    const sym = currency === 'USD' ? '$' : '¥';
    return sym + Number(amount || 0).toFixed(2);
  },

  /* ============ 模糊匹配（供影院/标签/衣物搜索复用） ============
   * 支持：完全包含 > 前缀匹配 > 顺序子序列匹配（如 "wd" 匹配 "万达"拼音首字母场景由调用方补充）
   * list: 字符串数组 或 对象数组（配合 keyFn 取出文本）
   * 返回：按相关度排序的原始条目数组 */
  fuzzyMatch(list, query, keyFn, limit) {
    const arr = Array.isArray(list) ? list : [];
    const max = limit || 8;
    const q = String(query || '').trim().toLowerCase();
    const getText = keyFn || (x => String(x == null ? '' : x));
    if (!q) return arr.slice(0, max);

    const scored = [];
    arr.forEach(item => {
      const text = String(getText(item) || '');
      const t = text.toLowerCase();
      if (!t) return;
      let score = -1;
      if (t === q) score = 1000;
      else if (t.indexOf(q) === 0) score = 800 - t.length;
      else if (t.indexOf(q) > -1) score = 600 - t.indexOf(q) - t.length * 0.1;
      else if (Utils._subseq(t, q)) score = 300 - t.length * 0.1;
      if (score > -1) scored.push({ item, score });
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, max).map(s => s.item);
  },

  /* 单条模糊命中判断：query 是否模糊匹配 text（含包含 / 顺序子序列 / 多关键词空格分词） */
  fuzzyHit(query, text) {
    const q = String(query || '').trim().toLowerCase();
    const t = String(text || '').toLowerCase();
    if (!q) return true;
    if (!t) return false;
    // 空格分词：每个词都需命中（任一方式）
    const words = q.split(/\s+/).filter(Boolean);
    return words.every(w => t.indexOf(w) > -1 || Utils._subseq(t, w));
  },

  /* 顺序子序列判断：q 的字符按顺序出现在 t 中 */
  _subseq(t, q) {
    let i = 0;
    for (let j = 0; j < t.length && i < q.length; j++) {
      if (t[j] === q[i]) i++;
    }
    return i === q.length;
  },

  /* 生成唯一 ID */
  genId() { return Date.now() + Math.floor(Math.random() * 1000); }
};
