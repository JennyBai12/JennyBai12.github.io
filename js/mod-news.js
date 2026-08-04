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
          <div class="text-sm text-light">🔄 每2小时自动增量抓取 · 标题/URL双重去重 · 失败自动重试</div>
          <button class="btn btn-outline btn-sm" onclick="NewsMod.simulateCrawl()">⚡ 手动抓取</button>
        </div>
        <div class="text-sm text-light">当前共 ${allData.length} 条资讯 · ${batches.length} 个抓取批次</div>
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

  /* ===== 模拟抓取 ===== */
  simulateCrawl() {
    App.openModal(`
      <div class="modal-title">⚡ 手动触发抓取</div>
      <div id="crawl-area"><div class="ocr-loading"><div class="ocr-spinner"></div>正在全网抓取...增量去重中...</div></div>
    `);
    setTimeout(() => {
      const newItems = [
        { title:'国家统计局：7月CPI同比上涨0.5%', summary:'7月份居民消费价格指数同比上涨0.5%，环比上涨0.3%。', url:'http://www.stats.gov.cn', platform:'人民网', contentDate:Utils.today(), crawlBatch:Utils.today() + '-' + new Date().getHours(), crawlTime:Utils.today() + ' ' + new Date().toTimeString().slice(0,8), likes:0, comments:0, hotRank:0, contentCat:'财经', sourceCat:'权威新闻平台', heatLevel:'普通热点', aiTags:'CPI,物价,经济', images:[], fullText:'7月份居民消费价格指数同比上涨0.5%，环比上涨0.3%。其中食品价格下降0.2%，非食品价格上涨0.7%。', aiSummary:'7月CPI同比+0.5%，食品降非食品涨。', isFavorited:false },
        { title:'AI绘画工具Midjourney V7发布', summary:'Midjourney发布V7版本，新增实时编辑、风格迁移等功能。', url:'https://www.midjourney.com', platform:'微信公众号', contentDate:Utils.today(), crawlBatch:Utils.today() + '-' + new Date().getHours(), crawlTime:Utils.today() + ' ' + new Date().toTimeString().slice(0,8), likes:8500, comments:420, hotRank:0, contentCat:'科技', sourceCat:'公众号专栏', heatLevel:'普通热点', aiTags:'AI,绘画,Midjourney', images:[], fullText:'Midjourney发布V7版本，新增实时编辑、风格迁移等功能，画质和速度均有大幅提升。', aiSummary:'MJ V7发布，新增实时编辑和风格迁移。', isFavorited:false },
      ];
      // 去重
      const existing = Store.get('hotspot_data');
      let added = 0;
      newItems.forEach(item => {
        if (!existing.find(e => e.title === item.title || e.url === item.url)) {
          Store.add('hotspot_data', item);
          added++;
        }
      });
      document.getElementById('crawl-area').innerHTML = `
        <div class="ai-report">
          <div class="ai-report-title">✅ 抓取完成</div>
          <div class="ai-report-body">
            本轮新增 ${added} 条资讯（去重后）<br>
            下一轮自动抓取：2小时后<br>
            存档保留：30天
          </div>
        </div>
        <div class="modal-actions"><button class="btn-confirm" onclick="App.closeModal();NewsMod.renderFeed();">查看</button></div>
      `;
    }, 2500);
  }
};
