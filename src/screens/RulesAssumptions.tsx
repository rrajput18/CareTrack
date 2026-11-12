import React, { useState } from 'react';
import { Sliders, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { canRolePerform } from '../domain/rules';
import { CareTrackState, Role } from '../types/caretrack';

interface RulesAssumptionsProps {
  state: CareTrackState;
  role: Role;
  onUpdateSettings: (input: {
    feverThresholdCelsius: number;
    timezone: string;
  }) => { ok: boolean; message?: string; error?: string };
}

export const RulesAssumptions: React.FC<RulesAssumptionsProps> = ({
  state,
  role,
  onUpdateSettings,
}) => {
  const [thresholdStr, setThresholdStr] = useState(
    state.settings.feverThresholdCelsius.toFixed(1)
  );
  const [timezone, setTimezone] = useState(state.settings.timezone);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );

  const perm = canRolePerform(role, 'update_settings');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const res = onUpdateSettings({
      feverThresholdCelsius: Number(thresholdStr),
      timezone,
    });
    if (!res.ok) {
      setFeedback({ type: 'error', text: res.error ?? 'Could not update settings.' });
    } else {
      setFeedback({ type: 'success', text: res.message ?? 'Settings updated.' });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Demo Assumption Callout */}
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3 text-amber-950">
        <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <p className="font-semibold text-sm">
            Explicit Demo Assumption: Fever Threshold ({state.settings.feverThresholdCelsius.toFixed(1)} °C)
          </p>
          <p className="mt-1">
            The assessment brief does not specify the numerical fever threshold, measurement unit,
            measurement method, or local-day cutoff. CareTrack uses{' '}
            <strong>Celsius (°C)</strong> with an initial demo threshold of{' '}
            <strong>{state.settings.feverThresholdCelsius.toFixed(1)} °C</strong> (readings{' '}
            <strong>&ge; {state.settings.feverThresholdCelsius.toFixed(1)} °C</strong> count as
            fever). This value is configurable below and{' '}
            <strong>must be confirmed by the Head Doctor</strong> before clinical use.
          </p>
        </div>
      </div>

      {/* Configuration Form (Administrator only) */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
      >
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Sliders className="w-5 h-5 text-teal-700" />
          <h2 className="text-base font-semibold text-slate-900">
            Configurable Demo Rules &amp; Facility Timezone
          </h2>
        </div>

        {!perm.allowed && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {perm.reason} Switch to Administrator to modify these demo settings.
          </p>
        )}

        {feedback && (
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
              feedback.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="fever-threshold"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Fever Threshold (°C) — Demo Assumption
            </label>
            <input
              id="fever-threshold"
              type="number"
              step="0.1"
              min="35.0"
              max="41.0"
              disabled={!perm.allowed}
              value={thresholdStr}
              onChange={(e) => setThresholdStr(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono disabled:bg-slate-100"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Readings &ge; threshold = Fever. Readings &lt; threshold = Fever-free.
            </p>
          </div>

          <div>
            <label
              htmlFor="facility-timezone"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Facility Local Timezone
            </label>
            <select
              id="facility-timezone"
              disabled={!perm.allowed}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white disabled:bg-slate-100"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+05:30)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (ET)</option>
              <option value="Europe/London">Europe/London (UK)</option>
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              Used consistently for calendar-day cutoffs across all temperature &amp; visit logs.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!perm.allowed}
            className="px-4 py-2 rounded-lg bg-teal-700 text-white text-xs font-medium hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            Save Configuration
          </button>
        </div>
      </form>

      {/* Documented Business Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2.5">
          <h3 className="text-sm font-semibold text-slate-900">
            1. Daily Temperature &amp; Doctor Visit Sequence
          </h3>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
            <li>One primary temperature reading per active patient per facility-local calendar day.</li>
            <li>Duplicate primary readings on the same day are blocked; corrections require an audited amendment with reason.</li>
            <li>Doctor same-day visit completion is blocked until today&apos;s temperature reading exists.</li>
            <li>Doctor visits require a consultation note and are limited to one completed visit per day by default.</li>
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2.5">
          <h3 className="text-sm font-semibold text-slate-900">
            2. Three-Full-Day Fever-Free Rule
          </h3>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
            <li>Requires 3 consecutive, complete facility-local calendar days strictly below the fever threshold.</li>
            <li>The current incomplete calendar day never counts as a completed full day.</li>
            <li>Any fever reading (&ge; threshold) or missing day resets the streak.</li>
            <li>Eligibility is based solely on this criterion; CareTrack does not invent extra clinical rules or diagnose.</li>
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2.5">
          <h3 className="text-sm font-semibold text-slate-900">
            3. Capacity, Beds &amp; Mortality Benchmark
          </h3>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
            <li>Facility capacity is fixed at 74 active beds; one active patient per bed.</li>
            <li>Admissions are blocked when 74 beds are occupied or when selecting an occupied bed.</li>
            <li>Mortality = Deceased / (Discharged + Deceased) &times; 100. Active patients are excluded.</li>
            <li>Zero resolved outcomes displays N/A. Alert triggers strictly when mortality &gt; 15%.</li>
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2.5">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-700" />
            4. Prototype Security &amp; Production Gaps
          </h3>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
            <li>The top-bar role switcher is a <strong>demo-only simulator</strong>, not production authentication.</li>
            <li>In production, RBAC must be enforced server-side with authenticated sessions (e.g., OIDC/SSO).</li>
            <li>Demo persistence uses browser localStorage; production requires a relational database and tamper-resistant server-side audit log.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
