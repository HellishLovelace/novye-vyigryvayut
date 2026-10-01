"""Собирает состояния маскота-нерпы из общих частей.

    python tools/mascot.py

Результат: assets/brand/mascot-paddle.svg (гребёт на сапе),
mascot-wave.svg (машет на главном экране), mascot-win.svg (празднует на финише).
Анимации (моргание, взмахи ластой) — внутри SVG, работают и в <img>.
"""
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'brand')
S = 'stroke="#111" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"'

TAIL_BODY = f'''  <g {S}>
    <path d="M214 350 C 238 336 262 344 274 362 C 252 358 238 366 222 374 Z" fill="#fff"/>
    <path d="M204 362 C 222 366 236 376 240 384 L 200 382 Z" fill="#fff"/>
    <path d="M96 378 C 70 336 70 256 92 202 C 104 170 106 138 118 112 C 132 84 160 72 188 78 C 222 86 238 116 234 152 C 230 190 236 230 240 272 C 246 334 228 378 188 382 Z" fill="#fff"/>
  </g>
  <path d="M112 366 C 100 326 104 268 124 232 C 140 256 150 306 146 370 Z" fill="#d6eeec"/>
  <g fill="#0ba8a2" opacity=".35">
    <ellipse cx="210" cy="250" rx="8" ry="6"/><ellipse cx="222" cy="282" rx="6" ry="5"/>
    <ellipse cx="200" cy="330" rx="9" ry="6"/><ellipse cx="224" cy="344" rx="6" ry="5"/>
  </g>
'''

SCARF_CAP = f'''  <g {S}>
    <path d="M86 196 C 134 216 196 218 242 194 L 240 222 C 198 242 144 242 84 222 Z" fill="#ef4056"/>
    <path d="M194 232 C 192 244 188 254 182 262 L 196 266 C 200 256 204 244 204 234 Z" fill="#ef4056"/>
    <path d="M206 232 C 212 242 218 250 226 256 L 234 244 C 226 240 218 234 214 228 Z" fill="#ef4056"/>
    <circle cx="202" cy="228" r="10" fill="#ef4056"/>
    <path d="M112 122 C 110 74 150 54 184 58 C 220 62 240 86 238 122 C 204 108 150 108 112 122 Z" fill="#0ba8a2"/>
    <path d="M110 120 C 150 104 204 104 240 118 L 238 140 C 204 126 150 126 110 142 Z" fill="#067a76"/>
    <rect x="160" y="117" width="30" height="16" rx="3" fill="#fff" stroke-width="4"/>
  </g>
'''

WHISKERS = '''  <ellipse cx="136" cy="178" rx="10" ry="6" fill="#f26b7c" opacity=".7"/>
  <ellipse cx="218" cy="178" rx="10" ry="6" fill="#f26b7c" opacity=".7"/>
  <path d="M169 170 C 169 164 183 164 183 170 C 183 176 176 180 176 180 C 176 180 169 176 169 170 Z" fill="#111"/>
  <g stroke="#111" stroke-width="3" stroke-linecap="round">
    <path d="M152 180 L 128 174"/><path d="M152 186 L 130 190"/>
    <path d="M200 180 L 224 174"/><path d="M200 186 L 222 190"/>
  </g>
'''

FACE = '''  <g class="eyes">
    <ellipse cx="150" cy="156" rx="11" ry="12" fill="#111"/>
    <ellipse cx="202" cy="156" rx="11" ry="12" fill="#111"/>
    <circle cx="154" cy="151" r="4" fill="#fff"/><circle cx="206" cy="151" r="4" fill="#fff"/>
  </g>
  <path d="M162 186 C 168 194 175 190 176 182 C 177 190 184 194 190 186" fill="none" stroke="#111" stroke-width="5" stroke-linecap="round"/>
''' + WHISKERS

FACE_HAPPY = '''  <g fill="none" stroke="#111" stroke-width="6" stroke-linecap="round">
    <path d="M141 158 Q 150 146 159 158"/><path d="M193 158 Q 202 146 211 158"/>
  </g>
  <path d="M165 185 C 167 199 185 199 187 185 C 180 188 172 188 165 185 Z" fill="#111" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
  <ellipse cx="176" cy="194" rx="5" ry="3" fill="#f26b7c"/>
''' + WHISKERS

PADDLE = f'''  <g {S}>
    <path d="M262 80 L 104 514" fill="none" stroke-width="9"/>
    <path d="M262 80 L 104 514" fill="none" stroke="#0ad1c9" stroke-width="3"/>
    <rect x="245" y="73" width="34" height="14" rx="6" transform="rotate(20 262 80)" fill="#0ad1c9"/>
    <rect x="94" y="446" width="36" height="84" rx="14" transform="rotate(20 112 488)" fill="#ef4056"/>
    <path d="M234 236 C 222 234 210 236 200 238 C 182 241 182 265 200 264 C 212 263 224 260 234 256 C 244 252 244 238 234 236 Z" fill="#fff"/>
    <path d="M104 286 C 126 278 156 280 176 284 C 196 287 196 312 176 313 C 152 314 124 310 106 304 C 94 300 94 290 104 286 Z" fill="#fff"/>
  </g>
'''

# машет: левая ласта лежит на животе, правая поднята и качается
WAVE = f'''  <g {S}>
    <path d="M100 262 C 118 250 150 256 162 272 C 168 284 154 292 142 288 C 126 282 110 280 100 276 C 92 272 92 266 100 262 Z" fill="#fff"/>
    <g class="wave"><path d="M220 238 C 232 206 246 176 256 150 C 262 122 302 120 298 148 C 294 172 270 214 246 248 C 236 260 214 252 220 238 Z" fill="#fff"/></g>
  </g>
'''

# празднует: обе ласты вверх, вокруг искры
WIN = f'''  <g {S}>
    <g class="up-l"><path d="M104 238 C 92 206 78 176 68 150 C 62 122 22 120 26 148 C 30 172 54 214 78 248 C 88 260 110 252 104 238 Z" fill="#fff"/></g>
    <g class="up-r"><path d="M220 238 C 232 206 246 176 256 150 C 262 122 302 120 298 148 C 294 172 270 214 246 248 C 236 260 214 252 220 238 Z" fill="#fff"/></g>
  </g>
  <g class="spark" fill="#ffd166" stroke="#111" stroke-width="4" stroke-linejoin="round">
    <path d="M30 70 L36 88 54 94 36 100 30 118 24 100 6 94 24 88Z"/>
    <path d="M292 60 L296 74 310 78 296 82 292 96 288 82 274 78 288 74Z"/>
  </g>
'''

STYLE = '''  <style>
    .eyes { transform-box: fill-box; transform-origin: center; animation: blink 4.2s infinite; }
    @keyframes blink { 0%, 94%, 100% { transform: scaleY(1); } 97% { transform: scaleY(.1); } }
    .wave { transform-origin: 230px 244px; animation: wave .9s ease-in-out infinite alternate; }
    @keyframes wave { from { transform: rotate(-14deg); } to { transform: rotate(16deg); } }
    .up-l { transform-origin: 100px 244px; animation: up-l .45s ease-in-out infinite alternate; }
    .up-r { transform-origin: 230px 244px; animation: up-r .45s ease-in-out infinite alternate; }
    @keyframes up-l { to { transform: rotate(-12deg); } }
    @keyframes up-r { to { transform: rotate(12deg); } }
    .spark path { transform-box: fill-box; transform-origin: center; animation: spark .8s ease-in-out infinite alternate; }
    .spark path + path { animation-delay: -.4s; }
    @keyframes spark { from { transform: scale(.6) rotate(0); } to { transform: scale(1.1) rotate(20deg); } }
  </style>
'''


def svg(name, h, *parts, note=''):
    body = ''.join(parts)
    text = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 {h}">\n'
            f'  <!-- Маскот «Новых Бирюзовых» — нерпа. {note} Собрано tools/mascot.py -->\n'
            f'{STYLE}{body}</svg>\n')
    with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
        f.write(text)
    print(name)


# Порядок слоёв: тело → косынка/кепка → ласты (перед телом) → лицо
svg('mascot-paddle.svg', 540, TAIL_BODY, SCARF_CAP, PADDLE, FACE, note='Гребёт веслом на сапе.')
svg('mascot-wave.svg', 400, TAIL_BODY, SCARF_CAP, WAVE, FACE, note='Машет на главном экране.')
svg('mascot-win.svg', 400, TAIL_BODY, SCARF_CAP, WIN, FACE_HAPPY, note='Празднует на финише.')
