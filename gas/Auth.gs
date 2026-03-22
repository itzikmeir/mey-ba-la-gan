/**
 * Auth.gs – Authentication for parents and admin
 *
 * Parent auth: phone number → session token (valid for current calendar day)
 * Admin auth:  password → admin token (valid for current calendar day)
 *
 * Tokens are deterministic per day so no storage is needed:
 *   token = SHA256(phone + date + SALT)
 */

// ── Parent login ──────────────────────────────────────────
function authLogin(payload) {
  var phone = normalizePhone(payload.phone);
  if (!phone) throw new Error('מספר טלפון חסר');

  var parent = findParentByPhone(phone);
  if (!parent) {
    throw new Error('מספר הטלפון אינו רשום במערכת. אנא פנה למנהל הגן.');
  }

  if (!parent.active) {
    throw new Error('חשבון זה אינו פעיל. אנא פנה למנהל הגן.');
  }

  var date  = todayStr();
  var token = generateSessionToken(phone, date);

  // Check if this parent is special today
  var config = getDailyConfigForDate(date);
  var isSpecial = false;
  if (config && config.special_phone_list) {
    var specialList = parseJsonSafe(config.special_phone_list, []);
    isSpecial = specialList.some(function(p) { return normalizePhone(p) === phone; });
  }

  return {
    session_token: token,
    family_id: parent.family_id,
    children: parseJsonSafe(parent.children, []),
    display_name: parent.display_name,
    is_special_today: isSpecial,
  };
}

// ── Validate parent session ────────────────────────────────
function authValidate(payload) {
  var token = payload.session_token;
  var phone = resolvePhoneFromToken(token);
  return { valid: !!phone, phone: phone || null };
}

// ── Admin login ───────────────────────────────────────────
function adminLogin(payload) {
  var props    = PropertiesService.getScriptProperties();
  var stored   = props.getProperty('ADMIN_PASSWORD');
  if (!stored) throw new Error('סיסמת מנהל לא הוגדרה. אנא הגדר ADMIN_PASSWORD ב-Script Properties.');

  if (payload.password !== stored) {
    throw new Error('סיסמה שגויה');
  }

  var date  = todayStr();
  var token = generateAdminToken(date);
  return { admin_token: token };
}

// ── Token generation ──────────────────────────────────────
function generateSessionToken(phone, date) {
  var props = PropertiesService.getScriptProperties();
  var salt  = props.getProperty('SESSION_SALT') || 'default-salt-change-me';
  var raw   = phone + '|' + date + '|' + salt;
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw)
    .map(function(b) { return ('0' + (b & 0xff).toString(16)).slice(-2); })
    .join('');
}

function generateAdminToken(date) {
  var props = PropertiesService.getScriptProperties();
  var salt  = props.getProperty('SESSION_SALT') || 'default-salt-change-me';
  var raw   = 'ADMIN|' + date + '|' + salt;
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw)
    .map(function(b) { return ('0' + (b & 0xff).toString(16)).slice(-2); })
    .join('');
}

// ── Token resolution ──────────────────────────────────────
// Try to find which phone produced this token for today
function resolvePhoneFromToken(token) {
  if (!token) return null;
  var date    = todayStr();
  var parents = getAllParents();
  for (var i = 0; i < parents.length; i++) {
    var p = parents[i];
    if (!p.active) continue;
    if (generateSessionToken(normalizePhone(p.phone), date) === token) {
      return normalizePhone(p.phone);
    }
  }
  return null;
}

function validateAdminToken(token) {
  if (!token) throw new Error('נדרשת הרשאת מנהל');
  var expected = generateAdminToken(todayStr());
  if (token !== expected) throw new Error('הרשאת מנהל פגה או שגויה. אנא התחבר מחדש.');
}

// ── Require parent auth middleware ────────────────────────
function requireParentAuth(payload) {
  var token = payload.session_token;
  var phone = resolvePhoneFromToken(token);
  if (!phone) throw new Error('הפגישה פגה. אנא התחבר מחדש.');
  var parent = findParentByPhone(phone);
  if (!parent || !parent.active) throw new Error('המשתמש אינו פעיל.');
  return parent;
}

// ── Helpers ───────────────────────────────────────────────
function parseJsonSafe(str, fallback) {
  try {
    if (typeof str === 'object') return str;
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
}
