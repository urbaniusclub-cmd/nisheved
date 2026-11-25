/*
 * router.js — навигация между экранами.
 *
 * Экран регистрируется так:
 *   Router.register('home', {
 *     render(params) { return '<div>…</div>'; },   // HTML экрана
 *     mount(el, params) { …; return cleanupFn; }    // события, MainButton; cleanup — при уходе
 *   });
 *
 * Переходы:
 *   Router.go('niche', params)                 — вперёд (slide справа)
 *   Router.go('report', p, { base: [{name:'home'}] }) — вперёд, а под ним в истории только home
 *   Router.replace('report', params)           — заменить текущий экран
 *   Router.back()                              — назад (slide влево); закрывает шторку, если открыта
 *
 * В DOM живёт только текущий экран. При возврате назад предыдущий экран
 * рисуется заново (с актуальными данными) и восстанавливает прокрутку.
 */
window.Router = (function () {
  const screens = {};
  const stack = [];        // [{ name, params, el, cleanup, scroll }]
  let root = null;
  let busy = false;
  const DURATION = 260;    // мс, совпадает с --dur в styles.css

  function register(name, screen) { screens[name] = screen; }

  function setRoot(el) { root = el; }

  function current() { return stack[stack.length - 1] || null; }

  // Нарисовать экран entry и анимировать смену со старым элементом
  function show(entry, dir, oldEl) {
    const scr = screens[entry.name];
    if (!scr) throw new Error('Нет экрана: ' + entry.name);

    TG.mainButton.hide();   // каждый экран сам решает, нужна ли главная кнопка

    const el = document.createElement('section');
    el.className = 'screen';
    el.dataset.screen = entry.name;
    el.innerHTML = scr.render(entry.params || {});
    if (dir === 'forward') el.classList.add('enter-right');
    if (dir === 'back') el.classList.add('enter-left');
    root.appendChild(el);
    entry.el = el;
    if (entry.scroll) el.scrollTop = entry.scroll;
    entry.cleanup = scr.mount ? scr.mount(el, entry.params || {}) : null;

    // Кнопка «Назад» — везде, кроме первого экрана в истории
    if (stack.length > 1) TG.backButton.show(back); else TG.backButton.hide();

    if (oldEl) {
      busy = true;
      void el.offsetWidth;  // принудительный reflow, чтобы анимация стартовала
      el.classList.remove('enter-right', 'enter-left');
      oldEl.classList.add(dir === 'back' ? 'leave-right' : 'leave-left');
      setTimeout(() => { oldEl.remove(); busy = false; }, DURATION + 20);
    }
  }

  function leave(entry) {
    if (!entry) return null;
    if (entry.cleanup) { try { entry.cleanup(); } catch (e) { console.error(e); } }
    entry.cleanup = null;
    if (entry.el) entry.scroll = entry.el.scrollTop;
    return entry.el;
  }

  function go(name, params, opts) {
    if (busy) return;
    const o = opts || {};
    UI.closeSheet(true);
    const oldEl = leave(current());
    if (o.base) { stack.length = 0; o.base.forEach((b) => stack.push({ name: b.name, params: b.params || {} })); }
    const entry = { name, params: params || {} };
    stack.push(entry);
    show(entry, oldEl ? 'forward' : 'none', oldEl);
  }

  function replace(name, params) {
    if (busy) return;
    const oldEl = leave(current());
    stack.pop();
    const entry = { name, params: params || {} };
    stack.push(entry);
    show(entry, 'forward', oldEl);
  }

  function back() {
    if (UI.hasSheet()) { UI.closeSheet(); return; }
    if (busy || stack.length <= 1) return;
    const oldEl = leave(current());
    stack.pop();
    const prev = current();
    show(prev, 'back', oldEl);
    TG.haptic.tap();
  }

  // Перерисовать текущий экран на месте (например, после изменения данных)
  function refresh() {
    const cur = current();
    if (!cur || busy) return;
    const oldEl = leave(cur);
    show(cur, 'none', null);
    if (oldEl) oldEl.remove();
  }

  return { register, setRoot, go, replace, back, refresh, current };
})();
