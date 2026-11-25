/*
 * screens/goal.js — шаг 3 «Зачем исследование?». Далее → шаг 4 «Компания».
 * 6 крупных карточек целей (DATA.GOALS). От цели зависят выводы и план в отчёте.
 */
Router.register('goal', {
  render(params) {
    const c = Store.state.draft;
    return '<div class="page">' +
      Screens.steps(3, params) +
      '<h1 class="title">Зачем исследование?</h1>' +
      '<div class="goal-list">' +
      DATA.GOALS.map((g) =>
        '<button class="goal tap' + (c.goalId === g.id ? ' selected' : '') + '" data-goal="' + g.id + '" type="button">' +
          '<span class="goal-emoji">' + g.emoji + '</span>' +
          '<span class="goal-text"><span class="goal-title">' + g.title + '</span><span class="goal-hint">' + g.hint + '</span></span>' +
          '<span class="goal-radio"></span>' +
        '</button>'
      ).join('') +
      '</div></div>';
  },

  mount(el, params) {
    const c = Store.state.draft;
    const updateBtn = Screens.formButton(params, () => !!c.goalId, 'company');
    el.addEventListener('click', (e) => {
      const g = e.target.closest('[data-goal]');
      if (!g) return;
      TG.haptic.select();
      c.goalId = g.dataset.goal;
      el.querySelectorAll('.goal').forEach((x) => x.classList.toggle('selected', x === g));
      updateBtn();
    });
  }
});
