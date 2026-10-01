"""Шифрует список финала паролем, чтобы его можно было выложить вместе с сайтом на GitHub Pages.

    python tools/encrypt_list.py

Берёт data/final.csv (собирает tools/build_final.py), спрашивает пароль и пишет
assets/participants.enc — его можно коммитить: без пароля это случайные байты.
Сайт расшифровывает его в браузере (пульт H → пароль → «Загрузить участников»).

Шифр: AES-256-GCM, ключ из пароля через PBKDF2-SHA256 (600 000 итераций) — то же умеет WebCrypto.
"""
import base64, getpass, json, os, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'data', 'final.csv')
DST = os.path.join(ROOT, 'assets', 'participants.enc')
ITER = 600_000


def main():
    if not os.path.exists(SRC):
        sys.exit('Нет data/final.csv — сначала python tools/build_final.py')
    pw = os.environ.get('LIST_PASSWORD') or getpass.getpass('Пароль для списка (символы не отображаются): ')
    if not os.environ.get('LIST_PASSWORD') and getpass.getpass('Повторите пароль: ') != pw:
        sys.exit('Пароли не совпали')
    if len(pw) < 8:
        sys.exit('Пароль слишком короткий — нужно хотя бы 8 символов')
    data = open(SRC, 'rb').read()
    salt, iv = os.urandom(16), os.urandom(12)
    key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive(pw.encode('utf-8'))
    ct = AESGCM(key).encrypt(iv, data, None)
    b64 = lambda b: base64.b64encode(b).decode()
    rows = data.decode('utf-8-sig').count('\n') - 1
    with open(DST, 'w', encoding='utf-8') as f:
        json.dump({'v': 1, 'kdf': 'PBKDF2-SHA256', 'iter': ITER, 'salt': b64(salt), 'iv': b64(iv), 'data': b64(ct)}, f)
    print(f'Готово: assets/participants.enc ({rows} участников). Его можно коммитить и выкладывать.')


if __name__ == '__main__':
    main()
