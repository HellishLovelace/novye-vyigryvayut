"""Собирает список финала для сайта без API: таблица «Участники» + экспорт подписчиков BotMan.

    python tools/build_final.py

Берёт из папки data/ (она вне git — там персональные данные):
  * botman-export.xlsx      — экспорт подписчиков BotMan (Id = VK ID, First Name, Last Name)
  * участники.csv           — лист «Участники» из Google Таблицы (Файл → Скачать → CSV)
  * регионы.csv (необяз.)   — лист «Регионы»; если есть и не пуст — в финал идут только эти регионы
Пишет data/final.csv — его загружает сайт (H → «CSV-файл»).

Правила отбора те же, что в apps-script/final-export.gs.
"""
import csv, glob, os, re, sys, unicodedata

EXCLUDE_WEEKLY_WINNERS = False   # True — не включать победителей еженедельных розыгрышей

DATA = os.environ.get('FINAL_DATA') or os.path.join(os.path.dirname(__file__), '..', 'data')
norm = lambda s: unicodedata.normalize('NFC', str(s or '')).strip()


def find(pattern):
    hits = [f for f in glob.glob(os.path.join(DATA, '*')) if re.search(pattern, norm(os.path.basename(f)), re.I)]
    return hits[0] if hits else None


def read_csv(path):
    with open(path, encoding='utf-8-sig', newline='') as f:
        sample = f.read(4096); f.seek(0)
        delim = ';' if sample.count(';') > sample.count(',') else ','
        return list(csv.reader(f, delimiter=delim))


def col(header, *patterns):
    h = [norm(x).lower() for x in header]
    for p in patterns:
        for i, x in enumerate(h):
            if re.search(p, x): return i
    return -1


def main():
    export = find(r'botman.*\.xlsx$|^task_.*\.xlsx$')
    parts = find(r'участник.*\.csv$')
    regions_f = find(r'регион.*\.csv$')
    if not export: sys.exit('Нет экспорта BotMan в data/ (botman-export.xlsx)')
    if not parts: sys.exit('Нет листа «Участники» в data/ (участники.csv)')

    # Имена из экспорта BotMan: VK ID → (фамилия, имя)
    import openpyxl, warnings
    warnings.filterwarnings('ignore')
    rows = list(openpyxl.load_workbook(export, read_only=True).worksheets[0].iter_rows(values_only=True))
    h = rows[0]
    c_id, c_first, c_last = col(h, r'^id$'), col(h, r'^first name$'), col(h, r'^last name$')
    names = {}
    for r in rows[1:]:
        vk = re.sub(r'\D', '', norm(r[c_id]))
        if vk: names[vk] = (norm(r[c_last]), norm(r[c_first]))

    # Активные регионы
    active = []
    if regions_f:
        active = [norm(r[0]).lower() for r in read_csv(regions_f)[1:] if r and norm(r[0])]

    # Участники из таблицы — официальный список
    t = read_csv(parts)
    h = t[0]
    c_vk, c_fio, c_reg, c_st = col(h, r'vk id'), col(h, r'фио'), col(h, r'регион'), col(h, r'статус')
    stats = dict(total=len(t) - 1, no_id=0, dup=0, region=0, weekly=0, no_name=0)
    seen, out = set(), []
    for r in t[1:]:
        get = lambda i: norm(r[i]) if 0 <= i < len(r) else ''
        vk = re.sub(r'\.0$', '', get(c_vk))
        if not re.fullmatch(r'\d+', vk): stats['no_id'] += 1; continue
        if vk in seen: stats['dup'] += 1; continue
        reg = get(c_reg)
        if active and reg.lower() not in active: stats['region'] += 1; continue
        if EXCLUDE_WEEKLY_WINNERS and re.search('победител', get(c_st), re.I): stats['weekly'] += 1; continue
        seen.add(vk)
        last, first = names.get(vk, ('', ''))
        if not last and not first and get(c_fio):
            p = get(c_fio).split(); last, first = (p + ['', ''])[:2]
        if not last and not first: stats['no_name'] += 1
        out.append([vk, last, first, reg, '', 'https://vk.com/id' + vk])

    dst = os.path.join(DATA, 'final.csv')
    with open(dst, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f, delimiter=';')
        w.writerow(['VK ID', 'Фамилия', 'Имя', 'Населённый пункт', 'Фото', 'Страница VK'])
        w.writerows(out)

    by_reg = {}
    for r in out: by_reg[r[3]] = by_reg.get(r[3], 0) + 1
    print(f"Строк в «Участниках»: {stats['total']}")
    print(f"Отсеяно: без VK ID {stats['no_id']}, дубли {stats['dup']}, не тот регион {stats['region']}, еженедельные победители {stats['weekly']}")
    print(f"В финале: {len(out)}, без имени (будут «VK id…»): {stats['no_name']}")
    print('Активные регионы: ' + (', '.join(active) if active else 'все'))
    for k, v in sorted(by_reg.items(), key=lambda x: -x[1]): print(f'  {k}: {v}')
    print('Готово:', os.path.normpath(dst))


if __name__ == '__main__':
    main()
