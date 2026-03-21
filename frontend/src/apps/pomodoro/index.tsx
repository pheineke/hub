import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { Play, Pause, RotateCcw, Settings, X } from 'lucide-react';

export function PomodoroWidget() {
  const { getAppPreferences, updateAppPreferences } = useStore();
  const [prefs, setPrefs] = useState({ focus: 25, shortBreak: 5, longBreak: 15 });
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [showSettings, setShowSettings] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getAppPreferences('pomodoro').then((data) => {
      if (data && data.focus) {
        setPrefs(data);
        if (!isActive) {
          setTimeLeft(data[mode] * 60);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if ("serviceWorker" in navigator && Notification.permission === "granted") {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification("Pomodoro Timer", {
            body: mode === 'focus' ? "Focus time is over! Take a break." : "Break is over! Time to focus.",
            icon: '/pwa-192x192.png',
            requireInteraction: true,
            // @ts-ignore
            vibrate: [200, 100, 200, 100, 200, 100, 200],
            tag: 'pomodoro-timer'
          });
        });
      } else if (Notification.permission === "granted") {
        new Notification("Pomodoro Timer", {
          body: mode === 'focus' ? "Focus time is over! Take a break." : "Break is over! Time to focus.",
        });
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, mode]);

  const toggleTimer = () => {
    if (!isActive && Notification.permission === "default") {
      Notification.requestPermission();
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(prefs[mode] * 60);
  };

  const changeMode = (newMode: 'focus' | 'shortBreak' | 'longBreak') => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(prefs[newMode] * 60);
  };

  const savePrefs = (newPrefs: any) => {
    setPrefs(newPrefs);
    updateAppPreferences('pomodoro', newPrefs);
    if (!isActive) {
      setTimeLeft(newPrefs[mode] * 60);
    }
    setShowSettings(false);
  };

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-md mx-auto w-full relative">
      <button 
        onClick={() => setShowSettings(!showSettings)}
        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-20"
      >
        <Settings className="w-5 h-5" />
      </button>

      <div className="flex gap-2 mb-8 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
        {[
          { id: 'focus', label: 'Pomodoro' },
          { id: 'shortBreak', label: 'Short Break' },
          { id: 'longBreak', label: 'Long Break' },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => changeMode(m.id as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === m.id 
                ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="text-7xl font-bold mb-8 text-gray-900 dark:text-white tabular-nums tracking-tight">
        {mins}:{secs}
      </div>

      <div className="flex gap-4">
        <button
          onClick={toggleTimer}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-transform active:scale-95 ${
            isActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          {isActive ? 'PAUSE' : 'START'}
        </button>
        <button
          onClick={resetTimer}
          className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {showSettings && (
        <div className="absolute top-0 left-0 w-full min-h-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col p-6 z-30">
          <div className="flex justify-between items-center mb-6 shrink-0 mt-2">
            <h3 className="font-bold text-lg">Timer Settings</h3>
            <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
          </div>
          
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            savePrefs({
              focus: parseInt(fd.get('focus') as string) || 25,
              shortBreak: parseInt(fd.get('shortBreak') as string) || 5,
              longBreak: parseInt(fd.get('longBreak') as string) || 15,
            });
          }}>
            <div>
              <label className="block text-sm font-medium mb-1">Focus (minutes)</label>
              <input name="focus" type="number" defaultValue={prefs.focus} min="1" max="60" className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Short Break (minutes)</label>
              <input name="shortBreak" type="number" defaultValue={prefs.shortBreak} min="1" max="60" className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Long Break (minutes)</label>
              <input name="longBreak" type="number" defaultValue={prefs.longBreak} min="1" max="60" className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700" />
            </div>
            <button type="submit" className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl mt-4">
              Save Changes
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
