/* ===== 热点资讯库（新闻热点+自媒体素材整合） ===== */
const NewsMod = {
  subTab: 'feed',
  _searchKeyword: '',
  _timeFilter: 'all',
  _contentCat: 'all',
  _sourceCat: 'all',
  _heatLevel: 'all',
  _sortMode: 'publish',
  _customStart: '',
  _customEnd: '',
  _batchFilter: 'all',

  render(c) {
    c.innerHTML = `
      <div class="section-title">🔥 热点资讯库</div>
      <div class="sub-tabs">
        <div class="sub-tab ${this.subTab === 'feed' ? 'active' : ''}" onclick="NewsMod.setSub('feed')">资讯流</div>
        <div class="sub-tab ${this.subTab === 'favorites' ? 'active' : ''}" onclick="NewsMod.setSub('favorites')">收藏夹</div>
        <div class="sub-tab ${this.subTab === 'monitor' ? 'active' : ''}" onclick="NewsMod.setSub('monitor')">定向监控</div>
      </div>
      <div id="news-sub"></div>
    `;
    if (this.subTab === 'feed') this.renderFeed();
    else if (this.subTab === 'favorites') this.renderFavorites();
    else this.renderMonitor();
  },

  setSub(tab) { this.subTab = tab; App.render(); },

  lastCrawlText() {
    let t = +(localStorage.getItem(this.LAST_CRAWL_KEY) || 0);
    // 兜底：如果本地时间戳缺失/异常，取 hotspot_data 中最新的 crawlTime
    if (!t) {
      const times = Store.get('hotspot_data')
        .map(d => new Date(d.crawlTime).getTime())
        .filter(x => !isNaN(x));
      if (times.length) t = Math.max(...times);
    }
    if (!t) return '尚未抓取';
    const diff = Date.now() - t;
    const abs = Utils.formatBeijing(t);
    if (diff < 60000) return `刚刚 · ${abs}`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前 · ${abs}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前 · ${abs}`;
    return abs;
  },

  /* ===== 资讯流 ===== */
  renderFeed() {
    const allData = Store.get('hotspot_data');
    let filtered = this.applyFilters(allData);

    // 排序
    if (this._sortMode === 'publish') filtered.sort((a, b) => (b.contentDate || '').localeCompare(a.contentDate || ''));
    else if (this._sortMode === 'crawl') filtered.sort((a, b) => (b.crawlTime || '').localeCompare(a.crawlTime || ''));
    else if (this._sortMode === 'heat') filtered.sort((a, b) => this.getHeatScore(b) - this.getHeatScore(a));

    // 抓取批次列表
    const batches = [...new Set(allData.map(d => d.crawlBatch))].sort().reverse();

    document.getElementById('news-sub').innerHTML = `
      <div class="card mb-12">
        <div class="flex-between mb-8">
          <div class="text-sm text-light">🔄 每2小时自动增量抓取 · 标题/URL双重去重 · 多代理容错</div>
          <div class="flex gap-8">
            <button class="btn btn-outline btn-sm" onclick="NewsMod.manageSources()">📡 抓取源</button>
            <button class="btn btn-primary btn-sm" onclick="NewsMod.manualCrawl()">⚡ 手动抓取</button>
          </div>
        </div>
        <div class="text-sm text-light">当前共 ${allData.length} 条资讯 · ${batches.length} 个抓取批次 · 上次抓取：${this.lastCrawlText()}</div>
      </div>

      <div class="card mb-12">
        <div class="form-group" style="margin:0;">
          <input type="text" id="ns-search" placeholder="🔍 关键词检索（标题+正文全文匹配）" value="${this._searchKeyword}" oninput="NewsMod._searchKeyword=this.value;NewsMod.renderFeed()" style="width:100%;">
        </div>
        <div class="divider" style="margin:8px 0;"></div>
        <div class="flex-wrap gap-8">
          <select onchange="NewsMod._timeFilter=this.value;NewsMod.renderFeed()" style="width:auto;padding:4px 8px;font-size:12px;border:1px solid #A6B7A1;border-radius:6px;">
            <option value="all" ${this._timeFilter === 'all' ? 'selected' : ''}>全部时间</option>
            <option value="2h" ${this._timeFilter === '2h' ? 'selected' : ''}>近2小时</option>
            <option value="1d" ${this._timeFilter === '1d' ? 'selected' : ''}>近1天</option>
            <option value="7d" ${this._timeFilter === '7d' ? 'selected' : ''}>近7天</option>
            <option value="30d" ${this._timeFilter === '30d' ? 'selected' : ''}>近30天</option>
            <option value="custom" ${this._timeFilter === 'custom' ? 'selected' : ''}>自定义</option>
            <option value="batch" ${this._timeFilter === 'batch' ? 'selected' : ''}>按批次</option>
          </select>
          <select onchange="NewsMod._contentCat=this.value;NewsMod.renderFeed()" style="width:auto;padding:4px 8px;font-size:12px;border:1px solid #A6B7A1;border-radius:6px;">
            <option value="all" ${this._contentCat === 'all' ? 'selected' : ''}>全部分类</option>
            <option value="综合新闻" ${this._contentCat === '综合新闻' ? 'selected' : ''}>综合新闻</option>
            <option value="财经" ${this._contentCat === '财经' ? 'selected' : ''}>财经</option>
            <option value="科技" ${this._contentCat === '科技' ? 'selected' : ''}>科技</option>
            <option value="社会" ${this._contentCat === '社会' ? 'selected' : ''}>社会</option>
            <option value="娱乐" ${this._contentCat === '娱乐' ? 'selected' : ''}>娱乐</option>
            <option value="生活" ${this._contentCat === '生活' ? 'selected' : ''}>生活</option>
            <option value="行业自媒体" ${this._contentCat === '行业自媒体' ? 'selected' : ''}>行业自媒体</option>
            <option value="博主创作素材" ${this._contentCat === '博主创作素材' ? 'selected' : ''}>博主创作素材</option>
          </select>
          <select onchange="NewsMod._sourceCat=this.value;NewsMod.renderFeed()" style="width:auto;padding:4px 8px;font-size:12px;border:1px solid #A6B7A1;border-radius:6px;">
            <option value="all" ${this._sourceCat === 'all' ? 'selected' : ''}>全部来源</option>
            <option value="权威新闻平台" ${this._sourceCat === '权威新闻平台' ? 'selected' : ''}>权威新闻平台</option>
            <option value="短视频自媒体" ${this._sourceCat === '短视频自媒体' ? 'selected' : ''}>短视频自媒体</option>
            <option value="图文自媒体" ${this._sourceCat === '图文自媒体' ? 'selected' : ''}>图文自媒体</option>
            <option value="公众号专栏" ${this._sourceCat === '公众号专栏' ? 'selected' : ''}>公众号专栏</option>
          </select>
          <select onchange="NewsMod._heatLevel=this.value;NewsMod.renderFeed()" style="width:auto;padding:4px 8px;font-size:12px;border:1px solid #A6B7A1;border-radius:6px;">
            <option value="all" ${this._heatLevel === 'all' ? 'selected' : ''}>全部热度</option>
            <option value="高热热搜" ${this._heatLevel === '高热热搜' ? 'selected' : ''}>高热热搜</option>
            <option value="普通热点" ${this._heatLevel === '普通热点' ? 'selected' : ''}>普通热点</option>
            <option value="小众创作素材" ${this._heatLevel === '小众创作素材' ? 'selected' : ''}>小众创作素材</option>
          </select>
          <select onchange="NewsMod._sortMode=this.value;NewsMod.renderFeed()" style="width:auto;padding:4px 8px;font-size:12px;border:1px solid #A6B7A1;border-radius:6px;">
            <option value="publish" ${this._sortMode === 'publish' ? 'selected' : ''}>发布时间↓</option>
            <option value="crawl" ${this._sortMode === 'crawl' ? 'selected' : ''}>抓取时间↓</option>
            <option value="heat" ${this._sortMode === 'heat' ? 'selected' : ''}>热度↓</option>
          </select>
        </div>
        ${this._timeFilter === 'custom' ? `
          <div class="flex gap-8 mt-8">
            <input type="date" id="ns-start" value="${this._customStart}" onchange="NewsMod._customStart=this.value;NewsMod.renderFeed()" style="width:auto;">
            <span class="text-light">至</span>
            <input type="date" id="ns-end" value="${this._customEnd}" onchange="NewsMod._customEnd=this.value;NewsMod.renderFeed()" style="width:auto;">
          </div>
        ` : ''}
        ${this._timeFilter === 'batch' ? `
          <div class="flex gap-8 mt-8">
            <select onchange="NewsMod._batchFilter=this.value;NewsMod.renderFeed()" style="width:auto;padding:4px 8px;font-size:12px;border:1px solid #A6B7A1;border-radius:6px;">
              <option value="all" ${this._batchFilter === 'all' ? 'selected' : ''}>全部批次</option>
              ${batches.map(b => `<option value="${b}" ${this._batchFilter === b ? 'selected' : ''}>批次 ${b}</option>`).join('')}
            </select>
          </div>
        ` : ''}
      </div>

      <div class="text-sm text-light mb-8">筛选结果：${filtered.length} 条</div>
      ${filtered.length > 0 ? filtered.map(d => this.renderItem(d)).join('') : '<div class="empty-state"><div class="empty-icon">🔍</div>无匹配结果</div>'}
    `;
  },

  /* 应用筛选 */
  applyFilters(data) {
    let filtered = [...data];

    // 关键词搜索
    if (this._searchKeyword) {
      const kw = this._searchKeyword.toLowerCase();
      filtered = filtered.filter(d =>
        (d.title || '').toLowerCase().includes(kw) ||
        (d.fullText || '').toLowerCase().includes(kw) ||
        (d.summary || '').toLowerCase().includes(kw) ||
        (d.aiTags || '').toLowerCase().includes(kw)
      );
    }

    // 时间筛选
    const now = new Date();
    if (this._timeFilter === '2h') {
      const cutoff = new Date(now - 7200000);
      filtered = filtered.filter(d => new Date(d.crawlTime) >= cutoff);
    } else if (this._timeFilter === '1d') {
      const cutoff = new Date(now - 86400000);
      filtered = filtered.filter(d => new Date(d.crawlTime) >= cutoff);
    } else if (this._timeFilter === '7d') {
      const cutoff = new Date(now - 604800000);
      filtered = filtered.filter(d => new Date(d.crawlTime) >= cutoff);
    } else if (this._timeFilter === '30d') {
      const cutoff = new Date(now - 2592000000);
      filtered = filtered.filter(d => new Date(d.crawlTime) >= cutoff);
    } else if (this._timeFilter === 'custom') {
      if (this._customStart) filtered = filtered.filter(d => d.contentDate >= this._customStart);
      if (this._customEnd) filtered = filtered.filter(d => d.contentDate <= this._customEnd);
    } else if (this._timeFilter === 'batch') {
      if (this._batchFilter !== 'all') filtered = filtered.filter(d => d.crawlBatch === this._batchFilter);
    }

    // 分类筛选
    if (this._contentCat !== 'all') filtered = filtered.filter(d => d.contentCat === this._contentCat);
    if (this._sourceCat !== 'all') filtered = filtered.filter(d => d.sourceCat === this._sourceCat);
    if (this._heatLevel !== 'all') filtered = filtered.filter(d => d.heatLevel === this._heatLevel);

    return filtered;
  },

  getHeatScore(d) {
    return (d.likes || 0) + (d.comments || 0) * 2 + (d.hotRank > 0 ? 100000 / d.hotRank : 0);
  },

  /* 渲染单条资讯 */
  renderItem(d) {
    const heatIcon = d.heatLevel === '高热热搜' ? '🔥' : d.heatLevel === '普通热点' ? '📈' : '📝';
    const sourceIcon = d.sourceCat === '权威新闻平台' ? '📰' : d.sourceCat === '短视频自媒体' ? '🎬' : d.sourceCat === '图文自媒体' ? '📸' : '📝';
    const isFav = Store.find('hotspot_favorites', f => f.hotspotId === d.id);

    return `
      <div class="card ${d.heatLevel === '高热热搜' ? '' : ''}" style="padding:14px;">
        <div class="flex-between mb-8">
          <div class="flex-center gap-8">
            <span style="font-size:18px;">${heatIcon}</span>
            <div>
              <div class="text-bold" style="font-size:15px;">${Utils.escape(d.title)}</div>
              <div class="text-sm text-light">${sourceIcon} ${d.platform} · ${d.contentDate} · ${d.contentCat}</div>
            </div>
          </div>
          <div class="flex gap-8">
            <button class="btn ${isFav ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="NewsMod.toggleFav(${d.id})">${isFav ? '★' : '☆'}</button>
            <button class="btn btn-outline btn-sm" onclick="NewsMod.showDetail(${d.id})">详情</button>
            <button class="btn btn-outline btn-sm" onclick="NewsMod.openLink(${d.id})">直达</button>
            <button class="btn btn-outline btn-sm" onclick="NewsMod.copyLink(${d.id})">🔗复制</button>
          </div>
        </div>
        <div class="text-sm" style="color:#555;line-height:1.6;">${Utils.escape(d.summary)}</div>
        ${d.aiSummary ? `<div class="ai-report mt-8" style="padding:8px;"><div class="text-sm" style="color:#829E8E;">🤖 AI摘要：${Utils.escape(d.aiSummary)}</div></div>` : ''}
        <div class="flex-wrap gap-8 mt-8">
          ${d.hotRank > 0 ? `<span class="tag-small" style="background:#e65100;color:white;">热搜 #${d.hotRank}</span>` : ''}
          <span class="tag-small" style="background:#A6B7A1;color:white;">${d.heatLevel}</span>
          <span class="tag-small">${d.sourceCat}</span>
          ${d.likes > 0 ? `<span class="tag-small">👍 ${d.likes.toLocaleString()}</span>` : ''}
          ${d.comments > 0 ? `<span class="tag-small">💬 ${d.comments.toLocaleString()}</span>` : ''}
          ${d.aiTags ? d.aiTags.split(',').map(t => `<span class="tag-small" style="background:#F3F7F1;color:#829E8E;">#${t.trim()}</span>`).join('') : ''}
        </div>
        <div class="text-sm text-light mt-8">抓取批次：${d.crawlBatch} · 抓取时间：${d.crawlTime}</div>
        ${isFav ? '<div class="text-sm mt-4" style="color:#829E8E;">★ 已收藏</div>' : ''}
      </div>
    `;
  },

  /* ===== 详情弹窗 ===== */
  showDetail(id) {
    const d = Store.find('hotspot_data', x => x.id === id);
    if (!d) return;
    const isFav = Store.find('hotspot_favorites', f => f.hotspotId === id);
    App.openModal(`
      <div class="modal-title" style="font-size:16px;line-height:1.5;">${Utils.escape(d.title)}</div>
      <div class="text-sm text-light mb-12">${d.platform} · ${d.contentDate} · ${d.contentCat} · ${d.heatLevel}</div>
      <div class="card" style="padding:10px;margin-bottom:8px;">
        <div class="text-sm" style="line-height:1.7;">${Utils.escape(d.fullText || d.summary)}</div>
      </div>
      ${d.aiSummary ? `<div class="ai-report"><div class="ai-report-title">🤖 AI精简摘要</div><div class="ai-report-body">${Utils.escape(d.aiSummary)}</div></div>` : ''}
      <div class="card mt-8" style="padding:10px;">
        <div class="card-title" style="font-size:14px;">📋 详细信息</div>
        <div class="label-pair"><span class="lk">来源平台</span><span class="vk">${d.platform}</span></div>
        <div class="label-pair"><span class="lk">来源分类</span><span class="vk">${d.sourceCat}</span></div>
        <div class="label-pair"><span class="lk">内容分类</span><span class="vk">${d.contentCat}</span></div>
        <div class="label-pair"><span class="lk">热度等级</span><span class="vk">${d.heatLevel}</span></div>
        ${d.hotRank > 0 ? `<div class="label-pair"><span class="lk">热搜排名</span><span class="vk">#${d.hotRank}</span></div>` : ''}
        ${d.likes > 0 ? `<div class="label-pair"><span class="lk">点赞</span><span class="vk">${d.likes.toLocaleString()}</span></div>` : ''}
        ${d.comments > 0 ? `<div class="label-pair"><span class="lk">评论</span><span class="vk">${d.comments.toLocaleString()}</span></div>` : ''}
        <div class="label-pair"><span class="lk">AI标签</span><span class="vk">${d.aiTags || '无'}</span></div>
        <div class="label-pair"><span class="lk">抓取批次</span><span class="vk">${d.crawlBatch}</span></div>
        <div class="label-pair"><span class="lk">抓取时间</span><span class="vk">${d.crawlTime}</span></div>
        <div class="label-pair"><span class="lk">原文链接</span><span class="vk"><a href="javascript:void(0)" onclick="NewsMod.openLink(${d.id})" style="color:#829E8E;">点击查看</a></span></div>
      </div>
      <div class="flex gap-8 mt-12">
        <button class="btn ${isFav ? 'btn-primary' : 'btn-outline'} btn-block" onclick="NewsMod.toggleFav(${d.id});App.closeModal();">${isFav ? '★ 取消收藏' : '☆ 收藏'}</button>
        <button class="btn btn-outline btn-block" onclick="NewsMod.aiSummarize(${d.id})">🤖 重新摘要</button>
        <button class="btn btn-outline btn-block" onclick="NewsMod.openLink(${d.id})">🔗 原文</button>
        <button class="btn btn-outline btn-block" onclick="NewsMod.copyLink(${d.id})">📋 复制链接</button>
      </div>
      <div class="modal-actions"><button class="btn-confirm" onclick="App.closeModal()">关闭</button></div>
    `);
  },

  /* 直达原文：区分「网页可直达」与「App 专属平台」 */
  openLink(id) {
    const d = Store.find('hotspot_data', x => x.id === id);
    if (!d) return;
    // 这几家刻意阻断网页深链、强制跳 App，直达只会落在家登录页/下载墙，故改为复制链接
    const appOnly = ['小红书', '抖音', '微信公众号', '视频号', '快手', 'B站', 'bilibili'];
    if (!d.url) {
      App.toast('⚠️ 暂无原文链接');
      return;
    }
    if (appOnly.includes(d.platform)) {
      Utils.copyToClipboard(d.url).then(ok => {
        App.toast(ok
          ? `📋 链接已复制，请在「${d.platform}」App 中粘贴打开`
          : `🔗 ${d.url}`);
      });
    } else {
      window.open(d.url, '_blank');
    }
  },

  /* 始终复制原文链接（不区分平台） */
  copyLink(id) {
    const d = Store.find('hotspot_data', x => x.id === id);
    if (!d || !d.url) { App.toast('⚠️ 暂无原文链接'); return; }
    Utils.copyToClipboard(d.url).then(ok => {
      App.toast(ok ? '📋 链接已复制到剪贴板' : `🔗 ${d.url}`);
    });
  },

  /* AI精简摘要 */
  aiSummarize(id) {
    const d = Store.find('hotspot_data', x => x.id === id);
    App.openModal(`
      <div class="modal-title">🤖 AI精简摘要</div>
      <div id="ai-sum-area"><div class="ocr-loading"><div class="ocr-spinner"></div>AI正在分析全文并生成精简摘要...</div></div>
    `);
    setTimeout(() => {
      const text = d.fullText || d.summary || '';
      const sentences = text.split(/[。！？\n]/).filter(s => s.trim());
      const summary = sentences.slice(0, 2).join('。') + (sentences.length > 2 ? '。' : '');
      Store.update('hotspot_data', id, { aiSummary: summary });
      document.getElementById('ai-sum-area').innerHTML = `
        <div class="ai-report"><div class="ai-report-title">✅ AI摘要已生成</div><div class="ai-report-body">${Utils.escape(summary)}</div></div>
        <div class="modal-actions"><button class="btn-confirm" onclick="App.closeModal();NewsMod.renderFeed();">完成</button></div>
      `;
    }, 2000);
  },

  /* ===== 收藏夹 ===== */
  renderFavorites() {
    const favs = Store.get('hotspot_favorites');
    const favItems = favs.map(f => Store.find('hotspot_data', d => d.id === f.hotspotId)).filter(d => d);

    document.getElementById('news-sub').innerHTML = `
      <div class="subsection-title">★ 收藏夹（永久存储）</div>
      <div class="text-sm text-light mb-12">共 ${favItems.length} 条收藏</div>
      ${favItems.length > 0 ? favItems.map(d => this.renderItem(d)).join('') : '<div class="empty-state"><div class="empty-icon">☆</div>暂无收藏</div>'}
    `;
  },

  toggleFav(id) {
    const fav = Store.find('hotspot_favorites', f => f.hotspotId === id);
    if (fav) {
      Store.remove('hotspot_favorites', fav.id);
      App.showToast('已取消收藏', 'success');
    } else {
      Store.add('hotspot_favorites', { hotspotId: id, addedDate: Utils.today() });
      App.showToast('已收藏', 'success');
    }
    App.render();
  },

  /* ===== 定向监控 ===== */
  renderMonitor() {
    const monitors = Store.get('hotspot_monitors');

    document.getElementById('news-sub').innerHTML = `
      <div class="flex-between mb-12">
        <div class="subsection-title" style="margin:0;">🎯 定向监控</div>
        <button class="btn btn-primary btn-sm" onclick="NewsMod.addMonitor()">+ 新增监控</button>
      </div>
      <div class="card mb-12">
        <div class="text-sm text-light">自定义关键词或指定博主账号，系统定向优先抓取，匹配内容置顶展示。</div>
      </div>
      ${monitors.length > 0 ? monitors.map(m => {
        const matched = Store.filter('hotspot_data', d =>
          (d.title || '').includes(m.keyword) ||
          (d.aiTags || '').includes(m.keyword) ||
          (d.platform || '').includes(m.keyword)
        );
        return `
          <div class="card">
            <div class="flex-between">
              <div>
                <div class="text-bold">${Utils.escape(m.keyword)}</div>
                <div class="text-sm text-light">${m.type === 'keyword' ? '关键词监控' : '博主监控'} · 创建于 ${m.createdAt}</div>
                <div class="text-sm text-light mt-4">匹配 ${matched.length} 条资讯</div>
              </div>
              <div class="flex gap-8">
                <button class="btn btn-outline btn-sm" onclick="NewsMod.viewMonitored('${Utils.escape(m.keyword)}')">查看匹配</button>
                <button class="btn btn-cancel btn-sm" onclick="NewsMod.delMonitor(${m.id})">✕</button>
              </div>
            </div>
          </div>
        `;
      }).join('') : '<div class="empty-state"><div class="empty-icon">🎯</div>暂无监控项</div>'}
    `;
  },

  addMonitor() {
    App.openModal(`
      <div class="modal-title">新增定向监控</div>
      <div class="form-group"><label class="form-label">监控关键词 / 博主账号 <span class="req">*</span></label><input type="text" id="mon-keyword" placeholder="例：AI编程、消费政策、某博主ID"></div>
      <div class="form-group"><label class="form-label">监控类型</label><select id="mon-type"><option value="keyword">关键词监控</option><option value="author">博主监控</option></select></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="NewsMod.saveMonitor()">${I18n.t('save')}</button></div>
    `);
  },

  saveMonitor() {
    const keyword = document.getElementById('mon-keyword').value.trim();
    if (!keyword) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    Store.add('hotspot_monitors', { keyword, type: document.getElementById('mon-type').value, createdAt: Utils.today() });
    App.closeModal(); App.showToast(I18n.t('saved'), 'success'); App.render();
  },

  delMonitor(id) {
    App.confirm(I18n.t('confirmDelete'), () => { Store.remove('hotspot_monitors', id); App.render(); });
  },

  viewMonitored(keyword) {
    this._searchKeyword = keyword;
    this.subTab = 'feed';
    App.render();
  },

  /* ===================== 真实 RSS 抓取 ===================== */

  /* 内置抓取源（可在「抓取源」中增删） */
  DEFAULT_SOURCES: [
    { name: '36氪',     url: 'https://36kr.com/feed',                          contentCat: '科技',     sourceCat: '行业垂直媒体', enabled: true },
    { name: 'IT之家',   url: 'https://www.ithome.com/rss/',                    contentCat: '科技',     sourceCat: '行业垂直媒体', enabled: true },
    { name: '少数派',   url: 'https://sspai.com/feed',                         contentCat: '生活',     sourceCat: '行业垂直媒体', enabled: true },
    { name: '虎嗅网',   url: 'https://www.huxiu.com/rss/0.xml',                contentCat: '财经',     sourceCat: '行业垂直媒体', enabled: true },
    { name: '人民网',   url: 'http://www.people.com.cn/rss/politics.xml',      contentCat: '综合新闻', sourceCat: '权威新闻平台', enabled: true },
    { name: '新浪新闻', url: 'https://rss.sina.com.cn/news/china/focus15.xml', contentCat: '社会',     sourceCat: '权威新闻平台', enabled: true },
  ],

  CRAWL_INTERVAL_MS: 60 * 60 * 1000,   // 1 小时
  LAST_CRAWL_KEY: 'bb_news_last_crawl',

  sources() {
    const custom = Store.get('news_sources');
    if (!custom.length) {
      // 首次使用，将内置源写入表中，便于用户管理
      this.DEFAULT_SOURCES.forEach(s => Store.add('news_sources', s));
      return Store.get('news_sources');
    }
    return custom;
  },

  /* 带超时的 fetch */
  _fetchText(url, timeout = 12000) {
    return new Promise((resolve, reject) => {
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = setTimeout(() => { if (ctrl) ctrl.abort(); reject(new Error('timeout')); }, timeout);
      fetch(url, ctrl ? { signal: ctrl.signal } : {})
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(t => { clearTimeout(timer); resolve(t); })
        .catch(e => { clearTimeout(timer); reject(e); });
    });
  },

  /* 解析 RSS / Atom XML 为条目数组 */
  _parseFeed(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    if (doc.querySelector('parsererror')) throw new Error('XML 解析失败');
    const pick = (el, tags) => {
      for (const t of tags) {
        const n = el.getElementsByTagName(t)[0];
        if (n && n.textContent) return n.textContent.trim();
      }
      return '';
    };
    let nodes = Array.from(doc.getElementsByTagName('item'));
    let isAtom = false;
    if (!nodes.length) { nodes = Array.from(doc.getElementsByTagName('entry')); isAtom = true; }
    return nodes.map(n => {
      let link = pick(n, ['link']);
      if (isAtom && !link) {
        const l = n.getElementsByTagName('link')[0];
        if (l) link = l.getAttribute('href') || '';
      }
      const desc = pick(n, ['description', 'summary', 'content:encoded', 'content']);
      return {
        title: pick(n, ['title']),
        link,
        desc: this._stripHTML(desc),
        pubDate: pick(n, ['pubDate', 'published', 'updated', 'dc:date'])
      };
    }).filter(x => x.title);
  },

  _stripHTML(html) {
    if (!html) return '';
    const d = document.createElement('div');
    d.innerHTML = html;
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  },

  _toDate(str) {
    if (!str) return Utils.today();
    const d = new Date(str);
    if (isNaN(d.getTime())) return Utils.today();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  },

  /* 抓取单个源：依次尝试多个 CORS 代理 */
  async fetchSource(src) {
    const enc = encodeURIComponent(src.url);
    const attempts = [
      { type: 'json', url: `https://api.rss2json.com/v1/api.json?rss_url=${enc}&count=20` },
      { type: 'xml',  url: `https://api.allorigins.win/raw?url=${enc}` },
      { type: 'xml',  url: `https://corsproxy.io/?url=${enc}` },
      { type: 'xml',  url: `https://api.codetabs.com/v1/proxy?quest=${enc}` },
    ];
    let lastErr = null;
    for (const a of attempts) {
      try {
        const text = await this._fetchText(a.url);
        if (a.type === 'json') {
          const j = JSON.parse(text);
          if (j.status !== 'ok' || !Array.isArray(j.items) || !j.items.length) throw new Error(j.message || '无数据');
          return j.items.map(it => ({
            title: (it.title || '').trim(),
            link: it.link || '',
            desc: this._stripHTML(it.description || it.content || ''),
            pubDate: it.pubDate || ''
          })).filter(x => x.title);
        }
        const items = this._parseFeed(text);
        if (!items.length) throw new Error('无条目');
        return items;
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('全部代理均失败');
  },

  /* 生成条目对象 */
  _buildItem(raw, src) {
    const now = new Date();
    const bj = Utils._bjDate();
    const summary = raw.desc ? raw.desc.slice(0, 120) : '';
    return {
      title: raw.title.slice(0, 120),
      summary,
      url: raw.link,
      platform: src.name,
      contentDate: this._toDate(raw.pubDate),
      crawlBatch: Utils.today() + '-' + String(bj.getHours()).padStart(2, '0'),
      crawlTime: Utils.now(),
      likes: 0, comments: 0, hotRank: 0,
      contentCat: src.contentCat || '综合新闻',
      sourceCat: src.sourceCat || '权威新闻平台',
      heatLevel: '普通热点',
      aiTags: this._autoTags(raw.title + ' ' + summary),
      images: [],
      fullText: raw.desc || summary,
      aiSummary: summary.slice(0, 60),
      isFavorited: false
    };
  },

  _autoTags(text) {
    const dict = ['AI','人工智能','大模型','芯片','新能源','汽车','手机','苹果','华为','小米','特斯拉','股市','基金','房价','就业','教育','医疗','旅游','美食','明星','游戏','电商','出海','政策','消费'];
    const hit = dict.filter(k => text.includes(k));
    return hit.slice(0, 5).join(',');
  },

  /* 核心抓取流程 */
  async runCrawl(onProgress) {
    const srcs = this.sources().filter(s => s.enabled !== false);
    const existing = Store.get('hotspot_data');
    const seenTitle = new Set(existing.map(e => e.title));
    const seenUrl = new Set(existing.map(e => e.url).filter(Boolean));
    let added = 0;
    const okList = [], failList = [];

    for (const src of srcs) {
      if (onProgress) onProgress(`正在抓取：${src.name} …`);
      try {
        const items = await this.fetchSource(src);
        let n = 0;
        items.slice(0, 15).forEach(raw => {
          if (!raw.title) return;
          if (seenTitle.has(raw.title)) return;
          if (raw.link && seenUrl.has(raw.link)) return;
          seenTitle.add(raw.title);
          if (raw.link) seenUrl.add(raw.link);
          Store.add('hotspot_data', this._buildItem(raw, src));
          n++; added++;
        });
        okList.push(`${src.name} +${n}`);
      } catch (e) {
        failList.push(`${src.name}（${e.message || '失败'}）`);
      }
    }
    localStorage.setItem(this.LAST_CRAWL_KEY, String(Date.now()));
    this.cleanOldNews();
    return { added, okList, failList, total: srcs.length };
  },

  /* 存档保留 30 天（未收藏的过期内容自动清理） */
  cleanOldNews() {
    const limit = Utils.addDays(Utils.today(), -30);
    const favIds = new Set(Store.get('hotspot_favorites').map(f => f.hotspotId));
    Store.get('hotspot_data').forEach(d => {
      if (!favIds.has(d.id) && !d.isFavorited && (d.contentDate || '') < limit) {
        Store.remove('hotspot_data', d.id);
      }
    });
  },

  /* 手动抓取（带 UI） */
  simulateCrawl() { this.manualCrawl(); },

  async manualCrawl() {
    App.openModal(`
      <div class="modal-title">⚡ 手动触发抓取</div>
      <div id="crawl-area"><div class="ocr-loading"><div class="ocr-spinner"></div><span id="crawl-tip">正在连接抓取源…</span></div></div>
    `);
    const tip = (msg) => { const el = document.getElementById('crawl-tip'); if (el) el.textContent = msg; };
    let res;
    try {
      res = await this.runCrawl(tip);
    } catch (e) {
      const area = document.getElementById('crawl-area');
      if (area) area.innerHTML = `
        <div class="ocr-result">抓取异常：${Utils.escape(e.message || '未知错误')}</div>
        <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">关闭</button><button class="btn-confirm" onclick="NewsMod.manualCrawl()">重试</button></div>`;
      return;
    }
    const area = document.getElementById('crawl-area');
    if (!area) return;
    const allFail = res.failList.length === res.total;
    area.innerHTML = `
      <div class="ai-report">
        <div class="ai-report-title">${allFail ? '⚠️ 抓取失败' : '✅ 抓取完成'}</div>
        <div class="ai-report-body">
          本轮新增 <b>${res.added}</b> 条资讯（标题/URL 双重去重）<br>
          ${res.okList.length ? '成功：' + Utils.escape(res.okList.join('、')) + '<br>' : ''}
          ${res.failList.length ? '<span style="color:#C08B7D;">失败：' + Utils.escape(res.failList.join('、')) + '</span><br>' : ''}
          ${allFail ? '<div class="text-sm" style="margin-top:6px;">可能原因：当前网络无法访问外部 RSS 或公共代理被限流。可稍后重试，或在「抓取源」中更换为可访问的 RSS 地址。</div>' : ''}
          <div class="text-sm text-light" style="margin-top:6px;">下一轮自动抓取：2 小时后 · 存档保留 30 天</div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="NewsMod.manageSources()">抓取源</button>
        <button class="btn-confirm" onclick="App.closeModal();App.render();">查看</button>
      </div>`;
  },

  /* 后台自动抓取：距上次超过 2 小时则静默执行 */
  async autoCrawl(force) {
    const last = +(localStorage.getItem(this.LAST_CRAWL_KEY) || 0);
    if (!force && Date.now() - last < this.CRAWL_INTERVAL_MS) return;
    try {
      const res = await this.runCrawl();
      if (res.added > 0) {
        Store.add('inbox', {
          type: 'info', source: '热点资讯', title: '热点资讯已更新',
          content: `自动抓取新增 ${res.added} 条资讯`,
          date: Utils.now(),
          read: false, actionModule: 'hotspot', actionSub: 'feed', actionId: 0, auto: true
        });
        if (App.refreshNotifications) App.refreshNotifications();
        if (App.currentModule === 'hotspot') App.render();
      }
    } catch (e) { /* 静默失败，等待下一轮 */ }
  },

  startAutoCrawl() {
    // 启动后 8 秒尝试一次（避免拖慢首屏），之后每 30 分钟检查是否到期
    setTimeout(() => this.autoCrawl(), 8000);
    setInterval(() => this.autoCrawl(), 30 * 60 * 1000);
  },

  /* ===== 抓取源管理 ===== */
  manageSources() {
    const list = this.sources();
    App.openModal(`
      <div class="modal-title">📡 抓取源管理</div>
      <div class="text-sm text-light mb-8">支持任意 RSS / Atom 地址。抓取通过公共 CORS 代理完成，个别源可能因目标站点限制而失败。</div>
      <div id="src-list">
        ${list.map(s => `
          <div class="card" style="padding:10px;">
            <div class="flex-between">
              <div style="min-width:0;">
                <div class="text-bold">${Utils.escape(s.name)} <span class="tag-small">${Utils.escape(s.contentCat || '')}</span></div>
                <div class="text-sm text-light" style="word-break:break-all;">${Utils.escape(s.url)}</div>
              </div>
              <div class="flex gap-8">
                <button class="btn ${s.enabled !== false ? 'btn-secondary' : 'btn-outline'} btn-sm" onclick="NewsMod.toggleSource(${s.id})">${s.enabled !== false ? '启用中' : '已停用'}</button>
                <button class="btn btn-cancel btn-sm" onclick="NewsMod.delSource(${s.id})">✕</button>
              </div>
            </div>
          </div>`).join('')}
      </div>
      <div class="divider"></div>
      <div class="form-group"><label class="form-label">新增源名称</label><input type="text" id="src-name" placeholder="如：知乎日报"></div>
      <div class="form-group"><label class="form-label">RSS 地址</label><input type="text" id="src-url" placeholder="https://..."></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">内容分类</label><select id="src-cat">${['综合新闻','财经','科技','社会','娱乐','生活','行业自媒体','博主创作素材'].map(c => `<option>${c}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">来源分类</label><select id="src-scat">${['权威新闻平台','行业垂直媒体','公众号专栏','社交平台'].map(c => `<option>${c}</option>`).join('')}</select></div>
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="App.closeModal()">关闭</button>
        <button class="btn-confirm" onclick="NewsMod.addSource()">+ 添加源</button>
      </div>
    `);
  },

  addSource() {
    const name = document.getElementById('src-name').value.trim();
    const url = document.getElementById('src-url').value.trim();
    if (!name || !url) { App.showToast('请填写名称和地址', 'error'); return; }
    if (!/^https?:\/\//i.test(url)) { App.showToast('地址需以 http:// 或 https:// 开头', 'error'); return; }
    Store.add('news_sources', {
      name, url,
      contentCat: document.getElementById('src-cat').value,
      sourceCat: document.getElementById('src-scat').value,
      enabled: true
    });
    App.showToast('已添加', 'success');
    this.manageSources();
  },

  toggleSource(id) {
    const s = Store.find('news_sources', x => x.id === id);
    if (!s) return;
    Store.update('news_sources', id, { enabled: s.enabled === false });
    this.manageSources();
  },

  delSource(id) {
    App.confirm('确定删除该抓取源吗？', () => {
      Store.remove('news_sources', id);
      NewsMod.manageSources();
    }, '删除抓取源');
  }
};
