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
  isOnline: boolean;
  appPreferences: Record<string, any>;
  setIsOnline: (status: boolean) => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setInstalledApps: (apps: string[]) => void;
  fetchInstalledApps: () => Promise<void>;
  installApp: (appId: string) => Promise<void>;
  uninstallApp: (appId: string) => Promise<void>;
  getAppPreferences: (appId: string) => Promise<any>;
  updateAppPreferences: (appId: string, prefs: any) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  updateUserPreferences: (prefs: any) => Promise<void>;
  syncOfflineQueue: () => Promise<void>;
  logout: () => void;
}

export const useStore = create<HubState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  installedApps: [],
  isOnline: navigator.onLine,
  appPreferences: {},

  setIsOnline: (status) => {
    set({ isOnline: status });
    if (status) {
      get().syncOfflineQueue();
    }
  },

  setUser: (user) => set({ user }),
  
  setToken: (token) => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
    set({ token });
  },
  
  setInstalledApps: (apps) => set({ installedApps: apps }),
  
  fetchInstalledApps: async () => {
    const { token, isOnline } = get();
    if (!token) return;
    if (!isOnline) {
      const cached = localStorage.getItem('installedApps');
      if (cached) set({ installedApps: JSON.parse(cached) });
      return;
    }
    try {
      const res = await axios.get(`http://${window.location.hostname}:8001/core/installed`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ installedApps: res.data });
      localStorage.setItem('installedApps', JSON.stringify(res.data));
    } catch (e) {
      console.error('Failed to fetch installed apps', e);
    }
  },

  installApp: async (appId) => {
    const { token, installedApps, isOnline } = get();
    if (!token || !isOnline) return; // Disallow install when offline
    if (!installedApps.includes(appId)) {
      set({ installedApps: [...installedApps, appId] });
    }
    try {
      await axios.post(`http://${window.location.hostname}:8001/core/install`, { app_id: appId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Failed to install app', e);
      get().fetchInstalledApps();
    }
  },

  uninstallApp: async (appId) => {
    const { token, installedApps, isOnline } = get();
    if (!token || !isOnline) return; // Disallow uninstall when offline
    set({ installedApps: installedApps.filter(id => id !== appId) });
    try {
      await axios.post(`http://${window.location.hostname}:8001/core/uninstall`, { app_id: appId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Failed to uninstall app', e);
      get().fetchInstalledApps();
    }
  },

  getAppPreferences: async (appId) => {
    const { token, isOnline, appPreferences } = get();
    
    // Check local un-synced cache first
    const offlineQueue = JSON.parse(localStorage.getItem('offline_app_prefs') || '{}');
    if (offlineQueue[appId]) {
      return offlineQueue[appId];
    }
    
    // Check state cache
    if (appPreferences[appId]) {
      return appPreferences[appId];
    }

    if (!token || !isOnline) {
      return {};
    }

    try {
      const res = await axios.get(`http://${window.location.hostname}:8001/core/apps/${appId}/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ appPreferences: { ...get().appPreferences, [appId]: res.data }});
      return res.data;
    } catch (e) {
      console.error('Failed to fetch app preferences', e);
      return {};
    }
  },

  updateAppPreferences: async (appId, prefs) => {
    const { token, isOnline } = get();
    
    // Optimistic cache update
    set({ appPreferences: { ...get().appPreferences, [appId]: prefs }});

    if (!isOnline) {
      const offlineQueue = JSON.parse(localStorage.getItem('offline_app_prefs') || '{}');
      offlineQueue[appId] = prefs;
      localStorage.setItem('offline_app_prefs', JSON.stringify(offlineQueue));
      return;
    }

    if (!token) return;

    try {
      await axios.put(`http://${window.location.hostname}:8001/core/apps/${appId}/preferences`, prefs, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Failed to update app preferences', e);
      const offlineQueue = JSON.parse(localStorage.getItem('offline_app_prefs') || '{}');
      offlineQueue[appId] = prefs;
      localStorage.setItem('offline_app_prefs', JSON.stringify(offlineQueue));
    }
  },

  uploadAvatar: async (file: File) => {
    const { token, user } = get();
    if (!token || !user) return;
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`http://${window.location.hostname}:8001/api/users/me/avatar`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      set({ user: { ...user, preferences: { ...user.preferences, avatar: res.data.avatar } } });
    } catch (e) {
      console.error('Failed to upload avatar', e);
    }
  },

  updateUserPreferences: async (prefs: any) => {
    const { token, user } = get();
    if (!token || !user) return;
    
    // Optimistic cache update
    set({ user: { ...user, preferences: { ...user.preferences, ...prefs } }});

    try {
      await axios.put(`http://${window.location.hostname}:8001/api/users/me/preferences`, prefs, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Failed to update user preferences', e);
      // Revert optimism if needed, but simple for now
    }
  },

  syncOfflineQueue: async () => {
    const { token } = get();
    if (!token) return;

    const offlineQueue = JSON.parse(localStorage.getItem('offline_app_prefs') || '{}');
    const appIds = Object.keys(offlineQueue);
    
    if (appIds.length === 0) return;

    for (const appId of appIds) {
      try {
        await axios.put(`http://${window.location.hostname}:8001/core/apps/${appId}/preferences`, offlineQueue[appId], {
          headers: { Authorization: `Bearer ${token}` }
        });
        delete offlineQueue[appId];
      } catch (e) {
        console.error(`Failed to sync offline preferences for ${appId}`, e);
      }
    }
    
    localStorage.setItem('offline_app_prefs', JSON.stringify(offlineQueue));
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('installedApps'); // clean up local cache
    set({ user: null, token: null, installedApps: [], appPreferences: {} });
    window.location.href = '/login';
  }
}));
