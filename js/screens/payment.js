/*
 * screens/payment.js — «Пакеты».
 *   Пакет «Стандарт» — доступ на срок (CONFIG.PLANS), исследования без ограничений внутри срока:
 *     1 день  — бесплатно за подписку на бота (системный запрос «Разрешить боту писать вам»), один раз
 *     Неделя / Месяц — оплата в Telegram Stars
 *   «Глубокий аудит» (CONFIG.AUDIT) — индивидуальная разработка, кнопка ведёт в чат с автором.
 *   Внизу — что входит в «Стандарт».
 *
 * v1 (демо): оплата имитируется подтверждением, доступ продлевается сразу.
 * v2: сервер создаёт ссылку на счёт (Bot API createInvoiceLink, currency XTR),
 *     здесь вызываем Telegram.WebApp.openInvoice(link, status => …),
 *     а доступ продлевает сервер после successful_payment.
 */
(function () {
  // Что входит в «Стандарт»
  const BENEFITS = [
    { icon: '📰', title: '10 свежих новостей ниши', text: 'Законы, рынок, конкуренты, технологии — с разбором «что это значит для вас»' },
    { icon: '📊', title: 'Обзор рынка и SWOT', text: 'Спрос, конкуренция, порог входа, тренды и возможности' },
    { icon: '💡', title: 'Инсайты и риски', text: 'Главные выводы под вашу цель' },
    { icon: '✅', title: 'План действий и метрики', text: 'Шаги на неделю, месяц и квартал и что отслеживать' },
    { icon: '📄', title: 'Отчёт для скачивания', text: 'Полная версия — сохранить в PDF или распечатать' }
  ];

  const paidPlans = () => CONFIG.PLANS.filter((p) => !p.bonus);

  Router.register('payment', {
    render() {
      const s = Store.state;
      const sel = (paidPlans().find((p) => p.best) || paidPlans()[0]).id;
      const bonusPlan = CONFIG.PLANS.find((p) => p.bonus);

      // Карточка бесплатного дня
      const bonusCard = bonusPlan
        ? '<div class="plan plan-bonus card' + (s.bonusClaimed ? ' plan-used' : '') + '">' +
            '<div class="plan-top"><span class="plan-days">🎁</span>' +
              '<span class="plan-main"><span class="plan-title">' + bonusPlan.title + ' · бесплатно</span>' +
              '<span class="hint">' + (s.bonusClaimed ? 'Уже получен' : bonusPlan.note) + '</span></span>' +
              '<span class="plan-price">' + (s.bonusClaimed ? '✅' : '0 ⭐') + '</span></div>' +
            (s.bonusClaimed ? '' : '<button class="btn btn-primary btn-block tap" data-act="subscribe" type="button">Подписаться на @' + UI.esc(CONFIG.BOT_USERNAME) + ' и получить</button>') +
          '</div>'
        : '';

      return '<div class="page">' +
        '<h1 class="title">Пакеты</h1>' +
        (Store.hasAccess() ? '<div class="promo-done">✅ Ваш «Стандарт» действует ' + Screens.accessUntilText() + '</div>' : '') +

        // «Стандарт»
        '<div class="tier card">' +
          '<div class="tier-head"><span class="tier-name">Стандарт</span><span class="tier-badge">Глубокое исследование</span></div>' +
          '<div class="hint">Исследования без ограничений в течение срока. Подробный отчёт по вашей нише с возможностью скачать.</div>' +
        '</div>' +
        bonusCard +
        '<div class="plans">' +
        paidPlans().map((p) =>
          '<button class="plan card tap' + (p.id === sel ? ' selected' : '') + '" data-plan="' + p.id + '" type="button">' +
            (p.best ? '<span class="pack-ribbon">Выгодно ' + (p.save || '') + '</span>' : '') +
            '<span class="plan-top"><span class="plan-days">' + p.days + '<small>' + UI.plural(p.days, 'день', 'дня', 'дней') + '</small></span>' +
            '<span class="plan-main"><span class="plan-title">' + p.title + '</span><span class="hint">' + p.note + '</span></span>' +
            '<span class="plan-price">⭐ ' + Screens.fmt(p.price) + '</span></span>' +
          '</button>'
        ).join('') +
        '</div>' +

        // «Глубокий аудит»
        '<div class="audit card">' +
          '<div class="tier-head"><span class="tier-name">🔬 ' + CONFIG.AUDIT.title + '</span><span class="tier-badge tier-badge-dark">Индивидуально</span></div>' +
          '<div class="audit-text">' + CONFIG.AUDIT.text + '</div>' +
          '<div class="hint">⏱ ' + CONFIG.AUDIT.terms + '</div>' +
          '<button class="btn btn-secondary btn-block tap" data-act="audit" type="button">Обсудить с автором</button>' +
        '</div>' +

        '<div class="section-title">Что входит в «Стандарт»</div>' +
        '<div class="list card">' +
        BENEFITS.map((b) =>
          '<div class="row"><span class="row-emoji">' + b.icon + '</span>' +
          '<span class="row-main"><span class="row-title wrap">' + b.title + '</span><span class="row-sub wrap">' + b.text + '</span></span></div>'
        ).join('') +
        '</div>' +
        '<div class="demo-note">Демо: настоящая оплата Stars подключится вместе с сервером</div>' +
      '</div>';
    },

    mount(el, params) {
      let plan = paidPlans().find((p) => p.best) || paidPlans()[0];
      let paying = false;
      const btnText = () => 'Оплатить ⭐ ' + Screens.fmt(plan.price) + ' · ' + plan.title;

      TG.mainButton.show({
        text: btnText(),
        onClick: async () => {
          if (paying) return;
          paying = true;
          const ok = await TG.confirm('Демо-оплата: «Стандарт» на ' + Screens.daysText(plan.days) + ' за ⭐ ' + Screens.fmt(plan.price) + '?');
          if (ok) {
            await Store.addDays(plan.days);
            TG.haptic.success();
            UI.toast('✅ «Стандарт» активен ' + Screens.accessUntilText());
            Router.back();   // вернёт на «Подтверждение» (returnTo) или в Профиль/Главную
          }
          paying = false;
        }
      });

      el.addEventListener('click', async (e) => {
        if (e.target.closest('[data-act=subscribe]')) {
          TG.haptic.tap();
          const allowed = await TG.requestWriteAccess();
          if (!allowed) { UI.toast('Без подписки бесплатный день недоступен'); return; }
          if (await Store.claimBonus()) {
            TG.haptic.success();
            UI.toast('🎁 «Стандарт» на 1 день активен');
          }
          if (params.returnTo === 'confirm') Router.back();   // сразу можно запускать исследование
          else Router.refresh();
          return;
        }
        if (e.target.closest('[data-act=audit]')) {
          TG.haptic.tap();
          const p = Store.state.profile;
          const niche = p.nicheId ? Report.nicheTitle(p) : '';
          const text = 'Здравствуйте! Хочу обсудить глубокий аудит' + (niche ? ' ниши «' + niche + '»' : '') + '.';
          TG.openTelegramLink(CONFIG.SUPPORT_LINK + '?text=' + encodeURIComponent(text));
          return;
        }
        const b = e.target.closest('[data-plan]');
        if (!b) return;
        TG.haptic.select();
        plan = CONFIG.PLANS.find((p) => p.id === b.dataset.plan);
        el.querySelectorAll('[data-plan]').forEach((x) => x.classList.toggle('selected', x === b));
        TG.mainButton.update({ text: btnText() });
      });
    }
  });
})();
