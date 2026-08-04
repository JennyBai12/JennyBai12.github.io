/* ===== 储蓄&份子钱台账模块 ===== */
const SavingsMod = {
  subTab: 'accounts',

  render(c) {
    c.innerHTML = `
      <div class="section-title">💰 ${I18n.t('savings')}</div>
      <div class="sub-tabs">
        <div class="sub-tab ${this.subTab === 'accounts' ? 'active' : ''}" onclick="SavingsMod.setSub('accounts')">账户流水</div>
        <div class="sub-tab ${this.subTab === 'budget' ? 'active' : ''}" onclick="SavingsMod.setSub('budget')">超支预警</div>
        <div class="sub-tab ${this.subTab === 'gift' ? 'active' : ''}" onclick="SavingsMod.setSub('gift')">份子钱台账</div>
        <div class="sub-tab ${this.subTab === 'goals' ? 'active' : ''}" onclick="SavingsMod.setSub('goals')">储蓄目标</div>
      </div>
      <div id="savings-sub"></div>
    `;
    if (this.subTab === 'accounts') this.renderAccounts();
    else if (this.subTab === 'budget') this.renderBudget();
    else if (this.subTab === 'gift') this.renderGift();
    else this.renderGoals();
  },

  setSub(tab) { this.subTab = tab; App.render(); },

  /* ===== 账户流水 ===== */
  renderAccounts() {
    const accounts = Store.get('accounts');
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
    const txns = Store.get('transactions').sort((a, b) => b.date.localeCompare(a.date));
    const monthTxns = txns.filter(t => t.date.startsWith(Utils.today().slice(0, 7)));
    const monthExpense = monthTxns.filter(t => t.type === '支出').reduce((s, t) => s + t.amount, 0);
    const monthIncome = monthTxns.filter(t => t.type === '收入').reduce((s, t) => s + t.amount, 0);

    // 支出分类饼图
    const catMap = {};
    monthTxns.filter(t => t.type === '支出').forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
    const pieData = Object.entries(catMap).map(([k, v]) => ({ label: k, value: v }));

    document.getElementById('savings-sub').innerHTML = `
      <div class="flex-between mb-12">
        <div class="subsection-title" style="margin:0;">账户流水</div>
        <button class="btn btn-primary btn-sm" onclick="SavingsMod.addTxn()">+ 记账</button>
      </div>
      <div class="card card-accent">
        <div class="flex-between" style="color:#fff;"><span>总资产</span><span class="text-bold" style="font-size:24px;">¥${totalBalance.toFixed(2)}</span></div>
      </div>
      <div class="dash-grid mt-12">
        <div class="dash-stat"><div class="dash-stat-num">¥${monthIncome.toFixed(0)}</div><div class="dash-stat-label">本月收入</div></div>
        <div class="dash-stat"><div class="dash-stat-num danger">¥${monthExpense.toFixed(0)}</div><div class="dash-stat-label">本月支出</div></div>
      </div>
      ${pieData.length > 0 ? `<div class="chart-box"><div class="chart-title">本月支出分类</div>${Charts.pie(pieData, { centerText: '¥' + monthExpense.toFixed(0) })}</div>` : ''}
      <div class="card">
        <div class="card-title">账户列表</div>
        ${accounts.map(a => `
          <div class="flex-between" style="padding:6px 0;border-bottom:1px solid rgba(166,183,161,0.15);">
            <div><span class="text-bold">${Utils.escape(a.name)}</span> <span class="text-sm text-light">${a.type}</span></div>
            <span class="text-bold text-accent">¥${a.balance.toFixed(2)}</span>
          </div>
        `).join('')}
      </div>
      <div class="section-title">近期流水</div>
      ${txns.slice(0, 20).map(t => {
        const acc = Store.find('accounts', a => a.id === t.accountId);
        return `
        <div class="list-item">
          <div class="list-icon">${t.type === '支出' ? '💸' : '💵'}</div>
          <div class="list-body"><div class="list-title">${Utils.escape(t.category)} · ${Utils.escape(t.note || '')}</div><div class="list-meta">${t.date} · ${acc ? Utils.escape(acc.name) : ''}</div></div>
          <span class="text-bold ${t.type === '支出' ? 'text-danger' : 'text-accent'}">${t.type === '支出' ? '-' : '+'}¥${t.amount}</span>
        </div>`;
      }).join('')}
      <button class="btn btn-outline btn-block mt-12" onclick="SavingsMod.exportTxn()">📥 导出流水CSV</button>
    `;
  },

  addTxn() {
    const accounts = Store.get('accounts');
    App.openModal(`
      <div class="modal-title">新增记账</div>
      <div class="form-group"><label class="form-label">类型</label><select id="tx-type"><option>支出</option><option>收入</option></select></div>
      <div class="form-group"><label class="form-label">账户</label><select id="tx-account">${accounts.map(a => `<option value="${a.id}">${Utils.escape(a.name)}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">分类</label><input type="text" id="tx-category" placeholder="如：餐饮、交通、购物"></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">金额</label><input type="number" id="tx-amount" value="0"></div>
        <div class="form-group"><label class="form-label">日期</label><input type="date" id="tx-date" value="${Utils.today()}"></div>
      </div>
      <div class="form-group"><label class="form-label">备注</label><input type="text" id="tx-note"></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="SavingsMod.saveTxn()">${I18n.t('save')}</button></div>
    `);
  },

  saveTxn() {
    const type = document.getElementById('tx-type').value;
    const accountId = +document.getElementById('tx-account').value;
    const amount = +document.getElementById('tx-amount').value;
    const date = document.getElementById('tx-date').value;
    const category = document.getElementById('tx-category').value;
    const note = document.getElementById('tx-note').value;

    Store.add('transactions', { accountId, type, category, amount, date, note, image: '' });
    // 更新账户余额
    const acc = Store.find('accounts', a => a.id === accountId);
    const newBalance = type === '支出' ? acc.balance - amount : acc.balance + amount;
    Store.update('accounts', accountId, { balance: newBalance });
    Store.logChange('savings', '记账', 0, type + ' ' + amount + ' ' + category);

    // 检查超支预警
    this.checkBudget(date.slice(0, 7));

    App.closeModal(); App.showToast(I18n.t('added'), 'success'); App.render();
  },

  /* ===== 超支预警 ===== */
  checkBudget(month) {
    const threshold = Store.get('spending_threshold').find(t => t.month === month);
    if (!threshold) return;
    const expense = Store.filter('transactions', t => t.type === '支出' && t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0);
    const pct = expense / threshold.threshold;
    if (pct >= 1.2 && !threshold.alert120) {
      Store.update('spending_threshold', threshold.id, { alert120: true });
    } else if (pct >= 1.0 && !threshold.alert100) {
      Store.update('spending_threshold', threshold.id, { alert100: true });
    } else if (pct >= 0.8 && !threshold.alert80) {
      Store.update('spending_threshold', threshold.id, { alert80: true });
    }
  },

  renderBudget() {
    const month = Utils.today().slice(0, 7);
    let threshold = Store.get('spending_threshold').find(t => t.month === month);
    if (!threshold) {
      Store.add('spending_threshold', { month, threshold: 3000, alert80: false, alert100: false, alert120: false, lockExplain: '' });
      threshold = Store.get('spending_threshold').find(t => t.month === month);
    }
    const expense = Store.filter('transactions', t => t.type === '支出' && t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0);
    const pct = expense / threshold.threshold;
    const top3 = Store.filter('transactions', t => t.type === '支出' && t.date.startsWith(month))
      .sort((a, b) => b.amount - a.amount).slice(0, 3);

    document.getElementById('savings-sub').innerHTML = `
      <div class="subsection-title">${I18n.t('spendingAlert')} — ${month}</div>
      <div class="card">
        <div class="flex-between mb-8"><span class="text-bold">月度预算阈值</span><span class="text-accent text-bold">¥${threshold.threshold}</span></div>
        <div class="progress-bar"><div class="progress-fill ${pct >= 1 ? 'danger' : pct >= 0.8 ? 'warn' : ''}" style="width:${Math.min(100, pct * 100)}%"></div></div>
        <div class="text-sm text-light text-center mt-8">已支出 ¥${expense.toFixed(2)} / 预算 ¥${threshold.threshold} (${Math.round(pct * 100)}%)</div>
        <button class="btn btn-outline btn-sm btn-block mt-12" onclick="SavingsMod.setThreshold()">修改阈值</button>
      </div>

      ${pct >= 1.2 ? `
        <div class="alert-box locked">
          <h4>⚠️ 超支预警：已超出预算20%！</h4>
          <div>当月新增记账已锁定。请填写本月支出排名前三的项目及原因，提交后解锁。</div>
        </div>
        ${threshold.lockExplain ? `<div class="card"><div class="text-sm">${Utils.escape(threshold.lockExplain)}</div></div>` : `
        <div class="card">
          <div class="card-title">填写超支说明（解锁记账）</div>
          ${top3.map((t, i) => `<div class="text-sm mb-8">${i + 1}. ${Utils.escape(t.category)} ¥${t.amount} — ${Utils.escape(t.note || '')}</div>`).join('')}
          <div class="form-group"><label class="form-label">支出原因说明 <span class="req">*</span></label><textarea id="lock-explain" rows="4" placeholder="说明本月超支原因..."></textarea></div>
          <button class="btn btn-primary btn-block" onclick="SavingsMod.submitExplain(${threshold.id})">提交解锁</button>
        </div>`}
      ` : pct >= 1.0 ? `
        <div class="alert-box danger"><h4>⚠️ 超支提醒</h4><div>当月支出已达预算上限！</div></div>
      ` : pct >= 0.8 ? `
        <div class="alert-box warn"><h4>⏰ 预算提醒</h4><div>当月支出已达预算80%，请注意控制。</div></div>
      ` : `
        <div class="alert-box" style="background:rgba(130,158,142,0.1);border:1px solid var(--accent);color:var(--accent);"><h4>✅ 预算正常</h4><div>当前支出在可控范围内。</div></div>
      `}
    `;
  },

  setThreshold() {
    App.openModal(`
      <div class="modal-title">修改月度预算阈值</div>
      <div class="text-sm text-light">修改记录不存档，只保留当前设定值。</div>
      <div class="form-group mt-12"><label class="form-label">月度支出阈值 X（元）</label><input type="number" id="th-val" value="3000"></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="SavingsMod.saveThreshold()">${I18n.t('save')}</button></div>
    `);
  },

  saveThreshold() {
    const month = Utils.today().slice(0, 7);
    const val = +document.getElementById('th-val').value;
    const existing = Store.get('spending_threshold').find(t => t.month === month);
    if (existing) Store.update('spending_threshold', existing.id, { threshold: val, alert80: false, alert100: false, alert120: false, lockExplain: '' });
    else Store.add('spending_threshold', { month, threshold: val, alert80: false, alert100: false, alert120: false, lockExplain: '' });
    App.closeModal(); App.showToast(I18n.t('saved'), 'success'); App.render();
  },

  submitExplain(id) {
    const explain = document.getElementById('lock-explain').value.trim();
    if (!explain) { App.showToast('请填写说明', 'error'); return; }
    Store.update('spending_threshold', id, { lockExplain: explain });
    App.closeModal(); App.showToast('已解锁记账', 'success'); App.render();
  },

  /* ===== 份子钱台账 ===== */
  renderGift() {
    const gifts = Store.get('gift_money').sort((a, b) => b.date.localeCompare(a.date));
    const received = gifts.filter(g => g.direction === '收').reduce((s, g) => s + g.amount, 0);
    const sent = gifts.filter(g => g.direction === '送').reduce((s, g) => s + g.amount, 0);
    const pendingReturn = gifts.filter(g => g.direction === '收' && g.returnStatus === '待回礼');

    document.getElementById('savings-sub').innerHTML = `
      <div class="flex-between mb-12">
        <div class="subsection-title" style="margin:0;">份子钱台账</div>
        <button class="btn btn-primary btn-sm" onclick="SavingsMod.addGift()">+ 记录</button>
      </div>
      <div class="dash-grid">
        <div class="dash-stat"><div class="dash-stat-num">¥${received}</div><div class="dash-stat-label">收礼合计</div></div>
        <div class="dash-stat"><div class="dash-stat-num danger">¥${sent}</div><div class="dash-stat-label">送礼合计</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${pendingReturn.length}</div><div class="dash-stat-label">待回礼</div></div>
      </div>
      ${pendingReturn.length > 0 ? `<div class="alert-box warn"><h4>🔔 回礼提醒</h4>${pendingReturn.map(g => `${Utils.escape(g.person)} — ${Utils.escape(g.event)} ¥${g.amount} (${g.date})`).join('；')}</div>` : ''}
      ${gifts.map(g => `
        <div class="list-item">
          <div class="list-icon">${g.direction === '收' ? '📥' : '📤'}</div>
          <div class="list-body">
            <div class="list-title">${Utils.escape(g.person)} · ${Utils.escape(g.event)}</div>
            <div class="list-meta">${g.direction} · ${Utils.escape(g.relation)} · ${g.date}${g.returnStatus ? ' · ' + g.returnStatus : ''}</div>
          </div>
          <div class="flex-center gap-8">
            <span class="text-bold ${g.direction === '收' ? 'text-accent' : 'text-danger'}">${g.direction === '收' ? '+' : '-'}¥${g.amount}</span>
            <span class="list-action" onclick="SavingsMod.delGift(${g.id})">✕</span>
          </div>
        </div>
      `).join('')}
    `;
  },

  addGift() {
    App.openModal(`
      <div class="modal-title">新增份子钱记录</div>
      <div class="form-group"><label class="form-label">方向</label><select id="gf-dir"><option>收</option><option>送</option></select></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">对象</label><input type="text" id="gf-person"></div>
        <div class="form-group"><label class="form-label">关系</label><input type="text" id="gf-relation" placeholder="如：同事、亲戚"></div>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">事由</label><input type="text" id="gf-event" placeholder="如：结婚、乔迁"></div>
        <div class="form-group"><label class="form-label">金额</label><input type="number" id="gf-amount" value="0"></div>
      </div>
      <div class="form-group"><label class="form-label">日期</label><input type="date" id="gf-date" value="${Utils.today()}"></div>
      <div class="form-group"><label class="form-label">回礼状态</label><select id="gf-return"><option>待回礼</option><option>已回礼</option><option>无需回礼</option></select></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="SavingsMod.saveGift()">${I18n.t('save')}</button></div>
    `);
  },

  saveGift() {
    Store.add('gift_money', {
      direction: document.getElementById('gf-dir').value,
      person: document.getElementById('gf-person').value,
      relation: document.getElementById('gf-relation').value,
      event: document.getElementById('gf-event').value,
      amount: +document.getElementById('gf-amount').value,
      date: document.getElementById('gf-date').value,
      returnStatus: document.getElementById('gf-return').value,
      returnDate: '', note: ''
    });
    App.closeModal(); App.showToast(I18n.t('added'), 'success'); App.render();
  },

  delGift(id) { App.confirm(I18n.t('confirmDelete'), () => { Store.remove('gift_money', id); App.render(); }); },

  /* ===== 储蓄目标 ===== */
  renderGoals() {
    const goals = Store.get('savings_goals');
    document.getElementById('savings-sub').innerHTML = `
      <div class="flex-between mb-12">
        <div class="subsection-title" style="margin:0;">储蓄目标</div>
        <button class="btn btn-primary btn-sm" onclick="SavingsMod.addGoal()">+ 新增目标</button>
      </div>
      ${goals.map(g => `
        <div class="card">
          <div class="flex-between mb-8"><span class="text-bold">${Utils.escape(g.name)}</span><span class="text-sm text-light">截止 ${g.deadline}</span></div>
          ${Charts.progress(g.current, g.target)}
          <div class="flex-between mt-8">
            <span class="text-sm text-light">¥${g.current} / ¥${g.target}</span>
            <button class="btn btn-outline btn-sm" onclick="SavingsMod.updateGoal(${g.id})">更新进度</button>
          </div>
        </div>
      `).join('') || '<div class="empty-state"><div class="empty-icon">🎯</div>暂无储蓄目标</div>'}
    `;
  },

  addGoal() {
    App.openModal(`
      <div class="modal-title">新增储蓄目标</div>
      <div class="form-group"><label class="form-label">目标名称</label><input type="text" id="sg-name" placeholder="如：年度旅行基金"></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">目标金额</label><input type="number" id="sg-target" value="10000"></div>
        <div class="form-group"><label class="form-label">已存</label><input type="number" id="sg-current" value="0"></div>
      </div>
      <div class="form-group"><label class="form-label">截止日期</label><input type="date" id="sg-deadline" value="${Utils.today()}"></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="SavingsMod.saveGoal()">${I18n.t('save')}</button></div>
    `);
  },

  saveGoal() {
    Store.add('savings_goals', {
      name: document.getElementById('sg-name').value,
      target: +document.getElementById('sg-target').value,
      current: +document.getElementById('sg-current').value,
      deadline: document.getElementById('sg-deadline').value
    });
    App.closeModal(); App.showToast(I18n.t('added'), 'success'); App.render();
  },

  updateGoal(id) {
    const g = Store.find('savings_goals', x => x.id === id);
    App.openModal(`
      <div class="modal-title">更新进度 — ${Utils.escape(g.name)}</div>
      <div class="form-group"><label class="form-label">已存金额</label><input type="number" id="sg-cur" value="${g.current}"></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="SavingsMod.saveGoalProgress(${id})">${I18n.t('save')}</button></div>
    `);
  },

  saveGoalProgress(id) {
    Store.update('savings_goals', id, { current: +document.getElementById('sg-cur').value });
    App.closeModal(); App.showToast(I18n.t('updated'), 'success'); App.render();
  },

  exportTxn() {
    App.exportModuleCSV('transactions', [
      { label: '类型', field: 'type' }, { label: '分类', field: 'category' },
      { label: '金额', field: 'amount' }, { label: '日期', field: 'date' },
      { label: '备注', field: 'note' }
    ]);
  }
};
