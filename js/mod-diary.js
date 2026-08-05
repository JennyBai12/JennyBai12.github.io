/* ===== 心情日记模块 ===== */
const DiaryMod = {
  filterTag: 'all',
  searchKw: '',
  _unlocked: false,          // 本次会话是否已解锁私密日记

  /* ===== 私密密码 ===== */
  hasPassword() { return !!Store.getSetting('diaryPassword', ''); },
  _hash(s) {
    // 轻量哈希（本地存储用，避免明文；非加密级安全）
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return 'h' + h.toString(36) + '-' + s.length;
  },

  render(c) {
    let entries = Store.get('diary').sort((a, b) => b.date.localeCompare(a.date));
    const allTags = [...new Set(entries.flatMap(e => (e.tags || '').split(',').filter(Boolean)))];

    const sealed = (e) => e.isPrivate && this.hasPassword() && !this._unlocked;
    if (this.filterTag !== 'all') entries = entries.filter(e => !sealed(e) && (e.tags || '').includes(this.filterTag));
    // 未解锁的私密日记不参与关键词检索，避免内容被间接暴露
    if (this.searchKw) entries = entries.filter(e => !sealed(e) && (e.content.includes(this.searchKw) || (e.tags || '').includes(this.searchKw)));

    const locked = (e) => e.isPrivate && !this._unlocked;
    const privateCount = Store.get('diary').filter(e => e.isPrivate).length;

    c.innerHTML = `
      <div class="flex-between mb-12">
        <div class="section-title" style="margin:0;">✏️ ${I18n.t('diary')}</div>
        <div class="flex gap-8">
          <button class="btn btn-outline btn-sm" onclick="DiaryMod.passwordSettings()">🔐 密码</button>
          <button class="btn btn-primary btn-sm" onclick="DiaryMod.add()">+ ${I18n.t('add')}</button>
        </div>
      </div>

      ${privateCount > 0 ? `
        <div class="card" style="padding:10px;">
          <div class="flex-between">
            <div class="text-sm text-light">🔒 共 ${privateCount} 篇私密日记 · ${this._unlocked ? '<span style="color:var(--accent);">已解锁</span>' : (this.hasPassword() ? '已加密' : '未设置密码，内容直接可见')}</div>
            ${this.hasPassword()
              ? (this._unlocked
                ? `<button class="btn btn-outline btn-sm" onclick="DiaryMod.lock()">重新上锁</button>`
                : `<button class="btn btn-primary btn-sm" onclick="DiaryMod.unlock()">输入密码查看</button>`)
              : `<button class="btn btn-outline btn-sm" onclick="DiaryMod.passwordSettings()">去设置密码</button>`}
          </div>
        </div>` : ''}

      <div class="search-box"><input type="text" placeholder="搜索正文、标签..." value="${Utils.escape(this.searchKw)}" oninput="DiaryMod.search(this.value)"></div>

      <div class="filter-bar">
        <div class="filter-tab ${this.filterTag === 'all' ? 'active' : ''}" onclick="DiaryMod.setFilter('all')">${I18n.t('all')}</div>
        ${allTags.map(t => `<div class="filter-tab ${this.filterTag === t ? 'active' : ''}" onclick="DiaryMod.setFilter('${t}')">${t}</div>`).join('')}
      </div>

      ${entries.map(e => {
        const isLocked = locked(e) && this.hasPassword();
        return `
        <div class="card">
          <div class="flex-between mb-8">
            <div class="flex-center gap-8">
              <span style="font-size:28px;">${e.mood}</span>
              <div>
                <div class="text-bold">${e.date}</div>
                <div class="text-sm text-light">${isLocked ? '' : (e.tags || '')}</div>
              </div>
            </div>
            <div class="flex gap-8">
              ${e.isPrivate ? '<span class="tag-small private-badge">🔒 ' + I18n.t('private') + '</span>' : ''}
              ${isLocked ? '' : `
                <button class="btn btn-cancel btn-sm" onclick="DiaryMod.edit(${e.id})">${I18n.t('edit')}</button>
                <button class="btn btn-cancel btn-sm" onclick="DiaryMod.del(${e.id})">✕</button>`}
            </div>
          </div>
          ${isLocked
            ? `<div class="flex-between" style="align-items:center;">
                 <div class="private-mask" style="font-size:14px;line-height:1.8;flex:1;">🔒 私密内容已加密 · 共 ${Utils.escape(String(e.content || '').length)} 字，输入密码后可见</div>
                 <button class="btn btn-outline btn-sm" style="flex-shrink:0;margin-left:10px;" onclick="DiaryMod.unlock()">🔓 解锁</button>
               </div>`
            : `<div style="font-size:14px;line-height:1.8;color:var(--text);">${Utils.escape(e.content)}</div>
               ${e.images && e.images.length > 0 ? `<div class="img-grid mt-12">${e.images.map(img => `<img class="img-thumb" src="${img}" onclick="App.openImageViewer('${img}')">`).join('')}</div>` : ''}`}
        </div>`;
      }).join('')}

      ${entries.length === 0 ? `<div class="empty-state"><div class="empty-icon">✏️</div>还没有日记记录</div>` : ''}
    `;
  },

  lock() { this._unlocked = false; App.showToast('已重新上锁', 'success'); App.render(); },

  unlock() {
    if (!this.hasPassword()) { this._unlocked = true; App.render(); return; }
    const hint = Store.getSetting('diaryPwHint', '');
    App.openModal(`
      <div class="lock-box">
        <div class="lock-icon">🔒</div>
        <div class="modal-title" style="margin:0;">私密日记已加密</div>
        <div class="lock-tip">请输入密码后查看</div>
        ${hint ? `<div class="lock-hint">💡 提示：${Utils.escape(hint)}</div>` : ''}
        <input type="password" id="lock-pwd" placeholder="请输入密码" style="text-align:center;letter-spacing:2px;" onkeydown="if(event.key==='Enter')DiaryMod.doUnlock()">
        <div id="lock-err" class="text-sm" style="color:#C08B7D;height:18px;margin-top:6px;"></div>
        <div class="lock-forgot" onclick="DiaryMod.recoverPassword()">忘记密码？</div>
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button>
        <button class="btn-confirm" onclick="DiaryMod.doUnlock()">解锁</button>
      </div>
    `);
    setTimeout(() => { const i = document.getElementById('lock-pwd'); if (i) i.focus(); }, 60);
  },

  doUnlock() {
    const v = (document.getElementById('lock-pwd').value || '').trim();
    const saved = Store.getSetting('diaryPassword', '');
    if (this._hash(v) === saved) {
      this._unlocked = true;
      App.closeModal(); App.showToast('已解锁', 'success'); App.render();
    } else {
      const err = document.getElementById('lock-err');
      if (err) err.textContent = '密码不正确，请重试';
      const i = document.getElementById('lock-pwd');
      if (i) { i.value = ''; i.focus(); }
    }
  },

  passwordSettings() {
    const has = this.hasPassword();
    const q = Store.getSetting('diaryPwQuestion', '');
    const hint = Store.getSetting('diaryPwHint', '');
    App.openModal(`
      <div class="modal-title">🔐 私密日记密码</div>
      <div class="text-sm text-light mb-8">${has ? '已设置密码。修改或清除密码需先验证原密码。' : '设置后，标记为「私密」的日记需输入密码才能查看。'}</div>
      ${has ? `<div class="form-group"><label class="form-label">原密码</label><input type="password" id="pw-old" placeholder="请输入原密码"></div>` : ''}
      <div class="form-group"><label class="form-label">${has ? '新密码' : '设置密码'}</label><input type="password" id="pw-new" placeholder="4-20 位，建议数字+字母"></div>
      <div class="form-group"><label class="form-label">确认密码</label><input type="password" id="pw-new2" placeholder="再次输入"></div>
      <div class="divider" style="margin:10px 0;"></div>
      <div class="text-bold text-sm mb-8">🔑 找回方式（忘记密码时使用）</div>
      <div class="form-group"><label class="form-label">找回问题</label><input type="text" id="pw-question" value="${Utils.escape(q)}" placeholder="如：我小学的名字是？"></div>
      <div class="form-group"><label class="form-label">找回答案</label><input type="text" id="pw-answer" placeholder="${has ? '留空表示不修改找回答案' : '设置一个只有你知道的答案'}"></div>
      <div class="form-group"><label class="form-label">密码提示（解锁时显示）</label><input type="text" id="pw-hint" value="${Utils.escape(hint)}" placeholder="如：生日+名字缩写"></div>
      <div id="pw-err" class="text-sm" style="color:#C08B7D;height:18px;"></div>
      <div class="text-sm text-light">提示：密码、找回答案与提示仅保存在本设备浏览器中。</div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button>
        ${has ? `<button class="btn btn-cancel btn-sm" onclick="DiaryMod.clearPassword()">清除密码</button>` : ''}
        <button class="btn-confirm" onclick="DiaryMod.savePassword()">${has ? '修改密码' : '设置密码'}</button>
      </div>
    `);
  },

  savePassword() {
    const err = (m) => { const e = document.getElementById('pw-err'); if (e) e.textContent = m; };
    const has = this.hasPassword();
    if (has) {
      const old = (document.getElementById('pw-old').value || '').trim();
      if (this._hash(old) !== Store.getSetting('diaryPassword', '')) { err('原密码不正确'); return; }
    }
    const a = (document.getElementById('pw-new').value || '').trim();
    const b = (document.getElementById('pw-new2').value || '').trim();
    if (a.length < 4 || a.length > 20) { err('密码长度需为 4-20 位'); return; }
    if (a !== b) { err('两次输入的密码不一致'); return; }
    Store.setSetting('diaryPassword', this._hash(a));
    // 找回方式 + 提示
    const question = (document.getElementById('pw-question').value || '').trim();
    const answer = (document.getElementById('pw-answer').value || '').trim();
    const hint = (document.getElementById('pw-hint').value || '').trim();
    Store.setSetting('diaryPwHint', hint);
    if (question) {
      Store.setSetting('diaryPwQuestion', question);
      if (answer) Store.setSetting('diaryPwAnswerHash', this._hash(answer.toLowerCase().trim()));
    } else {
      Store.setSetting('diaryPwQuestion', '');
      Store.setSetting('diaryPwAnswerHash', '');
    }
    this._unlocked = true;
    App.closeModal(); App.showToast('密码已保存', 'success'); App.render();
  },

  clearPassword() {
    const old = (document.getElementById('pw-old')?.value || '').trim();
    if (this._hash(old) !== Store.getSetting('diaryPassword', '')) {
      const e = document.getElementById('pw-err'); if (e) e.textContent = '清除密码需先输入正确的原密码';
      return;
    }
    App.confirm('清除后，所有私密日记将不再需要密码即可查看。确定继续吗？', () => {
      Store.setSetting('diaryPassword', '');
      Store.setSetting('diaryPwQuestion', '');
      Store.setSetting('diaryPwAnswerHash', '');
      Store.setSetting('diaryPwHint', '');
      DiaryMod._unlocked = true;
      App.closeModal(); App.showToast('密码已清除', 'success'); App.render();
    }, '清除密码');
  },

  /* ===== 找回密码 ===== */
  recoverPassword() {
    const question = Store.getSetting('diaryPwQuestion', '');
    const answerHash = Store.getSetting('diaryPwAnswerHash', '');
    if (!question || !answerHash) {
      App.openModal(`
        <div class="modal-title">🔑 找回密码</div>
        <div class="card" style="border-left:3px solid #E8A87C;">
          <div class="text-sm">你还没有设置「找回问题 / 答案」，无法通过此方式找回。</div>
          <div class="text-sm mt-8">若确实忘记密码，只能<span style="color:#C08B7D;">清除密码并解除所有私密日记的加密</span>（私密日记内容将变为公开可见）。</div>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" onclick="App.closeModal()">返回</button>
          <button class="btn-danger" onclick="DiaryMod.forceResetPassword()">清除密码并解锁</button>
        </div>
      `);
      return;
    }
    App.openModal(`
      <div class="modal-title">🔑 找回密码</div>
      <div class="form-group"><label class="form-label">问题</label><div class="text-bold">${Utils.escape(question)}</div></div>
      <div class="form-group"><label class="form-label">你的答案</label><input type="text" id="rec-answer" placeholder="请输入找回答案" onkeydown="if(event.key==='Enter')DiaryMod.doRecover()"></div>
      <div id="rec-err" class="text-sm" style="color:#C08B7D;height:18px;"></div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="App.closeModal()">取消</button>
        <button class="btn-confirm" onclick="DiaryMod.doRecover()">验证</button>
      </div>
    `);
    setTimeout(() => { const i = document.getElementById('rec-answer'); if (i) i.focus(); }, 60);
  },

  doRecover() {
    const ans = (document.getElementById('rec-answer').value || '').trim().toLowerCase();
    const answerHash = Store.getSetting('diaryPwAnswerHash', '');
    if (this._hash(ans) === answerHash) {
      this._unlocked = true;
      App.closeModal();
      App.showToast('验证成功，请重新设置密码', 'success');
      this.passwordSettings();
    } else {
      const e = document.getElementById('rec-err'); if (e) e.textContent = '答案不正确';
    }
  },

  forceResetPassword() {
    App.confirm('确认清除密码并解除所有私密日记加密？私密内容将变为公开可见，此操作不可撤销。', () => {
      Store.setSetting('diaryPassword', '');
      Store.setSetting('diaryPwQuestion', '');
      Store.setSetting('diaryPwAnswerHash', '');
      Store.setSetting('diaryPwHint', '');
      this._unlocked = true;
      App.closeModal(); App.showToast('已清除密码并解锁', 'success'); App.render();
    }, '清除并解锁');
  },

  search(kw) { this.searchKw = kw; App.render(); },

  setFilter(tag) { this.filterTag = tag; App.render(); },

  add() { this.edit(null); },

  edit(id) {
    const e = id ? Store.find('diary', d => d.id === id) : null;
    // 私密日记已加密且未解锁时，禁止直接编辑
    if (e && e.isPrivate && this.hasPassword() && !this._unlocked) { this.unlock(); return; }
    const moods = ['😊','😴','🤔','😢','😡','😰','🥰','😎','🤒','😤'];
    const tagHistory = this.tagPool();
    App.openModal(`
      <div class="modal-title">${id ? I18n.t('edit') : I18n.t('add')}日记</div>
      <div class="form-group"><label class="form-label">心情</label><div class="tag-pick" id="mood-pick">${moods.map((m, i) => `<span class="tag ${e && e.mood === m ? 'active' : i === 0 && !e ? 'active' : ''}" data-v="${m}">${m}</span>`).join('')}</div></div>
      <div class="form-group"><label class="form-label">正文 <span class="req">*</span></label><textarea id="diary-content" rows="5" placeholder="今天的心情...">${e ? Utils.escape(e.content) : ''}</textarea></div>
      <div class="form-group">
        <label class="form-label">标签（逗号分隔，输入即联想历史标签）</label>
        ${App.suggestInput({ id: 'diary-tags', value: e ? (e.tags || '') : '', placeholder: '如：工作,生活', className: '' })}
        ${tagHistory.length ? `<div class="tag-pick" style="margin-top:6px;">${tagHistory.slice(0, 10).map(t => `<span class="tag" onclick="DiaryMod.appendTag('${encodeURIComponent(t)}')">${Utils.escape(t)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="form-group"><label class="form-label">🔒 ${I18n.t('private')}模式</label><div class="tag-pick"><span class="tag ${e && e.isPrivate ? 'active' : ''}" id="diary-private" onclick="this.classList.toggle('active');DiaryMod.hintPassword(this)">仅本人可见</span></div><div id="diary-pw-hint" class="text-sm text-light"></div></div>
      <div class="form-group"><label class="form-label">${I18n.t('upload')}</label><div class="img-upload-area" onclick="DiaryMod.uploadImg()">📷 上传配图</div><div id="diary-imgs">${e && e.images && e.images.length > 0 ? App.renderImageGrid(e.images, 'diary') : ''}</div></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="DiaryMod.save(${id || 'null'})">${I18n.t('save')}</button></div>
    `);
    App.bindSuggest('diary-tags', tagHistory, { multi: true, historyKey: 'diaryTags' });
    this._images = (e && e.images) ? [...e.images] : [];
  },

  /* 历史标签池：输入记忆 + 已有日记中出现过的标签 */
  tagPool() {
    const fromHistory = Store.historyOf('diaryTags');
    const fromDiary = Store.get('diary').flatMap(d => (d.tags || '').split(/[,，]/).map(s => s.trim())).filter(Boolean);
    return [...new Set([...fromHistory, ...fromDiary])];
  },

  appendTag(encoded) {
    const t = decodeURIComponent(encoded);
    const input = document.getElementById('diary-tags');
    if (!input) return;
    const parts = String(input.value || '').split(/[,，]/).map(s => s.trim()).filter(Boolean);
    if (parts.includes(t)) return;
    parts.push(t);
    input.value = parts.join(',') + ',';
    input.focus();
  },

  hintPassword(el) {
    const hint = document.getElementById('diary-pw-hint');
    if (!hint) return;
    if (el.classList.contains('active') && !this.hasPassword()) {
      hint.innerHTML = '⚠️ 尚未设置查看密码，<span style="color:var(--accent);cursor:pointer;text-decoration:underline;" onclick="DiaryMod.passwordSettings()">点击设置</span>后私密日记才需要密码。';
    } else { hint.innerHTML = ''; }
  },

  _images: [],

  uploadImg() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      Utils.readFileAsDataURL(input.files[0], (url) => {
        DiaryMod._images.push(url);
        document.getElementById('diary-imgs').innerHTML = App.renderImageGrid(DiaryMod._images, 'diary');
      });
    };
    input.click();
  },

  save(id) {
    const content = document.getElementById('diary-content').value.trim();
    if (!content) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    const moodEl = document.querySelector('#mood-pick .tag.active');
    const mood = moodEl ? moodEl.dataset.v : '😊';
    const tags = document.getElementById('diary-tags').value.trim().replace(/[,，]\s*$/, '');
    const isPrivate = document.getElementById('diary-private').classList.contains('active');
    // 标签自动记忆，供下次模糊联想
    if (tags) Store.rememberInput('diaryTags', tags);

    if (id) {
      Store.update('diary', id, { mood, content, tags, isPrivate, images: this._images });
      Store.logChange('diary', '编辑', id, '编辑日记 ' + Utils.today());
    } else {
      const obj = Store.add('diary', { mood, content, tags, date: Utils.today(), images: this._images, isPrivate });
      Store.logChange('diary', '新增', obj.id, '新增日记 ' + Utils.today());
    }
    App.closeModal();
    App.showToast(I18n.t('saved'), 'success');
    App.render();
  },

  del(id) {
    App.confirm(I18n.t('confirmDelete'), () => {
      Store.remove('diary', id);
      App.showToast(I18n.t('deleted'));
      App.render();
    });
  }
};
