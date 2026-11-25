/*
 * screens/company.js — шаг 4 «Компания и контакты».
 *   ИНН — проверка контрольных чисел; при CONFIG.DADATA_TOKEN карточка компании
 *         (название, ОГРН, адрес) заполняется автоматически через DaData
 *   Название компании, как к вам обращаться (обязательно), телефон (можно взять из Telegram)
 *   Сайты и ссылки — до 3
 * Данные сохраняются в профиль и подставляются в следующие исследования.
 */
(function () {

  // Запрос карточки компании в DaData по ИНН. Возвращает null, если ключа нет или не нашли.
  async function lookupInn(inn) {
    if (!CONFIG.DADATA_TOKEN) return null;
    try {
      const res = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': 'Token ' + CONFIG.DADATA_TOKEN },
        body: JSON.stringify({ query: inn })
      });
      const json = await res.json();
      const s = json.suggestions && json.suggestions[0];
      if (!s) return null;
      return { company: s.value || '', ogrn: (s.data && s.data.ogrn) || '', address: (s.data && s.data.address && s.data.address.value) || '' };
    } catch (e) {
      return null;
    }
  }

  // Приводим ссылку к виду https://… и проверяем, что это похоже на адрес сайта
  function normalizeUrl(v) {
    let s = v.trim();
    if (!s) return '';
    if (s.charAt(0) === '@') s = 'https://t.me/' + s.slice(1);          // @канал → t.me
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    try { const u = new URL(s); return /\./.test(u.hostname) ? u.href.replace(/\/$/, '') : ''; } catch (e) { return ''; }
  }
  const shortUrl = (u) => u.replace(/^https?:\/\/(www\.)?/i, '');

  Router.register('company', {
    render(params) {
      const c = Screens.ctx(params);
      if (!c.contactName) c.contactName = TG.user().first_name !== 'Гость' ? TG.user().first_name : '';
      return '<div class="page">' +
        Screens.steps(4, params) +
        '<h1 class="title">Компания и контакты</h1>' +

        '<div class="block"><div class="label">ИНН <span class="hint">· 10 или 12 цифр</span></div>' +
          '<input class="input inn-input" inputmode="numeric" maxlength="12" placeholder="7707083893" value="' + UI.esc(c.inn || '') + '">' +
          '<div class="inn-status hint"></div>' +
          '<div class="company-card card" hidden></div>' +
        '</div>' +

        '<div class="block"><div class="label">Название компании <span class="hint">· необязательно</span></div>' +
          '<input class="input company-input" maxlength="80" placeholder="ООО «Ромашка»" value="' + UI.esc(c.company || '') + '"></div>' +

        '<div class="block"><div class="label">ФИО <span class="hint">· так мы будем к вам обращаться</span></div>' +
          '<input class="input name-input" maxlength="80" placeholder="Иванов Константин Петрович" autocomplete="name" value="' + UI.esc(c.contactName || '') + '">' +
          '<div class="hint name-preview"></div></div>' +

        '<div class="block"><div class="label">Телефон <span class="hint">· необязательно</span></div>' +
          '<div class="add-row"><input class="input phone-input" type="tel" inputmode="tel" maxlength="20" placeholder="+7 900 000-00-00" autocomplete="tel" value="' + UI.esc(c.phone || '') + '">' +
          (TG.canRequestContact() ? '<button class="btn btn-secondary add-btn tap" data-act="contact" type="button" aria-label="Взять из Telegram">📱</button>' : '') +
          '</div></div>' +

        '<div class="block"><div class="label">Сайты и ссылки <span class="hint">· до 3, необязательно</span></div>' +
          '<div class="add-row"><input class="input site-input" inputmode="url" maxlength="80" placeholder="site.ru, @канал, ВКонтакте" enterkeyhint="done">' +
          '<button class="btn btn-secondary add-btn tap" data-act="add-site" type="button" aria-label="Добавить">' + UI.icon('plus') + '</button></div>' +
          '<div class="site-list"></div></div>' +
      '</div>';
    },

    mount(el, params) {
      const c = Screens.ctx(params);
      if (!Array.isArray(c.sites)) c.sites = [];
      const $ = (s) => el.querySelector(s);
      const innInput = $('.inn-input'), status = $('.inn-status'), card = $('.company-card');
      const companyInput = $('.company-input'), siteInput = $('.site-input'), phoneInput = $('.phone-input');

      // ИНН необязателен, но если введён — должен быть корректным
      const valid = () => (c.contactName || '').trim().length >= 2 && (!c.inn || Screens.innValid(c.inn));
      const updateBtn = Screens.formButton(params, valid, 'confirm');

      function renderCard() {
        const has = c.company && (c.ogrn || c.address);
        card.hidden = !has;
        if (has) {
          card.innerHTML = '<div class="cc-name">🏢 ' + UI.esc(c.company) + '</div>' +
            (c.ogrn ? '<div class="cc-row"><span class="hint">ОГРН</span>' + UI.esc(c.ogrn) + '</div>' : '') +
            (c.address ? '<div class="cc-row"><span class="hint">Адрес</span>' + UI.esc(c.address) + '</div>' : '');
        }
      }

      let lookupSeq = 0;
      async function checkInn(initial) {
        const v = c.inn || '';
        innInput.classList.remove('bad');
        if (!v) { status.textContent = CONFIG.DADATA_TOKEN ? 'Заполним карточку компании автоматически' : ''; status.className = 'inn-status hint'; return; }
        if (v.length !== 10 && v.length !== 12) { status.textContent = v.length + ' из ' + (v.length > 10 ? 12 : 10) + ' цифр'; status.className = 'inn-status hint'; return; }
        if (!Screens.innValid(v)) {
          status.textContent = 'ИНН с ошибкой — проверьте цифры'; status.className = 'inn-status bad-text';
          innInput.classList.add('bad');
          if (!initial) TG.haptic.error();
          return;
        }
        status.textContent = '✓ ИНН корректный' + (CONFIG.DADATA_TOKEN ? ' · ищем компанию…' : '');
        status.className = 'inn-status ok-text';
        if (initial || !CONFIG.DADATA_TOKEN) return;
        const seq = ++lookupSeq;
        const info = await lookupInn(v);
        if (seq !== lookupSeq || c.inn !== v) return;   // пользователь уже ввёл другое
        if (info) {
          Object.assign(c, info);
          companyInput.value = c.company;
          status.textContent = '✓ Компания найдена';
          TG.haptic.success();
          renderCard();
        } else {
          status.textContent = '✓ ИНН корректный · введите название вручную';
        }
      }

      function renderSites() {
        $('.site-list').innerHTML = c.sites.map((u, i) =>
          '<div class="site-row card"><span class="site-ic">' + UI.icon('link', 18) + '</span>' +
          '<span class="site-url">' + UI.esc(shortUrl(u)) + '</span>' +
          '<button class="site-rm tap" data-rm="' + i + '" type="button" aria-label="Удалить">' + UI.icon('close', 18) + '</button></div>'
        ).join('');
        const full = c.sites.length >= 3;
        siteInput.disabled = full;
        siteInput.placeholder = full ? 'Добавлено 3 из 3' : 'site.ru, @канал, ВКонтакте';
      }

      function addSite() {
        const u = normalizeUrl(siteInput.value);
        if (!u) { if (siteInput.value.trim()) { TG.haptic.error(); UI.toast('Не похоже на ссылку'); } return; }
        if (c.sites.length >= 3) return;
        if (!c.sites.includes(u)) c.sites.push(u);
        siteInput.value = '';
        TG.haptic.select();
        renderSites();
      }

      renderCard(); renderSites(); checkInn(true);

      innInput.addEventListener('input', () => {
        const digits = innInput.value.replace(/\D/g, '').slice(0, 12);
        if (digits !== innInput.value) innInput.value = digits;
        if (digits !== c.inn) { c.ogrn = ''; c.address = ''; renderCard(); }   // старая карточка уже не про этот ИНН
        c.inn = digits;
        checkInn(false);
        updateBtn();
      });
      companyInput.addEventListener('input', () => { c.company = companyInput.value; });
      // Подсказка «Будем обращаться: Константин» под полем ФИО
      const preview = $('.name-preview');
      const showPreview = () => { const n = Screens.firstNameFromFio(c.contactName); preview.textContent = n ? 'Будем обращаться: ' + n : ''; };
      showPreview();
      $('.name-input').addEventListener('input', (e) => { c.contactName = e.target.value; showPreview(); updateBtn(); });
      phoneInput.addEventListener('input', () => { c.phone = phoneInput.value.replace(/[^\d+\-\s()]/g, ''); });
      siteInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addSite(); } });

      el.addEventListener('click', async (e) => {
        const rm = e.target.closest('[data-rm]');
        if (rm) { c.sites.splice(+rm.dataset.rm, 1); TG.haptic.tap(); renderSites(); return; }
        const a = e.target.closest('[data-act]');
        if (!a) return;
        TG.haptic.tap();
        if (a.dataset.act === 'add-site') addSite();
        if (a.dataset.act === 'contact') {
          const phone = await TG.requestContact();
          if (phone) { c.phone = phone; phoneInput.value = phone; UI.toast('Номер добавлен'); }
        }
      });
    }
  });
})();
