/* ===== 心情日记模块 ===== */
const DiaryMod = {
  filterTag: 'all',
  searchKw: '',

  render(c) {
    let entries = Store.get('diary').sort((a, b) => b.date.localeCompare(a.date));
    const allTags = [...new Set(entries.flatMap(e => (e.tags || '').split(',').filter(Boolean)))];

    if (this.filterTag !== 'all') entries = entries.filter(e => (e.tags || '').includes(this.filterTag));
    if (this.searchKw) entries = entries.filter(e => e.content.includes(this.searchKw) || (e.tags || '').includes(this.searchKw));

    c.innerHTML = `
      <div class="flex-between mb-12">
        <div class="section-title" style="margin:0;">✏️ ${I18n.t('diary')}</div>
        <button class="btn btn-primary btn-sm" onclick="DiaryMod.add()">+ ${I18n.t('add')}</button>
      </div>

      <div class="search-box"><input type="text" placeholder="搜索正文、标签..." value="${Utils.escape(this.searchKw)}" oninput="DiaryMod.search(this.value)"></div>

      <div class="filter-bar">
        <div class="filter-tab ${this.filterTag === 'all' ? 'active' : ''}" onclick="DiaryMod.setFilter('all')">${I18n.t('all')}</div>
        ${allTags.map(t => `<div class="filter-tab ${this.filterTag === t ? 'active' : ''}" onclick="DiaryMod.setFilter('${t}')">${t}</div>`).join('')}
      </div>

      ${entries.map(e => `
        <div class="card">
          <div class="flex-between mb-8">
            <div class="flex-center gap-8">
              <span style="font-size:28px;">${e.mood}</span>
              <div>
                <div class="text-bold">${e.date}</div>
                <div class="text-sm text-light">${e.tags || ''}</div>
              </div>
            </div>
            <div class="flex gap-8">
              ${e.isPrivate ? '<span class="tag-small">🔒 ' + I18n.t('private') + '</span>' : ''}
              <button class="btn btn-cancel btn-sm" onclick="DiaryMod.edit(${e.id})">${I18n.t('edit')}</button>
              <button class="btn btn-cancel btn-sm" onclick="DiaryMod.del(${e.id})">✕</button>
            </div>
          </div>
          <div style="font-size:14px;line-height:1.8;color:var(--text);">${Utils.escape(e.content)}</div>
          ${e.images && e.images.length > 0 ? `<div class="img-grid mt-12">${e.images.map(img => `<img class="img-thumb" src="${img}" onclick="App.openImageViewer('${img}')">`).join('')}</div>` : ''}
        </div>
      `).join('')}

      ${entries.length === 0 ? `<div class="empty-state"><div class="empty-icon">✏️</div>还没有日记记录</div>` : ''}
    `;
  },

  search(kw) { this.searchKw = kw; App.render(); },

  setFilter(tag) { this.filterTag = tag; App.render(); },

  add() { this.edit(null); },

  edit(id) {
    const e = id ? Store.find('diary', d => d.id === id) : null;
    const moods = ['😊','😴','🤔','😢','😡','😰','🥰','😎','🤒','😤'];
    App.openModal(`
      <div class="modal-title">${id ? I18n.t('edit') : I18n.t('add')}日记</div>
      <div class="form-group"><label class="form-label">心情</label><div class="tag-pick" id="mood-pick">${moods.map((m, i) => `<span class="tag ${e && e.mood === m ? 'active' : i === 0 && !e ? 'active' : ''}" data-v="${m}">${m}</span>`).join('')}</div></div>
      <div class="form-group"><label class="form-label">正文 <span class="req">*</span></label><textarea id="diary-content" rows="5" placeholder="今天的心情...">${e ? Utils.escape(e.content) : ''}</textarea></div>
      <div class="form-group"><label class="form-label">标签（逗号分隔）</label><input type="text" id="diary-tags" value="${e ? Utils.escape(e.tags || '') : ''}" placeholder="工作,生活"></div>
      <div class="form-group"><label class="form-label">🔒 ${I18n.t('private')}模式</label><div class="tag-pick"><span class="tag ${e && e.isPrivate ? 'active' : ''}" id="diary-private" onclick="this.classList.toggle('active')">仅本人可见</span></div></div>
      <div class="form-group"><label class="form-label">${I18n.t('upload')}</label><div class="img-upload-area" onclick="DiaryMod.uploadImg()">📷 上传配图</div><div id="diary-imgs">${e && e.images && e.images.length > 0 ? App.renderImageGrid(e.images, 'diary') : ''}</div></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="DiaryMod.save(${id || 'null'})">${I18n.t('save')}</button></div>
    `);
    this._images = (e && e.images) ? [...e.images] : [];
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
    const tags = document.getElementById('diary-tags').value.trim();
    const isPrivate = document.getElementById('diary-private').classList.contains('active');

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
