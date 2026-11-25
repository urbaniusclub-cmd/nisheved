/*
 * store.js — состояние приложения и его сохранение.
 *
 * Что хранится (ключи в Telegram CloudStorage / localStorage):
 *   profile   — данные о бизнесе (ниша, роль, гео…), JSON
 *   balance   — сколько исследований доступно, число
 *   reports   — список id отчётов, JSON-массив (новые первыми)
 *   r_<id>    — один отчёт: параметры + отмеченные шаги плана, JSON
 *
 * Содержимое отчёта (новости, выводы, план) НЕ хранится — оно собирается
 * из параметров в report.js. Так каждая запись укладывается в лимит 4096 символов.
 *
 * draft — анкета текущего исследования (только в памяти).
 */
window.Store = (function () {
  const S = TG.storage;

  const state = {
    profile: {},
    balance: 0,
    reportIds: [],
    reports: {},
    draft: emptyDraft(),
    loaded: false
  };

  function emptyDraft() {
    return {
      nicheId: '', sub: '', customNiche: '', role: '', clients: '', size: '', geo: '', city: '', competitors: [], product: '', goalId: '',
      // Шаг 4 «Компания и контакты»
      inn: '', company: '', ogrn: '', address: '', contactName: '', phone: '', sites: []
    };
  }

  function parse(str, fallback) {
    if (!str) return fallback;
    try { return JSON.parse(str); } catch (e) { return fallback; }
  }

  /* ---------- Загрузка при старте ---------- */
  async function load() {
    const base = await S.getMany(['profile', 'balance', 'reports']);
    state.profile = parse(base.profile, {});
    state.reportIds = parse(base.reports, []);
    if (base.balance === '' || base.balance == null) {
      // Первый запуск — дарим бесплатные исследования
      state.balance = CONFIG.FREE_RESEARCHES;
      await S.set('balance', String(state.balance));
    } else {
      state.balance = parseInt(base.balance, 10) || 0;
    }
    const recs = await S.getMany(state.reportIds.map((id) => 'r_' + id));
    state.reportIds = state.reportIds.filter((id) => {
      const r = parse(recs['r_' + id], null);
      if (r) state.reports[id] = r;
      return !!r;
    });
    state.loaded = true;
  }

  /* ---------- Анкета ---------- */
  // Новое исследование: анкета заполняется из сохранённого профиля
  function startDraft() {
    state.draft = Object.assign(emptyDraft(), JSON.parse(JSON.stringify(state.profile)), { goalId: '' });
    return state.draft;
  }

  /* ---------- Профиль ---------- */
  const PROFILE_FIELDS = ['nicheId', 'sub', 'customNiche', 'role', 'clients', 'size', 'geo', 'city', 'competitors', 'product',
    'inn', 'company', 'ogrn', 'address', 'contactName', 'phone', 'sites'];
  function pickProfile(src) {
    const p = {};
    PROFILE_FIELDS.forEach((k) => { p[k] = src[k]; });
    return p;
  }
  async function saveProfile(src) {
    state.profile = pickProfile(src);
    await S.set('profile', JSON.stringify(state.profile));
  }

  /* ---------- Баланс ---------- */
  async function addBalance(n) {
    state.balance = Math.max(0, state.balance + n);
    await S.set('balance', String(state.balance));
  }

  /* ---------- Отчёты ---------- */
  function totalMs() { return DATA.STAGES.length * CONFIG.STAGE_MS; }

  async function createReport(draft) {
    const now = Date.now();
    const id = now.toString(36);
    const rec = Object.assign(pickProfile(draft), {
      id, goalId: draft.goalId, createdAt: now, readyAt: now + totalMs(), done: []
    });
    state.reports[id] = rec;
    state.reportIds.unshift(id);
    await S.set('r_' + id, JSON.stringify(rec));
    await S.set('reports', JSON.stringify(state.reportIds));
    await saveProfile(draft);   // запоминаем бизнес для следующих исследований
    await addBalance(-1);
    return rec;
  }

  function getReport(id) { return state.reports[id] || null; }
  function listReports() { return state.reportIds.map((id) => state.reports[id]).filter(Boolean); }
  function isReady(rec) { return Date.now() >= rec.readyAt; }

  async function toggleStep(id, stepId) {
    const r = state.reports[id];
    if (!r) return;
    const i = r.done.indexOf(stepId);
    if (i >= 0) r.done.splice(i, 1); else r.done.push(stepId);
    await S.set('r_' + id, JSON.stringify(r));
  }

  /* ---------- Сброс (кнопка в Профиле) ---------- */
  async function resetAll() {
    await S.remove(['profile', 'balance', 'reports'].concat(state.reportIds.map((id) => 'r_' + id)));
    state.profile = {}; state.reportIds = []; state.reports = {}; state.draft = emptyDraft();
    state.balance = CONFIG.FREE_RESEARCHES;
    await S.set('balance', String(state.balance));
  }

  return { state, load, startDraft, saveProfile, addBalance, createReport, getReport, listReports, isReady, toggleStep, resetAll };
})();
