/*
 * store.js — состояние приложения и его сохранение.
 *
 * Что хранится (ключи в Telegram CloudStorage / localStorage):
 *   profile   — данные о бизнесе (ниша, роль, гео…), JSON
 *   access    — до какого момента действует пакет «Стандарт» (мс с 1970), число
 *   reports   — список id отчётов, JSON-массив (новые первыми)
 *   r_<id>    — один отчёт: параметры + отмеченные шаги плана, JSON
 *   bonus     — '1', если бонус за подписку на бота уже получен
 *   onboarded — '1', если экран приветствия уже показан
 *   referrer  — id пригласившего пользователя (из ссылки ref_<id>)
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
    accessUntil: 0,        // пакет «Стандарт» действует до этого момента (мс)
    reportIds: [],
    reports: {},
    draft: emptyDraft(),
    bonusClaimed: false,   // бонус за подписку на бота уже получен
    onboarded: false,      // экран приветствия уже показан
    referrer: '',          // кто пригласил (id из ссылки ref_<id>)
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
    const base = await S.getMany(['profile', 'access', 'reports', 'bonus', 'referrer', 'onboarded']);
    state.profile = parse(base.profile, {});
    state.onboarded = base.onboarded === '1';
    state.bonusClaimed = base.bonus === '1';
    state.referrer = base.referrer || '';
    state.reportIds = parse(base.reports, []);
    state.accessUntil = parseInt(base.access, 10) || 0;
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

  /* ---------- Доступ «Стандарт» ---------- */
  function hasAccess() { return Date.now() < state.accessUntil; }

  // Продлить доступ на days дней (от текущего окончания, если пакет ещё действует)
  async function addDays(days) {
    state.accessUntil = Math.max(Date.now(), state.accessUntil) + days * 86400000;
    await S.set('access', String(state.accessUntil));
  }

  // Приветствие показано — больше не показываем
  async function setOnboarded() {
    state.onboarded = true;
    await S.set('onboarded', '1');
  }

  // Бонус за подписку на бота — один раз
  async function claimBonus() {
    if (state.bonusClaimed) return false;
    state.bonusClaimed = true;
    await S.set('bonus', '1');
    const bonusPlan = CONFIG.PLANS.find((p) => p.bonus);
    await addDays(bonusPlan ? bonusPlan.days : 1);
    return true;
  }

  // Запомнить пригласившего (только первый раз и не самого себя)
  async function setReferrer(id) {
    if (state.referrer || !id || String(id) === String(TG.user().id)) return;
    state.referrer = String(id);
    await S.set('referrer', state.referrer);
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
    await S.remove(['profile', 'access', 'balance', 'reports', 'bonus', 'onboarded'].concat(state.reportIds.map((id) => 'r_' + id)));
    state.profile = {}; state.reportIds = []; state.reports = {}; state.draft = emptyDraft();
    state.bonusClaimed = false; state.onboarded = false; state.accessUntil = 0;
  }

  return { state, load, startDraft, saveProfile, hasAccess, addDays, setOnboarded, claimBonus, setReferrer, createReport, getReport, listReports, isReady, toggleStep, resetAll };
})();
