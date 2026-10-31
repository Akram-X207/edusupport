import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'blue' | 'rose' | 'amber' | 'emerald' | 'purple' | 'slate';
  badge?: {
    text: string;
    variant: 'danger' | 'warning' | 'success' | 'info';
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  badge,
}) => {
  const colorStyles = {
    blue: {
      iconBg: 'bg-blue-50 text-blue-600',
      border: 'hover:border-blue-200',
    },
    rose: {
      iconBg: 'bg-rose-50 text-rose-600',
      border: 'hover:border-rose-200',
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-600',
      border: 'hover:border-amber-200',
    },
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-600',
      border: 'hover:border-emerald-200',
    },
    purple: {
      iconBg: 'bg-purple-50 text-purple-600',
      border: 'hover:border-purple-200',
    },
    slate: {
      iconBg: 'bg-slate-100 text-slate-600',
      border: 'hover:border-slate-300',
    },
  }[color];

  const badgeStyles = {
    danger: 'bg-rose-100 text-rose-700',
    warning: 'bg-amber-100 text-amber-700',
    success: 'bg-emerald-100 text-emerald-700',
    info: 'bg-blue-100 text-blue-700',
  };

  return (
    <div
      className={`bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs transition-all duration-200 hover:shadow-md ${colorStyles.border}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl ${colorStyles.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {value}
        </span>
        {badge && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${badgeStyles[badge.variant]}`}>
            {badge.text}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
};
