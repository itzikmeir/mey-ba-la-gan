/**
 * Code.gs – נקודת כניסה ל-GAS Web App
 * מנתב את כל הבקשות POST ומחזיר תגובות JSON
 *
 * פונקציות עזר נמצאות ב-Utils.gs
 */

// ── בדיקת חיים (GET) ──────────────────────────────────────
function doGet(e) {
  return buildResponse({ status: 'ok', app: 'מי בה לה גן' });
}

// ── ראוטר ראשי (POST) ─────────────────────────────────────
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action  = payload.action;

    if (!action) return buildError('MISSING_ACTION', 'פעולה לא צוינה');

    // Auth
    if (action === 'auth.login')    return buildResponse(authLogin(payload));
    if (action === 'auth.validate') return buildResponse(authValidate(payload));
    if (action === 'admin.login')   return buildResponse(adminLogin(payload));

    // Parent
    if (action === 'parent.getDayInfo')        return buildResponse(parentGetDayInfo(payload));
    if (action === 'parent.submitPreference')  return buildResponse(parentSubmitPreference(payload));
    if (action === 'parent.setAbsent')         return buildResponse(parentSetAbsent(payload));
    if (action === 'parent.getResults')        return buildResponse(parentGetResults(payload));
    if (action === 'parent.submitSwapRequest') return buildResponse(parentSubmitSwapRequest(payload));

    // Admin
    if (action === 'admin.getDayConfig')        return buildResponse(adminGetDayConfig(payload));
    if (action === 'admin.setDayConfig')        return buildResponse(adminSetDayConfig(payload));
    if (action === 'admin.generateSpecialCode') return buildResponse(adminGenerateSpecialCode(payload));
    if (action === 'admin.getSubmissions')      return buildResponse(adminGetSubmissions(payload));
    if (action === 'admin.runAssignment')       return buildResponse(adminRunAssignment(payload));
    if (action === 'admin.overrideAssignment')  return buildResponse(adminOverrideAssignment(payload));
    if (action === 'admin.getSwapRequests')     return buildResponse(adminGetSwapRequests(payload));
    if (action === 'admin.resolveSwap')         return buildResponse(adminResolveSwap(payload));
    if (action === 'admin.getParents')          return buildResponse(adminGetParents(payload));
    if (action === 'admin.saveParent')          return buildResponse(adminSaveParent(payload));
    if (action === 'admin.deleteParent')        return buildResponse(adminDeleteParent(payload));
    if (action === 'admin.sendReminders')       return buildResponse(adminSendReminders(payload));
    if (action === 'admin.getHistory')          return buildResponse(adminGetHistory(payload));
    if (action === 'admin.getRotationStats')    return buildResponse(adminGetRotationStats(payload));

    return buildError('UNKNOWN_ACTION', 'פעולה לא מוכרת: ' + action);

  } catch (err) {
    notifyAdminOfError(err);
    return buildError('SERVER_ERROR', err.message || 'שגיאת שרת');
  }
}

// ── בוני תגובה ────────────────────────────────────────────
function buildResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function buildError(code, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: message, code: code }))
    .setMimeType(ContentService.MimeType.JSON);
}
