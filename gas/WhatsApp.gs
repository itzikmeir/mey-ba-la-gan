/**
 * WhatsApp.gs – Send WhatsApp messages via Green API (optional)
 * Falls back gracefully if not configured.
 *
 * To enable: set GREEN_API_INSTANCE and GREEN_API_TOKEN in Script Properties.
 * See: https://green-api.com/
 */

function sendWhatsAppMessage(phone, message) {
  var props    = PropertiesService.getScriptProperties();
  var instance = props.getProperty('GREEN_API_INSTANCE');
  var token    = props.getProperty('GREEN_API_TOKEN');

  if (!instance || !token) {
    // Green API not configured – skip silently
    // Admin can use wa.me links instead
    return false;
  }

  var normalized = normalizePhone(phone);
  var waPhone    = normalized.startsWith('0') ? '972' + normalized.slice(1) : normalized;
  var chatId     = waPhone + '@c.us';
  var url        = 'https://api.green-api.com/waInstance' + instance + '/sendMessage/' + token;

  try {
    var response = UrlFetchApp.fetch(url, {
      method:      'post',
      contentType: 'application/json',
      payload:     JSON.stringify({ chatId: chatId, message: message }),
      muteHttpExceptions: true,
    });

    var code = response.getResponseCode();
    if (code !== 200) {
      Logger.log('WhatsApp send failed for ' + phone + ': HTTP ' + code + ' – ' + response.getContentText());
      return false;
    }
    return true;
  } catch (err) {
    Logger.log('WhatsApp send exception for ' + phone + ': ' + err.message);
    return false;
  }
}

// ── Build wa.me link (always available, no API needed) ────
function buildWaLink(phone, message) {
  var normalized = normalizePhone(phone);
  var waPhone    = normalized.startsWith('0') ? '972' + normalized.slice(1) : normalized;
  return 'https://wa.me/' + waPhone + '?text=' + encodeURIComponent(message);
}

// ── Message templates ─────────────────────────────────────
function msgReminder(displayName, childNames, date, deadline, appUrl) {
  return 'שלום ' + displayName + ' 😊\n' +
    'עדיין לא נרשמת לגן מחר (' + formatDateHebrew(date) + ') עבור: ' + childNames + '.\n' +
    'אנא הירשם עד ' + deadline + ' בקישור:\n' + appUrl;
}

function msgAssignment(childName, date, shiftName, arrival, endTime) {
  return '📋 שיבוץ גן – ' + formatDateHebrew(date) + ':\n' +
    childName + ' משובץ/ת למשמרת ' + shiftName + '\n' +
    '⏰ ' + arrival + ' – ' + endTime;
}

function msgSwapApproved(childName, date, shiftName, arrival, endTime) {
  return '✅ בקשת ההחלפה של ' + childName + ' ב-' + formatDateHebrew(date) + ' אושרה!\n' +
    'משמרת חדשה: ' + shiftName + ' (' + arrival + '-' + endTime + ')';
}

function msgSwapRejected(childName, date, note) {
  return '❌ בקשת ההחלפה של ' + childName + ' ב-' + formatDateHebrew(date) + ' לא אושרה.' +
    (note ? '\nהסבר: ' + note : '');
}

// ── Format date as Hebrew-friendly string ─────────────────
function formatDateHebrew(dateStr) {
  // dateStr = YYYY-MM-DD
  if (!dateStr) return dateStr;
  var parts = dateStr.split('-');
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}
