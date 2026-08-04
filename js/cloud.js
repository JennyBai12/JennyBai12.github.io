/* ===== Cloud 云同步模块 (Supabase) =====
 * 策略：localStorage 本地优先（即时响应），后台防抖推送云端
 * 同步：登录时拉取云端→覆盖本地；数据变更时防抖推送；手动同步=先推后拉
 */
const Cloud = {
  client: null,
  loggedIn: false,
  userEmail: null,
  syncing: false,
  lastSyncAt: null,    // ISO 时间戳，上次同步时间
  localDirty: false,   // 本地有未推送的变更
  pushTimer: null,     // 防抖定时器

  /* ===== 初始化 ===== */
  init() {
    // 配置占位符 —— 用户拿到 Supabase URL 和 anon key 后替换
    const SUPABASE_URL = 'https://nqpvxmuzdwqoavkpslbl.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_HjrBrDdPI6nUNMncptTaCg_27h-Qt0j';

    if (!SUPABASE_URL || SUPABASE_URL.startsWith('%%')) {
      console.log('[Cloud] 未配置 Supabase，云同步未启用');
      return false;
    }

    // 使用全局 supabase 对象（通过 CDN 加载）
    if (typeof window.supabase === 'undefined') {
      console.error('[Cloud] Supabase SDK 未加载');
      return false;
    }

    this.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    this.lastSyncAt = localStorage.getItem('bb_lastSyncAt') || null;
    this.localDirty = localStorage.getItem('bb_localDirty') === 'true';

    // 检查已有会话
    this.checkSession();
    return true;
  },

  /* ===== 会话管理 ===== */
  async checkSession() {
    if (!this.client) return;
    const { data: { session } } = await this.client.auth.getSession();
    if (session) {
      this.loggedIn = true;
      this.userEmail = session.user.email;
      // 登录后自动同步
      await this.syncOnLogin();
    }
  },

  /* ===== 注册 ===== */
  async register(email, password) {
    if (!this.client) return { error: '云同步未配置' };
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error) return { error: error.message };
    // 返回了 user 但没有 session → 需要邮箱验证
    if (data.user && !data.session) {
      return { error: null, needsConfirm: true };
    }
    // 注册成功后自动登录
    return this.login(email, password);
  },

  /* ===== 登录 ===== */
  async login(email, password) {
    if (!this.client) return { error: '云同步未配置' };
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    this.loggedIn = true;
    this.userEmail = data.user.email;
    await this.syncOnLogin();
    return { error: null };
  },

  /* ===== 发送邮箱验证码 ===== */
  async sendEmailOtp(email) {
    if (!this.client) return { error: '云同步未配置' };
    const { error } = await this.client.auth.signInWithOtp({ email });
    if (error) return { error: error.message };
    return { error: null };
  },

  /* ===== 验证邮箱验证码并登录 ===== */
  async verifyEmailOtp(email, code) {
    if (!this.client) return { error: '云同步未配置' };
    const { data, error } = await this.client.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });
    if (error) return { error: error.message };
    this.loggedIn = true;
    this.userEmail = data.user.email;
    await this.syncOnLogin();
    return { error: null };
  },

  /* ===== 登出 ===== */
  async logout() {
    if (!this.client) return;
    // 登出前推送本地数据
    if (this.localDirty) await this.push();
    await this.client.auth.signOut();
    this.loggedIn = false;
    this.userEmail = null;
  },

  /* ===== 登录后同步 ===== */
  async syncOnLogin() {
    // 如果本地有未推送的变更，先推送（不丢失本地数据）
    if (this.localDirty) {
      await this.push();
    }
    // 拉取云端数据
    await this.pull();
    // 刷新界面
    if (typeof App !== 'undefined' && App.currentModule) {
      App.render();
    }
    this.updateSyncIndicator();
  },

  /* ===== 推送：本地 → 云端 ===== */
  async push() {
    if (!this.client || !this.loggedIn || this.syncing) return;
    this.syncing = true;
    this.updateSyncIndicator('syncing');

    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) throw new Error('未登录');

      // 导出全部本地数据
      const allData = Store.exportAll();
      const parsed = JSON.parse(allData);

      const { error } = await this.client
        .from('user_data')
        .upsert({
          user_id: user.id,
          data: parsed,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      this.lastSyncAt = new Date().toISOString();
      this.localDirty = false;
      localStorage.setItem('bb_lastSyncAt', this.lastSyncAt);
      localStorage.setItem('bb_localDirty', 'false');
      this.updateSyncIndicator('synced');
    } catch (e) {
      console.error('[Cloud] 推送失败:', e.message);
      this.updateSyncIndicator('error');
    } finally {
      this.syncing = false;
    }
  },

  /* ===== 拉取：云端 → 本地 ===== */
  async pull() {
    if (!this.client || !this.loggedIn || this.syncing) return;
    this.syncing = true;
    this.updateSyncIndicator('syncing');

    try {
      const { data, error } = await this.client
        .from('user_data')
        .select('data, updated_at')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = 无数据

      if (!data) {
        // 云端无数据，可能是首次登录，推送本地数据
        this.syncing = false;
        await this.push();
        return;
      }

      const cloudUpdatedAt = data.updated_at;
      // 如果云端比本地新，覆盖本地
      if (!this.lastSyncAt || new Date(cloudUpdatedAt) > new Date(this.lastSyncAt)) {
        const cloudData = data.data;
        // 逐表写入 localStorage
        for (const tableName in cloudData) {
          localStorage.setItem('bb_' + tableName, JSON.stringify(cloudData[tableName]));
        }
        this.lastSyncAt = cloudUpdatedAt;
        localStorage.setItem('bb_lastSyncAt', this.lastSyncAt);
        this.localDirty = false;
        localStorage.setItem('bb_localDirty', 'false');
      }
      this.updateSyncIndicator('synced');
    } catch (e) {
      console.error('[Cloud] 拉取失败:', e.message);
      this.updateSyncIndicator('error');
    } finally {
      this.syncing = false;
    }
  },

  /* ===== 手动同步（先推后拉） ===== */
  async sync() {
    if (!this.client || !this.loggedIn) return;
    if (this.localDirty) await this.push();
    await this.pull();
    if (typeof App !== 'undefined' && App.currentModule) {
      App.render();
    }
    App.showToast(this.localDirty ? '同步完成（部分待推送）' : '同步完成', 'success');
  },

  /* ===== 数据变更通知（防抖推送） ===== */
  notifyChange() {
    if (!this.client || !this.loggedIn) return;
    this.localDirty = true;
    localStorage.setItem('bb_localDirty', 'true');
    this.updateSyncIndicator('pending');

    // 防抖 3 秒后推送
    clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      this.push();
    }, 3000);
  },

  /* ===== 同步状态指示器 ===== */
  updateSyncIndicator(status) {
    const el = document.getElementById('sync-status');
    if (!el) return;

    if (!this.client) {
      el.style.display = 'none';
      return;
    }
    el.style.display = '';

    if (!this.loggedIn) {
      el.innerHTML = '☁️ 未登录';
      el.className = 'sync-badge sync-offline';
      el.onclick = () => App.showLogin();
      return;
    }

    const map = {
      syncing:  { text: '🔄 同步中...', cls: 'sync-syncing', clickable: false },
      synced:   { text: '☁️ 已同步', cls: 'sync-synced', clickable: true },
      pending:  { text: '⏳ 待同步', cls: 'sync-pending', clickable: true },
      error:    { text: '⚠️ 同步失败', cls: 'sync-error', clickable: true },
      offline:  { text: '☁️ 未登录', cls: 'sync-offline', clickable: true },
    };
    const s = map[status] || (this.localDirty ? map.pending : map.synced);
    el.innerHTML = s.text;
    el.className = 'sync-badge ' + s.cls;
    el.onclick = s.clickable ? () => Cloud.sync() : null;
  },
};
