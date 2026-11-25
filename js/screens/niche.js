/*
 * screens/niche.js — шаг 1 «Ваша ниша».
 * Поиск, сетка плиток с эмодзи, уточнение поднишей чипами, поле «Своя ниша».
 * Список ниш — в data.js (DATA.NICHES).
 */
Router.register('niche', {
  render(params) {
    const c = Screens.ctx(params);
    const tiles = DATA.NICHES.concat([DATA.CUSTOM_NICHE]).map((n) =>
      '<button class="tile tap' + (c.nicheId === n.id ? ' selected' : '') + '" data-niche="' + n.id + '" type="button">' +
        '<span class="tile-emoji">' + n.emoji + '</span><span class="tile-title">' + n.title + '</span>' +
      '</button>'
    ).join('');

    return '<div class="page">' +
      Screens.steps(1, params) +
      '<h1 class="title">Ваша ниша</h1>' +
      '<label class="search">' + UI.icon('search', 20) +
        '<input type="search" placeholder="Поиск ниши" enterkeyhint="search" autocomplete="off"></label>' +
      '<div class="tile-grid">' + tiles + '</div>' +
      '<div class="nothing hint" hidden>Не нашли? Выберите «Своя ниша»</div>' +
      '<div class="block sub-block" hidden><div class="label">Уточните <span class="hint">· необязательно</span></div><div class="chips sub-chips"></div></div>' +
      '<div class="block custom-block" hidden><div class="label">Опишите нишу</div>' +
        '<input class="input custom-input" maxlength="60" placeholder="Например: аренда спецтехники" value="' + UI.esc(c.customNiche || '') + '"></div>' +
    '</div>';
  },

  mount(el, params) {
    const c = Screens.ctx(params);
    const subBlock = el.querySelector('.sub-block');
    const subChips = el.querySelector('.sub-chips');
    const customBlock = el.querySelector('.custom-block');
    const customInput = el.querySelector('.custom-input');
    const search = el.querySelector('input[type=search]');

    const valid = () => !!c.nicheId && (c.nicheId !== 'custom' || (c.customNiche || '').trim().length >= 2);
    const updateBtn = Screens.formButton(params, valid, 'about');

    // Показать блоки уточнения под выбранную нишу
    function renderExtra(scroll) {
      const n = DATA.niche(c.nicheId);
      const hasSub = n && n.sub && n.sub.length;
      subBlock.hidden = !hasSub;
      if (hasSub) {
        subChips.innerHTML = n.sub.map((s) =>
          '<button class="chip tap' + (c.sub === s ? ' selected' : '') + '" data-sub="' + UI.esc(s) + '" type="button">' + UI.esc(s) + '</button>'
        ).join('');
      }
      customBlock.hidden = c.nicheId !== 'custom';
      if (scroll) {
        const target = c.nicheId === 'custom' ? customBlock : subBlock;
        if (!target.hidden) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      }
    }
    renderExtra(false);

    el.addEventListener('click', (e) => {
      const tile = e.target.closest('[data-niche]');
      if (tile) {
        TG.haptic.select();
        if (c.nicheId !== tile.dataset.niche) c.sub = '';
        c.nicheId = tile.dataset.niche;
        el.querySelectorAll('.tile').forEach((t) => t.classList.toggle('selected', t === tile));
        if (c.nicheId === 'custom' && !c.customNiche && search.value.trim()) {
          c.customNiche = search.value.trim();           // переносим текст из поиска
          customInput.value = c.customNiche;
        }
        renderExtra(true);
        if (c.nicheId === 'custom') setTimeout(() => customInput.focus(), 300);
        updateBtn();
        return;
      }
      const chip = e.target.closest('[data-sub]');
      if (chip) {
        TG.haptic.select();
        c.sub = c.sub === chip.dataset.sub ? '' : chip.dataset.sub;   // повторный тап снимает выбор
        renderExtra(false);
      }
    });

    customInput.addEventListener('input', () => { c.customNiche = customInput.value; updateBtn(); });

    // Поиск: фильтруем плитки по названию и поднишам
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      let shown = 0;
      el.querySelectorAll('.tile').forEach((t) => {
        const n = DATA.niche(t.dataset.niche);
        const hay = (n.title + ' ' + (n.sub || []).join(' ')).toLowerCase();
        const ok = !q || n.id === 'custom' || hay.includes(q);
        t.hidden = !ok;
        if (ok && n.id !== 'custom') shown++;
      });
      el.querySelector('.nothing').hidden = !(q && !shown);
    });
  }
});
