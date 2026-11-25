/*
 * report.js — собирает содержимое отчёта из параметров анкеты.
 *
 * v1 (демо): берёт материалы из data.js по нише и цели.
 * v2: эту функцию заменит запрос к серверу (fetch('/api/reports/' + id)),
 *     который вернёт тот же формат объекта — экраны менять не придётся.
 *
 * Формат результата:
 * { nicheTitle, emoji, goal, insights[5], risks[], competitors[], news[], plan:{week,month,quarter}, stepsTotal }
 */
window.Report = (function () {

  function nicheTitle(rec) {
    const n = DATA.niche(rec.nicheId);
    const base = rec.nicheId === 'custom' ? (rec.customNiche || 'Своя ниша') : (n ? n.title : 'Ниша');
    return rec.sub ? base + ' · ' + rec.sub : base;
  }

  function nicheEmoji(rec) {
    const n = DATA.niche(rec.nicheId);
    return rec.nicheId === 'custom' ? '🧩' : (n ? n.emoji : '🧩');
  }

  function build(rec) {
    const content = DATA.NICHE_CONTENT[rec.nicheId] || DATA.NICHE_CONTENT.custom;
    const goal = DATA.goal(rec.goalId) || DATA.GOALS[5];
    const plans = DATA.GOAL_PLANS[goal.id];

    // Новости: нишевые + общие, свежие сверху. Даты считаем от даты создания отчёта.
    const news = content.news.concat(DATA.COMMON_NEWS)
      .map((n) => Object.assign({}, n, {
        date: new Date(rec.createdAt - n.daysAgo * 86400000),
        url: DATA.SOURCES[n.source] || ''
      }))
      .sort((a, b) => a.daysAgo - b.daysAgo);

    // 5 выводов: 3 по нише + 2 по цели
    const insights = content.insights.concat(DATA.GOAL_INSIGHTS[goal.id]).slice(0, 5);

    // Риски: нишевые + налоговый (если его ещё нет)
    const risks = content.risks.slice();
    if (!risks.some((r) => /налог/i.test(r))) risks.push('Рост налоговой нагрузки с 2027 года');

    // План: шаг ниши + шаги цели. id шагов нужны для сохранения галочек.
    const tag = (arr, prefix) => arr.map((s, i) => Object.assign({ id: prefix + i }, s));
    const nicheStep = Object.assign({ effect: 'высокий', effort: 'низкие' }, content.step);
    const plan = {
      week: tag([nicheStep].concat(plans.week), 'w'),
      month: tag(plans.month, 'm'),
      quarter: tag(plans.quarter, 'q')
    };

    return {
      nicheTitle: nicheTitle(rec),
      emoji: nicheEmoji(rec),
      goal,
      insights,
      risks,
      competitors: (rec.competitors || []).slice(0, 3),
      news,
      plan,
      stepsTotal: plan.week.length + plan.month.length + plan.quarter.length
    };
  }

  // Текст для кнопки «Поделиться»
  function shareText(rec) {
    const r = build(rec);
    const lines = r.insights.slice(0, 3).map((i) => i.icon + ' ' + i.b + ' ' + i.t);
    return r.emoji + ' ' + r.nicheTitle + ' — исследование ' + CONFIG.APP_NAME + '\n\n' + lines.join('\n');
  }

  // Лента «Последние новости» для Главной: новости всех ниш + общие, свежие сверху.
  // nicheId — фильтр по нише ('' — все). v2: заменить на запрос к серверу.
  function latestNews(nicheId) {
    const items = [];
    DATA.NICHES.forEach((n) => {
      if (nicheId && nicheId !== n.id) return;
      (DATA.NICHE_CONTENT[n.id].news || []).forEach((x) => items.push(Object.assign({}, x, { nicheId: n.id, nicheTitle: n.title, nicheEmoji: n.emoji })));
    });
    if (!nicheId || nicheId === 'all-business') {
      DATA.COMMON_NEWS.forEach((x) => items.push(Object.assign({}, x, { nicheId: '', nicheTitle: 'Весь бизнес', nicheEmoji: '🌐' })));
    }
    return items
      .map((x) => Object.assign(x, { date: new Date(Date.now() - x.daysAgo * 86400000), url: DATA.SOURCES[x.source] || '' }))
      .sort((a, b) => a.daysAgo - b.daysAgo);
  }

  return { build, nicheTitle, nicheEmoji, shareText, latestNews };
})();
