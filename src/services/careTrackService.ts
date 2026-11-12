import { getFacilityLocalDate } from '../domain/dateUtils';
import {
  canRolePerform,
  DEMO_USERS,
  evaluateDischargeEligibility,
  isFeverReading,
} from '../domain/rules';
import { createInitialSeedState, DemoPreset } from '../domain/seedData';
import {
  AuditAction,
  AuditEvent,
  CareTrackState,
  DoctorVisit,
  Patient,
  Role,
  TemperatureReading,
} from '../types/caretrack';

const STORAGE_KEY = 'caretrack_facility_state_v1';

export type ServiceResult =
  | { ok: true; state: CareTrackState; message: string }
  | { ok: false; error: string };

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

function appendAudit(
  state: CareTrackState,
  role: Role,
  action: AuditAction,
  entityType: AuditEvent['entityType'],
  entityId: string,
  summary: string,
  metadata?: Record<string, string | number | boolean>
): AuditEvent[] {
  const actor = DEMO_USERS[role];
  const event: AuditEvent = {
    id: makeId('AUD'),
    actorId: actor.id,
    actorName: actor.displayName,
    actorRole: role,
    action,
    entityType,
    entityId,
    timestamp: new Date().toISOString(),
    summary,
    metadata,
  };
  return [event, ...state.auditLog].slice(0, 200);
}

export function loadCareTrackState(): CareTrackState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CareTrackState;
      if (parsed && Array.isArray(parsed.patients) && Array.isArray(parsed.beds) && parsed.settings) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage read errors and fall back to seed
  }
  const initial = createInitialSeedState('standard');
  saveCareTrackState(initial);
  return initial;
}

export function saveCareTrackState(state: CareTrackState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage write errors in non-browser/test environments
  }
}

export function resetDemoData(role: Role, preset: DemoPreset = 'standard'): ServiceResult {
  const next = createInitialSeedState(preset);
  next.auditLog = appendAudit(
    next,
    role,
    'DEMO_DATA_RESET',
    'system',
    'FACILITY',
    `Demo dataset reset (${preset === 'standard' ? '74/74 Full + Outcomes' : '74/74 Full + 0 Resolved Outcomes'}) by ${DEMO_USERS[role].displayName}.`
  );
  saveCareTrackState(next);
  return {
    ok: true,
    state: next,
    message:
      preset === 'standard'
        ? 'Demo data reset to default 74/74 occupancy scenario.'
        : 'Demo data reset to 0 resolved outcomes scenario (N/A benchmark).',
  };
}

export function recordTemperature(
  state: CareTrackState,
  role: Role,
  input: { patientId: string; valueCelsius: number; note?: string }
): ServiceResult {
  const perm = canRolePerform(role, 'record_temperature');
  if (!perm.allowed) return { ok: false, error: perm.reason };

  const patient = state.patients.find((p) => p.id === input.patientId);
  if (!patient || patient.status !== 'active') {
    return { ok: false, error: 'Temperature can only be recorded for an active patient.' };
  }

  if (Number.isNaN(input.valueCelsius) || input.valueCelsius < 30 || input.valueCelsius > 45) {
    return {
      ok: false,
      error:
        'Temperature must be within the plausible UI range of 30.0 °C to 45.0 °C (clinical validation still required).',
    };
  }

  const today = getFacilityLocalDate(new Date(), state.settings.timezone);
  const existingToday = state.temperatures.find(
    (t) => t.patientId === patient.id && t.localDate === today
  );
  if (existingToday) {
    return {
      ok: false,
      error: `Duplicate primary reading blocked: ${patient.fullName} already has a temperature reading (${existingToday.valueCelsius.toFixed(1)} °C) recorded for ${today}. Use an amendment if a correction is needed.`,
    };
  }

  const actor = DEMO_USERS[role];
  const roundedVal = Number(input.valueCelsius.toFixed(1));
  const reading: TemperatureReading = {
    id: makeId('TMP'),
    patientId: patient.id,
    measuredAt: new Date().toISOString(),
    localDate: today,
    valueCelsius: roundedVal,
    recordedBy: actor.displayName,
    note: input.note?.trim() || undefined,
    amendments: [],
  };

  const feverFlag = isFeverReading(roundedVal, state.settings.feverThresholdCelsius);
  const nextState: CareTrackState = {
    ...state,
    temperatures: [...state.temperatures, reading],
    auditLog: appendAudit(
      state,
      role,
      'TEMPERATURE_RECORDED',
      'temperature',
      reading.id,
      `Recorded ${roundedVal.toFixed(1)} °C (${feverFlag ? 'FEVER' : 'Fever-free'}) for ${patient.fullName} (${patient.id}) on ${today}.`,
      { patientId: patient.id, valueCelsius: roundedVal, localDate: today, fever: feverFlag }
    ),
  };

  saveCareTrackState(nextState);
  return {
    ok: true,
    state: nextState,
    message: `Recorded ${roundedVal.toFixed(1)} °C for ${patient.fullName}.`,
  };
}

export function amendTemperature(
  state: CareTrackState,
  role: Role,
  input: { readingId: string; newValueCelsius: number; reason: string }
): ServiceResult {
  const perm = canRolePerform(role, 'amend_temperature');
  if (!perm.allowed) return { ok: false, error: perm.reason };

  if (Number.isNaN(input.newValueCelsius) || input.newValueCelsius < 30 || input.newValueCelsius > 45) {
    return { ok: false, error: 'Amended temperature must be between 30.0 °C and 45.0 °C.' };
  }
  const trimmedReason = input.reason.trim();
  if (!trimmedReason) {
    return { ok: false, error: 'An amendment reason is required for the audit trail.' };
  }

  const target = state.temperatures.find((t) => t.id === input.readingId);
  if (!target) return { ok: false, error: 'Temperature reading not found.' };

  const patient = state.patients.find((p) => p.id === target.patientId);
  const actor = DEMO_USERS[role];
  const prevVal = target.valueCelsius;
  const newVal = Number(input.newValueCelsius.toFixed(1));

  const updatedTemperatures = state.temperatures.map((t) =>
    t.id === target.id
      ? {
          ...t,
          valueCelsius: newVal,
          amendments: [
            ...t.amendments,
            {
              id: makeId('AMD'),
              previousValueCelsius: prevVal,
              newValueCelsius: newVal,
              reason: trimmedReason,
              amendedBy: actor.displayName,
              amendedAt: new Date().toISOString(),
            },
          ],
        }
      : t
  );

  const nextState: CareTrackState = {
    ...state,
    temperatures: updatedTemperatures,
    auditLog: appendAudit(
      state,
      role,
      'TEMPERATURE_AMENDED',
      'temperature',
      target.id,
      `Amended ${patient?.fullName ?? target.patientId} (${target.localDate}) from ${prevVal.toFixed(1)} °C to ${newVal.toFixed(1)} °C. Reason: ${trimmedReason}`,
      { previousValue: prevVal, newValue: newVal }
    ),
  };

  saveCareTrackState(nextState);
  return {
    ok: true,
    state: nextState,
    message: `Amended temperature reading from ${prevVal.toFixed(1)} °C to ${newVal.toFixed(1)} °C.`,
  };
}

export function completeDoctorVisit(
  state: CareTrackState,
  role: Role,
  input: { patientId: string; note: string }
): ServiceResult {
  const perm = canRolePerform(role, 'complete_doctor_visit');
  if (!perm.allowed) return { ok: false, error: perm.reason };

  const patient = state.patients.find((p) => p.id === input.patientId);
  if (!patient || patient.status !== 'active') {
    return { ok: false, error: 'Doctor visit can only be completed for an active patient.' };
  }

  const today = getFacilityLocalDate(new Date(), state.settings.timezone);
  const todayTemp = state.temperatures.find(
    (t) => t.patientId === patient.id && t.localDate === today
  );
  if (!todayTemp) {
    return {
      ok: false,
      error: `Blocked: Today's temperature (${today}) has not been recorded by a Nurse yet. Doctor visit cannot be completed before today's temperature exists.`,
    };
  }

  const existingVisit = state.visits.find(
    (v) => v.patientId === patient.id && v.localDate === today
  );
  if (existingVisit) {
    return {
      ok: false,
      error: `Duplicate visit blocked: A doctor visit for ${patient.fullName} is already completed for ${today}.`,
    };
  }

  const trimmedNote = input.note.trim();
  if (!trimmedNote) {
    return { ok: false, error: 'A consultation note is required to complete a doctor visit.' };
  }

  const actor = DEMO_USERS[role];
  const visit: DoctorVisit = {
    id: makeId('VST'),
    patientId: patient.id,
    visitedAt: new Date().toISOString(),
    localDate: today,
    doctorId: actor.id,
    doctorName: actor.displayName,
    note: trimmedNote,
    status: 'completed',
  };

  const nextState: CareTrackState = {
    ...state,
    visits: [...state.visits, visit],
    auditLog: appendAudit(
      state,
      role,
      'DOCTOR_VISIT_COMPLETED',
      'visit',
      visit.id,
      `Completed same-day doctor visit for ${patient.fullName} (${patient.id}) after ${todayTemp.valueCelsius.toFixed(1)} °C reading.`,
      { patientId: patient.id, localDate: today }
    ),
  };

  saveCareTrackState(nextState);
  return {
    ok: true,
    state: nextState,
    message: `Doctor visit completed for ${patient.fullName}.`,
  };
}

export function endorseDischargeReadiness(
  state: CareTrackState,
  role: Role,
  input: { patientId: string }
): ServiceResult {
  const perm = canRolePerform(role, 'endorse_discharge');
  if (!perm.allowed) return { ok: false, error: perm.reason };

  const patient = state.patients.find((p) => p.id === input.patientId);
  if (!patient || patient.status !== 'active') {
    return { ok: false, error: 'Only active patients can be endorsed for discharge.' };
  }

  const today = getFacilityLocalDate(new Date(), state.settings.timezone);
  const eligibility = evaluateDischargeEligibility(
    patient,
    state.temperatures.filter((t) => t.patientId === patient.id),
    today,
    state.settings.feverThresholdCelsius
  );

  if (!eligibility.isEligible) {
    return {
      ok: false,
      error: `Cannot flag ${patient.fullName} as discharge-ready: ${eligibility.explanation}`,
    };
  }

  const actor = DEMO_USERS[role];
  const nowIso = new Date().toISOString();

  const nextState: CareTrackState = {
    ...state,
    patients: state.patients.map((p) =>
      p.id === patient.id
        ? {
            ...p,
            doctorEndorsedDischarge: true,
            doctorEndorsedBy: actor.displayName,
            doctorEndorsedAt: nowIso,
          }
        : p
    ),
    auditLog: appendAudit(
      state,
      role,
      'DISCHARGE_ENDORSED',
      'patient',
      patient.id,
      `Endorsed ${patient.fullName} (${patient.id}) as potentially ready for administrative discharge.`
    ),
  };

  saveCareTrackState(nextState);
  return {
    ok: true,
    state: nextState,
    message: `${patient.fullName} flagged for Administrator discharge review.`,
  };
}

export function admitPatient(
  state: CareTrackState,
  role: Role,
  input: {
    fullName: string;
    age: number;
    sex?: Patient['sex'];
    admissionDate: string;
    bedId: string;
    notes: string;
  }
): ServiceResult {
  const perm = canRolePerform(role, 'admit_patient');
  if (!perm.allowed) return { ok: false, error: perm.reason };

  const activeCount = state.patients.filter((p) => p.status === 'active').length;
  if (activeCount >= state.settings.capacity) {
    return {
      ok: false,
      error: `Facility at full capacity (${activeCount}/${state.settings.capacity} active beds occupied). Discharge an eligible patient before admitting a new patient.`,
    };
  }

  const fullName = input.fullName.trim();
  if (!fullName) return { ok: false, error: 'Patient full name is required.' };
  if (Number.isNaN(input.age) || input.age < 0 || input.age > 120) {
    return { ok: false, error: 'Please enter a valid patient age (0–120).' };
  }
  if (!input.admissionDate) return { ok: false, error: 'Admission date is required.' };
  if (!input.bedId) return { ok: false, error: 'Please select an available bed.' };

  const bed = state.beds.find((b) => b.id === input.bedId);
  if (!bed) return { ok: false, error: 'Selected bed does not exist.' };
  if (bed.activePatientId !== null) {
    return {
      ok: false,
      error: `Bed ${bed.label} is already occupied by patient ${bed.activePatientId}. Duplicate active bed assignment is blocked.`,
    };
  }

  // Generate unique patient ID
  const existingNums = state.patients
    .map((p) => Number(p.id.replace('CT-', '')))
    .filter((n) => !Number.isNaN(n));
  const nextNum = (existingNums.length > 0 ? Math.max(...existingNums) : 1000) + 1;
  const newPatientId = `CT-${nextNum}`;

  const newPatient: Patient = {
    id: newPatientId,
    fullName,
    age: Math.round(input.age),
    sex: input.sex || 'Prefer not to say',
    admissionDate: input.admissionDate,
    bedId: bed.id,
    status: 'active',
    notes: input.notes.trim() || 'Newly admitted to quarantine isolation.',
  };

  const nextState: CareTrackState = {
    ...state,
    patients: [newPatient, ...state.patients],
    beds: state.beds.map((b) => (b.id === bed.id ? { ...b, activePatientId: newPatient.id } : b)),
    auditLog: appendAudit(
      state,
      role,
      'PATIENT_ADMITTED',
      'patient',
      newPatient.id,
      `Admitted ${newPatient.fullName} (${newPatient.id}) to ${bed.label} (${bed.ward}) on ${newPatient.admissionDate}.`,
      { bedId: bed.id, admissionDate: newPatient.admissionDate }
    ),
  };

  saveCareTrackState(nextState);
  return {
    ok: true,
    state: nextState,
    message: `Admitted ${newPatient.fullName} (${newPatient.id}) to ${bed.label}.`,
  };
}

export function dischargePatient(
  state: CareTrackState,
  role: Role,
  input: { patientId: string; dischargeNote?: string }
): ServiceResult {
  const perm = canRolePerform(role, 'process_discharge');
  if (!perm.allowed) return { ok: false, error: perm.reason };

  const patient = state.patients.find((p) => p.id === input.patientId);
  if (!patient) return { ok: false, error: 'Patient not found.' };
  if (patient.status !== 'active') {
    return {
      ok: false,
      error: `Duplicate/invalid discharge blocked: ${patient.fullName} is already ${patient.status}.`,
    };
  }

  const today = getFacilityLocalDate(new Date(), state.settings.timezone);
  const eligibility = evaluateDischargeEligibility(
    patient,
    state.temperatures.filter((t) => t.patientId === patient.id),
    today,
    state.settings.feverThresholdCelsius
  );

  if (!eligibility.isEligible) {
    return {
      ok: false,
      error: `Discharge blocked: ${patient.fullName} does not meet the 3-full-day fever-free rule. ${eligibility.explanation}`,
    };
  }

  const actor = DEMO_USERS[role];
  const nowIso = new Date().toISOString();
  const releasedBedId = patient.bedId;

  const nextState: CareTrackState = {
    ...state,
    patients: state.patients.map((p) =>
      p.id === patient.id
        ? {
            ...p,
            status: 'discharged',
            bedId: null,
            dischargedAt: nowIso,
            dischargedBy: actor.displayName,
            dischargeNote: input.dischargeNote?.trim() || 'Verified 3 consecutive completed fever-free days.',
            outcomeAt: nowIso,
          }
        : p
    ),
    beds: state.beds.map((b) =>
      b.id === releasedBedId || b.activePatientId === patient.id
        ? { ...b, activePatientId: null }
        : b
    ),
    auditLog: appendAudit(
      state,
      role,
      'PATIENT_DISCHARGED',
      'patient',
      patient.id,
      `Discharged ${patient.fullName} (${patient.id}) and released ${releasedBedId ?? 'bed'}.`,
      { releasedBedId: releasedBedId ?? 'none' }
    ),
  };

  saveCareTrackState(nextState);
  return {
    ok: true,
    state: nextState,
    message: `Discharged ${patient.fullName}. ${releasedBedId ?? 'Bed'} is now available.`,
  };
}

export function updateFacilitySettings(
  state: CareTrackState,
  role: Role,
  input: { feverThresholdCelsius: number; timezone: string }
): ServiceResult {
  const perm = canRolePerform(role, 'update_settings');
  if (!perm.allowed) return { ok: false, error: perm.reason };

  if (
    Number.isNaN(input.feverThresholdCelsius) ||
    input.feverThresholdCelsius < 35.0 ||
    input.feverThresholdCelsius > 41.0
  ) {
    return {
      ok: false,
      error: 'Fever threshold must be between 35.0 °C and 41.0 °C.',
    };
  }

  const roundedThreshold = Number(input.feverThresholdCelsius.toFixed(1));
  const nextState: CareTrackState = {
    ...state,
    settings: {
      ...state.settings,
      feverThresholdCelsius: roundedThreshold,
      timezone: input.timezone,
    },
    auditLog: appendAudit(
      state,
      role,
      'SETTINGS_UPDATED',
      'settings',
      'FACILITY_SETTINGS',
      `Updated demo fever threshold to ${roundedThreshold.toFixed(1)} °C and timezone to ${input.timezone}.`,
      { feverThresholdCelsius: roundedThreshold, timezone: input.timezone }
    ),
  };

  saveCareTrackState(nextState);
  return {
    ok: true,
    state: nextState,
    message: `Updated demo fever threshold to ${roundedThreshold.toFixed(1)} °C.`,
  };
}
