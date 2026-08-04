/* ===== 重要时间节点提醒模块 ===== */
const RemindersMod = {
  render(c) {
    const reminders = Store.get('reminders').sort((a, b) => a.date.localeCompare(b.date));
    const holidays = Store.get('holidays').sort((a, b) => a.date.localeCompare(b.date));
    const today = Utils.today();
    const all = [
      ...reminders.map(r => ({ ...r, cat: 'reminder' })),
      ...holidays.map(h => ({ ...h, cat: 'holiday' })),
    ].map(r => ({ ...r, daysAway: Utils.daysBetween(today, r.date) })).sort((a, b) => a.daysAway - b.daysAway);

    c.innerHTML = `
      <div class="flex-between mb-12">
        <div class="section-title" style="margin:0;">⏰ ${I18n.t('reminders')}</div>
        <button class="btn btn-primary btn-sm" onclick="RemindersMod.add()">+ 新增提醒</button>
      </div>

      <div class="card">
        <div class="card-title">近30天节点</div>
        ${all.filter(r => r.daysAway >= 0 && r.daysAway <= 30).map(r => `
          <div class="list-item ${r.daysAway <= 3 ? 'idle' : ''}">
            <div class="list-icon">${r.cat === 'holiday' ? '🎉' : r.type === '生日' ? '🎂' : '📅'}</div>
            <div class="list-body">
              <div class="list-title">${Utils.escape(r.name)}</div>
              <div class="list-meta">${r.date} · ${r.daysAway === 0 ? '今天' : r.daysAway + '天后'}${r.lunar ? ' · 农历' : ''}${r.note ? ' · ' + Utils.escape(r.note) : ''}</div>
            </div>
            ${r.daysAway <= 3 ? '<span class="list-badge warn">临近</span>' : ''}
          </div>
        `).join('') || '<div class="text-light text-sm">近30天无提醒</div>'}
      </div>

      <div class="subsection-title">🎂 生日 / 纪念日</div>
      ${reminders.map(r => {
        const days = Utils.daysBetween(today, r.date);
        return `
        <div class="card">
          <div class="flex-between">
            <div>
              <div class="flex-center gap-8">
                <span class="text-bold">${r.type === '生日' ? '🎂' : '💕'} ${Utils.escape(r.name)}</span>
                ${r.lunar ? '<span class="tag-small">农历</span>' : ''}
              </div>
              <div class="text-sm text-light mt-8">${r.date} · ${days >= 0 ? days + '天后' : '已过'} · 提前${r.advanceDays}天提醒</div>
              ${r.note ? `<div class="text-sm text-light">${Utils.escape(r.note)}</div>` : ''}
            </div>
            <div class="flex gap-8">
              <button class="btn btn-outline btn-sm" onclick="RemindersMod.edit(${r.id})">${I18n.t('edit')}</button>
              <button class="btn btn-cancel btn-sm" onclick="RemindersMod.del(${r.id})">✕</button>
            </div>
          </div>
        </div>`;
      }).join('') || '<div class="empty-state"><div class="empty-icon">🎂</div>暂无提醒</div>'}

      <div class="subsection-title">🎉 法定节假日</div>
      ${holidays.map(h => {
        const days = Utils.daysBetween(today, h.date);
        return `
        <div class="list-item">
          <div class="list-icon">🎉</div>
          <div class="list-body"><div class="list-title">${Utils.escape(h.name)}</div><div class="list-meta">${h.date} · 放假${h.days}天 · ${days >= 0 ? days + '天后' : '已过'}</div></div>
        </div>`;
      }).join('')}
    `;
  },

  add() { this.edit(null); },

  edit(id) {
    const r = id ? Store.find('reminders', x => x.id === id) : null;
    App.openModal(`
      <div class="modal-title">${id ? I18n.t('edit') : '新增'}提醒</div>
      <div class="form-group"><label class="form-label">名称 <span class="req">*</span></label><input type="text" id="rm-name" value="${r ? Utils.escape(r.name) : ''}"></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">类型</label><select id="rm-type"><option>生日</option><option>纪念日</option><option>节假日</option><option>其他</option></select></div>
        <div class="form-group"><label class="form-label">提前提醒（天）</label><select id="rm-advance"><option value="1">1天</option><option value="3">3天</option><option value="7" selected>7天</option><option value="15">15天</option><option value="30">30天</option></select></div>
      </div>
      <div class="form-group"><label class="form-label">日期</label><input type="date" id="rm-date" value="${r ? r.date : Utils.today()}"></div>
      <div class="form-group"><label class="form-label">农历</label><div class="tag-pick"><span class="tag ${r && r.lunar ? 'active' : ''}" id="rm-lunar-tag" onclick="this.classList.toggle('active')">农历日期（自动换算公历）</span></div></div>
      <div class="form-group"><label class="form-label">备注</label><input type="text" id="rm-note" value="${r ? Utils.escape(r.note || '') : ''}" placeholder="如：农历八月初三"></div>
      <div class="text-sm text-light">农历生日将自动逐年换算当年公历日期。</div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="RemindersMod.save(${id || 'null'})">${I18n.t('save')}</button></div>
    `);
    if (r) { document.getElementById('rm-type').value = r.type; document.getElementById('rm-advance').value = r.advanceDays; }
  },

  save(id) {
    const name = document.getElementById('rm-name').value.trim();
    if (!name) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    const data = {
      name, type: document.getElementById('rm-type').value,
      date: document.getElementById('rm-date').value,
      advanceDays: +document.getElementById('rm-advance').value,
      lunar: document.getElementById('rm-lunar-tag').classList.contains('active'),
      note: document.getElementById('rm-note').value,
    };
    if (id) Store.update('reminders', id, data);
    else Store.add('reminders', data);
    Store.logChange('reminders', id ? '编辑' : '新增', id || 0, (id ? '编辑' : '新增') + '提醒: ' + name);
    App.closeModal(); App.showToast(I18n.t('saved'), 'success'); App.render();
  },

  del(id) {
    App.confirm(I18n.t('confirmDelete'), () => { Store.remove('reminders', id); App.render(); });
  }
};
