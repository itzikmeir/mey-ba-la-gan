/**
 * Config.gs – Read/write the DailyConfig sheet
 *
 * Sheet columns (1-indexed):
 *  A=date  B=shift1_name  C=shift1_arrival  D=shift1_end  E=shift1_teachers
 *  F=shift2_name  G=shift2_arrival  H=shift2_end  I=shift2_teachers
 *  J=shift_duration_min  K=deadline  L=special_parent_code  M=special_phone_list
 *  N=status  O=created_at  P=updated_at
 */

var CONFIG_SHEET = 'DailyConfig';

// ── המר תא תאריך ל-yyyy-MM-dd (Sheets ממיר תאריכים לאובייקט Date) ──
function cellToDateStr(cell) {
  if (cell instanceof Date) {
    return Utilities.formatDate(cell, 'Asia/Jerusalem', 'yyyy-MM-dd');
  }
  return String(cell || '').trim();
}

// ── Read config for a specific date ───────────────────────
function getDailyConfigForDate(date) {
  var sheet   = getSheet(CONFIG_SHEET);
  var data    = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (cellToDateStr(data[i][0]) === date) {
      return rowToConfig(data[i]);
    }
  }
  return null;
}

function rowToConfig(row) {
  return {
    date:                cellToDateStr(row[0]),
    shift1: {
      name:     String(row[1] || 'משמרת בוקר').trim(),
      arrival:  String(row[2] || '').trim(),
      end:      String(row[3] || '').trim(),
      teachers: String(row[4] || '').trim(),
    },
    shift2: {
      name:     String(row[5] || 'משמרת צהריים').trim(),
      arrival:  String(row[6] || '').trim(),
      end:      String(row[7] || '').trim(),
      teachers: String(row[8] || '').trim(),
    },
    shift_duration_min:  Number(row[9]) || 90,
    deadline:            String(row[10] || '').trim(),
    special_parent_code: String(row[11] || '').trim(),
    special_phone_list:  parseJsonSafe(row[12], []),
    status:              String(row[13] || 'draft').trim(),
    created_at:          String(row[14] || '').trim(),
    updated_at:          String(row[15] || '').trim(),
  };
}

// ── Get yesterday's config (for defaults) ─────────────────
function getYesterdayConfig() {
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var dateStr = Utilities.formatDate(yesterday, 'Asia/Jerusalem', 'yyyy-MM-dd');
  return getDailyConfigForDate(dateStr);
}

// ── Calculate end time given arrival + duration ────────────
function calcEndTime(arrivalHHMM, durationMin) {
  if (!arrivalHHMM || !durationMin) return '';
  var parts = arrivalHHMM.split(':');
  var h = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  var totalMin = h * 60 + m + parseInt(durationMin, 10);
  var endH = Math.floor(totalMin / 60) % 24;
  var endM = totalMin % 60;
  return ('0' + endH).slice(-2) + ':' + ('0' + endM).slice(-2);
}

// ── Parent: get day info ──────────────────────────────────
function parentGetDayInfo(payload) {
  var parent = requireParentAuth(payload);
  var date   = todayStr();
  var config = getDailyConfigForDate(date);

  if (!config) {
    // Return a "not configured yet" response
    return {
      date:   date,
      status: 'draft',
      shift1: null,
      shift2: null,
      deadline: null,
      existing_submissions: [],
      is_special_today: false,
    };
  }

  // Get existing submissions for this family
  var submissions = getSubmissionsForFamilyAndDate(parent.family_id, date);

  // Check special status
  var specialList = config.special_phone_list || [];
  var isSpecial = specialList.some(function(p) { return normalizePhone(p) === normalizePhone(parent.phone); });

  return {
    date:                 config.date,
    shift1:               config.shift1,
    shift2:               config.shift2,
    deadline:             config.deadline,
    status:               config.status,
    existing_submissions: submissions,
    is_special_today:     isSpecial,
  };
}

// ── Admin: get day config ──────────────────────────────────
function adminGetDayConfig(payload) {
  validateAdminToken(payload.admin_token);
  var date   = payload.date || todayStr();
  var config = getDailyConfigForDate(date);

  // If not found, build defaults from yesterday
  if (!config) {
    var yesterday = getYesterdayConfig();
    config = {
      date:                date,
      shift1:              yesterday ? yesterday.shift1 : { name: 'משמרת בוקר', arrival: '', end: '', teachers: '' },
      shift2:              yesterday ? yesterday.shift2 : { name: 'משמרת צהריים', arrival: '', end: '', teachers: '' },
      shift_duration_min:  yesterday ? yesterday.shift_duration_min : 90,
      deadline:            yesterday ? yesterday.deadline.replace(/\d{4}-\d{2}-\d{2}/, date) : date + 'T20:00',
      special_parent_code: '',
      special_phone_list:  [],
      status:              'draft',
    };
  }

  return { config: config };
}

// ── Admin: set day config ──────────────────────────────────
function adminSetDayConfig(payload) {
  validateAdminToken(payload.admin_token);
  var cfg = payload.config;
  if (!cfg || !cfg.date) throw new Error('תאריך חסר');

  // Auto-calculate end times
  cfg.shift1.end = calcEndTime(cfg.shift1.arrival, cfg.shift_duration_min);
  cfg.shift2.end = calcEndTime(cfg.shift2.arrival, cfg.shift_duration_min);

  var sheet   = getSheet(CONFIG_SHEET);
  var data    = sheet.getDataRange().getValues();
  var rowIndex = -1;
  var existingCreatedAt = nowIso();

  for (var i = 1; i < data.length; i++) {
    if (cellToDateStr(data[i][0]) === cfg.date) {
      rowIndex = i + 1;
      existingCreatedAt = data[i][14] || nowIso();
      break;
    }
  }

  var row = [
    cfg.date,
    cfg.shift1.name     || 'משמרת בוקר',
    cfg.shift1.arrival  || '',
    cfg.shift1.end      || '',
    cfg.shift1.teachers || '',
    cfg.shift2.name     || 'משמרת צהריים',
    cfg.shift2.arrival  || '',
    cfg.shift2.end      || '',
    cfg.shift2.teachers || '',
    cfg.shift_duration_min || 90,
    cfg.deadline        || '',
    cfg.special_parent_code || '',
    JSON.stringify(cfg.special_phone_list || []),
    cfg.status          || 'draft',
    existingCreatedAt,
    nowIso(),
  ];

  if (rowIndex === -1) {
    sheet.appendRow(row);
  } else {
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  }

  return { saved: true, config: rowToConfig(row) };
}

// ── Admin: generate daily special code ────────────────────
function adminGenerateSpecialCode(payload) {
  validateAdminToken(payload.admin_token);
  var date      = payload.date || todayStr();
  var phoneList = payload.phone_list || [];
  var code      = generateCode(6);

  // Save to config
  var config = getDailyConfigForDate(date);
  var newCfg = config || {
    date: date,
    shift1: { name: 'משמרת בוקר', arrival: '', end: '', teachers: '' },
    shift2: { name: 'משמרת צהריים', arrival: '', end: '', teachers: '' },
    shift_duration_min: 90,
    deadline: date + 'T20:00',
    status: 'draft',
  };
  newCfg.special_parent_code = code;
  newCfg.special_phone_list  = phoneList.map(normalizePhone);

  adminSetDayConfig({ admin_token: payload.admin_token, config: newCfg });

  return { code: code, phone_list: newCfg.special_phone_list };
}
