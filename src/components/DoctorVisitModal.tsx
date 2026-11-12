import React, { useState } from 'react';
import { Stethoscope, X, AlertCircle, Thermometer } from 'lucide-react';
import { DEMO_USERS, isFeverReading } from '../domain/rules';
import { Bed, Patient, Role, TemperatureReading } from '../types/caretrack';

interface DoctorVisitModalProps {
  patient: Patient;
  bed: Bed | undefined;
  role: Role;
  todayLocalDate: string;
  todayTemp: TemperatureReading | undefined;
  alreadyVisitedToday: boolean;
  feverThresholdCelsius: number;
  onClose: () => void;
  onSubmit: (note: string) => { ok: boolean; error?: string };
}

export const DoctorVisitModal: React.FC<DoctorVisitModalProps> = ({
  patient,
  bed,
  role,
  todayLocalDate,
  todayTemp,
  alreadyVisitedToday,
  feverThresholdCelsius,
  onClose,
  onSubmit,
}) => {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const actor = DEMO_USERS[role];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = onSubmit(note);
    if (!res.ok) {
      setError(res.error ?? 'Could not complete doctor visit.');
    } else {
      onClose();
    }
  };

  const isFever = todayTemp
    ? isFeverReading(todayTemp.valueCelsius, feverThresholdCelsius)
    : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="visit-modal-title"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 id="visit-modal-title" className="text-base font-semibold text-slate-900">
                Complete Doctor Consultation
              </h2>
              <p className="text-xs text-slate-500">
                {patient.fullName} ({patient.id}) • {bed ? `${bed.label} (${bed.ward})` : 'Unassigned'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!todayTemp ? (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-700" />
              <div>
                <p className="font-semibold">Blocked: Today&apos;s temperature is missing</p>
                <p className="mt-0.5">
                  A Nurse must record today&apos;s ({todayLocalDate}) temperature before a Doctor can
                  complete a same-day visit.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Thermometer className="w-4 h-4 text-teal-700" />
                <span>
                  Today&apos;s Temperature ({todayLocalDate}):{' '}
                  <strong className="font-mono">{todayTemp.valueCelsius.toFixed(1)} °C</strong>
                </span>
              </div>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                  isFever
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-sky-50 text-sky-800 border-sky-200'
                }`}
              >
                {isFever ? 'Fever' : 'Fever-free'}
              </span>
            </div>
          )}

          {alreadyVisitedToday && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
              <p>
                A doctor visit has already been completed for this patient on {todayLocalDate}.
                Duplicate same-day completion will be blocked.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-700" />
              <p>{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="visit-note" className="block text-sm font-medium text-slate-700 mb-1">
              Consultation Note <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="visit-note"
              rows={3}
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Document clinical observations, symptom progression, and isolation care plan..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600"
            />
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-600 flex flex-wrap justify-between gap-2">
            <span>
              <strong>Attending:</strong> {actor.displayName}
            </span>
            <span>
              <strong>Facility Date:</strong> {todayLocalDate}
            </span>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!todayTemp}
              className="px-4 py-2 rounded-lg bg-sky-700 text-white text-sm font-medium hover:bg-sky-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-600"
            >
              Complete Visit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
