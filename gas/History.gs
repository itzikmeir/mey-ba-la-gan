/**
 * History.gs – Append-only historical records
 *
 * Sheet columns (1-indexed):
 *  A=date  B=child_id  C=child_name  D=family_id
 *  E=preference_1  F=preference_2  G=is_special
 *  H=assigned_shift  I=assignment_reason
 *  J=shift1_count  K=shift2_count  L=was_oversubscribed
 */

var HISTORY_SHEET = 'History';

function writeToHistory(date, submissions, assignments, wasOversubscribed, shift1Count, shift2Count) {
  var sheet = getSheet(HISTORY_SHEET);

  var assignMap = {};
  assignments.forEach(function(a) {
    assignMap[a.child_id] = a;
  });

  submissions.forEach(function(s) {
    var a = assignMap[s.child_id];
    if (!a) return;

    sheet.appendRow([
      date,
      s.child_id,
      s.child_name,
      s.family_id,
      s.preference_1,
      s.preference_2 || '',
      s.is_special,
      a.assigned_shift,
      a.assignment_reason,
      shift1Count,
      shift2Count,
      wasOversubscribed,
    ]);
  });
}

function adminGetHistory(payload) {
  validateAdminToken(payload.admin_token);
  var fromDate = payload.from_date || '';
  var toDate   = payload.to_date   || '';

  var sheet = getSheet(HISTORY_SHEET);
  var data  = sheet.getDataRange().getValues();

  var records = data.slice(1)
    .filter(function(row) {
      var d = String(row[0]).trim();
      if (fromDate && d < fromDate) return false;
      if (toDate   && d > toDate)   return false;
      return !!d;
    })
    .map(function(row) {
      return {
        date:              String(row[0]),
        child_id:          String(row[1]),
        child_name:        String(row[2]),
        family_id:         String(row[3]),
        preference_1:      String(row[4]),
        preference_2:      String(row[5]),
        is_special:        row[6] === true || row[6] === 'TRUE',
        assigned_shift:    String(row[7]),
        assignment_reason: String(row[8]),
        shift1_count:      Number(row[9]),
        shift2_count:      Number(row[10]),
        was_oversubscribed:row[11] === true || row[11] === 'TRUE',
      };
    });

  return { history: records };
}
