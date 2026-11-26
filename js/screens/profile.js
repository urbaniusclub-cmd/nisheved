/*
 * screens/profile.js — «Профиль».
 * Аватар и имя из Telegram, «Мой бизнес» и «Компания и контакты» (правка → экраны анкеты в режиме 'profile'),
 * баланс и покупка, поддержка, конфиденциальность, сброс данных.
 */
/* ---------- Реферальная ссылка ----------
 * Ссылка с id пользователя: t.me/<бот>?start=ref_<id> (или t.me/<бот>/<app>?startapp=ref_<id>,
 * если задан CONFIG.APP_SHORT_NAME). Пригласившего запоминает app.js → Store.setReferrer.
 * Начисление наград за друзей требует сервера (v2).
 */
function referralLink() {
  const id = TG.user().id || 'demo';
  return CONFIG.APP_SHORT_NAME
    ? 'https://t.me/' + CONFIG.BOT_USERNAME + '/' + CONFIG.APP_SHORT_NAME + '?startapp=ref_' + id
    : 'https://t.me/' + CONFIG.BOT_USERNAME + '?start=ref_' + id;
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
  // Запасной вариант для старых WebView
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); } finally { ta.remove(); }
  return Promise.resolve();
}

function openReferral() {
  const link = referralLink();
  const text = 'Попробуй ' + CONFIG.APP_NAME + ' — исследование ниши за 5 минут: свежие новости, инсайты и план действий. 1 день бесплатно за подписку на бота 🎁';
  UI.sheet(
    '<div class="ref-art">🤝</div>' +
    '<h2 class="sheet-title center">Порекомендуйте друзьям</h2>' +
    '<div class="ref-offer">🎁 1 рекомендация = 1 день полного доступа бесплатно</div>' +
    '<p class="sheet-text center">Поделитесь личной ссылкой с коллегами и знакомыми предпринимателями</p>' +
    '<div class="ref-link">' + UI.esc(link) + '</div>' +
    '<button class="btn btn-primary btn-block tap" data-ref="send" type="button">' + UI.icon('share', 20) + ' Отправить друзьям</button>' +
    '<button class="btn btn-secondary btn-block tap" data-ref="copy" type="button">' + UI.icon('link', 20) + ' Скопировать ссылку</button>',
    {
      onMount(body) {
        body.querySelector('[data-ref=send]').onclick = () => {
          TG.haptic.tap();
          const share = 'https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(text);
          if (TG.inTelegram) TG.openTelegramLink(share);
          else if (navigator.share) navigator.share({ text: text, url: link }).catch(() => {});
          else TG.openLink(share);
        };
        body.querySelector('[data-ref=copy]').onclick = () => {
          copyText(link).then(() => { TG.haptic.success(); UI.toast('Ссылка скопирована'); })
            .catch(() => UI.toast('Не удалось скопировать — выделите ссылку вручную'));
        };
      }
    }
  );
}

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
        '<div><div class="hint">Полный доступ</div><div class="balance-n">' +
          (Store.hasAccess() ? '✅ Активен ' + Screens.accessUntilText() : 'Не активен') + '</div></div>' +
        '<button class="btn btn-primary btn-small tap" data-act="buy" type="button">' + (Store.hasAccess() ? 'Продлить' : 'Выбрать') + '</button>' +
      '</div>' +
      '<div class="section-title">Мой бизнес</div>' + business +
      '<div class="list card">' +
        link('support', 'support', 'Поддержка') +
        '<button class="row tap" data-act="refer" type="button"><span class="row-ic">' + UI.icon('share') + '</span>' +
          '<span class="row-main"><span class="row-title">Порекомендовать друзьям</span>' +
          '<span class="row-sub">1 рекомендация = 1 день полного доступа бесплатно</span></span>' +
          '<span class="row-icon">' + UI.icon('chevron', 20) + '</span></button>' +
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
        case 'refer': openReferral(); break;
        case 'privacy':
          TG.alert('Мы храним только то, что вы указали в анкете, и ваши отчёты — в защищённом хранилище Telegram. Данные не передаются третьим лицам.');
          break;
        case 'reset':
          if (await TG.confirm('Удалить профиль, отчёты и баланс? Это нельзя отменить.')) {
            await Store.resetAll();
            UI.toast('Данные очищены');
            Router.go('welcome', {}, { base: [] });   // как при первом запуске
          }
          break;
      }
    });
  }
});
