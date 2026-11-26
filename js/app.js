/*
 * app.js — запуск приложения. Подключается последним.
 * 1) Инициализирует Telegram (expand, fullscreen, тема)
 * 2) Загружает данные пользователя из хранилища
 * 3) Открывает Главную (или отчёт по ссылке startapp=report_<id>)
 * 4) Следит за готовящимися отчётами и показывает уведомление «Отчёт готов»
 */
(function () {
  const BG = { light: '#F1F2F6', dark: '#0E1621' };   // совпадает с --bg в styles.css

  function applyTheme() {
    const scheme = TG.colorScheme() === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = scheme;
    TG.setColors(BG[scheme]);
  }

  function hideSplash() {
    const s = document.getElementById('splash');
    if (!s) return;
    s.classList.add('hide');
    setTimeout(() => s.remove(), 350);
  }

  function showLoadError() {
    document.getElementById('app').innerHTML =
      '<section class="screen"><div class="page"><div class="empty card" style="margin-top:30vh">' +
      '<div class="empty-art">📡</div><div class="empty-title">Нет соединения</div>' +
      '<button class="btn btn-primary tap" type="button" onclick="location.reload()">Повторить</button></div></div></section>';
    hideSplash();
  }

  // Уведомление, когда отчёт готов, а пользователь на другом экране
  function watchPending() {
    const notified = new Set();
    setInterval(() => {
      Store.listReports().forEach((r) => {
        if (notified.has(r.id) || !Store.isReady(r)) return;
        if (Date.now() - r.readyAt > 5000) { notified.add(r.id); return; }   // старые не объявляем
        notified.add(r.id);
        const cur = Router.current();
        if (cur && (cur.name === 'generating' || cur.name === 'report') && cur.params.id === r.id) return;
        TG.haptic.success();
        UI.toast('✅ Отчёт готов: ' + Report.nicheTitle(r), { text: 'Открыть', onClick: () => Router.go('report', { id: r.id }) });
      });
    }, 1000);
  }

  async function start() {
    TG.init();
    applyTheme();
    TG.onThemeChange(applyTheme);
    Router.setRoot(document.getElementById('app'));

    // Нужно для визуального отклика :active на iOS
    document.addEventListener('touchstart', function () {}, { passive: true });

    try {
      await Store.load();
    } catch (e) {
      console.error(e);
      showLoadError();
      return;
    }

    const sp = TG.startParam();
    // Первый запуск — экран приветствия; дальше сразу Главная
    if (!Store.state.onboarded && sp.indexOf('report_') !== 0) { Router.go('welcome'); }
    else Router.go('home');

    // Ссылка вида t.me/<бот>/<app>?startapp=report_<id> — сразу открыть отчёт
    // Пришёл по реферальной ссылке ref_<id> — запоминаем пригласившего
    if (sp.indexOf('ref_') === 0) Store.setReferrer(sp.slice(4));
    if (sp.indexOf('report_') === 0) {
      const rec = Store.getReport(sp.slice(7));
      if (rec) setTimeout(() => Router.go(Store.isReady(rec) ? 'report' : 'generating', { id: rec.id }), 50);
    }

    // Кнопка «Настройки» в меню Telegram ведёт в Профиль
    TG.settingsButton(() => {
      const cur = Router.current();
      if (!cur || cur.name !== 'profile') Router.go('profile');
    });

    watchPending();
    setTimeout(hideSplash, 400);   // короткая заставка, чтобы не мигало
  }

  start();
})();
