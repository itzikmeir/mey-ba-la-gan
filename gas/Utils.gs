/**
 * Utils.gs – פונקציות עזר משותפות לכל הקבצים
 * חייב להיות הקובץ הראשון שמועתק ל-Apps Script
 */

// ── גישה לגיליון ──────────────────────────────────────────
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

// ── תאריך ושעה ────────────────────────────────────────────
function todayStr() {
  return Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd');
}

function nowIso() {
  return Utilities.formatDate(new Date(), 'Asia/Jerusalem', "yyyy-MM-dd'T'HH:mm:ss");
}

// ── עזר כללי ──────────────────────────────────────────────
function generateCode(length) {
  var chars  = '0123456789';
  var result = '';
  for (var i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function parseJsonSafe(str, fallback) {
  try {
    if (typeof str === 'object' && str !== null) return str;
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
}

// ── טלפון ─────────────────────────────────────────────────
function normalizePhone(phone) {
  if (!phone) return '';
  var p = String(phone).replace(/\D/g, '');
  if (p.startsWith('972')) p = '0' + p.slice(3);
  if (p.startsWith('00972')) p = '0' + p.slice(5);
  return p;
}

function phoneToWaId(phone) {
  var p = normalizePhone(phone);
  if (p.startsWith('0')) p = '972' + p.slice(1);
  return p + '@c.us';
}

// ── שליחת התראה למנהל בשגיאה ─────────────────────────────
function notifyAdminOfError(err) {
  try {
    var props      = PropertiesService.getScriptProperties();
    var adminPhone = props.getProperty('KINDERGARTEN_PHONE');
    if (!adminPhone) return;
    var msg = '⚠️ שגיאה במערכת מי בה לה גן:\n' + (err.message || String(err));
    sendWhatsAppMessage(adminPhone, msg);
  } catch (e) { /* swallow */ }
}
