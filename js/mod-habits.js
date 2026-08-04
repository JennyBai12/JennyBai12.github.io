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
                <span style="font-size:28px;">${h.icon}</span>
                <div>
                  <div class="text-bold" style="font-size:16px;">${Utils.escape(h.name)}</div>
                  <div class="text-sm text-light">连续 ${streak} 天 · 本周 ${weekCount}/7 · 本月 ${monthCount}天</div>
                </div>
              </div>
              <div class="flex gap-8">
                <button class="btn ${checkedToday ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="HabitsMod.toggle(${h.id})" ${checkedToday ? 'disabled' : ''}>${checkedToday ? '✓ 已打卡' : '打卡'}</button>
                <button class="btn btn-cancel btn-sm" onclick="HabitsMod.del(${h.id})">✕</button>
              </div>
            </div>
            <div class="mt-12">
              <div class="progress-bar"><div class="progress-fill" style="width:${weekCount / 7 * 100}%"></div></div>
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

  add() {
    const icons = ['🌅','📚','🏃','💧','🧘','🍎','💊','✍️','🎨','🎸'];
    App.openModal(`
      <div class="modal-title">新增习惯</div>
      <div class="form-group"><label class="form-label">习惯名称 <span class="req">*</span></label><input type="text" id="habit-name" placeholder="如：早起"></div>
      <div class="form-group"><label class="form-label">图标</label><div class="tag-pick">${icons.map((ic, i) => `<span class="tag ${i === 0 ? 'active' : ''}" onclick="document.querySelectorAll('.tag').forEach(e=>e.classList.remove('active'));this.classList.add('active');" data-v="${ic}">${ic}</span>`).join('')}</div></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="HabitsMod.save()">${I18n.t('save')}</button></div>
    `);
  },

  save() {
    const name = document.getElementById('habit-name').value.trim();
    if (!name) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    const icon = document.querySelector('.tag-pick .tag.active')?.dataset.v || '⭐';
    Store.add('habits', { name, icon, color: '#829E8E', createdDate: Utils.today() });
    Store.logChange('habits', '新增', 0, '新增习惯: ' + name);
    App.closeModal();
    App.showToast(I18n.t('added'), 'success');
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
