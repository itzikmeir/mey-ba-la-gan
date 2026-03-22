// ============================================================
// Types – מי בה לה גן
// ============================================================

export type ShiftId = 'shift1' | 'shift2'
export type PreferenceValue = ShiftId | 'absent'
export type AssignmentReason = 'preference' | 'bumped' | 'rotation_priority' | 'forced' | 'special' | 'absent'
export type DayStatus = 'draft' | 'open' | 'closed' | 'assigned'
export type SwapStatus = 'pending' | 'approved' | 'rejected'

// ── Child ──────────────────────────────────────────────────
export interface Child {
  id: string
  name: string
}

// ── Parent / Family ────────────────────────────────────────
export interface Parent {
  phone: string          // primary key – normalized 0521234567
  family_id: string      // groups multiple phones into one family
  children: Child[]
  display_name: string
  active: boolean
  notes?: string
}

// ── Shift info ─────────────────────────────────────────────
export interface ShiftInfo {
  name: string           // e.g. "בוקר"
  arrival: string        // "HH:MM"
  end: string            // "HH:MM"
  teachers: string       // comma-separated names
}

// ── Daily config ───────────────────────────────────────────
export interface DailyConfig {
  date: string           // YYYY-MM-DD
  shift1: ShiftInfo
  shift2: ShiftInfo
  shift_duration_min: number
  deadline: string       // ISO datetime YYYY-MM-DDTHH:MM
  special_parent_code: string
  special_phone_list: string[]
  status: DayStatus
}

// ── Submission (one per child per day) ────────────────────
export interface Submission {
  date: string
  family_id: string
  phone: string
  child_id: string
  child_name: string
  preference_1: PreferenceValue
  preference_2?: ShiftId       // only for special parents
  is_special: boolean
  assigned_shift?: PreferenceValue
  assignment_reason?: AssignmentReason
  submitted_at: string
  updated_at: string
}

// ── What parent submits ────────────────────────────────────
export interface ChildPreference {
  child_id: string
  preference_1: PreferenceValue
  preference_2?: ShiftId
  special_code?: string
}

// ── Rotation tracking ──────────────────────────────────────
export interface RotationRecord {
  child_id: string
  child_name: string
  family_id: string
  shift1_count: number
  shift2_count: number
  bumped_count: number
  last_bumped_date: string
  bump_debt: number
}

// ── Swap request ───────────────────────────────────────────
export interface SwapRequest {
  request_id: string
  date: string
  family_id: string
  phone: string
  child_id: string
  child_name: string
  current_shift: ShiftId
  requested_shift: ShiftId
  reason: string
  status: SwapStatus
  admin_note?: string
  requested_at: string
  resolved_at?: string
}

// ── History record ─────────────────────────────────────────
export interface HistoryRecord {
  date: string
  child_id: string
  child_name: string
  family_id: string
  preference_1: PreferenceValue
  preference_2?: ShiftId
  is_special: boolean
  assigned_shift: PreferenceValue
  assignment_reason: AssignmentReason
  shift1_count_that_day: number
  shift2_count_that_day: number
  was_oversubscribed: boolean
}

// ── Algorithm log entry ────────────────────────────────────
export interface AlgorithmLogEntry {
  child_id: string
  child_name: string
  preference: PreferenceValue
  assigned: PreferenceValue
  reason: AssignmentReason
  bump_debt_before?: number
}

// ── API response shapes ────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export interface AuthLoginResponse {
  session_token: string
  family_id: string
  children: Child[]
  display_name: string
  is_special_today: boolean
}

export interface DayInfoResponse {
  date: string
  shift1: ShiftInfo
  shift2: ShiftInfo
  deadline: string
  status: DayStatus
  existing_submissions: Submission[]
  is_special_today: boolean
}

export interface AssignmentRunResponse {
  assignments: Submission[]
  oversubscribed: boolean
  oversubscribed_shift?: ShiftId
  algorithm_log: AlgorithmLogEntry[]
}

export interface AdminSubmissionsResponse {
  submissions: Submission[]
  not_submitted: { family_id: string; display_name: string; phone: string; children: Child[] }[]
  absent_count: number
  total_children: number
}

// ── App session (stored in localStorage) ──────────────────
export interface AppSession {
  session_token: string
  phone: string
  family_id: string
  children: Child[]
  display_name: string
  is_special_today: boolean
  expires_at: string    // ISO date string (end of today)
}

export interface AdminSession {
  admin_token: string
  expires_at: string
}
