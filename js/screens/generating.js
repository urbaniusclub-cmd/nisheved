/*
 * screens/generating.js — «Генерация».
 * Анимация + 6 этапов работы агентов с галочками (DATA.STAGES).
 * Прогресс считается от времени создания отчёта, поэтому экран можно закрыть
 * и вернуться — прогресс не сбросится. Длительность этапа — CONFIG.STAGE_MS.
 */
Router.register('generating', {
  render(params) {
    const rec = Store.getReport(params.id);
    if (!rec) return '<div class="page"><div class="empty card"><div class="empty-art">🤷</div><div class="empty-title">Отчёт не найден</div></div></div>';
    return '<div class="page gen">' +
      '<div class="gen-art" aria-hidden="true"><div class="gen-ring"></div><div class="gen-ring r2"></div><div class="gen-core">' + Report.nicheEmoji(rec) + '</div></div>' +
      '<h1 class="title center">Готовлю исследование</h1>' +
      '<div class="hint center">' + UI.esc(Report.nicheTitle(rec)) + '</div>' +
      '<div class="bar"><i style="width:0%"></i></div>' +
      '<div class="stages card">' +
        DATA.STAGES.map((s, i) =>
          '<div class="stage" data-i="' + i + '"><span class="stage-ic"><span class="stage-emoji">' + s.emoji + '</span><span class="stage-check">' + UI.icon('check', 18) + '</span></span><span>' + s.text + '</span></div>'
        ).join('') +
      '</div>' +
      '<div class="hint center">Можно свернуть — отчёт сохранится на главной</div>' +
      '<button class="btn btn-plain btn-block tap" data-act="hide" type="button">Свернуть</button>' +
    '</div>';
  },

  mount(el, params) {
    const rec = Store.getReport(params.id);
    if (!rec) return null;
    const bar = el.querySelector('.bar i');
    const stages = el.querySelectorAll('.stage');
    const total = rec.readyAt - rec.createdAt;
    let lastStage = -1;

    el.querySelector('[data-act=hide]').addEventListener('click', () => { TG.haptic.tap(); Router.back(); });

    function tick() {
      const elapsed = Date.now() - rec.createdAt;
      const pct = Math.min(100, (elapsed / total) * 100);
      bar.style.width = pct + '%';
      const cur = Math.min(stages.length, Math.floor(elapsed / CONFIG.STAGE_MS));
      stages.forEach((s, i) => {
        s.classList.toggle('done', i < cur);
        s.classList.toggle('active', i === cur);
      });
      if (cur !== lastStage && lastStage !== -1 && cur < stages.length) TG.haptic.select();
      lastStage = cur;
      if (Store.isReady(rec)) {
        clearInterval(timer);
        TG.haptic.success();
        setTimeout(() => {
          // Переходим, только если пользователь всё ещё на этом экране
          const cur = Router.current();
          if (cur && cur.name === 'generating' && cur.params.id === rec.id) Router.replace('report', { id: rec.id });
        }, 450);
      }
    }
    const timer = setInterval(tick, 200);
    tick();
    return () => clearInterval(timer);
  }
});
