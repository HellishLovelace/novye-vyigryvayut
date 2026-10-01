"""Собирает список финала для сайта без API: таблица «Участники» + экспорт подписчиков BotMan.

    python tools/build_final.py

Берёт из папки data/ (она вне git — там персональные данные):
  * botman-export.xlsx      — экспорт подписчиков BotMan (Id = VK ID, First Name, Last Name)
  * участники.csv           — лист «Участники» из Google Таблицы (Файл → Скачать → CSV).
                              Если его нет — в финал идут ВСЕ подписчики из экспорта (регион из колонки «Регион»).
  * регионы.csv (необяз.)   — лист «Регионы»; если есть и не пуст — в финал идут только эти регионы
  * barkov-likes.csv        — vk.barkov.net «Активность в посте», только лайкнувшие (условие: лайк на пост)
  * barkov-comments.csv     — vk.barkov.net «Сбор комментариев» к посту (условие: отметил 2 человек в одном комментарии)
Подписка на группу проверяется ботом при регистрации — в базе только прошедшие регистрацию.
Рядом пишет data/report.csv — кто и почему не прошёл (для протокола).
Пишет data/final.csv — его загружает сайт (H → «CSV-файл»).

Правила отбора те же, что в apps-script/final-export.gs.
"""
import csv, glob, os, re, sys, unicodedata

EXCLUDE_WEEKLY_WINNERS = False   # True — не включать победителей еженедельных розыгрышей
EXCLUDE_NO_REGION = True         # не включать без региона (и с регионом не из списка ДФО ниже)
EXCLUDE_LATIN_NAMES = True       # не включать, если в имени/фамилии нет кириллицы

# Регионы ДФО, как их пишет бот; слева — встречающиеся варианты написания
REGION_ALIASES = {'владивосток': 'Приморский край'}
DFO_REGIONS = ['Приморский край', 'Хабаровский край', 'Забайкальский край', 'Сахалинская область', 'Амурская область',
               'Камчатский край', 'Магаданская область', 'ЕАО', 'Республика Саха (Якутия)', 'Бурятия', 'Чукотский АО']

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


def mentioned(text, author):
    """Разные люди, отмеченные в комментарии: [id123|Имя], @id123 и вручную набранные @ник."""
    ids = set(re.findall(r'\[id(\d+)\|', text))
    rest = re.sub(r'\[[^\]]*\]', ' ', text)
    rest = re.sub(r'\(\s*@[^)]*\)', ' ', rest)            # «@id123 (@ник)» — это один человек
    for m in re.findall(r'(?<![\w@])@([A-Za-z0-9_.]{3,})', rest):
        mm = re.fullmatch(r'id(\d+)', m)
        ids.add(mm.group(1) if mm else 'nick:' + m.lower())
    ids.discard(author)
    return ids


def load_conditions():
    """Лайкнувшие и отметившие двоих — из выгрузок vk.barkov.net. None — файла нет, условие не проверяем."""
    likes = tagged = None
    lf = find(r'likes.*\.csv$|лайк.*\.csv$|barkov.*post.*\.csv$')
    cf = find(r'comments.*\.csv$|коммент.*\.csv$')
    if lf:
        t = read_csv(lf)
        c = col(t[0], r'^id')
        likes = {re.sub(r'\D', '', r[c]) for r in t[1:] if r and len(r) > c}
    if cf:
        t = read_csv(cf)
        c_a, c_t = col(t[0], r'^id автора|^id'), col(t[0], r'текст')
        tagged = set()
        for r in t[1:]:
            if len(r) <= max(c_a, c_t): continue
            a = re.sub(r'\D', '', r[c_a])
            if len(mentioned(r[c_t], a)) >= 2: tagged.add(a)
    return likes, tagged, lf, cf


def main():
    export = find(r'botman.*\.xlsx$|^task_.*\.xlsx$')
    parts = find(r'участник.*\.csv$')
    regions_f = find(r'регион.*\.csv$')
    if not export: sys.exit('Нет экспорта BotMan в data/ (botman-export.xlsx)')

    # Имена из экспорта BotMan: VK ID → (фамилия, имя)
    import openpyxl, warnings
    warnings.filterwarnings('ignore')
    rows = list(openpyxl.load_workbook(export, read_only=True).worksheets[0].iter_rows(values_only=True))
    h = rows[0]
    c_id, c_first, c_last = col(h, r'^id$'), col(h, r'^first name$'), col(h, r'^last name$')
    c_reg_bm = col(h, r'^регион$')
    names, bm_rows = {}, []
    for r in rows[1:]:
        vk = re.sub(r'\D', '', norm(r[c_id]))
        if vk: names[vk] = (norm(r[c_last]), norm(r[c_first]))
        bm_rows.append([vk, '', norm(r[c_reg_bm]) if c_reg_bm >= 0 else '', ''])

    # Активные регионы
    active = []
    if regions_f:
        active = [norm(r[0]).lower() for r in read_csv(regions_f)[1:] if r and norm(r[0])]

    likes, tagged, lf, cf = load_conditions()
    print('Условие «лайк на пост»: ' + (f'{len(likes)} лайкнувших ({os.path.basename(lf)})' if likes is not None else 'НЕ проверяется — нет файла'))
    print('Условие «отметил двоих в комментарии»: ' + (f'{len(tagged)} человек ({os.path.basename(cf)})' if tagged is not None else 'НЕ проверяется — нет файла'))

    # Участники из таблицы — официальный список; без него — все подписчики из экспорта
    if parts:
        t = read_csv(parts)
        print('Источник: лист «Участники» + имена из экспорта BotMan')
    else:
        t = [['VK ID', 'ФИО', 'Регион', 'Статус']] + bm_rows
        print('Источник: ВСЕ подписчики из экспорта BotMan (листа «Участники» в data/ нет)')
    h = t[0]
    c_vk, c_fio, c_reg, c_st = col(h, r'vk id'), col(h, r'фио'), col(h, r'регион'), col(h, r'статус')
    stats = dict(total=len(t) - 1, no_id=0, dup=0, region=0, weekly=0, no_name=0, no_region=0, latin=0, no_like=0, no_tags=0)
    report = []
    known = {x.lower(): x for x in DFO_REGIONS}
    seen, out = set(), []
    for r in t[1:]:
        get = lambda i: norm(r[i]) if 0 <= i < len(r) else ''
        vk = re.sub(r'\.0$', '', get(c_vk))
        if not re.fullmatch(r'\d+', vk): stats['no_id'] += 1; continue
        if vk in seen: stats['dup'] += 1; continue
        reg = get(c_reg)
        reg = REGION_ALIASES.get(reg.lower(), reg)
        if EXCLUDE_NO_REGION:
            if reg.lower() not in known: stats['no_region'] += 1; continue
            reg = known[reg.lower()]
        if active and reg.lower() not in active: stats['region'] += 1; continue
        if EXCLUDE_WEEKLY_WINNERS and re.search('победител', get(c_st), re.I): stats['weekly'] += 1; continue
        seen.add(vk)
        last, first = names.get(vk, ('', ''))
        if not last and not first and get(c_fio):
            p = get(c_fio).split(); last, first = (p + ['', ''])[:2]
        if EXCLUDE_LATIN_NAMES and not re.search('[А-Яа-яЁё]', last + first): stats['latin'] += 1; continue
        no_like = likes is not None and vk not in likes
        no_tags = tagged is not None and vk not in tagged
        if no_like or no_tags:
            stats['no_like'] += no_like; stats['no_tags'] += no_tags
            report.append([vk, 'https://vk.com/id' + vk, 'нет' if no_like else 'да', 'нет' if no_tags else 'да'])
            continue
        if not last and not first: stats['no_name'] += 1
        out.append([vk, last, first, reg, '', 'https://vk.com/id' + vk])

    dst = os.path.join(DATA, 'final.csv')
    with open(dst, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f, delimiter=';')
        w.writerow(['VK ID', 'Фамилия', 'Имя', 'Населённый пункт', 'Фото', 'Страница VK'])
        w.writerows(out)

    with open(os.path.join(DATA, 'report.csv'), 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f, delimiter=';')
        w.writerow(['VK ID', 'Страница VK', 'Лайк на пост', 'Отметил двоих в комментарии'])
        w.writerows(report)

    by_reg = {}
    for r in out: by_reg[r[3]] = by_reg.get(r[3], 0) + 1
    print(f"Строк в «Участниках»: {stats['total']}")
    print(f"Отсеяно: без VK ID {stats['no_id']}, дубли {stats['dup']}, без региона/неизвестный регион {stats['no_region']}, "
          f"не активный регион {stats['region']}, латиница/без имени {stats['latin']}, еженедельные победители {stats['weekly']}")
    print(f"Не выполнили условия: без лайка {stats['no_like']}, без отметки двоих {stats['no_tags']} (подробно — data/report.csv)")
    print(f"В финале: {len(out)}, без имени (будут «VK id…»): {stats['no_name']}")
    print('Активные регионы: ' + (', '.join(active) if active else 'все'))
    for k, v in sorted(by_reg.items(), key=lambda x: -x[1]): print(f'  {k}: {v}')
    print('Готово:', os.path.normpath(dst))


if __name__ == '__main__':
    main()
