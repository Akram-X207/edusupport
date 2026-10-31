import React from 'react';
import type { RiskCategory, AttendanceStatus, SubmissionStatus, InterventionStatus } from '../../types';

interface RiskBadgeProps {
  category?: RiskCategory | string;
  score?: number | null;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ category, score, size = 'md' }) => {
  const cat = (category || 'LOW').toUpperCase();

  const config = {
    HIGH: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10',
      dot: 'bg-rose-500',
      label: 'High Risk',
    },
    MEDIUM: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/10',
      dot: 'bg-amber-500',
      label: 'Medium Risk',
    },
    LOW: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10',
      dot: 'bg-emerald-500',
      label: 'Low Risk',
    },
    INSUFFICIENT_DATA: {
      bg: 'bg-slate-50 text-slate-600 border-slate-200 ring-slate-500/10',
      dot: 'bg-slate-400',
      label: 'Insufficient Data',
    },
  }[cat] || {
    bg: 'bg-slate-50 text-slate-600 border-slate-200 ring-slate-500/10',
    dot: 'bg-slate-400',
    label: cat,
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs font-medium px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-semibold px-3 py-1.5 gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border ring-1 ${config.bg} ${sizeClasses} transition-all`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
      <span>{config.label}</span>
      {score !== undefined && score !== null && (
        <span className="opacity-75 font-mono text-[11px]">({score.toFixed(1)})</span>
      )}
    </span>
  );
};

export const AttendanceBadge: React.FC<{ status: AttendanceStatus | string }> = ({ status }) => {
  const s = status.toLowerCase();
  const config = {
    present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    absent: 'bg-rose-50 text-rose-700 border-rose-200',
    late: 'bg-amber-50 text-amber-700 border-amber-200',
  }[s] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${config}`}>
      {status}
    </span>
  );
};

export const SubmissionBadge: React.FC<{ status: SubmissionStatus | string }> = ({ status }) => {
  const s = status.toLowerCase();
  const config = {
    submitted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    late: 'bg-amber-50 text-amber-700 border-amber-200',
    missing: 'bg-rose-50 text-rose-700 border-rose-200',
  }[s] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${config}`}>
      {status}
    </span>
  );
};

export const InterventionBadge: React.FC<{ status: InterventionStatus | string }> = ({ status }) => {
  const s = status.toLowerCase();
  const config = {
    planned: 'bg-blue-50 text-blue-700 border-blue-200',
    in_progress: 'bg-purple-50 text-purple-700 border-purple-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }[s] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${config}`}>
      {s.replace('_', ' ')}
    </span>
  );
};
