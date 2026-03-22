/**
 * Algorithm.gs – Core shift assignment algorithm
 *
 * Implements fair assignment with rotation tracking:
 *  1. Remove absent children
 *  2. Assign special parents (both shifts)
 *  3. If balanced → assign by preference
 *  4. If oversubscribed → bump lowest-debt children first
 *  5. Update rotation tracking
 *  6. Write to history
 */

// ── Main entry point ──────────────────────────────────────
function adminRunAssignment(payload) {
  validateAdminToken(payload.admin_token);
  var date  = payload.date || todayStr();
  var force = payload.force === true;

  var config = getDailyConfigForDate(date);
  if (!config) throw new Error('הגדרות יום לא נמצאו לתאריך ' + date);

  // Guard against double-run
  if (config.status === 'assigned' && !force) {
    throw new Error('השיבוץ כבר בוצע לתאריך זה. השתמש ב-force:true להרצה חוזרת.');
  }

  // If re-run: reverse previous rotation updates
  var previousAssignments = [];
  if (config.status === 'assigned') {
    previousAssignments = getSubmissionsForDate(date).filter(function(s) { return !!s.assigned_shift; });
    reverseRotationUpdates(previousAssignments, date);
  }

  var submissions = getSubmissionsForDate(date);
  if (submissions.length === 0) {
    throw new Error('אין הגשות לתאריך ' + date + '. אנא המתן עד שהורים יגישו העדפות.');
  }

  var rotationMap = getAllRotationRecords();
  var assignments = [];
  var log         = [];

  // ── Step 1: Handle absent children ─────────────────────
  var present = [];
  submissions.forEach(function(s) {
    if (s.preference_1 === 'absent') {
      assignments.push({ child_id: s.child_id, child_name: s.child_name, assigned_shift: 'absent', assignment_reason: 'absent' });
      log.push({ child_id: s.child_id, child_name: s.child_name, preference: 'absent', assigned: 'absent', reason: 'absent' });
    } else {
      present.push(s);
    }
  });

  // ── Step 2: Special parents (both shifts) ───────────────
  var regular = [];
  present.forEach(function(s) {
    if (s.is_special && s.preference_2) {
      // Assign to whichever shift makes sense; they attend both
      // We record their primary preference as their assigned shift,
      // with a note that they cover both
      ['shift1', 'shift2'].forEach(function(sh) {
        assignments.push({ child_id: s.child_id + '_' + sh, child_name: s.child_name, assigned_shift: sh, assignment_reason: 'special' });
      });
      log.push({ child_id: s.child_id, child_name: s.child_name, preference: s.preference_1, assigned: 'both', reason: 'special' });
    } else {
      regular.push(s);
    }
  });

  // ── Step 3: Count preferences ───────────────────────────
  var wantsShift1 = regular.filter(function(s) { return s.preference_1 === 'shift1'; });
  var wantsShift2 = regular.filter(function(s) { return s.preference_1 === 'shift2'; });
  var total       = regular.length;

  var oversubscribed       = false;
  var oversubscribedShift  = null;

  if (total === 0) {
    // Nothing to assign
  } else if (wantsShift1.length <= Math.ceil(total / 2) && wantsShift2.length <= Math.ceil(total / 2)) {
    // ── Step 4a: Balanced – assign by preference ──────────
    regular.forEach(function(s) {
      assignments.push({ child_id: s.child_id, child_name: s.child_name, assigned_shift: s.preference_1, assignment_reason: 'preference' });
      log.push({ child_id: s.child_id, child_name: s.child_name, preference: s.preference_1, assigned: s.preference_1, reason: 'preference' });
    });
  } else {
    // ── Step 4b: Oversubscribed ───────────────────────────
    oversubscribed = true;
    var overGroup, underGroup, overShift, underShift;

    if (wantsShift1.length > wantsShift2.length) {
      overGroup  = wantsShift1;
      underGroup = wantsShift2;
      overShift  = 'shift1';
      underShift = 'shift2';
    } else {
      overGroup  = wantsShift2;
      underGroup = wantsShift1;
      overShift  = 'shift2';
      underShift = 'shift1';
    }
    oversubscribedShift = overShift;

    var capacity     = Math.ceil(total / 2);
    var mustBump     = overGroup.length - capacity;

    // Assign undersubscribed group by preference
    underGroup.forEach(function(s) {
      assignments.push({ child_id: s.child_id, child_name: s.child_name, assigned_shift: underShift, assignment_reason: 'preference' });
      log.push({ child_id: s.child_id, child_name: s.child_name, preference: underShift, assigned: underShift, reason: 'preference' });
    });

    if (mustBump <= 0) {
      // Everyone fits
      overGroup.forEach(function(s) {
        assignments.push({ child_id: s.child_id, child_name: s.child_name, assigned_shift: overShift, assignment_reason: 'preference' });
        log.push({ child_id: s.child_id, child_name: s.child_name, preference: overShift, assigned: overShift, reason: 'preference' });
      });
    } else {
      // Sort by bumpScore ASCENDING (lowest debt = bumped first)
      var sorted = overGroup.slice().sort(function(a, b) {
        var scoreA = computeBumpScore(rotationMap[a.child_id], date);
        var scoreB = computeBumpScore(rotationMap[b.child_id], date);
        if (scoreA !== scoreB) return scoreA - scoreB;
        // Tie: who was bumped most recently SURVIVES (they suffered more recently)
        var recA = rotationMap[a.child_id];
        var recB = rotationMap[b.child_id];
        var dateA = recA ? recA.last_bumped_date : '';
        var dateB = recB ? recB.last_bumped_date : '';
        if (dateA !== dateB) return dateB < dateA ? -1 : 1; // more recent first in sorted = survives
        // Final tie: deterministic random
        return deterministicRandom(date, a.child_id) - deterministicRandom(date, b.child_id);
      });

      var toBump = sorted.slice(0, mustBump);
      var toKeep = sorted.slice(mustBump);

      toKeep.forEach(function(s) {
        var bumpDebt = rotationMap[s.child_id] ? rotationMap[s.child_id].bump_debt : 0;
        assignments.push({ child_id: s.child_id, child_name: s.child_name, assigned_shift: overShift, assignment_reason: bumpDebt > 0 ? 'rotation_priority' : 'preference' });
        log.push({ child_id: s.child_id, child_name: s.child_name, preference: overShift, assigned: overShift, reason: 'preference', bump_debt_before: bumpDebt });
      });

      toBump.forEach(function(s) {
        var bumpDebt = rotationMap[s.child_id] ? rotationMap[s.child_id].bump_debt : 0;
        assignments.push({ child_id: s.child_id, child_name: s.child_name, assigned_shift: underShift, assignment_reason: 'bumped' });
        log.push({ child_id: s.child_id, child_name: s.child_name, preference: overShift, assigned: underShift, reason: 'bumped', bump_debt_before: bumpDebt });
      });
    }
  }

  // ── Step 5: Write assignments to Submissions sheet ──────
  writeAssignmentsToSubmissions(date, assignments);

  // ── Step 6: Update rotation tracking ───────────────────
  updateRotationAfterAssignment(assignments, date, previousAssignments);

  // ── Step 7: Write to history ────────────────────────────
  var shift1Count = assignments.filter(function(a) { return a.assigned_shift === 'shift1'; }).length;
  var shift2Count = assignments.filter(function(a) { return a.assigned_shift === 'shift2'; }).length;
  writeToHistory(date, submissions, assignments, oversubscribed, shift1Count, shift2Count);

  // ── Step 8: Update config status to 'assigned' ─────────
  updateConfigStatus(date, 'assigned');

  // ── Step 9: Send results notifications ─────────────────
  notifyAssignmentResults(date, config, assignments);

  return {
    assignments:         assignments,
    oversubscribed:      oversubscribed,
    oversubscribed_shift:oversubscribedShift,
    algorithm_log:       log,
  };
}

// ── Write assignments back to Submissions sheet ───────────
function writeAssignmentsToSubmissions(date, assignments) {
  var sheet   = getSheet(SUBMISSIONS_SHEET);
  var allData = sheet.getDataRange().getValues();
  var now     = nowIso();

  assignments.forEach(function(a) {
    for (var i = 1; i < allData.length; i++) {
      if (String(allData[i][0]).trim() === date && String(allData[i][3]).trim() === a.child_id) {
        sheet.getRange(i + 1, COL_S.ASSIGNED).setValue(a.assigned_shift);
        sheet.getRange(i + 1, COL_S.REASON).setValue(a.assignment_reason);
        sheet.getRange(i + 1, COL_S.UPDATED_AT).setValue(now);
        break;
      }
    }
  });
}

// ── Update config status ──────────────────────────────────
function updateConfigStatus(date, status) {
  var sheet   = getSheet(CONFIG_SHEET);
  var allData = sheet.getDataRange().getValues();
  for (var i = 1; i < allData.length; i++) {
    if (String(allData[i][0]).trim() === date) {
      sheet.getRange(i + 1, 14).setValue(status); // column N = status
      sheet.getRange(i + 1, 16).setValue(nowIso()); // column P = updated_at
      return;
    }
  }
}

// ── Deterministic random for tie-breaking ────────────────
function deterministicRandom(date, childId) {
  var raw = date + '|' + childId;
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return (digest[0] & 0xff) * 256 + (digest[1] & 0xff);
}

// ── Notify parents of results via WhatsApp ────────────────
function notifyAssignmentResults(date, config, assignments) {
  var parents = getAllParents().filter(function(p) { return p.active; });
  parents.forEach(function(parent) {
    var children  = parseJsonSafe(parent.children, []);
    var myAssigns = assignments.filter(function(a) {
      return children.some(function(c) { return c.id === a.child_id; });
    });
    if (myAssigns.length === 0) return;

    var lines = myAssigns.map(function(a) {
      if (a.assigned_shift === 'absent') return a.child_name + ': לא מגיע/ה';
      var shiftInfo = a.assigned_shift === 'shift1' ? config.shift1 : config.shift2;
      return a.child_name + ': ' + (shiftInfo ? shiftInfo.name + ' ' + shiftInfo.arrival + '-' + shiftInfo.end : a.assigned_shift);
    });

    var msg = '📋 שיבוץ משמרות לגן – ' + date + ':\n' + lines.join('\n');
    try {
      sendWhatsAppMessage(parent.phone, msg);
    } catch (e) { /* swallow */ }
  });
}
