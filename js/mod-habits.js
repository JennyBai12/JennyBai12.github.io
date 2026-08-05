/* ===== 习惯养成模块 ===== */
const HabitsMod = {
  render(c) {
    const habits = Store.get('habits');
    const today = Utils.today();
    const todayLogs = Store.filter('habit_logs', l => l.date === today);
    const weekDays = Utils.last7Days();

    c.innerHTML = `
      <div class="flex-between mb-12">
        <div class="section-title" style="margin:0;">✅ ${I18n.t('habits')}</div>
        <button class="btn btn-primary btn-sm" onclick="HabitsMod.add()">+ ${I18n.t('add')}</button>
      </div>

      <div class="card">
        <div class="card-title">📅 近7日打卡</div>
        <div class="calendar">
          ${['一','二','三','四','五','六','日'].map(d => `<div class="cal-head">${d}</div>`).join('')}
          ${weekDays.map(d => {
            const count = Store.filter('habit_logs', l => l.date === d).length;
            const isToday = d === today;
            return `<div class="cal-day ${isToday ? 'today' : ''} ${count > 0 ? 'checked' : ''}">${d.slice(5)}</div>`;
          }).join('')}
        </div>
      </div>

      ${habits.map(h => {
        const logs = Store.filter('habit_logs', l => l.habitId === h.id);
        const checkedToday = todayLogs.some(l => l.habitId === h.id);
        const streak = this.calcStreak(logs);
        const weekCount = weekDays.filter(d => logs.some(l => l.date === d)).length;
        const monthCount = logs.filter(l => l.date.startsWith(today.slice(0, 7))).length;
        return `
          <div class="card">
            <div class="flex-between">
              <div class="flex-center gap-12">
                <span style="font-size:24px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:12px;background:${h.color || '#829E8E'}22;">${h.icon}</span>
                <div>
                  <div class="text-bold" style="font-size:16px;">${Utils.escape(h.name)}</div>
                  <div class="text-sm text-light">连续 ${streak} 天 · 本周 ${weekCount}/7 · 本月 ${monthCount}天</div>
                </div>
              </div>
              <div class="flex gap-8">
                <button class="btn ${checkedToday ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="HabitsMod.toggle(${h.id})" ${checkedToday ? 'disabled' : ''}>${checkedToday ? '✓ 已打卡' : '打卡'}</button>
                <button class="btn btn-outline btn-sm" onclick="HabitsMod.edit(${h.id})">✏️</button>
                <button class="btn btn-cancel btn-sm" onclick="HabitsMod.del(${h.id})">✕</button>
              </div>
            </div>
            <div class="mt-12">
              <div class="progress-bar"><div class="progress-fill" style="width:${weekCount / 7 * 100}%;background:${h.color || '#829E8E'};"></div></div>
              <div class="text-sm text-light text-center mt-8">本周完成率 ${Math.round(weekCount / 7 * 100)}%</div>
            </div>
          </div>`;
      }).join('')}

      ${habits.length === 0 ? `<div class="empty-state"><div class="empty-icon">✅</div>还没有习惯，点击右上角添加</div>` : ''}
    `;
  },

  calcStreak(logs) {
    if (logs.length === 0) return 0;
    const dates = logs.map(l => l.date).sort().reverse();
    let streak = 0;
    let checkDate = Utils.today();
    for (let d of dates) {
      if (d === checkDate) { streak++; checkDate = Utils.addDays(checkDate, -1); }
      else if (d === Utils.addDays(checkDate, -1)) { continue; }
      else break;
    }
    return streak;
  },

  toggle(id) {
    const today = Utils.today();
    const existing = Store.find('habit_logs', l => l.habitId === id && l.date === today);
    if (!existing) {
      Store.add('habit_logs', { habitId: id, date: today });
      Store.logChange('habits', '打卡', id, '习惯#' + id + '打卡 ' + today);
      App.showToast(I18n.t('added'), 'success');
    }
    App.render();
  },

  ICONS: ['🌅','📚','🏃','💧','🧘','🍎','💊','✍️','🎨','🎸','🛏️','🥗','🚶','🧴','🦷','🧹','💰','📷','🎧','🌱'],
  COLORS: ['#829E8E','#C08B7D','#8DA0B8','#B9A48C','#A89BB0','#7FA8A0','#D0A96B','#9BB07F'],

  add() { App.openModal(this.form(null)); this._bindIconEvents(); },

  edit(id) {
    const h = Store.find('habits', x => x.id === id);
    if (!h) return;
    App.openModal(this.form(h));
    this._bindIconEvents();
  },

  form(h) {
    const isEdit = !!h;
    const curIcon = isEdit ? h.icon : this.ICONS[0];
    const curColor = isEdit ? (h.color || this.COLORS[0]) : this.COLORS[0];
    const isCustomIcon = !this.ICONS.includes(curIcon);
    return `
      <div class="modal-title">${isEdit ? '✏️ 修改习惯' : '新增习惯'}</div>
      <div class="form-group"><label class="form-label">习惯名称 <span class="req">*</span></label><input type="text" id="habit-name" placeholder="如：早起" value="${isEdit ? Utils.escape(h.name || '') : ''}"></div>
      <div class="form-group">
        <label class="form-label">图标</label>
        <div class="icon-picker" id="habit-icons">
          ${this.ICONS.map(ic => `<span class="icon-opt${ic === curIcon ? ' active' : ''}" data-v="${ic}">${ic}</span>`).join('')}
        </div>
        <input type="text" id="habit-icon-custom" maxlength="4" placeholder="或直接输入自定义 emoji / 文字，如 🐣" value="${isCustomIcon ? Utils.escape(curIcon) : ''}" style="margin-top:6px;">
        <div class="text-sm text-light" style="margin-top:4px;">填写自定义内容后将优先使用自定义图标</div>
      </div>
      <div class="form-group">
        <label class="form-label">主题色</label>
        <div class="color-picker" id="habit-colors">
          ${this.COLORS.map(cl => `<span class="color-opt${cl === curColor ? ' active' : ''}" data-v="${cl}" style="background:${cl};"></span>`).join('')}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button>
        <button class="btn-confirm" onclick="HabitsMod.save(${isEdit ? h.id : 'null'})">${I18n.t('save')}</button>
      </div>`;
  },

  _bindIconEvents() {
    document.querySelectorAll('#habit-icons .icon-opt').forEach(el => {
      el.onclick = () => {
        document.querySelectorAll('#habit-icons .icon-opt').forEach(e => e.classList.remove('active'));
        el.classList.add('active');
        const custom = document.getElementById('habit-icon-custom');
        if (custom) custom.value = '';
      };
    });
    document.querySelectorAll('#habit-colors .color-opt').forEach(el => {
      el.onclick = () => {
        document.querySelectorAll('#habit-colors .color-opt').forEach(e => e.classList.remove('active'));
        el.classList.add('active');
      };
    });
  },

  save(id) {
    const name = document.getElementById('habit-name').value.trim();
    if (!name) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    const custom = (document.getElementById('habit-icon-custom').value || '').trim();
    const picked = document.querySelector('#habit-icons .icon-opt.active');
    const icon = custom || (picked ? picked.dataset.v : '⭐');
    const colorEl = document.querySelector('#habit-colors .color-opt.active');
    const color = colorEl ? colorEl.dataset.v : this.COLORS[0];
    if (id) {
      Store.update('habits', id, { name, icon, color });
      Store.logChange('habits', '修改', id, '修改习惯: ' + name);
      App.showToast(I18n.t('saved') || '已保存', 'success');
    } else {
      Store.add('habits', { name, icon, color, createdDate: Utils.today() });
      Store.logChange('habits', '新增', 0, '新增习惯: ' + name);
      App.showToast(I18n.t('added'), 'success');
    }
    App.closeModal();
    App.render();
  },

  del(id) {
    App.confirm(I18n.t('confirmDelete'), () => {
      Store.remove('habits', id);
      Store.get('habit_logs').filter(l => l.habitId === id).forEach(l => Store.remove('habit_logs', l.id));
      App.showToast(I18n.t('deleted'));
      App.render();
    });
  }
};
