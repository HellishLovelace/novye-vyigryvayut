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
//      Если участников много и скрипт не успел за 5 минут — просто запустить
//      buildFinalSheet ещё раз: уже полученные имена берутся из листа «Финал».
//   3. Развернуть → Управление развёртываниями → текущее веб-приложение →
//      «Изменить» → Версия: «Новая версия» → Развернуть.
//      Ссылка /exec остаётся прежней, приём данных от BotMan (doPost) не меняется.
//   4. На сайте: H → вставить ссылку /exec и FINAL_KEY → «Загрузить из таблицы».
// ============================================================

var SHEET_FINAL = 'Финал';

// ---- Правила отбора в финал (поменяйте при необходимости) ----
var FINAL_ONLY_ACTIVE_REGIONS = true;      // true — только регионы из листа «Регионы» (пустой лист = все)
var FINAL_EXCLUDE_WEEKLY_WINNERS = false;  // true — не включать тех, кто уже выигрывал еженедельный розыгрыш

// Запросы к BotMan: пачки поменьше, чем у меток — на 2000+ запросов UrlFetch иногда отвечает «Address unavailable»
var FINAL_BATCH_SIZE = 10;
var FINAL_BATCH_PAUSE_MS = 500;

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

  // Имена и фото из BotMan — пачками параллельно, как метки в основном скрипте
  var todo = people.filter(function (p) { return p.botmanId && !cache[p.vkId]; });
  Logger.log('Запрашиваем в BotMan: ' + todo.length + ' (из прошлого запуска уже есть ' + Object.keys(cache).length + ')');
  var unfinished = 0, failed = 0, notFound = 0;
  for (var s = 0; s < todo.length; s += FINAL_BATCH_SIZE) {
    if (new Date().getTime() - start > MAX_EXECUTION_MS) { unfinished = todo.length - s; break; }
    var chunk = todo.slice(s, s + FINAL_BATCH_SIZE);
    var retry = [];
    fetchBotmanUsers(chunk, apiKey).forEach(function (r, i) {
      if (r.code === 200) cache[chunk[i].vkId] = r.user;
      else if (r.code === 404) notFound++;           // подписчика нет в BotMan — будет «VK id…»
      else retry.push(chunk[i]);                     // 429, сетевой сбой и т.п. — повторим
    });
    if (retry.length) {
      Utilities.sleep(BOTMAN_RETRY_PAUSE_MS);
      fetchBotmanUsers(retry, apiKey).forEach(function (r, i) {
        if (r.code === 200) cache[retry[i].vkId] = r.user;
        else { failed++; if (failed <= 5) Logger.log('BotMan user ' + retry[i].botmanId + ': ' + (r.code || r.error)); }
      });
    }
    if ((s / FINAL_BATCH_SIZE) % 20 === 19) Logger.log('…получено ' + Math.min(s + FINAL_BATCH_SIZE, todo.length) + ' из ' + todo.length);
    Utilities.sleep(FINAL_BATCH_PAUSE_MS);
  }

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
  if (failed || unfinished) Logger.log('ВНИМАНИЕ: не получено ' + (failed + unfinished) + ' человек (сбои сети / не хватило времени) — запустите buildFinalSheet ещё раз, дозапросятся только они.');
}

// Пачка пользователей BotMan → [{code, user: {first, last, photo}, error}]
// fetchAll падает целиком, если упал хоть один запрос («Address unavailable») —
// тогда пауза и повтор, а если снова сбой — по одному, чтобы не терять всю пачку.
function fetchBotmanUsers(list, apiKey) {
  var requests = list.map(function (p) {
    return { url: 'https://api.botman.pro/public/api/v1/users/' + encodeURIComponent(p.botmanId),
             method: 'get', headers: { 'x-api-key': apiKey }, muteHttpExceptions: true };
  });
  var responses = null;
  for (var attempt = 0; attempt < 2 && !responses; attempt++) {
    try { responses = UrlFetchApp.fetchAll(requests); }
    catch (e) { Utilities.sleep(2000); }
  }
  if (!responses) {
    responses = requests.map(function (req) {
      try { return UrlFetchApp.fetch(req.url, req); } catch (e) { return { error: String(e) }; }
    });
  }
  return responses.map(function (r) {
    if (r.error) return { code: 0, error: r.error };
    var code = r.getResponseCode(), user = null;
    if (code === 200) {
      try {
        var u = JSON.parse(r.getContentText());
        user = { first: String(u.firstName || '').trim(), last: String(u.lastName || '').trim(), photo: String(u.profilePicUrl || '') };
      } catch (e) { code = -1; }
    }
    return { code: code, user: user };
  });
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
