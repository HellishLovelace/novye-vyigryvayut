/* Фирменные элементы: фон с «лентой» НОВЫЕ БИРЮЗОВЫЕ, мазки кистью, летающие предметы. */
(function () {
  var TIF = '#0ad1c9', TIF_D = '#0ba8a2', TIF_L = '#d6eeec', RED = '#ef4056', CORAL = '#f26b7c', PINK = '#f5a9c9', INK = '#111';

  // ---------- Фон: петляющие ленты с текстом, как на фирменном паттерне ----------
  var LOOPS = [
    'M-200 240 C 200 -40, 520 420, 330 560 S 60 380, 380 290 S 900 720, 1180 520 S 1480 80, 1720 280 S 2100 620, 2200 460',
    'M-200 960 C 240 780, 560 1140, 800 930 S 760 640, 1000 700 S 1320 1040, 1540 860 S 1860 660, 2200 820'
  ];
  var text = new Array(40).join('НОВЫЕ БИРЮЗОВЫЕ · ');
  var svg = '<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">';
  LOOPS.forEach(function (d, i) {
    svg += '<path id="loop' + i + '" d="' + d + '" fill="none" stroke="' + TIF_L + '" stroke-opacity=".22" stroke-width="64" stroke-linecap="round"/>' +
      '<text font-family="Rubik, Arial" font-weight="800" font-size="34" fill="#fff" fill-opacity=".55" dy="12">' +
      '<textPath href="#loop' + i + '">' + text +
      '<animate attributeName="startOffset" from="0" to="-1200" dur="' + (40 + i * 12) + 's" repeatCount="indefinite"/></textPath></text>';
  });
  svg += '</svg>';
  window.BG_SVG = svg;

  // ---------- Мазок кистью: неровный полигон для clip-path ----------
  window.brushify = function (el, seed) {
    var s = seed || 7, rnd = function () { s = (s * 16807) % 2147483647; return (s % 1000) / 1000; };
    var pts = [], n = 18, i;
    for (i = 0; i <= n; i++) pts.push([4 + (i / n) * 92, 6 + rnd() * 8]);            // верхний край
    for (i = 0; i <= 6; i++) pts.push([96 + rnd() * 4, 12 + (i / 6) * 76]);          // рваный правый край
    for (i = n; i >= 0; i--) pts.push([4 + (i / n) * 92, 86 + rnd() * 10]);          // нижний край
    for (i = 6; i >= 0; i--) pts.push([rnd() * 5, 12 + (i / 6) * 76]);               // рваный левый край
    el.style.clipPath = 'polygon(' + pts.map(function (p) { return p[0].toFixed(1) + '% ' + p[1].toFixed(1) + '%'; }).join(',') + ')';
  };

  // ---------- Летающие предметы вокруг главного приза ----------
  function S(w, h, body) { return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>'; }
  var ITEMS = {
    note: S(200, 110,
      '<rect x="6" y="6" width="188" height="98" rx="10" fill="' + TIF_L + '" stroke="' + INK + '" stroke-width="5"/>' +
      '<rect x="18" y="18" width="164" height="74" rx="6" fill="none" stroke="' + TIF_D + '" stroke-width="3" stroke-dasharray="6 5"/>' +
      '<circle cx="100" cy="55" r="26" fill="' + TIF + '" stroke="' + INK + '" stroke-width="4"/>' +
      '<text x="100" y="67" text-anchor="middle" font-family="Rubik, Arial" font-weight="900" font-size="34" fill="' + INK + '">₽</text>' +
      '<text x="30" y="46" font-family="Rubik, Arial" font-weight="900" font-size="20" fill="' + TIF_D + '">5000</text>' +
      '<text x="170" y="88" text-anchor="end" font-family="Rubik, Arial" font-weight="900" font-size="20" fill="' + TIF_D + '">5000</text>'),
    coin: S(120, 120,
      '<circle cx="60" cy="64" r="50" fill="' + TIF_D + '" stroke="' + INK + '" stroke-width="5"/>' +
      '<circle cx="60" cy="56" r="50" fill="#fff" stroke="' + INK + '" stroke-width="5"/>' +
      '<circle cx="60" cy="56" r="36" fill="none" stroke="' + TIF + '" stroke-width="5"/>' +
      '<text x="60" y="74" text-anchor="middle" font-family="Rubik, Arial" font-weight="900" font-size="48" fill="' + INK + '">₽</text>'),
    keys: S(170, 150,
      '<path d="M60 40c-20-30-60-20-50 6 8 18 38 10 50-6zM64 40c20-30 60-20 50 6-8 18-38 10-50-6z" fill="' + PINK + '" stroke="' + INK + '" stroke-width="4"/>' +
      '<path d="M54 44 34 90M70 44l24 42" stroke="' + PINK + '" stroke-width="12" stroke-linecap="round"/>' +
      '<circle cx="62" cy="42" r="10" fill="' + CORAL + '" stroke="' + INK + '" stroke-width="4"/>' +
      '<circle cx="104" cy="86" r="24" fill="#fff" stroke="' + INK + '" stroke-width="5"/><circle cx="104" cy="86" r="8" fill="' + TIF + '"/>' +
      '<path d="M120 104 158 142M138 122l10-10M148 132l10-10" stroke="' + INK + '" stroke-width="8" stroke-linecap="round"/>' +
      '<path d="M86 96l-6 6" stroke="' + INK + '" stroke-width="5"/>'),
    house: S(140, 160,
      '<rect x="22" y="18" width="96" height="136" rx="6" fill="#fff" stroke="' + INK + '" stroke-width="5"/>' +
      '<g fill="' + TIF + '" stroke="' + INK + '" stroke-width="3">' +
      '<rect x="36" y="32" width="22" height="20"/><rect x="82" y="32" width="22" height="20"/>' +
      '<rect x="36" y="64" width="22" height="20"/><rect x="82" y="64" width="22" height="20"/>' +
      '<rect x="36" y="96" width="22" height="20"/><rect x="82" y="96" width="22" height="20"/></g>' +
      '<rect x="56" y="124" width="28" height="30" fill="' + CORAL + '" stroke="' + INK + '" stroke-width="4"/>'),
    star: S(100, 100, '<path d="M50 4C54 38 62 46 96 50 62 54 54 62 50 96 46 62 38 54 4 50 38 46 46 38 50 4z" fill="#fff"/>'),
    heart: S(110, 100, '<path d="M55 92S8 62 8 32C8 16 20 6 34 6c10 0 17 6 21 14 4-8 11-14 21-14 14 0 26 10 26 26 0 30-47 60-47 60z" fill="' + CORAL + '" stroke="' + INK + '" stroke-width="5"/>'),
    kite: '<img src="assets/brand/kite.png" alt="">'
  };
  // x, y — центр, w — ширина, type, скорость, задержка
  window.DECOR = [
    // слева от суммы стоит нерпа — там предметов нет
    ['keys', 330, 900, 170, 6.5, -3], ['heart', 100, 880, 90, 5.5, -2], ['star', 90, 330, 50, 3.6, -1],
    ['coin', 90, 560, 90, 5.5, -1], ['house', 580, 900, 110, 6, -4],
    ['coin', 1800, 420, 110, 6, -2], ['note', 1690, 660, 210, 7.5, -3], ['kite', 1590, 440, 150, 8.5, -5],
    ['keys', 1600, 880, 170, 6, -1], ['heart', 1830, 880, 90, 5, -4], ['house', 1340, 890, 110, 7, -2],
    ['star', 1500, 360, 56, 3, -2], ['star', 1860, 270, 44, 2.8, 0]
  ];
  window.DECOR_ITEMS = ITEMS;
})();
