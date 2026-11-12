window.__ModuleLoader__.load({
  id: 'dsh-workboard-hello-widget',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    function Hello({size}) {
      return h('div', {style: {display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: 4}},
        h('b', {style: {fontSize: 15}}, 'Hello from another bundle'),
        h('span', {style: {color: 'var(--dsw-alias-label-secondary)', fontSize: 12}}, `size: ${size}`));
    }

    Hello.workboard = {apiVersion: 1, sizes: ['m', 's']};

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.effect(() => ctx.slots.inject('workboard.widget', () => ctx.slots.register({
          name: 'workboard.widget', id: 'hello.widget', order: 100, label: 'Hello',
        }, Hello)), 'dsh-workboard-hello-widget: widget');
      },
    };
  },
});
