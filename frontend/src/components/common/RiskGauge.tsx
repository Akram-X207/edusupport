import React from 'react';
import type { RiskAssessment } from '../../types';

interface RiskGaugeProps {
  assessment: RiskAssessment | null | undefined;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ assessment }) => {
  if (!assessment || assessment.overall_score === null || assessment.overall_score === undefined) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <span className="text-sm font-medium text-slate-500">Insufficient Data</span>
        <span className="text-xs text-slate-400 mt-1">Requires attendance and assessment records</span>
      </div>
    );
  }

  const score = Math.round(assessment.overall_score * 10) / 10;
  const category = assessment.category;

  // Determine color theme
  const theme = {
    HIGH: {
      text: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      progress: 'bg-rose-500',
      desc: 'High Risk: Immediate intervention required',
    },
    MEDIUM: {
      text: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      progress: 'bg-amber-500',
      desc: 'Moderate Risk: Close academic monitoring recommended',
    },
    LOW: {
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      progress: 'bg-emerald-500',
      desc: 'Low Risk: Good standing and satisfactory performance',
    },
    INSUFFICIENT_DATA: {
      text: 'text-slate-600',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      progress: 'bg-slate-400',
      desc: 'Data collection in progress',
    },
  }[category] || {
    text: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    progress: 'bg-slate-400',
    desc: 'Unclassified',
  };

  return (
    <div className={`p-6 rounded-2xl border ${theme.border} ${theme.bg} transition-all`}>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Overall Risk Index
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-4xl font-extrabold tracking-tight ${theme.text}`}>
              {score.toFixed(1)}
            </span>
            <span className="text-sm font-medium text-slate-400">/ 100</span>
          </div>
        </div>
        <div className="text-right">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${theme.border} ${theme.text} bg-white shadow-xs`}
          >
            {category.replace('_', ' ')}
          </span>
        </div>
      </div>

      <p className="mt-2 text-xs font-medium text-slate-600">{theme.desc}</p>

      {/* Main score bar */}
      <div className="mt-4 w-full bg-white/70 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
        <div
          className={`h-full rounded-full transition-all duration-700 ${theme.progress}`}
          style={{ width: `${Math.min(100, Math.max(2, score))}%` }}
        />
      </div>

      {/* 3 Component Breakdown */}
      <div className="mt-5 grid grid-cols-3 gap-3 pt-4 border-t border-slate-200/60">
        <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200/50">
          <div className="text-[11px] text-slate-500 font-medium">Attendance (40%)</div>
          <div className="text-sm font-bold text-slate-800 mt-0.5">
            {assessment.attendance_score !== null && assessment.attendance_score !== undefined
              ? `${assessment.attendance_score.toFixed(1)}`
              : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-400">
            {assessment.attendance_pct !== null && assessment.attendance_pct !== undefined
              ? `${assessment.attendance_pct.toFixed(0)}% present`
              : 'No records'}
          </div>
        </div>

        <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200/50">
          <div className="text-[11px] text-slate-500 font-medium">Marks (40%)</div>
          <div className="text-sm font-bold text-slate-800 mt-0.5">
            {assessment.marks_score !== null && assessment.marks_score !== undefined
              ? `${assessment.marks_score.toFixed(1)}`
              : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-400">
            {assessment.avg_marks_pct !== null && assessment.avg_marks_pct !== undefined
              ? `${assessment.avg_marks_pct.toFixed(0)}% average`
              : 'No tests'}
          </div>
        </div>

        <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200/50">
          <div className="text-[11px] text-slate-500 font-medium">Assignments (20%)</div>
          <div className="text-sm font-bold text-slate-800 mt-0.5">
            {assessment.assignment_score !== null && assessment.assignment_score !== undefined
              ? `${assessment.assignment_score.toFixed(1)}`
              : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-400">
            {assessment.assignment_completion_pct !== null && assessment.assignment_completion_pct !== undefined
              ? `${assessment.assignment_completion_pct.toFixed(0)}% submitted`
              : 'No items'}
          </div>
        </div>
      </div>
    </div>
  );
};
