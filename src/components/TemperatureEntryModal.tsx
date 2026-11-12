import React, { useState } from 'react';
import { Thermometer, X, AlertCircle } from 'lucide-react';
import { DEMO_USERS, isFeverReading } from '../domain/rules';
import { Bed, Patient, Role } from '../types/caretrack';

interface TemperatureEntryModalProps {
  patient: Patient;
  bed: Bed | undefined;
  role: Role;
  todayLocalDate: string;
  feverThresholdCelsius: number;
  existingTodayValue?: number;
  onClose: () => void;
  onSubmit: (valueCelsius: number, note: string) => { ok: boolean; error?: string };
}

export const TemperatureEntryModal: React.FC<TemperatureEntryModalProps> = ({
  patient,
  bed,
  role,
  todayLocalDate,
  feverThresholdCelsius,
  existingTodayValue,
  onClose,
  onSubmit,
}) => {
  const [valueStr, setValueStr] = useState('37.0');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const parsedVal = Number(valueStr);
  const isPlausible = !Number.isNaN(parsedVal) && parsedVal >= 30.0 && parsedVal <= 45.0;
  const isFever = isPlausible && isFeverReading(parsedVal, feverThresholdCelsius);
  const actor = DEMO_USERS[role];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = onSubmit(parsedVal, note);
    if (!res.ok) {
      setError(res.error ?? 'Failed to record temperature.');
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="temp-modal-title"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <h2 id="temp-modal-title" className="text-base font-semibold text-slate-900">
                Record Daily Temperature
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
          {existingTodayValue !== undefined && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
              <div>
                <p className="font-semibold">Reading already recorded for {todayLocalDate}</p>
                <p className="mt-0.5">
                  A primary reading of {existingTodayValue.toFixed(1)} °C already exists today.
                  Submitting another primary reading will be blocked by facility rules. Use{' '}
                  <strong>Amend Reading</strong> in Patient Details to correct an entry with an audit reason.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-700" />
              <p>{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="temp-celsius" className="block text-sm font-medium text-slate-700 mb-1">
              Temperature (°C) <span className="text-rose-600">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                id="temp-celsius"
                type="number"
                step="0.1"
                min="30.0"
                max="45.0"
                required
                value={valueStr}
                onChange={(e) => setValueStr(e.target.value)}
                className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
              />
              {isPlausible && (
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-md border ${
                    isFever
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-sky-50 text-sky-800 border-sky-200'
                  }`}
                >
                  {isFever
                    ? `Fever (>= ${feverThresholdCelsius.toFixed(1)} °C — resets streak)`
                    : `Fever-free (< ${feverThresholdCelsius.toFixed(1)} °C)`}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              UI range: 30.0 °C – 45.0 °C. Clinical validation is still required. Threshold (
              {feverThresholdCelsius.toFixed(1)} °C) is a demo assumption.
            </p>
          </div>

          <div>
            <label htmlFor="temp-note" className="block text-sm font-medium text-slate-700 mb-1">
              Observation Note (Optional)
            </label>
            <textarea
              id="temp-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Oral measurement, patient resting comfortably..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
            />
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-600 flex flex-wrap justify-between gap-2">
            <span>
              <strong>Actor:</strong> {actor.displayName} ({actor.title})
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
              className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              Save Temperature
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
