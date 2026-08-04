/* ===== 跨模块事项聚合器 =====
 * 把全系统 7 大模块（工作待办 / 习惯 / 学习 / 健康 / 物资 / 时间提醒 / 财务）
 * 的数据归一化为统一的「事项」结构，供首页全域统计与日历模块共用。
 *
 * 归一化事项结构：
 *   { id, module, sourceTable, sourceId, title, date, time,
 *     done, doneAt, priority('高'|'中'|'低'|''), overdue, kind, color, actionModule, actionSub, icon }
 */
const TaskAgg = {
  /* 模块 → 中文标签（用于按模块分组展示） */
  MODULE_LABELS: {
    work: '工作', habits: '习惯', study: '学习', health: '健康',
    goods: '物资', reminder: '提醒', finance: '财务',
  },
  /* 模块 → 大类（用于日历「工作/健康/生活」筛选） */
  CATEGORY: {
    work: 'work', habits: 'life', study: 'life', health: 'health',
    goods: 'life', reminder: 'life', finance: 'life',
  },

  /* 取某一天的所有事项（date: 'YYYY-MM-DD'） */
  dayItems(date) {
    const today = Utils.today();
    const isToday = date === today;
    const items = [];

    /* 1. 工作待办 todos：当日截止 或 每日必完成（周期性） */
    Store.get('todos').forEach(t => {
      const daily = t.group === '每日必完成';
      if (t.deadline !== date && !daily) return;
      const done = t.status === '已完成';
      const overdue = !done && t.deadline && t.deadline < today;
      items.push({
        id: 'work:' + t.id, module: 'work', sourceTable: 'todos', sourceId: t.id,
        title: t.title, date, time: t.deadlineTime || '',
        done, doneAt: t.completedAt || '',
        priority: t.priority || '', overdue: overdue && isToday,
        kind: 'todo', color: t.priority === '高' ? '#e57373' : '#829E8E',
        actionModule: 'work', actionSub: '',
      });
    });

    /* 2. 习惯打卡 habits + habit_logs */
    const logs = Store.filter('habit_logs', l => l.date === date);
    Store.get('habits').forEach(h => {
      const done = logs.some(l => l.habitId === h.id);
      items.push({
        id: 'habit:' + h.id + ':' + date, module: 'habits', sourceTable: 'habit_logs', sourceId: h.id,
        title: '打卡 · ' + h.name, date, time: '',
        done, doneAt: done ? date : '',
        priority: '', overdue: false, kind: 'checkin',
        color: '#9AA7A0', actionModule: 'habits', actionSub: '', icon: h.icon,
      });
    });

    /* 3. 学习 study_records（当日记录视为完成项） */
    Store.filter('study_records', r => r.date === date).forEach(r => {
      items.push({
        id: 'study:' + r.id, module: 'study', sourceTable: 'study_records', sourceId: r.id,
        title: '学习 · ' + r.content, date, time: '',
        done: true, doneAt: date,
        priority: '', overdue: false, kind: 'study',
        color: '#A6B7A1', actionModule: 'study', actionSub: '',
      });
    });
    /* 在读/待阅读的书目作为「当日阅读计划」（仅今天，且不绑定具体日期） */
    if (isToday) {
      Store.filter('books', b => b.status === '在读' || b.status === '待阅读').forEach(b => {
        items.push({
          id: 'book:' + b.id, module: 'study', sourceTable: 'books', sourceId: b.id,
          title: '阅读 · ' + b.title, date, time: '',
          done: false, doneAt: '',
          priority: '', overdue: false, kind: 'reading',
          color: '#A6B7A1', actionModule: 'study', actionSub: 'books',
        });
      });
    }

    /* 4. 健康 health_records / body_measurements / family_medical / plants */
    Store.filter('health_records', r => r.date === date).forEach(r => {
      items.push({
        id: 'health:' + r.id, module: 'health', sourceTable: 'health_records', sourceId: r.id,
        title: '健康打卡 · ' + (r.exerciseType || '记录'), date, time: '',
        done: true, doneAt: date,
        priority: '', overdue: false, kind: 'measure',
        color: '#829E8E', actionModule: 'health', actionSub: 'record',
      });
    });
    Store.filter('body_measurements', r => r.date === date).forEach(r => {
      items.push({
        id: 'bm:' + r.id, module: 'health', sourceTable: 'body_measurements', sourceId: r.id,
        title: '围度测量', date, time: '',
        done: true, doneAt: date,
        priority: '', overdue: false, kind: 'measure',
        color: '#829E8E', actionModule: 'health', actionSub: 'body',
      });
    });
    Store.get('family_medical').forEach(m => {
      if (m.reviewDate !== date) return;
      const overdue = m.reviewDate < today;
      items.push({
        id: 'review:' + m.id, module: 'health', sourceTable: 'family_medical', sourceId: m.id,
        title: '体检复查 · ' + (m.title || ''), date, time: '',
        done: false, doneAt: '',
        priority: '中', overdue: overdue && isToday,
        kind: 'review', color: '#FF9800', actionModule: 'health', actionSub: 'medical',
      });
    });
    Store.filter('plants', p => p.status === '养护中').forEach(p => {
      const cycle = p.waterCycle || 7;
      const last = p.lastWaterDate || p.buyDate || '';
      const need = last ? Utils.addDays(last, cycle) : date;
      const due = !last || need <= date;
      const cared = Store.filter('plant_care', c => c.plantId === p.id && c.careDate === date).length > 0;
      if (due) {
        items.push({
          id: 'plant:' + p.id + ':' + date, module: 'health', sourceTable: 'plants', sourceId: p.id,
          title: '养护 · ' + p.name, date, time: '',
          done: cared, doneAt: cared ? date : '',
          priority: '', overdue: false, kind: 'care',
          color: '#9CCC9C', actionModule: 'health', actionSub: 'plants',
        });
      }
    });

    /* 5. 生活物资：到期预警（当日到期） */
    const goodsAll = Store.get('goods_c1').concat(Store.get('goods_c2'));
    goodsAll.forEach(g => {
      if (g.archived || !g.expireDate || g.expireDate !== date) return;
      items.push({
        id: 'goods:' + g.id, module: 'goods', sourceTable: (g.dayCost != null ? 'goods_c2' : 'goods_c1'), sourceId: g.id,
        title: '物资到期 · ' + g.name, date, time: '',
        done: false, doneAt: '',
        priority: '中', overdue: false, kind: 'goods-expire',
        color: '#FFB74D', actionModule: 'goods', actionSub: 'c1',
      });
    });

    /* 6. 时间提醒 reminders（生日/纪念日等） */
    Store.get('reminders').forEach(r => {
      if (r.date !== date) return;
      items.push({
        id: 'rem:' + r.id, module: 'reminder', sourceTable: 'reminders', sourceId: r.id,
        title: r.name, date, time: '',
        done: false, doneAt: '',
        priority: '中', overdue: false, kind: 'reminder',
        color: '#BA68C8', actionModule: 'reminders', actionSub: '',
      });
    });
    /* 法定节假日作为中性事件（已完成态，不计入未完成） */
    Store.get('holidays').forEach(h => {
      if (h.date !== date) return;
      items.push({
        id: 'hol:' + h.id, module: 'reminder', sourceTable: 'holidays', sourceId: h.id,
        title: '🎉 ' + h.name, date, time: '',
        done: true, doneAt: date, isEvent: true,
        priority: '', overdue: false, kind: 'holiday',
        color: '#66BB6A', actionModule: '', actionSub: '',
      });
    });

    /* 7. 财务记账 transactions（当日流水视为完成项） */
    Store.filter('transactions', t => t.date === date).forEach(t => {
      items.push({
        id: 'txn:' + t.id, module: 'finance', sourceTable: 'transactions', sourceId: t.id,
        title: (t.type === '收入' ? '收入' : '支出') + ' · ' + t.category + ' ' + (+t.amount).toFixed(2),
        date, time: '',
        done: true, doneAt: date,
        priority: '', overdue: false, kind: 'transaction',
        color: '#4DB6AC', actionModule: 'savings', actionSub: '',
      });
    });

    return items;
  },

  /* 取某月所有事项，按日期分组。year/month 如 2026, 8 */
  monthItems(year, month) {
    const ym = year + '-' + String(month).padStart(2, '0');
    const first = ym + '-01';
    const daysInMonth = new Date(year, month, 0).getDate();
    const byDate = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = ym + '-' + String(d).padStart(2, '0');
      byDate[ds] = this.dayItems(ds);
    }
    return byDate;
  },

  /* 取某周（周一~周日）事项，weekStart: 'YYYY-MM-DD'（周一） */
  weekItems(weekStart) {
    const arr = [];
    for (let i = 0; i < 7; i++) arr.push(this.dayItems(Utils.addDays(weekStart, i)));
    return arr;
  },

  /* 统一排序：逾期置顶 → 截止时间由近到远 → 高/中/低优先级 → 创建/完成时间由早到晚 */
  sortItems(items) {
    const pOrder = { '高': 0, '中': 1, '低': 2, '': 3 };
    return items.slice().sort((a, b) => {
      const aO = a.overdue ? 1 : 0, bO = b.overdue ? 1 : 0;
      if (aO !== bO) return bO - aO;
      const aD = a.date + ' ' + (a.time || '24:00');
      const bD = b.date + ' ' + (b.time || '24:00');
      if (aD !== bD) return aD < bD ? -1 : 1;
      const ap = a.priority ? pOrder[a.priority] : 3;
      const bp = b.priority ? pOrder[b.priority] : 3;
      if (ap !== bp) return ap - bp;
      return (a.doneAt || '').localeCompare(b.doneAt || '');
    });
  },

  /* 统计某一天的总数/已完成/未完成/完成率 */
  dayStats(date) {
    const items = this.dayItems(date);
    const done = items.filter(i => i.done).length;
    const total = items.length;
    const incomplete = total - done;
    const rate = total > 0 ? Math.round(done / total * 100) : 0;
    return { total, done, incomplete, rate, items };
  },

  /* 计算某天用于日历标记的要点 */
  dayMarks(items) {
    const marks = { red: false, orange: false, green: false, gray: false, count: items.length };
    items.forEach(i => {
      if (!i.done && (i.priority === '高' || i.overdue)) marks.red = true;
      if (i.kind === 'review' && !i.done) marks.orange = true;
      if (i.kind === 'holiday') marks.green = true;
      if ((i.kind === 'checkin' || i.kind === 'care' || i.kind === 'measure') && !i.done) marks.gray = true;
    });
    return marks;
  },
};
