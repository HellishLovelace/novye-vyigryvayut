// ============================================================
// ЗАПИСЬ ИТОГОВ ФИНАЛА В ТАБЛИЦУ (сайт-трансляция → лист «Итоги финала»)
// Добавьте этот файл в проект Apps Script «Розыгрыш Новые Бирюзовые».
//
// Сайт после розыгрыша отправляет победителя, а затем 10 запасных
// POST-запросом на ту же ссылку /exec, что принимает заявки от BotMan.
// Чтобы doPost отличал итоги от заявок, в основном скрипте нужна ОДНА строка
// (в начале doPost, сразу после разбора JSON):
//
//     var data = JSON.parse(e.postData.contents);
//     if (data.action === 'final_log') return handleFinalLog(data);   // ← добавить
//
// Подготовка (один раз):
//   1. Свойства скрипта: FINAL_KEY = <любой длинный пароль> (тот же вводится в пульте сайта).
//   2. Развернуть → Управление развёртываниями → «Изменить» → «Новая версия».
//      Ссылка /exec не меняется, заявки от BotMan принимаются как раньше.
//   3. На сайте: H → ссылка /exec + FINAL_KEY → «Проверить связь».
// ============================================================

var SHEET_FINAL_LOG = 'Итоги финала';
var FINAL_LOG_HEADERS = ['ID розыгрыша', 'Дата и время (Владивосток)', 'Роль', 'Место', 'VK ID', 'Страница VK',
                         'Фамилия', 'Имя', 'Регион', 'Участников в барабане'];

function handleFinalLog(data) {
  var key = PropertiesService.getScriptProperties().getProperty('FINAL_KEY');
  if (!key || data.key !== key) return jsonResponse({ status: 'forbidden', message: 'Неверный ключ доступа' });
  var rows = data.rows || [];
  if (!rows.length) return jsonResponse({ status: 'ok', written: 0 });   // «Проверить связь»

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_FINAL_LOG);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_FINAL_LOG);
      sheet.getRange(1, 1, 1, FINAL_LOG_HEADERS.length).setValues([FINAL_LOG_HEADERS]).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    var drawId = String(data.drawId || '');
    var when = Utilities.formatDate(drawId ? new Date(drawId) : new Date(), 'Asia/Vladivostok', 'dd.MM.yyyy HH:mm:ss');

    // Повторная отправка того же розыгрыша не создаёт дублей: заменяем строки с тем же ID, ролью и местом
    var existing = sheet.getDataRange().getValues();
    for (var r = existing.length - 1; r >= 1; r--) {
      var same = rows.some(function (x) {
        return String(existing[r][0]) === drawId && existing[r][2] === x.role && Number(existing[r][3]) === Number(x.place);
      });
      if (same) sheet.deleteRow(r + 1);
    }

    var out = rows.map(function (x) {
      var vk = String(x.vkId || '');
      return [drawId, when, x.role, x.place, vk, vk ? 'https://vk.com/id' + vk : '',
              x.surname || '', x.name || '', x.region || '', data.total || ''];
    });
    var first = sheet.getLastRow() + 1;
    sheet.getRange(first, 1, out.length, 1).setNumberFormat('@');   // ID розыгрыша — текст, иначе Таблица сделает из него дату
    sheet.getRange(first, 5, out.length, 1).setNumberFormat('@');   // VK ID — тоже текст
    sheet.getRange(first, 1, out.length, out[0].length).setValues(out);
    return jsonResponse({ status: 'ok', written: out.length });
  } finally {
    lock.releaseLock();
  }
}
