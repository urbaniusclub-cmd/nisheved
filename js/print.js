/*
 * print.js — собирает полный отчёт на странице print.html.
 * 1) Читает параметры отчёта из адреса (#base64url JSON)
 * 2) Report.build(rec) — тот же отчёт, что в приложении
 * 3) Рисует все разделы подряд: выводы, рынок, SWOT, новости, план, метрики, риски
 * Кнопка «Сохранить в PDF» вызывает печать браузера (там выбрать «Сохранить как PDF»).
 */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const dateRu = (d) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const doc = document.getElementById('doc');

  function decode() {
    try {
      let b64 = location.hash.slice(1).replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      return JSON.parse(decodeURIComponent(escape(atob(b64))));
    } catch (e) { return null; }
  }

  const rec = decode();
  if (!rec || !rec.goalId) {
    doc.innerHTML = '<h1>Отчёт не найден</h1><p class="muted">Откройте отчёт в приложении и нажмите «Скачать полный отчёт».</p>';
    return;
  }
  rec.done = rec.done || [];
  rec.createdAt = rec.createdAt || Date.now();
  const r = Report.build(rec);
  document.title = 'Отчёт — ' + r.nicheTitle + ' — ' + CONFIG.APP_NAME;

  const ul = (items) => '<ul>' + items.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>';
  const geo = rec.geo === 'Мой город' && rec.city ? rec.city : rec.geo;
  const profileLine = [rec.company, rec.role, rec.clients, rec.size, geo].filter(Boolean).map(esc).join(' · ');
  const steps = (title, arr) => '<h3>' + title + '</h3><ol class="plan">' + arr.map((s) =>
    '<li><b>' + (rec.done.includes(s.id) ? '✅ ' : '') + esc(s.t) + '</b> <span class="muted">· эффект: ' + s.effect + ' · усилия: ' + s.effort + '</span>' + ul(s.how) + '</li>'
  ).join('') + '</ol>';

  doc.innerHTML =
    '<header class="cover">' +
      '<div class="brand">' + esc(CONFIG.APP_NAME) + ' · пакет «Стандарт»</div>' +
      '<h1>' + r.emoji + ' ' + esc(r.nicheTitle) + '</h1>' +
      '<div class="muted">' + r.goal.emoji + ' Цель: ' + esc(r.goal.title) + ' · ' + dateRu(rec.createdAt) + '</div>' +
      (profileLine ? '<div class="muted">' + profileLine + '</div>' : '') +
      (r.basedOn ? '<div class="muted">' + esc(r.basedOn) + '</div>' : '') +
      '<div class="demo">Демо-версия: новости и показатели — примеры для показа формата отчёта.</div>' +
    '</header>' +

    '<section><h2>1. Главные выводы</h2><ol>' + r.insights.map((i) => '<li>' + i.icon + ' <b>' + esc(i.b) + '</b> ' + esc(i.t) + '</li>').join('') + '</ol></section>' +

    '<section><h2>2. Обзор рынка</h2><table class="metrics"><tr>' +
      r.market.m.map((m) => '<td><div class="muted">' + m.label + '</div><b class="tone-' + m.tone + '">' + esc(m.value) + '</b></td>').join('') +
    '</tr></table>' +
      '<h3>Тренды</h3>' + ul(r.market.trends) + '<h3>Возможности</h3>' + ul(r.market.opps) + '</section>' +

    '<section><h2>3. SWOT-анализ</h2><table class="swot"><tr>' +
      '<td><h3>💪 Сильные стороны</h3>' + ul(r.swot.s) + '</td><td><h3>🩹 Слабые стороны</h3>' + ul(r.swot.w) + '</td></tr><tr>' +
      '<td><h3>🚀 Возможности</h3>' + ul(r.swot.o) + '</td><td><h3>⚠️ Угрозы</h3>' + ul(r.swot.t) + '</td></tr></table></section>' +

    '<section><h2>4. Новости ниши (' + r.news.length + ')</h2>' + r.news.map((n) =>
      '<article class="news"><div class="muted">' + esc(n.tag) + ' · ' + dateRu(n.date) + ' · ' + esc(n.source) + '</div>' +
      '<h3>' + esc(n.title) + '</h3><p>' + esc(n.summary) + '</p>' +
      '<p><b>💡 Что это значит для вас:</b> ' + esc(n.forYou) + '</p>' +
      '<p><b>👉 Что сделать:</b></p>' + ul(n.todo) + '</article>'
    ).join('') + '</section>' +

    '<section><h2>5. План действий</h2>' +
      steps('📅 На этой неделе', r.plan.week) + steps('🗓 В этом месяце', r.plan.month) + steps('🏁 В квартале', r.plan.quarter) +
    '</section>' +

    '<section><h2>6. Что отслеживать</h2>' + ul(r.kpis) + '</section>' +
    '<section><h2>7. Риски</h2>' + ul(r.risks) + '</section>' +
    (r.competitors.length ? '<section><h2>8. Конкуренты — что проверить</h2>' +
      ul(r.competitors.map((c) => c + ': цены, акции, вакансии, отзывы')) + '</section>' : '') +

    '<footer class="muted">Подготовлено в ' + esc(CONFIG.APP_NAME) + ' · t.me/' + esc(CONFIG.BOT_USERNAME) +
      ' · Глубокий аудит: t.me/' + esc(CONFIG.SUPPORT_USERNAME) + '</footer>';

  document.getElementById('pdf').addEventListener('click', () => window.print());
})();
