/*
 * telegram.js — обёртка над Telegram Web App SDK (window.Telegram.WebApp).
 *
 * Зачем: остальной код вызывает TG.mainButton.show(...), TG.haptic.tap() и т.д.
 * и не думает, открыто ли приложение в Telegram или в обычном браузере.
 * В браузере (для разработки) системные кнопки заменяются своими,
 * а CloudStorage — на localStorage.
 */
window.TG = (function () {
  const WA = window.Telegram && window.Telegram.WebApp;
  // initData пустая, если страницу открыли не из Telegram
  const inTelegram = !!(WA && WA.initData);
  const can = (v) => inTelegram && WA.isVersionAtLeast(v);

  /* ---------- Запуск ---------- */
  function init() {
    if (!inTelegram) {
      document.documentElement.classList.add('no-tg');
      return;
    }
    WA.ready();
    WA.expand();
    if (can('7.7')) WA.disableVerticalSwipes();           // не закрывать приложение свайпом при прокрутке
    if (can('8.0') && (WA.platform === 'ios' || WA.platform === 'android')) {
      try { WA.requestFullscreen(); } catch (e) { /* не поддерживается — ок */ }
    }
  }

  /* ---------- Пользователь и параметры запуска ---------- */
  function user() {
    const u = inTelegram && WA.initDataUnsafe && WA.initDataUnsafe.user;
    return u || { id: 0, first_name: 'Гость' };
  }
  function startParam() {
    if (inTelegram) return WA.initDataUnsafe.start_param || '';
    return new URLSearchParams(location.search).get('startapp') || '';
  }

  /* ---------- Тема ---------- */
  function colorScheme() {
    if (inTelegram) return WA.colorScheme;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function onThemeChange(cb) {
    if (inTelegram) WA.onEvent('themeChanged', cb);
    else if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', cb);
  }
  // Красим шапку и фон Telegram в цвета приложения — чтобы не было «рамки сайта»
  function setColors(bg) {
    if (!can('6.1')) return;
    try {
      WA.setHeaderColor(bg);
      WA.setBackgroundColor(bg);
      if (can('7.10')) WA.setBottomBarColor(bg);
    } catch (e) { /* старый клиент */ }
  }

  /* ---------- Виброотклик ---------- */
  const haptic = {
    tap()      { if (can('6.1')) WA.HapticFeedback.impactOccurred('light'); },
    select()   { if (can('6.1')) WA.HapticFeedback.selectionChanged(); },
    success()  { if (can('6.1')) WA.HapticFeedback.notificationOccurred('success'); },
    error()    { if (can('6.1')) WA.HapticFeedback.notificationOccurred('error'); }
  };

  /* ---------- Главная кнопка (MainButton) ----------
   * show({ text, onClick, disabled }) — показать/обновить
   * hide() — скрыть; suspend()/resume() — временно спрятать (например, пока открыта шторка)
   */
  const mainButton = (function () {
    let cfg = null;       // текущая конфигурация
    let suspended = false;
    let fallback = null;  // своя кнопка для браузера

    if (inTelegram) {
      WA.MainButton.onClick(() => { if (cfg && !cfg.disabled && cfg.onClick) { haptic.tap(); cfg.onClick(); } });
    }

    function ensureFallback() {
      if (fallback) return fallback;
      fallback = document.createElement('div');
      fallback.className = 'fb-main';
      fallback.innerHTML = '<button class="btn btn-primary btn-block tap" type="button"></button>';
      fallback.querySelector('button').addEventListener('click', () => {
        if (cfg && !cfg.disabled && cfg.onClick) cfg.onClick();
      });
      document.body.appendChild(fallback);
      return fallback;
    }

    function apply() {
      const visible = !!cfg && !suspended;
      if (inTelegram) {
        if (!visible) { WA.MainButton.hide(); return; }
        WA.MainButton.setParams({
          text: cfg.text,
          color: cfg.disabled ? '#A9DDF7' : window.CONFIG.ACCENT,
          text_color: '#FFFFFF',
          is_active: !cfg.disabled,
          is_visible: true
        });
      } else {
        const el = ensureFallback();
        el.classList.toggle('show', visible);
        document.body.classList.toggle('has-fb-main', visible);
        if (visible) {
          const b = el.querySelector('button');
          b.textContent = cfg.text;
          b.disabled = !!cfg.disabled;
        }
      }
    }

    return {
      show(c) { cfg = Object.assign({}, c); apply(); },
      update(patch) { if (cfg) { Object.assign(cfg, patch); apply(); } },
      hide() { cfg = null; apply(); },
      suspend() { suspended = true; apply(); },
      resume() { suspended = false; apply(); }
    };
  })();

  /* ---------- Кнопка «Назад» (BackButton) ---------- */
  const backButton = (function () {
    let handler = null;
    let fallback = null;
    if (inTelegram && can('6.1')) WA.BackButton.onClick(() => handler && handler());

    function ensureFallback() {
      if (fallback) return fallback;
      fallback = document.createElement('button');
      fallback.className = 'fb-back tap';
      fallback.type = 'button';
      fallback.setAttribute('aria-label', 'Назад');
      fallback.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      fallback.addEventListener('click', () => handler && handler());
      document.body.appendChild(fallback);
      return fallback;
    }

    return {
      show(cb) {
        handler = cb;
        if (inTelegram && can('6.1')) WA.BackButton.show();
        else if (!inTelegram) ensureFallback().classList.add('show');
      },
      hide() {
        handler = null;
        if (inTelegram && can('6.1')) WA.BackButton.hide();
        else if (fallback) fallback.classList.remove('show');
      }
    };
  })();

  /* ---------- Кнопка настроек в меню Telegram → Профиль ---------- */
  function settingsButton(cb) {
    if (can('7.0')) { WA.SettingsButton.show(); WA.SettingsButton.onClick(cb); }
  }

  /* ---------- Диалоги ---------- */
  function alert(message) {
    return new Promise((resolve) => {
      if (can('6.2')) WA.showAlert(message, resolve);
      else { window.alert(message); resolve(); }
    });
  }
  function confirm(message) {
    return new Promise((resolve) => {
      if (can('6.2')) WA.showConfirm(message, (ok) => resolve(!!ok));
      else resolve(window.confirm(message));
    });
  }

  /* ---------- Ссылки ---------- */
  function openLink(url) {
    if (inTelegram) WA.openLink(url);
    else window.open(url, '_blank', 'noopener');
  }
  function openTelegramLink(url) {
    if (inTelegram) WA.openTelegramLink(url);
    else window.open(url, '_blank', 'noopener');
  }

  /* ---------- Номер телефона из Telegram ----------
   * Telegram спрашивает разрешение. Возвращает номер или '' (отказ / не в Telegram).
   */
  function canRequestContact() { return can('6.9'); }
  function requestContact() {
    return new Promise((resolve) => {
      if (!can('6.9')) return resolve('');
      WA.requestContact((ok, res) => {
        const c = ok && res && res.responseUnsafe && res.responseUnsafe.contact;
        resolve(c && c.phone_number ? '+' + String(c.phone_number).replace(/^\+/, '') : '');
      });
    });
  }

  /* ---------- Подписка на бота ----------
   * Системный запрос «Разрешить боту писать вам». true — разрешил (или уже было разрешено).
   * Вне Telegram — демо через обычное подтверждение.
   */
  function requestWriteAccess() {
    return new Promise((resolve) => {
      if (can('6.9')) { WA.requestWriteAccess((ok) => resolve(!!ok)); return; }
      resolve(window.confirm('Демо: подписаться на бота?'));
    });
  }

  /* ---------- Хранилище ----------
   * Telegram CloudStorage: привязано к аккаунту, до 1024 ключей, до 4096 символов на значение.
   * Вне Telegram — localStorage (с защитой от ошибок в приватном режиме).
   */
  const useCloud = can('6.9');
  const LS_PREFIX = 'nisheved:';
  const storage = {
    getMany(keys) {
      return new Promise((resolve) => {
        if (!keys.length) return resolve({});
        if (useCloud) {
          WA.CloudStorage.getItems(keys, (err, values) => resolve(err ? {} : (values || {})));
          return;
        }
        const out = {};
        keys.forEach((k) => { try { out[k] = localStorage.getItem(LS_PREFIX + k) || ''; } catch (e) { out[k] = ''; } });
        resolve(out);
      });
    },
    set(key, value) {
      return new Promise((resolve) => {
        if (useCloud) { WA.CloudStorage.setItem(key, value, () => resolve()); return; }
        try { localStorage.setItem(LS_PREFIX + key, value); } catch (e) { /* хранилище недоступно */ }
        resolve();
      });
    },
    remove(keys) {
      return new Promise((resolve) => {
        if (useCloud) { WA.CloudStorage.removeItems(keys, () => resolve()); return; }
        keys.forEach((k) => { try { localStorage.removeItem(LS_PREFIX + k); } catch (e) { /* ок */ } });
        resolve();
      });
    }
  };

  return {
    inTelegram, raw: WA, init, user, startParam, colorScheme, onThemeChange, setColors,
    haptic, mainButton, backButton, settingsButton, alert, confirm, openLink, openTelegramLink, storage,
    canRequestContact, requestContact, requestWriteAccess
  };
})();
