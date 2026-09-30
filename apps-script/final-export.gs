// ============================================================
// ВЫГРУЗКА УЧАСТНИКОВ ДЛЯ ФИНАЛЬНОГО РОЗЫГРЫША (сайт-трансляция)
// Добавьте этот файл в тот же проект Apps Script, что и основной скрипт.
//
// Зачем: в листе «Участники» колонка ФИО пока пустая, а для эфира
// нужны фамилия, имя и фото. Функция берёт VK ID участников,
// запрашивает у VK имя/фамилию/фото и пишет лист «Финал».
// Лист «Финал» скачивается как CSV (Файл → Скачать → CSV)
// и загружается на сайт через пульт ведущего (клавиша H).
//
// Подготовка (один раз):
//   1. Создать сервисный ключ VK: vk.com/apps?act=manage → своё приложение →
//      Настройки → «Сервисный ключ доступа».
//   2. Apps Script → Настройки проекта → Свойства скрипта →
//      добавить VK_SERVICE_TOKEN = <сервисный ключ>.
//   3. Запустить buildFinalSheet.
// ============================================================

var SHEET_FINAL = 'Финал';
var VK_API_VERSION = '5.199';
var VK_BATCH = 500; // сколько ID в одном запросе users.get

function buildFinalSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var token = PropertiesService.getScriptProperties().getProperty('VK_SERVICE_TOKEN');
  if (!token) throw new Error('Не задано свойство скрипта VK_SERVICE_TOKEN');

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
  for (var s = 0; s < people.length; s += VK_BATCH) {
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
  Logger.log('Лист «' + SHEET_FINAL + '» готов: ' + (out.length - 1) + ' участников. Скачайте его как CSV.');
}
