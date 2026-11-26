/*
 * screens/welcome.js — экран приветствия (онбординг).
 * Показывается один раз при первом запуске, до Главной (флаг Store.state.onboarded).
 * Обращение по имени из Telegram, 3 пункта «что здесь можно сделать», MainButton «Начать» → Главная.
 */
(function () {
  const POINTS = [
    { icon: '📰', title: 'Свежие новости вашей ниши', text: 'Законы, рынок, конкуренты — самое важное за 90 дней' },
    { icon: '💡', title: 'Выводы простым языком', text: 'Что это значит именно для вашего бизнеса' },
    { icon: '✅', title: 'План действий', text: 'Что сделать на этой неделе, в месяце и квартале' }
  ];

  Router.register('welcome', {
    render() {
      const name = Screens.displayName();
      const known = name && name !== 'Гость';
      return '<div class="page welcome">' +
        '<div class="welcome-logo">' +
          '<svg viewBox="0 0 64 64" width="88" height="88" aria-hidden="true"><rect width="64" height="64" rx="18" fill="#2AABEE"/>' +
          '<circle cx="28" cy="28" r="13" fill="none" stroke="#fff" stroke-width="6"/><path d="M38 38l11 11" stroke="#fff" stroke-width="7" stroke-linecap="round"/></svg>' +
        '</div>' +
        '<div class="welcome-hello">' + (known ? 'Привет, ' + UI.esc(name) + '! 👋' : 'Привет! 👋') + '</div>' +
        '<h1 class="title center">Быстрое исследование<br>вашей ниши</h1>' +
        '<div class="hint center">Расскажите о своём бизнесе — мы соберём главное и подскажем, что делать</div>' +
        '<div class="list card welcome-points">' +
          POINTS.map((p) =>
            '<div class="row"><span class="row-emoji">' + p.icon + '</span>' +
            '<span class="row-main"><span class="row-title wrap">' + p.title + '</span><span class="row-sub wrap">' + p.text + '</span></span></div>'
          ).join('') +
        '</div>' +
        '<div class="welcome-gift">🎁 1 день полного доступа — бесплатно</div>' +
        '<div class="hint center">Вопросы и идеи — <button class="link-btn tap" data-act="author" type="button">@' + UI.esc(CONFIG.SUPPORT_USERNAME) + '</button></div>' +
      '</div>';
    },

    mount(el) {
      TG.mainButton.show({
        text: 'Начать',
        onClick: async () => {
          await Store.setOnboarded();
          Router.go('home', {}, { base: [] });   // приветствие не остаётся в истории
        }
      });
      el.querySelector('[data-act=author]').addEventListener('click', () => { TG.haptic.tap(); TG.openTelegramLink(CONFIG.SUPPORT_LINK); });
    }
  });
})();
