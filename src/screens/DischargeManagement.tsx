import React, { useState } from 'react';
import { CheckCircle2, LogOut, ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import { formatLocalDate } from '../domain/dateUtils';
import { canRolePerform } from '../domain/rules';
import {
  Bed,
  CareTrackState,
  DischargeEligibility,
  Patient,
  Role,
} from '../types/caretrack';
import { StatusChip } from '../components/StatusChip';

interface DischargeManagementProps {
  state: CareTrackState;
  role: Role;
  eligibilityMap: Map<string, DischargeEligibility>;
  onSelectPatient: (patientId: string) => void;
  onEndorseDischarge: (patientId: string) => void;
  onDischargePatient: (patientId: string, note: string) => void;
}

export const DischargeManagement: React.FC<DischargeManagementProps> = ({
  state,
  role,
  eligibilityMap,
  onSelectPatient,
  onEndorseDischarge,
  onDischargePatient,
}) => {
  const [confirmPatient, setConfirmPatient] = useState<Patient | null>(null);
  const [dischargeNote, setDischargeNote] = useState('');

  const bedById = new Map<string, Bed>();
  for (const b of state.beds) bedById.set(b.id, b);

  const activePatients = state.patients.filter((p) => p.status === 'active');
  const eligiblePatients = activePatients.filter((p) => eligibilityMap.get(p.id)?.isEligible);
  const ineligibleDemoHighlights = activePatients
    .filter((p) => !eligibilityMap.get(p.id)?.isEligible)
    .slice(0, 6);

  const canDischarge = canRolePerform(role, 'process_discharge');
  const canEndorse = canRolePerform(role, 'endorse_discharge');

  const handleConfirmDischarge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmPatient) return;
    onDischargePatient(confirmPatient.id, dischargeNote);
    setConfirmPatient(null);
    setDischargeNote('');
  };

  return (
    <div className="space-y-6">
      {/* Operational Eligibility Disclaimer */}
      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-sky-950">
        <Info className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <p className="font-semibold text-sm">
            Operational Eligibility vs. Clinical Discharge Authority
          </p>
          <p className="mt-0.5">
            CareTrack evaluates the <strong>three consecutive completed fever-free days</strong>{' '}
            criterion (&lt; {state.settings.feverThresholdCelsius.toFixed(1)} °C) and flags
            operational eligibility. Authorised clinical and administrative staff remain solely
            responsible for the final discharge decision.
          </p>
        </div>
      </div>

      {!canDischarge.allowed && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            <strong>View-only for Discharge Processing:</strong> {canDischarge.reason}
          </span>
        </div>
      )}

      {/* Eligible Patients */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Discharge-Ready Patients ({eligiblePatients.length})
            </h2>
            <p className="text-xs text-slate-500">
              Verified 3 consecutive completed facility-local calendar days below{' '}
              {state.settings.feverThresholdCelsius.toFixed(1)} °C
            </p>
          </div>
        </div>

        {eligiblePatients.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No active patients currently meet the three-full-day fever-free discharge criterion.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {eligiblePatients.map((p) => {
              const bed = p.bedId ? bedById.get(p.bedId) : undefined;
              const elig = eligibilityMap.get(p.id)!;
              return (
                <div
                  key={p.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => onSelectPatient(p.id)}
                        className="text-base font-semibold text-slate-900 hover:text-teal-700"
                      >
                        {p.fullName}
                      </button>
                      <span className="text-xs font-mono text-slate-500">{p.id}</span>
                      <StatusChip variant="discharge-ready" label="Eligible (3/3 Full Days)" />
                      {p.doctorEndorsedDischarge ? (
                        <StatusChip variant="completed" label="Doctor Endorsed" />
                      ) : (
                        <StatusChip variant="pending" label="Awaiting Doctor Endorsement" />
                      )}
                    </div>

                    <p className="text-xs text-slate-600">
                      {bed ? `${bed.label} (${bed.ward})` : 'Unassigned'} • Age {p.age} • Admitted{' '}
                      {formatLocalDate(p.admissionDate)}
                    </p>

                    {/* Qualifying 3-day Evidence */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs font-medium text-slate-700">
                        Qualifying Evidence:
                      </span>
                      {elig.qualifyingDays.map((qd) => (
                        <span
                          key={qd.readingId}
                          className="inline-flex items-center gap-1.5 text-xs bg-teal-50 border border-teal-200 text-teal-900 px-2.5 py-1 rounded-md"
                        >
                          <span>{formatLocalDate(qd.localDate)}:</span>
                          <strong className="font-mono">{qd.valueCelsius.toFixed(1)} °C</strong>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {!p.doctorEndorsedDischarge && (
                      <button
                        type="button"
                        onClick={() => onEndorseDischarge(p.id)}
                        disabled={!canEndorse.allowed}
                        title={canEndorse.allowed ? 'Endorse discharge' : canEndorse.reason}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-teal-600 text-teal-800 bg-teal-50 text-xs font-medium hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Endorse Discharge
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setConfirmPatient(p)}
                      disabled={!canDischarge.allowed}
                      title={canDischarge.allowed ? 'Process discharge' : canDischarge.reason}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                      <LogOut className="w-4 h-4" />
                      Process Discharge
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ineligible Examples (for transparency & auditability) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-900">
            Ineligible Patients Sample (Discharge Blocked)
          </h3>
          <p className="text-xs text-slate-500">
            Examples of active patients blocked from discharge due to incomplete days, fever spikes,
            or missing readings
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {ineligibleDemoHighlights.map((p) => {
            const elig = eligibilityMap.get(p.id)!;
            return (
              <div
                key={p.id}
                className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => onSelectPatient(p.id)}
                    className="font-semibold text-slate-900 hover:text-teal-700"
                  >
                    {p.fullName} ({p.id})
                  </button>
                  <p className="text-slate-600 mt-0.5">{elig.explanation}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {elig.streakDays}/3 Days
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmPatient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-discharge-title"
        >
          <form
            onSubmit={handleConfirmDischarge}
            className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md p-5 space-y-4"
          >
            <h3 id="confirm-discharge-title" className="text-base font-semibold text-slate-900">
              Confirm Administrative Discharge
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to discharge <strong>{confirmPatient.fullName}</strong> (
              {confirmPatient.id}) and immediately release{' '}
              <strong>{confirmPatient.bedId}</strong> for new admissions.
            </p>
            <div>
              <label
                htmlFor="discharge-note"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Administrative Discharge Note (Optional)
              </label>
              <input
                id="discharge-note"
                type="text"
                value={dischargeNote}
                onChange={(e) => setDischargeNote(e.target.value)}
                placeholder="e.g., Clearance paperwork completed; bed sanitized."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPatient(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
              >
                Confirm Discharge &amp; Release Bed
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
