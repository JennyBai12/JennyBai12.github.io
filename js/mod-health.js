/* ===== 健康模块（家庭成员档案 + 体态AI + 皮肤AI + 体检档案 + 围度记录 + 健康总结） ===== */
const HealthMod = {
  subTab: 'records',
  medMemberFilter: 0,  // 0=全部, >0=指定成员
  bodyCompareDates: [null, null],  // 围度对比选中的两个日期
  summaryPeriod: 'month',
  summaryScope: 'self',

  render(c) {
    c.innerHTML = `
      <div class="section-title">💊 ${I18n.t('health')}</div>
      <div class="sub-tabs">
        <div class="sub-tab ${this.subTab === 'records' ? 'active' : ''}" onclick="HealthMod.setSub('records')">健康数据</div>
        <div class="sub-tab ${this.subTab === 'body' ? 'active' : ''}" onclick="HealthMod.setSub('body')">围度记录</div>
        <div class="sub-tab ${this.subTab === 'medical' ? 'active' : ''}" onclick="HealthMod.setSub('medical')">体检档案</div>
        <div class="sub-tab ${this.subTab === 'posture' ? 'active' : ''}" onclick="HealthMod.setSub('posture')">体态管理</div>
        <div class="sub-tab ${this.subTab === 'skin' ? 'active' : ''}" onclick="HealthMod.setSub('skin')">皮肤管理</div>
        <div class="sub-tab ${this.subTab === 'mens' ? 'active' : ''}" onclick="HealthMod.setSub('mens')">经期记录</div>
        <div class="sub-tab ${this.subTab === 'summary' ? 'active' : ''}" onclick="HealthMod.setSub('summary')">健康总结</div>
      </div>
      <div id="health-sub"></div>
    `;
    if (this.subTab === 'records') this.renderRecords();
    else if (this.subTab === 'body') this.renderBody();
    else if (this.subTab === 'medical') this.renderMedical();
    else if (this.subTab === 'posture') this.renderPosture();
    else if (this.subTab === 'skin') this.renderSkin();
    else if (this.subTab === 'mens') this.renderMens();
    else this.renderSummary();
  },

  setSub(tab) { this.subTab = tab; App.render(); },

  /* ===== 健康数据（体重/步数目标化记录） ===== */
  renderRecords() {
    const records = Store.get('health_records').sort((a, b) => b.date.localeCompare(a.date));
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    const last7 = Utils.last7Days();
    const stepsData = last7.map(d => {
      const r = Store.find('health_records', r => r.date === d);
      return { label: d.slice(5), value: r ? r.steps : 0 };
    });
    const calData = last7.map(d => {
      const r = Store.find('health_records', r => r.date === d);
      return { label: d.slice(5), value: r ? r.calories : 0 };
    });

    // 目标设置
    const lastRec = sorted[sorted.length - 1] || {};
    const targetWeight = lastRec.targetWeight || 56;
    const targetSteps = lastRec.targetSteps || 8000;

    // 体重趋势线
    const weightData = sorted.slice(-14).map(r => ({ label: r.date.slice(5), value: r.weight }));
    const weightChart = weightData.length > 1 ? Charts.line(weightData, { color: '#829E8E', targetLine: targetWeight, targetLabel: '目标' + targetWeight + 'kg' }) : '';

    // 步数达标率
    const weekSteps = last7.map(d => {
      const r = Store.find('health_records', r => r.date === d);
      return r ? r.steps : 0;
    });
    const achievedDays = weekSteps.filter(s => s >= targetSteps).length;
    const weekRate = Math.round(achievedDays / 7 * 100);

    // 月度达标率
    const month = Utils.today().slice(0, 7);
    const monthRecords = Store.filter('health_records', r => r.date.startsWith(month));
    const monthAchieved = monthRecords.filter(r => r.steps >= r.targetSteps).length;
    const monthRate = monthRecords.length > 0 ? Math.round(monthAchieved / monthRecords.length * 100) : 0;

    document.getElementById('health-sub').innerHTML = `
      <div class="flex-between mb-12">
        <div class="subsection-title" style="margin:0;">健康数据</div>
        <button class="btn btn-primary btn-sm" onclick="HealthMod.addRecord()">+ 记录</button>
      </div>
      <div class="dash-grid">
        <div class="dash-stat"><div class="dash-stat-num">${lastRec.weight || '--'}<span class="text-sm text-light">kg</span></div><div class="dash-stat-label">当前体重 / 目标${targetWeight}kg</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${lastRec.steps || '--'}<span class="text-sm text-light">步</span></div><div class="dash-stat-label">最新步数 / 目标${targetSteps}步</div></div>
        <div class="dash-stat"><div class="dash-stat-num ${weekRate >= 80 ? 'c-green' : 'c-orange'}">${weekRate}%</div><div class="dash-stat-label">本周步数达标率</div></div>
        <div class="dash-stat"><div class="dash-stat-num ${monthRate >= 80 ? 'c-green' : 'c-orange'}">${monthRate}%</div><div class="dash-stat-label">本月步数达标率</div></div>
      </div>
      <div class="card mb-12">
        <div class="flex-between mb-8">
          <div class="text-bold text-sm">🎯 目标设置</div>
          <button class="btn btn-outline btn-sm" onclick="HealthMod.setTargets()">修改目标</button>
        </div>
        <div class="label-pair"><span class="lk">目标体重</span><span class="vk">${targetWeight} kg</span></div>
        <div class="label-pair"><span class="lk">每日步数目标</span><span class="vk">${targetSteps} 步</span></div>
        ${lastRec.weight ? `<div class="label-pair"><span class="lk">距目标体重</span><span class="vk ${(lastRec.weight - targetWeight) > 0 ? 'c-orange' : 'c-green'}">${(lastRec.weight - targetWeight > 0 ? '还差' : '已达成')}${Math.abs(lastRec.weight - targetWeight).toFixed(1)}kg</span></div>` : ''}
      </div>
      ${weightChart ? `<div class="chart-box"><div class="chart-title">体重变化趋势（近14天）</div>${weightChart}</div>` : ''}
      <div class="chart-box"><div class="chart-title">近7天步数（目标线${targetSteps}步）</div>${Charts.bar(stepsData, { targetLine: targetSteps })}</div>
      <div class="chart-box"><div class="chart-title">近7天卡路里消耗</div>${Charts.bar(calData, { colors: ['#A6B7A1'] })}</div>
      <div class="ai-report">
        <div class="ai-report-title">🤖 AI周运动建议</div>
        <div class="ai-report-body">
          本周平均步数 ${Math.round(stepsData.reduce((s, d) => s + d.value, 0) / 7)} 步/天，达标率${weekRate}%。
          ${weekRate < 60 ? '步数偏低，建议每日至少达到' + targetSteps + '步。' : '步数达标，保持良好！'}
          ${lastRec.weight && lastRec.weight > targetWeight ? '体重距目标还有' + (lastRec.weight - targetWeight).toFixed(1) + 'kg，建议结合有氧+力量训练。' : ''}
          下周建议：周一跑步30min、周三瑜伽40min、周五游泳45min、周日散步60min。
        </div>
      </div>
      <div class="subsection-title">历史记录</div>
      ${records.map(r => `
        <div class="list-item">
          <div class="list-icon">💊</div>
          <div class="list-body">
            <div class="list-title">${r.date} · ${r.exerciseType || '休息'}</div>
            <div class="list-meta">体重${r.weight}kg(目标${r.targetWeight}kg) · ${r.steps}步(目标${r.targetSteps}) ${r.steps >= r.targetSteps ? '✅' : '❌'} · ${r.calories}kcal · 睡眠${r.sleep}h${r.exerciseDuration ? ' · 运动' + r.exerciseDuration + 'min' : ''}</div>
          </div>
          <span class="list-action" onclick="HealthMod.delRecord(${r.id})">✕</span>
        </div>
      `).join('')}
    `;
  },

  setTargets() {
    const records = Store.get('health_records').sort((a, b) => a.date.localeCompare(b.date));
    const last = records[records.length - 1] || {};
    App.openModal(`
      <div class="modal-title">🎯 设置健康目标</div>
      <div class="form-group"><label class="form-label">目标体重 (kg)</label><input type="number" step="0.1" id="tgt-weight" value="${last.targetWeight || 56}"></div>
      <div class="form-group"><label class="form-label">每日步数目标</label><input type="number" id="tgt-steps" value="${last.targetSteps || 8000}" step="500"></div>
      <div class="text-sm text-light">新目标将自动应用到后续所有记录</div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="HealthMod.saveTargets()">保存</button></div>
    `);
  },

  saveTargets() {
    const tw = +document.getElementById('tgt-weight').value;
    const ts = +document.getElementById('tgt-steps').value;
    const records = Store.get('health_records');
    records.forEach(r => { r.targetWeight = tw; r.targetSteps = ts; });
    Store.save('health_records', records);
    App.closeModal(); App.showToast('目标已更新', 'success'); App.render();
  },

  addRecord() {
    const records = Store.get('health_records').sort((a, b) => a.date.localeCompare(a.date));
    const last = records[records.length - 1] || {};
    App.openModal(`
      <div class="modal-title">新增健康记录</div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">日期</label><input type="date" id="hr-date" value="${Utils.today()}"></div>
        <div class="form-group"><label class="form-label">体重(kg)</label><input type="number" step="0.1" id="hr-weight" value="${last.weight || 58}"></div>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">目标体重(kg)</label><input type="number" step="0.1" id="hr-tweight" value="${last.targetWeight || 56}"></div>
        <div class="form-group"><label class="form-label">步数</label><input type="number" id="hr-steps" value="${last.steps || 8000}" step="500"></div>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">步数目标</label><input type="number" id="hr-tsteps" value="${last.targetSteps || 8000}" step="500"></div>
        <div class="form-group"><label class="form-label">卡路里</label><input type="number" id="hr-calories" value="300"></div>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">睡眠(h)</label><input type="number" step="0.5" id="hr-sleep" value="7.5"></div>
        <div class="form-group"><label class="form-label">运动类型</label><input type="text" id="hr-exercise" value="跑步"></div>
      </div>
      <div class="form-group"><label class="form-label">运动时长(min)</label><input type="number" id="hr-duration" value="30"></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="HealthMod.saveRecord()">${I18n.t('save')}</button></div>
    `);
  },

  saveRecord() {
    Store.add('health_records', {
      date: document.getElementById('hr-date').value,
      weight: +document.getElementById('hr-weight').value,
      targetWeight: +document.getElementById('hr-tweight').value,
      steps: +document.getElementById('hr-steps').value,
      targetSteps: +document.getElementById('hr-tsteps').value,
      calories: +document.getElementById('hr-calories').value,
      sleep: +document.getElementById('hr-sleep').value,
      exerciseType: document.getElementById('hr-exercise').value,
      exerciseDuration: +document.getElementById('hr-duration').value,
    });
    App.closeModal(); App.showToast(I18n.t('added'), 'success'); App.render();
  },

  delRecord(id) { App.confirm(I18n.t('confirmDelete'), () => { Store.remove('health_records', id); App.render(); }); },

  /* ===== 围度记录 ===== */
  renderBody() {
    const records = Store.get('body_measurements').sort((a, b) => a.date.localeCompare(b.date));
    const latest = records[records.length - 1] || {};

    // 围度项目定义
    const items = [
      { key: 'chest', label: '胸围', icon: '📏' },
      { key: 'waist', label: '腰围', icon: '📏' },
      { key: 'hip', label: '臀围', icon: '📏' },
      { key: 'thigh', label: '大腿围', icon: '📏' },
      { key: 'calf', label: '小腿围', icon: '📏' },
      { key: 'arm', label: '手臂围', icon: '📏' },
    ];

    // 趋势图（取最近10条）
    const trendData = records.slice(-10);
    const waistChart = trendData.length > 1 ? Charts.line(trendData.map(r => ({ label: r.date.slice(5), value: r.waist })), { color: '#829E8E', targetLine: latest.waistTarget, targetLabel: '目标' + (latest.waistTarget || '') + 'cm' }) : '';
    const hipChart = trendData.length > 1 ? Charts.line(trendData.map(r => ({ label: r.date.slice(5), value: r.hip })), { color: '#A6B7A1', targetLine: latest.hipTarget, targetLabel: '目标' + (latest.hipTarget || '') + 'cm' }) : '';

    document.getElementById('health-sub').innerHTML = `
      <div class="flex-between mb-12">
        <div class="subsection-title" style="margin:0;">身材围度记录</div>
        <div class="flex gap-8">
          <button class="btn btn-outline btn-sm" onclick="HealthMod.compareBody()">📊 数据对比</button>
          <button class="btn btn-primary btn-sm" onclick="HealthMod.addBody()">+ 测量</button>
        </div>
      </div>
      ${Object.keys(latest).length > 0 ? `
        <div class="card mb-12">
          <div class="text-bold text-sm mb-8">📐 最新围度（${latest.date}）</div>
          <div class="dash-grid">
            ${items.map(it => {
              const val = latest[it.key];
              const tgt = latest[it.key + 'Target'];
              const diff = val && tgt ? (val - tgt) : 0;
              return `<div class="dash-stat"><div class="dash-stat-num">${val || '--'}<span class="text-sm text-light">cm</span></div><div class="dash-stat-label">${it.label}</div><div class="text-sm ${diff > 0 ? 'c-orange' : 'c-green'}">${tgt ? '目标' + tgt + ' / 差' + diff.toFixed(1) : '未设目标'}</div></div>`;
            }).join('')}
          </div>
        </div>
      ` : '<div class="empty-state"><div class="empty-icon">📏</div>暂无围度记录</div>'}
      ${waistChart ? `<div class="chart-box"><div class="chart-title">腰围变化趋势</div>${waistChart}</div>` : ''}
      ${hipChart ? `<div class="chart-box"><div class="chart-title">臀围变化趋势</div>${hipChart}</div>` : ''}
      <div class="subsection-title">测量时间线</div>
      ${records.slice().reverse().map(r => `
        <div class="card">
          <div class="flex-between mb-8">
            <div class="text-bold">📅 ${r.date}</div>
            <div class="flex gap-8">
              <button class="btn btn-outline btn-sm" onclick="HealthMod.viewBody(${r.id})">详情</button>
              <button class="btn btn-cancel btn-sm" onclick="HealthMod.delBody(${r.id})">✕</button>
            </div>
          </div>
          <div class="text-sm">
            ${items.filter(it => r[it.key]).map(it => `<span class="tag-item" style="margin-right:8px;display:inline-block;margin-bottom:4px;">${it.label}: ${r[it.key]}cm${r[it.key + 'Target'] ? '(目标' + r[it.key + 'Target'] + ')' : ''}</span>`).join('')}
            ${r.customItems ? `<br><span class="text-light">自定义: ${Utils.escape(r.customItems)}</span>` : ''}
          </div>
        </div>
      `).join('')}
    `;
  },

  addBody() {
    const records = Store.get('body_measurements').sort((a, b) => a.date.localeCompare(b.date));
    const last = records[records.length - 1] || {};
    App.openModal(`
      <div class="modal-title">📝 新增围度测量</div>
      <div class="form-group"><label class="form-label">测量日期</label><input type="date" id="bm-date" value="${Utils.today()}"></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">胸围 (cm)</label><input type="number" step="0.5" id="bm-chest" value="${last.chest || ''}"></div>
        <div class="form-group"><label class="form-label">胸围目标</label><input type="number" step="0.5" id="bm-chestT" value="${last.chestTarget || ''}"></div>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">腰围 (cm)</label><input type="number" step="0.5" id="bm-waist" value="${last.waist || ''}"></div>
        <div class="form-group"><label class="form-label">腰围目标</label><input type="number" step="0.5" id="bm-waistT" value="${last.waistTarget || ''}"></div>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">臀围 (cm)</label><input type="number" step="0.5" id="bm-hip" value="${last.hip || ''}"></div>
        <div class="form-group"><label class="form-label">臀围目标</label><input type="number" step="0.5" id="bm-hipT" value="${last.hipTarget || ''}"></div>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">大腿围 (cm)</label><input type="number" step="0.5" id="bm-thigh" value="${last.thigh || ''}"></div>
        <div class="form-group"><label class="form-label">大腿围目标</label><input type="number" step="0.5" id="bm-thighT" value="${last.thighTarget || ''}"></div>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">小腿围 (cm)</label><input type="number" step="0.5" id="bm-calf" value="${last.calf || ''}"></div>
        <div class="form-group"><label class="form-label">小腿围目标</label><input type="number" step="0.5" id="bm-calfT" value="${last.calfTarget || ''}"></div>
      </div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">手臂围 (cm)</label><input type="number" step="0.5" id="bm-arm" value="${last.arm || ''}"></div>
        <div class="form-group"><label class="form-label">手臂围目标</label><input type="number" step="0.5" id="bm-armT" value="${last.armTarget || ''}"></div>
      </div>
      <div class="form-group"><label class="form-label">自定义围度项（如：颈部 38cm, 肩宽 42cm）</label><input type="text" id="bm-custom" placeholder="自定义项用逗号分隔" value="${Utils.escape(last.customItems || '')}"></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="HealthMod.saveBody()">${I18n.t('save')}</button></div>
    `);
  },

  saveBody() {
    Store.add('body_measurements', {
      date: document.getElementById('bm-date').value,
      chest: +document.getElementById('bm-chest').value || 0,
      chestTarget: +document.getElementById('bm-chestT').value || 0,
      waist: +document.getElementById('bm-waist').value || 0,
      waistTarget: +document.getElementById('bm-waistT').value || 0,
      hip: +document.getElementById('bm-hip').value || 0,
      hipTarget: +document.getElementById('bm-hipT').value || 0,
      thigh: +document.getElementById('bm-thigh').value || 0,
      thighTarget: +document.getElementById('bm-thighT').value || 0,
      calf: +document.getElementById('bm-calf').value || 0,
      calfTarget: +document.getElementById('bm-calfT').value || 0,
      arm: +document.getElementById('bm-arm').value || 0,
      armTarget: +document.getElementById('bm-armT').value || 0,
      customItems: document.getElementById('bm-custom').value,
    });
    Store.logChange('health', '围度测量', 0, '新增围度记录 ' + document.getElementById('bm-date').value);
    App.closeModal(); App.showToast(I18n.t('added'), 'success'); App.render();
  },

  viewBody(id) {
    const r = Store.find('body_measurements', b => b.id === id);
    const items = [
      { key: 'chest', label: '胸围' }, { key: 'waist', label: '腰围' }, { key: 'hip', label: '臀围' },
      { key: 'thigh', label: '大腿围' }, { key: 'calf', label: '小腿围' }, { key: 'arm', label: '手臂围' }
    ];
    App.openModal(`
      <div class="modal-title">围度详情 - ${r.date}</div>
      ${items.filter(it => r[it.key]).map(it => {
        const diff = r[it.key + 'Target'] ? (r[it.key] - r[it.key + 'Target']) : 0;
        return `<div class="label-pair"><span class="lk">${it.label}</span><span class="vk">${r[it.key]}cm${r[it.key + 'Target'] ? ' / 目标' + r[it.key + 'Target'] + ' / 差' + diff.toFixed(1) + 'cm' : ''}</span></div>`;
      }).join('')}
      ${r.customItems ? `<div class="mt-12 text-sm text-light">自定义: ${Utils.escape(r.customItems)}</div>` : ''}
      <div class="modal-actions"><button class="btn-confirm" onclick="App.closeModal()">关闭</button></div>
    `);
  },

  delBody(id) { App.confirm(I18n.t('confirmDelete'), () => { Store.remove('body_measurements', id); App.render(); }); },

  compareBody() {
    const records = Store.get('body_measurements').sort((a, b) => a.date.localeCompare(b.date));
    if (records.length < 2) { App.showToast('至少需要两条记录才能对比', 'warn'); return; }
    const items = [
      { key: 'chest', label: '胸围' }, { key: 'waist', label: '腰围' }, { key: 'hip', label: '臀围' },
      { key: 'thigh', label: '大腿围' }, { key: 'calf', label: '小腿围' }, { key: 'arm', label: '手臂围' }
    ];
    const dateOptions = records.map(r => `<option value="${r.id}">${r.date}</option>`).join('');
    App.openModal(`
      <div class="modal-title">📊 围度数据对比</div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">日期A</label><select id="cmp-a">${dateOptions}</select></div>
        <div class="form-group"><label class="form-label">日期B</label><select id="cmp-b">${dateOptions}</select></div>
      </div>
      <div id="cmp-result"></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="HealthMod.doCompareBody()">对比</button></div>
    `);
    // 默认选最后两个
    const selA = document.getElementById('cmp-a');
    const selB = document.getElementById('cmp-b');
    if (records.length >= 2) { selA.selectedIndex = records.length - 2; selB.selectedIndex = records.length - 1; }
    this._doCompareBody();
  },

  doCompareBody() {
    const idA = +document.getElementById('cmp-a').value;
    const idB = +document.getElementById('cmp-b').value;
    const rA = Store.find('body_measurements', r => r.id === idA);
    const rB = Store.find('body_measurements', r => r.id === idB);
    const items = [
      { key: 'chest', label: '胸围' }, { key: 'waist', label: '腰围' }, { key: 'hip', label: '臀围' },
      { key: 'thigh', label: '大腿围' }, { key: 'calf', label: '小腿围' }, { key: 'arm', label: '手臂围' }
    ];
    const rows = items.filter(it => rA[it.key] || rB[it.key]).map(it => {
      const vA = rA[it.key] || 0;
      const vB = rB[it.key] || 0;
      const diff = vB - vA;
      const color = diff > 0 ? 'c-orange' : (diff < 0 ? 'c-green' : 'text-light');
      return `<tr><td>${it.label}</td><td>${vA || '--'}</td><td>${vB || '--'}</td><td class="${color}">${diff > 0 ? '+' : ''}${diff.toFixed(1)}</td></tr>`;
    }).join('');
    document.getElementById('cmp-result').innerHTML = `
      <table class="data-table" style="width:100%;font-size:13px;margin-top:8px;">
        <tr><th>项目</th><th>${rA.date}</th><th>${rB.date}</th><th>变化</th></tr>
        ${rows}
      </table>
    `;
  },

  /* ===== 体检档案（家庭成员多人体检） ===== */
  renderMedical() {
    const members = Store.get('family_members');
    const allMedical = Store.get('family_medical').sort((a, b) => b.date.localeCompare(a.date));
    const medical = this.medMemberFilter > 0 ? allMedical.filter(m => m.memberId === this.medMemberFilter) : allMedical;

    // 复查提醒
    const today = Utils.today();
    const upcomingReviews = allMedical.filter(m => m.reviewDate && Utils.daysBetween(today, m.reviewDate) <= 30 && Utils.daysBetween(today, m.reviewDate) >= 0);

    document.getElementById('health-sub').innerHTML = `
      <div class="flex-between mb-12">
        <div class="subsection-title" style="margin:0;">体检档案</div>
        <div class="flex gap-8">
          <button class="btn btn-outline btn-sm" onclick="HealthMod.compareMedical()">📊 对比</button>
          <button class="btn btn-outline btn-sm" onclick="HealthMod.manageMembers()">👤 成员</button>
          <button class="btn btn-primary btn-sm" onclick="HealthMod.addMedical()">+ 添加</button>
        </div>
      </div>
      ${upcomingReviews.length > 0 ? `
        <div class="card mb-12" style="border-left:3px solid #E8A87C;">
          <div class="text-bold text-sm mb-8">🔔 复查提醒</div>
          ${upcomingReviews.map(m => {
            const mem = Store.find('family_members', fm => fm.id === m.memberId);
            const days = Utils.daysBetween(today, m.reviewDate);
            return `<div class="text-sm" style="margin-bottom:4px;">${mem ? mem.name : '未知'} · ${m.title} · 复查日${m.reviewDate} ${days === 0 ? '今天' : '还剩' + days + '天'}</div>`;
          }).join('')}
        </div>
      ` : ''}
      <div class="filter-tabs mb-12">
        <div class="filter-tab ${this.medMemberFilter === 0 ? 'active' : ''}" onclick="HealthMod.setMedFilter(0)">全部 (${allMedical.length})</div>
        ${members.map(m => {
          const count = allMedical.filter(am => am.memberId === m.id).length;
          return `<div class="filter-tab ${this.medMemberFilter === m.id ? 'active' : ''}" onclick="HealthMod.setMedFilter(${m.id})">${m.name} (${count})</div>`;
        }).join('')}
      </div>
      ${medical.map(r => {
        const mem = Store.find('family_members', fm => fm.id === r.memberId);
        return `
          <div class="card">
            <div class="flex-between mb-8">
              <div class="text-bold">🏥 ${Utils.escape(r.title)}</div>
              <div class="flex gap-8">
                <button class="btn btn-outline btn-sm" onclick="HealthMod.editMedical(${r.id})">${I18n.t('edit')}</button>
                <button class="btn btn-cancel btn-sm" onclick="HealthMod.delMedical(${r.id})">✕</button>
              </div>
            </div>
            <div class="text-sm text-light">${r.date} · ${Utils.escape(r.hospital)} · ${mem ? mem.name : '未知成员'}</div>
            <div class="text-sm mt-8"><span class="text-bold">指标：</span>${Utils.escape(r.indicators)}</div>
            ${r.abnormalItems ? `<div class="text-sm mt-4" style="color:#E8A87C;">⚠️ 异常：${Utils.escape(r.abnormalItems)}</div>` : ''}
            <div class="text-sm mt-4">${Utils.escape(r.summary)}</div>
            ${r.reviewDate ? `<div class="text-sm mt-4 text-light">📅 复查日期：${r.reviewDate}</div>` : ''}
          </div>
        `;
      }).join('') || '<div class="empty-state"><div class="empty-icon">🏥</div>暂无体检记录</div>'}
    `;
  },

  setMedFilter(id) { this.medMemberFilter = id; App.render(); },

  manageMembers() {
    const members = Store.get('family_members');
    App.openModal(`
      <div class="modal-title">👤 家庭成员管理</div>
      ${members.map(m => `
        <div class="flex-between mb-8" style="padding:8px;border-radius:8px;background:#F3F7F1;">
          <div>
            <div class="text-bold">${Utils.escape(m.name)}</div>
            <div class="text-sm text-light">${Utils.escape(m.relation)}${m.note ? ' · ' + Utils.escape(m.note) : ''}</div>
          </div>
          <button class="btn btn-cancel btn-sm" onclick="HealthMod.delMember(${m.id})">✕</button>
        </div>
      `).join('')}
      <div class="subsection-title mt-12">新增成员</div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">姓名</label><input type="text" id="fm-name" placeholder="如：妈妈"></div>
        <div class="form-group"><label class="form-label">关系</label><input type="text" id="fm-relation" placeholder="如：母亲"></div>
      </div>
      <div class="form-group"><label class="form-label">身份备注</label><input type="text" id="fm-note" placeholder="如：高血压史"></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="HealthMod.saveMember()">添加</button></div>
    `);
  },

  saveMember() {
    const name = document.getElementById('fm-name').value.trim();
    if (!name) { App.showToast('请输入姓名', 'warn'); return; }
    Store.add('family_members', {
      name, relation: document.getElementById('fm-relation').value,
      note: document.getElementById('fm-note').value, avatar: ''
    });
    App.closeModal(); App.showToast('成员已添加', 'success'); App.render();
  },

  delMember(id) {
    const medicalCount = Store.filter('family_medical', m => m.memberId === id).length;
    if (medicalCount > 0) {
      App.showToast('该成员有' + medicalCount + '条体检记录，无法删除', 'warn');
      return;
    }
    App.confirm(I18n.t('confirmDelete'), () => { Store.remove('family_members', id); App.closeModal(); App.render(); });
  },

  addMedical() {
    const members = Store.get('family_members');
    const memberOptions = members.map(m => `<option value="${m.id}">${m.name} (${m.relation})</option>`).join('');
    App.openModal(`
      <div class="modal-title">添加体检档案</div>
      <div class="form-group"><label class="form-label">家庭成员</label><select id="md-member">${memberOptions}</select></div>
      <div class="form-group"><label class="form-label">标题</label><input type="text" id="md-title" value="年度体检"></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">体检日期</label><input type="date" id="md-date" value="${Utils.today()}"></div>
        <div class="form-group"><label class="form-label">体检机构</label><input type="text" id="md-hospital"></div>
      </div>
      <div class="form-group"><label class="form-label">各项指标</label><textarea id="md-indicators" rows="3" placeholder="如：血压118/76, 血糖5.2, 总胆固醇4.8..."></textarea></div>
      <div class="form-group"><label class="form-label">异常指标（将高亮标注）</label><input type="text" id="md-abnormal" placeholder="如：维生素D偏低、血糖偏高"></div>
      <div class="form-group"><label class="form-label">体检摘要/医嘱</label><textarea id="md-summary" rows="2"></textarea></div>
      <div class="form-group"><label class="form-label">复查日期</label><input type="date" id="md-review"></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="HealthMod.saveMedical()">${I18n.t('save')}</button></div>
    `);
  },

  saveMedical() {
    Store.add('family_medical', {
      memberId: +document.getElementById('md-member').value,
      title: document.getElementById('md-title').value,
      date: document.getElementById('md-date').value,
      hospital: document.getElementById('md-hospital').value,
      indicators: document.getElementById('md-indicators').value,
      abnormalItems: document.getElementById('md-abnormal').value,
      reviewDate: document.getElementById('md-review').value,
      summary: document.getElementById('md-summary').value,
      images: []
    });
    Store.logChange('health', '体检档案', 0, '新增体检记录');
    App.closeModal(); App.showToast(I18n.t('added'), 'success'); App.render();
  },

  editMedical(id) {
    const r = Store.find('family_medical', m => m.id === id);
    const members = Store.get('family_members');
    const memberOptions = members.map(m => `<option value="${m.id}" ${m.id === r.memberId ? 'selected' : ''}>${m.name} (${m.relation})</option>`).join('');
    App.openModal(`
      <div class="modal-title">编辑体检档案</div>
      <div class="form-group"><label class="form-label">家庭成员</label><select id="md-member">${memberOptions}</select></div>
      <div class="form-group"><label class="form-label">标题</label><input type="text" id="md-title" value="${Utils.escape(r.title)}"></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">体检日期</label><input type="date" id="md-date" value="${r.date}"></div>
        <div class="form-group"><label class="form-label">体检机构</label><input type="text" id="md-hospital" value="${Utils.escape(r.hospital)}"></div>
      </div>
      <div class="form-group"><label class="form-label">各项指标</label><textarea id="md-indicators" rows="3">${Utils.escape(r.indicators)}</textarea></div>
      <div class="form-group"><label class="form-label">异常指标</label><input type="text" id="md-abnormal" value="${Utils.escape(r.abnormalItems || '')}"></div>
      <div class="form-group"><label class="form-label">体检摘要/医嘱</label><textarea id="md-summary" rows="2">${Utils.escape(r.summary)}</textarea></div>
      <div class="form-group"><label class="form-label">复查日期</label><input type="date" id="md-review" value="${r.reviewDate || ''}"></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="HealthMod.updateMedical(${id})">${I18n.t('save')}</button></div>
    `);
  },

  updateMedical(id) {
    Store.update('family_medical', id, {
      memberId: +document.getElementById('md-member').value,
      title: document.getElementById('md-title').value,
      date: document.getElementById('md-date').value,
      hospital: document.getElementById('md-hospital').value,
      indicators: document.getElementById('md-indicators').value,
      abnormalItems: document.getElementById('md-abnormal').value,
      reviewDate: document.getElementById('md-review').value,
      summary: document.getElementById('md-summary').value,
    });
    App.closeModal(); App.showToast(I18n.t('updated'), 'success'); App.render();
  },

  delMedical(id) { App.confirm(I18n.t('confirmDelete'), () => { Store.remove('family_medical', id); App.render(); }); },

  compareMedical() {
    const members = Store.get('family_members');
    const allMedical = Store.get('family_medical').sort((a, b) => a.date.localeCompare(b.date));
    if (allMedical.length < 2) { App.showToast('至少需要两条记录才能对比', 'warn'); return; }

    // 按成员分组
    const byMember = {};
    members.forEach(m => { byMember[m.id] = { name: m.name, records: allMedical.filter(r => r.memberId === m.id) }; });

    // 横向对比（不同成员最新体检）
    const latestByMember = members.map(m => {
      const recs = allMedical.filter(r => r.memberId === m.id).sort((a, b) => b.date.localeCompare(a.date));
      return { member: m, latest: recs[0] || null };
    }).filter(x => x.latest);

    // 纵向对比（同一成员历年）
    const selfRecords = allMedical.filter(r => r.memberId === 1).sort((a, b) => a.date.localeCompare(b.date));

    App.openModal(`
      <div class="modal-title">📊 体检数据对比</div>
      <div class="subsection-title">横向对比（各成员最新体检）</div>
      <table class="data-table" style="width:100%;font-size:12px;margin-bottom:16px;">
        <tr><th>成员</th><th>日期</th><th>机构</th><th>异常指标</th><th>复查</th></tr>
        ${latestByMember.map(x => `
          <tr>
            <td>${x.member.name}</td>
            <td>${x.latest.date}</td>
            <td>${Utils.escape(x.latest.hospital)}</td>
            <td style="color:${x.latest.abnormalItems ? '#E8A87C' : '#777'};">${Utils.escape(x.latest.abnormalItems || '无')}</td>
            <td>${x.latest.reviewDate || '-'}</td>
          </tr>
        `).join('')}
      </table>
      ${selfRecords.length >= 2 ? `
        <div class="subsection-title">纵向对比（本人历年体检）</div>
        <table class="data-table" style="width:100%;font-size:12px;">
          <tr><th>日期</th><th>机构</th><th>异常指标</th><th>摘要</th></tr>
          ${selfRecords.map(r => `
            <tr>
              <td>${r.date}</td>
              <td>${Utils.escape(r.hospital)}</td>
              <td style="color:${r.abnormalItems ? '#E8A87C' : '#777'};">${Utils.escape(r.abnormalItems || '无')}</td>
              <td>${Utils.escape(r.summary).slice(0, 30)}</td>
            </tr>
          `).join('')}
        </table>
      ` : ''}
      <div class="modal-actions"><button class="btn-confirm" onclick="App.closeModal()">关闭</button></div>
    `);
  },

  /* ===== 体态AI管理（保留原有功能） ===== */
  renderPosture() {
    const records = Store.get('posture_records').sort((a, b) => b.date.localeCompare(a.date));
    document.getElementById('health-sub').innerHTML = `
      <div class="flex-between mb-12">
        <div class="subsection-title" style="margin:0;">体态AI管理</div>
        <button class="btn btn-primary btn-sm" onclick="HealthMod.addPosture()">+ 检测</button>
      </div>
      <div class="card">
        <div class="text-sm text-light">上传体态照片，AI自动识别驼背、骨盆前倾、高低肩、头前伸、脊柱侧弯等问题，输出矫正建议。</div>
      </div>
      ${records.map(r => `
        <div class="card">
          <div class="flex-between mb-8">
            <div class="text-bold">📅 ${r.date}</div>
            <div class="flex gap-8">
              <button class="btn btn-outline btn-sm" onclick="HealthMod.editPosture(${r.id})">${I18n.t('edit')}</button>
              <button class="btn btn-cancel btn-sm" onclick="HealthMod.delPosture(${r.id})">✕</button>
            </div>
          </div>
          <div class="ai-report">
            <div class="ai-report-title">🤖 AI分析报告</div>
            <div class="ai-report-body">
              <div class="text-bold mb-8">检测到的问题：${Utils.escape(r.aiAnalysis)}</div>
              <div>矫正建议：</div>
              <pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;">${Utils.escape(r.aiAdvice)}</pre>
            </div>
          </div>
          ${r.manualNotes ? `<div class="mt-12"><div class="text-bold text-sm">📝 手动备注</div><div class="text-sm">${Utils.escape(r.manualNotes)}</div></div>` : ''}
          ${r.manualPlan ? `<div class="mt-8"><div class="text-bold text-sm">📋 自定义改善方案</div><div class="text-sm">${Utils.escape(r.manualPlan)}</div></div>` : ''}
        </div>
      `).join('') || '<div class="empty-state"><div class="empty-icon">🧍</div>暂无体态记录</div>'}
    `;
  },

  addPosture() {
    App.openModal(`
      <div class="modal-title">体态AI检测</div>
      <div class="form-group"><label class="form-label">📷 上传体态照片</label>
        <div class="img-upload-area" onclick="HealthMod.uploadPostureImg()">上传正面/侧面照</div>
        <div id="posture-imgs"></div>
      </div>
      <div id="posture-ai-area"></div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button>
        <button class="btn-confirm" onclick="HealthMod.startPostureAI()">🔍 开始AI检测</button>
      </div>
    `);
    this._postureImgs = [];
  },

  uploadPostureImg() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      Utils.readFileAsDataURL(input.files[0], (url) => {
        HealthMod._postureImgs.push(url);
        document.getElementById('posture-imgs').innerHTML = App.renderImageGrid(HealthMod._postureImgs, 'posture');
      });
    };
    input.click();
  },

  async startPostureAI() {
    const imgs = this._postureImgs || [];
    if (!imgs.length) { App.showToast('请先上传体态照片', 'error'); return; }
    const area = document.getElementById('posture-ai-area');
    area.innerHTML = '<div class="ocr-loading"><div class="ocr-spinner"></div>AI 分析照片中...</div>';
    try {
      const a = await Utils.analyzeImage(imgs[imgs.length - 1]);
      const obs = [];
      if (a.brightness < 35) obs.push('拍摄光线偏暗，建议充足光线下重拍以便观察轮廓');
      else if (a.brightness > 88) obs.push('画面过亮/偏白，注意曝光');
      if (a.contrast < 12) obs.push('对比度偏低，身体轮廓不够清晰');
      obs.push('请对照照片自行检查：头颈是否中立、双肩是否等高、脊柱是否居中');
      const analysis = obs.join('；');
      const advice = '1. 靠墙站立每日10分钟，后脑勺、肩胛骨、臀部贴墙\n2. 收下巴练习每组15次，每日3组\n3. 肩胛骨收缩训练，改善圆肩\n4. 避免长时间低头看手机\n5. 建议每月同角度复查对比改善情况';
      area.innerHTML = `
        <div class="ai-report">
          <div class="ai-report-title">✅ AI 分析完成（基于实际照片像素）</div>
          <div class="ai-report-body">
            <div class="text-bold mb-8">图像指标：亮度 ${a.brightness}/100 · 对比度 ${a.contrast}/100 · ${a.width}×${a.height}</div>
            <div>观察提示：${Utils.escape(analysis)}</div>
            <div class="mt-8">矫正建议：</div>
            <pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;">${Utils.escape(advice)}</pre>
          </div>
        </div>
        <div class="form-group"><label class="form-label">手动补充/覆盖备注（如：头前伸、圆肩等）</label><textarea id="pt-manual" rows="2" placeholder="可填写你对照照片发现的具体问题"></textarea></div>
        <div class="form-group"><label class="form-label">自定义改善方案</label><textarea id="pt-plan" rows="2" placeholder="可覆盖AI建议"></textarea></div>
        <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="HealthMod.savePosture()">💾 保存报告</button></div>
      `;
      this._postureAI = { analysis, advice };
    } catch (e) {
      this._postureAI = { analysis: '', advice: '' };
      area.innerHTML = `
        <div class="ocr-result">自动分析失败，可手动填写报告后保存。</div>
        <div class="form-group"><label class="form-label">手动补充/覆盖备注</label><textarea id="pt-manual" rows="2" placeholder="可填写你对照照片发现的具体问题"></textarea></div>
        <div class="form-group"><label class="form-label">自定义改善方案</label><textarea id="pt-plan" rows="2"></textarea></div>
        <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="HealthMod.savePosture()">💾 保存报告</button></div>
      `;
    }
  },

  savePosture() {
    const ai = this._postureAI || { analysis: '', advice: '' };
    const manual = document.getElementById('pt-manual')?.value || '';
    const plan = document.getElementById('pt-plan')?.value || '';
    if (!ai.analysis && !manual) { App.showToast('请填写备注后再保存', 'error'); return; }
    Store.add('posture_records', {
      date: Utils.today(), images: this._postureImgs || [],
      aiAnalysis: ai.analysis, aiAdvice: ai.advice,
      manualNotes: manual, manualPlan: plan
    });
    Store.logChange('health', '体态检测', 0, '新增体态AI检测报告');
    this._postureAI = null; this._postureImgs = [];
    App.closeModal(); App.showToast(I18n.t('saved'), 'success'); App.render();
  },

  delPosture(id) { App.confirm(I18n.t('confirmDelete'), () => { Store.remove('posture_records', id); App.render(); }); },

  editPosture(id) {
    const r = Store.find('posture_records', p => p.id === id);
    App.openModal(`
      <div class="modal-title">编辑体态记录</div>
      <div class="form-group"><label class="form-label">AI分析结果</label><textarea id="pt-ai" rows="2">${Utils.escape(r.aiAnalysis)}</textarea></div>
      <div class="form-group"><label class="form-label">AI建议</label><textarea id="pt-advice" rows="4">${Utils.escape(r.aiAdvice)}</textarea></div>
      <div class="form-group"><label class="form-label">手动备注</label><textarea id="pt-manual" rows="2">${Utils.escape(r.manualNotes || '')}</textarea></div>
      <div class="form-group"><label class="form-label">自定义改善方案</label><textarea id="pt-plan" rows="2">${Utils.escape(r.manualPlan || '')}</textarea></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="HealthMod.updatePosture(${id})">${I18n.t('save')}</button></div>
    `);
  },

  updatePosture(id) {
    Store.update('posture_records', id, {
      aiAnalysis: document.getElementById('pt-ai').value,
      aiAdvice: document.getElementById('pt-advice').value,
      manualNotes: document.getElementById('pt-manual').value,
      manualPlan: document.getElementById('pt-plan').value,
    });
    App.closeModal(); App.showToast(I18n.t('updated'), 'success'); App.render();
  },

  /* ===== 皮肤AI管理（保留原有功能） ===== */
  renderSkin() {
    const records = Store.get('skin_records').sort((a, b) => b.date.localeCompare(a.date));
    document.getElementById('health-sub').innerHTML = `
      <div class="flex-between mb-12">
        <div class="subsection-title" style="margin:0;">皮肤AI管理</div>
        <button class="btn btn-primary btn-sm" onclick="HealthMod.addSkin()">+ 检测</button>
      </div>
      <div class="card"><div class="text-sm text-light">上传素颜照片，AI识别痘痘、闭口、泛红、暗沉、毛孔粗大、敏感、干纹等问题。</div></div>
      ${records.map(r => `
        <div class="card">
          <div class="flex-between mb-8"><div class="text-bold">📅 ${r.date}</div>
            <div class="flex gap-8"><button class="btn btn-outline btn-sm" onclick="HealthMod.editSkin(${r.id})">${I18n.t('edit')}</button><button class="btn btn-cancel btn-sm" onclick="HealthMod.delSkin(${r.id})">✕</button></div>
          </div>
          <div class="ai-report">
            <div class="ai-report-title">🤖 AI分析报告</div>
            <div class="ai-report-body"><div class="text-bold mb-8">检测到的问题：${Utils.escape(r.aiAnalysis)}</div><div>护肤建议：</div><pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;">${Utils.escape(r.aiAdvice)}</pre></div>
          </div>
          ${r.manualNotes ? `<div class="mt-12"><div class="text-bold text-sm">📝 手动备注</div><div class="text-sm">${Utils.escape(r.manualNotes)}</div></div>` : ''}
        </div>
      `).join('') || '<div class="empty-state"><div class="empty-icon">💆</div>暂无皮肤记录</div>'}
    `;
  },

  addSkin() {
    App.openModal(`
      <div class="modal-title">皮肤AI检测</div>
      <div class="form-group"><label class="form-label">📷 上传素颜照片</label><div class="img-upload-area" onclick="HealthMod.uploadSkinImg()">上传面部照片</div><div id="skin-imgs"></div></div>
      <div id="skin-ai-area"></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="HealthMod.startSkinAI()">🔍 开始AI检测</button></div>
    `);
    this._skinImgs = [];
  },

  uploadSkinImg() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      Utils.readFileAsDataURL(input.files[0], (url) => {
        HealthMod._skinImgs.push(url);
        document.getElementById('skin-imgs').innerHTML = App.renderImageGrid(HealthMod._skinImgs, 'skin');
      });
    };
    input.click();
  },

  async startSkinAI() {
    const imgs = this._skinImgs || [];
    if (!imgs.length) { App.showToast('请先上传面部照片', 'error'); return; }
    const area = document.getElementById('skin-ai-area');
    area.innerHTML = '<div class="ocr-loading"><div class="ocr-spinner"></div>AI 分析照片中...</div>';
    try {
      const a = await Utils.analyzeImage(imgs[imgs.length - 1]);
      const obs = [];
      if (a.redness > 18) obs.push('面部偏红（泛红指数 ' + a.redness + '），可能存在泛红/敏感');
      else if (a.redness < -12) obs.push('面色偏青/暗，关注暗沉与循环');
      if (a.brightness < 40) obs.push('整体偏暗，注意暗沉与作息');
      if (a.contrast > 30) obs.push('纹理对比度较高，关注毛孔/肤质细节');
      const analysis = obs.length ? obs.join('；') : '未见明显异常色调（仅基于整体像素）';
      const advice = '1. 温和氨基酸洁面，早晚各一次\n2. 泛红区使用舒缓修护成分（神经酰胺、积雪草）\n3. 烟酰胺精华改善暗沉与毛孔\n4. 保湿面霜维持屏障\n5. 每日防晒SPF30+，室内也需防护\n6. 减少高糖饮食，多补充维生素C';
      area.innerHTML = `
        <div class="ai-report">
          <div class="ai-report-title">✅ AI 分析完成（基于实际照片像素）</div>
          <div class="ai-report-body">
            <div class="text-bold mb-8">图像指标：亮度 ${a.brightness}/100 · 对比度 ${a.contrast}/100 · 泛红指数 ${a.redness}</div>
            <div>观察提示：${Utils.escape(analysis)}</div>
            <div class="mt-8">护肤建议：</div>
            <pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;">${Utils.escape(advice)}</pre>
          </div>
        </div>
        <div class="form-group"><label class="form-label">手动补充/覆盖备注（如：痘痘、闭口位置）</label><textarea id="sk-manual" rows="2"></textarea></div>
        <div class="form-group"><label class="form-label">自定义护肤方案</label><textarea id="sk-plan" rows="2" placeholder="可覆盖AI建议"></textarea></div>
        <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="HealthMod.saveSkin()">💾 保存报告</button></div>
      `;
      this._skinAI = { analysis, advice };
    } catch (e) {
      this._skinAI = { analysis: '', advice: '' };
      area.innerHTML = `
        <div class="ocr-result">自动分析失败，可手动填写报告后保存。</div>
        <div class="form-group"><label class="form-label">手动补充/覆盖备注</label><textarea id="sk-manual" rows="2"></textarea></div>
        <div class="form-group"><label class="form-label">自定义护肤方案</label><textarea id="sk-plan" rows="2"></textarea></div>
        <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="HealthMod.saveSkin()">💾 保存报告</button></div>
      `;
    }
  },

  saveSkin() {
    const ai = this._skinAI || { analysis: '', advice: '' };
    const manual = document.getElementById('sk-manual')?.value || '';
    const plan = document.getElementById('sk-plan')?.value || '';
    if (!ai.analysis && !manual) { App.showToast('请填写备注后再保存', 'error'); return; }
    Store.add('skin_records', { date: Utils.today(), images: this._skinImgs || [], aiAnalysis: ai.analysis, aiAdvice: ai.advice, manualNotes: manual, manualPlan: plan });
    Store.logChange('health', '皮肤检测', 0, '新增皮肤AI检测报告');
    this._skinAI = null; this._skinImgs = [];
    App.closeModal(); App.showToast(I18n.t('saved'), 'success'); App.render();
  },

  delSkin(id) { App.confirm(I18n.t('confirmDelete'), () => { Store.remove('skin_records', id); App.render(); }); },

  editSkin(id) {
    const r = Store.find('skin_records', s => s.id === id);
    App.openModal(`
      <div class="modal-title">编辑皮肤记录</div>
      <div class="form-group"><label class="form-label">AI分析</label><textarea id="sk-ai" rows="2">${Utils.escape(r.aiAnalysis)}</textarea></div>
      <div class="form-group"><label class="form-label">AI建议</label><textarea id="sk-advice" rows="4">${Utils.escape(r.aiAdvice)}</textarea></div>
      <div class="form-group"><label class="form-label">手动备注</label><textarea id="sk-manual" rows="2">${Utils.escape(r.manualNotes || '')}</textarea></div>
      <div class="modal-actions"><button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button><button class="btn-confirm" onclick="HealthMod.updateSkin(${id})">${I18n.t('save')}</button></div>
    `);
  },

  updateSkin(id) {
    Store.update('skin_records', id, {
      aiAnalysis: document.getElementById('sk-ai').value,
      aiAdvice: document.getElementById('sk-advice').value,
      manualNotes: document.getElementById('sk-manual').value,
    });
    App.closeModal(); App.showToast(I18n.t('updated'), 'success'); App.render();
  },

  /* ===== 经期记录 ===== */
  mensMonth: null,   // 'YYYY-MM'，null 表示当前月

  _diffDays(a, b) {
    return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
  },

  mensStats() {
    const recs = Store.get('menstrual_records').slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
    const cycles = [];
    for (let i = 1; i < recs.length; i++) {
      const d = this._diffDays(recs[i - 1].startDate, recs[i].startDate);
      if (d > 10 && d < 90) cycles.push(d);
    }
    const durations = recs.filter(r => r.endDate).map(r => this._diffDays(r.startDate, r.endDate) + 1).filter(d => d > 0 && d < 15);
    const avgCycle = cycles.length ? Math.round(cycles.reduce((s, x) => s + x, 0) / cycles.length) : 28;
    const avgDur = durations.length ? Math.round(durations.reduce((s, x) => s + x, 0) / durations.length) : 5;
    const last = recs[recs.length - 1] || null;
    const nextStart = last ? Utils.addDays(last.startDate, avgCycle) : '';
    const today = Utils.today();
    const daysToNext = nextStart ? this._diffDays(today, nextStart) : null;
    // 排卵日约为下次月经前 14 天
    const ovulDay = nextStart ? Utils.addDays(nextStart, -14) : '';
    return { recs, avgCycle, avgDur, last, nextStart, daysToNext, ovulDay, cycles, durations };
  },

  renderMens() {
    const s = this.mensStats();
    const today = Utils.today();
    const ym = this.mensMonth || today.slice(0, 7);
    const [yy, mm] = ym.split('-').map(Number);
    const firstDay = new Date(yy, mm - 1, 1);
    const daysInMonth = new Date(yy, mm, 0).getDate();
    let lead = firstDay.getDay() - 1; if (lead < 0) lead = 6;   // 周一为首列

    // 实际经期日期集合
    const periodSet = new Set();
    s.recs.forEach(r => {
      const end = r.endDate || (this._diffDays(r.startDate, today) <= 10 ? today : r.startDate);
      let d = r.startDate;
      let guard = 0;
      while (d <= end && guard++ < 20) { periodSet.add(d); d = Utils.addDays(d, 1); }
    });
    // 预测经期
    const predictSet = new Set();
    if (s.nextStart) {
      for (let i = 0; i < s.avgDur; i++) predictSet.add(Utils.addDays(s.nextStart, i));
    }
    const ovulSet = new Set();
    if (s.ovulDay) { for (let i = -2; i <= 2; i++) ovulSet.add(Utils.addDays(s.ovulDay, i)); }

    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<div></div>');
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${ym}-${String(d).padStart(2, '0')}`;
      let cls = 'mens-day';
      if (periodSet.has(ds)) cls += ' is-period';
      else if (predictSet.has(ds)) cls += ' is-predict';
      else if (ovulSet.has(ds)) cls += ' is-ovul';
      if (ds === today) cls += ' is-today';
      cells.push(`<div class="${cls}">${d}</div>`);
    }

    const tipText = s.daysToNext === null ? '暂无足够数据预测'
      : s.daysToNext > 0 ? `预计 ${s.daysToNext} 天后来潮（${s.nextStart}）`
      : s.daysToNext === 0 ? '预计今天来潮，注意保暖 🌸'
      : `已推迟 ${-s.daysToNext} 天，如持续请留意身体状况`;

    document.getElementById('health-sub').innerHTML = `
      <div class="flex-between mb-12">
        <div class="subsection-title" style="margin:0;">🌸 经期记录</div>
        <button class="btn btn-primary btn-sm" onclick="HealthMod.addMens()">+ 记录</button>
      </div>

      <div class="card">
        <div class="mens-stat">
          <div class="mens-stat-item"><div class="mens-stat-num">${s.avgCycle}</div><div class="mens-stat-label">平均周期(天)</div></div>
          <div class="mens-stat-item"><div class="mens-stat-num">${s.avgDur}</div><div class="mens-stat-label">平均经期(天)</div></div>
          <div class="mens-stat-item"><div class="mens-stat-num">${s.recs.length}</div><div class="mens-stat-label">累计记录</div></div>
        </div>
        <div class="text-sm mt-12" style="text-align:center;color:#C08B7D;">${tipText}</div>
        ${s.ovulDay ? `<div class="text-sm text-light" style="text-align:center;margin-top:4px;">预计排卵日约 ${s.ovulDay}</div>` : ''}
      </div>

      <div class="card">
        <div class="flex-between mb-8">
          <button class="btn btn-outline btn-sm" onclick="HealthMod.mensNav(-1)">‹</button>
          <div class="text-bold">${yy}年${mm}月</div>
          <button class="btn btn-outline btn-sm" onclick="HealthMod.mensNav(1)">›</button>
        </div>
        <div class="mens-cal">
          ${['一','二','三','四','五','六','日'].map(d => `<div class="cal-head" style="font-size:11px;text-align:center;color:var(--text-light);">${d}</div>`).join('')}
          ${cells.join('')}
        </div>
        <div class="flex gap-12 mt-12" style="font-size:11px;color:var(--text-light);flex-wrap:wrap;justify-content:center;">
          <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#E8A7A7;"></span> 经期</span>
          <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:rgba(232,167,167,0.32);"></span> 预测</span>
          <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:rgba(150,180,200,0.4);"></span> 排卵期</span>
        </div>
      </div>

      <div class="subsection-title">历史记录</div>
      ${s.recs.slice().reverse().map(r => {
        const dur = r.endDate ? this._diffDays(r.startDate, r.endDate) + 1 : null;
        return `
        <div class="card">
          <div class="flex-between">
            <div>
              <div class="text-bold">${r.startDate} ${r.endDate ? '~ ' + r.endDate : '~ 进行中'}</div>
              <div class="text-sm text-light mt-8">${dur ? dur + '天 · ' : ''}量：${r.flow || '-'} · 痛经：${r.pain || '-'} ${r.mood ? '· ' + r.mood : ''}</div>
              ${r.symptoms ? `<div class="text-sm text-light">症状：${Utils.escape(r.symptoms)}</div>` : ''}
              ${r.note ? `<div class="text-sm text-light">备注：${Utils.escape(r.note)}</div>` : ''}
            </div>
            <div class="flex gap-8">
              <button class="btn btn-outline btn-sm" onclick="HealthMod.editMens(${r.id})">${I18n.t('edit')}</button>
              <button class="btn btn-cancel btn-sm" onclick="HealthMod.delMens(${r.id})">✕</button>
            </div>
          </div>
        </div>`;
      }).join('') || '<div class="empty-state"><div class="empty-icon">🌸</div>还没有经期记录</div>'}
    `;
  },

  mensNav(delta) {
    const cur = this.mensMonth || Utils.today().slice(0, 7);
    const [y, m] = cur.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    this.mensMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    this.renderMens();
  },

  addMens() { App.openModal(this.mensForm(null)); },

  editMens(id) {
    const r = Store.find('menstrual_records', x => x.id === id);
    if (!r) return;
    App.openModal(this.mensForm(r));
  },

  mensForm(r) {
    const isEdit = !!r;
    const flows = ['少', '中', '多'];
    const pains = ['无', '轻微', '明显', '剧烈'];
    const moods = ['😊', '😐', '😴', '😖', '😢'];
    const symptomOpts = ['腹痛', '腰酸', '乏力', '头痛', '乳房胀痛', '情绪波动', '长痘', '食欲增加'];
    const curSym = isEdit ? String(r.symptoms || '').split(',').filter(Boolean) : [];
    return `
      <div class="modal-title">${isEdit ? '✏️ 修改经期记录' : '🌸 新增经期记录'}</div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">开始日期 <span class="req">*</span></label><input type="date" id="ms-start" value="${isEdit ? r.startDate : Utils.today()}"></div>
        <div class="form-group"><label class="form-label">结束日期</label><input type="date" id="ms-end" value="${isEdit ? (r.endDate || '') : ''}"></div>
      </div>
      <div class="form-group"><label class="form-label">经量</label><div class="tag-pick" id="ms-flow">${flows.map(f => `<span class="tag${(isEdit ? r.flow : '中') === f ? ' active' : ''}" data-v="${f}" onclick="document.querySelectorAll('#ms-flow .tag').forEach(e=>e.classList.remove('active'));this.classList.add('active');">${f}</span>`).join('')}</div></div>
      <div class="form-group"><label class="form-label">痛经程度</label><div class="tag-pick" id="ms-pain">${pains.map(p => `<span class="tag${(isEdit ? r.pain : '无') === p ? ' active' : ''}" data-v="${p}" onclick="document.querySelectorAll('#ms-pain .tag').forEach(e=>e.classList.remove('active'));this.classList.add('active');">${p}</span>`).join('')}</div></div>
      <div class="form-group"><label class="form-label">伴随症状（可多选）</label><div class="tag-pick" id="ms-sym">${symptomOpts.map(sy => `<span class="tag${curSym.includes(sy) ? ' active' : ''}" data-v="${sy}" onclick="this.classList.toggle('active');">${sy}</span>`).join('')}</div></div>
      <div class="form-group"><label class="form-label">心情</label><div class="tag-pick" id="ms-mood">${moods.map(m => `<span class="tag${(isEdit ? r.mood : '') === m ? ' active' : ''}" data-v="${m}" onclick="document.querySelectorAll('#ms-mood .tag').forEach(e=>e.classList.remove('active'));this.classList.add('active');">${m}</span>`).join('')}</div></div>
      <div class="form-group"><label class="form-label">备注</label><textarea id="ms-note" rows="2" placeholder="如：饮食、用药、异常情况">${isEdit ? Utils.escape(r.note || '') : ''}</textarea></div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="App.closeModal()">${I18n.t('cancel')}</button>
        <button class="btn-confirm" onclick="HealthMod.saveMens(${isEdit ? r.id : 'null'})">${I18n.t('save')}</button>
      </div>`;
  },

  saveMens(id) {
    const startDate = document.getElementById('ms-start').value;
    if (!startDate) { App.showToast(I18n.t('fillRequired'), 'error'); return; }
    const endDate = document.getElementById('ms-end').value;
    if (endDate && endDate < startDate) { App.showToast('结束日期不能早于开始日期', 'error'); return; }
    const pick = (sel) => { const el = document.querySelector(sel + ' .tag.active'); return el ? el.dataset.v : ''; };
    const symptoms = Array.from(document.querySelectorAll('#ms-sym .tag.active')).map(e => e.dataset.v).join(',');
    const payload = {
      startDate, endDate,
      flow: pick('#ms-flow') || '中',
      pain: pick('#ms-pain') || '无',
      symptoms,
      mood: pick('#ms-mood'),
      note: document.getElementById('ms-note').value
    };
    if (id) { Store.update('menstrual_records', id, payload); Store.logChange('health', '修改', id, '修改经期记录 ' + startDate); }
    else { Store.add('menstrual_records', payload); Store.logChange('health', '新增', 0, '新增经期记录 ' + startDate); }
    App.closeModal(); App.showToast(I18n.t('saved') || '已保存', 'success'); App.render();
  },

  delMens(id) {
    App.confirm(I18n.t('confirmDelete'), () => {
      Store.remove('menstrual_records', id);
      App.showToast(I18n.t('deleted')); App.render();
    });
  },

  /* ===== 健康总结（周/月/年 单人/全家） ===== */
  renderSummary() {
    const period = this.summaryPeriod;
    const scope = this.summaryScope;
    const today = Utils.today();
    let startDate, endDate = today, periodLabel;

    if (period === 'week') {
      const d = new Date(today);
      const dayOfWeek = d.getDay() || 7;
      startDate = new Date(d);
      startDate.setDate(d.getDate() - dayOfWeek + 1);
      startDate = startDate.toISOString().slice(0, 10);
      periodLabel = '本周';
    } else if (period === 'month') {
      startDate = today.slice(0, 7) + '-01';
      periodLabel = '本月';
    } else {
      startDate = today.slice(0, 4) + '-01-01';
      periodLabel = '本年';
    }

    // 获取健康记录
    let healthRecs = Store.filter('health_records', r => r.date >= startDate && r.date <= endDate);
    let medicalRecs = Store.filter('family_medical', r => r.date >= startDate && r.date <= endDate);
    let bodyRecs = Store.filter('body_measurements', r => r.date >= startDate && r.date <= endDate);
    let postureRecs = Store.filter('posture_records', r => r.date >= startDate && r.date <= endDate);

    // 全家模式：体检档案统计所有成员
    const members = Store.get('family_members');
    const memberStats = members.map(m => {
      const mMedical = medicalRecs.filter(r => r.memberId === m.id);
      return { member: m, medicalCount: mMedical.length, hasAbnormal: mMedical.some(r => r.abnormalItems) };
    });

    // 统计
    const totalSteps = healthRecs.reduce((s, r) => s + r.steps, 0);
    const avgWeight = healthRecs.length > 0 ? (healthRecs.reduce((s, r) => s + r.weight, 0) / healthRecs.length).toFixed(1) : '--';
    const avgSleep = healthRecs.length > 0 ? (healthRecs.reduce((s, r) => s + r.sleep, 0) / healthRecs.length).toFixed(1) : '--';
    const totalCal = healthRecs.reduce((s, r) => s + r.calories, 0);
    const exerciseDays = healthRecs.filter(r => r.exerciseDuration > 0).length;
    const stepAchievement = healthRecs.length > 0 ? Math.round(healthRecs.filter(r => r.steps >= r.targetSteps).length / healthRecs.length * 100) : 0;

    // 步数趋势
    const sortedRecs = healthRecs.sort((a, b) => a.date.localeCompare(b.date));
    const stepsChart = sortedRecs.length > 1 ? Charts.line(sortedRecs.map(r => ({ label: r.date.slice(5), value: r.steps })), { color: '#829E8E' }) : '';
    const weightChart = sortedRecs.length > 1 ? Charts.line(sortedRecs.map(r => ({ label: r.date.slice(5), value: r.weight })), { color: '#A6B7A1' }) : '';

    document.getElementById('health-sub').innerHTML = `
      <div class="flex-between mb-12">
        <div class="subsection-title" style="margin:0;">健康总结</div>
        <button class="btn btn-outline btn-sm" onclick="HealthMod.exportSummary()">📥 导出</button>
      </div>
      <div class="card mb-12">
        <div class="flex gap-12 mb-12" style="flex-wrap:wrap;">
          <div class="filter-tabs" style="margin:0;">
            <div class="filter-tab ${period === 'week' ? 'active' : ''}" onclick="HealthMod.setSummaryPeriod('week')">周报</div>
            <div class="filter-tab ${period === 'month' ? 'active' : ''}" onclick="HealthMod.setSummaryPeriod('month')">月报</div>
            <div class="filter-tab ${period === 'year' ? 'active' : ''}" onclick="HealthMod.setSummaryPeriod('year')">年报</div>
          </div>
          <div class="filter-tabs" style="margin:0;">
            <div class="filter-tab ${scope === 'self' ? 'active' : ''}" onclick="HealthMod.setSummaryScope('self')">仅本人</div>
            <div class="filter-tab ${scope === 'family' ? 'active' : ''}" onclick="HealthMod.setSummaryScope('family')">全家汇总</div>
          </div>
        </div>
        <div class="text-sm text-light">${periodLabel}（${startDate} ~ ${endDate}）</div>
      </div>
      <div class="dash-grid">
        <div class="dash-stat"><div class="dash-stat-num">${avgWeight}<span class="text-sm text-light">kg</span></div><div class="dash-stat-label">平均体重</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${totalSteps.toLocaleString()}</div><div class="dash-stat-label">总步数</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${avgSleep}<span class="text-sm text-light">h</span></div><div class="dash-stat-label">平均睡眠</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${exerciseDays}</div><div class="dash-stat-label">运动天数</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${totalCal}</div><div class="dash-stat-label">总消耗(kcal)</div></div>
        <div class="dash-stat"><div class="dash-stat-num ${stepAchievement >= 80 ? 'c-green' : 'c-orange'}">${stepAchievement}%</div><div class="dash-stat-label">步数达标率</div></div>
      </div>
      ${stepsChart ? `<div class="chart-box"><div class="chart-title">${periodLabel}步数趋势</div>${stepsChart}</div>` : ''}
      ${weightChart ? `<div class="chart-box"><div class="chart-title">${periodLabel}体重趋势</div>${weightChart}</div>` : ''}
      ${scope === 'family' ? `
        <div class="subsection-title">家庭成员体检概况</div>
        <div class="card">
          ${memberStats.map(ms => `
            <div class="label-pair">
              <span class="lk">${ms.member.name}（${ms.member.relation}）</span>
              <span class="vk">${ms.medicalCount}条体检记录 ${ms.hasAbnormal ? '· ⚠️ 有异常指标' : '· ✅ 无异常'}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class="subsection-title">围度变化（${periodLabel}）</div>
      ${bodyRecs.length > 0 ? `
        <div class="card">
          <div class="text-sm">${bodyRecs.length}次测量记录</div>
          ${bodyRecs.length >= 2 ? (() => {
            const first = bodyRecs[0], last = bodyRecs[bodyRecs.length - 1];
            const items = [['chest','胸围'],['waist','腰围'],['hip','臀围'],['thigh','大腿'],['calf','小腿'],['arm','手臂']];
            return items.filter(([k]) => first[k] || last[k]).map(([k,l]) => {
              const diff = (last[k] || 0) - (first[k] || 0);
              return `<div class="label-pair"><span class="lk">${l}</span><span class="vk">${first[k]||'--'} → ${last[k]||'--'} cm ${diff !== 0 ? '(' + (diff > 0 ? '+' : '') + diff.toFixed(1) + ')' : ''}</span></div>`;
            }).join('');
          })() : '<div class="text-sm text-light">仅1条记录，无法计算变化</div>'}
        </div>
      ` : '<div class="text-sm text-light">' + periodLabel + '暂无围度记录</div>'}
      <div class="subsection-title">体检记录（${periodLabel}）</div>
      ${medicalRecs.length > 0 ? medicalRecs.map(r => {
        const mem = Store.find('family_members', m => m.id === r.memberId);
        return `<div class="card"><div class="text-bold text-sm">🏥 ${Utils.escape(r.title)}</div><div class="text-sm text-light">${r.date} · ${mem ? mem.name : ''} · ${Utils.escape(r.hospital)}</div>${r.abnormalItems ? '<div class="text-sm" style="color:#E8A87C;">⚠️ ' + Utils.escape(r.abnormalItems) + '</div>' : ''}</div>`;
      }).join('') : '<div class="text-sm text-light">' + periodLabel + '暂无体检记录</div>'}
      <div class="subsection-title">体态检测（${periodLabel}）</div>
      ${postureRecs.length > 0 ? postureRecs.map(r => `<div class="card"><div class="text-bold text-sm">🧍 ${r.date}</div><div class="text-sm">${Utils.escape(r.aiAnalysis)}</div></div>`).join('') : '<div class="text-sm text-light">' + periodLabel + '暂无体态记录</div>'}
    `;
  },

  setSummaryPeriod(p) { this.summaryPeriod = p; App.render(); },
  setSummaryScope(s) { this.summaryScope = s; App.render(); },

  exportSummary() {
    const period = this.summaryPeriod === 'week' ? '周报' : (this.summaryPeriod === 'month' ? '月报' : '年报');
    const scope = this.summaryScope === 'self' ? '本人' : '全家';
    const rows = [
      ['健康总结' + period + '(' + scope + ')'],
      ['生成日期', Utils.today()],
      [],
      ['项目', '数值'],
    ];
    const records = Store.get('health_records');
    const today = Utils.today();
    let startDate;
    if (this.summaryPeriod === 'week') { const d = new Date(today); const dw = d.getDay()||7; startDate = new Date(d); startDate.setDate(d.getDate()-dw+1); startDate = startDate.toISOString().slice(0,10); }
    else if (this.summaryPeriod === 'month') startDate = today.slice(0,7)+'-01';
    else startDate = today.slice(0,4)+'-01-01';
    const recs = records.filter(r => r.date >= startDate && r.date <= today);
    rows.push(['记录天数', recs.length]);
    rows.push(['平均体重', recs.length > 0 ? (recs.reduce((s,r)=>s+r.weight,0)/recs.length).toFixed(1)+'kg' : '--']);
    rows.push(['总步数', recs.reduce((s,r)=>s+r.steps,0)]);
    rows.push(['平均睡眠', recs.length > 0 ? (recs.reduce((s,r)=>s+r.sleep,0)/recs.length).toFixed(1)+'h' : '--']);
    rows.push(['运动天数', recs.filter(r=>r.exerciseDuration>0).length]);
    rows.push(['总卡路里', recs.reduce((s,r)=>s+r.calories,0)+'kcal']);
    rows.push(['步数达标率', recs.length > 0 ? Math.round(recs.filter(r=>r.steps>=r.targetSteps).length/recs.length*100)+'%' : '--']);
    if (this.summaryScope === 'family') {
      rows.push([]);
      rows.push(['家庭成员体检概况']);
      Store.get('family_members').forEach(m => {
        const mc = Store.filter('family_medical', r => r.memberId === m.id && r.date >= startDate && r.date <= today);
        rows.push([m.name + '(' + m.relation + ')', mc.length + '条记录', mc.some(r=>r.abnormalItems) ? '有异常' : '无异常']);
      });
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    Utils.downloadCSV('健康总结_' + period + '_' + Utils.today() + '.csv', csv);
    App.showToast('导出成功', 'success');
  }
};
