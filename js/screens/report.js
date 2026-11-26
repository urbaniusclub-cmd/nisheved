/*
 * screens/report.js — «Отчёт» с тремя вкладками:
 *   Главное — 5 выводов, риски, что проверить у конкурентов
 *   Новости — лента с фильтром по тегам; тап → шторка с подробностями
 *   План    — чек-лист «неделя / месяц / квартал», галочки сохраняются
 * Содержимое собирает report.js (Report.build). MainButton — «Новое исследование».
 */
(function () {
  const tagChip = Screens.tagChip;

  /* ---------- Вкладка «Главное» ---------- */
  function tabMain(r) {
    let html = '<div class="section-title">5 главных выводов</div>' +
      r.insights.map((i, n) =>
        '<div class="insight card"><span class="insight-ic">' + i.icon + '</span>' +
        '<span class="insight-text"><span class="insight-n">' + (n + 1) + '</span><b>' + UI.esc(i.b) + '</b> ' + UI.esc(i.t) + '</span></div>'
      ).join('');

    html += '<div class="section-title">Риски</div><div class="card risks">' +
      r.risks.map((x) => '<div class="risk">⚠️ <span>' + UI.esc(x) + '</span></div>').join('') + '</div>';

    if (r.competitors.length) {
      html += '<div class="section-title">Конкуренты</div>' + r.competitors.map((c) =>
        '<div class="card comp"><div class="comp-name">🏢 ' + UI.esc(c) + '</div>' +
        '<div class="hint">Что проверить в первую очередь:</div>' +
        '<div class="chips chips-static"><span class="chip">💸 Цены</span><span class="chip">🎁 Акции</span><span class="chip">👥 Вакансии</span><span class="chip">⭐ Отзывы</span></div></div>'
      ).join('');
    }

    html += '<button class="btn btn-secondary btn-block tap" data-tab-go="plan" type="button">✅ Перейти к плану действий</button>';
    return html;
  }

  /* ---------- Вкладка «Новости» ---------- */
  function tabNews(r, filter) {
    const tags = DATA.TAGS.filter((t) => r.news.some((n) => n.tag === t));
    const chips = '<div class="chips chips-scroll">' +
      ['Все'].concat(tags).map((t) => '<button class="chip tap' + ((filter || 'Все') === t ? ' selected' : '') + '" data-filter="' + t + '" type="button">' + t + '</button>').join('') +
      '</div>';
    const list = r.news.filter((n) => !filter || filter === 'Все' || n.tag === filter);
    return chips + list.map((n) =>
      '<button class="news card tap" data-news="' + n.id + '" type="button">' +
        '<span class="news-top">' + tagChip(n.tag) + '<span class="hint">' + UI.dateRel(n.date) + '</span></span>' +
        '<span class="news-title">' + UI.esc(n.title) + '</span>' +
        '<span class="news-for">💡 ' + UI.esc(n.forYou) + '</span>' +
        '<span class="news-src">' + UI.esc(n.source) + '</span>' +
      '</button>'
    ).join('');
  }

  /* ---------- Вкладка «План» ---------- */
  function tabPlan(r, rec) {
    const doneN = rec.done.length;
    const pct = Math.round((doneN / r.stepsTotal) * 100);
    const group = (title, steps) =>
      '<div class="section-title">' + title + '</div><div class="card plan-group">' +
      steps.map((s) => {
        const done = rec.done.includes(s.id);
        return '<div class="step' + (done ? ' done' : '') + '" data-step="' + s.id + '">' +
          '<button class="check tap" data-check="' + s.id + '" type="button" aria-label="Отметить">' + UI.icon('check', 18) + '</button>' +
          '<button class="step-body" data-expand type="button">' +
            '<span class="step-title">' + UI.esc(s.t) + '</span>' +
            '<span class="step-badges"><span class="mini">Эффект: ' + s.effect + '</span><span class="mini">Усилия: ' + s.effort + '</span></span>' +
            '<span class="step-how">' + s.how.map((h) => '<span>• ' + UI.esc(h) + '</span>').join('') + '</span>' +
          '</button></div>';
      }).join('') + '</div>';

    return '<div class="card plan-progress"><div class="pp-top"><b class="pp-count">Выполнено ' + doneN + ' из ' + r.stepsTotal + '</b><span class="hint pp-pct">' + pct + '%</span></div>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div></div>' +
      group('📅 На этой неделе', r.plan.week) +
      group('🗓 В этом месяце', r.plan.month) +
      group('🏁 В квартале', r.plan.quarter);
  }

  /* Шторка новости — общая, в screens/_common.js */
  const openNews = Screens.openNews;

  /* ---------- Поделиться ---------- */
  function share(rec) {
    const text = Report.shareText(rec);
    const url = 'https://t.me/' + CONFIG.BOT_USERNAME + (CONFIG.APP_SHORT_NAME ? '/' + CONFIG.APP_SHORT_NAME : '');
    if (TG.inTelegram) {
      TG.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text));
    } else if (navigator.share) {
      navigator.share({ text: text, url: url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text + '\n' + url).then(() => UI.toast('Скопировано'));
    }
  }

  Router.register('report', {
    render(params) {
      const rec = Store.getReport(params.id);
      if (!rec) return '<div class="page"><div class="empty card"><div class="empty-art">🤷</div><div class="empty-title">Отчёт не найден</div></div></div>';
      const r = Report.build(rec);
      const tab = params.tab || 'main';
      const tabs = [['main', 'Главное'], ['news', 'Новости'], ['plan', 'План']];
      return '<div class="page">' +
        '<div class="rep-head card">' +
          '<span class="rep-emoji">' + r.emoji + '</span>' +
          '<span class="rep-info"><span class="rep-title">' + UI.esc(r.nicheTitle) + '</span>' +
          '<span class="hint">' + r.goal.emoji + ' ' + r.goal.title + ' · ' + UI.dateShort(rec.createdAt) + '</span>' +
          (r.basedOn ? '<span class="hint">' + UI.esc(r.basedOn) + '</span>' : '') +   // для «своей ниши»
          '</span>' +
          '<button class="icon-btn tap" data-act="share" type="button" aria-label="Поделиться">' + UI.icon('share') + '</button>' +
        '</div>' +
        '<div class="demo-note">Демо-отчёт: новости — примеры для показа интерфейса</div>' +
        '<div class="segmented" role="tablist">' +
          tabs.map((t) => '<button class="seg tap' + (tab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '" type="button" role="tab">' + t[1] + '</button>').join('') +
        '</div>' +
        '<div class="tab-content"></div>' +
      '</div>';
    },

    mount(el, params) {
      const rec = Store.getReport(params.id);
      if (!rec) return null;
      const r = Report.build(rec);
      const content = el.querySelector('.tab-content');
      let filter = 'Все';

      TG.mainButton.show({
        text: 'Новое исследование',
        onClick: () => { Store.startDraft(); Router.go('niche', { mode: 'flow' }, { base: [{ name: 'home' }] }); }
      });

      function renderTab(animate) {
        const tab = params.tab || 'main';
        content.innerHTML = tab === 'news' ? tabNews(r, filter) : tab === 'plan' ? tabPlan(r, rec) : tabMain(r);
        UI.hscroll(content);   // стрелки у фильтра тегов
        if (animate) { content.classList.remove('fade-in'); void content.offsetWidth; content.classList.add('fade-in'); }
      }
      function setTab(t) {
        params.tab = t;   // запоминаем вкладку в истории — при возврате откроется она же
        el.querySelectorAll('.seg').forEach((s) => s.classList.toggle('on', s.dataset.tab === t));
        renderTab(true);
        el.scrollTo({ top: 0, behavior: 'smooth' });
      }
      renderTab(false);
      const offFab = UI.scrollFab(el);   // стрелка «↓ / ↑» для длинных вкладок

      el.addEventListener('click', (e) => {
        const t = e.target.closest('[data-tab]');
        if (t) { TG.haptic.select(); setTab(t.dataset.tab); return; }
        const go = e.target.closest('[data-tab-go]');
        if (go) { TG.haptic.tap(); setTab(go.dataset.tabGo); return; }
        if (e.target.closest('[data-act=share]')) { TG.haptic.tap(); share(rec); return; }

        const f = e.target.closest('[data-filter]');
        if (f) { TG.haptic.select(); filter = f.dataset.filter; renderTab(false); return; }

        const n = e.target.closest('[data-news]');
        if (n) { openNews(r.news.find((x) => x.id === n.dataset.news)); return; }

        const ch = e.target.closest('[data-check]');
        if (ch) {
          const id = ch.dataset.check;
          Store.toggleStep(rec.id, id);   // меняет rec.done сразу, сохранение идёт в фоне
          const done = rec.done.includes(id);
          if (done) TG.haptic.success(); else TG.haptic.tap();
          ch.closest('.step').classList.toggle('done', done);
          const pct = Math.round((rec.done.length / r.stepsTotal) * 100);
          el.querySelector('.pp-count').textContent = 'Выполнено ' + rec.done.length + ' из ' + r.stepsTotal;
          el.querySelector('.pp-pct').textContent = pct + '%';
          el.querySelector('.plan-progress .bar i').style.width = pct + '%';
          if (rec.done.length === r.stepsTotal) UI.toast('🎉 Все шаги выполнены!');
          return;
        }
        const ex = e.target.closest('[data-expand]');
        if (ex) { TG.haptic.tap(); ex.closest('.step').classList.toggle('open'); }
      });

      return offFab;
    }
  });
})();
