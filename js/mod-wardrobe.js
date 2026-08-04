/* ===== 智能衣橱模块 ===== */
const WardrobeMod = {
  subTab: 'active',

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
          <div class="flex-1">
            <div class="flex-center gap-8">
              <span class="text-bold">${Utils.escape(cl.name)}</span>
              ${cl.annualCount < 1 ? '<span class="secondhand-badge">闲置</span>' : ''}
            </div>
            <div class="text-sm text-light mt-8">${Utils.escape(cl.category)} · ${Utils.escape(cl.color)} · ${Utils.escape(cl.season)} · ¥${cl.price}</div>
            <div class="text-sm text-light">年度使用 ${cl.annualCount}次 · 累计 ${cl.totalCount}次</div>
          </div>
          <div class="flex gap-8">
            <button class="btn btn-outline btn-sm" onclick="WardrobeMod.wear(${cl.id})">穿搭+1</button>
            <button class="btn btn-outline btn-sm" onclick="WardrobeMod.sellSecondhand(${cl.id})">二手处理</button>
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
    App.openModal(`
      <div class="modal-title">添加衣物</div>
      <div class="form-group"><label class="form-label">名称 <span class="req">*</span></label><input type="text" id="cl-name"></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">分类</label><select id="cl-category"><option>上衣</option><option>裤装</option><option>外套</option><option>裙装</option><option>鞋</option><option>配饰</option></select></div>
        <div class="form-group"><label class="form-label">颜色</label><input type="text" id="cl-color"></div>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">季节</label><select id="cl-season"><option>春</option><option>夏</option><option>秋</option><option>冬</option><option>四季</option></select></div>
        <div class="form-group"><label class="form-label">购入价格</label><input type="number" id="cl-price" value="0"></div>
      </div>
      <div class="form-group"><label class="form-label">购买日期</label><input type="date" id="cl-date" value="${Utils.today()}"></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="WardrobeMod.save()">${I18n.t('save')}</button></div>
    `);
  },

  save() {
    const name = document.getElementById('cl-name').value.trim();
    if (!name) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    Store.add('clothes', {
      name, category: document.getElementById('cl-category').value,
      color: document.getElementById('cl-color').value,
      season: document.getElementById('cl-season').value,
      price: +document.getElementById('cl-price').value,
      image: '', purchaseDate: document.getElementById('cl-date').value,
      annualCount: 0, totalCount: 0,
      isSecondhand: false, secondhandPrice: 0, secondhandDate: '', archived: false
    });
    App.closeModal(); App.showToast(I18n.t('added'), 'success'); App.render();
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
        <div class="form-group"><label class="form-label">分类</label><select id="cl-category"><option>上衣</option><option>裤装</option><option>外套</option><option>裙装</option><option>鞋</option><option>配饰</option><option>其他</option></select></div>
        <div class="form-group"><label class="form-label">颜色</label><input type="text" id="cl-color" value=""></div>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">价格</label><input type="number" id="cl-price" value="${r.totalPrice || ''}"></div>
        <div class="form-group"><label class="form-label">季节</label><select id="cl-season"><option>春</option><option>夏</option><option>秋</option><option>冬</option><option>四季</option></select></div>
      </div>
      <div class="form-group"><label class="form-label">购买日期</label><input type="date" id="cl-date" value="${r.buyDate || Utils.today()}"></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="WardrobeMod.save()">确认保存</button></div>
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
      <div class="card"><div class="text-sm text-light">拍照打卡，AI 分析真实配色；勾选衣橱衣物自动累计穿着次数。</div></div>
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
    App.openModal(`
      <div class="modal-title">➕ 穿搭打卡</div>
      <div class="form-group"><label class="form-label">📷 上传今日穿搭照片</label>
        <div class="img-upload-area" onclick="WardrobeMod.uploadOutfit()">拍照 / 上传照片</div>
        <div id="outfit-imgs"></div>
      </div>
      <div id="outfit-ai-area"></div>
      <div class="form-group"><label class="form-label">选择今日穿着（从衣橱勾选，自动累计次数）</label><div id="outfit-wardrobe"></div></div>
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

  async runOutfitAI() {
    if (!this._outfitImages.length) return;
    const area = document.getElementById('outfit-ai-area');
    if (!area) return;
    area.innerHTML = '<div class="ocr-loading"><div class="ocr-spinner"></div>AI 分析今日穿搭配色...</div>';
    try {
      const a = await Utils.analyzeImage(this._outfitImages[this._outfitImages.length - 1], { clothing: true });
      this._outfitAnalysis = a;
      area.innerHTML = `<div class="ai-report"><div class="ai-report-title">🎨 AI 配色分析（基于实际照片像素）</div><div class="ai-report-body">
        <div>主色调：<span class="color-swatch" style="background:${Utils.hexOf(a.topColor)};vertical-align:middle;"></span> ${Utils.hexOf(a.topColor)}</div>
        <div class="mt-8">整体亮度：${a.brightness}/100 · 对比度：${a.contrast}/100</div>
        <div class="mt-8">配色构成：</div>${Utils.paletteHTML(a)}
        <div class="text-sm text-light mt-8">以上为照片真实像素分析；衣物项请手动勾选以记录穿着。</div>
      </div></div>`;
    } catch (e) {
      area.innerHTML = '<div class="ocr-result">配色分析失败，可继续手动勾选保存。</div>';
    }
  },

  renderOutfitPicker() {
    const el = document.getElementById('outfit-wardrobe');
    if (!el) return;
    const clothes = Store.filter('clothes', c => !c.archived && !c.isSecondhand);
    el.innerHTML = clothes.length
      ? clothes.map(c => `<label class="check-pill"><input type="checkbox" value="${c.id}" onchange="WardrobeMod.toggleOutfitCloth(this,${c.id})"> ${Utils.escape(c.name)}</label>`).join('')
      : '<div class="text-sm text-light">衣橱暂无衣物，可先去「我的衣橱」添加</div>';
  },

  toggleOutfitCloth(box, id) {
    if (box.checked) { if (!this._outfitClothes.includes(id)) this._outfitClothes.push(id); }
    else { this._outfitClothes = this._outfitClothes.filter(x => x !== id); }
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
