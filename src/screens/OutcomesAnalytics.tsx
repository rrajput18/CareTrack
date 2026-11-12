import React, { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, History } from 'lucide-react';
import { formatFacilityDateTime } from '../domain/dateUtils';
import { calculateOutcomeMetrics } from '../domain/rules';
import { CareTrackState } from '../types/caretrack';

interface OutcomesAnalyticsProps {
  state: CareTrackState;
  todayLocalDate: string;
}

export const OutcomesAnalytics: React.FC<OutcomesAnalyticsProps> = ({
  state,
  todayLocalDate,
}) => {
  const [range, setRange] = useState<'all' | '30d' | '7d'>('all');

  const metrics = useMemo(() => {
    const filterDays = range === '30d' ? 30 : range === '7d' ? 7 : undefined;
    const label =
      range === 'all' ? 'All Time' : range === '30d' ? 'Last 30 Days' : 'Last 7 Days';
    return calculateOutcomeMetrics(
      state.patients,
      state.settings.mortalityBenchmarkPercent,
      label,
      filterDays,
      todayLocalDate,
      state.settings.timezone
    );
  }, [state.patients, state.settings.mortalityBenchmarkPercent, state.settings.timezone, range, todayLocalDate]);

  return (
    <div className="space-y-6">
      {/* Header & Date Range Filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-teal-700" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Treatment Outcomes &amp; Quality Benchmark
            </h2>
            <p className="text-xs text-slate-500">
              Resolved outcomes only (Discharged + Deceased). Active patients ({metrics.activeCount})
              are excluded from the denominator.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'all', label: 'All Time' },
              { id: '30d', label: 'Last 30 Days' },
              { id: '7d', label: 'Last 7 Days' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setRange(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                range === opt.id
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prominent Mortality Alert (> 15% strictly) */}
      {metrics.isMortalityAlert && metrics.mortalityRate !== null && (
        <div
          role="alert"
          className="rounded-xl border-2 border-rose-300 bg-rose-50 p-4 text-rose-950 flex items-start gap-3"
        >
          <AlertTriangle className="w-6 h-6 text-rose-700 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-rose-900">
              Mortality Benchmark Alert: {metrics.mortalityRate.toFixed(1)}% exceeds{' '}
              {state.settings.mortalityBenchmarkPercent}% threshold
            </h3>
            <p className="text-xs text-rose-900 mt-1 leading-relaxed">
              Observed mortality is {metrics.deceasedCount} / {metrics.resolvedCount} resolved
              outcomes ({metrics.dateRangeLabel}).{' '}
              <strong>
                This alert is a signal for clinical leadership to investigate, not proof of treatment
                failure or causation.
              </strong>{' '}
              Note that small sample sizes can make percentage rates volatile.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500">Mortality Rate</p>
          <p
            className={`mt-2 text-3xl font-semibold ${
              metrics.mortalityRate === null
                ? 'text-slate-400'
                : metrics.isMortalityAlert
                  ? 'text-rose-700'
                  : 'text-slate-900'
            }`}
          >
            {metrics.mortalityRate === null ? 'N/A' : `${metrics.mortalityRate.toFixed(1)}%`}
          </p>
          <p className="mt-2 text-xs text-slate-600">
            Numerator: <strong>{metrics.deceasedCount}</strong> deaths • Denominator:{' '}
            <strong>{metrics.resolvedCount}</strong> resolved
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Benchmark: &le; {state.settings.mortalityBenchmarkPercent}% • {metrics.dateRangeLabel}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500">Success (Discharge) Rate</p>
          <p
            className={`mt-2 text-3xl font-semibold ${
              metrics.successRate === null ? 'text-slate-400' : 'text-emerald-700'
            }`}
          >
            {metrics.successRate === null ? 'N/A' : `${metrics.successRate.toFixed(1)}%`}
          </p>
          <p className="mt-2 text-xs text-slate-600">
            Numerator: <strong>{metrics.dischargedCount}</strong> discharges • Denominator:{' '}
            <strong>{metrics.resolvedCount}</strong> resolved
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Target benchmark: &ge; 85% • {metrics.dateRangeLabel}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500">Resolved Outcomes (Sample Size)</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{metrics.resolvedCount}</p>
          <p className="mt-2 text-xs text-slate-600">
            {metrics.dischargedCount} discharged + {metrics.deceasedCount} deceased
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {metrics.activeCount} active patients excluded
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500">Benchmark Status</p>
          <div className="mt-2 flex items-center gap-2">
            {metrics.resolvedCount === 0 ? (
              <span className="text-sm font-medium text-slate-600">
                Insufficient Data (N/A — 0 resolved outcomes)
              </span>
            ) : metrics.isMortalityAlert ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700">
                <AlertTriangle className="w-4 h-4" />
                Exceeds 15% Alert
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                Within Benchmark (&le;15%)
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
            Alert triggers strictly when mortality &gt; 15% (not at 15.0%).
          </p>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              Facility Audit Trail ({state.auditLog.length} events)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Local demo log (production requires tamper-resistant server audit log)
          </span>
        </div>
        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {state.auditLog.map((ev) => (
            <div
              key={ev.id}
              className="px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div>
                <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 mr-2">
                  {ev.action}
                </span>
                <span className="text-slate-800">{ev.summary}</span>
              </div>
              <span className="text-slate-500">
                {ev.actorName} • {formatFacilityDateTime(ev.timestamp, state.settings.timezone)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
