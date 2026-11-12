import React, { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  LogOut,
  Menu,
  RotateCcw,
  ShieldAlert,
  Sliders,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { DoctorVisitModal } from './components/DoctorVisitModal';
import { PatientDetailModal } from './components/PatientDetailModal';
import { TemperatureEntryModal } from './components/TemperatureEntryModal';
import { getFacilityLocalDate } from './domain/dateUtils';
import {
  calculateOutcomeMetrics,
  DEMO_USERS,
  evaluateDischargeEligibility,
} from './domain/rules';
import { DemoPreset } from './domain/seedData';
import { AdmitPatient } from './screens/AdmitPatient';
import { DailyWorkflow } from './screens/DailyWorkflow';
import { DischargeManagement } from './screens/DischargeManagement';
import { OutcomesAnalytics } from './screens/OutcomesAnalytics';
import { OverviewDashboard } from './screens/OverviewDashboard';
import { PatientRegistry } from './screens/PatientRegistry';
import { RulesAssumptions } from './screens/RulesAssumptions';
import {
  admitPatient,
  amendTemperature,
  completeDoctorVisit,
  dischargePatient,
  endorseDischargeReadiness,
  loadCareTrackState,
  recordTemperature,
  resetDemoData,
  updateFacilitySettings,
} from './services/careTrackService';
import {
  CareTrackState,
  DischargeEligibility,
  Patient,
  Role,
  ScreenId,
} from './types/caretrack';

const NAV_ITEMS: { id: ScreenId; label: string; icon: React.ComponentType<{ className?: string }> }[] =
  [
    { id: 'overview', label: 'Overview Dashboard', icon: Activity },
    { id: 'workflow', label: 'Daily Workflow', icon: ClipboardList },
    { id: 'registry', label: 'Patient Registry', icon: Users },
    { id: 'admit', label: 'Admit Patient', icon: UserPlus },
    { id: 'discharge', label: 'Discharge Management', icon: LogOut },
    { id: 'outcomes', label: 'Outcomes & Analytics', icon: BarChart3 },
    { id: 'rules', label: 'Rules & Assumptions', icon: Sliders },
  ];

export function App() {
  const [state, setState] = useState<CareTrackState>(() => loadCareTrackState());
  const [role, setRole] = useState<Role>('nurse');
  const [activeScreen, setActiveScreen] = useState<ScreenId>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [detailPatientId, setDetailPatientId] = useState<string | null>(null);
  const [tempModalPatient, setTempModalPatient] = useState<Patient | null>(null);
  const [visitModalPatient, setVisitModalPatient] = useState<Patient | null>(null);
  const [resetMenuOpen, setResetMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    window.setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const todayLocalDate = getFacilityLocalDate(new Date(), state.settings.timezone);

  const eligibilityMap = useMemo(() => {
    const map = new Map<string, DischargeEligibility>();
    for (const p of state.patients) {
      map.set(
        p.id,
        evaluateDischargeEligibility(
          p,
          state.temperatures.filter((t) => t.patientId === p.id),
          todayLocalDate,
          state.settings.feverThresholdCelsius
        )
      );
    }
    return map;
  }, [
    state.patients,
    state.temperatures,
    todayLocalDate,
    state.settings.feverThresholdCelsius,
  ]);

  const outcomes = useMemo(
    () =>
      calculateOutcomeMetrics(
        state.patients,
        state.settings.mortalityBenchmarkPercent,
        'All Time',
        undefined,
        todayLocalDate,
        state.settings.timezone
      ),
    [state.patients, state.settings.mortalityBenchmarkPercent, state.settings.timezone, todayLocalDate]
  );

  const activeCount = state.patients.filter((p) => p.status === 'active').length;
  const currentUser = DEMO_USERS[role];

  const handleResetDemo = (preset: DemoPreset) => {
    const res = resetDemoData(role, preset);
    if (res.ok) {
      setState(res.state);
      showToast('success', res.message);
    }
    setResetMenuOpen(false);
  };

  const detailPatient = detailPatientId
    ? state.patients.find((p) => p.id === detailPatientId) ?? null
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm">
            CT
          </div>
          <div>
            <span className="font-semibold text-slate-900 text-sm block leading-tight">
              CareTrack
            </span>
            <span className="text-[11px] text-slate-500">
              {activeCount}/{state.settings.capacity} Beds Occupied
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="p-2 rounded-lg border border-slate-200 text-slate-700"
          aria-label="Toggle navigation"
        >
          {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`${
          mobileNavOpen ? 'block' : 'hidden'
        } lg:block w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 shrink-0 flex flex-col justify-between`}
      >
        <div>
          <div className="hidden lg:flex items-center gap-2.5 px-5 py-4 border-b border-slate-200">
            <div className="w-9 h-9 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm">
              CT
            </div>
            <div>
              <h1 className="font-semibold text-slate-900 text-base leading-tight">CareTrack</h1>
              <p className="text-[11px] text-slate-500">Facility Operations MVP</p>
            </div>
          </div>

          <nav className="p-3 space-y-1" aria-label="Primary Navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveScreen(item.id);
                    setMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-teal-800 border border-teal-200'
                      : 'text-slate-700 hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-700' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 space-y-1.5">
          <div className="flex items-center justify-between">
            <span>Facility Date:</span>
            <span className="font-mono font-medium text-slate-700">{todayLocalDate}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Fever Threshold:</span>
            <span className="font-mono font-medium text-slate-700">
              {state.settings.feverThresholdCelsius.toFixed(1)} °C*
            </span>
          </div>
          <p className="text-[11px] text-slate-400 pt-1">
            *Demo assumption; confirm with Head Doctor.
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar with Demo Role Selector */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">
              {NAV_ITEMS.find((n) => n.id === activeScreen)?.label}
            </h2>
            <p className="text-xs text-slate-500">
              Signed in (Demo): <strong>{currentUser.displayName}</strong> — {currentUser.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Demo-Only Role Switcher */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300"
                title="Demo-only role selector; production requires server-side authentication & RBAC."
              >
                Demo Role
              </span>
              <select
                aria-label="Demo-only role selector"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="text-xs font-medium text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="nurse">Nurse (Priya Sharma)</option>
                <option value="doctor">Doctor (Dr. Arjun Mehta)</option>
                <option value="admin">Administrator (Kavita Nair)</option>
                <option value="manager">Facility Manager (Director Verma)</option>
              </select>
            </div>

            {/* Reset Demo Data Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setResetMenuOpen(!resetMenuOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Demo
              </button>
              {resetMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-40 p-1.5 space-y-1">
                  <button
                    type="button"
                    onClick={() => handleResetDemo('standard')}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-100"
                  >
                    <div className="font-semibold text-slate-900">Standard Demo (74/74 Full)</div>
                    <div className="text-[11px] text-slate-500">
                      74 active beds + 19 resolved outcomes (&gt;15% alert)
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetDemo('zero_outcomes')}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-100"
                  >
                    <div className="font-semibold text-slate-900">
                      Zero Resolved Outcomes (N/A)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      74 active beds, 0 discharged/deceased (tests N/A)
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Toast Notification */}
        {toast && (
          <div className="px-4 sm:px-6 pt-3">
            <div
              role="status"
              className={`rounded-xl border px-4 py-2.5 text-xs flex items-center justify-between gap-2 ${
                toast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {toast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0" />
                )}
                <span>{toast.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Active Screen */}
        <main className="flex-1 p-4 sm:p-6">
          {activeScreen === 'overview' && (
            <OverviewDashboard
              state={state}
              role={role}
              todayLocalDate={todayLocalDate}
              eligibilityMap={eligibilityMap}
              outcomes={outcomes}
              onNavigate={setActiveScreen}
              onSelectPatient={(id) => setDetailPatientId(id)}
              onOpenTempModal={(p) => setTempModalPatient(p)}
              onOpenVisitModal={(p) => setVisitModalPatient(p)}
            />
          )}

          {activeScreen === 'registry' && (
            <PatientRegistry
              state={state}
              todayLocalDate={todayLocalDate}
              eligibilityMap={eligibilityMap}
              onSelectPatient={(id) => setDetailPatientId(id)}
            />
          )}

          {activeScreen === 'admit' && (
            <AdmitPatient
              state={state}
              role={role}
              todayLocalDate={todayLocalDate}
              onNavigate={setActiveScreen}
              onAdmit={(input) => {
                const res = admitPatient(state, role, input);
                if (res.ok) {
                  setState(res.state);
                  showToast('success', res.message);
                  return { ok: true, message: res.message };
                }
                return { ok: false, error: res.error };
              }}
            />
          )}

          {activeScreen === 'workflow' && (
            <DailyWorkflow
              state={state}
              role={role}
              todayLocalDate={todayLocalDate}
              onSelectPatient={(id) => setDetailPatientId(id)}
              onOpenTempModal={(p) => setTempModalPatient(p)}
              onOpenVisitModal={(p) => setVisitModalPatient(p)}
            />
          )}

          {activeScreen === 'discharge' && (
            <DischargeManagement
              state={state}
              role={role}
              eligibilityMap={eligibilityMap}
              onSelectPatient={(id) => setDetailPatientId(id)}
              onEndorseDischarge={(patientId) => {
                const res = endorseDischargeReadiness(state, role, { patientId });
                if (res.ok) {
                  setState(res.state);
                  showToast('success', res.message);
                } else {
                  showToast('error', res.error);
                }
              }}
              onDischargePatient={(patientId, dischargeNote) => {
                const res = dischargePatient(state, role, { patientId, dischargeNote });
                if (res.ok) {
                  setState(res.state);
                  showToast('success', res.message);
                } else {
                  showToast('error', res.error);
                }
              }}
            />
          )}

          {activeScreen === 'outcomes' && (
            <OutcomesAnalytics state={state} todayLocalDate={todayLocalDate} />
          )}

          {activeScreen === 'rules' && (
            <RulesAssumptions
              state={state}
              role={role}
              onUpdateSettings={(input) => {
                const res = updateFacilitySettings(state, role, input);
                if (res.ok) {
                  setState(res.state);
                  showToast('success', res.message);
                  return { ok: true, message: res.message };
                }
                return { ok: false, error: res.error };
              }}
            />
          )}
        </main>
      </div>

      {/* Patient Detail Modal */}
      {detailPatient && (
        <PatientDetailModal
          patient={detailPatient}
          bed={state.beds.find((b) => b.id === detailPatient.bedId)}
          readings={state.temperatures.filter((t) => t.patientId === detailPatient.id)}
          visits={state.visits.filter((v) => v.patientId === detailPatient.id)}
          eligibility={eligibilityMap.get(detailPatient.id)!}
          role={role}
          timezone={state.settings.timezone}
          todayLocalDate={todayLocalDate}
          feverThresholdCelsius={state.settings.feverThresholdCelsius}
          onClose={() => setDetailPatientId(null)}
          onOpenTempModal={() => setTempModalPatient(detailPatient)}
          onOpenVisitModal={() => setVisitModalPatient(detailPatient)}
          onAmendTemperature={(readingId, newValueCelsius, reason) => {
            const res = amendTemperature(state, role, { readingId, newValueCelsius, reason });
            if (res.ok) {
              setState(res.state);
              showToast('success', res.message);
              return { ok: true };
            }
            return { ok: false, error: res.error };
          }}
          onEndorseDischarge={() => {
            const res = endorseDischargeReadiness(state, role, { patientId: detailPatient.id });
            if (res.ok) {
              setState(res.state);
              showToast('success', res.message);
            } else {
              showToast('error', res.error);
            }
          }}
          onDischargePatient={() => {
            const res = dischargePatient(state, role, { patientId: detailPatient.id });
            if (res.ok) {
              setState(res.state);
              setDetailPatientId(null);
              showToast('success', res.message);
            } else {
              showToast('error', res.error);
            }
          }}
        />
      )}

      {/* Temperature Entry Modal */}
      {tempModalPatient && (
        <TemperatureEntryModal
          patient={tempModalPatient}
          bed={state.beds.find((b) => b.id === tempModalPatient.bedId)}
          role={role}
          todayLocalDate={todayLocalDate}
          feverThresholdCelsius={state.settings.feverThresholdCelsius}
          existingTodayValue={
            state.temperatures.find(
              (t) => t.patientId === tempModalPatient.id && t.localDate === todayLocalDate
            )?.valueCelsius
          }
          onClose={() => setTempModalPatient(null)}
          onSubmit={(valueCelsius, note) => {
            const res = recordTemperature(state, role, {
              patientId: tempModalPatient.id,
              valueCelsius,
              note,
            });
            if (res.ok) {
              setState(res.state);
              showToast('success', res.message);
              return { ok: true };
            }
            return { ok: false, error: res.error };
          }}
        />
      )}

      {/* Doctor Visit Modal */}
      {visitModalPatient && (
        <DoctorVisitModal
          patient={visitModalPatient}
          bed={state.beds.find((b) => b.id === visitModalPatient.bedId)}
          role={role}
          todayLocalDate={todayLocalDate}
          todayTemp={state.temperatures.find(
            (t) => t.patientId === visitModalPatient.id && t.localDate === todayLocalDate
          )}
          alreadyVisitedToday={state.visits.some(
            (v) => v.patientId === visitModalPatient.id && v.localDate === todayLocalDate
          )}
          feverThresholdCelsius={state.settings.feverThresholdCelsius}
          onClose={() => setVisitModalPatient(null)}
          onSubmit={(note) => {
            const res = completeDoctorVisit(state, role, {
              patientId: visitModalPatient.id,
              note,
            });
            if (res.ok) {
              setState(res.state);
              showToast('success', res.message);
              return { ok: true };
            }
            return { ok: false, error: res.error };
          }}
        />
      )}
    </div>
  );
}

export default App;
