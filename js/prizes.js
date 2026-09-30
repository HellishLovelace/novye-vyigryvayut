/* Призы, которые летают на главной.
 * Чтобы подставить картинку из макета: положите PNG/SVG в assets/prizes/
 * и укажите путь в поле img — тогда вместо встроенной иллюстрации будет картинка. */
(function () {
  var T = '#19b3a6', D = '#0b4f5c', O = '#ff8a3d', C = '#fff6e9', Y = '#ffd166';

  function svg(body) {
    return '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>';
  }

  window.PRIZES = [
    { name: 'Стакан', img: '', svg: svg(
      '<path d="M32 30h56l-7 76a6 6 0 0 1-6 5H45a6 6 0 0 1-6-5z" fill="' + C + '"/>' +
      '<rect x="28" y="20" width="64" height="12" rx="5" fill="' + D + '"/>' +
      '<path d="M36 52h48l-3 32H39z" fill="' + T + '"/>' +
      '<text x="60" y="73" font-size="11" font-weight="800" text-anchor="middle" fill="#fff" font-family="Manrope">НБ</text>') },
    { name: 'Воздушный змей', img: '', svg: svg(
      '<path d="M60 6 104 50 60 94 16 50z" fill="' + O + '"/>' +
      '<path d="M60 6v88M16 50h88" stroke="#fff" stroke-width="3"/>' +
      '<path d="M60 6 104 50 60 50z" fill="' + T + '"/>' +
      '<path d="M60 94c-8 8 8 12 0 20" stroke="' + D + '" stroke-width="3" fill="none"/>' +
      '<path d="M54 102l6 4 6-4M54 112l6 4 6-4" stroke="' + Y + '" stroke-width="4" fill="none"/>') },
    { name: 'Футболка', img: '', svg: svg(
      '<path d="M40 16 20 26 8 50l18 8 6-10v58h56V48l6 10 18-8-12-24-20-10c-4 8-12 12-20 12s-16-4-20-12z" fill="' + T + '"/>' +
      '<path d="M40 16c4 8 12 12 20 12s16-4 20-12" stroke="' + D + '" stroke-width="4" fill="none"/>' +
      '<circle cx="60" cy="66" r="12" fill="' + C + '"/><circle cx="60" cy="66" r="5" fill="' + O + '"/>') },
    { name: 'Кепка', img: '', svg: svg(
      '<path d="M18 72c0-28 18-46 42-46s42 18 42 46z" fill="' + D + '"/>' +
      '<path d="M60 26v46M36 34c6 12 8 26 8 38M84 34c-6 12-8 26-8 38" stroke="' + T + '" stroke-width="3" fill="none"/>' +
      '<path d="M14 72h70c14 0 26 6 26 12H22c-6 0-8-6-8-12z" fill="' + T + '"/>' +
      '<circle cx="60" cy="25" r="4" fill="' + O + '"/>') },
    { name: 'Шоппер', img: '', svg: svg(
      '<path d="M42 40c0-24 36-24 36 0" stroke="' + D + '" stroke-width="5" fill="none"/>' +
      '<rect x="24" y="36" width="72" height="72" rx="6" fill="' + C + '"/>' +
      '<circle cx="60" cy="72" r="20" fill="' + T + '"/>' +
      '<path d="M50 72c4-8 16-8 20 0-4 8-16 8-20 0z" fill="#fff"/>') },
    { name: 'Сап-борд', img: '', svg: svg(
      '<g transform="rotate(-35 60 60)"><ellipse cx="60" cy="60" rx="18" ry="54" fill="' + T + '"/>' +
      '<ellipse cx="60" cy="60" rx="10" ry="40" fill="' + C + '" opacity=".6"/>' +
      '<rect x="56" y="48" width="8" height="24" rx="3" fill="' + D + '"/></g>' +
      '<path d="M88 14 96 96" stroke="' + D + '" stroke-width="4"/><path d="M92 92l8 18-12-2z" fill="' + O + '"/>') },
    { name: 'Пауэрбанк', img: '', svg: svg(
      '<rect x="34" y="12" width="52" height="96" rx="12" fill="' + D + '"/>' +
      '<rect x="42" y="24" width="36" height="58" rx="6" fill="' + T + '"/>' +
      '<path d="M64 32 50 56h12l-6 20 16-26H60z" fill="' + Y + '"/>' +
      '<circle cx="50" cy="96" r="3" fill="' + O + '"/><circle cx="60" cy="96" r="3" fill="' + O + '"/><circle cx="70" cy="96" r="3" fill="#fff" opacity=".4"/>') },
    { name: 'Блокнот', img: '', svg: svg(
      '<rect x="26" y="14" width="68" height="92" rx="6" fill="' + O + '"/>' +
      '<rect x="36" y="14" width="58" height="92" rx="4" fill="' + C + '"/>' +
      '<path d="M46 38h36M46 50h36M46 62h28M46 74h32" stroke="' + T + '" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M22 26h8M22 44h8M22 62h8M22 80h8M22 98h8" stroke="' + D + '" stroke-width="4" stroke-linecap="round"/>') },
    { name: 'Носки', img: '', svg: svg(
      '<path d="M30 10h28v54l18 20c8 10 0 26-14 22L28 90c-6-4-8-10-6-16l8-12z" fill="' + T + '"/>' +
      '<rect x="30" y="10" width="28" height="12" fill="' + D + '"/>' +
      '<path d="M30 34h28M30 46h28" stroke="' + O + '" stroke-width="5"/>' +
      '<path d="M62 106c-6 0-10-4-12-8" stroke="' + C + '" stroke-width="6" fill="none"/>') },
    { name: 'Термосумка', img: '', svg: svg(
      '<path d="M40 30c0-16 40-16 40 0" stroke="' + D + '" stroke-width="6" fill="none"/>' +
      '<rect x="18" y="30" width="84" height="74" rx="10" fill="' + T + '"/>' +
      '<rect x="18" y="30" width="84" height="18" rx="8" fill="' + D + '"/>' +
      '<path d="M60 58v34M46 64l28 22M74 64 46 86" stroke="#fff" stroke-width="4" stroke-linecap="round"/>') },
    { name: 'Ручка', img: '', svg: svg(
      '<g transform="rotate(40 60 60)"><rect x="52" y="4" width="16" height="90" rx="7" fill="' + T + '"/>' +
      '<rect x="52" y="4" width="16" height="22" rx="7" fill="' + D + '"/>' +
      '<path d="M52 94h16l-8 20z" fill="' + C + '"/><path d="M58 108h4l-2 6z" fill="' + D + '"/>' +
      '<rect x="66" y="12" width="5" height="36" rx="2" fill="' + O + '"/></g>') },
    { name: 'Миска', img: '', svg: svg(
      '<ellipse cx="60" cy="50" rx="46" ry="12" fill="' + D + '"/>' +
      '<path d="M14 50c0 30 20 50 46 50s46-20 46-50c0 7-20 12-46 12S14 57 14 50z" fill="' + O + '"/>' +
      '<path d="M34 80c10 6 42 6 52 0" stroke="#fff" stroke-width="4" fill="none" opacity=".6"/>' +
      '<circle cx="46" cy="44" r="5" fill="' + T + '"/><circle cx="62" cy="47" r="4" fill="' + Y + '"/>') },
    { name: 'Фартук', img: '', svg: svg(
      '<path d="M44 12h32v18l22 10-6 66H28l-6-66 22-10z" fill="' + T + '"/>' +
      '<path d="M44 12c-10-6-18-2-20 4M76 12c10-6 18-2 20 4" stroke="' + D + '" stroke-width="4" fill="none"/>' +
      '<rect x="42" y="66" width="36" height="22" rx="4" fill="' + C + '"/>' +
      '<path d="M22 40c-10 2-14 8-14 14M98 40c10 2 14 8 14 14" stroke="' + O + '" stroke-width="4" fill="none"/>') },
    { name: 'Эко-бокс', img: '', svg: svg(
      '<rect x="14" y="44" width="92" height="56" rx="10" fill="' + C + '"/>' +
      '<rect x="10" y="34" width="100" height="16" rx="8" fill="' + T + '"/>' +
      '<path d="M60 50v50" stroke="' + T + '" stroke-width="4"/>' +
      '<path d="M34 68c8-10 20-4 16 8-10 2-16-2-16-8zM76 64c8 0 12 8 6 14-8-2-10-8-6-14z" fill="' + O + '"/>') }
  ];

  /* Главный приз — дом */
  window.HOUSE_SVG =
    '<svg viewBox="0 0 400 360" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="200" cy="336" rx="170" ry="16" fill="#073944" opacity=".35"/>' +
      '<rect x="70" y="150" width="260" height="180" rx="10" fill="#fff6e9"/>' +
      '<path d="M40 166 200 36l160 130z" fill="' + T + '"/>' +
      '<path d="M40 166 200 36l160 130" stroke="' + D + '" stroke-width="14" stroke-linejoin="round" fill="none"/>' +
      '<rect x="262" y="60" width="30" height="62" fill="' + D + '"/>' +
      '<circle cx="200" cy="112" r="26" fill="' + Y + '"/><circle cx="200" cy="112" r="26" fill="none" stroke="' + D + '" stroke-width="6"/>' +
      '<path d="M200 90v44M178 112h44" stroke="' + D + '" stroke-width="5"/>' +
      '<rect x="100" y="196" width="62" height="56" rx="6" fill="' + Y + '"/>' +
      '<path d="M131 196v56M100 224h62" stroke="' + D + '" stroke-width="5"/>' +
      '<rect x="238" y="196" width="62" height="56" rx="6" fill="' + Y + '"/>' +
      '<path d="M269 196v56M238 224h62" stroke="' + D + '" stroke-width="5"/>' +
      '<rect x="172" y="236" width="56" height="94" rx="6" fill="' + O + '"/>' +
      '<circle cx="216" cy="286" r="5" fill="#fff"/>' +
      '<rect x="70" y="318" width="260" height="12" fill="' + D + '"/>' +
      '<path d="M40 330c0-22 14-34 26-34s24 12 24 34z" fill="#2cc4a0"/>' +
      '<path d="M312 330c0-26 14-40 26-40s26 14 26 40z" fill="#2cc4a0"/>' +
    '</svg>';
})();

/* Сап-борд с райдером — бегунок статус-бара */
window.SUP_SVG =
  '<svg viewBox="0 0 220 190" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M8 150c40 14 160 14 204-2-6 16-40 26-100 26S14 166 8 150z" fill="#0b4f5c"/>' +
    '<path d="M6 146c44-14 164-14 208 2-44 12-164 12-208-2z" fill="#ff8a3d" stroke="#fff" stroke-width="4"/>' +
    '<path d="M60 146h100" stroke="#fff" stroke-width="3" opacity=".6"/>' +
    '<circle cx="112" cy="30" r="17" fill="#ffd8b5"/><path d="M95 26c2-14 30-16 34 0z" fill="#0b4f5c"/>' +
    '<path d="M112 48v48" stroke="#19b3a6" stroke-width="22" stroke-linecap="round"/>' +
    '<path d="M106 94l-14 48M118 94l12 48" stroke="#0b4f5c" stroke-width="10" stroke-linecap="round"/>' +
    '<path d="M104 62l30 18M120 60l22 10" stroke="#ffd8b5" stroke-width="8" stroke-linecap="round"/>' +
    '<path d="M150 8 136 162" stroke="#fff6e9" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M136 150l-6 26 14-2z" fill="#ffd166"/>' +
  '</svg>';
