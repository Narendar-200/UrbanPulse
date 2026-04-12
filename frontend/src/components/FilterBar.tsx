import React, { useEffect, useState } from 'react';
import { Filter, Calendar } from 'lucide-react';
import { locationService } from '../services/locationService';
import { type Location } from '../lib/supabase';

interface FilterBarProps {
  selectedLocationId: string | null;
  onLocationChange: (locationId: string | null) => void;
  startDate: Date;
  onStartDateChange: (date: Date) => void;
  endDate: Date;
  onEndDateChange: (date: Date) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedLocationId,
  onLocationChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
}) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    locationService.getAll().then(setLocations).finally(() => setLoading(false));
  }, []);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const presets = [
    { label: 'Today', days: 0 },
    { label: '7 Days', days: 7 },
    { label: '30 Days', days: 30 },
  ];

  const applyPreset = (days: number) => {
    const now = new Date();
    onEndDateChange(now);
    if (days === 0) {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      onStartDateChange(start);
    } else {
      const start = new Date(now);
      start.setDate(start.getDate() - days);
      onStartDateChange(start);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-semibold text-slate-700">Filters</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Location</label>
          <select
            value={selectedLocationId || ''}
            onChange={(e) => onLocationChange(e.target.value || null)}
            disabled={loading}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent text-slate-900 disabled:bg-slate-50 bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.zone_type})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Start Date</span>
          </label>
          <input
            type="date"
            value={formatDate(startDate)}
            onChange={(e) => onStartDateChange(new Date(e.target.value))}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent text-slate-900 bg-slate-50 hover:border-slate-300 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> End Date</span>
          </label>
          <input
            type="date"
            value={formatDate(endDate)}
            onChange={(e) => onEndDateChange(new Date(e.target.value))}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent text-slate-900 bg-slate-50 hover:border-slate-300 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Quick Select</label>
          <div className="flex gap-2">
            {presets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset.days)}
                className="flex-1 px-2 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-teal-500 hover:text-white hover:border-teal-500 transition-all"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
