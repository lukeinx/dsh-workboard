window.__ModuleLoader__.load({
  id: 'dsh-bento',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const {useEffect, useState, useSyncExternalStore} = React;

    const NS = 'dsh-bento';
    const PANEL = 'dsh-bento';
    const SLOT = 'bento.widget';
    const SIZES = {s: [1, 1], m: [2, 1], tall: [1, 2], l: [2, 2], wide: [4, 1]};

    const zh = {
      title: 'Bento', clock: '时钟', empty: '还没有 widget', loadFailed: '加载失败',
      morning: '早上好', afternoon: '下午好', evening: '晚上好', week: '第 {n} 周',
    };
    const en = {
      title: 'Bento', clock: 'Clock', empty: 'No widgets yet', loadFailed: 'Failed to load',
      morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', week: 'Week {n}',
    };

    const CSS = `
.bnt-page{height:100%;overflow:auto;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px}
.bnt-inner{max-width:1120px;margin:0 auto;padding:20px 24px 32px;box-sizing:border-box}
.bnt-title{font-size:18px;font-weight:600;margin:0 0 16px}
.bnt-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:80px;grid-auto-flow:dense;gap:16px}
@media (max-width:900px){.bnt-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.bnt-cell[data-size=wide]{grid-column:span 2}}
@media (max-width:600px){.bnt-grid{grid-template-columns:minmax(0,1fr)}.bnt-cell{grid-column:auto!important}}
.bnt-cell{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:16px;box-sizing:border-box;overflow:hidden;min-width:0}
.bnt-empty{color:var(--dsw-alias-label-secondary);padding:40px 0;text-align:center}
.bnt-muted{color:var(--dsw-alias-label-secondary);font-size:12px}
.bnt-clock{display:flex;flex-direction:column;justify-content:center;height:100%;gap:2px}
.bnt-clock b{font-size:28px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1.1}
`;

    function isoWeek(d) {
      const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
      return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
    }

    function useNow(ms) {
      const [now, setNow] = useState(() => new Date());
      useEffect(() => { const id = setInterval(() => setNow(new Date()), ms); return () => clearInterval(id); }, [ms]);
      return now;
    }

    function Clock({t}) {
      const now = useNow(1000);
      const hour = now.getHours();
      const greet = hour < 12 ? t('morning') : hour < 18 ? t('afternoon') : t('evening');
      return h('div', {className: 'bnt-clock'},
        h('span', {className: 'bnt-muted'}, greet),
        h('b', null, now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})),
        h('span', {className: 'bnt-muted'}, `${now.toLocaleDateString([], {month: 'long', day: 'numeric', weekday: 'short'})} · ${t('week').replace('{n}', isoWeek(now))}`));
    }

    Clock.bento = {apiVersion: 1, sizes: ['m', 's']};

    function widgetList(ctx) {
      return ctx.slots.entries(SLOT).map(entry => {
        const {id, order, label} = entry.options;
        const manifest = entry.component?.bento;
        return {id: id ?? '', order, label: typeof label === 'function' ? label() : label, sizes: manifest?.sizes ?? ['m'], hasManifest: Boolean(manifest), optionKeys: Object.keys(entry.options), registrant: entry.registrant};
      });
    }

    function widgetSource(ctx) {
      let version = -1;
      let list = [];
      return {
        getSnapshot() {
          const next = ctx.slots.getVersion(SLOT);
          if (next !== version) { version = next; list = widgetList(ctx); }
          return list;
        },
        subscribe: fn => ctx.slots.subscribe(SLOT, fn),
      };
    }

    function PanelIcon({size = 20}) {
      return h('svg', {width: size, height: size, viewBox: '0 0 20 20', fill: 'none', 'aria-hidden': true},
        h('rect', {x: 2.5, y: 2.5, width: 15, height: 15, rx: 3, stroke: 'currentColor', strokeWidth: 1.4}),
        h('path', {d: 'M10 2.5v15M10 10h7.5', stroke: 'currentColor', strokeWidth: 1.4}));
    }

    return {
      inject: ['slots', 'connection', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, {zh, en}), 'dsh-bento: dictionaries');
        const t = ctx.locale.bind(NS);
        const call = (method, payload = {}) => ctx.connection.rpc.call('/api', `dsh-bento/${method}`, payload);
        const widgets = widgetSource(ctx);
        const localeSubscribe = fn => (typeof ctx.locale.subscribe === 'function' ? ctx.locale.subscribe(fn) : () => {});
        const localeRevision = () => ctx.locale.getSnapshot?.()?.revision ?? 0;

        function Panel({renderSlot}) {
          useSyncExternalStore(localeSubscribe, localeRevision, localeRevision);
          const list = useSyncExternalStore(widgets.subscribe, widgets.getSnapshot, widgets.getSnapshot);
          const [board, setBoard] = useState(null);
          useEffect(() => {
            let alive = true;
            call('board.get', {id: 'work'}).then(r => { if (alive && r?.ok) setBoard(r.value); }, () => {});
            return () => { alive = false; };
          }, []);
          const placed = board?.widgets ?? [];
          const byId = new Map(list.map(w => [w.id, w]));
          const cells = placed.filter(p => byId.has(p.id)).concat(list.filter(w => !placed.some(p => p.id === w.id)).map(w => ({id: w.id, size: w.sizes[0]})));
          return h('div', {className: 'bnt-page'},
            h('style', null, CSS),
            h('div', {className: 'bnt-inner'},
              h('h2', {className: 'bnt-title'}, t('title')),
              cells.length === 0 ? h('div', {className: 'bnt-empty'}, t('empty')) :
                h('div', {className: 'bnt-grid'}, cells.map(cell => {
                  const [cols, rows] = SIZES[cell.size] ?? SIZES.m;
                  return h('section', {key: cell.id, className: 'bnt-cell', 'data-size': cell.size, style: {gridColumn: `span ${cols}`, gridRow: `span ${rows}`}},
                    renderSlot(SLOT, {size: cell.size}, {only: cell.id}));
                }))));
        }

        ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main', key: PANEL, locale: NS, inject: () => ({}),
          children: {[SLOT]: {kind: 'list', scope: 'root'}},
        }, Panel)), 'dsh-bento: main panel');
        ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist', id: PANEL, order: 30, label: () => t('title'),
        }, PanelIcon)), 'dsh-bento: sidebar entry');
        ctx.effect(() => ctx.slots.inject(SLOT, () => ctx.slots.register({
          name: SLOT, id: 'bento.clock', order: 10, label: () => t('clock'), locale: NS,
        }, Clock)), 'dsh-bento: clock widget');

        ctx.effect(() => {
          let timer = null;
          const report = () => {
            clearTimeout(timer);
            timer = setTimeout(() => { call('client.report', {widgets: widgetList(ctx)}).catch(() => {}); }, 300);
          };
          const off = ctx.slots.subscribe(SLOT, report);
          report();
          return () => { off(); clearTimeout(timer); };
        }, 'dsh-bento: widget report');
      },
    };
  },
});
