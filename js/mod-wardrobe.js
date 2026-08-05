/* ===== 智能衣橱模块 ===== */
const WardrobeMod = {
  subTab: 'active',
  _pickerSearch: '',
  _collapsed: {},

  /* 大类 → 小类 */
  CAT_MAP: {
    '上衣':   ['T恤','衬衫','针织衫','卫衣','背心','Polo衫','其他上衣'],
    '裤装':   ['长裤','短裤','牛仔裤','西裤','运动裤','打底裤','其他裤装'],
    '裙装':   ['连衣裙','半身裙','短裙','长裙','其他裙装'],
    '外套':   ['大衣','羽绒服','夹克','西装外套','风衣','棉服','马甲','其他外套'],
    '鞋':     ['运动鞋','皮鞋','靴子','凉鞋','帆布鞋','高跟鞋','其他鞋'],
    '包袋':   ['单肩包','双肩包','手提包','斜挎包','钱包','其他包袋'],
    '配饰':   ['帽子','围巾','腰带','首饰','眼镜','手表','发饰','其他配饰'],
    '内衣家居': ['内衣','睡衣','家居服','袜子'],
    '其他':   ['其他'],
  },

  /* 常见衣物颜色 → RGB，用于照片配色与衣橱衣物匹配 */
  COLOR_RGB: {
    '白色': [245,245,245], '米白': [238,232,220], '米色': [225,210,185], '杏色': [230,205,175],
    '黑色': [28,28,30],   '灰色': [140,140,142], '深灰': [80,80,84],   '浅灰': [200,200,202],
    '红色': [200,50,50],  '酒红': [125,35,45],   '粉色': [235,165,185], '橘色': [232,140,60],
    '黄色': [235,205,80], '卡其': [190,165,120], '棕色': [125,90,60],   '咖啡': [95,70,52],
    '绿色': [80,150,90],  '墨绿': [45,85,60],    '军绿': [110,120,80],  '薄荷绿': [160,205,180],
    '蓝色': [60,105,190], '深蓝': [35,55,110],   '天蓝': [135,185,225], '牛仔蓝': [85,115,155],
    '紫色': [140,105,180],'藕粉': [215,180,185], '银色': [200,200,205], '金色': [205,175,105],
  },

  render(c) {
    c.innerHTML = `
      <div class="section-title">👕 ${I18n.t('wardrobe')}</div>
      <div class="sub-tabs">
        <div class="sub-tab ${this.subTab === 'active' ? 'active' : ''}" onclick="WardrobeMod.setSub('active')">我的衣橱</div>
        <div class="sub-tab ${this.subTab === 'secondhand' ? 'active' : ''}" onclick="WardrobeMod.setSub('secondhand')">二手已处理</div>
        <div class="sub-tab ${this.subTab === 'outfit' ? 'active' : ''}" onclick="WardrobeMod.setSub('outfit')">穿搭打卡</div>
      </div>
      <div id="wardrobe-sub"></div>
    `;
    if (this.subTab === 'active') this.renderActive();
    else if (this.subTab === 'secondhand') this.renderSecondhand();
    else this.renderOutfit();
  },

  setSub(tab) { this.subTab = tab; App.render(); },

  renderActive() {
    const clothes = Store.filter('clothes', cl => !cl.archived && !cl.isSecondhand);
    const categories = [...new Set(clothes.map(c => c.category))];
    const idleItems = clothes.filter(c => c.annualCount < 1);

    document.getElementById('wardrobe-sub').innerHTML = `
      <div class="flex-between mb-12">
        <div class="subsection-title" style="margin:0;">我的衣橱 (${clothes.length})</div>
        <div class="flex gap-8">
          <button class="btn btn-outline btn-sm" onclick="WardrobeMod.add()">手动添加</button>
          <button class="btn btn-primary btn-sm" onclick="WardrobeMod.ocrAdd()">📷 AI识别</button>
        </div>
      </div>
      ${idleItems.length > 0 ? `<div class="alert-box warn"><h4>🔴 闲置清单</h4>本年度使用次数＜1次的衣物：${idleItems.length}件，卡片已浅红色高亮标记。</div>` : ''}
      <div class="filter-bar">
        <div class="filter-tab active" onclick="WardrobeMod.filterCat(this, '')">全部</div>
        ${categories.map(cat => `<div class="filter-tab" onclick="WardrobeMod.filterCat(this, '${cat}')">${cat}</div>`).join('')}
      </div>
      <div id="clothes-list">${this.renderClothesList(clothes)}</div>
    `;
  },

  renderClothesList(clothes) {
    return clothes.map(cl => `
      <div class="card ${cl.annualCount < 1 ? 'idle' : ''}">
        <div class="flex-between">
          <div class="flex-center gap-12 flex-1" style="min-width:0;">
            ${cl.image
              ? `<img class="img-thumb" src="${cl.image}" style="width:56px;height:56px;flex-shrink:0;" onclick="App.openImageViewer('${cl.image}')">`
              : `<div style="width:56px;height:56px;flex-shrink:0;border-radius:8px;background:rgba(0,0,0,0.05);display:flex;align-items:center;justify-content:center;font-size:22px;">👕</div>`}
            <div style="min-width:0;">
              <div class="flex-center gap-8">
                <span class="text-bold">${Utils.escape(cl.name)}</span>
                ${cl.annualCount < 1 ? '<span class="secondhand-badge">闲置</span>' : ''}
              </div>
              <div class="text-sm text-light mt-8">${Utils.escape(cl.category)}${cl.subCategory ? ' / ' + Utils.escape(cl.subCategory) : ''} · ${Utils.escape(cl.color)} · ${Utils.escape(cl.season)} · ¥${cl.price}</div>
              <div class="text-sm text-light">年度使用 ${cl.annualCount}次 · 累计 ${cl.totalCount}次</div>
            </div>
          </div>
          <div class="flex gap-8" style="flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;">
            <button class="btn btn-outline btn-sm" onclick="WardrobeMod.wear(${cl.id})">穿搭+1</button>
            <button class="btn btn-outline btn-sm" onclick="WardrobeMod.editCloth(${cl.id})">✏️</button>
            <button class="btn btn-outline btn-sm" onclick="WardrobeMod.sellSecondhand(${cl.id})">二手</button>
            <button class="btn btn-cancel btn-sm" onclick="WardrobeMod.del(${cl.id})">✕</button>
          </div>
        </div>
      </div>
    `).join('') || '<div class="empty-state"><div class="empty-icon">👕</div>衣橱空空如也</div>';
  },

  filterCat(el, cat) {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    const clothes = cat ? Store.filter('clothes', c => !c.archived && !c.isSecondhand && c.category === cat) : Store.filter('clothes', c => !c.archived && !c.isSecondhand);
    document.getElementById('clothes-list').innerHTML = this.renderClothesList(clothes);
  },

  add() {
    this._clImage = '';
    App.openModal(this.clothForm(null));
  },

  editCloth(id) {
    const cl = Store.find('clothes', c => c.id === id);
    if (!cl) return;
    this._clImage = cl.image || '';
    App.openModal(this.clothForm(cl));
  },

  clothForm(cl) {
    const isEdit = !!cl;
    const cats = Object.keys(this.CAT_MAP);
    const curCat = isEdit ? (cl.category || cats[0]) : cats[0];
    const seasons = ['春','夏','秋','冬','四季'];
    return `
      <div class="modal-title">${isEdit ? '✏️ 修改衣物' : '添加衣物'}</div>
      <div class="form-group">
        <label class="form-label">📷 衣物照片</label>
        <div class="img-upload-area" onclick="WardrobeMod.uploadClothImg()">拍照 / 上传衣物照片（自动识别主色）</div>
        <div id="cl-img-box">${this._clImage ? `<div class="img-grid"><div class="img-thumb-wrap"><img class="img-thumb" src="${this._clImage}"><button class="img-thumb-del" onclick="WardrobeMod.removeClothImg()">✕</button></div></div>` : ''}</div>
        <div id="cl-img-ai"></div>
      </div>
      <div class="form-group"><label class="form-label">名称 <span class="req">*</span></label><input type="text" id="cl-name" value="${isEdit ? Utils.escape(cl.name || '') : ''}"></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">大类</label><select id="cl-category" onchange="WardrobeMod.syncSubCat()">${cats.map(c => `<option${c === curCat ? ' selected' : ''}>${c}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">小类</label><select id="cl-subcat">${(this.CAT_MAP[curCat] || []).map(s => `<option${isEdit && cl.subCategory === s ? ' selected' : ''}>${s}</option>`).join('')}</select></div>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">颜色</label><input type="text" id="cl-color" list="cl-color-list" value="${isEdit ? Utils.escape(cl.color || '') : ''}" placeholder="如：白色"><datalist id="cl-color-list">${Object.keys(this.COLOR_RGB).map(c => `<option value="${c}">`).join('')}</datalist></div>
        <div class="form-group"><label class="form-label">季节</label><select id="cl-season">${seasons.map(s => `<option${isEdit && cl.season === s ? ' selected' : ''}>${s}</option>`).join('')}</select></div>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">购入价格</label><input type="number" id="cl-price" value="${isEdit ? (cl.price || 0) : 0}"></div>
        <div class="form-group"><label class="form-label">购买日期</label><input type="date" id="cl-date" value="${isEdit ? (cl.purchaseDate || Utils.today()) : Utils.today()}"></div>
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button>
        <button class="btn-confirm" onclick="WardrobeMod.save(${isEdit ? cl.id : 'null'})">${I18n.t('save')}</button>
      </div>`;
  },

  syncSubCat() {
    const cat = document.getElementById('cl-category').value;
    const sel = document.getElementById('cl-subcat');
    if (sel) sel.innerHTML = (this.CAT_MAP[cat] || ['其他']).map(s => `<option>${s}</option>`).join('');
  },

  uploadClothImg() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      const f = input.files[0];
      if (!f) return;
      Utils.readFileAsDataURL(f, async (url) => {
        WardrobeMod._clImage = url;
        const box = document.getElementById('cl-img-box');
        if (box) box.innerHTML = `<div class="img-grid"><div class="img-thumb-wrap"><img class="img-thumb" src="${url}"><button class="img-thumb-del" onclick="WardrobeMod.removeClothImg()">✕</button></div></div>`;
        const ai = document.getElementById('cl-img-ai');
        if (ai) ai.innerHTML = '<div class="ocr-loading"><div class="ocr-spinner"></div>识别衣物主色…</div>';
        try {
          const a = await Utils.analyzeImage(url, { clothing: true });
          const named = WardrobeMod.nearestColorName(a.topColor);
          const colorInput = document.getElementById('cl-color');
          if (colorInput && !colorInput.value.trim()) colorInput.value = named;
          if (ai) ai.innerHTML = `<div class="ai-report"><div class="ai-report-body">
            <div>识别主色：<span class="color-swatch" style="background:${Utils.hexOf(a.topColor)};vertical-align:middle;"></span> ${named}（${Utils.hexOf(a.topColor)}）</div>
            ${Utils.paletteHTML(a)}
            <div class="text-sm text-light">已自动填入颜色，可手动修改</div>
          </div></div>`;
        } catch (e) { if (ai) ai.innerHTML = ''; }
      });
    };
    input.click();
  },

  removeClothImg() {
    this._clImage = '';
    const box = document.getElementById('cl-img-box');
    if (box) box.innerHTML = '';
    const ai = document.getElementById('cl-img-ai');
    if (ai) ai.innerHTML = '';
  },

  /* 把 RGB 匹配到最接近的颜色名 */
  nearestColorName(c) {
    if (!c) return '';
    let best = '', bestD = Infinity;
    for (const name in this.COLOR_RGB) {
      const [r, g, b] = this.COLOR_RGB[name];
      const d = (r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2;
      if (d < bestD) { bestD = d; best = name; }
    }
    return best;
  },

  save(id) {
    const name = document.getElementById('cl-name').value.trim();
    if (!name) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    const base = {
      name,
      category: document.getElementById('cl-category').value,
      subCategory: (document.getElementById('cl-subcat') || {}).value || '',
      color: document.getElementById('cl-color').value,
      season: document.getElementById('cl-season').value,
      price: +document.getElementById('cl-price').value,
      image: this._clImage || '',
      purchaseDate: document.getElementById('cl-date').value,
    };
    if (id) {
      Store.update('clothes', id, base);
      Store.logChange('wardrobe', '修改', id, '修改衣物: ' + name);
      App.showToast(I18n.t('saved') || '已保存', 'success');
    } else {
      Store.add('clothes', Object.assign(base, {
        annualCount: 0, totalCount: 0,
        isSecondhand: false, secondhandPrice: 0, secondhandDate: '', archived: false
      }));
      Store.logChange('wardrobe', '新增', 0, '新增衣物: ' + name);
      App.showToast(I18n.t('added'), 'success');
    }
    this._clImage = '';
    App.closeModal(); App.render();
  },

  ocrAdd() {
    App.openModal(`
      <div class="modal-title">📷 AI识别添加衣物</div>
      <div class="form-group"><label class="form-label">上传小票/衣物照片</label><div class="img-upload-area" onclick="WardrobeMod.startOCR()">上传图片（离线识别）</div></div>
      <div class="form-group"><label class="form-label">或粘贴小票/订单文字</label><textarea id="ocr-paste" rows="3" placeholder="粘贴购物小票、订单文字，自动解析名称/价格/日期"></textarea></div>
      <div class="modal-actions"><button class="btn btn-outline btn-sm" onclick="WardrobeMod.parsePaste()">识别粘贴文字</button><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button></div>
      <div id="ocr-area"></div>
    `);
  },

  startOCR() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      Utils.runOCR('ocr-area', file, (text) => {
        WardrobeMod._fillOcr(text);
      }, { renderResult: false, pasteHandler: "document.getElementById('ocr-paste') && document.getElementById('ocr-paste').focus()" });
    };
    input.click();
  },

  parsePaste() {
    const text = document.getElementById('ocr-paste').value.trim();
    if (!text) { App.showToast('请先粘贴文字', 'error'); return; }
    this._fillOcr(text);
  },

  _fillOcr(text) {
    const r = Utils.parseReceiptText(text);
    document.getElementById('ocr-area').innerHTML = `
      <div class="ocr-result">识别原文：\n${Utils.escape(text).slice(0, 800)}</div>
      <div class="text-sm text-accent text-bold mt-12">✅ 已自动解析，可修改校正：</div>
      <div class="form-group mt-8"><label class="form-label">名称</label><input type="text" id="cl-name" value="${Utils.escape(r.name || '')}"></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">大类</label><select id="cl-category" onchange="WardrobeMod.syncSubCat()">${Object.keys(this.CAT_MAP).map(c => `<option>${c}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">小类</label><select id="cl-subcat">${this.CAT_MAP['上衣'].map(s => `<option>${s}</option>`).join('')}</select></div>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">颜色</label><input type="text" id="cl-color" value=""></div>
        <div class="form-group"><label class="form-label">价格</label><input type="number" id="cl-price" value="${r.totalPrice || ''}"></div>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">季节</label><select id="cl-season"><option>春</option><option>夏</option><option>秋</option><option>冬</option><option>四季</option></select></div>
        <div class="form-group"><label class="form-label">购买日期</label><input type="date" id="cl-date" value="${r.buyDate || Utils.today()}"></div>
      </div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="WardrobeMod.save(null)">确认保存</button></div>
    `;
  },

  wear(id) {
    const today = Utils.today();
    const existing = Store.find('outfits', o => o.date === today);
    if (existing) {
      if (existing.matchedClothes && existing.matchedClothes.includes(id)) {
        App.showToast('今日已记录该衣物', 'error'); return;
      }
      existing.matchedClothes = existing.matchedClothes || [];
      existing.matchedClothes.push(id);
      Store.update('outfits', existing.id, { matchedClothes: existing.matchedClothes });
    } else {
      Store.add('outfits', { date: today, images: [], matchedClothes: [id], note: '' });
    }
    const cl = Store.find('clothes', c => c.id === id);
    Store.update('clothes', id, { annualCount: cl.annualCount + 1, totalCount: cl.totalCount + 1 });
    App.showToast('穿搭+1', 'success'); App.render();
  },

  sellSecondhand(id) {
    App.openModal(`
      <div class="modal-title">二手处理</div>
      <div class="form-group"><label class="form-label">处理价格</label><input type="number" id="sh-price" value="0"></div>
      <div class="form-group"><label class="form-label">处理日期</label><input type="date" id="sh-date" value="${Utils.today()}"></div>
      <div class="text-sm text-light">处理后将自动迁移到二手衣橱，锁定不可修改使用次数。</div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-danger" onclick="WardrobeMod.confirmSell(${id})">确认处理</button></div>
    `);
  },

  confirmSell(id) {
    Store.update('clothes', id, {
      isSecondhand: true,
      secondhandPrice: +document.getElementById('sh-price').value,
      secondhandDate: document.getElementById('sh-date').value,
    });
    Store.logChange('wardrobe', '二手处理', id, '衣物二手处理');
    App.closeModal(); App.showToast('已迁移到二手衣橱', 'success'); App.render();
  },

  renderSecondhand() {
    const items = Store.filter('clothes', c => c.isSecondhand);
    document.getElementById('wardrobe-sub').innerHTML = `
      <div class="subsection-title">二手已处理衣橱 (${items.length})</div>
      ${items.map(cl => `
        <div class="card archived locked">
          <div class="flex-between">
            <div>
              <div class="flex-center gap-8"><span class="text-bold">${Utils.escape(cl.name)}</span><span class="secondhand-badge">已锁定</span></div>
              <div class="text-sm text-light mt-8">${Utils.escape(cl.category)} · ${Utils.escape(cl.color)} · 购入¥${cl.price}</div>
              <div class="text-sm text-light">处理价¥${cl.secondhandPrice} · ${cl.secondhandDate} · 累计使用${cl.totalCount}次</div>
            </div>
          </div>
        </div>
      `).join('') || '<div class="empty-state"><div class="empty-icon">🔄</div>暂无二手记录</div>'}
    `;
  },

  renderOutfit() {
    const outfits = Store.get('outfits').sort((a, b) => b.date.localeCompare(a.date));
    document.getElementById('wardrobe-sub').innerHTML = `
      <div class="flex-between mb-12">
        <div class="subsection-title" style="margin:0;">穿搭打卡 (${outfits.length})</div>
        <button class="btn btn-primary btn-sm" onclick="WardrobeMod.addOutfit()">➕ 打卡</button>
      </div>
      <div class="card"><div class="text-sm text-light">拍照打卡，AI 识别照片配色并自动推测衣橱单品；按大类/小类勾选或模糊搜索，自动累计穿着次数。</div></div>
      ${outfits.map(o => {
        let clothes = [];
        try { clothes = (o.matchedClothes || []).map(id => Store.find('clothes', c => c.id === id)).filter(Boolean); } catch (e) {}
        let analysis = null;
        try { analysis = o.analysis ? JSON.parse(o.analysis) : null; } catch (e) {}
        return `
        <div class="card">
          <div class="text-bold mb-8">📅 ${o.date}</div>
          ${o.images && o.images.length ? `<div class="img-grid mb-8">${o.images.map(img => `<img class="img-thumb" src="${img}" onclick="App.openImageViewer('${img}')">`).join('')}</div>` : ''}
          <div>${clothes.length ? clothes.map(c => `<span class="tag-small" style="margin-right:6px;">${Utils.escape(c.name)}</span>`).join('') : '<span class="text-sm text-light">未勾选衣橱项</span>'}</div>
          ${analysis ? `<div class="mt-8"><div class="text-sm text-light mb-4">AI 配色（真实像素）：</div>${Utils.paletteHTML(analysis)}<span class="text-sm text-light">亮度 ${analysis.brightness} · 对比度 ${analysis.contrast}</span></div>` : ''}
          ${o.note ? `<div class="text-sm text-light mt-8">${Utils.escape(o.note)}</div>` : ''}
        </div>`;
      }).join('') || '<div class="empty-state"><div class="empty-icon">📷</div>暂无穿搭记录</div>'}
    `;
  },

  addOutfit() {
    this._outfitImages = [];
    this._outfitAnalysis = null;
    this._outfitClothes = [];
    this._pickerSearch = '';
    App.openModal(`
      <div class="modal-title">➕ 穿搭打卡</div>
      <div class="form-group"><label class="form-label">📷 上传今日穿搭照片</label>
        <div class="img-upload-area" onclick="WardrobeMod.uploadOutfit()">拍照 / 上传照片</div>
        <div id="outfit-imgs"></div>
      </div>
      <div id="outfit-ai-area"></div>
      <div class="form-group"><label class="form-label">选择今日穿着（按大类/小类，支持模糊搜索）</label><div id="outfit-wardrobe"></div></div>
      <div class="form-group"><label class="form-label">备注</label><textarea id="outfit-note" rows="2" placeholder="如：通勤、约会、运动"></textarea></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="WardrobeMod.saveOutfit()">保存打卡</button></div>
    `);
    this.renderOutfitPicker();
  },

  uploadOutfit() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      const f = input.files[0];
      if (!f) return;
      Utils.readFileAsDataURL(f, (url) => {
        this._outfitImages.push(url);
        document.getElementById('outfit-imgs').innerHTML = App.renderImageGrid(this._outfitImages, 'outfit');
        this.runOutfitAI();
      });
    };
    input.click();
  },

  /* 当前季节（用于穿搭匹配加权） */
  curSeason() {
    const m = new Date().getMonth() + 1;
    if (m >= 3 && m <= 5) return '春';
    if (m >= 6 && m <= 8) return '夏';
    if (m >= 9 && m <= 11) return '秋';
    return '冬';
  },

  /* 根据照片配色（上/下分区）+ 季节，推测衣橱中今天可能穿的衣物
   * 上半身颜色 → 上衣/外套/配饰；下半身颜色 → 裤装/裙装；其余 → 整体配色 */
  matchClothesByPhoto(analysis) {
    const clothes = Store.filter('clothes', c => !c.archived && !c.isSecondhand);
    if (!clothes.length || !analysis || !analysis.dominant || !analysis.dominant.length) return { tops: [], bottoms: [], others: [] };
    const season = this.curSeason();
    const upperDom = (analysis.regions && analysis.regions.top && analysis.regions.top.dominant.length) ? analysis.regions.top.dominant : analysis.dominant;
    const lowerDom = (analysis.regions && analysis.regions.bottom && analysis.regions.bottom.dominant.length) ? analysis.regions.bottom.dominant : analysis.dominant;
    const upperCats = ['上衣', '外套', '配饰'];
    const lowerCats = ['裤装', '裙装'];
    const scoreFor = (cl, dom) => {
      const rgb = this.COLOR_RGB[cl.color];
      if (!rgb) return { score: 0, ratio: 0 };
      let best = 0, ratio = 0;
      dom.forEach(d => {
        const dist = Math.sqrt((rgb[0] - d.r) ** 2 + (rgb[1] - d.g) ** 2 + (rgb[2] - d.b) ** 2);
        const sim = Math.max(0, 1 - dist / 190);
        const s = sim * (0.4 + d.ratio);
        if (s > best) { best = s; ratio = d.ratio; }
      });
      let score = best * 100;
      if (cl.season === season || cl.season === '四季') score += 12; else score -= 10;
      if (cl.annualCount > 0) score += Math.min(8, cl.annualCount);
      return { score: Math.max(0, Math.round(score)), ratio };
    };
    const evalGroup = (list, dom) => list.map(cl => {
      const r = scoreFor(cl, dom);
      return { cl, score: r.score, ratio: r.ratio };
    }).filter(x => x.score >= 32).sort((a, b) => b.score - a.score).slice(0, 6);
    return {
      tops: evalGroup(clothes.filter(c => upperCats.includes(c.category)), upperDom),
      bottoms: evalGroup(clothes.filter(c => lowerCats.includes(c.category)), lowerDom),
      others: evalGroup(clothes.filter(c => !upperCats.includes(c.category) && !lowerCats.includes(c.category)), analysis.dominant),
    };
  },

  async runOutfitAI() {
    if (!this._outfitImages.length) return;
    const area = document.getElementById('outfit-ai-area');
    if (!area) return;
    area.innerHTML = '<div class="ocr-loading"><div class="ocr-spinner"></div>AI 识别今日穿搭…</div>';
    try {
      const a = await Utils.analyzeImage(this._outfitImages[this._outfitImages.length - 1], { clothing: true });
      this._outfitAnalysis = a;
      const groups = this.matchClothesByPhoto(a);
      const mainName = this.nearestColorName(a.topColor);
      const styleTip = a.brightness > 68 ? '整体明亮清爽，适合日常通勤/出街'
        : a.brightness < 38 ? '整体偏暗沉稳，适合正式场合'
        : '明暗均衡，百搭日常';
      const contrastTip = a.contrast > 32 ? '配色对比强烈，视觉层次分明' : '配色柔和统一，整体协调';
      const guessChips = (list) => list.length ? list.map(g => `<span class="picker-chip" id="guess-${g.cl.id}" onclick="WardrobeMod.pickGuess(${g.cl.id})">
              ${g.cl.image ? `<img src="${g.cl.image}">` : ''}${Utils.escape(g.cl.name)}
              <span style="opacity:.6;font-size:11px;">${g.score}%</span>
            </span>`).join('') : '<span class="text-sm text-light">未识别到匹配单品</span>';
      const hasAny = groups.tops.length || groups.bottoms.length || groups.others.length;
      area.innerHTML = `<div class="ai-report"><div class="ai-report-title">🎨 AI 穿搭识别（基于实际照片像素 + 区域配色）</div><div class="ai-report-body">
        <div>主色调：<span class="color-swatch" style="background:${Utils.hexOf(a.topColor)};vertical-align:middle;"></span> ${mainName}（${Utils.hexOf(a.topColor)}）</div>
        <div class="mt-8">配色构成：</div>${Utils.paletteHTML(a)}
        <div class="mt-8 text-sm">整体亮度 ${a.brightness}/100 · 对比度 ${a.contrast}/100</div>
        <div class="text-sm">${styleTip}；${contrastTip}。</div>
        <div class="divider" style="margin:8px 0;"></div>
        <div class="text-bold text-sm mb-8">👕 识别到的上衣 / 外套（按照片上半身配色）：</div>
        <div class="picker-items">${guessChips(groups.tops)}</div>
        <div class="text-bold text-sm mb-8 mt-12">👖 识别到的下装（按照片下半身配色）：</div>
        <div class="picker-items">${guessChips(groups.bottoms)}</div>
        ${groups.others.length ? `<div class="text-bold text-sm mb-8 mt-12">👜 其他（鞋 / 包 / 配饰）：</div><div class="picker-items">${guessChips(groups.others)}</div>` : ''}
        <div class="text-sm text-light mt-8">识别依据：照片上半身/下半身主色与衣橱单品登记颜色的接近度 + 当季适配度。识别为辅助参考，请核对后点击单品即可勾选记录穿着。</div>
      </div></div>`;
    } catch (e) {
      area.innerHTML = '<div class="ocr-result">配色分析失败，可继续手动勾选保存。</div>';
    }
  },

  pickGuess(id) {
    if (!this._outfitClothes.includes(id)) this._outfitClothes.push(id);
    const chip = document.getElementById('guess-' + id);
    if (chip) chip.classList.add('active');
    this.renderOutfitPicker();
    App.showToast('已加入今日穿着', 'success');
  },

  /* ===== 今日穿着选择器：大类 → 小类 + 模糊搜索 ===== */
  renderOutfitPicker() {
    const el = document.getElementById('outfit-wardrobe');
    if (!el) return;
    const all = Store.filter('clothes', c => !c.archived && !c.isSecondhand);
    const kw = (this._pickerSearch || '').trim();
    const selected = this._outfitClothes || [];

    let list = all;
    if (kw) {
      list = all.filter(c => Utils.fuzzyHit(kw, [c.name, c.category, c.subCategory, c.color, c.season].join(' ')));
    }

    // 按大类 → 小类分组
    const groups = {};
    list.forEach(c => {
      const cat = c.category || '其他';
      const sub = c.subCategory || '未分类';
      groups[cat] = groups[cat] || {};
      groups[cat][sub] = groups[cat][sub] || [];
      groups[cat][sub].push(c);
    });
    const catOrder = Object.keys(this.CAT_MAP).filter(c => groups[c]).concat(Object.keys(groups).filter(c => !this.CAT_MAP[c]));

    const selNames = selected.map(id => { const c = all.find(x => x.id === id); return c ? c.name : ''; }).filter(Boolean);

    el.innerHTML = `
      <div class="picker-search">
        <input type="text" id="picker-kw" placeholder="🔍 模糊搜索：名称/颜色/类别/季节" value="${Utils.escape(kw)}"
          oninput="WardrobeMod._pickerSearch=this.value;WardrobeMod.renderOutfitPicker();WardrobeMod._focusPicker();">
      </div>
      <div class="picker-selected">已选 ${selected.length} 件${selNames.length ? '：' + Utils.escape(selNames.join('、')) : ''}
        ${selected.length ? ` <span style="color:#C08B7D;cursor:pointer;" onclick="WardrobeMod.clearOutfitPick()">清空</span>` : ''}
      </div>
      ${all.length === 0 ? '<div class="picker-empty">衣橱暂无衣物，可先去「我的衣橱」添加</div>'
        : catOrder.length === 0 ? '<div class="picker-empty">没有匹配的衣物，换个关键词试试</div>'
        : catOrder.map(cat => {
          const subs = groups[cat];
          const total = Object.values(subs).reduce((s, arr) => s + arr.length, 0);
          const collapsed = !kw && this._collapsed[cat];
          return `
            <div class="picker-group">
              <div class="picker-group-head" onclick="WardrobeMod.toggleGroup('${cat}')">
                <span>${cat} <span style="opacity:.6;font-weight:400;">(${total})</span></span>
                <span>${collapsed ? '▸' : '▾'}</span>
              </div>
              ${collapsed ? '' : Object.keys(subs).map(sub => `
                <div class="picker-sub">
                  <div class="picker-sub-title">${Utils.escape(sub)}</div>
                  <div class="picker-items">
                    ${subs[sub].map(c => `
                      <span class="picker-chip${selected.includes(c.id) ? ' active' : ''}" onclick="WardrobeMod.toggleOutfitCloth(${c.id})">
                        ${c.image ? `<img src="${c.image}">` : ''}${Utils.escape(c.name)}
                        <span style="opacity:.55;font-size:11px;">${Utils.escape(c.color || '')}</span>
                      </span>`).join('')}
                  </div>
                </div>`).join('')}
            </div>`;
        }).join('')}
    `;
  },

  _focusPicker() {
    const i = document.getElementById('picker-kw');
    if (i) { i.focus(); const v = i.value; i.value = ''; i.value = v; }
  },

  toggleGroup(cat) {
    this._collapsed[cat] = !this._collapsed[cat];
    this.renderOutfitPicker();
  },

  clearOutfitPick() {
    this._outfitClothes = [];
    this.renderOutfitPicker();
  },

  toggleOutfitCloth(id) {
    this._outfitClothes = this._outfitClothes || [];
    if (this._outfitClothes.includes(id)) this._outfitClothes = this._outfitClothes.filter(x => x !== id);
    else this._outfitClothes.push(id);
    this.renderOutfitPicker();
  },

  saveOutfit() {
    const today = Utils.today();
    const note = (document.getElementById('outfit-note')?.value || '').trim();
    const images = this._outfitImages || [];
    const matched = this._outfitClothes || [];
    const analysis = this._outfitAnalysis ? JSON.stringify(this._outfitAnalysis) : null;
    const existing = Store.find('outfits', o => o.date === today);
    if (existing) {
      const prevMatched = existing.matchedClothes || [];
      Store.update('outfits', existing.id, {
        images: [...new Set([...(existing.images || []), ...images])],
        matchedClothes: [...new Set([...prevMatched, ...matched])],
        note: note || existing.note,
        analysis: analysis || existing.analysis
      });
      matched.forEach(id => { if (!prevMatched.includes(id)) { const cl = Store.find('clothes', c => c.id === id); if (cl) Store.update('clothes', id, { annualCount: cl.annualCount + 1, totalCount: cl.totalCount + 1 }); } });
    } else {
      Store.add('outfits', { date: today, images, matchedClothes: matched, note, analysis });
      matched.forEach(id => { const cl = Store.find('clothes', c => c.id === id); if (cl) Store.update('clothes', id, { annualCount: cl.annualCount + 1, totalCount: cl.totalCount + 1 }); });
    }
    App.closeModal(); App.showToast('穿搭打卡成功', 'success'); App.render();
  },

  del(id) {
    App.confirm(I18n.t('confirmDelete'), () => { Store.remove('clothes', id); App.render(); });
  }
};
