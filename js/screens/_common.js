/*
 * screens/_common.js — то, что нужно нескольким экранам сразу.
 *
 * Режимы экранов анкеты (params.mode):
 *   'flow'    — обычный путь: Ниша → О бизнесе → Цель → Компания → Подтверждение (кнопка «Далее»)
 *   'edit'    — правка с экрана «Подтверждение» (кнопка «Сохранить», возврат назад)
 *   'profile' — правка «Моего бизнеса» из Профиля (сохраняет в профиль)
 */
window.Screens = (function () {

  // Какие данные редактирует экран: анкету исследования или копию профиля
  function ctx(params) {
    return params.mode === 'profile' ? Store.state.editBuf : Store.state.draft;
  }

  // Индикатор шагов анкеты (●●○○). В режимах правки не показываем.
  const TOTAL_STEPS = 4;   // Ниша → О бизнесе → Цель → Компания
  function steps(n, params) {
    if (params.mode && params.mode !== 'flow') return '';
    let html = '<div class="steps" aria-label="Шаг ' + n + ' из ' + TOTAL_STEPS + '">';
    for (let i = 1; i <= TOTAL_STEPS; i++) html += '<span class="' + (i <= n ? 'on' : '') + '"></span>';
    return html + '</div><div class="steps-label">Шаг ' + n + ' из ' + TOTAL_STEPS + '</div>';
  }

  // Цветной тег новости
  const TAG_CLASS = { 'Закон': 'law', 'Рынок': 'market', 'Спрос': 'demand', 'Конкуренты': 'comp', 'Технологии': 'tech' };
  function tagChip(t) { return '<span class="tag tag-' + (TAG_CLASS[t] || 'market') + '">' + t + '</span>'; }

  // Шторка с подробностями новости (Отчёт и Главная). n — объект новости с полем date.
  function openNews(n) {
    UI.sheet(
      '<div class="news-top">' + tagChip(n.tag) + '<span class="hint">' + UI.dateShort(n.date) + '</span></div>' +
      (n.nicheTitle ? '<div class="hint">' + n.nicheEmoji + ' ' + UI.esc(n.nicheTitle) + '</div>' : '') +
      '<h2 class="sheet-title">' + UI.esc(n.title) + '</h2>' +
      '<div class="hint">' + UI.esc(n.source) + '</div>' +
      '<p class="sheet-text">' + UI.esc(n.summary) + '</p>' +
      '<div class="box box-accent"><div class="box-title">💡 Что это значит для бизнеса</div>' + UI.esc(n.forYou) + '</div>' +
      '<div class="box"><div class="box-title">👉 Что сделать</div>' + n.todo.map((t) => '<div class="todo">• ' + UI.esc(t) + '</div>').join('') + '</div>' +
      (n.url ? '<button class="btn btn-secondary btn-block tap" data-src type="button">' + UI.icon('link', 20) + ' Открыть источник</button>' : '') +
      '<div class="hint center small-gap">Демо-пример новости для показа интерфейса</div>',
      { onMount(body) { const b = body.querySelector('[data-src]'); if (b) b.onclick = () => TG.openLink(n.url); } }
    );
  }

  // Проверка ИНН по контрольным числам: 10 цифр — организация, 12 — ИП/физлицо
  function innValid(inn) {
    const s = String(inn || '');
    if (!/^\d{10}$|^\d{12}$/.test(s)) return false;
    const d = s.split('').map(Number);
    const check = (coef) => coef.reduce((sum, k, i) => sum + k * d[i], 0) % 11 % 10;
    if (s.length === 10) return check([2, 4, 10, 3, 5, 9, 4, 6, 8]) === d[9];
    return check([7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === d[10] && check([3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === d[11];
  }

  // Настроить главную кнопку экрана анкеты: «Далее» или «Сохранить»
  function formButton(params, isValid, nextScreen) {
    const editing = params.mode === 'edit' || params.mode === 'profile';
    const cfg = {
      text: editing ? 'Сохранить' : 'Далее',
      disabled: !isValid(),
      onClick: async () => {
        if (!isValid()) return;
        if (params.mode === 'profile') {
          await Store.saveProfile(Store.state.editBuf);
          UI.toast('Сохранено');
        }
        // Последний шаг анкеты (Компания) — сразу запоминаем пользователя, чтобы обращаться по имени
        if (params.mode === 'edit' || nextScreen === 'confirm') await Store.saveProfile(Store.state.draft);
        if (editing) Router.back();
        else Router.go(nextScreen, { mode: 'flow' });
      }
    };
    TG.mainButton.show(cfg);
    return () => TG.mainButton.update({ disabled: !isValid() });   // вызвать после каждого изменения
  }

  // Подготовить копию профиля для режима 'profile'
  function startProfileEdit() {
    Store.state.editBuf = Object.assign({ competitors: [], sites: [] }, JSON.parse(JSON.stringify(Store.state.profile)));
  }

  // Короткое описание бизнеса одной строкой
  function aboutLine(p) {
    const geo = p.geo === 'Мой город' && p.city ? p.city : p.geo;
    return [p.role, p.clients, p.size, geo].filter(Boolean).join(' · ');
  }

  // Имя из ФИО для обращения: «Иванов Константин Петрович» → «Константин».
  // 3+ слова — второе (Фамилия Имя Отчество); 1 слово — оно само;
  // 2 слова — имя то, что меньше похоже на фамилию («Иванов Константин» и «Константин Иванов» → Константин).
  function surnameScore(word) {
    if (/(ов|ев|ёв|ова|ева|ёва|ский|цкий|ская|цкая|дзе|швили|ян|енко|ко|ук|юк|их|ых)$/i.test(word)) return 2;   // почти точно фамилия
    if (/(ин|ына|ина|ын)$/i.test(word)) return 1;   // может быть и фамилией (Ильин), и именем (Константин)
    return 0;
  }
  function firstNameFromFio(fio) {
    const w = String(fio || '').trim().split(/\s+/).filter(Boolean);
    if (!w.length) return '';
    if (w.length >= 3) return w[1];
    if (w.length === 2) return surnameScore(w[0]) > surnameScore(w[1]) ? w[1] : surnameScore(w[1]) > surnameScore(w[0]) ? w[0] : w[1];
    return w[0];
  }

  // Как обращаться к пользователю: имя из ФИО в профиле, иначе имя из Telegram
  function displayName() {
    return firstNameFromFio(Store.state.profile.contactName) || TG.user().first_name;
  }

  function fmt(n) { return Number(n).toLocaleString('ru-RU'); }

  // «до 5 декабря» / «до 14:30» (если сегодня) — когда заканчивается пакет «Стандарт»
  function accessUntilText() {
    const until = new Date(Store.state.accessUntil);
    const sameDay = until.toDateString() === new Date().toDateString();
    return 'до ' + (sameDay ? until.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : UI.dateShort(until));
  }

  function daysText(n) { return n + ' ' + UI.plural(n, 'день', 'дня', 'дней'); }

  return { ctx, steps, tagChip, openNews, innValid, formButton, startProfileEdit, aboutLine, fmt, accessUntilText, daysText, firstNameFromFio, displayName };
})();
