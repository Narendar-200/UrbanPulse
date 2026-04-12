import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Activity,
  TrendingUp,
  Play,
  Database,
  Lightbulb,
  Settings,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: BarChart3 },
  { path: '/monitor', label: 'Live Monitor', icon: Activity },
  { path: '/analytics', label: 'Analytics', icon: TrendingUp },
  { path: '/simulation', label: 'Simulation', icon: Play },
  { path: '/data', label: 'Data Mgmt', icon: Database },
  { path: '/insights', label: 'Insights', icon: Lightbulb },
];

export const Navigation: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <nav className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700/50 h-screen flex flex-col p-5 fixed left-0 top-0 overflow-y-auto">
      <div className="mb-10 px-2">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">UrbanPulse</h1>
        </div>
        <p className="text-xs text-slate-500 ml-12">Smart Traffic Intelligence</p>
      </div>

      <div className="mb-2 px-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Main Menu</p>
      </div>

      <ul className="space-y-1 flex-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                  active
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:bg-slate-700/60 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                <span className="text-sm font-medium">{item.label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full opacity-60" />}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-slate-700/50 pt-4 mt-4">
        <Link
          to="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
            location.pathname === '/settings'
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:bg-slate-700/60 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4 flex-shrink-0 text-slate-500 group-hover:text-white" />
          <span className="text-sm font-medium">Settings</span>
        </Link>
        <p className="text-xs text-slate-600 px-3 mt-4 leading-relaxed">
          Real-time traffic monitoring and analytics platform
        </p>
      </div>
    </nav>
  );
};
