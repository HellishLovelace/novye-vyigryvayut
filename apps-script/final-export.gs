// ============================================================
// ВЫГРУЗКА УЧАСТНИКОВ ДЛЯ ФИНАЛЬНОГО РОЗЫГРЫША (сайт-трансляция)
// Добавьте этот файл в тот же проект Apps Script, что и основной скрипт.
//
// Зачем: в листе «Участники» колонка ФИО пока пустая, а для эфира
// нужны фамилия, имя и фото. Функция берёт VK ID участников,
// запрашивает у VK имя/фамилию/фото и пишет лист «Финал».
// Сайт забирает лист «Финал» сам через doGet (см. ниже) — либо лист
// можно скачать как CSV и загрузить через пульт ведущего (клавиша H).
//
// Подготовка (один раз):
//   1. Создать сервисный ключ VK: vk.com/apps?act=manage → своё приложение →
//      Настройки → «Сервисный ключ доступа».
//   2. Apps Script → Настройки проекта → Свойства скрипта:
//        VK_SERVICE_TOKEN = <сервисный ключ VK>
//        FINAL_KEY        = <любой длинный пароль для сайта>
//   3. Запустить buildFinalSheet.
//   4. Развернуть → Управление развёртываниями → текущее веб-приложение →
//      «Изменить» → Версия: «Новая версия» → Развернуть.
//      Ссылка /exec остаётся прежней, приём данных от BotMan (doPost) не меняется.
//   5. На сайте: H → вставить ссылку /exec и FINAL_KEY → «Загрузить из таблицы».
// ============================================================

var SHEET_FINAL = 'Финал';
var VK_API_VERSION = '5.199';
var VK_BATCH = 500; // сколько ID в одном запросе users.get

function buildFinalSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var token = PropertiesService.getScriptProperties().getProperty('VK_SERVICE_TOKEN');
  if (!token) Logger.log('VK_SERVICE_TOKEN не задан — имена возьмём из колонки ФИО, без фото');

  // Участники активных регионов (как в runRaffle); лист «Регионы» пуст — берём всех
  var activeRegions = getActiveRegions(ss).map(function (r) { return r.toLowerCase(); });
  var rows = ss.getSheetByName(SHEET_PARTICIPANTS).getDataRange().getValues();
  var people = [], seen = {};
  for (var i = 1; i < rows.length; i++) {
    var vkId = String(rows[i][COL_VK_ID] || '').trim();
    var region = String(rows[i][COL_REGION] || '').trim();
    if (!/^\d+$/.test(vkId) || seen[vkId]) continue;
    if (activeRegions.length && activeRegions.indexOf(region.toLowerCase()) < 0) continue;
    seen[vkId] = true;
    people.push({ vkId: vkId, region: region, fio: String(rows[i][COL_NAME] || '').trim() });
  }
  Logger.log('Участников для финала: ' + people.length);

  // Имена и фото из VK пачками
  var info = {};
  for (var s = 0; token && s < people.length; s += VK_BATCH) {
    var ids = people.slice(s, s + VK_BATCH).map(function (p) { return p.vkId; });
    var resp = UrlFetchApp.fetch('https://api.vk.com/method/users.get', {
      method: 'post',
      payload: { user_ids: ids.join(','), fields: 'photo_200', lang: 'ru', access_token: token, v: VK_API_VERSION },
      muteHttpExceptions: true
    });
    var data = JSON.parse(resp.getContentText());
    if (data.error) throw new Error('VK API: ' + data.error.error_msg);
    data.response.forEach(function (u) { info[String(u.id)] = u; });
    Utilities.sleep(350); // лимит VK — 3 запроса в секунду
  }

  var out = [['VK ID', 'Фамилия', 'Имя', 'Населённый пункт', 'Фото']];
  people.forEach(function (p) {
    var u = info[p.vkId] || {};
    var surname = u.last_name || '', name = u.first_name || '';
    if (!surname && p.fio) { var parts = p.fio.split(/\s+/); surname = parts[0] || ''; name = parts[1] || ''; }
    var photo = (u.photo_200 && u.photo_200.indexOf('camera_') < 0) ? u.photo_200 : ''; // без заглушки VK
    out.push([p.vkId, surname, name, p.region, photo]);
  });

  var sheet = ss.getSheetByName(SHEET_FINAL) || ss.insertSheet(SHEET_FINAL);
  sheet.clearContents();
  sheet.getRange(1, 1, out.length, out[0].length).setValues(out);
  sheet.getRange(1, 1, 1, out[0].length).setFontWeight('bold');
  PropertiesService.getScriptProperties().setProperty('FINAL_UPDATED',
    Utilities.formatDate(new Date(), 'Asia/Vladivostok', 'dd.MM.yyyy HH:mm') + ' (Владивосток)');
  Logger.log('Лист «' + SHEET_FINAL + '» готов: ' + (out.length - 1) + ' участников. Скачайте его как CSV.');
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
