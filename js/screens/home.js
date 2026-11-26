/*
 * screens/home.js — экран «Главная».
 * Приветствие, герой-карточка с двумя кнопками: баланс (→ payment) и «Мои исследования» (→ history),
 * лента «Последние новости» по всем нишам с фильтром (тап → шторка).
 * MainButton «Получить исследование» → Ниша.
 */
(function () {
  // Демо-лимиты ленты: «Все» — топ-10 самых свежих, отдельная сфера — максимум 5
  const LIMIT_ALL = 10;
  const LIMIT_SPHERE = 5;

  function feedItems(filter) {
    return Report.latestNews(filter || '').slice(0, filter ? LIMIT_SPHERE : LIMIT_ALL);
  }

  function newsHtml(params) {
    const list = feedItems(params.filter);
    return list.map((n, i) =>
      '<button class="news card tap" data-news="' + i + '" type="button">' +
        '<span class="news-top"><span class="news-niche">' + n.nicheEmoji + ' ' + UI.esc(n.nicheTitle) + '</span><span class="hint">' + UI.dateRel(n.date) + '</span></span>' +
        '<span class="news-title">' + UI.esc(n.title) + '</span>' +
        '<span class="news-meta">' + Screens.tagChip(n.tag) + '<span class="news-src">' + UI.esc(n.source) + '</span></span>' +
      '</button>'
    ).join('') +
    '<div class="hint center">' + (params.filter ? 'Топ-' + LIMIT_SPHERE + ' новостей сферы' : 'Топ-' + LIMIT_ALL + ' новостей по всем сферам') +
      ' · полная сводка — в исследовании</div>';
  }

  Router.register('home', {
    render(params) {
      const u = TG.user();
      const s = Store.state;
      const reports = Store.listReports();
      const pending = reports.filter((r) => !Store.isReady(r)).length;

      // Две кнопки в герой-карточке: баланс (→ Оплата) и «Мои исследования» (→ История)
      // Кнопка доступа: активный полный доступ → подарок → купить
      let balanceText;
      const access = Store.hasAccess();
      if (access) balanceText = '✅ Доступ ' + Screens.accessUntilText();
      else if (!s.bonusClaimed) balanceText = '🎁 1 день бесплатно';   // подарок за подписку на бота
      else balanceText = '⭐ Получить доступ';
      const highlight = !access;
      const heroActions = '<div class="hero-actions">' +
        '<button class="hero-btn tap' + (highlight ? ' hero-btn-warn' : '') + '" data-act="buy" type="button">' + balanceText + '</button>' +
        '<button class="hero-btn tap" data-act="history" type="button">🗂 Мои исследования' +
          (reports.length ? ' <span class="hero-count">' + reports.length + '</span>' : '') +
          (pending ? ' <i class="spinner spinner-white"></i>' : '') +
        '</button>' +
      '</div>';

      // Фильтр ленты: Все, Весь бизнес, затем ниши (ниша пользователя — первой)
      const my = s.profile.nicheId ? Report.effectiveNiche(s.profile) : '';   // своя ниша → распознанная сфера
      const niches = DATA.NICHES.slice().sort((a, b) => (b.id === my) - (a.id === my));
      const f = params.filter || '';
      const chips = '<div class="chips chips-scroll">' +
        '<button class="chip tap' + (!f ? ' selected' : '') + '" data-filter="" type="button">Все</button>' +
        '<button class="chip tap' + (f === 'all-business' ? ' selected' : '') + '" data-filter="all-business" type="button">🌐 Весь бизнес</button>' +
        niches.map((n) => '<button class="chip tap' + (f === n.id ? ' selected' : '') + '" data-filter="' + n.id + '" type="button">' + n.emoji + ' ' + n.title + '</button>').join('') +
        '</div>';

      return '<div class="page">' +
        '<header class="home-top">' + UI.avatar(Object.assign({}, u, { first_name: Screens.displayName() }), 44) +
          '<div class="home-hello"><div class="hint">Привет,</div><div class="home-name">' + UI.esc(Screens.displayName()) + '</div></div>' +
          '<button class="icon-btn tap" data-act="profile" type="button" aria-label="Профиль">' + UI.icon('user') + '</button>' +
        '</header>' +
        (TG.inTelegram ? '' : '<div class="demo-note">Открыто в браузере — демо-режим</div>') +
        '<div class="hero">' +
          '<svg class="hero-art" viewBox="0 0 120 96" aria-hidden="true">' +
            '<rect x="8" y="58" width="16" height="30" rx="4" fill="#fff" opacity=".55"/>' +
            '<rect x="30" y="44" width="16" height="44" rx="4" fill="#fff" opacity=".7"/>' +
            '<rect x="52" y="30" width="16" height="58" rx="4" fill="#fff" opacity=".85"/>' +
            '<circle cx="86" cy="36" r="22" fill="none" stroke="#fff" stroke-width="7"/>' +
            '<path d="M102 52l12 12" stroke="#fff" stroke-width="9" stroke-linecap="round"/>' +
            '<path d="M76 38l7 6 12-14" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
          '<div class="hero-title">Исследование ниши за 5 минут</div>' +
          '<div class="hero-sub">📰 Новости · 📊 Выводы · ✅ План</div>' +
          heroActions +
        '</div>' +

        // Лента новостей
        '<div class="section-title">Последние новости</div>' + chips +
        '<div class="home-news">' + newsHtml(params) + '</div>' +
      '</div>';
    },

    mount(el, params) {
      TG.mainButton.show({
        text: 'Получить исследование',
        onClick: () => { Store.startDraft(); Router.go('niche', { mode: 'flow' }); }
      });

      UI.hscroll(el);                    // стрелка «→ / ←» у фильтра ниш
      const offFab = UI.scrollFab(el);   // стрелка «↓ / ↑» у ленты новостей
      const feed = el.querySelector('.home-news');
      const rerenderFeed = () => { feed.innerHTML = newsHtml(params); feed.classList.remove('fade-in'); void feed.offsetWidth; feed.classList.add('fade-in'); };

      el.addEventListener('click', (e) => {
        const n = e.target.closest('[data-news]');
        if (n) { Screens.openNews(feedItems(params.filter)[+n.dataset.news]); return; }
        const f = e.target.closest('[data-filter]');
        if (f) {
          TG.haptic.select();
          params.filter = f.dataset.filter;   // запоминаем в истории — при возврате фильтр сохранится
          el.querySelectorAll('[data-filter]').forEach((x) => x.classList.toggle('selected', x === f));
          rerenderFeed();
          return;
        }
        const act = e.target.closest('[data-act]');
        if (!act) return;
        TG.haptic.tap();
        if (act.dataset.act === 'profile') Router.go('profile');
        if (act.dataset.act === 'buy') Router.go('payment');
        if (act.dataset.act === 'history') Router.go('history');
      });

      // Пока есть готовящиеся отчёты — обновляем счётчик, когда они будут готовы
      const pending = Store.listReports().filter((r) => !Store.isReady(r));
      const timer = pending.length
        ? setInterval(() => { if (pending.some((r) => Store.isReady(r))) Router.refresh(); }, 1000)
        : null;
      return () => { clearInterval(timer); offFab(); };
    }
  });
})();
