/* ===== 工作模块（待办清单 + 会议记录AI提取待办） ===== */
const WorkMod = {
  subTab: 'todos',
  _todoFilter: 'all',
  _reviewPeriod: 'week',

  render(c) {
    c.innerHTML = `
      <div class="section-title">💼 ${I18n.t('work')}</div>
      <div class="sub-tabs">
        <div class="sub-tab ${this.subTab === 'todos' ? 'active' : ''}" onclick="WorkMod.setSub('todos')">${I18n.t('workTodos')}</div>
        <div class="sub-tab ${this.subTab === 'meetings' ? 'active' : ''}" onclick="WorkMod.setSub('meetings')">${I18n.t('meetingRecords')}</div>
      </div>
      <div id="work-sub"></div>
    `;
    if (this.subTab === 'todos') this.renderTodos();
    else this.renderMeetings();
  },

  setSub(tab) { this.subTab = tab; App.render(); },

  /* ============================================== */
  /* ===== 工作待办清单（升级版） ===== */
  /* ============================================== */
  renderTodos() {
    // 检查并标记逾期
    this.checkOverdue();

    const allTodos = Store.get('todos');
    const statusFilter = this._todoFilter;
    let filtered = statusFilter === 'all' ? [...allTodos] : allTodos.filter(t => t.status === statusFilter);

    // 智能排序：逾期→截止时刻→优先级→创建时间
    filtered.sort((a, b) => this.smartSort(a, b));

    // 分组
    const dailyTodos = filtered.filter(t => t.group === '每日必完成');
    const weeklyTodos = filtered.filter(t => t.group === '本周需完成');
    const otherTodos = filtered.filter(t => !t.group);

    // 统计
    const totalCount = allTodos.length;
    const doneCount = allTodos.filter(t => t.status === '已完成').length;
    const overdueCount = allTodos.filter(t => t.isOverdue && t.status !== '已完成').length;
    const activeCount = totalCount - doneCount;

    document.getElementById('work-sub').innerHTML = `
      <div class="flex-between mb-12">
        <div class="subsection-title" style="margin:0;">${I18n.t('workTodos')}</div>
        <button class="btn btn-primary btn-sm" onclick="WorkMod.addTodo()">+ 新增待办</button>
      </div>

      <div class="dash-grid mb-12">
        <div class="dash-stat"><div class="dash-stat-num">${activeCount}</div><div class="dash-stat-label">待办中</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${doneCount}</div><div class="dash-stat-label">已完成</div></div>
        <div class="dash-stat" style="${overdueCount > 0 ? 'background:#fff3e0;' : ''}"><div class="dash-stat-num" style="${overdueCount > 0 ? 'color:#e65100;' : ''}">${overdueCount}</div><div class="dash-stat-label">逾期</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0}%</div><div class="dash-stat-label">完成率</div></div>
      </div>

      <div class="filter-bar">
        <div class="filter-tab ${statusFilter === 'all' ? 'active' : ''}" onclick="WorkMod.filterTodo('all')">全部</div>
        <div class="filter-tab ${statusFilter === '未开始' ? 'active' : ''}" onclick="WorkMod.filterTodo('未开始')">未开始</div>
        <div class="filter-tab ${statusFilter === '进行中' ? 'active' : ''}" onclick="WorkMod.filterTodo('进行中')">进行中</div>
        <div class="filter-tab ${statusFilter === '已完成' ? 'active' : ''}" onclick="WorkMod.filterTodo('已完成')">已完成</div>
        <div class="filter-tab ${statusFilter === '延期搁置' ? 'active' : ''}" onclick="WorkMod.filterTodo('延期搁置')">延期搁置</div>
      </div>

      <div class="flex gap-8 mt-8 mb-12">
        <button class="btn btn-outline btn-sm" onclick="WorkMod.showReview()">📊 复盘统计</button>
        <button class="btn btn-outline btn-sm" onclick="WorkMod.checkReminders()">⏰ 检查提醒</button>
        <button class="btn btn-outline btn-sm" onclick="WorkMod.exportWeekReport()">📄 导出周报</button>
      </div>

      ${this.renderTodoGroup('每日必完成', dailyTodos)}
      ${this.renderTodoGroup('本周需完成', weeklyTodos)}
      ${otherTodos.length > 0 ? this.renderTodoGroup('其他', otherTodos) : ''}
    `;
  },

  renderTodoGroup(groupName, todos) {
    if (todos.length === 0) return '';
    return `
      <div class="subsection-title mt-12">${groupName}（${todos.length}）</div>
      ${todos.map(t => this.renderTodoItem(t)).join('')}
    `;
  },

  renderTodoItem(t) {
    const isOverdue = t.isOverdue && t.status !== '已完成';
    const isDone = t.status === '已完成';
    const priorityColor = t.priority === '高' ? '#e65100' : t.priority === '中' ? '#829E8E' : '#bbb';
    const priorityBg = t.priority === '高' ? 'background:#fff3e0;border-left:3px solid #e65100;' : '';

    // 截止时间显示
    let deadlineDisplay = t.deadline || '无截止';
    if (t.deadline && t.deadlineTime) deadlineDisplay = `${t.deadline} ${t.deadlineTime}`;
    else if (t.deadline) deadlineDisplay = `${t.deadline} 24:00`;

    // 倒计时
    let countdown = '';
    if (!isDone && t.deadline) {
      const now = new Date();
      const deadlineStr = t.deadlineTime ? `${t.deadline}T${t.deadlineTime}:00` : `${t.deadline}T23:59:59`;
      const diff = new Date(deadlineStr) - now;
      if (diff < 0 && !isOverdue) {
        countdown = '已超时';
      } else if (diff < 0 && isOverdue) {
        const days = Math.floor(Math.abs(diff) / 86400000);
        const hours = Math.floor((Math.abs(diff) % 86400000) / 3600000);
        countdown = `逾期${days}天${hours}小时`;
      } else if (diff < 1800000) {
        countdown = `⏰ ${Math.floor(diff / 60000)}分钟后截止`;
      } else if (diff < 86400000) {
        countdown = `今日 ${Math.floor(diff / 3600000)}小时后`;
      } else {
        const days = Math.floor(diff / 86400000);
        countdown = `${days}天后`;
      }
    }

    return `
      <div class="card ${isDone ? 'archived' : ''} ${isOverdue ? 'idle' : ''}" style="${priorityBg}padding:12px;">
        <div class="flex-between mb-4">
          <div class="flex-center gap-8">
            <span style="width:8px;height:8px;border-radius:50%;background:${priorityColor};display:inline-block;"></span>
            <span class="text-bold ${isDone ? 'done' : ''}">${Utils.escape(t.title)}</span>
            ${isOverdue ? '<span class="tag-small" style="background:#e65100;color:white;">逾期</span>' : ''}
            ${t.fromMeeting ? '<span class="tag-small" style="background:#829E8E;color:white;">会议</span>' : ''}
          </div>
          <div class="flex gap-8">
            <button class="btn btn-outline btn-sm" onclick="WorkMod.editTodo(${t.id})">编辑</button>
            <button class="btn btn-cancel btn-sm" onclick="WorkMod.delTodo(${t.id})">✕</button>
          </div>
        </div>
        <div class="text-sm text-light">
          ${t.assignee ? `👤 ${Utils.escape(t.assignee)}` : ''} · 📅 ${deadlineDisplay} · ${t.status}
          ${countdown ? ` · <span style="${isOverdue ? 'color:#e65100;font-weight:bold;' : ''}">${countdown}</span>` : ''}
        </div>
        ${t.detail ? `<div class="text-sm text-light mt-4">${Utils.escape(t.detail)}</div>` : ''}
        ${t.progressNote ? `<div class="text-sm mt-4" style="color:#829E8E;">📝 ${Utils.escape(t.progressNote)}</div>` : ''}
        ${isOverdue && t.overdueSince ? `<div class="text-sm mt-4" style="color:#e65100;">⚠️ 自 ${t.overdueSince} 起逾期，高优先级每日提醒</div>` : ''}
        <div class="flex gap-8 mt-8">
          <select onchange="WorkMod.setTodoStatus(${t.id}, this.value)" style="width:auto;padding:4px 8px;font-size:12px;border:1px solid #A6B7A1;border-radius:6px;background:white;">
            <option ${t.status === '未开始' ? 'selected' : ''}>未开始</option>
            <option ${t.status === '进行中' ? 'selected' : ''}>进行中</option>
            <option ${t.status === '已完成' ? 'selected' : ''}>已完成</option>
            <option ${t.status === '延期搁置' ? 'selected' : ''}>延期搁置</option>
          </select>
          ${!isDone ? `<button class="btn btn-outline btn-sm" onclick="WorkMod.quickNote(${t.id})">备注</button>` : ''}
        </div>
      </div>
    `;
  },

  /* 智能排序：逾期→截止时刻→优先级→创建时间 */
  smartSort(a, b) {
    const pOrder = { '高': 0, '中': 1, '低': 2 };
    const aOverdue = a.isOverdue && a.status !== '已完成' ? 1 : 0;
    const bOverdue = b.isOverdue && b.status !== '已完成' ? 1 : 0;
    if (aOverdue !== bOverdue) return bOverdue - aOverdue;

    // 截止时刻
    const aDeadline = a.deadline ? (a.deadline + (a.deadlineTime || '24:00')) : '9999-99-9999:99';
    const bDeadline = b.deadline ? (b.deadline + (b.deadlineTime || '24:00')) : '9999-99-9999:99';
    if (aDeadline < bDeadline) return -1;
    if (aDeadline > bDeadline) return 1;

    // 优先级
    const ap = pOrder[a.priority] ?? 3;
    const bp = pOrder[b.priority] ?? 3;
    if (ap !== bp) return ap - bp;

    // 创建时间
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  },

  /* 检查逾期标记 */
  checkOverdue() {
    const now = new Date();
    const todayStr = Utils.today();
    let changed = false;
    Store.get('todos').forEach(t => {
      if (t.status === '已完成' || t.status === '延期搁置') return;
      if (!t.deadline) return;
      const deadlineStr = t.deadlineTime ? `${t.deadline}T${t.deadlineTime}:00` : `${t.deadline}T23:59:59`;
      const diff = new Date(deadlineStr) - now;
      if (diff < 0 && !t.isOverdue) {
        Store.update('todos', t.id, { isOverdue: true, overdueSince: todayStr });
        changed = true;
      }
    });
    return changed;
  },

  /* 检查提醒 */
  checkReminders() {
    const now = new Date();
    const reminders = [];
    Store.get('todos').forEach(t => {
      if (t.status === '已完成' || t.status === '延期搁置') return;
      if (!t.deadline) return;
      const deadlineStr = t.deadlineTime ? `${t.deadline}T${t.deadlineTime}:00` : `${t.deadline}T23:59:59`;
      const diff = new Date(deadlineStr) - now;
      if (diff > 0 && diff < 1800000) {
        reminders.push(`⏰ "${t.title}" 将在 ${Math.floor(diff / 60000)} 分钟后截止`);
      } else if (diff < 0 && t.isOverdue) {
        reminders.push(`⚠️ "${t.title}" 已逾期，请尽快处理`);
      }
    });
    if (reminders.length === 0) {
      App.showToast('当前无待处理提醒', 'success');
    } else {
      App.openModal(`
        <div class="modal-title">⏰ 提醒（${reminders.length}条）</div>
        ${reminders.map(r => `<div class="card" style="padding:10px;margin-bottom:8px;">${r}</div>`).join('')}
        <div class="modal-actions"><button class="btn-confirm" onclick="App.closeModal()">知道了</button></div>
      `);
    }
  },

  filterTodo(status) { this._todoFilter = status; App.render(); },

  setTodoStatus(id, status) {
    const updates = { status };
    if (status === '已完成') {
      updates.completedAt = Utils.now();
      updates.isOverdue = false;
      Store.logChange('work', '完成待办', id, '待办已完成');
    }
    if (status === '延期搁置') {
      updates.isOverdue = false;
    }
    Store.update('todos', id, updates);
    App.render();
  },

  quickNote(id) {
    const t = Store.find('todos', x => x.id === id);
    App.openModal(`
      <div class="modal-title">📝 进度备注</div>
      <div class="text-sm text-light mb-8">${Utils.escape(t.title)}</div>
      <div class="form-group"><textarea id="qn-note" rows="3" placeholder="添加进度备注...">${Utils.escape(t.progressNote || '')}</textarea></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="WorkMod.saveQuickNote(${id})">${I18n.t('save')}</button></div>
    `);
  },

  saveQuickNote(id) {
    const note = document.getElementById('qn-note').value.trim();
    Store.update('todos', id, { progressNote: note });
    App.closeModal(); App.showToast(I18n.t('saved'), 'success'); App.render();
  },

  addTodo() { this.editTodo(null); },

  editTodo(id) {
    const t = id ? Store.find('todos', x => x.id === id) : null;
    App.openModal(`
      <div class="modal-title">${id ? I18n.t('edit') : '新增'}待办</div>
      <div class="form-group"><label class="form-label">待办标题 <span class="req">*</span></label><input type="text" id="td-title" value="${t ? Utils.escape(t.title) : ''}"></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">责任人</label><input type="text" id="td-assignee" value="${t ? Utils.escape(t.assignee) : ''}"></div>
        <div class="form-group"><label class="form-label">分组</label><select id="td-group">
          <option value="每日必完成" ${t && t.group === '每日必完成' ? 'selected' : ''}>每日必完成</option>
          <option value="本周需完成" ${t && t.group === '本周需完成' ? 'selected' : !t ? 'selected' : ''}>本周需完成</option>
        </select></div>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">截止日期</label><input type="date" id="td-deadline" value="${t ? t.deadline : Utils.today()}"></div>
        <div class="form-group"><label class="form-label">截止时刻 <span class="text-light text-sm">（留空=当日24:00）</span></label><input type="time" id="td-deadlineTime" value="${t ? (t.deadlineTime || '') : ''}"></div>
      </div>
      <div class="form-group"><label class="form-label">优先级</label><select id="td-priority">
        <option value="高" ${t && t.priority === '高' ? 'selected' : ''}>高（橙红置顶）</option>
        <option value="中" ${t ? (t.priority === '中' ? 'selected' : '') : 'selected'}>中（常规）</option>
        <option value="低" ${t && t.priority === '低' ? 'selected' : ''}>低（仅到期提醒）</option>
      </select></div>
      <div class="form-group"><label class="form-label">详细要求</label><textarea id="td-detail" rows="3">${t ? Utils.escape(t.detail || '') : ''}</textarea></div>
      <div class="form-group"><label class="form-label">进度备注</label><textarea id="td-progress" rows="2">${t ? Utils.escape(t.progressNote || '') : ''}</textarea></div>
      <div class="text-sm text-light">⏰ 截止前30分钟自动弹窗前置提醒，截止时刻准时提醒。逾期任务每日持续提醒，高优先级加倍。</div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="WorkMod.saveTodo(${id || 'null'})">${I18n.t('save')}</button></div>
    `);
  },

  saveTodo(id) {
    const title = document.getElementById('td-title').value.trim();
    if (!title) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    const data = {
      title,
      assignee: document.getElementById('td-assignee').value,
      group: document.getElementById('td-group').value,
      deadline: document.getElementById('td-deadline').value,
      deadlineTime: document.getElementById('td-deadlineTime').value,
      priority: document.getElementById('td-priority').value,
      detail: document.getElementById('td-detail').value,
      progressNote: document.getElementById('td-progress').value,
    };
    if (id) {
      Store.update('todos', id, data);
      Store.logChange('work', '编辑待办', id, '编辑待办: ' + title);
    } else {
      Store.add('todos', { ...data, status: '未开始', images: [], fromMeeting: 0, createdAt: Utils.now(), isOverdue: false, overdueSince: '', reminded30: false, remindedExact: false, completedAt: '' });
    }
    App.closeModal(); App.showToast(I18n.t('saved'), 'success'); App.render();
  },

  delTodo(id) {
    App.confirm(I18n.t('confirmDelete'), () => { Store.remove('todos', id); App.render(); });
  },

  /* ===== 复盘统计 ===== */
  showReview() {
    const allTodos = Store.get('todos');
    const period = this._reviewPeriod;
    let startDate;
    if (period === 'day') startDate = Utils.today();
    else if (period === 'week') startDate = Utils.weekStart();
    else startDate = Utils.monthStart();

    const periodTodos = allTodos.filter(t => (t.createdAt || '').startsWith(startDate.slice(0, 7)) || (t.completedAt || '').startsWith(startDate.slice(0, 7)));
    const done = periodTodos.filter(t => t.status === '已完成');
    const overdue = periodTodos.filter(t => t.isOverdue);
    const highPriority = periodTodos.filter(t => t.priority === '高');
    const overtimeDone = done.filter(t => t.isOverdue && t.completedAt);

    // 按优先级统计
    const pStats = { '高': { total: 0, done: 0 }, '中': { total: 0, done: 0 }, '低': { total: 0, done: 0 } };
    periodTodos.forEach(t => {
      if (pStats[t.priority]) { pStats[t.priority].total++; if (t.status === '已完成') pStats[t.priority].done++; }
    });

    App.openModal(`
      <div class="modal-title">📊 复盘统计</div>
      <div class="filter-bar mb-12">
        <div class="filter-tab ${period === 'day' ? 'active' : ''}" onclick="WorkMod._reviewPeriod='day';WorkMod.showReview()">每日</div>
        <div class="filter-tab ${period === 'week' ? 'active' : ''}" onclick="WorkMod._reviewPeriod='week';WorkMod.showReview()">每周</div>
        <div class="filter-tab ${period === 'month' ? 'active' : ''}" onclick="WorkMod._reviewPeriod='month';WorkMod.showReview()">每月</div>
      </div>
      <div class="dash-grid mb-12">
        <div class="dash-stat"><div class="dash-stat-num">${periodTodos.length}</div><div class="dash-stat-label">总任务</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${done.length}</div><div class="dash-stat-label">已完成</div></div>
        <div class="dash-stat" style="${overdue.length > 0 ? 'background:#fff3e0;' : ''}"><div class="dash-stat-num" style="${overdue.length > 0 ? 'color:#e65100;' : ''}">${overdue.length}</div><div class="dash-stat-label">逾期</div></div>
        <div class="dash-stat" style="${overtimeDone.length > 0 ? 'background:#fff3e0;' : ''}"><div class="dash-stat-num" style="${overtimeDone.length > 0 ? 'color:#e65100;' : ''}">${overtimeDone.length}</div><div class="dash-stat-label">超时完成</div></div>
      </div>
      <div class="card">
        <div class="card-title">优先级完成情况</div>
        ${Object.entries(pStats).map(([p, s]) => `
          <div class="label-pair">
            <span class="lk">${p === '高' ? '🔴' : p === '中' ? '🟡' : '🟢'} ${p}优先级</span>
            <span class="vk">${s.done}/${s.total} ${s.total > 0 ? '(' + Math.round(s.done / s.total * 100) + '%)' : ''}</span>
          </div>
        `).join('')}
      </div>
      ${overtimeDone.length > 0 ? `
        <div class="card mt-8">
          <div class="card-title" style="color:#e65100;">⚠️ 超时完成任务（单独标注）</div>
          ${overtimeDone.map(t => `
            <div class="text-sm mb-4">• ${Utils.escape(t.title)} · 逾期自 ${t.overdueSince} · 完成于 ${(t.completedAt || '').slice(0, 16)}</div>
          `).join('')}
        </div>
      ` : ''}
      ${overdue.filter(t => t.status !== '已完成').length > 0 ? `
        <div class="card mt-8">
          <div class="card-title" style="color:#e65100;">⚠️ 当前逾期任务</div>
          ${overdue.filter(t => t.status !== '已完成').map(t => `
            <div class="text-sm mb-4">• ${Utils.escape(t.title)} · ${t.priority} · 逾期自 ${t.overdueSince}</div>
          `).join('')}
        </div>
      ` : ''}
      <div class="modal-actions"><button class="btn-confirm" onclick="App.closeModal()">关闭</button></div>
    `);
  },

  /* ===== 导出周报 ===== */
  exportWeekReport() {
    const allTodos = Store.get('todos');
    const weekStart = Utils.weekStart();
    const weekTodos = allTodos.filter(t => (t.createdAt || '').slice(0, 10) >= weekStart || (t.completedAt || '').slice(0, 10) >= weekStart);
    const done = weekTodos.filter(t => t.status === '已完成');
    const overdue = weekTodos.filter(t => t.isOverdue);
    const rows = [
      ['工作周报', ''],
      ['周期', weekStart + ' ~ ' + Utils.today()],
      [''],
      ['总任务数', weekTodos.length],
      ['已完成', done.length],
      ['逾期', overdue.length],
      ['完成率', weekTodos.length > 0 ? Math.round(done.length / weekTodos.length * 100) + '%' : '0%'],
      [''],
      ['标题', '责任人', '分组', '截止日期', '截止时刻', '优先级', '状态', '是否逾期', '逾期起始', '完成时间', '详细要求', '进度备注']
    ];
    weekTodos.forEach(t => {
      rows.push([t.title, t.assignee || '', t.group || '', t.deadline || '', t.deadlineTime || '', t.priority, t.status, t.isOverdue ? '是' : '否', t.overdueSince || '', (t.completedAt || '').slice(0, 16), t.detail || '', t.progressNote || '']);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    Utils.downloadCSV('工作周报_' + weekStart + '.csv', csv);
    App.showToast('周报已导出', 'success');
  },

  /* ============================================== */
  /* ===== 会议记录 ===== */
  /* ============================================== */
  renderMeetings() {
    const meetings = Store.get('meetings').sort((a, b) => b.date.localeCompare(a.date));
    document.getElementById('work-sub').innerHTML = `
      <div class="flex-between mb-12">
        <div class="subsection-title" style="margin:0;">${I18n.t('meetingRecords')}</div>
        <button class="btn btn-primary btn-sm" onclick="WorkMod.addMeeting()">+ 新增会议</button>
      </div>
      <div class="card"><div class="text-sm text-light">会议纪要定稿后永久存档。草稿关闭不存档。修改历史不存档，只保留最新版。</div></div>
      ${meetings.map(m => `
        <div class="card">
          <div class="flex-between mb-8">
            <div class="flex-center gap-8"><span class="text-bold">${Utils.escape(m.topic)}</span><span class="tag-small">${m.status}</span></div>
            <div class="flex gap-8">
              <button class="btn btn-primary btn-sm" onclick="WorkMod.aiExtract(${m.id})">🤖 解析待办</button>
              <button class="btn btn-outline btn-sm" onclick="WorkMod.editMeeting(${m.id})">${I18n.t('edit')}</button>
              <button class="btn btn-cancel btn-sm" onclick="WorkMod.delMeeting(${m.id})">✕</button>
            </div>
          </div>
          <div class="text-sm text-light">${m.date} · ${Utils.escape(m.attendees)} · ${Utils.escape(m.location)}</div>
          <div class="text-sm text-light mt-8">标签：${Utils.escape(m.tags)}</div>
          <div class="divider"></div>
          <div style="font-size:13px;line-height:1.8;white-space:pre-wrap;">${Utils.escape(m.content)}</div>
        </div>
      `).join('') || '<div class="empty-state"><div class="empty-icon">💼</div>暂无会议记录</div>'}
    `;
  },

  addMeeting() { this.editMeeting(null); },

  editMeeting(id) {
    const m = id ? Store.find('meetings', x => x.id === id) : null;
    App.openModal(`
      <div class="modal-title">${id ? I18n.t('edit') : '新增'}会议记录</div>
      <div class="form-group"><label class="form-label">会议主题 <span class="req">*</span></label><input type="text" id="mt-topic" value="${m ? Utils.escape(m.topic) : ''}"></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">开会时间</label><input type="date" id="mt-date" value="${m ? m.date : Utils.today()}"></div>
        <div class="form-group"><label class="form-label">会议地点</label><input type="text" id="mt-location" value="${m ? Utils.escape(m.location) : ''}"></div>
      </div>
      <div class="form-group"><label class="form-label">参会人员</label><input type="text" id="mt-attendees" value="${m ? Utils.escape(m.attendees) : ''}" placeholder="逗号分隔"></div>
      <div class="form-group"><label class="form-label">会议标签</label><input type="text" id="mt-tags" value="${m ? Utils.escape(m.tags) : ''}"></div>
      <div class="form-group"><label class="form-label">会议纪要</label><textarea id="mt-content" rows="8" placeholder="会议正文...">${m ? Utils.escape(m.content) : ''}</textarea></div>
      <div class="form-group">
        <label class="form-label">📷 图片转文字</label>
        <div class="img-upload-area" onclick="WorkMod.ocrMeeting()">上传会议白板/笔记照片</div>
        <div class="ocr-alt-row"><button type="button" class="btn-cancel btn-mini" onclick="WorkMod.pasteMeeting()">📋 粘贴文字</button></div>
        <div id="mt-ocr-area"></div>
      </div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="WorkMod.saveMeeting(${id || 'null'})">${I18n.t('save')}</button></div>
    `);
  },

  async pasteMeeting() {
    const ta = document.getElementById('mt-content');
    const area = document.getElementById('mt-ocr-area');
    if (!ta) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) throw new Error('empty');
      ta.value = (ta.value ? ta.value + '\n' : '') + text.trim();
      if (area) area.innerHTML = `<div class="ocr-result">✅ 已粘贴 ${text.trim().length} 个字符到纪要。</div>`;
      App.showToast('已粘贴', 'success');
    } catch (e) {
      ta.focus();
      if (area) area.innerHTML = '<div class="ocr-result">请在「会议纪要」框内长按选择「粘贴」（或按 Ctrl/⌘+V）。</div>';
    }
  },

  ocrMeeting() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      const f = input.files[0];
      if (!f) return;
      Utils.runOCR('mt-ocr-area', f, (text) => {
        const ta = document.getElementById('mt-content');
        if (ta) ta.value = (ta.value ? ta.value + '\n' : '') + text;
      }, { pasteHandler: 'WorkMod.pasteMeeting()' });
    };
    input.click();
  },

  saveMeeting(id) {
    const topic = document.getElementById('mt-topic').value.trim();
    if (!topic) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    const data = {
      topic, date: document.getElementById('mt-date').value,
      location: document.getElementById('mt-location').value,
      attendees: document.getElementById('mt-attendees').value,
      tags: document.getElementById('mt-tags').value,
      content: document.getElementById('mt-content').value,
      status: '定稿',
    };
    if (id) { Store.update('meetings', id, data); Store.logChange('work', '编辑会议', id, '编辑会议: ' + topic); }
    else { const obj = Store.add('meetings', { ...data, images: [] }); Store.logChange('work', '新增会议', obj.id, '新增会议: ' + topic); }
    App.closeModal(); App.showToast(I18n.t('saved'), 'success'); App.render();
  },

  delMeeting(id) {
    App.confirm(I18n.t('confirmDelete'), () => { Store.remove('meetings', id); App.render(); });
  },

  /* ===== AI提取待办 ===== */
  _extractedTodos: [],

  aiExtract(meetingId) {
    const meeting = Store.find('meetings', m => m.id === meetingId);
    App.openModal(`
      <div class="modal-title">🤖 AI提取待办事项</div>
      <div class="text-sm text-light mb-12">来源会议：${Utils.escape(meeting.topic)}</div>
      <div id="ai-extract-area"><div class="ocr-loading"><div class="ocr-spinner"></div>AI正在通读纪要并提取任务...</div></div>
    `);
    const todos = Utils.parseMeetingTodos(meeting.content);
    document.getElementById('ai-extract-area').innerHTML = `
      <div class="text-sm text-bold mb-12">✅ 识别到 ${todos.length} 条待办（基于纪要真实内容）：</div>
      ${todos.map((t, i) => `
        <div class="card" style="padding:10px;">
          <div class="flex-between mb-8">
            <div class="text-bold text-sm">${i + 1}. ${Utils.escape(t.title)}</div>
            <input type="checkbox" checked id="todo-check-${i}" style="width:auto;">
          </div>
          <div class="flex gap-8 mb-4">
            <select id="todo-group-${i}" style="width:auto;padding:4px 8px;font-size:12px;border:1px solid #A6B7A1;border-radius:6px;">
              <option value="每日必完成">每日必完成</option>
              <option value="本周需完成" selected>本周需完成</option>
            </select>
            <select id="todo-priority-${i}" style="width:auto;padding:4px 8px;font-size:12px;border:1px solid #A6B7A1;border-radius:6px;">
              <option value="高" ${t.priority === '高' ? 'selected' : ''}>高</option>
              <option value="中" ${t.priority === '中' ? 'selected' : ''}>中</option>
              <option value="低" ${t.priority === '低' ? 'selected' : ''}>低</option>
            </select>
          </div>
          <div class="text-sm text-light">责任人：${Utils.escape(t.assignee)} · 截止：${t.deadline || '未指定'} · 优先级：${t.priority}</div>
          <div class="text-sm text-light mt-8">${Utils.escape(t.detail)}</div>
        </div>
      `).join('')}
      <div class="text-sm text-light mt-12">可取消勾选不需要的待办，设置分组和优先级，确认后归入工作待办清单。</div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="WorkMod.confirmExtract(${meetingId})">确认归入待办</button></div>
    `;
    WorkMod._extractedTodos = todos;
  },

  confirmExtract(meetingId) {
    let count = 0;
    this._extractedTodos.forEach((t, i) => {
      const check = document.getElementById('todo-check-' + i);
      if (check && check.checked) {
        const group = document.getElementById('todo-group-' + i)?.value || '本周需完成';
        const priority = document.getElementById('todo-priority-' + i)?.value || t.priority;
        Store.add('todos', {
          ...t, group, priority,
          deadlineTime: '',
          progressNote: '', images: [], fromMeeting: meetingId,
          status: '未开始', createdAt: Utils.now(),
          isOverdue: false, overdueSince: '', reminded30: false, remindedExact: false, completedAt: ''
        });
        count++;
      }
    });
    Store.logChange('work', 'AI提取待办', meetingId, '从会议提取' + count + '条待办');
    App.closeModal(); App.showToast(`已添加 ${count} 条待办`, 'success');
    this.subTab = 'todos'; App.render();
  }
};
