/* ===== 储蓄板块（保密 · 快照式存档 · 月度进度监测 · 计划支出 / 年目标） =====
 * 设计要点：
 * 1. 完全保密，进入需输入「私密日记」同款密码（共用 diaryPassword）；离开界面再进入需重新输密码。
 * 2. 3 项固定可填写参数：当前储蓄结余(分平台汇总, 可负) / 月度固定收入 / 月度计划总支出(按分类填写)。
 *    —— 每次登记生成一条独立存档快照（历史存档现在支持修改 / 删除）。
 * 3. 发薪日（可修改）：按发薪日划分月度周期，据当前日期重算「截至今日理论预期结余」。
 * 4. 年存款目标 + 达成比例；计划支出项（养老金 / 保险 / 大疆等）含截止时间与「可购入门槛」。
 * 5. 页面隐藏所有单笔收支明细，只展示汇总与进度；两级预警：节约预警（消耗进度≥80%）、超支预警（结余 < 今日理论×0.8）。
 */
const SavingsMod = {
  _unlocked: false,        // 本次会话是否已解锁储蓄板块
  _pf: [],                 // 登记弹窗中的平台结余行（内存态，可负）
  _ec: [],                 // 登记弹窗中的分类支出行 [{cat, amount}]
  _editId: null,           // 编辑模式下的快照 id（null=新增）
  _planEditId: null,       // 计划项编辑 id

  /* ---------- 数据访问 ---------- */
  getSnapshots() {
    return Store.get('savings_snapshots').slice().sort((a, b) => (a.ts || '').localeCompare(b.ts || ''));
  },
  fmt(n) {
    const v = Number(n) || 0;
    return (v < 0 ? '-' : '') + '¥' + Math.abs(v).toFixed(2);
  },

  /* ---------- 核心计算（进度监测与两级预警 · 含发薪日日期模型） ---------- */
  _cycleInfo(payday, balance, income, expense) {
    payday = Math.round(Number(payday) || 1);
    const now = new Date();
    const day = now.getDate();
    const y = now.getFullYear(), m = now.getMonth();
    const pd = (yy, mm, dd) => { const last = new Date(yy, mm + 1, 0).getDate(); return new Date(yy, mm, Math.min(dd, last)); };
    const start = (day >= payday) ? pd(y, m, payday) : pd(y, m - 1, payday);
    const next = pd(start.getFullYear(), start.getMonth() + 1, payday);
    const cycMs = Math.max(1, next - start);
    const prog = Math.min(1, Math.max(0, (now - start) / cycMs));   // 当前发薪周期内已过比例
    const incomeReceived = (day >= payday) ? income : 0;            // 工资按发薪日一次性到账
    const expenseToDate = expense * prog;                           // 支出按周期平滑发生
    const theoryToday = balance + incomeReceived - expenseToDate;   // 截至今日理论预期结余（按发薪日）
    return { prog, incomeReceived, expenseToDate, theoryToday, cycleStart: start, nextPayday: next };
  },

  evaluate() {
    const snaps = this.getSnapshots();
    if (!snaps.length) return { has: false };
    const latest = snaps[snaps.length - 1];
    const prev = snaps.length >= 2 ? snaps[snaps.length - 2] : null;
    const balance = Number(latest.balance) || 0;
    const income = Number(latest.monthlyIncome) || 0;
    const expense = Number(latest.monthlyExpense) || 0;
    const payday = latest.payday || 1;
    const prevBalance = prev ? (Number(prev.balance) || 0) : 0;

    const delta = balance - prevBalance;
    const deltaPct = prevBalance ? (delta / prevBalance * 100) : null;

    // 月度理论目标（月末）：结余 + 收入 - 支出
    const theoryMonth = balance + income - expense;
    // 截至今日理论预期（按发薪日日期模型）
    const cyc = this._cycleInfo(payday, balance, income, expense);
    const theory = cyc.theoryToday;   // 默认以「今日理论」作为预警基准

    // 当前开放周期的已进行天数
    const elapsedDays = Math.max(0, (Date.now() - new Date(latest.ts).getTime()) / 86400000);

    // 月度支出消耗进度：优先用「上一周期真实消耗」；仅 1 条存档时用发薪周期进度
    let lastCycleReal = null;
    if (snaps.length >= 2) {
      const prevCyc = this._cycleInfo(prev.payday || 1, prev.balance, prev.monthlyIncome, prev.monthlyExpense);
      const incomeDuring = prev.monthlyIncome * (1 - (prevCyc.nextPayday > new Date(latest.ts) ? 0 : 0)); // 简版：取整月收入参与
      const consumption = Math.max(0, prev.balance + prev.monthlyIncome - balance);
      lastCycleReal = prev.monthlyExpense > 0 ? consumption / prev.monthlyExpense : 0;
    }
    const progress = lastCycleReal != null
      ? (expense > 0 ? lastCycleReal : 0)
      : (expense > 0 ? cyc.prog : 0);

    // 状态判定（以今日理论为基准）
    let status = 'normal', statusText = '收支正常', statusClass = 'ok';
    if (theory > 0 && balance < theory * 0.8) {
      status = 'overspend'; statusText = '超支预警'; statusClass = 'danger';
    } else if (progress >= 0.8) {
      status = 'save'; statusText = '节约预警'; statusClass = 'warn';
    }

    return {
      has: true, latest, prev, balance, income, expense, payday,
      prevBalance, delta, deltaPct, theory, theoryMonth, cycle: cyc,
      progress, lastCycleReal, elapsedDays, status, statusText, statusClass
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
        <div class="lock-tip">储蓄板块已加密，请输入私密日记密码查看<br><span class="text-sm text-light">（离开本界面后再进入需重新输入密码）</span></div>
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
    const annualGoal = Number(Store.getSetting('savingsAnnualGoal', 0)) || 0;
    const annualPct = annualGoal > 0 ? Math.min(100, Math.round(ev.has ? ev.balance / annualGoal * 100 : 0)) : 0;

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
      const gap = ev.theory - ev.balance;
      const paydayStr = `每月 ${ev.payday} 日发薪`;

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
        <div class="dash-stat"><div class="dash-stat-num">${this.fmt(ev.theory)}</div><div class="dash-stat-label">今日理论预期</div></div>
      </div>
      <div class="text-sm text-light text-center mt-6">${paydayStr} ｜ 月末理论目标 ${this.fmt(ev.theoryMonth)}</div>

      <div class="card">
        <div class="flex-between mb-8">
          <span class="text-bold">月度支出消耗进度</span>
          <span class="text-sm text-light">${ev.lastCycleReal != null ? '上一周期实际消耗' : `本发薪周期已 ${Math.round(ev.cycle.prog * 100)}%`}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill ${progFillClass}" style="width:${progPct}%"></div></div>
        <div class="text-sm text-light text-center mt-6">${ev.lastCycleReal != null ? `上一周期实际消耗 ${progPct}%` : `发薪周期进度 ${progPct}%`}</div>

        <div class="flex-between mb-8 mt-14">
          <span class="text-bold">距离今日目标结余差值</span>
          <span class="text-sm ${ev.gap <= 0 ? 'text-accent' : 'text-light'}">${gap <= 0 ? '已达成 ✓ 超出 ' + this.fmt(Math.abs(gap)) : '还差 ' + this.fmt(gap)}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill ${reachFillClass}" style="width:${reachPct}%"></div></div>
        <div class="text-sm text-light text-center mt-6">今日目标达成度 ${reachPct}%（今日理论 ${this.fmt(ev.theory)}）</div>
      </div>

      <div class="status-line status-${ev.statusClass}">
        <span class="status-dot"></span>状态：${ev.statusText}
        ${ev.status === 'normal' ? '（收支正常，继续保持）' : (ev.status === 'save' ? '（周期内消耗偏快，请注意节约）' : '（已严重超支，请尽快调整收支）')}
      </div>

      ${this.renderAnnualGoal(ev, annualGoal, annualPct)}
      ${this.renderPlans(ev)}

      <div class="flex-between mb-12 mt-14">
        <div class="subsection-title" style="margin:0;">存档历史（可修改）</div>
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

  renderAnnualGoal(ev, goal, pct) {
    const balance = ev.has ? ev.balance : 0;
    return `
      <div class="card mt-12">
        <div class="flex-between mb-8">
          <span class="text-bold">🎯 年存款目标</span>
          <button class="btn btn-outline btn-sm" onclick="SavingsMod.openAnnualGoal()">${goal > 0 ? '修改' : '设置'}</button>
        </div>
        ${goal > 0 ? `
          <div class="flex-between">
            <span class="text-sm text-light">年度目标 ${this.fmt(goal)}</span>
            <span class="text-bold text-accent">达成 ${pct}%</span>
          </div>
          <div class="progress-bar mt-8"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="text-sm text-light text-center mt-6">当前总储蓄 ${this.fmt(balance)} ｜ 还差 ${this.fmt(Math.max(0, goal - balance))}</div>
        ` : `
          <div class="text-sm text-light">尚未设置年度存款目标，点击「设置」制定并跟踪达成比例。</div>
        `}
      </div>`;
  },

  renderPlans(ev) {
    const balance = ev.has ? ev.balance : 0;
    const plans = Store.get('savings_plans');
    const rows = plans.length ? plans.map(p => {
      const need = Number(p.requireBalance) || 0;
      const pct = need > 0 ? Math.min(100, Math.round(balance / need * 100)) : 100;
      const canBuy = balance >= need && !p.done;
      const days = p.deadline ? Utils.daysBetween(Utils.today(), p.deadline) : null;
      const near = days != null && days >= 0 && days <= 30;
      let tag, tagClass;
      if (p.done) { tag = '✅ 已达成/购入'; tagClass = 'ok'; }
      else if (canBuy) { tag = '🟢 已可购入'; tagClass = 'ok'; }
      else if (near) { tag = `⏰ 临近截止(${days}天)`; tagClass = 'warn'; }
      else { tag = '🔒 攒钱中'; tagClass = 'muted'; }
      return `
        <div class="plan-item">
          <div class="flex-between">
            <div class="plan-name">${Utils.escape(p.name)} ${p.done ? '<span class="tag-small" style="background:var(--ok);color:#fff;">已完成</span>' : ''}</div>
            <div class="plan-actions">
              <span class="list-action" title="修改" onclick="SavingsMod.editPlan(${p.id})">✎</span>
              <span class="list-action" title="删除" onclick="SavingsMod.delPlan(${p.id})">✕</span>
            </div>
          </div>
          <div class="text-sm text-light">预估花费 ${this.fmt(p.cost)} ｜ 截止 ${Utils.escape(p.deadline || '未设')} ｜ 购入门槛 ${this.fmt(need)}</div>
          <div class="flex-between mt-6 mb-4">
            <span class="text-sm ${canBuy ? 'text-accent' : 'text-light'}">${canBuy ? '已达购入门槛 🎉' : `距门槛还差 ${this.fmt(Math.max(0, need - balance))}`}</span>
            <span class="status-line status-${tagClass}" style="padding:2px 8px;font-size:12px;">${tag}</span>
          </div>
          <div class="progress-bar"><div class="progress-fill ${canBuy ? 'ok' : ''}" style="width:${pct}%"></div></div>
          <div class="text-sm text-light text-center mt-4">门槛达成度 ${pct}%</div>
        </div>`;
    }).join('') : `<div class="text-sm text-light">还没有计划支出项，可添加养老金、保险、大疆等，并设定「攒到多少才能买」。</div>`;

    return `
      <div class="card mt-12">
        <div class="flex-between mb-8">
          <span class="text-bold">🛒 计划支出项（购入门槛）</span>
          <button class="btn btn-outline btn-sm" onclick="SavingsMod.openPlan()">+ 添加</button>
        </div>
        ${rows}
      </div>`;
  },

  renderHistory(ev) {
    const snaps = this.getSnapshots().reverse(); // 最新在前
    if (!snaps.length) return '';
    return snaps.map((s, idx) => {
      const cats = (s.monthlyExpenseBreakdown && s.monthlyExpenseBreakdown.length)
        ? '（' + s.monthlyExpenseBreakdown.map(x => `${Utils.escape(x.cat)}${this.fmt(x.amount)}`).join('/') + '）'
        : '';
      return `
      <div class="list-item">
        <div class="list-icon">🗓️</div>
        <div class="list-body">
          <div class="list-title">${Utils.escape(s.date)} ${idx === 0 ? '<span class="tag-small" style="background:var(--accent);color:#fff;">最新</span>' : ''} ${s.payday ? '· 发薪日' + s.payday + '日' : ''}</div>
          <div class="list-meta">结余 ${this.fmt(s.balance)} · 月收入 ${this.fmt(s.monthlyIncome)} · 月支出 ${this.fmt(s.monthlyExpense)}${cats}</div>
        </div>
        <div class="plan-actions">
          <span class="list-action" title="修改" onclick="SavingsMod.editSnapshot(${s.id})">✎</span>
          <span class="list-action" title="删除" onclick="SavingsMod.delSnapshot(${s.id})">✕</span>
        </div>
      </div>`;
    }).join('');
  },

  relock() { this._unlocked = false; App.showToast('已重新上锁', 'success'); App.render(); },

  /* ---------- 年存款目标 ---------- */
  openAnnualGoal() {
    const goal = Number(Store.getSetting('savingsAnnualGoal', 0)) || 0;
    App.openModal(`
      <div class="modal-title">🎯 年存款目标</div>
      <div class="text-sm text-light mb-8">设定本年度希望达到的存款总额，系统将按当前总储蓄计算达成比例。</div>
      <div class="form-group"><label class="form-label">年度存款目标（¥）</label><input type="number" id="sv-annual" value="${goal}" step="any"></div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="App.closeModal()">取消</button>
        <button class="btn-confirm" onclick="SavingsMod.saveAnnualGoal()">保存</button>
      </div>
    `);
  },
  saveAnnualGoal() {
    const v = Number(document.getElementById('sv-annual').value) || 0;
    if (v < 0) { App.showToast('目标不能为负', 'error'); return; }
    Store.setSetting('savingsAnnualGoal', v);
    App.closeModal();
    App.showToast('年存款目标已保存', 'success');
    App.render();
  },

  /* ---------- 计划支出项 ---------- */
  openPlan(id) {
    let p = { name: '', cost: 0, deadline: '', requireBalance: 0, note: '', done: false };
    if (id) { const f = Store.find('savings_plans', x => x.id === id); if (f) p = f; }
    this._planEditId = id || null;
    App.openModal(`
      <div class="modal-title">${id ? '✎ 修改计划支出项' : '🛒 添加计划支出项'}</div>
      <div class="text-sm text-light mb-8">设定预估花费、截止时间与「攒到多少才能购入」的门槛，系统据当前结余显示进度。</div>
      <div class="form-group"><label class="form-label">名称（如：养老金 / 保险 / 大疆无人机）</label><input type="text" id="pl-name" value="${Utils.escape(p.name || '')}"></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">预估花费（¥）</label><input type="number" id="pl-cost" value="${p.cost || 0}" step="any"></div>
        <div class="form-group"><label class="form-label">截止时间</label><input type="date" id="pl-deadline" value="${Utils.escape(p.deadline || '')}"></div>
      </div>
      <div class="form-group"><label class="form-label">购入门槛：需攒到多少存款才能购入（¥）</label><input type="number" id="pl-need" value="${p.requireBalance || 0}" step="any"></div>
      <div class="form-group"><label class="form-label">备注</label><input type="text" id="pl-note" value="${Utils.escape(p.note || '')}" placeholder="可选"></div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="App.closeModal()">取消</button>
        <button class="btn-confirm" onclick="SavingsMod.savePlan()">保存</button>
      </div>
    `);
  },
  savePlan() {
    const name = (document.getElementById('pl-name').value || '').trim();
    const cost = Number(document.getElementById('pl-cost').value) || 0;
    const deadline = document.getElementById('pl-deadline').value || '';
    const requireBalance = Number(document.getElementById('pl-need').value) || 0;
    const note = document.getElementById('pl-note').value || '';
    if (!name) { App.showToast('请填写名称', 'error'); return; }
    const obj = { name, cost, deadline, requireBalance, note, done: false };
    if (this._planEditId) Store.update('savings_plans', this._planEditId, obj);
    else Store.add('savings_plans', obj);
    this._planEditId = null;
    App.closeModal();
    App.showToast('已保存', 'success');
    App.render();
  },
  editPlan(id) { this.openPlan(id); },
  delPlan(id) {
    App.confirm('确认删除该计划支出项？', () => {
      Store.remove('savings_plans', id);
      App.showToast('已删除', 'success');
      App.render();
    });
  },
  togglePlanDone(id) {
    const p = Store.find('savings_plans', x => x.id === id);
    if (p) { Store.update('savings_plans', id, { done: !p.done }); App.render(); }
  },

  /* ---------- 登记 / 更新存档（含编辑历史） ---------- */
  _seedPlatforms(snapshot) {
    if (snapshot && snapshot.platforms && snapshot.platforms.length)
      return snapshot.platforms.map(p => ({ name: p.name, amount: p.amount }));
    const latest = this.getSnapshots();
    const l = latest.length ? latest[latest.length - 1] : null;
    if (l && l.platforms && l.platforms.length)
      return l.platforms.map(p => ({ name: p.name, amount: 0 }));
    return [{ name: '', amount: 0 }];
  },
  _seedExpenseCats(snapshot) {
    if (snapshot && snapshot.monthlyExpenseBreakdown && snapshot.monthlyExpenseBreakdown.length)
      return snapshot.monthlyExpenseBreakdown.map(x => ({ cat: x.cat, amount: x.amount }));
    const latest = this.getSnapshots();
    const l = latest.length ? latest[latest.length - 1] : null;
    if (l && l.monthlyExpenseBreakdown && l.monthlyExpenseBreakdown.length)
      return l.monthlyExpenseBreakdown.map(x => ({ cat: x.cat, amount: x.amount }));
    return [{ cat: '车贷', amount: 0 }, { cat: '房贷', amount: 0 }, { cat: '生活', amount: 0 }, { cat: '其他', amount: 0 }];
  },

  openRegister(editId) {
    this._editId = editId || null;
    const snaps = this.getSnapshots();
    const editSnap = editId ? snaps.find(s => s.id === editId) : null;
    const base = editSnap || (snaps.length ? snaps[snaps.length - 1] : null);

    this._pf = this._seedPlatforms(base);
    this._ec = this._seedExpenseCats(base);
    const income = base ? (base.monthlyIncome || 0) : 0;
    const payday = base ? (base.payday || 10) : 10;

    App.openModal(`
      <div class="modal-title">${editId ? '✎ 修改存档' : '📝 登记 / 更新存档'}</div>
      <div class="text-sm text-light mb-8">填写本次不同平台的资产结余（可填负数，如透支/负债），并登记当期生效的月度收支参数与发薪日。提交后生成 / 更新一条存档快照。</div>

      <div class="form-group">
        <label class="form-label">当前储蓄结余（按平台填写，可负，自动汇总）</label>
        <div id="sv-platforms">${this._pf.map((p, i) => this._pfRow(i, p)).join('')}</div>
        <button class="btn btn-outline btn-sm mt-8" onclick="SavingsMod.addPlatformRow()">+ 添加平台</button>
        <div class="sv-total mt-8">合计总资产：<span id="sv-total">${this.fmt(this._pfSum())}</span></div>
      </div>

      <div class="two-col">
        <div class="form-group"><label class="form-label">月度固定收入</label><input type="number" id="sv-income" value="${income}" step="any"></div>
        <div class="form-group"><label class="form-label">发薪日（每月几号，可改）</label><input type="number" id="sv-payday" value="${payday}" min="1" max="31"></div>
      </div>

      <div class="form-group">
        <label class="form-label">月度计划总支出（按分类填写，自动汇总）</label>
        <div id="sv-expense-cats">${this._ec.map((c, i) => this._ecRow(i, c)).join('')}</div>
        <button class="btn btn-outline btn-sm mt-8" onclick="SavingsMod.addExpenseRow()">+ 添加分类</button>
        <div class="sv-total mt-8">月度支出合计：<span id="sv-expense-total">${this.fmt(this._ecSum())}</span></div>
      </div>

      <div class="modal-actions">
        ${editId ? `<button class="btn-cancel" onclick="SavingsMod.delSnapshot(${editId})">删除此存档</button>` : ''}
        <button class="btn-cancel" onclick="App.closeModal()">取消</button>
        <button class="btn-confirm" onclick="SavingsMod.saveRegister()">${editId ? '保存修改' : '保存存档'}</button>
      </div>
    `);
    this.recalcTotal();
  },

  _pfRow(i, p) {
    return `
      <div class="sv-pf-row">
        <input type="text" placeholder="平台名称（如：微信、支付宝、招行）" value="${Utils.escape(p.name || '')}" oninput="SavingsMod._onPfName(${i}, this.value)">
        <input type="number" step="any" placeholder="金额(可负)" value="${p.amount || 0}" oninput="SavingsMod._onPfAmount(${i}, this.value)">
        <span class="list-action" title="删除" onclick="SavingsMod.delPlatformRow(${i})">✕</span>
      </div>`;
  },
  _onPfName(i, v) { if (this._pf[i]) this._pf[i].name = v; },
  _onPfAmount(i, v) { if (this._pf[i]) { this._pf[i].amount = Number(v) || 0; this.recalcTotal(); } },
  addPlatformRow() { this._pf.push({ name: '', amount: 0 }); this._refreshPf(); },
  delPlatformRow(i) { this._pf.splice(i, 1); this._refreshPf(); },
  _pfSum() { return this._pf.reduce((s, p) => s + (Number(p.amount) || 0), 0); },

  _ecRow(i, c) {
    return `
      <div class="sv-pf-row">
        <input type="text" placeholder="分类（如：车贷、房贷、生活）" value="${Utils.escape(c.cat || '')}" oninput="SavingsMod._onEcCat(${i}, this.value)">
        <input type="number" step="any" placeholder="金额(可负)" value="${c.amount || 0}" oninput="SavingsMod._onEcAmount(${i}, this.value)">
        <span class="list-action" title="删除" onclick="SavingsMod.delExpenseRow(${i})">✕</span>
      </div>`;
  },
  _onEcCat(i, v) { if (this._ec[i]) this._ec[i].cat = v; },
  _onEcAmount(i, v) { if (this._ec[i]) { this._ec[i].amount = Number(v) || 0; this.recalcExpense(); } },
  addExpenseRow() { this._ec.push({ cat: '', amount: 0 }); this._refreshEc(); },
  delExpenseRow(i) { this._ec.splice(i, 1); this._refreshEc(); },
  _ecSum() { return this._ec.reduce((s, c) => s + (Number(c.amount) || 0), 0); },

  _refreshPf() {
    const box = document.getElementById('sv-platforms');
    if (box) box.innerHTML = this._pf.map((p, i) => this._pfRow(i, p)).join('');
    this.recalcTotal();
  },
  _refreshEc() {
    const box = document.getElementById('sv-expense-cats');
    if (box) box.innerHTML = this._ec.map((c, i) => this._ecRow(i, c)).join('');
    this.recalcExpense();
  },
  recalcTotal() {
    const t = document.getElementById('sv-total');
    if (t) t.textContent = this.fmt(this._pfSum());
    this.recalcExpense();
  },
  recalcExpense() {
    const t = document.getElementById('sv-expense-total');
    if (t) t.textContent = this.fmt(this._ecSum());
  },

  saveRegister() {
    const platforms = this._pf.map(p => ({ name: (p.name || '').trim() || '其他', amount: Number(p.amount) || 0 }));
    const balance = platforms.reduce((s, p) => s + p.amount, 0);
    const income = Number(document.getElementById('sv-income').value) || 0;
    const payday = Math.min(31, Math.max(1, parseInt(document.getElementById('sv-payday').value, 10) || 1));
    const expenseBreakdown = this._ec
      .filter(c => (c.cat || '').trim())
      .map(c => ({ cat: (c.cat || '').trim(), amount: Number(c.amount) || 0 }));
    const expense = expenseBreakdown.reduce((s, c) => s + c.amount, 0);

    // 计算登记前的状态，用于对比是否新触发预警
    const beforeStatus = this.evaluate().status;

    const patch = {
      ts: new Date().toISOString(),
      date: Utils.today(),
      platforms, balance, monthlyIncome: income,
      monthlyExpense: expense, monthlyExpenseBreakdown: expenseBreakdown, payday
    };

    if (this._editId) {
      Store.update('savings_snapshots', this._editId, patch);
      Store.logChange('savings', '修改存档', this._editId, `结余${balance} 收入${income} 支出${expense} 发薪日${payday}`);
    } else {
      patch.id = Store.get('savings_snapshots').length
        ? Math.max(...Store.get('savings_snapshots').map(d => d.id)) + 1 : 1;
      Store.add('savings_snapshots', patch);
      Store.logChange('savings', '登记存档', patch.id, `结余${balance} 收入${income} 支出${expense} 发薪日${payday}`);
    }
    this._editId = null;

    App.closeModal();
    App.showToast(I18n.t('saved'), 'success');

    const ev = this.evaluate();
    this.checkAndNotify(beforeStatus, ev);
    App.render();
  },

  editSnapshot(id) { this.openRegister(id); },
  delSnapshot(id) {
    App.confirm('确认删除该存档？删除后不可恢复。', () => {
      Store.remove('savings_snapshots', id);
      App.showToast('已删除存档', 'success');
      App.render();
    });
  },

  /* ---------- 两级预警：弹窗 + 收件箱推送 ---------- */
  checkAndNotify(beforeStatus, ev) {
    if (!ev || !ev.has) return;
    if (ev.status === 'normal') { Store.setSetting('savingsWarnLevel', 'normal'); return; }
    const last = Store.getSetting('savingsWarnLevel', 'normal');
    if (last === ev.status) return;
    Store.setSetting('savingsWarnLevel', ev.status);

    const isOver = ev.status === 'overspend';
    const title = isOver ? '🚨 储蓄超支预警' : '⚠️ 储蓄节约提醒';
    const content = isOver
      ? `当前结余 ${this.fmt(ev.balance)} 低于今日理论预期结余 ${this.fmt(ev.theory)} 的 80%，已严重超支，请尽快调整收支。`
      : `支出消耗进度已达 ${Math.round(ev.progress * 100)}%，请注意节约开支。`;

    Store.add('inbox', {
      type: '生活提醒', source: 'savings', title, content,
      date: new Date().toISOString(), read: false, actionModule: 'savings', actionSub: '', actionId: 0, auto: false
    });

    App.openModal(`
      <div class="modal-title ${isOver ? 'text-danger' : ''}">${title}</div>
      <div class="alert-box ${isOver ? 'danger' : 'warn'}">
        <h4>${title}</h4>
        <div>${Utils.escape(content)}</div>
      </div>
      <div class="text-sm text-light">当前状态：结余 ${this.fmt(ev.balance)} ｜ 生效月收入 ${this.fmt(ev.income)} ｜ 生效月支出 ${this.fmt(ev.expense)} ｜ 今日理论预期结余 ${this.fmt(ev.theory)} ｜ 发薪日每月${ev.payday}日</div>
      <div class="modal-actions"><button class="btn-confirm" onclick="App.closeModal()">知道了</button></div>
    `);
  }
};
