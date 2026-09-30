(function () {
  var $ = function (id) { return document.getElementById(id); };
  var RESERVE_COUNT = 10;
  var ITEM_H = 132, VISIBLE = 5, V_MAX = 20; // высота карточки, видимых карточек, скорость (карточек/с)

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

  // ---------- Масштаб сцены 1920×1080 ----------
  function fit() {
    var s = Math.min(innerWidth / 1920, innerHeight / 1080);
    $('stage').style.transform = 'translate(-50%,-50%) scale(' + s + ')';
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
    if (name === 'intro') startOrbit(); else stopOrbit();
    if (name !== 'winner') $('kites').innerHTML = '';
  }

  // ---------- 1. Главная: летающие призы ----------
  $('house').innerHTML = HOUSE_SVG;
  var orbitEls = PRIZES.map(function (p, i) {
    var el = document.createElement('div');
    el.className = 'prize';
    el.innerHTML = p.img ? '<img src="' + p.img + '" alt="">' : p.svg;
    el.title = p.name;
    el._a = (i / PRIZES.length) * Math.PI * 2;
    el._b = Math.random() * 6.28;
    $('orbit').appendChild(el);
    return el;
  });
  var orbitRaf = 0;
  function orbitFrame(t) {
    var s = t / 1000;
    orbitEls.forEach(function (el) {
      var a = el._a + s * 0.12;
      var x = 960 + Math.cos(a) * 760, y = 600 + Math.sin(a) * 250 + Math.sin(s * 1.6 + el._b) * 18;
      var depth = (Math.sin(a) + 1) / 2; // 0 — сзади, 1 — спереди
      var sc = 0.7 + depth * 0.5;
      el.style.transform = 'translate(' + (x - 70) + 'px,' + (y - 70) + 'px) scale(' + sc + ') rotate(' + Math.sin(s + el._b) * 12 + 'deg)';
      el.style.zIndex = depth > 0.92 ? 4 : 1;
      el.style.opacity = 0.65 + depth * 0.35;
    });
    orbitRaf = requestAnimationFrame(orbitFrame);
  }
  function startOrbit() { if (!orbitRaf) orbitRaf = requestAnimationFrame(orbitFrame); }
  function stopOrbit() { cancelAnimationFrame(orbitRaf); orbitRaf = 0; }

  // ---------- 2. Барабан ----------
  var reelNodes = [];
  for (var i = 0; i < VISIBLE + 2; i++) {
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
  function renderReel() {
    var base = Math.floor(reel.p), mid = (VISIBLE * ITEM_H) / 2;
    var blur = Math.min(6, reel.v / 4);
    reelNodes.forEach(function (nd, j) {
      var k = base - Math.floor(VISIBLE / 2) - 1 + j;
      if (nd.slot !== k) { nd.slot = k; fill(nd, slotPerson(k)); }
      var y = mid + (k - reel.p) * ITEM_H - ITEM_H / 2;
      var d = Math.abs(k - reel.p);
      nd.el.style.transform = 'translateY(' + y + 'px) scale(' + Math.max(0.78, 1.08 - d * 0.1) + ')';
      nd.el.style.opacity = Math.max(0.15, 1 - d * 0.26);
      nd.el.style.filter = blur > 0.5 ? 'blur(' + blur.toFixed(1) + 'px)' : 'none';
      nd.el.classList.toggle('hit', reel.state === 'done' && k === reel.stop.target);
    });
    var cur = Math.round(reel.p);
    if (cur !== reel.lastSlot) { reel.lastSlot = cur; tick(); }
  }

  var supProg = 0;
  $('sup-rider').innerHTML = SUP_SVG;
  function setSup(prog, label) {
    supProg = prog;
    var w = $('sup-track').clientWidth - 220;
    $('sup-rider').style.transform = 'translateX(' + (prog * w) + 'px)';
    $('sup-trail').style.width = (prog * w + 110) + 'px';
    $('sup-label').textContent = label || (Math.floor(prog * 100) + '%');
  }

  function reelFrame(t) {
    var dt = Math.min(0.05, (t - reel.last) / 1000); reel.last = t;
    var el = (t - reel.t0) / 1000;
    if (reel.state === 'spin') {
      reel.v = Math.min(V_MAX, reel.v + V_MAX * dt * 1.2);
      reel.p += reel.v * dt;
      var prog = settings.auto > 0 ? Math.min(1, el / settings.auto) : Math.min(0.97, el / 30);
      setSup(prog, 'Поиск… ' + Math.floor(prog * 100) + '%');
      if (settings.auto > 0 && prog >= 1) stopReel();
    } else if (reel.state === 'stopping') {
      var s = reel.stop, k = Math.min(1, (t - s.t) / (s.T * 1000));
      reel.p = s.p0 + (s.target - s.p0) * (1 - Math.pow(1 - k, 3));
      reel.v = (3 * (s.target - s.p0) / s.T) * Math.pow(1 - k, 2);
      setSup(s.prog0 + (1 - s.prog0) * k, 'Поиск… ' + Math.floor((s.prog0 + (1 - s.prog0) * k) * 100) + '%');
      if (k >= 1) { reel.state = 'done'; reel.v = 0; reel.p = s.target; onReelDone(); }
    }
    renderReel();
    if (reel.state === 'spin' || reel.state === 'stopping') requestAnimationFrame(reelFrame);
  }

  function startDraw() {
    if (!participants.length) return;
    Confetti.stop();
    current = null;
    reel.state = 'spin'; reel.v = 0; reel.slots = {}; reel.p = 0; reel.winner = null;
    reelNodes.forEach(function (n) { n.slot = null; });
    $('btn-stop').disabled = false;
    $('screen-draw').classList.remove('found');
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

  function onReelDone() {
    setSup(1, 'Победитель найден!');
    $('screen-draw').classList.add('found');
    tone(880, 0.3, 'triangle', 0.12);
    setTimeout(function () { showWinner(reel.winner); }, 1300);
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

  function kiteSVG(c1, c2) {
    return '<svg viewBox="0 0 120 220"><path d="M60 4 112 64 60 150 8 64z" fill="' + c1 + '" stroke="#fff" stroke-width="4"/>' +
      '<path d="M60 4 112 64 60 64z M8 64 60 64 60 150z" fill="' + c2 + '"/>' +
      '<path class="k-tail" d="M60 150c-14 14 14 22 0 36s12 20 0 32" stroke="#fff" stroke-width="3" fill="none"/>' +
      '<path d="M52 170l8 6 8-6M52 196l8 6 8-6" stroke="#ffd166" stroke-width="5" fill="none"/></svg>';
  }
  function launchKites() {
    var box = $('kites'), cols = [['#ff8a3d', '#ffd166'], ['#19b3a6', '#0b4f5c'], ['#2cc4a0', '#fff6e9'], ['#4cc9f0', '#19b3a6'], ['#ff8a3d', '#e2553a']];
    box.innerHTML = '';
    for (var i = 0; i < 7; i++) {
      var k = document.createElement('div'), c = cols[i % cols.length];
      k.className = 'kite k' + i;
      k.innerHTML = kiteSVG(c[0], c[1]);
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
      Confetti.burst(960, 1080, 220);
      tone(660, 0.2, 'triangle', 0.1); tone(990, 0.4, 'triangle', 0.1, 0.12);
      if (current) { current.reserves = picked; saveHistory(); }
      reserveBusy = false;
      $('btn-reserve-run').disabled = false;
      $('btn-reserve-run').textContent = 'На главную';
    })();
  }

  function goHome() { reel.state = 'idle'; Confetti.stop(); show('intro'); }

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

  Confetti.init($('confetti'));
  syncPanel();
  show('intro');
})();
