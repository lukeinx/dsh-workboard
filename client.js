window.__ModuleLoader__.load({
  id: 'dsh-desk',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const {useEffect, useRef, useState, useSyncExternalStore} = React;

    const NS = 'dsh-desk';
    const PANEL = 'dsh-desk';
    const SLOT = 'desk.widget';
    const POLL_MS = 5000;
    const WEATHER_MS = 10 * 60_000;
    const CAL_MS = 15 * 60_000;
    // 尺寸档位：[列, 行]，行单位 80px；「横栏」半高，其余行数成对。
    const SIZES = {bar: [4, 1], s: [1, 2], m: [2, 2], t: [1, 4], l: [2, 4], w: [4, 2]};

    const zh = {
      lang: 'zh-CN', title: '工作台', loadFailed: '加载失败', empty: '看板上还没有 widget',
      today: '今日', clock: '时钟', todo: '待办', note: '速记', calendar: '日历', weather: '天气',
      d_today: '问候、时间、天气、格言合成一条横栏', d_todo: '未完成自动结转，Agent 可读写', d_note: '自动保存，当前行可转待办',
      d_calendar: 'ICS 订阅的日程与月历', d_weather: 'Open-Meteo 天气与空气质量', d_clock: '时间、问候与年度进度',
      night: '夜深了', morning: '早上好', noon: '中午好', afternoon: '下午好', evening: '晚上好', greetName: '{g}，{name}',
      week: '第 {n} 周', year: '今年已过 {n}%', nextQuote: '换一条',
      addTodo: '添加待办', carried: '结转', done: '已完成 {n}', remove: '移除', complete: '完成', reopen: '恢复', noTodos: '没有待办',
      notePlaceholder: '随手记', saved: '已保存 {t}', saving: '保存中…', lineToTodo: '当前行转待办',
      setCity: '设置城市', feels: '体感 {n}°', humidity: '湿度 {n}%',
      wx_clear: '晴', wx_partly: '多云', wx_cloud: '阴', wx_fog: '雾', wx_drizzle: '毛毛雨', wx_rain: '雨', wx_snow: '雪', wx_showers: '阵雨', wx_thunder: '雷雨',
      aqi0: '优', aqi1: '良', aqi2: '轻度污染', aqi3: '中度污染', aqi4: '重度污染', aqi5: '严重污染',
      allDay: '全天', noEvents: '没有日程', addIcs: '添加 ICS 订阅', todayEvents: '今天', tomorrowEvents: '明天', prevMonth: '上个月', nextMonth: '下个月', calError: '{n} 个订阅加载失败',
      work: '工作', untitled: '未命名', newBoard: '看板 {n}', newBoardLabel: '新建看板', rename: '双击改名',
      edit: '编辑', doneEdit: '完成', addWidget: '添加 widget', added: '已添加', add: '添加', settings: '设置', save: '保存', cancel: '取消',
      deleteBoard: '删除看板', confirmDelete: '确认删除', size: '尺寸', drag: '拖动排序',
      size_bar: '横栏', size_s: '小 1×1', size_m: '中 2×1', size_t: '竖 1×2', size_l: '大 2×2', size_w: '通栏 4×1',
      f_name: '称呼', f_location: '城市', f_unit: '温度单位', f_showWeather: '显示天气', f_showQuote: '显示格言', f_urls: 'ICS 订阅地址（每行一个）', f_weekStart: '每周开始于',
      celsius: '摄氏 °C', fahrenheit: '华氏 °F', monday: '周一', sunday: '周日', searchCity: '搜索城市', noResults: '没有找到', clear: '清除',
    };
    const en = {
      lang: 'en-US', title: 'Desk', loadFailed: 'Failed to load', empty: 'No widgets on this board yet',
      today: 'Today', clock: 'Clock', todo: 'To-do', note: 'Notes', calendar: 'Calendar', weather: 'Weather',
      d_today: 'Greeting, time, weather and a quote in one banner', d_todo: 'Unfinished items carry over; the agent can read and edit', d_note: 'Autosaves; turn the current line into a to-do',
      d_calendar: 'Events from ICS subscriptions and a month view', d_weather: 'Weather and air quality from Open-Meteo', d_clock: 'Time, greeting and year progress',
      night: 'Good night', morning: 'Good morning', noon: 'Good afternoon', afternoon: 'Good afternoon', evening: 'Good evening', greetName: '{g}, {name}',
      week: 'Week {n}', year: '{n}% of the year', nextQuote: 'Next quote',
      addTodo: 'Add a to-do', carried: 'Carried over', done: 'Completed {n}', remove: 'Remove', complete: 'Complete', reopen: 'Reopen', noTodos: 'Nothing to do',
      notePlaceholder: 'Jot something down', saved: 'Saved {t}', saving: 'Saving…', lineToTodo: 'Current line to to-do',
      setCity: 'Set a city', feels: 'Feels {n}°', humidity: 'Humidity {n}%',
      wx_clear: 'Clear', wx_partly: 'Partly cloudy', wx_cloud: 'Overcast', wx_fog: 'Fog', wx_drizzle: 'Drizzle', wx_rain: 'Rain', wx_snow: 'Snow', wx_showers: 'Showers', wx_thunder: 'Thunderstorm',
      aqi0: 'Good', aqi1: 'Moderate', aqi2: 'Sensitive', aqi3: 'Unhealthy', aqi4: 'Very unhealthy', aqi5: 'Hazardous',
      allDay: 'All day', noEvents: 'No events', addIcs: 'Add an ICS subscription', todayEvents: 'Today', tomorrowEvents: 'Tomorrow', prevMonth: 'Previous month', nextMonth: 'Next month', calError: '{n} subscription(s) failed to load',
      work: 'Work', untitled: 'Untitled', newBoard: 'Board {n}', newBoardLabel: 'New board', rename: 'Double-click to rename',
      edit: 'Edit', doneEdit: 'Done', addWidget: 'Add widget', added: 'Added', add: 'Add', settings: 'Settings', save: 'Save', cancel: 'Cancel',
      deleteBoard: 'Delete board', confirmDelete: 'Confirm delete', size: 'Size', drag: 'Drag to reorder',
      size_bar: 'Banner', size_s: 'Small 1×1', size_m: 'Medium 2×1', size_t: 'Tall 1×2', size_l: 'Large 2×2', size_w: 'Wide 4×1',
      f_name: 'Your name', f_location: 'City', f_unit: 'Temperature unit', f_showWeather: 'Show weather', f_showQuote: 'Show quote', f_urls: 'ICS subscription URLs, one per line', f_weekStart: 'Week starts on',
      celsius: 'Celsius °C', fahrenheit: 'Fahrenheit °F', monday: 'Monday', sunday: 'Sunday', searchCity: 'Search for a city', noResults: 'No matches', clear: 'Clear',
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
    ];

    const CSS = `
.bnt-page{height:100%;overflow:auto;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px}
.bnt-inner{max-width:1120px;margin:0 auto;padding:20px 24px 32px;box-sizing:border-box}
.bnt-error{color:var(--dsw-alias-state-error-primary);font-size:12px;margin-bottom:8px}
.bnt-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:80px;grid-auto-flow:row dense;gap:16px}
.bnt-card{grid-column:span var(--c);grid-row:span var(--r);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:16px;display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden;box-sizing:border-box}
.bnt-card[data-banner]{background:none;border-color:transparent;padding:0 4px;overflow:visible}
.bnt-card>header{display:flex;align-items:center;gap:8px;margin:-2px 0 10px;min-height:24px}
.bnt-card>header h3{margin:0;font-size:14px;font-weight:600;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bnt-body{flex:1;min-height:0;display:flex;flex-direction:column}
.bnt-empty{display:grid;place-items:center;min-height:300px;color:var(--dsw-alias-label-secondary);border:1.5px dashed var(--dsw-alias-border-l2);border-radius:12px}
.bnt-muted{color:var(--dsw-alias-label-secondary)}
.bnt-num{font-variant-numeric:tabular-nums}
.bnt-btn{appearance:none;border:0;background:none;color:inherit;font:inherit;padding:0;cursor:pointer}

.bnt-today{display:flex;align-items:center;gap:28px;height:100%;min-width:0}
.bnt-today>*{flex:none}
.bnt-today .bnt-tclock{display:grid;grid-template-columns:auto auto;grid-template-areas:"time greet" "time date";column-gap:14px;align-items:center}
.bnt-today .bnt-time{grid-area:time;font-size:44px;font-weight:600;letter-spacing:-1px;line-height:1}
.bnt-today .bnt-greet{grid-area:greet;align-self:end;font-size:15px;font-weight:600}
.bnt-today .bnt-date{grid-area:date;align-self:start;color:var(--dsw-alias-label-secondary)}
.bnt-sep{width:1px;align-self:stretch;margin:14px 0;background:var(--dsw-alias-border-l1)}
.bnt-quote{flex:1!important;min-width:0;text-align:left}
.bnt-quote .bnt-qtext{display:block;margin:0;font-size:15px;line-height:1.5;font-family:"New York","Songti SC",Georgia,serif;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.bnt-quote cite{display:block;font-style:normal;font-size:12px;color:var(--dsw-alias-label-secondary)}

.bnt-clock{display:flex;flex-direction:column;justify-content:center;height:100%}
.bnt-clock .bnt-time{font-size:44px;font-weight:600;letter-spacing:-1px;line-height:1.1;margin:4px 0 6px}
.bnt-clock[data-size=s] .bnt-time{font-size:32px}
.bnt-yearbar{height:4px;border-radius:2px;background:var(--dsw-alias-bg-layer-2);margin-top:12px;overflow:hidden}
.bnt-yearbar i{display:block;height:100%;background:var(--dsw-alias-label-secondary);opacity:.5}

.bnt-list{list-style:none;margin:0;padding:0;overflow:auto;flex:1}
.bnt-list li{display:flex;align-items:center;gap:10px;padding:7px 4px;border-radius:8px;min-width:0}
.bnt-list li:hover{background:var(--dsw-alias-bg-layer-2)}
.bnt-ck{width:18px;height:18px;border-radius:5px;border:1.5px solid var(--dsw-alias-border-l2);flex:none;display:grid;place-items:center;box-sizing:border-box}
.bnt-ck:hover{border-color:var(--dsw-alias-brand-primary)}
.bnt-list li[data-done] .bnt-ck{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:#fff}
.bnt-list li[data-done] .bnt-tx{color:var(--dsw-alias-label-secondary);text-decoration:line-through}
.bnt-tx{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bnt-tag{font-size:11px;padding:0 6px;border-radius:5px;flex:none;white-space:nowrap;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-primary)}
.bnt-del{display:none;flex:none;width:24px;height:24px;border-radius:6px;color:var(--dsw-alias-label-secondary);place-items:center}
.bnt-list li:hover .bnt-del{display:grid}
.bnt-del:hover{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-state-error-primary)}
.bnt-donetoggle{font-size:12px;color:var(--dsw-alias-label-secondary);padding:6px 4px;display:flex;align-items:center;gap:4px}
.bnt-donetoggle svg{transition:transform .15s}
.bnt-donetoggle[aria-expanded=true] svg{transform:rotate(90deg)}
.bnt-add{display:flex;align-items:center;gap:10px;padding:8px 4px 0;border-top:1px solid var(--dsw-alias-border-l1);margin-top:6px;color:var(--dsw-alias-label-secondary)}
.bnt-add input{flex:1;border:0;background:none;outline:none;padding:6px 0;color:var(--dsw-alias-label-primary);font:inherit}
.bnt-blank{color:var(--dsw-alias-label-secondary);padding:7px 4px}

.bnt-note{flex:1;resize:none;border:0;outline:none;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:8px;padding:10px 12px;line-height:1.65;font:inherit;font-size:13px;min-height:0}
.bnt-notefoot{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:8px;min-height:18px}
.bnt-notefoot button{color:var(--dsw-alias-brand-primary)}

.bnt-head{display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.bnt-tabs{display:flex;align-items:center;gap:2px;flex-wrap:wrap;min-width:0}
.bnt-tab{height:30px;padding:0 12px;border-radius:8px;color:var(--dsw-alias-label-secondary);font-weight:500;white-space:nowrap}
.bnt-tab:hover{color:var(--dsw-alias-label-primary)}
.bnt-tab[aria-selected=true]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.bnt-tabinput{height:30px;width:120px;box-sizing:border-box;padding:0 10px;border-radius:8px;border:1px solid var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-weight:500;outline:none}
.bnt-iconbtn{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;color:var(--dsw-alias-label-secondary)}
.bnt-iconbtn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.bnt-spacer{flex:1}
.bnt-action{appearance:none;font:inherit;height:30px;padding:0 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);display:inline-flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap}
.bnt-action:hover{border-color:var(--dsw-alias-border-l2)}
.bnt-action:disabled{opacity:.5;cursor:default}
.bnt-action[data-primary]{background:var(--dsw-alias-brand-primary);border-color:transparent;color:#fff}
.bnt-action[data-danger]{color:var(--dsw-alias-state-error-primary)}
.bnt-card{position:relative}
.bnt-grid[data-editing] .bnt-card{border-style:dashed;border-color:var(--dsw-alias-border-l2);cursor:grab}
.bnt-grid[data-editing] .bnt-card[data-banner]{padding:0 12px}
.bnt-grid[data-editing] .bnt-body{pointer-events:none;opacity:.5}
.bnt-card[data-dragging]{opacity:.35}
.bnt-card[data-drop=before]{box-shadow:-4px 0 0 0 var(--dsw-alias-brand-primary)}
.bnt-card[data-drop=after]{box-shadow:4px 0 0 0 var(--dsw-alias-brand-primary)}
.bnt-tools{position:absolute;top:8px;right:8px;z-index:2;display:flex;align-items:center;gap:2px;padding:2px;border-radius:8px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);cursor:default}
.bnt-tools select{height:24px;border:0;background:none;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;outline:none;cursor:pointer}
.bnt-tools button{width:24px;height:24px;border-radius:6px;display:grid;place-items:center;color:var(--dsw-alias-label-secondary)}
.bnt-tools button:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.bnt-addtile{grid-column:span 1;grid-row:span 2;border:1.5px dashed var(--dsw-alias-border-l2);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--dsw-alias-label-secondary)}
.bnt-addtile:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.bnt-cta{color:var(--dsw-alias-brand-primary)}

.bnt-overlay{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.35);display:grid;place-items:center;padding:24px}
.bnt-modal{width:min(520px,100%);max-height:80vh;overflow:auto;box-sizing:border-box;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);border-radius:14px;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.25);display:flex;flex-direction:column;gap:14px;font-size:13px}
.bnt-modal h2{margin:0;font-size:16px;font-weight:600}
.bnt-field{display:flex;flex-direction:column;gap:6px}
.bnt-field>span{font-size:12px;color:var(--dsw-alias-label-secondary)}
.bnt-check{display:flex;align-items:center;gap:8px}
.bnt-input{box-sizing:border-box;width:100%;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;color:var(--dsw-alias-label-primary);font:inherit;padding:7px 10px;outline:none}
.bnt-input:focus{border-color:var(--dsw-alias-brand-primary)}
textarea.bnt-input{resize:vertical;min-height:84px;line-height:1.5}
.bnt-loc{display:flex;align-items:center;gap:8px}
.bnt-loc b{font-weight:600}
.bnt-results{display:flex;flex-direction:column}
.bnt-results button{text-align:left;padding:6px 8px;border-radius:6px}
.bnt-results button:hover{background:var(--dsw-alias-bg-layer-2)}
.bnt-foot{display:flex;justify-content:flex-end;gap:8px}
.bnt-gitem{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}
.bnt-gitem:last-child{border-bottom:0}
.bnt-gitem>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.bnt-gitem small{color:var(--dsw-alias-label-secondary);font-size:12px}

.bnt-wx{display:flex;flex-direction:column;height:100%;min-height:0;gap:8px;color:var(--dsw-alias-label-primary)}
.bnt-wxnow{display:flex;align-items:center;gap:12px;min-width:0}
.bnt-wxnow svg{color:var(--dsw-alias-label-secondary);flex:none}
.bnt-wxt{font-size:36px;font-weight:600;letter-spacing:-1px;line-height:1}
.bnt-wxmeta{display:flex;flex-direction:column;gap:2px;min-width:0;font-size:12px;color:var(--dsw-alias-label-secondary)}
.bnt-wxmeta b{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bnt-wxhours{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px;margin-top:auto;text-align:center;font-size:12px;color:var(--dsw-alias-label-secondary)}
.bnt-wxhours>div{display:flex;flex-direction:column;align-items:center;gap:4px}
.bnt-wxhours b{font-weight:500;color:var(--dsw-alias-label-primary)}
.bnt-wxmini{display:flex;align-items:center;gap:10px;line-height:1.5}
.bnt-wxmini svg{color:var(--dsw-alias-label-secondary)}
.bnt-wxmini .bnt-wxt{font-size:24px;letter-spacing:-.5px}
.bnt-aqi{font-size:11px;padding:0 6px;border-radius:5px;white-space:nowrap;background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 14%,transparent);color:var(--dsw-alias-state-success-primary)}
.bnt-aqi[data-level=warn]{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-primary)}
.bnt-aqi[data-level=bad]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary)}

.bnt-cal{display:flex;flex-direction:column;height:100%;min-height:0;gap:8px}
.bnt-calnav{display:flex;align-items:center;gap:2px}
.bnt-calnav .bnt-btn:first-child{flex:1;text-align:left;font-weight:600}
.bnt-calnav .bnt-iconbtn{width:24px;height:24px}
.bnt-month{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px;text-align:center;font-size:12px}
.bnt-wd{color:var(--dsw-alias-label-secondary);font-size:11px;padding-bottom:2px}
.bnt-day{height:26px;border-radius:6px;display:grid;place-items:center;position:relative;color:var(--dsw-alias-label-primary)}
.bnt-day:hover{background:var(--dsw-alias-bg-layer-2)}
.bnt-day[data-out]{opacity:.4}
.bnt-day[data-selected]{background:var(--dsw-alias-bg-layer-2)}
.bnt-day[data-today]{background:var(--dsw-alias-brand-primary);color:#fff;font-weight:600}
.bnt-day[data-has]::after{content:'';position:absolute;bottom:2px;width:4px;height:4px;border-radius:2px;background:var(--dsw-alias-brand-primary)}
.bnt-day[data-today][data-has]::after{background:#fff}
.bnt-events{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:2px}
.bnt-cal[data-big] .bnt-events{border-top:1px solid var(--dsw-alias-border-l1);padding-top:8px}
.bnt-evhead{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);padding:4px 2px 2px}
.bnt-ev{display:flex;align-items:center;gap:8px;padding:4px 2px;min-width:0}
.bnt-ev i{width:3px;align-self:stretch;border-radius:2px;background:var(--dsw-alias-border-l2);flex:none}
.bnt-ev[data-state=now] i{background:var(--dsw-alias-brand-primary)}
.bnt-ev[data-state=past]{color:var(--dsw-alias-label-secondary)}
.bnt-evtime{font-size:12px;color:var(--dsw-alias-label-secondary);flex:none;min-width:80px}
.bnt-evtitle{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bnt-calerr{font-size:12px;color:var(--dsw-alias-state-warn-primary)}

@media (max-width:900px){.bnt-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.bnt-card[data-c="4"]{grid-column:span 2}.bnt-today .bnt-quote,.bnt-today .bnt-qsep{display:none}}
@media (max-width:600px){.bnt-grid{grid-template-columns:minmax(0,1fr)}.bnt-card{grid-column:auto!important}}
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

    const svg = (size, d, width = 2) => h('svg', {width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true},
      ...(Array.isArray(d) ? d : [d]).map((p, i) => (typeof p === 'string' ? h('path', {key: i, d: p}) : h(p.tag, {key: i, ...p.attrs}))));
    const Icon = {
      check: () => svg(12, 'M5 12.5l4.5 4.5L19 7.5', 3),
      x: () => svg(14, 'M6 6l12 12M18 6L6 18'),
      plus: () => svg(16, 'M12 5v14M5 12h14'),
      chev: () => svg(12, 'M9 6l6 6-6 6', 2.2),
      left: () => svg(14, 'M15 6l-6 6 6 6'),
      right: () => svg(14, 'M9 6l6 6-6 6'),
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
      return {key: `aqi${i}`, level: i === 0 ? 'ok' : i <= 2 ? 'warn' : 'bad'};
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
        ctx.effect(() => ctx.locale.register(NS, {zh, en}), 'dsh-desk: dictionaries');
        const t = ctx.locale.bind(NS);
        const call = async (method, payload = {}) => {
          const result = await ctx.connection.rpc.call('/api', `dsh-desk/${method}`, payload);
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
            load();
            const id = setInterval(load, intervalMs);
            document.addEventListener('visibilitychange', load);
            return () => { clearInterval(id); document.removeEventListener('visibilitychange', load); entry.listeners.delete(listener); };
          }, [key]);
          const entry = key ? remoteCache.get(key) : null;
          return {value: entry?.value, error: entry?.error ?? '', pending: Boolean(key) && !entry?.at};
        }

        const useWeather = prefs => {
          const loc = prefs.location;
          const unit = prefs.unit === 'f' ? 'f' : 'c';
          return {loc, unit, ...useRemote('weather.get', loc ? {lat: loc.lat, lon: loc.lon, unit} : null, WEATHER_MS)};
        };
        const greet = (prefs, hour) => (prefs.name ? fill(t('greetName'), {g: greeting(t, hour), name: prefs.name}) : greeting(t, hour));
        const deg = v => (Number.isFinite(v) ? `${Math.round(v)}°` : '–');

        const LOCATION_FIELDS = [
          {key: 'location', type: 'location', scope: 'global', label: () => t('f_location')},
          {key: 'unit', type: 'select', scope: 'global', default: 'c', label: () => t('f_unit'), options: [{value: 'c', label: () => t('celsius')}, {value: 'f', label: () => t('fahrenheit')}]},
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
          const q = QUOTES[(dayOfYear(now) + offset) % QUOTES.length];
          const zhQuote = lang.startsWith('zh');
          const w = wx.value;
          let weather = null;
          if (showWeather && !wx.loc) weather = h('button', {type: 'button', className: 'bnt-btn bnt-cta', onClick: openSettings}, t('setCity'));
          else if (showWeather && w) {
            const aqi = w.aqi != null ? aqiLevel(w.aqi) : null;
            weather = h('div', {className: 'bnt-wxmini'},
              h(WxIcon, {code: w.current.code, isDay: w.current.isDay, size: 28}),
              h('span', {className: 'bnt-wxt bnt-num'}, deg(w.current.temp)),
              h('div', null,
                h('div', null, `${wx.loc.name} · ${t(wxKind(w.current.code, w.current.isDay)[1])}`),
                h('div', {className: 'bnt-muted bnt-num'}, `${deg(w.today.lo)} / ${deg(w.today.hi)}`, aqi ? ` · AQI ${w.aqi} ${t(aqi.key)}` : '')));
          }
          return h('div', {className: 'bnt-today'},
            h('div', {className: 'bnt-tclock'},
              h('span', {className: 'bnt-time bnt-num'}, `${pad(now.getHours())}:${pad(now.getMinutes())}`),
              h('span', {className: 'bnt-greet'}, greet(prefs, now.getHours())),
              h('span', {className: 'bnt-date'}, `${now.toLocaleDateString(lang, {month: 'long', day: 'numeric', weekday: 'long'})} · ${fill(t('week'), {n: isoWeek(now)})}`)),
            weather ? h('span', {className: 'bnt-sep'}) : null,
            weather,
            showQuote ? h('span', {className: 'bnt-sep bnt-qsep'}) : null,
            showQuote ? h('button', {type: 'button', className: 'bnt-btn bnt-quote', title: t('nextQuote'), onClick: () => setOffset(o => o + 1)},
              h('span', {className: 'bnt-qtext'}, zhQuote ? q.zh : q.en),
              h('cite', null, `— ${zhQuote ? q.by.zh : q.by.en}`)) : null);
        }
        Today.desk = {
          apiVersion: 1, sizes: ['bar'], banner: true, description: () => t('d_today'),
          settings: [
            {key: 'name', type: 'text', scope: 'global', label: () => t('f_name')},
            ...LOCATION_FIELDS,
            {key: 'showWeather', type: 'toggle', default: true, label: () => t('f_showWeather')},
            {key: 'showQuote', type: 'toggle', default: true, label: () => t('f_showQuote')},
          ],
        };

        function Clock({size}) {
          useLocale();
          const now = useNow();
          const prefs = usePrefs();
          const lang = t('lang');
          const start = new Date(now.getFullYear(), 0, 1);
          const yearPct = Math.floor((now - start) / (new Date(now.getFullYear() + 1, 0, 1) - start) * 100);
          return h('div', {className: 'bnt-clock', 'data-size': size},
            h('span', {className: 'bnt-muted'}, greet(prefs, now.getHours())),
            h('span', {className: 'bnt-time bnt-num'}, `${pad(now.getHours())}:${pad(now.getMinutes())}`),
            h('span', {className: 'bnt-muted'}, `${now.toLocaleDateString(lang, {month: 'short', day: 'numeric', weekday: 'short'})} · ${fill(t('week'), {n: isoWeek(now)})}`),
            size === 's' ? null : h('div', {className: 'bnt-yearbar', title: fill(t('year'), {n: yearPct})}, h('i', {style: {width: `${yearPct}%`}})));
        }
        Clock.desk = {apiVersion: 1, sizes: ['m', 's'], title: false, description: () => t('d_clock'), settings: [{key: 'name', type: 'text', scope: 'global', label: () => t('f_name')}]};

        function TodoRow({todo, today}) {
          return h('li', {'data-done': todo.done ? '' : undefined},
            h('button', {type: 'button', className: 'bnt-btn bnt-ck', 'aria-label': todo.done ? t('reopen') : t('complete'), onClick: () => { data.setDone(todo.id, !todo.done).catch(() => {}); }},
              todo.done ? h(Icon.check) : null),
            h('span', {className: 'bnt-tx', title: todo.text}, todo.text),
            !todo.done && todo.createdAt < today ? h('span', {className: 'bnt-tag'}, t('carried')) : null,
            h('button', {type: 'button', className: 'bnt-btn bnt-del', 'aria-label': t('remove'), title: t('remove'), onClick: () => { data.removeTodo(todo.id).catch(() => {}); }}, h(Icon.x)));
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
            h('ul', {className: 'bnt-list'},
              todos && open.length === 0 ? h('li', {className: 'bnt-blank'}, t('noTodos')) : null,
              open.map(x => h(TodoRow, {key: x.id, todo: x, today})),
              done.length ? h('li', {key: '__done'}, h('button', {type: 'button', className: 'bnt-btn bnt-donetoggle', 'aria-expanded': showDone, onClick: () => setShowDone(v => !v)},
                h(Icon.chev), fill(t('done'), {n: done.length}))) : null,
              showDone ? done.map(x => h(TodoRow, {key: x.id, todo: x, today})) : null),
            h('label', {className: 'bnt-add'}, h(Icon.plus),
              h('input', {value: text, placeholder: t('addTodo'), enterKeyHint: 'done', onChange: e => setText(e.target.value), onKeyDown: submit})));
        }
        Todo.desk = {apiVersion: 1, sizes: ['l', 'm', 't'], description: () => t('d_todo')};

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
            h('textarea', {ref: area, className: 'bnt-note', value: text ?? '', placeholder: t('notePlaceholder'), spellCheck: false, onChange,
              onFocus: () => { focused.current = true; }, onBlur: () => { focused.current = false; }}),
            h('div', {className: 'bnt-notefoot'}, h('span', null, status),
              h('button', {type: 'button', className: 'bnt-btn', onMouseDown: e => e.preventDefault(), onClick: lineToTodo}, t('lineToTodo'))));
        }
        Note.desk = {apiVersion: 1, sizes: ['l', 't', 'm', 's'], description: () => t('d_note')};

        function Weather({size, openSettings}) {
          useLocale();
          const prefs = usePrefs();
          const wx = useWeather(prefs);
          if (!wx.loc) return h('div', {className: 'bnt-wx', style: {justifyContent: 'center', alignItems: 'flex-start'}}, h('button', {type: 'button', className: 'bnt-btn bnt-cta', onClick: openSettings}, t('setCity')));
          const w = wx.value;
          if (!w) return h('div', {className: 'bnt-wx bnt-muted'}, wx.error || '…');
          const [, textKey] = wxKind(w.current.code, w.current.isDay);
          const aqi = w.aqi != null ? aqiLevel(w.aqi) : null;
          return h('div', {className: 'bnt-wx', title: wx.loc.region || undefined},
            h('div', {className: 'bnt-wxnow'},
              h(WxIcon, {code: w.current.code, isDay: w.current.isDay, size: size === 's' ? 30 : 40}),
              h('span', {className: 'bnt-wxt bnt-num'}, deg(w.current.temp)),
              size === 's' ? null : h('div', {className: 'bnt-wxmeta'},
                h('b', null, `${wx.loc.name} · ${t(textKey)}`),
                h('span', {className: 'bnt-num'}, `${deg(w.today.lo)} / ${deg(w.today.hi)} · ${fill(t('feels'), {n: Math.round(w.current.feels)})}`))),
            size === 's' ? h('div', {className: 'bnt-wxmeta'},
              h('b', null, wx.loc.name),
              h('span', null, t(textKey)),
              h('span', {className: 'bnt-num'}, `${deg(w.today.lo)} / ${deg(w.today.hi)}`)) : null,
            aqi ? h('div', null, h('span', {className: 'bnt-aqi', 'data-level': aqi.level}, `AQI ${w.aqi} · ${t(aqi.key)}`)) : null,
            size === 's' ? null : h('div', {className: 'bnt-wxhours bnt-num'}, w.hours.slice(0, 6).map(x => h('div', {key: x.time},
              h('span', null, x.time), h(WxIcon, {code: x.code, size: 18}), h('b', null, deg(x.temp))))));
        }
        Weather.desk = {apiVersion: 1, sizes: ['m', 's'], description: () => t('d_weather'), settings: LOCATION_FIELDS};

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
          return h('div', {className: 'bnt-ev', 'data-state': state || undefined, title: [e.title, e.location].filter(Boolean).join(' · ')},
            h('i'), h('span', {className: 'bnt-evtime bnt-num'}, time), h('span', {className: 'bnt-evtitle'}, e.title));
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
          const res = useRemote('calendar.events', urls.length ? {urls, from: range[0], to: range[1]} : null, CAL_MS);
          const byDay = bucket(res.value?.events ?? []);
          const failed = res.value?.errors?.length ?? 0;
          const nowMs = now.getTime();
          const list = (k, head) => {
            const items = byDay.get(k) ?? [];
            return h(React.Fragment, {key: k},
              head ? h('div', {className: 'bnt-evhead'}, head) : null,
              items.length ? items.map((e, i) => h(EventRow, {key: `${e.start}-${i}`, e, now: nowMs})) : h('div', {className: 'bnt-blank'}, t('noEvents')));
          };
          const footer = !urls.length ? h('button', {type: 'button', className: 'bnt-btn bnt-cta', style: {alignSelf: 'flex-start'}, onClick: openSettings}, t('addIcs'))
            : failed ? h('div', {className: 'bnt-calerr', title: res.value.errors.map(e => `${e.url}: ${e.message}`).join('\n')}, fill(t('calError'), {n: failed})) : res.error ? h('div', {className: 'bnt-calerr'}, res.error) : null;

          if (!big) {
            const tomorrow = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
            return h('div', {className: 'bnt-cal'},
              urls.length ? h('div', {className: 'bnt-events'}, list(todayKey, size === 'm' ? t('todayEvents') : null), size === 'm' ? list(tomorrow, t('tomorrowEvents')) : null) : null,
              footer);
          }
          const sel = selected ?? (month === 0 ? todayKey : dayKey(base));
          const names = Array.from({length: 7}, (_, i) => new Date(2026, 10, 1 + ((weekStart + i) % 7)).toLocaleDateString(lang, {weekday: 'narrow'}));
          const days = Array.from({length: rows * 7}, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
          const selDate = keyDate(sel);
          return h('div', {className: 'bnt-cal', 'data-big': ''},
            h('div', {className: 'bnt-calnav'},
              h('button', {type: 'button', className: 'bnt-btn', onClick: () => { setMonth(0); setSelected(null); }}, base.toLocaleDateString(lang, {year: 'numeric', month: 'long'})),
              h('button', {type: 'button', className: 'bnt-btn bnt-iconbtn', 'aria-label': t('prevMonth'), onClick: () => { setMonth(m => m - 1); setSelected(null); }}, h(Icon.left)),
              h('button', {type: 'button', className: 'bnt-btn bnt-iconbtn', 'aria-label': t('nextMonth'), onClick: () => { setMonth(m => m + 1); setSelected(null); }}, h(Icon.right))),
            h('div', {className: 'bnt-month bnt-num'},
              names.map((n, i) => h('span', {key: `w${i}`, className: 'bnt-wd'}, n)),
              days.map(d => {
                const k = dayKey(d);
                return h('button', {key: k, type: 'button', className: 'bnt-btn bnt-day', onClick: () => setSelected(k),
                  'data-out': d.getMonth() !== base.getMonth() ? '' : undefined, 'data-today': k === todayKey ? '' : undefined,
                  'data-selected': k === sel ? '' : undefined, 'data-has': byDay.has(k) ? '' : undefined}, d.getDate());
              })),
            urls.length ? h('div', {className: 'bnt-events'}, list(sel, sel === todayKey ? t('todayEvents') : selDate.toLocaleDateString(lang, {month: 'short', day: 'numeric', weekday: 'short'}))) : null,
            footer);
        }
        Calendar.desk = {
          apiVersion: 1, sizes: ['t', 'l', 's', 'm'], description: () => t('d_calendar'),
          settings: [
            {key: 'calendarUrls', type: 'textarea', scope: 'global', label: () => t('f_urls'), placeholder: 'https://…/calendar.ics'},
            {key: 'weekStart', type: 'select', scope: 'global', label: () => t('f_weekStart'), default: () => (t('lang').startsWith('zh') ? '1' : '0'),
              options: [{value: '1', label: () => t('monday')}, {value: '0', label: () => t('sunday')}]},
          ],
        };

        function widgetList() {
          return ctx.slots.entries(SLOT).map(entry => {
            const {id, label} = entry.options;
            const manifest = entry.component?.desk ?? {};
            const sizes = (Array.isArray(manifest.sizes) ? manifest.sizes : []).filter(s => SIZES[s]);
            return {
              id: id ?? '',
              label: () => resolveText(label) || id,
              description: manifest.description,
              sizes: sizes.length ? sizes : ['m'],
              banner: manifest.banner === true,
              title: manifest.title !== false,
              settings: Array.isArray(manifest.settings) ? manifest.settings.filter(f => f && typeof f.key === 'string') : [],
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

        function Modal({title, onClose, children, footer}) {
          useEffect(() => {
            const onKey = e => { if (e.key === 'Escape') onClose(); };
            window.addEventListener('keydown', onKey);
            return () => window.removeEventListener('keydown', onKey);
          }, [onClose]);
          return h('div', {className: 'bnt-overlay', onMouseDown: e => { if (e.target === e.currentTarget) onClose(); }},
            h('div', {className: 'bnt-modal', role: 'dialog', 'aria-modal': true, 'aria-label': title},
              h('h2', null, title), children, footer ? h('div', {className: 'bnt-foot'}, footer) : null));
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
            value ? h('div', {className: 'bnt-loc'}, h('b', null, value.name), h('span', {className: 'bnt-muted'}, value.region ?? ''),
              h('span', {className: 'bnt-spacer'}), h('button', {type: 'button', className: 'bnt-btn bnt-cta', onClick: () => onChange(null)}, t('clear'))) : null,
            h('input', {className: 'bnt-input', value: query, placeholder: t('searchCity'), onChange: e => setQuery(e.target.value)}),
            results ? h('div', {className: 'bnt-results'}, results.length ? results.map(r => h('button', {key: `${r.lat},${r.lon}`, type: 'button', className: 'bnt-btn', onClick: () => { onChange(r); setQuery(''); setResults(null); }},
              h('b', null, r.name), ' ', h('span', {className: 'bnt-muted'}, r.region))) : h('span', {className: 'bnt-muted'}, t('noResults'))) : null);
        }

        function SettingsModal({widget, cell, onSaveConfig, onClose}) {
          const prefs = usePrefs();
          const fields = widget.settings;
          const initial = () => Object.fromEntries(fields.map(f => {
            const stored = f.scope === 'global' ? prefs[f.key] : cell?.config?.[f.key];
            return [f.key, stored ?? (typeof f.default === 'function' ? f.default() : f.default)];
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
          const field = f => {
            const v = values[f.key];
            const label = resolveText(f.label) || f.key;
            if (f.type === 'toggle') return h('label', {key: f.key, className: 'bnt-check'}, h('input', {type: 'checkbox', checked: v !== false && v != null, onChange: e => set(f.key, e.target.checked)}), label);
            let control;
            if (f.type === 'location') control = h(LocationField, {value: v, onChange: x => set(f.key, x)});
            else if (f.type === 'select') control = h('select', {className: 'bnt-input', value: v ?? '', onChange: e => set(f.key, e.target.value)},
              (f.options ?? []).map(o => h('option', {key: o.value, value: o.value}, resolveText(o.label) || o.value)));
            else if (f.type === 'textarea') control = h('textarea', {className: 'bnt-input', value: v ?? '', placeholder: f.placeholder, spellCheck: false, onChange: e => set(f.key, e.target.value)});
            else control = h('input', {className: 'bnt-input', value: v ?? '', placeholder: f.placeholder, onChange: e => set(f.key, e.target.value)});
            return h('div', {key: f.key, className: 'bnt-field'}, h('span', null, label), control);
          };
          return h(Modal, {title: `${widget.label()} · ${t('settings')}`, onClose,
            footer: [h('button', {key: 'c', type: 'button', className: 'bnt-action', onClick: onClose}, t('cancel')),
              h('button', {key: 's', type: 'button', className: 'bnt-action', 'data-primary': '', onClick: save}, t('save'))]},
          fields.map(field), error ? h('div', {className: 'bnt-error'}, error) : null);
        }

        function Gallery({list, board, onAdd, onClose}) {
          return h(Modal, {title: t('addWidget'), onClose},
            h('div', null, list.map(w => {
              const placed = board.widgets.some(c => c.id === w.id);
              return h('div', {key: w.id, className: 'bnt-gitem'},
                h('div', null, h('b', null, w.label()),
                  w.description ? h('small', null, resolveText(w.description)) : null,
                  h('small', null, w.sizes.map(sizeLabel).join(' · '))),
                h('button', {type: 'button', className: 'bnt-action', disabled: placed, onClick: () => onAdd(w)}, placed ? t('added') : t('add')));
            })));
        }

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

          useEffect(() => { void prefsStore.load(); }, []);
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
          // 新安装插件的 widget 自动加入一次；记入 known 后用户移除不再回来。
          useEffect(() => {
            if (!board) return;
            const known = new Set(board.known ?? []);
            const fresh = list.filter(w => w.id && !known.has(w.id));
            if (fresh.length) saveBoard({...board, widgets: [...board.widgets, ...fresh.map(w => ({id: w.id, size: w.sizes[0]}))], known: [...known, ...fresh.map(w => w.id)]});
          }, [board, list]);

          const boardTitle = b => b.title || (b.id === 'work' ? t('work') : t('untitled'));
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
            saveBoard({...board, widgets: [...board.widgets, {id: w.id, size: w.sizes[0]}], known: [...new Set([...(board.known ?? []), w.id])]});
            setModal(null);
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

          const tabs = h('div', {className: 'bnt-tabs', role: 'tablist'},
            (boards ?? []).map(b => (b.id === activeId && renaming
              ? h('input', {key: b.id, className: 'bnt-tabinput', autoFocus: true, defaultValue: b.title || boardTitle(b), 'aria-label': t('rename'),
                onBlur: e => commitRename(e.target.value),
                onKeyDown: e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur(); else if (e.key === 'Escape') setRenaming(false); }})
              : h('button', {key: b.id, type: 'button', role: 'tab', className: 'bnt-btn bnt-tab', 'aria-selected': b.id === activeId, title: t('rename'),
                onClick: () => switchTo(b.id), onDoubleClick: () => { switchTo(b.id); setRenaming(true); }}, boardTitle(b)))),
            h('button', {type: 'button', className: 'bnt-btn bnt-iconbtn', 'aria-label': t('newBoardLabel'), title: t('newBoardLabel'), onClick: createBoard}, h(Icon.plus)));

          const actions = editing
            ? [
              (boards?.length ?? 0) > 1 ? h('button', {key: 'del', type: 'button', className: 'bnt-action', 'data-danger': '', onClick: deleteBoard, onBlur: () => setConfirmDelete(false)}, confirmDelete ? t('confirmDelete') : t('deleteBoard')) : null,
              h('button', {key: 'add', type: 'button', className: 'bnt-action', onClick: () => setModal({type: 'gallery'})}, h(Icon.plus), t('addWidget')),
              h('button', {key: 'done', type: 'button', className: 'bnt-action', 'data-primary': '', onClick: () => { setEditing(false); setConfirmDelete(false); }}, t('doneEdit')),
            ]
            : [h('button', {key: 'edit', type: 'button', className: 'bnt-action', onClick: () => setEditing(true)}, t('edit'))];

          const card = cell => {
            const w = byId.get(cell.id);
            const size = w.sizes.includes(cell.size) ? cell.size : w.sizes[0];
            const [c, r] = SIZES[size];
            const openSettings = () => setModal({type: 'settings', id: cell.id});
            return h('section', {
              key: cell.id, className: 'bnt-card', 'aria-label': w.label(), 'data-widget': cell.id, 'data-c': c, style: {'--c': c, '--r': r},
              'data-banner': w.banner ? '' : undefined,
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
            editing ? h('div', {className: 'bnt-tools', draggable: false, onMouseDown: e => e.stopPropagation()},
              w.sizes.length > 1 ? h('select', {value: size, 'aria-label': t('size'), onChange: e => updateCell(cell.id, {size: e.target.value})}, w.sizes.map(s => h('option', {key: s, value: s}, sizeLabel(s)))) : null,
              w.settings.length ? h('button', {type: 'button', className: 'bnt-btn', 'aria-label': t('settings'), title: t('settings'), onClick: openSettings}, h(Icon.gear)) : null,
              h('button', {type: 'button', className: 'bnt-btn', 'aria-label': t('remove'), title: t('remove'), onClick: () => removeCell(cell.id)}, h(Icon.x))) : null,
            w.title && !w.banner ? h('header', null, h('h3', null, w.label())) : null,
            h('div', {className: 'bnt-body'}, renderSlot(SLOT, {size, config: cell.config ?? {}, editing, openSettings}, {only: cell.id})));
          };

          return h('div', {className: 'bnt-page'},
            h('style', null, CSS),
            h('div', {className: 'bnt-inner'},
              h('div', {className: 'bnt-head'}, tabs, h('span', {className: 'bnt-spacer'}), ...actions),
              shownError ? h('div', {className: 'bnt-error', role: 'alert'}, shownError) : null,
              board && cells.length === 0 && !editing ? h('div', {className: 'bnt-empty'},
                h('button', {type: 'button', className: 'bnt-action', onClick: () => { setEditing(true); setModal({type: 'gallery'}); }}, h(Icon.plus), t('addWidget'))) : null,
              h('div', {className: 'bnt-grid', 'data-editing': editing ? '' : undefined},
                cells.map(card),
                editing && board ? h('button', {type: 'button', className: 'bnt-btn bnt-addtile', onClick: () => setModal({type: 'gallery'})}, h(Icon.plus), t('addWidget')) : null)),
            modal?.type === 'gallery' && board ? h(Gallery, {list, board, onAdd: addWidget, onClose: () => setModal(null)}) : null,
            modalWidget ? h(SettingsModal, {widget: modalWidget, cell: board?.widgets.find(c => c.id === modal.id), onClose: () => setModal(null),
              onSaveConfig: config => updateCell(modal.id, {config})}) : null);
        }

        ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main', key: PANEL, locale: NS, inject: () => ({}),
          children: {[SLOT]: {kind: 'list', scope: 'root'}},
        }, Panel)), 'dsh-desk: main panel');
        ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist', id: PANEL, order: 30, label: () => t('title'),
        }, PanelIcon)), 'dsh-desk: sidebar entry');

        const builtins = [['desk.today', 'today', Today], ['desk.todo', 'todo', Todo], ['desk.note', 'note', Note], ['desk.calendar', 'calendar', Calendar], ['desk.weather', 'weather', Weather], ['desk.clock', 'clock', Clock]];
        builtins.forEach(([id, key, component], i) => {
          ctx.effect(() => ctx.slots.inject(SLOT, () => ctx.slots.register({
            name: SLOT, id, order: (i + 1) * 10, label: () => t(key),
          }, component)), `dsh-desk: ${id} widget`);
        });
      },
    };
  },
});
