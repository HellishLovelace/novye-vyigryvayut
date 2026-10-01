/* Участники: демо-генератор, разбор CSV, аватары, честный рандом. */
(function () {
  // ---------- Честный случайный выбор (crypto, без смещения) ----------
  function randInt(n) {
    if (n <= 0) return 0;
    var max = Math.floor(0x100000000 / n) * n, buf = new Uint32Array(1), x;
    do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= max);
    return x % n;
  }
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = randInt(i + 1), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // ---------- Демо-участники ----------
  var SURN = ['Иванов','Смирнов','Кузнецов','Попов','Васильев','Петров','Соколов','Михайлов','Новиков','Фёдоров',
    'Морозов','Волков','Алексеев','Лебедев','Семёнов','Егоров','Павлов','Козлов','Степанов','Николаев',
    'Орлов','Андреев','Макаров','Никитин','Захаров','Зайцев','Соловьёв','Борисов','Яковлев','Григорьев',
    'Романов','Воробьёв','Сергеев','Кузьмин','Фролов','Александров','Дмитриев','Королёв','Гусев','Киселёв',
    'Ильин','Максимов','Поляков','Сорокин','Виноградов','Ковалёв','Белов','Медведев','Антонов','Тарасов',
    'Жуков','Баранов','Филиппов','Комаров','Давыдов','Беляев','Герасимов','Богданов','Осипов','Сидоров'];
  var M = ['Александр','Дмитрий','Максим','Сергей','Андрей','Алексей','Артём','Илья','Кирилл','Михаил',
    'Никита','Матвей','Роман','Егор','Арсений','Иван','Денис','Евгений','Тимофей','Владимир','Павел','Глеб'];
  var F = ['Анастасия','Мария','Анна','Виктория','Екатерина','Наталья','Марина','Полина','Дарья','Алина',
    'Ксения','Елизавета','Ольга','Татьяна','Софья','Вероника','Юлия','Алёна','Ирина','Светлана','Ева','Кира'];
  // Регионы финала; Приморский край чаще — как в реальном списке
  var TOWNS = ['Приморский край', 'Приморский край', 'Приморский край', 'Приморский край', 'Приморский край',
    'Хабаровский край', 'Забайкальский край', 'Сахалинская область', 'Амурская область', 'Магаданская область'];

  function femSurname(s) {
    if (/ов$|ев$|ёв$|ин$/.test(s)) return s + 'а';
    return s;
  }
  function demo(n) {
    var list = [], seen = {};
    while (list.length < n) {
      var fem = randInt(2) === 1;
      var s = SURN[randInt(SURN.length)], f = fem ? F[randInt(F.length)] : M[randInt(M.length)];
      var key = s + f + fem;
      if (seen[key] && list.length < 1500) continue;
      seen[key] = 1;
      list.push({ id: 'demo' + list.length, surname: fem ? femSurname(s) : s, name: f,
        town: TOWNS[randInt(TOWNS.length)], photo: '' });
    }
    return list;
  }

  // ---------- CSV ----------
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    var first = text.split(/\r?\n/)[0] || '';
    var delim = (first.split(';').length > first.split(',').length) ? ';'
      : (first.split('\t').length > first.split(',').length ? '\t' : ',');
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return x.trim(); }); });
  }

  // Понимает выгрузку листа «Участники» (VK ID, ФИО, Регион…) и листа «Финал»
  // из apps-script/final-export.gs (VK ID, Фамилия, Имя, Регион, Фото).
  function fromCSV(text) {
    var rows = parseCSV(text);
    if (rows.length < 2) throw new Error('В файле нет строк с участниками');
    var h = rows[0].map(function (x) { return x.trim().toLowerCase(); });
    function col(re) { for (var i = 0; i < h.length; i++) if (re.test(h[i])) return i; return -1; }
    var cId = col(/vk\s*id|^id$/), cFio = col(/фио|^name$|^full/), cSur = col(/фамил|surname|last/),
        cName = col(/^имя$|first/), cTown = col(/насел|город|регион|town|city|region/),
        cPhoto = col(/фото|photo|avatar/), cStatus = col(/статус|status/);
    if (cFio < 0 && cSur < 0 && cId < 0) throw new Error('Не найдены колонки ФИО / Фамилия / VK ID');

    var list = [], seen = {};
    for (var r = 1; r < rows.length; r++) {
      var x = rows[r], get = function (i) { return i >= 0 ? String(x[i] || '').trim() : ''; };
      var id = get(cId), surname = get(cSur), name = get(cName);
      if (!surname && !name) {
        var parts = get(cFio).split(/\s+/).filter(Boolean);
        surname = parts[0] || ''; name = parts[1] || '';
      }
      if (!surname && !name) { if (!id) continue; surname = 'VK id' + id; }
      if (/отклон|дисквал/i.test(get(cStatus))) continue;
      var key = id || (surname + ' ' + name + ' ' + get(cTown));
      if (seen[key]) continue; // один человек — один шанс
      seen[key] = 1;
      list.push({ id: id || ('row' + r), surname: surname, name: name, town: get(cTown), photo: get(cPhoto) });
    }
    if (!list.length) throw new Error('Не удалось прочитать ни одного участника');
    return list;
  }

  // Список из веб-приложения Apps Script: [{id, surname, name, town, photo}]
  function fromList(arr) {
    var list = [], seen = {};
    (arr || []).forEach(function (p, i) {
      var id = String(p.id || ''), surname = String(p.surname || '').trim(), name = String(p.name || '').trim();
      if (!surname && !name) { if (!id) return; surname = 'VK id' + id; }
      var key = id || (surname + ' ' + name);
      if (seen[key]) return;
      seen[key] = 1;
      list.push({ id: id || ('row' + i), surname: surname, name: name, town: String(p.town || '').trim(), photo: String(p.photo || '') });
    });
    if (!list.length) throw new Error('В таблице нет участников');
    return list;
  }

  // ---------- Аватар-заглушка, если нет фото ----------
  var PAL = [['#0ad1c9', '#0ba8a2'], ['#f26b7c', '#ef4056'], ['#0ba8a2', '#067a76'], ['#ef4056', '#c92a45']];
  var cache = {};
  function avatar(p) {
    if (p.photo) return p.photo;
    if (cache[p.id]) return cache[p.id];
    var h = 0, s = p.id + p.surname;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    var c = PAL[h % PAL.length];
    var ini = ((p.surname || '')[0] || '') + ((p.name || '')[0] || '');
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></linearGradient></defs>' +
      '<rect width="200" height="200" fill="url(#g)"/>' +
      '<circle cx="100" cy="82" r="38" fill="#fff" opacity=".22"/><path d="M34 200c6-44 34-66 66-66s60 22 66 66z" fill="#fff" opacity=".22"/>' +
      '<text x="100" y="118" font-family="Unbounded,Arial" font-weight="700" font-size="64" fill="#fff" text-anchor="middle">' + ini + '</text></svg>';
    return (cache[p.id] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  }

  // Фото из VK может не загрузиться (устарела ссылка, закрыт профиль) — тогда аватар с инициалами
  function setPhoto(img, p) {
    img.onerror = function () { img.onerror = null; img.src = avatar({ id: p.id, surname: p.surname, name: p.name, photo: '' }); };
    img.src = avatar(p);
  }

  window.Data = { randInt: randInt, shuffle: shuffle, demo: demo, fromCSV: fromCSV, fromList: fromList, avatar: avatar, setPhoto: setPhoto };
})();
