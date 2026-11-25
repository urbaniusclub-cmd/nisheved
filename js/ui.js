/*
 * ui.js — общие помощники интерфейса:
 *   UI.esc()      — экранирование пользовательского текста перед вставкой в HTML
 *   UI.icon()     — SVG-иконки
 *   UI.date*()    — форматирование дат по-русски
 *   UI.toast()    — всплывающее сообщение снизу
 *   UI.sheet()    — шторка снизу (bottom sheet): крестик, свайп вниз или тап по фону закрывают
 *   UI.hscroll()  — стрелки «→ / ←» у горизонтальных лент чипов
 *   UI.scrollFab()— плавающая стрелка «↓ / ↑» для длинных списков
 *   UI.avatar()   — аватар пользователя Telegram
 */
window.UI = (function () {

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- Иконки (stroke = currentColor, подхватывают цвет текста) ---------- */
  const PATHS = {
    chevron: '<path d="M9 5l7 7-7 7"/>',
    edit:    '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14 6l4 4"/>',
    search:  '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    share:   '<path d="M12 4v11"/><path d="M7.5 8.5L12 4l4.5 4.5"/><path d="M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4"/>',
    user:    '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20c1.3-3.6 4.2-5.5 7.5-5.5s6.2 1.9 7.5 5.5"/>',
    close:   '<path d="M6 6l12 12M18 6L6 18"/>',
    check:   '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    plus:    '<path d="M12 5v14M5 12h14"/>',
    link:    '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
    star:    '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    support: '<path d="M4 13a8 8 0 0116 0"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/>',
    shield:  '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z"/>',
    trash:   '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowDown:  '<path d="M12 5v14M6 13l6 6 6-6"/>'
  };
  function icon(name, size) {
    const s = size || 22;
    return '<svg class="ic" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (PATHS[name] || '') + '</svg>';
  }

  /* ---------- Даты ---------- */
  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  function dateShort(d) {
    return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  }
  // «сегодня», «вчера», «3 дня назад», иначе дата
  function dateRel(d) {
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (days <= 0) return 'сегодня';
    if (days === 1) return 'вчера';
    if (days < 7) return days + ' ' + plural(days, 'день', 'дня', 'дней') + ' назад';
    return dateShort(d);
  }

  /* ---------- Toast ---------- */
  let toastTimer = null;
  function toast(text, action) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.innerHTML = '<span>' + esc(text) + '</span>' + (action ? '<button class="toast-btn tap" type="button">' + esc(action.text) + '</button>' : '');
    if (action) el.querySelector('button').onclick = () => { el.classList.remove('show'); action.onClick(); };
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), action ? 5000 : 2600);
  }

  /* ---------- Шторка (bottom sheet) ---------- */
  let activeSheet = null;

  function sheet(html, opts) {
    closeSheet(true);
    const o = opts || {};
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = '<div class="sheet-backdrop"></div><div class="sheet" role="dialog">' +
      '<div class="sheet-top"><div class="sheet-handle"></div>' +
      '<button class="sheet-close tap" type="button" aria-label="Закрыть">' + icon('close', 20) + '</button></div>' +
      '<div class="sheet-body">' + html + '</div></div>';
    document.body.appendChild(wrap);
    TG.mainButton.suspend();   // главная кнопка не должна срабатывать под шторкой

    const sh = wrap.querySelector('.sheet');
    const body = wrap.querySelector('.sheet-body');
    wrap.querySelector('.sheet-backdrop').addEventListener('click', () => closeSheet());
    wrap.querySelector('.sheet-close').addEventListener('click', () => { TG.haptic.tap(); closeSheet(); });

    // Свайп вниз для закрытия (когда содержимое прокручено к началу)
    let startY = null, dy = 0;
    sh.addEventListener('touchstart', (e) => {
      if (body.scrollTop > 0) return;
      startY = e.touches[0].clientY; dy = 0; sh.style.transition = 'none';
    }, { passive: true });
    sh.addEventListener('touchmove', (e) => {
      if (startY == null) return;
      dy = Math.max(0, e.touches[0].clientY - startY);
      sh.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: true });
    sh.addEventListener('touchend', () => {
      if (startY == null) return;
      sh.style.transition = ''; sh.style.transform = '';
      startY = null;
      if (dy > 90) closeSheet();
    });

    activeSheet = { wrap, onClose: o.onClose };
    requestAnimationFrame(() => wrap.classList.add('open'));
    if (o.onMount) o.onMount(body);
    TG.haptic.tap();
  }

  function closeSheet(instant) {
    if (!activeSheet) return;
    const { wrap, onClose } = activeSheet;
    activeSheet = null;
    TG.mainButton.resume();
    if (instant) wrap.remove();
    else { wrap.classList.remove('open'); setTimeout(() => wrap.remove(), 260); }
    if (onClose) onClose();
  }

  function hasSheet() { return !!activeSheet; }

  /* ---------- Стрелки у горизонтальной ленты чипов ----------
   * Для каждого .chips-scroll внутри root: справа кнопка «→» (листать вправо),
   * в конце ленты она меняется на «←» (вернуться в начало). Если всё помещается — скрыта.
   * Можно вызывать повторно после перерисовки: уже обработанные ленты пропускаются.
   */
  function hscroll(root) {
    root.querySelectorAll('.chips-scroll').forEach((row) => {
      if (row.dataset.hs) return;
      row.dataset.hs = '1';
      const wrap = document.createElement('div');
      wrap.className = 'hscroll';
      row.parentNode.insertBefore(wrap, row);
      wrap.appendChild(row);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hs-arrow tap';
      btn.innerHTML = icon('arrowRight', 20);
      wrap.appendChild(btn);

      const atEnd = () => row.scrollLeft + row.clientWidth >= row.scrollWidth - 4;
      function update() {
        const overflow = row.scrollWidth > row.clientWidth + 4;
        btn.hidden = !overflow;
        const back = overflow && atEnd();
        btn.classList.toggle('back', back);
        btn.setAttribute('aria-label', back ? 'В начало' : 'Листать вправо');
      }
      btn.addEventListener('click', () => {
        TG.haptic.tap();
        if (atEnd()) row.scrollTo({ left: 0, behavior: 'smooth' });
        else row.scrollBy({ left: row.clientWidth * 0.7, behavior: 'smooth' });
      });
      row.addEventListener('scroll', update, { passive: true });
      requestAnimationFrame(update);
    });
  }

  /* ---------- Плавающая стрелка вертикальной прокрутки ----------
   * Кнопка в правом нижнем углу: «↓» листает экран вниз, у конца списка — «↑» наверх.
   * Возвращает функцию очистки (вызвать при уходе с экрана).
   */
  function scrollFab(screenEl) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fab tap';
    btn.innerHTML = icon('arrowDown', 22);
    document.body.appendChild(btn);   // вне экрана, чтобы не уезжал при прокрутке и анимации

    const nearBottom = () => screenEl.scrollTop + screenEl.clientHeight >= screenEl.scrollHeight - 80;
    function update() {
      const scrollable = screenEl.scrollHeight > screenEl.clientHeight + 120;
      btn.classList.toggle('show', scrollable);
      const up = scrollable && nearBottom();
      btn.classList.toggle('up', up);
      btn.setAttribute('aria-label', up ? 'Наверх' : 'Листать вниз');
    }
    btn.addEventListener('click', () => {
      TG.haptic.tap();
      if (nearBottom()) screenEl.scrollTo({ top: 0, behavior: 'smooth' });
      else screenEl.scrollBy({ top: screenEl.clientHeight * 0.8, behavior: 'smooth' });
    });
    screenEl.addEventListener('scroll', update, { passive: true });
    // Содержимое может меняться (фильтр, «Показать ещё», вкладки) — следим за размером
    const ro = window.ResizeObserver ? new ResizeObserver(update) : null;
    if (ro && screenEl.firstElementChild) ro.observe(screenEl.firstElementChild);
    setTimeout(update, 300);
    return () => { if (ro) ro.disconnect(); btn.remove(); };
  }

  /* ---------- Аватар ---------- */
  function avatar(u, size) {
    const s = size || 44;
    const letter = esc((u.first_name || '?').charAt(0).toUpperCase());
    const style = 'width:' + s + 'px;height:' + s + 'px;font-size:' + Math.round(s * 0.42) + 'px';
    if (u.photo_url) return '<img class="avatar" style="' + style + '" src="' + esc(u.photo_url) + '" alt="">';
    return '<div class="avatar avatar-letter" style="' + style + '">' + letter + '</div>';
  }

  return { esc, icon, plural, dateShort, dateRel, toast, sheet, closeSheet, hasSheet, avatar, hscroll, scrollFab };
})();
