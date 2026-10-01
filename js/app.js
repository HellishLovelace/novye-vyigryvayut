(function () {
  var $ = function (id) { return document.getElementById(id); };
  var RESERVE_COUNT = 10;
  var ITEM_H = 132, NODES = 9, V_MAX = 20; // высота карточки, карточек на барабане, скорость (карточек/с)
  var DRUM_R = 380, DRUM_STEP = ITEM_H / DRUM_R; // радиус цилиндра и угол между карточками (рад)

  // ---------- Состояние ----------
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('nb_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('nb_' + k, JSON.stringify(v)); } catch (e) {} }
  };
  var settings = { auto: store.get('auto', 10), sound: store.get('sound', true), exclude: store.get('exclude', true) };
  var participants = store.get('participants', null), source = store.get('source', '');
  if (!participants || !participants.length) { participants = Data.demo(400); source = 'демо'; }
  var history = store.get('history', []);
  var current = null; // { winner, reserves, time }
  var screen = 'intro';

  // ---------- Масштаб сцены ----------
  // Базовая высота 1080. Если экран шире 16:9 — сцена расширяется (фон и волны до краёв),
  // если уже — расширяется по высоте. Центральный контент всегда в зоне 1920×1080.
  Confetti.init($('confetti'));
  function fit() {
    var ar = innerWidth / innerHeight, W = 1920, H = 1080;
    if (ar >= 16 / 9) W = Math.round(1080 * ar); else H = Math.round(1920 / ar);
    var st = $('stage');
    st.style.width = W + 'px'; st.style.height = H + 'px'; st.style.setProperty('--H', H + 'px');
    st.style.transform = 'translate(-50%,-50%) scale(' + (innerWidth / W) + ')';
    Confetti.resize(W, H);
  }
  addEventListener('resize', fit); fit();

  // ---------- Звук ----------
  var ac = null, lastTick = 0;
  function audio() {
    if (!settings.sound) return null;
    if (!ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, dur, type, vol, delay) {
    var a = audio(); if (!a) return;
    var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function tick() { var n = performance.now(); if (n - lastTick > 45) { lastTick = n; tone(1400, 0.03, 'square', 0.025); } }
  function fanfare() { [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { tone(f, i === 5 ? 0.9 : 0.22, 'triangle', 0.12, i * 0.13); }); }

  // ---------- Экраны ----------
  function show(name) {
    screen = name;
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.toggle('active', s.id === 'screen-' + name); });
    if (name === 'intro') countUp();
    if (name !== 'winner') $('kites').innerHTML = '';
  }

  // ---------- 1. Главная: главный приз и летающие предметы ----------
  $('bg').innerHTML = BG_SVG;
  document.querySelectorAll('[data-brush]').forEach(function (el, i) { brushify(el, 11 + i * 31); });
  DECOR.forEach(function (d) {
    var el = document.createElement('div');
    el.className = 'fly ' + d[0];
    el.innerHTML = DECOR_ITEMS[d[0]];
    el.style.cssText = 'left:' + (d[1] - d[3] / 2) + 'px;top:' + (d[2] - d[3] / 2) + 'px;width:' + d[3] + 'px;--d:' + d[4] + 's;--dl:' + d[5] + 's';
    $('decor').appendChild(el);
  });
  var PRIZE_SUM = 1500000, countRaf = 0;
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function countUp() {
    cancelAnimationFrame(countRaf);
    var t0 = performance.now() + 250, T = 2200;
    (function step(t) {
      var k = Math.max(0, Math.min(1, (t - t0) / T));
      $('amount').textContent = fmt(Math.round(PRIZE_SUM * (1 - Math.pow(1 - k, 4)) / 1000) * 1000);
      if (k < 1) countRaf = requestAnimationFrame(step);
    })(performance.now());
  }

  // ---------- 2. Барабан ----------
  var reelNodes = [];
  for (var i = 0; i < NODES; i++) {
    var n = document.createElement('div');
    n.className = 'card';
    n.innerHTML = '<img alt=""><div class="c-text"><div class="c-name"></div><div class="c-town"></div></div>';
    $('reel-items').appendChild(n);
    reelNodes.push({ el: n, img: n.querySelector('img'), name: n.querySelector('.c-name'), town: n.querySelector('.c-town'), slot: null });
  }
  var reel = { state: 'idle', p: 0, v: 0, slots: {}, last: 0, t0: 0, stop: null, winner: null, lastSlot: 0 };

  function slotPerson(k) {
    if (!reel.slots[k]) {
      var p, prev = reel.slots[k - 1], tries = 0;
      do { p = participants[Data.randInt(participants.length)]; } while (prev && p === prev && participants.length > 1 && tries++ < 5);
      reel.slots[k] = p;
    }
    return reel.slots[k];
  }
  function fill(node, p) {
    node.img.src = Data.avatar(p);
    node.name.textContent = p.surname + ' ' + p.name;
    node.town.textContent = p.town || '';
  }
  // Карточки лежат на поверхности цилиндра: чем дальше от центра, тем сильнее повёрнуты
  function renderReel() {
    var base = Math.floor(reel.p), mid = $('reel').clientHeight / 2;
    var blur = Math.min(4, reel.v / 5);
    reelNodes.forEach(function (nd, j) {
      var k = base - Math.floor(NODES / 2) + j;
      if (nd.slot !== k) { nd.slot = k; fill(nd, slotPerson(k)); }
      var a = (k - reel.p) * DRUM_STEP;
      if (Math.abs(a) > 1.5) { nd.el.style.visibility = 'hidden'; return; }
      nd.el.style.visibility = '';
      nd.el.style.transform = 'translateY(' + (mid - ITEM_H / 2) + 'px) translateZ(' + (-DRUM_R) + 'px) rotateX(' + (-a) + 'rad) translateZ(' + DRUM_R + 'px)';
      nd.el.style.opacity = Math.max(0, Math.cos(a) * 1.25 - 0.2).toFixed(3);
      nd.el.style.filter = blur > 0.5 ? 'blur(' + blur.toFixed(1) + 'px)' : 'none';
      nd.el.classList.toggle('hit', reel.state === 'done' && reel.landed && k === reel.stop.target);
    });
    var cur = Math.round(reel.p);
    if (cur !== reel.lastSlot) { reel.lastSlot = cur; tick(); }
  }

  // Сап-борд: едет от левого края к флажку «Финиш», качается на волне, за ним брызги
  var supProg = 0, supX = 0, lastDrop = 0;
  function setSup(prog, label) {
    supProg = prog;
    var W = $('sea').clientWidth, x0 = 60, x1 = W - 860; // доска останавливается перед причалом — дальше нерпа прыгает сама
    var x = x0 + prog * (x1 - x0), t = performance.now() / 1000;
    var bob = Math.sin(t * 3.2) * 7, tilt = Math.cos(t * 3.2) * 3 - (reel.v > 2 ? 2 : 0);
    supX = x;
    $('sup-rider').style.transform = 'translate(' + x + 'px,' + bob + 'px) rotate(' + tilt + 'deg)';
    $('sup-trail').style.width = Math.max(0, x + 20) + 'px';
    $('sup-label').textContent = label || (Math.floor(prog * 100) + '%');
    if (reel.v > 3 && t - lastDrop > 0.03) { lastDrop = t; splash(x + 30, 80 - bob, reel.v / V_MAX); }
  }
  function splash(x, y, power) {
    var sea = $('sea');
    for (var i = 0; i < 2; i++) {
      var d = document.createElement('div');
      d.className = 'drop';
      var sz = 6 + Math.random() * 12;
      d.style.cssText = 'left:' + x + 'px;bottom:' + y + 'px;width:' + sz + 'px;height:' + sz + 'px;' +
        '--dx:' + (-(60 + Math.random() * 140) * power) + 'px;--dy:' + (-(20 + Math.random() * 70) * power) + 'px';
      sea.appendChild(d);
      setTimeout(function (el) { el.remove(); }, 800, d);
    }
  }

  function reelFrame(t) {
    var dt = Math.min(0.05, (t - reel.last) / 1000); reel.last = t;
    var el = (t - reel.t0) / 1000;
    if (reel.state === 'spin') {
      reel.v = Math.min(V_MAX, reel.v + V_MAX * dt * 1.2);
      reel.p += reel.v * dt;
      var prog = settings.auto > 0 ? Math.min(1, el / settings.auto) : Math.min(0.97, el / 30);
      setSup(prog, 'Ищем… ' + Math.floor(prog * 100) + '%');
      if (settings.auto > 0 && prog >= 1) stopReel();
    } else if (reel.state === 'stopping') {
      var s = reel.stop, k = Math.min(1, (t - s.t) / (s.T * 1000));
      reel.p = s.p0 + (s.target - s.p0) * (1 - Math.pow(1 - k, 3));
      reel.v = (3 * (s.target - s.p0) / s.T) * Math.pow(1 - k, 2);
      setSup(s.prog0 + (1 - s.prog0) * k, 'Ищем… ' + Math.floor((s.prog0 + (1 - s.prog0) * k) * 100) + '%');
      if (k >= 1) { reel.state = 'done'; reel.v = 0; reel.p = s.target; onReelDone(); }
    }
    if (reel.state === 'done') setSup(1, reel.landed ? 'Найден!' : 'Ищем… 100%');
    renderReel();
    if (reel.state !== 'idle' && screen === 'draw') requestAnimationFrame(reelFrame); // доска качается и после остановки
  }

  function startDraw() {
    if (!participants.length) return;
    Confetti.stop();
    current = null;
    reel.state = 'spin'; reel.v = 0; reel.slots = {}; reel.p = 0; reel.winner = null;
    reelNodes.forEach(function (n) { n.slot = null; });
    $('btn-stop').disabled = false;
    $('screen-draw').classList.remove('found', 'jumped', 'landed');
    reel.landed = false;
    $('jumper').getAnimations().forEach(function (an) { an.cancel(); });
    $('screen-draw').classList.add('spinning');
    $('draw-heading').textContent = 'Бот ищет победителя…';
    show('draw');
    setSup(0);
    reel.t0 = reel.last = performance.now();
    requestAnimationFrame(reelFrame);
  }

  function stopReel() {
    if (reel.state !== 'spin') return;
    $('btn-stop').disabled = true;
    // Победитель определяется в момент нажатия «Стоп» — криптографически случайно
    var winner = participants[Data.randInt(participants.length)];
    var v = Math.max(reel.v, 6), T0 = 4.5;
    var target = Math.ceil(reel.p + v * T0 / 3);
    var T = 3 * (target - reel.p) / v;
    reel.slots[target] = winner;
    // Соседи победителя — другие люди, чтобы не было визуального «дубля»
    [target - 1, target + 1].forEach(function (k) { if (reel.slots[k] === winner) delete reel.slots[k]; });
    reelNodes.forEach(function (n) { if (n.slot === target) n.slot = null; });
    reel.winner = winner;
    reel.stop = { p0: reel.p, target: target, T: T, t: performance.now(), prog0: supProg };
    reel.state = 'stopping';
  }

  // Финиш поиска наступает, когда до причала добирается нерпа: прыжок с доски по дуге
  function jumpToFinish(done) {
    var sd = $('screen-draw'), jp = $('jumper'), W = $('sea').clientWidth;
    var x0 = supX + 79, y0 = 100;           // ноги нерпы на палубе (картинка с запасом 36px по бокам)
    var x1 = W - 331, y1 = 106;             // ноги на причале, правее флагштока
    jp.style.left = x0 + 'px'; jp.style.bottom = y0 + 'px';
    sd.classList.add('jumped');
    splash(supX + 220, 70, 1); splash(supX + 260, 70, 1);
    var a = audio();
    if (a) { var o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
      o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.5);
      g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.65); }
    var frames = [];
    for (var i = 0; i <= 16; i++) {
      var k = i / 16, h = 4 * k * (1 - k) * 230;
      frames.push({ transform: 'translate(' + (x1 - x0) * k + 'px,' + -((y1 - y0) * k + h) + 'px) rotate(' + (-16 * Math.sin(Math.PI * k)) + 'deg)' });
    }
    var anim = jp.animate(frames, { duration: 950, fill: 'forwards' });
    anim.onfinish = function () { reel.landed = true; sd.classList.add('landed'); done(); };
  }

  function onReelDone() {
    jumpToFinish(onLanded);
  }

  function onLanded() {
    var sd = $('screen-draw');
    sd.classList.remove('spinning'); sd.classList.add('found');
    $('draw-heading').textContent = 'Победитель найден!';
    var fl = $('flash'); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
    var r = $('reel').getBoundingClientRect(), st = $('stage').getBoundingClientRect(), k = $('stage').offsetWidth / st.width;
    Confetti.burst((r.left + r.width / 2 - st.left) * k, (r.top + r.height / 2 - st.top) * k, 140);
    tone(880, 0.3, 'triangle', 0.12); tone(1320, 0.5, 'triangle', 0.1, 0.12);
    setTimeout(function () { showWinner(reel.winner); }, 1800);
  }

  // ---------- 3. Победитель ----------
  function showWinner(w) {
    current = { time: new Date().toISOString(), total: participants.length, winner: w, reserves: [] };
    $('w-photo').src = Data.avatar(w);
    $('w-surname').textContent = w.surname;
    $('w-name').textContent = w.name;
    $('w-town').textContent = w.town || '—';
    show('winner');
    fitText($('w-surname'), 110); fitText($('w-name'), 80);
    launchKites();
    Confetti.celebrate(8000);
    fanfare();
    saveHistory();
  }

  // Уменьшает шрифт, пока текст не влезет в строку
  function fitText(el, max) {
    var size = max;
    el.style.fontSize = size + 'px';
    while (el.scrollWidth > el.clientWidth && size > 40) { size -= 4; el.style.fontSize = size + 'px'; }
  }

  function launchKites() {
    var box = $('kites');
    box.innerHTML = '';
    for (var i = 0; i < 6; i++) {
      var k = document.createElement('div');
      k.className = 'wkite k' + i + (i % 2 ? ' coral' : '');
      k.innerHTML = '<img src="assets/brand/kite.png" alt="">';
      box.appendChild(k);
    }
  }

  // ---------- 4–5. Запасные ----------
  function reserveCell(p, idx) {
    return '<div class="r-num">' + (idx + 1) + '</div>' +
      (p ? '<img src="' + Data.avatar(p) + '" alt=""><div class="r-text"><div class="r-name"></div><div class="r-town"></div></div>'
         : '<div class="r-empty">?</div>');
  }
  function renderReserveGrid(list, spinning) {
    var g = $('reserve-grid');
    g.classList.toggle('spinning', !!spinning);
    g.innerHTML = '';
    for (var i = 0; i < RESERVE_COUNT; i++) {
      var p = list && list[i], d = document.createElement('div');
      d.className = 'r-cell' + (p && !spinning ? ' show' : '');
      d.innerHTML = reserveCell(p, i);
      if (p) { d.querySelector('.r-name').textContent = p.surname + ' ' + p.name; d.querySelector('.r-town').textContent = p.town || ''; }
      g.appendChild(d);
    }
  }
  function toReserve() {
    renderReserveGrid(current && current.reserves.length ? current.reserves : null);
    $('btn-reserve-run').textContent = current && current.reserves.length ? 'На главную' : 'Запустить барабан';
    Confetti.stop();
    show('reserve');
  }
  var reserveBusy = false;
  function runReserve() {
    if (reserveBusy) return;
    if (current && current.reserves.length) { goHome(); return; }
    var exclude = {};
    if (current) exclude[current.winner.id] = 1;
    if (settings.exclude) history.forEach(function (h) { exclude[h.winner.id] = 1; });
    var pool = participants.filter(function (p) { return !exclude[p.id]; });
    var picked = Data.shuffle(pool.slice()).slice(0, RESERVE_COUNT);
    reserveBusy = true;
    $('btn-reserve-run').disabled = true;
    var t0 = performance.now();
    (function flick() {
      if (performance.now() - t0 < 3000) {
        var fake = [];
        for (var i = 0; i < RESERVE_COUNT; i++) fake.push(participants[Data.randInt(participants.length)]);
        renderReserveGrid(fake, true); tick();
        setTimeout(flick, 80);
        return;
      }
      // Все 10 появляются одним списком
      renderReserveGrid(picked);
      Confetti.burst($('stage').offsetWidth / 2, $('stage').offsetHeight, 220);
      tone(660, 0.2, 'triangle', 0.1); tone(990, 0.4, 'triangle', 0.1, 0.12);
      if (current) { current.reserves = picked; saveHistory(); }
      reserveBusy = false;
      $('btn-reserve-run').disabled = false;
      $('btn-reserve-run').textContent = 'На главную';
    })();
  }

  function goHome() { reel.state = 'idle'; $('screen-draw').classList.remove('spinning', 'found', 'jumped', 'landed'); Confetti.stop(); show('intro'); }

  // ---------- Протокол ----------
  function saveHistory() {
    if (!current) return;
    var i = history.findIndex(function (h) { return h.time === current.time; });
    if (i >= 0) history[i] = current; else history.push(current);
    store.set('history', history);
    renderLog();
  }
  function renderLog() {
    $('p-log').innerHTML = history.slice().reverse().map(function (h) {
      return '<div><b>' + new Date(h.time).toLocaleString('ru-RU') + '</b> — ' + esc(h.winner.surname + ' ' + h.winner.name) +
        ' (' + esc(h.winner.town || '') + '), запасных: ' + h.reserves.length + ', участников: ' + h.total + '</div>';
    }).join('') || '<div>Розыгрышей ещё не было</div>';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function exportCSV() {
    var rows = [['Дата розыгрыша', 'Роль', 'Номер', 'VK ID', 'Ссылка VK', 'Фамилия', 'Имя', 'Регион', 'Участников всего']];
    history.forEach(function (h) {
      var d = new Date(h.time).toLocaleString('ru-RU');
      var line = function (role, n, p) {
        var vk = /^\d+$/.test(p.id) ? p.id : '';
        rows.push([d, role, n, vk, vk ? 'https://vk.com/id' + vk : '', p.surname, p.name, p.town || '', h.total]);
      };
      line('Победитель', 1, h.winner);
      h.reserves.forEach(function (p, i) { line('Запасной', i + 1, p); });
    });
    var csv = '﻿' + rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(';'); }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'protokol-rozygrysha.csv';
    a.click();
  }

  // ---------- Пульт ----------
  function syncPanel() {
    $('p-count').textContent = participants.length.toLocaleString('ru-RU');
    $('p-source').textContent = '(' + source + ')';
    $('p-auto').value = settings.auto;
    $('p-sound').checked = settings.sound;
    $('p-exclude').checked = settings.exclude;
    renderLog();
  }
  $('p-file').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        participants = Data.fromCSV(String(r.result));
        source = f.name;
        store.set('participants', participants); store.set('source', source);
        syncPanel();
        alert('Загружено участников: ' + participants.length);
      } catch (err) { alert('Ошибка: ' + err.message); }
      e.target.value = '';
    };
    r.readAsText(f, 'utf-8');
  });
  // Загрузка из Google Таблицы через веб-приложение Apps Script (apps-script/final-export.gs)
  $('p-url').value = store.get('sheetUrl', '');
  $('p-key').value = store.get('sheetKey', '');
  function setStatus(msg, err) { $('p-status').textContent = msg; $('p-status').className = err ? 'err' : ''; }
  function loadFromSheet() {
    var url = $('p-url').value.trim(), key = $('p-key').value.trim();
    if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) { setStatus('Нужна ссылка вида https://script.google.com/macros/s/…/exec', true); return; }
    store.set('sheetUrl', url); store.set('sheetKey', key);
    $('p-load').disabled = true; setStatus('Загружаю…');
    fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + 'action=final&key=' + encodeURIComponent(key))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.status !== 'ok') throw new Error(d.message || d.status);
        participants = Data.fromList(d.participants);
        source = 'Google Таблица, ' + (d.updated || 'сейчас');
        store.set('participants', participants); store.set('source', source);
        syncPanel(); setStatus('Загружено участников: ' + participants.length);
      })
      .catch(function (e) { setStatus('Ошибка: ' + e.message, true); })
      .then(function () { $('p-load').disabled = false; });
  }
  $('p-load').addEventListener('click', loadFromSheet);
  $('p-auto').addEventListener('change', function () { settings.auto = Math.max(0, +this.value || 0); store.set('auto', settings.auto); });
  $('p-sound').addEventListener('change', function () { settings.sound = this.checked; store.set('sound', settings.sound); });
  $('p-exclude').addEventListener('change', function () { settings.exclude = this.checked; store.set('exclude', settings.exclude); });
  $('p-export').addEventListener('click', exportCSV);
  $('p-demo').addEventListener('click', function () {
    participants = Data.demo(400); source = 'демо';
    store.set('participants', null); store.set('source', source); syncPanel();
  });
  $('p-reset').addEventListener('click', goHome);
  function togglePanel() { $('panel').hidden = !$('panel').hidden; if (!$('panel').hidden) syncPanel(); }

  // ---------- Управление ----------
  $('btn-start').addEventListener('click', startDraw);
  $('btn-stop').addEventListener('click', stopReel);
  $('btn-to-reserve').addEventListener('click', toReserve);
  $('btn-reserve-run').addEventListener('click', runReserve);

  function primary() {
    if (screen === 'intro') startDraw();
    else if (screen === 'draw') stopReel();
    else if (screen === 'winner') toReserve();
    else if (screen === 'reserve') runReserve();
  }
  addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); primary(); }
    else if (e.code === 'Escape') goHome();
    else if (e.code === 'KeyH') togglePanel();
    else if (e.code === 'KeyF') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); }
  });
  // Кнопки не держат фокус, чтобы пробел не срабатывал дважды
  document.querySelectorAll('button').forEach(function (b) { b.addEventListener('mouseup', function () { b.blur(); }); });

  syncPanel();
  show('intro');
})();
