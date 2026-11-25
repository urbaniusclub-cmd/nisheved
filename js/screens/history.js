/*
 * screens/history.js — «Мои исследования» (история отчётов).
 * Открывается кнопкой на Главной. Готовый отчёт → report, готовящийся → generating.
 * MainButton «Новое исследование».
 */
Router.register('history', {
  render() {
    const reports = Store.listReports();
    if (!reports.length) {
      return '<div class="page"><h1 class="title">Мои исследования</h1>' +
        '<div class="empty card"><div class="empty-art">🗂</div><div class="empty-title">Здесь появятся ваши отчёты</div>' +
        '<div class="hint">Первое исследование — бесплатно</div></div></div>';
    }
    return '<div class="page">' +
      '<h1 class="title">Мои исследования</h1>' +
      '<div class="list card">' + reports.map((r) => {
        const ready = Store.isReady(r);
        const goal = DATA.goal(r.goalId);
        const total = ready ? Report.build(r).stepsTotal : 0;
        return '<button class="row tap" data-id="' + r.id + '" type="button">' +
          '<span class="row-emoji">' + Report.nicheEmoji(r) + '</span>' +
          '<span class="row-main"><span class="row-title">' + UI.esc(Report.nicheTitle(r)) + '</span>' +
          '<span class="row-sub">' + (goal ? goal.emoji + ' ' + goal.title + ' · ' : '') + UI.dateRel(r.createdAt) + '</span>' +
          (ready ? '<span class="row-sub">✅ План: ' + r.done.length + ' из ' + total + '</span>' : '<span class="row-sub">⏳ Готовится…</span>') +
          '</span>' +
          (ready ? '<span class="row-icon">' + UI.icon('chevron', 20) + '</span>' : '<span class="status"><i class="spinner"></i></span>') +
          '</button>';
      }).join('') + '</div></div>';
  },

  mount(el) {
    TG.mainButton.show({
      text: 'Новое исследование',
      onClick: () => { Store.startDraft(); Router.go('niche', { mode: 'flow' }, { base: [{ name: 'home' }] }); }
    });
    el.addEventListener('click', (e) => {
      const row = e.target.closest('[data-id]');
      if (!row) return;
      TG.haptic.tap();
      const r = Store.getReport(row.dataset.id);
      Router.go(Store.isReady(r) ? 'report' : 'generating', { id: r.id });
    });
    const pending = Store.listReports().filter((r) => !Store.isReady(r));
    if (!pending.length) return null;
    const timer = setInterval(() => { if (pending.some((r) => Store.isReady(r))) Router.refresh(); }, 1000);
    return () => clearInterval(timer);
  }
});
