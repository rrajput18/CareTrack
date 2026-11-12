import React, { useMemo, useState } from 'react';
import { Search, Eye } from 'lucide-react';
import { formatLocalDate } from '../domain/dateUtils';
import { isFeverReading } from '../domain/rules';
import {
  Bed,
  CareTrackState,
  DischargeEligibility,
  TemperatureReading,
} from '../types/caretrack';
import { StatusChip } from '../components/StatusChip';

interface PatientRegistryProps {
  state: CareTrackState;
  todayLocalDate: string;
  eligibilityMap: Map<string, DischargeEligibility>;
  onSelectPatient: (patientId: string) => void;
}

export const PatientRegistry: React.FC<PatientRegistryProps> = ({
  state,
  todayLocalDate,
  eligibilityMap,
  onSelectPatient,
}) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'discharged' | 'deceased' | 'all'>(
    'active'
  );
  const [onlyDischargeReady, setOnlyDischargeReady] = useState(false);

  const bedById = useMemo(() => {
    const m = new Map<string, Bed>();
    for (const b of state.beds) m.set(b.id, b);
    return m;
  }, [state.beds]);

  const todayTemps = useMemo(() => {
    const m = new Map<string, TemperatureReading>();
    for (const t of state.temperatures) {
      if (t.localDate === todayLocalDate) m.set(t.patientId, t);
    }
    return m;
  }, [state.temperatures, todayLocalDate]);

  const todayVisits = useMemo(() => {
    const s = new Set<string>();
    for (const v of state.visits) {
      if (v.localDate === todayLocalDate) s.add(v.patientId);
    }
    return s;
  }, [state.visits, todayLocalDate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.patients.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (onlyDischargeReady && !eligibilityMap.get(p.id)?.isEligible) return false;
      if (!q) return true;
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.bedId && p.bedId.toLowerCase().includes(q))
      );
    });
  }, [state.patients, statusFilter, onlyDischargeReady, query, eligibilityMap]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by patient name, ID (e.g. CT-1001), or bed..."
            aria-label="Search patients"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['active', 'discharged', 'deceased', 'all'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border ${
                statusFilter === st
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          ))}

          <label className="inline-flex items-center gap-1.5 ml-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyDischargeReady}
              onChange={(e) => setOnlyDischargeReady(e.target.checked)}
              className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
            />
            Discharge-ready only
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-xs text-slate-600 flex justify-between">
          <span>
            Showing <strong>{filtered.length}</strong> patient(s)
          </span>
          <span>Facility Date: {todayLocalDate}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 font-semibold">Patient</th>
                <th className="py-3 px-3 font-semibold">Age</th>
                <th className="py-3 px-3 font-semibold">Bed</th>
                <th className="py-3 px-3 font-semibold">Admitted</th>
                <th className="py-3 px-3 font-semibold">Today&apos;s Temp</th>
                <th className="py-3 px-3 font-semibold">Today&apos;s Visit</th>
                <th className="py-3 px-3 font-semibold">Discharge Eligibility</th>
                <th className="py-3 px-4 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-500">
                    No patients match the current search/filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const bed = p.bedId ? bedById.get(p.bedId) : undefined;
                  const temp = todayTemps.get(p.id);
                  const visited = todayVisits.has(p.id);
                  const elig = eligibilityMap.get(p.id);
                  const fever = temp
                    ? isFeverReading(temp.valueCelsius, state.settings.feverThresholdCelsius)
                    : false;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{p.fullName}</div>
                        <div className="text-xs font-mono text-slate-500">{p.id}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{p.age}</td>
                      <td className="py-3 px-3 text-slate-700">
                        {bed ? (
                          <span>
                            {bed.label}{' '}
                            <span className="text-xs text-slate-400">({bed.ward})</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Released</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600">
                        {formatLocalDate(p.admissionDate)}
                      </td>
                      <td className="py-3 px-3">
                        {p.status !== 'active' ? (
                          <StatusChip
                            variant={p.status === 'discharged' ? 'discharged' : 'deceased'}
                            label={p.status === 'discharged' ? 'Discharged' : 'Deceased'}
                          />
                        ) : temp ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold text-slate-800">
                              {temp.valueCelsius.toFixed(1)} °C
                            </span>
                            <StatusChip
                              variant={fever ? 'fever' : 'completed'}
                              label={fever ? 'Fever' : 'Completed'}
                            />
                          </div>
                        ) : (
                          <StatusChip variant="pending" label="Pending" />
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {p.status !== 'active' ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : visited ? (
                          <StatusChip variant="completed" label="Completed" />
                        ) : (
                          <StatusChip variant="pending" label="Pending" />
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {p.status !== 'active' ? (
                          <span className="text-xs text-slate-400">Resolved</span>
                        ) : elig?.isEligible ? (
                          <StatusChip variant="discharge-ready" label="Discharge-ready (3/3)" />
                        ) : (
                          <span className="text-xs text-slate-600">
                            {elig?.streakDays ?? 0}/3 full days
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectPatient(p.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
