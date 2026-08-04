/* ===== 生活物资模块（消耗品1/消耗品2/耐用品+归档+二手） ===== */
const GoodsMod = {
  subTab: 'c1',

  render(c) {
    c.innerHTML = `
      <div class="section-title">📦 ${I18n.t('goods')}</div>
      <div class="sub-tabs">
        <div class="sub-tab ${this.subTab === 'c1' ? 'active' : ''}" onclick="GoodsMod.setSub('c1')">${I18n.t('consumable1')}</div>
        <div class="sub-tab ${this.subTab === 'c2' ? 'active' : ''}" onclick="GoodsMod.setSub('c2')">${I18n.t('consumable2')}</div>
        <div class="sub-tab ${this.subTab === 'durable' ? 'active' : ''}" onclick="GoodsMod.setSub('durable')">${I18n.t('durable')}</div>
        <div class="sub-tab ${this.subTab === 'plants' ? 'active' : ''}" onclick="GoodsMod.setSub('plants')">🪴 花草</div>
        <div class="sub-tab ${this.subTab === 'analysis' ? 'active' : ''}" onclick="GoodsMod.setSub('analysis')">消耗分析</div>
        <div class="sub-tab ${this.subTab === 'archive' ? 'active' : ''}" onclick="GoodsMod.setSub('archive')">归档/二手</div>
      </div>
      <div id="goods-sub"></div>
    `;
    if (this.subTab === 'c1') this.renderC1();
    else if (this.subTab === 'c2') this.renderC2();
    else if (this.subTab === 'durable') this.renderDurable();
    else if (this.subTab === 'plants') this.renderPlants();
    else if (this.subTab === 'analysis') this.renderAnalysis();
    else this.renderArchive();
  },

  setSub(tab) { this.subTab = tab; App.render(); },

  /* ===== 消耗品1（无日均消耗） ===== */
  renderC1() {
    const items = Store.filter('goods_c1', g => !g.archived);
    document.getElementById('goods-sub').innerHTML = `
      <div class="flex-between mb-12">
        <div class="subsection-title" style="margin:0;">${I18n.t('consumable1')}（纸巾、一次性快消品）</div>
        <div class="flex gap-8">
          <button class="btn btn-outline btn-sm" onclick="GoodsMod.ocrAdd('c1')">📷 AI识别</button>
          <button class="btn btn-primary btn-sm" onclick="GoodsMod.add('c1')">+ 添加</button>
        </div>
      </div>
      <div class="text-sm text-light mb-12">每次更新库存生成独立变动日志，关闭日均消耗计算。</div>
      ${items.map(g => {
        const daysLeft = g.expireDate ? Utils.daysBetween(Utils.today(), g.expireDate) : 999;
        const stockPct = g.stock > 0 ? Math.min(100, g.stock * 10) : 0;
        return `
        <div class="card ${daysLeft <= 7 ? 'idle' : ''}">
          <div class="flex-between">
            <div class="flex-1">
              <div class="flex-center gap-8"><span class="text-bold">${Utils.escape(g.name)}</span>${daysLeft <= 7 ? '<span class="list-badge warn">临近用尽</span>' : ''}</div>
              <div class="text-sm text-light mt-8">${Utils.escape(g.classify)} · 购入¥${g.totalPrice} · ${g.buyDate} ~ ${g.expireDate || '无限期'}</div>
              <div class="text-sm text-light">当前库存：${g.stock}</div>
            </div>
            <div class="flex gap-8">
              <button class="btn btn-outline btn-sm" onclick="GoodsMod.updateStock('c1', ${g.id})">更新库存</button>
              <button class="btn btn-outline btn-sm" onclick="GoodsMod.archive('c1', ${g.id})">归档</button>
              <button class="btn btn-cancel btn-sm" onclick="GoodsMod.del('c1', ${g.id})">✕</button>
            </div>
          </div>
          <div class="mt-8"><div class="progress-bar"><div class="progress-fill ${stockPct < 30 ? 'danger' : stockPct < 60 ? 'warn' : ''}" style="width:${stockPct}%"></div></div></div>
          ${g.remark ? `<div class="text-sm text-light mt-8">📝 ${Utils.escape(g.remark)}</div>` : ''}
        </div>`;
      }).join('') || '<div class="empty-state"><div class="empty-icon">📦</div>暂无消耗品</div>'}
      <button class="btn btn-outline btn-block mt-12" onclick="GoodsMod.viewLog('c1')">📜 变动记录</button>
    `;
  },

  /* ===== 消耗品2（有日均消耗） ===== */
  renderC2() {
    const items = Store.filter('goods_c2', g => !g.archived);
    const totalDayCost = items.reduce((s, g) => s + (g.dayCost || 0), 0);
    document.getElementById('goods-sub').innerHTML = `
      <div class="flex-between mb-12">
        <div class="subsection-title" style="margin:0;">${I18n.t('consumable2')}（护肤品、洗护用品）</div>
        <div class="flex gap-8">
          <button class="btn btn-outline btn-sm" onclick="GoodsMod.ocrAdd('c2')">📷 AI识别</button>
          <button class="btn btn-primary btn-sm" onclick="GoodsMod.add('c2')">+ 添加</button>
        </div>
      </div>
      <div class="card card-accent">
        <div class="flex-between" style="color:#fff;">
          <span>全部日均消耗</span><span class="text-bold" style="font-size:22px;">¥${totalDayCost.toFixed(2)}/天</span>
        </div>
      </div>
      ${items.map(g => {
        const daysLeft = g.expireDate ? Utils.daysBetween(Utils.today(), g.expireDate) : 999;
        return `
        <div class="card ${daysLeft <= 7 ? 'idle' : ''}">
          <div class="flex-between">
            <div class="flex-1">
              <div class="flex-center gap-8"><span class="text-bold">${Utils.escape(g.name)}</span>${daysLeft <= 7 ? '<span class="list-badge warn">临近用尽</span>' : ''}</div>
              <div class="text-sm text-light mt-8">${Utils.escape(g.classify)} · 购入¥${g.totalPrice} · ${g.buyDate} ~ ${g.expireDate || '无限期'}</div>
              <div class="text-sm text-light">库存：${g.stock} · 日均消耗：<span class="text-accent text-bold">¥${(g.dayCost || 0).toFixed(2)}/天</span></div>
            </div>
            <div class="flex gap-8">
              <button class="btn btn-outline btn-sm" onclick="GoodsMod.updateStock('c2', ${g.id})">更新库存</button>
              <button class="btn btn-outline btn-sm" onclick="GoodsMod.archive('c2', ${g.id})">归档</button>
              <button class="btn btn-cancel btn-sm" onclick="GoodsMod.del('c2', ${g.id})">✕</button>
            </div>
          </div>
          ${g.remark ? `<div class="text-sm text-light mt-8">📝 ${Utils.escape(g.remark)}</div>` : ''}
        </div>`;
      }).join('') || '<div class="empty-state"><div class="empty-icon">🧴</div>暂无洗护用品</div>'}
      <button class="btn btn-outline btn-block mt-12" onclick="GoodsMod.viewLog('c2')">📜 变动记录</button>
    `;
  },

  /* ===== 功能性耐用品（主项+次项） ===== */
  renderDurable() {
    const mains = Store.filter('goods_durable_main', d => !d.archived);
    const idleMains = mains.filter(d => d.cumUses < 1);
    document.getElementById('goods-sub').innerHTML = `
      <div class="flex-between mb-12">
        <div class="subsection-title" style="margin:0;">${I18n.t('durable')}（主项+次项层级）</div>
        <button class="btn btn-primary btn-sm" onclick="GoodsMod.addDurableMain()">+ 添加主项</button>
      </div>
      ${idleMains.length > 0 ? `<div class="alert-box warn"><h4>🔴 闲置清单</h4>自然年内使用次数＜1次：${idleMains.length}件</div>` : ''}
      ${mains.map(m => {
        const subs = Store.filter('goods_durable_sub', s => s.mainId === m.id && !s.archived);
        const remainingValue = m.totalPrice - m.cumUses * m.unitDepreciation;
        return `
        <div class="card ${m.cumUses < 1 ? 'idle' : ''}">
          <div class="flex-between">
            <div class="flex-1">
              <div class="flex-center gap-8"><span class="text-bold" style="font-size:16px;">🔧 ${Utils.escape(m.name)}</span><span class="tag-small">主项</span>${m.cumUses < 1 ? '<span class="secondhand-badge">闲置</span>' : ''}</div>
              <div class="text-sm text-light mt-8">购入¥${m.totalPrice} · ${m.buyDate}</div>
              <div class="text-sm text-light">累计${m.cumUses}/${m.estTotalUses}次 · 单次折旧¥${m.unitDepreciation.toFixed(2)} · 剩余残值¥${remainingValue.toFixed(2)}</div>
            </div>
            <div class="flex gap-8">
              <button class="btn btn-outline btn-sm" onclick="GoodsMod.useDurable(${m.id})">使用+1</button>
              <button class="btn btn-outline btn-sm" onclick="GoodsMod.addDurableSub(${m.id})">+配件</button>
              <button class="btn btn-cancel btn-sm" onclick="GoodsMod.delDurableMain(${m.id})">✕</button>
            </div>
          </div>
          <div class="mt-8"><div class="progress-bar"><div class="progress-fill" style="width:${m.cumUses / m.estTotalUses * 100}%"></div></div></div>
          ${subs.length > 0 ? `<div class="divider"></div><div class="text-sm text-bold mb-8">配套次项：</div>` : ''}
          ${subs.map(s => {
            const subRem = s.totalPrice - s.cumUses * s.unitDepreciation;
            return `
            <div class="list-item ${s.cumUses < 1 ? 'idle' : ''}">
              <div class="list-icon">⚙️</div>
              <div class="list-body">
                <div class="list-title">${Utils.escape(s.name)} <span class="tag-small">次项</span></div>
                <div class="list-meta">¥${s.totalPrice} · ${s.cumUses}/${s.estTotalUses}次 · 折旧¥${s.unitDepreciation.toFixed(2)}/次 · 残值¥${subRem.toFixed(2)}</div>
              </div>
              <span class="list-action" onclick="GoodsMod.delDurableSub(${s.id})">✕</span>
            </div>`;
          }).join('')}
        </div>`;
      }).join('') || '<div class="empty-state"><div class="empty-icon">🔧</div>暂无耐用品</div>'}
    `;
  },

  addDurableMain() {
    App.openModal(`
      <div class="modal-title">添加耐用品（主项）</div>
      <div class="form-group"><label class="form-label">物品名称 <span class="req">*</span></label><input type="text" id="dm-name" placeholder="如：笔记本电脑"></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">采购日期</label><input type="date" id="dm-date" value="${Utils.today()}"></div>
        <div class="form-group"><label class="form-label">总价</label><input type="number" id="dm-price" value="0"></div>
      </div>
      <div class="form-group"><label class="form-label">预估总使用次数</label><input type="number" id="dm-est" value="100"></div>
      <div class="text-sm text-light">单次折旧 = 总价 ÷ 预估总使用次数</div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="GoodsMod.saveDurableMain()">${I18n.t('save')}</button></div>
    `);
  },

  saveDurableMain() {
    const name = document.getElementById('dm-name').value.trim();
    if (!name) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    const price = +document.getElementById('dm-price').value;
    const est = +document.getElementById('dm-est').value || 1;
    Store.add('goods_durable_main', {
      name, buyDate: document.getElementById('dm-date').value,
      totalPrice: price, estTotalUses: est, cumUses: 0,
      unitDepreciation: price / est,
      secondhandPrice: 0, secondhandDate: '', archived: false
    });
    App.closeModal(); App.showToast(I18n.t('added'), 'success'); App.render();
  },

  addDurableSub(mainId) {
    App.openModal(`
      <div class="modal-title">添加配套次项</div>
      <div class="form-group"><label class="form-label">配件名称 <span class="req">*</span></label><input type="text" id="ds-name" placeholder="如：无线鼠标"></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">采购日期</label><input type="date" id="ds-date" value="${Utils.today()}"></div>
        <div class="form-group"><label class="form-label">总价</label><input type="number" id="ds-price" value="0"></div>
      </div>
      <div class="form-group"><label class="form-label">预估总使用次数</label><input type="number" id="ds-est" value="100"></div>
      <div class="text-sm text-light">登记主项使用次数时，次项同步累加。</div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="GoodsMod.saveDurableSub(${mainId})">${I18n.t('save')}</button></div>
    `);
  },

  saveDurableSub(mainId) {
    const name = document.getElementById('ds-name').value.trim();
    if (!name) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    const price = +document.getElementById('ds-price').value;
    const est = +document.getElementById('ds-est').value || 1;
    Store.add('goods_durable_sub', {
      mainId, name, buyDate: document.getElementById('ds-date').value,
      totalPrice: price, estTotalUses: est, cumUses: 0,
      unitDepreciation: price / est,
      secondhandPrice: 0, secondhandDate: '', archived: false
    });
    App.closeModal(); App.showToast(I18n.t('added'), 'success'); App.render();
  },

  useDurable(mainId) {
    const main = Store.find('goods_durable_main', d => d.id === mainId);
    Store.update('goods_durable_main', mainId, { cumUses: main.cumUses + 1 });
    Store.filter('goods_durable_sub', s => s.mainId === mainId && !s.archived).forEach(sub => {
      Store.update('goods_durable_sub', sub.id, { cumUses: sub.cumUses + 1 });
    });
    Store.logChange('goods', '耐用品使用', mainId, main.name + ' 使用+1（配套次项同步）');
    App.showToast('使用+1', 'success'); App.render();
  },

  delDurableMain(id) {
    const subs = Store.filter('goods_durable_sub', s => s.mainId === id);
    App.openModal(`
      <div class="modal-title">删除主项</div>
      <div class="confirm-msg">删除主项「${Utils.escape(Store.find('goods_durable_main', d => d.id === id).name)}」时，是否同步归档 ${subs.length} 个配套次项？</div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="App.closeModal()">取消</button>
        <button class="btn-danger" onclick="GoodsMod.confirmDelMain(${id}, false)">仅删主项</button>
        <button class="btn-danger" onclick="GoodsMod.confirmDelMain(${id}, true)">同步归档次项</button>
      </div>
    `);
  },

  confirmDelMain(id, archiveSubs) {
    if (archiveSubs) {
      Store.filter('goods_durable_sub', s => s.mainId === id).forEach(sub => {
        Store.update('goods_durable_sub', sub.id, { archived: true });
      });
    }
    Store.remove('goods_durable_main', id);
    App.closeModal(); App.showToast(I18n.t('deleted')); App.render();
  },

  delDurableSub(id) {
    App.confirm(I18n.t('confirmDelete'), () => { Store.remove('goods_durable_sub', id); App.render(); });
  },

  /* ===== 通用：添加消耗品 ===== */
  add(type) {
    const isC2 = type === 'c2';
    App.openModal(`
      <div class="modal-title">添加${isC2 ? '洗护用品' : '消耗品'}</div>
      <div class="form-group"><label class="form-label">物品名称 <span class="req">*</span></label><input type="text" id="g-name"></div>
      <div class="form-group"><label class="form-label">分类</label><input type="text" id="g-classify" placeholder="如：纸巾、护肤"></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">采购日期</label><input type="date" id="g-buy" value="${Utils.today()}"></div>
        <div class="form-group"><label class="form-label">预计用尽日期</label><input type="date" id="g-expire"></div>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">总价</label><input type="number" id="g-price" value="0"></div>
        <div class="form-group"><label class="form-label">库存</label><input type="number" id="g-stock" value="1"></div>
      </div>
      <div class="form-group"><label class="form-label">备注</label><input type="text" id="g-remark"></div>
      ${isC2 ? '<div class="text-sm text-light">日均消耗价值 = 总价 ÷ (用尽日期 - 采购日期)天数，每日自动重算</div>' : ''}
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="GoodsMod.save('${type}')">${I18n.t('save')}</button></div>
    `);
  },

  save(type) {
    const name = document.getElementById('g-name').value.trim();
    if (!name) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    const data = {
      name, classify: document.getElementById('g-classify').value,
      buyDate: document.getElementById('g-buy').value,
      expireDate: document.getElementById('g-expire').value,
      totalPrice: +document.getElementById('g-price').value,
      stock: +document.getElementById('g-stock').value,
      remark: document.getElementById('g-remark').value, image: '', archived: false,
    };
    if (type === 'c2') {
      const days = data.expireDate ? Utils.daysBetween(data.buyDate, data.expireDate) : 30;
      data.dayCost = days > 0 ? data.totalPrice / days : 0;
    }
    Store.add(type === 'c1' ? 'goods_c1' : 'goods_c2', data);
    Store.logChange('goods', '新增', 0, '新增物资: ' + name);
    App.closeModal(); App.showToast(I18n.t('added'), 'success'); App.render();
  },

  /* ===== OCR 识别添加 ===== */
  ocrAdd(type) {
    App.openModal(`
      <div class="modal-title">📷 AI识别添加物资</div>
      <div class="form-group"><label class="form-label">上传购物小票/商品外包装/订单截图</label><div class="img-upload-area" onclick="GoodsMod.startOCR('${type}')">上传图片（离线识别）</div></div>
      <div class="form-group"><label class="form-label">或粘贴小票/订单文字</label><textarea id="g-ocr-paste" rows="3" placeholder="粘贴购物小票、订单文字，自动解析名称/价格/日期"></textarea></div>
      <div class="modal-actions"><button class="btn btn-outline btn-sm" onclick="GoodsMod.parsePaste('${type}')">识别粘贴文字</button><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button></div>
      <div id="ocr-area"></div>
    `);
  },

  startOCR(type) {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      Utils.runOCR('ocr-area', file, (text) => {
        GoodsMod._fillOcr(text, type);
      }, { renderResult: false, pasteHandler: "document.getElementById('g-ocr-paste') && document.getElementById('g-ocr-paste').focus()" });
    };
    input.click();
  },

  parsePaste(type) {
    const text = document.getElementById('g-ocr-paste').value.trim();
    if (!text) { App.showToast('请先粘贴文字', 'error'); return; }
    this._fillOcr(text, type);
  },

  _fillOcr(text, type) {
    const r = Utils.parseReceiptText(text);
    document.getElementById('ocr-area').innerHTML = `
      <div class="ocr-result">识别原文：\n${Utils.escape(text).slice(0, 800)}</div>
      <div class="text-sm text-accent text-bold mt-12">✅ 已自动解析，可修改校正：</div>
      <div class="form-group mt-8"><label class="form-label">物品名称</label><input type="text" id="g-name" value="${Utils.escape(r.name || '')}"></div>
      <div class="form-group"><label class="form-label">分类</label><input type="text" id="g-classify" value=""></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">采购日期</label><input type="date" id="g-buy" value="${r.buyDate || Utils.today()}"></div>
        <div class="form-group"><label class="form-label">预计用尽日期</label><input type="date" id="g-expire" value=""></div>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">总价</label><input type="number" id="g-price" value="${r.totalPrice || ''}"></div>
        <div class="form-group"><label class="form-label">库存</label><input type="number" id="g-stock" value="1"></div>
      </div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="GoodsMod.save('${type}')">确认保存入库</button></div>
    `;
  },

  /* ===== 更新库存 ===== */
  updateStock(type, id) {
    const table = type === 'c1' ? 'goods_c1' : 'goods_c2';
    const item = Store.find(table, g => g.id === id);
    App.openModal(`
      <div class="modal-title">更新库存 — ${Utils.escape(item.name)}</div>
      <div class="text-sm text-light">当前库存：${item.stock}</div>
      <div class="form-group"><label class="form-label">新库存数量</label><input type="number" id="ustock" value="${item.stock}"></div>
      <div class="form-group"><label class="form-label">备注</label><input type="text" id="unote" placeholder="如：日常使用/补货"></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="GoodsMod.confirmStock('${type}', ${id})">${I18n.t('save')}</button></div>
    `);
  },

  confirmStock(type, id) {
    const table = type === 'c1' ? 'goods_c1' : 'goods_c2';
    const logTable = type === 'c1' ? 'goods_c1_logs' : 'goods_c2_logs';
    const item = Store.find(table, g => g.id === id);
    const newStock = +document.getElementById('ustock').value;
    const note = document.getElementById('unote').value;
    // 变动日志
    Store.add(logTable, { goodsId: id, oldStock: item.stock, newStock, date: Utils.today(), note });
    // 重算日均消耗（c2）
    let patch = { stock: newStock };
    if (type === 'c2' && item.expireDate) {
      const days = Utils.daysBetween(item.buyDate, item.expireDate);
      patch.dayCost = days > 0 ? item.totalPrice / days : 0;
    }
    Store.update(table, id, patch);
    Store.logChange('goods', '更新库存', id, item.name + ' 库存 ' + item.stock + '→' + newStock);
    App.closeModal(); App.showToast(I18n.t('updated'), 'success'); App.render();
  },

  /* ===== 归档 ===== */
  archive(type, id) {
    App.confirm('确认归档？归档后不参与首页统计，不删除历史数据。', () => {
      const table = type === 'c1' ? 'goods_c1' : 'goods_c2';
      Store.update(table, id, { archived: true });
      App.showToast('已归档'); App.render();
    });
  },

  del(type, id) {
    App.confirm(I18n.t('confirmDelete'), () => {
      Store.remove(type === 'c1' ? 'goods_c1' : 'goods_c2', id);
      App.render();
    });
  },

  /* ===== 变动记录 ===== */
  viewLog(type) {
    const logTable = type === 'c1' ? 'goods_c1_logs' : 'goods_c2_logs';
    const logs = Store.get(logTable).sort((a, b) => b.date.localeCompare(a.date));
    App.openModal(`
      <div class="modal-title">📜 ${I18n.t('changeLog')}</div>
      ${logs.map(l => {
        const g = Store.find(type === 'c1' ? 'goods_c1' : 'goods_c2', x => x.id === l.goodsId);
        return `<div class="list-item"><div class="list-icon">📋</div><div class="list-body"><div class="list-title">${g ? Utils.escape(g.name) : '已删除'} ${l.oldStock}→${l.newStock}</div><div class="list-meta">${l.date}${l.note ? ' · ' + Utils.escape(l.note) : ''}</div></div></div>`;
      }).join('') || '<div class="text-light text-sm">暂无变动记录</div>'}
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('close')}</button></div>
    `);
  },

  /* ===== 花花草草 ===== */
  plantFilter: 'all',

  renderPlants() {
    const all = Store.get('plants');
    let plants = all;
    if (this.plantFilter === 'alive') plants = all.filter(p => p.status === '养护中');
    else if (this.plantFilter === 'dead') plants = all.filter(p => p.status === '枯萎死亡');
    else if (this.plantFilter === 'idle') {
      const yearAgo = Utils.addDays(Utils.today(), -365);
      plants = all.filter(p => p.status === '养护中' && Store.filter('plant_care', c => c.plantId === p.id && c.careDate >= yearAgo).length === 0);
    }

    const alive = all.filter(p => p.status === '养护中');
    const dead = all.filter(p => p.status === '枯萎死亡');
    const deadCost = dead.reduce((s, p) => s + (p.buyPrice || 0), 0);
    const survivalRate = all.length > 0 ? Math.round(alive.length / all.length * 100) : 100;

    // 浇水提醒
    const waterAlerts = alive.filter(p => {
      if (!p.waterCycle || !p.lastWaterDate) return false;
      return Utils.daysBetween(p.lastWaterDate, Utils.today()) >= p.waterCycle;
    });

    document.getElementById('goods-sub').innerHTML = `
      <div class="dash-grid">
        <div class="dash-stat"><div class="dash-stat-num">${alive.length}</div><div class="dash-stat-label">养护中</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${dead.length}</div><div class="dash-stat-label">已枯萎</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${survivalRate}%</div><div class="dash-stat-label">存活率</div></div>
        <div class="dash-stat"><div class="dash-stat-num">¥${deadCost.toFixed(0)}</div><div class="dash-stat-label">枯萎损耗</div></div>
      </div>

      ${waterAlerts.length > 0 ? `<div class="alert-box warn"><b>💧 浇水提醒</b>：${waterAlerts.map(p => Utils.escape(p.name)).join('、')} 需要浇水了</div>` : ''}

      <div class="flex-between mb-12 mt-12">
        <div class="filter-bar" style="margin:0;">
          <div class="filter-tab ${this.plantFilter === 'all' ? 'active' : ''}" onclick="GoodsMod.setPlantFilter('all')">全部</div>
          <div class="filter-tab ${this.plantFilter === 'alive' ? 'active' : ''}" onclick="GoodsMod.setPlantFilter('alive')">养护中</div>
          <div class="filter-tab ${this.plantFilter === 'dead' ? 'active' : ''}" onclick="GoodsMod.setPlantFilter('dead')">已枯萎</div>
          <div class="filter-tab ${this.plantFilter === 'idle' ? 'active' : ''}" onclick="GoodsMod.setPlantFilter('idle')">闲置</div>
        </div>
        <div class="flex gap-8">
          <button class="btn btn-outline btn-sm" onclick="GoodsMod.batchCare()">💧 批量养护</button>
          <button class="btn btn-primary btn-sm" onclick="GoodsMod.addPlant()">+ 添加</button>
        </div>
      </div>

      ${plants.map(p => {
        const cares = Store.filter('plant_care', c => c.plantId === p.id).sort((a, b) => b.careDate.localeCompare(a.careDate));
        const yearAgo = Utils.addDays(Utils.today(), -365);
        const isIdle = p.status === '养护中' && Store.filter('plant_care', c => c.plantId === p.id && c.careDate >= yearAgo).length === 0;
        const needWater = p.status === '养护中' && p.waterCycle && p.lastWaterDate && Utils.daysBetween(p.lastWaterDate, Utils.today()) >= p.waterCycle;
        const careCount = cares.length;
        return `
        <div class="card ${isIdle ? 'idle' : ''} ${p.status === '枯萎死亡' ? 'archived-card' : ''}">
          <div class="flex-between">
            <div class="flex-1">
              <div class="flex-center gap-8">
                <span class="text-bold" style="font-size:16px;">🪴 ${Utils.escape(p.name)}</span>
                <span class="tag-small">${p.status}</span>
                ${isIdle ? '<span class="secondhand-badge">闲置</span>' : ''}
                ${needWater ? '<span class="list-badge warn">需浇水</span>' : ''}
              </div>
              <div class="text-sm text-light mt-8">${Utils.escape(p.variety || '')} · 购入¥${p.buyPrice} · ${p.buyDate}</div>
              ${p.status === '枯萎死亡' ? `<div class="text-sm" style="color:#c0392b;">枯萎日期：${p.deathDate}</div>` : ''}
              ${p.status === '养护中' ? `<div class="text-sm text-light">浇水周期${p.waterCycle}天 · 施肥周期${p.fertilizeCycle}天 · 养护${careCount}次</div>` : ''}
              ${p.remark ? `<div class="text-sm text-light">📝 ${Utils.escape(p.remark)}</div>` : ''}
            </div>
            <div class="flex gap-8">
              <button class="btn btn-outline btn-sm" onclick="GoodsMod.plantDetail(${p.id})">详情</button>
              ${p.status === '养护中' ? `<button class="btn btn-outline btn-sm" onclick="GoodsMod.singleCare(${p.id})">养护</button>` : ''}
              ${p.status === '养护中' ? `<button class="btn btn-cancel btn-sm" onclick="GoodsMod.markDead(${p.id})">标记枯萎</button>` : ''}
              <button class="btn btn-cancel btn-sm" onclick="GoodsMod.delPlant(${p.id})">✕</button>
            </div>
          </div>
        </div>`;
      }).join('') || '<div class="empty-state"><div class="empty-icon">🪴</div>暂无花草记录</div>'}
    `;
  },

  setPlantFilter(f) { this.plantFilter = f; App.render(); },

  addPlant() {
    App.openModal(`
      <div class="modal-title">🪴 添加花草</div>
      <div class="form-group"><label class="form-label">花草名称 <span class="req">*</span></label><input type="text" id="pl-name" placeholder="如：绿萝"></div>
      <div class="form-group"><label class="form-label">品种分类</label><input type="text" id="pl-variety" placeholder="如：天南星科"></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">购入日期</label><input type="date" id="pl-buy" value="${Utils.today()}"></div>
        <div class="form-group"><label class="form-label">购入价格</label><input type="number" id="pl-price" value="0"></div>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">浇水周期（天）</label><input type="number" id="pl-wcycle" value="7"></div>
        <div class="form-group"><label class="form-label">施肥周期（天）</label><input type="number" id="pl-fcycle" value="30"></div>
      </div>
      <div class="form-group"><label class="form-label">备注</label><input type="text" id="pl-remark" placeholder="如：放在客厅窗台"></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="GoodsMod.savePlant()">${I18n.t('save')}</button></div>
    `);
  },

  savePlant() {
    const name = document.getElementById('pl-name').value.trim();
    if (!name) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    Store.add('plants', {
      name, variety: document.getElementById('pl-variety').value,
      buyDate: document.getElementById('pl-buy').value,
      buyPrice: +document.getElementById('pl-price').value || 0,
      status: '养护中', deathDate: '',
      remark: document.getElementById('pl-remark').value, images: [],
      waterCycle: +document.getElementById('pl-wcycle').value || 7,
      fertilizeCycle: +document.getElementById('pl-fcycle').value || 30,
      lastWaterDate: '', lastFertilizeDate: ''
    });
    Store.logChange('goods', '新增花草', 0, '新增花草: ' + name);
    App.closeModal(); App.showToast(I18n.t('added'), 'success'); App.render();
  },

  delPlant(id) {
    App.confirm('确认删除？养护记录将一并删除。', () => {
      Store.remove('plants', id);
      Store.get('plant_care').filter(c => c.plantId === id).forEach(c => Store.remove('plant_care', c.id));
      App.render();
    });
  },

  markDead(id) {
    App.openModal(`
      <div class="modal-title">标记枯萎死亡</div>
      <div class="form-group"><label class="form-label">死亡/枯萎日期</label><input type="date" id="pd-date" value="${Utils.today()}"></div>
      <div class="form-group"><label class="form-label">原因备注</label><textarea id="pd-note" rows="3" placeholder="如：浇水过多烂根"></textarea></div>
      <div class="text-sm text-light">标记后将锁定基础购入信息，永久归档，不可随意修改。</div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-danger" onclick="GoodsMod.confirmDead(${id})">确认枯萎</button></div>
    `);
  },

  confirmDead(id) {
    const plant = Store.find('plants', p => p.id === id);
    Store.update('plants', id, {
      status: '枯萎死亡',
      deathDate: document.getElementById('pd-date').value,
      remark: (plant.remark || '') + ' [枯亡原因: ' + document.getElementById('pd-note').value + ']'
    });
    Store.logChange('goods', '花草枯萎', id, plant.name + ' 标记枯萎死亡');
    App.closeModal(); App.showToast('已标记枯萎'); App.render();
  },

  plantDetail(id) {
    const p = Store.find('plants', pl => pl.id === id);
    const cares = Store.filter('plant_care', c => c.plantId === id).sort((a, b) => b.careDate.localeCompare(a.careDate));
    App.openModal(`
      <div class="modal-title">🪴 ${Utils.escape(p.name)}</div>
      <div class="label-pair"><span class="lk">品种</span><span class="vk">${Utils.escape(p.variety)}</span></div>
      <div class="label-pair"><span class="lk">购入日期</span><span class="vk">${p.buyDate}</span></div>
      <div class="label-pair"><span class="lk">购入价格</span><span class="vk">¥${p.buyPrice}</span></div>
      <div class="label-pair"><span class="lk">状态</span><span class="vk">${p.status}</span></div>
      ${p.status === '枯萎死亡' ? `<div class="label-pair"><span class="lk">枯萎日期</span><span class="vk">${p.deathDate}</span></div>` : ''}
      <div class="label-pair"><span class="lk">浇水周期</span><span class="vk">${p.waterCycle}天（上次：${p.lastWaterDate || '未记录'}）</span></div>
      <div class="label-pair"><span class="lk">施肥周期</span><span class="vk">${p.fertilizeCycle}天（上次：${p.lastFertilizeDate || '未记录'}）</span></div>
      ${p.remark ? `<div class="label-pair"><span class="lk">备注</span><span class="vk">${Utils.escape(p.remark)}</span></div>` : ''}
      <div class="divider"></div>
      <div class="flex-between mb-8"><div class="subsection-title" style="margin:0;">养护记录 (${cares.length})</div>${p.status === '养护中' ? `<button class="btn btn-outline btn-sm" onclick="App.closeModal();GoodsMod.singleCare(${id})">+ 养护</button>` : ''}</div>
      ${cares.map(c => `
        <div class="list-item">
          <div class="list-icon">${c.careType === '浇水' ? '💧' : c.careType === '施肥' ? '🌱' : '✂️'}</div>
          <div class="list-body"><div class="list-title">${c.careType}${c.isBatch ? ' <span class="tag-small">批量</span>' : ''}</div><div class="list-meta">${c.careDate}${c.note ? ' · ' + Utils.escape(c.note) : ''}</div></div>
        </div>
      `).join('') || '<div class="text-light text-sm">暂无养护记录</div>'}
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('close')}</button></div>
    `);
  },

  singleCare(id) {
    App.closeModal();
    const p = Store.find('plants', pl => pl.id === id);
    App.openModal(`
      <div class="modal-title">单独养护 — ${Utils.escape(p.name)}</div>
      <div class="form-group"><label class="form-label">养护类型</label><select id="sc-type"><option>浇水</option><option>施肥</option><option>修剪</option></select></div>
      <div class="form-group"><label class="form-label">养护日期</label><input type="date" id="sc-date" value="${Utils.today()}"></div>
      <div class="form-group"><label class="form-label">备注</label><input type="text" id="sc-note" placeholder="选填"></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="GoodsMod.saveSingleCare(${id})">${I18n.t('save')}</button></div>
    `);
  },

  saveSingleCare(id) {
    const careType = document.getElementById('sc-type').value;
    const careDate = document.getElementById('sc-date').value;
    const note = document.getElementById('sc-note').value;
    Store.add('plant_care', { plantId: id, careType, careDate, note, isBatch: false });
    // 更新对应养护日期
    const patch = {};
    if (careType === '浇水') patch.lastWaterDate = careDate;
    if (careType === '施肥') patch.lastFertilizeDate = careDate;
    Store.update('plants', id, patch);
    const p = Store.find('plants', pl => pl.id === id);
    Store.logChange('goods', '单株养护', id, p.name + ' ' + careType);
    App.closeModal(); App.showToast('养护已记录', 'success'); App.render();
  },

  batchCare() {
    const alive = Store.filter('plants', p => p.status === '养护中');
    App.openModal(`
      <div class="modal-title">💧 批量统一养护</div>
      <div class="text-sm text-light mb-12">勾选植株，统一填写养护类型和日期，同步添加到所有选中花草的养护日志。</div>
      <div class="form-group"><label class="form-label">养护类型</label><select id="bc-type"><option>浇水</option><option>施肥</option><option>修剪</option></select></div>
      <div class="form-group"><label class="form-label">养护日期</label><input type="date" id="bc-date" value="${Utils.today()}"></div>
      <div class="form-group"><label class="form-label">养护备注</label><input type="text" id="bc-note" placeholder="选填，如：日常浇水"></div>
      <div class="divider"></div>
      <div class="flex-between mb-8">
        <span class="text-bold">选择植株</span>
        <div class="flex gap-8">
          <button class="btn btn-outline btn-sm" onclick="document.querySelectorAll('.bc-check').forEach(c=>c.checked=true)">全选</button>
          <button class="btn btn-outline btn-sm" onclick="document.querySelectorAll('.bc-check').forEach(c=>c.checked=false)">取消</button>
        </div>
      </div>
      ${alive.map(p => `
        <div class="list-item"><div class="list-icon"><input type="checkbox" class="bc-check" value="${p.id}" checked></div><div class="list-body"><div class="list-title">🪴 ${Utils.escape(p.name)}</div><div class="list-meta">${Utils.escape(p.variety)} · 上次浇水：${p.lastWaterDate || '无'}</div></div></div>
      `).join('') || '<div class="text-light">暂无养护中的花草</div>'}
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="GoodsMod.saveBatchCare()">批量养护</button></div>
    `);
  },

  saveBatchCare() {
    const careType = document.getElementById('bc-type').value;
    const careDate = document.getElementById('bc-date').value;
    const note = document.getElementById('bc-note').value;
    const checked = document.querySelectorAll('.bc-check:checked');
    if (checked.length === 0) { App.showToast('请至少选择一株花草', 'error'); return; }
    checked.forEach(cb => {
      const id = +cb.value;
      Store.add('plant_care', { plantId: id, careType, careDate, note, isBatch: true });
      const patch = {};
      if (careType === '浇水') patch.lastWaterDate = careDate;
      if (careType === '施肥') patch.lastFertilizeDate = careDate;
      Store.update('plants', id, patch);
    });
    Store.logChange('goods', '批量养护', 0, '批量' + careType + ' ' + checked.length + '株');
    App.closeModal(); App.showToast('批量养护完成（' + checked.length + '株）', 'success'); App.render();
  },

  /* ===== 消耗分析 ===== */
  renderAnalysis() {
    const c2Items = Store.filter('goods_c2', g => !g.archived);
    const totalDayCost = c2Items.reduce((s, g) => s + (g.dayCost || 0), 0);
    const classifyMap = {};
    c2Items.forEach(g => {
      if (!classifyMap[g.classify]) classifyMap[g.classify] = { total: 0, dayCost: 0, count: 0 };
      classifyMap[g.classify].total += g.totalPrice;
      classifyMap[g.classify].dayCost += g.dayCost || 0;
      classifyMap[g.classify].count++;
    });
    const pieData = Object.entries(classifyMap).map(([k, v]) => ({ label: k, value: v.total }));
    const barData = Object.entries(classifyMap).map(([k, v]) => ({ label: k, value: +v.dayCost.toFixed(2) }));

    // 花草统计
    const plants = Store.get('plants');
    const alivePlants = plants.filter(p => p.status === '养护中');
    const deadPlants = plants.filter(p => p.status === '枯萎死亡');
    const deadCost = deadPlants.reduce((s, p) => s + (p.buyPrice || 0), 0);
    const monthNew = plants.filter(p => p.buyDate.startsWith(Utils.today().slice(0, 7))).length;
    const survivalRate = plants.length > 0 ? Math.round(alivePlants.length / plants.length * 100) : 100;

    document.getElementById('goods-sub').innerHTML = `
      <div class="subsection-title">消耗分析</div>
      <div class="dash-grid">
        <div class="dash-stat"><div class="dash-stat-num">¥${totalDayCost.toFixed(2)}</div><div class="dash-stat-label">日均总消耗</div></div>
        <div class="dash-stat"><div class="dash-stat-num">¥${(totalDayCost * 7).toFixed(2)}</div><div class="dash-stat-label">本周预估</div></div>
        <div class="dash-stat"><div class="dash-stat-num">¥${(totalDayCost * 30).toFixed(2)}</div><div class="dash-stat-label">本月预估</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${c2Items.length}</div><div class="dash-stat-label">在管物资</div></div>
      </div>
      ${pieData.length > 0 ? `<div class="chart-box"><div class="chart-title">分类总价占比</div>${Charts.pie(pieData)}</div>` : ''}
      ${barData.length > 0 ? `<div class="chart-box"><div class="chart-title">分类日均消耗（元/天）</div>${Charts.bar(barData)}</div>` : ''}
      <div class="card">
        <div class="card-title">分类明细</div>
        ${Object.entries(classifyMap).map(([k, v]) => `
          <div class="label-pair"><span class="lk">${k} (${v.count}件)</span><span class="vk">总价¥${v.total.toFixed(2)} · 日均¥${v.dayCost.toFixed(2)}</span></div>
        `).join('') || '<div class="text-light text-sm">暂无数据</div>'}
      </div>
      <div class="divider"></div>
      <div class="subsection-title">🪴 花草专项统计</div>
      <div class="dash-grid">
        <div class="dash-stat"><div class="dash-stat-num">${monthNew}</div><div class="dash-stat-label">本月新增</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${alivePlants.length}</div><div class="dash-stat-label">存活数</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${survivalRate}%</div><div class="dash-stat-label">存活率</div></div>
        <div class="dash-stat"><div class="dash-stat-num">¥${deadCost.toFixed(0)}</div><div class="dash-stat-label">枯萎损耗</div></div>
      </div>
      <button class="btn btn-outline btn-block" onclick="GoodsMod.exportGoods()">📥 导出物资台账CSV</button>
    `;
  },

  exportGoods() {
    const c1 = Store.get('goods_c1'), c2 = Store.get('goods_c2'), plants = Store.get('plants');
    const rows = [['类型','名称','分类','采购日期','用尽日期','总价','库存','日均消耗','备注']];
    c1.forEach(g => rows.push(['消耗品1', g.name, g.classify, g.buyDate, g.expireDate, g.totalPrice, g.stock, '关闭', g.remark]));
    c2.forEach(g => rows.push(['消耗品2', g.name, g.classify, g.buyDate, g.expireDate, g.totalPrice, g.stock, (g.dayCost || 0).toFixed(2), g.remark]));
    plants.forEach(p => rows.push(['花草', p.name, p.variety, p.buyDate, p.deathDate || '养护中', p.buyPrice, p.status === '养护中' ? 1 : 0, '-', p.remark]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    Utils.downloadCSV('物资台账_' + Utils.today() + '.csv', csv);
    App.showToast('导出成功', 'success');
  },

  /* ===== 归档/二手专区 ===== */
  renderArchive() {
    const archivedC1 = Store.filter('goods_c1', g => g.archived);
    const archivedC2 = Store.filter('goods_c2', g => g.archived);
    const archivedMain = Store.filter('goods_durable_main', d => d.archived);
    const secondhandMain = Store.filter('goods_durable_main', d => d.secondhandPrice > 0);
    const deadPlants = Store.filter('plants', p => p.status === '枯萎死亡');
    document.getElementById('goods-sub').innerHTML = `
      <div class="subsection-title">${I18n.t('goodsArchive')} + ${I18n.t('secondhandZone')}</div>
      ${deadPlants.length > 0 ? `
        <div class="card"><div class="card-title">🪴 枯萎归档花草</div>
        ${deadPlants.map(p => `
          <div class="list-item archived"><div class="list-icon">🥀</div><div class="list-body"><div class="list-title">${Utils.escape(p.name)} <span class="tag-small">已锁定</span></div><div class="list-meta">${Utils.escape(p.variety)} · 购入¥${p.buyPrice} · 枯亡${p.deathDate}</div></div></div>
        `).join('')}
        </div>` : ''}
      ${[...archivedC1, ...archivedC2].length > 0 ? `
        <div class="card"><div class="card-title">归档消耗品</div>
        ${[...archivedC1.map(g => ({ ...g, type: '消耗品1' })), ...archivedC2.map(g => ({ ...g, type: '消耗品2' }))].map(g => `
          <div class="list-item archived"><div class="list-icon">📦</div><div class="list-body"><div class="list-title">${Utils.escape(g.name)}</div><div class="list-meta">${g.type} · ${Utils.escape(g.classify)} · ¥${g.totalPrice}</div></div></div>
        `).join('')}
        </div>` : ''}
      ${secondhandMain.length > 0 ? `
        <div class="card"><div class="card-title">二手处理专区（耐用品）</div>
        ${secondhandMain.map(d => `
          <div class="list-item archived"><div class="list-icon">🔄</div><div class="list-body"><div class="list-title">${Utils.escape(d.name)}</div><div class="list-meta">购入¥${d.totalPrice} → 处理¥${d.secondhandPrice} · ${d.secondhandDate}</div></div></div>
        `).join('')}
        </div>` : ''}
      ${archivedC1.length === 0 && archivedC2.length === 0 && secondhandMain.length === 0 && deadPlants.length === 0 ? '<div class="empty-state"><div class="empty-icon">📦</div>暂无归档/二手记录</div>' : ''}
    `;
  }
};
