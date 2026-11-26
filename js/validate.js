/*
 * validate.js — правила проверки полей анкеты (защита от неверных и фиктивных данных).
 * Каждая функция возвращает '' если всё верно, иначе — текст ошибки для показа под полем.
 *
 *   Validate.fio(v)            — ФИО: 2–3 слова, только русские буквы
 *   Validate.phone(v)          — российский номер +7, 10 цифр после кода страны, не «повторы»
 *   Validate.formatPhone(v)    — маска «+7 (999) 123-45-67»
 *   Validate.inn(v)            — ИНН: 10 (организация) или 12 (ИП) цифр, контрольные числа, код региона
 *   Validate.company(v, inn)   — название с формой собственности, согласованной с ИНН
 *   Validate.city(v)           — настоящее название города
 *   Validate.text(v, min)      — осмысленный текст (своя ниша и т. п.)
 *
 * Обязательность полей решает экран: необязательное пустое поле не проверяется.
 */
window.Validate = (function () {
  const VOWEL = /[аеёиоуыэюяaeiouy]/i;
  const RU_WORD = /^[А-ЯЁа-яё]+(?:-[А-ЯЁа-яё]+)*$/;

  // Признаки «мусора»: 4+ одинаковых символа подряд или нет ни одной гласной
  function looksFake(s) { return /(.)\1{3,}/i.test(s) || !VOWEL.test(s); }

  /* ---------- ФИО ---------- */
  function fio(v) {
    const s = String(v || '').trim().replace(/\s+/g, ' ');
    if (!s) return 'Укажите фамилию, имя и отчество';
    const words = s.split(' ');
    if (words.length < 2) return 'Укажите фамилию и имя полностью';
    if (words.length > 3) return 'Только фамилия, имя и отчество — до трёх слов';
    if (!words.every((w) => RU_WORD.test(w))) return 'Только русские буквы, без цифр и сокращений';
    if (words.some((w) => w.replace(/-/g, '').length < 2)) return 'Имя и фамилия — полностью, не инициалы';
    if (words.some(looksFake)) return 'Похоже на ненастоящее имя — проверьте';
    return '';
  }

  /* ---------- Телефон (+7) ---------- */
  // Оставляет 11 цифр, начиная с 7 (8XXXXXXXXXX и XXXXXXXXXX → 7XXXXXXXXXX)
  function phoneDigits(v) {
    let d = String(v || '').replace(/\D/g, '');
    if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1);
    if (d.length === 10 && /^[3489]/.test(d)) d = '7' + d;
    return d;
  }
  function phone(v) {
    if (!String(v || '').trim()) return 'Укажите номер телефона';
    const d = phoneDigits(v);
    if (d[0] !== '7') return 'Нужен российский номер, начинается с +7';
    if (d.length !== 11) return 'Номер в формате +7 (XXX) XXX-XX-XX — 10 цифр после +7';
    const n = d.slice(1);
    if (!/^[3489]/.test(n)) return 'Код после +7 начинается с 3, 4, 8 или 9';
    if (/(\d)\1{5,}/.test(n) || /^(\d)\1+$/.test(n.slice(3))) return 'Похоже на ненастоящий номер — проверьте';
    // Последние 7 цифр (номер абонента) идут подряд: 123-45-67, 765-43-21
    if (/^(0123456|1234567|2345678|3456789|9876543|8765432|7654321|6543210)$/.test(n.slice(3))) return 'Похоже на ненастоящий номер — проверьте';
    return '';
  }
  // Маска при вводе: +7 (XXX) XXX-XX-XX
  function formatPhone(v) {
    let d = String(v || '').replace(/\D/g, '');
    if (!d) return '';
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    const p = d.slice(1);
    let out = '+7';
    if (p.length) out += ' (' + p.slice(0, 3);
    if (p.length >= 3) out += ')';
    if (p.length > 3) out += ' ' + p.slice(3, 6);
    if (p.length > 6) out += '-' + p.slice(6, 8);
    if (p.length > 8) out += '-' + p.slice(8, 10);
    return out;
  }

  /* ---------- ИНН ---------- */
  function innChecksum(s) {
    const d = s.split('').map(Number);
    const check = (coef) => coef.reduce((sum, k, i) => sum + k * d[i], 0) % 11 % 10;
    if (s.length === 10) return check([2, 4, 10, 3, 5, 9, 4, 6, 8]) === d[9];
    return check([7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === d[10] && check([3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === d[11];
  }
  function inn(v) {
    const s = String(v || '');
    if (!s) return 'Укажите ИНН';
    if (!/^\d+$/.test(s)) return 'ИНН — только цифры';
    if (s.length !== 10 && s.length !== 12) return 'ИНН — 10 цифр у организации или 12 у ИП (сейчас ' + s.length + ')';
    if (/^(\d)\1+$/.test(s) || s.slice(0, 2) === '00') return 'Такого ИНН не существует — проверьте';
    if (!innChecksum(s)) return 'ИНН с ошибкой — не сходятся контрольные цифры';
    return '';
  }

  /* ---------- Название компании ---------- */
  const ORG_FORMS = ['ООО', 'АО', 'ПАО', 'НАО', 'ЗАО', 'ОАО', 'ГУП', 'МУП', 'ФГУП', 'ФГБУ', 'ГБУ', 'МБУ', 'АНО', 'НКО', 'ПК', 'СПК', 'ТСЖ', 'СНТ', 'НП', 'ООО ТД', 'АНОО'];
  function company(v, innValue) {
    const s = String(v || '').trim().replace(/\s+/g, ' ');
    if (!s) return 'Укажите название компании';
    const len = String(innValue || '').length;
    const isIP = /^ИП\s/i.test(s);
    const form = ORG_FORMS.find((f) => new RegExp('^' + f + '(\\s|«|"|$)', 'i').test(s));
    const name = s.replace(/^(ИП|[А-ЯЁ]{2,5})\s*/i, '').replace(/[«»"'“”]/g, '').trim();
    if (len === 12) {
      if (!isIP) return 'ИНН из 12 цифр — это ИП: «ИП Фамилия Имя Отчество»';
      const words = name.split(' ');
      if (words.length < 2 || !words.every((w) => RU_WORD.test(w))) return 'Для ИП: «ИП Фамилия Имя Отчество» полностью';
    } else if (len === 10) {
      if (!form) return 'Укажите форму и название: ООО «Ромашка», АО «Звезда»';
    } else if (!form && !isIP) {
      return 'Укажите форму: ООО «Ромашка» или ИП Иванов Иван Иванович';
    }
    if (name.replace(/[^А-ЯЁа-яёA-Za-z]/g, '').length < 2) return 'Укажите название полностью';
    if (/(.)\1{3,}/i.test(name)) return 'Похоже на ненастоящее название — проверьте';
    return '';
  }

  /* ---------- Город ---------- */
  function city(v) {
    const s = String(v || '').trim();
    if (!s) return 'Укажите город';
    if (!/^[А-ЯЁа-яё][А-ЯЁа-яё\s.-]+$/.test(s) || s.replace(/[^А-ЯЁа-яё]/g, '').length < 2) return 'Название города — русскими буквами';
    if (looksFake(s)) return 'Похоже на ненастоящий город — проверьте';
    return '';
  }

  /* ---------- Осмысленный текст ---------- */
  function text(v, min) {
    const s = String(v || '').trim();
    const letters = s.replace(/[^А-ЯЁа-яёA-Za-z]/g, '');
    if (letters.length < (min || 3)) return 'Опишите подробнее — хотя бы ' + (min || 3) + ' буквы';
    if (looksFake(s)) return 'Похоже на случайный набор букв — опишите нишу словами';
    return '';
  }

  return { fio, phone, phoneDigits, formatPhone, inn, innChecksum, company, city, text };
})();
