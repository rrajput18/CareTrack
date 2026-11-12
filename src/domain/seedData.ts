import {
  AuditEvent,
  Bed,
  CareTrackState,
  DoctorVisit,
  FacilitySettings,
  Patient,
  TemperatureReading,
} from '../types/caretrack';
import { addDaysToLocalDate, getFacilityLocalDate } from './dateUtils';

export type DemoPreset = 'standard' | 'zero_outcomes';

const FIRST_NAMES = [
  'Aarav', 'Meera', 'Rohan', 'Ananya', 'Vikram', 'Kavya', 'Siddharth', 'Priya',
  'Aditya', 'Neha', 'Karan', 'Divya', 'Arjun', 'Sneha', 'Rahul', 'Pooja',
  'Nikhil', 'Shreya', 'Manish', 'Isha', 'Deepak', 'Swati', 'Suresh', 'Nandini',
  'Vivek', 'Ritu', 'Pranav', 'Anjali', 'Gaurav', 'Meenakshi', 'Harish', 'Lakshmi',
  'Varun', 'Tanvi', 'Amit', 'Komal', 'Sanjay', 'Bhavna', 'Rakesh', 'Pallavi',
];

const LAST_NAMES = [
  'Kulkarni', 'Nair', 'Deshmukh', 'Iyer', 'Joshi', 'Menon', 'Rao', 'Sharma',
  'Patel', 'Verma', 'Gupta', 'Reddy', 'Chatterjee', 'Bose', 'Kapoor', 'Malhotra',
  'Bhatt', 'Pillai', 'Krishnan', 'Agarwal', 'Tiwari', 'Mishra', 'Saxena', 'Banerjee',
];

function makeIsoAtLocalHour(localDate: string, hour: number, minute: number): string {
  // Construct UTC-ish timestamp offset by -05:30 for IST so localDate matches Asia/Kolkata
  const [y, m, d] = localDate.split('-').map(Number);
  const utcMs = Date.UTC(y, m - 1, d, hour, minute, 0) - 5.5 * 60 * 60 * 1000;
  return new Date(utcMs).toISOString();
}

export function createInitialSeedState(preset: DemoPreset = 'standard'): CareTrackState {
  const settings: FacilitySettings = {
    facilityName: 'CareTrack Quarantine & Treatment Center',
    timezone: 'Asia/Kolkata',
    feverThresholdCelsius: 38.0,
    capacity: 74,
    mortalityBenchmarkPercent: 15,
  };

  const today = getFacilityLocalDate(new Date(), settings.timezone);

  const beds: Bed[] = Array.from({ length: 74 }, (_, idx) => {
    const num = idx + 1;
    const padded = String(num).padStart(2, '0');
    const ward =
      num <= 20 ? 'Ward A' : num <= 40 ? 'Ward B' : num <= 60 ? 'Ward C' : 'Ward D';
    return {
      id: `BED-${padded}`,
      label: `Bed ${padded}`,
      ward,
      activePatientId: null,
    };
  });

  const patients: Patient[] = [];
  const temperatures: TemperatureReading[] = [];
  const visits: DoctorVisit[] = [];
  const auditLog: AuditEvent[] = [];

  let tempSeq = 1;
  let visitSeq = 1;

  const addTemp = (
    patientId: string,
    localDate: string,
    valueCelsius: number,
    hour = 8,
    minute = 30,
    note?: string
  ) => {
    const id = `TMP-${String(tempSeq++).padStart(4, '0')}`;
    temperatures.push({
      id,
      patientId,
      measuredAt: makeIsoAtLocalHour(localDate, hour, minute),
      localDate,
      valueCelsius,
      recordedBy: 'Nurse Priya Sharma',
      note,
      amendments: [],
    });
  };

  const addVisit = (
    patientId: string,
    localDate: string,
    note: string,
    hour = 11,
    minute = 15
  ) => {
    const id = `VST-${String(visitSeq++).padStart(4, '0')}`;
    visits.push({
      id,
      patientId,
      visitedAt: makeIsoAtLocalHour(localDate, hour, minute),
      localDate,
      doctorId: 'USR-DOC-01',
      doctorName: 'Dr. Arjun Mehta',
      note,
      status: 'completed',
    });
  };

  // --- Key Demo Patients (Beds 01 to 06) ---

  // Patient A: Active, NO temperature today -> Nurse Queue
  const pA: Patient = {
    id: 'CT-1001',
    fullName: 'Aarav Kulkarni',
    age: 34,
    sex: 'Male',
    admissionDate: addDaysToLocalDate(today, -4),
    bedId: 'BED-01',
    status: 'active',
    notes: 'Patient A (Demo): Pending today’s temperature measurement in Nurse queue.',
  };
  patients.push(pA);
  beds[0].activePatientId = pA.id;
  addTemp(pA.id, addDaysToLocalDate(today, -3), 38.7, 8, 15, 'Initial admission fever');
  addVisit(pA.id, addDaysToLocalDate(today, -3), 'Hydration and antipyretics continued.');
  addTemp(pA.id, addDaysToLocalDate(today, -2), 38.2, 8, 20, 'Mild persistent fever');
  addVisit(pA.id, addDaysToLocalDate(today, -2), 'Monitoring fever curve; stable vitals.');
  addTemp(pA.id, addDaysToLocalDate(today, -1), 37.1, 8, 10, 'Afebrile yesterday');
  addVisit(pA.id, addDaysToLocalDate(today, -1), 'Improved appetite; continue daily checks.');

  // Patient B: Active, temperature recorded today, NO doctor visit today -> Doctor Queue
  const pB: Patient = {
    id: 'CT-1002',
    fullName: 'Meera Nair',
    age: 29,
    sex: 'Female',
    admissionDate: addDaysToLocalDate(today, -3),
    bedId: 'BED-02',
    status: 'active',
    notes: 'Patient B (Demo): Today’s temperature recorded; awaiting Doctor visit.',
  };
  patients.push(pB);
  beds[1].activePatientId = pB.id;
  addTemp(pB.id, addDaysToLocalDate(today, -2), 38.4, 8, 5);
  addVisit(pB.id, addDaysToLocalDate(today, -2), 'Started supportive care.');
  addTemp(pB.id, addDaysToLocalDate(today, -1), 37.4, 8, 15);
  addVisit(pB.id, addDaysToLocalDate(today, -1), 'Fever trending down.');
  addTemp(pB.id, today, 37.0, 8, 25, 'Afebrile this morning');

  // Patient C: Active, 3 completed consecutive fever-free days -> Discharge-ready
  const pC: Patient = {
    id: 'CT-1003',
    fullName: 'Rohan Deshmukh',
    age: 41,
    sex: 'Male',
    admissionDate: addDaysToLocalDate(today, -5),
    bedId: 'BED-03',
    status: 'active',
    notes: 'Patient C (Demo): Meets 3 full consecutive fever-free days rule; ready for discharge.',
    doctorEndorsedDischarge: true,
    doctorEndorsedBy: 'Dr. Arjun Mehta',
    doctorEndorsedAt: makeIsoAtLocalHour(today, 10, 45),
  };
  patients.push(pC);
  beds[2].activePatientId = pC.id;
  addTemp(pC.id, addDaysToLocalDate(today, -4), 38.5, 8, 10, 'Mild fever on day 2');
  addVisit(pC.id, addDaysToLocalDate(today, -4), 'Supportive care.');
  addTemp(pC.id, addDaysToLocalDate(today, -3), 37.2, 8, 10, 'Fever-free day 1');
  addVisit(pC.id, addDaysToLocalDate(today, -3), 'Afebrile, stable.');
  addTemp(pC.id, addDaysToLocalDate(today, -2), 36.9, 8, 15, 'Fever-free day 2');
  addVisit(pC.id, addDaysToLocalDate(today, -2), 'Asymptomatic.');
  addTemp(pC.id, addDaysToLocalDate(today, -1), 36.8, 8, 5, 'Fever-free day 3');
  addVisit(pC.id, addDaysToLocalDate(today, -1), 'Completed 3 full fever-free days.');
  addTemp(pC.id, today, 36.7, 8, 0, 'Remains afebrile');
  addVisit(pC.id, today, 'Clinically stable; endorsed for administrative discharge.', 10, 45);

  // Patient D: Active, historical fever broke streak -> Not discharge-ready
  const pD: Patient = {
    id: 'CT-1004',
    fullName: 'Ananya Iyer',
    age: 52,
    sex: 'Female',
    admissionDate: addDaysToLocalDate(today, -5),
    bedId: 'BED-04',
    status: 'active',
    notes: 'Patient D (Demo): Fever spike 2 days ago reset the 3-day streak.',
  };
  patients.push(pD);
  beds[3].activePatientId = pD.id;
  addTemp(pD.id, addDaysToLocalDate(today, -4), 37.3, 8, 15);
  addTemp(pD.id, addDaysToLocalDate(today, -3), 37.1, 8, 20);
  addTemp(pD.id, addDaysToLocalDate(today, -2), 38.6, 8, 30, 'Fever spike — streak reset');
  addVisit(pD.id, addDaysToLocalDate(today, -2), 'Fever spike noted; observation extended.');
  addTemp(pD.id, addDaysToLocalDate(today, -1), 37.2, 8, 10);
  addVisit(pD.id, addDaysToLocalDate(today, -1), 'Afebrile again; streak restarted at day 1.');
  addTemp(pD.id, today, 37.0, 8, 20);
  addVisit(pD.id, today, 'Stable; continue monitoring.');

  // Patient F: Active, missing day broke streak -> Not discharge-ready
  const pF: Patient = {
    id: 'CT-1005',
    fullName: 'Vikram Joshi',
    age: 47,
    sex: 'Male',
    admissionDate: addDaysToLocalDate(today, -5),
    bedId: 'BED-05',
    status: 'active',
    notes: 'Patient F (Demo): Missing reading 2 days ago reset the fever-free streak.',
  };
  patients.push(pF);
  beds[4].activePatientId = pF.id;
  addTemp(pF.id, addDaysToLocalDate(today, -4), 37.0, 8, 15);
  addTemp(pF.id, addDaysToLocalDate(today, -3), 37.1, 8, 20);
  // D-2 intentionally missing!
  addTemp(pF.id, addDaysToLocalDate(today, -1), 36.9, 8, 10);
  addVisit(pF.id, addDaysToLocalDate(today, -1), 'Missed reading on D-2 documented; streak restarted.');
  addTemp(pF.id, today, 36.8, 8, 15);
  addVisit(pF.id, today, 'Vitals normal.');

  // Patient G: Active, 2 completed days + partial today -> Not discharge-ready
  const pG: Patient = {
    id: 'CT-1006',
    fullName: 'Kavya Menon',
    age: 26,
    sex: 'Female',
    admissionDate: addDaysToLocalDate(today, -2),
    bedId: 'BED-06',
    status: 'active',
    notes: 'Patient G (Demo): 2 completed days + partial today; conservative rule requires 3 full completed days.',
  };
  patients.push(pG);
  beds[5].activePatientId = pG.id;
  addTemp(pG.id, addDaysToLocalDate(today, -2), 37.1, 9, 0);
  addVisit(pG.id, addDaysToLocalDate(today, -2), 'Admission assessment complete.');
  addTemp(pG.id, addDaysToLocalDate(today, -1), 36.9, 8, 20);
  addVisit(pG.id, addDaysToLocalDate(today, -1), 'Afebrile.');
  addTemp(pG.id, today, 36.8, 8, 10);
  addVisit(pG.id, today, 'Doing well; awaiting completion of 3rd full day.');

  // --- Remaining 68 Active Patients (Beds 07 to 74) for full 74/74 occupancy ---
  for (let i = 7; i <= 74; i++) {
    const id = `CT-${1000 + i}`;
    const bed = beds[i - 1];
    const first = FIRST_NAMES[(i * 7) % FIRST_NAMES.length];
    const last = LAST_NAMES[(i * 5) % LAST_NAMES.length];
    const age = 21 + ((i * 11) % 58);
    const sex: Patient['sex'] = i % 2 === 0 ? 'Female' : 'Male';
    const admitOffset = -((i % 5) + 2); // admitted 2 to 6 days ago
    const admissionDate = addDaysToLocalDate(today, admitOffset);

    // Distribute operational states cleanly:
    // i = 7..16 (10 patients): pending temp today (Nurse Queue)
    // i = 17..25 (9 patients): temp recorded today, pending doctor visit (Doctor Queue)
    // i = 26..27 (2 patients): 3 full completed fever-free days (Discharge-ready)
    // i = 28..74 (47 patients): completed today, not yet 3 full fever-free days
    const isPendingTemp = i >= 7 && i <= 16;
    const isPendingVisit = i >= 17 && i <= 25;
    const isExtraDischargeReady = i === 26 || i === 27;

    const p: Patient = {
      id,
      fullName: `${first} ${last}`,
      age,
      sex,
      admissionDate,
      bedId: bed.id,
      status: 'active',
      notes: isExtraDischargeReady
        ? 'Completed 3 consecutive fever-free days; eligible for discharge review.'
        : 'Standard quarantine isolation & daily monitoring.',
      ...(isExtraDischargeReady
        ? {
            doctorEndorsedDischarge: true,
            doctorEndorsedBy: 'Dr. Arjun Mehta',
            doctorEndorsedAt: makeIsoAtLocalHour(today, 11, 0),
          }
        : {}),
    };

    patients.push(p);
    bed.activePatientId = p.id;

    // Historical days before today
    for (let d = admitOffset; d <= -1; d++) {
      const dDate = addDaysToLocalDate(today, d);
      let tempVal = 37.1;
      if (isExtraDischargeReady) {
        tempVal = d <= -4 ? 38.3 : Number((36.7 + (i % 4) * 0.1).toFixed(1));
      } else if (d === -1 && i % 4 === 0) {
        tempVal = 38.4; // recent fever
      } else if (d === -2 && i % 3 === 0) {
        tempVal = 38.2; // fever 2 days ago
      } else {
        tempVal = Number((36.8 + ((i + Math.abs(d)) % 7) * 0.15).toFixed(1));
      }
      addTemp(p.id, dDate, tempVal, 8, 10 + (i % 40));
      addVisit(p.id, dDate, 'Daily physician review completed.', 11, 10 + (i % 45));
    }

    // Today's state
    if (!isPendingTemp) {
      const todayVal =
        !isExtraDischargeReady && i % 9 === 0
          ? 38.3
          : Number((36.7 + (i % 6) * 0.12).toFixed(1));
      addTemp(p.id, today, todayVal, 8, 15 + (i % 40));

      if (!isPendingVisit) {
        addVisit(
          p.id,
          today,
          isExtraDischargeReady
            ? '3 full fever-free days verified; endorsed for discharge.'
            : 'Vitals reviewed; continue quarantine protocol.',
          11,
          5 + (i % 50)
        );
      }
    }
  }

  // --- Historical Resolved Outcomes (No beds occupied) ---
  if (preset === 'standard') {
    // Patient E (required by brief): Discharged, bed is free
    const pE: Patient = {
      id: 'CT-0990',
      fullName: 'Siddharth Rao',
      age: 38,
      sex: 'Male',
      admissionDate: addDaysToLocalDate(today, -9),
      bedId: null,
      status: 'discharged',
      notes: 'Patient E (Demo): Discharged after 3 consecutive fever-free days; bed released.',
      dischargedAt: makeIsoAtLocalHour(addDaysToLocalDate(today, -2), 14, 30),
      dischargedBy: 'Kavita Nair',
      dischargeNote: 'Verified 3 full fever-free days.',
      outcomeAt: makeIsoAtLocalHour(addDaysToLocalDate(today, -2), 14, 30),
    };
    patients.push(pE);

    // 15 more discharged patients (total 16 discharged)
    for (let j = 1; j <= 15; j++) {
      const outcomeDay = addDaysToLocalDate(today, -((j % 12) + 1));
      patients.push({
        id: `CT-09${String(70 + j).padStart(2, '0')}`,
        fullName: `${FIRST_NAMES[(j * 3) % FIRST_NAMES.length]} ${LAST_NAMES[(j * 7) % LAST_NAMES.length]}`,
        age: 24 + ((j * 5) % 45),
        sex: j % 2 === 0 ? 'Female' : 'Male',
        admissionDate: addDaysToLocalDate(outcomeDay, -6),
        bedId: null,
        status: 'discharged',
        notes: 'Recovered and discharged per 3-day fever-free protocol.',
        dischargedAt: makeIsoAtLocalHour(outcomeDay, 15, 0),
        dischargedBy: 'Kavita Nair',
        outcomeAt: makeIsoAtLocalHour(outcomeDay, 15, 0),
      });
    }

    // 3 deceased patients (3 / 19 = 15.79% mortality > 15% benchmark!)
    for (let k = 1; k <= 3; k++) {
      const outcomeDay = addDaysToLocalDate(today, -(k * 3));
      patients.push({
        id: `CT-096${k}`,
        fullName: `${FIRST_NAMES[(k * 9) % FIRST_NAMES.length]} ${LAST_NAMES[(k * 11) % LAST_NAMES.length]}`,
        age: 67 + k * 4,
        sex: k % 2 === 0 ? 'Female' : 'Male',
        admissionDate: addDaysToLocalDate(outcomeDay, -4),
        bedId: null,
        status: 'deceased',
        notes: 'Severe respiratory complications during isolation.',
        outcomeAt: makeIsoAtLocalHour(outcomeDay, 18, 20),
      });
    }
  }

  auditLog.push({
    id: 'AUD-0001',
    actorId: 'SYSTEM',
    actorName: 'CareTrack Demo Seed',
    actorRole: 'admin',
    action: 'DEMO_DATA_RESET',
    entityType: 'system',
    entityId: 'FACILITY',
    timestamp: new Date().toISOString(),
    summary:
      preset === 'standard'
        ? 'Initialized 74/74 occupied beds and 19 historical resolved outcomes (16 discharged, 3 deceased).'
        : 'Initialized 74/74 occupied beds with 0 resolved outcomes (N/A benchmark demo).',
  });

  return {
    patients,
    beds,
    temperatures,
    visits,
    auditLog,
    settings,
  };
}
