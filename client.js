window.__ModuleLoader__.load({
  id: 'dsh-workboard',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const {useCallback, useEffect, useRef, useState, useSyncExternalStore} = React;

    const NS = 'dsh-workboard';
    const PANEL = 'dsh-workboard';
    const SETTINGS_PANEL = 'dsh-workboard-settings';
    const PACKAGE = 'dsh-workboard';
    const SLOT = 'workboard.widget';
    const POLL_MS = 5000;
    const WEATHER_MS = 10 * 60_000;
    const QUOTE_MS = 6 * 3600_000;
    const CAL_MS = 15 * 60_000;
    const FEED_MS = 15 * 60_000;
    const AGENT_MS = 5000;
    const BRIEF_TIME = '08:30';
    const BRIEF_WAIT_MS = 10 * 60_000;
    const DAILY_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
    const WORKSPACE_MS = 60_000;
    const USAGE_MS = 60_000;
    const GIT_MS = 30_000;
    const GITHUB_MS = 5 * 60_000;
    const SYSTEM_MS = 5000;
    const MARKET_MS = 60_000;
    const TRENDING_MS = 10 * 60_000;
    const OUTPUTS_MS = 30_000;
    const FILES_MS = 15_000;
    const CLIP_MS = 2000;
    const NET_MS = 2000;
    const NOWPLAYING_MS = 3000;
    const VIDEO_MS = 15 * 60_000;
    const PORTS_MS = 5000;
    const APPS_MS = 10_000;
    const APP_ICONS_MS = 3600_000;
    const APP_LIST_MS = 60_000;
    const STATUS_MS = 2 * 60_000;
    const PAPERS_MS = 30 * 60_000;
    const MODELS_MS = 30 * 60_000;
    const HOLIDAY_MS = 6 * 3600_000;
    const MAX_PINNED = 20;
    const MAX_APPS = 32;
    // 尺寸档位：[列, 行]，行单位 80px；「横栏」半高，其余行数成对。
    const SIZES = {bar: [4, 1], s: [1, 2], m: [2, 2], t: [1, 4], l: [2, 4], w: [4, 2]};
    // 组件库分类；未声明或不在表内的归入 plugin。
    const CATEGORIES = ['daily', 'agent', 'news', 'tools', 'mine', 'plugin'];

    const zh = {
      lang: 'zh-CN', title: '工作台', loadFailed: '加载失败', empty: '看板上还没有 widget',
      today: '今日', clock: '时钟', todo: '待办', note: '速记', calendar: '日历', weather: '天气',
      d_today: '问候、时间、天气、格言合成一条横栏', d_todo: '未完成自动结转，Agent 可读写', d_note: '自动保存，当前行可转待办',
      d_calendar: '系统日历和 ICS 订阅的日程与月历，中文界面显示农历', d_weather: 'Open-Meteo 天气与空气质量', d_clock: '时间、问候与年度进度',
      night: '夜深了', morning: '早上好', noon: '中午好', afternoon: '下午好', evening: '晚上好', greetName: '{g}，{name}',
      week: '第 {n} 周', year: '今年已过 {n}%', nextQuote: '换一条',
      addTodo: '添加待办', carried: '结转', done: '已完成 {n}', remove: '移除', complete: '完成', reopen: '恢复', noTodos: '没有待办',
      notePlaceholder: '随手记', saved: '已保存 {t}', saving: '保存中…', lineToTodo: '当前行转待办',
      setCity: '设置城市', feels: '体感 {n}°', humidity: '湿度 {n}%',
      wx_clear: '晴', wx_partly: '多云', wx_cloud: '阴', wx_fog: '雾', wx_drizzle: '毛毛雨', wx_rain: '雨', wx_snow: '雪', wx_showers: '阵雨', wx_thunder: '雷雨',
      aqi0: '优', aqi1: '良', aqi2: '轻度污染', aqi3: '中度污染', aqi4: '重度污染', aqi5: '严重污染',
      allDay: '全天', noEvents: '没有日程', addIcs: '添加 ICS 订阅', todayEvents: '今天', tomorrowEvents: '明天', prevMonth: '上个月', nextMonth: '下个月', calError: '{n} 个订阅加载失败',
      calConnect: '连接系统日历', calAsking: '等待授权…', calDenied: '在「系统设置 → 隐私与安全性 → 日历」里允许 DeepSeek Harness', f_systemCalendar: '显示 macOS 系统日历',
      defaultBoard: '默认', untitled: '未命名', newBoard: '看板 {n}', newBoardLabel: '新建看板', rename: '双击改名',
      edit: '编辑', doneEdit: '完成', addWidget: '添加 widget', added: '已添加', add: '添加', settings: '设置', save: '保存', cancel: '取消',
      saved: '已保存', cfg_personal: '个人', openSettings: '打开设置',
      intro: '点这里编辑看板：添加 widget、拖动排序、调整尺寸', introOk: '知道了',
      searchWidget: '搜索 widget', cat_all: '全部', cat_daily: '日常', cat_agent: 'DeepSeek', cat_news: '资讯', cat_tools: '效率与工具', cat_plugin: '插件',
      deleteBoard: '删除看板', confirmDelete: '确认删除', size: '尺寸', drag: '拖动排序',
      size_bar: '横栏', size_s: '小 1×1', size_m: '中 2×1', size_t: '竖 1×2', size_l: '大 2×2', size_w: '通栏 4×1',
      f_name: '称呼', f_location: '城市', f_unit: '温度单位', f_showWeather: '显示天气', f_showQuote: '显示格言', f_urls: 'ICS 订阅地址（每行一个）', f_weekStart: '每周开始于',
      celsius: '摄氏 °C', fahrenheit: '华氏 °F', monday: '周一', sunday: '周日', searchCity: '搜索城市', noResults: '没有找到', clear: '清除',
      quote: '格言', countdown: '倒数日', worldclock: '世界时钟', focus: '专注', links: '快捷链接', progress: '时间进度',
      d_quote: '每日一句，点一下换一条，可换成自己的句子', d_countdown: '距周末、月底、年底和你设定的日子还有几天', d_worldclock: '多个时区的当前时间',
      d_focus: '番茄钟，结束时发系统通知', d_links: '常用网址一键打开', d_progress: '今天、本周、本月、今年已过去多少',
      f_quoteSource: '格言来源', qs_builtin: '内置', qs_hitokoto: '一言（hitokoto.cn）', qs_custom: '自定义',
      f_quotes: '自定义格言（来源为「自定义」时使用，每行一条：句子 — 作者）',
      f_events: '日子（每行一个，如 2026-12-25 圣诞节；只写 12-25 则每年重复）', f_builtinCountdown: '显示周末、月底、年底',
      weekend: '周末', monthEnd: '月底', yearEnd: '年底', dayUnit: '天', dayUnits: '天', isToday: '今天', addEvents: '添加日子',
      f_zones: '时区（每行一个：IANA 时区 名称）', tomorrowShort: '明天', yesterdayShort: '昨天', hoursDiff: '{n} 小时', sameTime: '同本地',
      defaultZones: 'America/Los_Angeles 旧金山\nEurope/London 伦敦\nAsia/Tokyo 东京',
      focusWork: '专注', focusBreak: '休息', start: '开始', pause: '暂停', resume: '继续', reset: '重置', skip: '跳过', pomos: '今日 {n} 个番茄',
      f_workMin: '专注时长', f_breakMin: '休息时长', minutes: '{n} 分钟', focusDone: '专注结束，休息一下', breakDone: '休息结束，开始下一个专注',
      f_links: '链接（每行一个：名称 https://…）', addLinks: '添加链接',
      p_day: '今天', p_week: '本周', p_month: '本月', p_year: '今年',
      agents: 'Agent', feed: '订阅', habits: '习惯打卡',
      d_agents: '等你确认和运行中的会话、最近会话与即将触发的定时任务', d_feed: 'RSS / Atom 订阅，由 Host 拉取并缓存', d_habits: '每天打卡，显示最近一周和连续天数',
      waitingYou: '等你确认', running: '运行中', untitledSession: '未命名会话', newSession: '新会话', schedules: '定时任务', executing: '执行中',
      noSessions: '还没有会话', noActive: '没有进行中的会话', agentsUnavailable: '当前 Harness 不支持读取会话', activeCount: '{n} 个进行中',
      f_showRecent: '显示最近会话', f_showSchedules: '显示定时任务',
      f_feeds: '订阅地址（每行一个 RSS / Atom，支持 rsshub://路由）', f_rsshub: 'RSSHub 实例地址（留空用 rsshub.app，建议填自建实例）', defaultFeeds: 'https://www.ifanr.com/feed\nhttps://www.ruanyifeng.com/blog/atom.xml', feedError: '{n} 个订阅加载失败', noItems: '没有内容',
      markAllRead: '全部已读', unreadCount: '{n} 条未读', f_hideRead: '隐藏已读',
      addHabit: '添加习惯，回车保存', noHabits: '在下方添加一个习惯，每天点对应日期的格子打卡', streak: '连续 {n} 天', markDay: '{d} 打卡', todayShort: '今',
      prompt: 'Prompt 快启', usage: '用量', running: '运行中', git: 'Git 工作区', github: 'GitHub', system: '系统状态', photo: '相框', market: '行情',
      d_market: '汇率、A 股 / 港股 / 美股和加密货币报价', f_symbols: '代码（每行一个，后面可加名称）', f_upColor: '涨跌颜色', up_red: '红涨绿跌', up_green: '绿涨红跌',
      mk_symbols: 'USD/CNY\nHKD/CNY\nhk00700 腾讯\nBTC', mk_none: '在设置里添加代码', mk_unknown: '无法识别', mk_missing: '未找到',
      trending: '热榜', d_trending: '微博、知乎、36 氪、Hacker News、GitHub 等国内外热榜', tr_none: '在设置里选择信源',
      tr_weibo: '微博', tr_zhihu: '知乎', tr_36kr: '36 氪', tr_sspai: '少数派', tr_bilibili: 'B 站', tr_v2ex: 'V2EX',
      tr_hn: 'Hacker News', tr_github: 'GitHub', tr_producthunt: 'Product Hunt', tr_reddit: 'Reddit',
      f_ghSince: 'GitHub 时间段', gh_daily: '今日', gh_weekly: '本周', gh_monthly: '本月', f_ghLang: 'GitHub 语言（如 typescript、python；留空看全部）',
      f_hubType: '自定义聚合服务', hub_none: '不使用', hub_dailyhot: 'DailyHotApi', hub_newsnow: 'NewsNow',
      f_hubUrl: '聚合实例地址', f_hubSources: '聚合信源（每行一个：源ID 显示名，如 juejin 掘金）',
      d_photo: '轮播本机文件夹里的照片，点击换下一张', f_photoDir: '照片文件夹', f_shuffle: '随机顺序', f_every: '切换间隔', every_m: '{n} 分钟', every_h: '{n} 小时', every_d: '{n} 天', every_off: '不自动切换',
      ph_empty: '这个文件夹里没有照片', ph_pick: '选择文件夹',
      d_system: '本机 CPU、内存、磁盘和电池', s_cpu: 'CPU', s_mem: '内存', s_disk: '磁盘', s_battery: '电池', s_cores: '{n} 核 · 负载 {l}', s_free: '剩余 {n}',
      s_charging: '充电中', s_plugged: '已接电源', s_left: '剩 {t}', s_uptime: '已运行 {t}', s_load: '负载 {l}',
      d_git: '各仓库的分支、未提交改动、未推送 / 落后提交和可清理的分支', d_github: '等我 review 的 PR、我的 PR 和指派给我的 issue，用本机 gh CLI',
      f_repos: '仓库路径（每行一个；留空用 Harness 里的工作区）', g_changes: '{n} 处改动', g_conflicts: '{n} 处冲突', g_gone: '{n} 个可清理分支', g_clean: '干净', g_noUpstream: '无上游',
      g_none: '没有找到 Git 仓库', g_attention: '{n} 个仓库待处理', g_allClean: '全部干净', g_fetch: '获取远端', g_fetching: '获取中…',
      gitPrompt: '检查当前目录的 Git 仓库（{name}）：未提交改动、未推送提交、是否落后上游、已合并或上游已删除的本地分支。先汇报现状和建议，不要直接提交、推送或删除。',
      f_showReview: '显示等我 review', f_showMine: '显示我的 PR', f_showAssigned: '显示指派给我的 issue', gh_review: '等我 review', gh_mine: '我的 PR', gh_assigned: '指派给我',
      gh_none: '没有待处理的 PR 或 issue', gh_missing: '本机未安装 GitHub CLI（gh）', gh_login: '在终端运行 gh auth login 后重试', gh_draft: '草稿', refresh: '刷新', updated: '更新于 {t}',
      d_running: 'Agent 正在推进的目标和后台任务，可停止任务', r_goals: '目标', r_jobs: '后台任务', r_idle: '没有进行中的目标或后台任务', r_unavailable: '当前 Harness 不支持读取目标和后台任务',
      r_round: '第 {n}/{m} 轮', r_active: '进行中', r_paused: '已暂停', r_blocked: '受阻', r_complete: '已完成', r_disarmed: '等待恢复',
      r_running: '已运行 {t}', r_stopping: '正在停止', r_completed: '已完成', r_killed: '已停止', r_failed: '失败', r_kill: '停止', r_count: '{g} 个目标 · {j} 个任务',
      attention: '待处理', d_attention: '等你确认的会话、卡住的目标、失败的作业、待 Review 的 PR 和结转待办，按紧急程度排成一列',
      a_waiting: '等你确认', a_blocked: '目标卡住', a_failed: '作业失败', a_review: '待 Review', a_todo: '结转待办',
      a_clear: '没有需要你处理的事', a_count: '{n} 项待处理', f_attnGithub: '包含待 Review 的 PR', f_attnTodos: '包含结转待办',
      brief: '每日简报', d_brief: 'Agent 汇总工作台数据写成的今日简报，可每天定时生成', b_empty: '还没有简报', b_generate: '生成', b_regenerate: '重新生成', b_generating: '生成中…',
      b_session: '查看会话', b_auto: '每天 {t}', b_autoOff: '每天自动生成', f_briefTime: '每天自动生成的时间（HH:MM）', briefTaskTitle: '工作台每日简报',
      briefPrompt: '生成今天的工作简报：先调用 workboard_context 读取工作台数据，再用 workboard_brief 的 write 写入一份 Markdown 简报，最后只回复一句已完成。简报用中文，300 字以内，依次是：需要我先处理的事（按紧急程度）、今天的日程、最近 24 小时的产出与用量、值得留意的 Git / GitHub 状态。没有内容的部分直接省略；不寒暄，不复述数据来源。',
      d_usage: '每天的请求数与 token，按模型拆分，可按单价估算费用', u_today: '今日 token', u_requests: '{n} 次请求', u_cache: '缓存命中 {n}%', u_cost: '约 ${n}',
      u_vs: '昨日 {n}', u_range_1: '今天', u_range_7: '7 天', u_range_30: '30 天', u_model: '模型', u_req: '请求', u_tok: 'token',
      u_unreported: '{n} 次请求未上报 token（{p}）', u_none: '这段时间没有请求', u_day: '{d}：{t} token，{r} 次请求',
      f_prices: '单价（每行一个：模型 输入 输出 [缓存读] [缓存写]，美元 / 百万 token；模型可写前缀）',
      f_orPrices: '未填单价的模型按 OpenRouter 公开价估算', u_costOr: '约 ${n}（按 OpenRouter 公开价）',
      d_prompt: '一句话或预设模板直接开新会话',
      promptPlaceholder: '让 Agent 做点什么，回车发送', sending: '发送中…', f_presets: '预设（每行一个：名称 | prompt）', f_cwd: '工作目录（留空用默认）', ws_label: '工作区', ws_default: '默认工作区',
      defaultPresets: '今日计划 | 读取我工作台上的待办和日程，帮我排出今天最该做的三件事\n周报草稿 | 读取我工作台上本周完成的待办，写一份简短的周报草稿',
      toAgent: '交给 Agent', itemCount: '{n} 条',
      cat_mine: '我的', gen_card: '用 Agent 生成', gen_hint: '说一句想要什么，Agent 做好后放到当前看板',
      gen_title: '用 Agent 生成 widget', gen_go: '交给 Agent', gen_placeholder: '想在工作台上看到什么？写清楚数据和样子，回车发送',
      gen_examples: '离下班还有多久，下班时间可以设置\n比特币和以太坊的价格与 24 小时涨跌\n我关注的 GitHub 仓库的 Star 数\n喝水记录：点一下记一杯，显示今天喝了几杯\n人民币与常用外币的换算器',
      gen_prompt: '请为我的工作台做一个 widget：{desc}\n\n先加载 workboard-widget skill，按其中的流程用 workboard_widget 工具创建。',
      cw_edit: '让 Agent 修改', cw_editTitle: '让 Agent 修改「{title}」', cw_editPlaceholder: '想怎么改？比如换成竖版布局、加一个刷新按钮',
      cw_editPrompt: '请修改我的工作台上的 widget「{title}」（id：{id}）：{desc}\n\n先加载 workboard-widget skill，用 workboard_widget get 读取当前定义后再改。',
      cw_fix: '让 Agent 修复', cw_fixPrompt: '我的工作台上的 widget「{title}」（id：{id}）运行出错：\n{error}\n\n请先加载 workboard-widget skill，用 workboard_widget get 读取当前定义，找到原因后修复。',
      cw_source: '源码', cw_title: '标题', cw_delete: '删除 widget', cw_fetch: '可访问的地址', cw_none: '无',
      cw_export: '复制 JSON', cw_exported: '已复制', cw_withData: '包含已保存的数据',
      imp_card: '粘贴导入', imp_hint: '导入别人分享的 widget JSON', imp_placeholder: '粘贴导出的 widget JSON',
      imp_check: '检查', imp_go: '导入并放到看板', imp_fetch: '会访问', imp_offline: '不访问网络', imp_data: '附带已保存的数据',
      outputs: '产出物', d_outputs: 'Agent 交付和新建的文档，点开即用，可回到来源会话',
      o_presented: '交付', o_reveal: '定位', o_session: '会话', o_none: '还没有产出物', o_count: '{n} 个文件', o_missing: '已删除',
      f_created: '包含 Agent 新建的文档', f_showMissing: '显示已删除的文件',
      tasks: '定时任务', d_tasks: '所有定时任务的下次运行时间与周期，可立即运行、暂停、恢复、删除',
      sc_none: '没有定时任务', sc_unavailable: '当前 Harness 不支持定时任务', sc_run: '运行', sc_delete: '删除', sc_paused: '已暂停', sc_ended: '已结束',
      sc_pending: '上一次还在执行', sc_count: '{a} 个启用 · {p} 个暂停', sc_clear: '清除已结束 {n}', sc_new: '新建',
      sc_newPrompt: '帮我创建一个定时任务：', f_showEnded: '显示已结束的任务',
      once: '一次性', every_n: '每 {n}', daily_at: '每天 {t}', weekly_at: '每周{d} {t}', monthly_at: '每月 {d} 日 {t}',
      iv_min: '{n} 分钟', iv_hour: '{n} 小时', iv_day: '{n} 天', iv_week: '{n} 周',
      pinned: '收藏会话', d_pinned: '常用会话固定在这里，显示最新一条消息，点一下继续',
      pin_add: '收藏会话', pin_none: '还没有收藏的会话', pin_search: '搜索会话标题或目录', pin_missing: '会话已不存在', unpin: '取消收藏', pin_count: '已收藏 {n}',
      files: '最近文件', d_files: '下载、桌面等文件夹里最新的文件，可打开、定位或交给 Agent',
      f_dirs: '文件夹（每行一个）', f_folders: '包含文件夹', fi_none: '没有文件', fi_error: '{n} 个文件夹读取失败',
      filePrompt: '看一下这个文件：{path}\n先告诉我它是什么、有哪些要点，再问我要怎么处理。',
      clipboard: '剪贴板', d_clipboard: '最近复制的文字，一键交给 Agent 翻译、总结或改写',
      cb_unsupported: '当前系统不支持读取剪贴板', cb_empty: '复制一段文字后会出现在这里', cb_copy: '复制', cb_copied: '已复制', cb_clear: '清空',
      f_cbPresets: '预设（每行一个：名称 | 指令，剪贴板内容附在指令后）',
      defaultClipPresets: '翻译 | 翻译下面的内容：中文译成英文，其他语言译成中文\n总结 | 用几条要点总结下面的内容\n解释 | 解释下面这段内容，必要时举例\n改写 | 把下面的内容改写得更清晰、简洁',
      network: '网络', d_network: '网速、内网和出口 IP、系统代理，以及到常用站点的延迟',
      n_down: '下行', n_up: '上行', n_local: '内网', n_public: '出口', n_proxy: '代理', n_noProxy: '未开启', n_pac: '自动代理（PAC）',
      n_unreachable: '不可达', n_curl: '需要 curl', n_latency: '延迟',
      f_targets: '测速站点（每行一个：名称 https://…）', defaultTargets: '百度 https://www.baidu.com\nGitHub https://github.com\nGoogle https://www.google.com',
      nowplaying: '正在播放', d_nowplaying: '系统正在播放的内容（QQ 音乐、「音乐」、Spotify、浏览器等），可暂停和切歌',
      np_idle: '没有在播放', np_open: '打开{app}', np_mac: '仅支持 macOS', np_denied: '在「系统设置 → 隐私与安全性 → 自动化」里允许 DeepSeek Harness 控制{app}',
      np_auto: '自动', np_music: '音乐', np_spotify: 'Spotify', f_npApp: '播放器', np_prev: '上一首', np_next: '下一首', np_play: '播放', np_pause: '暂停',
      ambient: '白噪音', d_ambient: '雨声、海浪、风声、篝火和粉噪 / 棕噪，可叠加，可在专注时自动播放',
      am_rain: '雨声', am_waves: '海浪', am_wind: '风声', am_fire: '篝火', am_pink: '粉噪', am_brown: '棕噪', am_volume: '音量', f_ambientFocus: '专注时自动播放',
      videos: '视频订阅', d_videos: 'B 站 UP 主、YouTube 频道的最新视频，带封面',
      f_videoSources: '订阅（每行一个：B 站空间链接或 UID、YouTube 频道链接或 @handle、带封面的 RSS；后面可加名称）',
      defaultVideos: 'https://space.bilibili.com/946974 影视飓风\nhttps://space.bilibili.com/163637592 何同学', vd_error: '{n} 个订阅加载失败', vd_views: '{n} 次播放',
      ports: '端口', d_ports: '本机正在监听的端口和开发服务器，可在浏览器打开、定位目录或停止进程',
      pt_none: '没有开发服务在监听端口', pt_unsupported: '当前系统不支持', pt_lsof: '需要 lsof', pt_stop: '停止', pt_confirm: '确认停止',
      pt_lan: '局域网可访问', pt_count: '{n} 个端口', pt_hidden: '另有 {n} 个 App 端口', f_ptApps: '显示 App 与系统进程',
      apps: '快捷应用', d_apps: '常用的本机应用一键打开，正在运行的带圆点',
      ap_add: '添加应用', ap_search: '搜索应用', ap_none: '没有匹配的应用', ap_count: '已选 {n} 个', ap_missing: '已卸载', ap_unsupported: '仅支持 macOS 与 Windows',
      status: '服务状态', d_status: 'DeepSeek、Claude、OpenAI、GitHub 等服务的状态页，有故障时标出',
      st_empty: '在设置里添加状态页', st_none: '运行正常', st_maintenance: '维护中', st_minor: '部分降级', st_major: '部分中断', st_critical: '严重中断',
      st_all: '全部正常', st_issues: '{n} 个服务异常', st_error: '无法读取',
      f_statusSources: '状态页（每行一个：名称 地址；支持 Statuspage 与 DeepSeek 状态页）',
      defaultStatus: 'DeepSeek https://status.deepseek.com\nClaude https://status.claude.com\nOpenAI https://status.openai.com\nGitHub https://www.githubstatus.com\nnpm https://status.npmjs.org',
      papers: 'AI 论文', d_papers: 'Hugging Face 每日论文与热门模型，论文可交给 Agent 解读',
      pp_papers: '论文', pp_models: '模型', pp_votes: '{n} 人点赞', pp_likes: '{n} 人喜欢', pp_downloads: '{n} 下载', f_ppModels: '显示热门模型',
      pp_prompt: '读一下这篇论文：{title}\n{url}\n用中文讲清楚它要解决的问题、核心方法、主要结果和局限，最后说说可能的应用场景。',
      models: '模型行情', d_models: 'OpenRouter 本周热门与最新上架的模型，附价格与上下文长度',
      md_top: '热门', md_new: '最新', md_free: '免费', md_price: '输入 ${i} · 输出 ${o}（美元 / 百万 token）', md_ctx: '{n} 上下文', md_none: '没有匹配的模型',
      f_mdVendors: '只看这些厂商（空格分隔，如 deepseek anthropic openai；留空看全部）',
      holiday: '节假日', d_holiday: '中国大陆法定节假日、调休上班日与农历',
      hd_now: '放假中', hd_off: '放假 {n} 天', hd_work: '{d} 上班', hd_todayOff: '今天放假（{name}）', hd_todayWork: '今天调休上班（{name}）', hd_none: '暂无已公布的假期安排',
      activity: '活跃热力图', d_activity: '过去一年每天的 Agent 用量，按 token 或请求数着色',
      ac_tokens: 'token', ac_requests: '请求', f_acMetric: '着色依据', ac_total: '共 {n} {u}', ac_days: '{n} 天活跃', ac_streak: '连续 {n} 天', ac_best: '最长连续 {n} 天',
    };
    const en = {
      lang: 'en-US', title: 'Workboard', loadFailed: 'Failed to load', empty: 'No widgets on this board yet',
      today: 'Today', clock: 'Clock', todo: 'To-do', note: 'Notes', calendar: 'Calendar', weather: 'Weather',
      d_today: 'Greeting, time, weather and a quote in one banner', d_todo: 'Unfinished items carry over; the agent can read and edit', d_note: 'Autosaves; turn the current line into a to-do',
      d_calendar: 'Events from your macOS calendars and ICS subscriptions, with a month view', d_weather: 'Weather and air quality from Open-Meteo', d_clock: 'Time, greeting and year progress',
      night: 'Good night', morning: 'Good morning', noon: 'Good afternoon', afternoon: 'Good afternoon', evening: 'Good evening', greetName: '{g}, {name}',
      week: 'Week {n}', year: '{n}% of the year', nextQuote: 'Next quote',
      addTodo: 'Add a to-do', carried: 'Carried over', done: 'Completed {n}', remove: 'Remove', complete: 'Complete', reopen: 'Reopen', noTodos: 'Nothing to do',
      notePlaceholder: 'Jot something down', saved: 'Saved {t}', saving: 'Saving…', lineToTodo: 'Current line to to-do',
      setCity: 'Set a city', feels: 'Feels {n}°', humidity: 'Humidity {n}%',
      wx_clear: 'Clear', wx_partly: 'Partly cloudy', wx_cloud: 'Overcast', wx_fog: 'Fog', wx_drizzle: 'Drizzle', wx_rain: 'Rain', wx_snow: 'Snow', wx_showers: 'Showers', wx_thunder: 'Thunderstorm',
      aqi0: 'Good', aqi1: 'Moderate', aqi2: 'Sensitive', aqi3: 'Unhealthy', aqi4: 'Very unhealthy', aqi5: 'Hazardous',
      allDay: 'All day', noEvents: 'No events', addIcs: 'Add an ICS subscription', todayEvents: 'Today', tomorrowEvents: 'Tomorrow', prevMonth: 'Previous month', nextMonth: 'Next month', calError: '{n} subscription(s) failed to load',
      calConnect: 'Connect system calendar', calAsking: 'Waiting for permission…', calDenied: 'Allow DeepSeek Harness in System Settings → Privacy & Security → Calendars', f_systemCalendar: 'Show macOS system calendar',
      defaultBoard: 'Default', untitled: 'Untitled', newBoard: 'Board {n}', newBoardLabel: 'New board', rename: 'Double-click to rename',
      edit: 'Edit', doneEdit: 'Done', addWidget: 'Add widget', added: 'Added', add: 'Add', settings: 'Settings', save: 'Save', cancel: 'Cancel',
      saved: 'Saved', cfg_personal: 'Personal', openSettings: 'Open settings',
      intro: 'Edit this board here: add widgets, drag to reorder, resize', introOk: 'Got it',
      searchWidget: 'Search widgets', cat_all: 'All', cat_daily: 'Daily', cat_agent: 'DeepSeek', cat_news: 'News', cat_tools: 'Productivity & tools', cat_plugin: 'Plugins',
      deleteBoard: 'Delete board', confirmDelete: 'Confirm delete', size: 'Size', drag: 'Drag to reorder',
      size_bar: 'Banner', size_s: 'Small 1×1', size_m: 'Medium 2×1', size_t: 'Tall 1×2', size_l: 'Large 2×2', size_w: 'Wide 4×1',
      f_name: 'Your name', f_location: 'City', f_unit: 'Temperature unit', f_showWeather: 'Show weather', f_showQuote: 'Show quote', f_urls: 'ICS subscription URLs, one per line', f_weekStart: 'Week starts on',
      celsius: 'Celsius °C', fahrenheit: 'Fahrenheit °F', monday: 'Monday', sunday: 'Sunday', searchCity: 'Search for a city', noResults: 'No matches', clear: 'Clear',
      quote: 'Quote', countdown: 'Countdown', worldclock: 'World clock', focus: 'Focus', links: 'Links', progress: 'Time progress',
      d_quote: 'A daily quote; click for another, or use your own', d_countdown: 'Days until the weekend, month end, year end and your own dates', d_worldclock: 'Current time in several time zones',
      d_focus: 'Pomodoro timer with a system notification when it ends', d_links: 'Open the sites you use most', d_progress: 'How much of today, this week, month and year has passed',
      f_quoteSource: 'Quote source', qs_builtin: 'Built-in', qs_hitokoto: 'Hitokoto (hitokoto.cn, Chinese)', qs_custom: 'Your own',
      f_quotes: 'Your own quotes, used when the source is Your own; one per line: text — author',
      f_events: 'Dates, one per line, e.g. 2026-12-25 Christmas; 12-25 alone repeats every year', f_builtinCountdown: 'Show weekend, month end and year end',
      weekend: 'Weekend', monthEnd: 'Month end', yearEnd: 'Year end', dayUnit: 'day', dayUnits: 'days', isToday: 'Today', addEvents: 'Add dates',
      f_zones: 'Time zones, one per line: IANA zone and a name', tomorrowShort: 'Tomorrow', yesterdayShort: 'Yesterday', hoursDiff: '{n}h', sameTime: 'Same as local',
      defaultZones: 'America/New_York New York\nEurope/London London\nAsia/Tokyo Tokyo',
      focusWork: 'Focus', focusBreak: 'Break', start: 'Start', pause: 'Pause', resume: 'Resume', reset: 'Reset', skip: 'Skip', pomos: '{n} today',
      f_workMin: 'Focus length', f_breakMin: 'Break length', minutes: '{n} min', focusDone: 'Focus session done. Take a break.', breakDone: 'Break is over. Ready for the next one.',
      f_links: 'Links, one per line: name https://…', addLinks: 'Add links',
      p_day: 'Today', p_week: 'This week', p_month: 'This month', p_year: 'This year',
      agents: 'Agent', feed: 'Feeds', habits: 'Habits',
      d_agents: 'Sessions waiting for you or running, recent sessions and upcoming scheduled tasks', d_feed: 'RSS / Atom feeds, fetched and cached by the Host', d_habits: 'Daily check-ins with the last week and your streak',
      waitingYou: 'Needs you', running: 'Running', untitledSession: 'Untitled session', newSession: 'New session', schedules: 'Scheduled', executing: 'Running',
      noSessions: 'No sessions yet', noActive: 'Nothing running', agentsUnavailable: 'This Harness does not expose sessions', activeCount: '{n} active',
      f_showRecent: 'Show recent sessions', f_showSchedules: 'Show scheduled tasks',
      f_feeds: 'Feed URLs, one RSS or Atom feed per line (rsshub://route supported)', f_rsshub: 'RSSHub instance URL (empty uses rsshub.app; self-hosted recommended)', defaultFeeds: 'https://hnrss.org/frontpage', feedError: '{n} feed(s) failed to load', noItems: 'Nothing here',
      markAllRead: 'Mark all read', unreadCount: '{n} unread', f_hideRead: 'Hide read items',
      addHabit: 'Add a habit, press Enter', noHabits: 'Add a habit below, then tick the box for each day you do it', streak: '{n}-day streak', markDay: 'Check in for {d}', todayShort: 'Today',
      prompt: 'Quick prompt', usage: 'Usage', running: 'Running', git: 'Git repos', github: 'GitHub', system: 'System', photo: 'Photo frame', market: 'Markets',
      d_market: 'Exchange rates, China / Hong Kong / US stocks and crypto prices', f_symbols: 'Symbols, one per line, optionally followed by a name', f_upColor: 'Gain colour', up_red: 'Red for gains', up_green: 'Green for gains',
      mk_symbols: 'EUR/USD\nUSD/JPY\nusAAPL Apple\nBTC', mk_none: 'Add symbols in settings', mk_unknown: 'Unrecognized', mk_missing: 'Not found',
      trending: 'Trending', d_trending: 'Hot lists from Hacker News, GitHub, Reddit, Weibo, Zhihu and more', tr_none: 'Choose sources in settings',
      tr_weibo: 'Weibo', tr_zhihu: 'Zhihu', tr_36kr: '36Kr', tr_sspai: 'sspai', tr_bilibili: 'Bilibili', tr_v2ex: 'V2EX',
      tr_hn: 'Hacker News', tr_github: 'GitHub', tr_producthunt: 'Product Hunt', tr_reddit: 'Reddit',
      f_ghSince: 'GitHub range', gh_daily: 'Today', gh_weekly: 'This week', gh_monthly: 'This month', f_ghLang: 'GitHub language (e.g. typescript, python; empty for all)',
      f_hubType: 'Custom aggregator', hub_none: 'Off', hub_dailyhot: 'DailyHotApi', hub_newsnow: 'NewsNow',
      f_hubUrl: 'Aggregator URL', f_hubSources: 'Aggregator sources, one per line: id label (e.g. juejin Juejin)',
      d_photo: 'Cycles through photos in a local folder; click for the next one', f_photoDir: 'Photo folder', f_shuffle: 'Shuffle', f_every: 'Change every', every_m: '{n} min', every_h: '{n} h', every_d: '{n} day', every_off: 'Never',
      ph_empty: 'No photos in this folder', ph_pick: 'Choose folder',
      d_system: 'CPU, memory, disk and battery of this machine', s_cpu: 'CPU', s_mem: 'Memory', s_disk: 'Disk', s_battery: 'Battery', s_cores: '{n} cores · load {l}', s_free: '{n} free',
      s_charging: 'Charging', s_plugged: 'Plugged in', s_left: '{t} left', s_uptime: 'Up {t}', s_load: 'Load {l}',
      d_git: 'Branch, uncommitted changes, unpushed or missing commits and branches to clean up, per repository', d_github: 'PRs awaiting your review, your PRs and issues assigned to you, through the local gh CLI',
      f_repos: 'Repository paths, one per line (empty uses the Harness workspaces)', g_changes: '{n} changes', g_conflicts: '{n} conflicts', g_gone: '{n} stale branches', g_clean: 'Clean', g_noUpstream: 'No upstream',
      g_none: 'No Git repositories found', g_attention: '{n} need attention', g_allClean: 'All clean', g_fetch: 'Fetch', g_fetching: 'Fetching…',
      gitPrompt: 'Check the Git repository in the current directory ({name}): uncommitted changes, unpushed commits, whether it is behind upstream, and local branches that are merged or whose upstream is gone. Report the state and your suggestions first; do not commit, push or delete anything yet.',
      f_showReview: 'Show review requests', f_showMine: 'Show my PRs', f_showAssigned: 'Show issues assigned to me', gh_review: 'Review requested', gh_mine: 'My PRs', gh_assigned: 'Assigned to me',
      gh_none: 'No open PRs or issues for you', gh_missing: 'GitHub CLI (gh) is not installed on this machine', gh_login: 'Run gh auth login in a terminal, then retry', gh_draft: 'Draft', refresh: 'Refresh', updated: 'Updated {t}',
      d_running: 'Goals the agent is pursuing and background jobs, which you can stop', r_goals: 'Goals', r_jobs: 'Background jobs', r_idle: 'No active goals or background jobs', r_unavailable: 'This Harness does not expose goals or jobs',
      r_round: 'Round {n}/{m}', r_active: 'Active', r_paused: 'Paused', r_blocked: 'Blocked', r_complete: 'Complete', r_disarmed: 'Waiting to resume',
      r_running: 'Running for {t}', r_stopping: 'Stopping', r_completed: 'Completed', r_killed: 'Stopped', r_failed: 'Failed', r_kill: 'Stop', r_count: '{g} goals · {j} jobs',
      attention: 'Attention', d_attention: 'Sessions waiting for you, stuck goals, failed jobs, PRs to review and carried-over to-dos, in one queue by urgency',
      a_waiting: 'Needs you', a_blocked: 'Goal blocked', a_failed: 'Job failed', a_review: 'Review requested', a_todo: 'Carried-over to-do',
      a_clear: 'Nothing needs you', a_count: '{n} to handle', f_attnGithub: 'Include PRs to review', f_attnTodos: 'Include carried-over to-dos',
      brief: 'Daily brief', d_brief: 'A brief of your day that the agent writes from the dashboard, optionally every morning', b_empty: 'No brief yet', b_generate: 'Generate', b_regenerate: 'Regenerate', b_generating: 'Writing…',
      b_session: 'Open session', b_auto: 'Daily at {t}', b_autoOff: 'Every day', f_briefTime: 'Daily time (HH:MM)', briefTaskTitle: 'Workboard daily brief',
      briefPrompt: 'Write today\'s work brief: call workboard_context to read the dashboard, save a Markdown brief with workboard_brief (action write), then reply with one line once done. Keep it under 150 words, in English, in this order: what needs me first (by urgency), today\'s calendar, output and usage over the last 24 hours, Git / GitHub worth noticing. Skip empty parts; no greetings, no restating where the data came from.',
      d_usage: 'Requests and tokens per day, split by model, with optional cost estimates', u_today: 'Tokens today', u_requests: '{n} requests', u_cache: '{n}% cache hits', u_cost: '≈ ${n}',
      u_vs: 'Yesterday {n}', u_range_1: 'Today', u_range_7: '7 days', u_range_30: '30 days', u_model: 'Model', u_req: 'Requests', u_tok: 'Tokens',
      u_unreported: '{n} requests reported no tokens ({p})', u_none: 'No requests in this period', u_day: '{d}: {t} tokens, {r} requests',
      f_prices: 'Prices, one per line: model input output [cache read] [cache write], USD per million tokens; a model prefix matches',
      f_orPrices: 'Estimate models without a price from OpenRouter list prices', u_costOr: '≈ ${n} (OpenRouter list price)',
      d_prompt: 'Start a new session from a line of text or a preset',
      promptPlaceholder: 'Ask the agent something, Enter to send', sending: 'Sending…', f_presets: 'Presets, one per line: name | prompt', f_cwd: 'Working directory (empty uses the default)', ws_label: 'Workspace', ws_default: 'Default workspace',
      defaultPresets: 'Plan today | Read my Workboard to-dos and calendar and pick the three things I should do today\nWeekly note | Read the to-dos I completed on Workboard this week and draft a short weekly update',
      toAgent: 'Hand to agent', itemCount: '{n} items',
      cat_mine: 'Mine', gen_card: 'Generate with agent', gen_hint: 'Describe what you want; the agent builds it and puts it on this board',
      gen_title: 'Generate a widget with the agent', gen_go: 'Hand to agent', gen_placeholder: 'What should this card show? Describe the data and the look, Enter to send',
      gen_examples: 'Time left until I finish work, with the end time as a setting\nBitcoin and Ether prices with 24-hour change\nStar count of the GitHub repositories I follow\nWater log: tap to add a glass, show today\'s count\nCurrency converter for the currencies I use',
      gen_prompt: 'Make a widget for my Workboard dashboard: {desc}\n\nLoad the workboard-widget skill first and create it with the workboard_widget tool following that skill.',
      cw_edit: 'Ask agent to change', cw_editTitle: 'Ask the agent to change “{title}”', cw_editPlaceholder: 'What should change? For example a taller layout or a refresh button',
      cw_editPrompt: 'Change the widget “{title}” (id: {id}) on my Workboard dashboard: {desc}\n\nLoad the workboard-widget skill first, read the current definition with workboard_widget get, then change it.',
      cw_fix: 'Ask agent to fix', cw_fixPrompt: 'The widget “{title}” (id: {id}) on my Workboard dashboard fails:\n{error}\n\nLoad the workboard-widget skill, read the current definition with workboard_widget get, find the cause and fix it.',
      cw_source: 'Source', cw_title: 'Title', cw_delete: 'Delete widget', cw_fetch: 'Allowed addresses', cw_none: 'none',
      cw_export: 'Copy JSON', cw_exported: 'Copied', cw_withData: 'Include saved data',
      imp_card: 'Paste to import', imp_hint: 'Import a widget JSON someone shared', imp_placeholder: 'Paste an exported widget JSON',
      imp_check: 'Check', imp_go: 'Import to this board', imp_fetch: 'Will access', imp_offline: 'No network access', imp_data: 'Comes with saved data',
      outputs: 'Outputs', d_outputs: 'Documents the agent presented or created; open them or jump back to the session',
      o_presented: 'Presented', o_reveal: 'Reveal', o_session: 'Session', o_none: 'No outputs yet', o_count: '{n} files', o_missing: 'Deleted',
      f_created: 'Include documents the agent created', f_showMissing: 'Show deleted files',
      tasks: 'Scheduled tasks', d_tasks: 'Next run and recurrence of every scheduled task; run now, pause, resume or delete',
      sc_none: 'No scheduled tasks', sc_unavailable: 'This Harness does not expose scheduled tasks', sc_run: 'Run', sc_delete: 'Delete', sc_paused: 'Paused', sc_ended: 'Ended',
      sc_pending: 'The previous run is still going', sc_count: '{a} active · {p} paused', sc_clear: 'Clear {n} ended', sc_new: 'New',
      sc_newPrompt: 'Create a scheduled task for me: ', f_showEnded: 'Show ended tasks',
      once: 'Once', every_n: 'Every {n}', daily_at: 'Daily {t}', weekly_at: 'Every {d} {t}', monthly_at: 'Monthly on day {d} {t}',
      iv_min: '{n} min', iv_hour: '{n} h', iv_day: '{n} d', iv_week: '{n} wk',
      pinned: 'Pinned sessions', d_pinned: 'Keep the sessions you return to here, with their latest message',
      pin_add: 'Pin a session', pin_none: 'No pinned sessions', pin_search: 'Search titles or folders', pin_missing: 'Session no longer exists', unpin: 'Unpin', pin_count: '{n} pinned',
      files: 'Recent files', d_files: 'Newest files in Downloads, Desktop or other folders; open, reveal or hand to the agent',
      f_dirs: 'Folders, one per line', f_folders: 'Include folders', fi_none: 'No files', fi_error: '{n} folder(s) could not be read',
      filePrompt: 'Take a look at this file: {path}\nTell me what it is and its key points first, then ask me what to do with it.',
      clipboard: 'Clipboard', d_clipboard: 'Text you copied recently; hand it to the agent to translate, summarize or rewrite',
      cb_unsupported: 'Reading the clipboard is not supported on this system', cb_empty: 'Copy some text and it shows up here', cb_copy: 'Copy', cb_copied: 'Copied', cb_clear: 'Clear',
      f_cbPresets: 'Presets, one per line: name | instruction; the clipboard text is appended',
      defaultClipPresets: 'Translate | Translate the text below into English, or into Chinese if it is already English\nSummarize | Summarize the text below in a few bullet points\nExplain | Explain the text below, with an example if useful\nRewrite | Rewrite the text below to be clearer and more concise',
      network: 'Network', d_network: 'Throughput, local and public IP, system proxy and latency to sites you use',
      n_down: 'Down', n_up: 'Up', n_local: 'Local', n_public: 'Public', n_proxy: 'Proxy', n_noProxy: 'Off', n_pac: 'Auto (PAC)',
      n_unreachable: 'Unreachable', n_curl: 'Needs curl', n_latency: 'Latency',
      f_targets: 'Sites to test, one per line: name https://…', defaultTargets: 'Google https://www.google.com\nGitHub https://github.com\nCloudflare https://www.cloudflare.com',
      nowplaying: 'Now playing', d_nowplaying: 'Whatever macOS reports as now playing (Music, Spotify, QQ Music, browsers…), with play, pause and skip',
      np_idle: 'Nothing playing', np_open: 'Open {app}', np_mac: 'macOS only', np_denied: 'Allow DeepSeek Harness to control {app} in System Settings → Privacy & Security → Automation',
      np_auto: 'Automatic', np_music: 'Music', np_spotify: 'Spotify', f_npApp: 'Player', np_prev: 'Previous', np_next: 'Next', np_play: 'Play', np_pause: 'Pause',
      ambient: 'Ambient sound', d_ambient: 'Rain, waves, wind, fire and pink / brown noise; mix them, or play during Focus',
      am_rain: 'Rain', am_waves: 'Waves', am_wind: 'Wind', am_fire: 'Fire', am_pink: 'Pink', am_brown: 'Brown', am_volume: 'Volume', f_ambientFocus: 'Play during Focus sessions',
      videos: 'Videos', d_videos: 'Latest uploads from YouTube channels and Bilibili creators, with thumbnails',
      f_videoSources: 'Sources, one per line: YouTube channel link or @handle, Bilibili space link or UID, or an RSS feed with images; a name may follow',
      defaultVideos: '@mkbhd\n@veritasium', vd_error: '{n} source(s) failed to load', vd_views: '{n} views',
      ports: 'Ports', d_ports: 'Ports listening on this machine and the dev servers behind them; open, reveal the folder or stop the process',
      pt_none: 'No dev server is listening', pt_unsupported: 'Not supported on this system', pt_lsof: 'Needs lsof', pt_stop: 'Stop', pt_confirm: 'Confirm',
      pt_lan: 'Reachable on LAN', pt_count: '{n} port(s)', pt_hidden: '{n} app port(s) hidden', f_ptApps: 'Show apps and system processes',
      apps: 'Apps', d_apps: 'Open the apps you use most; running ones get a dot',
      ap_add: 'Add apps', ap_search: 'Search apps', ap_none: 'No matching apps', ap_count: '{n} selected', ap_missing: 'Not installed', ap_unsupported: 'macOS and Windows only',
      status: 'Service status', d_status: 'Status pages of DeepSeek, Claude, OpenAI, GitHub and more, flagged when something is down',
      st_empty: 'Add status pages in settings', st_none: 'Operational', st_maintenance: 'Maintenance', st_minor: 'Degraded', st_major: 'Partial outage', st_critical: 'Major outage',
      st_all: 'All operational', st_issues: '{n} service(s) with issues', st_error: 'Unavailable',
      f_statusSources: 'Status pages, one per line: name URL (Statuspage or the DeepSeek status page)',
      defaultStatus: 'DeepSeek https://status.deepseek.com\nClaude https://status.claude.com\nOpenAI https://status.openai.com\nGitHub https://www.githubstatus.com\nnpm https://status.npmjs.org',
      papers: 'AI papers', d_papers: 'Hugging Face daily papers and trending models; hand a paper to the agent to explain',
      pp_papers: 'Papers', pp_models: 'Models', pp_votes: '{n} upvotes', pp_likes: '{n} likes', pp_downloads: '{n} downloads', f_ppModels: 'Show trending models',
      pp_prompt: 'Read this paper: {title}\n{url}\nExplain the problem it tackles, the core method, the main results and the limitations, then suggest where it could be applied.',
      models: 'Models', d_models: 'Trending and newest models on OpenRouter, with prices and context length',
      md_top: 'Trending', md_new: 'Newest', md_free: 'Free', md_price: 'Input ${i} · output ${o} (USD per million tokens)', md_ctx: '{n} context', md_none: 'No matching models',
      f_mdVendors: 'Only these vendors, space-separated (e.g. deepseek anthropic openai); empty shows all',
      holiday: 'China holidays', d_holiday: 'Public holidays and make-up workdays in mainland China',
      hd_now: 'On break', hd_off: '{n} days off', hd_work: 'work on {d}', hd_todayOff: 'Day off today ({name})', hd_todayWork: 'Make-up workday today ({name})', hd_none: 'No holidays announced yet',
      activity: 'Activity', d_activity: 'Daily agent usage over the past year, shaded by tokens or requests',
      ac_tokens: 'tokens', ac_requests: 'requests', f_acMetric: 'Shade by', ac_total: '{n} {u}', ac_days: '{n} active days', ac_streak: '{n}-day streak', ac_best: 'best {n} days',
    };

    // 公共领域的经典短句，按日期轮换。
    const QUOTES = [
      {zh: '千里之行，始于足下。', en: 'A journey of a thousand miles begins with a single step.', by: {zh: '老子', en: 'Laozi'}},
      {zh: '学而不思则罔，思而不学则殆。', en: 'Learning without thought is labour lost; thought without learning is perilous.', by: {zh: '孔子', en: 'Confucius'}},
      {zh: '知人者智，自知者明。', en: 'He who knows others is wise; he who knows himself is enlightened.', by: {zh: '老子', en: 'Laozi'}},
      {zh: '工欲善其事，必先利其器。', en: 'A craftsman who wishes to do good work must first sharpen his tools.', by: {zh: '孔子', en: 'Confucius'}},
      {zh: '不积跬步，无以至千里。', en: 'Without small steps, there is no way to cover a thousand miles.', by: {zh: '荀子', en: 'Xunzi'}},
      {zh: '我们并非时间太少，而是浪费太多。', en: 'It is not that we have a short time to live, but that we waste a lot of it.', by: {zh: '塞涅卡', en: 'Seneca'}},
      {zh: '你能支配的只有自己的心灵，而非外界的事件。', en: 'You have power over your mind, not outside events.', by: {zh: '马可·奥勒留', en: 'Marcus Aurelius'}},
      {zh: '勿将今日之事推至明日。', en: 'Never leave that till tomorrow which you can do today.', by: {zh: '富兰克林', en: 'Benjamin Franklin'}},
      {zh: '简化，再简化。', en: 'Simplify, simplify.', by: {zh: '梭罗', en: 'Henry David Thoreau'}},
      {zh: '三人行，必有我师焉。', en: 'When three walk together, one can be my teacher.', by: {zh: '孔子', en: 'Confucius'}},
      {zh: '天下难事，必作于易；天下大事，必作于细。', en: 'Difficult things are done while they are easy; great things while they are small.', by: {zh: '老子', en: 'Laozi'}},
      {zh: '生也有涯，而知也无涯。', en: 'Life has a limit, but knowledge has none.', by: {zh: '庄子', en: 'Zhuangzi'}},
      {zh: '当下是我们唯一拥有的时间。', en: 'The present moment is all that we possess.', by: {zh: '马可·奥勒留', en: 'Marcus Aurelius'}},
      {zh: '好的开始是成功的一半。', en: 'Well begun is half done.', by: {zh: '亚里士多德', en: 'Aristotle'}},
      {zh: '温故而知新，可以为师矣。', en: 'Review the old to learn the new, and you may be a teacher.', by: {zh: '孔子', en: 'Confucius'}},
      {zh: '把这句话写在心上：每一天都是一年中最好的一天。', en: 'Write it on your heart that every day is the best day in the year.', by: {zh: '爱默生', en: 'Ralph Waldo Emerson'}},
      {zh: '知之者不如好之者，好之者不如乐之者。', en: 'To know it is not as good as to love it; to love it is not as good as to delight in it.', by: {zh: '孔子', en: 'Confucius'}},
      {zh: '博学之，审问之，慎思之，明辨之，笃行之。', en: 'Study broadly, inquire carefully, reflect deeply, discern clearly, practise earnestly.', by: {zh: '《中庸》', en: 'The Doctrine of the Mean'}},
      {zh: '合抱之木，生于毫末；九层之台，起于累土。', en: 'A tree as wide as an embrace grows from a tiny shoot; a nine-storey tower rises from a heap of earth.', by: {zh: '老子', en: 'Laozi'}},
      {zh: '锲而舍之，朽木不折；锲而不舍，金石可镂。', en: 'Give up carving and even rotten wood will not break; keep carving and even metal and stone can be engraved.', by: {zh: '荀子', en: 'Xunzi'}},
      {zh: '业精于勤，荒于嬉。', en: 'Mastery comes from diligence and is lost to idleness.', by: {zh: '韩愈', en: 'Han Yu'}},
      {zh: '纸上得来终觉浅，绝知此事要躬行。', en: 'What comes from books stays shallow; to truly know a thing, you must do it.', by: {zh: '陆游', en: 'Lu You'}},
      {zh: '路漫漫其修远兮，吾将上下而求索。', en: 'The road ahead is long and far; I will search high and low.', by: {zh: '屈原', en: 'Qu Yuan'}},
      {zh: '天行健，君子以自强不息。', en: 'As heaven moves with vigour, the noble person strives without ceasing.', by: {zh: '《周易》', en: 'I Ching'}},
      {zh: '阻碍行动的，反而推动行动；挡在路上的，就成了路。', en: 'The impediment to action advances action. What stands in the way becomes the way.', by: {zh: '马可·奥勒留', en: 'Marcus Aurelius'}},
      {zh: '别再争论好人应当怎样，去做一个好人。', en: 'Waste no more time arguing what a good man should be. Be one.', by: {zh: '马可·奥勒留', en: 'Marcus Aurelius'}},
      {zh: '做得好胜过说得好。', en: 'Well done is better than well said.', by: {zh: '富兰克林', en: 'Benjamin Franklin'}},
      {zh: '己所不欲，勿施于人。', en: 'Do not impose on others what you do not wish for yourself.', by: {zh: '孔子', en: 'Confucius'}},
      {zh: '君子欲讷于言而敏于行。', en: 'The noble person wishes to be slow in speech and quick in action.', by: {zh: '孔子', en: 'Confucius'}},
      {zh: '逝者如斯夫，不舍昼夜。', en: 'It flows on like this, never ceasing day or night.', by: {zh: '孔子', en: 'Confucius'}},
      {zh: '知者不惑，仁者不忧，勇者不惧。', en: 'The wise are free from doubt, the kind from worry, the brave from fear.', by: {zh: '孔子', en: 'Confucius'}},
      {zh: '欲速则不达，见小利则大事不成。', en: 'Haste defeats its purpose; chasing small gains leaves great things undone.', by: {zh: '孔子', en: 'Confucius'}},
      {zh: '学如不及，犹恐失之。', en: 'Learn as if you could never catch up, and still fear losing what you have.', by: {zh: '孔子', en: 'Confucius'}},
      {zh: '上善若水。', en: 'The highest good is like water.', by: {zh: '老子', en: 'Laozi'}},
      {zh: '胜人者有力，自胜者强。', en: 'Mastering others is strength; mastering yourself is true power.', by: {zh: '老子', en: 'Laozi'}},
      {zh: '知足者富。', en: 'He who knows he has enough is rich.', by: {zh: '老子', en: 'Laozi'}},
      {zh: '井蛙不可以语于海者，拘于虚也。', en: 'You cannot speak of the sea to a frog in a well; it is bound by its hole.', by: {zh: '庄子', en: 'Zhuangzi'}},
      {zh: '君子之交淡若水。', en: 'The friendship of the noble is plain as water.', by: {zh: '庄子', en: 'Zhuangzi'}},
      {zh: '生于忧患，死于安乐。', en: 'We thrive in adversity and perish in ease.', by: {zh: '孟子', en: 'Mencius'}},
      {zh: '尽信书，则不如无书。', en: 'Believing everything in books is worse than having no books.', by: {zh: '孟子', en: 'Mencius'}},
      {zh: '穷则独善其身，达则兼善天下。', en: 'In hardship, perfect yourself; in success, do good for the whole world.', by: {zh: '孟子', en: 'Mencius'}},
      {zh: '青，取之于蓝，而青于蓝。', en: 'Blue comes from the indigo plant, yet is bluer than the plant.', by: {zh: '荀子', en: 'Xunzi'}},
      {zh: '骐骥一跃，不能十步；驽马十驾，功在不舍。', en: 'A steed cannot leap ten paces at once; a slow horse goes far by never stopping.', by: {zh: '荀子', en: 'Xunzi'}},
      {zh: '志不强者智不达。', en: 'Without a strong will, wisdom cannot go far.', by: {zh: '墨子', en: 'Mozi'}},
      {zh: '千里之堤，以蝼蚁之穴溃。', en: 'A dyke a thousand miles long collapses through an ant hole.', by: {zh: '韩非子', en: 'Han Feizi'}},
      {zh: '行百里者半九十。', en: 'On a hundred-mile journey, ninety miles is only halfway.', by: {zh: '《战国策》', en: 'Strategies of the Warring States'}},
      {zh: '苟日新，日日新，又日新。', en: 'If you can renew yourself one day, renew yourself every day, and again every day.', by: {zh: '《大学》', en: 'The Great Learning'}},
      {zh: '知止而后有定。', en: 'Know where to stop, and you will be settled.', by: {zh: '《大学》', en: 'The Great Learning'}},
      {zh: '凡事豫则立，不豫则废。', en: 'With preparation, things succeed; without it, they fail.', by: {zh: '《礼记》', en: 'Book of Rites'}},
      {zh: '玉不琢，不成器；人不学，不知道。', en: 'Uncut jade becomes nothing; a person who does not learn knows nothing of the Way.', by: {zh: '《礼记》', en: 'Book of Rites'}},
      {zh: '不鸣则已，一鸣惊人。', en: 'It may stay silent, but once it sings, it astonishes all.', by: {zh: '《史记》', en: 'Records of the Grand Historian'}},
      {zh: '少壮不努力，老大徒伤悲。', en: 'Idle in youth, grieving in old age.', by: {zh: '汉乐府', en: 'Han Yuefu'}},
      {zh: '非淡泊无以明志，非宁静无以致远。', en: 'Without simplicity, no clear purpose; without calm, no reaching far.', by: {zh: '诸葛亮', en: 'Zhuge Liang'}},
      {zh: '盛年不重来，一日难再晨。', en: 'The prime of life will not return; a day has but one morning.', by: {zh: '陶渊明', en: 'Tao Yuanming'}},
      {zh: '欲穷千里目，更上一层楼。', en: 'To see a thousand miles further, climb one more storey.', by: {zh: '王之涣', en: 'Wang Zhihuan'}},
      {zh: '长风破浪会有时，直挂云帆济沧海。', en: 'A day will come to ride the wind and waves, and sail across the sea.', by: {zh: '李白', en: 'Li Bai'}},
      {zh: '天生我材必有用。', en: 'Heaven made my talents; they are bound to be of use.', by: {zh: '李白', en: 'Li Bai'}},
      {zh: '读书破万卷，下笔如有神。', en: 'Read ten thousand books, and your pen will write as if inspired.', by: {zh: '杜甫', en: 'Du Fu'}},
      {zh: '会当凌绝顶，一览众山小。', en: 'I will reach the summit and see how small the other mountains are.', by: {zh: '杜甫', en: 'Du Fu'}},
      {zh: '行成于思，毁于随。', en: 'Deeds are made by thought and ruined by carelessness.', by: {zh: '韩愈', en: 'Han Yu'}},
      {zh: '博观而约取，厚积而薄发。', en: 'Read widely and take sparingly; store up much and release little.', by: {zh: '苏轼', en: 'Su Shi'}},
      {zh: '竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。', en: 'Bamboo staff and straw sandals beat a horse. Who fears? A straw cape against a lifetime of rain.', by: {zh: '苏轼', en: 'Su Shi'}},
      {zh: '古之立大事者，不惟有超世之才，亦必有坚忍不拔之志。', en: 'Those who achieved great things had not only rare talent but also unshakable resolve.', by: {zh: '苏轼', en: 'Su Shi'}},
      {zh: '不畏浮云遮望眼，自缘身在最高层。', en: 'Unafraid that clouds may block the view, for I stand on the highest floor.', by: {zh: '王安石', en: 'Wang Anshi'}},
      {zh: '问渠那得清如许？为有源头活水来。', en: 'Why is the pond so clear? Because fresh water flows in from its source.', by: {zh: '朱熹', en: 'Zhu Xi'}},
      {zh: '山重水复疑无路，柳暗花明又一村。', en: 'Where hills and streams seem to end the road, another village appears among willows and flowers.', by: {zh: '陆游', en: 'Lu You'}},
      {zh: '莫等闲，白了少年头，空悲切。', en: 'Do not idle away your youth, only to grieve in vain when your hair turns white.', by: {zh: '岳飞', en: 'Yue Fei'}},
      {zh: '知是行之始，行是知之成。', en: 'Knowing is the beginning of doing; doing is the completion of knowing.', by: {zh: '王阳明', en: 'Wang Yangming'}},
      {zh: '破山中贼易，破心中贼难。', en: 'Defeating bandits in the mountains is easy; defeating those in the heart is hard.', by: {zh: '王阳明', en: 'Wang Yangming'}},
      {zh: '天下事有难易乎？为之，则难者亦易矣。', en: 'Are things in the world hard or easy? Do them, and the hard become easy.', by: {zh: '彭端淑', en: 'Peng Duanshu'}},
      {zh: '世事洞明皆学问，人情练达即文章。', en: 'Understanding the world is learning; mastering human affairs is an art.', by: {zh: '《红楼梦》', en: 'Dream of the Red Chamber'}},
      {zh: '其实地上本没有路，走的人多了，也便成了路。', en: 'There was no road at first; when many people walk the same way, a road appears.', by: {zh: '鲁迅', en: 'Lu Xun'}},
      {zh: '时间就像海绵里的水，只要愿挤，总还是有的。', en: 'Time is like water in a sponge; squeeze, and there is always some.', by: {zh: '鲁迅', en: 'Lu Xun'}},
      {zh: '未经审视的人生不值得过。', en: 'The unexamined life is not worth living.', by: {zh: '苏格拉底', en: 'Socrates'}},
      {zh: '人不能两次踏进同一条河流。', en: 'No man ever steps in the same river twice.', by: {zh: '赫拉克利特', en: 'Heraclitus'}},
      {zh: '教育的根是苦的，但果实是甜的。', en: 'The roots of education are bitter, but the fruit is sweet.', by: {zh: '亚里士多德', en: 'Aristotle'}},
      {zh: '我们拖延之时，生命匆匆而过。', en: 'While we are postponing, life speeds by.', by: {zh: '塞涅卡', en: 'Seneca'}},
      {zh: '先告诉自己想成为什么样的人，然后去做必须做的事。', en: 'First say to yourself what you would be; and then do what you have to do.', by: {zh: '爱比克泰德', en: 'Epictetus'}},
      {zh: '令人不安的不是事物本身，而是人们对它的看法。', en: 'Men are disturbed not by things, but by the views which they take of them.', by: {zh: '爱比克泰德', en: 'Epictetus'}},
      {zh: '生活的幸福取决于你思想的品质。', en: 'The happiness of your life depends upon the quality of your thoughts.', by: {zh: '马可·奥勒留', en: 'Marcus Aurelius'}},
      {zh: '这封信写得长，是因为我没时间把它写短。', en: 'I have made this longer than usual because I have not had time to make it shorter.', by: {zh: '帕斯卡', en: 'Blaise Pascal'}},
      {zh: '如果说我看得更远，那是因为站在巨人的肩膀上。', en: 'If I have seen further it is by standing on the shoulders of giants.', by: {zh: '牛顿', en: 'Isaac Newton'}},
      {zh: '失去的时间永远找不回来。', en: 'Lost time is never found again.', by: {zh: '富兰克林', en: 'Benjamin Franklin'}},
      {zh: '知道还不够，必须运用；愿意还不够，必须行动。', en: 'Knowing is not enough; we must apply. Willing is not enough; we must do.', by: {zh: '歌德', en: 'Goethe'}},
      {zh: '我们的生活被琐碎消磨殆尽。', en: 'Our life is frittered away by detail.', by: {zh: '梭罗', en: 'Henry David Thoreau'}},
      {zh: '没有热情，成就不了任何伟业。', en: 'Nothing great was ever achieved without enthusiasm.', by: {zh: '爱默生', en: 'Ralph Waldo Emerson'}},
      {zh: '知道为什么而活的人，几乎能忍受任何境遇。', en: 'He who has a why to live can bear almost any how.', by: {zh: '尼采', en: 'Friedrich Nietzsche'}},
      {zh: '生活中没有可怕的东西，只有需要理解的东西。', en: 'Nothing in life is to be feared, it is only to be understood.', by: {zh: '居里夫人', en: 'Marie Curie'}},
      {zh: '想象力比知识更重要。', en: 'Imagination is more important than knowledge.', by: {zh: '爱因斯坦', en: 'Albert Einstein'}},
      {zh: '人生就像骑自行车，想保持平衡就得不断前进。', en: 'Life is like riding a bicycle. To keep your balance you must keep moving.', by: {zh: '爱因斯坦', en: 'Albert Einstein'}},
      {zh: '完美不是无可增添，而是无可删减。', en: 'Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.', by: {zh: '圣埃克苏佩里', en: 'Antoine de Saint-Exupéry'}},
      {zh: '第一原则是不要欺骗自己，而你恰恰最容易被自己骗。', en: 'The first principle is that you must not fool yourself, and you are the easiest person to fool.', by: {zh: '费曼', en: 'Richard Feynman'}},
      {zh: '计划本身无用，做计划的过程才是一切。', en: 'Plans are worthless, but planning is everything.', by: {zh: '艾森豪威尔', en: 'Dwight D. Eisenhower'}},
      {zh: '最无用的事，莫过于高效地做根本不该做的事。', en: 'There is nothing so useless as doing efficiently that which should not be done at all.', by: {zh: '德鲁克', en: 'Peter Drucker'}},
      {zh: '预测未来的最好方式是创造它。', en: 'The best way to predict the future is to invent it.', by: {zh: '艾伦·凯', en: 'Alan Kay'}},
      {zh: '过早优化是万恶之源。', en: 'Premature optimization is the root of all evil.', by: {zh: '高德纳', en: 'Donald Knuth'}},
      {zh: '先让它能用，再让它正确，最后让它更快。', en: 'Make it work, make it right, make it fast.', by: {zh: '肯特·贝克', en: 'Kent Beck'}},
      {zh: '真正的艺术家会交付作品。', en: 'Real artists ship.', by: {zh: '乔布斯', en: 'Steve Jobs'}},
      {zh: '求知若饥，虚心若愚。', en: 'Stay hungry, stay foolish.', by: {zh: '乔布斯', en: 'Steve Jobs'}},
    ];

    const onBrand = prop => `${prop}:#fff;${prop}:oklch(from var(--dsw-alias-brand-primary) clamp(0,(.65 - l)*1000,1) 0 0)`;

    // Chromium 只认 ui-serif 才能命中 New York；宋体放在西文衬线之后，避免英文落入宋体拉丁字形。
    const SERIF = 'ui-serif,"New York",Georgia,"Songti SC","STSong",serif';

    const CSS = `
.wb-page{height:100%;overflow:auto;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px}
.wb-inner{max-width:1120px;margin:0 auto;padding:0 24px 32px;box-sizing:border-box}
.wb-error{color:var(--dsw-alias-state-error-primary);font-size:12px;margin-bottom:8px}
.wb-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:80px;grid-auto-flow:row dense;gap:16px}
.wb-card{grid-column:span var(--c);grid-row:span var(--r);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:16px;display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden;box-sizing:border-box}
.wb-card[data-banner]{background:none;border-color:transparent;padding:0 4px;overflow:visible}
.wb-card>header{display:flex;align-items:center;gap:8px;margin:-2px 0 10px;min-height:24px}
.wb-card>header h3{margin:0;font-size:14px;font-weight:600;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wb-body{flex:1;min-height:0;display:flex;flex-direction:column}
.wb-empty{display:grid;place-items:center;min-height:300px;color:var(--dsw-alias-label-secondary);border:1.5px dashed var(--dsw-alias-border-l2);border-radius:12px}
.wb-muted{color:var(--dsw-alias-label-secondary)}
.wb-num{font-variant-numeric:tabular-nums}
.wb-btn{appearance:none;border:0;background:none;color:inherit;font:inherit;padding:0;cursor:pointer}

.wb-today{display:flex;align-items:center;gap:28px;height:100%;min-width:0}
.wb-today>*{flex:none}
.wb-today .wb-tclock{display:grid;grid-template-columns:auto auto;grid-template-areas:"time greet" "time date";column-gap:14px;align-items:center}
.wb-today .wb-time{grid-area:time;font-size:44px;font-weight:600;letter-spacing:-1px;line-height:1}
.wb-today .wb-greet{grid-area:greet;align-self:end;font-size:15px;font-weight:600}
.wb-today .wb-date{grid-area:date;align-self:start;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.wb-colon{display:inline-block;transform:translateY(-.075em)}
.wb-sep{width:1px;height:28px;background:var(--dsw-alias-border-l1)}
.wb-today .wb-tquote{flex:0 1 auto;margin-left:auto;margin-right:-10px;min-width:0;position:relative;text-align:left;padding:6px 10px 6px 24px;border-radius:10px;transition:background .15s}
.wb-tquote:hover{background:var(--dsw-alias-bg-layer-2)}
.wb-tquote::before{content:'\\201C';position:absolute;left:6px;top:4px;font:28px/1 ${SERIF};color:var(--dsw-alias-label-secondary);opacity:.35}
.wb-tquote .wb-qtext{margin:0;font-size:14.5px;line-height:1.5;font-family:${SERIF};display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.wb-tquote[data-len=short] .wb-qtext{font-size:15.5px}
.wb-tquote[data-len=long] .wb-qtext{font-size:13.5px;line-height:1.45;-webkit-line-clamp:3}
.wb-tquote cite{display:inline-block;margin-left:8px;white-space:nowrap;font-style:normal;font-size:12px;color:var(--dsw-alias-label-secondary)}

.wb-clock{display:flex;flex-direction:column;justify-content:center;height:100%}
.wb-clock .wb-time{font-size:44px;font-weight:600;letter-spacing:-1px;line-height:1.1;margin:4px 0 6px}
.wb-clock[data-size=s] .wb-time{font-size:32px}
.wb-yearbar{height:4px;border-radius:2px;background:var(--dsw-alias-bg-layer-2);margin-top:12px;overflow:hidden}
.wb-yearbar i{display:block;height:100%;background:var(--dsw-alias-label-secondary);opacity:.5}

.wb-list{list-style:none;margin:0;padding:0;overflow:auto;flex:1}
.wb-list li{display:flex;align-items:center;gap:10px;padding:7px 4px;border-radius:8px;min-width:0}
.wb-list li:hover{background:var(--dsw-alias-bg-layer-2)}
.wb-ck{width:18px;height:18px;border-radius:5px;border:1.5px solid var(--dsw-alias-border-l2);flex:none;display:grid;place-items:center;box-sizing:border-box}
.wb-ck:hover{border-color:var(--dsw-alias-brand-primary)}
.wb-list li[data-done] .wb-ck{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);${onBrand('color')}}
.wb-list li[data-done] .wb-tx{color:var(--dsw-alias-label-secondary);text-decoration:line-through}
.wb-tx{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wb-tag{font-size:11px;padding:0 6px;border-radius:5px;flex:none;white-space:nowrap;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-primary)}
.wb-del{display:none;flex:none;width:24px;height:24px;border-radius:6px;color:var(--dsw-alias-label-secondary);place-items:center}
.wb-list li:hover .wb-del{display:grid}
.wb-del:hover{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-state-error-primary)}
.wb-donetoggle{font-size:12px;color:var(--dsw-alias-label-secondary);padding:6px 4px;display:flex;align-items:center;gap:4px}
.wb-donetoggle svg{transition:transform .15s}
.wb-donetoggle[aria-expanded=true] svg{transform:rotate(90deg)}
.wb-add{display:flex;align-items:center;gap:10px;padding:8px 4px 0;border-top:1px solid var(--dsw-alias-border-l1);margin-top:6px;color:var(--dsw-alias-label-secondary)}
.wb-add input{flex:1;border:0;background:none;outline:none;padding:6px 0;color:var(--dsw-alias-label-primary);font:inherit}
.wb-blank{color:var(--dsw-alias-label-secondary);padding:7px 4px}

.wb-note{flex:1;resize:none;border:0;outline:none;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:8px;padding:10px 12px;line-height:1.65;font:inherit;font-size:13px;min-height:0}
.wb-notefoot{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:8px;min-height:18px}
.wb-notefoot button{color:var(--dsw-alias-brand-primary)}
.wb-wsel{position:relative;display:inline-flex;align-items:center;justify-content:center;flex:none;width:20px;height:20px;border-radius:6px;color:var(--dsw-alias-label-secondary);opacity:.55}
.wb-wsel:hover,.wb-wsel:focus-within{opacity:1;background:var(--dsw-alias-bg-layer-2)}
.wb-wsel[data-set]{color:var(--dsw-alias-brand-primary);opacity:.9}
.wb-wsel select{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:12px}
.wb-footact{display:flex;align-items:center;gap:6px;flex:none}
.wb-md{font-size:13px;line-height:1.6;color:var(--dsw-alias-label-primary);padding:0 2px}
.wb-md>:first-child{margin-top:0}
.wb-md h4{margin:10px 0 2px;font-size:13px;font-weight:600}
.wb-md h5{margin:8px 0 2px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.wb-md p{margin:2px 0}
.wb-md ul,.wb-md ol{margin:2px 0;padding-left:18px}
.wb-md li{margin:1px 0}
.wb-md code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;background:var(--dsw-alias-bg-layer-2);border-radius:4px;padding:0 4px}
.wb-md a{color:var(--dsw-alias-brand-primary);text-decoration:none}
.wb-md a:hover{text-decoration:underline}
.wb-notefoot .wb-auto{display:inline-flex;align-items:center;gap:4px;color:var(--dsw-alias-label-secondary)}
.wb-notefoot .wb-auto[aria-pressed=true]{color:var(--dsw-alias-brand-primary)}
.wb-auto svg{width:12px;height:12px}
.wb-pbox{position:relative;flex:1;min-height:0;display:flex}
.wb-pbox .wb-wsel{position:absolute;right:6px;bottom:6px}
.wb-pbox[data-ws] textarea{padding-right:30px}

.wb-head{display:flex;align-items:center;gap:8px;padding:20px 0 16px;flex-wrap:wrap;min-height:30px}
.wb-head[data-editing]{position:sticky;top:0;z-index:5;background:var(--dsw-alias-bg-base)}
.wb-head:not([data-editing]) .wb-newboard{opacity:0;transition:opacity .15s}
.wb-head:hover .wb-newboard,.wb-head .wb-newboard:focus-visible{opacity:1}
.wb-tabs{display:flex;align-items:center;gap:2px;flex-wrap:wrap;min-width:0}
.wb-tab{position:relative;height:30px;padding:0 12px;border-radius:8px;color:var(--dsw-alias-label-secondary);font-weight:500;white-space:nowrap}
.wb-tab:hover{color:var(--dsw-alias-label-primary)}
.wb-tab[aria-selected=true]{color:var(--dsw-alias-label-primary)}
.wb-tab[aria-selected=true]::after{content:'';position:absolute;left:12px;right:12px;bottom:2px;height:2px;border-radius:1px;background:var(--dsw-alias-brand-primary)}
.wb-tabinput{height:30px;width:120px;box-sizing:border-box;padding:0 10px;border-radius:8px;border:1px solid var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-weight:500;outline:none}
.wb-iconbtn{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;color:var(--dsw-alias-label-secondary)}
.wb-iconbtn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.wb-spacer{flex:1}
.wb-action{appearance:none;font:inherit;height:30px;padding:0 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);display:inline-flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap}
.wb-action:hover{border-color:var(--dsw-alias-border-l2)}
.wb-action:disabled{opacity:.5;cursor:default}
.wb-action[data-primary]{background:var(--dsw-alias-brand-primary);border-color:transparent;${onBrand('color')}}
.wb-action[data-danger]{color:var(--dsw-alias-state-error-primary)}
.wb-card{position:relative}
.wb-grid[data-editing] .wb-card{border-style:dashed;border-color:var(--dsw-alias-border-l2);cursor:grab}
.wb-grid[data-editing] .wb-card[data-banner]{padding:0 12px}
.wb-grid[data-editing] .wb-body{pointer-events:none;opacity:.5}
.wb-card[data-dragging]{opacity:.35}
.wb-card[data-drop=before]{box-shadow:-4px 0 0 0 var(--dsw-alias-brand-primary)}
.wb-card[data-drop=after]{box-shadow:4px 0 0 0 var(--dsw-alias-brand-primary)}
.wb-tools{position:absolute;top:8px;right:8px;z-index:2;display:flex;align-items:center;gap:2px;padding:2px;border-radius:8px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);cursor:default}
.wb-tools select{height:24px;border:0;background:none;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;outline:none;cursor:pointer}
.wb-tools button{width:24px;height:24px;border-radius:6px;display:grid;place-items:center;color:var(--dsw-alias-label-secondary)}
.wb-tools button:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.wb-addtile{grid-column:span 1;grid-row:span 2;border:1.5px dashed var(--dsw-alias-border-l2);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--dsw-alias-label-secondary)}
.wb-addtile:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.wb-cta{color:var(--dsw-alias-brand-primary)}

.wb-overlay{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.35);display:grid;place-items:center;padding:24px}
.wb-modal{width:min(520px,100%);max-height:80vh;overflow:auto;box-sizing:border-box;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);border-radius:14px;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.25);display:flex;flex-direction:column;gap:14px;font-size:13px}
.wb-modal h2{margin:0;font-size:16px;font-weight:600}
.wb-field{display:flex;flex-direction:column;gap:6px}
.wb-field>span{font-size:12px;color:var(--dsw-alias-label-secondary)}
.wb-check{display:flex;align-items:center;gap:8px}
.wb-input{box-sizing:border-box;width:100%;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;color:var(--dsw-alias-label-primary);font:inherit;padding:7px 10px;outline:none}
.wb-input:focus{border-color:var(--dsw-alias-brand-primary)}
textarea.wb-input{resize:vertical;min-height:84px;line-height:1.5}
.wb-loc{display:flex;align-items:center;gap:8px}
.wb-loc b{font-weight:600}
.wb-results{display:flex;flex-direction:column}
.wb-results button{text-align:left;padding:6px 8px;border-radius:6px}
.wb-results button:hover{background:var(--dsw-alias-bg-layer-2)}
.wb-foot{display:flex;justify-content:flex-end;align-items:center;gap:8px}
.wb-settings{display:flex;flex-direction:column;gap:20px;color:var(--dsw-alias-label-primary);font-size:13px}
.wb-settings h2{margin:0;font-size:16px;line-height:24px;font-weight:500}
.wb-cfgmain{max-width:640px;margin:0 auto;padding:48px clamp(16px,4vw,48px) 32px}
.wb-settings>section{display:flex;flex-direction:column;gap:12px}
.wb-settings h3{margin:0;font-size:13px;font-weight:600}
.wb-settings .wb-foot{justify-content:flex-start;flex-direction:row-reverse}
.wb-modal[data-wide]{width:min(760px,100%);height:min(640px,80vh);overflow:hidden}
.wb-gtop{display:flex;flex-direction:column;gap:10px;flex:none}
.wb-gbody{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:16px;margin:0 -4px;padding:0 4px}
.wb-gsec h3{margin:0 0 8px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.wb-ggrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
.wb-gcard{display:flex;flex-direction:column;gap:4px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;text-align:left;min-width:0}
.wb-gcard:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-2)}
.wb-gcard:disabled{opacity:.5;cursor:default}
.wb-gname{display:flex;align-items:center;gap:8px}
.wb-gname b{flex:1;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wb-gname svg{color:var(--dsw-alias-label-secondary);flex:none}
.wb-gcard:hover:not(:disabled) .wb-gname svg{color:var(--dsw-alias-brand-primary)}
.wb-gcard small{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

.wb-wx{display:flex;flex-direction:column;height:100%;min-height:0;gap:8px;overflow:hidden;color:var(--dsw-alias-label-primary)}
.wb-wx[data-size=s]{gap:6px}
.wb-wxnow{display:flex;align-items:center;gap:12px;min-width:0}
.wb-wxnow .wb-aqi{margin-left:auto;align-self:flex-start;flex:none}
.wb-wxnow svg{color:var(--dsw-alias-label-secondary);flex:none}
.wb-wxt{font-size:36px;font-weight:600;letter-spacing:-1px;line-height:1}
.wb-wxmeta{display:flex;flex-direction:column;gap:2px;min-width:0;font-size:12px;color:var(--dsw-alias-label-secondary)}
.wb-wxmeta b{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wb-wxhours{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px;margin-top:auto;text-align:center;font-size:12px;color:var(--dsw-alias-label-secondary)}
.wb-wxhours>div{display:flex;flex-direction:column;align-items:center;gap:2px;line-height:1.25}
.wb-wxhours b{font-weight:500;color:var(--dsw-alias-label-primary)}
.wb-wxmini{display:flex;align-items:center;gap:12px;line-height:1.5}
.wb-wxmini>span{display:flex;align-items:center;gap:6px}
.wb-wxmini svg{color:var(--dsw-alias-label-secondary)}
.wb-wxmini .wb-wxt{font-size:24px;letter-spacing:-.5px}
.wb-wxmini .wb-aqi{line-height:18px;display:inline-block}
.wb-wxmini .wb-aqi[data-level=ok]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}
.wb-wxskel{display:flex;align-items:center;gap:12px;opacity:.6}
.wb-wxskel i{display:block;border-radius:6px;background:var(--dsw-alias-bg-layer-2)}
.wb-tcity{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border:1px dashed var(--dsw-alias-border-l2);border-radius:14px;color:var(--dsw-alias-label-secondary)}
.wb-tcity:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.wb-aqi{font-size:11px;padding:0 6px;border-radius:5px;white-space:nowrap;background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 14%,transparent);color:var(--dsw-alias-state-success-primary)}
.wb-aqi[data-level=warn]{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-primary)}
.wb-aqi[data-level=bad]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary)}

.wb-cal{display:flex;flex-direction:column;height:100%;min-height:0;gap:8px}
.wb-calnav{display:flex;align-items:center;gap:2px}
.wb-calnav .wb-btn:first-child{flex:1;text-align:left;font-weight:600}
.wb-calnav .wb-iconbtn{width:24px;height:24px}
.wb-month{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px;text-align:center;font-size:12px}
.wb-wd{color:var(--dsw-alias-label-secondary);font-size:11px;padding-bottom:2px}
.wb-day{height:26px;border-radius:6px;display:grid;place-items:center;position:relative;color:var(--dsw-alias-label-primary)}
.wb-day:hover{background:var(--dsw-alias-bg-layer-2)}
.wb-day[data-out]{opacity:.4}
.wb-day[data-selected]{background:var(--dsw-alias-bg-layer-2)}
.wb-day[data-today]{background:var(--dsw-alias-brand-primary);${onBrand('color')};font-weight:600}
.wb-day[data-has]::after{content:'';position:absolute;bottom:2px;width:4px;height:4px;border-radius:2px;background:var(--dsw-alias-brand-primary)}
.wb-day[data-today][data-has]::after{${onBrand('background')}}
.wb-events{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:2px}
.wb-cal[data-big] .wb-events{border-top:1px solid var(--dsw-alias-border-l1);padding-top:8px}
.wb-evhead{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);padding:4px 2px 2px}
.wb-ev{display:flex;align-items:center;gap:8px;padding:4px 2px;min-width:0}
.wb-ev i{width:3px;align-self:stretch;border-radius:2px;background:var(--dsw-alias-border-l2);flex:none}
.wb-ev[data-state=now] i{background:var(--dsw-alias-brand-primary)}
.wb-ev[data-state=past]{color:var(--dsw-alias-label-secondary)}
.wb-evtime{font-size:12px;color:var(--dsw-alias-label-secondary);flex:none;min-width:80px}
.wb-evtitle{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wb-calerr{font-size:12px;color:var(--dsw-alias-state-warn-primary)}
.wb-calfoot{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;margin-top:auto;min-width:0}
.wb-calfoot .wb-btn[data-quiet]{color:var(--dsw-alias-label-secondary)}
.wb-caltoday{display:flex;flex-direction:column;gap:2px;min-width:0}
.wb-caltoday b{font-size:20px;font-weight:600;line-height:1.2}
.wb-caltoday span{font-size:12px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.wb-rows{display:flex;flex-direction:column;gap:2px;overflow:auto;flex:1;min-height:0}
.wb-row{display:flex;align-items:center;gap:10px;padding:4px 2px;min-width:0}
.wb-row>div{flex:1;min-width:0;display:flex;flex-direction:column}
.wb-row b{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wb-row small,.wb-hero small,.wb-cols small{font-size:12px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wb-row .wb-big{font-size:20px;font-weight:600;flex:none}
.wb-row .wb-big small{font-size:12px;font-weight:400;margin-left:2px}
.wb-row[data-dim]{color:var(--dsw-alias-label-secondary)}
.wb-row[data-read] b{font-weight:400;color:var(--dsw-alias-label-secondary)}
.wb-hero{display:flex;flex-direction:column;justify-content:center;height:100%;gap:2px;min-width:0}
.wb-hero .wb-big{font-size:36px;font-weight:600;letter-spacing:-1px;line-height:1.1}
.wb-hero .wb-big small{font-size:14px;font-weight:400;letter-spacing:0;margin-left:4px}
.wb-cols{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:12px;height:100%;align-items:center}
.wb-cols>div{display:flex;flex-direction:column;min-width:0;gap:2px}
.wb-cols .wb-big{font-size:28px;font-weight:600;letter-spacing:-.5px;line-height:1.1}

.wb-qcard{display:flex;flex-direction:column;justify-content:center;gap:8px;width:100%;height:100%;text-align:left;min-height:0}
.wb-qcard .wb-qtext{margin:0;font-size:16px;line-height:1.55;font-family:${SERIF};display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.wb-qcard[data-size=s] .wb-qtext{font-size:14px;-webkit-line-clamp:4}
.wb-qcard[data-size=w] .wb-qtext{font-size:18px;-webkit-line-clamp:2}
.wb-qcard cite{font-style:normal;font-size:12px;color:var(--dsw-alias-label-secondary)}

.wb-focus{display:flex;flex-direction:column;justify-content:center;gap:6px;height:100%;min-width:0}
.wb-focus .wb-big{font-size:40px;font-weight:600;letter-spacing:-1px;line-height:1.05}
.wb-focus[data-size=s] .wb-big{font-size:32px}
.wb-focus[data-running] .wb-big{color:var(--dsw-alias-brand-primary)}
.wb-fhead{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.wb-fhead b{font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary)}
.wb-fbtns{display:flex;align-items:center;gap:6px}
.wb-fbtns .wb-action{height:28px;padding:0 10px}

.wb-links{display:grid;grid-template-columns:repeat(auto-fill,minmax(68px,1fr));gap:4px;overflow:auto;align-content:start;flex:1;min-height:0}
.wb-link{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 4px;border-radius:8px;color:inherit;text-decoration:none;min-width:0}
.wb-link:hover{background:var(--dsw-alias-bg-layer-2)}
.wb-link i{width:32px;height:32px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);box-sizing:border-box;display:grid;place-items:center;font-style:normal;font-weight:600;color:var(--dsw-alias-label-secondary)}
.wb-link span{font-size:12px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wb-apps{grid-template-columns:repeat(auto-fill,minmax(72px,1fr))}
.wb-apps .wb-link{padding:8px 2px 6px;justify-content:flex-start}
.wb-apps .wb-link span{font-size:11px;line-height:14px;min-height:28px;white-space:normal;text-align:center;overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.wb-apps .wb-link i{position:relative;width:36px;height:36px;flex:none}
.wb-apps .wb-link i[data-img]{background:none;border:0}
.wb-apps .wb-link img{width:100%;height:100%;display:block}
.wb-apps .wb-link[data-running] i::after{content:'';position:absolute;left:50%;bottom:-5px;width:4px;height:4px;margin-left:-2px;border-radius:50%;background:var(--dsw-alias-label-secondary)}
.wb-apps .wb-link[data-busy] i{opacity:.5}
.wb-apps .wb-link:disabled{opacity:.4;cursor:default}
.wb-apps .wb-link[data-add]{color:var(--dsw-alias-label-secondary)}
.wb-apps .wb-link[data-add] i{background:none;border-style:dashed}

.wb-prog{display:grid;grid-template-columns:max-content minmax(0,1fr) max-content;align-content:center;align-items:center;gap:10px;height:100%;font-size:12px;color:var(--dsw-alias-label-secondary)}
.wb-prog[data-size=s]{gap:6px 8px}
.wb-prow{display:contents}
.wb-prow span:last-child{text-align:right;color:var(--dsw-alias-label-primary)}
.wb-pbar{height:6px;border-radius:3px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.wb-pbar i{display:block;height:100%;background:var(--dsw-alias-label-secondary);opacity:.5}
.wb-sys{display:flex;flex-direction:column;gap:10px;height:100%;min-height:0}
.wb-sys[data-size=w]{flex-direction:row;align-items:stretch;gap:16px}
.wb-sys .wb-prog{height:auto;flex:1;min-width:0}
.wb-sys[data-detail] .wb-prog{grid-template-columns:max-content minmax(0,1fr) max-content max-content}
.wb-prow small{font-size:12px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.wb-prow[data-hot] i{background:var(--dsw-alias-state-warn-primary);opacity:1}
.wb-prow[data-hot] span:last-of-type{color:var(--dsw-alias-state-warn-primary)}
.wb-photo{flex:1;margin:-16px;min-height:0;position:relative;cursor:pointer;background:var(--dsw-alias-bg-layer-2)}
.wb-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.wb-photo-msg{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:8px;height:100%;color:var(--dsw-alias-label-secondary)}
.wb-quotes{display:grid;grid-template-columns:minmax(0,1fr) max-content max-content;align-content:start;gap:8px 12px;min-height:0;overflow:auto}
.wb-quotes[data-size=w]{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);align-content:center;height:100%}
.wb-quote{display:contents}
.wb-quotes[data-size=w] .wb-quote{display:flex;flex-direction:column;gap:2px;min-width:0}
.wb-quote>div{min-width:0;display:flex;flex-direction:column}
.wb-quote b{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wb-quote small{font-size:12px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wb-quote>span{text-align:right;align-self:center;white-space:nowrap}
.wb-quotes[data-size=w] .wb-quote>span{text-align:left;align-self:auto}
.wb-quote>span:first-of-type{font-size:15px;font-weight:600}
.wb-quote[data-dir=up]>span:last-of-type{color:var(--wb-up)}
.wb-quote[data-dir=down]>span:last-of-type{color:var(--wb-down)}
.wb-quotes{--wb-up:var(--dsw-alias-state-success-primary);--wb-down:var(--dsw-alias-state-error-primary)}
.wb-quotes[data-red-up]{--wb-up:var(--dsw-alias-state-error-primary);--wb-down:var(--dsw-alias-state-success-primary)}
.wb-trend{display:flex;flex-direction:column;gap:6px;flex:1;min-height:0}
.wb-trend .wb-seg{overflow-x:auto;scrollbar-width:none}
.wb-trend .wb-seg button{flex:none;white-space:nowrap}
.wb-trend .wb-row{gap:8px;padding:3px 4px}
.wb-trend .wb-row>span{flex:none;font-size:12px;color:var(--dsw-alias-label-secondary)}
.wb-trend .wb-row>.wb-rank{width:16px;text-align:right}
.wb-trend .wb-row>.wb-tag{font-size:11px;line-height:16px;padding:0 4px;border-radius:4px;background:var(--dsw-alias-bg-layer-2)}
.wb-trend .wb-rank[data-top]{color:var(--dsw-alias-brand-primary);font-weight:600}
.wb-spark{flex:1;min-height:32px;min-width:0;position:relative}
.wb-spark svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.wb-spark polyline{fill:none;stroke:var(--dsw-alias-brand-primary);stroke-width:1.5;vector-effect:non-scaling-stroke;stroke-linejoin:round}
.wb-spark polygon{fill:var(--dsw-alias-brand-primary);opacity:.08}

.wb-rowbtn{width:100%;text-align:left;border-radius:8px;color:inherit;text-decoration:none;box-sizing:border-box}
.wb-rowbtn:hover{background:var(--dsw-alias-bg-layer-2)}
.wb-dot{width:8px;height:8px;border-radius:4px;flex:none;background:var(--dsw-alias-border-l2)}
.wb-dot[data-state=running]{background:var(--dsw-alias-brand-primary)}
.wb-dot[data-state=waiting]{background:var(--dsw-alias-state-warn-primary)}
.wb-row[data-state=waiting] small{color:var(--dsw-alias-state-warn-primary)}
.wb-sect{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);padding:8px 2px 2px}
.wb-row time{font-size:12px;color:var(--dsw-alias-label-secondary);flex:none}
.wb-dot[data-state=blocked]{background:var(--dsw-alias-state-error-primary)}
.wb-dot[data-state=done]{background:var(--dsw-alias-state-success-primary)}
.wb-row[data-state=blocked] small{color:var(--dsw-alias-state-error-primary)}
.wb-row .wb-del{align-self:center}
.wb-row:hover .wb-del{display:grid}

.wb-habits{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;column-gap:10px;row-gap:2px;align-content:start}
.wb-habits[data-compact]{grid-template-columns:minmax(0,1fr) auto auto}
.wb-habits>.wb-blank{grid-column:1/-1}
.wb-hrow{display:grid;grid-template-columns:subgrid;grid-column:1/-1;align-items:center;padding:5px 2px;border-radius:8px;min-width:0}
.wb-hrow:hover{background:var(--dsw-alias-bg-layer-2)}
.wb-hrow>b{min-width:0;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wb-hrow small{font-size:12px;color:var(--dsw-alias-label-secondary);min-width:5em;text-align:right}
.wb-hdays{display:flex;gap:4px;flex:none}
.wb-hday{width:20px;height:20px;border-radius:5px;border:1.5px solid var(--dsw-alias-border-l2);box-sizing:border-box;display:grid;place-items:center}
.wb-hday:hover{border-color:var(--dsw-alias-brand-primary)}
.wb-hday[data-today]{border-color:var(--dsw-alias-brand-primary)}
.wb-hday[data-done]{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);${onBrand('color')}}
.wb-hrow[data-head]{padding-top:0;padding-bottom:0}
.wb-hrow[data-head]:hover{background:none}
.wb-hrow[data-head] .wb-hdays span{width:20px;text-align:center;font-size:11px;line-height:14px;color:var(--dsw-alias-label-secondary)}
.wb-hrow[data-head] .wb-hdays span[data-today]{color:var(--dsw-alias-brand-primary);font-weight:600}
.wb-hsp{width:24px;flex:none}
.wb-hrow .wb-del{display:grid;visibility:hidden}
.wb-hrow:hover .wb-del{visibility:visible}

.wb-prompt{display:flex;flex-direction:column;gap:8px;height:100%;min-height:0}
.wb-prompt textarea{flex:1;min-height:36px;resize:none;border:1px solid var(--dsw-alias-border-l1);outline:none;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:8px;padding:8px 10px;font:inherit;line-height:1.5}
.wb-prompt textarea:focus{border-color:var(--dsw-alias-brand-primary)}
.wb-chips{display:flex;flex-wrap:wrap;gap:6px;overflow:auto;min-height:0;flex:none;max-height:100%}
.wb-prompt[data-size=s] .wb-chips,.wb-prompt[data-size=t] .wb-chips{flex-direction:column;flex-wrap:nowrap}
.wb-chip{height:26px;padding:0 10px;border-radius:13px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;text-align:left;flex:none}
.wb-chip:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.wb-chip:disabled{opacity:.5;cursor:default}
.wb-inrow{display:flex;align-items:flex-start;gap:8px;padding:6px 4px;border-radius:8px;min-width:0}
.wb-inrow:hover{background:var(--dsw-alias-bg-layer-2)}
.wb-inrow>span{flex:1;min-width:0;white-space:pre-wrap;word-break:break-word;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;line-height:1.45}
.wb-inrow small{font-size:12px;color:var(--dsw-alias-label-secondary);flex:none;line-height:1.45}
.wb-inrow:hover .wb-del{display:grid}
.wb-inrow:hover small{display:none}
.wb-usage{display:flex;flex-direction:column;gap:10px;height:100%;min-height:0}
.wb-usage[data-size=m],.wb-usage[data-size=w]{flex-direction:row;align-items:stretch;gap:24px}
.wb-utop{display:flex;gap:24px;flex:none;min-width:0}
.wb-usage[data-size=t] .wb-bars{flex:none;height:36px;min-height:0}
.wb-usage .wb-hero{flex:none;justify-content:flex-start;height:auto}
.wb-usage[data-size=m] .wb-hero,.wb-usage[data-size=w] .wb-hero,.wb-usage[data-size=s] .wb-hero{justify-content:center}
.wb-bars{flex:1;min-width:0;min-height:48px;display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:2px;align-items:end}
.wb-bars>span{display:flex;align-items:flex-end;justify-content:center;height:100%;min-height:0}
.wb-bars i{display:block;width:100%;max-width:12px;min-height:2px;border-radius:3px 3px 1px 1px;background:var(--dsw-alias-label-secondary);opacity:.35}
.wb-bars>span[data-today] i{background:var(--dsw-alias-brand-primary);opacity:1}
.wb-seg{display:flex;gap:2px;flex:none}
.wb-seg button{height:24px;padding:0 8px;border-radius:6px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.wb-seg button[aria-pressed=true]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.wb-table{display:grid;grid-template-columns:minmax(0,1fr) max-content max-content;grid-auto-rows:max-content;gap:6px 12px;font-size:12px;line-height:18px;overflow:auto;flex:1;min-height:0;align-content:start}
.wb-table>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wb-table>span:not(:nth-child(3n+1)){text-align:right}
.wb-table>.wb-th{color:var(--dsw-alias-label-secondary)}
.wb-table small{color:var(--dsw-alias-label-secondary);margin-left:6px}
.wb-foot-note{flex:none;font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wb-rowact{display:none;flex:none;height:24px;padding:0 8px;border-radius:6px;font-size:12px;color:var(--dsw-alias-brand-primary);align-self:center}
.wb-rowact:hover{background:var(--dsw-alias-bg-layer-1)}
.wb-row:hover .wb-rowact{display:block}
.wb-row:hover .wb-rowact~time{display:none}
.wb-rowact[data-danger]{color:var(--dsw-alias-state-error-primary)}
.wb-rowact[data-armed]{display:block}
.wb-ext{width:28px;height:28px;border-radius:7px;flex:none;display:grid;place-items:center;box-sizing:border-box;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);font-size:9px;font-weight:600;font-style:normal;letter-spacing:.2px;text-transform:uppercase;color:var(--dsw-alias-label-secondary);overflow:hidden}
.wb-inrow[data-sel]{box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-2)}
.wb-inrow .wb-del[data-plain]:hover{color:var(--dsw-alias-label-primary)}
.wb-cliptext{flex:1;min-height:0;overflow:hidden;white-space:pre-wrap;word-break:break-word;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}
.wb-search{margin-bottom:6px;flex:none}
.wb-net{display:flex;flex-direction:column;gap:10px;height:100%;min-height:0}
.wb-net[data-size=m],.wb-net[data-size=w]{flex-direction:row;align-items:center;gap:20px}
.wb-net[data-size=w] .wb-spark{align-self:stretch}
.wb-rates{display:flex;gap:16px;flex:none}
.wb-net[data-size=s] .wb-rates,.wb-net[data-size=m] .wb-rates,.wb-net[data-size=w] .wb-rates{flex-direction:column;gap:6px}
.wb-rates>div{display:flex;flex-direction:column;min-width:0}
.wb-rates small{font-size:12px;color:var(--dsw-alias-label-secondary)}
.wb-rates b{font-size:20px;font-weight:600;letter-spacing:-.5px;line-height:1.2;white-space:nowrap}
.wb-kv{display:grid;grid-template-columns:max-content minmax(0,1fr) max-content;gap:5px 10px;font-size:12px;align-content:start;min-width:0;flex:1}
.wb-kv>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wb-kv>span:nth-child(3n+1),.wb-kv>span:nth-child(3n){color:var(--dsw-alias-label-secondary)}
.wb-kv>span:nth-child(3n){text-align:right}
.wb-kv [data-level=ok]{color:var(--dsw-alias-state-success-primary)}
.wb-kv [data-level=warn]{color:var(--dsw-alias-state-warn-primary)}
.wb-kv [data-level=bad]{color:var(--dsw-alias-state-error-primary)}
.wb-spark polyline.wb-up{stroke:var(--dsw-alias-label-secondary);opacity:.7}
.wb-np{display:flex;gap:14px;align-items:center;height:100%;min-width:0}
.wb-np[data-size=t]{flex-direction:column;align-items:stretch;gap:10px}
.wb-np[data-size=s]{flex-direction:column;align-items:stretch;justify-content:space-between;gap:8px}
.wb-npart{appearance:none;border:0;padding:0;height:100%;aspect-ratio:1;flex:none;border-radius:8px;background:var(--dsw-alias-bg-layer-2) center/cover no-repeat;display:grid;place-items:center;color:var(--dsw-alias-label-secondary);cursor:pointer}
.wb-np[data-size=t] .wb-npart{height:auto;width:100%}
.wb-np[data-size=s] .wb-npart{height:52px}
.wb-nphead{display:flex;align-items:center;gap:10px;min-width:0}
.wb-nphead>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.wb-np>.wb-pbar{height:3px}
.wb-np>.wb-pbar i{background:var(--dsw-alias-label-primary);opacity:.6}
.wb-npmain{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:6px}
.wb-npmain>div:first-child{display:flex;flex-direction:column;min-width:0}
.wb-npmain b,.wb-nphead b{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wb-npmain small,.wb-nphead small{font-size:12px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wb-nptime{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.wb-nptime .wb-pbar{flex:1;height:4px}
.wb-nptime .wb-pbar i{background:var(--dsw-alias-label-primary);opacity:.6}
.wb-npctl{display:flex;align-items:center;gap:4px}
.wb-npctl button{width:30px;height:30px;border-radius:15px;display:grid;place-items:center}
.wb-npctl button:hover{background:var(--dsw-alias-bg-layer-2)}
.wb-npctl button[data-primary]{background:var(--dsw-alias-brand-primary);${onBrand('color')}}
.wb-npctl button:disabled{opacity:.4;cursor:default}
.wb-np[data-size=t] .wb-npctl,.wb-np[data-size=s] .wb-npctl{justify-content:center}
.wb-np[data-size=s] .wb-npctl{gap:12px}
.wb-amb{display:flex;flex-direction:column;gap:8px;height:100%;min-height:0}
.wb-amb[data-size=w]{flex-direction:row;align-items:stretch;gap:16px}
.wb-amtiles{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;flex:1;min-height:0}
.wb-amb[data-size=s] .wb-amtiles{grid-template-columns:repeat(3,minmax(0,1fr))}
.wb-amb[data-size=t] .wb-amtiles{grid-template-columns:repeat(2,minmax(0,1fr))}
.wb-amtile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-width:0;border-radius:10px;border:1px solid transparent;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:12px}
.wb-amtile:hover{color:var(--dsw-alias-label-primary)}
.wb-amtile span{max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wb-amb[data-size=s] .wb-amtile span{display:none}
.wb-amtile[aria-pressed=true]{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.wb-amb[data-playing] .wb-amtile[aria-pressed=true]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent)}
.wb-amctl{display:flex;align-items:center;gap:10px;flex:none;min-width:0}
.wb-amb[data-size=w] .wb-amctl{width:200px}
.wb-amctl input{flex:1;min-width:0;accent-color:var(--dsw-alias-brand-primary)}
.wb-amplay{width:28px;height:28px;border-radius:14px;flex:none;display:grid;place-items:center;background:var(--dsw-alias-brand-primary);${onBrand('color')}}
.wb-vstrip{display:flex;gap:10px;overflow-x:auto;overflow-y:hidden;flex:1;min-height:0;scrollbar-width:thin}
.wb-vtile{position:relative;flex:none;height:100%;aspect-ratio:16/9;border-radius:8px;overflow:hidden;background:var(--dsw-alias-bg-layer-2);color:#fff;text-decoration:none}
.wb-vtile>div{position:absolute;left:0;right:0;bottom:0;padding:16px 8px 6px;background:linear-gradient(transparent,rgba(0,0,0,.75));font-size:12px;line-height:1.35}
.wb-vtile b{font-weight:500;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.wb-vtile[data-read]>div{opacity:.6}
.wb-vgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px 10px;overflow:auto;flex:1;min-height:0;align-content:start}
.wb-vlist{display:flex;flex-direction:column;gap:10px;overflow:auto;flex:1;min-height:0}
.wb-vcard{display:flex;flex-direction:column;gap:6px;min-width:0;color:inherit;text-decoration:none}
.wb-vlist .wb-vcard{flex-direction:row;gap:8px;flex:none}
.wb-vlist .wb-vthumb{width:96px}
.wb-vcard>div:last-child{min-width:0;display:flex;flex-direction:column;gap:2px}
.wb-vcard b{font-weight:500;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.wb-vcard small{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wb-vcard:hover b{color:var(--dsw-alias-brand-primary)}
.wb-vcard[data-read] b{font-weight:400;color:var(--dsw-alias-label-secondary)}
.wb-vthumb{position:relative;aspect-ratio:16/9;flex:none;border-radius:8px;overflow:hidden;background:var(--dsw-alias-bg-layer-2)}
.wb-vthumb img,.wb-vtile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.wb-vthumb i{position:absolute;right:4px;bottom:4px;padding:0 4px;border-radius:4px;background:rgba(0,0,0,.72);color:#fff;font-size:10px;line-height:16px;font-style:normal}

@media (max-width:900px){.wb-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.wb-card[data-c="4"]{grid-column:span 2}.wb-today .wb-tquote{display:none}}
@media (max-width:600px){.wb-grid{grid-template-columns:minmax(0,1fr)}.wb-card{grid-column:auto!important}}
.wb-cw{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;margin:0 -4px -4px}
.wb-cwframe{flex:1;width:100%;min-height:0;border:0;display:block;background:transparent}
.wb-cwerr{position:absolute;left:4px;right:4px;bottom:4px;display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);font-size:12px;color:var(--dsw-alias-state-error-primary)}
.wb-cwerr span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wb-cwerr button{display:inline-flex;align-items:center;gap:4px;flex:none;color:var(--dsw-alias-brand-primary);font-weight:500}
.wb-card>header .wb-hact{opacity:0;width:24px;height:24px;margin:-4px -6px -4px 0;border-radius:6px;display:grid;place-items:center;color:var(--dsw-alias-label-secondary);flex:none}
.wb-card:hover>header .wb-hact,.wb-card>header .wb-hact:focus-visible{opacity:1}
.wb-card>header .wb-hact:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-brand-primary)}
.wb-card>.wb-hact{position:absolute;top:8px;right:8px;z-index:2;opacity:0;width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}
.wb-card[data-banner]>.wb-hact{top:-10px;right:-10px}
.wb-card[data-banner]>.wb-hact+.wb-hact{right:20px}
.wb-card:hover>.wb-hact,.wb-card>.wb-hact:focus-visible{opacity:1}
.wb-card[data-intro]>.wb-hedit{opacity:1;color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
.wb-introat{position:relative;display:flex}
.wb-intro{position:absolute;z-index:10;top:calc(100% + 10px);right:0;width:max-content;max-width:260px;display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-brand-primary);box-shadow:0 8px 24px rgba(0,0,0,.18);color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.5;cursor:default;animation:wb-intro .2s ease-out}
.wb-intro::before{content:'';position:absolute;top:-6px;right:var(--ax,10px);width:10px;height:10px;background:inherit;border:solid var(--dsw-alias-brand-primary);border-width:1px 0 0 1px;transform:rotate(45deg)}
.wb-intro .wb-action{height:26px;padding:0 10px;flex:none}
@keyframes wb-intro{from{opacity:0;transform:translateY(-4px)}}
.wb-card>.wb-hact:hover{color:var(--dsw-alias-brand-primary)}
@media (hover:none){.wb-card>header .wb-hact,.wb-card>.wb-hact{opacity:.7}}
.wb-gen{border-style:dashed;flex:none}
.wb-gacts{display:grid;grid-template-columns:2fr 1fr;gap:8px;flex:none}
.wb-impinfo{display:flex;flex-direction:column;gap:4px;font-size:12px;margin-top:8px;overflow-wrap:anywhere}
.wb-impinfo b{font-size:13px}
.wb-emptyacts{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.wb-gen .wb-gname svg{color:var(--dsw-alias-brand-primary)}
.wb-gentext{min-height:96px;resize:vertical;line-height:1.5}
.wb-modal .wb-wsel{margin-right:auto}
.wb-codefield{flex:1;min-height:0}
.wb-code{flex:1;min-height:240px;resize:none;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.5;white-space:pre;tab-size:2}
.wb-cwmeta{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:none}
.wb-modal[data-wide] .wb-field{flex:none}
.wb-modal[data-wide] .wb-codefield{flex:1}
.wb-port{flex:none;min-width:44px;text-align:right;font-weight:600;color:var(--dsw-alias-brand-primary)}
.wb-stbig{font-size:22px;font-weight:600;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wb-stbig[data-state=done],.wb-hdhead[data-state=done],.wb-hdtoday[data-state=done]{color:var(--dsw-alias-state-success-primary)}
.wb-stbig[data-state=waiting],.wb-hdhead[data-state=waiting],.wb-hdtoday[data-state=waiting]{color:var(--dsw-alias-state-warn-primary)}
.wb-stbig[data-state=blocked]{color:var(--dsw-alias-state-error-primary)}
.wb-stbig[data-state=running]{color:var(--dsw-alias-brand-primary)}
.wb-hdhead{flex:none;font-size:12px;color:var(--dsw-alias-label-secondary);padding:0 2px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wb-activity{display:flex;flex-direction:column;gap:6px;height:100%;min-height:0}
.wb-heatbox{flex:1;min-height:0;display:flex;align-items:center;justify-content:flex-end;overflow:hidden}
.wb-heatwrap{display:grid;gap:4px}
.wb-heatmon{position:relative}
.wb-heatmon span{position:absolute;bottom:0;white-space:nowrap}
.wb-heatwk{display:grid}
.wb-heatwk span{display:flex;align-items:center;justify-content:flex-end}
.wb-heatmon,.wb-heatwk{font-size:10px;line-height:1;color:var(--dsw-alias-label-secondary);user-select:none}
.wb-heat{display:grid;grid-auto-flow:column}
.wb-heat i{border-radius:2px;background:var(--dsw-alias-bg-layer-2)}
.wb-heat i[data-level="1"]{background:#9be9a8}
.wb-heat i[data-level="2"]{background:#40c463}
.wb-heat i[data-level="3"]{background:#30a14e}
.wb-heat i[data-level="4"]{background:#216e39}
.wb-heat i[data-future]{background:none}
.wb-heat i[data-day]:hover{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dsw-alias-label-primary) 60%,transparent)}
.wb-heat i[data-today]{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dsw-alias-label-primary) 30%,transparent)}
`;

    const pad = n => String(n).padStart(2, '0');
    const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
    const dayOfYear = d => Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

    function isoWeek(d) {
      const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
      return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
    }

    function greeting(t, hour) {
      if (hour < 5) return t('night');
      if (hour < 11) return t('morning');
      if (hour < 13) return t('noon');
      if (hour < 18) return t('afternoon');
      return t('evening');
    }

    const clockStore = (() => {
      let now = new Date();
      const listeners = new Set();
      let timer = null;
      return {
        getSnapshot: () => now,
        subscribe(fn) {
          listeners.add(fn);
          if (!timer) timer = setInterval(() => { now = new Date(); for (const l of listeners) l(); }, 1000);
          return () => { listeners.delete(fn); if (!listeners.size) { clearInterval(timer); timer = null; } };
        },
      };
    })();
    const useNow = () => useSyncExternalStore(clockStore.subscribe, clockStore.getSnapshot, clockStore.getSnapshot);

    // 自定义 widget 的 iframe 文档：沙箱内的 CSP 禁止一切直接联网，只留内联脚本 / 样式和 data: 资源。
    const CUSTOM_PREFIX = 'custom.';
    const FRAME_NS = 'dsh-workboard-frame';
    const FRAME_CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:";
    const FRAME_TOKENS = {
      '--bg': '--dsw-alias-bg-base', '--card': '--dsw-alias-bg-layer-1', '--layer': '--dsw-alias-bg-layer-2',
      '--text': '--dsw-alias-label-primary', '--muted': '--dsw-alias-label-secondary', '--accent': '--dsw-alias-brand-primary',
      '--border': '--dsw-alias-border-l1', '--border-strong': '--dsw-alias-border-l2',
      '--success': '--dsw-alias-state-success-primary', '--warn': '--dsw-alias-state-warn-primary', '--error': '--dsw-alias-state-error-primary',
    };
    const FRAME_CSS = `
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;height:100%;background:transparent}
body{color:var(--text);font:13px/1.45 var(--font);overflow:auto;overflow-wrap:anywhere;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
h1,h2,h3,h4,p{margin:0}
.muted{color:var(--muted)}
.small{font-size:12px}
.num{font-variant-numeric:tabular-nums}
.big{font-size:28px;font-weight:600;line-height:1.15;font-variant-numeric:tabular-nums}
.stack{display:flex;flex-direction:column;gap:8px;min-width:0}
.hstack{display:flex;align-items:center;gap:8px;min-width:0}
.grow{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row{display:flex;align-items:center;gap:8px;min-height:30px;padding:4px 0;border-bottom:1px solid var(--border)}
.row:last-child{border-bottom:0}
.center{display:grid;place-items:center;height:100%;text-align:center}
.chip{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:11px;background:var(--layer);font-size:12px;white-space:nowrap}
.bar{height:6px;border-radius:3px;background:var(--layer);overflow:hidden}
.bar>i{display:block;height:100%;border-radius:3px;background:var(--accent)}
.up{color:var(--success)}.down,.error{color:var(--error)}.warn{color:var(--warn)}
button,input,select,textarea{font:inherit;color:inherit}
button{height:28px;padding:0 12px;border-radius:8px;border:1px solid var(--border);background:var(--card);cursor:pointer;white-space:nowrap}
button:hover{border-color:var(--border-strong)}
button:disabled{opacity:.5;cursor:default}
button.primary{background:var(--accent);border-color:transparent;color:var(--on-accent)}
input,select,textarea{min-width:0;background:var(--layer);border:1px solid var(--border);border-radius:8px;padding:5px 8px;outline:none}
input:focus,select:focus,textarea:focus{border-color:var(--accent)}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:3px}
`;

    // 在 iframe 里运行（按源码序列化注入），不能引用外层变量。
    function workboardBridge() {
      const boot = JSON.parse(document.getElementById('workboard-boot').textContent);
      const NS = 'dsh-workboard-frame';
      const KEYS = ['size', 'config', 'data', 'dataAt', 'theme', 'lang'];
      const post = msg => parent.postMessage({ns: NS, ...msg}, '*');
      const pending = new Map();
      const listeners = new Set();
      let seq = 0;
      const workboard = {};
      for (const k of KEYS) workboard[k] = boot[k];
      const request = (type, payload) => new Promise((resolve, reject) => {
        const id = ++seq;
        pending.set(id, {resolve, reject});
        post({type, id, ...payload});
      });
      const report = (error, line) => {
        const message = error && typeof error === 'object' ? (error.stack || error.message || String(error)) : String(error);
        post({type: 'error', message: message.slice(0, 2000), line: line > boot.offset ? line - boot.offset : 0});
      };
      workboard.on = fn => { listeners.add(fn); return () => { listeners.delete(fn); }; };
      workboard.fetch = (url, options = {}) => request('fetch', {url: String(url), as: options.as, fresh: options.fresh === true});
      workboard.save = data => request('save', {data}).then(r => { workboard.data = data ?? null; workboard.dataAt = r.dataAt; return true; });
      workboard.open = url => { post({type: 'open', url: String(url)}); };
      workboard.ask = prompt => { post({type: 'ask', prompt: String(prompt)}); };
      window.workboard = workboard;
      const root = document.documentElement;
      const paint = vars => {
        for (const k of Object.keys(vars)) root.style.setProperty(k, vars[k]);
        root.style.colorScheme = workboard.theme;
      };
      paint(boot.vars);
      addEventListener('message', event => {
        const m = event.data;
        if (event.source !== parent || !m || m.ns !== NS) return;
        if (m.type === 'reply') {
          const p = pending.get(m.id);
          if (!p) return;
          pending.delete(m.id);
          if (m.ok) p.resolve(m.value); else p.reject(new Error(m.error));
          return;
        }
        if (m.type !== 'state') return;
        const changed = KEYS.filter(k => k in m.state && JSON.stringify(workboard[k]) !== JSON.stringify(m.state[k]));
        for (const k of changed) workboard[k] = m.state[k];
        if (m.state.vars) paint(m.state.vars);
        if (changed.length) for (const fn of [...listeners]) { try { fn(workboard); } catch (error) { report(error); } }
      });
      addEventListener('error', e => report(e.error || e.message, e.lineno));
      addEventListener('unhandledrejection', e => report(e.reason));
      document.addEventListener('click', e => {
        const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
        if (!a || (a.getAttribute('href') ?? '').startsWith('#')) return;
        e.preventDefault();
        workboard.open(a.href);
      });
      post({type: 'ready'});
    }

    const escAttr = s => String(s).replace(/[&"<>]/g, c => ({'&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;'})[c]);
    // 用户 HTML 从新的一行开始，offset 把报错行号换算成 HTML 内的行号。
    function frameDoc(html, state) {
      const head = (json => `<!doctype html><html lang="${escAttr(state.lang)}"><head><meta charset="utf-8">`
        + `<meta http-equiv="Content-Security-Policy" content="${FRAME_CSP}"><style>${FRAME_CSS}</style>`
        + `<script type="application/json" id="workboard-boot">${json}</script><script>(${workboardBridge})()</script></head><body>`);
      const offset = head('').split('\n').length;
      const boot = JSON.stringify({...state, offset}).replace(/</g, '\\u003c');
      return `${head(boot)}\n${html}\n</body></html>`;
    }

    const rgbOf = (() => {
      let paint = null;
      return value => {
        paint ??= document.createElement('canvas').getContext('2d', {willReadFrequently: true});
        if (!paint) return null;
        paint.clearRect(0, 0, 1, 1);
        paint.fillStyle = '#000';
        paint.fillStyle = value;
        paint.fillRect(0, 0, 1, 1);
        return [...paint.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      };
    })();
    const luminance = rgb => {
      const [r, g, b] = rgb.map(v => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const safeLink = raw => {
      try {
        const url = new URL(String(raw));
        return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : '';
      } catch { return ''; }
    };

    const svg = (size, d, width = 2) => h('svg', {width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true},
      ...(Array.isArray(d) ? d : [d]).map((p, i) => (typeof p === 'string' ? h('path', {key: i, d: p}) : h(p.tag, {key: i, ...p.attrs}))));
    const Icon = {
      check: () => svg(12, 'M5 12.5l4.5 4.5L19 7.5', 3),
      x: () => svg(14, 'M6 6l12 12M18 6L6 18'),
      plus: () => svg(16, 'M12 5v14M5 12h14'),
      chev: () => svg(12, 'M9 6l6 6-6 6', 2.2),
      left: () => svg(14, 'M15 6l-6 6 6 6'),
      right: () => svg(14, 'M9 6l6 6-6 6'),
      folder: () => svg(13, 'M3.5 7.5A2 2 0 0 1 5.5 5.5h3.6l2 2h7.4a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z', 1.8),
      pin: () => svg(13, ['M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z', {tag: 'circle', attrs: {cx: 12, cy: 10, r: 2.3}}], 1.8),
      pencil: () => svg(14, 'M4 20h4L18.5 9.5a2.83 2.83 0 0 0-4-4L4 16v4zM13.5 6.5l4 4'),
      sparkle: () => svg(14, ['M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z', 'M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z'], 1.6),
      code: () => svg(14, 'M8 7l-5 5 5 5M16 7l5 5-5 5'),
      import: () => svg(14, 'M12 4v11M7 10l5 5 5-5M5 20h14'),
      copy: () => svg(14, ['M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1z', 'M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1'], 1.8),
      gear: () => svg(14, ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'], 1.6),
    };

    const CLOUD_HIGH = 'M7 14h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 7.1 3.5 3.5 0 0 0 7 14z';
    const WX_PATHS = {
      sun: [{tag: 'circle', attrs: {cx: 12, cy: 12, r: 4}}, 'M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4'],
      moon: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
      partly: [{tag: 'circle', attrs: {cx: 8, cy: 8, r: 2.5}}, 'M8 2.5V4M2.5 8H4M4.2 4.2l1 1M11.8 4.2l-1 1', 'M9.5 20h8a3.5 3.5 0 0 0 .4-6.98A5 5 0 0 0 8.5 14.2 3 3 0 0 0 9.5 20z'],
      cloud: ['M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 11.1 3.5 3.5 0 0 0 7 18z'],
      fog: ['M4 9h16M4 13h16M6 17h12'],
      rain: [CLOUD_HIGH, 'M9 17l-1 3M13 17l-1 3M17 17l-1 3'],
      snow: [CLOUD_HIGH, 'M9 18h.01M13 18h.01M17 18h.01M11 21h.01M15 21h.01'],
      thunder: [CLOUD_HIGH, 'M12.5 14l-2 4h3.5l-2 4'],
    };

    // WMO 天气代码 → [图标, 文案键]
    function wxKind(code, isDay = true) {
      if (code === 0) return [isDay ? 'sun' : 'moon', 'wx_clear'];
      if (code <= 2) return ['partly', 'wx_partly'];
      if (code === 3) return ['cloud', 'wx_cloud'];
      if (code <= 48) return ['fog', 'wx_fog'];
      if (code <= 57) return ['rain', 'wx_drizzle'];
      if (code <= 67) return ['rain', 'wx_rain'];
      if (code <= 77) return ['snow', 'wx_snow'];
      if (code <= 82) return ['rain', 'wx_showers'];
      if (code <= 86) return ['snow', 'wx_snow'];
      return ['thunder', 'wx_thunder'];
    }
    const WxIcon = ({code, isDay, size = 24}) => svg(size, WX_PATHS[wxKind(code, isDay)[0]], 1.6);

    function aqiLevel(aqi) {
      const i = aqi <= 50 ? 0 : aqi <= 100 ? 1 : aqi <= 150 ? 2 : aqi <= 200 ? 3 : aqi <= 300 ? 4 : 5;
      return {key: `aqi${i}`, index: i, level: i === 0 ? 'ok' : i <= 2 ? 'warn' : 'bad'};
    }

    function PanelIcon({size = 20}) {
      return h('svg', {width: size, height: size, viewBox: '0 0 20 20', fill: 'none', 'aria-hidden': true},
        h('rect', {x: 2.5, y: 2.5, width: 15, height: 15, rx: 3, stroke: 'currentColor', strokeWidth: 1.4}),
        h('path', {d: 'M10 2.5v15M10 10h7.5', stroke: 'currentColor', strokeWidth: 1.4}));
    }

    // 待办与速记的页面内缓存：面板可见时轮询，让 Agent 工具写入的变更出现在页面上。
    function createData(call) {
      let snap = {todos: null, note: null, error: ''};
      const listeners = new Set();
      const set = patch => { snap = {...snap, ...patch}; for (const l of listeners) l(); };
      const guard = p => p.catch(e => { set({error: String(e?.message || e)}); throw e; });
      async function refresh() {
        const [todos, note] = await Promise.all([call('todo.list'), call('note.get')]);
        set({todos, note, error: ''});
      }
      let users = 0;
      let timer = null;
      const tick = () => { if (!document.hidden) refresh().catch(e => set({error: String(e?.message || e)})); };
      return {
        getSnapshot: () => snap,
        subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); },
        start() {
          if (users++ === 0) {
            tick();
            timer = setInterval(tick, POLL_MS);
            window.addEventListener('focus', tick);
            document.addEventListener('visibilitychange', tick);
          }
          return () => {
            if (--users === 0) {
              clearInterval(timer);
              window.removeEventListener('focus', tick);
              document.removeEventListener('visibilitychange', tick);
            }
          };
        },
        addTodo: text => guard(call('todo.add', {text}).then(refresh)),
        setDone: (id, done) => {
          set({todos: snap.todos?.map(t => t.id === id ? {...t, done, doneAt: done ? Date.now() : 0} : t)});
          return guard(call('todo.update', {id, done}).then(refresh));
        },
        removeTodo: id => {
          set({todos: snap.todos?.filter(t => t.id !== id)});
          return guard(call('todo.remove', {id}).then(refresh));
        },
        saveNote: text => guard(call('note.put', {text}).then(note => { set({note}); return note; })),
      };
    }

    return {
      inject: ['slots', 'connection', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, {zh, en}), 'dsh-workboard: dictionaries');
        ctx.effect(() => {
          const tag = document.createElement('style');
          tag.textContent = CSS;
          document.head.appendChild(tag);
          return () => tag.remove();
        }, 'dsh-workboard: styles');
        const t = ctx.locale.bind(NS);
        const call = async (method, payload = {}) => {
          const result = await ctx.connection.rpc.call('/api', `dsh-workboard/${method}`, payload);
          if (result?.ok === true) return result.value;
          throw new Error(result?.error?.message || t('loadFailed'));
        };
        const data = createData(call);
        const useData = () => useSyncExternalStore(data.subscribe, data.getSnapshot, data.getSnapshot);
        const localeSubscribe = fn => (typeof ctx.locale.subscribe === 'function' ? ctx.locale.subscribe(fn) : () => {});
        const localeRevision = () => ctx.locale.getSnapshot?.()?.revision ?? 0;
        const useLocale = () => useSyncExternalStore(localeSubscribe, localeRevision, localeRevision);

        const resolveText = v => {
          if (typeof v === 'function') return v();
          if (v && typeof v === 'object') return v[t('lang').slice(0, 2)] ?? v.en ?? Object.values(v)[0] ?? '';
          return v ?? '';
        };
        const sizeLabel = s => t(`size_${s}`);

        // 偏好：所有看板共用的设置（城市、单位、日历订阅、当前看板…）。
        const prefsStore = (() => {
          let snap = {loaded: false, values: {}};
          let loading = null;
          const listeners = new Set();
          const set = next => { snap = next; for (const l of listeners) l(); };
          return {
            getSnapshot: () => snap,
            subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); },
            load() {
              loading ??= call('prefs.get').then(values => set({loaded: true, values}), () => { loading = null; set({loaded: true, values: snap.values}); });
              return loading;
            },
            put(patch) {
              set({loaded: true, values: {...snap.values, ...patch}});
              return call('prefs.put', {prefs: patch}).then(values => set({loaded: true, values}));
            },
          };
        })();
        const usePrefs = () => {
          useEffect(() => { void prefsStore.load(); }, []);
          return useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, prefsStore.getSnapshot).values;
        };

        // 同一请求在多个 widget 间共享结果，页面可见时按间隔刷新；Host 端另有缓存。
        const remoteCache = new Map();
        function useRemote(method, payload, intervalMs) {
          const key = payload ? `${method}:${JSON.stringify(payload)}` : '';
          const [, force] = useState(0);
          useEffect(() => {
            if (!key) return undefined;
            let entry = remoteCache.get(key);
            if (!entry) { entry = {value: undefined, error: '', at: 0, job: null, listeners: new Set()}; remoteCache.set(key, entry); }
            const listener = () => force(x => x + 1);
            entry.listeners.add(listener);
            const load = () => {
              if (document.hidden || entry.job || (entry.at && Date.now() - entry.at < intervalMs / 2)) return;
              entry.job = call(method, payload).then(v => { entry.value = v; entry.error = ''; }, e => { entry.error = String(e?.message || e); })
                .finally(() => { entry.at = Date.now(); entry.job = null; for (const l of entry.listeners) l(); });
            };
            entry.load = load;
            load();
            const id = setInterval(load, intervalMs);
            document.addEventListener('visibilitychange', load);
            return () => { clearInterval(id); document.removeEventListener('visibilitychange', load); entry.listeners.delete(listener); };
          }, [key]);
          const entry = key ? remoteCache.get(key) : null;
          const reload = () => { if (entry) { entry.at = 0; entry.load?.(); } };
          return {value: entry?.value, error: entry?.error ?? '', pending: Boolean(key) && !entry?.at, reload};
        }

        // 已读记录存在 Host 端，各 widget 共享；只增不减，打开链接即标记。
        const readSet = new Set();
        const readListeners = new Set();
        let readRev = 0;
        const readEmit = () => { readRev++; for (const l of readListeners) l(); };
        const readSubscribe = fn => { readListeners.add(fn); return () => readListeners.delete(fn); };
        const readSnapshot = () => readRev;
        const markRead = urls => {
          const list = urls.filter(u => u && !readSet.has(u));
          if (!list.length) return;
          for (const u of list) readSet.add(u);
          readEmit();
          call('read.mark', {urls: list}).catch(() => {});
        };
        function useRead(urls) {
          useSyncExternalStore(readSubscribe, readSnapshot, readSnapshot);
          const key = urls.join('\n');
          useEffect(() => {
            if (!urls.length) return undefined;
            const load = () => call('read.check', {urls}).then(hit => { for (const u of hit) readSet.add(u); readEmit(); }, () => {});
            load();
            window.addEventListener('focus', load);
            return () => window.removeEventListener('focus', load);
          }, [key]);
          return readSet;
        }
        const readProps = (read, url) => ({
          'data-read': read.has(url) ? '' : undefined,
          onClick: () => markRead([url]),
          onAuxClick: e => { if (e.button === 1) markRead([url]); },
        });

        const useWeather = prefs => {
          const loc = prefs.location;
          const unit = prefs.unit === 'f' ? 'f' : 'c';
          return {loc, unit, ...useRemote('weather.get', loc ? {lat: loc.lat, lon: loc.lon, unit} : null, WEATHER_MS)};
        };
        const greet = (prefs, hour) => (prefs.name ? fill(t('greetName'), {g: greeting(t, hour), name: prefs.name}) : greeting(t, hour));
        const deg = v => (Number.isFinite(v) ? `${Math.round(v)}°` : '–');

        const NAME_FIELD = {key: 'name', type: 'text', scope: 'global', label: () => t('f_name')};
        const LOCATION_FIELDS = [
          {key: 'location', type: 'location', scope: 'global', label: () => t('f_location')},
          {key: 'unit', type: 'select', scope: 'global', default: 'c', label: () => t('f_unit'), options: [{value: 'c', label: () => t('celsius')}, {value: 'f', label: () => t('fahrenheit')}]},
        ];

        // 未选来源时沿用旧行为：填了自定义格言就用自定义。
        const QUOTE_SOURCES = ['builtin', 'hitokoto', 'custom'];
        const quoteSource = prefs => (QUOTE_SOURCES.includes(prefs.quoteSource) ? prefs.quoteSource : String(prefs.quotes ?? '').trim() ? 'custom' : 'builtin');
        // 自定义格言每行「句子 — 作者」，作者可省略；为空时用内置一组。
        const quoteAt = (prefs, index) => {
          const own = quoteSource(prefs) !== 'custom' ? [] : String(prefs.quotes ?? '').split('\n').map(s => s.trim()).filter(Boolean).map(line => {
            const m = line.match(/^(.*\S)\s+(?:——|—|--|–)\s*(.+)$/);
            return m ? {text: m[1], by: m[2]} : {text: line, by: ''};
          });
          if (own.length) return own[index % own.length];
          const q = QUOTES[index % QUOTES.length];
          const zhQuote = t('lang').startsWith('zh');
          return {text: zhQuote ? q.zh : q.en, by: zhQuote ? q.by.zh : q.by.en};
        };
        // 一言取不到时退回内置；加载中保留上一条，避免先闪内置再跳。
        function useQuote(prefs, now, index, n) {
          const online = quoteSource(prefs) === 'hitokoto';
          const day = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
          const res = useRemote('quote.get', online ? {day, n} : null, QUOTE_MS);
          const last = useRef(null);
          if (!online) return quoteAt(prefs, index);
          if (res.value) last.current = res.value;
          if (res.value || (res.pending && last.current)) return res.value ?? last.current;
          return res.pending ? {text: '', by: ''} : quoteAt(prefs, index);
        }
        // 按视觉宽度估算长度：CJK 记 1，其余字符约半个字宽。
        const quoteLen = text => {
          let n = 0;
          for (const c of String(text)) n += /[\u2e80-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(c) ? 1 : 0.55;
          return n <= 18 ? 'short' : n > 40 ? 'long' : undefined;
        };
        const QUOTE_FIELDS = [
          {key: 'quoteSource', type: 'select', scope: 'global', default: () => quoteSource(prefsStore.getSnapshot().values), label: () => t('f_quoteSource'),
            options: QUOTE_SOURCES.map(v => ({value: v, label: () => t(`qs_${v}`)}))},
          {key: 'quotes', type: 'textarea', scope: 'global', label: () => t('f_quotes')},
        ];

        function Today({config, openSettings}) {
          useLocale();
          const now = useNow();
          const prefs = usePrefs();
          const [offset, setOffset] = useState(0);
          const showWeather = config?.showWeather !== false;
          const showQuote = config?.showQuote !== false;
          const wx = useWeather(showWeather ? prefs : {});
          const lang = t('lang');
          const q = useQuote(prefs, now, dayOfYear(now) + offset, offset * 2);
          const w = wx.value;
          let weather = null;
          if (showWeather && !wx.loc) weather = h('button', {type: 'button', className: 'wb-btn wb-tcity', onClick: openSettings}, h(Icon.pin), t('setCity'));
          else if (showWeather && w) {
            const aqi = w.aqi != null ? aqiLevel(w.aqi) : null;
            weather = h('div', {className: 'wb-wxmini', title: wx.loc.name},
              h('span', null,
                h(WxIcon, {code: w.current.code, isDay: w.current.isDay, size: 26}),
                h('span', {className: 'wb-wxt wb-num'}, deg(w.current.temp))),
              h('div', null,
                h('div', {className: 'wb-num'}, `${t(wxKind(w.current.code, w.current.isDay)[1])} · ${deg(w.today.lo)} / ${deg(w.today.hi)}`),
                aqi ? h('div', null, h('span', {className: 'wb-aqi wb-num', 'data-level': aqi.index <= 1 ? 'ok' : aqi.index === 2 ? 'warn' : 'bad', title: `AQI ${w.aqi}`}, aqi.index <= 1 ? t(aqi.key) : `${t(aqi.key)} ${w.aqi}`)) : null));
          } else if (showWeather && wx.pending) {
            weather = h('div', {className: 'wb-wxskel', 'aria-hidden': true},
              h('i', {style: {width: 58, height: 26}}),
              h('div', {style: {display: 'grid', gap: 8}}, h('i', {style: {width: 110, height: 10}}), h('i', {style: {width: 84, height: 10}})));
          }
          const zh = lang.startsWith('zh');
          return h('div', {className: 'wb-today'},
            h('div', {className: 'wb-tclock'},
              h('span', {className: 'wb-time wb-num'}, pad(now.getHours()), h('span', {className: 'wb-colon'}, ':'), pad(now.getMinutes())),
              h('span', {className: 'wb-greet'}, greet(prefs, now.getHours())),
              h('span', {className: 'wb-date'}, [now.toLocaleDateString(lang, {month: 'long', day: 'numeric'}), now.toLocaleDateString(lang, {weekday: 'long'}), zh ? lunar(now) : ''].filter(Boolean).join(' · '))),
            weather ? h('span', {className: 'wb-sep'}) : null,
            weather,
            showQuote && q.text ? h('button', {type: 'button', className: 'wb-btn wb-tquote', 'data-len': quoteLen(q.text), title: t('nextQuote'), onClick: () => setOffset(o => o + 1)},
              h('span', {className: 'wb-qtext'}, q.text, q.by ? h('cite', null, `— ${q.by}`) : null)) : null);
        }
        Today.workboard = {
          apiVersion: 1, sizes: ['bar'], banner: true, description: () => t('d_today'),
          settings: [
            NAME_FIELD,
            ...LOCATION_FIELDS,
            {key: 'showWeather', type: 'toggle', default: true, label: () => t('f_showWeather')},
            {key: 'showQuote', type: 'toggle', default: true, label: () => t('f_showQuote')},
            ...QUOTE_FIELDS,
          ],
        };

        function Clock({size}) {
          useLocale();
          const now = useNow();
          const prefs = usePrefs();
          const lang = t('lang');
          const start = new Date(now.getFullYear(), 0, 1);
          const yearPct = Math.floor((now - start) / (new Date(now.getFullYear() + 1, 0, 1) - start) * 100);
          return h('div', {className: 'wb-clock', 'data-size': size},
            h('span', {className: 'wb-muted'}, greet(prefs, now.getHours())),
            h('span', {className: 'wb-time wb-num'}, `${pad(now.getHours())}:${pad(now.getMinutes())}`),
            h('span', {className: 'wb-muted'}, `${now.toLocaleDateString(lang, {month: 'short', day: 'numeric', weekday: 'short'})} · ${fill(t('week'), {n: isoWeek(now)})}`),
            size === 's' ? null : h('div', {className: 'wb-yearbar', title: fill(t('year'), {n: yearPct})}, h('i', {style: {width: `${yearPct}%`}})));
        }
        Clock.workboard = {apiVersion: 1, sizes: ['m', 's'], title: false, description: () => t('d_clock'), settings: [NAME_FIELD]};

        function TodoRow({todo, today}) {
          return h('li', {'data-done': todo.done ? '' : undefined},
            h('button', {type: 'button', className: 'wb-btn wb-ck', 'aria-label': todo.done ? t('reopen') : t('complete'), onClick: () => { data.setDone(todo.id, !todo.done).catch(() => {}); }},
              todo.done ? h(Icon.check) : null),
            h('span', {className: 'wb-tx', title: todo.text}, todo.text),
            !todo.done && todo.createdAt < today ? h('span', {className: 'wb-tag'}, t('carried')) : null,
            h('button', {type: 'button', className: 'wb-btn wb-del', 'aria-label': t('remove'), title: t('remove'), onClick: () => { data.removeTodo(todo.id).catch(() => {}); }}, h(Icon.x)));
        }

        function Todo() {
          useLocale();
          const {todos} = useData();
          const [showDone, setShowDone] = useState(false);
          const [text, setText] = useState('');
          useEffect(() => data.start(), []);
          const today = startOfToday();
          const open = (todos ?? []).filter(x => !x.done);
          const done = (todos ?? []).filter(x => x.done);
          const submit = e => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing || !text.trim()) return;
            const value = text.trim();
            setText('');
            data.addTodo(value).catch(() => setText(value));
          };
          return h(React.Fragment, null,
            h('ul', {className: 'wb-list'},
              todos && open.length === 0 ? h('li', {className: 'wb-blank'}, t('noTodos')) : null,
              open.map(x => h(TodoRow, {key: x.id, todo: x, today})),
              done.length ? h('li', {key: '__done'}, h('button', {type: 'button', className: 'wb-btn wb-donetoggle', 'aria-expanded': showDone, onClick: () => setShowDone(v => !v)},
                h(Icon.chev), fill(t('done'), {n: done.length}))) : null,
              showDone ? done.map(x => h(TodoRow, {key: x.id, todo: x, today})) : null),
            h('label', {className: 'wb-add'}, h(Icon.plus),
              h('input', {value: text, placeholder: t('addTodo'), enterKeyHint: 'done', onChange: e => setText(e.target.value), onKeyDown: submit})));
        }
        Todo.workboard = {apiVersion: 1, sizes: ['l', 'm', 't'], description: () => t('d_todo')};

        function Note() {
          useLocale();
          const {note} = useData();
          const [text, setText] = useState(null);
          const [status, setStatus] = useState('');
          const dirty = useRef(false);
          const focused = useRef(false);
          const timer = useRef(null);
          const area = useRef(null);
          useEffect(() => data.start(), []);
          useEffect(() => {
            if (note && !dirty.current && (!focused.current || text === null)) setText(note.text);
          }, [note]);
          useEffect(() => () => clearTimeout(timer.current), []);
          const save = value => {
            setStatus(t('saving'));
            data.saveNote(value).then(saved => {
              if (area.current?.value === value) dirty.current = false;
              const d = new Date(saved.updatedAt);
              setStatus(fill(t('saved'), {t: `${pad(d.getHours())}:${pad(d.getMinutes())}`}));
            }, () => setStatus(t('loadFailed')));
          };
          const onChange = e => {
            const value = e.target.value;
            setText(value);
            dirty.current = true;
            clearTimeout(timer.current);
            timer.current = setTimeout(() => save(value), 500);
          };
          const lineToTodo = () => {
            const el = area.current;
            if (!el) return;
            const p = el.selectionStart;
            const line = (el.value.slice(0, p).split('\n').pop() + el.value.slice(p).split('\n')[0]).replace(/^\s*(?:[-*+]\s+(?:\[[ xX]\]\s+)?)?/, '').trim();
            if (line) data.addTodo(line).catch(() => {});
          };
          return h(React.Fragment, null,
            h('textarea', {ref: area, className: 'wb-note', value: text ?? '', placeholder: t('notePlaceholder'), spellCheck: false, onChange,
              onFocus: () => { focused.current = true; }, onBlur: () => { focused.current = false; }}),
            h('div', {className: 'wb-notefoot'}, h('span', null, status),
              h('button', {type: 'button', className: 'wb-btn', onMouseDown: e => e.preventDefault(), onClick: lineToTodo}, t('lineToTodo'))));
        }
        Note.workboard = {apiVersion: 1, sizes: ['l', 't', 'm', 's'], description: () => t('d_note')};

        function Weather({size, openSettings}) {
          useLocale();
          const prefs = usePrefs();
          const wx = useWeather(prefs);
          if (!wx.loc) return h('div', {className: 'wb-wx', style: {justifyContent: 'center', alignItems: 'flex-start'}}, h('button', {type: 'button', className: 'wb-btn wb-cta', onClick: openSettings}, t('setCity')));
          const w = wx.value;
          if (!w) return h('div', {className: 'wb-wx wb-muted'}, wx.error || '…');
          const [, textKey] = wxKind(w.current.code, w.current.isDay);
          const aqi = w.aqi != null ? aqiLevel(w.aqi) : null;
          const small = size === 's';
          return h('div', {className: 'wb-wx', 'data-size': size, title: wx.loc.region || undefined},
            h('div', {className: 'wb-wxnow'},
              h(WxIcon, {code: w.current.code, isDay: w.current.isDay, size: small ? 30 : 40}),
              h('span', {className: 'wb-wxt wb-num'}, deg(w.current.temp)),
              small ? null : h('div', {className: 'wb-wxmeta'},
                h('b', null, `${wx.loc.name} · ${t(textKey)}`),
                h('span', {className: 'wb-num'}, `${deg(w.today.lo)} / ${deg(w.today.hi)} · ${fill(t('feels'), {n: Math.round(w.current.feels)})}`)),
              aqi ? h('span', {className: 'wb-aqi', 'data-level': aqi.level}, small ? `AQI ${w.aqi}` : `AQI ${w.aqi} · ${t(aqi.key)}`) : null),
            small ? h('div', {className: 'wb-wxmeta'},
              h('b', null, `${wx.loc.name} · ${t(textKey)}`),
              h('span', {className: 'wb-num'}, `${deg(w.today.lo)} / ${deg(w.today.hi)}`)) : null,
            small ? null : h('div', {className: 'wb-wxhours wb-num'}, w.hours.slice(0, 6).map(x => h('div', {key: x.time},
              h('span', null, x.time), h(WxIcon, {code: x.code, size: 16}), h('b', null, deg(x.temp))))));
        }
        Weather.workboard = {apiVersion: 1, sizes: ['m', 's'], description: () => t('d_weather'), settings: LOCATION_FIELDS};

        const dayKey = v => { const d = new Date(v); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
        const keyDate = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
        const hm = ms => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

        function bucket(events) {
          const map = new Map();
          for (const e of events) {
            const d = new Date(e.start);
            d.setHours(0, 0, 0, 0);
            for (let i = 0; i < 62 && (i === 0 || d.getTime() < e.end); i++) {
              const k = dayKey(d);
              if (!map.has(k)) map.set(k, []);
              map.get(k).push(e);
              d.setDate(d.getDate() + 1);
            }
          }
          return map;
        }

        function EventRow({e, now}) {
          const state = e.end <= now ? 'past' : e.start <= now ? 'now' : '';
          const time = e.allDay ? t('allDay') : e.end > e.start ? `${hm(e.start)}–${hm(e.end)}` : hm(e.start);
          return h('div', {className: 'wb-ev', 'data-state': state || undefined, title: [e.title, e.location].filter(Boolean).join(' · ')},
            h('i'), h('span', {className: 'wb-evtime wb-num'}, time), h('span', {className: 'wb-evtitle'}, e.title));
        }

        function Calendar({size, openSettings}) {
          useLocale();
          const now = useNow();
          const prefs = usePrefs();
          const [month, setMonth] = useState(0);
          const [selected, setSelected] = useState(null);
          const lang = t('lang');
          const urls = String(prefs.calendarUrls ?? '').split(/\s+/).filter(Boolean);
          const weekStart = prefs.weekStart != null ? Number(prefs.weekStart) : (lang.startsWith('zh') ? 1 : 0);
          const big = size === 't' || size === 'l';
          const todayKey = dayKey(now);
          const base = new Date(now.getFullYear(), now.getMonth() + month, 1);
          const lead = (base.getDay() - weekStart + 7) % 7;
          const rows = Math.ceil((lead + new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()) / 7);
          const gridStart = new Date(base.getFullYear(), base.getMonth(), 1 - lead);
          const gridEnd = new Date(base.getFullYear(), base.getMonth(), 1 - lead + rows * 7);
          const today0 = keyDate(todayKey);
          const range = big ? [gridStart.getTime(), gridEnd.getTime()] : [today0.getTime(), new Date(today0.getFullYear(), today0.getMonth(), today0.getDate() + 2).getTime()];
          const useSystem = prefs.systemCalendar !== false;
          const res = useRemote('calendar.events', urls.length || useSystem ? {urls, from: range[0], to: range[1], system: useSystem} : null, CAL_MS);
          const [asking, setAsking] = useState(false);
          const sys = res.value?.system;
          const hasSource = urls.length > 0 || sys === 'ok';
          const byDay = bucket(res.value?.events ?? []);
          const failed = res.value?.errors?.length ?? 0;
          const nowMs = now.getTime();
          const zh = lang.startsWith('zh');
          const list = (k, head) => {
            const items = byDay.get(k) ?? [];
            return h(React.Fragment, {key: k},
              head ? h('div', {className: 'wb-evhead'}, head) : null,
              items.length ? items.map((e, i) => h(EventRow, {key: `${e.start}-${i}`, e, now: nowMs})) : h('div', {className: 'wb-blank'}, t('noEvents')));
          };
          const connect = () => {
            setAsking(true);
            call('calendar.connect').catch(() => {}).finally(() => { setAsking(false); res.reload(); });
          };
          const actions = res.pending ? null : [
            sys === 'ask' ? h('button', {key: 'sys', type: 'button', className: 'wb-btn wb-cta', disabled: asking, onClick: connect}, t(asking ? 'calAsking' : 'calConnect')) : null,
            !hasSource ? h('button', {key: 'ics', type: 'button', className: 'wb-btn', 'data-quiet': sys === 'ask' ? '' : undefined, onClick: openSettings}, t('addIcs')) : null,
          ].filter(Boolean);
          const problem = sys === 'denied' && !urls.length ? h('div', {className: 'wb-calerr'}, t('calDenied'))
            : failed ? h('div', {className: 'wb-calerr', title: res.value.errors.map(e => `${e.url}: ${e.message}`).join('\n')}, fill(t('calError'), {n: failed})) : res.error ? h('div', {className: 'wb-calerr'}, res.error) : null;
          const footer = actions?.length || problem ? h('div', {className: 'wb-calfoot'}, actions, problem) : null;

          if (!big) {
            if (!hasSource) {
              const moon = zh ? lunar(now) : '';
              return h('div', {className: 'wb-cal'},
                h('div', {className: 'wb-caltoday'},
                  h('b', null, now.toLocaleDateString(lang, {month: 'long', day: 'numeric'})),
                  h('span', null, [now.toLocaleDateString(lang, {weekday: 'long'}), moon].filter(Boolean).join(' · '))),
                footer);
            }
            const tomorrow = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
            return h('div', {className: 'wb-cal'},
              h('div', {className: 'wb-events'}, list(todayKey, size === 'm' ? t('todayEvents') : null), size === 'm' ? list(tomorrow, t('tomorrowEvents')) : null),
              footer);
          }
          const sel = selected ?? (month === 0 ? todayKey : dayKey(base));
          const names = Array.from({length: 7}, (_, i) => new Date(2026, 10, 1 + ((weekStart + i) % 7)).toLocaleDateString(lang, {weekday: 'narrow'}));
          const days = Array.from({length: rows * 7}, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
          const selDate = keyDate(sel);
          return h('div', {className: 'wb-cal', 'data-big': ''},
            h('div', {className: 'wb-calnav'},
              h('button', {type: 'button', className: 'wb-btn', onClick: () => { setMonth(0); setSelected(null); }}, base.toLocaleDateString(lang, {year: 'numeric', month: 'long'})),
              h('button', {type: 'button', className: 'wb-btn wb-iconbtn', 'aria-label': t('prevMonth'), onClick: () => { setMonth(m => m - 1); setSelected(null); }}, h(Icon.left)),
              h('button', {type: 'button', className: 'wb-btn wb-iconbtn', 'aria-label': t('nextMonth'), onClick: () => { setMonth(m => m + 1); setSelected(null); }}, h(Icon.right))),
            h('div', {className: 'wb-month wb-num'},
              names.map((n, i) => h('span', {key: `w${i}`, className: 'wb-wd'}, n)),
              days.map(d => {
                const k = dayKey(d);
                return h('button', {key: k, type: 'button', className: 'wb-btn wb-day', onClick: () => setSelected(k),
                  'data-out': d.getMonth() !== base.getMonth() ? '' : undefined, 'data-today': k === todayKey ? '' : undefined,
                  'data-selected': k === sel ? '' : undefined, 'data-has': byDay.has(k) ? '' : undefined}, d.getDate());
              })),
            hasSource ? h('div', {className: 'wb-events'}, list(sel, [sel === todayKey ? t('todayEvents') : selDate.toLocaleDateString(lang, {month: 'short', day: 'numeric', weekday: 'short'}), zh ? lunar(selDate) : ''].filter(Boolean).join(' · '))) : null,
            footer);
        }
        const LUNAR_DIGITS = '一二三四五六七八九十';
        const lunarDay = n => (n <= 10 ? `初${LUNAR_DIGITS[n - 1]}` : n < 20 ? `十${LUNAR_DIGITS[n - 11]}` : n === 20 ? '二十' : n < 30 ? `廿${LUNAR_DIGITS[n - 21]}` : '三十');
        let lunarFormat = null;
        function lunar(d) {
          try {
            lunarFormat ??= new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {month: 'long', day: 'numeric'});
            const parts = lunarFormat.formatToParts(d);
            const m = parts.find(p => p.type === 'month')?.value;
            const n = Number(parts.find(p => p.type === 'day')?.value);
            return m && n >= 1 && n <= 30 ? `${m}${lunarDay(n)}` : '';
          } catch {
            return '';
          }
        }
        const CALENDAR_URLS_FIELD = {key: 'calendarUrls', type: 'textarea', scope: 'global', label: () => t('f_urls'), placeholder: 'https://…/calendar.ics'};
        const SYSTEM_CALENDAR_FIELD = {key: 'systemCalendar', type: 'toggle', scope: 'global', default: true, label: () => t('f_systemCalendar')};
        const WEEK_START_FIELD = {key: 'weekStart', type: 'select', scope: 'global', label: () => t('f_weekStart'), default: () => (t('lang').startsWith('zh') ? '1' : '0'),
          options: [{value: '1', label: () => t('monday')}, {value: '0', label: () => t('sunday')}]};
        Calendar.workboard = {
          apiVersion: 1, sizes: ['t', 'l', 's', 'm'], description: () => t('d_calendar'),
          settings: [SYSTEM_CALENDAR_FIELD, CALENDAR_URLS_FIELD, WEEK_START_FIELD],
        };

        function Quote({size}) {
          useLocale();
          const now = useNow();
          const prefs = usePrefs();
          const [offset, setOffset] = useState(0);
          const q = useQuote(prefs, now, dayOfYear(now) + offset + 1, offset * 2 + 1);
          return h('button', {type: 'button', className: 'wb-btn wb-qcard', 'data-size': size, title: t('nextQuote'), onClick: () => setOffset(o => o + 1)},
            h('span', {className: 'wb-qtext'}, q.text),
            q.by ? h('cite', null, `— ${q.by}`) : null);
        }
        Quote.workboard = {apiVersion: 1, sizes: ['m', 'w', 's'], title: false, description: () => t('d_quote'), settings: QUOTE_FIELDS};

        const DATE_LINE = /^(?:(\d{4})[-/.])?(\d{1,2})[-/.](\d{1,2})(?:\s+(.*))?$/;
        function countdownItems(config, now) {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const items = [];
          if (config.builtin !== false) {
            const weekend = new Date(today);
            if (today.getDay() !== 0) weekend.setDate(today.getDate() + 6 - today.getDay());
            items.push({name: t('weekend'), date: weekend}, {name: t('monthEnd'), date: new Date(today.getFullYear(), today.getMonth() + 1, 0)}, {name: t('yearEnd'), date: new Date(today.getFullYear(), 11, 31)});
          }
          for (const line of String(config.events ?? '').split('\n')) {
            const m = line.trim().match(DATE_LINE);
            if (!m) continue;
            const [, y, mo, d, name] = m.map((v, i) => (i >= 1 && i <= 3 && v ? Number(v) : v));
            let date = null;
            for (let yr = y ?? today.getFullYear(); yr <= (y ?? today.getFullYear() + 8); yr++) {
              const c = new Date(yr, mo - 1, d);
              if (c.getMonth() === mo - 1 && c >= today) { date = c; break; }
            }
            if (date) items.push({name: name?.trim() || date.toLocaleDateString(t('lang'), {month: 'long', day: 'numeric'}), date});
          }
          return items.map(x => ({...x, days: Math.round((x.date - today) / 86400000)})).sort((a, b) => a.days - b.days).slice(0, 20);
        }

        function Countdown({size, config, openSettings}) {
          useLocale();
          const now = useNow();
          const lang = t('lang');
          const items = countdownItems(config ?? {}, now);
          if (!items.length) return h('div', {className: 'wb-hero'}, h('button', {type: 'button', className: 'wb-btn wb-cta', style: {alignSelf: 'flex-start'}, onClick: openSettings}, t('addEvents')));
          const num = x => (x.days === 0 ? [t('isToday')] : [x.days, h('small', {key: 'u'}, x.days === 1 ? t('dayUnit') : t('dayUnits'))]);
          const when = x => x.date.toLocaleDateString(lang, {month: 'short', day: 'numeric', weekday: 'short'});
          if (size === 's') {
            const x = items[0];
            return h('div', {className: 'wb-hero'}, h('small', null, x.name), h('span', {className: 'wb-big wb-num'}, ...num(x)), h('small', null, when(x)));
          }
          return h('div', {className: 'wb-rows'}, items.map((x, i) => h('div', {key: i, className: 'wb-row'},
            h('div', null, h('b', null, x.name), h('small', null, when(x))),
            h('span', {className: 'wb-big wb-num'}, ...num(x)))));
        }
        Countdown.workboard = {
          apiVersion: 1, sizes: ['m', 's', 't'], description: () => t('d_countdown'),
          settings: [
            {key: 'events', type: 'textarea', label: () => t('f_events'), placeholder: '2026-12-25 …'},
            {key: 'builtin', type: 'toggle', default: true, label: () => t('f_builtinCountdown')},
          ],
        };

        function zoneParts(zone, date) {
          const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'})
            .formatToParts(date).map(x => [x.type, x.value]));
          return {y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute};
        }
        function parseZones(text) {
          return String(text ?? '').split('\n').map(s => s.trim()).filter(Boolean).map(line => {
            const [zone, ...rest] = line.split(/\s+/);
            try { new Intl.DateTimeFormat('en-US', {timeZone: zone}); } catch { return null; }
            return {zone, name: rest.join(' ') || zone.split('/').pop().replace(/_/g, ' ')};
          }).filter(Boolean).slice(0, 8);
        }

        function WorldClock({size, config}) {
          useLocale();
          const now = useNow();
          const zones = parseZones(config?.zones || t('defaultZones'));
          const asUtc = p => Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi);
          const local = {y: now.getFullYear(), mo: now.getMonth() + 1, d: now.getDate(), h: now.getHours(), mi: now.getMinutes()};
          const rows = zones.map(z => {
            const p = zoneParts(z.zone, now);
            const diffH = Math.round((asUtc(p) - asUtc(local)) / 1_800_000) / 2;
            const dayDiff = Math.round((Date.UTC(p.y, p.mo - 1, p.d) - Date.UTC(local.y, local.mo - 1, local.d)) / 86400000);
            const day = dayDiff > 0 ? t('tomorrowShort') : dayDiff < 0 ? t('yesterdayShort') : '';
            const diff = diffH === 0 ? t('sameTime') : fill(t('hoursDiff'), {n: `${diffH > 0 ? '+' : '−'}${Math.abs(diffH)}`});
            return {...z, time: `${pad(p.h)}:${pad(p.mi)}`, sub: [day, diff].filter(Boolean).join(' · '), night: p.h < 6 || p.h >= 22};
          });
          if (size === 'w') return h('div', {className: 'wb-cols'}, rows.map((r, i) => h('div', {key: i},
            h('small', null, r.name), h('span', {className: 'wb-big wb-num'}, r.time), h('small', null, r.sub))));
          return h('div', {className: 'wb-rows'}, rows.map((r, i) => h('div', {key: i, className: 'wb-row', 'data-dim': r.night ? '' : undefined},
            h('div', null, h('b', null, r.name), size === 's' ? null : h('small', null, r.sub)),
            h('span', {className: 'wb-big wb-num'}, r.time))));
        }
        WorldClock.workboard = {
          apiVersion: 1, sizes: ['m', 's', 'w', 't'], description: () => t('d_worldclock'),
          settings: [{key: 'zones', type: 'textarea', label: () => t('f_zones'), default: () => t('defaultZones')}],
        };

        // 专注计时存在全局 prefs，切换看板或离开面板不中断；到点由模块级定时器收尾。
        const FOCUS_IDLE = {mode: 'work', endsAt: null, left: null, total: null, day: '', count: 0};
        const focusState = prefs => ({...FOCUS_IDLE, ...(prefs.focus && typeof prefs.focus === 'object' ? prefs.focus : {})});
        const notify = text => {
          try { if (typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification(t('title'), {body: text}); } catch { /* 通知不可用 */ }
        };
        const finishFocus = at => {
          const f = focusState(prefsStore.getSnapshot().values);
          if (f.endsAt !== at) return;
          const day = dayKey(Date.now());
          const wasWork = f.mode === 'work';
          prefsStore.put({focus: {...FOCUS_IDLE, mode: wasWork ? 'break' : 'work', day, count: (f.day === day ? f.count : 0) + (wasWork ? 1 : 0)}}).catch(() => {});
          if (Date.now() - at < 60_000) notify(wasWork ? t('focusDone') : t('breakDone'));
        };
        ctx.effect(() => {
          let timer = null;
          let armed = null;
          const check = () => {
            const at = focusState(prefsStore.getSnapshot().values).endsAt;
            if (at === armed) return;
            clearTimeout(timer);
            armed = at;
            if (at) timer = setTimeout(() => finishFocus(at), Math.max(0, at - Date.now()));
          };
          const off = prefsStore.subscribe(check);
          check();
          return () => { off(); clearTimeout(timer); };
        }, 'dsh-workboard: focus timer');

        function Focus({size, config}) {
          useLocale();
          const now = useNow();
          const prefs = usePrefs();
          const f = focusState(prefs);
          const length = mode => (Number(mode === 'work' ? config?.workMin : config?.breakMin) || (mode === 'work' ? 25 : 5)) * 60_000;
          const running = Boolean(f.endsAt);
          const paused = !running && f.left != null;
          const left = running ? Math.max(0, f.endsAt - Math.max(now.getTime(), Date.now())) : (f.left ?? length(f.mode));
          const total = f.total || length(f.mode);
          const secs = Math.ceil(left / 1000);
          const count = f.day === dayKey(now) ? f.count : 0;
          const put = patch => { prefsStore.put({focus: {...f, ...patch}}).catch(() => {}); };
          const start = () => {
            if (typeof Notification !== 'undefined' && Notification.permission === 'default') Promise.resolve().then(() => Notification.requestPermission()).catch(() => {});
            put({endsAt: Date.now() + left, left: null, total: paused ? total : length(f.mode)});
          };
          const btn = (key, text, onClick, primary) => h('button', {key, type: 'button', className: 'wb-action', 'data-primary': primary ? '' : undefined, onClick}, text);
          return h('div', {className: 'wb-focus', 'data-size': size, 'data-running': running ? '' : undefined},
            h('div', {className: 'wb-fhead'}, h('b', null, f.mode === 'work' ? t('focusWork') : t('focusBreak')),
              size === 's' ? null : h('span', {className: 'wb-num'}, fill(t('pomos'), {n: count}))),
            h('span', {className: 'wb-big wb-num'}, `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`),
            size === 's' ? null : h('div', {className: 'wb-pbar'}, h('i', {style: {width: `${Math.min(100, Math.max(0, (1 - left / total) * 100))}%`}})),
            h('div', {className: 'wb-fbtns'},
              running ? btn('p', t('pause'), () => put({endsAt: null, left: Math.max(0, f.endsAt - Date.now())}), true) : btn('s', paused ? t('resume') : t('start'), start, true),
              size === 's' ? null : running || paused
                ? btn('r', t('reset'), () => put({endsAt: null, left: null, total: null}))
                : btn('k', t('skip'), () => put({mode: f.mode === 'work' ? 'break' : 'work', endsAt: null, left: null, total: null}))));
        }
        const minuteOptions = list => list.map(n => ({value: String(n), label: () => fill(t('minutes'), {n})}));
        Focus.workboard = {
          apiVersion: 1, sizes: ['m', 's'], title: false, description: () => t('d_focus'),
          settings: [
            {key: 'workMin', type: 'select', default: '25', label: () => t('f_workMin'), options: minuteOptions([15, 20, 25, 30, 45, 50, 60, 90])},
            {key: 'breakMin', type: 'select', default: '5', label: () => t('f_breakMin'), options: minuteOptions([3, 5, 10, 15, 20])},
          ],
        };

        // 白噪音：Web Audio 现场合成、模块级单例，切换看板或离开面板不中断；所选声音和音量存在全局 prefs。
        // 浏览器只允许在点击等手势里启动声音，所以刷新后保留选择但不自动续播。
        const AMBIENT = ['rain', 'waves', 'wind', 'fire', 'pink', 'brown'];
        const AMBIENT_LOOP = 12;
        const AMBIENT_GAIN = {rain: 1.3, waves: 1.2, wind: 2.4, fire: 1.2, pink: 0.8, brown: 1};
        const ambientPrefs = prefs => {
          const a = prefs.ambient && typeof prefs.ambient === 'object' ? prefs.ambient : {};
          return {on: Array.isArray(a.on) ? AMBIENT.filter(k => a.on.includes(k)) : [], volume: Number.isFinite(a.volume) ? Math.min(1, Math.max(0, a.volume)) : 0.6};
        };

        // 周期性的包络都能整除 AMBIENT_LOOP 秒，循环接缝处再做一段等功率交叉淡化。
        function synthNoise(kind, len, rate) {
          const out = new Float32Array(len);
          const white = () => Math.random() * 2 - 1;
          let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0, low = 0;
          const pink = () => {
            const w = white();
            b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
            b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
            const v = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
            b6 = w * 0.115926;
            return v * 0.11;
          };
          const brown = () => { last = (last + 0.02 * white()) / 1.02; return last * 3.5; };
          const wave = (i, seconds) => Math.sin(2 * Math.PI * i / (rate * seconds));
          const bursts = (perSecond, amp, decay) => {
            for (let at = 0; at < len;) {
              at += Math.max(1, Math.floor(rate * -Math.log(1 - Math.random()) / perSecond));
              const a = amp();
              const tau = rate * decay();
              const end = Math.min(len, at + Math.floor(tau * 6));
              for (let i = at; i < end; i++) out[i] += white() * a * Math.exp(-(i - at) / tau);
            }
          };
          for (let i = 0; i < len; i++) {
            if (kind === 'pink') out[i] = pink();
            else if (kind === 'brown') out[i] = brown();
            else if (kind === 'rain') out[i] = pink() * 0.5;
            else if (kind === 'fire') { low += (brown() - low) * 0.08; out[i] = low * 1.4 + pink() * 0.03; }
            else if (kind === 'waves') {
              const swell = (1 - Math.cos(2 * Math.PI * i / (rate * 6))) / 2;
              out[i] = (brown() * 0.8 + pink() * 0.35 * swell) * (0.12 + 0.88 * swell * swell);
            } else out[i] = (brown() * 0.7 + pink() * 0.3) * (0.55 + 0.25 * wave(i, 12) + 0.15 * wave(i, 4) + 0.05 * wave(i, 3));
          }
          if (kind === 'rain') bursts(300, () => Math.random() ** 3 * 1.2, () => 0.0008 + Math.random() * 0.003);
          if (kind === 'fire') bursts(6, () => 0.2 + Math.random() ** 2 * 0.9, () => 0.0003 + Math.random() * 0.002);
          return out;
        }

        function noiseBuffer(ac, kind) {
          const rate = ac.sampleRate;
          const n = rate * AMBIENT_LOOP;
          const fade = Math.floor(rate / 2);
          const buffer = ac.createBuffer(2, n, rate);
          for (let ch = 0; ch < 2; ch++) {
            const raw = synthNoise(kind, n + fade, rate);
            const out = buffer.getChannelData(ch);
            out.set(raw.subarray(0, n));
            for (let i = 0; i < fade; i++) {
              const x = (i / fade) * Math.PI / 2;
              out[i] = raw[i] * Math.sin(x) + raw[n + i] * Math.cos(x);
            }
            let sum = 0;
            for (let i = 0; i < n; i++) sum += out[i] * out[i];
            const scale = 0.14 / (Math.sqrt(sum / n) || 1);
            for (let i = 0; i < n; i++) out[i] *= scale;
          }
          return buffer;
        }

        const ambient = (() => {
          let ac = null;
          let master = null;
          let playing = false;
          let volume = null;
          let suspendTimer = null;
          const buffers = new Map();
          const layers = new Map();
          const listeners = new Set();
          const emit = () => { for (const l of listeners) l(); };
          const level = () => (volume ?? ambientPrefs(prefsStore.getSnapshot().values).volume) ** 2 * 0.9;
          const ready = () => {
            if (ac) return true;
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return false;
            ac = new AC();
            const limiter = ac.createDynamicsCompressor();
            master = ac.createGain();
            master.gain.value = 0;
            master.connect(limiter);
            limiter.connect(ac.destination);
            return true;
          };
          const filter = (type, frequency, q) => {
            const f = ac.createBiquadFilter();
            f.type = type;
            f.frequency.value = frequency;
            if (q) f.Q.value = q;
            return f;
          };
          function addLayer(kind) {
            if (!buffers.has(kind)) buffers.set(kind, noiseBuffer(ac, kind));
            const src = ac.createBufferSource();
            src.buffer = buffers.get(kind);
            src.loop = true;
            const sources = [src];
            const chain = kind === 'rain' ? [filter('highpass', 300), filter('lowpass', 7000)]
              : kind === 'waves' ? [filter('lowpass', 1400)]
              : kind === 'fire' ? [filter('highpass', 40)]
              : kind === 'wind' ? [filter('bandpass', 450, 0.7)] : [];
            if (kind === 'wind') {
              const lfo = ac.createOscillator();
              const depth = ac.createGain();
              lfo.frequency.value = 1 / AMBIENT_LOOP;
              depth.gain.value = 250;
              lfo.connect(depth).connect(chain[0].frequency);
              sources.push(lfo);
            }
            const gain = ac.createGain();
            gain.gain.value = 0;
            [src, ...chain, gain].reduce((a, b) => a.connect(b));
            gain.connect(master);
            src.start(0, Math.random() * AMBIENT_LOOP);
            for (const s of sources.slice(1)) s.start();
            gain.gain.setTargetAtTime(AMBIENT_GAIN[kind], ac.currentTime, 0.4);
            layers.set(kind, {gain, sources});
          }
          function dropLayer(kind) {
            const layer = layers.get(kind);
            layers.delete(kind);
            layer.gain.gain.setTargetAtTime(0, ac.currentTime, 0.3);
            setTimeout(() => { for (const s of layer.sources) { try { s.stop(); } catch { /* 已停止 */ } } layer.gain.disconnect(); }, 2000);
          }
          function sync() {
            if (!ac) return;
            const {on} = ambientPrefs(prefsStore.getSnapshot().values);
            if (playing) {
              for (const k of on) if (!layers.has(k)) addLayer(k);
              for (const k of [...layers.keys()]) if (!on.includes(k)) dropLayer(k);
            }
            master.gain.setTargetAtTime(playing ? level() : 0, ac.currentTime, playing ? 0.5 : 0.25);
          }
          return {
            getSnapshot: () => playing,
            subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); },
            sync,
            play() {
              if (!ready()) return;
              clearTimeout(suspendTimer);
              if (ac.state !== 'running') ac.resume().catch(() => {});
              playing = true;
              sync();
              emit();
            },
            pause() {
              if (!playing) return;
              playing = false;
              sync();
              emit();
              clearTimeout(suspendTimer);
              suspendTimer = setTimeout(() => { if (!playing && ac) ac.suspend().catch(() => {}); }, 1500);
            },
            setVolume(v) {
              volume = v;
              if (ac && playing) master.gain.setTargetAtTime(level(), ac.currentTime, 0.05);
            },
            dispose() {
              clearTimeout(suspendTimer);
              if (ac) ac.close().catch(() => {});
              ac = null;
              playing = false;
              layers.clear();
              buffers.clear();
            },
          };
        })();
        const saveAmbient = patch => prefsStore.put({ambient: {...ambientPrefs(prefsStore.getSnapshot().values), ...patch}}).catch(() => {});
        // 开启「专注时自动播放」后，专注开始时跟着播放，结束或暂停时只停掉由专注启动的声音。
        ctx.effect(() => {
          let working = null;
          let byFocus = false;
          const check = () => {
            const snap = prefsStore.getSnapshot();
            if (!snap.loaded) return;
            const f = focusState(snap.values);
            const now = f.mode === 'work' && Boolean(f.endsAt);
            if (working !== null && now !== working && snap.values.ambientFocus === true) {
              working = now;
              if (now && !ambient.getSnapshot()) {
                byFocus = true;
                if (!ambientPrefs(snap.values).on.length) saveAmbient({on: ['rain']});
                ambient.play();
              } else if (!now && byFocus) {
                byFocus = false;
                ambient.pause();
              }
            }
            working = now;
            ambient.sync();
          };
          const off = prefsStore.subscribe(check);
          check();
          return () => { off(); ambient.dispose(); };
        }, 'dsh-workboard: ambient');

        const AMBIENT_ICONS = {
          rain: WX_PATHS.rain,
          waves: ['M2 9c2 0 3-2 5-2s3 2 5 2 3-2 5-2 3 2 5 2', 'M2 15c2 0 3-2 5-2s3 2 5 2 3-2 5-2 3 2 5 2'],
          wind: ['M3 8h11a3 3 0 1 0-3-3', 'M3 12h16a3 3 0 1 1-3 3', 'M3 16h7'],
          fire: ['M12 3c.5 3 4 5.5 4 10a4 4 0 0 1-8 0c0-2 1-3.5 2-4.5 0 1.5.5 2.5 1.5 3 0-3 0-5.5.5-8.5z'],
          pink: ['M3 12h2l2-6 3 12 3-14 3 16 2-8h3'],
          brown: ['M3 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0'],
        };
        const fillIcon = (size, d) => h('svg', {width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true}, h('path', {d}));
        const MEDIA = {
          play: 'M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z',
          pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
          next: 'M5 6.5v11a.8.8 0 0 0 1.2.7l8.3-5.5a.8.8 0 0 0 0-1.4L6.2 5.8A.8.8 0 0 0 5 6.5zM16.5 6h2v12h-2z',
          prev: 'M19 6.5v11a.8.8 0 0 1-1.2.7l-8.3-5.5a.8.8 0 0 1 0-1.4l8.3-5.5a.8.8 0 0 1 1.2.7zM5.5 6h2v12h-2z',
        };

        function Ambient({size}) {
          useLocale();
          const prefs = usePrefs();
          const playing = useSyncExternalStore(ambient.subscribe, ambient.getSnapshot, ambient.getSnapshot);
          const a = ambientPrefs(prefs);
          const [dragging, setDragging] = useState(null);
          const timer = useRef(null);
          useEffect(() => () => clearTimeout(timer.current), []);
          const toggle = kind => {
            const adding = !a.on.includes(kind);
            const on = adding ? [...a.on, kind] : a.on.filter(k => k !== kind);
            saveAmbient({on});
            if (!on.length) ambient.pause();
            else if (adding) ambient.play();
          };
          const playPause = () => {
            if (playing) { ambient.pause(); return; }
            if (!a.on.length) saveAmbient({on: ['rain']});
            ambient.play();
          };
          const setVolume = v => {
            setDragging(v);
            ambient.setVolume(v);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => { saveAmbient({volume: v}); ambient.setVolume(null); setDragging(null); }, 400);
          };
          const volume = dragging ?? a.volume;
          return h('div', {className: 'wb-amb', 'data-size': size, 'data-playing': playing ? '' : undefined},
            h('div', {className: 'wb-amtiles'}, AMBIENT.map(kind => h('button', {key: kind, type: 'button', className: 'wb-btn wb-amtile', 'aria-pressed': a.on.includes(kind), title: t(`am_${kind}`), onClick: () => toggle(kind)},
              svg(size === 's' ? 18 : 20, AMBIENT_ICONS[kind], 1.6), h('span', null, t(`am_${kind}`))))),
            h('div', {className: 'wb-amctl'},
              h('button', {type: 'button', className: 'wb-btn wb-amplay', 'aria-label': playing ? t('np_pause') : t('np_play'), title: playing ? t('np_pause') : t('np_play'), onClick: playPause}, fillIcon(14, playing ? MEDIA.pause : MEDIA.play)),
              h('input', {type: 'range', min: 0, max: 100, value: Math.round(volume * 100), 'aria-label': t('am_volume'), title: `${t('am_volume')} ${Math.round(volume * 100)}%`, onChange: e => setVolume(Number(e.target.value) / 100)})));
        }
        Ambient.workboard = {
          apiVersion: 1, sizes: ['m', 's', 'w', 't'], title: false, description: () => t('d_ambient'),
          settings: [{key: 'ambientFocus', type: 'toggle', scope: 'global', default: false, label: () => t('f_ambientFocus')}],
        };

        function parseLinks(text) {
          return String(text ?? '').split('\n').map(s => s.trim()).filter(Boolean).map(line => {
            const tokens = line.split(/\s+/);
            let i = tokens.findIndex(x => /^(https?:\/\/|mailto:)/i.test(x));
            if (i < 0) i = tokens.findIndex(x => /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(x));
            if (i < 0) return null;
            const href = /^(https?:|mailto:)/i.test(tokens[i]) ? tokens[i] : `https://${tokens[i]}`;
            let host;
            try {
              const u = new URL(href);
              if (!['http:', 'https:', 'mailto:'].includes(u.protocol)) return null;
              host = u.hostname.replace(/^www\./, '') || u.pathname;
            } catch { return null; }
            return {href, name: [...tokens.slice(0, i), ...tokens.slice(i + 1)].join(' ') || host};
          }).filter(Boolean).slice(0, 48);
        }

        function Links({config, openSettings}) {
          useLocale();
          const links = parseLinks(config?.links);
          if (!links.length) return h('div', {className: 'wb-hero'}, h('button', {type: 'button', className: 'wb-btn wb-cta', style: {alignSelf: 'flex-start'}, onClick: openSettings}, t('addLinks')));
          return h('div', {className: 'wb-links'}, links.map((l, i) => h('a', {key: i, className: 'wb-link', href: l.href, target: '_blank', rel: 'noopener noreferrer', title: l.href},
            h('i', null, ([...l.name][0] ?? '?').toUpperCase()), h('span', null, l.name))));
        }
        Links.workboard = {
          apiVersion: 1, sizes: ['m', 's', 'w', 't', 'l'], description: () => t('d_links'),
          settings: [{key: 'links', type: 'textarea', label: () => t('f_links'), placeholder: 'GitHub https://github.com'}],
        };

        // 卡片上省掉厂商前缀（Microsoft Word → Word），完整名称放在 title 里。
        const appShort = name => name.replace(/^(Microsoft|Google|Adobe|Tencent)\s+(?=\S)/, '');
        // macOS 上是 .app 路径，Windows 上是 AppID。
        const appFallback = id => id.replace(/!.*$/, '').split(/[\\/]/).filter(Boolean).pop()?.replace(/\.(app|exe)$|_[a-z0-9]{13}$/i, '') || id;

        // 选中的应用存在全局偏好里，各看板共用一份。
        function Apps() {
          useLocale();
          const prefs = usePrefs();
          const paths = Array.isArray(prefs.launcherApps) ? prefs.launcherApps.map(String) : [];
          const [picking, setPicking] = useState(false);
          const [query, setQuery] = useState('');
          const [busy, setBusy] = useState('');
          const [error, setError] = useState('');
          const res = useRemote('apps.get', paths.length ? {paths} : null, APPS_MS);
          const icons = useRemote('apps.icons', paths.length ? {paths} : null, APP_ICONS_MS);
          const all = useRemote('apps.list', picking ? {} : null, APP_LIST_MS);
          if (res.value?.supported === false || all.value?.supported === false) return blank(t('ap_unsupported'));
          const save = list => { void prefsStore.put({launcherApps: list.slice(0, MAX_APPS)}); };
          const fail = e => setError(String(e?.message || e));
          if (picking) {
            const q = query.trim().toLowerCase();
            const installed = all.value?.items ?? [];
            const known = new Set(installed.map(a => a.path));
            const lang = t('lang');
            const items = [
              ...paths.filter(p => !known.has(p)).map(p => ({path: p, name: appFallback(p), missing: true})),
              ...[...installed].sort((a, b) => a.name.localeCompare(b.name, lang)),
            ].filter(a => !q || `${a.name} ${baseName(a.path)}`.toLowerCase().includes(q));
            const full = paths.length >= MAX_APPS;
            return h(React.Fragment, null,
              h('input', {className: 'wb-input wb-search', autoFocus: true, value: query, placeholder: t('ap_search'), onChange: e => setQuery(e.target.value)}),
              h('div', {className: 'wb-rows'},
                !all.value ? blank(all.error || '…') : items.length ? items.slice(0, 200).map(a => {
                  const on = paths.includes(a.path);
                  return h('button', {key: a.path, type: 'button', className: 'wb-btn wb-row wb-rowbtn', 'aria-pressed': on, 'data-dim': a.missing ? '' : undefined, disabled: !on && full, title: a.path,
                    onClick: () => save(on ? paths.filter(p => p !== a.path) : [...paths, a.path])},
                    on ? h(Icon.check) : h(Icon.plus),
                    h('div', null, h('b', null, a.name), h('small', null, a.missing ? t('ap_missing') : a.path.startsWith('/') ? parentName(a.path) : '')));
                }) : blank(t('ap_none'))),
              h('div', {className: 'wb-notefoot'}, h('span', null, fill(t('ap_count'), {n: paths.length})),
                h('button', {type: 'button', className: 'wb-btn', onClick: () => { setPicking(false); setQuery(''); }}, t('doneEdit'))));
          }
          if (!paths.length) return h('div', {className: 'wb-hero'}, h('button', {type: 'button', className: 'wb-btn wb-cta', style: {alignSelf: 'flex-start'}, onClick: () => setPicking(true)}, t('ap_add')));
          const v = res.value;
          if (!v) return blank(res.error || '…');
          const launch = a => {
            setBusy(a.path);
            call('apps.launch', {path: a.path}).then(() => { setError(''); setTimeout(res.reload, 1000); }, fail).finally(() => setBusy(''));
          };
          return h(React.Fragment, null,
            h('div', {className: 'wb-links wb-apps'},
              v.items.map(a => {
                const src = icons.value?.[a.path];
                return h('button', {key: a.path, type: 'button', className: 'wb-btn wb-link', disabled: a.missing, title: a.missing ? `${a.name} · ${t('ap_missing')}` : a.name,
                  'data-running': a.running ? '' : undefined, 'data-busy': busy === a.path ? '' : undefined, onClick: () => launch(a)},
                  h('i', {'data-img': src ? '' : undefined}, src ? h('img', {src, alt: '', draggable: false}) : ([...a.name][0] ?? '?').toUpperCase()),
                  h('span', null, appShort(a.name)));
              }),
              h('button', {type: 'button', className: 'wb-btn wb-link', 'data-add': '', title: t('ap_add'), onClick: () => setPicking(true)}, h('i', null, h(Icon.plus)), h('span', null, t('edit')))),
            error ? h('div', {className: 'wb-calerr', title: error}, error) : null);
        }
        Apps.workboard = {apiVersion: 1, sizes: ['m', 's', 'w', 't', 'l'], description: () => t('d_apps')};

        function Progress({size}) {
          useLocale();
          const now = useNow();
          const prefs = usePrefs();
          const weekStart = prefs.weekStart != null ? Number(prefs.weekStart) : (t('lang').startsWith('zh') ? 1 : 0);
          const [y, m, d] = [now.getFullYear(), now.getMonth(), now.getDate()];
          const back = (now.getDay() - weekStart + 7) % 7;
          const spans = [
            ['p_day', new Date(y, m, d), new Date(y, m, d + 1)],
            ['p_week', new Date(y, m, d - back), new Date(y, m, d - back + 7)],
            ['p_month', new Date(y, m, 1), new Date(y, m + 1, 1)],
            ['p_year', new Date(y, 0, 1), new Date(y + 1, 0, 1)],
          ];
          return h('div', {className: 'wb-prog', 'data-size': size}, spans.map(([key, a, b]) => {
            const pct = Math.min(100, Math.max(0, (now - a) / (b - a) * 100));
            return h('div', {key, className: 'wb-prow'}, h('span', null, t(key)),
              h('div', {className: 'wb-pbar'}, h('i', {style: {width: `${pct}%`}})), h('span', {className: 'wb-num'}, `${Math.floor(pct)}%`));
          }));
        }
        Progress.workboard = {apiVersion: 1, sizes: ['m', 's', 'w'], description: () => t('d_progress')};

        function widgetList() {
          return ctx.slots.entries(SLOT).map(entry => {
            const {id, label} = entry.options;
            const manifest = entry.component?.workboard ?? {};
            const declared = (Array.isArray(manifest.sizes) ? manifest.sizes : []).filter(s => SIZES[s]);
            const sizes = declared.length ? Object.keys(SIZES).filter(s => declared.includes(s)) : ['m'];
            return {
              id: id ?? '',
              label: () => resolveText(label) || id,
              description: manifest.description,
              category: CATEGORIES.includes(manifest.category) ? manifest.category : 'plugin',
              sizes,
              defaultSize: sizes.includes(manifest.defaultSize) ? manifest.defaultSize : (declared[0] ?? 'm'),
              banner: manifest.banner === true,
              title: manifest.title !== false,
              settings: Array.isArray(manifest.settings) ? manifest.settings.filter(f => f && typeof f.key === 'string') : [],
              custom: typeof manifest.custom === 'string' ? manifest.custom : '',
            };
          });
        }
        const widgets = (() => {
          let version = -1;
          let list = [];
          return {
            getSnapshot() {
              const next = ctx.slots.getVersion(SLOT);
              if (next !== version) { version = next; list = widgetList(); }
              return list;
            },
            subscribe: fn => ctx.slots.subscribe(SLOT, fn),
          };
        })();

        function Modal({title, onClose, children, footer, wide}) {
          useEffect(() => {
            const onKey = e => { if (e.key === 'Escape') onClose(); };
            window.addEventListener('keydown', onKey);
            return () => window.removeEventListener('keydown', onKey);
          }, [onClose]);
          return h('div', {className: 'wb-overlay', onMouseDown: e => { if (e.target === e.currentTarget) onClose(); }},
            h('div', {className: 'wb-modal', 'data-wide': wide ? '' : undefined, role: 'dialog', 'aria-modal': true, 'aria-label': title},
              h('h2', null, title), children, footer ? h('div', {className: 'wb-foot'}, footer) : null));
        }

        function LocationField({value, onChange}) {
          const [query, setQuery] = useState('');
          const [results, setResults] = useState(null);
          useEffect(() => {
            if (query.trim().length < 2) { setResults(null); return undefined; }
            let alive = true;
            const id = setTimeout(() => {
              call('geo.search', {query, lang: t('lang').slice(0, 2)}).then(r => { if (alive) setResults(r); }, () => { if (alive) setResults([]); });
            }, 350);
            return () => { alive = false; clearTimeout(id); };
          }, [query]);
          return h(React.Fragment, null,
            value ? h('div', {className: 'wb-loc'}, h('b', null, value.name), h('span', {className: 'wb-muted'}, value.region ?? ''),
              h('span', {className: 'wb-spacer'}), h('button', {type: 'button', className: 'wb-btn wb-cta', onClick: () => onChange(null)}, t('clear'))) : null,
            h('input', {className: 'wb-input', value: query, placeholder: t('searchCity'), onChange: e => setQuery(e.target.value)}),
            results ? h('div', {className: 'wb-results'}, results.length ? results.map(r => h('button', {key: `${r.lat},${r.lon}`, type: 'button', className: 'wb-btn', onClick: () => { onChange(r); setQuery(''); setResults(null); }},
              h('b', null, r.name), ' ', h('span', {className: 'wb-muted'}, r.region))) : h('span', {className: 'wb-muted'}, t('noResults'))) : null);
        }

        const fieldDefault = f => (typeof f.default === 'function' ? f.default() : f.default);
        const fieldView = (f, v, set) => {
          const label = resolveText(f.label) || f.key;
          if (f.type === 'toggle') return h('label', {key: f.key, className: 'wb-check'}, h('input', {type: 'checkbox', checked: v !== false && v != null, onChange: e => set(f.key, e.target.checked)}), label);
          let control;
          if (f.type === 'location') control = h(LocationField, {value: v, onChange: x => set(f.key, x)});
          else if (f.type === 'select') control = h('select', {className: 'wb-input', value: v ?? '', onChange: e => set(f.key, e.target.value)},
            (f.options ?? []).map(o => h('option', {key: o.value, value: o.value}, resolveText(o.label) || o.value)));
          else if (f.type === 'textarea') control = h('textarea', {className: 'wb-input', value: v ?? '', placeholder: f.placeholder, spellCheck: false, onChange: e => set(f.key, e.target.value)});
          else control = h('input', {className: 'wb-input', value: v ?? '', placeholder: f.placeholder, onChange: e => set(f.key, e.target.value)});
          return h('div', {key: f.key, className: 'wb-field'}, h('span', null, label), control);
        };

        function SettingsModal({widget, cell, onSaveConfig, onClose}) {
          const prefs = usePrefs();
          const fields = widget.settings;
          const initial = () => Object.fromEntries(fields.map(f => {
            const stored = f.scope === 'global' ? prefs[f.key] : cell?.config?.[f.key];
            return [f.key, stored ?? fieldDefault(f)];
          }));
          const [values, setValues] = useState(initial);
          const [error, setError] = useState('');
          const set = (key, v) => setValues(x => ({...x, [key]: v}));
          const save = async () => {
            const global = {};
            const local = {...(cell?.config ?? {})};
            for (const f of fields) (f.scope === 'global' ? global : local)[f.key] = values[f.key] ?? null;
            try {
              if (Object.keys(global).length) await prefsStore.put(global);
              if (cell && fields.some(f => f.scope !== 'global')) onSaveConfig(local);
              onClose();
            } catch (e) { setError(String(e?.message || e)); }
          };
          return h(Modal, {title: `${widget.label()} · ${t('settings')}`, onClose,
            footer: [h('button', {key: 'c', type: 'button', className: 'wb-action', onClick: onClose}, t('cancel')),
              h('button', {key: 's', type: 'button', className: 'wb-action', 'data-primary': '', onClick: save}, t('save'))]},
          fields.map(f => fieldView(f, values[f.key], set)), error ? h('div', {className: 'wb-error'}, error) : null);
        }

        // 「设置 → 工作台」；与卡片弹窗里 scope: 'global' 的字段读写同一份 prefs。
        const SETTING_GROUPS = [
          ['cfg_personal', [NAME_FIELD, WEEK_START_FIELD]],
          ['weather', LOCATION_FIELDS],
          ['quote', QUOTE_FIELDS],
        ];
        const SETTING_FIELDS = SETTING_GROUPS.flatMap(([, fields]) => fields);

        function WorkboardSettings() {
          useLocale();
          const prefsSnap = useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, prefsStore.getSnapshot);
          useEffect(() => { void prefsStore.load(); }, []);
          const prefs = prefsSnap.values;
          const stored = () => Object.fromEntries(SETTING_FIELDS.map(f => [f.key, prefs[f.key] ?? fieldDefault(f)]));
          const [values, setValues] = useState(null);
          const [status, setStatus] = useState('');
          useEffect(() => { if (prefsSnap.loaded && !values) setValues(stored()); }, [prefsSnap.loaded]);

          if (!values) return null;
          const dirty = SETTING_FIELDS.some(f => JSON.stringify(values[f.key] ?? null) !== JSON.stringify(stored()[f.key] ?? null));
          const set = (key, v) => { setValues(x => ({...x, [key]: v})); setStatus(''); };
          const save = async () => {
            try {
              await prefsStore.put(Object.fromEntries(SETTING_FIELDS.map(f => [f.key, values[f.key] ?? null])));
              setStatus(t('saved'));
            } catch (e) { setStatus(String(e?.message || e)); }
          };
          return h('div', {className: 'wb-settings'},
            h('h2', null, t('title')),
            SETTING_GROUPS.map(([title, fields]) => h('section', {key: title},
              h('h3', null, t(title)), fields.map(f => fieldView(f, values[f.key], set)))),
            h('div', {className: 'wb-foot'},
              status ? h('span', {className: 'wb-muted', role: 'status'}, status) : null,
              h('button', {type: 'button', className: 'wb-action', 'data-primary': '', disabled: !dirty, onClick: save}, t('save'))));
        }

        function Gallery({list, board, onAdd, onGenerate, onImport, onClose}) {
          const [cat, setCat] = useState('all');
          const [query, setQuery] = useState('');
          const q = query.trim().toLowerCase();
          const placed = new Set(board.widgets.map(c => c.id));
          const present = CATEGORIES.filter(c => list.some(w => w.category === c));
          const shown = list.filter(w => (cat === 'all' || w.category === cat)
            && (!q || `${w.label()} ${resolveText(w.description)} ${w.id}`.toLowerCase().includes(q)));
          const card = w => {
            const done = placed.has(w.id);
            return h('button', {key: w.id, type: 'button', className: 'wb-btn wb-gcard', disabled: done, onClick: () => onAdd(w)},
              h('span', {className: 'wb-gname'}, h('b', null, w.label()), done ? h('small', null, t('added')) : h(Icon.plus)),
              w.description ? h('small', null, resolveText(w.description)) : null);
          };
          const grid = items => h('div', {className: 'wb-ggrid'},
            [...items.filter(w => !placed.has(w.id)), ...items.filter(w => placed.has(w.id))].map(card));
          const body = !shown.length ? h('div', {className: 'wb-blank wb-muted'}, t('noResults'))
            : cat === 'all' && !q ? present.map(c => h('section', {key: c, className: 'wb-gsec'}, h('h3', null, t(`cat_${c}`)), grid(shown.filter(w => w.category === c))))
              : grid(shown);
          return h(Modal, {title: t('addWidget'), onClose, wide: true,
            footer: h('button', {type: 'button', className: 'wb-action', 'data-primary': '', onClick: onClose}, t('doneEdit'))},
          h('div', {className: 'wb-gtop'},
            h('input', {className: 'wb-input', autoFocus: true, value: query, placeholder: t('searchWidget'), 'aria-label': t('searchWidget'), onChange: e => setQuery(e.target.value)}),
            h('div', {className: 'wb-tabs', role: 'tablist'}, ['all', ...present].map(c => h('button', {key: c, type: 'button', role: 'tab',
              className: 'wb-btn wb-tab', 'aria-selected': c === cat, onClick: () => setCat(c)}, t(`cat_${c}`))))),
          h('div', {className: 'wb-gbody'},
            q ? null : h('div', {className: 'wb-gacts'},
              h('button', {type: 'button', className: 'wb-btn wb-gcard wb-gen', onClick: onGenerate},
                h('span', {className: 'wb-gname'}, h('b', null, t('gen_card')), h(Icon.sparkle)), h('small', null, t('gen_hint'))),
              h('button', {type: 'button', className: 'wb-btn wb-gcard wb-gen', onClick: onImport},
                h('span', {className: 'wb-gname'}, h('b', null, t('imp_card')), h(Icon.import)), h('small', null, t('imp_hint')))),
            body));
        }

        const relTime = (ms, nowMs) => {
          const rtf = new Intl.RelativeTimeFormat(t('lang'), {numeric: 'auto', style: 'short'});
          const diff = ms - nowMs;
          const abs = Math.abs(diff);
          if (abs < 60_000) return rtf.format(0, 'second');
          if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute');
          if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), 'hour');
          return rtf.format(Math.round(diff / 86_400_000), 'day');
        };
        const baseName = path => String(path ?? '').split('/').filter(Boolean).pop() ?? '';

        // 新会话的工作区：各 Agent widget 共用一个选择，存在 prefs.agentWorkspace（目录路径，'' 为默认）。
        const useWorkspace = fallback => {
          const prefs = usePrefs();
          const res = useRemote('workspace.list', {}, WORKSPACE_MS);
          const list = res.value ?? [];
          const path = prefs.agentWorkspace ?? fallback ?? '';
          return {list, path, id: list.find(w => w.path === path)?.id, set: p => { void prefsStore.put({agentWorkspace: p}); }};
        };
        function WorkspaceSelect({ws}) {
          if (!ws.list.length) return null;
          const extra = ws.path && !ws.list.some(w => w.path === ws.path);
          const name = ws.list.find(w => w.path === ws.path)?.title || baseName(ws.path);
          return h('span', {className: 'wb-wsel', 'data-set': ws.path ? '' : undefined, title: `${t('ws_label')}: ${ws.path ? `${name} · ${ws.path}` : t('ws_default')}`},
            h(Icon.folder),
            h('select', {value: ws.path, 'aria-label': t('ws_label'), onChange: e => ws.set(e.target.value)},
              h('option', {value: ''}, t('ws_default')),
              extra ? h('option', {value: ws.path}, baseName(ws.path) || ws.path) : null,
              ws.list.map(w => h('option', {key: w.id, value: w.path}, w.title || baseName(w.path)))));
        }

        function Agents({size, config}) {
          useLocale();
          const now = useNow();
          const res = useRemote('agent.overview', {}, AGENT_MS);
          const ui = ctx.get?.('uiWorkspace');
          const ws = useWorkspace();
          const v = res.value;
          if (!v) return h('div', {className: 'wb-blank'}, res.error || '…');
          if (!v.sessions) return h('div', {className: 'wb-blank'}, t('agentsUnavailable'));
          const lang = t('lang');
          const nowMs = now.getTime();
          const active = v.sessions.filter(s => s.waiting || s.running);
          const recent = config?.showRecent !== false;
          const compact = size === 'm';
          const sessions = compact ? (active.length || !recent ? active : v.sessions.slice(0, 2)) : (recent ? v.sessions.slice(0, 12) : active);
          const schedules = !compact && config?.showSchedules !== false ? v.schedules ?? [] : [];
          const sessionRow = s => {
            const state = s.waiting ? 'waiting' : s.running ? 'running' : undefined;
            const status = s.waiting ? t('waitingYou') : s.running ? t('running') : relTime(s.updatedAt, nowMs);
            return h('button', {key: s.id, type: 'button', className: 'wb-btn wb-row wb-rowbtn', 'data-state': state, title: s.cwd || undefined, onClick: () => ui?.openSession?.(s.id)},
              h('span', {className: 'wb-dot', 'data-state': state}),
              h('div', null, h('b', null, s.title || t('untitledSession')), h('small', null, [status, baseName(s.cwd)].filter(Boolean).join(' · '))));
          };
          const taskRow = k => h('div', {key: k.id, className: 'wb-row'},
            h('span', {className: 'wb-dot', 'data-state': k.running ? 'running' : undefined}),
            h('div', null, h('b', null, k.title),
              h('small', null, k.running ? t('executing') : `${relTime(k.scheduledAt, nowMs)} · ${new Date(k.scheduledAt).toLocaleString(lang, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}`)));
          return h(React.Fragment, null,
            h('div', {className: 'wb-rows'},
              sessions.length ? sessions.map(sessionRow) : h('div', {className: 'wb-blank'}, v.sessions.length ? t('noActive') : t('noSessions')),
              schedules.length ? h('div', {className: 'wb-sect'}, t('schedules')) : null,
              schedules.map(taskRow)),
            h('div', {className: 'wb-notefoot'},
              h('span', null, active.length ? fill(t('activeCount'), {n: active.length}) : ''),
              typeof ui?.startSession === 'function' ? h('div', {className: 'wb-footact'}, h(WorkspaceSelect, {ws}),
                h('button', {type: 'button', className: 'wb-btn', onClick: () => ui.startSession(ws.id)}, t('newSession'))) : null));
        }
        Agents.workboard = {
          apiVersion: 1, sizes: ['t', 'l', 'm', 'w'], description: () => t('d_agents'),
          settings: [
            {key: 'showRecent', type: 'toggle', default: true, label: () => t('f_showRecent')},
            {key: 'showSchedules', type: 'toggle', default: true, label: () => t('f_showSchedules')},
          ],
        };

        function Feed({size, config}) {
          useLocale();
          const now = useNow();
          const urls = String(config?.urls || t('defaultFeeds')).split(/\s+/).filter(Boolean);
          const rsshub = String(config?.rsshub ?? '').trim();
          const res = useRemote('feed.get', {urls, rsshub, limit: 40}, FEED_MS);
          const all = res.value?.items ?? [];
          const failed = res.value?.errors?.length ?? 0;
          const many = urls.length > 1;
          const keyOf = it => it.link || it.guid || '';
          const read = useRead(all.map(keyOf).filter(Boolean));
          const unread = all.map(keyOf).filter(k => k && !read.has(k));
          const items = config?.hideRead ? all.filter(it => !read.has(keyOf(it))) : all;
          return h(React.Fragment, null,
            h('div', {className: 'wb-rows'},
              items.length ? null : h('div', {className: 'wb-blank'}, res.pending ? '…' : res.error || t('noItems')),
              items.map((it, i) => h(it.link ? 'a' : 'div', {key: keyOf(it) || i, className: 'wb-row wb-rowbtn', title: it.title, ...(keyOf(it) ? readProps(read, keyOf(it)) : {}), ...(it.link ? {href: it.link, target: '_blank', rel: 'noopener noreferrer'} : {})},
                h('div', null, h('b', null, it.title || it.link),
                  size === 'w' && !many ? null : h('small', null, [many ? it.feed : '', it.date ? relTime(it.date, now.getTime()) : ''].filter(Boolean).join(' · '))),
                size === 'w' && !many && it.date ? h('time', null, relTime(it.date, now.getTime())) : null))),
            failed ? h('div', {className: 'wb-calerr', title: res.value.errors.map(e => `${e.url}: ${e.message}`).join('\n')}, fill(t('feedError'), {n: failed})) : null,
            unread.length ? h('div', {className: 'wb-notefoot'},
              h('span', null, fill(t('unreadCount'), {n: unread.length})),
              h('button', {type: 'button', className: 'wb-btn', onClick: () => markRead(unread)}, t('markAllRead'))) : null);
        }
        Feed.workboard = {
          apiVersion: 1, sizes: ['t', 'l', 'm', 'w'], description: () => t('d_feed'),
          settings: [
            {key: 'urls', type: 'textarea', label: () => t('f_feeds'), default: () => t('defaultFeeds')},
            {key: 'rsshub', type: 'text', label: () => t('f_rsshub'), placeholder: 'https://rsshub.example.com'},
            {key: 'hideRead', type: 'toggle', default: false, label: () => t('f_hideRead')},
          ],
        };

        function Habits({size}) {
          useLocale();
          const now = useNow();
          const [habits, setHabits] = useState(null);
          const [text, setText] = useState('');
          const [error, setError] = useState('');
          const fail = e => setError(String(e?.message || e));
          const load = () => call('habit.list').then(list => { setHabits(list); setError(''); }, fail);
          useEffect(() => {
            load();
            window.addEventListener('focus', load);
            return () => window.removeEventListener('focus', load);
          }, []);
          const lang = t('lang');
          const count = size === 't' ? 5 : 7;
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const keys = Array.from({length: count}, (_, i) => dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (count - 1 - i))));
          const todayKey = keys[count - 1];
          const streak = habit => {
            const done = new Set(habit.days);
            const d = new Date(today);
            if (!done.has(dayKey(d))) d.setDate(d.getDate() - 1);
            let n = 0;
            while (done.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
            return n;
          };
          const toggle = (habit, day) => {
            const done = !habit.days.includes(day);
            setHabits(list => list.map(x => (x.id === habit.id ? {...x, days: done ? [...x.days, day] : x.days.filter(k => k !== day)} : x)));
            call('habit.check', {id: habit.id, day, done}).then(next => setHabits(list => list.map(x => (x.id === next.id ? next : x))), e => { fail(e); load(); });
          };
          const remove = habit => {
            setHabits(list => list.filter(x => x.id !== habit.id));
            call('habit.remove', {id: habit.id}).catch(e => { fail(e); load(); });
          };
          const submit = e => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing || !text.trim()) return;
            const name = text.trim();
            setText('');
            call('habit.add', {name}).then(habit => setHabits(list => [...(list ?? []), habit]), err => { setText(name); fail(err); });
          };
          const head = habits?.length ? h('div', {className: 'wb-hrow', 'data-head': ''},
            h('b'),
            h('div', {className: 'wb-hdays'}, keys.map(k => h('span', {key: k, 'data-today': k === todayKey ? '' : undefined,
              title: keyDate(k).toLocaleDateString(lang, {month: 'short', day: 'numeric', weekday: 'short'})},
              k === todayKey && lang.startsWith('zh') ? t('todayShort') : keyDate(k).toLocaleDateString(lang, {weekday: 'narrow'})))),
            size === 't' ? null : h('small'),
            h('i', {className: 'wb-hsp'})) : null;
          return h(React.Fragment, null,
            h('div', {className: 'wb-rows wb-habits', 'data-compact': size === 't' ? '' : undefined},
              habits && !habits.length ? h('div', {className: 'wb-blank'}, t('noHabits')) : null,
              head,
              (habits ?? []).map(habit => {
                const n = streak(habit);
                return h('div', {key: habit.id, className: 'wb-hrow'},
                  h('b', {title: habit.name}, habit.name),
                  h('div', {className: 'wb-hdays'}, keys.map(k => {
                    const done = habit.days.includes(k);
                    const label = fill(t('markDay'), {d: keyDate(k).toLocaleDateString(lang, {month: 'short', day: 'numeric', weekday: 'short'})});
                    return h('button', {key: k, type: 'button', className: 'wb-btn wb-hday', 'data-done': done ? '' : undefined, 'data-today': k === todayKey ? '' : undefined,
                      'aria-label': label, 'aria-pressed': done, title: label, onClick: () => toggle(habit, k)}, done ? h(Icon.check) : null);
                  })),
                  size === 't' ? null : h('small', {className: 'wb-num'}, n ? fill(t('streak'), {n}) : ''),
                  h('button', {type: 'button', className: 'wb-btn wb-del', 'aria-label': t('remove'), title: t('remove'), onClick: () => remove(habit)}, h(Icon.x)));
              })),
            error ? h('div', {className: 'wb-calerr'}, error) : null,
            h('label', {className: 'wb-add'}, h(Icon.plus),
              h('input', {value: text, placeholder: t('addHabit'), enterKeyHint: 'done', onChange: e => setText(e.target.value), onKeyDown: submit})));
        }
        Habits.workboard = {apiVersion: 1, sizes: ['m', 'l', 't', 'w'], description: () => t('d_habits')};

        // 新开会话并直接发送；Host 不支持时退回到把 prompt 预填进新会话草稿。
        const launch = async (prompt, cwd, workspaceId) => {
          const ui = ctx.get?.('uiWorkspace');
          try {
            const {sessionId} = await call('agent.start', {prompt, cwd: cwd || undefined, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone});
            ui?.openSession?.(sessionId);
          } catch (error) {
            if (typeof ui?.startSession !== 'function' || !/cannot start sessions/.test(String(error?.message))) throw error;
            ui.startSession(workspaceId, {prompt, whenDraftExists: 'replace'});
          }
        };
        const parsePresets = text => String(text ?? '').split('\n').map(line => {
          const i = line.indexOf('|');
          const name = (i < 0 ? line : line.slice(0, i)).trim();
          const prompt = (i < 0 ? line : line.slice(i + 1)).trim();
          return name && prompt ? {name, prompt} : null;
        }).filter(Boolean).slice(0, 20);

        function Prompt({size, config}) {
          useLocale();
          const [text, setText] = useState('');
          const [busy, setBusy] = useState(false);
          const [error, setError] = useState('');
          const presets = parsePresets(config?.presets ?? t('defaultPresets'));
          const ws = useWorkspace(config?.cwd);
          const send = prompt => {
            if (busy || !prompt.trim()) return;
            setBusy(true);
            setError('');
            launch(prompt.trim(), ws.path, ws.id).then(() => setText(''), e => setError(String(e?.message || e))).finally(() => setBusy(false));
          };
          const onKeyDown = e => {
            if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
            e.preventDefault();
            send(text);
          };
          return h('div', {className: 'wb-prompt', 'data-size': size},
            size === 's' ? null : h('div', {className: 'wb-pbox', 'data-ws': ws.list.length ? '' : undefined},
              h('textarea', {value: text, placeholder: t('promptPlaceholder'), disabled: busy, spellCheck: false, onChange: e => setText(e.target.value), onKeyDown}),
              h(WorkspaceSelect, {ws})),
            presets.length ? h('div', {className: 'wb-chips'}, presets.map((p, i) => h('button', {key: i, type: 'button', className: 'wb-btn wb-chip', title: p.prompt, disabled: busy, onClick: () => send(p.prompt)}, p.name))) : null,
            busy || error ? h('div', {className: error ? 'wb-calerr' : 'wb-muted', style: {fontSize: 12}}, error || t('sending')) : null);
        }
        Prompt.workboard = {
          apiVersion: 1, sizes: ['m', 'w', 'l', 't', 's'], description: () => t('d_prompt'),
          settings: [
            {key: 'presets', type: 'textarea', label: () => t('f_presets'), default: () => t('defaultPresets')},
            {key: 'cwd', type: 'text', label: () => t('f_cwd'), placeholder: '~/Vibe/project'},
          ],
        };

        // 自定义 widget：Agent 用 workboard_widget 写入的 HTML，跑在无同源权限的沙箱 iframe 里，只能通过 postMessage 桥接访问工作台。
        // iframe 拿不到宿主的主题变量：由父页面读出实际值传进去，切换明暗时重发。
        const readTheme = el => {
          const style = getComputedStyle(el);
          const vars = {};
          for (const [name, token] of Object.entries(FRAME_TOKENS)) {
            const v = style.getPropertyValue(token).trim();
            if (v) vars[name] = v;
          }
          vars['--font'] = style.fontFamily || 'system-ui, sans-serif';
          const bg = vars['--bg'] ? rgbOf(vars['--bg']) : null;
          const accent = vars['--accent'] ? rgbOf(vars['--accent']) : null;
          vars['--on-accent'] = accent && luminance(accent) > 0.45 ? '#000' : '#fff';
          return {theme: bg && luminance(bg) < 0.4 ? 'dark' : 'light', vars};
        };
        function useFrameTheme(ref) {
          const [theme, setTheme] = useState(null);
          useEffect(() => {
            const el = ref.current;
            if (!el) return undefined;
            let last = '';
            const update = () => {
              const next = readTheme(el);
              const key = JSON.stringify(next);
              if (key !== last) { last = key; setTheme(next); }
            };
            update();
            const observer = new MutationObserver(update);
            observer.observe(document.documentElement, {attributes: true});
            if (document.body) observer.observe(document.body, {attributes: true});
            const media = window.matchMedia?.('(prefers-color-scheme: dark)');
            media?.addEventListener?.('change', update);
            const id = setInterval(() => { if (!document.hidden) update(); }, 3000);
            return () => { observer.disconnect(); media?.removeEventListener?.('change', update); clearInterval(id); };
          }, []);
          return theme;
        }

        const customDefaults = (settings, config) => Object.fromEntries((settings ?? []).map(f => [f.key, config?.[f.key] ?? fieldDefault(f) ?? (f.type === 'toggle' ? false : '')]));

        function CustomWidget({id, size, config, editing}) {
          useLocale();
          const summary = useSyncExternalStore(customs.subscribe, () => customs.get(id), () => customs.get(id));
          const wrapRef = useRef(null);
          const frameRef = useRef(null);
          const theme = useFrameTheme(wrapRef);
          const ws = useWorkspace();
          const [def, setDef] = useState(null);
          const [error, setError] = useState('');
          const [loadError, setLoadError] = useState('');
          const rev = summary?.rev ?? 0;
          const dataRev = summary?.dataRev ?? 0;

          useEffect(() => {
            if (!rev || (def && def.rev === rev && def.dataRev >= dataRev)) return undefined;
            let alive = true;
            call('widget.get', {id}).then(w => { if (alive) { setDef(w); setLoadError(''); } }, e => { if (alive) setLoadError(String(e?.message || e)); });
            return () => { alive = false; };
          }, [id, rev, dataRev]);

          const lang = t('lang');
          const state = {
            size, config: customDefaults(summary?.settings, config), data: def?.data ?? null, dataAt: def?.dataAt ?? 0,
            theme: theme?.theme ?? 'light', lang, vars: theme?.vars ?? {},
          };
          const stateRef = useRef(state);
          stateRef.current = state;
          const live = useRef({});
          live.current = {ws, summary, error};
          const doc = React.useMemo(() => (def && theme ? frameDoc(def.html, stateRef.current) : ''), [def?.rev, def?.html, lang, Boolean(theme)]);
          const post = msg => frameRef.current?.contentWindow?.postMessage({ns: FRAME_NS, ...msg}, '*');
          const stateKey = JSON.stringify(state);
          useEffect(() => { post({type: 'state', state}); }, [stateKey]);

          // 新版本跑起来 5 秒内没报错，就清掉 Host 上记着的旧错误。
          useEffect(() => {
            setError('');
            if (!doc) return undefined;
            const timer = setTimeout(() => {
              if (!live.current.error && live.current.summary?.lastError) call('widget.report', {id, error: ''}).catch(() => {});
            }, 5000);
            return () => clearTimeout(timer);
          }, [doc]);

          useEffect(() => {
            let askedAt = 0;
            let reported = '';
            const onMessage = event => {
              const frame = frameRef.current;
              const m = event.data;
              if (!frame || event.source !== frame.contentWindow || !m || m.ns !== FRAME_NS) return;
              const reply = (ok, value) => post(ok ? {type: 'reply', id: m.id, ok, value} : {type: 'reply', id: m.id, ok, error: value});
              const fail = e => reply(false, String(e?.message || e));
              if (m.type === 'ready') post({type: 'state', state: stateRef.current});
              else if (m.type === 'fetch') call('widget.fetch', {id, url: m.url, as: m.as, fresh: m.fresh === true}).then(v => reply(true, v), fail);
              else if (m.type === 'save') {
                call('widget.save', {id, data: m.data}).then(r => {
                  setDef(d => (d ? {...d, data: m.data ?? null, dataRev: r.dataRev, dataAt: r.dataAt} : d));
                  reply(true, r);
                }, fail);
              } else if (m.type === 'open') {
                const url = safeLink(m.url);
                if (url) window.open(url, '_blank', 'noopener,noreferrer');
              } else if (m.type === 'ask') {
                const ui = ctx.get?.('uiWorkspace');
                const prompt = String(m.prompt ?? '').trim().slice(0, 20_000);
                if (!prompt || typeof ui?.startSession !== 'function' || Date.now() - askedAt < 3000) return;
                askedAt = Date.now();
                ui.startSession(live.current.ws.id, {prompt, whenDraftExists: 'replace'});
              } else if (m.type === 'error') {
                const message = String(m.message ?? '').slice(0, 2000);
                const text = m.line > 0 ? `line ${m.line}: ${message}` : message;
                setError(text);
                if (text !== reported) { reported = text; call('widget.report', {id, error: text}).catch(() => {}); }
              }
            };
            window.addEventListener('message', onMessage);
            return () => window.removeEventListener('message', onMessage);
          }, [id]);

          const fix = () => {
            const title = summary?.title ?? id;
            launch(fill(t('cw_fixPrompt'), {title, id, error}), ws.path, ws.id).catch(e => setLoadError(String(e?.message || e)));
          };
          return h('div', {ref: wrapRef, className: 'wb-cw'},
            doc ? h('iframe', {
              ref: frameRef, className: 'wb-cwframe', title: summary?.title ?? id, sandbox: 'allow-scripts', srcDoc: doc,
              style: {colorScheme: theme.theme, pointerEvents: editing ? 'none' : undefined},
            }) : null,
            loadError ? h('div', {className: 'wb-calerr'}, loadError) : null,
            error ? h('div', {className: 'wb-cwerr', role: 'alert'},
              h('span', {title: error}, error),
              h('button', {type: 'button', className: 'wb-btn', onClick: fix}, h(Icon.sparkle), t('cw_fix'))) : null);
        }

        // 自定义 widget 的清单：面板可见时轮询，每个 widget 动态注册进 workboard.widget，组件库、看板和设置弹窗照常工作。
        // 只有标题、尺寸、设置等 manifest 变化才重新注册；HTML 和数据的变化由卡片按 rev 自行拉取。
        const customs = (() => {
          let byId = new Map();
          const regs = new Map();
          const listeners = new Set();
          const manifestKey = w => JSON.stringify([w.title, w.description, w.sizes, w.defaultSize, w.header, w.settings]);
          const register = w => {
            const Component = props => h(CustomWidget, {...props, id: w.id});
            Component.workboard = {apiVersion: 1, sizes: w.sizes, defaultSize: w.defaultSize, title: w.header !== false, description: w.description, category: 'mine', settings: w.settings, custom: w.id};
            return ctx.slots.inject(SLOT, () => ctx.slots.register({name: SLOT, id: `${CUSTOM_PREFIX}${w.id}`, order: 10_000, label: w.title}, Component));
          };
          const sync = next => {
            const ids = new Set(next.map(w => w.id));
            for (const [id, reg] of regs) if (!ids.has(id)) { reg.dispose(); regs.delete(id); }
            for (const w of next) {
              const key = manifestKey(w);
              const reg = regs.get(w.id);
              if (reg?.key === key) continue;
              reg?.dispose();
              regs.set(w.id, {key, dispose: register(w)});
            }
            byId = new Map(next.map(w => [w.id, w]));
            for (const l of listeners) l();
          };
          let job = null;
          let users = 0;
          let timer = null;
          const refresh = () => {
            job ??= call('widget.list').then(sync, () => {}).finally(() => { job = null; });
            return job;
          };
          const tick = () => { if (!document.hidden) void refresh(); };
          return {
            get: id => byId.get(id),
            subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); },
            refresh,
            start() {
              if (users++ === 0) {
                tick();
                timer = setInterval(tick, POLL_MS);
                window.addEventListener('focus', tick);
                document.addEventListener('visibilitychange', tick);
              }
              return () => {
                if (--users === 0) {
                  clearInterval(timer);
                  window.removeEventListener('focus', tick);
                  document.removeEventListener('visibilitychange', tick);
                }
              };
            },
            dispose() { for (const reg of regs.values()) reg.dispose(); regs.clear(); },
          };
        })();
        ctx.effect(() => () => customs.dispose(), 'dsh-workboard: custom widgets');
        void customs.refresh();

        // 生成（widget 为空）或修改一个自定义 widget：开新会话交给 Agent，用户在会话里继续追问。
        function AgentModal({widget, onClose}) {
          useLocale();
          const ws = useWorkspace();
          const [text, setText] = useState('');
          const [busy, setBusy] = useState(false);
          const [error, setError] = useState('');
          const examples = widget ? [] : t('gen_examples').split('\n').filter(Boolean);
          const submit = () => {
            const desc = text.trim();
            if (!desc || busy) return;
            setBusy(true);
            setError('');
            const prompt = widget ? fill(t('cw_editPrompt'), {title: widget.label(), id: widget.custom, desc}) : fill(t('gen_prompt'), {desc});
            launch(prompt, ws.path, ws.id).then(onClose, e => { setError(String(e?.message || e)); setBusy(false); });
          };
          const onKeyDown = e => {
            if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
            e.preventDefault();
            submit();
          };
          return h(Modal, {title: widget ? fill(t('cw_editTitle'), {title: widget.label()}) : t('gen_title'), onClose,
            footer: [
              h(WorkspaceSelect, {key: 'ws', ws}),
              h('span', {key: 'sp', className: 'wb-spacer'}),
              h('button', {key: 'c', type: 'button', className: 'wb-action', onClick: onClose}, t('cancel')),
              h('button', {key: 'go', type: 'button', className: 'wb-action', 'data-primary': '', disabled: busy || !text.trim(), onClick: submit}, h(Icon.sparkle), busy ? t('sending') : t('gen_go')),
            ]},
          h('textarea', {className: 'wb-input wb-gentext', autoFocus: true, value: text, disabled: busy, spellCheck: false,
            placeholder: widget ? t('cw_editPlaceholder') : t('gen_placeholder'), onChange: e => setText(e.target.value), onKeyDown}),
          examples.length ? h('div', {className: 'wb-chips'}, examples.map(x => h('button', {key: x, type: 'button', className: 'wb-btn wb-chip', disabled: busy, onClick: () => setText(x)}, x))) : null,
          error ? h('div', {className: 'wb-error'}, error) : null);
        }

        function SourceModal({widget, onClose, onRemoved}) {
          useLocale();
          const id = widget.custom;
          const [def, setDef] = useState(null);
          const [title, setTitle] = useState('');
          const [html, setHtml] = useState('');
          const [error, setError] = useState('');
          const [busy, setBusy] = useState(false);
          const [confirm, setConfirm] = useState(false);
          const [withData, setWithData] = useState(false);
          const [copied, setCopied] = useState(false);
          const fail = e => { setError(String(e?.message || e)); setBusy(false); };
          useEffect(() => { call('widget.get', {id}).then(w => { setDef(w); setTitle(w.title); setHtml(w.html); }, fail); }, [id]);
          const copyJson = () => {
            setError('');
            call('widget.export', {id, data: withData})
              .then(pkg => navigator.clipboard.writeText(JSON.stringify(pkg, null, 2)))
              .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }, fail);
          };
          const dirty = def && (title.trim() !== def.title || html !== def.html);
          const save = () => {
            setBusy(true);
            setError('');
            call('widget.put', {id, title: title.trim(), html}).then(() => customs.refresh()).then(onClose, fail);
          };
          const remove = () => {
            if (!confirm) { setConfirm(true); return; }
            setBusy(true);
            call('widget.remove', {id}).then(() => { onRemoved(); return customs.refresh(); }).then(onClose, fail);
          };
          return h(Modal, {title: `${widget.label()} · ${t('cw_source')}`, onClose, wide: true,
            footer: [
              h('button', {key: 'del', type: 'button', className: 'wb-action', 'data-danger': '', disabled: busy || !def, onClick: remove, onBlur: () => setConfirm(false)}, confirm ? t('confirmDelete') : t('cw_delete')),
              h('button', {key: 'exp', type: 'button', className: 'wb-action', disabled: !def, onClick: copyJson}, copied ? h(Icon.check) : h(Icon.copy), copied ? t('cw_exported') : t('cw_export')),
              def?.data != null ? h('label', {key: 'wd', className: 'wb-check wb-muted'}, h('input', {type: 'checkbox', checked: withData, onChange: e => setWithData(e.target.checked)}), t('cw_withData')) : null,
              h('span', {key: 'sp', className: 'wb-spacer'}),
              h('button', {key: 'c', type: 'button', className: 'wb-action', onClick: onClose}, t('cancel')),
              h('button', {key: 's', type: 'button', className: 'wb-action', 'data-primary': '', disabled: busy || !dirty || !title.trim(), onClick: save}, t('save')),
            ]},
          def ? h(React.Fragment, null,
            h('div', {className: 'wb-field'}, h('span', null, t('cw_title')), h('input', {className: 'wb-input', value: title, maxLength: 40, onChange: e => setTitle(e.target.value)})),
            h('div', {className: 'wb-field wb-codefield'}, h('span', null, 'HTML'),
              h('textarea', {className: 'wb-input wb-code', value: html, spellCheck: false, onChange: e => setHtml(e.target.value)})),
            h('div', {className: 'wb-muted wb-cwmeta'}, `${t('cw_fetch')}: ${def.fetch.length ? def.fetch.join('  ') : t('cw_none')}`),
            def.lastError ? h('div', {className: 'wb-calerr'}, def.lastError.message) : null) : null,
          error ? h('div', {className: 'wb-error'}, error) : null);
        }

        // 粘贴导入：先预检，展示它会访问的地址，用户确认后才保存。
        function ImportModal({onClose, onImported}) {
          useLocale();
          const [text, setText] = useState('');
          const [preview, setPreview] = useState(null);
          const [busy, setBusy] = useState(false);
          const [error, setError] = useState('');
          const fail = e => { setError(String(e?.message || e)); setBusy(false); };
          const check = () => {
            setBusy(true);
            setError('');
            call('widget.import', {package: text.trim(), dryRun: true}).then(p => { setPreview(p); setBusy(false); }, fail);
          };
          const confirm = () => {
            setBusy(true);
            setError('');
            call('widget.import', {package: text.trim()})
              .then(r => customs.refresh().then(() => onImported(r.widget)))
              .then(onClose, fail);
          };
          const w = preview?.widget;
          return h(Modal, {title: t('imp_card'), onClose,
            footer: [
              h('span', {key: 'sp', className: 'wb-spacer'}),
              h('button', {key: 'c', type: 'button', className: 'wb-action', onClick: onClose}, t('cancel')),
              preview
                ? h('button', {key: 'go', type: 'button', className: 'wb-action', 'data-primary': '', disabled: busy, onClick: confirm}, h(Icon.import), t('imp_go'))
                : h('button', {key: 'ck', type: 'button', className: 'wb-action', 'data-primary': '', disabled: busy || !text.trim(), onClick: check}, t('imp_check')),
            ]},
          h('textarea', {className: 'wb-input wb-gentext wb-code', autoFocus: true, value: text, disabled: busy, spellCheck: false,
            placeholder: t('imp_placeholder'), onChange: e => { setText(e.target.value); setPreview(null); setError(''); }}),
          w ? h('div', {className: 'wb-impinfo'},
            h('b', null, w.title),
            w.description ? h('span', {className: 'wb-muted'}, w.description) : null,
            h('span', null, w.fetch.length ? `${t('imp_fetch')}: ${w.fetch.join('  ')}` : t('imp_offline')),
            preview.hasData ? h('span', {className: 'wb-muted'}, t('imp_data')) : null,
            preview.warnings.map(x => h('span', {key: x, className: 'wb-calerr'}, x))) : null,
          error ? h('div', {className: 'wb-error'}, error) : null);
        }

        const compact = v => new Intl.NumberFormat(t('lang'), {notation: 'compact', maximumFractionDigits: 1}).format(v);
        const parsePrices = text => String(text ?? '').split('\n').map(line => {
          const [model, ...rest] = line.trim().split(/\s+/);
          const n = rest.map(Number);
          return model && n.length >= 2 && n.every(Number.isFinite) ? {model, input: n[0], output: n[1], cacheRead: n[2] ?? n[0], cacheWrite: n[3] ?? n[0]} : null;
        }).filter(Boolean);
        // 手填单价优先；开启 OpenRouter 估算时，没填的模型按规范化后的名字精确匹配公开价（见 lib/models.js 的 modelKey）。
        const modelKey = s => String(s ?? '').toLowerCase().trim().replace(/^.*\//, '').replace(/[._\s]+/g, '-');
        const priceOf = (prices, model, fallback) => prices.filter(p => model === p.model || model.startsWith(p.model)).sort((a, b) => b.model.length - a.model.length)[0]
          ?? (fallback && Object.hasOwn(fallback, modelKey(model)) ? {...fallback[modelKey(model)], fromOr: true} : undefined);
        const tokensOf = r => r.input + r.output + r.cacheRead + r.cacheWrite;
        const costOf = (r, p) => (p ? (r.input * p.input + r.output * p.output + r.cacheRead * p.cacheRead + r.cacheWrite * p.cacheWrite) / 1e6 : 0);
        const shiftDay = (key, n) => { const d = keyDate(key); d.setDate(d.getDate() + n); return dayKey(d); };

        function Usage({size, config}) {
          useLocale();
          const [range, setRange] = useState(7);
          const res = useRemote('usage.get', {days: 30}, USAGE_MS);
          const orRes = useRemote('models.get', config?.orPrices ? {kind: 'prices'} : null, MODELS_MS);
          const v = res.value;
          if (!v) return h('div', {className: 'wb-blank'}, res.error || '…');
          const prices = parsePrices(config?.prices);
          const fallback = config?.orPrices ? orRes.value?.prices : null;
          const sum = rows => rows.reduce((a, r) => {
            for (const k of ['requests', 'reported', 'input', 'output', 'cacheRead', 'cacheWrite']) a[k] += r[k];
            a.cost += costOf(r, priceOf(prices, r.model, fallback));
            return a;
          }, {requests: 0, reported: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0});
          const today = sum(v.rows.filter(r => r.day === v.today));
          const yesterday = sum(v.rows.filter(r => r.day === shiftDay(v.today, -1)));
          const days = size === 'w' ? 30 : 14;
          const series = Array.from({length: days}, (_, i) => {
            const day = shiftDay(v.today, i - days + 1);
            const rows = v.rows.filter(r => r.day === day);
            return {day, tokens: rows.reduce((a, r) => a + tokensOf(r), 0), requests: rows.reduce((a, r) => a + r.requests, 0)};
          });
          const peak = Math.max(1, ...series.map(x => x.tokens));
          const lang = t('lang');
          const bars = h('div', {className: 'wb-bars'}, series.map(x => h('span', {key: x.day, 'data-today': x.day === v.today ? '' : undefined,
            title: fill(t('u_day'), {d: keyDate(x.day).toLocaleDateString(lang, {month: 'short', day: 'numeric', weekday: 'short'}), t: compact(x.tokens), r: x.requests})},
          h('i', {style: {height: `${Math.round(x.tokens / peak * 100)}%`}}))));
          const cacheBase = today.input + today.cacheRead + today.cacheWrite;
          const meta = [fill(t('u_requests'), {n: today.requests}), cacheBase ? fill(t('u_cache'), {n: Math.round(today.cacheRead / cacheBase * 100)}) : '', today.cost ? fill(t('u_cost'), {n: today.cost.toFixed(2)}) : ''].filter(Boolean);
          const hero = h('div', {className: 'wb-hero'},
            h('small', null, t('u_today')),
            h('span', {className: 'wb-big wb-num'}, compact(tokensOf(today))),
            h('small', {className: 'wb-num'}, size === 's' ? meta[0] : meta.join(' · ')),
            size === 's' || size === 'm' || size === 't' ? null : h('small', {className: 'wb-num'}, fill(t('u_vs'), {n: compact(tokensOf(yesterday))})));
          if (size === 's') return h('div', {className: 'wb-usage', 'data-size': size}, hero);
          if (size === 'm' || size === 'w') return h('div', {className: 'wb-usage', 'data-size': size}, hero, bars);
          const from = shiftDay(v.today, 1 - range);
          const models = new Map();
          for (const r of v.rows) {
            if (r.day < from) continue;
            const key = `${r.provider}\t${r.model}`;
            models.set(key, [...(models.get(key) ?? []), r]);
          }
          const table = [...models.values()].map(rows => ({...sum(rows), model: rows[0].model, provider: rows[0].provider})).sort((a, b) => b.requests - a.requests);
          const silentReq = table.reduce((a, m) => a + m.requests - m.reported, 0);
          const silentBy = [...new Set(table.filter(m => m.requests > m.reported).map(m => m.provider || m.model))].join(', ');
          return h('div', {className: 'wb-usage', 'data-size': size},
            size === 'l' ? h('div', {className: 'wb-utop'}, hero, bars) : h(React.Fragment, null, hero, bars),
            h('div', {className: 'wb-seg'}, [1, 7, 30].map(n => h('button', {key: n, type: 'button', className: 'wb-btn', 'aria-pressed': range === n, onClick: () => setRange(n)}, t(`u_range_${n}`)))),
            table.length ? h('div', {className: 'wb-table wb-num'},
              h('span', {className: 'wb-th'}, t('u_model')), h('span', {className: 'wb-th'}, t('u_req')), h('span', {className: 'wb-th'}, t('u_tok')),
              table.flatMap(m => {
                const p = priceOf(prices, m.model, fallback);
                return [
                  h('span', {key: `${m.provider}${m.model}n`, title: `${m.provider} / ${m.model}`}, m.model || m.provider, size === 't' ? null : h('small', null, m.provider)),
                  h('span', {key: `${m.provider}${m.model}r`}, m.requests),
                  h('span', {key: `${m.provider}${m.model}t`, title: p ? fill(t(p.fromOr ? 'u_costOr' : 'u_cost'), {n: m.cost.toFixed(2)}) : undefined}, m.reported ? compact(tokensOf(m)) : '–'),
                ];
              })) : h('div', {className: 'wb-blank'}, t('u_none')),
            silentReq ? h('div', {className: 'wb-foot-note', title: silentBy}, fill(t('u_unreported'), {n: silentReq, p: silentBy})) : null);
        }
        Usage.workboard = {
          apiVersion: 1, sizes: ['l', 't', 'm', 'w', 's'], defaultSize: 'm', description: () => t('d_usage'),
          settings: [
            {key: 'prices', type: 'textarea', label: () => t('f_prices'), placeholder: 'claude-opus 15 75 1.5 18.75'},
            {key: 'orPrices', type: 'toggle', default: false, label: () => t('f_orPrices')},
          ],
        };

        const duration = ms => {
          const m = Math.max(0, Math.round(ms / 60_000));
          if (m < 60) return new Intl.NumberFormat(t('lang'), {style: 'unit', unit: 'minute', unitDisplay: 'short'}).format(Math.max(1, m));
          if (m >= 2880) return new Intl.NumberFormat(t('lang'), {style: 'unit', unit: 'day', unitDisplay: 'short', maximumFractionDigits: 0}).format(m / 1440);
          return new Intl.NumberFormat(t('lang'), {style: 'unit', unit: 'hour', unitDisplay: 'short', maximumFractionDigits: 1}).format(m / 60);
        };

        function Running({size}) {
          useLocale();
          const now = useNow();
          const res = useRemote('running.get', {}, AGENT_MS);
          const [killed, setKilled] = useState(() => new Set());
          const [error, setError] = useState('');
          const ui = ctx.get?.('uiWorkspace');
          const v = res.value;
          if (!v) return h('div', {className: 'wb-blank'}, res.error || '…');
          if (!v.goals && !v.jobs) return h('div', {className: 'wb-blank'}, t('r_unavailable'));
          const nowMs = now.getTime();
          const goals = v.goals ?? [];
          const jobs = (v.jobs ?? []).map(j => (killed.has(j.id) && j.status === 'running' ? {...j, status: 'stopping'} : j));
          const kill = j => {
            setKilled(set => new Set([...set, j.id]));
            call('running.kill', {id: j.id, sessionId: j.sessionId}).catch(e => setError(String(e?.message || e)));
          };
          const open = id => { if (id) ui?.openSession?.(id); };
          const goalRow = g => {
            const state = g.phase === 'active' ? (g.armed ? 'running' : 'waiting') : g.phase === 'blocked' ? 'blocked' : g.phase === 'complete' ? 'done' : undefined;
            const status = g.phase === 'active' && !g.armed ? t('r_disarmed') : t(`r_${g.phase}`);
            const sub = [status, g.maxRounds ? fill(t('r_round'), {n: g.rounds, m: g.maxRounds}) : '', g.phase === 'blocked' ? g.reason : g.title].filter(Boolean).join(' · ');
            return h('button', {key: `g${g.sessionId}`, type: 'button', className: 'wb-btn wb-row wb-rowbtn', 'data-state': state, title: g.objective, onClick: () => open(g.sessionId)},
              h('span', {className: 'wb-dot', 'data-state': state}),
              h('div', null, h('b', null, g.objective), h('small', null, sub)));
          };
          const jobRow = j => {
            const state = j.status === 'running' ? 'running' : j.status === 'failed' ? 'blocked' : j.status === 'completed' ? 'done' : undefined;
            const status = j.status === 'running' ? fill(t('r_running'), {t: duration(nowMs - j.startedAt)}) : j.finishedAt ? `${t(`r_${j.status}`)} · ${relTime(j.finishedAt, nowMs)}` : t(`r_${j.status}`);
            return h('div', {key: j.id, className: 'wb-row', 'data-state': state === 'blocked' ? 'blocked' : undefined, title: [j.label, j.progress, j.detail].filter(Boolean).join('\n')},
              h('span', {className: 'wb-dot', 'data-state': state}),
              h('div', {style: {cursor: j.sessionId ? 'pointer' : undefined}, onClick: () => open(j.sessionId)},
                h('b', {className: 'wb-num'}, j.label || j.kind),
                h('small', null, [status, size === 'm' ? '' : j.progress || j.title].filter(Boolean).join(' · '))),
              j.status === 'running' ? h('button', {type: 'button', className: 'wb-btn wb-del', 'aria-label': t('r_kill'), title: t('r_kill'), onClick: () => kill(j)}, h(Icon.x)) : null);
          };
          const liveJobs = jobs.filter(j => j.status === 'running' || j.status === 'stopping');
          const activeGoals = goals.filter(g => g.phase !== 'complete');
          if (!goals.length && !jobs.length) return h('div', {className: 'wb-blank'}, t('r_idle'));
          return h(React.Fragment, null,
            h('div', {className: 'wb-rows'},
              goals.length && jobs.length ? h('div', {className: 'wb-sect'}, t('r_goals')) : null,
              goals.map(goalRow),
              goals.length && jobs.length ? h('div', {className: 'wb-sect'}, t('r_jobs')) : null,
              jobs.map(jobRow)),
            error ? h('div', {className: 'wb-calerr'}, error) : null,
            size === 'm' ? null : h('div', {className: 'wb-notefoot'}, h('span', null, fill(t('r_count'), {g: activeGoals.length, j: liveJobs.length}))));
        }
        Running.workboard = {apiVersion: 1, sizes: ['t', 'l', 'm', 'w'], description: () => t('d_running')};

        const ATTENTION_STATE = {waiting: 'waiting', blocked: 'blocked', failed: 'blocked', review: 'running'};
        function Attention({size, config}) {
          useLocale();
          const now = useNow();
          const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          const res = useRemote('attention.get', {dayStart, github: config?.github !== false, todos: config?.todos !== false}, AGENT_MS);
          const [handled, setHandled] = useState(() => new Set());
          const [error, setError] = useState('');
          const ui = ctx.get?.('uiWorkspace');
          const v = res.value;
          if (!v) return h('div', {className: 'wb-blank'}, res.error || '…');
          const nowMs = now.getTime();
          const fail = e => setError(String(e?.message || e));
          const items = v.items.filter(x => !handled.has(x.id));
          const complete = x => {
            setHandled(set => new Set([...set, x.id]));
            data.setDone(x.todoId, true).then(res.reload, e => { fail(e); res.reload(); });
          };
          const row = x => {
            const state = ATTENTION_STATE[x.kind];
            const label = t(`a_${x.kind}`);
            const sub = [label, size === 'm' ? '' : x.kind === 'waiting' ? baseName(x.detail) : x.detail, x.at ? relTime(x.at, nowMs) : ''].filter(Boolean);
            const body = h('div', null, h('b', null, x.title || t('untitledSession')), sub.length ? h('small', null, sub.join(' · ')) : null);
            const dot = h('span', {className: 'wb-dot', 'data-state': state});
            const rowState = state === 'blocked' ? 'blocked' : undefined;
            if (x.url) return h('a', {key: x.id, className: 'wb-row wb-rowbtn', 'data-state': rowState, href: x.url, target: '_blank', rel: 'noopener noreferrer', title: x.title}, dot, body);
            if (x.sessionId) return h('button', {key: x.id, type: 'button', className: 'wb-btn wb-row wb-rowbtn', 'data-state': rowState, title: x.title, onClick: () => ui?.openSession?.(x.sessionId)}, dot, body);
            return h('div', {key: x.id, className: 'wb-row', title: x.title}, dot, body,
              x.kind === 'todo' ? h('button', {type: 'button', className: 'wb-btn wb-rowact', onClick: () => complete(x)}, t('complete')) : null);
          };
          return h(React.Fragment, null,
            h('div', {className: 'wb-rows'}, items.length ? items.map(row) : h('div', {className: 'wb-blank'}, t('a_clear'))),
            error ? h('div', {className: 'wb-calerr'}, error) : null,
            size === 'm' || !items.length ? null : h('div', {className: 'wb-notefoot'}, h('span', null, fill(t('a_count'), {n: items.length}))));
        }
        Attention.workboard = {
          apiVersion: 1, sizes: ['l', 't', 'm', 'w'], description: () => t('d_attention'),
          settings: [
            {key: 'github', type: 'toggle', default: true, label: () => t('f_attnGithub')},
            {key: 'todos', type: 'toggle', default: true, label: () => t('f_attnTodos')},
          ],
        };

        // 简报由 Agent 写入，只渲染标题、列表、粗体、行内代码和 http(s) 链接，全部生成 React 元素，不走 innerHTML。
        const MD_INLINE = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
        const mdInline = text => {
          const out = [];
          let last = 0;
          for (const m of text.matchAll(MD_INLINE)) {
            if (m.index > last) out.push(text.slice(last, m.index));
            const key = out.length;
            if (m[1]) out.push(h('b', {key}, m[1]));
            else if (m[2]) out.push(h('code', {key}, m[2]));
            else out.push(h('a', {key, href: m[4], target: '_blank', rel: 'noopener noreferrer'}, m[3]));
            last = m.index + m[0].length;
          }
          if (last < text.length) out.push(text.slice(last));
          return out;
        };
        function Markdown({text}) {
          const blocks = [];
          let list = null;
          const close = () => { if (list) { blocks.push(h(list.tag, {key: blocks.length}, list.items)); list = null; } };
          for (const raw of String(text ?? '').split('\n')) {
            const line = raw.trimEnd();
            const item = line.match(/^\s*(?:([-*+])|\d+[.)])\s+(.*)$/);
            if (item) {
              const tag = item[1] ? 'ul' : 'ol';
              if (list && list.tag !== tag) close();
              list ??= {tag, items: []};
              list.items.push(h('li', {key: list.items.length}, mdInline(item[2])));
              continue;
            }
            close();
            if (!line.trim()) continue;
            const head = line.match(/^(#{1,6})\s+(.*)$/);
            blocks.push(head ? h(head[1].length <= 2 ? 'h4' : 'h5', {key: blocks.length}, mdInline(head[2])) : h('p', {key: blocks.length}, mdInline(line)));
          }
          close();
          return h('div', {className: 'wb-md'}, blocks);
        }

        function Brief({size, config}) {
          useLocale();
          const now = useNow();
          const res = useRemote('brief.get', {}, POLL_MS);
          const ws = useWorkspace();
          const ui = ctx.get?.('uiWorkspace');
          const [pending, setPending] = useState(null);
          const [busy, setBusy] = useState(false);
          const [error, setError] = useState('');
          const lastTime = useRef(config?.time);
          const v = res.value;
          const brief = v?.brief ?? null;
          const schedule = v?.schedule ?? null;
          const time = DAILY_TIME.test(String(config?.time ?? '').trim()) ? String(config.time).trim() : BRIEF_TIME;
          const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const fail = e => setError(String(e?.message || e));
          const scheduleWith = enabled => call('brief.schedule', {enabled, time, timeZone, title: t('briefTaskTitle'), prompt: t('briefPrompt'), cwd: ws.path || undefined});
          // 定时任务的时间以任务本身为准；只有用户在设置里改了时间才同步过去。
          useEffect(() => {
            if (lastTime.current === config?.time) return;
            lastTime.current = config?.time;
            if (schedule && schedule.timing?.time !== time) scheduleWith(true).then(res.reload, fail);
          }, [config?.time]);
          useEffect(() => {
            if (pending && brief && brief.at >= pending.since) setPending(null);
          }, [brief?.at, pending]);
          useEffect(() => {
            if (!pending) return undefined;
            const id = setTimeout(() => setPending(null), BRIEF_WAIT_MS);
            return () => clearTimeout(id);
          }, [pending]);
          if (!v) return h('div', {className: 'wb-blank'}, res.error || '…');
          const generate = async () => {
            setBusy(true);
            setError('');
            try {
              const since = Date.now();
              const {sessionId} = await call('agent.start', {prompt: t('briefPrompt'), cwd: ws.path || undefined, timeZone});
              setPending({since, sessionId});
            } catch (e) {
              if (/cannot start sessions/.test(String(e?.message)) && typeof ui?.startSession === 'function') ui.startSession(ws.id, {prompt: t('briefPrompt'), whenDraftExists: 'replace'});
              else fail(e);
            } finally {
              setBusy(false);
            }
          };
          const toggleAuto = () => {
            setBusy(true);
            setError('');
            scheduleWith(!schedule).then(res.reload, fail).finally(() => setBusy(false));
          };
          const autoLabel = fill(t('b_auto'), {t: schedule?.timing?.time || time});
          return h(React.Fragment, null,
            h('div', {className: 'wb-rows'}, brief ? h(Markdown, {text: brief.text}) : h('div', {className: 'wb-blank'}, pending ? t('b_generating') : t('b_empty'))),
            error ? h('div', {className: 'wb-calerr'}, error) : null,
            h('div', {className: 'wb-notefoot'},
              h('span', null, pending && typeof ui?.openSession === 'function'
                ? h('button', {type: 'button', className: 'wb-btn', onClick: () => ui.openSession(pending.sessionId)}, t('b_session'))
                : brief ? fill(t('updated'), {t: relTime(brief.at, now.getTime())}) : ''),
              h('div', {className: 'wb-footact'},
                v.canSchedule && size !== 'm' ? h('button', {type: 'button', className: 'wb-btn wb-auto', 'aria-pressed': Boolean(schedule), disabled: busy, onClick: toggleAuto},
                  schedule ? h(Icon.check) : null, schedule ? autoLabel : t('b_autoOff')) : null,
                h('button', {type: 'button', className: 'wb-btn', disabled: busy || Boolean(pending), onClick: generate},
                  pending ? t('b_generating') : brief ? t('b_regenerate') : t('b_generate')))));
        }
        Brief.workboard = {
          apiVersion: 1, sizes: ['l', 't', 'w', 'm'], description: () => t('d_brief'),
          settings: [{key: 'time', type: 'text', default: BRIEF_TIME, label: () => t('f_briefTime'), placeholder: BRIEF_TIME}],
        };

        function Git({size, config}) {
          useLocale();
          const now = useNow();
          const res = useRemote('git.status', {paths: String(config?.paths ?? '')}, GIT_MS);
          const [busy, setBusy] = useState(false);
          const [error, setError] = useState('');
          const v = res.value;
          if (!v) return h('div', {className: 'wb-blank'}, res.error || '…');
          const weight = r => (r.error ? 5 : r.conflicts ? 4 : r.changed + r.untracked ? 3 : r.ahead || r.behind ? 2 : r.gone?.length ? 1 : 0);
          const repos = [...v.repos].sort((a, b) => weight(b) - weight(a) || (b.lastCommitAt ?? 0) - (a.lastCommitAt ?? 0));
          const attention = repos.filter(r => weight(r) > 0).length;
          const fetchAll = () => {
            setBusy(true);
            setError('');
            call('git.fetch', {paths: String(config?.paths ?? '')}).then(r => { if (r.errors?.length) setError(r.errors.map(e => `${e.path.split('/').pop()}: ${e.message}`).join('\n')); res.reload(); }, e => setError(String(e?.message || e))).finally(() => setBusy(false));
          };
          const row = r => {
            if (r.error) return h('div', {key: r.path, className: 'wb-row', 'data-state': 'blocked', title: r.path}, h('span', {className: 'wb-dot', 'data-state': 'blocked'}), h('div', null, h('b', null, r.name), h('small', null, r.error)));
            const dirty = r.changed + r.untracked;
            const state = r.conflicts ? 'blocked' : dirty ? 'waiting' : r.ahead || r.behind ? 'running' : undefined;
            const parts = [r.branch,
              r.ahead ? `↑${r.ahead}` : '', r.behind ? `↓${r.behind}` : '',
              r.conflicts ? fill(t('g_conflicts'), {n: r.conflicts}) : dirty ? fill(t('g_changes'), {n: dirty}) : '',
              r.gone.length ? fill(t('g_gone'), {n: r.gone.length}) : '',
              !r.upstream && size !== 'm' ? t('g_noUpstream') : ''].filter(Boolean);
            if (parts.length === 1) parts.push(t('g_clean'));
            return h('div', {key: r.path, className: 'wb-row', 'data-state': state === 'blocked' ? 'blocked' : undefined, title: [r.path, r.lastSubject].filter(Boolean).join('\n')},
              h('span', {className: 'wb-dot', 'data-state': state}),
              h('div', null, h('b', null, r.name), h('small', {className: 'wb-num'}, parts.join(' · '))),
              h('button', {type: 'button', className: 'wb-btn wb-rowact', onClick: () => { launch(fill(t('gitPrompt'), {name: r.name}), r.path).catch(e => setError(String(e?.message || e))); }}, t('toAgent')),
              r.lastCommitAt && size !== 'm' ? h('time', null, relTime(r.lastCommitAt, now.getTime())) : null);
          };
          return h(React.Fragment, null,
            h('div', {className: 'wb-rows'}, repos.length ? repos.map(row) : h('div', {className: 'wb-blank'}, t('g_none'))),
            error ? h('div', {className: 'wb-calerr', title: error}, error.split('\n')[0]) : null,
            h('div', {className: 'wb-notefoot'}, h('span', null, repos.length ? (attention ? fill(t('g_attention'), {n: attention}) : t('g_allClean')) : ''),
              repos.some(r => r.upstream) ? h('button', {type: 'button', className: 'wb-btn', disabled: busy, onClick: fetchAll}, busy ? t('g_fetching') : t('g_fetch')) : null));
        }
        Git.workboard = {
          apiVersion: 1, sizes: ['t', 'l', 'm', 'w'], description: () => t('d_git'),
          settings: [{key: 'paths', type: 'textarea', label: () => t('f_repos'), placeholder: '~/Vibe/dsh-workboard'}],
        };

        function GitHub({size, config}) {
          useLocale();
          const now = useNow();
          const res = useRemote('github.get', {}, GITHUB_MS);
          const [busy, setBusy] = useState(false);
          const v = res.value;
          if (!v) {
            if (!res.error) return h('div', {className: 'wb-blank'}, '…');
            const missing = /not installed/.test(res.error);
            return h('div', {className: 'wb-blank'}, missing ? t('gh_missing') : h(React.Fragment, null, h('div', {className: 'wb-calerr'}, res.error), h('div', null, t('gh_login'))));
          }
          const nowMs = now.getTime();
          const groups = [
            ['review', config?.showReview !== false],
            ['mine', config?.showMine !== false],
            ['assigned', config?.showAssigned !== false],
          ].filter(([key, on]) => on && v[key]?.length).map(([key]) => [key, v[key]]);
          const refresh = () => {
            setBusy(true);
            call('github.get', {fresh: true}).then(() => res.reload(), () => res.reload()).finally(() => setBusy(false));
          };
          const row = (key, x) => h('a', {key: `${key}${x.url}`, className: 'wb-row wb-rowbtn', href: x.url || undefined, target: '_blank', rel: 'noopener noreferrer', title: x.title},
            h('div', null, h('b', null, x.title),
              h('small', {className: 'wb-num'}, [`${x.repo}#${x.number}`, key === 'mine' ? '' : x.author, x.draft ? t('gh_draft') : '', size === 'm' ? '' : relTime(x.updatedAt, nowMs)].filter(Boolean).join(' · '))));
          return h(React.Fragment, null,
            h('div', {className: 'wb-rows'},
              groups.length ? groups.map(([key, list]) => h(React.Fragment, {key},
                h('div', {className: 'wb-sect'}, `${t(`gh_${key}`)} ${list.length}`),
                list.map(x => row(key, x)))) : h('div', {className: 'wb-blank'}, t('gh_none'))),
            size === 'm' ? null : h('div', {className: 'wb-notefoot'}, h('span', null, v.fetchedAt ? fill(t('updated'), {t: relTime(v.fetchedAt, nowMs)}) : ''),
              h('button', {type: 'button', className: 'wb-btn', disabled: busy, onClick: refresh}, busy ? '…' : t('refresh'))));
        }
        GitHub.workboard = {
          apiVersion: 1, sizes: ['t', 'l', 'm', 'w'], description: () => t('d_github'),
          settings: [
            {key: 'showReview', type: 'toggle', default: true, label: () => t('f_showReview')},
            {key: 'showMine', type: 'toggle', default: true, label: () => t('f_showMine')},
            {key: 'showAssigned', type: 'toggle', default: true, label: () => t('f_showAssigned')},
          ],
        };

        const bytes = n => {
          const gb = n / 1024 ** 3;
          return gb >= 1000 ? `${(gb / 1024).toFixed(1)} TB` : `${gb >= 100 ? Math.round(gb) : gb.toFixed(1)} GB`;
        };

        function System({size}) {
          useLocale();
          const res = useRemote('system.get', {}, SYSTEM_MS);
          const v = res.value;
          if (!v) return h('div', {className: 'wb-blank'}, res.error || '…');
          const load = v.load?.[0] != null ? v.load[0].toFixed(1) : '';
          const memRatio = v.memory.used / v.memory.total;
          const rows = [
            ['cpu', v.cpu, fill(t('s_cores'), {n: v.cores, l: load}), v.cpu > 0.85],
            ['mem', memRatio, `${bytes(v.memory.used)} / ${bytes(v.memory.total)}`, memRatio > 0.9],
            v.disk ? ['disk', 1 - v.disk.free / v.disk.total, fill(t('s_free'), {n: bytes(v.disk.free)}), v.disk.free / v.disk.total < 0.1] : null,
            v.battery ? ['battery', v.battery.percent / 100,
              v.battery.charging ? t('s_charging') : v.battery.plugged ? t('s_plugged') : v.battery.minutes ? fill(t('s_left'), {t: duration(v.battery.minutes * 60_000)}) : '',
              !v.battery.plugged && v.battery.percent <= 20] : null,
          ].filter(Boolean);
          const detail = size === 'l' || size === 'w';
          const spark = (size === 't' || size === 'l' || size === 'w') && v.history.length > 1;
          const pts = v.history.map(([cpu], i, all) => `${(i / Math.max(1, all.length - 1)) * 100},${(1 - cpu) * 30}`);
          return h('div', {className: 'wb-sys', 'data-size': size, 'data-detail': detail ? '' : undefined},
            h('div', {className: 'wb-prog', 'data-size': size}, rows.map(([key, ratio, note, hot]) => h('div', {key, className: 'wb-prow', 'data-hot': hot ? '' : undefined, title: note},
              h('span', null, t(`s_${key}`)),
              h('div', {className: 'wb-pbar'}, h('i', {style: {width: `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`}})),
              h('span', {className: 'wb-num'}, `${Math.round(ratio * 100)}%`),
              detail ? h('small', null, note) : null))),
            spark ? h('div', {className: 'wb-spark', title: `${t('s_cpu')} · ${duration(v.history.length * v.sampleMs)}`},
              h('svg', {viewBox: '0 0 100 30', preserveAspectRatio: 'none'},
                h('polygon', {points: `0,30 ${pts.join(' ')} 100,30`}),
                h('polyline', {points: pts.join(' ')}))) : null,
            size === 't' || size === 'l' ? h('div', {className: 'wb-notefoot'}, h('span', null, fill(t('s_uptime'), {t: duration(v.uptime * 1000)})), size === 't' && load ? h('span', null, fill(t('s_load'), {l: load})) : null) : null);
        }
        System.workboard = {apiVersion: 1, sizes: ['m', 's', 't', 'l', 'w'], defaultSize: 't', description: () => t('d_system')};

        // 上次展示的照片按文件夹记在偏好里，重新进入页面时未到间隔就继续显示同一张；every 为 0 表示只在点击时切换。
        const PHOTO_PREF = 'photoFrame';
        const PHOTO_EVERY = [1, 5, 10, 15, 30, 60, 120, 180, 360, 720, 1440, 0];
        const photoEveryLabel = n => (n === 0 ? t('every_off') : n % 1440 === 0 ? fill(t('every_d'), {n: n / 1440}) : n % 60 === 0 ? fill(t('every_h'), {n: n / 60}) : fill(t('every_m'), {n}));
        function Photo({config, openSettings}) {
          useLocale();
          const dir = String(config?.dir ?? '');
          const shuffle = config?.shuffle !== false;
          const every = Number(String(config?.every ?? '') || 5);
          const minutes = PHOTO_EVERY.includes(every) ? every : 5;
          const key = dir.trim() || '~/Pictures';
          const [photo, setPhoto] = useState(null);
          const [error, setError] = useState('');
          const index = useRef(undefined);
          const shownAt = useRef(0);
          const busy = useRef(false);
          const show = useCallback(current => {
            if (busy.current) return;
            busy.current = true;
            call('photo.next', {dir, shuffle, index: index.current, current}).then(v => {
              index.current = v.index;
              setPhoto(v);
              setError('');
              if (!v.name) return;
              const saved = prefsStore.getSnapshot().values[PHOTO_PREF] ?? {};
              shownAt.current = v.kept ? saved[key]?.at ?? Date.now() : Date.now();
              if (v.kept) return;
              const others = Object.entries(saved).filter(([k]) => k !== key).slice(-7);
              prefsStore.put({[PHOTO_PREF]: {...Object.fromEntries(others), [key]: {name: v.name, at: shownAt.current}}}).catch(() => {});
            }, e => setError(String(e?.message || e))).finally(() => { busy.current = false; });
          }, [dir, shuffle, key]);
          useEffect(() => {
            let live = true;
            index.current = undefined;
            shownAt.current = 0;
            prefsStore.load().then(() => {
              if (!live) return;
              const saved = prefsStore.getSnapshot().values[PHOTO_PREF]?.[key];
              const fresh = saved?.name && (minutes === 0 || Date.now() - saved.at < minutes * 60_000);
              show(fresh ? saved.name : '');
            });
            const due = () => shownAt.current && Date.now() - shownAt.current >= minutes * 60_000;
            const id = minutes ? setInterval(() => { if (!document.hidden && due()) show(''); }, Math.min(minutes * 60_000, 30_000)) : 0;
            return () => { live = false; clearInterval(id); };
          }, [show, minutes, key]);
          if (error || photo?.count === 0) return h('div', {className: 'wb-photo-msg'}, h('span', null, error || t('ph_empty')), h('button', {type: 'button', className: 'wb-btn wb-cta', onClick: openSettings}, t('ph_pick')));
          if (!photo) return h('div', {className: 'wb-photo'});
          return h('div', {className: 'wb-photo', title: photo.name, onClick: () => show('')}, h('img', {src: photo.src, alt: photo.name, draggable: false}));
        }
        Photo.workboard = {
          apiVersion: 1, sizes: ['l', 'm', 's', 't', 'w'], defaultSize: 'l', title: false, description: () => t('d_photo'),
          settings: [
            {key: 'dir', type: 'text', label: () => t('f_photoDir'), placeholder: '~/Pictures'},
            {key: 'shuffle', type: 'toggle', default: true, label: () => t('f_shuffle')},
            {key: 'every', type: 'select', default: '5', label: () => t('f_every'), options: PHOTO_EVERY.map(n => ({value: String(n), label: () => photoEveryLabel(n)}))},
          ],
        };

        const priceText = (v, fx) => new Intl.NumberFormat(t('lang'), {
          minimumFractionDigits: fx ? 4 : v >= 1000 ? 0 : 2,
          maximumFractionDigits: fx ? 4 : v >= 1000 ? 2 : v >= 1 ? 2 : 4,
        }).format(v);

        function Market({size, config, openSettings}) {
          useLocale();
          const symbols = String(config?.symbols ?? t('mk_symbols'));
          const redUp = (config?.upColor ?? (t('lang').startsWith('zh') ? 'red' : 'green')) === 'red';
          const res = useRemote('market.quotes', {symbols}, MARKET_MS);
          if (!symbols.trim()) return h('div', {className: 'wb-photo-msg'}, h('button', {type: 'button', className: 'wb-btn wb-cta', onClick: openSettings}, t('mk_none')));
          const v = res.value;
          if (!v) return h('div', {className: 'wb-blank'}, res.error || '…');
          const items = size === 's' ? v.items.slice(0, 3) : v.items;
          return h('div', {className: 'wb-quotes', 'data-size': size, 'data-red-up': redUp ? '' : undefined}, items.map((q, i) => {
            const name = q.label || q.name || q.symbol;
            const sub = q.error ? (q.error === 'unknown symbol' ? t('mk_unknown') : q.error === 'not found' ? t('mk_missing') : q.error) : (q.label && q.name && q.name !== q.label ? q.name : q.symbol !== name ? q.symbol : q.currency);
            const dir = q.pct > 0 ? 'up' : q.pct < 0 ? 'down' : undefined;
            return h('div', {key: `${i}${q.symbol}`, className: 'wb-quote', 'data-dir': dir, title: [q.symbol, q.currency].filter(Boolean).join(' · ')},
              h('div', null, h('b', null, name), size === 's' ? null : h('small', null, sub)),
              h('span', {className: 'wb-num'}, q.price != null ? priceText(q.price, /\//.test(q.symbol) && !q.symbol.startsWith('cg:') && q.price < 100) : '—'),
              h('span', {className: 'wb-num'}, q.pct != null ? `${q.pct > 0 ? '+' : ''}${q.pct.toFixed(2)}%` : ''));
          }));
        }
        Market.workboard = {
          apiVersion: 1, sizes: ['t', 'm', 's', 'l', 'w'], defaultSize: 't', description: () => t('d_market'),
          settings: [
            {key: 'symbols', type: 'textarea', default: () => t('mk_symbols'), label: () => t('f_symbols'), placeholder: 'USD/CNY\nsh600519\nhk00700\nusAAPL\nBTC'},
            {key: 'upColor', type: 'select', default: () => (t('lang').startsWith('zh') ? 'red' : 'green'), label: () => t('f_upColor'), options: [{value: 'red', label: () => t('up_red')}, {value: 'green', label: () => t('up_green')}]},
          ],
        };

        const TR_CN = ['weibo', 'zhihu', '36kr', 'sspai', 'bilibili', 'v2ex'];
        const TR_INTL = ['hn', 'github', 'producthunt', 'reddit'];
        const TR_OFF = new Set(['bilibili', 'v2ex']);
        const trSources = () => (t('lang').startsWith('zh') ? [...TR_CN, ...TR_INTL] : [...TR_INTL, ...TR_CN]);
        const trKey = id => `src_${id}`;
        const parseHubSources = text => String(text ?? '').split('\n').map(l => {
          const m = /^([\w.-]{1,40})(?:\s+(.+))?$/.exec(l.trim());
          return m ? {id: `hub:${m[1]}`, label: (m[2] || m[1]).trim()} : null;
        }).filter(Boolean).slice(0, 12);

        function Trending({size, config, openSettings}) {
          useLocale();
          const hubType = config?.hub === 'dailyhot' || config?.hub === 'newsnow' ? config.hub : '';
          const hubUrl = String(config?.hubUrl ?? '').trim();
          const hubs = hubType && hubUrl ? parseHubSources(config?.hubSources) : [];
          const hubLabels = Object.fromEntries(hubs.map(x => [x.id, x.label]));
          const enabled = [...trSources().filter(id => config?.[trKey(id)] ?? !TR_OFF.has(id)), ...hubs.map(x => x.id)];
          const [picked, setPicked] = useState(null);
          const source = enabled.includes(picked) ? picked : enabled[0];
          const payload = !source ? null : source === 'github'
            ? {source, since: String(config?.ghSince || 'daily'), lang: String(config?.ghLang ?? '').trim()}
            : source.startsWith('hub:') ? {source, hub: hubType, hubUrl} : {source};
          const res = useRemote('trending.get', payload, TRENDING_MS);
          const v = source && res.value?.source === source ? res.value : null;
          const read = useRead(v ? v.items.map(it => it.url).filter(Boolean) : []);
          if (!source) return h('div', {className: 'wb-photo-msg'}, h('button', {type: 'button', className: 'wb-btn wb-cta', onClick: openSettings}, t('tr_none')));
          const compact = new Intl.NumberFormat(t('lang'), {notation: 'compact', maximumFractionDigits: 1});
          const hot = n => (n == null ? '' : `${v.metric === 'stars' ? '+' : ''}${compact.format(n)}`);
          const labelOf = id => hubLabels[id] ?? t(`tr_${id}`);
          return h('div', {className: 'wb-trend'},
            enabled.length > 1 ? h('div', {className: 'wb-seg', role: 'tablist'}, enabled.map(id => h('button', {key: id, type: 'button', role: 'tab', className: 'wb-btn', 'aria-pressed': id === source, onClick: () => setPicked(id)}, labelOf(id)))) : null,
            h('div', {className: 'wb-rows'},
              v ? v.items.map((it, i) => h('a', {key: `${i}${it.url}`, className: 'wb-row wb-rowbtn', ...readProps(read, it.url), href: it.url, target: '_blank', rel: 'noopener noreferrer', title: [it.title, it.meta].filter(Boolean).join('\n')},
                h('span', {className: 'wb-rank wb-num', 'data-top': i < 3 ? '' : undefined}, i + 1),
                h('div', null, h('b', null, it.title), size === 'l' && it.meta ? h('small', null, it.meta) : null),
                it.tag ? h('span', {className: 'wb-tag'}, it.tag) : null,
                size === 't' ? null : h('span', {className: 'wb-num'}, hot(it.hot))))
                : h('div', {className: 'wb-blank'}, res.error || '…')));
        }
        Trending.workboard = {
          apiVersion: 1, sizes: ['l', 't', 'm', 'w'], defaultSize: 'l', description: () => t('d_trending'),
          settings: [
            ...[...TR_CN, ...TR_INTL].map(id => ({key: trKey(id), type: 'toggle', default: !TR_OFF.has(id), label: () => t(`tr_${id}`)})),
            {key: 'ghSince', type: 'select', default: 'daily', label: () => t('f_ghSince'), options: ['daily', 'weekly', 'monthly'].map(v => ({value: v, label: () => t(`gh_${v}`)}))},
            {key: 'ghLang', type: 'text', label: () => t('f_ghLang'), placeholder: 'typescript'},
            {key: 'hub', type: 'select', default: '', label: () => t('f_hubType'), options: [{value: '', label: () => t('hub_none')}, {value: 'dailyhot', label: () => t('hub_dailyhot')}, {value: 'newsnow', label: () => t('hub_newsnow')}]},
            {key: 'hubUrl', type: 'text', label: () => t('f_hubUrl'), placeholder: 'https://hot.example.com'},
            {key: 'hubSources', type: 'textarea', label: () => t('f_hubSources'), placeholder: 'juejin 掘金\nithome IT之家\nlinuxdo Linux.do'},
          ],
        };

        const blank = text => h('div', {className: 'wb-blank'}, text);
        const rowact = (label, fn, opts = {}) => h('button', {type: 'button', className: 'wb-btn wb-rowact', 'data-danger': opts.danger ? '' : undefined, 'data-armed': opts.armed ? '' : undefined, disabled: opts.disabled,
          onClick: e => { e.stopPropagation(); fn(); }}, label);
        const extOf = name => /\.([a-z0-9]{1,5})$/i.exec(name)?.[1].toLowerCase() ?? '';
        const fileSize = n => (n == null ? '' : n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${Math.round(n / 1024)} KB` : n < 1024 ** 3 ? `${(n / 1024 ** 2).toFixed(1)} MB` : `${(n / 1024 ** 3).toFixed(1)} GB`);
        const parentName = path => baseName(String(path).split('/').slice(0, -1).join('/'));
        const FileBadge = ({name, folder}) => h('i', {className: 'wb-ext', 'aria-hidden': true}, folder ? h(Icon.folder) : (extOf(name) || '·').slice(0, 4));
        const openFile = (path, reveal) => call('file.open', {path, reveal: reveal === true});

        function Outputs({size, config}) {
          useLocale();
          const now = useNow();
          const ui = ctx.get?.('uiWorkspace');
          const created = config?.created !== false;
          const res = useRemote('outputs.list', {created}, OUTPUTS_MS);
          const [error, setError] = useState('');
          const [busy, setBusy] = useState(false);
          const v = res.value;
          if (!v) return blank(res.error || '…');
          const fail = e => setError(String(e?.message || e));
          const nowMs = now.getTime();
          const items = v.items.filter(x => x.exists || config?.showMissing);
          const refresh = () => {
            setBusy(true);
            call('outputs.list', {created, fresh: true}).then(() => res.reload(), fail).finally(() => setBusy(false));
          };
          const row = x => h('div', {key: x.path, className: 'wb-row wb-rowbtn', 'data-dim': x.exists ? undefined : '', title: [x.path, x.description].filter(Boolean).join('\n'),
            style: {cursor: x.exists ? 'pointer' : undefined}, onClick: () => { if (x.exists) openFile(x.path).then(() => setError(''), fail); }},
            h(FileBadge, {name: x.name}),
            h('div', null, h('b', null, x.name),
              h('small', null, [x.exists ? '' : t('o_missing'), x.kind === 'presented' ? t('o_presented') : '', size === 'm' ? '' : x.description || parentName(x.path), relTime(x.time, nowMs)].filter(Boolean).join(' · '))),
            x.exists ? rowact(t('o_reveal'), () => { openFile(x.path, true).catch(fail); }) : null,
            x.sessionId && typeof ui?.openSession === 'function' && size !== 'm' ? rowact(t('o_session'), () => ui.openSession(x.sessionId)) : null);
          return h(React.Fragment, null,
            h('div', {className: 'wb-rows'}, items.length ? items.slice(0, 60).map(row) : blank(t('o_none'))),
            error ? h('div', {className: 'wb-calerr', title: error}, error) : null,
            size === 'm' ? null : h('div', {className: 'wb-notefoot'}, h('span', null, items.length ? fill(t('o_count'), {n: items.length}) : ''),
              h('button', {type: 'button', className: 'wb-btn', disabled: busy, onClick: refresh}, busy ? '…' : t('refresh'))));
        }
        Outputs.workboard = {
          apiVersion: 1, sizes: ['t', 'l', 'm', 'w'], description: () => t('d_outputs'),
          settings: [
            {key: 'created', type: 'toggle', default: true, label: () => t('f_created')},
            {key: 'showMissing', type: 'toggle', default: false, label: () => t('f_showMissing')},
          ],
        };

        const hhmm = (hh, mm) => `${pad(hh)}:${pad(mm)}`;
        const weekdayNames = days => {
          const lang = t('lang');
          const isZh = lang.startsWith('zh');
          const fmt = new Intl.DateTimeFormat(lang, {weekday: isZh ? 'narrow' : 'short'});
          // 2024-01-07 是周日；0 和 7 都按周日。
          return days.map(n => fmt.format(new Date(2024, 0, 7 + (Number(n) % 7)))).join(isZh ? '、' : ', ');
        };
        const intervalText = sec => {
          if (sec % 604800 === 0) return fill(t('iv_week'), {n: sec / 604800});
          if (sec % 86400 === 0) return fill(t('iv_day'), {n: sec / 86400});
          if (sec % 3600 === 0) return fill(t('iv_hour'), {n: sec / 3600});
          return fill(t('iv_min'), {n: Math.max(1, Math.round(sec / 60))});
        };
        const RRULE_DAYS = {SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6};
        const rruleText = raw => {
          const line = String(raw ?? '').split('\n').find(l => l.includes('FREQ=')) ?? '';
          const rule = Object.fromEntries(line.replace(/^RRULE:/, '').split(';').map(p => p.split('=')));
          const n = Number(rule.INTERVAL) || 1;
          const time = rule.BYHOUR != null && !rule.BYHOUR.includes(',') ? hhmm(Number(rule.BYHOUR), Number(rule.BYMINUTE) || 0) : '';
          const days = rule.BYDAY ? rule.BYDAY.split(',').map(d => RRULE_DAYS[d.slice(-2)]).filter(d => d != null) : [];
          const every = sec => `${fill(t('every_n'), {n: intervalText(sec)})} ${time}`.trim();
          if (rule.FREQ === 'MINUTELY') return every(n * 60);
          if (rule.FREQ === 'HOURLY') return every(n * 3600);
          if (rule.FREQ === 'DAILY') return n === 1 ? fill(t('daily_at'), {t: time}).trim() : every(n * 86400);
          if (rule.FREQ === 'WEEKLY') return days.length && n === 1 ? fill(t('weekly_at'), {d: weekdayNames(days), t: time}).trim() : every(n * 604800);
          if (rule.FREQ === 'MONTHLY' && rule.BYMONTHDAY && !rule.BYMONTHDAY.includes(',')) return fill(t('monthly_at'), {d: rule.BYMONTHDAY, t: time}).trim();
          return line || String(raw ?? '');
        };
        const recurText = k => {
          const x = k.timing ?? {};
          if (k.kind === 'every') return fill(t('every_n'), {n: intervalText(Number(x.everySeconds) || 60)});
          if (k.kind === 'daily') return fill(t('daily_at'), {t: x.time ?? ''}).trim();
          if (k.kind === 'weekly') return fill(t('weekly_at'), {d: weekdayNames(x.weekdays ?? []), t: x.time ?? ''}).trim();
          if (k.kind === 'cron') return `cron ${x.expression ?? ''}`;
          if (k.kind === 'rrule') return rruleText(x.rrule);
          return t('once');
        };

        function Schedules({size, config}) {
          useLocale();
          const now = useNow();
          const ui = ctx.get?.('uiWorkspace');
          const ws = useWorkspace();
          const res = useRemote('schedule.list', {}, AGENT_MS);
          const [confirm, setConfirm] = useState('');
          const [busy, setBusy] = useState('');
          const [error, setError] = useState('');
          const v = res.value;
          if (v === undefined) return blank(res.error || '…');
          if (v === null) return blank(t('sc_unavailable'));
          const nowMs = now.getTime();
          const lang = t('lang');
          const fail = e => setError(String(e?.message || e));
          const rank = k => (k.running ? 0 : k.status === 'active' ? 1 : k.status === 'paused' ? 2 : 3);
          const all = [...v].sort((a, b) => rank(a) - rank(b) || (a.scheduledAt || 9e15) - (b.scheduledAt || 9e15));
          const ended = all.filter(k => k.status === 'ended');
          const list = config?.showEnded ? all : all.filter(k => k.status !== 'ended');
          const wide = size === 'l' || size === 'w';
          const act = (k, action) => {
            setBusy(k.id);
            setError('');
            const job = action === 'run'
              ? call('schedule.run', {id: k.id}).then(r => { if (r?.pending) setError(t('sc_pending')); })
              : call('schedule.edit', {id: k.id, action});
            job.then(() => res.reload(), fail).finally(() => { setBusy(''); setConfirm(''); });
          };
          const row = k => {
            const target = k.lastSessionId || k.sessionId;
            const when = k.running ? t('executing') : k.status === 'paused' ? t('sc_paused') : k.status === 'ended' ? t('sc_ended')
              : k.scheduledAt ? `${relTime(k.scheduledAt, nowMs)} · ${new Date(k.scheduledAt).toLocaleString(lang, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}` : '';
            const recur = recurText(k);
            const off = busy === k.id;
            return h('div', {key: k.id, className: 'wb-row wb-rowbtn', 'data-dim': k.status === 'active' ? undefined : '', title: [k.title, recur, k.prompt !== k.title ? k.prompt : ''].filter(Boolean).join('\n'),
              style: {cursor: target ? 'pointer' : undefined}, onClick: () => { if (target) ui?.openSession?.(target); }},
              h('span', {className: 'wb-dot', 'data-state': k.running ? 'running' : k.status === 'active' ? 'done' : undefined}),
              h('div', null, h('b', null, k.title), h('small', null, [when, size === 'm' ? '' : recur].filter(Boolean).join(' · '))),
              k.status !== 'ended' && !k.running ? rowact(t('sc_run'), () => act(k, 'run'), {disabled: off}) : null,
              k.status === 'active' ? rowact(t('pause'), () => act(k, 'pause'), {disabled: off}) : k.status === 'paused' ? rowact(t('resume'), () => act(k, 'resume'), {disabled: off}) : null,
              wide || k.status === 'ended' ? rowact(confirm === k.id ? t('confirmDelete') : t('sc_delete'), () => (confirm === k.id ? act(k, 'delete') : setConfirm(k.id)), {danger: true, armed: confirm === k.id, disabled: off}) : null);
          };
          const active = all.filter(k => k.status === 'active').length;
          const paused = all.filter(k => k.status === 'paused').length;
          const clear = () => { call('schedule.clear').then(() => res.reload(), fail); };
          const create = () => ui.startSession(ws.id, {prompt: t('sc_newPrompt'), whenDraftExists: 'replace'});
          return h(React.Fragment, null,
            h('div', {className: 'wb-rows', onMouseLeave: () => setConfirm('')}, list.length ? list.map(row) : blank(t('sc_none'))),
            error ? h('div', {className: 'wb-calerr', title: error}, error) : null,
            size === 'm' ? null : h('div', {className: 'wb-notefoot'},
              h('span', null, all.length ? fill(t('sc_count'), {a: active, p: paused}) : ''),
              h('div', {className: 'wb-footact'},
                config?.showEnded && ended.length ? h('button', {type: 'button', className: 'wb-btn', onClick: clear}, fill(t('sc_clear'), {n: ended.length})) : null,
                typeof ui?.startSession === 'function' ? h('button', {type: 'button', className: 'wb-btn', onClick: create}, t('sc_new')) : null)));
        }
        Schedules.workboard = {
          apiVersion: 1, sizes: ['t', 'l', 'm', 'w'], description: () => t('d_tasks'),
          settings: [{key: 'showEnded', type: 'toggle', default: false, label: () => t('f_showEnded')}],
        };

        function Pinned({size}) {
          useLocale();
          const now = useNow();
          const prefs = usePrefs();
          const ui = ctx.get?.('uiWorkspace');
          const ids = Array.isArray(prefs.pinnedSessions) ? prefs.pinnedSessions.map(String) : [];
          const [picking, setPicking] = useState(false);
          const [query, setQuery] = useState('');
          const res = useRemote('session.pinned', ids.length ? {ids} : null, AGENT_MS);
          const all = useRemote('session.list', picking ? {} : null, AGENT_MS);
          if (res.value === null || (picking && all.value === null)) return blank(t('agentsUnavailable'));
          const nowMs = now.getTime();
          const save = list => { void prefsStore.put({pinnedSessions: list.slice(0, MAX_PINNED)}); };
          const statusOf = s => (s.waiting ? t('waitingYou') : s.running ? t('running') : relTime(s.updatedAt, nowMs));
          if (picking) {
            const q = query.trim().toLowerCase();
            const candidates = (all.value ?? []).filter(s => !ids.includes(s.id) && (!q || `${s.title} ${s.cwd}`.toLowerCase().includes(q))).slice(0, 40);
            const full = ids.length >= MAX_PINNED;
            return h(React.Fragment, null,
              h('input', {className: 'wb-input wb-search', autoFocus: true, value: query, placeholder: t('pin_search'), onChange: e => setQuery(e.target.value)}),
              h('div', {className: 'wb-rows'},
                !all.value ? blank(all.error || '…') : candidates.length ? candidates.map(s => h('button', {key: s.id, type: 'button', className: 'wb-btn wb-row wb-rowbtn', disabled: full, title: s.cwd || undefined, onClick: () => save([...ids, s.id])},
                  h(Icon.plus),
                  h('div', null, h('b', null, s.title || t('untitledSession')), h('small', null, [relTime(s.updatedAt, nowMs), baseName(s.cwd)].filter(Boolean).join(' · '))))) : blank(t('noSessions'))),
              h('div', {className: 'wb-notefoot'}, h('span', null, fill(t('pin_count'), {n: ids.length})),
                h('button', {type: 'button', className: 'wb-btn', onClick: () => { setPicking(false); setQuery(''); }}, t('doneEdit'))));
          }
          const rows = ids.length ? res.value : [];
          const unpin = id => save(ids.filter(x => x !== id));
          const del = id => h('button', {type: 'button', className: 'wb-btn wb-del', 'aria-label': t('unpin'), title: t('unpin'), onClick: e => { e.stopPropagation(); unpin(id); }}, h(Icon.x));
          const row = s => {
            if (s.missing) return h('div', {key: s.id, className: 'wb-row', 'data-dim': ''}, h('span', {className: 'wb-dot'}), h('div', null, h('b', null, t('pin_missing'))), del(s.id));
            const state = s.waiting ? 'waiting' : s.running ? 'running' : undefined;
            const preview = size !== 'm' && s.preview;
            return h('div', {key: s.id, className: 'wb-row wb-rowbtn', 'data-state': state, title: [s.title, s.cwd].filter(Boolean).join('\n'), style: {cursor: 'pointer'}, onClick: () => ui?.openSession?.(s.id)},
              h('span', {className: 'wb-dot', 'data-state': state}),
              h('div', null, h('b', null, s.title || t('untitledSession')), h('small', null, preview || [statusOf(s), baseName(s.cwd)].filter(Boolean).join(' · '))),
              preview ? h('time', null, statusOf(s)) : null,
              del(s.id));
          };
          return h(React.Fragment, null,
            h('div', {className: 'wb-rows'}, !rows ? blank(res.error || '…') : rows.length ? rows.map(row) : blank(t('pin_none'))),
            h('div', {className: 'wb-notefoot'}, h('span', null, ids.length ? fill(t('pin_count'), {n: ids.length}) : ''),
              h('button', {type: 'button', className: 'wb-btn', onClick: () => setPicking(true)}, t('pin_add'))));
        }
        Pinned.workboard = {apiVersion: 1, sizes: ['t', 'l', 'm', 'w'], description: () => t('d_pinned')};

        function Files({size, config}) {
          useLocale();
          const now = useNow();
          const dirs = String(config?.dirs ?? '').trim() || '~/Downloads\n~/Desktop';
          const res = useRemote('files.recent', {dirs, limit: 40, folders: config?.folders !== false}, FILES_MS);
          const [error, setError] = useState('');
          const v = res.value;
          if (!v) return blank(res.error || '…');
          const fail = e => setError(String(e?.message || e));
          const nowMs = now.getTime();
          const row = x => h('div', {key: x.path, className: 'wb-row wb-rowbtn', title: x.path, style: {cursor: 'pointer'}, onClick: () => openFile(x.path).then(() => setError(''), fail)},
            h(FileBadge, {name: x.name, folder: x.folder}),
            h('div', null, h('b', null, x.name), h('small', null, [x.folder ? '' : fileSize(x.size), size === 'm' ? '' : baseName(x.dir), relTime(x.time, nowMs)].filter(Boolean).join(' · '))),
            x.folder ? null : rowact(t('o_reveal'), () => { openFile(x.path, true).catch(fail); }),
            size === 'm' ? null : rowact(t('toAgent'), () => { launch(fill(t('filePrompt'), {path: x.path}), x.dir).catch(fail); }));
          const failed = v.errors?.length ?? 0;
          return h(React.Fragment, null,
            h('div', {className: 'wb-rows'}, v.items.length ? v.items.map(row) : blank(t('fi_none'))),
            failed ? h('div', {className: 'wb-calerr', title: v.errors.map(e => `${e.dir}: ${e.message}`).join('\n')}, fill(t('fi_error'), {n: failed})) : null,
            error ? h('div', {className: 'wb-calerr', title: error}, error) : null);
        }
        Files.workboard = {
          apiVersion: 1, sizes: ['t', 'l', 'm', 'w'], description: () => t('d_files'),
          settings: [
            {key: 'dirs', type: 'textarea', label: () => t('f_dirs'), placeholder: '~/Downloads\n~/Desktop'},
            {key: 'folders', type: 'toggle', default: true, label: () => t('f_folders')},
          ],
        };

        const CopyIcon = () => svg(14, ['M9 9h11v11H9z', 'M5 15H4V4h11v1']);

        function Clipboard({size, config}) {
          useLocale();
          const now = useNow();
          const res = useRemote('clipboard.get', {}, CLIP_MS);
          const ws = useWorkspace();
          const [sel, setSel] = useState('');
          const [busy, setBusy] = useState(false);
          const [error, setError] = useState('');
          const [copied, setCopied] = useState('');
          const v = res.value;
          if (!v) return blank(res.error || '…');
          if (!v.supported) return blank(t('cb_unsupported'));
          const fail = e => setError(String(e?.message || e));
          const presets = parsePresets(config?.presets ?? t('defaultClipPresets'));
          const items = v.items;
          const current = items.find(x => x.id === sel) ?? items[0];
          const send = p => {
            if (!current || busy) return;
            setBusy(true);
            setError('');
            launch(`${p.prompt}\n\n${current.text}`, ws.path, ws.id).catch(fail).finally(() => setBusy(false));
          };
          const copy = x => {
            if (!navigator.clipboard?.writeText) return;
            navigator.clipboard.writeText(x.text).then(() => { setCopied(x.id); setTimeout(() => setCopied(''), 1200); }, fail);
          };
          const remove = x => { if (sel === x.id) setSel(''); call('clipboard.remove', {id: x.id}).then(() => res.reload(), fail); };
          const clear = () => { setSel(''); call('clipboard.remove', {}).then(() => res.reload(), fail); };
          const chips = presets.length ? h('div', {className: 'wb-chips', style: size === 'm' ? undefined : {marginTop: 8}},
            presets.map((p, i) => h('button', {key: i, type: 'button', className: 'wb-btn wb-chip', title: p.prompt, disabled: busy || !current, onClick: () => send(p)}, p.name))) : null;
          const status = busy || error ? h('div', {className: error ? 'wb-calerr' : 'wb-muted', style: {fontSize: 12}}, error || t('sending')) : null;
          if (size === 'm') {
            return h('div', {className: 'wb-prompt', 'data-size': size},
              h('div', {className: 'wb-cliptext', title: current?.text}, current ? current.text : h('span', {className: 'wb-muted'}, t('cb_empty'))),
              chips, status);
          }
          return h(React.Fragment, null,
            h('div', {className: 'wb-rows'},
              items.length ? items.map(x => h('div', {key: x.id, className: 'wb-inrow', 'data-sel': x === current ? '' : undefined, title: x.text, style: {cursor: 'pointer'}, onClick: () => setSel(x.id)},
                h('span', null, x.text),
                h('small', null, copied === x.id ? t('cb_copied') : relTime(x.at, now.getTime())),
                h('button', {type: 'button', className: 'wb-btn wb-del', 'data-plain': '', 'aria-label': t('cb_copy'), title: t('cb_copy'), onClick: e => { e.stopPropagation(); copy(x); }}, h(CopyIcon)),
                h('button', {type: 'button', className: 'wb-btn wb-del', 'aria-label': t('remove'), title: t('remove'), onClick: e => { e.stopPropagation(); remove(x); }}, h(Icon.x)))) : blank(t('cb_empty'))),
            chips, status,
            h('div', {className: 'wb-notefoot'}, h('span', null, items.length ? fill(t('itemCount'), {n: items.length}) : ''),
              h('div', {className: 'wb-footact'}, h(WorkspaceSelect, {ws}),
                items.length ? h('button', {type: 'button', className: 'wb-btn', onClick: clear}, t('cb_clear')) : null)));
        }
        Clipboard.workboard = {
          apiVersion: 1, sizes: ['t', 'l', 'm', 'w'], description: () => t('d_clipboard'),
          settings: [{key: 'presets', type: 'textarea', label: () => t('f_cbPresets'), default: () => t('defaultClipPresets')}],
        };

        const rateText = n => (n >= 1024 ** 2 ? `${(n / 1024 ** 2).toFixed(1)} MB/s` : n >= 1024 ? `${Math.round(n / 1024)} KB/s` : `${Math.round(n)} B/s`);
        const latLevel = p => (p.error ? 'bad' : p.ms < 300 ? 'ok' : p.ms < 1000 ? 'warn' : 'bad');

        function Network({size, config}) {
          useLocale();
          const targets = String(config?.targets ?? t('defaultTargets'));
          const res = useRemote('network.get', {targets}, NET_MS);
          const [busy, setBusy] = useState(false);
          const v = res.value;
          if (!v) return blank(res.error || '…');
          const last = v.rates.at(-1) ?? [0, 0];
          const local = v.addresses.find(a => a.family === 'IPv4')?.address ?? v.addresses[0]?.address ?? '—';
          const px = v.proxy;
          const proxyText = v.via || (px?.pac ? t('n_pac') : px?.env || t('n_noProxy'));
          const ip = v.ip;
          const ipText = ip?.ip ?? (ip?.error === 'curl-missing' ? t('n_curl') : '—');
          const where = ip?.ip ? [ip.city, ip.country].filter(Boolean).join(', ') : '';
          const kv = rows => h('div', {className: 'wb-kv'}, rows.flatMap(([k, val, extra, level, title], i) => [
            h('span', {key: `${i}k`}, k),
            h('span', {key: `${i}v`, className: 'wb-num', 'data-level': level, title: title || val}, val),
            h('span', {key: `${i}x`}, extra || ''),
          ]));
          const info = [
            [t('n_local'), local, v.iface],
            [t('n_public'), ipText, size === 'm' ? '' : where, undefined, [ip?.ip, where, ip?.org].filter(Boolean).join('\n')],
            [t('n_proxy'), proxyText, ''],
          ];
          const pings = v.pings.map(p => [p.name, p.error ? (p.error === 'curl-missing' ? t('n_curl') : t('n_unreachable')) : `${p.ms} ms`, '', latLevel(p), p.url]);
          const rates = h('div', {className: 'wb-rates'},
            h('div', null, h('small', null, `↓ ${t('n_down')}`), h('b', {className: 'wb-num'}, rateText(last[0]))),
            h('div', null, h('small', null, `↑ ${t('n_up')}`), h('b', {className: 'wb-num'}, rateText(last[1]))));
          const max = Math.max(1, ...v.rates.flat());
          const pts = i => v.rates.map((r, j, all) => `${(j / Math.max(1, all.length - 1)) * 100},${(1 - r[i] / max) * 30}`).join(' ');
          const spark = (size === 't' || size === 'l' || size === 'w') && v.rates.length > 1
            ? h('div', {className: 'wb-spark', title: `↓ ${rateText(Math.max(...v.rates.map(r => r[0])))} · ↑ ${rateText(Math.max(...v.rates.map(r => r[1])))}`},
              h('svg', {viewBox: '0 0 100 30', preserveAspectRatio: 'none'},
                h('polygon', {points: `0,30 ${pts(0)} 100,30`}),
                h('polyline', {points: pts(0)}),
                h('polyline', {className: 'wb-up', points: pts(1)}))) : null;
          const refresh = () => {
            setBusy(true);
            call('network.get', {targets, fresh: true}).then(() => res.reload(), () => res.reload()).finally(() => setBusy(false));
          };
          if (size === 's') return h('div', {className: 'wb-net', 'data-size': size}, rates);
          if (size === 'm') return h('div', {className: 'wb-net', 'data-size': size}, rates, kv(info));
          if (size === 'w') return h('div', {className: 'wb-net', 'data-size': size}, rates, spark, kv(info), pings.length ? kv(pings) : null);
          return h('div', {className: 'wb-net', 'data-size': size},
            rates, spark, kv(info),
            pings.length ? h('div', {className: 'wb-sect', style: {padding: 0}}, t('n_latency')) : null,
            pings.length ? kv(pings) : null,
            h('div', {className: 'wb-notefoot', style: {marginTop: 'auto'}}, h('span', null, v.gateway ? `${v.iface} · ${v.gateway}` : v.iface),
              h('button', {type: 'button', className: 'wb-btn', disabled: busy, onClick: refresh}, busy ? '…' : t('refresh'))));
        }
        Network.workboard = {
          apiVersion: 1, sizes: ['m', 's', 't', 'l', 'w'], defaultSize: 't', description: () => t('d_network'),
          settings: [{key: 'targets', type: 'textarea', label: () => t('f_targets'), default: () => t('defaultTargets')}],
        };

        const NP_APPS = ['music', 'spotify'];
        const clockText = ms => {
          const s = Math.max(0, Math.floor(ms / 1000));
          const hours = Math.floor(s / 3600);
          return hours ? `${hours}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` : `${Math.floor(s / 60)}:${pad(s % 60)}`;
        };
        const NOTE_ICON = ['M9 18V5l11-2v13', {tag: 'circle', attrs: {cx: 6, cy: 18, r: 3}}, {tag: 'circle', attrs: {cx: 17, cy: 16, r: 3}}];

        function NowPlaying({size, config}) {
          useLocale();
          const now = useNow();
          const prefer = NP_APPS.includes(config?.app) ? config.app : 'auto';
          const res = useRemote('nowplaying.get', {app: prefer}, NOWPLAYING_MS);
          const [busy, setBusy] = useState(false);
          const [error, setError] = useState('');
          const v = res.value;
          const track = v?.track;
          const app = track?.app ?? (prefer !== 'auto' ? prefer : v?.apps?.[0] ?? 'music');
          const act = action => {
            setBusy(true);
            call('nowplaying.control', {app, action, bundle: track?.bundle}).then(() => setError(''), e => setError(String(e?.message || e))).finally(() => { setBusy(false); res.reload(); });
          };
          const msg = (text, button) => h('div', {className: 'wb-photo-msg'}, h('span', null, text), button ?? null);
          if (!v) return blank(res.error || '…');
          if (!v.supported) return msg(t('np_mac'));
          if (v.denied) return msg(fill(t('np_denied'), {app: t(`np_${v.denied}`)}));
          const appLabel = tr => (tr.app === 'system' ? tr.name : t(`np_${tr.app}`));
          if (!track) return msg(error || t('np_idle'), h('button', {type: 'button', className: 'wb-btn wb-cta', disabled: busy, onClick: () => act('open')}, fill(t('np_open'), {app: t(`np_${app}`)})));
          const playing = track.state === 'playing';
          const position = Math.min(track.duration || Infinity, track.position + (playing ? Math.max(0, now.getTime() - v.at) : 0));
          const sub = [track.artist, size === 's' ? '' : track.album].filter(Boolean).join(' — ');
          const ctl = (key, label, icon, primary) => h('button', {key, type: 'button', className: 'wb-btn', 'data-primary': primary ? '' : undefined, disabled: busy, 'aria-label': label, title: label, onClick: () => act(key)}, fillIcon(primary ? 16 : 14, icon));
          const art = h('button', {type: 'button', className: 'wb-npart', title: fill(t('np_open'), {app: appLabel(track)}), style: track.art ? {backgroundImage: `url("${track.art}")`} : undefined, onClick: () => act('open')},
            track.art ? null : svg(size === 's' ? 20 : 28, NOTE_ICON, 1.6));
          const head = h('div', null, h('b', {title: track.title}, track.title), sub ? h('small', {title: sub}, sub) : null);
          const pct = track.duration ? Math.min(100, position / track.duration * 100) : 0;
          const controls = h('div', {className: 'wb-npctl'},
            ctl('previous', t('np_prev'), MEDIA.prev),
            ctl('toggle', playing ? t('np_pause') : t('np_play'), playing ? MEDIA.pause : MEDIA.play, true),
            ctl('next', t('np_next'), MEDIA.next));
          const err = error ? h('div', {className: 'wb-calerr', title: error}, error) : null;
          if (size === 's') {
            return h('div', {className: 'wb-np', 'data-size': size},
              h('div', {className: 'wb-nphead'}, art, head),
              track.duration ? h('div', {className: 'wb-pbar'}, h('i', {style: {width: `${pct}%`}})) : null,
              controls, err);
          }
          return h('div', {className: 'wb-np', 'data-size': size}, art,
            h('div', {className: 'wb-npmain'}, head,
              track.duration ? h('div', {className: 'wb-nptime wb-num'}, h('span', null, clockText(position)),
                h('div', {className: 'wb-pbar'}, h('i', {style: {width: `${pct}%`}})), h('span', null, clockText(track.duration))) : null,
              controls, err));
        }
        NowPlaying.workboard = {
          apiVersion: 1, sizes: ['m', 's', 'w', 't'], title: false, description: () => t('d_nowplaying'),
          settings: [{key: 'app', type: 'select', default: 'auto', label: () => t('f_npApp'), options: ['auto', ...NP_APPS].map(v => ({value: v, label: () => t(`np_${v}`)}))}],
        };

        // 封面按需从 Host 取 data: URL，页面内缓存并限制并发。
        const thumbCache = new Map();
        const thumbQueue = [];
        let thumbActive = 0;
        const pumpThumbs = () => {
          while (thumbActive < 4 && thumbQueue.length) {
            const {url, resolve, reject} = thumbQueue.shift();
            thumbActive++;
            call('video.thumb', {url}).then(resolve, reject).finally(() => { thumbActive--; pumpThumbs(); });
          }
        };
        const loadThumb = url => {
          let entry = thumbCache.get(url);
          if (!entry) {
            entry = {src: '', job: new Promise((resolve, reject) => { thumbQueue.push({url, resolve, reject}); pumpThumbs(); })};
            entry.job.then(src => { entry.src = src; }, () => {});
            thumbCache.set(url, entry);
            if (thumbCache.size > 300) thumbCache.delete(thumbCache.keys().next().value);
          }
          return entry.job;
        };
        function Thumb({url}) {
          const [src, setSrc] = useState(() => thumbCache.get(url)?.src ?? '');
          useEffect(() => {
            if (!url) return undefined;
            let alive = true;
            loadThumb(url).then(s => { if (alive) setSrc(s); }, () => {});
            return () => { alive = false; };
          }, [url]);
          return src ? h('img', {src, alt: '', draggable: false}) : null;
        }

        function Videos({size, config}) {
          useLocale();
          const now = useNow();
          const sources = String(config?.sources || t('defaultVideos'));
          const res = useRemote('video.list', {sources}, VIDEO_MS);
          const items = res.value?.items ?? [];
          const failed = res.value?.errors ?? [];
          const read = useRead(items.map(it => it.url));
          const compact = new Intl.NumberFormat(t('lang'), {notation: 'compact', maximumFractionDigits: 1});
          const meta = it => [it.author, it.date ? relTime(it.date, now.getTime()) : '', size === 'l' && it.views != null ? fill(t('vd_views'), {n: compact.format(it.views)}) : ''].filter(Boolean).join(' · ');
          const link = it => ({key: it.id || it.url, href: it.url, target: '_blank', rel: 'noopener noreferrer', title: `${it.title}\n${meta(it)}`, ...readProps(read, it.url)});
          const strip = size === 'm' || size === 'w';
          const list = !items.length ? blank(res.pending ? '…' : res.error || t('noItems'))
            : strip ? h('div', {className: 'wb-vstrip'}, items.map(it => h('a', {...link(it), className: 'wb-vtile'}, h(Thumb, {url: it.thumb}), h('div', null, h('b', null, it.title)))))
            : h('div', {className: size === 't' ? 'wb-vlist' : 'wb-vgrid'}, items.map(it => h('a', {...link(it), className: 'wb-vcard'},
              h('div', {className: 'wb-vthumb'}, h(Thumb, {url: it.thumb}), it.duration ? h('i', {className: 'wb-num'}, clockText(it.duration * 1000)) : null),
              h('div', null, h('b', null, it.title), h('small', null, meta(it))))));
          return h(React.Fragment, null, list,
            failed.length ? h('div', {className: 'wb-calerr', title: failed.map(e => `${e.source}: ${e.message}`).join('\n')}, fill(t('vd_error'), {n: failed.length})) : null);
        }
        Videos.workboard = {
          apiVersion: 1, sizes: ['l', 't', 'm', 'w'], defaultSize: 'l', description: () => t('d_videos'),
          settings: [{key: 'sources', type: 'textarea', label: () => t('f_videoSources'), default: () => t('defaultVideos')}],
        };

        const PORT_ARM_MS = 3000;
        function Ports({size, config}) {
          useLocale();
          const res = useRemote('ports.list', {}, PORTS_MS);
          const [armed, setArmed] = useState('');
          const [busy, setBusy] = useState(false);
          const [error, setError] = useState('');
          useEffect(() => {
            if (!armed) return undefined;
            const id = setTimeout(() => setArmed(''), PORT_ARM_MS);
            return () => clearTimeout(id);
          }, [armed]);
          const v = res.value;
          if (!v) return blank(res.error || '…');
          if (!v.supported) return blank(t('pt_unsupported'));
          if (v.missing) return blank(t('pt_lsof'));
          const fail = e => setError(String(e?.message || e));
          const items = v.items.filter(x => config?.apps === true || !x.app);
          const hidden = v.items.length - items.length;
          const stop = x => {
            const key = `${x.pid}:${x.port}`;
            if (armed !== key) { setArmed(key); return; }
            setArmed('');
            call('ports.stop', {pid: x.pid, port: x.port}).then(() => { setError(''); res.reload(); }, fail);
          };
          const refresh = () => {
            setBusy(true);
            call('ports.list', {fresh: true}).then(() => res.reload(), fail).finally(() => setBusy(false));
          };
          const row = x => {
            const key = `${x.pid}:${x.port}`;
            const project = x.cwd && x.cwd !== '/' ? baseName(x.cwd) : '';
            const sub = [project ? x.name : '', size === 'm' ? '' : `pid ${x.pid}`, x.public ? t('pt_lan') : ''].filter(Boolean);
            return h('div', {key, className: 'wb-row wb-rowbtn', title: [x.command, x.cwd, x.addresses.join(', ')].filter(Boolean).join('\n'), style: {cursor: 'pointer'},
              onClick: () => window.open(`http://localhost:${x.port}`, '_blank', 'noopener,noreferrer')},
              h('span', {className: 'wb-port wb-num'}, x.port),
              h('div', null, h('b', null, project || x.name), sub.length ? h('small', null, sub.join(' · ')) : null),
              project && size !== 'm' ? rowact(t('o_reveal'), () => { openFile(x.cwd, true).catch(fail); }) : null,
              rowact(armed === key ? t('pt_confirm') : t('pt_stop'), () => stop(x), {danger: true, armed: armed === key}));
          };
          return h(React.Fragment, null,
            h('div', {className: 'wb-rows'}, items.length ? items.map(row) : blank(t('pt_none'))),
            error ? h('div', {className: 'wb-calerr', title: error}, error) : null,
            size === 'm' ? null : h('div', {className: 'wb-notefoot'},
              h('span', null, [items.length ? fill(t('pt_count'), {n: items.length}) : '', hidden ? fill(t('pt_hidden'), {n: hidden}) : ''].filter(Boolean).join(' · ')),
              h('button', {type: 'button', className: 'wb-btn', disabled: busy, onClick: refresh}, busy ? '…' : t('refresh'))));
        }
        Ports.workboard = {
          apiVersion: 1, sizes: ['t', 'l', 'm', 'w'], description: () => t('d_ports'),
          settings: [{key: 'apps', type: 'toggle', default: false, label: () => t('f_ptApps')}],
        };

        const ST_ORDER = ['critical', 'major', 'minor', 'maintenance', 'none'];
        const ST_STATE = {none: 'done', maintenance: 'running', minor: 'waiting', major: 'blocked', critical: 'blocked'};
        function Status({size, config}) {
          useLocale();
          const sources = String(config?.sources ?? t('defaultStatus'));
          const res = useRemote('status.get', {sources, lang: t('lang')}, STATUS_MS);
          const v = res.value;
          if (!v) return blank(res.error || '…');
          if (!v.items.length) return blank(t('st_empty'));
          const rank = x => (x.error ? ST_ORDER.length : ST_ORDER.indexOf(x.level));
          const items = [...v.items].sort((a, b) => rank(a) - rank(b));
          const issues = items.filter(x => !x.error && x.level !== 'none');
          const detail = x => (x.error ? [t('st_error')] : [t(`st_${x.level}`), x.incidents[0]?.title || x.components.map(c => c.name).join(', ')]).filter(Boolean).join(' · ');
          const summary = issues.length ? fill(t('st_issues'), {n: issues.length}) : items.every(x => x.error) ? t('st_error') : t('st_all');
          if (size === 's') {
            return h('div', {className: 'wb-hero'},
              h('small', null, t('status')),
              h('span', {className: 'wb-stbig', 'data-state': issues.length ? ST_STATE[issues[0].level] : 'done'}, summary),
              h('small', {title: issues.map(x => `${x.name}: ${detail(x)}`).join('\n')}, issues.map(x => x.name).join(', ')));
          }
          const row = x => {
            const state = x.error ? undefined : ST_STATE[x.level];
            const lines = x.error ? [x.error] : [...x.incidents.map(i => i.title), ...x.components.map(c => `${c.name}: ${t(`st_${c.status}`)}`)];
            return h('a', {key: x.url + x.name, className: 'wb-row wb-rowbtn', 'data-state': state === 'blocked' ? 'blocked' : state === 'waiting' ? 'waiting' : undefined,
              href: x.url, target: '_blank', rel: 'noopener noreferrer', title: [x.description, ...lines].filter(Boolean).join('\n')},
              h('span', {className: 'wb-dot', 'data-state': state}),
              h('div', null, h('b', null, x.name), h('small', null, detail(x))));
          };
          return h(React.Fragment, null,
            h('div', {className: 'wb-rows'}, items.map(row)),
            size === 'm' ? null : h('div', {className: 'wb-notefoot'}, h('span', null, summary)));
        }
        Status.workboard = {
          apiVersion: 1, sizes: ['t', 'l', 'm', 's', 'w'], description: () => t('d_status'),
          settings: [{key: 'sources', type: 'textarea', label: () => t('f_statusSources'), default: () => t('defaultStatus')}],
        };

        function Papers({size, config}) {
          useLocale();
          const ws = useWorkspace();
          const kinds = config?.models === false ? ['papers'] : ['papers', 'models'];
          const [picked, setPicked] = useState('papers');
          const [error, setError] = useState('');
          const kind = kinds.includes(picked) ? picked : kinds[0];
          const res = useRemote('papers.get', {kind}, PAPERS_MS);
          const v = res.value?.kind === kind ? res.value : null;
          const read = useRead(v ? v.items.map(it => it.url) : []);
          const compact = new Intl.NumberFormat(t('lang'), {notation: 'compact', maximumFractionDigits: 1});
          const ask = (e, it) => {
            e.preventDefault();
            e.stopPropagation();
            launch(fill(t('pp_prompt'), {url: it.url, title: it.title}), ws.path, ws.id).then(() => setError(''), err => setError(String(err?.message || err)));
          };
          const meta = it => (kind === 'papers'
            ? [size === 'l' ? it.summary : it.keywords.join(', ')].filter(Boolean)
            : [it.task, fill(t('pp_downloads'), {n: compact.format(it.downloads)})].filter(Boolean)).join(' · ');
          const row = (it, i) => h('a', {key: it.id, className: 'wb-row wb-rowbtn', ...readProps(read, it.url), href: it.url, target: '_blank', rel: 'noopener noreferrer',
            title: [it.title, kind === 'papers' ? it.summary : meta(it)].filter(Boolean).join('\n')},
            h('span', {className: 'wb-rank wb-num', 'data-top': i < 3 ? '' : undefined}, i + 1),
            h('div', null, h('b', null, it.title), size === 'm' || !meta(it) ? null : h('small', null, meta(it))),
            kind === 'papers' && size !== 'm' ? h('button', {type: 'button', className: 'wb-btn wb-rowact', onClick: e => ask(e, it)}, t('toAgent')) : null,
            size === 't' ? null : h('span', {className: 'wb-num', title: kind === 'papers' ? fill(t('pp_votes'), {n: it.votes}) : fill(t('pp_likes'), {n: it.likes})},
              `▲ ${compact.format(kind === 'papers' ? it.votes : it.likes)}`));
          return h('div', {className: 'wb-trend'},
            kinds.length > 1 ? h('div', {className: 'wb-seg', role: 'tablist'}, kinds.map(k => h('button', {key: k, type: 'button', role: 'tab', className: 'wb-btn', 'aria-pressed': k === kind, onClick: () => setPicked(k)}, t(`pp_${k}`)))) : null,
            h('div', {className: 'wb-rows'}, v ? v.items.map(row) : blank(res.error || '…')),
            error ? h('div', {className: 'wb-calerr', title: error}, error) : null);
        }
        Papers.workboard = {
          apiVersion: 1, sizes: ['l', 't', 'm', 'w'], defaultSize: 'l', description: () => t('d_papers'),
          settings: [{key: 'models', type: 'toggle', default: true, label: () => t('f_ppModels')}],
        };

        const usd = v => (v >= 100 ? v.toFixed(0) : v >= 1 ? v.toFixed(2).replace(/\.?0+$/, '') : String(Number(v.toPrecision(2))));
        function Models({size, config}) {
          useLocale();
          const [kind, setKind] = useState('top');
          const res = useRemote('models.get', {kind, vendors: String(config?.vendors ?? '')}, MODELS_MS);
          const v = res.value?.kind === kind ? res.value : null;
          const read = useRead(v ? v.items.map(it => it.url) : []);
          const lang = t('lang');
          const compact = new Intl.NumberFormat(lang, {notation: 'compact', maximumFractionDigits: 1});
          const priced = it => it.input != null && it.output != null;
          const price = it => (it.free ? t('md_free') : priced(it) ? `$${usd(it.input)} / $${usd(it.output)}` : '—');
          const meta = it => [kind === 'new' && it.created ? new Date(it.created).toLocaleDateString(lang, {month: 'short', day: 'numeric'}) : '', it.vendor,
            it.context ? fill(t('md_ctx'), {n: compact.format(it.context)}) : ''].filter(Boolean).join(' · ');
          const row = (it, i) => h('a', {key: it.id, className: 'wb-row wb-rowbtn', ...readProps(read, it.url), href: it.url, target: '_blank', rel: 'noopener noreferrer',
            title: [it.id, meta(it), priced(it) && !it.free ? fill(t('md_price'), {i: usd(it.input), o: usd(it.output)}) : ''].filter(Boolean).join('\n')},
            h('span', {className: 'wb-rank wb-num', 'data-top': kind === 'top' && i < 3 ? '' : undefined}, i + 1),
            h('div', null, h('b', null, it.name), size === 'm' ? null : h('small', null, meta(it))),
            size === 't' ? null : h('span', {className: 'wb-num'}, price(it)));
          return h('div', {className: 'wb-trend'},
            h('div', {className: 'wb-seg', role: 'tablist'}, ['top', 'new'].map(k => h('button', {key: k, type: 'button', role: 'tab', className: 'wb-btn', 'aria-pressed': k === kind, onClick: () => setKind(k)}, t(`md_${k}`)))),
            h('div', {className: 'wb-rows'}, v ? (v.items.length ? v.items.map(row) : blank(t('md_none'))) : blank(res.error || '…')));
        }
        Models.workboard = {
          apiVersion: 1, sizes: ['l', 't', 'm', 'w'], defaultSize: 'l', description: () => t('d_models'),
          settings: [{key: 'vendors', type: 'text', label: () => t('f_mdVendors'), placeholder: 'deepseek anthropic openai'}],
        };

        // 连续、同名的放假日合成一个假期；同名的上班日即该假期的调休。
        function holidayPeriods(days) {
          const periods = [];
          for (const d of days) {
            if (!d.off) continue;
            const last = periods.at(-1);
            if (last && last.name === d.name && shiftDay(last.end, 1) === d.date) last.end = d.date;
            else periods.push({name: d.name, start: d.date, end: d.date});
          }
          for (const p of periods) {
            p.len = Math.round((keyDate(p.end) - keyDate(p.start)) / 86400000) + 1;
            p.work = days.filter(d => !d.off && d.name === p.name && Math.abs(keyDate(d.date) - keyDate(p.start)) < 40 * 86400000).map(d => d.date);
          }
          return periods;
        }

        function Holiday({size}) {
          useLocale();
          const now = useNow();
          const lang = t('lang');
          const res = useRemote('holiday.get', {year: now.getFullYear()}, HOLIDAY_MS);
          const v = res.value;
          if (!v) return blank(res.error || '…');
          const today = dayKey(now);
          const periods = holidayPeriods(v.days).filter(p => p.end >= today);
          const dateText = k => keyDate(k).toLocaleDateString(lang, {month: 'short', day: 'numeric'});
          const rangeText = p => (p.len > 1 ? `${dateText(p.start)}–${dateText(p.end)}` : keyDate(p.start).toLocaleDateString(lang, {month: 'short', day: 'numeric', weekday: 'short'}));
          const daysTo = p => Math.round((keyDate(p.start) - keyDate(today)) / 86400000);
          const off = v.days.find(d => d.date === today && d.off);
          const work = v.days.find(d => d.date === today && !d.off);
          const todayLine = off ? fill(t('hd_todayOff'), {name: off.name}) : work ? fill(t('hd_todayWork'), {name: work.name}) : '';
          const todayState = off ? 'done' : work ? 'waiting' : undefined;
          const head = [now.toLocaleDateString(lang, {month: 'long', day: 'numeric', weekday: 'short'}), lang.startsWith('zh') ? lunar(now) : '', todayLine].filter(Boolean).join(' · ');
          const num = p => (daysTo(p) <= 0 ? [t('hd_now')] : [daysTo(p), h('small', {key: 'u'}, daysTo(p) === 1 ? t('dayUnit') : t('dayUnits'))]);
          const sub = p => [rangeText(p), fill(t('hd_off'), {n: p.len}), p.work.length ? fill(t('hd_work'), {d: p.work.map(dateText).join(lang.startsWith('zh') ? '、' : ', ')}) : ''].filter(Boolean).join(' · ');
          if (!periods.length) return h('div', {className: 'wb-hero'}, h('small', null, head), h('span', {className: 'wb-muted'}, t('hd_none')));
          if (size === 's') {
            const p = periods[0];
            return h('div', {className: 'wb-hero'},
              h('small', {'data-state': todayState, className: 'wb-hdtoday'}, todayLine || p.name),
              h('span', {className: 'wb-big wb-num'}, ...num(p)),
              h('small', {title: sub(p)}, todayLine ? `${p.name} · ${rangeText(p)}` : rangeText(p)));
          }
          return h(React.Fragment, null,
            h('div', {className: 'wb-hdhead', 'data-state': todayState}, head),
            h('div', {className: 'wb-rows'}, periods.slice(0, size === 'm' ? 2 : 12).map(p => h('div', {key: p.start, className: 'wb-row', title: sub(p)},
              h('div', null, h('b', null, p.name), h('small', null, sub(p))),
              h('span', {className: 'wb-big wb-num'}, ...num(p))))));
        }
        Holiday.workboard = {apiVersion: 1, sizes: ['m', 's', 't'], description: () => t('d_holiday')};

        const AC_GAP = 3;
        const AC_MAX_WEEKS = 53;
        const AC_LAB_H = 12;
        const AC_LAB_GAP = 4;
        function Activity({size, config}) {
          useLocale();
          const now = useNow();
          const prefs = usePrefs();
          const res = useRemote('usage.get', {days: AC_MAX_WEEKS * 7 + 6}, USAGE_MS);
          const ref = useRef(null);
          const [box, setBox] = useState({w: 0, h: 0});
          const [hover, setHover] = useState(null);
          useEffect(() => {
            const el = ref.current;
            if (!el || typeof ResizeObserver !== 'function') return undefined;
            const ro = new ResizeObserver(([e]) => setBox({w: Math.floor(e.contentRect.width), h: Math.floor(e.contentRect.height)}));
            ro.observe(el);
            return () => ro.disconnect();
          }, [Boolean(res.value)]);
          const v = res.value;
          if (!v) return blank(res.error || '…');
          const metric = config?.metric === 'requests' ? 'requests' : 'tokens';
          const byDay = new Map();
          for (const r of v.rows) {
            const acc = byDay.get(r.day) ?? {tokens: 0, requests: 0};
            acc.tokens += tokensOf(r);
            acc.requests += r.requests;
            byDay.set(r.day, acc);
          }
          const lang = t('lang');
          const zh = lang.startsWith('zh');
          const labW = zh ? 12 : 24;
          const cell = Math.max(6, Math.min(14, Math.floor((box.h - AC_LAB_H - AC_LAB_GAP - AC_GAP * 6) / 7)));
          const weeks = Math.max(1, Math.min(AC_MAX_WEEKS, Math.floor((box.w - labW - AC_LAB_GAP + AC_GAP) / (cell + AC_GAP))));
          const weekStart = Number(prefs.weekStart ?? (zh ? '1' : '0'));
          const today = v.today;
          const back = (keyDate(today).getDay() - weekStart + 7) % 7;
          const first = shiftDay(today, -back - (weeks - 1) * 7);
          const cells = Array.from({length: weeks * 7}, (_, i) => shiftDay(first, i));
          const values = cells.filter(d => d <= today).map(d => byDay.get(d)?.[metric] ?? 0);
          const sorted = values.filter(x => x > 0).sort((a, b) => a - b);
          const cut = q => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
          const steps = [cut(0.25), cut(0.5), cut(0.75)];
          const level = x => (x <= 0 ? 0 : 1 + steps.filter(s => x > s).length);
          const total = values.reduce((a, x) => a + x, 0);
          const active = sorted.length;
          let streak = 0;
          for (let d = byDay.get(today)?.[metric] ? today : shiftDay(today, -1); (byDay.get(d)?.[metric] ?? 0) > 0; d = shiftDay(d, -1)) streak++;
          let best = 0;
          let run = 0;
          for (const x of values) { run = x > 0 ? run + 1 : 0; best = Math.max(best, run); }
          const unit = metric === 'tokens' ? t('ac_tokens') : t('ac_requests');
          const grid = h('div', {className: 'wb-heat', style: {gridTemplateRows: `repeat(7, ${cell}px)`, gridAutoColumns: `${cell}px`, gap: `${AC_GAP}px`},
            onMouseOver: e => setHover(e.target.dataset?.day ?? null), onMouseLeave: () => setHover(null)},
            box.w ? cells.map(d => {
              if (d > today) return h('i', {key: d, 'data-future': ''});
              const x = byDay.get(d);
              return h('i', {key: d, 'data-day': d, 'data-level': level(x?.[metric] ?? 0), 'data-today': d === today ? '' : undefined});
            }) : null);
          const months = [];
          for (let c = 0; c < weeks; c++) {
            const d = cells.slice(c * 7, c * 7 + 7).find(x => x.endsWith('-01'));
            if (!d || weeks - c < 3 || (months.length && c - months[months.length - 1].c < 3)) continue;
            months.push({c, text: keyDate(d).toLocaleDateString(lang, {month: 'short'})});
          }
          const head = h('div', {className: 'wb-heatmon'},
            box.w ? months.map(m => h('span', {key: m.c, style: {left: `${m.c * (cell + AC_GAP)}px`}}, m.text)) : null);
          const side = h('div', {className: 'wb-heatwk', style: {gridTemplateRows: `repeat(7, ${cell}px)`, rowGap: `${AC_GAP}px`}},
            box.w ? cells.slice(0, 7).map((d, r) => h('span', {key: r}, [1, 3, 5].includes((weekStart + r) % 7) ? keyDate(d).toLocaleDateString(lang, {weekday: zh ? 'narrow' : 'short'}) : '')) : null);
          const hx = hover ? byDay.get(hover) : null;
          const tip = hover ? fill(t('u_day'), {d: keyDate(hover).toLocaleDateString(lang, {month: 'short', day: 'numeric', weekday: 'short'}), t: compact(hx?.tokens ?? 0), r: hx?.requests ?? 0}) : '';
          const stats = [fill(t('ac_total'), {n: compact(total), u: unit}), fill(t('ac_days'), {n: active}), streak ? fill(t('ac_streak'), {n: streak}) : '', size === 'm' ? '' : fill(t('ac_best'), {n: best})].filter(Boolean);
          return h('div', {className: 'wb-activity'},
            h('div', {className: 'wb-heatbox', ref},
              h('div', {className: 'wb-heatwrap', style: {gridTemplateColumns: `${labW}px auto`, gridTemplateRows: `${AC_LAB_H}px auto`}}, h('span'), head, side, grid)),
            h('div', {className: 'wb-notefoot wb-num', style: {marginTop: 0}}, h('span', null, tip || stats.join(' · '))));
        }
        Activity.workboard = {
          apiVersion: 1, sizes: ['w', 'l', 'm'], description: () => t('d_activity'),
          settings: [{key: 'metric', type: 'select', default: 'tokens', label: () => t('f_acMetric'), options: [{value: 'tokens', label: () => t('ac_tokens')}, {value: 'requests', label: () => t('ac_requests')}]}],
        };

        const builtins = [
          ['workboard.today', 'today', Today], ['workboard.todo', 'todo', Todo], ['workboard.note', 'note', Note], ['workboard.calendar', 'calendar', Calendar],
          ['workboard.weather', 'weather', Weather], ['workboard.clock', 'clock', Clock], ['workboard.quote', 'quote', Quote], ['workboard.countdown', 'countdown', Countdown],
          ['workboard.worldclock', 'worldclock', WorldClock], ['workboard.focus', 'focus', Focus], ['workboard.links', 'links', Links], ['workboard.progress', 'progress', Progress],
          ['workboard.agents', 'agents', Agents], ['workboard.feed', 'feed', Feed], ['workboard.habits', 'habits', Habits],
          ['workboard.prompt', 'prompt', Prompt], ['workboard.usage', 'usage', Usage], ['workboard.running', 'running', Running],
          ['workboard.git', 'git', Git], ['workboard.github', 'github', GitHub], ['workboard.system', 'system', System], ['workboard.photo', 'photo', Photo], ['workboard.market', 'market', Market],
          ['workboard.trending', 'trending', Trending],
          ['workboard.outputs', 'outputs', Outputs], ['workboard.schedules', 'tasks', Schedules], ['workboard.pinned', 'pinned', Pinned],
          ['workboard.files', 'files', Files], ['workboard.clipboard', 'clipboard', Clipboard], ['workboard.network', 'network', Network],
          ['workboard.nowplaying', 'nowplaying', NowPlaying], ['workboard.ambient', 'ambient', Ambient], ['workboard.videos', 'videos', Videos],
          ['workboard.attention', 'attention', Attention], ['workboard.brief', 'brief', Brief],
          ['workboard.ports', 'ports', Ports], ['workboard.status', 'status', Status], ['workboard.papers', 'papers', Papers], ['workboard.holiday', 'holiday', Holiday], ['workboard.activity', 'activity', Activity],
          ['workboard.apps', 'apps', Apps], ['workboard.models', 'models', Models],
        ];
        const BUILTIN_CATEGORY = {
          daily: ['today', 'clock', 'worldclock', 'weather', 'countdown', 'holiday', 'progress', 'habits', 'photo', 'nowplaying'],
          agent: ['attention', 'agents', 'running', 'brief', 'prompt', 'usage', 'activity', 'status', 'outputs', 'tasks', 'pinned'],
          news: ['trending', 'feed', 'papers', 'models', 'videos', 'market', 'quote'],
          tools: ['todo', 'note', 'calendar', 'focus', 'ambient', 'links', 'apps', 'git', 'github', 'system', 'files', 'clipboard', 'network', 'ports'],
        };
        for (const [category, keys] of Object.entries(BUILTIN_CATEGORY)) {
          for (const key of keys) {
            const component = builtins.find(b => b[1] === key)[2];
            component.workboard = {...component.workboard, category};
          }
        }
        const BUILTIN_IDS = new Set(builtins.map(([id]) => id));

        const SCROLL_KEY = 'dsh-workboard:scroll';
        const readScroll = () => { try { return JSON.parse(localStorage.getItem(SCROLL_KEY)) || {}; } catch { return {}; } };
        const scrollMemory = readScroll();
        const rememberScroll = (id, top) => {
          scrollMemory[id] = Math.round(top);
          try { localStorage.setItem(SCROLL_KEY, JSON.stringify(scrollMemory)); } catch {}
        };

        function Panel({renderSlot}) {
          useLocale();
          const list = useSyncExternalStore(widgets.subscribe, widgets.getSnapshot, widgets.getSnapshot);
          const prefsSnap = useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, prefsStore.getSnapshot);
          const {error: dataError} = useData();
          const [boards, setBoards] = useState(null);
          const [activeId, setActiveId] = useState(null);
          const [board, setBoard] = useState(null);
          const [editing, setEditing] = useState(false);
          const [modal, setModal] = useState(null);
          const [renaming, setRenaming] = useState(false);
          const [confirmDelete, setConfirmDelete] = useState(false);
          const [drag, setDrag] = useState(null);
          const [error, setError] = useState('');
          const fail = e => setError(String(e?.message || e));
          const pageRef = useRef(null);
          const restoring = useRef(false);
          const [introClosed, setIntroClosed] = useState(false);

          useEffect(() => { void prefsStore.load(); }, []);
          useEffect(() => customs.start(), []);
          // 引导只给首次安装的用户：首次读到空 prefs 时记为 pending，升级上来的老用户 prefs 非空、不会看到。
          useEffect(() => {
            if (prefsSnap.loaded && !Object.keys(prefsSnap.values).length) prefsStore.put({intro: 'pending'}).catch(() => {});
          }, [prefsSnap.loaded]);
          const introPending = prefsSnap.values.intro === 'pending' && !introClosed;
          const closeIntro = () => { setIntroClosed(true); prefsStore.put({intro: 'done'}).catch(() => {}); };
          useEffect(() => { if (editing && introPending) closeIntro(); }, [editing, introPending]);
          // widget 内容异步撑高页面：内容尺寸变化时重试，到位、用户操作或超时后停止。
          useEffect(() => {
            const el = pageRef.current;
            const target = board ? scrollMemory[board.id] ?? 0 : 0;
            if (!el || !target) return undefined;
            restoring.current = true;
            const inputs = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
            let ro = null;
            let timer = 0;
            const stop = () => {
              restoring.current = false;
              ro?.disconnect();
              clearTimeout(timer);
              inputs.forEach(n => el.removeEventListener(n, stop));
            };
            const apply = () => {
              el.scrollTop = target;
              if (Math.abs(el.scrollTop - target) < 2) stop();
            };
            inputs.forEach(n => el.addEventListener(n, stop, {passive: true}));
            timer = setTimeout(stop, 5000);
            if (typeof ResizeObserver === 'function' && el.firstElementChild) {
              ro = new ResizeObserver(apply);
              ro.observe(el.firstElementChild);
            }
            apply();
            return stop;
          }, [board?.id]);
          useEffect(() => { call('board.list').then(setBoards, fail); }, []);
          useEffect(() => {
            if (!boards?.length || !prefsSnap.loaded || (activeId && boards.some(b => b.id === activeId))) return;
            const saved = prefsSnap.values.activeBoard;
            setActiveId(boards.some(b => b.id === saved) ? saved : boards[0].id);
          }, [boards, prefsSnap.loaded, activeId]);
          useEffect(() => {
            if (!activeId) return undefined;
            let alive = true;
            setBoard(null);
            call('board.get', {id: activeId}).then(b => { if (alive) setBoard(b); }, fail);
            return () => { alive = false; };
          }, [activeId]);

          const saveBoard = next => {
            setBoard(next);
            setBoards(bs => bs?.map(b => (b.id === next.id ? {id: next.id, title: next.title} : b)));
            call('board.put', {board: next}).catch(fail);
          };
          // 新安装插件的 widget 只自动加入当前看板一次，其余看板仅记入 known；用户移除后不再回来。升级带来的新内置 widget 只进组件库。
          useEffect(() => {
            if (!board) return undefined;
            const known = new Set(board.known ?? []);
            const fresh = list.filter(w => w.id && !known.has(w.id));
            if (!fresh.length) return undefined;
            let alive = true;
            const place = fresh.filter(w => !BUILTIN_IDS.has(w.id)).map(w => ({id: w.id, size: w.defaultSize}));
            call('board.adopt', {id: board.id, known: fresh.map(w => w.id), place}).then(b => { if (alive) setBoard(b); }, fail);
            return () => { alive = false; };
          }, [board, list]);
          useEffect(() => {
            if (!editing || modal || renaming) return undefined;
            const onKey = e => { if (e.key === 'Escape' && !e.isComposing) { setEditing(false); setConfirmDelete(false); } };
            window.addEventListener('keydown', onKey);
            return () => window.removeEventListener('keydown', onKey);
          }, [editing, modal, renaming]);

          const boardTitle = b => b.title || (b.id === 'work' ? t('defaultBoard') : t('untitled'));
          const switchTo = id => {
            setRenaming(false);
            setConfirmDelete(false);
            if (id === activeId) return;
            setActiveId(id);
            prefsStore.put({activeBoard: id}).catch(() => {});
          };
          const createBoard = () => {
            call('board.create', {title: fill(t('newBoard'), {n: (boards?.length ?? 0) + 1}), known: list.map(w => w.id)}).then(b => {
              setBoards(bs => [...(bs ?? []), {id: b.id, title: b.title}]);
              switchTo(b.id);
              setEditing(true);
            }, fail);
          };
          const deleteBoard = () => {
            if (!confirmDelete) { setConfirmDelete(true); return; }
            setConfirmDelete(false);
            call('board.delete', {id: activeId}).then(() => call('board.list')).then(l => {
              setBoards(l);
              setActiveId(l[0]?.id ?? null);
              if (l[0]) prefsStore.put({activeBoard: l[0].id}).catch(() => {});
            }, fail);
          };
          const commitRename = value => {
            setRenaming(false);
            const title = value.trim().slice(0, 80);
            if (board && title !== board.title) saveBoard({...board, title});
          };
          const updateCell = (id, patch) => saveBoard({...board, widgets: board.widgets.map(c => (c.id === id ? {...c, ...patch} : c))});
          const removeCell = id => saveBoard({...board, widgets: board.widgets.filter(c => c.id !== id)});
          const addWidget = w => {
            saveBoard({...board, widgets: [...board.widgets, {id: w.id, size: w.defaultSize}], known: [...new Set([...(board.known ?? []), w.id])]});
          };
          const drop = (targetId, after) => {
            const from = drag?.id;
            setDrag(null);
            if (!from || from === targetId) return;
            const rest = board.widgets.filter(c => c.id !== from);
            const moved = board.widgets.find(c => c.id === from);
            const at = rest.findIndex(c => c.id === targetId) + (after ? 1 : 0);
            saveBoard({...board, widgets: [...rest.slice(0, at), moved, ...rest.slice(at)]});
          };

          const byId = new Map(list.map(w => [w.id, w]));
          const cells = (board?.widgets ?? []).filter(c => byId.has(c.id));
          const shownError = error || dataError;
          const modalWidget = modal?.type === 'settings' ? byId.get(modal.id) : null;
          const modalCustom = modal?.type === 'agent' || modal?.type === 'source' ? byId.get(modal.id) ?? null : null;
          const forgetCell = id => saveBoard({...board, widgets: board.widgets.filter(c => c.id !== id), known: (board.known ?? []).filter(k => k !== id)});

          const tabs = h('div', {className: 'wb-tabs', role: 'tablist'},
            (boards ?? []).map(b => (b.id === activeId && renaming
              ? h('input', {key: b.id, className: 'wb-tabinput', autoFocus: true, defaultValue: b.title || boardTitle(b), 'aria-label': t('rename'),
                onBlur: e => commitRename(e.target.value),
                onKeyDown: e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur(); else if (e.key === 'Escape') setRenaming(false); }})
              : h('button', {key: b.id, type: 'button', role: 'tab', className: 'wb-btn wb-tab', 'aria-selected': b.id === activeId, title: t('rename'),
                onClick: () => switchTo(b.id), onDoubleClick: () => { switchTo(b.id); setRenaming(true); }}, boardTitle(b)))),
            h('button', {type: 'button', className: 'wb-btn wb-iconbtn wb-newboard', 'aria-label': t('newBoardLabel'), title: t('newBoardLabel'), onClick: createBoard}, h(Icon.plus)));
          const showTabs = editing || renaming || (boards?.length ?? 0) > 1;
          const bannerFirst = cells.length > 0 && byId.get(cells[0].id).banner;
          const headless = !showTabs && !shownError && bannerFirst;
          const showIntro = introPending && board && !editing && !modal && !renaming;
          const introTip = style => h('div', {className: 'wb-intro', role: 'status', style},
            h('span', null, t('intro')),
            h('button', {type: 'button', className: 'wb-action', onClick: closeIntro}, t('introOk')));
          const editButton = h('span', {key: 'edit', className: 'wb-introat'},
            h('button', {type: 'button', className: 'wb-btn wb-iconbtn', 'aria-label': t('edit'), title: t('edit'), onClick: () => setEditing(true)}, h(Icon.pencil)),
            showIntro && !headless ? introTip() : null);

          const actions = editing
            ? [
              (boards?.length ?? 0) > 1 ? h('button', {key: 'del', type: 'button', className: 'wb-action', 'data-danger': '', onClick: deleteBoard, onBlur: () => setConfirmDelete(false)}, confirmDelete ? t('confirmDelete') : t('deleteBoard')) : null,
              h('button', {key: 'add', type: 'button', className: 'wb-action', onClick: () => setModal({type: 'gallery'})}, h(Icon.plus), t('addWidget')),
              h('button', {key: 'done', type: 'button', className: 'wb-action', 'data-primary': '', onClick: () => { setEditing(false); setConfirmDelete(false); }}, t('doneEdit')),
            ]
            : [editButton];

          const card = cell => {
            const w = byId.get(cell.id);
            const size = w.sizes.includes(cell.size) ? cell.size : w.defaultSize;
            const [c, r] = SIZES[size];
            const openSettings = () => setModal({type: 'settings', id: cell.id});
            const bannerEdit = headless && w.banner && cell === cells[0];
            const introHere = bannerEdit && showIntro;
            return h('section', {
              key: cell.id, className: 'wb-card', 'aria-label': w.label(), 'data-widget': cell.id, 'data-c': c, style: {'--c': c, '--r': r},
              'data-banner': w.banner ? '' : undefined,
              'data-intro': introHere ? '' : undefined,
              'data-dragging': drag?.id === cell.id ? '' : undefined,
              'data-drop': drag?.over === cell.id ? (drag.after ? 'after' : 'before') : undefined,
              draggable: editing,
              onDragStart: editing ? e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', cell.id); setDrag({id: cell.id}); } : undefined,
              onDragOver: editing ? e => {
                if (!drag || drag.id === cell.id) return;
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                const after = e.clientX > rect.left + rect.width / 2;
                if (drag.over !== cell.id || drag.after !== after) setDrag({...drag, over: cell.id, after});
              } : undefined,
              onDrop: editing ? e => { e.preventDefault(); drop(cell.id, drag?.after); } : undefined,
              onDragEnd: editing ? () => setDrag(null) : undefined,
            },
            editing ? h('div', {className: 'wb-tools', draggable: false, onMouseDown: e => e.stopPropagation()},
              w.sizes.length > 1 ? h('select', {value: size, 'aria-label': t('size'), onChange: e => updateCell(cell.id, {size: e.target.value})}, w.sizes.map(s => h('option', {key: s, value: s}, sizeLabel(s)))) : null,
              w.custom ? h('button', {type: 'button', className: 'wb-btn', 'aria-label': t('cw_edit'), title: t('cw_edit'), onClick: () => setModal({type: 'agent', id: cell.id})}, h(Icon.sparkle)) : null,
              w.custom ? h('button', {type: 'button', className: 'wb-btn', 'aria-label': t('cw_source'), title: t('cw_source'), onClick: () => setModal({type: 'source', id: cell.id})}, h(Icon.code)) : null,
              w.settings.length ? h('button', {type: 'button', className: 'wb-btn', 'aria-label': t('settings'), title: t('settings'), onClick: openSettings}, h(Icon.gear)) : null,
              h('button', {type: 'button', className: 'wb-btn', 'aria-label': t('remove'), title: t('remove'), onClick: () => removeCell(cell.id)}, h(Icon.x))) : null,
            !editing && w.settings.length && !(w.title && !w.banner) ? h('button', {type: 'button', className: 'wb-btn wb-hact', 'aria-label': t('settings'), title: t('settings'), onClick: openSettings}, h(Icon.gear)) : null,
            bannerEdit ? h('button', {type: 'button', className: 'wb-btn wb-hact wb-hedit', 'aria-label': t('edit'), title: t('edit'), onClick: () => setEditing(true)}, h(Icon.pencil)) : null,
            introHere ? introTip({top: 26, right: w.settings.length ? 20 : -10, '--ax': '8px'}) : null,
            w.title && !w.banner ? h('header', null, h('h3', null, w.label()),
              !editing && w.settings.length ? h('button', {type: 'button', className: 'wb-btn wb-hact', 'aria-label': t('settings'), title: t('settings'), onClick: openSettings}, h(Icon.gear)) : null,
              w.custom && !editing ? h('button', {type: 'button', className: 'wb-btn wb-hact', 'aria-label': t('cw_edit'), title: t('cw_edit'), onClick: () => setModal({type: 'agent', id: cell.id})}, h(Icon.sparkle)) : null) : null,
            h('div', {className: 'wb-body'}, renderSlot(SLOT, {size, config: cell.config ?? {}, editing, openSettings}, {only: cell.id})));
          };

          return h('div', {className: 'wb-page', ref: pageRef, onScroll: e => { if (board && !restoring.current) rememberScroll(board.id, e.currentTarget.scrollTop); }},
            h('div', {className: 'wb-inner'},
              h('div', {className: 'wb-head', 'data-editing': editing ? '' : undefined}, showTabs ? tabs : null, h('span', {className: 'wb-spacer'}), ...(headless ? [] : actions)),
              shownError ? h('div', {className: 'wb-error', role: 'alert'}, shownError) : null,
              board && cells.length === 0 && !editing ? h('div', {className: 'wb-empty'},
                h('div', {className: 'wb-emptyacts'},
                  h('button', {type: 'button', className: 'wb-action', onClick: () => { setEditing(true); setModal({type: 'gallery'}); }}, h(Icon.plus), t('addWidget')),
                  h('button', {type: 'button', className: 'wb-action', onClick: () => setModal({type: 'agent'})}, h(Icon.sparkle), t('gen_card')))) : null,
              h('div', {className: 'wb-grid', 'data-editing': editing ? '' : undefined},
                cells.map(card),
                editing && board ? h('button', {type: 'button', className: 'wb-btn wb-addtile', onClick: () => setModal({type: 'gallery'})}, h(Icon.plus), t('addWidget')) : null)),
            modal?.type === 'gallery' && board ? h(Gallery, {list, board, onAdd: addWidget, onGenerate: () => setModal({type: 'agent'}), onImport: () => setModal({type: 'import'}), onClose: () => setModal(null)}) : null,
            modal?.type === 'import' && board ? h(ImportModal, {onImported: w => addWidget({id: `${CUSTOM_PREFIX}${w.id}`, defaultSize: w.defaultSize}), onClose: () => setModal(null)}) : null,
            modal?.type === 'agent' && (!modal.id || modalCustom) ? h(AgentModal, {widget: modalCustom, onClose: () => setModal(null)}) : null,
            modal?.type === 'source' && modalCustom && board ? h(SourceModal, {widget: modalCustom, onClose: () => setModal(null), onRemoved: () => forgetCell(modal.id)}) : null,
            modalWidget ? h(SettingsModal, {widget: modalWidget, cell: board?.widgets.find(c => c.id === modal.id), onClose: () => setModal(null),
              onSaveConfig: config => updateCell(modal.id, {config})}) : null);
        }

        ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main', key: PANEL, locale: NS, inject: () => ({}),
          children: {[SLOT]: {kind: 'list', scope: 'root'}},
        }, Panel)), 'dsh-workboard: main panel');
        ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist', id: PANEL, order: 30, label: () => t('title'),
        }, PanelIcon)), 'dsh-workboard: sidebar entry');
        ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section', id: PANEL, order: 40, label: () => t('title'), locale: NS, inject: () => ({}),
        }, WorkboardSettings)), 'dsh-workboard: settings section');

        // 设置弹窗没有公开「打开指定栏目」的接口：插件详情页的按钮改为在主区域打开同一面板。
        if (typeof ctx.inject === 'function') {
          const SettingsPanel = () => h('div', {className: 'wb-page'}, h('div', {className: 'wb-cfgmain'}, h(WorkboardSettings)));
          function OpenSettings({subject, onOpen}) {
            useLocale();
            if (subject?.kind !== 'bundle' && subject?.kind !== 'row') return null;
            if (subject.pkg?.name !== PACKAGE) return null;
            if (subject.kind === 'row' && subject.row?.moduleName !== PACKAGE) return null;
            return h('button', {type: 'button', className: 'wb-action', onClick: onOpen}, t('openSettings'));
          }
          ctx.inject(['layout'], pageCtx => pageCtx.slots.inject('main', () => {
            const stopPanel = pageCtx.slots.register({name: 'main', key: SETTINGS_PANEL, locale: NS, inject: () => ({})}, SettingsPanel);
            const stopAction = pageCtx.slots.inject('plugins.detail.actions', () => pageCtx.slots.register({
              name: 'plugins.detail.actions', id: `${SETTINGS_PANEL}-open`, order: 20, locale: NS,
              inject: () => ({onOpen: () => pageCtx.layout.selectPanel(SETTINGS_PANEL)}),
            }, OpenSettings));
            return () => { stopAction(); stopPanel(); };
          }));
        }

        builtins.forEach(([id, key, component], i) => {
          ctx.effect(() => ctx.slots.inject(SLOT, () => ctx.slots.register({
            name: SLOT, id, order: (i + 1) * 10, label: () => t(key),
          }, component)), `dsh-workboard: ${id} widget`);
        });
      },
    };
  },
});
