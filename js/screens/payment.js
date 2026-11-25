/*
 * screens/payment.js — «Оплата» пакетов исследований в Telegram Stars.
 * Пакеты и цены — CONFIG.PACKAGES.
 *
 * v1 (демо): оплата имитируется подтверждением, баланс пополняется сразу.
 * v2: сервер создаёт ссылку на счёт (Bot API createInvoiceLink, currency XTR),
 *     здесь вызываем Telegram.WebApp.openInvoice(link, status => …),
 *     а баланс начисляет сервер после successful_payment.
 */
Router.register('payment', {
  render() {
    const sel = (CONFIG.PACKAGES.find((p) => p.best) || CONFIG.PACKAGES[0]).id;
    return '<div class="page">' +
      '<h1 class="title">Пакеты исследований</h1>' +
      '<div class="hint">Оплата в Telegram Stars ⭐</div>' +
      '<div class="packs">' +
      CONFIG.PACKAGES.map((p) =>
        '<button class="pack card tap' + (p.id === sel ? ' selected' : '') + '" data-pack="' + p.id + '" type="button">' +
          (p.best ? '<span class="pack-ribbon">Выгодно</span>' : '') +
          '<span class="pack-count">' + p.count + '</span>' +
          '<span class="pack-main"><span class="pack-label">' + p.label + '</span>' +
          '<span class="hint">' + Screens.fmt(Math.round(p.price / p.count)) + ' ⭐ за исследование' + (p.save ? ' · ' + p.save : '') + '</span></span>' +
          '<span class="pack-price">⭐ ' + Screens.fmt(p.price) + '</span>' +
        '</button>'
      ).join('') +
      '</div>' +
      '<div class="demo-note">Демо: настоящая оплата подключится вместе с сервером</div>' +
    '</div>';
  },

  mount(el, params) {
    let pack = CONFIG.PACKAGES.find((p) => p.best) || CONFIG.PACKAGES[0];
    let paying = false;
    const btnText = () => 'Оплатить ⭐ ' + Screens.fmt(pack.price);

    TG.mainButton.show({
      text: btnText(),
      onClick: async () => {
        if (paying) return;
        paying = true;
        const ok = await TG.confirm('Демо-оплата: зачислить ' + Screens.balanceText(pack.count) + ' за ⭐ ' + Screens.fmt(pack.price) + '?');
        if (ok) {
          await Store.addBalance(pack.count);
          TG.haptic.success();
          UI.toast('Зачислено: ' + Screens.balanceText(pack.count));
          Router.back();   // вернёт на «Подтверждение» (returnTo) или в Профиль/Главную
        }
        paying = false;
      }
    });

    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pack]');
      if (!b) return;
      TG.haptic.select();
      pack = CONFIG.PACKAGES.find((p) => p.id === b.dataset.pack);
      el.querySelectorAll('.pack').forEach((x) => x.classList.toggle('selected', x === b));
      TG.mainButton.update({ text: btnText() });
    });
  }
});
