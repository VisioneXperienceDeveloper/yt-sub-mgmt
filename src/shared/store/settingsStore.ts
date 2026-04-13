import { create } from 'zustand';
import { UserSettings } from '../types';
import { storageGet, storageSet } from '../utils/storage';
import { STORAGE_KEYS, DEFAULTS } from '../constants';

interface SettingsStore {
  settings: UserSettings;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>()((set, get) => ({
  settings: {
    inactivityThresholdMonths: DEFAULTS.INACTIVITY_THRESHOLD_MONTHS,
    autoTaggingEnabled: false,
    feedFilterEnabled: false,
    dateFormat: DEFAULTS.DATE_FORMAT,
  },
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    const settings = await storageGet<UserSettings>(STORAGE_KEYS.SETTINGS);
    if (settings) {
      set({ settings, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  updateSettings: async (updates) => {
    const newSettings = { ...get().settings, ...updates };
    set({ settings: newSettings });
    await storageSet(STORAGE_KEYS.SETTINGS, newSettings);
  },
}));
