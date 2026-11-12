import {
  DischargeEligibility,
  OutcomeMetrics,
  Patient,
  QualifyingDay,
  Role,
  TemperatureReading,
  UserProfile,
} from '../types/caretrack';
import { addDaysToLocalDate, getFacilityLocalDate } from './dateUtils';

export const DEMO_USERS: Record<Role, UserProfile> = {
  nurse: {
    role: 'nurse',
    id: 'USR-NURSE-01',
    displayName: 'Nurse Priya Sharma',
    title: 'Ward Nurse',
    description: 'Records daily patient temperatures and views pending nurse queues.',
  },
  doctor: {
    role: 'doctor',
    id: 'USR-DOC-01',
    displayName: 'Dr. Arjun Mehta',
    title: 'Attending Physician',
    description:
      'Completes same-day visits after temperature is recorded and endorses discharge-ready patients.',
  },
  admin: {
    role: 'admin',
    id: 'USR-ADMIN-01',
    displayName: 'Kavita Nair',
    title: 'Facility Administrator',
    description:
      'Manages bed occupancy, admits patients, processes eligible discharges, and updates demo rules.',
  },
  manager: {
    role: 'manager',
    id: 'USR-MGR-01',
    displayName: 'Director Rajesh Verma',
    title: 'Facility Manager',
    description:
      'Read-only executive oversight of census, daily compliance, and mortality benchmarks.',
  },
};

export type PermissionAction =
  | 'record_temperature'
  | 'amend_temperature'
  | 'complete_doctor_visit'
  | 'endorse_discharge'
  | 'admit_patient'
  | 'process_discharge'
  | 'update_settings'
  | 'reset_demo_data';

const PERMISSION_MATRIX: Record<PermissionAction, { allowed: Role[]; reason: string }> = {
  record_temperature: {
    allowed: ['nurse'],
    reason: 'Only a Nurse can record daily primary temperature readings.',
  },
  amend_temperature: {
    allowed: ['nurse'],
    reason: 'Only a Nurse can submit a temperature amendment with an audit reason.',
  },
  complete_doctor_visit: {
    allowed: ['doctor'],
    reason: 'Only a Doctor can document and complete a same-day clinical visit.',
  },
  endorse_discharge: {
    allowed: ['doctor'],
    reason: 'Only a Doctor can flag/endorse a patient as potentially ready for discharge.',
  },
  admit_patient: {
    allowed: ['admin'],
    reason: 'Only an Administrator can register new patients and assign beds.',
  },
  process_discharge: {
    allowed: ['admin'],
    reason: 'Only an Administrator can process final discharge and release the bed.',
  },
  update_settings: {
    allowed: ['admin'],
    reason: 'Only an Administrator can update demo facility configuration.',
  },
  reset_demo_data: {
    allowed: ['nurse', 'doctor', 'admin', 'manager'],
    reason: 'Available in demo mode for all roles.',
  },
};

export function canRolePerform(
  role: Role,
  action: PermissionAction
): { allowed: boolean; reason: string } {
  const rule = PERMISSION_MATRIX[action];
  if (rule.allowed.includes(role)) {
    return { allowed: true, reason: '' };
  }
  return { allowed: false, reason: rule.reason };
}

/**
 * A reading at or above the configured threshold counts as fever.
 */
export function isFeverReading(valueCelsius: number, thresholdCelsius: number): boolean {
  return valueCelsius >= thresholdCelsius;
}

/**
 * Evaluates the 3-full-day fever-free discharge rule:
 * - Requires 3 consecutive, complete facility-local calendar days (strictly before todayLocalDate)
 *   with valid readings strictly below feverThresholdCelsius.
 * - Current incomplete day (todayLocalDate) NEVER counts as a completed full day.
 * - A fever reading (>= threshold) on any day (including today) resets the streak.
 * - A missing day / gap resets the streak.
 */
export function evaluateDischargeEligibility(
  patient: Patient,
  patientReadings: TemperatureReading[],
  todayLocalDate: string,
  feverThresholdCelsius: number
): DischargeEligibility {
  if (patient.status !== 'active') {
    return {
      isEligible: false,
      streakDays: 0,
      qualifyingDays: [],
      todayReading: null,
      todayHasFever: false,
      streakBrokenReason: `Patient status is ${patient.status}.`,
      explanation: 'Only active patients can be evaluated for discharge.',
    };
  }

  const byDate = new Map<string, TemperatureReading>();
  for (const r of patientReadings) {
    if (r.patientId === patient.id) {
      byDate.set(r.localDate, r);
    }
  }

  const todayReading = byDate.get(todayLocalDate) ?? null;
  const todayHasFever = todayReading
    ? isFeverReading(todayReading.valueCelsius, feverThresholdCelsius)
    : false;

  if (todayHasFever && todayReading) {
    return {
      isEligible: false,
      streakDays: 0,
      qualifyingDays: [],
      todayReading,
      todayHasFever: true,
      streakBrokenReason: `Fever recorded today (${todayReading.valueCelsius.toFixed(1)} °C >= ${feverThresholdCelsius.toFixed(1)} °C).`,
      explanation: `Today's fever reading (${todayReading.valueCelsius.toFixed(1)} °C) resets the fever-free streak to 0.`,
    };
  }

  // Count backwards from yesterday (D-1) up to 30 days max
  const qualifyingDays: QualifyingDay[] = [];
  let streakBrokenReason: string | null = null;

  for (let offset = 1; offset <= 30; offset++) {
    const checkDate = addDaysToLocalDate(todayLocalDate, -offset);
    // Stop if we go before admission date
    if (checkDate < patient.admissionDate) {
      if (qualifyingDays.length < 3) {
        streakBrokenReason = `Admitted on ${patient.admissionDate}; fewer than 3 completed days since admission.`;
      }
      break;
    }

    const reading = byDate.get(checkDate);
    if (!reading) {
      streakBrokenReason = `Missing temperature reading on ${checkDate} resets streak.`;
      break;
    }

    if (isFeverReading(reading.valueCelsius, feverThresholdCelsius)) {
      streakBrokenReason = `Fever of ${reading.valueCelsius.toFixed(1)} °C on ${checkDate} (>= ${feverThresholdCelsius.toFixed(1)} °C) resets streak.`;
      break;
    }

    qualifyingDays.push({
      localDate: checkDate,
      valueCelsius: reading.valueCelsius,
      readingId: reading.id,
    });
  }

  // Order qualifyingDays chronologically (oldest -> newest)
  const orderedQualifying = [...qualifyingDays].reverse();
  const streakDays = orderedQualifying.length;
  const isEligible = streakDays >= 3;

  let explanation: string;
  if (isEligible) {
    const lastThree = orderedQualifying.slice(-3);
    explanation = `Meets rule: ${lastThree.length} consecutive completed days below ${feverThresholdCelsius.toFixed(1)} °C (${lastThree.map((d) => d.localDate).join(', ')}).`;
  } else if (todayReading && !todayHasFever && streakDays === 2) {
    explanation = `2 completed fever-free days (${orderedQualifying.map((d) => d.localDate).join(', ')}). Today (${todayLocalDate}) is still in progress and does not count as a completed full day.`;
  } else if (streakBrokenReason) {
    explanation = `${streakDays} consecutive completed fever-free day(s). ${streakBrokenReason}`;
  } else {
    explanation = `${streakDays} of 3 required consecutive completed fever-free days.`;
  }

  return {
    isEligible,
    streakDays,
    qualifyingDays: orderedQualifying.slice(-3),
    todayReading,
    todayHasFever: false,
    streakBrokenReason,
    explanation,
  };
}

/**
 * Computes mortality & success rates strictly over resolved outcomes (discharged + deceased).
 * Active patients are excluded from the denominator.
 * If resolved === 0, rates are null (rendered as N/A, never 0%).
 * Mortality alert triggers ONLY when mortalityRate > benchmarkPercent (e.g. > 15%, not === 15%).
 */
export function calculateOutcomeMetrics(
  patients: Patient[],
  benchmarkPercent = 15,
  dateRangeLabel = 'All Time',
  filterDays?: number,
  todayLocalDate?: string,
  timezone = 'Asia/Kolkata'
): OutcomeMetrics {
  const activeCount = patients.filter((p) => p.status === 'active').length;

  let cutoffDate: string | null = null;
  if (filterDays && todayLocalDate) {
    cutoffDate = addDaysToLocalDate(todayLocalDate, -(filterDays - 1));
  }

  const resolvedPatients = patients.filter((p) => {
    if (p.status !== 'discharged' && p.status !== 'deceased') return false;
    if (!cutoffDate) return true;
    const outcomeIso = p.outcomeAt ?? p.dischargedAt;
    if (!outcomeIso) return false;
    const outcomeLocalDate = getFacilityLocalDate(new Date(outcomeIso), timezone);
    return outcomeLocalDate >= cutoffDate;
  });

  const dischargedCount = resolvedPatients.filter((p) => p.status === 'discharged').length;
  const deceasedCount = resolvedPatients.filter((p) => p.status === 'deceased').length;
  const resolvedCount = dischargedCount + deceasedCount;

  if (resolvedCount === 0) {
    return {
      dischargedCount: 0,
      deceasedCount: 0,
      resolvedCount: 0,
      activeCount,
      mortalityRate: null,
      successRate: null,
      isMortalityAlert: false,
      dateRangeLabel,
    };
  }

  const mortalityRate = (deceasedCount / resolvedCount) * 100;
  const successRate = (dischargedCount / resolvedCount) * 100;

  return {
    dischargedCount,
    deceasedCount,
    resolvedCount,
    activeCount,
    mortalityRate,
    successRate,
    isMortalityAlert: mortalityRate > benchmarkPercent,
    dateRangeLabel,
  };
}
