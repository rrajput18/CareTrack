export type Role = 'nurse' | 'doctor' | 'admin' | 'manager';

export type PatientStatus = 'active' | 'discharged' | 'deceased';

export interface UserProfile {
  role: Role;
  id: string;
  displayName: string;
  title: string;
  description: string;
}

export interface Patient {
  id: string;
  fullName: string;
  age: number;
  sex?: 'Female' | 'Male' | 'Other' | 'Prefer not to say';
  admissionDate: string; // YYYY-MM-DD in facility timezone
  bedId: string | null; // null when discharged or deceased
  status: PatientStatus;
  notes: string;
  dischargedAt?: string; // ISO timestamp
  dischargedBy?: string;
  dischargeNote?: string;
  doctorEndorsedDischarge?: boolean;
  doctorEndorsedBy?: string;
  doctorEndorsedAt?: string;
  outcomeAt?: string; // ISO timestamp for discharged or deceased
}

export interface TemperatureAmendment {
  id: string;
  previousValueCelsius: number;
  newValueCelsius: number;
  reason: string;
  amendedBy: string;
  amendedAt: string; // ISO timestamp
}

export interface TemperatureReading {
  id: string;
  patientId: string;
  measuredAt: string; // ISO timestamp
  localDate: string; // YYYY-MM-DD in facility timezone
  valueCelsius: number;
  recordedBy: string;
  note?: string;
  amendments: TemperatureAmendment[];
}

export interface DoctorVisit {
  id: string;
  patientId: string;
  visitedAt: string; // ISO timestamp
  localDate: string; // YYYY-MM-DD in facility timezone
  doctorId: string;
  doctorName: string;
  note: string;
  status: 'completed';
}

export interface Bed {
  id: string; // e.g., "BED-01"
  label: string; // e.g., "Bed 01"
  ward: string; // e.g., "Ward A"
  activePatientId: string | null;
}

export type AuditAction =
  | 'PATIENT_ADMITTED'
  | 'TEMPERATURE_RECORDED'
  | 'TEMPERATURE_AMENDED'
  | 'DOCTOR_VISIT_COMPLETED'
  | 'DISCHARGE_ENDORSED'
  | 'PATIENT_DISCHARGED'
  | 'SETTINGS_UPDATED'
  | 'DEMO_DATA_RESET';

export interface AuditEvent {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  action: AuditAction;
  entityType: 'patient' | 'temperature' | 'visit' | 'settings' | 'system';
  entityId: string;
  timestamp: string; // ISO timestamp
  summary: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface FacilitySettings {
  facilityName: string;
  timezone: string; // IANA timezone, e.g. 'Asia/Kolkata'
  feverThresholdCelsius: number; // Default 38.0 (demo assumption)
  capacity: number; // 74
  mortalityBenchmarkPercent: number; // 15
}

export interface QualifyingDay {
  localDate: string;
  valueCelsius: number;
  readingId: string;
}

export interface DischargeEligibility {
  isEligible: boolean;
  streakDays: number; // consecutive completed fever-free days leading up to yesterday
  qualifyingDays: QualifyingDay[]; // up to 3 most recent consecutive completed fever-free days
  todayReading: TemperatureReading | null;
  todayHasFever: boolean;
  streakBrokenReason: string | null;
  explanation: string;
}

export interface OutcomeMetrics {
  dischargedCount: number;
  deceasedCount: number;
  resolvedCount: number;
  activeCount: number;
  mortalityRate: number | null; // null when resolvedCount === 0
  successRate: number | null; // null when resolvedCount === 0
  isMortalityAlert: boolean; // true strictly when mortalityRate > 15
  dateRangeLabel: string;
}

export interface CareTrackState {
  patients: Patient[];
  beds: Bed[];
  temperatures: TemperatureReading[];
  visits: DoctorVisit[];
  auditLog: AuditEvent[];
  settings: FacilitySettings;
}

export type ScreenId =
  | 'overview'
  | 'registry'
  | 'admit'
  | 'workflow'
  | 'discharge'
  | 'outcomes'
  | 'rules';
