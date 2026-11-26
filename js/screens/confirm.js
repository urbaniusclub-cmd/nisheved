/*
 * screens/confirm.js — «Подтверждение».
 * Сводка анкеты (ниша, бизнес, цель, компания) с карандашами для правки, «Что вы получите», цена.
 * MainButton: «Получить исследование» (если есть баланс) или «Пополнить баланс» → Оплата.
 */
Router.register('confirm', {
  render() {
    const c = Store.state.draft;
    const n = DATA.niche(c.nicheId);
    const g = DATA.goal(c.goalId);
    const access = Store.hasAccess();

    const row = (emoji, label, value, edit) =>
      '<button class="row tap" data-edit="' + edit + '" type="button">' +
        '<span class="row-emoji">' + emoji + '</span>' +
        '<span class="row-main"><span class="row-sub">' + label + '</span><span class="row-title">' + UI.esc(value || '—') + '</span></span>' +
        '<span class="row-icon">' + UI.icon('edit', 20) + '</span>' +
      '</button>';

    // Полный доступ: активен — исследование без ограничений; нет — нужно получить доступ
    const price = access
      ? '<div class="price"><span>Полный доступ</span><b>✅ ' + Screens.accessUntilText() + '</b></div>'
      : '<div class="price price-warn">' + (Store.state.bonusClaimed ? 'Нужен полный доступ' : '🎁 Подпишитесь на бота — 1 день полного доступа бесплатно') + '</div>';

    return '<div class="page">' +
      '<h1 class="title">Всё верно?</h1>' +
      '<div class="list card">' +
        row(n ? n.emoji : '🧩', 'Ниша', Report.nicheTitle(c), 'niche') +
        row('👤', 'О бизнесе', Screens.aboutLine(c), 'about') +
        row(g ? g.emoji : '🎯', 'Цель', g ? g.title : '', 'goal') +
        row('🏢', 'Компания и контакты', [c.company || (c.inn ? 'ИНН ' + c.inn : ''), c.contactName].filter(Boolean).join(' · '), 'company') +
      '</div>' +
      '<div class="section-title">Что вы получите</div>' +
      '<div class="get-grid">' +
        '<div class="get card"><span>📰</span>10 свежих новостей</div>' +
        '<div class="get card"><span>📊</span>Рынок и SWOT</div>' +
        '<div class="get card"><span>✅</span>План и метрики</div>' +
        '<div class="get card"><span>📄</span>Отчёт для скачивания</div>' +
      '</div>' +
      price +
    '</div>';
  },

  mount(el) {
    let creating = false;
    TG.mainButton.show(Store.hasAccess()
      ? {
          text: 'Получить исследование',
          onClick: async () => {
            if (creating) return;
            creating = true;
            const rec = await Store.createReport(Store.state.draft);
            // Под экраном генерации в истории оставляем только главную
            Router.go('generating', { id: rec.id }, { base: [{ name: 'home' }] });
          }
        }
      : { text: Store.state.bonusClaimed ? 'Получить доступ' : 'Получить 1 день бесплатно', onClick: () => Router.go('payment', { returnTo: 'confirm' }) });

    el.addEventListener('click', (e) => {
      const r = e.target.closest('[data-edit]');
      if (!r) return;
      TG.haptic.tap();
      Router.go(r.dataset.edit, { mode: 'edit' });
    });
  }
});
