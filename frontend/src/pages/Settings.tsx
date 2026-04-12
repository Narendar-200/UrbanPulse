import React, { useState } from 'react';
import { User, Lock, Bell, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Tab = 'profile' | 'security' | 'notifications';

export const Settings: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileLoading(true);

    const { error } = await updateProfile({
      email: email !== user?.email ? email : undefined,
      data: { full_name: displayName },
    });

    setProfileLoading(false);
    if (error) {
      setProfileMsg({ type: 'error', text: error });
    } else {
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!newPassword) { setPasswordMsg({ type: 'error', text: 'New password is required.' }); return; }
    if (newPassword.length < 8) { setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters.' }); return; }
    if (newPassword !== confirmPassword) { setPasswordMsg({ type: 'error', text: 'Passwords do not match.' }); return; }

    setPasswordLoading(true);
    const { error } = await updateProfile({ password: newPassword });
    setPasswordLoading(false);

    if (error) {
      setPasswordMsg({ type: 'error', text: error });
    } else {
      setPasswordMsg({ type: 'success', text: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  ];

  const getInitials = () => {
    const name = user?.user_metadata?.full_name || user?.email || 'U';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const Alert = ({ msg }: { msg: { type: 'success' | 'error'; text: string } }) => (
    <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
      msg.type === 'success'
        ? 'bg-green-50 border-green-200 text-green-700'
        : 'bg-red-50 border-red-200 text-red-700'
    }`}>
      {msg.type === 'success'
        ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
      {msg.text}
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Settings</h1>
        <p className="text-slate-600">Manage your account preferences and security.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-600 bg-amber-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-8">
          {activeTab === 'profile' && (
            <div className="space-y-8">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md">
                  {getInitials()}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-lg">{displayName || 'Your Name'}</p>
                  <p className="text-slate-500 text-sm">{user?.email}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Member since {new Date(user?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Full name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all focus:bg-white"
                  />
                  {email !== user?.email && (
                    <p className="text-xs text-amber-600 mt-1">A confirmation email will be sent to verify the new address.</p>
                  )}
                </div>

                {profileMsg && <Alert msg={profileMsg} />}

                <button
                  type="submit"
                  disabled={profileLoading}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold rounded-xl transition-all flex items-center gap-2"
                >
                  {profileLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : 'Save changes'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8">
              <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 text-sm">Account security</p>
                  <p className="text-blue-700 text-xs mt-1">
                    Use a strong password with at least 8 characters, including uppercase letters and numbers.
                  </p>
                </div>
              </div>

              <form onSubmit={handlePasswordUpdate} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">New password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Confirm new password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all focus:bg-white ${
                      confirmPassword && confirmPassword !== newPassword ? 'border-red-300' : 'border-slate-200'
                    }`}
                  />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
                  )}
                </div>

                {passwordMsg && <Alert msg={passwordMsg} />}

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold rounded-xl transition-all flex items-center gap-2"
                >
                  {passwordLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : 'Update password'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <p className="text-slate-600 text-sm">Choose which notifications you'd like to receive.</p>
              {[
                { label: 'High congestion alerts', desc: 'Get notified when traffic density exceeds 80%.', defaultOn: true },
                { label: 'Simulation completed', desc: 'Notify when a simulation run finishes.', defaultOn: true },
                { label: 'Weekly digest', desc: 'Receive a weekly summary of traffic trends.', defaultOn: false },
                { label: 'System updates', desc: 'Product updates and new feature announcements.', defaultOn: false },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{item.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked={item.defaultOn} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
                  </label>
                </div>
              ))}

              <button className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-all">
                Save preferences
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
