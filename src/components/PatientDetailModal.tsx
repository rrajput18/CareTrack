import React, { useState } from 'react';
import {
  X,
  Thermometer,
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  LogOut,
} from 'lucide-react';
import { formatFacilityDateTime, formatLocalDate } from '../domain/dateUtils';
import { canRolePerform, isFeverReading } from '../domain/rules';
import {
  Bed,
  DischargeEligibility,
  DoctorVisit,
  Patient,
  Role,
  TemperatureReading,
} from '../types/caretrack';
import { StatusChip } from './StatusChip';

interface PatientDetailModalProps {
  patient: Patient;
  bed: Bed | undefined;
  readings: TemperatureReading[];
  visits: DoctorVisit[];
  eligibility: DischargeEligibility;
  role: Role;
  timezone: string;
  todayLocalDate: string;
  feverThresholdCelsius: number;
  onClose: () => void;
  onOpenTempModal: () => void;
  onOpenVisitModal: () => void;
  onAmendTemperature: (
    readingId: string,
    newValueCelsius: number,
    reason: string
  ) => { ok: boolean; error?: string };
  onEndorseDischarge: () => void;
  onDischargePatient: () => void;
}

export const PatientDetailModal: React.FC<PatientDetailModalProps> = ({
  patient,
  bed,
  readings,
  visits,
  eligibility,
  role,
  timezone,
  todayLocalDate,
  feverThresholdCelsius,
  onClose,
  onOpenTempModal,
  onOpenVisitModal,
  onAmendTemperature,
  onEndorseDischarge,
  onDischargePatient,
}) => {
  const [amendingId, setAmendingId] = useState<string | null>(null);
  const [amendVal, setAmendVal] = useState('');
  const [amendReason, setAmendReason] = useState('');
  const [amendError, setAmendError] = useState<string | null>(null);

  const sortedReadings = [...readings].sort((a, b) => b.localDate.localeCompare(a.localDate));
  const sortedVisits = [...visits].sort((a, b) => b.localDate.localeCompare(a.localDate));

  const todayTemp = sortedReadings.find((r) => r.localDate === todayLocalDate);
  const todayVisit = sortedVisits.find((v) => v.localDate === todayLocalDate);

  const canRecordTemp = canRolePerform(role, 'record_temperature');
  const canAmendTemp = canRolePerform(role, 'amend_temperature');
  const canCompleteVisit = canRolePerform(role, 'complete_doctor_visit');
  const canEndorse = canRolePerform(role, 'endorse_discharge');
  const canDischarge = canRolePerform(role, 'process_discharge');

  const handleStartAmend = (r: TemperatureReading) => {
    setAmendingId(r.id);
    setAmendVal(r.valueCelsius.toFixed(1));
    setAmendReason('');
    setAmendError(null);
  };

  const handleSaveAmend = (e: React.FormEvent, readingId: string) => {
    e.preventDefault();
    setAmendError(null);
    const res = onAmendTemperature(readingId, Number(amendVal), amendReason);
    if (!res.ok) {
      setAmendError(res.error ?? 'Failed to amend reading.');
    } else {
      setAmendingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="patient-detail-title"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 id="patient-detail-title" className="text-lg font-semibold text-slate-900">
                {patient.fullName}
              </h2>
              <span className="text-xs font-mono bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded">
                {patient.id}
              </span>
              {patient.status === 'active' && eligibility.isEligible && (
                <StatusChip variant="discharge-ready" label="Discharge-ready (3-Day Rule)" />
              )}
              {patient.status === 'discharged' && <StatusChip variant="discharged" label="Discharged" />}
              {patient.status === 'deceased' && <StatusChip variant="deceased" label="Deceased" />}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Age {patient.age}
              {patient.sex ? ` • ${patient.sex}` : ''} • Admitted {formatLocalDate(patient.admissionDate)} •{' '}
              {bed ? `${bed.label} (${bed.ward})` : 'Bed Released'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
            aria-label="Close patient details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Patient Notes */}
          {patient.notes && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Care Notes: </span>
              {patient.notes}
            </div>
          )}

          {/* 3-Full-Day Fever-Free Eligibility Card */}
          {patient.status === 'active' && (
            <div
              className={`rounded-xl border p-4 ${
                eligibility.isEligible
                  ? 'bg-teal-50/70 border-teal-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  {eligibility.isEligible ? (
                    <CheckCircle2 className="w-4 h-4 text-teal-700" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  Three-Full-Day Fever-Free Rule Evaluation
                </h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                  Completed Streak: {eligibility.streakDays} / 3 full days
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{eligibility.explanation}</p>

              {eligibility.qualifyingDays.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {eligibility.qualifyingDays.map((qd) => (
                    <div
                      key={qd.readingId}
                      className="text-xs bg-white border border-teal-200 rounded-md px-2.5 py-1.5 text-slate-700"
                    >
                      <span className="font-medium">{formatLocalDate(qd.localDate)}:</span>{' '}
                      <span className="font-mono text-teal-800">{qd.valueCelsius.toFixed(1)} °C</span>
                    </div>
                  ))}
                </div>
              )}

              {patient.doctorEndorsedDischarge && (
                <p className="mt-2.5 text-xs text-teal-800 font-medium">
                  Endorsed for discharge by {patient.doctorEndorsedBy}
                  {patient.doctorEndorsedAt
                    ? ` on ${formatFacilityDateTime(patient.doctorEndorsedAt, timezone)}`
                    : ''}
                  .
                </p>
              )}
            </div>
          )}

          {/* Role-Aware Action Bar */}
          {patient.status === 'active' && (
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onOpenTempModal}
                disabled={!canRecordTemp.allowed}
                title={canRecordTemp.allowed ? 'Record temperature' : canRecordTemp.reason}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-teal-700 text-white hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                <Thermometer className="w-3.5 h-3.5" />
                {todayTemp ? 'Temp Recorded Today' : 'Record Today’s Temp'}
              </button>

              <button
                type="button"
                onClick={onOpenVisitModal}
                disabled={!canCompleteVisit.allowed || Boolean(todayVisit)}
                title={
                  !canCompleteVisit.allowed
                    ? canCompleteVisit.reason
                    : todayVisit
                      ? 'Visit already completed today'
                      : 'Complete doctor visit'
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-sky-700 text-white hover:bg-sky-800 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                {todayVisit ? 'Doctor Visited Today' : 'Complete Doctor Visit'}
              </button>

              {eligibility.isEligible && !patient.doctorEndorsedDischarge && (
                <button
                  type="button"
                  onClick={onEndorseDischarge}
                  disabled={!canEndorse.allowed}
                  title={canEndorse.allowed ? 'Flag for discharge' : canEndorse.reason}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-teal-600 text-teal-800 bg-teal-50 hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Flag as Discharge-Ready
                </button>
              )}

              {eligibility.isEligible && (
                <button
                  type="button"
                  onClick={onDischargePatient}
                  disabled={!canDischarge.allowed}
                  title={canDischarge.allowed ? 'Process discharge' : canDischarge.reason}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-800 text-white hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Process Discharge
                </button>
              )}
            </div>
          )}

          {/* Temperature History */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2.5 flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-teal-700" />
              Temperature History ({sortedReadings.length})
            </h3>
            {sortedReadings.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No temperature readings recorded yet.</p>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-200">
                {sortedReadings.map((r) => {
                  const fever = isFeverReading(r.valueCelsius, feverThresholdCelsius);
                  const isToday = r.localDate === todayLocalDate;
                  return (
                    <div key={r.id} className="p-3 bg-white text-xs space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-slate-900">
                            {formatLocalDate(r.localDate)}
                            {isToday && (
                              <span className="ml-1.5 text-[11px] font-normal text-slate-500">
                                (Today — incomplete day)
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-sm font-semibold text-slate-900">
                            {r.valueCelsius.toFixed(1)} °C
                          </span>
                          <StatusChip
                            variant={fever ? 'fever' : 'fever-free'}
                            label={fever ? 'Fever' : 'Fever-free'}
                          />
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <span>
                            {r.recordedBy} • {formatFacilityDateTime(r.measuredAt, timezone)}
                          </span>
                          {canAmendTemp.allowed && patient.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => handleStartAmend(r)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                              <Edit3 className="w-3 h-3" />
                              Amend
                            </button>
                          )}
                        </div>
                      </div>

                      {r.note && <p className="text-slate-600">Note: {r.note}</p>}

                      {r.amendments.length > 0 && (
                        <div className="pl-3 border-l-2 border-amber-300 space-y-1 text-[11px] text-amber-900 bg-amber-50/50 py-1.5 pr-2 rounded-r">
                          {r.amendments.map((a) => (
                            <p key={a.id}>
                              <strong>Amended</strong> from {a.previousValueCelsius.toFixed(1)} °C to{' '}
                              {a.newValueCelsius.toFixed(1)} °C by {a.amendedBy} (
                              {formatFacilityDateTime(a.amendedAt, timezone)}) — Reason: {a.reason}
                            </p>
                          ))}
                        </div>
                      )}

                      {amendingId === r.id && (
                        <form
                          onSubmit={(e) => handleSaveAmend(e, r.id)}
                          className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2"
                        >
                          <p className="font-semibold text-slate-800">
                            Amend Reading (Audit-Logged — No Silent Overwrite)
                          </p>
                          {amendError && <p className="text-rose-700">{amendError}</p>}
                          <div className="flex flex-wrap gap-2">
                            <input
                              type="number"
                              step="0.1"
                              min="30.0"
                              max="45.0"
                              required
                              value={amendVal}
                              onChange={(e) => setAmendVal(e.target.value)}
                              className="w-24 rounded border border-slate-300 px-2 py-1 font-mono bg-white"
                              aria-label="Amended temperature in Celsius"
                            />
                            <input
                              type="text"
                              required
                              value={amendReason}
                              onChange={(e) => setAmendReason(e.target.value)}
                              placeholder="Required reason for amendment (e.g., thermometer recalibration)"
                              className="flex-1 min-w-[200px] rounded border border-slate-300 px-2.5 py-1 bg-white"
                            />
                            <button
                              type="submit"
                              className="px-3 py-1 rounded bg-teal-700 text-white font-medium hover:bg-teal-800"
                            >
                              Save Amendment
                            </button>
                            <button
                              type="button"
                              onClick={() => setAmendingId(null)}
                              className="px-2.5 py-1 rounded border border-slate-300 text-slate-600 hover:bg-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Doctor Visit History */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2.5 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-sky-700" />
              Doctor Visit History ({sortedVisits.length})
            </h3>
            {sortedVisits.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No doctor visits documented yet.</p>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-200">
                {sortedVisits.map((v) => (
                  <div key={v.id} className="p-3 bg-white text-xs space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        {formatLocalDate(v.localDate)}
                      </span>
                      <span className="text-slate-500">
                        {v.doctorName} • {formatFacilityDateTime(v.visitedAt, timezone)}
                      </span>
                    </div>
                    <p className="text-slate-700">{v.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
