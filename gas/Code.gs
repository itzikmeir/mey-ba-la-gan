/**
 * Code.gs – Entry point for the GAS Web App
 * Routes all POST requests and returns JSON responses with CORS headers.
 *
 * מי בה לה גן – Google Apps Script Backend
 */

// ── CORS / Health-check for GET ──────────────────────────
function doGet(e) {
  return buildResponse({ success: true, data: { status: 'ok', app: 'מי בה לה גן' } });
}

// ── Main POST router ──────────────────────────────────────
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action  = payload.action;

    if (!action) return buildError('MISSING_ACTION', 'פעולה לא צוינה');

    // ── Auth ──────────────────────────────────────
    if (action === 'auth.login')    return buildResponse(authLogin(payload));
    if (action === 'auth.validate') return buildResponse(authValidate(payload));
    if (action === 'admin.login')   return buildResponse(adminLogin(payload));

    // ── Parent ────────────────────────────────────
    if (action === 'parent.getDayInfo')       return buildResponse(parentGetDayInfo(payload));
    if (action === 'parent.submitPreference') return buildResponse(parentSubmitPreference(payload));
    if (action === 'parent.setAbsent')        return buildResponse(parentSetAbsent(payload));
    if (action === 'parent.getResults')       return buildResponse(parentGetResults(payload));
    if (action === 'parent.submitSwapRequest')return buildResponse(parentSubmitSwapRequest(payload));

    // ── Admin ─────────────────────────────────────
    if (action === 'admin.getDayConfig')       return buildResponse(adminGetDayConfig(payload));
    if (action === 'admin.setDayConfig')       return buildResponse(adminSetDayConfig(payload));
    if (action === 'admin.generateSpecialCode')return buildResponse(adminGenerateSpecialCode(payload));
    if (action === 'admin.getSubmissions')     return buildResponse(adminGetSubmissions(payload));
    if (action === 'admin.runAssignment')      return buildResponse(adminRunAssignment(payload));
    if (action === 'admin.overrideAssignment') return buildResponse(adminOverrideAssignment(payload));
    if (action === 'admin.getSwapRequests')    return buildResponse(adminGetSwapRequests(payload));
    if (action === 'admin.resolveSwap')        return buildResponse(adminResolveSwap(payload));
    if (action === 'admin.getParents')         return buildResponse(adminGetParents(payload));
    if (action === 'admin.saveParent')         return buildResponse(adminSaveParent(payload));
    if (action === 'admin.deleteParent')       return buildResponse(adminDeleteParent(payload));
    if (action === 'admin.sendReminders')      return buildResponse(adminSendReminders(payload));
    if (action === 'admin.getHistory')         return buildResponse(adminGetHistory(payload));
    if (action === 'admin.getRotationStats')   return buildResponse(adminGetRotationStats(payload));

    return buildError('UNKNOWN_ACTION', 'פעולה לא מוכרת: ' + action);

  } catch (err) {
    notifyAdminOfError(err);
    return buildError('SERVER_ERROR', err.message || 'שגיאת שרת');
  }
}

// ── Response builders ─────────────────────────────────────
function buildResponse(data) {
  var output = ContentService
    .createTextOutput(JSON.stringify({ success: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

function buildError(code, message) {
  var output = ContentService
    .createTextOutput(JSON.stringify({ success: false, error: message, code: code }))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ── Admin alert on uncaught error ─────────────────────────
function notifyAdminOfError(err) {
  try {
    var props = PropertiesService.getScriptProperties();
    var adminPhone = props.getProperty('KINDERGARTEN_PHONE');
    if (!adminPhone) return;
    var msg = '⚠️ שגיאה במערכת מי בה לה גן:\n' + (err.message || String(err));
    sendWhatsAppMessage(adminPhone, msg);
  } catch (e) {
    // Swallow – we don't want a loop
  }
}

// ── Utility: get Spreadsheet ──────────────────────────────
function getSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var id    = props.getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('SPREADSHEET_ID לא הוגדר ב-Script Properties');
  return SpreadsheetApp.openById(id);
}

function getSheet(name) {
  var ss    = getSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('גיליון לא נמצא: ' + name);
  return sheet;
}

// ── Utility: today's date string YYYY-MM-DD (Jerusalem) ──
function todayStr() {
  return Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd');
}

function nowIso() {
  return Utilities.formatDate(new Date(), 'Asia/Jerusalem', "yyyy-MM-dd'T'HH:mm:ss");
}

// ── Utility: generate random code ─────────────────────────
function generateCode(length) {
  var chars = '0123456789';
  var result = '';
  for (var i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ── Utility: normalize Israeli phone ──────────────────────
function normalizePhone(phone) {
  if (!phone) return '';
  var p = String(phone).replace(/\D/g, '');
  if (p.startsWith('972')) p = '0' + p.slice(3);
  if (p.startsWith('+972')) p = '0' + p.slice(4);
  return p;
}

// ── Utility: phone to WhatsApp ID ─────────────────────────
function phoneToWaId(phone) {
  var p = normalizePhone(phone);
  if (p.startsWith('0')) p = '972' + p.slice(1);
  return p + '@c.us';
}
