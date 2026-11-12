import { describe, expect, it } from 'vitest';
import { addDaysToLocalDate, getFacilityLocalDate } from './dateUtils';
import {
  calculateOutcomeMetrics,
  canRolePerform,
  evaluateDischargeEligibility,
} from './rules';
import { createInitialSeedState } from './seedData';
import {
  admitPatient,
  completeDoctorVisit,
  dischargePatient,
  recordTemperature,
} from '../services/careTrackService';
import { Patient, TemperatureReading } from '../types/caretrack';

function makeTemp(patientId: string, localDate: string, valueCelsius: number): TemperatureReading {
  return {
    id: `TMP-${patientId}-${localDate}`,
    patientId,
    measuredAt: `${localDate}T08:00:00Z`,
    localDate,
    valueCelsius,
    recordedBy: 'Nurse Priya Sharma',
    amendments: [],
  };
}

describe('CareTrack discharge streak & fever rules', () => {
  const today = '2026-11-12';
  const basePatient: Patient = {
    id: 'CT-TEST',
    fullName: 'Test Patient',
    age: 35,
    admissionDate: '2026-11-05',
    bedId: 'BED-01',
    status: 'active',
    notes: '',
  };

  it('flags patient as eligible after 3 consecutive completed fever-free days', () => {
    const readings = [
      makeTemp('CT-TEST', '2026-11-09', 37.2),
      makeTemp('CT-TEST', '2026-11-10', 36.9),
      makeTemp('CT-TEST', '2026-11-11', 36.8),
    ];
    const res = evaluateDischargeEligibility(basePatient, readings, today, 38.0);
    expect(res.isEligible).toBe(true);
    expect(res.streakDays).toBe(3);
    expect(res.qualifyingDays.map((d) => d.localDate)).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
    ]);
  });

  it('does NOT count current incomplete day as a 3rd completed day', () => {
    const readings = [
      makeTemp('CT-TEST', '2026-11-10', 37.0),
      makeTemp('CT-TEST', '2026-11-11', 36.9),
      makeTemp('CT-TEST', '2026-11-12', 36.8), // today (incomplete)
    ];
    const res = evaluateDischargeEligibility(basePatient, readings, today, 38.0);
    expect(res.isEligible).toBe(false);
    expect(res.streakDays).toBe(2);
  });

  it('resets streak when a fever reading (>= threshold) occurs', () => {
    const readings = [
      makeTemp('CT-TEST', '2026-11-08', 37.0),
      makeTemp('CT-TEST', '2026-11-09', 37.1),
      makeTemp('CT-TEST', '2026-11-10', 38.0), // exactly at threshold => fever!
      makeTemp('CT-TEST', '2026-11-11', 36.9),
    ];
    const res = evaluateDischargeEligibility(basePatient, readings, today, 38.0);
    expect(res.isEligible).toBe(false);
    expect(res.streakDays).toBe(1);
    expect(res.streakBrokenReason).toContain('Fever of 38.0');
  });

  it('resets streak when a day is missing (gap)', () => {
    const readings = [
      makeTemp('CT-TEST', '2026-11-08', 37.0),
      makeTemp('CT-TEST', '2026-11-09', 37.1),
      // 2026-11-10 missing!
      makeTemp('CT-TEST', '2026-11-11', 36.9),
    ];
    const res = evaluateDischargeEligibility(basePatient, readings, today, 38.0);
    expect(res.isEligible).toBe(false);
    expect(res.streakDays).toBe(1);
    expect(res.streakBrokenReason).toContain('Missing temperature reading on 2026-11-10');
  });

  it('resets streak if today already has a fever reading', () => {
    const readings = [
      makeTemp('CT-TEST', '2026-11-09', 37.0),
      makeTemp('CT-TEST', '2026-11-10', 36.9),
      makeTemp('CT-TEST', '2026-11-11', 36.8),
      makeTemp('CT-TEST', '2026-11-12', 38.4), // fever today
    ];
    const res = evaluateDischargeEligibility(basePatient, readings, today, 38.0);
    expect(res.isEligible).toBe(false);
    expect(res.streakDays).toBe(0);
    expect(res.todayHasFever).toBe(true);
  });
});

describe('CareTrack mortality & outcome benchmark', () => {
  it('displays null (N/A) when there are zero resolved outcomes, even with active patients', () => {
    const activeOnly: Patient[] = [
      {
        id: '1',
        fullName: 'Active One',
        age: 30,
        admissionDate: '2026-11-10',
        bedId: 'BED-01',
        status: 'active',
        notes: '',
      },
    ];
    const metrics = calculateOutcomeMetrics(activeOnly);
    expect(metrics.resolvedCount).toBe(0);
    expect(metrics.mortalityRate).toBeNull();
    expect(metrics.successRate).toBeNull();
    expect(metrics.isMortalityAlert).toBe(false);
  });

  it('triggers alert ONLY when mortality > 15%, not when mortality === 15%', () => {
    const makeResolved = (discharged: number, deceased: number): Patient[] => [
      ...Array.from({ length: discharged }, (_, i) => ({
        id: `D-${i}`,
        fullName: `Discharged ${i}`,
        age: 30,
        admissionDate: '2026-11-01',
        bedId: null,
        status: 'discharged' as const,
        notes: '',
        outcomeAt: '2026-11-10T10:00:00Z',
      })),
      ...Array.from({ length: deceased }, (_, i) => ({
        id: `X-${i}`,
        fullName: `Deceased ${i}`,
        age: 70,
        admissionDate: '2026-11-01',
        bedId: null,
        status: 'deceased' as const,
        notes: '',
        outcomeAt: '2026-11-10T10:00:00Z',
      })),
    ];

    // Exactly 15%: 3 deceased out of 20 resolved -> NO alert
    const exact15 = calculateOutcomeMetrics(makeResolved(17, 3), 15);
    expect(exact15.mortalityRate).toBeCloseTo(15.0);
    expect(exact15.isMortalityAlert).toBe(false);

    // 16%: 4 deceased out of 25 resolved -> ALERT
    const over15 = calculateOutcomeMetrics(makeResolved(21, 4), 15);
    expect(over15.mortalityRate).toBeCloseTo(16.0);
    expect(over15.isMortalityAlert).toBe(true);
  });
});

describe('CareTrack workflow, capacity, and RBAC enforcement', () => {
  it('enforces temperature -> doctor visit -> duplicate blocks -> discharge -> bed release -> admission', () => {
    let state = createInitialSeedState('standard');
    const today = getFacilityLocalDate(new Date(), state.settings.timezone);

    // 1. Facility starts at 74/74 capacity -> Admission blocked
    const admitBlocked = admitPatient(state, 'admin', {
      fullName: 'New Patient',
      age: 40,
      admissionDate: today,
      bedId: 'BED-01',
      notes: 'Test',
    });
    expect(admitBlocked.ok).toBe(false);

    // 2. Patient A (CT-1001) has no temp today -> Doctor visit blocked
    const docBlocked = completeDoctorVisit(state, 'doctor', {
      patientId: 'CT-1001',
      note: 'Tried visiting before temp',
    });
    expect(docBlocked.ok).toBe(false);

    // 3. Nurse records temp for CT-1001
    const tempOk = recordTemperature(state, 'nurse', {
      patientId: 'CT-1001',
      valueCelsius: 37.1,
      note: 'Morning check',
    });
    expect(tempOk.ok).toBe(true);
    if (!tempOk.ok) return;
    state = tempOk.state;

    // 4. Second primary temp on same day is blocked
    const tempDup = recordTemperature(state, 'nurse', {
      patientId: 'CT-1001',
      valueCelsius: 37.3,
    });
    expect(tempDup.ok).toBe(false);

    // 5. Doctor can now complete visit with note
    const docNoNote = completeDoctorVisit(state, 'doctor', {
      patientId: 'CT-1001',
      note: '   ',
    });
    expect(docNoNote.ok).toBe(false);

    const docOk = completeDoctorVisit(state, 'doctor', {
      patientId: 'CT-1001',
      note: 'Patient stable after morning afebrile reading.',
    });
    expect(docOk.ok).toBe(true);
    if (!docOk.ok) return;
    state = docOk.state;

    // 6. Discharge blocked for ineligible patient (CT-1004 had fever reset)
    const dischargeIneligible = dischargePatient(state, 'admin', {
      patientId: 'CT-1004',
    });
    expect(dischargeIneligible.ok).toBe(false);

    // 7. Administrator discharges eligible Patient C (CT-1003, BED-03)
    const dischargeOk = dischargePatient(state, 'admin', {
      patientId: 'CT-1003',
    });
    expect(dischargeOk.ok).toBe(true);
    if (!dischargeOk.ok) return;
    state = dischargeOk.state;

    // Bed 03 is now free and active count is 73
    const bed03 = state.beds.find((b) => b.id === 'BED-03');
    expect(bed03?.activePatientId).toBeNull();
    expect(state.patients.filter((p) => p.status === 'active').length).toBe(73);

    // 8. Duplicate active bed assignment (BED-01 still occupied) is blocked
    const dupBed = admitPatient(state, 'admin', {
      fullName: 'Duplicate Bed Test',
      age: 32,
      admissionDate: today,
      bedId: 'BED-01',
      notes: '',
    });
    expect(dupBed.ok).toBe(false);

    // 9. Administrator can now admit to freed BED-03
    const admitOk = admitPatient(state, 'admin', {
      fullName: 'Neha Kapoor',
      age: 32,
      admissionDate: addDaysToLocalDate(today, 0),
      bedId: 'BED-03',
      notes: 'Admitted to freed bed.',
    });
    expect(admitOk.ok).toBe(true);
  });

  it('enforces role-based permissions', () => {
    expect(canRolePerform('manager', 'process_discharge').allowed).toBe(false);
    expect(canRolePerform('nurse', 'complete_doctor_visit').allowed).toBe(false);
    expect(canRolePerform('doctor', 'record_temperature').allowed).toBe(false);
    expect(canRolePerform('admin', 'admit_patient').allowed).toBe(true);
  });
});
