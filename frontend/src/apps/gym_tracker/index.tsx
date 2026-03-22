import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Plus, Trash2, ArrowLeft } from 'lucide-react';

interface Activity {
  id: number;
  name: string;
}

interface GymLog {
  id: number;
  activity_id: number;
  weight: number;
  reps: number;
  date: string;
}

export function GymTrackerWidget() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [logs, setLogs] = useState<GymLog[]>([]);
  const [view, setView] = useState<'main' | 'settings'>('main');

  // Load data
  const fetchData = async () => {
    try {
      const [actRes, logRes] = await Promise.all([
        axios.get('/api/apps/gym_tracker/activities'),
        axios.get('/api/apps/gym_tracker/logs')
      ]);
      setActivities(actRes.data);
      setLogs(logRes.data);
    } catch (err) {
      console.error('Failed to load gym data', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden text-gray-900 dark:text-white">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Gym Tracker {view === 'settings' && <span className="text-sm font-normal text-gray-500 ml-2">Settings</span>}</h3>
        <button onClick={() => setView(view === 'main' ? 'settings' : 'main')} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
          {view === 'main' ? <Settings size={18} /> : <ArrowLeft size={18} />}
        </button>
      </div>

      {view === 'main' && (
        <MainView activities={activities} logs={logs} onDataChange={fetchData} />
      )}
      {view === 'settings' && (
        <SettingsView activities={activities} onDataChange={fetchData} />
      )}
    </div>
  );
}

function MainView({ activities, logs, onDataChange }: { activities: Activity[], logs: GymLog[], onDataChange: () => void }) {
  const [selectedActivity, setSelectedActivity] = useState<number | ''>('');
  const [weight, setWeight] = useState<string>('');
  const [reps, setReps] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity || !weight || !reps) return;
    
    setLoading(true);
    try {
      await axios.post('/api/apps/gym_tracker/logs', {
        activity_id: Number(selectedActivity),
        weight: parseFloat(weight),
        reps: parseInt(reps)
      });
      // Do not reset activity, weight, and reps here, so the user can easily log the same values again!
      onDataChange();
    } catch (err) {
      console.error('Failed to add log', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRepeatLog = async (log: GymLog) => {
    try {
      await axios.post('/api/apps/gym_tracker/logs', {
        activity_id: log.activity_id,
        weight: log.weight,
        reps: log.reps
      });
      onDataChange();
    } catch (err) {
      console.error('Failed to repeat log', err);
    }
  };

  const handleDeleteLog = async (id: number) => {
    try {
      await axios.delete(`/api/apps/gym_tracker/logs/${id}`);
      onDataChange();
    } catch (err) {
      console.error('Failed to delete log', err);
    }
  };

  if (activities.length === 0) {
    return <div className="text-center mt-10 text-gray-500">Go to Settings to add your first machine/activity!</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleAddLog} className="mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Activity</label>
          <select 
            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={selectedActivity}
            onChange={(e) => setSelectedActivity(e.target.value ? Number(e.target.value) : '')}
            required
          >
            <option value="" disabled>Select Activity</option>
            {activities.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Weight</label>
            <input 
              type="number" 
              step="0.1"
              min="0"
              required
              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 60"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Reps</label>
            <input 
              type="number" 
              min="1"
              required
              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder="e.g. 10"
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading || !selectedActivity || !weight || !reps}
          className="mt-2 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Plus size={16} /> Log Set
        </button>
      </form>

      <div className="flex-1 overflow-y-auto pr-2 pb-10 custom-scrollbar space-y-3">
        <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Recent Logs</h4>
        {logs.map(log => {
          const act = activities.find(a => a.id === log.activity_id);
          return (
            <div key={log.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
              <div>
                <p className="font-medium text-sm">{act ? act.name : 'Unknown Activity'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{log.weight} kg × {log.reps} reps • {log.date}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleRepeatLog(log)}
                  className="text-gray-400 hover:text-green-500 transition-colors p-1"
                  title="Add another identical set"
                >
                  <Plus size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteLog(log.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Delete log"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
        {logs.length === 0 && <p className="text-sm text-center text-gray-500">No logs yet.</p>}
      </div>
    </div>
  );
}

function SettingsView({ activities, onDataChange }: { activities: Activity[], onDataChange: () => void }) {
  const [newActivity, setNewActivity] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.trim()) return;
    setLoading(true);
    try {
      await axios.post('/api/apps/gym_tracker/activities', { name: newActivity.trim() });
      setNewActivity('');
      onDataChange();
    } catch (err) {
      console.error('Failed to add activity', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteActivity = async (id: number) => {
    if (!confirm('Are you sure? This will delete all logs for this activity as well.')) return;
    try {
      await axios.delete(`/api/apps/gym_tracker/activities/${id}`);
      onDataChange();
    } catch (err) {
      console.error('Failed to delete activity', err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Activities & Machines</h4>
        <form onSubmit={handleAddActivity} className="flex gap-2">
          <input 
            type="text" 
            className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. Bench Press" 
            value={newActivity}
            onChange={(e) => setNewActivity(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={loading || !newActivity.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-10 custom-scrollbar space-y-2">
        {activities.map(act => (
          <div key={act.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
            <span className="font-medium text-sm">{act.name}</span>
            <button 
              onClick={() => handleDeleteActivity(act.id)}
              className="text-gray-400 hover:text-red-500 transition-colors p-1"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {activities.length === 0 && <p className="text-sm text-center text-gray-500">No activities added yet.</p>}
      </div>
    </div>
  );
}
