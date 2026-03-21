import { create } from 'zustand';
import axios from 'axios';

interface User {
  id: number;
  username: string;
  preferences?: any;
}

interface HubState {
  user: User | null;
  token: string | null;
  installedApps: string[];
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setInstalledApps: (apps: string[]) => void;
  fetchInstalledApps: () => Promise<void>;
  installApp: (appId: string) => Promise<void>;
  uninstallApp: (appId: string) => Promise<void>;
  logout: () => void;
}

export const useStore = create<HubState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  installedApps: [],
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
    set({ token });
  },
  setInstalledApps: (apps) => set({ installedApps: apps }),
  
  fetchInstalledApps: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await axios.get(`http://${window.location.hostname}:8001/core/installed`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ installedApps: res.data });
    } catch (e) {
      console.error('Failed to fetch installed apps', e);
    }
  },

  installApp: async (appId) => {
    const { token, installedApps } = get();
    if (!token) return;
    // Optimistic UI update
    if (!installedApps.includes(appId)) {
      set({ installedApps: [...installedApps, appId] });
    }
    try {
      await axios.post(`http://${window.location.hostname}:8001/core/install`, { app_id: appId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Failed to install app', e);
      get().fetchInstalledApps(); // revert on fail
    }
  },

  uninstallApp: async (appId) => {
    const { token, installedApps } = get();
    if (!token) return;
    // Optimistic UI update
    set({ installedApps: installedApps.filter(id => id !== appId) });
    try {
      await axios.post(`http://${window.location.hostname}:8001/core/uninstall`, { app_id: appId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Failed to uninstall app', e);
      get().fetchInstalledApps(); // revert on fail
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, installedApps: [] });
    window.location.href = '/login'; // explicitly navigate to login on logout
  }
}));
