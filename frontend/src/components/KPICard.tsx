import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  color?: 'amber' | 'teal' | 'red' | 'blue' | 'purple';
  loading?: boolean;
}

const colorMap = {
  amber: { bg: 'bg-amber-50', icon: 'text-amber-500', border: 'border-amber-100' },
  teal:  { bg: 'bg-teal-50',  icon: 'text-teal-500',  border: 'border-teal-100'  },
  red:   { bg: 'bg-red-50',   icon: 'text-red-500',   border: 'border-red-100'   },
  blue:  { bg: 'bg-blue-50',  icon: 'text-blue-500',  border: 'border-blue-100'  },
  purple:{ bg: 'bg-purple-50',icon: 'text-purple-500',border: 'border-purple-100'},
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  color = 'amber',
  loading = false,
}) => {
  const colors = colorMap[color];

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 bg-slate-200 rounded-xl" />
          <div className="w-16 h-4 bg-slate-200 rounded" />
        </div>
        <div className="w-24 h-8 bg-slate-200 rounded mb-2" />
        <div className="w-32 h-3 bg-slate-100 rounded" />
      </div>
    );
  }

  const trendConfig = {
    up: { icon: <ArrowUp className="w-3 h-3" />, color: 'text-red-600 bg-red-50 border border-red-100' },
    down: { icon: <ArrowDown className="w-3 h-3" />, color: 'text-green-600 bg-green-50 border border-green-100' },
    neutral: { icon: <Minus className="w-3 h-3" />, color: 'text-slate-600 bg-slate-50 border border-slate-200' },
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        {icon && (
          <div className={`w-11 h-11 ${colors.bg} ${colors.border} border rounded-xl flex items-center justify-center ${colors.icon} transition-transform group-hover:scale-105`}>
            {icon}
          </div>
        )}
        {trendValue && trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${trendConfig[trend].color}`}>
            {trendConfig[trend].icon}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-slate-900 leading-tight">{value}</p>
      <p className="text-sm font-medium text-slate-600 mt-1">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  );
};
