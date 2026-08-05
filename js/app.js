/* ===== App 主逻辑 ===== */
const App = {
  currentModule: 'home',
  currentSubModule: null,
  navItems: [
    { id: 'home', icon: '🏠', label: 'home' },
    { id: 'habits', icon: '✅', label: 'habits' },
    { id: 'study', icon: '📚', label: 'study' },
    { id: 'health', icon: '💊', label: 'health' },
    { id: 'work', icon: '💼', label: 'work' },
    { id: 'hotspot', icon: '🔥', label: 'hotspot' },
    { id: 'diary', icon: '✏️', label: 'diary' },
    { id: 'wardrobe', icon: '👕', label: 'wardrobe' },
    { id: 'goods', icon: '📦', label: 'goods' },
    { id: 'savings', icon: '💰', label: 'savings' },
    { id: 'reminders', icon: '⏰', label: 'reminders' },
    { id: 'calendar', icon: '📅', label: 'calendar' },
  ],
  APP_VERSION: 'v30',

  /* 版本更新说明：新版本上线后首次打开自动弹窗展示，并同步推送至收件箱 */
  CHANGELOG: {
    'v27': [
      '右下角新增常驻版本号，便于确认是否已加载最新版',
      '修复 Service Worker 缓存导致「改动不生效」的问题（更新后自动刷新页面）'
    ],
    'v29': [
      '💰 储蓄板块全面改版：进入需输入与「私密日记」相同的密码，完全保密',
      '💰 快照式存档：登记结余 + 月收入 + 月支出，每次生成独立且永久锁定的存档快照',
      '💰 月度进度监测：展示消耗进度、目标结余差值、正常 / 节约预警 / 超支预警三态标签',
      '💰 触发预警时自动弹窗并推送至收件箱；历史存档仅展示时间 / 结余 / 收支，不暴露单笔流水'
    ],
    'v30': [
      '📣 版本更新说明新增「收件箱同步」：每次自动弹出更新说明的同时，自动推送一条「已更新到 v30」消息到收件箱（含本次更新内容），可在收件箱随时回看',
      '📣 点击右下角版本号可随时重看历史更新说明'
    ]
  },

  _verNum(v) { const m = String(v || '').match(/(\d+)/); return m ? +m[1] : 0; },

  maybeShowChangelog(force) {
    const seen = Store.getSetting('seenVersion', '');
    if (!force && seen === this.APP_VERSION) return;
    const seenNum = this._verNum(seen);
    const versions = Object.keys(this.CHANGELOG)
      .filter(v => this._verNum(v) > seenNum)
      .sort((a, b) => this._verNum(a) - this._verNum(b));
    if (!versions.length) { Store.setSetting('seenVersion', this.APP_VERSION); return; }
    const lines = [];
    const plain = [];
    versions.forEach(v => {
      lines.push(`<div class="changelog-ver">【${Utils.escape(v)}】</div>`);
      this.CHANGELOG[v].forEach(c => { lines.push(`<div class="changelog-line">· ${Utils.escape(c)}</div>`); plain.push(c); });
    });
    App.openModal(`
      <div class="modal-title">🎉 已更新到 ${Utils.escape(this.APP_VERSION)}</div>
      <div class="changelog-box">${lines.join('')}</div>
      <div class="modal-actions"><button class="btn-confirm" onclick="App.closeModal()">知道了</button></div>
    `);
    // 同步推送至收件箱：仅真实版本升级时推送一次，避免重复；从点击版本号手动重看时不重复推送
    const pushedKey = 'versionInboxPushed';
    if (!force && Store.getSetting(pushedKey, '') !== this.APP_VERSION) {
      Store.add('inbox', {
        type: '系统通知', source: 'system',
        title: `🎉 已更新到 ${this.APP_VERSION}`,
        content: `本次更新内容：${plain.join('；')}`,
        date: Utils.now(), read: false,
        actionModule: '', actionSub: '', actionId: 0,
        auto: false
      });
      Store.setSetting(pushedKey, this.APP_VERSION);
    }
    Store.setSetting('seenVersion', this.APP_VERSION);
  },

  init() {
    Store.init();
    I18n.setLang('zh');
    this.buildNav();
    this.cleanExpiredInbox();
    // 读取「当日通知已生成」标记（持久化），避免刷新/重开后重复生成通知、覆盖用户的已读/删除/清空状态
    this._inboxNotifiedKey = localStorage.getItem('bb_inbox_gen_day') || null;
    this.refreshNotifications();
    this.navigate('home');
    // 初始化云同步
    Cloud.init();
    Cloud.updateSyncIndicator();
    // 注册 Service Worker（PWA 离线缓存 + 资源加速）
    if ('serviceWorker' in navigator) {
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;        // 防止更新后的重复刷新循环
        refreshing = true;
        location.reload();             // 新版本接管后自动刷新，确保用户始终用上最新代码
      });
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    // 热点资讯：后台自动增量抓取（每2小时检查一次）
    if (typeof NewsMod !== 'undefined' && NewsMod.startAutoCrawl) NewsMod.startAutoCrawl();
    // 常驻显示当前版本号，便于确认是否已加载最新版（排查「改动不生效」问题时使用）
    let vt = document.getElementById('app-version-tag');
    if (!vt) {
      vt = document.createElement('div');
      vt.id = 'app-version-tag';
      vt.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:9999;font-size:11px;opacity:.4;background:rgba(0,0,0,.4);color:#fff;padding:2px 8px;border-radius:10px;pointer-events:none;';
      document.body.appendChild(vt);
    }
    vt.textContent = '白白的日记 ' + (this.APP_VERSION || '');
    vt.style.pointerEvents = 'auto';
    vt.style.cursor = 'pointer';
    vt.title = '点击查看更新说明';
    vt.onclick = () => App.maybeShowChangelog(true);
    // 版本更新后自动弹出更新说明
    this.maybeShowChangelog();
  },


  /* 清理超过7天的收件箱消息 */
  cleanExpiredInbox() {
    const today = Utils.today();
    const inbox = Store.get('inbox');
    const filtered = inbox.filter(i => {
      if (!i.date) return true; // 无日期的保留
      const age = Utils.daysBetween(i.date.slice(0, 10), today);
      return age <= 7; // 7天以内保留
    });
    if (filtered.length !== inbox.length) {
      Store.save('inbox', filtered);
    }
  },

  /* ===== 导航 ===== */
  buildNav() {
    const sidebarNav = document.getElementById('sidebar-nav');
    const bottomNav = document.getElementById('bottom-nav');
    sidebarNav.innerHTML = this.navItems.map(item =>
      `<div class="nav-item" id="nav-${item.id}" onclick="App.navigate('${item.id}')">
        <span class="nav-icon">${item.icon}</span>
        <span data-i18n="${item.label}">${I18n.t(item.label)}</span>
      </div>`
    ).join('');
    bottomNav.innerHTML = this.navItems.map(item =>
      `<div class="bn-item" id="bn-${item.id}" onclick="App.navigate('${item.id}')">
        <span class="bn-icon">${item.icon}</span>
        <span>${I18n.t(item.label)}</span>
      </div>`
    ).join('');
  },

  navigate(module, sub) {
    this.currentModule = module;
    this.currentSubModule = sub || null;
    // 更新导航高亮（无论是否有 sub）
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.bn-item').forEach(el => el.classList.remove('active'));
    const navEl = document.getElementById(`nav-${module}`);
    const bnEl = document.getElementById(`bn-${module}`);
    if (navEl) navEl.classList.add('active');
    if (bnEl) bnEl.classList.add('active');
    document.getElementById('page-title').textContent = I18n.t(module === 'home' ? 'home' : module);
    document.getElementById('sidebar').classList.remove('open');
    // 子模块跳转：如果目标模块有 setSub 方法，切换到对应子标签
    if (sub) {
      const modMap = { study: 'StudyMod', health: 'HealthMod', work: 'WorkMod', goods: 'GoodsMod' };
      const modName = modMap[module];
      if (modName && window[modName] && typeof window[modName].setSub === 'function') {
        window[modName].setSub(sub);
        return; // setSub 内部会触发 App.render()
      }
    }
    this.render();
  },

  toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); },

  toggleLang() {
    I18n.lang = I18n.lang === 'zh' ? 'en' : 'zh';
    I18n.setLang(I18n.lang);
    document.getElementById('lang-label').textContent = I18n.lang === 'zh' ? 'EN' : '中';
    document.getElementById('lang-label-m').textContent = I18n.lang === 'zh' ? 'EN' : '中';
    this.buildNav();
    this.navigate(this.currentModule);
  },

  /* ===== 云同步 - 登录/注册/登出 ===== */
  showLogin() {
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('login-email').focus();
  },

  closeLogin() {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('login-tip').textContent = '';
    // 重置验证码倒计时
    if (this._codeTimer) { clearInterval(this._codeTimer); this._codeTimer = null; }
    if (this._regCodeTimer) { clearInterval(this._regCodeTimer); this._regCodeTimer = null; }
    if (this._emailCodeTimer) { clearInterval(this._emailCodeTimer); this._emailCodeTimer = null; }
    // 重置邮箱验证码按钮
    const ecode = document.getElementById('btn-send-email-code');
    if (ecode) { ecode.disabled = false; ecode.textContent = '获取验证码'; }
  },

  /* 切换邮箱登录子模式（密码/验证码） */
  switchEmailMode(mode) {
    document.getElementById('email-sub-pwd').classList.toggle('active', mode === 'pwd');
    document.getElementById('email-sub-otp').classList.toggle('active', mode === 'otp');
    document.getElementById('email-pwd-form').style.display = mode === 'pwd' ? '' : 'none';
    document.getElementById('email-otp-form').style.display = mode === 'otp' ? '' : 'none';
    document.getElementById('login-tip').textContent = '';
  },

  /* 发送邮箱验证码 */
  async sendEmailCode() {
    const email = document.getElementById('login-email-otp').value.trim();
    const tip = document.getElementById('login-tip');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      tip.textContent = '请输入正确的邮箱地址'; tip.className = 'login-tip error'; return;
    }
    const btn = document.getElementById('btn-send-email-code');
    btn.disabled = true;
    tip.textContent = '正在发送验证码...'; tip.className = 'login-tip';

    const result = await Cloud.sendEmailOtp(email);
    if (result.error) {
      tip.textContent = result.error; tip.className = 'login-tip error';
      btn.disabled = false; btn.textContent = '获取验证码';
      return;
    }
    tip.textContent = '验证码已发送，请查收邮箱'; tip.className = 'login-tip success';

    let sec = 60;
    btn.textContent = sec + 's';
    this._emailCodeTimer = setInterval(() => {
      sec--;
      btn.textContent = sec + 's';
      if (sec <= 0) {
        clearInterval(this._emailCodeTimer);
        this._emailCodeTimer = null;
        btn.disabled = false;
        btn.textContent = '获取验证码';
      }
    }, 1000);
  },

  /* 邮箱验证码登录 */
  async doEmailOtpLogin() {
    const email = document.getElementById('login-email-otp').value.trim();
    const code = document.getElementById('login-email-code').value.trim();
    const tip = document.getElementById('login-tip');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      tip.textContent = '请输入正确的邮箱地址'; tip.className = 'login-tip error'; return;
    }
    if (!/^\d{6}$/.test(code)) {
      tip.textContent = '请输入 6 位验证码'; tip.className = 'login-tip error'; return;
    }
    tip.textContent = '登录中...'; tip.className = 'login-tip';
    const result = await Cloud.verifyEmailOtp(email, code);
    if (result.error) {
      tip.textContent = result.error; tip.className = 'login-tip error';
    } else {
      tip.textContent = '✅ 登录成功，正在同步数据...'; tip.className = 'login-tip success';
      setTimeout(() => { this.closeLogin(); }, 1500);
      Cloud.updateSyncIndicator();
    }
  },

  async doLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const tip = document.getElementById('login-tip');
    if (!email || !password) { tip.textContent = '请填写邮箱和密码'; tip.className = 'login-tip error'; return; }

    tip.textContent = '登录中...'; tip.className = 'login-tip';
    const result = await Cloud.login(email, password);
    if (result.error) {
      tip.textContent = result.error; tip.className = 'login-tip error';
    } else {
      tip.textContent = '✅ 登录成功，正在同步数据...'; tip.className = 'login-tip success';
      setTimeout(() => { this.closeLogin(); }, 1500);
      Cloud.updateSyncIndicator();
    }
  },

  async doRegister() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const tip = document.getElementById('login-tip');
    if (!email || !password) { tip.textContent = '请填写邮箱和密码'; tip.className = 'login-tip error'; return; }
    if (password.length < 6) { tip.textContent = '密码至少 6 位'; tip.className = 'login-tip error'; return; }

    tip.textContent = '注册中...'; tip.className = 'login-tip';
    const result = await Cloud.register(email, password);
    if (result.error) {
      tip.textContent = result.error; tip.className = 'login-tip error';
    } else if (result.needsConfirm) {
      tip.textContent = '✅ 注册成功，请查收验证邮件完成激活后再登录'; tip.className = 'login-tip success';
      setTimeout(() => { this.closeLogin(); }, 2500);
    } else {
      tip.textContent = '✅ 注册成功，正在同步数据...'; tip.className = 'login-tip success';
      setTimeout(() => { this.closeLogin(); }, 1500);
      Cloud.updateSyncIndicator();
    }
  },

  async doLogout() {
    this.confirm('确定要退出登录吗？本地数据会保留，云端数据不受影响。', async () => {
      await Cloud.logout();
      Cloud.updateSyncIndicator();
      this.showToast('已退出登录', 'success');
      this.navigate('home');
    });
  },

  async manualSync() {
    if (!Cloud.loggedIn) { this.showLogin(); return; }
    this.showToast('正在同步...', 'info');
    await Cloud.sync();
  },

  /* ===== 数据备份 / 恢复 ===== */
  exportData() {
    const json = Store.exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bb-diary-backup-${Utils.today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('数据已导出', 'success');
  },

  importData(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        JSON.parse(text); // 验证JSON格式
        this.confirm('导入数据将覆盖当前所有内容，确定继续？', () => {
          Store.importAll(text);
          Store.notifyCloud();
          this.showToast('数据已恢复', 'success');
          this.render();
        });
      } catch (err) {
        this.showToast('文件格式错误', 'error');
      }
    };
    reader.readAsText(file);
    input.value = ''; // 重置input以便重复选择同一文件
  },

  /* ===== 渲染入口 ===== */
  render() {
    const c = document.getElementById('content');
    const m = this.currentModule;
    if (m === 'home') this.renderHome(c);
    else if (m === 'habits' && typeof HabitsMod !== 'undefined') HabitsMod.render(c);
    else if (m === 'study' && typeof StudyMod !== 'undefined') StudyMod.render(c);
    else if (m === 'health' && typeof HealthMod !== 'undefined') HealthMod.render(c);
    else if (m === 'work' && typeof WorkMod !== 'undefined') WorkMod.render(c);
    else if (m === 'hotspot' && typeof NewsMod !== 'undefined') NewsMod.render(c);
    else if (m === 'diary' && typeof DiaryMod !== 'undefined') DiaryMod.render(c);
    else if (m === 'wardrobe' && typeof WardrobeMod !== 'undefined') WardrobeMod.render(c);
    else if (m === 'goods' && typeof GoodsMod !== 'undefined') GoodsMod.render(c);
    else if (m === 'savings' && typeof SavingsMod !== 'undefined') SavingsMod.render(c);
    else if (m === 'reminders' && typeof RemindersMod !== 'undefined') RemindersMod.render(c);
    else if (m === 'calendar' && typeof CalendarMod !== 'undefined') CalendarMod.render(c);
    else c.innerHTML = `<div class="empty-state"><div class="empty-icon">🔧</div>模块开发中...</div>`;
  },

  /* ===== 首页 ===== */
  renderHome(c) {
    const today = Utils.today();
    const stats = TaskAgg.dayStats(today);
    const rate = stats.rate;
    const inboxItems = Store.get('inbox').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const inboxUnread = inboxItems.filter(i => !i.read).length;
    const inboxCount = inboxItems.length;

    // 物资日均开销
    const goods2 = Store.get('goods_c2');
    const totalDayCost = goods2.filter(g => !g.archived).reduce((s, g) => s + (g.dayCost || 0), 0);

    // 闲置物品
    let idleCount = 0;
    Store.get('clothes').forEach(cl => { if (!cl.archived && !cl.isSecondhand && cl.annualCount < 1) idleCount++; });
    Store.get('goods_durable_main').forEach(d => { if (!d.archived && d.cumUses < 1) idleCount++; });
    const yearAgo = Utils.addDays(today, -365);
    Store.filter('plants', p => p.status === '养护中').forEach(p => {
      if (Store.filter('plant_care', c => c.plantId === p.id && c.careDate >= yearAgo).length === 0) idleCount++;
    });

    // 近30天提醒
    const reminders = Store.get('reminders').concat(Store.get('holidays'))
      .map(r => ({ name: r.name, date: r.date, days: Utils.daysBetween(today, r.date) }))
      .filter(r => r.days >= 0 && r.days <= 30)
      .sort((a, b) => a.days - b.days);

    // 今日待办（工作模块，供下方简览）
    const todayTodos = Store.filter('todos', t => t.status !== '已完成');
    const now0 = new Date();
    todayTodos.forEach(t => {
      if (t.status === '延期搁置' || !t.deadline) return;
      const dStr = t.deadlineTime ? `${t.deadline}T${t.deadlineTime}:00` : `${t.deadline}T23:59:59`;
      if (new Date(dStr) < now0 && !t.isOverdue) Store.update('todos', t.id, { isOverdue: true, overdueSince: Utils.today() });
    });

    c.innerHTML = `
      <div class="section-title">📊 ${I18n.t('todayOverview')}</div>
      <div class="dash-grid">
        <div class="dash-stat clickable" onclick="App.showTodayOverview('all')">
          <div class="dash-stat-num">${stats.total}</div><div class="dash-stat-label">${I18n.t('todoTotal')}</div>
          <div class="dash-stat-sub">全模块当日事项</div>
        </div>
        <div class="dash-stat clickable" onclick="App.showTodayOverview('done')">
          <div class="dash-stat-num">${stats.done}</div><div class="dash-stat-label">${I18n.t('completed')}</div>
          <div class="dash-stat-sub">已办结 / 打卡完成</div>
        </div>
        <div class="dash-stat clickable" onclick="App.showTodayOverview('incomplete')">
          <div class="dash-stat-num">${stats.incomplete}</div><div class="dash-stat-label">${I18n.t('incomplete')}</div>
          <div class="dash-stat-sub">未开始 / 进行中 / 延期</div>
        </div>
        <div class="dash-stat clickable" onclick="App.showDayReview()">
          <div class="dash-stat-num">${rate}%</div><div class="dash-stat-label">${I18n.t('completionRate')}</div>
          <div class="dash-stat-sub">点击查看复盘</div>
        </div>
      </div>

      <div class="two-col">
        <div class="card">
          <div class="card-title">📥 ${I18n.t('inbox')} ${inboxUnread ? `<span class="tag-small" style="background:var(--danger);color:#fff;">${inboxUnread}</span>` : `<span class="tag-small">${inboxCount}</span>`}</div>
          ${inboxItems.length > 0 ? inboxItems.slice(0, 3).map(i =>
            `<div class="list-item ${i.read ? '' : 'inbox-unread'}" style="padding:8px 0;" onclick="App.renderInboxDetail()"><div class="list-icon" style="font-size:16px;">${i.read ? '📨' : '📩'}</div><div class="list-body"><div class="list-title" style="font-size:14px;">${Utils.escape(i.title || '')}</div><div class="list-meta">${i.type || ''} · ${(i.date || '').slice(5, 16).replace('T', ' ')}</div></div></div>`
          ).join('') : `<div class="text-light text-sm">${I18n.t('inboxEmpty')}</div>`}
          <button class="btn btn-outline btn-sm btn-block mt-12" onclick="App.renderInboxDetail()">查看全部</button>
        </div>

        <div class="card">
          <div class="card-title">📦 ${I18n.t('dailyCost')}</div>
          <div class="flex-between"><span class="text-light text-sm">日均消耗</span><span class="text-bold text-accent" style="font-size:22px;">¥${totalDayCost.toFixed(2)}</span></div>
          <div class="divider"></div>
          <div class="card-title" style="font-size:14px;">🔴 ${I18n.t('idleItems')} <span class="tag-small">${idleCount}</span></div>
          <button class="btn btn-outline btn-sm btn-block mt-8" onclick="App.navigate('goods')">查看物资</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">📅 ${I18n.t('calendar')} · <span class="text-light text-sm" style="font-weight:400;">${today}</span></div>
        <button class="btn btn-primary btn-sm btn-block" onclick="App.navigate('calendar')">🗓️ ${I18n.t('openCalendar')}</button>
      </div>

      <div class="card">
        <div class="card-title">⏰ ${I18n.t('upcomingReminders')}</div>
        ${reminders.length > 0 ? reminders.slice(0, 5).map(r =>
          `<div class="list-item"><div class="list-icon">${r.days <= 3 ? '🔔' : '📅'}</div><div class="list-body"><div class="list-title">${Utils.escape(r.name)}</div><div class="list-meta">${r.date} · ${r.days === 0 ? '今天' : r.days + '天后'}</div></div>${r.days <= 3 ? '<span class="list-badge warn">临近</span>' : ''}</div>`
        ).join('') : `<div class="text-light text-sm">${I18n.t('noData')}</div>`}
      </div>

      <div class="card">
        <div class="card-title">📋 ${I18n.t('todayTodos')}（工作模块）</div>
        ${todayTodos.length > 0 ? todayTodos.slice(0, 6).map(t => {
          const isOverdue = t.isOverdue;
          let dl = t.deadline || '无截止';
          if (t.deadline && t.deadlineTime) dl = `${t.deadline} ${t.deadlineTime}`;
          return `
          <div class="list-item ${isOverdue ? 'idle' : ''}">
            <div class="list-icon">${t.priority === '高' ? '🔴' : t.priority === '中' ? '🟡' : '🟢'}</div>
            <div class="list-body">
              <div class="list-title">${Utils.escape(t.title)} ${isOverdue ? '<span class="tag-small" style="background:#e65100;color:white;">逾期</span>' : ''}</div>
              <div class="list-meta">${t.group || ''} · 📅 ${dl} · ${t.status}${t.assignee ? ' · 👤 ' + Utils.escape(t.assignee) : ''}</div>
            </div>
          </div>`;
        }).join('') : `<div class="empty-state"><div class="empty-icon">🎉</div>今日无待办</div>`}
        <button class="btn btn-outline btn-sm btn-block mt-12" onclick="App.navigate('work')">查看全部</button>
      </div>

      <div class="card">
        <div class="card-title">☁️ 云端同步</div>
        ${Cloud.loggedIn ? `
          <div class="flex-between">
            <div>
              <div class="text-sm"><span class="text-bold">📧 ${Cloud.userEmail || ''}</span></div>
              <div class="text-sm text-light mt-4">上次同步：${Cloud.lastSyncAt ? Cloud.lastSyncAt.slice(0,16).replace('T',' ') : '从未'}</div>
              <div class="text-sm text-light mt-4">${Cloud.localDirty ? '⏳ 有未推送的变更' : '✅ 数据已同步'}</div>
            </div>
            <div class="flex gap-8" style="flex-direction:column;gap:8px;">
              <button class="btn btn-primary btn-sm" onclick="App.manualSync()">🔄 立即同步</button>
              <button class="btn btn-cancel btn-sm" onclick="App.doLogout()">退出登录</button>
            </div>
          </div>
          <div class="flex gap-8 mt-12" style="gap:8px;">
            <button class="btn btn-outline btn-sm" style="flex:1" onclick="App.exportData()">📥 导出备份</button>
            <button class="btn btn-outline btn-sm" style="flex:1" onclick="document.getElementById('import-file').click()">📤 导入恢复</button>
            <input type="file" id="import-file" accept=".json" style="display:none" onchange="App.importData(this)">
          </div>
        ` : `
          <div class="backup-warning">
            <div class="text-sm text-bold">⚠️ 未登录 — 数据仅保存在本地</div>
            <div class="text-sm text-light mt-4">网址变更或清理缓存后数据将丢失。登录后数据自动同步云端，多设备共享。</div>
          </div>
          <button class="btn btn-primary btn-sm btn-block mt-12" onclick="App.showLogin()">☁️ 登录 / 注册</button>
          <div class="flex gap-8 mt-8" style="gap:8px;">
            <button class="btn btn-outline btn-sm" style="flex:1" onclick="App.exportData()">📥 导出备份</button>
            <button class="btn btn-outline btn-sm" style="flex:1" onclick="document.getElementById('import-file').click()">📤 导入恢复</button>
            <input type="file" id="import-file" accept=".json" style="display:none" onchange="App.importData(this)">
          </div>
        `}
      </div>
    `;
  },

  /* 渲染单条聚合事项的列表行 */
  _renderAggItem(i, opts) {
    opts = opts || {};
    const isOverdue = i.overdue;
    const priIcon = i.priority === '高' ? '🔴' : i.priority === '中' ? '🟡' : i.priority === '低' ? '🟢' : '•';
    const jump = i.actionModule ? `onclick="App.aggJump('${i.module}','${i.actionSub || ''}')"` : '';
    const cursor = i.actionModule ? 'cursor:pointer;' : '';
    const dim = i.done ? 'style="opacity:.6;"' : '';
    return `
      <div class="list-item agg-item ${isOverdue ? 'idle' : ''} ${i.done ? 'agg-done' : ''}" ${jump} style="${cursor}${i.done ? 'opacity:.6;' : ''}">
        <div class="list-icon" style="background:${i.color}22;color:${i.color};">${i.icon || priIcon}</div>
        <div class="list-body">
          <div class="list-title">${Utils.escape(i.title)} ${isOverdue ? '<span class="tag-small" style="background:#e65100;color:white;">逾期</span>' : ''} ${i.done ? '<span class="tag-small" style="background:#829E8E;color:#fff;">✓</span>' : ''}</div>
          <div class="list-meta">${TaskAgg.MODULE_LABELS[i.module] || ''}${i.time ? ' · ⏰ ' + i.time : ''}${i.priority ? ' · ' + i.priority + '优先级' : ''}</div>
        </div>
      </div>`;
  },

  /* 聚合事项点击跳转到对应模块 */
  aggJump(module, sub) {
    const modMap = { work: 'work', habits: 'habits', study: 'study', health: 'health', goods: 'goods', reminder: 'reminders', finance: 'savings' };
    const target = modMap[module];
    if (target) this.navigate(target, sub || null);
  },

  /* 当日全域清单：all / done / incomplete */
  showTodayOverview(filter) {
    const c = document.getElementById('content');
    const today = Utils.today();
    const stats = TaskAgg.dayStats(today);
    let items = TaskAgg.sortItems(stats.items);
    let title, desc;
    if (filter === 'done') { items = items.filter(i => i.done); title = I18n.t('completed'); desc = `当日已完成 ${items.length} 项`; }
    else if (filter === 'incomplete') { items = items.filter(i => !i.done); title = I18n.t('incomplete'); desc = `当日未完成 ${items.length} 项（高优先级置顶）`; }
    else { title = I18n.t('todoTotal'); desc = `当日全模块共 ${items.length} 项`; }

    // 按模块分组
    const groups = {};
    items.forEach(i => { (groups[i.module] = groups[i.module] || []).push(i); });
    const order = ['work', 'habits', 'study', 'health', 'goods', 'reminder', 'finance'];

    c.innerHTML = `
      <div class="flex-between mb-12">
        <div class="section-title" style="margin:0;">📋 ${title}</div>
        <button class="btn btn-outline btn-sm" onclick="App.navigate('home')">← ${I18n.t('back')}</button>
      </div>
      <div class="text-sm text-light mb-12">${desc}</div>
      ${items.length === 0 ? `<div class="empty-state"><div class="empty-icon">🎉</div>${I18n.t('noData')}</div>` :
        order.filter(m => groups[m]).map(m => `
          <div class="subsection-title">${TaskAgg.MODULE_LABELS[m]} <span class="text-light text-sm">${groups[m].length}</span></div>
          ${groups[m].map(i => this._renderAggItem(i)).join('')}
        `).join('')}
    `;
  },

  /* 当日复盘页：分模块完成率 + 未完成总结 + 次日预告 */
  showDayReview() {
    const c = document.getElementById('content');
    const today = Utils.today();
    const tomorrow = Utils.addDays(today, 1);
    const stats = TaskAgg.dayStats(today);

    // 分模块完成率
    const byMod = {};
    stats.items.forEach(i => {
      const m = i.module;
      byMod[m] = byMod[m] || { total: 0, done: 0 };
      byMod[m].total++; if (i.done) byMod[m].done++;
    });
    const modRows = ['work', 'habits', 'study', 'health', 'goods', 'reminder', 'finance']
      .filter(m => byMod[m])
      .map(m => {
        const r = byMod[m];
        const pct = r.total ? Math.round(r.done / r.total * 100) : 0;
        return `<div class="flex-between mb-8">
          <span class="text-sm">${TaskAgg.MODULE_LABELS[m]}</span>
          <span class="text-sm text-light">${r.done}/${r.total} · <span class="text-bold" style="color:${pct >= 80 ? '#2e7d32' : pct >= 50 ? '#f9a825' : '#c62828'}">${pct}%</span></span>
        </div>
        <div class="progress-bar mb-12"><div class="progress-fill" style="width:${pct}%;background:${pct >= 80 ? '#829E8E' : pct >= 50 ? '#FFB74D' : '#e57373'}"></div></div>`;
      }).join('');

    // 未完成总结（高优先级置顶）
    const incomplete = TaskAgg.sortItems(stats.items.filter(i => !i.done));
    // 次日预告
    const nextStats = TaskAgg.dayStats(tomorrow);
    const nextItems = TaskAgg.sortItems(nextStats.items).slice(0, 8);

    c.innerHTML = `
      <div class="flex-between mb-12">
        <div class="section-title" style="margin:0;">📈 ${I18n.t('dayReview')} · ${today}</div>
        <button class="btn btn-outline btn-sm" onclick="App.navigate('home')">← ${I18n.t('back')}</button>
      </div>

      <div class="card">
        <div class="card-title">🎯 ${I18n.t('completionRate')} ${stats.rate}%</div>
        <div class="flex-around mb-12">
          <div class="text-center"><div class="text-bold" style="font-size:22px;">${stats.total}</div><div class="text-sm text-light">${I18n.t('todoTotal')}</div></div>
          <div class="text-center"><div class="text-bold" style="font-size:22px;color:#2e7d32;">${stats.done}</div><div class="text-sm text-light">${I18n.t('completed')}</div></div>
          <div class="text-center"><div class="text-bold" style="font-size:22px;color:#c62828;">${stats.incomplete}</div><div class="text-sm text-light">${I18n.t('incomplete')}</div></div>
        </div>
        <div class="divider"></div>
        ${modRows || '<div class="text-light text-sm">暂无数据</div>'}
      </div>

      <div class="card">
        <div class="card-title">⚠️ ${I18n.t('unfinishedSummary')}（${incomplete.length}）</div>
        ${incomplete.length ? incomplete.slice(0, 12).map(i => this._renderAggItem(i)).join('') : `<div class="text-light text-sm">🎉 ${I18n.t('allDone')}</div>`}
      </div>

      <div class="card">
        <div class="card-title">🔭 ${I18n.t('nextDayPreview')} · ${tomorrow}</div>
        ${nextItems.length ? nextItems.map(i => this._renderAggItem(i)).join('') : `<div class="text-light text-sm">${I18n.t('noData')}</div>`}
      </div>
    `;
  },

  /* ===== 收件箱（统一消息通知中枢） ===== */
  _inboxFilter: 'all',
  _inboxNotifiedKey: null,

  renderInboxDetail() {
    const c = document.getElementById('content');
    this.refreshNotifications();
    const all = Store.get('inbox').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const unread = all.filter(i => !i.read);
    const filter = this._inboxFilter;
    const filtered = filter === 'all' ? all : all.filter(i => i.type === filter);

    const cats = [
      { key: 'all',    label: '全部',     icon: '📋' },
      { key: '工作提醒', label: '工作提醒', icon: '💼' },
      { key: '生活提醒', label: '生活提醒', icon: '🌿' },
      { key: '资讯推送', label: '资讯推送', icon: '📰' },
      { key: '系统通知', label: '系统通知', icon: '⚙️' },
    ];

    c.innerHTML = `
      <div class="section-title">📥 ${I18n.t('inbox')} ${unread.length ? `<span class="tag-small" style="background:var(--danger);color:#fff;">${unread.length} 未读</span>` : ''}</div>
      <div class="inbox-retention-hint">⏳ ${I18n.t('inboxRetention')}</div>
      <div class="filter-bar">
        ${cats.map(cat => `<div class="filter-tab ${filter === cat.key ? 'active' : ''}" onclick="App.inboxFilter('${cat.key}')">${cat.icon} ${cat.label}${cat.key !== 'all' ? ` <span class="text-light text-sm">${all.filter(i => i.type === cat.key && !i.read).length || ''}</span>` : ''}</div>`).join('')}
      </div>
      <div class="flex-between mb-12">
        <span class="text-sm text-light">共 ${filtered.length} 条${filter === 'all' ? '' : '（' + cats.find(c=>c.key===filter)?.label + '）'}</span>
        <div class="flex gap-8">
          ${unread.length ? `<button class="btn btn-outline btn-sm" onclick="App.inboxMarkAllRead()">✓ 全部已读</button>` : ''}
          ${all.length ? `<button class="btn btn-cancel btn-sm" onclick="App.inboxClearAll()">清空</button>` : ''}
        </div>
      </div>
      ${filtered.length > 0 ? filtered.map(i => this._renderInboxItem(i)).join('') : `<div class="empty-state"><div class="empty-icon">📭</div>${I18n.t('inboxEmpty')}</div>`}
    `;
  },

  _renderInboxItem(i) {
    const typeColors = { '工作提醒': '#e57373', '生活提醒': '#829E8E', '资讯推送': '#FFB74D', '系统通知': '#78909C' };
    const color = typeColors[i.type] || 'var(--accent)';
    const typeIcons = { '工作提醒': '💼', '生活提醒': '🌿', '资讯推送': '📰', '系统通知': '⚙️' };
    const icon = typeIcons[i.type] || '📝';
    const clickAction = (i.actionModule || i.actionSub) ? `onclick="App.inboxJump(${i.id})"` : '';
    const cursor = (i.actionModule || i.actionSub) ? 'cursor:pointer;' : '';
    return `
      <div class="list-item inbox-item ${i.read ? '' : 'inbox-unread'}" ${clickAction} style="${cursor}">
        <div class="list-icon" style="background:${color}22;color:${color};">${icon}</div>
        <div class="list-body">
          <div class="list-title">${Utils.escape(i.title || '')} ${i.read ? '' : '<span class="inbox-dot"></span>'}</div>
          <div class="list-meta">${Utils.escape(i.content || '')}</div>
          <div class="list-meta text-light" style="font-size:12px;">${i.type || ''} · ${(i.date || '').slice(0, 16).replace('T', ' ')}</div>
        </div>
        <div class="flex" style="flex-direction:column;gap:4px;align-items:flex-end;">
          <span class="list-action" onclick="event.stopPropagation();App.delInbox(${i.id})">✕</span>
        </div>
      </div>`;
  },

  inboxFilter(type) {
    this._inboxFilter = type;
    this.renderInboxDetail();
  },

  inboxMarkAllRead() {
    const inbox = Store.get('inbox');
    let changed = false;
    inbox.forEach(i => { if (!i.read) { i.read = true; changed = true; } });
    if (changed) Store.save('inbox', inbox);
    this.renderInboxDetail();
    this.showToast('已全部标记为已读', 'success');
  },

  inboxClearAll() {
    this.confirm('确认清空收件箱？所有消息将被删除，不可恢复。', () => {
      Store.save('inbox', []);
      // 标记「当日已生成通知」为今天，确保当天内不再自动重新生成（满足"清空后刷新不复发"）
      const today = Utils.today();
      this._inboxNotifiedKey = today;
      localStorage.setItem('bb_inbox_gen_day', today);
      this.renderInboxDetail();
      this.showToast('收件箱已清空', 'success');
    }, '清空收件箱');
  },

  inboxJump(id) {
    const item = Store.get('inbox').find(i => i.id === id);
    if (!item) return;
    if (!item.read) Store.update('inbox', item.id, { read: true });
    if (item.actionModule) {
      this.navigate(item.actionModule, item.actionSub || null);
    }
  },

  delInbox(id) {
    Store.remove('inbox', id);
    this.renderInboxDetail();
    this.showToast(I18n.t('deleted'));
  },

  /* ===== 通知自动生成 ===== */
  refreshNotifications() {
    const today = Utils.today();
    const now = Utils.now();
    // 用日期做去重 key，同一天内不重复生成
    const dayKey = today;
    if (this._inboxNotifiedKey === dayKey) return;
    this._inboxNotifiedKey = dayKey;

    // 批量操作：先收集所有要生成的通知，最后一次性写入
    const inbox = Store.get('inbox');
    // 保留手动添加的（非auto）且未过期的，清除旧的自动通知
    const kept = inbox.filter(i => {
      if (i.auto) return false; // 清除旧自动通知，后面重新生成
      if (i.date) {
        const age = Utils.daysBetween(i.date.slice(0, 10), today);
        if (age > 7) return false; // 清理过期
      }
      return true;
    });
    const newItems = [];

    const add = (type, source, title, content, actionModule, actionSub, actionId) => {
      newItems.push({ type, source, title, content, date: now, read: false, actionModule: actionModule || '', actionSub: actionSub || '', actionId: actionId || 0, auto: true });
    };

    // 1. 工作模块 — 待办截止/逾期/高优先级
    const todos = Store.get('todos');
    todos.forEach(t => {
      if (t.status === '已完成') return;
      if (t.isOverdue) {
        add('工作提醒', 'work', `⚠️ 待办逾期：${t.title}`, `「${t.title}」已逾期${t.overdueSince ? '，自 ' + t.overdueSince + ' 起' : ''}，请尽快处理。`, 'work', '', t.id);
      } else if (t.deadline) {
        const days = Utils.daysBetween(today, t.deadline);
        if (days === 0) add('工作提醒', 'work', `📌 今日截止：${t.title}`, `「${t.title}」今天截止，别忘了完成。`, 'work', '', t.id);
        else if (days > 0 && days <= 3) add('工作提醒', 'work', `⏰ 即将截止：${t.title}`, `「${t.title}」还剩 ${days} 天截止（${t.deadline}）。`, 'work', '', t.id);
      }
      if (t.priority === '高' && t.status === '未开始') {
        add('工作提醒', 'work', `🔴 高优先级待办：${t.title}`, `「${t.title}」标记为高优先级但尚未开始。`, 'work', '', t.id);
      }
    });

    // 2. 健康模块 — 体检复查 / 植物养护
    if (typeof HealthMod !== 'undefined') {
      Store.get('family_medical').forEach(m => {
        if (m.reviewDate) {
          const days = Utils.daysBetween(today, m.reviewDate);
          if (days >= 0 && days <= 7) add('生活提醒', 'health', `🏥 体检复查提醒`, `${m.reviewDate} 需要复查${m.title ? '：' + m.title : ''}。`, 'health', '', m.id);
        }
      });
      Store.filter('plants', p => p.status === '养护中').forEach(p => {
        const cares = Store.filter('plant_care', c => c.plantId === p.id);
        const lastCare = cares.sort((a, b) => (b.careDate || '').localeCompare(a.careDate || ''))[0];
        if (!lastCare || Utils.daysBetween(lastCare.careDate, today) >= 7) {
          add('生活提醒', 'health', `🌱 养护提醒：${p.name}`, `「${p.name}」已经${lastCare ? '超过 ' + Utils.daysBetween(lastCare.careDate, today) + ' 天' : '很久'}没有浇水/养护了。`, 'health', '', p.id);
        }
      });
    }

    // 3. 储蓄板块 — 月度进度状态提醒（与登记时联动，每日最多提示一次）
    if (typeof SavingsMod !== 'undefined') {
      const ev = SavingsMod.evaluate();
      if (ev.has && ev.status !== 'normal') {
        const isOver = ev.status === 'overspend';
        add('生活提醒', 'savings',
          isOver ? '🚨 储蓄超支预警' : '⚠️ 储蓄节约提醒',
          isOver
            ? `当前结余 ${SavingsMod.fmt(ev.balance)} 低于理论预期结余 ${SavingsMod.fmt(ev.theory)} 的 80%，已严重超支，请尽快调整收支。`
            : `支出消耗进度已达 ${Math.round(ev.progress * 100)}%，请注意节约开支。`,
          'savings', '', 0);
      }
    }

    // 4. 生活物资 — 物品到期 / 闲置 / 花草枯萎
    Store.get('goods_c1').forEach(g => {
      if (g.expireDate && !g.archived) {
        const days = Utils.daysBetween(today, g.expireDate);
        if (days >= 0 && days <= 7) add('生活提醒', 'goods', `📅 物资即将到期：${g.name}`, `「${g.name}」将在 ${days === 0 ? '今天' : days + ' 天后'}到期（${g.expireDate}）。`, 'goods', '', g.id);
      }
    });
    // 闲置物品
    let idleCount = 0;
    Store.get('clothes').forEach(cl => { if (!cl.archived && !cl.isSecondhand && cl.annualCount < 1) idleCount++; });
    Store.get('goods_durable_main').forEach(d => { if (!d.archived && d.cumUses < 1) idleCount++; });
    if (idleCount > 0) add('生活提醒', 'goods', `📦 闲置物品提醒`, `当前有 ${idleCount} 件物品长期未使用，考虑清理或利用。`, 'goods', '', 0);

    // 5. 热点资讯 — 关键词推送（模拟）
    if (typeof NewsMod !== 'undefined') {
      const keywords = Store.get('hotspot_monitors') || [];
      keywords.slice(0, 3).forEach(kw => {
        add('资讯推送', 'news', `🔍 关键词关注：${kw.keyword || kw}`, `有新的内容匹配您关注的关键词「${kw.keyword || kw}」。`, 'hotspot', '', 0);
      });
    }

    // 6. 系统通知
    if (Cloud.lastSyncAt) add('系统通知', 'system', '☁️ 云端同步完成', `数据已于 ${Cloud.lastSyncAt.slice(0, 16).replace('T', ' ')} 同步至云端。`, '', '', 0);
    // 注：版本更新说明改为在 maybeShowChangelog() 中真实升级时同步推送至收件箱（含本次更新内容），不再在此每日生成空泛的版本提示

    // 一次性写入：合并保留的手动通知 + 新生成的自动通知
    if (newItems.length > 0 || kept.length !== inbox.length) {
      // 给新通知分配 ID
      let maxId = kept.length > 0 ? Math.max(...kept.map(i => i.id || 0)) : 0;
      newItems.forEach(item => { maxId++; item.id = maxId; });
      Store.save('inbox', [...kept, ...newItems]);
    }
    // 记录「当日已生成通知」并持久化：当天内不再重复生成，保留用户已读/删除/清空状态（满足"清空刷新不复发"）
    this._inboxNotifiedKey = today;
    localStorage.setItem('bb_inbox_gen_day', today);
  },

  /* ===== 快速记录（直连业务模块） ===== */
  QR_TARGETS: [
    { key:'todo',     label:'待办', icon:'✅', table:'todos',           build:c => ({ title:c, status:'未开始', priority:'中', assignee:'', deadline:'', deadlineTime:'', group:'', detail:'', images:[], fromMeeting:0, createdAt:Utils.now(), isOverdue:false, overdueSince:'', reminded30:false, remindedExact:false, completedAt:'' }) },
    { key:'diary',    label:'日记', icon:'📔', table:'diary',          build:c => ({ content:c, date:Utils.today(), mood:'📝', tags:'', images:[], isPrivate:false }) },
    { key:'study',    label:'学习', icon:'📚', table:'study_records',  build:c => ({ content:c, date:Utils.today(), type:'学习', duration:0, note:'' }) },
    { key:'media',    label:'影音', icon:'🎬', table:'media',          build:(c,ex) => ({ title:c, category:ex.mediaCat||'电影', tags:'', startDate:Utils.today(), endDate:'', cost:0, rating:0, images:[], progress:0, status:'想看', abandonReason:'', channel:'', cinema:'', showTime:'', ticketPrice:0, companions:'', totalEpisodes:0, currentEpisode:0, dramaNotes:'', docTopic:'', docKnowledge:'', docReflection:'', addToStudy:false }) },
    { key:'savings',  label:'记账', icon:'💰', table:'transactions',    build:(c,ex) => ({ accountId:1, type:'支出', category:'其他', amount:+(ex.amount||0), date:Utils.today(), note:c, image:'' }) },
    { key:'goods',    label:'物资', icon:'📦', table:'goods_c1',       build:c => ({ name:c, classify:'其他', buyDate:Utils.today(), expireDate:'', totalPrice:0, stock:1, remark:'', image:'', archived:false }) },
    { key:'reminder', label:'提醒', icon:'⏰', table:'reminders',       build:c => ({ name:c, type:'提醒', lunar:false, date:'', advanceDays:1, note:'' }) },
  ],

  showQuickRecord() {
    const wrap = document.getElementById('qr-targets');
    wrap.innerHTML = this.QR_TARGETS.map((t, i) =>
      `<span class="tag qr-target ${i === 0 ? 'active' : ''}" data-k="${t.key}" onclick="App.qrSelect('${t.key}')">${t.icon} ${t.label}</span>`
    ).join('');
    this.qrSelect(this.QR_TARGETS[0].key);
    document.getElementById('qr-modal').classList.remove('hidden');
  },

  qrSelect(key) {
    document.querySelectorAll('#qr-targets .qr-target').forEach(e => e.classList.toggle('active', e.dataset.k === key));
    const t = this.QR_TARGETS.find(x => x.key === key);
    document.getElementById('qr-content-label').textContent = `${t.label}内容`;
    const extra = document.getElementById('qr-extra');
    const hint = document.getElementById('qr-hint');
    if (key === 'savings') {
      extra.innerHTML = `<div class="form-group"><label class="form-label">金额 (¥)</label><input type="number" id="qr-amount" value="0" min="0"></div>`;
      hint.textContent = '将记入「支出·其他」分类，可稍后在记账模块调整';
    } else if (key === 'media') {
      extra.innerHTML = `
        <div class="form-group ocr-block">
          <label class="form-label">📷 拍照识别 <span class="text-light" style="font-weight:400;">票根 / 海报 / 播放页截图</span></label>
          <div class="img-upload-area" onclick="App.qrMediaOCR()">上传或拍摄图片，自动识别作品名称并填写</div>
          <div class="ocr-alt-row">
            <button type="button" class="btn-cancel btn-mini" onclick="App.qrPasteMediaText()">📋 粘贴文字识别</button>
          </div>
          <div id="qr-ocr-area"></div>
        </div>
        <div class="form-group"><label class="form-label">类型</label><select id="qr-media-cat"><option>电影</option><option>电视剧</option><option>纪录片</option><option>综艺</option></select></div>`;
      hint.textContent = '将记为「想看」状态，保存后可在影音记录中补充详情';
    } else {
      extra.innerHTML = '';
      hint.textContent = '';
    }
    document.getElementById('qr-content').value = '';
  },

  /* ===== 快速记录-影音拍照识别 ===== */
  qrMediaOCR() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      const f = input.files[0];
      if (!f) return;
      Utils.runOCR('qr-ocr-area', f, (text) => {
        App.qrApplyMediaOCR(text);
      }, { renderResult: false, pasteHandler: "App.qrPasteMediaText()" });
    };
    input.click();
  },

  async qrPasteMediaText() {
    let text = '';
    try { text = await navigator.clipboard.readText(); } catch (e) { text = ''; }
    if (!text || !text.trim()) {
      const area = document.getElementById('qr-ocr-area');
      if (area) area.innerHTML = '<div class="ocr-result">没读到剪贴板内容。\n小技巧：手机相册（iOS「实况文本」）或微信长按图片「提取文字」，复制之后再点这个按钮。</div>';
      return;
    }
    this.qrApplyMediaOCR(text.trim());
  },

  qrApplyMediaOCR(text) {
    const p = Utils.parseMediaText(text);
    const filled = [];
    if (p.title) {
      const titleEl = document.getElementById('qr-content');
      if (titleEl) { titleEl.value = p.title; filled.push('作品名称'); }
    }
    if (p.category) {
      const catEl = document.getElementById('qr-media-cat');
      if (catEl) { catEl.value = p.category; filled.push('类型'); }
    }
    const area = document.getElementById('qr-ocr-area');
    if (area) {
      if (filled.length) {
        area.innerHTML = `<div class="ocr-result">✅ 已识别并填入：${filled.join('、')}\n保存后可前往「影音记录」补充影院、票价、评分等详细信息。</div>`;
      } else {
        area.innerHTML = `<div class="ocr-result">⚠️ 未能自动识别关键字段，请手动输入作品名称。\n或尝试拍摄更清晰的票根/海报。</div>`;
      }
    }
  },

  hideQuickRecord() { document.getElementById('qr-modal').classList.add('hidden'); },

  saveQuickRecord() {
    const content = document.getElementById('qr-content').value.trim();
    const active = document.querySelector('#qr-targets .qr-target.active');
    const key = active ? active.dataset.k : this.QR_TARGETS[0].key;
    const t = this.QR_TARGETS.find(x => x.key === key);
    if (!content) { this.showToast(I18n.t('fillRequired'), 'error'); return; }
    const extra = {};
    if (key === 'savings') extra.amount = document.getElementById('qr-amount')?.value || 0;
    if (key === 'media') extra.mediaCat = document.getElementById('qr-media-cat')?.value || '电影';
    const obj = t.build(content, extra);
    const added = Store.add(t.table, obj);
    Store.logChange(t.table, 'add', added.id, content.slice(0, 30));
    this.hideQuickRecord();
    if (key === 'media') {
      this.showToast(`已保存到「${t.label}」，点击此处补充详情`, 'success');
      const toast = document.getElementById('toast');
      toast.style.cursor = 'pointer';
      toast.onclick = () => { this.navigate('study', 'media'); toast.onclick = null; toast.style.cursor = ''; setTimeout(() => toast.classList.add('hidden'), 100); };
    } else {
      this.showToast(`已保存到「${t.label}」`, 'success');
    }
    if (this.currentModule === 'home') this.render();
  },

  /* ===== 通用弹窗 ===== */
  openModal(html) {
    const m = document.getElementById('generic-modal');
    m.innerHTML = `<div class="modal" onclick="event.stopPropagation()">${html}</div>`;
    m.classList.remove('hidden');
  },
  closeModal() { document.getElementById('generic-modal').classList.add('hidden'); },

  /* ===== 确认弹窗 ===== */
  confirmCb: null,
  confirm(msg, cb, title) {
    document.getElementById('confirm-title').textContent = title || I18n.t('confirm');
    document.getElementById('confirm-msg').textContent = msg;
    this.confirmCb = cb;
    document.getElementById('confirm-modal').classList.remove('hidden');
  },
  closeConfirm() {
    document.getElementById('confirm-modal').classList.add('hidden');
    this.confirmCb = null;
  },
  doConfirm() {
    if (this.confirmCb) this.confirmCb();
    this.closeConfirm();
  },

  /* ===== Toast ===== */
  showToast(msg, type) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast' + (type ? ' ' + type : '');
    setTimeout(() => t.classList.add('hidden'), 2500);
  },

  /* ===== 图片查看器 ===== */
  currentImgSrc: '',
  openImageViewer(src) {
    this.currentImgSrc = src;
    document.getElementById('img-viewer-img').src = src;
    document.getElementById('img-viewer').classList.remove('hidden');
  },
  closeImageViewer() { document.getElementById('img-viewer').classList.add('hidden'); },
  downloadCurrentImg() {
    if (!this.currentImgSrc) return;
    const a = document.createElement('a');
    a.href = this.currentImgSrc;
    a.download = 'image_' + Date.now() + '.jpg';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  },

  /* ===== 图片上传组件 ===== */
  imageUploader(id, onAdd) {
    return `<div class="img-upload-area" onclick="document.getElementById('${id}').click()">
      📷 ${I18n.t('upload')}
    </div><input type="file" id="${id}" accept="image/*" style="display:none" onchange="App.handleImageUpload('${id}', ${onAdd ? onAdd.name || 'null' : 'null'})">`;
  },

  handleImageUpload(inputId, callback) {
    const input = document.getElementById(inputId);
    if (!input.files || !input.files[0]) return;
    Utils.readFileAsDataURL(input.files[0], (dataUrl) => {
      if (typeof callback === 'function') callback(dataUrl);
    });
  },

  /* ===== 图片网格渲染 =====
   * @param {string} prefix 模块前缀，用于通用删除分支
   * @param {function(number): string} [customRemoveAction] 自定义删除按钮 onclick，参数为图片索引
   */
  renderImageGrid(images, prefix, customRemoveAction) {
    if (!images || images.length === 0) return '';
    return `<div class="img-grid">${images.map((img, i) => {
      const action = customRemoveAction ? customRemoveAction(i) : (prefix ? `App.removeImage('${prefix}',${i})` : '');
      return `<div class="img-thumb-wrap"><img class="img-thumb" src="${img}" onclick="App.openImageViewer('${img}')">${action ? `<button class="img-thumb-del" onclick="${action}">✕</button>` : ''}</div>`;
    }).join('')}</div>`;
  },

  removeImage(prefix, index) {
    const targets = {
      outfit:  { arr: () => WardrobeMod._outfitImages, elId: 'outfit-imgs' },
      media:   { arr: () => StudyMod._mediaImages,     elId: 'md-imgs' },
      diary:   { arr: () => DiaryMod._images,          elId: 'diary-imgs' },
      posture: { arr: () => HealthMod._postureImgs,    elId: 'posture-imgs' },
      skin:    { arr: () => HealthMod._skinImgs,       elId: 'skin-imgs' },
    };
    const t = targets[prefix];
    if (!t) return;
    const arr = t.arr();
    if (!arr || !Array.isArray(arr)) return;
    arr.splice(index, 1);
    const el = document.getElementById(t.elId);
    if (el) el.innerHTML = App.renderImageGrid(arr, prefix);
  },

  /* ===== 全局备份/导出（exportBackup 的别名，保持向后兼容） ===== */
  exportBackup() {
    this.exportData();
  },

  exportModuleCSV(module, columns, filename) {
    const csv = Store.exportCSV(module, columns);
    Utils.downloadCSV(filename || (module + '_' + Utils.today() + '.csv'), csv);
    this.showToast(I18n.t('exportCsv') + '成功', 'success');
  },

  /* ===== 变动记录查看 ===== */
  showChangeLog(module) {
    const logs = Store.getChangeLogs(module);
    this.openModal(`
      <div class="modal-title">📜 ${I18n.t('changeLog')}</div>
      ${logs.length > 0 ? logs.map(l =>
        `<div class="list-item"><div class="list-icon">📝</div><div class="list-body"><div class="list-title">${Utils.escape(l.summary)}</div><div class="list-meta">${l.action} · ${new Date(l.timestamp).toLocaleString('zh-CN')}</div></div></div>`
      ).join('') : `<div class="text-light text-sm">${I18n.t('noChangeLog')}</div>`}
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('close')}</button></div>
    `);
  },

  /* ===== 通用模糊建议输入框 =====
   * 用法：
   *   HTML:  ${App.suggestInput({ id:'md-cinema', value:x, placeholder:'如 万达影城' })}
   *   绑定:  App.bindSuggest('md-cinema', Store.historyOf('cinema'));
   *   多值:  App.bindSuggest('diary-tags', Store.historyOf('diaryTags'), { multi:true });
   */
  _suggest: {},

  suggestInput(opt) {
    opt = opt || {};
    const id = opt.id;
    const cls = opt.className || 'form-input';
    return `<div class="suggest-wrap">
      <input type="text" class="${cls}" id="${id}" autocomplete="off"
        value="${Utils.escape(opt.value == null ? '' : opt.value)}"
        placeholder="${Utils.escape(opt.placeholder || '')}"
        oninput="App.showSuggest('${id}')" onfocus="App.showSuggest('${id}')"
        onblur="App.blurSuggest('${id}')">
      <div class="suggest-box hidden" id="${id}-suggest"></div>
    </div>`;
  },

  bindSuggest(id, list, opts) {
    opts = opts || {};
    this._suggest[id] = {
      list: (list || []).filter(v => v != null && String(v).trim() !== ''),
      multi: !!opts.multi,
      onPick: opts.onPick || null,
      historyKey: opts.historyKey || null,
    };
  },

  _suggestQuery(cfg, raw) {
    if (!cfg.multi) return { q: raw.trim(), used: [] };
    const parts = String(raw).split(/[,，]/);
    return {
      q: (parts[parts.length - 1] || '').trim(),
      used: parts.slice(0, -1).map(s => s.trim()).filter(Boolean),
    };
  },

  showSuggest(id) {
    const cfg = this._suggest[id];
    const input = document.getElementById(id);
    const box = document.getElementById(id + '-suggest');
    if (!cfg || !input || !box) return;
    const { q, used } = this._suggestQuery(cfg, input.value || '');
    const pool = cfg.list.filter(v => used.indexOf(v) === -1 && v !== (input.value || '').trim());
    const res = Utils.fuzzyMatch(pool, q, null, 8);
    if (!res.length) { box.classList.add('hidden'); return; }
    box.innerHTML = res.map(v =>
      `<div class="suggest-item" onmousedown="event.preventDefault();App.pickSuggest('${id}','${encodeURIComponent(v)}')">
        <span>${Utils.escape(v)}</span>
        <span class="suggest-del" title="删除记忆" onmousedown="event.preventDefault();event.stopPropagation();App.dropSuggest('${id}','${encodeURIComponent(v)}')">✕</span>
      </div>`
    ).join('');
    box.classList.remove('hidden');
  },

  blurSuggest(id) { setTimeout(() => this.hideSuggest(id), 150); },
  hideSuggest(id) { const b = document.getElementById(id + '-suggest'); if (b) b.classList.add('hidden'); },

  pickSuggest(id, encoded) {
    const val = decodeURIComponent(encoded);
    const cfg = this._suggest[id];
    const input = document.getElementById(id);
    if (!input) return;
    if (cfg && cfg.multi) {
      const parts = String(input.value || '').split(/[,，]/);
      parts[parts.length - 1] = val;
      input.value = parts.map(s => s.trim()).filter(Boolean).join(',') + ',';
    } else {
      input.value = val;
    }
    this.hideSuggest(id);
    input.focus();
    if (cfg && typeof cfg.onPick === 'function') cfg.onPick(val);
  },

  dropSuggest(id, encoded) {
    const val = decodeURIComponent(encoded);
    const cfg = this._suggest[id];
    if (!cfg) return;
    cfg.list = cfg.list.filter(v => v !== val);
    if (cfg.historyKey) Store.forgetInput(cfg.historyKey, val);
    this.showSuggest(id);
  },

  escape(str) { return Utils.escape(str); },
  today() { return Utils.today(); },
};

/* 初始化确认按钮 */
document.addEventListener('DOMContentLoaded', () => {
  App.init();
  document.getElementById('confirm-ok-btn').onclick = () => App.doConfirm();
});
