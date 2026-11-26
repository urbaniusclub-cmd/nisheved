/*
 * screens/about.js — шаг 2 «О бизнесе».
 * Группы чипов (роль, клиенты, размер, география), город, конкуренты (до 3), пара слов о продукте.
 * Вопросы и варианты — в data.js (DATA.ABOUT).
 */
Router.register('about', {
  render(params) {
    const c = Screens.ctx(params);
    const groups = Object.keys(DATA.ABOUT).map((key) => {
      const g = DATA.ABOUT[key];
      return '<div class="block"><div class="label">' + g.title + (g.required ? '' : ' <span class="hint">· необязательно</span>') + '</div>' +
        '<div class="chips" data-group="' + key + '">' +
        g.options.map((o) => '<button class="chip tap' + (c[key] === o ? ' selected' : '') + '" data-val="' + UI.esc(o) + '" type="button">' + UI.esc(o) + '</button>').join('') +
        '</div>' +
        (key === 'geo' ? '<input class="input city-input" maxlength="40" placeholder="Ваш город, например Казань" value="' + UI.esc(c.city || '') + '"' + (c.geo === 'Мой город' ? '' : ' hidden') + '><div class="field-err city-err"></div>' : '') +
        '</div>';
    }).join('');

    return '<div class="page">' +
      Screens.steps(2, params) +
      '<h1 class="title">О бизнесе</h1>' +
      groups +
      '<div class="block"><div class="label">Конкуренты <span class="hint">· до 3, необязательно</span></div>' +
        '<div class="add-row"><input class="input comp-input" maxlength="40" placeholder="Название или сайт" enterkeyhint="done">' +
        '<button class="btn btn-secondary add-btn tap" type="button" aria-label="Добавить">' + UI.icon('plus') + '</button></div>' +
        '<div class="chips comp-chips"></div></div>' +
      '<div class="block"><div class="label">Пара слов о продукте <span class="hint">· необязательно</span></div>' +
        '<textarea class="input textarea product-input" rows="2" maxlength="200" placeholder="Например: имплантация под ключ для взрослых">' + UI.esc(c.product || '') + '</textarea></div>' +
    '</div>';
  },

  mount(el, params) {
    const c = Screens.ctx(params);
    if (!Array.isArray(c.competitors)) c.competitors = [];
    const city = el.querySelector('.city-input');
    const compInput = el.querySelector('.comp-input');
    const compChips = el.querySelector('.comp-chips');

    const valid = () => !!c.role && !!c.clients && !!c.geo && (c.geo !== 'Мой город' || !Validate.city(c.city));
    const updateBtn = Screens.formButton(params, valid, 'goal');

    function renderComps() {
      compChips.innerHTML = c.competitors.map((name, i) =>
        '<button class="chip chip-removable selected tap" data-rm="' + i + '" type="button">' + UI.esc(name) + ' ' + UI.icon('close', 16) + '</button>'
      ).join('');
      const full = c.competitors.length >= 3;
      compInput.disabled = full;
      compInput.placeholder = full ? 'Добавлено 3 из 3' : 'Название или сайт';
    }
    renderComps();

    function addComp() {
      const v = compInput.value.trim();
      if (!v || c.competitors.length >= 3) return;
      if (!c.competitors.includes(v)) c.competitors.push(v);
      compInput.value = '';
      TG.haptic.select();
      renderComps();
    }

    el.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-group] .chip');
      if (chip) {
        const key = chip.parentElement.dataset.group;
        const g = DATA.ABOUT[key];
        TG.haptic.select();
        // Обязательные — радио; необязательные можно снять повторным тапом
        c[key] = (!g.required && c[key] === chip.dataset.val) ? '' : chip.dataset.val;
        chip.parentElement.querySelectorAll('.chip').forEach((x) => x.classList.toggle('selected', c[key] === x.dataset.val));
        if (key === 'geo') {
          city.hidden = c.geo !== 'Мой город';
          if (!city.hidden && !city.value) setTimeout(() => city.focus(), 100);
        }
        updateBtn();
        return;
      }
      const rm = e.target.closest('[data-rm]');
      if (rm) { c.competitors.splice(+rm.dataset.rm, 1); TG.haptic.tap(); renderComps(); return; }
      if (e.target.closest('.add-btn')) addComp();
    });

    compInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addComp(); } });
    // Город проверяем по правилам validate.js; ошибку показываем после ухода с поля
    const cityErr = el.querySelector('.city-err');
    let cityTouched = !!c.city;
    const showCity = () => {
      const e = c.geo === 'Мой город' && cityTouched ? Validate.city(c.city) : '';
      cityErr.textContent = e;
      city.classList.toggle('bad', !!e);
    };
    showCity();
    city.addEventListener('input', () => { c.city = city.value; if (cityTouched) showCity(); updateBtn(); });
    city.addEventListener('blur', () => { if (city.value.trim()) cityTouched = true; showCity(); });
    el.querySelector('.product-input').addEventListener('input', (e) => { c.product = e.target.value; });
  }
});
