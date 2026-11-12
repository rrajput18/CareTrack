import React, { useEffect, useState } from 'react';
import { UserPlus, AlertTriangle, CheckCircle2, BedDouble } from 'lucide-react';
import { canRolePerform } from '../domain/rules';
import { CareTrackState, Patient, Role, ScreenId } from '../types/caretrack';

interface AdmitPatientProps {
  state: CareTrackState;
  role: Role;
  todayLocalDate: string;
  onAdmit: (input: {
    fullName: string;
    age: number;
    sex?: Patient['sex'];
    admissionDate: string;
    bedId: string;
    notes: string;
  }) => { ok: boolean; message?: string; error?: string };
  onNavigate: (screen: ScreenId) => void;
}

export const AdmitPatient: React.FC<AdmitPatientProps> = ({
  state,
  role,
  todayLocalDate,
  onAdmit,
  onNavigate,
}) => {
  const activeCount = state.patients.filter((p) => p.status === 'active').length;
  const capacity = state.settings.capacity;
  const isFull = activeCount >= capacity;
  const availableBeds = state.beds.filter((b) => b.activePatientId === null);
  const perm = canRolePerform(role, 'admit_patient');

  const [fullName, setFullName] = useState('');
  const [ageStr, setAgeStr] = useState('');
  const [sex, setSex] = useState<Patient['sex']>('Prefer not to say');
  const [admissionDate, setAdmissionDate] = useState(todayLocalDate);
  const [bedId, setBedId] = useState(availableBeds[0]?.id ?? state.beds[0]?.id ?? '');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );

  useEffect(() => {
    if (availableBeds.length > 0 && !availableBeds.some((b) => b.id === bedId)) {
      setBedId(availableBeds[0].id);
    }
  }, [availableBeds, bedId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const res = onAdmit({
      fullName,
      age: Number(ageStr),
      sex,
      admissionDate,
      bedId,
      notes,
    });
    if (!res.ok) {
      setFeedback({ type: 'error', text: res.error ?? 'Admission failed.' });
    } else {
      setFeedback({ type: 'success', text: res.message ?? 'Patient admitted.' });
      setFullName('');
      setAgeStr('');
      setNotes('');
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      {/* Occupancy Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
            <BedDouble className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Bed Availability: {availableBeds.length} free of {capacity}
            </p>
            <p className="text-xs text-slate-500">
              {activeCount} active patients currently occupying beds
            </p>
          </div>
        </div>
        {isFull && (
          <button
            type="button"
            onClick={() => onNavigate('discharge')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
          >
            Go to Discharge Management →
          </button>
        )}
      </div>

      {!perm.allowed && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Role Restriction</p>
            <p className="text-xs mt-0.5">{perm.reason} Switch to Administrator in the top bar to admit a patient.</p>
          </div>
        </div>
      )}

      {isFull && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm"
        >
          <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Admission Blocked — Facility at Full Capacity (74/74)</p>
            <p className="text-xs mt-0.5">
              All 74 beds are occupied. Discharge an eligible patient first to release a bed before
              admitting a new patient.
            </p>
          </div>
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className={`flex items-start gap-2.5 p-4 rounded-xl border text-sm ${
            feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          )}
          <p className="text-xs leading-relaxed">{feedback.text}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
      >
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <UserPlus className="w-5 h-5 text-teal-700" />
          <h2 className="text-base font-semibold text-slate-900">New Patient Admission</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="admit-name" className="block text-sm font-medium text-slate-700 mb-1">
              Full Name <span className="text-rose-600">*</span>
            </label>
            <input
              id="admit-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g., Priya Venkatesh"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label htmlFor="admit-age" className="block text-sm font-medium text-slate-700 mb-1">
              Age (years) <span className="text-rose-600">*</span>
            </label>
            <input
              id="admit-age"
              type="number"
              min="0"
              max="120"
              required
              value={ageStr}
              onChange={(e) => setAgeStr(e.target.value)}
              placeholder="e.g., 36"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label htmlFor="admit-sex" className="block text-sm font-medium text-slate-700 mb-1">
              Sex (Optional)
            </label>
            <select
              id="admit-sex"
              value={sex}
              onChange={(e) => setSex(e.target.value as Patient['sex'])}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="Prefer not to say">Prefer not to say</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="admit-date" className="block text-sm font-medium text-slate-700 mb-1">
              Admission Date <span className="text-rose-600">*</span>
            </label>
            <input
              id="admit-date"
              type="date"
              required
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label htmlFor="admit-bed" className="block text-sm font-medium text-slate-700 mb-1">
              Assign Room / Bed <span className="text-rose-600">*</span>
            </label>
            <select
              id="admit-bed"
              required
              value={bedId}
              onChange={(e) => setBedId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              {state.beds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label} ({b.ward}) —{' '}
                  {b.activePatientId ? `Occupied (${b.activePatientId})` : 'Available'}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              Selecting an already-occupied bed is blocked by facility rules.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="admit-notes" className="block text-sm font-medium text-slate-700 mb-1">
              Admission Notes
            </label>
            <textarea
              id="admit-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Initial isolation notes, referral source, or intake observations..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={!perm.allowed}
            title={perm.allowed ? 'Admit patient' : perm.reason}
            className="px-5 py-2.5 rounded-lg bg-teal-700 text-white text-sm font-medium hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            Admit Patient &amp; Assign Bed
          </button>
        </div>
      </form>
    </div>
  );
};
