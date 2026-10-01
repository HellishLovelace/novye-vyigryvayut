// ============================================================
// ВЫГРУЗКА УЧАСТНИКОВ ДЛЯ ФИНАЛЬНОГО РОЗЫГРЫША (сайт-трансляция)
// Добавьте этот файл в тот же проект Apps Script, что и основной скрипт.
//
// Зачем: в листе «Участники» колонка ФИО пустая, а для эфира нужны
// фамилия, имя и фото. Их отдаёт BotMan: GET /public/api/v1/users/{BotMan ID}
// → firstName, lastName, profilePicUrl (данные профиля VK подписчика).
// Ключ API берётся из «Настройки»!B2 — тот же, что у основного скрипта.
// Результат пишется в лист «Финал»; сайт забирает его через doGet (ниже)
// или лист можно скачать как CSV и загрузить через пульт ведущего (клавиша H).
//
// Подготовка (один раз):
//   1. Apps Script → Настройки проекта → Свойства скрипта:
//        FINAL_KEY = <любой длинный пароль для сайта>
//   2. Запустить dryRunFinal (проверка без записи), затем buildFinalSheet.
//      Если за 5 минут скрипт не успел, он сам перезапустится через минуту
//      (разовый триггер) и продолжит: уже полученные имена берутся из листа «Финал».
//   3. Развернуть → Управление развёртываниями → текущее веб-приложение →
//      «Изменить» → Версия: «Новая версия» → Развернуть.
//      Ссылка /exec остаётся прежней, приём данных от BotMan (doPost) не меняется.
//   4. На сайте: H → вставить ссылку /exec и FINAL_KEY → «Загрузить из таблицы».
// ============================================================

var SHEET_FINAL = 'Финал';

// ---- Правила отбора в финал (поменяйте при необходимости) ----
var FINAL_ONLY_ACTIVE_REGIONS = true;      // true — только регионы из листа «Регионы» (пустой лист = все)
var FINAL_EXCLUDE_WEEKLY_WINNERS = false;  // true — не включать тех, кто уже выигрывал еженедельный розыгрыш

// Запросы к BotMan идут по одному: BotMan ограничивает частоту (429), а лимит нигде не описан.
// Пауза между запросами подстраивается сама: при 429 растёт, при успешных ответах уменьшается.
var FINAL_DELAY_MS = 300;

// Проверка без записи: сколько человек попадёт в финал и почему остальные отсеяны
function dryRunFinal() {
  var r = collectFinalPeople(SpreadsheetApp.getActiveSpreadsheet());
  Logger.log('Всего строк в «Участниках»: ' + r.total);
  Logger.log('Отсеяно: без VK ID — ' + r.noId + ', дубли — ' + r.dup + ', не тот регион — ' + r.region + ', еженедельные победители — ' + r.weekly);
  Logger.log('Попадут в финал: ' + r.people.length + ' (из них без BotMan ID — ' + r.noBotman + ': у них не будет имени и фото)');
  var byRegion = {};
  r.people.forEach(function (p) { byRegion[p.region] = (byRegion[p.region] || 0) + 1; });
  Object.keys(byRegion).forEach(function (k) { Logger.log('  ' + k + ': ' + byRegion[k]); });
}

function collectFinalPeople(ss) {
  var activeRegions = FINAL_ONLY_ACTIVE_REGIONS ? getActiveRegions(ss).map(function (r) { return r.toLowerCase(); }) : [];
  var rows = ss.getSheetByName(SHEET_PARTICIPANTS).getDataRange().getValues();
  var res = { people: [], total: rows.length - 1, noId: 0, dup: 0, region: 0, weekly: 0, noBotman: 0 }, seen = {};
  for (var i = 1; i < rows.length; i++) {
    var vkId = String(rows[i][COL_VK_ID] || '').trim();
    var region = String(rows[i][COL_REGION] || '').trim();
    if (!/^\d+$/.test(vkId)) { res.noId++; continue; }
    if (seen[vkId]) { res.dup++; continue; }
    if (activeRegions.length && activeRegions.indexOf(region.toLowerCase()) < 0) { res.region++; continue; }
    if (FINAL_EXCLUDE_WEEKLY_WINNERS && /победител/i.test(String(rows[i][COL_STATUS] || ''))) { res.weekly++; continue; }
    seen[vkId] = true;
    var botmanId = String(rows[i][COL_BOTMAN_ID] || '').trim();
    if (!botmanId) res.noBotman++;
    res.people.push({ vkId: vkId, botmanId: botmanId, region: region, fio: String(rows[i][COL_NAME] || '').trim() });
  }
  return res;
}

function buildFinalSheet() {
  var start = new Date().getTime();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var apiKey = String(ss.getSheetByName(SHEET_SETTINGS).getRange('B2').getValue()).trim();
  var people = collectFinalPeople(ss).people;
  Logger.log('Участников для финала: ' + people.length);

  // Уже полученные имена из прошлого запуска — не запрашиваем повторно
  var sheet = ss.getSheetByName(SHEET_FINAL) || ss.insertSheet(SHEET_FINAL);
  var cache = {};
  sheet.getDataRange().getValues().slice(1).forEach(function (r) {
    if (r[0] && (r[1] || r[2])) cache[String(r[0])] = { last: String(r[1]), first: String(r[2]), photo: String(r[4] || '') };
  });

  // Имена и фото из BotMan — по одному запросу с подстраиваемой паузой
  var todo = people.filter(function (p) { return p.botmanId && !cache[p.vkId]; });
  Logger.log('Запрашиваем в BotMan: ' + todo.length + ' (из прошлого запуска уже есть ' + Object.keys(cache).length + ')');
  var unfinished = 0, failed = 0, notFound = 0, throttled = 0, tries = {}, got = 0, lastErr = '';
  var delay = FINAL_DELAY_MS, backoff = 2000, okStreak = 0, i = 0;
  while (i < todo.length) {
    var elapsed = new Date().getTime() - start;
    if (elapsed > MAX_EXECUTION_MS) { unfinished = todo.length - i; break; }
    var p = todo[i], r = fetchBotmanUser(p.botmanId, apiKey);
    if (r.code === 429 || r.code === 0) {
      // лимит BotMan или сбой сети: ждём и повторяем того же человека, дальше идём медленнее
      throttled++; okStreak = 0; lastErr = (r.code || '') + ' ' + (r.body || r.error || '');
      tries[p.botmanId] = (tries[p.botmanId] || 0) + 1;
      if (tries[p.botmanId] > 6) { failed++; i++; Logger.log('BotMan user ' + p.botmanId + ': ' + (r.code || r.error)); continue; }
      var wait = Math.min(Math.max(backoff, r.retryAfter || 0), 60000);
      if (elapsed + wait > MAX_EXECUTION_MS) { unfinished = todo.length - i; break; }
      Utilities.sleep(wait);
      backoff = Math.min(backoff * 2, 60000);
      delay = Math.min(Math.round(delay * 1.5) + 100, 5000);
      continue;
    }
    backoff = 2000;
    if (r.code === 200) { cache[p.vkId] = r.user; got++; }
    else if (r.code === 404) notFound++;                 // подписчика нет в BotMan — будет «VK id…»
    else { failed++; if (failed <= 5) Logger.log('BotMan user ' + p.botmanId + ': ' + r.code); }
    i++;
    if (++okStreak >= 20 && delay > 100) { delay = Math.round(delay * 0.85); okStreak = 0; }
    if (i % 200 === 0) Logger.log('…обработано ' + i + ' из ' + todo.length + ', пауза между запросами ' + delay + ' мс');
    Utilities.sleep(delay);
  }
  if (throttled) Logger.log('BotMan просил притормозить (429/сбой) ' + throttled + ' раз, итоговая пауза ' + delay + ' мс');

  var out = [['VK ID', 'Фамилия', 'Имя', 'Населённый пункт', 'Фото', 'Страница VK']], noName = 0;
  people.forEach(function (p) {
    var u = cache[p.vkId] || {}, surname = u.last || '', name = u.first || '';
    if (!surname && !name && p.fio) { var parts = p.fio.split(/\s+/); surname = parts[0] || ''; name = parts[1] || ''; }
    if (!surname && !name) noName++;
    out.push([p.vkId, surname, name, p.region, u.photo || '', 'https://vk.com/id' + p.vkId]);
  });

  sheet.clearContents();
  sheet.getRange(1, 1, out.length, out[0].length).setValues(out);
  sheet.getRange(1, 1, 1, out[0].length).setFontWeight('bold');
  PropertiesService.getScriptProperties().setProperty('FINAL_UPDATED',
    Utilities.formatDate(new Date(), 'Asia/Vladivostok', 'dd.MM.yyyy HH:mm') + ' (Владивосток)');
  Logger.log('Лист «' + SHEET_FINAL + '» готов: ' + (out.length - 1) + ' участников, без имени — ' + noName + '.');
  if (notFound) Logger.log('Нет в BotMan: ' + notFound + ' — будут показаны как «VK id…».');
  if (failed) Logger.log('Не удалось получить: ' + failed + ' — при следующем запуске buildFinalSheet дозапросятся.');
  if (unfinished && todo.length && got === 0) {
    // ни одного успешного ответа — BotMan не пускает совсем, перезапуск только продлит блокировку
    scheduleFinalContinue(false);
    Logger.log('СТОП: BotMan не отдал ни одного пользователя. Последний ответ: ' + lastErr);
    Logger.log('Автопродолжение отключено. Запустите diagnoseBotman и пришлите журнал.');
    return;
  }
  scheduleFinalContinue(unfinished > 0);
  if (unfinished) Logger.log('Не успели за 5 минут: осталось ' + unfinished + '. Продолжение запустится само через минуту — смотрите «Выполнения».');
  else Logger.log('Готово.');
}

// Снять запланированное автопродолжение buildFinalSheet
function stopFinalContinue() {
  scheduleFinalContinue(false);
  Logger.log('Автопродолжение buildFinalSheet снято.');
}

// Один запрос к BotMan: код, заголовки и текст ответа — чтобы понять, что за ограничение
function diagnoseBotman() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var apiKey = String(ss.getSheetByName(SHEET_SETTINGS).getRange('B2').getValue()).trim();
  var p = collectFinalPeople(ss).people.filter(function (x) { return x.botmanId; })[0];
  if (!p) { Logger.log('Нет участников с BotMan ID'); return; }
  var r = UrlFetchApp.fetch('https://api.botman.pro/public/api/v1/users/' + encodeURIComponent(p.botmanId),
    { method: 'get', headers: { 'x-api-key': apiKey }, muteHttpExceptions: true });
  Logger.log('Запрос users/' + p.botmanId + ' → код ' + r.getResponseCode());
  Logger.log('Заголовки: ' + JSON.stringify(r.getHeaders()));
  Logger.log('Ответ: ' + String(r.getContentText()).substring(0, 1000));
  var t = UrlFetchApp.fetch('https://api.botman.pro/public/api/v1/tags',
    { method: 'get', headers: { 'x-api-key': apiKey }, muteHttpExceptions: true });
  Logger.log('Для сравнения GET /tags → код ' + t.getResponseCode() + ': ' + String(t.getContentText()).substring(0, 200));
}

// Разовый триггер «продолжить через минуту». Трогает только триггеры buildFinalSheet — еженедельный runRaffle не задевает.
function scheduleFinalContinue(on) {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'buildFinalSheet') ScriptApp.deleteTrigger(t);
  });
  if (on) ScriptApp.newTrigger('buildFinalSheet').timeBased().after(60 * 1000).create();
}

// Один пользователь BotMan → {code, user: {first, last, photo}, retryAfter (мс), error}
function fetchBotmanUser(botmanId, apiKey) {
  var r;
  try {
    r = UrlFetchApp.fetch('https://api.botman.pro/public/api/v1/users/' + encodeURIComponent(botmanId),
      { method: 'get', headers: { 'x-api-key': apiKey }, muteHttpExceptions: true });
  } catch (e) { return { code: 0, error: String(e) }; }   // «Address unavailable» и т.п.
  var code = r.getResponseCode(), res = { code: code, user: null };
  if (code !== 200) res.body = String(r.getContentText() || '').substring(0, 300);
  if (code === 429) {
    var h = r.getHeaders(), ra = Number(h['Retry-After'] || h['retry-after'] || 0);
    if (ra) res.retryAfter = ra * 1000;
  }
  if (code === 200) {
    try {
      var u = JSON.parse(r.getContentText());
      res.user = { first: String(u.firstName || '').trim(), last: String(u.lastName || '').trim(), photo: String(u.profilePicUrl || '') };
    } catch (e) { res.code = -1; }
  }
  return res;
}

// ============================================================
// Отдача списка сайту: GET <ссылка /exec>?action=final&key=FINAL_KEY
// Без правильного ключа ничего не отдаёт — это персональные данные.
// ============================================================
function doGet(e) {
  var p = (e && e.parameter) || {};
  var key = PropertiesService.getScriptProperties().getProperty('FINAL_KEY');
  if (p.action !== 'final') return jsonResponse({ status: 'error', message: 'unknown_action' });
  if (!key || p.key !== key) return jsonResponse({ status: 'forbidden', message: 'Неверный ключ доступа' });

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_FINAL);
  if (!sheet) return jsonResponse({ status: 'error', message: 'Нет листа «Финал» — запустите buildFinalSheet' });
  var rows = sheet.getDataRange().getValues(), list = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0] && !rows[i][1]) continue;
    list.push({ id: String(rows[i][0]), surname: String(rows[i][1]), name: String(rows[i][2]),
                town: String(rows[i][3]), photo: String(rows[i][4] || '') });
  }
  var updated = PropertiesService.getScriptProperties().getProperty('FINAL_UPDATED') || '';
  return jsonResponse({ status: 'ok', updated: updated, participants: list });
}
