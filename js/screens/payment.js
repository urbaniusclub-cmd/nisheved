/*
 * screens/payment.js — «Пакеты исследований».
 *   Сверху — подарок: «Подпишитесь на бота и получите первое исследование бесплатно»
 *            (системный запрос Telegram «Разрешить боту писать вам», бонус один раз — CONFIG.BONUS_RESEARCHES)
 *   Пакеты и цены — CONFIG.PACKAGES (оплата в Telegram Stars)
 *   Внизу — «Что вы получаете»
 *
 * v1 (демо): оплата имитируется подтверждением, баланс пополняется сразу.
 * v2: сервер создаёт ссылку на счёт (Bot API createInvoiceLink, currency XTR),
 *     здесь вызываем Telegram.WebApp.openInvoice(link, status => …),
 *     а баланс начисляет сервер после successful_payment.
 */
(function () {
  // Что получает пользователь (блок внизу экрана)
  const BENEFITS = [
    { icon: '📰', title: 'Оперативная сводка новостей', text: 'Последние новости вашей ниши за 90 дней' },
    { icon: '💡', title: 'Инсайты', text: 'Главные выводы: что меняется и где возможности' },
    { icon: '⚡', title: 'Глубокое и быстрое исследование', text: 'Законы, конкуренты, тренды — за 5 минут' },
    { icon: '✅', title: 'Краткие рекомендации', text: 'Как применить: шаги на неделю, месяц и квартал' }
  ];

  Router.register('payment', {
    render() {
      const sel = (CONFIG.PACKAGES.find((p) => p.best) || CONFIG.PACKAGES[0]).id;
      const promo = !Store.state.bonusClaimed
        ? '<div class="promo">' +
            '<div class="promo-gift">🎁</div>' +
            '<div class="promo-title">Первое исследование — бесплатно</div>' +
            '<div class="promo-text">Подпишитесь на бота @' + UI.esc(CONFIG.BOT_USERNAME) + ' и получите первое исследование в подарок</div>' +
            '<button class="btn promo-btn btn-block tap" data-act="subscribe" type="button">Подписаться и получить</button>' +
          '</div>'
        : '<div class="promo-done">✅ Бонус за подписку на бота получен</div>';

      return '<div class="page">' +
        promo +
        '<h1 class="title">Пакеты исследований</h1>' +
        '<div class="hint">Оплата в Telegram Stars ⭐</div>' +
        '<div class="packs">' +
        CONFIG.PACKAGES.map((p) =>
          '<button class="pack card tap' + (p.id === sel ? ' selected' : '') + '" data-pack="' + p.id + '" type="button">' +
            (p.best ? '<span class="pack-ribbon">Выгодно</span>' : '') +
            '<span class="pack-count">' + p.count + '</span>' +
            '<span class="pack-main"><span class="pack-label">' + p.label + '</span>' +
            '<span class="hint">' + Screens.fmt(Math.round(p.price / p.count)) + ' ⭐ за исследование' + (p.save ? ' · ' + p.save : '') + '</span></span>' +
            '<span class="pack-price">⭐ ' + Screens.fmt(p.price) + '</span>' +
          '</button>'
        ).join('') +
        '</div>' +
        '<div class="section-title">Что вы получаете</div>' +
        '<div class="list card">' +
        BENEFITS.map((b) =>
          '<div class="row"><span class="row-emoji">' + b.icon + '</span>' +
          '<span class="row-main"><span class="row-title wrap">' + b.title + '</span><span class="row-sub wrap">' + b.text + '</span></span></div>'
        ).join('') +
        '</div>' +
        '<div class="demo-note">Демо: настоящая оплата подключится вместе с сервером</div>' +
      '</div>';
    },

    mount(el, params) {
      let pack = CONFIG.PACKAGES.find((p) => p.best) || CONFIG.PACKAGES[0];
      let paying = false;
      const btnText = () => 'Оплатить ⭐ ' + Screens.fmt(pack.price);

      TG.mainButton.show({
        text: btnText(),
        onClick: async () => {
          if (paying) return;
          paying = true;
          const ok = await TG.confirm('Демо-оплата: зачислить ' + Screens.balanceText(pack.count) + ' за ⭐ ' + Screens.fmt(pack.price) + '?');
          if (ok) {
            await Store.addBalance(pack.count);
            TG.haptic.success();
            UI.toast('Зачислено: ' + Screens.balanceText(pack.count));
            Router.back();   // вернёт на «Подтверждение» (returnTo) или в Профиль/Главную
          }
          paying = false;
        }
      });

      el.addEventListener('click', async (e) => {
        if (e.target.closest('[data-act=subscribe]')) {
          TG.haptic.tap();
          const allowed = await TG.requestWriteAccess();
          if (!allowed) { UI.toast('Без подписки бонус недоступен'); return; }
          if (await Store.claimBonus()) {
            TG.haptic.success();
            UI.toast('🎁 Начислено бесплатное исследование');
          }
          if (params.returnTo === 'confirm') Router.back();   // сразу можно запускать исследование
          else Router.refresh();
          return;
        }
        const b = e.target.closest('[data-pack]');
        if (!b) return;
        TG.haptic.select();
        pack = CONFIG.PACKAGES.find((p) => p.id === b.dataset.pack);
        el.querySelectorAll('.pack').forEach((x) => x.classList.toggle('selected', x === b));
        TG.mainButton.update({ text: btnText() });
      });
    }
  });
})();
