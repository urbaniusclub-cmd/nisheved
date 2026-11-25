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
    const bal = Store.state.balance;
    const isFree = bal > 0 && !Store.listReports().length;

    const row = (emoji, label, value, edit) =>
      '<button class="row tap" data-edit="' + edit + '" type="button">' +
        '<span class="row-emoji">' + emoji + '</span>' +
        '<span class="row-main"><span class="row-sub">' + label + '</span><span class="row-title">' + UI.esc(value || '—') + '</span></span>' +
        '<span class="row-icon">' + UI.icon('edit', 20) + '</span>' +
      '</button>';

    const price = bal <= 0
      ? '<div class="price price-warn">Исследования закончились — пополните баланс</div>'
      : isFree
        ? '<div class="price"><span>Стоимость</span><b>🎁 Бесплатно</b></div>'
        : '<div class="price"><span>Спишется</span><b>1 из ' + bal + '</b></div>';

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
        '<div class="get card"><span>📰</span>Свежие новости</div>' +
        '<div class="get card"><span>📊</span>5 главных выводов</div>' +
        '<div class="get card"><span>✅</span>План действий</div>' +
      '</div>' +
      price +
    '</div>';
  },

  mount(el) {
    const bal = Store.state.balance;
    let creating = false;
    TG.mainButton.show(bal > 0
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
      : { text: 'Пополнить баланс', onClick: () => Router.go('payment', { returnTo: 'confirm' }) });

    el.addEventListener('click', (e) => {
      const r = e.target.closest('[data-edit]');
      if (!r) return;
      TG.haptic.tap();
      Router.go(r.dataset.edit, { mode: 'edit' });
    });
  }
});
