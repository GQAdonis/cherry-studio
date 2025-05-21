import { create } from 'zustand';

interface SettingsStore {
  // Theme settings
  theme: 'light' | 'dark' | 'system';
  
  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  // Initial state
  theme: 'dark',
  
  // Actions
  setTheme: (theme) => set({ theme })
}));