/**
 * Rotation.gs – Fairness/rotation tracking
 *
 * Sheet columns (1-indexed):
 *  A=child_id  B=child_name  C=family_id
 *  D=shift1_count  E=shift2_count
 *  F=bumped_count  G=last_bumped_date  H=bump_debt  I=last_updated
 */

var ROTATION_SHEET = 'RotationTracking';
var COL_R = {
  CHILD_ID:1, CHILD_NAME:2, FAMILY_ID:3,
  SHIFT1_COUNT:4, SHIFT2_COUNT:5,
  BUMPED_COUNT:6, LAST_BUMPED_DATE:7, BUMP_DEBT:8, LAST_UPDATED:9
};

// ── Read all rotation records ─────────────────────────────
function getAllRotationRecords() {
  var sheet = getSheet(ROTATION_SHEET);
  var data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return {};
  var records = {};
  data.slice(1).forEach(function(row) {
    var id = String(row[0]).trim();
    if (id) records[id] = rowToRotation(row);
  });
  return records;
}

function rowToRotation(row) {
  return {
    child_id:        String(row[COL_R.CHILD_ID - 1]       || ''),
    child_name:      String(row[COL_R.CHILD_NAME - 1]     || ''),
    family_id:       String(row[COL_R.FAMILY_ID - 1]      || ''),
    shift1_count:    Number(row[COL_R.SHIFT1_COUNT - 1])  || 0,
    shift2_count:    Number(row[COL_R.SHIFT2_COUNT - 1])  || 0,
    bumped_count:    Number(row[COL_R.BUMPED_COUNT - 1])  || 0,
    last_bumped_date:String(row[COL_R.LAST_BUMPED_DATE-1] || ''),
    bump_debt:       Number(row[COL_R.BUMP_DEBT - 1])     || 0,
    last_updated:    String(row[COL_R.LAST_UPDATED - 1]   || ''),
  };
}

// ── Ensure a rotation record exists for a child ───────────
function ensureRotationRecord(childId, childName, familyId) {
  var sheet   = getSheet(ROTATION_SHEET);
  var allData = sheet.getDataRange().getValues();

  for (var i = 1; i < allData.length; i++) {
    if (String(allData[i][0]).trim() === childId) return; // exists
  }

  sheet.appendRow([childId, childName, familyId, 0, 0, 0, '', 0, nowIso()]);
}

// ── Compute bump score for a child (lower = bump first) ──
function computeBumpScore(record, currentDate) {
  if (!record) return 0;
  var debt = record.bump_debt || 0;
  if (!record.last_bumped_date || debt === 0) return 0;

  // Decay: 0.1 per day, max decays the whole debt
  var lastBumped = new Date(record.last_bumped_date);
  var current    = new Date(currentDate);
  var daysDiff   = Math.max(0, Math.round((current - lastBumped) / (1000 * 60 * 60 * 24)));
  var decay      = Math.min(daysDiff * 0.1, debt);
  return debt - decay;
}

// ── Bulk update rotation records after assignment ─────────
function updateRotationAfterAssignment(assignments, date, previousAssignments) {
  var sheet        = getSheet(ROTATION_SHEET);
  var allData      = sheet.getDataRange().getValues();
  var now          = nowIso();

  // Build a map of rowIndex by child_id
  var rowMap = {};
  for (var i = 1; i < allData.length; i++) {
    rowMap[String(allData[i][0]).trim()] = i + 1;
  }

  assignments.forEach(function(a) {
    var childId  = a.child_id;
    var rowIndex = rowMap[childId];
    if (!rowIndex) return;

    var rec = rowToRotation(allData[rowIndex - 2]);

    // Apply update based on reason
    if (a.assigned_shift === 'absent') {
      // No change to debt or counts
    } else if (a.assignment_reason === 'bumped') {
      rec.bumped_count    += 1;
      rec.bump_debt       += 1;
      rec.last_bumped_date = date;
      if (a.assigned_shift === 'shift1') rec.shift1_count += 1;
      else rec.shift2_count += 1;
    } else {
      // Assigned preferred shift: reduce debt slightly
      if (rec.bump_debt > 0) rec.bump_debt = Math.max(0, rec.bump_debt - 1);
      if (a.assigned_shift === 'shift1') rec.shift1_count += 1;
      else if (a.assigned_shift === 'shift2') rec.shift2_count += 1;
    }
    rec.last_updated = now;

    sheet.getRange(rowIndex, 1, 1, 9).setValues([[
      rec.child_id, rec.child_name, rec.family_id,
      rec.shift1_count, rec.shift2_count,
      rec.bumped_count, rec.last_bumped_date, rec.bump_debt,
      rec.last_updated,
    ]]);
  });
}

// ── Reverse rotation updates (for re-run) ─────────────────
function reverseRotationUpdates(previousAssignments, date) {
  if (!previousAssignments || previousAssignments.length === 0) return;

  var sheet   = getSheet(ROTATION_SHEET);
  var allData = sheet.getDataRange().getValues();
  var rowMap  = {};
  for (var i = 1; i < allData.length; i++) {
    rowMap[String(allData[i][0]).trim()] = i + 1;
  }
  var now = nowIso();

  previousAssignments.forEach(function(a) {
    if (a.assigned_shift === 'absent') return;
    var rowIndex = rowMap[a.child_id];
    if (!rowIndex) return;
    var rec = rowToRotation(allData[rowIndex - 2]);

    if (a.assignment_reason === 'bumped') {
      rec.bumped_count    = Math.max(0, rec.bumped_count - 1);
      rec.bump_debt       = Math.max(0, rec.bump_debt - 1);
      if (rec.last_bumped_date === date) rec.last_bumped_date = '';
    } else {
      if (rec.bump_debt < 10) rec.bump_debt += 1; // restore the debt we reduced
    }
    if (a.assigned_shift === 'shift1') rec.shift1_count = Math.max(0, rec.shift1_count - 1);
    else if (a.assigned_shift === 'shift2') rec.shift2_count = Math.max(0, rec.shift2_count - 1);

    rec.last_updated = now;
    sheet.getRange(rowIndex, 1, 1, 9).setValues([[
      rec.child_id, rec.child_name, rec.family_id,
      rec.shift1_count, rec.shift2_count,
      rec.bumped_count, rec.last_bumped_date, rec.bump_debt, rec.last_updated,
    ]]);
  });
}

// ── Admin: get rotation stats ─────────────────────────────
function adminGetRotationStats(payload) {
  validateAdminToken(payload.admin_token);
  var records = getAllRotationRecords();
  return { rotation: Object.values(records) };
}
