/**
 * Setup.gs – הרץ פעם אחת בלבד להקמת כל הגיליונות והכותרות
 *
 * איך להשתמש:
 *  1. פתח Apps Script
 *  2. בחר את הפונקציה setupAllSheets מהתפריט הנפתח
 *  3. לחץ ▶ Run
 *  4. אשר הרשאות בחלון שייפתח
 *  5. בדוק שב-Google Sheets נוצרו 6 גיליונות עם כותרות
 */

var SHEET_HEADERS = {
  'Parents': [
    'phone', 'family_id', 'children', 'display_name', 'active', 'notes', 'created_at'
  ],
  'DailyConfig': [
    'date', 'shift1_name', 'shift1_arrival', 'shift1_end', 'shift1_teachers',
    'shift2_name', 'shift2_arrival', 'shift2_end', 'shift2_teachers',
    'shift_duration_min', 'deadline', 'special_parent_code', 'special_phone_list',
    'status', 'created_at', 'updated_at'
  ],
  'Submissions': [
    'date', 'family_id', 'phone', 'child_id', 'child_name',
    'preference_1', 'preference_2', 'is_special',
    'assigned_shift', 'assignment_reason',
    'submitted_at', 'updated_at'
  ],
  'RotationTracking': [
    'child_id', 'child_name', 'family_id',
    'shift1_count', 'shift2_count',
    'bumped_count', 'last_bumped_date', 'bump_debt', 'last_updated'
  ],
  'History': [
    'date', 'child_id', 'child_name', 'family_id',
    'preference_1', 'preference_2', 'is_special',
    'assigned_shift', 'assignment_reason',
    'shift1_count', 'shift2_count', 'was_oversubscribed'
  ],
  'SwapRequests': [
    'request_id', 'date', 'family_id', 'phone', 'child_id', 'child_name',
    'current_shift', 'requested_shift', 'reason',
    'status', 'admin_note', 'requested_at', 'resolved_at'
  ],
};

// ── פונקציה ראשית – הרץ אותה פעם אחת ──────────────────────
function setupAllSheets() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var log = [];

  Object.keys(SHEET_HEADERS).forEach(function(sheetName) {
    var headers = SHEET_HEADERS[sheetName];
    var sheet   = ss.getSheetByName(sheetName);

    // צור גיליון אם לא קיים
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      log.push('✅ נוצר גיליון: ' + sheetName);
    } else {
      log.push('📋 גיליון קיים: ' + sheetName);
    }

    // כתוב כותרות בשורה 1
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);

    // עיצוב שורת כותרות
    headerRange
      .setFontWeight('bold')
      .setBackground('#4f46e5')
      .setFontColor('#ffffff')
      .setHorizontalAlignment('center');

    // הקפא שורת כותרות
    sheet.setFrozenRows(1);

    // התאם רוחב עמודות אוטומטי
    sheet.autoResizeColumns(1, headers.length);

    log.push('   → ' + headers.length + ' כותרות הוגדרו');
  });

  // הצג סיכום
  var summary = '🎉 הגדרת הגיליונות הושלמה!\n\n' + log.join('\n');
  Logger.log(summary);
  SpreadsheetApp.getUi().alert('מי בה לה גן – הגדרה', summary, SpreadsheetApp.getUi().ButtonSet.OK);
}

// ── פונקציה עזר – מוסיפה כותרות לגיליון ספציפי בלבד ───────
function setupSingleSheet(sheetName) {
  var headers = SHEET_HEADERS[sheetName];
  if (!headers) {
    Logger.log('שם גיליון לא מוכר: ' + sheetName);
    return;
  }

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#4f46e5')
    .setFontColor('#ffffff')
    .setHorizontalAlignment('center');

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  Logger.log('✅ ' + sheetName + ' הוגדר עם ' + headers.length + ' כותרות');
}

// ── תפריט מהיר בגיליון ─────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🌈 מי בה לה גן')
    .addItem('⚙️ הגדר את כל הגיליונות', 'setupAllSheets')
    .addToUi();
}
