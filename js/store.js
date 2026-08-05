/* ===== Store 数据层 — localStorage 模拟多表数据库 ===== */
const Store = {
  prefix: 'bb_',
  tables: {
    user: { fields: ['nickname','avatar','continueDay','totalStudyTime'], seed: [{ id:1, nickname:'白白', avatar:'', continueDay:0, totalStudyTime:0 }] },
    inbox: { fields: ['type','source','title','content','date','read','actionModule','actionSub','actionId','auto'], seed: [] },
    habits: { fields: ['name','icon','color','createdDate'], seed: [
      { id:1, name:'早起', icon:'🌅', color:'#829E8E', createdDate:'2026-07-01' },
      { id:2, name:'读书', icon:'📚', color:'#A6B7A1', createdDate:'2026-07-01' },
      { id:3, name:'运动', icon:'🏃', color:'#829E8E', createdDate:'2026-07-15' },
    ]},
    habit_logs: { fields: ['habitId','date'], seed: [
      { id:1, habitId:1, date:'2026-08-01' }, { id:2, habitId:2, date:'2026-08-01' },
      { id:3, habitId:1, date:'2026-08-02' }, { id:4, habitId:3, date:'2026-08-02' },
      { id:5, habitId:1, date:'2026-08-03' }, { id:6, habitId:2, date:'2026-08-03' },
    ]},
    study_records: { fields: ['content','type','duration','date','note'], seed: [
      { id:1, content:'Python数据结构', type:'编程', duration:120, date:'2026-07-28', note:'链表与树' },
      { id:2, content:'英语听力练习', type:'语言', duration:45, date:'2026-07-29', note:'BBC新闻' },
      { id:3, content:'React Hooks', type:'编程', duration:90, date:'2026-07-30', note:'useEffect' },
      { id:4, content:'设计心理学', type:'阅读', duration:60, date:'2026-08-01', note:'第三章' },
      { id:5, content:'算法刷题', type:'编程', duration:100, date:'2026-08-02', note:'动态规划' },
    ]},
    books: { fields: ['title','author','category','startDate','endDate','progress','status','rating','cover'], seed: [
      { id:1, title:'设计心理学', author:'Donald Norman', category:'设计', startDate:'2026-07-01', endDate:'', progress:75, status:'在读', rating:0, cover:'' },
      { id:2, title:'原子习惯', author:'James Clear', category:'自我提升', startDate:'2026-06-01', endDate:'2026-07-15', progress:100, status:'已读完', rating:5, cover:'' },
      { id:3, title:'深度工作', author:'Cal Newport', category:'效率', startDate:'', endDate:'', progress:0, status:'待阅读', rating:0, cover:'' },
    ]},
    book_excerpts: { fields: ['bookId','text','annotation','date'], seed: [
      { id:1, bookId:1, text:'好的设计是看不见的。', annotation:'设计的最高境界', date:'2026-07-10' },
      { id:2, bookId:1, text:'用户永远是对的，但用户的表达可能是错的。', annotation:'', date:'2026-07-20' },
    ]},
    book_reviews: { fields: ['bookId','title','content','rating','tags','date'], seed: [
      { id:1, bookId:2, title:'微小改变，巨大影响', content:'《原子习惯》让我意识到，真正持久的改变来自微小行动的日积月累...', rating:5, tags:'自我提升,习惯', date:'2026-07-16' },
    ]},
    annual_reading_plans: { fields: ['year','totalGoal','monthlyMin','themes','bookList','q1Goal','q2Goal','q3Goal','q4Goal'], seed: [
      { id:1, year:2026, totalGoal:24, monthlyMin:2, themes:'设计,编程,心理学', bookList:'设计心理学,深度工作,思考快与慢', q1Goal:6, q2Goal:6, q3Goal:6, q4Goal:6 },
    ]},
    health_records: { fields: ['weight','targetWeight','steps','targetSteps','calories','sleep','exerciseType','exerciseDuration','date'], seed: [
      { id:1, weight:58.5, targetWeight:56, steps:8500, targetSteps:8000, calories:320, sleep:7.5, exerciseType:'跑步', exerciseDuration:30, date:'2026-07-28' },
      { id:2, weight:58.3, targetWeight:56, steps:12000, targetSteps:8000, calories:450, sleep:7.0, exerciseType:'游泳', exerciseDuration:45, date:'2026-07-30' },
      { id:3, weight:58.0, targetWeight:56, steps:6000, targetSteps:8000, calories:200, sleep:8.0, exerciseType:'瑜伽', exerciseDuration:40, date:'2026-08-01' },
      { id:4, weight:58.1, targetWeight:56, steps:9500, targetSteps:8000, calories:380, sleep:7.5, exerciseType:'跑步', exerciseDuration:35, date:'2026-08-02' },
    ]},
    /* 家庭成员档案 */
    family_members: { fields: ['name','relation','note','avatar'], seed: [
      { id:1, name:'本人', relation:'本人', note:'', avatar:'' },
      { id:2, name:'妈妈', relation:'母亲', note:'高血压史', avatar:'' },
      { id:3, name:'爸爸', relation:'父亲', note:'糖尿病史', avatar:'' },
    ]},
    /* 家庭成员体检档案（含异常指标/复查/图片） */
    family_medical: { fields: ['memberId','title','date','hospital','indicators','abnormalItems','reviewDate','images','summary'], seed: [
      { id:1, memberId:1, title:'年度体检', date:'2026-06-15', hospital:'市第一人民医院', indicators:'血压118/76, 血糖5.2, 总胆固醇4.8, 维生素D 22ng/mL', abnormalItems:'维生素D偏低', reviewDate:'2026-12-15', images:[], summary:'整体健康，建议补充维生素D' },
      { id:2, memberId:2, title:'季度复查', date:'2026-05-20', hospital:'市中心医院', indicators:'血压142/88, 血糖5.8, 低密度脂蛋白3.5', abnormalItems:'血压偏高、低密度脂蛋白偏高', reviewDate:'2026-08-20', images:[], summary:'血压控制不理想，调整用药方案' },
      { id:3, memberId:1, title:'年度体检', date:'2025-06-10', hospital:'市第一人民医院', indicators:'血压115/72, 血糖4.9, 总胆固醇4.5, 维生素D 28ng/mL', abnormalItems:'', reviewDate:'', images:[], summary:'各项指标正常' },
    ]},
    /* 围度记录（本人，含目标值） */
    body_measurements: { fields: ['date','chest','chestTarget','waist','waistTarget','hip','hipTarget','thigh','thighTarget','calf','calfTarget','arm','armTarget','customItems'], seed: [
      { id:1, date:'2026-06-01', chest:88, chestTarget:86, waist:72, waistTarget:68, hip:92, hipTarget:90, thigh:54, thighTarget:52, calf:36, calfTarget:35, arm:28, armTarget:26, customItems:'' },
      { id:2, date:'2026-07-01', chest:87, chestTarget:86, waist:71, waistTarget:68, hip:91, hipTarget:90, thigh:53, thighTarget:52, calf:35.5, calfTarget:35, arm:27.5, armTarget:26, customItems:'' },
      { id:3, date:'2026-08-01', chest:86.5, chestTarget:86, waist:70, waistTarget:68, hip:90.5, hipTarget:90, thigh:52.5, thighTarget:52, calf:35, calfTarget:35, arm:27, armTarget:26, customItems:'' },
    ]},
    health_reports: { fields: ['memberId','title','date','hospital','summary','images'], seed: [] },
    posture_records: { fields: ['date','images','aiAnalysis','aiAdvice','manualNotes','manualPlan'], seed: [
      { id:1, date:'2026-07-01', images:[], aiAnalysis:'轻度头前伸、圆肩', aiAdvice:'1. 靠墙站立每日10分钟\n2. 收下巴练习每组15次\n3. 肩胛骨收缩训练', manualNotes:'', manualPlan:'' },
    ]},
    skin_records: { fields: ['date','images','aiAnalysis','aiAdvice','manualNotes','manualPlan'], seed: [
      { id:1, date:'2026-07-01', images:[], aiAnalysis:'T区泛油、鼻翼轻微闭口', aiAdvice:'1. 温和洁面早晚各一次\n2. 水杨酸局部点涂\n3. 注意防晒', manualNotes:'', manualPlan:'' },
    ]},
    exercise_plans: { fields: ['weekStart','plan','aiGenerated'], seed: [] },
    meetings: { fields: ['topic','date','attendees','location','content','tags','images','status'], seed: [
      { id:1, topic:'Q3产品规划会', date:'2026-08-01', attendees:'张三,李四,王五', location:'会议室A', content:'1. Q3核心目标是完成生活物资模块升级\n2. 张三负责前端开发，8月15日前完成\n3. 李四负责后端API，8月10日前联调\n4. 王五负责测试，8月20日前出测试报告\n5. 下次会议8月15日同步进度', tags:'产品,Q3', images:[], status:'定稿' },
    ]},
    todos: { fields: ['title','assignee','deadline','deadlineTime','group','detail','priority','status','progressNote','images','fromMeeting','createdAt','isOverdue','overdueSince','reminded30','remindedExact','completedAt'], seed: [
      { id:1, title:'完成生活物资模块前端开发', assignee:'张三', deadline:'2026-08-15', deadlineTime:'', group:'本周需完成', detail:'包含消耗品1/2和耐用品三个子模块', priority:'高', status:'进行中', progressNote:'已完成消耗品模块', images:[], fromMeeting:1, createdAt:'2026-08-01T09:00:00', isOverdue:false, overdueSince:'', reminded30:false, remindedExact:false, completedAt:'' },
      { id:2, title:'后端API联调', assignee:'李四', deadline:'2026-08-10', deadlineTime:'', group:'本周需完成', detail:'物资CRUD接口+OCR接口', priority:'高', status:'未开始', progressNote:'', images:[], fromMeeting:1, createdAt:'2026-08-01T09:30:00', isOverdue:false, overdueSince:'', reminded30:false, remindedExact:false, completedAt:'' },
      { id:3, title:'测试报告输出', assignee:'王五', deadline:'2026-08-20', deadlineTime:'', group:'本周需完成', detail:'全功能测试+性能测试', priority:'中', status:'未开始', progressNote:'', images:[], fromMeeting:1, createdAt:'2026-08-01T10:00:00', isOverdue:false, overdueSince:'', reminded30:false, remindedExact:false, completedAt:'' },
      { id:4, title:'周报提交', assignee:'白白', deadline:'2026-08-05', deadlineTime:'18:00', group:'每日必完成', detail:'本周工作总结', priority:'低', status:'已完成', progressNote:'已发送', images:[], fromMeeting:0, createdAt:'2026-08-01T08:00:00', isOverdue:false, overdueSince:'', reminded30:false, remindedExact:false, completedAt:'2026-08-04T17:30:00' },
      { id:5, title:'回复客户邮件', assignee:'白白', deadline:'2026-08-03', deadlineTime:'15:30', group:'每日必完成', detail:'处理积压的客户咨询邮件', priority:'高', status:'未开始', progressNote:'', images:[], fromMeeting:0, createdAt:'2026-08-03T08:00:00', isOverdue:false, overdueSince:'', reminded30:false, remindedExact:false, completedAt:'' },
      { id:6, title:'整理会议纪要', assignee:'白白', deadline:'2026-08-03', deadlineTime:'19:00', group:'每日必完成', detail:'整理今日项目周会纪要并同步团队', priority:'中', status:'未开始', progressNote:'', images:[], fromMeeting:0, createdAt:'2026-08-03T09:00:00', isOverdue:false, overdueSince:'', reminded30:false, remindedExact:false, completedAt:'' },
      { id:7, title:'代码评审', assignee:'张三', deadline:'2026-08-04', deadlineTime:'10:00', group:'本周需完成', detail:'评审物资模块PR', priority:'中', status:'未开始', progressNote:'', images:[], fromMeeting:0, createdAt:'2026-08-03T10:00:00', isOverdue:false, overdueSince:'', reminded30:false, remindedExact:false, completedAt:'' },
    ]},
    hotspot_data: { fields: ['title','summary','url','platform','contentDate','crawlBatch','crawlTime','likes','comments','hotRank','contentCat','sourceCat','heatLevel','aiTags','images','fullText','aiSummary','isFavorited'], seed: [
      { id:1, title:'国务院发布促进消费二十条措施', summary:'国务院发布促进消费二十条措施，涉及汽车、住房、文旅等消费领域，着力提振内需。', url:'http://www.people.com.cn', platform:'人民网', contentDate:'2026-08-03', crawlBatch:'2026-08-03-20', crawlTime:'2026-08-03 20:00:00', likes:0, comments:0, hotRank:1, contentCat:'综合新闻', sourceCat:'权威新闻平台', heatLevel:'高热热搜', aiTags:'政策,消费,经济', images:[], fullText:'国务院发布促进消费二十条措施，涉及汽车、住房、文旅等消费领域，着力提振内需。会议指出要进一步释放消费潜力，推动经济持续回升向好。', aiSummary:'国务院促消费二十条，涵盖汽车住房文旅，提振内需。', isFavorited:false },
      { id:2, title:'我国成功发射新一代北斗导航卫星', summary:'长征三号乙运载火箭成功将新一代北斗导航卫星送入预定轨道，卫星将对北斗系统进行技术验证。', url:'http://www.xinhuanet.com', platform:'新华网', contentDate:'2026-08-03', crawlBatch:'2026-08-03-20', crawlTime:'2026-08-03 20:00:00', likes:0, comments:0, hotRank:2, contentCat:'科技', sourceCat:'权威新闻平台', heatLevel:'高热热搜', aiTags:'航天,北斗,卫星', images:[], fullText:'长征三号乙运载火箭成功将新一代北斗导航卫星送入预定轨道，卫星将对北斗系统进行技术验证，标志着北斗系统升级换代进入新阶段。', aiSummary:'北斗新一代卫星成功发射，系统升级进入新阶段。', isFavorited:false },
      { id:3, title:'央视：全国多地迎来高温天气', summary:'中央气象台发布高温橙色预警，多地气温超过40度，提醒市民做好防暑降温。', url:'http://www.cctv.com', platform:'央视新闻', contentDate:'2026-08-02', crawlBatch:'2026-08-03-18', crawlTime:'2026-08-03 18:00:00', likes:0, comments:0, hotRank:3, contentCat:'社会', sourceCat:'权威新闻平台', heatLevel:'普通热点', aiTags:'天气,高温,预警', images:[], fullText:'中央气象台发布高温橙色预警，多地气温超过40度。提醒市民减少户外活动，做好防暑降温措施。各地已启动应急预案。', aiSummary:'全国高温橙色预警，多地超40度。', isFavorited:false },
      { id:4, title:'夏日清凉穿搭分享｜5套通勤look', summary:'5套夏日通勤穿搭分享，清爽薄款防晒，附搭配公式和购物链接。', url:'https://www.xiaohongshu.com', platform:'小红书', contentDate:'2026-08-03', crawlBatch:'2026-08-03-20', crawlTime:'2026-08-03 20:00:00', likes:98600, comments:3200, hotRank:1, contentCat:'生活', sourceCat:'图文自媒体', heatLevel:'高热热搜', aiTags:'穿搭,夏季,通勤', images:[], fullText:'5套夏日通勤穿搭分享，清爽薄款防晒。关键词：清爽、薄款、防晒。热门角度：全身照+细节图。建议文案突出实用性和搭配公式。', aiSummary:'5套夏季通勤穿搭，主打清爽防晒，附搭配公式。', isFavorited:true },
      { id:5, title:'高性价比好物推荐｜学生党必看', summary:'10款高性价比好物推荐，平价实用，适合学生党日常使用。', url:'https://www.xiaohongshu.com', platform:'小红书', contentDate:'2026-08-03', crawlBatch:'2026-08-03-20', crawlTime:'2026-08-03 20:00:00', likes:75200, comments:1800, hotRank:2, contentCat:'生活', sourceCat:'图文自媒体', heatLevel:'高热热搜', aiTags:'好物推荐,平价,学生党', images:[], fullText:'10款高性价比好物推荐。关键词：平价、学生党、回购。用户痛点：性价比。建议从使用场景切入。', aiSummary:'10款学生党平价好物，主打性价比回购。', isFavorited:false },
      { id:6, title:'AI编程工具横向测评：5款主流工具对比', summary:'对比Cursor、Copilot、Codeium等5款AI编程工具的功能、价格、体验。', url:'https://mp.weixin.qq.com', platform:'微信公众号', contentDate:'2026-08-03', crawlBatch:'2026-08-03-18', crawlTime:'2026-08-03 18:00:00', likes:12000, comments:800, hotRank:0, contentCat:'科技', sourceCat:'公众号专栏', heatLevel:'普通热点', aiTags:'AI,编程,工具,测评', images:[], fullText:'对比Cursor、Copilot、Codeium等5款AI编程工具。从功能完整性、价格、使用体验三个维度进行评分。Cursor在代码补全和多文件编辑方面表现最佳。', aiSummary:'5款AI编程工具对比，Cursor代码补全领先。', isFavorited:false },
      { id:7, title:'财政部：上半年全国一般公共预算收入同比增长3.8%', summary:'财政部公布上半年财政数据，一般公共预算收入119203亿元，同比增长3.8%。', url:'http://www.mof.gov.cn', platform:'人民网', contentDate:'2026-08-02', crawlBatch:'2026-08-03-18', crawlTime:'2026-08-03 18:00:00', likes:0, comments:0, hotRank:0, contentCat:'财经', sourceCat:'权威新闻平台', heatLevel:'普通热点', aiTags:'财政,预算,经济', images:[], fullText:'财政部公布上半年财政数据，一般公共预算收入119203亿元，同比增长3.8%。其中税收收入99185亿元，非税收入20018亿元。', aiSummary:'上半年财政收入11.92万亿，同比增3.8%。', isFavorited:false },
      { id:8, title:'3分钟学会手机拍出大片感', summary:'手机摄影技巧分享，构图、光影、后期三步出片，附对比图。', url:'https://www.douyin.com', platform:'抖音', contentDate:'2026-08-03', crawlBatch:'2026-08-03-16', crawlTime:'2026-08-03 16:00:00', likes:156000, comments:5600, hotRank:0, contentCat:'生活', sourceCat:'短视频自媒体', heatLevel:'小众创作素材', aiTags:'摄影,手机,技巧', images:[], fullText:'3分钟学会手机拍出大片感。构图：三分法、引导线、对称。光影：逆光剪影、侧光层次。后期：Snapseed调色、VSCO滤镜。', aiSummary:'手机摄影三步法：构图+光影+后期出片。', isFavorited:false },
    ]},
    hotspot_favorites: { fields: ['hotspotId','addedDate'], seed: [] },
    hotspot_monitors: { fields: ['keyword','type','createdAt'], seed: [] },
    diary: { fields: ['mood','content','tags','date','images','isPrivate'], seed: [
      { id:1, mood:'😊', content:'今天完成了物资模块的设计，感觉很有成就感。', tags:'工作,成就感', date:'2026-08-01', images:[], isPrivate:false },
      { id:2, mood:'😴', content:'有点累，但坚持读了一个小时书。', tags:'阅读', date:'2026-08-02', images:[], isPrivate:false },
      { id:3, mood:'🤔', content:'思考未来三个月的学习方向。', tags:'思考,计划', date:'2026-08-03', images:[], isPrivate:true },
    ]},
    clothes: { fields: ['name','category','subCategory','color','season','price','image','purchaseDate','annualCount','totalCount','isSecondhand','secondhandPrice','secondhandDate','archived'], seed: [
      { id:1, name:'白色T恤', category:'上衣', subCategory:'T恤', color:'白色', season:'夏', price:99, image:'', purchaseDate:'2026-05-01', annualCount:12, totalCount:30, isSecondhand:false, secondhandPrice:0, secondhandDate:'', archived:false },
      { id:2, name:'牛仔裤', category:'裤装', subCategory:'长裤', color:'蓝色', season:'四季', price:299, image:'', purchaseDate:'2026-03-15', annualCount:8, totalCount:20, isSecondhand:false, secondhandPrice:0, secondhandDate:'', archived:false },
      { id:3, name:'冬季羽绒服', category:'外套', subCategory:'羽绒服', color:'黑色', season:'冬', price:899, image:'', purchaseDate:'2025-12-01', annualCount:0, totalCount:5, isSecondhand:false, secondhandPrice:0, secondhandDate:'', archived:false },
    ]},
    outfits: { fields: ['date','images','matchedClothes','note','analysis'], seed: [] },
    goods_c1: { fields: ['name','classify','buyDate','expireDate','totalPrice','stock','remark','image','archived'], seed: [
      { id:1, name:'抽纸', classify:'纸巾', buyDate:'2026-07-01', expireDate:'2026-10-01', totalPrice:45, stock:8, remark:'整箱采购', image:'', archived:false },
      { id:2, name:'垃圾袋', classify:'清洁', buyDate:'2026-06-15', expireDate:'2026-12-15', totalPrice:25, stock:3, remark:'', image:'', archived:false },
    ]},
    goods_c1_logs: { fields: ['goodsId','oldStock','newStock','date','note'], seed: [
      { id:1, goodsId:1, oldStock:10, newStock:8, date:'2026-07-20', note:'日常使用' },
    ]},
    goods_c2: { fields: ['name','classify','buyDate','expireDate','totalPrice','stock','dayCost','remark','image','archived'], seed: [
      { id:1, name:'洗面奶', classify:'洗护', buyDate:'2026-07-01', expireDate:'2026-09-01', totalPrice:89, stock:60, dayCost:1.48, remark:'', image:'', archived:false },
      { id:2, name:'身体乳', classify:'护肤', buyDate:'2026-06-01', expireDate:'2026-09-01', totalPrice:128, stock:40, dayCost:1.42, remark:'大瓶装', image:'', archived:false },
    ]},
    goods_c2_logs: { fields: ['goodsId','oldStock','newStock','oldDayCost','newDayCost','date'], seed: [] },
    goods_durable_main: { fields: ['name','buyDate','totalPrice','estTotalUses','cumUses','unitDepreciation','secondhandPrice','secondhandDate','archived'], seed: [
      { id:1, name:'笔记本电脑', buyDate:'2025-01-01', totalPrice:8999, estTotalUses:1000, cumUses:450, unitDepreciation:8.999, secondhandPrice:0, secondhandDate:'', archived:false },
      { id:2, name:'相机', buyDate:'2024-06-01', totalPrice:6500, estTotalUses:500, cumUses:80, unitDepreciation:13.0, secondhandPrice:0, secondhandDate:'', archived:false },
    ]},
    goods_durable_sub: { fields: ['mainId','name','buyDate','totalPrice','estTotalUses','cumUses','unitDepreciation','secondhandPrice','secondhandDate','archived'], seed: [
      { id:1, mainId:1, name:'无线鼠标', buyDate:'2025-01-01', totalPrice:159, estTotalUses:1000, cumUses:450, unitDepreciation:0.159, secondhandPrice:0, secondhandDate:'', archived:false },
      { id:2, mainId:2, name:'50mm镜头', buyDate:'2024-06-01', totalPrice:1200, estTotalUses:500, cumUses:80, unitDepreciation:2.4, secondhandPrice:0, secondhandDate:'', archived:false },
    ]},
    /* 花花草草 */
    plants: { fields: ['name','variety','buyDate','buyPrice','status','deathDate','remark','images','waterCycle','fertilizeCycle','lastWaterDate','lastFertilizeDate'], seed: [
      { id:1, name:'绿萝', variety:'天南星科', buyDate:'2026-03-01', buyPrice:25, status:'养护中', deathDate:'', remark:'放在客厅窗台', images:[], waterCycle:5, fertilizeCycle:30, lastWaterDate:'2026-08-01', lastFertilizeDate:'2026-07-05' },
      { id:2, name:'多肉-玉露', variety:'百合科', buyDate:'2026-05-15', buyPrice:15, status:'养护中', deathDate:'', remark:'阳台养护', images:[], waterCycle:10, fertilizeCycle:45, lastWaterDate:'2026-07-28', lastFertilizeDate:'2026-06-20' },
      { id:3, name:'薄荷', variety:'唇形科', buyDate:'2026-01-10', buyPrice:10, status:'枯萎死亡', deathDate:'2026-06-20', remark:'夏天浇水过多烂根', images:[], waterCycle:3, fertilizeCycle:30, lastWaterDate:'2026-06-15', lastFertilizeDate:'2026-05-20' },
    ]},
    plant_care: { fields: ['plantId','careType','careDate','note','isBatch'], seed: [
      { id:1, plantId:1, careType:'浇水', careDate:'2026-07-20', note:'', isBatch:true },
      { id:2, plantId:2, careType:'浇水', careDate:'2026-07-20', note:'', isBatch:true },
      { id:3, plantId:1, careType:'施肥', careDate:'2026-07-05', note:'稀释液肥', isBatch:false },
      { id:4, plantId:1, careType:'浇水', careDate:'2026-08-01', note:'', isBatch:false },
      { id:5, plantId:2, careType:'浇水', careDate:'2026-07-28', note:'', isBatch:false },
      { id:6, plantId:1, careType:'修剪', careDate:'2026-06-15', note:'修剪黄叶', isBatch:false },
    ]},
    /* 影音记录 */
    media: { fields: ['title','category','tags','startDate','endDate','cost','rating','images','progress','status','abandonReason','channel','cinema','showTime','ticketPrice','companions','totalEpisodes','currentEpisode','dramaNotes','docTopic','docKnowledge','docReflection','addToStudy'], seed: [
      { id:1, title:'盗梦空间', category:'电影', tags:'科幻,悬疑', startDate:'2026-07-20', endDate:'2026-07-20', cost:45, rating:5, images:[], progress:100, status:'已看完', abandonReason:'', channel:'影院观影', cinema:'万达影城IMAX厅', showTime:'2026-07-20 19:30', ticketPrice:45, companions:'朋友', totalEpisodes:0, currentEpisode:0, dramaNotes:'', docTopic:'', docKnowledge:'', docReflection:'', addToStudy:false },
      { id:2, title:'三体', category:'电视剧', tags:'科幻,国产', startDate:'2026-07-15', endDate:'', cost:0, rating:4, images:[], progress:60, status:'追更中', abandonReason:'', channel:'线上观看', cinema:'', showTime:'', ticketPrice:0, companions:'', totalEpisodes:30, currentEpisode:18, dramaNotes:'制作精良，还原度高', docTopic:'', docKnowledge:'', docReflection:'', addToStudy:false },
      { id:3, title:'蓝色星球', category:'纪录片', tags:'自然,海洋', startDate:'2026-06-01', endDate:'2026-06-15', cost:0, rating:5, images:[], progress:100, status:'已看完', abandonReason:'', channel:'线上观看', cinema:'', showTime:'', ticketPrice:0, companions:'', totalEpisodes:8, currentEpisode:8, dramaNotes:'', docTopic:'海洋生态', docKnowledge:'深海热泉生态系统、珊瑚礁共生关系', docReflection:'对海洋保护有了更深认识', addToStudy:true },
      { id:4, title:'某综艺', category:'综艺', tags:'搞笑', startDate:'2026-05-01', endDate:'', cost:0, rating:2, images:[], progress:30, status:'搁置弃看', abandonReason:'后期内容重复，笑点疲劳', channel:'线上观看', cinema:'', showTime:'', ticketPrice:0, companions:'', totalEpisodes:12, currentEpisode:4, dramaNotes:'', docTopic:'', docKnowledge:'', docReflection:'', addToStudy:false },
    ]},
    media_notes: { fields: ['mediaId','noteType','content','annotation','date','fromOCR'], seed: [
      { id:1, mediaId:1, noteType:'台词摘抄', content:'你永远不曾记得梦境的开端，对吗？', annotation:'经典开场白', date:'2026-07-21', fromOCR:true },
      { id:2, mediaId:1, noteType:'观后感', content:'诺兰对梦境层次的构建令人叹为观止，每个细节都经得起推敲。', annotation:'', date:'2026-07-21', fromOCR:false },
      { id:3, mediaId:3, noteType:'知识点', content:'深海热泉周围的生物不依赖阳光，而是通过化能合成生存。', annotation:'颠覆了生命必须依赖光合作用的认知', date:'2026-06-10', fromOCR:false },
    ]},
    accounts: { fields: ['name','type','balance','currency'], seed: [
      { id:1, name:'招商银行', type:'储蓄卡', balance:25600.50, currency:'CNY' },
      { id:2, name:'支付宝', type:'电子钱包', balance:3200.00, currency:'CNY' },
      { id:3, name:'微信零钱', type:'电子钱包', balance:580.30, currency:'CNY' },
    ]},
    transactions: { fields: ['accountId','type','category','amount','date','note','image'], seed: [
      { id:1, accountId:1, type:'支出', category:'餐饮', amount:35, date:'2026-08-01', note:'午餐', image:'' },
      { id:2, accountId:1, type:'支出', category:'交通', amount:12, date:'2026-08-01', note:'地铁', image:'' },
      { id:3, accountId:2, type:'支出', category:'购物', amount:159, date:'2026-08-02', note:'鼠标', image:'' },
      { id:4, accountId:1, type:'收入', category:'工资', amount:8000, date:'2026-08-01', note:'7月工资', image:'' },
      { id:5, accountId:1, type:'支出', category:'餐饮', amount:68, date:'2026-08-02', note:'聚餐', image:'' },
      { id:6, accountId:3, type:'支出', category:'日用', amount:45, date:'2026-08-03', note:'抽纸', image:'' },
    ]},
    gift_money: { fields: ['direction','person','relation','event','amount','date','returnStatus','returnDate','note'], seed: [
      { id:1, direction:'收', person:'张阿姨', relation:'邻居', event:'乔迁', amount:500, date:'2026-06-20', returnStatus:'待回礼', returnDate:'', note:'' },
      { id:2, direction:'送', person:'李叔叔', relation:'同事', event:'结婚', amount:800, date:'2026-05-01', returnStatus:'已回礼', returnDate:'2026-07-15', note:'' },
    ]},
    savings_goals: { fields: ['name','target','current','deadline'], seed: [
      { id:1, name:'年度旅行基金', target:20000, current:8500, deadline:'2026-12-31' },
    ]},
    /* ===== 储蓄板块：存档快照（每次登记生成独立锁定快照） ===== */
    savings_snapshots: { fields: ['ts','date','platforms','balance','monthlyIncome','monthlyExpense'], seed: [] },
    spending_threshold: { fields: ['month','threshold','alert80','alert100','alert120','lockExplain'], seed: [
      { id:1, month:'2026-08', threshold:3000, alert80:false, alert100:false, alert120:false, lockExplain:'' },
    ]},
    reminders: { fields: ['name','type','lunar','date','advanceDays','note'], seed: [
      { id:1, name:'妈妈生日', type:'生日', lunar:true, date:'2026-09-15', advanceDays:7, note:'农历八月初三' },
      { id:2, name:'结婚纪念日', type:'纪念日', lunar:false, date:'2026-10-01', advanceDays:3, note:'' },
      { id:3, name:'爸爸生日', type:'生日', lunar:true, date:'2026-11-20', advanceDays:7, note:'农历十月初十' },
    ]},
    holidays: { fields: ['name','date','days','type'], seed: [
      { id:1, name:'中秋节', date:'2026-09-25', days:3, type:'法定' },
      { id:2, name:'国庆节', date:'2026-10-01', days:7, type:'法定' },
      { id:3, name:'元旦', date:'2027-01-01', days:3, type:'法定' },
    ]},
    change_logs: { fields: ['module','action','entityId','summary','timestamp'], seed: [] },
    /* ===== 通用输入历史记忆（影院 / 日记标签 / 影音标签等，供模糊建议使用） ===== */
    input_history: { fields: ['key','value','count','lastUsed'], seed: [
      { id:1, key:'cinema', value:'万达影城IMAX厅', count:1, lastUsed:'2026-07-20' },
      { id:2, key:'diaryTags', value:'工作', count:1, lastUsed:'2026-08-01' },
      { id:3, key:'diaryTags', value:'成就感', count:1, lastUsed:'2026-08-01' },
      { id:4, key:'diaryTags', value:'阅读', count:1, lastUsed:'2026-08-02' },
      { id:5, key:'diaryTags', value:'思考', count:1, lastUsed:'2026-08-03' },
      { id:6, key:'diaryTags', value:'计划', count:1, lastUsed:'2026-08-03' },
    ]},
    /* ===== 经期记录 ===== */
    menstrual_records: { fields: ['startDate','endDate','flow','pain','symptoms','mood','note'], seed: [
      { id:1, startDate:'2026-06-08', endDate:'2026-06-13', flow:'中', pain:'轻微', symptoms:'腰酸', mood:'😴', note:'' },
      { id:2, startDate:'2026-07-06', endDate:'2026-07-11', flow:'中', pain:'无', symptoms:'', mood:'😊', note:'' },
      { id:3, startDate:'2026-08-03', endDate:'', flow:'多', pain:'明显', symptoms:'腹痛,乏力', mood:'😖', note:'注意保暖' },
    ]},
    /* ===== 应用设置（日记密码等） ===== */
    app_settings: { fields: ['key','value'], seed: [
      { id:1, key:'diaryPassword', value:'' },
    ]},
    /* ===== 热点资讯抓取源（RSS/Atom） ===== */
    news_sources: { fields: ['name','url','contentCat','sourceCat','enabled'], seed: [] },
  },

  init() {
    for (const name in this.tables) {
      const key = this.prefix + name;
      if (!localStorage[key]) {
        const seed = this.tables[name].seed || [];
        localStorage[key] = JSON.stringify(seed);
      }
    }
  },
  get(table) {
    try { return JSON.parse(localStorage[this.prefix + table] || '[]'); }
    catch(e) { return []; }
  },
  save(table, data) { localStorage[this.prefix + table] = JSON.stringify(data); this.notifyCloud(); },
  add(table, obj) {
    const data = this.get(table);
    obj.id = data.length > 0 ? Math.max(...data.map(d => d.id)) + 1 : 1;
    data.push(obj);
    this.save(table, data);
    return obj;
  },
  update(table, id, patch) {
    const data = this.get(table);
    const item = data.find(d => d.id === id);
    if (item) { Object.assign(item, patch); this.save(table, data); }
    return item;
  },
  remove(table, id) {
    const data = this.get(table).filter(d => d.id !== id);
    this.save(table, data);
  },
  find(table, fn) { return this.get(table).find(fn); },
  filter(table, fn) { return this.get(table).filter(fn); },

  /* ===== 通用输入历史记忆 =====
   * key: 'cinema' | 'diaryTags' | 'mediaTags' | ...
   * values: 字符串或字符串数组，自动去重、累加使用次数 */
  rememberInput(key, values) {
    if (!key || !values) return;
    const arr = Array.isArray(values) ? values : String(values).split(/[,，]/);
    const list = this.get('input_history');
    const today = (typeof Utils !== 'undefined' && Utils.today) ? Utils.today() : new Date().toISOString().slice(0, 10);
    let changed = false;
    arr.forEach(raw => {
      const v = String(raw == null ? '' : raw).trim();
      if (!v || v.length > 40) return;
      const hit = list.find(h => h.key === key && h.value === v);
      if (hit) { hit.count = (hit.count || 0) + 1; hit.lastUsed = today; }
      else {
        list.push({ id: list.length > 0 ? Math.max(...list.map(d => d.id)) + 1 : 1, key, value: v, count: 1, lastUsed: today });
      }
      changed = true;
    });
    /* 单个 key 最多保留 80 条，按使用次数+时间淘汰 */
    const same = list.filter(h => h.key === key);
    if (same.length > 80) {
      same.sort((a, b) => (b.count - a.count) || String(b.lastUsed).localeCompare(String(a.lastUsed)));
      const keep = new Set(same.slice(0, 80).map(h => h.id));
      const next = list.filter(h => h.key !== key || keep.has(h.id));
      this.save('input_history', next);
      return;
    }
    if (changed) this.save('input_history', list);
  },

  /* 取出某个 key 的历史值数组（按热度排序） */
  historyOf(key) {
    return this.get('input_history')
      .filter(h => h.key === key && h.value)
      .sort((a, b) => (b.count - a.count) || String(b.lastUsed).localeCompare(String(a.lastUsed)))
      .map(h => h.value);
  },

  forgetInput(key, value) {
    const list = this.get('input_history').filter(h => !(h.key === key && h.value === value));
    this.save('input_history', list);
  },

  /* ===== 应用设置读写 ===== */
  getSetting(key, def) {
    const row = this.get('app_settings').find(s => s.key === key);
    return row ? row.value : (def === undefined ? '' : def);
  },
  setSetting(key, value) {
    const list = this.get('app_settings');
    const row = list.find(s => s.key === key);
    if (row) row.value = value;
    else list.push({ id: list.length > 0 ? Math.max(...list.map(d => d.id)) + 1 : 1, key, value });
    this.save('app_settings', list);
  },
  notifyCloud() {
    if (typeof Cloud !== 'undefined' && Cloud.client && Cloud.loggedIn) {
      Cloud.notifyChange();
    }
  },
  logChange(module, action, entityId, summary) {
    this.add('change_logs', { module, action, entityId, summary, timestamp: new Date().toISOString() });
  },
  getChangeLogs(module) {
    return this.get('change_logs').filter(l => l.module === module).slice(-20).reverse();
  },
  exportAll() {
    const data = {};
    for (const name in this.tables) data[name] = this.get(name);
    return JSON.stringify(data, null, 2);
  },
  importAll(jsonStr) {
    const data = JSON.parse(jsonStr);
    for (const name in data) localStorage[this.prefix + name] = JSON.stringify(data[name]);
  },
  exportCSV(table, columns) {
    const data = this.get(table);
    const header = columns.map(c => c.label).join(',');
    const rows = data.map(d => columns.map(c => {
      let v = typeof c.get === 'function' ? c.get(d) : (d[c.field] || '');
      v = String(v).replace(/"/g, '""');
      return `"${v}"`;
    }).join(','));
    return [header, ...rows].join('\n');
  },
  resetAll() {
    for (const name in this.tables) delete localStorage[this.prefix + name];
    this.init();
    this.notifyCloud();
  }
};
