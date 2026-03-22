/**
 * Parents.gs – CRUD operations for the Parents sheet
 *
 * Sheet columns (1-indexed):
 *  A=phone  B=family_id  C=children(JSON)  D=display_name  E=active  F=notes  G=created_at
 */

var PARENTS_SHEET = 'Parents';
var COL_P = { PHONE:1, FAMILY_ID:2, CHILDREN:3, DISPLAY_NAME:4, ACTIVE:5, NOTES:6, CREATED_AT:7 };

// ── Read ──────────────────────────────────────────────────
function getAllParents() {
  var sheet = getSheet(PARENTS_SHEET);
  var data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1).map(rowToParent).filter(function(p) { return !!p.phone; });
}

function findParentByPhone(phone) {
  var normalized = normalizePhone(phone);
  return getAllParents().find(function(p) { return normalizePhone(p.phone) === normalized; }) || null;
}

function findParentByFamilyId(familyId) {
  return getAllParents().find(function(p) { return p.family_id === familyId; }) || null;
}

function rowToParent(row) {
  return {
    phone:        String(row[COL_P.PHONE - 1] || '').trim(),
    family_id:    String(row[COL_P.FAMILY_ID - 1] || '').trim(),
    children:     parseJsonSafe(row[COL_P.CHILDREN - 1], []),
    display_name: String(row[COL_P.DISPLAY_NAME - 1] || '').trim(),
    active:       row[COL_P.ACTIVE - 1] === true || row[COL_P.ACTIVE - 1] === 'TRUE',
    notes:        String(row[COL_P.NOTES - 1] || '').trim(),
    created_at:   String(row[COL_P.CREATED_AT - 1] || '').trim(),
  };
}

// ── Admin: get all parents ─────────────────────────────────
function adminGetParents(payload) {
  validateAdminToken(payload.admin_token);
  return { parents: getAllParents() };
}

// ── Admin: save (create or update) parent ─────────────────
function adminSaveParent(payload) {
  validateAdminToken(payload.admin_token);
  var p = payload.parent;
  if (!p || !p.phone) throw new Error('פרטי הורה חסרים');
  p.phone = normalizePhone(p.phone);

  // Ensure family_id
  if (!p.family_id) p.family_id = Utilities.getUuid();

  // Ensure each child has an id
  var children = (p.children || []).map(function(c) {
    return { id: c.id || Utilities.getUuid(), name: c.name };
  });

  var sheet    = getSheet(PARENTS_SHEET);
  var allData  = sheet.getDataRange().getValues();
  var rowIndex = -1;

  for (var i = 1; i < allData.length; i++) {
    if (normalizePhone(String(allData[i][0])) === p.phone) {
      rowIndex = i + 1; // 1-indexed sheet row
      break;
    }
  }

  var row = [
    p.phone,
    p.family_id,
    JSON.stringify(children),
    p.display_name || '',
    p.active !== false,
    p.notes || '',
    rowIndex === -1 ? nowIso() : allData[rowIndex - 2][COL_P.CREATED_AT - 1],
  ];

  if (rowIndex === -1) {
    sheet.appendRow(row);
  } else {
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  }

  // Update rotation tracking for new children
  children.forEach(function(c) {
    ensureRotationRecord(c.id, c.name, p.family_id);
  });

  return { saved: true, family_id: p.family_id };
}

// ── Admin: soft-delete parent ──────────────────────────────
function adminDeleteParent(payload) {
  validateAdminToken(payload.admin_token);
  var phone = normalizePhone(payload.phone);
  if (!phone) throw new Error('מספר טלפון חסר');

  var sheet   = getSheet(PARENTS_SHEET);
  var allData = sheet.getDataRange().getValues();

  for (var i = 1; i < allData.length; i++) {
    if (normalizePhone(String(allData[i][0])) === phone) {
      sheet.getRange(i + 1, COL_P.ACTIVE).setValue(false);
      return { deleted: true };
    }
  }
  throw new Error('הורה לא נמצא: ' + phone);
}
