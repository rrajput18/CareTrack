import React from 'react';

export type ChipVariant =
  | 'pending'
  | 'completed'
  | 'discharge-ready'
  | 'discharged'
  | 'deceased'
  | 'fever'
  | 'fever-free'
  | 'neutral';

const VARIANT_CLASSES: Record<ChipVariant, string> = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'discharge-ready': 'bg-teal-50 text-teal-800 border-teal-300',
  discharged: 'bg-slate-100 text-slate-700 border-slate-200',
  deceased: 'bg-slate-200 text-slate-800 border-slate-300',
  fever: 'bg-rose-50 text-rose-800 border-rose-200',
  'fever-free': 'bg-sky-50 text-sky-800 border-sky-200',
  neutral: 'bg-slate-50 text-slate-600 border-slate-200',
};

export const StatusChip: React.FC<{
  variant: ChipVariant;
  label: string;
  className?: string;
}> = ({ variant, label, className = '' }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${VARIANT_CLASSES[variant]} ${className}`}
  >
    {label}
  </span>
);
