/* ===== 时间提醒模块（日历可视化中枢） ===== */
const CalendarMod = {
  _view: 'month',        // month | week | day
  _cursor: Utils.today(), // 锚定日期 'YYYY-MM-DD'
  _filter: 'all',        // all | work | health | life

  render(c) {
    if (this._view === 'week') this.renderWeek(c);
    else if (this._view === 'day') this.renderDay(c);
    else this.renderMonth(c);
  },

  _filterItems(items) {
    if (this._filter === 'all') return items;
    return items.filter(i => TaskAgg.CATEGORY[i.module] === this._filter);
  },

  _viewTabs() {
    const tabs = [['month', I18n.t('calMonth')], ['week', I18n.t('calWeek')], ['day', I18n.t('calDay')]];
    return `<div class="seg-tabs">${tabs.map(([v, l]) =>
      `<div class="seg-tab ${this._view === v ? 'active' : ''}" onclick="CalendarMod.setView('${v}')">${l}</div>`).join('')}</div>`;
  },

  _filterTabs() {
    const tabs = [['all', I18n.t('all')], ['work', I18n.t('calFilterWork')], ['health', I18n.t('calFilterHealth')], ['life', I18n.t('calFilterLife')]];
    return `<div class="filter-bar">${tabs.map(([v, l]) =>
      `<div class="filter-tab ${this._filter === v ? 'active' : ''}" onclick="CalendarMod.setFilter('${v}')">${l}</div>`).join('')}</div>`;
  },

  setView(v) { this._view = v; App.render(); },
  setFilter(f) { this._filter = f; App.render(); },

  move(delta) {
    if (this._view === 'month') {
      const [y, m, d] = this._cursor.split('-').map(Number);
      const nd = new Date(y, m - 1 + delta, 1);
      this._cursor = Utils.formatDate(nd);
    } else if (this._view === 'week') {
      this._cursor = Utils.addDays(this._cursor, 7 * delta);
    } else {
      this._cursor = Utils.addDays(this._cursor, delta);
    }
    App.render();
  },

  gotoToday() { this._cursor = Utils.today(); App.render(); },

  /* ===== 月视图 ===== */
  renderMonth(c) {
    const [y, m] = this._cursor.split('-').map(Number);
    const monthLabel = `${y}年${m}月`;
    const firstDay = new Date(y, m - 1, 1).getDay() || 7; // 周一=1
    const daysInMonth = new Date(y, m, 0).getDate();
    const today = Utils.today();
    const cells = [];
    // 上月补白
    for (let i = 1; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    c.innerHTML = `
      <div class="flex-between mb-12">
        <button class="btn btn-outline btn-sm" onclick="CalendarMod.move(-1)">◀</button>
        <div class="section-title" style="margin:0;">📅 ${monthLabel}</div>
        <button class="btn btn-outline btn-sm" onclick="CalendarMod.move(1)">▶</button>
      </div>
      <div class="flex-between mb-8">
        ${this._viewTabs()}
        <button class="btn btn-primary btn-sm" onclick="CalendarMod.gotoToday()">今天</button>
      </div>
      ${this._filterTabs()}
      <div class="cal-month">
        <div class="cal-month-head">${['一','二','三','四','五','六','日'].map(d => `<div class="cal-col-head">${d}</div>`).join('')}</div>
        ${weeks.map(week => `<div class="cal-week">${week.map(ds => this._monthCell(ds, today)).join('')}</div>`).join('')}
      </div>
      ${this._legend()}
    `;
  },

  _monthCell(ds, today) {
    if (!ds) return `<div class="cal-cell cal-empty"></div>`;
    const items = TaskAgg.dayItems(ds);
    const shown = this._filterItems(items);
    const marks = TaskAgg.dayMarks(shown);
    const isToday = ds === today;
    const dots = [];
    if (marks.red) dots.push('<span class="cal-dot" style="background:#e57373"></span>');
    if (marks.orange) dots.push('<span class="cal-dot" style="background:#FF9800"></span>');
    if (marks.green) dots.push('<span class="cal-dot" style="background:#66BB6A"></span>');
    if (marks.gray) dots.push('<span class="cal-dot" style="background:#9AA7A0"></span>');
    const count = shown.length;
    const badge = count > 4 ? `<span class="cal-count">${count}</span>` : '';
    return `<div class="cal-cell ${isToday ? 'cal-today' : ''}" onclick="CalendarMod.openDay('${ds}')">
      <div class="cal-cell-top"><span class="cal-date">${ds.slice(5)}</span>${badge}</div>
      <div class="cal-dots">${dots.join('') || '<span class="cal-dot cal-dot-empty"></span>'}</div>
    </div>`;
  },

  _legend() {
    return `<div class="cal-legend">
      <span><span class="cal-dot" style="background:#e57373"></span>高优/逾期</span>
      <span><span class="cal-dot" style="background:#FF9800"></span>体检复诊/重大截止</span>
      <span><span class="cal-dot" style="background:#66BB6A"></span>节假日/出行</span>
      <span><span class="cal-dot" style="background:#9AA7A0"></span>打卡/养护</span>
    </div>`;
  },

  /* ===== 周视图 ===== */
  renderWeek(c) {
    // 以周一为起点对齐 cursor
    const cur = new Date(this._cursor);
    const dow = cur.getDay() || 7;
    const monday = Utils.addDays(this._cursor, -(dow - 1));
    const today = Utils.today();
    const days = [];
    for (let i = 0; i < 7; i++) days.push(Utils.addDays(monday, i));

    c.innerHTML = `
      <div class="flex-between mb-12">
        <button class="btn btn-outline btn-sm" onclick="CalendarMod.move(-1)">◀</button>
        <div class="section-title" style="margin:0;">📅 ${monday.slice(5)} ~ ${days[6].slice(5)}</div>
        <button class="btn btn-outline btn-sm" onclick="CalendarMod.move(1)">▶</button>
      </div>
      <div class="flex-between mb-8">${this._viewTabs()}<button class="btn btn-primary btn-sm" onclick="CalendarMod.gotoToday()">今天</button></div>
      ${this._filterTabs()}
      <div class="cal-weekview">
        ${days.map(ds => {
          const items = TaskAgg.sortItems(this._filterItems(TaskAgg.dayItems(ds)));
          const gd = new Date(ds + 'T00:00:00').getDay();
          const wk = gd === 0 ? 6 : gd - 1;
          return `<div class="cal-wk-day ${ds === today ? 'cal-today' : ''}">
            <div class="cal-wk-head" onclick="CalendarMod.openDay('${ds}')">${ds.slice(5)} · ${['一','二','三','四','五','六','日'][wk]}</div>
            ${items.length ? items.slice(0, 6).map(i => `
              <div class="cal-wk-item ${i.done ? 'cal-wk-done' : ''}" style="border-left:3px solid ${i.color}" onclick="${i.actionModule ? `App.aggJump('${i.module}','${i.actionSub || ''}')` : ''}">
                ${Utils.escape(i.title)}${i.time ? ' · ' + i.time : ''}
              </div>`).join('') : '<div class="cal-wk-empty">—</div>'}
          </div>`;
        }).join('')}
      </div>
    `;
  },

  /* ===== 日视图 ===== */
  renderDay(c) {
    const ds = this._cursor;
    const today = Utils.today();
    const items = TaskAgg.sortItems(this._filterItems(TaskAgg.dayItems(ds)));
    const stats = TaskAgg.dayStats(ds);
    const filteredCount = items.length;

    c.innerHTML = `
      <div class="flex-between mb-12">
        <button class="btn btn-outline btn-sm" onclick="CalendarMod.move(-1)">◀</button>
        <div class="section-title" style="margin:0;">📅 ${ds}${ds === today ? ' · 今天' : ''}</div>
        <button class="btn btn-outline btn-sm" onclick="CalendarMod.move(1)">▶</button>
      </div>
      <div class="flex-between mb-8">${this._viewTabs()}<button class="btn btn-primary btn-sm" onclick="CalendarMod.gotoToday()">今天</button></div>
      ${this._filterTabs()}
      <div class="card mb-12">
        <div class="flex-around">
          <div class="text-center"><div class="text-bold" style="font-size:20px;">${stats.total}</div><div class="text-sm text-light">${I18n.t('todoTotal')}</div></div>
          <div class="text-center"><div class="text-bold" style="font-size:20px;color:#2e7d32;">${stats.done}</div><div class="text-sm text-light">${I18n.t('completed')}</div></div>
          <div class="text-center"><div class="text-bold" style="font-size:20px;color:#c62828;">${stats.incomplete}</div><div class="text-sm text-light">${I18n.t('incomplete')}</div></div>
          <div class="text-center"><div class="text-bold" style="font-size:20px;">${stats.rate}%</div><div class="text-sm text-light">${I18n.t('completionRate')}</div></div>
        </div>
      </div>
      ${filteredCount === 0 ? `<div class="empty-state"><div class="empty-icon">📭</div>${I18n.t('noData')}</div>` :
        items.map(i => App._renderAggItem(i)).join('')}
      <button class="btn btn-primary btn-block mt-12" onclick="CalendarMod.newTask('${ds}')">＋ ${I18n.t('calNewTask')}</button>
    `;
  },

  /* 点击日期 → 弹窗查看当日清单 + 新建 */
  openDay(ds) {
    this._cursor = ds;
    const items = TaskAgg.sortItems(TaskAgg.dayItems(ds));
    const html = `
      <div class="modal-title">📅 ${ds}</div>
      <div class="text-sm text-light mb-12">${I18n.t('todoTotal')} ${items.length} · ${items.filter(i => i.done).length} ${I18n.t('completed')} · ${items.filter(i => !i.done).length} ${I18n.t('incomplete')}</div>
      ${items.length ? items.map(i => App._renderAggItem(i)).join('') : `<div class="text-light text-sm mb-12">${I18n.t('noData')}</div>`}
      <div class="modal-actions">
        <button class="btn-cancel" onclick="App.closeModal()">${I18n.t('close')}</button>
        <button class="btn-confirm" onclick="App.closeModal();CalendarMod.newTask('${ds}')">＋ ${I18n.t('calNewTask')}</button>
      </div>
    `;
    App.openModal(html);
  },

  /* 新建任务（写入工作待办，截止=该日） */
  newTask(ds) {
    App.openModal(`
      <div class="modal-title">＋ ${I18n.t('calNewTask')} · ${ds}</div>
      <div class="form-group"><label class="form-label">${I18n.t('name')} <span class="req">*</span></label><input type="text" id="cal-task-title" placeholder="${I18n.t('content')}"></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">${I18n.t('status')}</label><select id="cal-task-status"><option>未开始</option><option>进行中</option></select></div>
        <div class="form-group"><label class="form-label">${I18n.t('priority')}</label><select id="cal-task-priority"><option>高</option><option selected>中</option><option>低</option></select></div>
      </div>
      <div class="form-group"><label class="form-label">${I18n.t('date')}</label><input type="date" id="cal-task-deadline" value="${ds}"></div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button>
        <button class="btn-confirm" onclick="CalendarMod.saveTask()">${I18n.t('save')}</button>
      </div>
    `);
  },

  saveTask() {
    const title = document.getElementById('cal-task-title').value.trim();
    if (!title) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    const deadline = document.getElementById('cal-task-deadline').value;
    const status = document.getElementById('cal-task-status').value;
    const priority = document.getElementById('cal-task-priority').value;
    const obj = {
      title, assignee: '', deadline, deadlineTime: '',
      group: '本周需完成', detail: '', priority, status,
      progressNote: '', images: [], fromMeeting: 0, createdAt: Utils.now(),
      isOverdue: false, overdueSince: '', reminded30: false, remindedExact: false, completedAt: '',
    };
    Store.add('todos', obj);
    Store.logChange('todos', '新增', 0, '日历新增待办: ' + title);
    // 同步到收件箱通知
    Store.add('inbox', { type: '工作提醒', source: 'work', title: '📌 新增待办：' + title, content: `截止 ${deadline}，优先级 ${priority}。`, date: Utils.now(), read: false, actionModule: 'work', actionSub: '', actionId: obj.id, auto: true });
    App.closeModal();
    App.showToast(I18n.t('added'), 'success');
    this._cursor = deadline || this._cursor;
    App.render();
  },
};
