window.__ModuleLoader__.load({
  id: 'dsh-bento',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const {useEffect, useRef, useState, useSyncExternalStore} = React;

    const NS = 'dsh-bento';
    const PANEL = 'dsh-bento';
    const SLOT = 'bento.widget';
    const BOARD = 'work';
    const POLL_MS = 5000;
    // 尺寸档位：[列, 行]，行单位 80px；「横栏」半高，其余行数成对。
    const SIZES = {bar: [4, 1], s: [1, 2], m: [2, 2], t: [1, 4], l: [2, 4], w: [4, 2]};

    const zh = {
      lang: 'zh-CN', title: 'Bento', loadFailed: '加载失败', empty: '看板上还没有 widget',
      today: '今日', clock: '时钟', todo: '待办', note: '速记',
      night: '夜深了', morning: '早上好', noon: '中午好', afternoon: '下午好', evening: '晚上好',
      week: '第 {n} 周', year: '今年已过 {n}%', nextQuote: '换一条',
      addTodo: '添加待办', carried: '结转', done: '已完成 {n}', remove: '删除', complete: '完成', reopen: '恢复', noTodos: '没有待办',
      notePlaceholder: '随手记', saved: '已保存 {t}', saving: '保存中…', lineToTodo: '当前行转待办',
    };
    const en = {
      lang: 'en-US', title: 'Bento', loadFailed: 'Failed to load', empty: 'No widgets on this board yet',
      today: 'Today', clock: 'Clock', todo: 'To-do', note: 'Notes',
      night: 'Good night', morning: 'Good morning', noon: 'Good afternoon', afternoon: 'Good afternoon', evening: 'Good evening',
      week: 'Week {n}', year: '{n}% of the year', nextQuote: 'Next quote',
      addTodo: 'Add a to-do', carried: 'Carried over', done: 'Completed {n}', remove: 'Remove', complete: 'Complete', reopen: 'Reopen', noTodos: 'Nothing to do',
      notePlaceholder: 'Jot something down', saved: 'Saved {t}', saving: 'Saving…', lineToTodo: 'Current line to to-do',
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

    const Icon = {
      check: () => h('svg', {width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true}, h('path', {d: 'M5 12.5l4.5 4.5L19 7.5'})),
      x: () => h('svg', {width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', 'aria-hidden': true}, h('path', {d: 'M6 6l12 12M18 6L6 18'})),
      plus: () => h('svg', {width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', 'aria-hidden': true}, h('path', {d: 'M12 5v14M5 12h14'})),
      chev: () => h('svg', {width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true}, h('path', {d: 'M9 6l6 6-6 6'})),
    };

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
        ctx.effect(() => ctx.locale.register(NS, {zh, en}), 'dsh-bento: dictionaries');
        const t = ctx.locale.bind(NS);
        const call = async (method, payload = {}) => {
          const result = await ctx.connection.rpc.call('/api', `dsh-bento/${method}`, payload);
          if (result?.ok === true) return result.value;
          throw new Error(result?.error?.message || t('loadFailed'));
        };
        const data = createData(call);
        const useData = () => useSyncExternalStore(data.subscribe, data.getSnapshot, data.getSnapshot);
        const localeSubscribe = fn => (typeof ctx.locale.subscribe === 'function' ? ctx.locale.subscribe(fn) : () => {});
        const localeRevision = () => ctx.locale.getSnapshot?.()?.revision ?? 0;
        const useLocale = () => useSyncExternalStore(localeSubscribe, localeRevision, localeRevision);

        function Today() {
          useLocale();
          const now = useNow();
          const [offset, setOffset] = useState(0);
          const lang = t('lang');
          const q = QUOTES[(dayOfYear(now) + offset) % QUOTES.length];
          const zhQuote = lang.startsWith('zh');
          return h('div', {className: 'bnt-today'},
            h('div', {className: 'bnt-tclock'},
              h('span', {className: 'bnt-time bnt-num'}, `${pad(now.getHours())}:${pad(now.getMinutes())}`),
              h('span', {className: 'bnt-greet'}, greeting(t, now.getHours())),
              h('span', {className: 'bnt-date'}, `${now.toLocaleDateString(lang, {month: 'long', day: 'numeric', weekday: 'long'})} · ${fill(t('week'), {n: isoWeek(now)})}`)),
            h('span', {className: 'bnt-sep bnt-qsep'}),
            h('button', {type: 'button', className: 'bnt-btn bnt-quote', title: t('nextQuote'), onClick: () => setOffset(o => o + 1)},
              h('span', {className: 'bnt-qtext'}, zhQuote ? q.zh : q.en),
              h('cite', null, `— ${zhQuote ? q.by.zh : q.by.en}`)));
        }
        Today.bento = {apiVersion: 1, sizes: ['bar'], banner: true};

        function Clock({size}) {
          useLocale();
          const now = useNow();
          const lang = t('lang');
          const start = new Date(now.getFullYear(), 0, 1);
          const yearPct = Math.floor((now - start) / (new Date(now.getFullYear() + 1, 0, 1) - start) * 100);
          return h('div', {className: 'bnt-clock', 'data-size': size},
            h('span', {className: 'bnt-muted'}, greeting(t, now.getHours())),
            h('span', {className: 'bnt-time bnt-num'}, `${pad(now.getHours())}:${pad(now.getMinutes())}`),
            h('span', {className: 'bnt-muted'}, `${now.toLocaleDateString(lang, {month: 'short', day: 'numeric', weekday: 'short'})} · ${fill(t('week'), {n: isoWeek(now)})}`),
            size === 's' ? null : h('div', {className: 'bnt-yearbar', title: fill(t('year'), {n: yearPct})}, h('i', {style: {width: `${yearPct}%`}})));
        }
        Clock.bento = {apiVersion: 1, sizes: ['m', 's'], title: false};

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
        Todo.bento = {apiVersion: 1, sizes: ['l', 'm', 't']};

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
        Note.bento = {apiVersion: 1, sizes: ['l', 't', 'm', 's']};

        function widgetList() {
          return ctx.slots.entries(SLOT).map(entry => {
            const {id, label} = entry.options;
            const manifest = entry.component?.bento ?? {};
            const sizes = (Array.isArray(manifest.sizes) ? manifest.sizes : []).filter(s => SIZES[s]);
            return {id: id ?? '', label: typeof label === 'function' ? label() : label ?? id, sizes: sizes.length ? sizes : ['m'], banner: manifest.banner === true, title: manifest.title !== false};
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

        function Panel({renderSlot}) {
          useLocale();
          const list = useSyncExternalStore(widgets.subscribe, widgets.getSnapshot, widgets.getSnapshot);
          const [board, setBoard] = useState(null);
          const [error, setError] = useState('');
          const {error: dataError} = useData();
          useEffect(() => {
            let alive = true;
            call('board.get', {id: BOARD}).then(b => { if (alive) setBoard(b); }, e => { if (alive) setError(String(e?.message || e)); });
            return () => { alive = false; };
          }, []);
          // 新安装插件的 widget 自动加入一次；记入 known 后用户移除不再回来。
          useEffect(() => {
            if (!board) return;
            const known = new Set(board.known ?? []);
            const fresh = list.filter(w => w.id && !known.has(w.id));
            if (!fresh.length) return;
            const next = {...board, widgets: [...board.widgets, ...fresh.map(w => ({id: w.id, size: w.sizes[0]}))], known: [...known, ...fresh.map(w => w.id)]};
            setBoard(next);
            call('board.put', {board: next}).catch(e => setError(String(e?.message || e)));
          }, [board, list]);
          const byId = new Map(list.map(w => [w.id, w]));
          const cells = (board?.widgets ?? []).filter(c => byId.has(c.id));
          const shownError = error || dataError;
          return h('div', {className: 'bnt-page'},
            h('style', null, CSS),
            h('div', {className: 'bnt-inner'},
              shownError ? h('div', {className: 'bnt-error', role: 'alert'}, shownError) : null,
              board && cells.length === 0 ? h('div', {className: 'bnt-empty'}, t('empty')) : null,
              h('div', {className: 'bnt-grid'}, cells.map(cell => {
                const w = byId.get(cell.id);
                const size = w.sizes.includes(cell.size) ? cell.size : w.sizes[0];
                const [c, r] = SIZES[size];
                return h('section', {key: cell.id, className: 'bnt-card', 'data-banner': w.banner ? '' : undefined, 'data-widget': cell.id, 'data-c': c, style: {'--c': c, '--r': r}, 'aria-label': w.label},
                  w.title && !w.banner ? h('header', null, h('h3', null, w.label)) : null,
                  h('div', {className: 'bnt-body'}, renderSlot(SLOT, {size, config: cell.config ?? {}}, {only: cell.id})));
              }))));
        }

        ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main', key: PANEL, locale: NS, inject: () => ({}),
          children: {[SLOT]: {kind: 'list', scope: 'root'}},
        }, Panel)), 'dsh-bento: main panel');
        ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist', id: PANEL, order: 30, label: () => t('title'),
        }, PanelIcon)), 'dsh-bento: sidebar entry');

        const builtins = [['bento.today', 'today', Today], ['bento.todo', 'todo', Todo], ['bento.note', 'note', Note], ['bento.clock', 'clock', Clock]];
        builtins.forEach(([id, key, component], i) => {
          ctx.effect(() => ctx.slots.inject(SLOT, () => ctx.slots.register({
            name: SLOT, id, order: (i + 1) * 10, label: () => t(key),
          }, component)), `dsh-bento: ${id} widget`);
        });
      },
    };
  },
});
