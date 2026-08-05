/* ===== 储蓄板块（保密 · 快照式存档 · 月度进度监测） =====
 * 设计要点：
 * 1. 完全保密，进入需输入「私密日记」同款密码（共用 diaryPassword）。
 * 2. 3 项固定可填写参数：当前储蓄结余(分平台汇总) / 月度固定收入 / 月度计划总支出。
 *    —— 每次登记都生成一条独立、永久锁定的存档快照，新参数仅作用于本快照至下一快照之间。
 * 3. 页面隐藏所有单笔收支明细，只展示汇总与进度。
 * 4. 两级预警：节约预警（消耗进度≥80% 且周期未完成）、超支预警（结余 < 理论预期×0.8），触发时弹窗 + 收件箱推送。
 */
const SavingsMod = {
  _unlocked: false,        // 本次会话是否已解锁储蓄板块
  _pf: [],                 // 登记弹窗中的平台结余行（内存态）

  /* ---------- 数据访问 ---------- */
  getSnapshots() {
    return Store.get('savings_snapshots').slice().sort((a, b) => (a.ts || '').localeCompare(b.ts || ''));
  },
  fmt(n) {
    const v = Number(n) || 0;
    return (v < 0 ? '-' : '') + '¥' + Math.abs(v).toFixed(2);
  },

  /* ---------- 核心计算（进度监测与两级预警） ---------- */
  evaluate() {
    const snaps = this.getSnapshots();
    if (!snaps.length) return { has: false };
    const latest = snaps[snaps.length - 1];
    const prev = snaps.length >= 2 ? snaps[snaps.length - 2] : null;
    const balance = Number(latest.balance) || 0;
    const income = Number(latest.monthlyIncome) || 0;
    const expense = Number(latest.monthlyExpense) || 0;
    const prevBalance = prev ? (Number(prev.balance) || 0) : 0;

    const delta = balance - prevBalance;
    const deltaPct = prevBalance ? (delta / prevBalance * 100) : null;

    // 月度理论预期结余 = 本次登记结余 + 生效月收入 - 生效月计划支出
    const theory = balance + income - expense;
    const gap = theory - balance; // = 收入 - 支出（本周期预期净结余）

    // 当前开放周期的已进行天数
    const now = Date.now();
    const elapsedMs = now - new Date(latest.ts).getTime();
    const elapsedDays = Math.max(0, elapsedMs / 86400000);
    const cycleComplete = elapsedDays >= 25; // 25-35 天模糊周期

    // 月度支出消耗进度：优先用「上一周期真实消耗」(实际消耗额度 ÷ 月度计划支出)；仅 1 条存档时用时间进度估算
    let lastCycleReal = null;
    if (snaps.length >= 2) {
      const span = Math.max(1, (new Date(latest.ts).getTime() - new Date(prev.ts).getTime()) / 86400000);
      const incomeDuring = prev.monthlyIncome * (span / 30);
      const consumption = Math.max(0, prev.balance + incomeDuring - balance);
      lastCycleReal = prev.monthlyExpense > 0 ? consumption / prev.monthlyExpense : 0;
    }
    const progress = lastCycleReal != null
      ? (expense > 0 ? lastCycleReal : 0)
      : (expense > 0 ? Math.min(1, elapsedDays / 30) : 0);

    // 状态判定
    let status = 'normal', statusText = '收支正常', statusClass = 'ok';
    if (theory > 0 && balance < theory * 0.8) {
      status = 'overspend'; statusText = '超支预警'; statusClass = 'danger';
    } else if (progress >= 0.8) {
      status = 'save'; statusText = '节约预警'; statusClass = 'warn';
    }

    return {
      has: true, latest, prev, balance, income, expense,
      prevBalance, delta, deltaPct, theory, gap,
      progress, lastCycleReal, elapsedDays, cycleComplete,
      status, statusText, statusClass
    };
  },

  /* ---------- 渲染入口（含密码锁） ---------- */
  render(c) {
    if (!DiaryMod.hasPassword()) {
      c.innerHTML = `
        <div class="section-title">💰 ${I18n.t('savings')}</div>
        <div class="card"><div class="lock-box">
          <div class="lock-icon">🔒</div>
          <div class="lock-tip">储蓄板块与「私密日记」共用同一密码，且完全保密。<br>请先在私密日记中设置查看密码后再进入。</div>
          <button class="btn-confirm mt-12" onclick="DiaryMod.passwordSettings()">去设置私密日记密码</button>
        </div></div>`;
      return;
    }
    if (!this._unlocked) { this.renderLock(c); return; }
    this.renderContent(c);
  },

  renderLock(c) {
    const hint = Store.getSetting('diaryPwHint', '');
    c.innerHTML = `
      <div class="section-title">💰 ${I18n.t('savings')}</div>
      <div class="card"><div class="lock-box">
        <div class="lock-icon">🔒</div>
        <div class="lock-tip">储蓄板块已加密，请输入私密日记密码查看</div>
        ${hint ? `<div class="lock-hint">💡 提示：${Utils.escape(hint)}</div>` : ''}
        <input type="password" id="sv-pwd" placeholder="请输入密码" style="text-align:center;letter-spacing:2px;" onkeydown="if(event.key==='Enter')SavingsMod.doUnlock()">
        <div id="sv-err" class="text-sm" style="color:#C08B7D;height:18px;margin-top:6px;"></div>
        <button class="btn-confirm" onclick="SavingsMod.doUnlock()">解锁</button>
        <div class="lock-forgot" onclick="DiaryMod.recoverPassword()">忘记密码？</div>
      </div></div>`;
    setTimeout(() => { const i = document.getElementById('sv-pwd'); if (i) i.focus(); }, 60);
  },

  doUnlock() {
    const v = (document.getElementById('sv-pwd').value || '').trim();
    const saved = Store.getSetting('diaryPassword', '');
    if (DiaryMod._hash(v) === saved) {
      this._unlocked = true;
      App.render();
    } else {
      const e = document.getElementById('sv-err');
      if (e) e.textContent = '密码不正确，请重试';
      const i = document.getElementById('sv-pwd');
      if (i) i.value = '';
    }
  },

  forgotPwd() { DiaryMod.recoverPassword(); },

  /* ---------- 主内容 ---------- */
  renderContent(c) {
    const ev = this.evaluate();
    let body;
    if (!ev.has) {
      body = `
        <div class="empty-state"><div class="empty-icon">💰</div>
          <div>还没有任何存档。点击下方按钮登记你的第一笔储蓄结余与月度收支参数。</div>
        </div>`;
    } else {
      const deltaHtml = ev.prev
        ? `<span class="sv-delta ${ev.delta >= 0 ? 'up' : 'down'}">${ev.delta >= 0 ? '▲' : '▼'} ${this.fmt(Math.abs(ev.delta))}
             <span class="sv-delta-pct">(${ev.delta >= 0 ? '+' : ''}${(ev.deltaPct == null ? '0' : ev.deltaPct.toFixed(1))}%)</span></span>`
        : `<span class="sv-delta">首次登记</span>`;

      const progPct = Math.round(ev.progress * 100);
      const reachPct = ev.theory > 0 ? Math.min(100, Math.round(ev.balance / ev.theory * 100)) : 100;
      const progFillClass = ev.status === 'overspend' ? 'danger' : (ev.progress >= 0.8 ? 'warn' : '');
      const reachFillClass = ev.status === 'overspend' ? 'danger' : (ev.balance < ev.theory * 0.9 ? 'warn' : '');

      body = `
      <div class="card card-accent">
        <div class="flex-between" style="color:#fff;">
          <span>当前储蓄总金额</span>
          <span class="text-bold" style="font-size:26px;">${this.fmt(ev.balance)}</span>
        </div>
        <div class="mt-8" style="color:rgba(255,255,255,.85);">对比上一次存档 ${deltaHtml}</div>
      </div>

      <div class="dash-grid mt-12">
        <div class="dash-stat"><div class="dash-stat-num">${this.fmt(ev.income)}</div><div class="dash-stat-label">生效月收入</div></div>
        <div class="dash-stat"><div class="dash-stat-num danger">${this.fmt(ev.expense)}</div><div class="dash-stat-label">生效月支出</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${this.fmt(ev.theory)}</div><div class="dash-stat-label">理论预期结余</div></div>
      </div>

      <div class="card">
        <div class="flex-between mb-8">
          <span class="text-bold">月度支出消耗进度</span>
          <span class="text-sm text-light">${ev.lastCycleReal != null ? '上一周期实际消耗' : `本周期已 ${Math.round(ev.elapsedDays)} 天${ev.cycleComplete ? '（建议更新结余）' : ''}`}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill ${progFillClass}" style="width:${progPct}%"></div></div>
        <div class="text-sm text-light text-center mt-6">${ev.lastCycleReal != null ? `上一周期实际消耗 ${progPct}%` : `时间进度 ${progPct}%`}</div>

        <div class="flex-between mb-8 mt-14">
          <span class="text-bold">距离目标结余差值</span>
          <span class="text-sm ${ev.gap <= 0 ? 'text-accent' : 'text-light'}">${ev.gap <= 0 ? '已达成 ✓ 超出 ' + this.fmt(Math.abs(ev.gap)) : '还差 ' + this.fmt(ev.gap)}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill ${reachFillClass}" style="width:${reachPct}%"></div></div>
        <div class="text-sm text-light text-center mt-6">目标结余达成度 ${reachPct}%（理论预期 ${this.fmt(ev.theory)}）</div>
      </div>

      <div class="status-line status-${ev.statusClass}">
        <span class="status-dot"></span>状态：${ev.statusText}
        ${ev.status === 'normal' ? '（收支正常，继续保持）' : (ev.status === 'save' ? '（周期内消耗偏快，请注意节约）' : '（已严重超支，请尽快调整收支）')}
      </div>

      <div class="flex-between mb-12 mt-14">
        <div class="subsection-title" style="margin:0;">存档历史（锁定）</div>
        <button class="btn btn-primary btn-sm" onclick="SavingsMod.openRegister()">📝 登记 / 更新存档</button>
      </div>
      ${this.renderHistory(ev)}
      `;
    }

    c.innerHTML = `
      <div class="section-title">💰 ${I18n.t('savings')}</div>
      <div class="flex-between mb-12">
        <button class="btn btn-outline btn-sm" onclick="SavingsMod.relock()">🔒 重新上锁</button>
        <button class="btn btn-primary btn-sm" onclick="SavingsMod.openRegister()">📝 登记 / 更新存档</button>
      </div>
      ${body}
    `;
  },

  renderHistory(ev) {
    const snaps = this.getSnapshots().reverse(); // 最新在前
    if (!snaps.length) return '';
    return snaps.map((s, idx) => `
      <div class="list-item">
        <div class="list-icon">🗓️</div>
        <div class="list-body">
          <div class="list-title">${Utils.escape(s.date)} ${idx === 0 ? '<span class="tag-small" style="background:var(--accent);color:#fff;">最新</span>' : ''}</div>
          <div class="list-meta">结余 ${this.fmt(s.balance)} · 月收入 ${this.fmt(s.monthlyIncome)} · 月支出 ${this.fmt(s.monthlyExpense)}</div>
        </div>
        <div class="text-bold text-accent">${this.fmt(s.balance)}</div>
      </div>
    `).join('');
  },

  relock() { this._unlocked = false; App.showToast('已重新上锁', 'success'); App.render(); },

  /* ---------- 登记 / 更新存档 ---------- */
  openRegister() {
    const snaps = this.getSnapshots();
    const latest = snaps.length ? snaps[snaps.length - 1] : null;
    // 预填：沿用上一次的平台明细与收支参数，便于微调
    this._pf = latest && latest.platforms && latest.platforms.length
      ? latest.platforms.map(p => ({ name: p.name, amount: p.amount }))
      : [{ name: '', amount: 0 }];
    const income = latest ? (latest.monthlyIncome || 0) : 0;
    const expense = latest ? (latest.monthlyExpense || 0) : 0;

    App.openModal(`
      <div class="modal-title">📝 登记 / 更新存档</div>
      <div class="text-sm text-light mb-8">填写本次不同平台的资产结余（自动汇总），并登记当期生效的月度收支参数。提交后生成一条独立存档快照，历史快照永久锁定。</div>

      <div class="form-group">
        <label class="form-label">当前储蓄结余（按平台填写，自动汇总）</label>
        <div id="sv-platforms">${this._pf.map((p, i) => this._pfRow(i, p)).join('')}</div>
        <button class="btn btn-outline btn-sm mt-8" onclick="SavingsMod.addPlatformRow()">+ 添加平台</button>
        <div class="sv-total mt-8">合计总资产：<span id="sv-total">${this.fmt(this._pfSum())}</span></div>
      </div>

      <div class="two-col">
        <div class="form-group"><label class="form-label">月度固定收入</label><input type="number" id="sv-income" value="${income}"></div>
        <div class="form-group"><label class="form-label">月度计划总支出</label><input type="number" id="sv-expense" value="${expense}"></div>
      </div>

      <div class="modal-actions">
        <button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button>
        <button class="btn-confirm" onclick="SavingsMod.saveRegister()">${I18n.t('save')}</button>
      </div>
    `);
    this.recalcTotal();
  },

  _pfRow(i, p) {
    return `
      <div class="sv-pf-row">
        <input type="text" placeholder="平台名称（如：微信、支付宝、招行）" value="${Utils.escape(p.name || '')}" oninput="SavingsMod._onPfName(${i}, this.value)">
        <input type="number" placeholder="金额" value="${p.amount || 0}" oninput="SavingsMod._onPfAmount(${i}, this.value)">
        <span class="list-action" title="删除" onclick="SavingsMod.delPlatformRow(${i})">✕</span>
      </div>`;
  },
  _onPfName(i, v) { if (this._pf[i]) this._pf[i].name = v; },
  _onPfAmount(i, v) { if (this._pf[i]) { this._pf[i].amount = +v || 0; this.recalcTotal(); } },
  addPlatformRow() { this._pf.push({ name: '', amount: 0 }); this._refreshPf(); },
  delPlatformRow(i) { this._pf.splice(i, 1); this._refreshPf(); },
  _pfSum() { return this._pf.reduce((s, p) => s + (Number(p.amount) || 0), 0); },
  _refreshPf() {
    const box = document.getElementById('sv-platforms');
    if (box) box.innerHTML = this._pf.map((p, i) => this._pfRow(i, p)).join('');
    this.recalcTotal();
  },
  recalcTotal() {
    const t = document.getElementById('sv-total');
    if (t) t.textContent = this.fmt(this._pfSum());
  },

  saveRegister() {
    const platforms = this._pf.map(p => ({ name: (p.name || '').trim() || '其他', amount: Number(p.amount) || 0 }));
    const balance = platforms.reduce((s, p) => s + p.amount, 0);
    const income = Number(document.getElementById('sv-income').value) || 0;
    const expense = Number(document.getElementById('sv-expense').value) || 0;

    if (income < 0 || expense < 0) { App.showToast('收支金额不能为负', 'error'); return; }

    // 计算登记前的状态，用于对比是否新触发预警
    const beforeStatus = this.evaluate().status;

    const snap = {
      id: Store.get('savings_snapshots').length
        ? Math.max(...Store.get('savings_snapshots').map(d => d.id)) + 1 : 1,
      ts: new Date().toISOString(),
      date: Utils.today(),
      platforms, balance, monthlyIncome: income, monthlyExpense: expense
    };
    Store.add('savings_snapshots', snap);
    Store.logChange('savings', '登记存档', snap.id, `结余${balance} 收入${income} 支出${expense}`);

    App.closeModal();
    App.showToast(I18n.t('saved'), 'success');

    // 重新核算并触发预警（弹窗 + 收件箱推送）
    const ev = this.evaluate();
    this.checkAndNotify(beforeStatus, ev);
    App.render();
  },

  /* ---------- 两级预警：弹窗 + 收件箱推送 ---------- */
  checkAndNotify(beforeStatus, ev) {
    if (!ev || !ev.has) return;
    if (ev.status === 'normal') { Store.setSetting('savingsWarnLevel', 'normal'); return; }
    // 仅在状态升级 / 新进入预警时推送，避免同一状态重复打扰
    const last = Store.getSetting('savingsWarnLevel', 'normal');
    if (last === ev.status) return;
    Store.setSetting('savingsWarnLevel', ev.status);

    const isOver = ev.status === 'overspend';
    const title = isOver ? '🚨 储蓄超支预警' : '⚠️ 储蓄节约提醒';
    const content = isOver
      ? `当前结余 ${this.fmt(ev.balance)} 低于理论预期结余 ${this.fmt(ev.theory)} 的 80%，已严重超支，请尽快调整收支。`
      : `支出消耗进度已达 ${Math.round(ev.progress * 100)}%，请注意节约开支。`;

    // 收件箱推送（手动消息，保留至用户已读/过期）
    Store.add('inbox', {
      type: '生活提醒', source: 'savings', title, content,
      date: new Date().toISOString(), read: false, actionModule: 'savings', actionSub: '', actionId: 0, auto: false
    });

    // 弹窗提醒（超支更醒目）
    App.openModal(`
      <div class="modal-title ${isOver ? 'text-danger' : ''}">${title}</div>
      <div class="alert-box ${isOver ? 'danger' : 'warn'}">
        <h4>${title}</h4>
        <div>${Utils.escape(content)}</div>
      </div>
      <div class="text-sm text-light">当前状态：结余 ${this.fmt(ev.balance)} ｜ 生效月收入 ${this.fmt(ev.income)} ｜ 生效月支出 ${this.fmt(ev.expense)} ｜ 理论预期结余 ${this.fmt(ev.theory)}</div>
      <div class="modal-actions"><button class="btn-confirm" onclick="App.closeModal()">知道了</button></div>
    `);
  }
};
