import React from 'react';
import {
  Users,
  BedDouble,
  Thermometer,
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { canRolePerform, isFeverReading } from '../domain/rules';
import {
  Bed,
  CareTrackState,
  DischargeEligibility,
  OutcomeMetrics,
  Patient,
  Role,
  ScreenId,
  TemperatureReading,
} from '../types/caretrack';
import { StatusChip } from '../components/StatusChip';

interface OverviewDashboardProps {
  state: CareTrackState;
  role: Role;
  todayLocalDate: string;
  eligibilityMap: Map<string, DischargeEligibility>;
  outcomes: OutcomeMetrics;
  onNavigate: (screen: ScreenId) => void;
  onSelectPatient: (patientId: string) => void;
  onOpenTempModal: (patient: Patient) => void;
  onOpenVisitModal: (patient: Patient) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  state,
  role,
  todayLocalDate,
  eligibilityMap,
  outcomes,
  onNavigate,
  onSelectPatient,
  onOpenTempModal,
  onOpenVisitModal,
}) => {
  const activePatients = state.patients.filter((p) => p.status === 'active');
  const occupiedCount = activePatients.length;
  const capacity = state.settings.capacity;
  const availableBeds = Math.max(0, capacity - occupiedCount);
  const isFull = occupiedCount >= capacity;

  const todayTempsByPatient = new Map<string, TemperatureReading>();
  for (const t of state.temperatures) {
    if (t.localDate === todayLocalDate) {
      todayTempsByPatient.set(t.patientId, t);
    }
  }

  const todayVisitsSet = new Set<string>();
  for (const v of state.visits) {
    if (v.localDate === todayLocalDate) {
      todayVisitsSet.add(v.patientId);
    }
  }

  const bedById = new Map<string, Bed>();
  for (const b of state.beds) bedById.set(b.id, b);

  const pendingTempQueue = activePatients.filter((p) => !todayTempsByPatient.has(p.id));
  const pendingDoctorQueue = activePatients.filter(
    (p) => todayTempsByPatient.has(p.id) && !todayVisitsSet.has(p.id)
  );
  const dischargeReadyPatients = activePatients.filter(
    (p) => eligibilityMap.get(p.id)?.isEligible
  );

  const tempCompletedCount = occupiedCount - pendingTempQueue.length;
  const visitCompletedCount = activePatients.filter((p) => todayVisitsSet.has(p.id)).length;

  const canRecordTemp = canRolePerform(role, 'record_temperature');
  const canCompleteVisit = canRolePerform(role, 'complete_doctor_visit');

  return (
    <div className="space-y-6">
      {/* Capacity / Mortality Banners */}
      {isFull && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">
                Facility at Full Capacity ({occupiedCount}/{capacity} Beds Occupied)
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                New patient admissions are blocked until an eligible patient is discharged and a bed
                is released.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('discharge')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-900 text-white hover:bg-amber-950"
          >
            Review {dischargeReadyPatients.length} Discharge-Ready
          </button>
        </div>
      )}

      {outcomes.isMortalityAlert && outcomes.mortalityRate !== null && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-rose-900"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">
                Mortality Benchmark Exceeded: {outcomes.mortalityRate.toFixed(1)}% (Threshold: &gt;
                {state.settings.mortalityBenchmarkPercent}%)
              </p>
              <p className="text-xs text-rose-800 mt-0.5">
                Based on {outcomes.deceasedCount} deceased out of {outcomes.resolvedCount} resolved
                outcomes. This alert is a signal for clinical leadership to investigate, not proof of
                treatment failure or causation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('outcomes')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-800 text-white hover:bg-rose-900"
          >
            View Outcomes
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Occupancy</span>
            <Users className="w-4 h-4 text-teal-700" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {occupiedCount} <span className="text-sm font-normal text-slate-500">/ {capacity}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {isFull ? '100% full capacity' : `${Math.round((occupiedCount / capacity) * 100)}% occupied`}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Available Beds</span>
            <BedDouble className="w-4 h-4 text-sky-700" />
          </div>
          <p
            className={`mt-2 text-2xl font-semibold ${
              availableBeds === 0 ? 'text-amber-700' : 'text-emerald-700'
            }`}
          >
            {availableBeds}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {availableBeds === 0 ? 'No free beds available' : 'Ready for admission'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Today&apos;s Temps</span>
            <Thermometer className="w-4 h-4 text-teal-700" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {tempCompletedCount}{' '}
            <span className="text-sm font-normal text-slate-500">/ {occupiedCount}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">{pendingTempQueue.length} pending nurse check</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Today&apos;s Doctor Visits</span>
            <Stethoscope className="w-4 h-4 text-sky-700" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {visitCompletedCount}{' '}
            <span className="text-sm font-normal text-slate-500">/ {occupiedCount}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {pendingDoctorQueue.length} ready for doctor now
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Discharge-Ready</span>
            <CheckCircle2 className="w-4 h-4 text-teal-700" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-teal-700">
            {dischargeReadyPatients.length}
          </p>
          <button
            type="button"
            onClick={() => onNavigate('discharge')}
            className="mt-1 text-xs text-teal-700 hover:text-teal-900 font-medium inline-flex items-center gap-1"
          >
            Review eligibility <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Attention Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nurse Attention Queue */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Pending Nurse Temperature ({pendingTempQueue.length})
              </h2>
              <p className="text-xs text-slate-500">
                Patients missing today&apos;s ({todayLocalDate}) temperature reading
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('workflow')}
              className="text-xs font-medium text-teal-700 hover:text-teal-900"
            >
              Open Workflow →
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {pendingTempQueue.length === 0 ? (
              <p className="p-5 text-xs text-slate-500">
                All active patients have a temperature recorded for today.
              </p>
            ) : (
              pendingTempQueue.slice(0, 8).map((p) => {
                const bed = p.bedId ? bedById.get(p.bedId) : undefined;
                return (
                  <div
                    key={p.id}
                    className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50"
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
                        {p.id} • {bed?.label ?? 'Unassigned'} ({bed?.ward})
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusChip variant="pending" label="Temp Pending" />
                      <button
                        type="button"
                        onClick={() => onOpenTempModal(p)}
                        disabled={!canRecordTemp.allowed}
                        title={
                          canRecordTemp.allowed ? 'Record temperature' : canRecordTemp.reason
                        }
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-teal-700 text-white hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
                      >
                        Record Temp
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Doctor Attention Queue */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Pending Doctor Visit ({pendingDoctorQueue.length})
              </h2>
              <p className="text-xs text-slate-500">
                Temperature recorded today; ready for same-day physician review
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('workflow')}
              className="text-xs font-medium text-sky-700 hover:text-sky-900"
            >
              Open Workflow →
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {pendingDoctorQueue.length === 0 ? (
              <p className="p-5 text-xs text-slate-500">
                No patients currently awaiting a doctor visit after temperature entry.
              </p>
            ) : (
              pendingDoctorQueue.slice(0, 8).map((p) => {
                const bed = p.bedId ? bedById.get(p.bedId) : undefined;
                const todayTemp = todayTempsByPatient.get(p.id);
                const fever = todayTemp
                  ? isFeverReading(todayTemp.valueCelsius, state.settings.feverThresholdCelsius)
                  : false;
                return (
                  <div
                    key={p.id}
                    className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50"
                  >
                    <div>
                      <button
                        type="button"
                        onClick={() => onSelectPatient(p.id)}
                        className="text-sm font-medium text-slate-900 hover:text-sky-700 text-left"
                      >
                        {p.fullName}
                      </button>
                      <p className="text-xs text-slate-500">
                        {p.id} • {bed?.label ?? 'Unassigned'} • Today:{' '}
                        <span className="font-mono font-medium text-slate-700">
                          {todayTemp?.valueCelsius.toFixed(1)} °C
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {fever && <StatusChip variant="fever" label="Fever" />}
                      <button
                        type="button"
                        onClick={() => onOpenVisitModal(p)}
                        disabled={!canCompleteVisit.allowed}
                        title={
                          canCompleteVisit.allowed
                            ? 'Complete doctor visit'
                            : canCompleteVisit.reason
                        }
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-sky-700 text-white hover:bg-sky-800 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
                      >
                        Complete Visit
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
