/*
 * screens/company.js — шаг 4 «Компания и контакты».
 * Обязательные поля (помечены *), проверка — js/validate.js:
 *   ИНН *       — 10 или 12 цифр, контрольные числа, код региона; при CONFIG.DADATA_TOKEN
 *                 карточка компании (название, ОГРН, адрес) заполняется автоматически через DaData
 *   Компания *  — с формой собственности, согласованной с ИНН (ООО/АО… для 10 цифр, ИП для 12)
 *   ФИО *       — фамилия и имя (отчество) русскими буквами; по имени обращаемся в приложении
 *   Телефон *   — российский номер +7 с маской; можно взять из Telegram
 *   Сайты       — до 3, необязательно
 * Для роли «Планирую бизнес» ИНН и компания необязательны (их ещё может не быть).
 * Пока есть ошибки, кнопка «Далее / Сохранить» неактивна, ошибки видны под полями.
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
      const d = s.data || {};
      return {
        company: s.value || '', ogrn: d.ogrn || '', address: (d.address && d.address.value) || '',
        active: !d.state || d.state.status === 'ACTIVE'
      };
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
    try { const u = new URL(s); return /\.[a-zа-я]{2,}$/i.test(u.hostname) ? u.href.replace(/\/$/, '') : ''; } catch (e) { return ''; }
  }
  const shortUrl = (u) => u.replace(/^https?:\/\/(www\.)?/i, '');

  // Поле с подписью, звёздочкой обязательности и местом для ошибки
  function field(key, label, required, inputHtml, hint) {
    return '<div class="block" data-field="' + key + '"><div class="label">' + label +
      (required ? ' <span class="req">*</span>' : ' <span class="hint">· необязательно</span>') + '</div>' +
      inputHtml + '<div class="field-err"></div>' + (hint ? '<div class="field-hint hint">' + hint + '</div>' : '') + '</div>';
  }

  Router.register('company', {
    render(params) {
      const c = Screens.ctx(params);
      const planning = c.role === 'Планирую бизнес';
      if (!c.contactName) c.contactName = '';
      if (c.phone) c.phone = Validate.formatPhone(c.phone);
      return '<div class="page">' +
        Screens.steps(4, params) +
        '<h1 class="title">Компания и контакты</h1>' +
        '<div class="hint">Поля со <span class="req">*</span> обязательны. Данные проверяются — укажите настоящие.</div>' +

        field('inn', 'ИНН', !planning,
          '<input class="input inn-input" inputmode="numeric" maxlength="12" placeholder="10 или 12 цифр" value="' + UI.esc(c.inn || '') + '">' +
          '<div class="company-card card" hidden></div>',
          '10 цифр — организация, 12 — ИП') +

        field('company', 'Название компании', !planning,
          '<input class="input company-input" maxlength="100" placeholder="ООО «Ромашка»" value="' + UI.esc(c.company || '') + '">',
          'С формой собственности: ООО «Ромашка», АО «Звезда» или ИП Иванов Иван Иванович') +

        field('fio', 'ФИО', true,
          '<input class="input name-input" maxlength="80" placeholder="Иванов Константин Петрович" autocomplete="name" value="' + UI.esc(c.contactName || '') + '">' +
          '<div class="hint name-preview"></div>') +

        field('phone', 'Телефон', true,
          '<div class="add-row"><input class="input phone-input" type="tel" inputmode="tel" maxlength="18" placeholder="+7 (900) 000-00-00" autocomplete="tel" value="' + UI.esc(c.phone || '') + '">' +
          (TG.canRequestContact() ? '<button class="btn btn-secondary add-btn tap" data-act="contact" type="button" aria-label="Взять номер из Telegram">📱</button>' : '') +
          '</div>',
          TG.canRequestContact() ? 'Российский номер. 📱 — подставить номер из Telegram' : 'Российский номер, начинается с +7') +

        '<div class="block"><div class="label">Сайты и ссылки <span class="hint">· до 3, необязательно</span></div>' +
          '<div class="add-row"><input class="input site-input" inputmode="url" maxlength="80" placeholder="site.ru, @канал, vk.com/…" enterkeyhint="done">' +
          '<button class="btn btn-secondary add-btn tap" data-act="add-site" type="button" aria-label="Добавить">' + UI.icon('plus') + '</button></div>' +
          '<div class="site-list"></div></div>' +
      '</div>';
    },

    mount(el, params) {
      const c = Screens.ctx(params);
      if (!Array.isArray(c.sites)) c.sites = [];
      const planning = c.role === 'Планирую бизнес';
      const $ = (s) => el.querySelector(s);
      const innInput = $('.inn-input'), card = $('.company-card');
      const companyInput = $('.company-input'), nameInput = $('.name-input'), phoneInput = $('.phone-input'), siteInput = $('.site-input');
      const touched = {};          // ошибки показываем после первого ввода или ухода с поля
      let innLookupError = '';     // ошибка от DaData (например, компания ликвидирована)

      // Ошибки всех полей ('' — поле в порядке)
      function errors() {
        const e = {};
        e.inn = (planning && !c.inn) ? '' : (Validate.inn(c.inn) || innLookupError);
        e.company = (planning && !c.company && !c.inn) ? '' : Validate.company(c.company, c.inn);
        e.fio = Validate.fio(c.contactName);
        e.phone = Validate.phone(c.phone);
        return e;
      }
      const valid = () => Object.values(errors()).every((x) => !x);
      const updateBtn = Screens.formButton(params, valid, 'confirm');

      function showErrors(all) {
        const e = errors();
        Object.keys(e).forEach((k) => {
          const box = el.querySelector('[data-field="' + k + '"]');
          const show = (all || touched[k]) && e[k];
          box.querySelector('.field-err').textContent = show ? e[k] : '';
          box.classList.toggle('has-err', !!show);
          box.classList.toggle('is-ok', !e[k] && !!touched[k]);
        });
        updateBtn();
      }

      function renderCard() {
        const has = c.company && (c.ogrn || c.address);
        card.hidden = !has;
        if (has) {
          card.innerHTML = '<div class="cc-name">🏢 ' + UI.esc(c.company) + '</div>' +
            (c.ogrn ? '<div class="cc-row"><span class="hint">ОГРН</span>' + UI.esc(c.ogrn) + '</div>' : '') +
            (c.address ? '<div class="cc-row"><span class="hint">Адрес</span>' + UI.esc(c.address) + '</div>' : '');
        }
      }

      // Автокарточка по ИНН (если подключён DaData)
      let lookupSeq = 0;
      async function lookup() {
        if (!CONFIG.DADATA_TOKEN || Validate.inn(c.inn)) return;
        const v = c.inn, seq = ++lookupSeq;
        const info = await lookupInn(v);
        if (seq !== lookupSeq || c.inn !== v) return;   // пользователь уже ввёл другое
        if (!info) { innLookupError = 'Компания с таким ИНН не найдена в реестре'; showErrors(true); return; }
        if (!info.active) { innLookupError = 'Компания с этим ИНН не действует (ликвидирована или закрыта)'; showErrors(true); return; }
        innLookupError = '';
        Object.assign(c, { company: info.company, ogrn: info.ogrn, address: info.address });
        companyInput.value = c.company;
        touched.company = true;
        TG.haptic.success();
        renderCard(); showErrors();
      }

      // Подсказка «Будем обращаться: Константин»
      const preview = $('.name-preview');
      const showPreview = () => { const n = !Validate.fio(c.contactName) && Screens.firstNameFromFio(c.contactName); preview.textContent = n ? 'Будем обращаться: ' + n : ''; };

      function renderSites() {
        $('.site-list').innerHTML = c.sites.map((u, i) =>
          '<div class="site-row card"><span class="site-ic">' + UI.icon('link', 18) + '</span>' +
          '<span class="site-url">' + UI.esc(shortUrl(u)) + '</span>' +
          '<button class="site-rm tap" data-rm="' + i + '" type="button" aria-label="Удалить">' + UI.icon('close', 18) + '</button></div>'
        ).join('');
        const full = c.sites.length >= 3;
        siteInput.disabled = full;
        siteInput.placeholder = full ? 'Добавлено 3 из 3' : 'site.ru, @канал, vk.com/…';
      }
      function addSite() {
        const u = normalizeUrl(siteInput.value);
        if (!u) { if (siteInput.value.trim()) { TG.haptic.error(); UI.toast('Не похоже на адрес сайта'); } return; }
        if (c.sites.length >= 3) return;
        if (!c.sites.includes(u)) c.sites.push(u);
        siteInput.value = '';
        TG.haptic.select();
        renderSites();
      }

      // Подсказка для названия под тип ИНН
      function companyPlaceholder() {
        companyInput.placeholder = String(c.inn || '').length === 12 ? 'ИП Иванов Иван Иванович' : 'ООО «Ромашка»';
      }

      // Уже заполненные поля (из профиля) — проверяем сразу
      ['inn', 'company', 'fio', 'phone'].forEach((k) => {
        const v = { inn: c.inn, company: c.company, fio: c.contactName, phone: c.phone }[k];
        if (v) touched[k] = true;
      });
      renderCard(); renderSites(); showPreview(); companyPlaceholder(); showErrors();

      innInput.addEventListener('input', () => {
        const digits = innInput.value.replace(/\D/g, '').slice(0, 12);
        if (digits !== innInput.value) innInput.value = digits;
        if (digits !== c.inn) { c.ogrn = ''; c.address = ''; innLookupError = ''; renderCard(); }   // старая карточка уже не про этот ИНН
        c.inn = digits;
        if (digits.length >= 10) touched.inn = true;
        companyPlaceholder();
        showErrors();
        lookup();
      });
      companyInput.addEventListener('input', () => { c.company = companyInput.value; touched.company = true; showErrors(); });
      nameInput.addEventListener('input', () => { c.contactName = nameInput.value; showPreview(); showErrors(); });
      phoneInput.addEventListener('focus', () => { if (!phoneInput.value) phoneInput.value = '+7 ('; });
      phoneInput.addEventListener('input', () => {
        const f = Validate.formatPhone(phoneInput.value);
        phoneInput.value = f;
        c.phone = f;
        if (Validate.phoneDigits(f).length >= 11) touched.phone = true;
        showErrors();
      });
      // Ушёл с поля — показываем ошибку, даже если ввод не закончен
      [['inn', innInput], ['company', companyInput], ['fio', nameInput], ['phone', phoneInput]].forEach(([k, inp]) => {
        inp.addEventListener('blur', () => {
          if (k === 'phone' && phoneInput.value === '+7 (') { phoneInput.value = ''; c.phone = ''; }
          if (inp.value.trim()) touched[k] = true;
          showErrors();
        });
      });
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
          if (!phone) return;
          const f = Validate.formatPhone(phone);
          if (Validate.phoneDigits(phone)[0] !== '7') { UI.toast('Нужен российский номер +7 — введите вручную'); return; }
          c.phone = f; phoneInput.value = f; touched.phone = true;
          UI.toast('Номер добавлен');
          showErrors();
        }
      });
    }
  });
})();
