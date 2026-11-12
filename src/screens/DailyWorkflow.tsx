import React from 'react';
import { Thermometer, Stethoscope, Lock, CheckCircle2 } from 'lucide-react';
import { canRolePerform, isFeverReading } from '../domain/rules';
import {
  Bed,
  CareTrackState,
  Patient,
  Role,
  TemperatureReading,
} from '../types/caretrack';
import { StatusChip } from '../components/StatusChip';

interface DailyWorkflowProps {
  state: CareTrackState;
  role: Role;
  todayLocalDate: string;
  onSelectPatient: (patientId: string) => void;
  onOpenTempModal: (patient: Patient) => void;
  onOpenVisitModal: (patient: Patient) => void;
}

export const DailyWorkflow: React.FC<DailyWorkflowProps> = ({
  state,
  role,
  todayLocalDate,
  onSelectPatient,
  onOpenTempModal,
  onOpenVisitModal,
}) => {
  const activePatients = state.patients.filter((p) => p.status === 'active');

  const bedById = new Map<string, Bed>();
  for (const b of state.beds) bedById.set(b.id, b);

  const todayTemps = new Map<string, TemperatureReading>();
  for (const t of state.temperatures) {
    if (t.localDate === todayLocalDate) todayTemps.set(t.patientId, t);
  }

  const todayVisits = new Set<string>();
  for (const v of state.visits) {
    if (v.localDate === todayLocalDate) todayVisits.add(v.patientId);
  }

  const tempPendingQueue = activePatients.filter((p) => !todayTemps.has(p.id));
  const doctorPendingQueue = activePatients.filter(
    (p) => todayTemps.has(p.id) && !todayVisits.has(p.id)
  );
  const completedBothCount = activePatients.filter(
    (p) => todayTemps.has(p.id) && todayVisits.has(p.id)
  ).length;

  const canRecordTemp = canRolePerform(role, 'record_temperature');
  const canCompleteVisit = canRolePerform(role, 'complete_doctor_visit');

  return (
    <div className="space-y-6">
      {/* Workflow Progress Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Daily Care Sequence ({todayLocalDate})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Step 1: Nurse records temperature → Step 2: Patient enters Doctor queue → Step 3: Doctor
            completes same-day visit.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-medium">
            {tempPendingQueue.length} Awaiting Temp
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 font-medium">
            {doctorPendingQueue.length} Awaiting Doctor
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {completedBothCount} Completed Both
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue 1: Nurse Temperature Queue */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 bg-teal-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Thermometer className="w-5 h-5 text-teal-700" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  1. Nurse Queue — Temperature Pending ({tempPendingQueue.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Active patients without a reading for {todayLocalDate}
                </p>
              </div>
            </div>
          </div>

          {!canRecordTemp.allowed && (
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>{canRecordTemp.reason}</span>
            </div>
          )}

          <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
            {tempPendingQueue.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                All active patients have today&apos;s temperature recorded.
              </div>
            ) : (
              tempPendingQueue.map((p) => {
                const bed = p.bedId ? bedById.get(p.bedId) : undefined;
                return (
                  <div
                    key={p.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50"
                  >
                    <div>
                      <button
                        type="button"
                        onClick={() => onSelectPatient(p.id)}
                        className="text-sm font-medium text-slate-900 hover:text-teal-700 text-left"
                      >
                        {p.fullName}
                      </button>
                      <p className="text-xs text-slate-500">
                        {p.id} • {bed?.label ?? 'Unassigned'} ({bed?.ward}) • Age {p.age}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenTempModal(p)}
                      disabled={!canRecordTemp.allowed}
                      title={canRecordTemp.allowed ? 'Record temperature' : canRecordTemp.reason}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-700 text-white hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed shrink-0"
                    >
                      Record Temp
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Queue 2: Doctor Visit Pending Queue */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 bg-sky-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Stethoscope className="w-5 h-5 text-sky-700" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  2. Doctor Queue — Visit Pending ({doctorPendingQueue.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Only patients with today&apos;s temperature recorded appear here
                </p>
              </div>
            </div>
          </div>

          {!canCompleteVisit.allowed && (
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>{canCompleteVisit.reason}</span>
            </div>
          )}

          <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
            {doctorPendingQueue.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No patients currently waiting for a doctor visit.
              </div>
            ) : (
              doctorPendingQueue.map((p) => {
                const bed = p.bedId ? bedById.get(p.bedId) : undefined;
                const todayTemp = todayTemps.get(p.id)!;
                const fever = isFeverReading(
                  todayTemp.valueCelsius,
                  state.settings.feverThresholdCelsius
                );
                return (
                  <div
                    key={p.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectPatient(p.id)}
                          className="text-sm font-medium text-slate-900 hover:text-sky-700 text-left"
                        >
                          {p.fullName}
                        </button>
                        <StatusChip
                          variant={fever ? 'fever' : 'fever-free'}
                          label={`${todayTemp.valueCelsius.toFixed(1)} °C`}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.id} • {bed?.label ?? 'Unassigned'} ({bed?.ward}) • Recorded by{' '}
                        {todayTemp.recordedBy}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenVisitModal(p)}
                      disabled={!canCompleteVisit.allowed}
                      title={
                        canCompleteVisit.allowed
                          ? 'Complete doctor visit'
                          : canCompleteVisit.reason
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-700 text-white hover:bg-sky-800 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed shrink-0"
                    >
                      Complete Visit
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Explicit demonstration of Doctor visit block before temperature */}
      {tempPendingQueue.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Blocked from Doctor Visit (Awaiting Today&apos;s Temperature)
            </h3>
            <span className="text-xs text-slate-500">{tempPendingQueue.length} patient(s)</span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Per facility rules, a Doctor cannot complete a same-day visit until a Nurse records
            today&apos;s temperature.
          </p>
          <div className="flex flex-wrap gap-2">
            {tempPendingQueue.slice(0, 6).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpenVisitModal(p)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              >
                {p.fullName} ({p.id}) — Blocked
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
