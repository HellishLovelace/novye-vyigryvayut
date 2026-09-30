/* Конфетти на canvas поверх сцены. */
(function () {
  var cv, ctx, parts = [], running = false, rainUntil = 0;
  var COLORS = ['#19b3a6', '#2cc4a0', '#ff8a3d', '#ffd166', '#ffffff', '#4cc9f0', '#0b4f5c'];

  function spawn(x, y, n, spread, power) {
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (Math.random() - 0.5) * spread, v = power * (0.5 + Math.random());
      parts.push({
        x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        w: 10 + Math.random() * 12, h: 6 + Math.random() * 8,
        r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
        c: COLORS[(Math.random() * COLORS.length) | 0], life: 1, round: Math.random() < 0.25
      });
    }
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  function tick() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    var now = performance.now();
    if (now < rainUntil && Math.random() < 0.7) {
      for (var k = 0; k < 3; k++) parts.push({
        x: Math.random() * cv.width, y: -20, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3,
        w: 10 + Math.random() * 10, h: 6 + Math.random() * 6, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.2,
        c: COLORS[(Math.random() * COLORS.length) | 0], life: 1, round: Math.random() < 0.25
      });
    }
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.vy += 0.22; p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy; p.r += p.vr;
      if (p.y > cv.height + 40) { parts.splice(i, 1); continue; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.h * 0.6, 0, 6.28); ctx.fill(); }
      else { ctx.scale(1, Math.cos(p.r * 2)); ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
      ctx.restore();
    }
    if (parts.length || now < rainUntil) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, cv.width, cv.height); }
  }

  window.Confetti = {
    init: function (el) { cv = el; ctx = cv.getContext('2d'); },
    burst: function (x, y, n) { spawn(x, y, n || 160, 1.6, 22); },
    celebrate: function (ms) {
      spawn(200, 1080, 180, 0.9, 30);
      spawn(1720, 1080, 180, 0.9, 30);
      setTimeout(function () { spawn(960, 700, 220, 2.4, 24); }, 350);
      rainUntil = performance.now() + (ms || 7000);
      if (!running) { running = true; requestAnimationFrame(tick); }
    },
    stop: function () { parts = []; rainUntil = 0; }
  };
})();
