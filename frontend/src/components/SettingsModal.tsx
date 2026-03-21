import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Moon, Sun, Lock, Palette } from 'lucide-react';
import { useStore } from '../store/useStore';
import clsx from 'clsx';

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user, token, setUser } = useStore();
  const [tab, setTab] = useState<'appearance' | 'security'>('appearance');

  // Appearance
  const prefs = user?.preferences || {};
  const currentTheme = prefs.theme || 'default';
  const currentMode = prefs.mode || 'dark';
  const [theme, setTheme] = useState(currentTheme);
  const [mode, setMode] = useState(currentMode);

  // Live preview effect & Auto Save
  useEffect(() => {
    if (mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.setAttribute('data-theme', theme);

    // Debounce or just fire async to prevent blocking render
    const savePrefs = async () => {
      try {
        const res = await axios.put(
          `http://${window.location.hostname}:8001/api/users/me/preferences`,
          { theme, mode },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setUser({ ...user!, preferences: res.data });
      } catch (e) {
        console.error("Failed to auto-save preferences", e);
      }
    };
    // Only save if it actually differs from what we already have, preventing infinite loops or useless API spam
    if (user?.preferences?.theme !== theme || user?.preferences?.mode !== mode) {
      savePrefs();
    }
  }, [theme, mode, user, token, setUser]);

  // Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');


  const handleClose = () => {
    onClose();
  };

  const themes = [
    { id: 'default', name: 'Default Blue' },
    { id: 'amoled', name: 'AMOLED' },
    { id: 'green', name: 'Green Accent' },
    { id: 'orange', name: 'Orange Accent' }
  ];


  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    if (newPassword !== confirmPassword) {
      return setPassError("Passwords don't match");
    }
    if (newPassword.length < 4) {
      return setPassError("New password too short");
    }
    try {
      await axios.put(
        `http://${window.location.hostname}:8001/api/users/me/password`,
        { current_password: currentPassword, new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPassSuccess("Password updated successfully");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setPassError(e.response?.data?.detail || "Failed to update password");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold dark:text-white">Settings</h2>
          <button onClick={handleClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button 
            onClick={() => setTab('appearance')}
            className={clsx("flex-1 p-3 text-sm font-medium flex items-center justify-center gap-2", tab === 'appearance' ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400" : "text-gray-500")}
          >
            <Palette className="w-4 h-4" /> Appearance
          </button>
          <button 
            onClick={() => setTab('security')}
            className={clsx("flex-1 p-3 text-sm font-medium flex items-center justify-center gap-2", tab === 'security' ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400" : "text-gray-500")}
          >
            <Lock className="w-4 h-4" /> Security
          </button>
        </div>

        <div className="p-6 overflow-y-auto min-h-[400px] flex flex-col">
          {tab === 'appearance' && (
            <div className="space-y-6 flex flex-col flex-1">

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme Accent</label>
                <div className="space-y-2">
                  {themes.map(t => (
                    <label key={t.id} className={clsx("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors", theme === t.id ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750")}>
                      <input type="radio" name="theme" value={t.id} checked={theme === t.id} onChange={(e) => {
                        const newTheme = e.target.value;
                        setTheme(newTheme);
                        if (newTheme === 'amoled') setMode('dark');
                      }} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                      <span className="text-gray-900 dark:text-white font-medium">{t.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={clsx("transition-opacity duration-200", theme === 'amoled' ? "opacity-0 pointer-events-none" : "opacity-100")}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setMode('light')} className={clsx("flex items-center justify-center gap-2 p-3 rounded-xl border", mode === 'light' ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300")}>
                    <Sun className="w-4 h-4" /> Light
                  </button>
                  <button onClick={() => setMode('dark')} className={clsx("flex items-center justify-center gap-2 p-3 rounded-xl border", mode === 'dark' ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300")}>
                    <Moon className="w-4 h-4" /> Dark
                  </button>
                </div>
              </div>


            </div>
          )}

          {tab === 'security' && (
            <form onSubmit={handlePasswordChange} className="space-y-4 flex flex-col flex-1 h-full">
              {passError && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{passError}</div>}
              {passSuccess && <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm">{passSuccess}</div>}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                <input type="password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>

              <button type="submit" className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors mt-auto">
                Update Password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
