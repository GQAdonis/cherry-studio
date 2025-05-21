import { create } from 'zustand';

export interface MiniApp {
  id: string;
  title: string;
  url: string;
  icon?: string;
  color?: string;
  type: "oneOff" | "keepAlive";
  serverName?: string;
  preloadPath?: string;
  allowedPermissions?: string[];
  props?: Record<string, any>;
}

interface MiniAppState {
  apps: MiniApp[];
  minimizedApps: string[];
  maximizedApp: string | null;
  
  // Actions
  openApp: (app: MiniApp) => void;
  closeApp: (appId: string) => void;
  minimizeApp: (appId: string) => void;
  maximizeApp: (appId: string) => void;
  restoreApp: (appId: string) => void;
}

/**
 * Mini App Store
 * 
 * Manages the state of mini applications.
 * Handles opening, closing, minimizing, maximizing, and restoring apps.
 */
export const useMiniAppsStore = create<MiniAppState>((set, get) => ({
  apps: [],
  minimizedApps: [],
  maximizedApp: null,
  
  openApp: (app: MiniApp) => {
    const { apps, minimizedApps } = get();
    const existingAppIndex = apps.findIndex(a => a.id === app.id);
    
    if (existingAppIndex !== -1) {
      // If app is minimized, restore it
      if (minimizedApps.includes(app.id)) {
        set({ minimizedApps: minimizedApps.filter(id => id !== app.id) });
      }
      return;
    }
    
    // Add new app
    set({ apps: [...apps, app] });
  },
  
  closeApp: (appId: string) => {
    const { apps, minimizedApps, maximizedApp } = get();
    
    // Remove from apps list
    set({ 
      apps: apps.filter(app => app.id !== appId),
      // Remove from minimized and maximized states if present
      minimizedApps: minimizedApps.filter(id => id !== appId),
      maximizedApp: maximizedApp === appId ? null : maximizedApp
    });
  },
  
  minimizeApp: (appId: string) => {
    const { minimizedApps, maximizedApp } = get();
    
    if (!minimizedApps.includes(appId)) {
      set({ 
        minimizedApps: [...minimizedApps, appId],
        // If app is maximized, un-maximize it
        maximizedApp: maximizedApp === appId ? null : maximizedApp
      });
    }
  },
  
  maximizeApp: (appId: string) => {
    const { minimizedApps } = get();
    
    set({ 
      maximizedApp: appId,
      // If app is minimized, un-minimize it
      minimizedApps: minimizedApps.filter(id => id !== appId)
    });
  },
  
  restoreApp: (appId: string) => {
    const { minimizedApps, maximizedApp } = get();
    
    set({ 
      minimizedApps: minimizedApps.filter(id => id !== appId),
      maximizedApp: maximizedApp === appId ? null : maximizedApp
    });
  }
}));

// Default mini apps
export const DEFAULT_MINI_APPS: MiniApp[] = [
  {
    id: "chatgpt",
    title: "ChatGPT",
    url: "https://chat.openai.com",
    icon: "",
    color: "bg-emerald-700",
    type: "keepAlive"
  },
  {
    id: "gemini",
    title: "Gemini",
    url: "https://gemini.google.com",
    icon: "",
    color: "bg-blue-900",
    type: "keepAlive"
  },
  {
    id: "deepseek",
    title: "DeepSeek",
    url: "https://chat.deepseek.com",
    icon: "",
    color: "bg-indigo-700",
    type: "keepAlive"
  },
  {
    id: "groq",
    title: "Groq",
    url: "https://console.groq.com",
    icon: "",
    color: "bg-red-600",
    type: "keepAlive"
  },
  {
    id: "claude",
    title: "Claude",
    url: "https://claude.ai",
    icon: "",
    color: "bg-orange-600",
    type: "keepAlive"
  },
  {
    id: "mistral",
    title: "Mistral AI",
    url: "https://chat.mistral.ai",
    icon: "",
    color: "bg-blue-600",
    type: "keepAlive"
  },
  {
    id: "duckduckgo",
    title: "DuckDuckGo",
    url: "https://duckduckgo.com",
    icon: "",
    color: "bg-orange-700",
    type: "keepAlive"
  },
  {
    id: "you",
    title: "You",
    url: "https://you.com",
    icon: "",
    color: "bg-indigo-600",
    type: "keepAlive"
  }
];