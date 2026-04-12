import React, { useRef, useEffect } from 'react';
import { Clock, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = React.useState<string>(new Date().toLocaleTimeString());
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await signOut();
    navigate('/login');
  };

  const getInitials = () => {
    const name = user?.user_metadata?.full_name || user?.email || 'U';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 fixed right-0 top-0 left-64 z-40 shadow-sm">
      <div className="flex items-center gap-2 text-slate-600">
        <Clock className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-medium">{currentTime}</span>
        <span className="mx-2 text-slate-300">|</span>
        <span className="text-sm text-slate-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </span>
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-all group"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {getInitials()}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-semibold text-slate-800 leading-tight">{displayName}</p>
            <p className="text-xs text-slate-400 leading-tight truncate max-w-[140px]">{user?.email}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50 animate-in">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>

            <div className="p-1.5">
              <Link
                to="/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <User className="w-4 h-4 text-slate-400" />
                Profile
              </Link>
              <Link
                to="/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                Settings
              </Link>
            </div>

            <div className="p-1.5 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
