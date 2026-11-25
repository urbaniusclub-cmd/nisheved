/*
 * screens/profile.js — «Профиль».
 * Аватар и имя из Telegram, «Мой бизнес» и «Компания и контакты» (правка → экраны анкеты в режиме 'profile'),
 * баланс и покупка, поддержка, конфиденциальность, сброс данных.
 */
Router.register('profile', {
  render() {
    const u = TG.user();
    const p = Store.state.profile;
    const hasProfile = !!p.nicheId;
    const n = DATA.niche(p.nicheId);

    const row = (label, value, edit) =>
      '<button class="row tap" data-edit="' + edit + '" type="button">' +
        '<span class="row-main"><span class="row-sub">' + label + '</span><span class="row-title">' + UI.esc(value || 'Не указано') + '</span></span>' +
        '<span class="row-icon">' + UI.icon('chevron', 20) + '</span></button>';

    const business = hasProfile
      ? '<div class="list card">' +
          row('Ниша', (n ? n.emoji + ' ' : '🧩 ') + Report.nicheTitle(p), 'niche') +
          row('Вы', p.role, 'about') +
          row('Клиенты', p.clients, 'about') +
          row('Размер', p.size, 'about') +
          row('География', p.geo === 'Мой город' ? p.city : p.geo, 'about') +
          row('Конкуренты', (p.competitors || []).join(', '), 'about') +
        '</div>' +
        '<div class="section-title">Компания и контакты</div>' +
        '<div class="list card">' +
          row('Компания', p.company, 'company') +
          row('ИНН', p.inn, 'company') +
          row('ФИО и телефон', [p.contactName, p.phone].filter(Boolean).join(' · '), 'company') +
          row('Сайты', (p.sites || []).map((u) => u.replace(/^https?:\/\/(www\.)?/i, '')).join(', '), 'company') +
        '</div>'
      : '<div class="empty card"><div class="empty-art">🏢</div><div class="empty-title">Заполнится после первого исследования</div>' +
        '<button class="btn btn-secondary tap" data-act="fill" type="button">Заполнить сейчас</button></div>';

    const link = (act, ic, text, cls) =>
      '<button class="row tap ' + (cls || '') + '" data-act="' + act + '" type="button"><span class="row-ic">' + UI.icon(ic) + '</span>' +
      '<span class="row-main"><span class="row-title">' + text + '</span></span><span class="row-icon">' + UI.icon('chevron', 20) + '</span></button>';

    return '<div class="page">' +
      '<div class="profile-top">' + UI.avatar(Object.assign({}, u, { first_name: Screens.displayName() }), 84) +
        '<div class="profile-name">' + UI.esc(p.contactName || [u.first_name, u.last_name].filter(Boolean).join(' ')) + '</div>' +
        (u.username ? '<div class="hint">@' + UI.esc(u.username) + '</div>' : '') +
      '</div>' +
      '<div class="card balance">' +
        '<div><div class="hint">Баланс</div><div class="balance-n">⭐ ' + Screens.balanceText(Store.state.balance) + '</div></div>' +
        '<button class="btn btn-primary btn-small tap" data-act="buy" type="button">Купить</button>' +
      '</div>' +
      '<div class="section-title">Мой бизнес</div>' + business +
      '<div class="list card">' +
        link('support', 'support', 'Поддержка') +
        link('privacy', 'shield', 'Конфиденциальность') +
        link('reset', 'trash', 'Очистить данные', 'danger') +
      '</div>' +
      '<div class="hint center">' + CONFIG.APP_NAME + ' · версия 1.0 (демо)</div>' +
    '</div>';
  },

  mount(el) {
    el.addEventListener('click', async (e) => {
      const ed = e.target.closest('[data-edit]');
      if (ed) { TG.haptic.tap(); Screens.startProfileEdit(); Router.go(ed.dataset.edit, { mode: 'profile' }); return; }
      const a = e.target.closest('[data-act]');
      if (!a) return;
      TG.haptic.tap();
      switch (a.dataset.act) {
        case 'fill': Screens.startProfileEdit(); Router.go('niche', { mode: 'profile' }); break;
        case 'buy': Router.go('payment'); break;
        case 'support': TG.openTelegramLink(CONFIG.SUPPORT_LINK); break;
        case 'privacy':
          TG.alert('Мы храним только то, что вы указали в анкете, и ваши отчёты — в защищённом хранилище Telegram. Данные не передаются третьим лицам.');
          break;
        case 'reset':
          if (await TG.confirm('Удалить профиль, отчёты и баланс? Это нельзя отменить.')) {
            await Store.resetAll();
            UI.toast('Данные очищены');
            Router.go('home', {}, { base: [] });
          }
          break;
      }
    });
  }
});
