/**
 * Submissions.gs – Handle parent preference submissions
 *
 * Sheet columns (1-indexed):
 *  A=date  B=family_id  C=phone  D=child_id  E=child_name
 *  F=preference_1  G=preference_2  H=is_special
 *  I=assigned_shift  J=assignment_reason
 *  K=submitted_at  L=updated_at
 */

var SUBMISSIONS_SHEET = 'Submissions';
var COL_S = {
  DATE:1, FAMILY_ID:2, PHONE:3, CHILD_ID:4, CHILD_NAME:5,
  PREF1:6, PREF2:7, IS_SPECIAL:8,
  ASSIGNED:9, REASON:10,
  SUBMITTED_AT:11, UPDATED_AT:12
};

// ── Read submissions ──────────────────────────────────────
function getSubmissionsForDate(date) {
  var sheet = getSheet(SUBMISSIONS_SHEET);
  var data  = sheet.getDataRange().getValues();
  return data.slice(1)
    .filter(function(row) { return cellToDateStr(row[0]) === date; })
    .map(rowToSubmission);
}

function getSubmissionsForFamilyAndDate(familyId, date) {
  return getSubmissionsForDate(date).filter(function(s) { return s.family_id === familyId; });
}

function rowToSubmission(row) {
  return {
    date:              cellToDateStr(row[COL_S.DATE - 1]),
    family_id:         String(row[COL_S.FAMILY_ID - 1] || ''),
    phone:             String(row[COL_S.PHONE - 1] || ''),
    child_id:          String(row[COL_S.CHILD_ID - 1] || ''),
    child_name:        String(row[COL_S.CHILD_NAME - 1] || ''),
    preference_1:      String(row[COL_S.PREF1 - 1] || ''),
    preference_2:      String(row[COL_S.PREF2 - 1] || '') || undefined,
    is_special:        row[COL_S.IS_SPECIAL - 1] === true || row[COL_S.IS_SPECIAL - 1] === 'TRUE',
    assigned_shift:    String(row[COL_S.ASSIGNED - 1] || '') || undefined,
    assignment_reason: String(row[COL_S.REASON - 1] || '') || undefined,
    submitted_at:      String(row[COL_S.SUBMITTED_AT - 1] || ''),
    updated_at:        String(row[COL_S.UPDATED_AT - 1] || ''),
  };
}

// ── Parent: submit preferences ────────────────────────────
function parentSubmitPreference(payload) {
  var parent = requireParentAuth(payload);
  var date   = todayStr();
  var config = getDailyConfigForDate(date);

  if (!config) throw new Error('הגדרות יום מחר עוד לא הוכנסו על ידי הצוות. נסה שוב מאוחר יותר.');
  if (config.status === 'assigned') throw new Error('השיבוצים כבר בוצעו. אין אפשרות לשנות העדפה.');

  // Deadline check with 60-second grace
  if (config.deadline) {
    var deadline  = new Date(config.deadline);
    var now       = new Date();
    var graceMs   = 60 * 1000;
    if (now.getTime() > deadline.getTime() + graceMs) {
      throw new Error('מועד ההרשמה הסתיים ב-' + config.deadline.slice(11, 16) + '. לא ניתן לשנות העדפה.');
    }
  }

  var submissions = payload.submissions; // ChildPreference[]
  if (!submissions || submissions.length === 0) throw new Error('לא נבחרו העדפות');

  // Validate children belong to this family
  var parentChildren = parseJsonSafe(parent.children, []);
  var childIds = parentChildren.map(function(c) { return c.id; });

  // Check special status
  var specialList = config.special_phone_list || [];
  var isSpecialParent = specialList.some(function(p) { return normalizePhone(p) === normalizePhone(parent.phone); });

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    throw new Error('המערכת עמוסה. אנא נסה שנית עוד שנייה.');
  }

  try {
    var sheet    = getSheet(SUBMISSIONS_SHEET);
    var allData  = sheet.getDataRange().getValues();
    var now      = nowIso();
    var savedIds = [];

    submissions.forEach(function(sub) {
      var childId = sub.child_id;
      if (childIds.indexOf(childId) === -1) throw new Error('ילד לא שייך לחשבון זה: ' + childId);

      var parentChild = parentChildren.find(function(c) { return c.id === childId; });
      var childName   = parentChild ? parentChild.name : '';

      // Validate special code if second preference provided
      var isSpecial = false;
      if (sub.preference_2) {
        if (!isSpecialParent) throw new Error('אין הרשאה לבחור שתי משמרות ללא קוד מיוחד.');
        if (sub.special_code !== config.special_parent_code) throw new Error('קוד מיוחד שגוי.');
        isSpecial = true;
      }

      // Validate preference value
      var validPrefs = ['shift1', 'shift2', 'absent'];
      if (validPrefs.indexOf(sub.preference_1) === -1) throw new Error('בחירת משמרת לא תקינה.');

      // Find existing row for this child+date
      var existingRowIndex = -1;
      var existingSubmittedAt = now;
      for (var i = 1; i < allData.length; i++) {
        if (cellToDateStr(allData[i][0]) === date && String(allData[i][3]).trim() === childId) {
          existingRowIndex = i + 1;
          existingSubmittedAt = String(allData[i][COL_S.SUBMITTED_AT - 1]) || now;
          break;
        }
      }

      var row = [
        date,
        parent.family_id,
        normalizePhone(parent.phone),
        childId,
        childName,
        sub.preference_1,
        sub.preference_2 || '',
        isSpecial,
        '', // assigned_shift – filled by algorithm
        '', // assignment_reason
        existingSubmittedAt,
        now,
      ];

      if (existingRowIndex === -1) {
        sheet.appendRow(row);
        savedIds.push(childId);
        // Also update allData to avoid duplicates within same request
        allData.push(row);
      } else {
        sheet.getRange(existingRowIndex, 1, 1, row.length).setValues([row]);
        savedIds.push(childId);
        allData[existingRowIndex - 1] = row;
      }
    });

    markDbUpdated();
    return { submitted: true, child_ids: savedIds, submitted_at: now };

  } finally {
    lock.releaseLock();
  }
}

// ── Parent: set absent ────────────────────────────────────
function parentSetAbsent(payload) {
  var parent  = requireParentAuth(payload);
  var date    = todayStr();
  var config  = getDailyConfigForDate(date);

  if (config && config.status === 'assigned') {
    throw new Error('השיבוצים כבר בוצעו. לא ניתן לשנות.');
  }

  var childIds = payload.child_ids || [];
  if (childIds.length === 0) throw new Error('לא נבחרו ילדים');

  var parentChildren = parseJsonSafe(parent.children, []);

  // Use submitPreference internally
  var absentSubmissions = childIds.map(function(id) {
    return { child_id: id, preference_1: 'absent' };
  });

  return parentSubmitPreference({
    session_token: payload.session_token,
    submissions:   absentSubmissions,
  });
}

// ── Parent: get results (only after deadline) ─────────────
function parentGetResults(payload) {
  var parent = requireParentAuth(payload);
  var date   = todayStr();
  var config = getDailyConfigForDate(date);

  if (!config || config.status !== 'assigned') {
    throw new Error('התוצאות יפורסמו לאחר תום ההרשמה ועיבוד המנגנון.');
  }

  var submissions = getSubmissionsForFamilyAndDate(parent.family_id, date);

  return {
    assignments: submissions.map(function(s) {
      var shiftDetails = null;
      if (s.assigned_shift === 'shift1') shiftDetails = config.shift1;
      if (s.assigned_shift === 'shift2') shiftDetails = config.shift2;
      return {
        child_id:        s.child_id,
        child_name:      s.child_name,
        assigned_shift:  s.assigned_shift,
        shift_details:   shiftDetails,
        assignment_reason: s.assignment_reason,
      };
    }),
  };
}

// ── Admin: get all submissions for a date ─────────────────
function adminGetSubmissions(payload) {
  validateAdminToken(payload.admin_token);
  var date    = payload.date || todayStr();
  var subs    = getSubmissionsForDate(date);
  var parents = getAllParents().filter(function(p) { return p.active; });

  // Find submitted child IDs
  var submittedChildIds = subs.map(function(s) { return s.child_id; });

  // Build not-submitted list
  var notSubmitted = [];
  parents.forEach(function(p) {
    var children = parseJsonSafe(p.children, []);
    var missing  = children.filter(function(c) { return submittedChildIds.indexOf(c.id) === -1; });
    if (missing.length > 0) {
      notSubmitted.push({
        family_id:    p.family_id,
        display_name: p.display_name,
        phone:        p.phone,
        children:     missing,
      });
    }
  });

  var absentCount = subs.filter(function(s) { return s.preference_1 === 'absent'; }).length;

  return {
    submissions:   subs,
    not_submitted: notSubmitted,
    absent_count:  absentCount,
    total_children: subs.length + notSubmitted.reduce(function(acc, p) { return acc + p.children.length; }, 0),
  };
}

// ── Admin: swap request ────────────────────────────────────
function parentSubmitSwapRequest(payload) {
  var parent = requireParentAuth(payload);
  var date   = todayStr();

  var sheet = getSheet('SwapRequests');
  var reqId = Utilities.getUuid();
  var now   = nowIso();

  var row = [
    reqId,
    date,
    parent.family_id,
    normalizePhone(parent.phone),
    payload.child_id   || '',
    payload.child_name || '',
    payload.current_shift   || '',
    payload.requested_shift || '',
    payload.reason     || '',
    'pending',
    '', // admin_note
    now,
    '', // resolved_at
  ];

  sheet.appendRow(row);

  // Notify admin
  try {
    var adminPhone = PropertiesService.getScriptProperties().getProperty('KINDERGARTEN_PHONE');
    if (adminPhone) {
      sendWhatsAppMessage(adminPhone,
        '📋 בקשת החלפת משמרת חדשה מ-' + parent.display_name + ' עבור ' + (payload.child_name || '') +
        '. כנס לאפליקציה לאישור.');
    }
  } catch (e) { /* swallow */ }

  return { request_id: reqId };
}

function adminGetSwapRequests(payload) {
  validateAdminToken(payload.admin_token);
  var sheet = getSheet('SwapRequests');
  var data  = sheet.getDataRange().getValues();
  var requests = data.slice(1).map(function(row) {
    return {
      request_id:      String(row[0]),
      date:            cellToDateStr(row[1]),
      family_id:       String(row[2]),
      phone:           String(row[3]),
      child_id:        String(row[4]),
      child_name:      String(row[5]),
      current_shift:   String(row[6]),
      requested_shift: String(row[7]),
      reason:          String(row[8]),
      status:          String(row[9]),
      admin_note:      String(row[10]),
      requested_at:    String(row[11]),
      resolved_at:     String(row[12]),
    };
  });

  if (payload.date) {
    requests = requests.filter(function(r) { return r.date === payload.date; });
  }

  return { requests: requests };
}

function adminResolveSwap(payload) {
  validateAdminToken(payload.admin_token);
  var reqId    = payload.request_id;
  var decision = payload.decision; // 'approved' | 'rejected'
  var note     = payload.note || '';

  var sheet    = getSheet('SwapRequests');
  var allData  = sheet.getDataRange().getValues();
  var now      = nowIso();

  for (var i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === reqId) {
      var rowNum = i + 1;
      sheet.getRange(rowNum, 10).setValue(decision);
      sheet.getRange(rowNum, 11).setValue(note);
      sheet.getRange(rowNum, 13).setValue(now);

      if (decision === 'approved') {
        // Apply the swap in Submissions sheet
        var date        = String(allData[i][1]);
        var childId     = String(allData[i][4]);
        var newShift    = String(allData[i][7]);
        applyAssignmentOverride(date, childId, newShift, 'forced');

        // Notify parent
        try {
          var phone = String(allData[i][3]);
          var childName = String(allData[i][5]);
          var config = getDailyConfigForDate(date);
          var shiftInfo = newShift === 'shift1' ? config.shift1 : config.shift2;
          sendWhatsAppMessage(phone,
            '✅ בקשת החלפת המשמרת של ' + childName + ' ב-' + date + ' אושרה!\n' +
            'משמרת: ' + (shiftInfo ? shiftInfo.name + ' ' + shiftInfo.arrival + '-' + shiftInfo.end : newShift));
        } catch (e) { /* swallow */ }
      }

      return { resolved: true };
    }
  }
  throw new Error('בקשה לא נמצאה: ' + reqId);
}

// ── Admin: override assignment ────────────────────────────
function adminOverrideAssignment(payload) {
  validateAdminToken(payload.admin_token);
  var date    = payload.date || todayStr();
  var childId = payload.child_id;
  var newShift = payload.new_shift;
  var reason   = 'forced';

  if (!childId || !newShift) throw new Error('child_id ו-new_shift נדרשים');

  applyAssignmentOverride(date, childId, newShift, reason);
  return { updated: true };
}

function applyAssignmentOverride(date, childId, newShift, reason) {
  var sheet   = getSheet(SUBMISSIONS_SHEET);
  var allData = sheet.getDataRange().getValues();

  for (var i = 1; i < allData.length; i++) {
    if (cellToDateStr(allData[i][0]) === date && String(allData[i][3]).trim() === childId) {
      sheet.getRange(i + 1, COL_S.ASSIGNED).setValue(newShift);
      sheet.getRange(i + 1, COL_S.REASON).setValue(reason);
      sheet.getRange(i + 1, COL_S.UPDATED_AT).setValue(nowIso());
      return;
    }
  }
  throw new Error('הגשה לא נמצאה לילד ' + childId + ' בתאריך ' + date);
}

// ── Admin: send reminders (returns wa.me links) ────────────
function adminSendReminders(payload) {
  validateAdminToken(payload.admin_token);
  var date   = payload.date || todayStr();
  var config = getDailyConfigForDate(date);
  if (!config) throw new Error('הגדרות יום לא נמצאו');

  var result   = adminGetSubmissions({ admin_token: payload.admin_token, date: date });
  var targets  = payload.phones
    ? result.not_submitted.filter(function(p) { return payload.phones.indexOf(p.phone) !== -1; })
    : result.not_submitted;

  var appUrl   = PropertiesService.getScriptProperties().getProperty('APP_URL') || 'https://your-github-username.github.io/mey-ba-la-gan/';
  var deadline = config.deadline ? config.deadline.slice(11, 16) : '';

  var waLinks = targets.map(function(t) {
    var childNames = t.children.map(function(c) { return c.name; }).join(', ');
    var msg = 'שלום ' + t.display_name + ' 😊\n' +
      'עדיין לא נרשמת לגן מחר (' + date + ') עבור: ' + childNames + '.\n' +
      'אנא הירשם עד ' + deadline + ' בקישור:\n' + appUrl;
    var waPhone = t.phone.startsWith('0') ? '972' + t.phone.slice(1) : t.phone;
    var waLink  = 'https://wa.me/' + waPhone + '?text=' + encodeURIComponent(msg);

    // Also try Green API if configured
    sendWhatsAppMessage(t.phone, msg);

    return { phone: t.phone, display_name: t.display_name, wa_link: waLink };
  });

  return { wa_links: waLinks, count: waLinks.length };
}
