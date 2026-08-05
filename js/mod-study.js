/* ===== 学习模块（含阅读子板块） ===== */
const MOVIE_GENRES = ['科幻', '悬疑', '喜剧', '爱情', '动作', '剧情', '动画', '恐怖', '惊悚', '犯罪', '奇幻', '武侠', '战争', '纪录', '家庭', '音乐', '体育', '传记', '冒险', '歌舞'];

const StudyMod = {
  subTab: 'records',
  /* 学习记录 / 阅读管理 的日期与时间段搜索状态 */
  recordsFrom: '', recordsTo: '', recordsQuick: 'all', recordsText: '',
  bookFrom: '', bookTo: '', bookQuick: 'all', bookStatusFilter: 'all',
  _bookBase: [],

  render(c) {
    c.innerHTML = `
      <div class="section-title">📚 ${I18n.t('study')}</div>
      <div class="sub-tabs">
        <div class="sub-tab ${this.subTab === 'records' ? 'active' : ''}" onclick="StudyMod.setSub('records')">学习记录</div>
        <div class="sub-tab ${this.subTab === 'reading' ? 'active' : ''}" onclick="StudyMod.setSub('reading')">阅读管理</div>
        <div class="sub-tab ${this.subTab === 'media' ? 'active' : ''}" onclick="StudyMod.setSub('media')">🎬 影音记录</div>
        <div class="sub-tab ${this.subTab === 'report' ? 'active' : ''}" onclick="StudyMod.setSub('report')">学情报告</div>
      </div>
      <div id="study-sub"></div>
    `;
    if (this.subTab === 'records') this.renderRecords();
    else if (this.subTab === 'reading') this.renderReading();
    else if (this.subTab === 'media') this.renderMedia();
    else this.renderReport();
  },

  setSub(tab) { this.subTab = tab; App.render(); },

  /* ===== 学习记录（含日期 / 时间段搜索） ===== */
  renderRecords() {
    const records = this._filterRecords(Store.get('study_records'))
      .sort((a, b) => b.date.localeCompare(a.date));
    const last7 = Utils.last7Days();
    const chartData = last7.map(d => {
      const total = Store.filter('study_records', r => r.date === d).reduce((s, r) => s + r.duration, 0);
      return { label: d.slice(5), value: total };
    });
    const hasFilter = this.recordsFrom || this.recordsTo || this.recordsText;

    document.getElementById('study-sub').innerHTML = `
      <div class="flex-between mb-12">
        <div class="subsection-title" style="margin:0;">学习记录</div>
        <button class="btn btn-primary btn-sm" onclick="StudyMod.addRecord()">+ 新增</button>
      </div>
      <div class="chart-box"><div class="chart-title">近7天学习时长（分钟）</div>${Charts.line(chartData)}</div>

      <div class="filter-bar">
        <div class="filter-tab ${this.recordsQuick==='all'?'active':''}" onclick="StudyMod.setRecordsQuick('all')">全部</div>
        <div class="filter-tab ${this.recordsQuick==='7'?'active':''}" onclick="StudyMod.setRecordsQuick('7')">近7天</div>
        <div class="filter-tab ${this.recordsQuick==='30'?'active':''}" onclick="StudyMod.setRecordsQuick('30')">近30天</div>
        <div class="filter-tab ${this.recordsQuick==='year'?'active':''}" onclick="StudyMod.setRecordsQuick('year')">今年</div>
      </div>
      <div class="search-bar">
        <input type="text" class="search-input" placeholder="搜索内容 / 类型..." value="${Utils.escape(this.recordsText)}" oninput="StudyMod.onRecordsText(this.value)">
        <div class="date-range">
          <input type="date" class="date-input" value="${this.recordsFrom}" onchange="StudyMod.setRecordsFrom(this.value)" title="开始日期">
          <span class="date-sep">~</span>
          <input type="date" class="date-input" value="${this.recordsTo}" onchange="StudyMod.setRecordsTo(this.value)" title="结束日期">
        </div>
      </div>
      ${hasFilter ? `<div class="filter-tip">已筛选 ${records.length} 条${this.recordsFrom?' · 起 '+this.recordsFrom:''}${this.recordsTo?' · 止 '+this.recordsTo:''}${this.recordsText?' · 含「'+Utils.escape(this.recordsText)+'」':''} <span class="link-reset" onclick="StudyMod.resetRecordsFilter()">清除</span></div>` : ''}

      <div id="records-list">
        ${this.renderRecordsList(records)}
      </div>
    `;
  },

  _filterRecords(list) {
    const q = (this.recordsText || '').trim().toLowerCase();
    return list.filter(r => {
      if (q && !((r.content||'').toLowerCase().includes(q) || (r.type||'').toLowerCase().includes(q) || (r.note||'').toLowerCase().includes(q))) return false;
      if (this.recordsFrom && (r.date||'') < this.recordsFrom) return false;
      if (this.recordsTo && (r.date||'') > this.recordsTo) return false;
      return true;
    });
  },

  onRecordsText(v) {
    this.recordsText = v; this.recordsQuick = '';
    const el = document.getElementById('records-list');
    if (el) el.innerHTML = this.renderRecordsList(this._filterRecords(Store.get('study_records')).sort((a, b) => b.date.localeCompare(a.date)));
  },

  renderRecordsList(records) {
    if (!records.length) return '<div class="empty-state"><div class="empty-icon">📚</div>暂无学习记录</div>';
    return records.map(r => `
      <div class="list-item">
        <div class="list-icon">📖</div>
        <div class="list-body"><div class="list-title">${Utils.escape(r.content)}</div><div class="list-meta">${r.type} · ${r.duration}分钟 · ${r.date}${r.note ? ' · ' + Utils.escape(r.note) : ''}</div></div>
        <span class="list-action" onclick="StudyMod.delRecord(${r.id})">✕</span>
      </div>
    `).join('');
  },

  setRecordsQuick(q) {
    this.recordsQuick = q; this.recordsText = '';
    if (q === 'all') { this.recordsFrom = ''; this.recordsTo = ''; }
    else if (q === '7') { this.recordsFrom = Utils.addDays(Utils.today(), -6); this.recordsTo = Utils.today(); }
    else if (q === '30') { this.recordsFrom = Utils.addDays(Utils.today(), -29); this.recordsTo = Utils.today(); }
    else if (q === 'year') { this.recordsFrom = Utils.yearStart(); this.recordsTo = ''; }
    App.render();
  },
  setRecordsFrom(v) { this.recordsFrom = v; this.recordsQuick = ''; App.render(); },
  setRecordsTo(v) { this.recordsTo = v; this.recordsQuick = ''; App.render(); },
  resetRecordsFilter() { this.recordsText = ''; this.recordsFrom = ''; this.recordsTo = ''; this.recordsQuick = 'all'; App.render(); },


  addRecord() {
    App.openModal(`
      <div class="modal-title">新增学习记录</div>
      <div class="form-group"><label class="form-label">学习内容 <span class="req">*</span></label><input type="text" id="sr-content" placeholder="如：Python数据结构"></div>
      <div class="form-group"><label class="form-label">类型</label><select id="sr-type"><option>编程</option><option>语言</option><option>阅读</option><option>网课</option><option>刷题</option><option>其他</option></select></div>
      <div class="form-group"><label class="form-label">时长（分钟）</label><input type="number" id="sr-duration" value="60"></div>
      <div class="form-group"><label class="form-label">日期</label><input type="date" id="sr-date" value="${Utils.today()}"></div>
      <div class="form-group"><label class="form-label">备注</label><textarea id="sr-note" rows="2"></textarea></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="StudyMod.saveRecord()">${I18n.t('save')}</button></div>
    `);
  },

  saveRecord() {
    const content = document.getElementById('sr-content').value.trim();
    if (!content) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    Store.add('study_records', {
      content, type: document.getElementById('sr-type').value,
      duration: +document.getElementById('sr-duration').value || 0,
      date: document.getElementById('sr-date').value,
      note: document.getElementById('sr-note').value.trim()
    });
    App.closeModal(); App.showToast(I18n.t('added'), 'success'); App.render();
  },

  delRecord(id) {
    App.confirm(I18n.t('confirmDelete'), () => { Store.remove('study_records', id); App.render(); });
  },

  /* ===== 阅读管理 ===== */
  renderReading() {
    let books = Store.get('books');
    if (this.bookFrom) books = books.filter(b => (b.startDate||'') && (b.startDate||'') >= this.bookFrom);
    if (this.bookTo) books = books.filter(b => (b.startDate||'') && (b.startDate||'') <= this.bookTo);
    this._bookBase = books;
    const plan = Store.get('annual_reading_plans').find(p => p.year === new Date().getFullYear());
    const finished = books.filter(b => b.status === '已读完').length;
    const reading = books.filter(b => b.status === '在读').length;
    const pending = books.filter(b => b.status === '待阅读').length;
    const goalGap = plan ? Math.max(0, plan.totalGoal - finished) : 0;

    document.getElementById('study-sub').innerHTML = `
      ${plan ? `
      <div class="card card-accent">
        <div class="card-title" style="color:#fff;">📅 ${new Date().getFullYear()}年度阅读计划</div>
        <div class="flex-between" style="color:#fff;">
          <div class="text-center"><div class="text-bold" style="font-size:24px;">${finished}</div><div style="font-size:11px;opacity:0.8;">已读</div></div>
          <div class="text-center"><div class="text-bold" style="font-size:24px;">${reading}</div><div style="font-size:11px;opacity:0.8;">在读</div></div>
          <div class="text-center"><div class="text-bold" style="font-size:24px;">${pending}</div><div style="font-size:11px;opacity:0.8;">待读</div></div>
          <div class="text-center"><div class="text-bold" style="font-size:24px;">${goalGap}</div><div style="font-size:11px;opacity:0.8;">缺口</div></div>
        </div>
        <div class="mt-12">${Charts.progress(finished, plan.totalGoal)}</div>
      </div>` : ''}

      <div class="flex-between mb-12 mt-16">
        <div class="subsection-title" style="margin:0;">书库</div>
        <div class="flex gap-8">
          <button class="btn btn-outline btn-sm" onclick="StudyMod.editPlan()">年度计划</button>
          <button class="btn btn-primary btn-sm" onclick="StudyMod.addBook()">+ 添加</button>
        </div>
      </div>

      <div class="filter-bar">
        <div class="filter-tab ${this.bookQuick==='all'?'active':''}" onclick="StudyMod.setBookQuick('all')">全部时间</div>
        <div class="filter-tab ${this.bookQuick==='7'?'active':''}" onclick="StudyMod.setBookQuick('7')">近7天</div>
        <div class="filter-tab ${this.bookQuick==='30'?'active':''}" onclick="StudyMod.setBookQuick('30')">近30天</div>
        <div class="filter-tab ${this.bookQuick==='year'?'active':''}" onclick="StudyMod.setBookQuick('year')">今年</div>
      </div>
      <div class="search-bar mb-12">
        <div class="date-range">
          <input type="date" class="date-input" value="${this.bookFrom}" onchange="StudyMod.setBookFrom(this.value)" title="开始日期">
          <span class="date-sep">~</span>
          <input type="date" class="date-input" value="${this.bookTo}" onchange="StudyMod.setBookTo(this.value)" title="结束日期">
        </div>
        ${(this.bookFrom||this.bookTo) ? `<span class="link-reset" onclick="StudyMod.resetBookFilter()">清除</span>` : ''}
      </div>

      <div class="filter-bar" id="book-status-bar">
        <div class="filter-tab ${this.bookStatusFilter==='all'?'active':''}" onclick="StudyMod.filterBooks('all')">全部</div>
        <div class="filter-tab ${this.bookStatusFilter==='待阅读'?'active':''}" onclick="StudyMod.filterBooks('待阅读')">待阅读</div>
        <div class="filter-tab ${this.bookStatusFilter==='在读'?'active':''}" onclick="StudyMod.filterBooks('在读')">在读</div>
        <div class="filter-tab ${this.bookStatusFilter==='已读完'?'active':''}" onclick="StudyMod.filterBooks('已读完')">已读完</div>
        <div class="filter-tab ${this.bookStatusFilter==='弃读'?'active':''}" onclick="StudyMod.filterBooks('弃读')">弃读</div>
      </div>

      <div id="book-list">${this.renderBookList(books)}</div>
    `;
  },

  renderBookList(books) {
    return books.map(b => `
      <div class="card">
        <div class="flex-between">
          <div class="flex-1">
            <div class="flex-center gap-8">
              <span class="text-bold" style="font-size:16px;">${Utils.escape(b.title)}</span>
              <span class="tag-small">${b.status}</span>
              ${b.rating > 0 ? '<span class="text-sm">⭐'.repeat(b.rating) + '</span>' : ''}
            </div>
            <div class="text-sm text-light mt-8">${Utils.escape(b.author)} · ${Utils.escape(b.category)}</div>
            ${b.startDate ? `<div class="text-sm text-light">开始：${b.startDate}${b.endDate ? ' · 读完：' + b.endDate : ''}</div>` : ''}
          </div>
          <div class="flex gap-8">
            <button class="btn btn-outline btn-sm" onclick="StudyMod.bookDetail(${b.id})">详情</button>
            <button class="btn btn-outline btn-sm" onclick="StudyMod.editBook(${b.id})">编辑</button>
            <button class="btn btn-cancel btn-sm" onclick="StudyMod.delBook(${b.id})">✕</button>
          </div>
        </div>
        <div class="mt-12">
          <div class="progress-bar"><div class="progress-fill" style="width:${b.progress}%"></div></div>
          <div class="text-sm text-light text-center mt-8">阅读进度 ${b.progress}%</div>
        </div>
      </div>
    `).join('') || '<div class="empty-state"><div class="empty-icon">📚</div>书库空空如也</div>';
  },

  filterBooks(status) {
    this.bookStatusFilter = status;
    const base = this._bookBase || Store.get('books');
    const books = status === 'all' ? base : base.filter(b => b.status === status);
    document.getElementById('book-list').innerHTML = this.renderBookList(books);
    document.querySelectorAll('#book-status-bar .filter-tab').forEach(t => {
      const label = t.textContent.trim();
      if ((status === 'all' && label === '全部') || label === status) t.classList.add('active');
      else t.classList.remove('active');
    });
  },

  setBookQuick(q) {
    this.bookQuick = q; this.bookFrom = ''; this.bookTo = '';
    if (q === '7') { this.bookFrom = Utils.addDays(Utils.today(), -6); this.bookTo = Utils.today(); }
    else if (q === '30') { this.bookFrom = Utils.addDays(Utils.today(), -29); this.bookTo = Utils.today(); }
    else if (q === 'year') { this.bookFrom = Utils.yearStart(); this.bookTo = ''; }
    App.render();
  },
  setBookFrom(v) { this.bookFrom = v; this.bookQuick = ''; App.render(); },
  setBookTo(v) { this.bookTo = v; this.bookQuick = ''; App.render(); },
  resetBookFilter() { this.bookFrom = ''; this.bookTo = ''; this.bookQuick = 'all'; this.bookStatusFilter = 'all'; App.render(); },

  bookDetail(id) {
    const book = Store.find('books', b => b.id === id);
    const excerpts = Store.filter('book_excerpts', e => e.bookId === id);
    const reviews = Store.filter('book_reviews', r => r.bookId === id);
    App.openModal(`
      <div class="modal-title">📖 ${Utils.escape(book.title)}</div>
      <div class="label-pair"><span class="lk">作者</span><span class="vk">${Utils.escape(book.author)}</span></div>
      <div class="label-pair"><span class="lk">分类</span><span class="vk">${Utils.escape(book.category)}</span></div>
      <div class="label-pair"><span class="lk">状态</span><span class="vk">${book.status}</span></div>
      <div class="label-pair"><span class="lk">进度</span><span class="vk">${book.progress}%</span></div>
      <div class="divider"></div>
      <div class="flex-between mb-8"><div class="subsection-title" style="margin:0;">摘抄 (${excerpts.length})</div><button class="btn btn-outline btn-sm" onclick="StudyMod.addExcerpt(${id})">+ 摘抄</button></div>
      ${excerpts.map(e => `
        <div class="card" style="padding:10px;">
          <div style="font-size:14px;">"${Utils.escape(e.text)}"</div>
          ${e.annotation ? `<div class="text-sm text-light mt-8">批注：${Utils.escape(e.annotation)}</div>` : ''}
          <div class="flex-between mt-8">
            <span class="text-sm text-light">${e.date}</span>
            <span class="flex gap-8">
              <button class="btn btn-outline btn-sm" onclick="StudyMod.editExcerpt(${e.id})">修改</button>
              <button class="btn btn-cancel btn-sm" onclick="StudyMod.delExcerpt(${e.id})">删除</button>
            </span>
          </div>
        </div>
      `).join('') || '<div class="text-light text-sm">暂无摘抄</div>'}
      <div class="divider"></div>
      <div class="flex-between mb-8"><div class="subsection-title" style="margin:0;">读后感 (${reviews.length})</div><button class="btn btn-outline btn-sm" onclick="StudyMod.addReview(${id})">+ 读后感</button></div>
      ${reviews.map(r => `
        <div class="card" style="padding:10px;">
          <div class="text-bold">${Utils.escape(r.title)}</div>
          <div class="text-sm mt-8" style="white-space:pre-wrap;">${Utils.escape(r.content)}</div>
          ${r.tags ? `<div class="mt-8">${String(r.tags).split(/[,，]/).filter(Boolean).map(t => `<span class="tag-small">${Utils.escape(t.trim())}</span>`).join(' ')}</div>` : ''}
          <div class="flex-between mt-8">
            <span class="text-sm text-light">${'⭐'.repeat(r.rating || 0)} · ${r.date}</span>
            <span class="flex gap-8">
              <button class="btn btn-outline btn-sm" onclick="StudyMod.editReview(${r.id})">修改</button>
              <button class="btn btn-cancel btn-sm" onclick="StudyMod.delReview(${r.id})">删除</button>
            </span>
          </div>
        </div>
      `).join('') || '<div class="text-light text-sm">暂无读后感</div>'}
      <div class="modal-actions"><button class="btn btn-outline btn-sm" onclick="App.closeModal();StudyMod.editBook(${id})">编辑书籍</button><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('close')}</button></div>
    `);
  },

  addBook(editId) {
    const ed = editId ? Store.find('books', b => b.id === editId) : null;
    App.openModal(`
      <div class="modal-title">${ed ? '编辑书籍' : '添加书籍'}</div>
      <div class="form-group"><label class="form-label">书名 <span class="req">*</span></label><input type="text" id="bk-title" value="${Utils.escape(ed ? ed.title : '')}"></div>
      <div class="form-group"><label class="form-label">作者</label><input type="text" id="bk-author" value="${Utils.escape(ed ? ed.author : '')}"></div>
      <div class="form-group"><label class="form-label">${I18n.t('bookCategory')}（可多选标签，已自动记忆）</label>${App.suggestInput({ id: 'bk-category', value: ed ? ed.category : '', placeholder: '输入即联想历史分类，可多选，逗号分隔', className: '' })}</div>
      <div class="form-group"><label class="form-label">状态</label><select id="bk-status"><option${ed && ed.status === '待阅读' ? ' selected' : ''}>待阅读</option><option${ed && ed.status === '在读' ? ' selected' : ''}>在读</option><option${ed && ed.status === '已读完' ? ' selected' : ''}>已读完</option><option${ed && ed.status === '弃读' ? ' selected' : ''}>弃读</option></select></div>
      <div class="form-group"><label class="form-label">开始日期</label><input type="date" id="bk-start" value="${ed ? ed.startDate : Utils.today()}"></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="StudyMod.saveBook(${ed ? ed.id : 'null'})">${I18n.t('save')}</button></div>
    `);
    if (ed && ed.category) {
      const g = document.getElementById('bk-category');
      if (g) { g.value = ed.category; App.bindSuggest('bk-category', Store.historyOf('bookCategories'), { multi: true, historyKey: 'bookCategories' }); }
    } else {
      App.bindSuggest('bk-category', Store.historyOf('bookCategories'), { multi: true, historyKey: 'bookCategories' });
    }
    App.ensureDraft('book',
      () => ({
        title: document.getElementById('bk-title')?.value || '',
        author: document.getElementById('bk-author')?.value || '',
        category: document.getElementById('bk-category')?.value || '',
        status: document.getElementById('bk-status')?.value || '待阅读',
        start: document.getElementById('bk-start')?.value || '',
      }),
      (d) => {
        if (d.title != null) document.getElementById('bk-title').value = d.title;
        if (d.author != null) document.getElementById('bk-author').value = d.author;
        if (d.category != null) document.getElementById('bk-category').value = d.category;
        if (d.status != null) document.getElementById('bk-status').value = d.status;
        if (d.start != null) document.getElementById('bk-start').value = d.start;
      },
      () => StudyMod.addBook()
    );
  },

  saveBook(editId) {
    const title = document.getElementById('bk-title').value.trim();
    if (!title) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    const status = document.getElementById('bk-status').value;
    const category = document.getElementById('bk-category').value;
    if (category) Store.rememberInput('bookCategories', category);
    const data = {
      title, author: document.getElementById('bk-author').value,
      category,
      startDate: document.getElementById('bk-start').value, endDate: '',
      progress: status === '已读完' ? 100 : 0, status, rating: 0, cover: ''
    };
    if (editId) {
      const old = Store.find('books', b => b.id === editId);
      data.rating = old.rating; data.endDate = old.endDate; data.cover = old.cover;
      Store.update('books', editId, data);
      App.showToast(I18n.t('updated'), 'success');
    } else {
      Store.add('books', data);
      App.showToast(I18n.t('added'), 'success');
    }
    App.clearDraft('book');
    App.closeModal(); App.render();
  },

  editBook(id) { this.addBook(id); },

  delBook(id) {
    App.confirm(I18n.t('confirmDelete'), () => {
      Store.remove('books', id);
      Store.get('book_excerpts').filter(e => e.bookId === id).forEach(e => Store.remove('book_excerpts', e.id));
      Store.get('book_reviews').filter(r => r.bookId === id).forEach(r => Store.remove('book_reviews', r.id));
      App.render();
    });
  },

  addExcerpt(bookId) {
    App.closeModal();
    App.openModal(`
      <div class="modal-title">新增摘抄</div>
      <div class="form-group"><label class="form-label">摘抄内容 <span class="req">*</span></label><textarea id="ex-text" rows="4"></textarea></div>
      <div class="form-group"><label class="form-label">批注</label><input type="text" id="ex-annotation"></div>
      <div class="form-group">
        <label class="form-label">📷 图片转文字</label>
        <div class="img-upload-area" onclick="StudyMod.ocrExcerpt()">上传/拍摄书页照片识别</div>
        <div class="ocr-alt-row"><button type="button" class="btn-cancel btn-mini" onclick="StudyMod.pasteToField('ex-text','ocr-result-area')">📋 粘贴文字</button></div>
        <div id="ocr-result-area"></div>
      </div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="StudyMod.saveExcerpt(${bookId})">${I18n.t('save')}</button></div>
    `);
    App.ensureDraft('excerpt',
      () => ({
        text: document.getElementById('ex-text')?.value || '',
        annotation: document.getElementById('ex-annotation')?.value || '',
      }),
      (d) => {
        if (d.text != null) document.getElementById('ex-text').value = d.text;
        if (d.annotation != null) document.getElementById('ex-annotation').value = d.annotation;
      },
      () => StudyMod.addExcerpt(bookId)
    );
  },

  /* 从剪贴板粘贴文字到指定输入框（OCR 的兜底方案） */
  async pasteToField(fieldId, areaId) {
    const ta = document.getElementById(fieldId);
    const area = document.getElementById(areaId);
    if (!ta) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        ta.value = (ta.value ? ta.value + '\n' : '') + text.trim();
        if (area) area.innerHTML = `<div class="ocr-result">✅ 已粘贴 ${text.trim().length} 个字符。</div>`;
        App.showToast('已粘贴', 'success');
        return;
      }
      throw new Error('empty');
    } catch (e) {
      ta.focus();
      if (area) area.innerHTML = '<div class="ocr-result">请在上方输入框内长按选择「粘贴」（或按 Ctrl/⌘+V）。\n小技巧：手机相册长按图片可「提取文字」，微信长按图片也有「提取文字」，复制后回来粘贴即可。</div>';
    }
  },

  ocrExcerpt() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      const f = input.files[0];
      if (!f) return;
      Utils.runOCR('ocr-result-area', f, (text) => {
        const ta = document.getElementById('ex-text');
        if (ta) ta.value = (ta.value ? ta.value + '\n' : '') + text;
      }, { pasteHandler: "StudyMod.pasteToField('ex-text','ocr-result-area')" });
    };
    input.click();
  },

  saveExcerpt(bookId) {
    const text = document.getElementById('ex-text').value.trim();
    if (!text) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    Store.add('book_excerpts', { bookId, text, annotation: document.getElementById('ex-annotation').value, date: Utils.today() });
    App.clearDraft('excerpt');
    App.showToast(I18n.t('added'), 'success');
    this.bookDetail(bookId);
  },

  /* ===== 摘抄 修改 / 删除 ===== */
  editExcerpt(id) {
    const e = Store.find('book_excerpts', x => x.id === id);
    if (!e) return;
    App.closeModal();
    App.openModal(`
      <div class="modal-title">✏️ 修改摘抄</div>
      <div class="form-group"><label class="form-label">摘抄内容 <span class="req">*</span></label><textarea id="ex-text" rows="4">${Utils.escape(e.text || '')}</textarea></div>
      <div class="form-group"><label class="form-label">批注</label><input type="text" id="ex-annotation" value="${Utils.escape(e.annotation || '')}"></div>
      <div class="form-group"><label class="form-label">日期</label><input type="date" id="ex-date" value="${e.date || Utils.today()}"></div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="StudyMod.bookDetail(${e.bookId})">${I18n.t('cancel')}</button>
        <button class="btn-confirm" onclick="StudyMod.updateExcerpt(${id})">${I18n.t('save')}</button>
      </div>
    `);
  },

  updateExcerpt(id) {
    const text = document.getElementById('ex-text').value.trim();
    if (!text) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    const e = Store.find('book_excerpts', x => x.id === id);
    Store.update('book_excerpts', id, {
      text, annotation: document.getElementById('ex-annotation').value,
      date: document.getElementById('ex-date').value || Utils.today()
    });
    App.showToast(I18n.t('saved'), 'success');
    this.bookDetail(e.bookId);
  },

  delExcerpt(id) {
    const e = Store.find('book_excerpts', x => x.id === id);
    if (!e) return;
    const bookId = e.bookId;
    App.confirm('确定删除这条摘抄吗？删除后不可恢复。', () => {
      Store.remove('book_excerpts', id);
      App.showToast(I18n.t('deleted') || '已删除', 'success');
      StudyMod.bookDetail(bookId);
    }, '删除摘抄');
  },

  /* ===== 读后感 新增 / 修改 / 删除 ===== */
  addReview(bookId) {
    App.closeModal();
    App.openModal(this.reviewForm(null, bookId));
    App.bindSuggest('rv-tags', Store.historyOf('reviewTags'), { multi: true, historyKey: 'reviewTags' });
    App.ensureDraft('review',
      () => ({
        title: document.getElementById('rv-title')?.value || '',
        content: document.getElementById('rv-content')?.value || '',
        rating: (document.querySelector('#rv-rating .tag.active') || {}).dataset?.v || '0',
        tags: document.getElementById('rv-tags')?.value || '',
        date: document.getElementById('rv-date')?.value || '',
      }),
      (d) => {
        if (d.title != null) document.getElementById('rv-title').value = d.title;
        if (d.content != null) document.getElementById('rv-content').value = d.content;
        if (d.rating != null) document.querySelectorAll('#rv-rating .tag').forEach(e => e.classList.toggle('active', e.dataset.v === String(d.rating)));
        if (d.tags != null) document.getElementById('rv-tags').value = d.tags;
        if (d.date != null) document.getElementById('rv-date').value = d.date;
      },
      () => StudyMod.addReview(bookId)
    );
  },

  editReview(id) {
    const r = Store.find('book_reviews', x => x.id === id);
    if (!r) return;
    App.closeModal();
    App.openModal(this.reviewForm(r, r.bookId));
    App.bindSuggest('rv-tags', Store.historyOf('reviewTags'), { multi: true, historyKey: 'reviewTags' });
  },

  reviewForm(r, bookId) {
    const isEdit = !!r;
    const rating = isEdit ? (r.rating || 0) : 0;
    return `
      <div class="modal-title">${isEdit ? '✏️ 修改读后感' : '撰写读后感'}</div>
      <div class="form-group"><label class="form-label">标题 <span class="req">*</span></label><input type="text" id="rv-title" value="${isEdit ? Utils.escape(r.title || '') : ''}"></div>
      <div class="form-group"><label class="form-label">内容</label><textarea id="rv-content" rows="6">${isEdit ? Utils.escape(r.content || '') : ''}</textarea></div>
      <div class="form-group"><label class="form-label">评分</label><div class="tag-pick" id="rv-rating">${[1,2,3,4,5].map(n => `<span class="tag${rating === n ? ' active' : ''}" data-v="${n}" onclick="document.querySelectorAll('#rv-rating .tag').forEach(e=>e.classList.remove('active'));this.classList.add('active');">⭐${n}</span>`).join('')}</div></div>
      <div class="form-group"><label class="form-label">标签</label>${App.suggestInput({ id: 'rv-tags', value: isEdit ? (r.tags || '') : '', placeholder: '逗号分隔，输入即联想', className: '' })}</div>
      <div class="form-group"><label class="form-label">日期</label><input type="date" id="rv-date" value="${isEdit ? (r.date || Utils.today()) : Utils.today()}"></div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="StudyMod.bookDetail(${bookId})">${I18n.t('cancel')}</button>
        <button class="btn-confirm" onclick="StudyMod.saveReview(${bookId}, ${isEdit ? r.id : 'null'})">${I18n.t('save')}</button>
      </div>`;
  },

  saveReview(bookId, reviewId) {
    const title = document.getElementById('rv-title').value.trim();
    if (!title) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    const ratingEl = document.querySelector('#rv-rating .tag.active');
    const payload = {
      bookId, title,
      content: document.getElementById('rv-content').value,
      rating: ratingEl ? +ratingEl.dataset.v : 0,
      tags: document.getElementById('rv-tags').value,
      date: document.getElementById('rv-date').value || Utils.today()
    };
    if (reviewId) Store.update('book_reviews', reviewId, payload);
    else Store.add('book_reviews', payload);
    if (payload.tags) Store.rememberInput('reviewTags', payload.tags);
    App.clearDraft('review');
    App.showToast(I18n.t('saved'), 'success');
    this.bookDetail(bookId);
  },

  delReview(id) {
    const r = Store.find('book_reviews', x => x.id === id);
    if (!r) return;
    const bookId = r.bookId;
    App.confirm('确定删除这篇读后感吗？删除后不可恢复。', () => {
      Store.remove('book_reviews', id);
      App.showToast(I18n.t('deleted') || '已删除', 'success');
      StudyMod.bookDetail(bookId);
    }, '删除读后感');
  },

  editPlan() {
    const year = new Date().getFullYear();
    const plan = Store.get('annual_reading_plans').find(p => p.year === year) || {};
    App.openModal(`
      <div class="modal-title">📅 ${year}年度阅读计划</div>
      <div class="form-group"><label class="form-label">全年阅读总本数</label><input type="number" id="plan-total" value="${plan.totalGoal || 24}"></div>
      <div class="form-group"><label class="form-label">每月最低阅读量</label><input type="number" id="plan-monthly" value="${plan.monthlyMin || 2}"></div>
      <div class="form-group"><label class="form-label">阅读主题方向（可多选标签）</label>${App.suggestInput({ id: 'plan-themes', value: plan.themes || '', placeholder: '输入即联想历史标签，可多选，逗号分隔' })}</div>
      <div class="form-group"><label class="form-label">目标书单</label><textarea id="plan-books" rows="3">${plan.bookList || ''}</textarea></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">Q1目标</label><input type="number" id="plan-q1" value="${plan.q1Goal || 6}"></div>
        <div class="form-group"><label class="form-label">Q2目标</label><input type="number" id="plan-q2" value="${plan.q2Goal || 6}"></div>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">Q3目标</label><input type="number" id="plan-q3" value="${plan.q3Goal || 6}"></div>
        <div class="form-group"><label class="form-label">Q4目标</label><input type="number" id="plan-q4" value="${plan.q4Goal || 6}"></div>
      </div>
      <div class="text-sm text-light">注：年度计划修改不存档，只保留最新版本。</div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="StudyMod.savePlan(${plan.id || 'null'}, ${year})">${I18n.t('save')}</button></div>
    `);
    App.bindSuggest('plan-themes', Store.historyOf('readingThemes'), { multi: true, historyKey: 'readingThemes' });
    App.ensureDraft('plan',
      () => ({
        total: document.getElementById('plan-total')?.value || '',
        monthly: document.getElementById('plan-monthly')?.value || '',
        themes: document.getElementById('plan-themes')?.value || '',
        books: document.getElementById('plan-books')?.value || '',
        q1: document.getElementById('plan-q1')?.value || '',
        q2: document.getElementById('plan-q2')?.value || '',
        q3: document.getElementById('plan-q3')?.value || '',
        q4: document.getElementById('plan-q4')?.value || '',
      }),
      (d) => {
        if (d.total != null) document.getElementById('plan-total').value = d.total;
        if (d.monthly != null) document.getElementById('plan-monthly').value = d.monthly;
        if (d.themes != null) document.getElementById('plan-themes').value = d.themes;
        if (d.books != null) document.getElementById('plan-books').value = d.books;
        if (d.q1 != null) document.getElementById('plan-q1').value = d.q1;
        if (d.q2 != null) document.getElementById('plan-q2').value = d.q2;
        if (d.q3 != null) document.getElementById('plan-q3').value = d.q3;
        if (d.q4 != null) document.getElementById('plan-q4').value = d.q4;
      },
      () => StudyMod.editPlan()
    );
  },

  savePlan(id, year) {
    const data = {
      year, totalGoal: +document.getElementById('plan-total').value,
      monthlyMin: +document.getElementById('plan-monthly').value,
      themes: document.getElementById('plan-themes').value,
      bookList: document.getElementById('plan-books').value,
      q1Goal: +document.getElementById('plan-q1').value,
      q2Goal: +document.getElementById('plan-q2').value,
      q3Goal: +document.getElementById('plan-q3').value,
      q4Goal: +document.getElementById('plan-q4').value,
    };
    if (id) Store.update('annual_reading_plans', id, data);
    else Store.add('annual_reading_plans', data);
    if (data.themes) Store.rememberInput('readingThemes', data.themes);
    App.clearDraft('plan');
    App.closeModal(); App.showToast(I18n.t('saved'), 'success'); App.render();
  },

  /* ===== 影音记录 ===== */
  mediaFilter: 'all',
  mediaSearch: '',

  renderMedia() {
    const all = Store.get('media');
    let items = all;
    if (this.mediaFilter !== 'all') items = items.filter(m => m.category === this.mediaFilter);
    if (this.mediaSearch) {
      const q = this.mediaSearch.toLowerCase();
      items = items.filter(m => (m.title || '').toLowerCase().includes(q) || (m.tags || '').toLowerCase().includes(q));
    }
    items = items.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));

    const finished = all.filter(m => m.status === '已看完');
    const totalCost = all.reduce((s, m) => s + (m.cost || 0), 0);
    const highRated = all.filter(m => m.rating >= 4);
    const monthNew = all.filter(m => (m.startDate || '').startsWith(Utils.today().slice(0, 7)));

    document.getElementById('study-sub').innerHTML = `
      <div class="dash-grid">
        <div class="dash-stat"><div class="dash-stat-num">${all.length}</div><div class="dash-stat-label">总观影</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${finished.length}</div><div class="dash-stat-label">已看完</div></div>
        <div class="dash-stat"><div class="dash-stat-num">¥${totalCost.toFixed(0)}</div><div class="dash-stat-label">总花销</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${highRated.length}</div><div class="dash-stat-label">高分(≥4⭐)</div></div>
      </div>

      <div class="flex-between mb-12 mt-12">
        <input type="text" class="search-input" placeholder="搜索作品名/标签..." value="${Utils.escape(this.mediaSearch)}" oninput="StudyMod.mediaSearch=this.value" style="flex:1;margin-right:8px;">
        <button class="btn btn-primary btn-sm" onclick="StudyMod.addMedia()">+ 添加</button>
      </div>

      <div class="filter-bar">
        <div class="filter-tab ${this.mediaFilter === 'all' ? 'active' : ''}" onclick="StudyMod.setMediaFilter('all')">全部</div>
        <div class="filter-tab ${this.mediaFilter === '电影' ? 'active' : ''}" onclick="StudyMod.setMediaFilter('电影')">电影</div>
        <div class="filter-tab ${this.mediaFilter === '电视剧' ? 'active' : ''}" onclick="StudyMod.setMediaFilter('电视剧')">电视剧</div>
        <div class="filter-tab ${this.mediaFilter === '纪录片' ? 'active' : ''}" onclick="StudyMod.setMediaFilter('纪录片')">纪录片</div>
        <div class="filter-tab ${this.mediaFilter === '综艺' ? 'active' : ''}" onclick="StudyMod.setMediaFilter('综艺')">综艺</div>
      </div>

      <div id="media-list">
        ${items.map(m => this.renderMediaCard(m)).join('') || '<div class="empty-state"><div class="empty-icon">🎬</div>暂无影音记录</div>'}
      </div>
    `;
  },

  renderMediaCard(m) {
    const isIdle = m.status === '搁置弃看';
    const catIcon = m.category === '电影' ? '🎬' : m.category === '电视剧' ? '📺' : m.category === '纪录片' ? '🌏' : '🎭';
    return `
    <div class="card ${isIdle ? 'idle' : ''}">
      <div class="flex-between">
        <div class="flex-1">
          <div class="flex-center gap-8">
            <span class="text-bold" style="font-size:16px;">${catIcon} ${Utils.escape(m.title)}</span>
            <span class="tag-small">${m.status}</span>
            ${m.rating > 0 ? '<span class="text-sm">' + '⭐'.repeat(m.rating) + '</span>' : ''}
            ${isIdle && m.abandonReason ? '<span class="secondhand-badge">弃看</span>' : ''}
          </div>
          <div class="text-sm text-light mt-8">${m.category} · ${Utils.escape(m.tags || '')} · ${m.startDate || ''}${m.endDate ? ' ~ ' + m.endDate : ''}</div>
          ${m.cost > 0 ? `<div class="text-sm text-light">花销：¥${m.cost}</div>` : ''}
          ${m.category === '电影' && m.channel ? `<div class="text-sm text-light">${m.channel}${m.cinema ? ' · ' + Utils.escape(m.cinema) : ''}${m.showTime ? ' · ' + m.showTime : ''}</div>` : ''}
          ${(m.category === '电视剧' || m.category === '综艺') && m.totalEpisodes > 0 ? `<div class="text-sm text-light">进度：${m.currentEpisode}/${m.totalEpisodes}集</div>` : ''}
          ${m.category === '纪录片' ? `<div class="text-sm text-light">主题：${Utils.escape(m.docTopic || '')}</div>` : ''}
          ${isIdle && m.abandonReason ? `<div class="text-sm" style="color:#c0392b;">弃看原因：${Utils.escape(m.abandonReason)}</div>` : ''}
        </div>
        <div class="flex gap-8">
          <button class="btn btn-outline btn-sm" onclick="StudyMod.mediaDetail(${m.id})">详情</button>
          <button class="btn btn-outline btn-sm" onclick="StudyMod.editMedia(${m.id})">编辑</button>
          <button class="btn btn-cancel btn-sm" onclick="StudyMod.delMedia(${m.id})">✕</button>
        </div>
      </div>
      ${m.progress > 0 && m.progress < 100 ? `<div class="mt-8"><div class="progress-bar"><div class="progress-fill" style="width:${m.progress}%"></div></div></div>` : ''}
    </div>`;
  },

  setMediaFilter(f) { this.mediaFilter = f; App.render(); },

  addMedia() { this._openMediaForm(null); },

  editMedia(id) {
    const m = Store.find('media', x => x.id === id);
    if (!m) return;
    this._openMediaForm(m);
  },

  _openMediaForm(m) {
    const isEdit = !!m;
    this._mediaImages = isEdit ? (m.images || []).slice() : [];
    const excerptNote = isEdit ? (Store.filter('media_notes', n => n.mediaId === m.id && n.noteType === '摘抄')[0] || {}) : {};
    const noteNote = isEdit ? (Store.filter('media_notes', n => n.mediaId === m.id && n.noteType === '笔记')[0] || {}) : {};
    const v = (val) => (val == null ? '' : val);
    const dv = (val, def) => (val == null ? (def == null ? 0 : def) : val);
    const sel = (val, opt) => (val === opt ? ' selected' : '');
    const ratingOpts = [0,1,2,3,4,5].map(n => `<option value="${n}"${(m && m.rating === n) ? ' selected' : ''}>${n === 0 ? '未评' : '⭐'.repeat(n)}</option>`).join('');
    App.openModal(`
      <div class="modal-title">${isEdit ? '✏️ 编辑影音记录' : '🎬 添加影音记录'}</div>

      <div class="form-group ocr-block">
        <label class="form-label">📷 拍照识别 <span class="text-light" style="font-weight:400;">票根 / 海报 / 播放页截图</span></label>
        <div class="img-upload-area" onclick="StudyMod.ocrMedia()">上传或拍摄图片，自动识别文字并填写下方表单</div>
        <div class="ocr-alt-row">
          <button type="button" class="btn-cancel btn-mini" onclick="StudyMod.pasteMediaText()">📋 粘贴文字识别</button>
          <button type="button" class="btn-cancel btn-mini" onclick="StudyMod.addMediaImage()">🖼 仅存海报图</button>
        </div>
        <div id="md-ocr-area"></div>
        <div id="md-imgs"></div>
      </div>

      <div class="form-group"><label class="form-label">作品名称 <span class="req">*</span></label><input type="text" id="md-title" value="${Utils.escape(v(m && m.title))}"></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">品类</label><select id="md-category" onchange="StudyMod.toggleMediaFields()">
          <option${sel(m && m.category, '电影')}>电影</option><option${sel(m && m.category, '电视剧')}>电视剧</option><option${sel(m && m.category, '纪录片')}>纪录片</option><option${sel(m && m.category, '综艺')}>综艺</option>
        </select></div>
        <div class="form-group"><label class="form-label">状态</label><select id="md-status">
          <option${sel(m && m.status, '想看')}>想看</option><option${sel(m && m.status, '追更中')}>追更中</option><option${sel(m && m.status, '已看完')}>已看完</option><option${sel(m && m.status, '搁置弃看')}>搁置弃看</option>
        </select></div>
      </div>
      <div class="form-group"><label class="form-label">题材标签</label>
        <div class="tag-presets" id="md-tag-presets"></div>
        ${App.suggestInput({ id: 'md-tags', value: v(m && m.tags), placeholder: '点击上方选项或自行输入，可多选', className: '' })}
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">观看起始日期</label><input type="date" id="md-start" value="${v(m && m.startDate) || Utils.today()}"></div>
        <div class="form-group"><label class="form-label">完结日期</label><input type="date" id="md-end" value="${v(m && m.endDate)}"></div>
      </div>
      <div id="md-cost-field">
        <div class="form-group"><label class="form-label">观影花销</label><input type="number" id="md-cost" value="${dv(m && m.cost)}"></div>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">星级评分</label><select id="md-rating">${ratingOpts}</select></div>
        <div class="form-group"><label class="form-label">进度（%）</label><input type="number" id="md-progress" value="${dv(m && m.progress)}" min="0" max="100"></div>
      </div>

      <!-- 内联摘抄 / 笔记：填表时即可一并记录 -->
      <div class="divider"></div>
      <div class="text-sm text-bold mb-8">📝 摘抄 / 笔记</div>
      <div class="form-group"><label class="form-label">📝 摘抄</label><textarea id="md-excerpt" rows="3" placeholder="观影时记下的台词、金句...">${Utils.escape(v(excerptNote.text || excerptNote.content))}</textarea></div>
      <div class="form-group"><label class="form-label">📝 笔记</label><textarea id="md-note" rows="3" placeholder="观后感、想法...">${Utils.escape(v(noteNote.text || noteNote.content))}</textarea></div>

      <!-- 电影专属 -->
      <div id="md-film-fields">
        <div class="divider"></div>
        <div class="text-sm text-bold mb-8">🎬 电影专属</div>
        <div class="form-group"><label class="form-label">观看渠道</label><select id="md-channel"><option${sel(m && m.channel, '影院观影')}>影院观影</option><option${sel(m && m.channel, '线上观看')}>线上观看</option></select></div>
        <div class="two-col">
          <div class="form-group"><label class="form-label">影院 <span class="text-light" style="font-weight:400;">🧠 已自动记忆</span></label>${App.suggestInput({ id: 'md-cinema', value: v(m && m.cinema), placeholder: '输入模糊字段即联想，如 万达', className: '' })}</div>
          <div class="form-group"><label class="form-label">场次时间</label><input type="text" id="md-showtime" placeholder="如：19:30" value="${Utils.escape(v(m && m.showTime))}"></div>
        </div>
        <div class="two-col">
          <div class="form-group"><label class="form-label">票价</label><input type="number" id="md-ticket" value="${dv(m && m.ticketPrice)}"></div>
          <div class="form-group"><label class="form-label">同行人员</label>${App.suggestInput({ id: 'md-companions', value: v(m && m.companions), placeholder: '如：朋友', className: '' })}</div>
        </div>
      </div>

      <!-- 电视剧/综艺专属 -->
      <div id="md-drama-fields" style="display:none;">
        <div class="divider"></div>
        <div class="text-sm text-bold mb-8">📺 电视剧/综艺专属</div>
        <div class="two-col">
          <div class="form-group"><label class="form-label">总集数</label><input type="number" id="md-total-ep" value="${dv(m && m.totalEpisodes)}"></div>
          <div class="form-group"><label class="form-label">当前集数</label><input type="number" id="md-cur-ep" value="${dv(m && m.currentEpisode)}"></div>
        </div>
        <div class="form-group"><label class="form-label">追剧随笔</label><textarea id="md-drama-notes" rows="2">${Utils.escape(v(m && m.dramaNotes))}</textarea></div>
      </div>

      <!-- 纪录片专属 -->
      <div id="md-doc-fields" style="display:none;">
        <div class="divider"></div>
        <div class="text-sm text-bold mb-8">🌏 纪录片专属</div>
        <div class="form-group"><label class="form-label">主题分类</label><input type="text" id="md-doc-topic" placeholder="如：海洋生态" value="${Utils.escape(v(m && m.docTopic))}"></div>
        <div class="form-group"><label class="form-label">知识点摘抄</label><textarea id="md-doc-knowledge" rows="3">${Utils.escape(v(m && m.docKnowledge))}</textarea></div>
        <div class="form-group"><label class="form-label">学习心得</label><textarea id="md-doc-reflection" rows="2">${Utils.escape(v(m && m.docReflection))}</textarea></div>
        <div class="form-group"><label class="form-label"><input type="checkbox" id="md-add-study"${m && m.addToStudy ? ' checked' : ''}> 纳入学习计划</label></div>
      </div>

      <!-- 弃看原因 -->
      <div id="md-abandon-fields" style="display:none;">
        <div class="divider"></div>
        <div class="form-group"><label class="form-label">搁置/弃看原因</label><textarea id="md-abandon" rows="2">${Utils.escape(v(m && m.abandonReason))}</textarea></div>
      </div>

      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="StudyMod.saveMedia(${isEdit ? m.id : 'null'})">${I18n.t('save')}</button></div>
    `);
    this.toggleMediaFields();
    this.bindMediaSuggest();
    this.renderTagPresets();
    App.ensureDraft('media',
      () => ({
        title: document.getElementById('md-title')?.value || '',
        category: document.getElementById('md-category')?.value || '电影',
        status: document.getElementById('md-status')?.value || '想看',
        tags: document.getElementById('md-tags')?.value || '',
        start: document.getElementById('md-start')?.value || '',
        end: document.getElementById('md-end')?.value || '',
        cost: document.getElementById('md-cost')?.value || '0',
        rating: document.getElementById('md-rating')?.value || '0',
        progress: document.getElementById('md-progress')?.value || '0',
        excerpt: document.getElementById('md-excerpt')?.value || '',
        note: document.getElementById('md-note')?.value || '',
        channel: document.getElementById('md-channel')?.value || '',
        cinema: document.getElementById('md-cinema')?.value || '',
        showtime: document.getElementById('md-showtime')?.value || '',
        ticket: document.getElementById('md-ticket')?.value || '0',
        companions: document.getElementById('md-companions')?.value || '',
        totalEp: document.getElementById('md-total-ep')?.value || '0',
        curEp: document.getElementById('md-cur-ep')?.value || '0',
        dramaNotes: document.getElementById('md-drama-notes')?.value || '',
        docTopic: document.getElementById('md-doc-topic')?.value || '',
        docKnowledge: document.getElementById('md-doc-knowledge')?.value || '',
        docReflection: document.getElementById('md-doc-reflection')?.value || '',
        addStudy: (document.getElementById('md-add-study') || {}).checked || false,
        abandon: document.getElementById('md-abandon')?.value || '',
        images: (this._mediaImages || []).slice(),
      }),
      (d) => {
        const g = (id) => document.getElementById(id);
        if (d.title != null) g('md-title').value = d.title;
        if (d.category != null) { g('md-category').value = d.category; this.toggleMediaFields(); }
        if (d.status != null) { g('md-status').value = d.status; this.toggleMediaFields(); }
        if (d.tags != null) g('md-tags').value = d.tags;
        if (d.start != null) g('md-start').value = d.start;
        if (d.end != null) g('md-end').value = d.end;
        if (d.cost != null) g('md-cost').value = d.cost;
        if (d.rating != null) g('md-rating').value = d.rating;
        if (d.progress != null) g('md-progress').value = d.progress;
        if (d.excerpt != null) g('md-excerpt').value = d.excerpt;
        if (d.note != null) g('md-note').value = d.note;
        if (d.channel != null) g('md-channel').value = d.channel;
        if (d.cinema != null) g('md-cinema').value = d.cinema;
        if (d.showtime != null) g('md-showtime').value = d.showtime;
        if (d.ticket != null) g('md-ticket').value = d.ticket;
        if (d.companions != null) g('md-companions').value = d.companions;
        if (d.totalEp != null) g('md-total-ep').value = d.totalEp;
        if (d.curEp != null) g('md-cur-ep').value = d.curEp;
        if (d.dramaNotes != null) g('md-drama-notes').value = d.dramaNotes;
        if (d.docTopic != null) g('md-doc-topic').value = d.docTopic;
        if (d.docKnowledge != null) g('md-doc-knowledge').value = d.docKnowledge;
        if (d.docReflection != null) g('md-doc-reflection').value = d.docReflection;
        if (g('md-add-study')) g('md-add-study').checked = !!d.addStudy;
        if (d.abandon != null) g('md-abandon').value = d.abandon;
        if (Array.isArray(d.images)) {
          this._mediaImages = d.images.slice();
          g('md-imgs').innerHTML = App.renderImageGrid(this._mediaImages, 'media');
        }
        this._syncPresetActive();
        this.bindMediaSuggest();
      },
      () => m ? StudyMod.editMedia(m.id) : StudyMod.addMedia()
    );
  },

  renderTagPresets() {
    const el = document.getElementById('md-tag-presets');
    if (!el) return;
    el.innerHTML = MOVIE_GENRES.map(g =>
      `<span class="tag-preset" data-g="${Utils.escape(g)}" onclick="StudyMod.togglePresetTag('${Utils.escape(g)}')">${Utils.escape(g)}</span>`
    ).join('');
    this._syncPresetActive();
  },

  togglePresetTag(g) {
    const input = document.getElementById('md-tags');
    if (!input) return;
    const cur = new Set((input.value || '').split(/[,，]/).map(s => s.trim()).filter(Boolean));
    if (cur.has(g)) cur.delete(g); else cur.add(g);
    input.value = [...cur].join(',');
    this._syncPresetActive();
    if (App._draftFlush) App._draftFlush();
  },

  _syncPresetActive() {
    const input = document.getElementById('md-tags');
    if (!input) return;
    const cur = new Set((input.value || '').split(/[,，]/).map(s => s.trim()).filter(Boolean));
    document.querySelectorAll('#md-tag-presets .tag-preset').forEach(el => {
      el.classList.toggle('active', cur.has(el.dataset.g));
    });
  },

  /* 绑定影院 / 标签 / 同行人 的模糊建议数据源 */
  bindMediaSuggest() {
    App.bindSuggest('md-cinema', this.cinemaOptions(), { historyKey: 'cinema' });
    App.bindSuggest('md-tags', this.mediaTagOptions(), { multi: true, historyKey: 'mediaTags' });
    App.bindSuggest('md-companions', Store.historyOf('companions'), { multi: true, historyKey: 'companions' });
  },

  /* 影院候选 = 历史记忆 ∪ 已有记录中出现过的影院 */
  cinemaOptions() {
    const set = [];
    const push = v => { const s = String(v || '').trim(); if (s && set.indexOf(s) === -1) set.push(s); };
    Store.historyOf('cinema').forEach(push);
    Store.get('media').forEach(m => push(m.cinema));
    return set;
  },

  mediaTagOptions() {
    const set = [];
    const push = v => { const s = String(v || '').trim(); if (s && set.indexOf(s) === -1) set.push(s); };
    MOVIE_GENRES.forEach(push);
    Store.historyOf('mediaTags').forEach(push);
    Store.get('media').forEach(m => String(m.tags || '').split(/[,，]/).forEach(push));
    return set;
  },

  /* ===== 影音拍照识别 ===== */
  _mediaImages: [],

  ocrMedia() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      const f = input.files[0];
      if (!f) return;
      // 识别用的这张图同时留存为票根/海报
      Utils.readFileAsDataURL(f, (url) => {
        StudyMod._mediaImages = StudyMod._mediaImages || [];
        StudyMod._mediaImages.push(url);
        const g = document.getElementById('md-imgs');
        if (g) g.innerHTML = App.renderImageGrid(StudyMod._mediaImages, 'media');
      });
      Utils.runOCR('md-ocr-area', f, (text) => {
        StudyMod.applyMediaOCR(text);
      }, { renderResult: false, pasteHandler: "StudyMod.pasteMediaText()" });
    };
    input.click();
  },

  /* 只添加海报/剧照，不做识别 */
  addMediaImage() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      const f = input.files[0];
      if (!f) return;
      Utils.readFileAsDataURL(f, (url) => {
        StudyMod._mediaImages = StudyMod._mediaImages || [];
        StudyMod._mediaImages.push(url);
        const g = document.getElementById('md-imgs');
        if (g) g.innerHTML = App.renderImageGrid(StudyMod._mediaImages, 'media');
        App.showToast('已添加图片', 'success');
        if (App._draftFlush) App._draftFlush();
      });
    };
    input.click();
  },

  /* OCR 兜底：直接粘贴文字做解析 */
  async pasteMediaText() {
    let text = '';
    try { text = await navigator.clipboard.readText(); } catch (e) { text = ''; }
    if (!text || !text.trim()) {
      const area = document.getElementById('md-ocr-area');
      if (area) area.innerHTML = '<div class="ocr-result">没读到剪贴板内容。\n小技巧：手机相册（iOS「实况文本」）或微信长按图片「提取文字」，复制之后再点这个按钮。</div>';
      return;
    }
    this.applyMediaOCR(text.trim());
  },

  /* 把识别到的文字解析成表单字段 */
  applyMediaOCR(text) {
    const p = Utils.parseMediaText(text);
    const filled = [];
    const setVal = (id, val, label) => {
      const el = document.getElementById(id);
      if (!el || val === '' || val === undefined || val === null) return;
      el.value = val; filled.push(label);
    };

    if (p.category) {
      const c = document.getElementById('md-category');
      if (c) { c.value = p.category; filled.push('品类'); this.toggleMediaFields(); }
    }
    setVal('md-title', p.title, '作品名称');
    setVal('md-tags', p.tags, '题材标签');
    setVal('md-start', p.showDate, '观看日期');
    setVal('md-cinema', p.cinema, '影院');
    setVal('md-showtime', p.showTime, '场次时间');
    if (p.channel) {
      const ch = document.getElementById('md-channel');
      if (ch) { ch.value = p.channel; filled.push('观看渠道'); }
    }
    if (p.ticketPrice) {
      setVal('md-ticket', p.ticketPrice, '票价');
      const cost = document.getElementById('md-cost');
      if (cost && !(+cost.value > 0)) cost.value = p.ticketPrice;
    }
    setVal('md-total-ep', p.totalEpisodes, '总集数');
    setVal('md-cur-ep', p.currentEpisode, '当前集数');
    if (p.totalEpisodes && p.currentEpisode) {
      const pr = document.getElementById('md-progress');
      if (pr && !(+pr.value > 0)) pr.value = Math.min(100, Math.round(+p.currentEpisode / +p.totalEpisodes * 100));
    }
    if (p.seat) {
      const notes = document.getElementById('md-drama-notes');
      if (notes && !notes.value) notes.value = '座位：' + p.seat;
    }

    const area = document.getElementById('md-ocr-area');
    if (area) {
      area.innerHTML = filled.length
        ? `<div class="ocr-result">✅ 已自动填写：${filled.join('、')}${p.seat ? '｜座位 ' + Utils.escape(p.seat) : ''}
请核对后保存，字段都可以直接改。

识别原文：
${Utils.escape(text)}</div>`
        : `<div class="ocr-result">⚠️ 识别到文字，但没匹配上表单字段，请手动填写。

识别原文：
${Utils.escape(text)}</div>`;
    }
    if (filled.length) App.showToast(`已回填 ${filled.length} 项`, 'success');
    if (App._draftFlush) App._draftFlush();
  },

  toggleMediaFields() {
    const cat = document.getElementById('md-category')?.value;
    const status = document.getElementById('md-status')?.value;
    document.getElementById('md-film-fields').style.display = cat === '电影' ? '' : 'none';
    document.getElementById('md-drama-fields').style.display = (cat === '电视剧' || cat === '综艺') ? '' : 'none';
    document.getElementById('md-doc-fields').style.display = cat === '纪录片' ? '' : 'none';
    document.getElementById('md-abandon-fields').style.display = status === '搁置弃看' ? '' : 'none';
    /* 电影：总花销只记录票价，隐藏通用「观影花销」字段 */
    const costField = document.getElementById('md-cost-field');
    if (costField) costField.style.display = cat === '电影' ? 'none' : '';
  },

  saveMedia(editId) {
    const title = document.getElementById('md-title').value.trim();
    if (!title) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    const category = document.getElementById('md-category').value;
    const status = document.getElementById('md-status').value;
    const ticket = +document.getElementById('md-ticket').value || 0;
    /* 电影：总花销只记录票价；其他品类才用通用「观影花销」字段 */
    const cost = category === '电影' ? ticket : (+document.getElementById('md-cost').value || 0);
    const data = {
      title, category,
      tags: document.getElementById('md-tags').value,
      startDate: document.getElementById('md-start').value,
      endDate: document.getElementById('md-end').value,
      cost,
      rating: +document.getElementById('md-rating').value || 0,
      progress: +document.getElementById('md-progress').value || 0,
      status, images: (this._mediaImages || []).slice(), abandonReason: '',
      channel: '', cinema: '', showTime: '', ticketPrice: 0, companions: '',
      totalEpisodes: 0, currentEpisode: 0, dramaNotes: '',
      docTopic: '', docKnowledge: '', docReflection: '', addToStudy: false
    };
    if (category === '电影') {
      data.channel = document.getElementById('md-channel').value;
      data.cinema = document.getElementById('md-cinema').value;
      data.showTime = document.getElementById('md-showtime').value;
      data.ticketPrice = ticket;
      data.companions = document.getElementById('md-companions').value;
    }
    if (category === '电视剧' || category === '综艺') {
      data.totalEpisodes = +document.getElementById('md-total-ep').value || 0;
      data.currentEpisode = +document.getElementById('md-cur-ep').value || 0;
      data.dramaNotes = document.getElementById('md-drama-notes').value;
      data.channel = '线上观看';
    }
    if (category === '纪录片') {
      data.docTopic = document.getElementById('md-doc-topic').value;
      data.docKnowledge = document.getElementById('md-doc-knowledge').value;
      data.docReflection = document.getElementById('md-doc-reflection').value;
      data.addToStudy = document.getElementById('md-add-study').checked;
      data.channel = '线上观看';
    }
    if (status === '搁置弃看') {
      data.abandonReason = document.getElementById('md-abandon').value;
    }
    if (status === '已看完') data.progress = 100;

    let mediaId;
    if (editId) { Store.update('media', editId, data); mediaId = editId; }
    else { const saved = Store.add('media', data); mediaId = saved.id; }

    /* 内联摘抄 / 笔记：同步到 media_notes（类型「摘抄」「笔记」） */
    const excerpt = document.getElementById('md-excerpt').value.trim();
    const note = document.getElementById('md-note').value.trim();
    if (editId) {
      this._reconcileInlineNote(mediaId, '摘抄', excerpt);
      this._reconcileInlineNote(mediaId, '笔记', note);
    } else {
      if (excerpt) Store.add('media_notes', { mediaId, noteType: '摘抄', content: excerpt, annotation: '', date: data.startDate || Utils.today(), fromOCR: false });
      if (note) Store.add('media_notes', { mediaId, noteType: '笔记', content: note, annotation: '', date: data.startDate || Utils.today(), fromOCR: false });
    }

    /* 自动记忆：影院 / 题材标签 / 同行人 */
    if (data.cinema) Store.rememberInput('cinema', data.cinema);
    if (data.tags) Store.rememberInput('mediaTags', data.tags);
    if (data.companions) Store.rememberInput('companions', data.companions);
    // 纪录片纳入学习计划（仅新增时写入，避免编辑时重复生成）
    if (!editId && data.addToStudy) {
      Store.add('study_records', {
        content: '纪录片《' + title + '》', type: '纪录片', duration: 0,
        date: data.startDate, note: data.docTopic + ': ' + (data.docReflection || '')
      });
    }
    App.clearDraft('media');
    this._mediaImages = [];
    App.closeModal(); App.showToast(editId ? (I18n.t('saved') || '已保存') : I18n.t('added'), 'success'); App.render();
  },

  /* 影音内联摘抄/笔记：编辑时与表单字段保持一致（有内容则更新/新建，无内容则删除） */
  _reconcileInlineNote(mediaId, type, content) {
    const existing = Store.filter('media_notes', n => n.mediaId === mediaId && n.noteType === type);
    if (content) {
      if (existing.length) Store.update('media_notes', existing[0].id, { content, annotation: '', date: Utils.today(), fromOCR: false });
      else Store.add('media_notes', { mediaId, noteType: type, content, annotation: '', date: Utils.today(), fromOCR: false });
    } else {
      existing.forEach(n => Store.remove('media_notes', n.id));
    }
  },

  delMedia(id) {
    App.confirm(I18n.t('confirmDelete'), () => {
      Store.remove('media', id);
      Store.get('media_notes').filter(n => n.mediaId === id).forEach(n => Store.remove('media_notes', n.id));
      App.render();
    });
  },

  removeSavedMediaImage(id, idx) {
    const m = Store.find('media', x => x.id === id);
    if (!m || !Array.isArray(m.images)) return;
    App.confirm('确认删除这张图片？', () => {
      const imgs = m.images.slice();
      imgs.splice(idx, 1);
      Store.update('media', id, { images: imgs });
      App.showToast('图片已删除', 'success');
      this.mediaDetail(id);
    });
  },

  mediaDetail(id) {
    const m = Store.find('media', x => x.id === id);
    const notes = Store.filter('media_notes', n => n.mediaId === id).sort((a, b) => b.date.localeCompare(a.date));
    App.openModal(`
      <div class="modal-title">🎬 ${Utils.escape(m.title)}</div>
      <div class="label-pair"><span class="lk">品类</span><span class="vk">${m.category}</span></div>
      <div class="label-pair"><span class="lk">标签</span><span class="vk">${Utils.escape(m.tags)}</span></div>
      <div class="label-pair"><span class="lk">状态</span><span class="vk">${m.status} ${m.progress}%</span></div>
      <div class="label-pair"><span class="lk">日期</span><span class="vk">${m.startDate || ''} ~ ${m.endDate || ''}</span></div>
      ${m.rating > 0 ? `<div class="label-pair"><span class="lk">评分</span><span class="vk">${'⭐'.repeat(m.rating)}</span></div>` : ''}
      ${m.cost > 0 && m.category !== '电影' ? `<div class="label-pair"><span class="lk">花销</span><span class="vk">¥${m.cost}</span></div>` : ''}
      ${m.channel ? `<div class="label-pair"><span class="lk">渠道</span><span class="vk">${m.channel}</span></div>` : ''}
      ${m.cinema ? `<div class="label-pair"><span class="lk">影院</span><span class="vk">${Utils.escape(m.cinema)} · ${m.showTime}</span></div>` : ''}
      ${m.ticketPrice > 0 ? `<div class="label-pair"><span class="lk">票价</span><span class="vk">¥${m.ticketPrice}</span></div>` : ''}
      ${m.companions ? `<div class="label-pair"><span class="lk">同行</span><span class="vk">${Utils.escape(m.companions)}</span></div>` : ''}
      ${m.totalEpisodes > 0 ? `<div class="label-pair"><span class="lk">集数</span><span class="vk">${m.currentEpisode}/${m.totalEpisodes}</span></div>` : ''}
      ${m.dramaNotes ? `<div class="label-pair"><span class="lk">随笔</span><span class="vk">${Utils.escape(m.dramaNotes)}</span></div>` : ''}
      ${m.docTopic ? `<div class="label-pair"><span class="lk">主题</span><span class="vk">${Utils.escape(m.docTopic)}</span></div>` : ''}
      ${m.docKnowledge ? `<div class="label-pair"><span class="lk">知识点</span><span class="vk">${Utils.escape(m.docKnowledge)}</span></div>` : ''}
      ${m.docReflection ? `<div class="label-pair"><span class="lk">心得</span><span class="vk">${Utils.escape(m.docReflection)}</span></div>` : ''}
      ${m.abandonReason ? `<div class="label-pair"><span class="lk">弃看原因</span><span class="vk">${Utils.escape(m.abandonReason)}</span></div>` : ''}
      ${(m.images && m.images.length) ? `<div class="divider"></div><div class="text-sm text-bold mb-8">🖼 票根 / 海报</div>${App.renderImageGrid(m.images, '', i => `StudyMod.removeSavedMediaImage(${m.id}, ${i})`)}` : ''}
      <div class="divider"></div>
      <div class="flex-between mb-8"><div class="subsection-title" style="margin:0;">摘抄/笔记 (${notes.length})</div><button class="btn btn-outline btn-sm" onclick="App.closeModal();StudyMod.addMediaNote(${id})">+ 添加</button></div>
      ${notes.map(n => `
        <div class="card" style="padding:10px;">
          <div class="flex-between"><span class="tag-small">${n.noteType}${n.fromOCR ? ' · OCR' : ''}</span><span class="text-sm text-light">${n.date}</span></div>
          <div class="mt-8" style="font-size:14px;white-space:pre-wrap;">${Utils.escape(n.content)}</div>
          ${n.annotation ? `<div class="text-sm text-light mt-8">批注：${Utils.escape(n.annotation)}</div>` : ''}
          <div class="flex gap-8 mt-8" style="justify-content:flex-end;">
            <button class="btn btn-outline btn-sm" onclick="StudyMod.editMediaNote(${n.id})">修改</button>
            <button class="btn btn-cancel btn-sm" onclick="StudyMod.delMediaNote(${n.id})">删除</button>
          </div>
        </div>
      `).join('') || '<div class="text-light text-sm">暂无摘抄笔记</div>'}
      <div class="modal-actions">
        <button class="btn-cancel" onclick="App.closeModal()">${I18n.t('close')}</button>
        <button class="btn-outline" onclick="App.closeModal();StudyMod.editMedia(${id})">编辑</button>
        <button class="btn-outline" onclick="App.closeModal();StudyMod.exportMedia(${id})">导出</button>
      </div>
    `);
  },

  addMediaNote(mediaId) {
    App.openModal(this.mediaNoteForm(null, mediaId));
  },

  editMediaNote(id) {
    const n = Store.find('media_notes', x => x.id === id);
    if (!n) return;
    App.closeModal();
    App.openModal(this.mediaNoteForm(n, n.mediaId));
  },

  mediaNoteForm(n, mediaId) {
    const isEdit = !!n;
    const types = ['台词摘抄', '观后感', '知识点', '追剧随笔', '摘抄', '笔记'];
    return `
      <div class="modal-title">${isEdit ? '✏️ 修改摘抄/笔记' : '添加摘抄/笔记'}</div>
      <div class="form-group"><label class="form-label">类型</label><select id="mn-type">${types.map(t => `<option${isEdit && n.noteType === t ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">内容 <span class="req">*</span></label><textarea id="mn-content" rows="4">${isEdit ? Utils.escape(n.content || '') : ''}</textarea></div>
      <div class="form-group"><label class="form-label">批注</label><input type="text" id="mn-annotation" value="${isEdit ? Utils.escape(n.annotation || '') : ''}"></div>
      <div class="form-group"><label class="form-label">日期</label><input type="date" id="mn-date" value="${isEdit ? (n.date || Utils.today()) : Utils.today()}"></div>
      <div class="form-group">
        <label class="form-label">📷 图片转文字</label>
        <div class="img-upload-area" onclick="StudyMod.ocrMediaNote()">上传/拍摄截图识别</div>
        <div class="ocr-alt-row"><button type="button" class="btn-cancel btn-mini" onclick="StudyMod.pasteToField('mn-content','mn-ocr-area')">📋 粘贴文字</button></div>
        <div id="mn-ocr-area"></div>
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="StudyMod.mediaDetail(${mediaId})">${I18n.t('cancel')}</button>
        <button class="btn-confirm" onclick="StudyMod.saveMediaNote(${mediaId}, ${isEdit ? n.id : 'null'})">${I18n.t('save')}</button>
      </div>`;
  },

  delMediaNote(id) {
    const n = Store.find('media_notes', x => x.id === id);
    if (!n) return;
    const mediaId = n.mediaId;
    App.confirm('确定删除这条摘抄/笔记吗？删除后不可恢复。', () => {
      Store.remove('media_notes', id);
      App.showToast(I18n.t('deleted') || '已删除', 'success');
      StudyMod.mediaDetail(mediaId);
    }, '删除笔记');
  },

  ocrMediaNote() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      const f = input.files[0];
      if (!f) return;
      Utils.runOCR('mn-ocr-area', f, (text) => {
        const ta = document.getElementById('mn-content');
        if (ta) ta.value = (ta.value ? ta.value + '\n' : '') + text;
      }, { pasteHandler: "StudyMod.pasteToField('mn-content','mn-ocr-area')" });
    };
    input.click();
  },

  saveMediaNote(mediaId, noteId) {
    const content = document.getElementById('mn-content').value.trim();
    if (!content) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    const dateEl = document.getElementById('mn-date');
    const payload = {
      mediaId, noteType: document.getElementById('mn-type').value,
      content, annotation: document.getElementById('mn-annotation').value,
      date: (dateEl && dateEl.value) || Utils.today(),
      fromOCR: document.getElementById('mn-ocr-area').children.length > 0
    };
    if (noteId) Store.update('media_notes', noteId, payload);
    else Store.add('media_notes', payload);
    App.showToast(I18n.t('saved') || '已保存', 'success');
    this.mediaDetail(mediaId);
  },

  exportMedia(id) {
    const m = Store.find('media', x => x.id === id);
    const notes = Store.filter('media_notes', n => n.mediaId === id);
    let text = `《${m.title}》\n品类：${m.category} | 状态：${m.status} | 评分：${'⭐'.repeat(m.rating)}\n`;
    text += `日期：${m.startDate} ~ ${m.endDate}\n`;
    if (m.cinema) text += `影院：${m.cinema} | 场次：${m.showTime} | 票价：¥${m.ticketPrice} | 同行：${m.companions}\n`;
    if (m.docTopic) text += `主题：${m.docTopic}\n知识点：${m.docKnowledge}\n心得：${m.docReflection}\n`;
    if (m.abandonReason) text += `弃看原因：${m.abandonReason}\n`;
    text += '\n===== 摘抄/笔记 =====\n';
    notes.forEach(n => { text += `\n[${n.noteType}] ${n.date}\n${n.content}\n${n.annotation ? '批注：' + n.annotation + '\n' : ''}`; });
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = m.title + '_影音记录.txt';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    App.showToast('导出成功', 'success');
  },

  /* ===== 学情报告 ===== */
  renderReport() {
    const records = Store.get('study_records');
    const books = Store.get('books');
    const media = Store.get('media');
    const finished = books.filter(b => b.status === '已读完').length;
    const totalDuration = records.reduce((s, r) => s + r.duration, 0);
    const typeMap = {};
    records.forEach(r => { typeMap[r.type] = (typeMap[r.type] || 0) + r.duration; });
    const typeData = Object.entries(typeMap).map(([k, v]) => ({ label: k, value: v }));

    // 月度学习时长
    const month = Utils.today().slice(0, 7);
    const monthDuration = records.filter(r => r.date.startsWith(month)).reduce((s, r) => s + r.duration, 0);

    // 影音统计
    const watchedMedia = media.filter(m => m.status === '已看完');
    const mediaCost = media.reduce((s, m) => s + (m.cost || 0), 0);
    const highRatedMedia = media.filter(m => m.rating >= 4);

    document.getElementById('study-sub').innerHTML = `
      <div class="dash-grid">
        <div class="dash-stat"><div class="dash-stat-num">${totalDuration}</div><div class="dash-stat-label">累计学习(分钟)</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${monthDuration}</div><div class="dash-stat-label">本月(分钟)</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${finished}</div><div class="dash-stat-label">已读书籍</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${watchedMedia.length}</div><div class="dash-stat-label">已看影音</div></div>
      </div>
      ${typeData.length > 0 ? `<div class="chart-box"><div class="chart-title">学习类型分布</div>${Charts.pie(typeData)}</div>` : ''}
      <div class="ai-report">
        <div class="ai-report-title">🤖 AI学情分析</div>
        <div class="ai-report-body">
          <ul>
            <li>本周学习时长 ${records.filter(r => Utils.daysBetween(r.date, Utils.today()) <= 7).reduce((s, r) => s + r.duration, 0)} 分钟</li>
            <li>主要学习方向：${Object.entries(typeMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '暂无'}</li>
            <li>阅读完成率：${books.length > 0 ? Math.round(finished / books.length * 100) : 0}%</li>
            <li>影音记录：共${media.length}部，已看完${watchedMedia.length}部，总花销¥${mediaCost.toFixed(0)}，高分作品${highRatedMedia.length}部</li>
            <li>建议：${monthDuration < 600 ? '本月学习时长偏少，建议每天保持30分钟以上学习' : '学习状态良好，继续保持'}</li>
          </ul>
        </div>
      </div>
      <button class="btn btn-outline btn-block" onclick="App.exportModuleCSV('study_records',[{label:'内容',field:'content'},{label:'类型',field:'type'},{label:'时长',field:'duration'},{label:'日期',field:'date'},{label:'备注',field:'note'}])">${I18n.t('exportCsv')}</button>
    `;
  }
};
