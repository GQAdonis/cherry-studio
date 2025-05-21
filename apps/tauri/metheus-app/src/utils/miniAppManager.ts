// Import types
import { MiniAppBounds, MiniAppConfig, MiniAppState } from '../types/miniapp';

// Mock functions for Tauri API
// These will be replaced with actual Tauri API calls when the correct imports are determined
const invoke = async <T>(command: string, args?: any): Promise<T> => {
  console.log(`Invoking command: ${command}`, args);
  return null as unknown as T;
};

const listen = async (event: string, callback: (event: any) => void): Promise<() => void> => {
  console.log(`Listening to event: ${event}`);
  // Mock calling the callback to avoid the unused parameter warning
  setTimeout(() => {
    callback({ payload: { appId: 'test.miniapp', state: MiniAppState.Loaded } });
  }, 1000);
  return () => console.log(`Stopped listening to event: ${event}`);
};

/**
 * MiniAppManager provides a clean API for loading and managing mini-apps
 * It handles communication with the Rust backend via Tauri commands
 */
export class MiniAppManager {
  private static instance: MiniAppManager;
  private activeAppId: string | null = null;
  private miniAppStates: Map<string, MiniAppState> = new Map();
  private eventListeners: Map<string, () => void> = new Map();
  private stateChangeCallbacks: Array<(appId: string, state: MiniAppState) => void> = [];

  /**
   * Get the singleton instance of MiniAppManager
   */
  public static getInstance(): MiniAppManager {
    if (!MiniAppManager.instance) {
      MiniAppManager.instance = new MiniAppManager();
    }
    return MiniAppManager.instance;
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Set up event listeners
    this.setupEventListeners();
    
    // Initialize state from backend
    this.refreshStates();
  }

  /**
   * Set up event listeners for window resize and mini-app state changes
   */
  private async setupEventListeners(): Promise<void> {
    // Listen for window resize events
    const unlisten = await listen('tauri://resize', () => {
      this.resizeAllMiniApps();
    });
    this.eventListeners.set('resize', unlisten);

    // Listen for mini-app state changes
    const stateChangeUnlisten = await listen('miniapp-state-change', (event) => {
      const { appId, state } = event.payload as { appId: string; state: MiniAppState };
      this.miniAppStates.set(appId, state);
      
      // Notify callbacks
      this.stateChangeCallbacks.forEach(callback => {
        callback(appId, state);
      });
    });
    this.eventListeners.set('miniapp-state-change', stateChangeUnlisten);
  }

  /**
   * Clean up event listeners
   */
  public async cleanup(): Promise<void> {
    for (const unlisten of this.eventListeners.values()) {
      await unlisten();
    }
    this.eventListeners.clear();
  }

  /**
   * Register a mini-app configuration
   * @param config The mini-app configuration
   */
  public async registerMiniApp(config: MiniAppConfig): Promise<void> {
    try {
      await invoke('register_miniapp', { config });
    } catch (error) {
      console.error('Failed to register mini-app:', error);
      throw error;
    }
  }

  /**
   * Get a mini-app configuration by ID
   * @param appId The mini-app ID
   * @returns The mini-app configuration or null if not found
   */
  public async getMiniAppConfig(appId: string): Promise<MiniAppConfig | null> {
    try {
      const config = await invoke<MiniAppConfig | null>('get_miniapp_config', { appId });
      return config;
    } catch (error) {
      console.error('Failed to get mini-app config:', error);
      return null;
    }
  }

  /**
   * Get all registered mini-app configurations
   * @returns An array of mini-app configurations
   */
  public async getAllMiniAppConfigs(): Promise<MiniAppConfig[]> {
    try {
      const configs = await invoke<MiniAppConfig[]>('get_all_miniapp_configs');
      return configs;
    } catch (error) {
      console.error('Failed to get all mini-app configs:', error);
      return [];
    }
  }

  /**
   * Load a mini-app into a webview
   * @param appId The mini-app ID
   */
  public async loadMiniApp(appId: string): Promise<void> {
    try {
      await invoke('load_miniapp', { appId });
      this.refreshStates();
    } catch (error) {
      console.error('Failed to load mini-app:', error);
      throw error;
    }
  }

  /**
   * Show a mini-app with specific positioning
   * @param appId The mini-app ID
   * @param bounds The bounds of the mini-app webview
   */
  public async showMiniApp(appId: string, bounds: MiniAppBounds): Promise<void> {
    try {
      await invoke('show_miniapp', { appId, bounds });
      this.activeAppId = appId;
      this.refreshStates();
    } catch (error) {
      console.error('Failed to show mini-app:', error);
      throw error;
    }
  }

  /**
   * Hide a mini-app
   * @param appId The mini-app ID
   */
  public async hideMiniApp(appId: string): Promise<void> {
    try {
      await invoke('hide_miniapp', { appId });
      if (this.activeAppId === appId) {
        this.activeAppId = null;
      }
      this.refreshStates();
    } catch (error) {
      console.error('Failed to hide mini-app:', error);
      throw error;
    }
  }

  /**
   * Unload a mini-app
   * @param appId The mini-app ID
   */
  public async unloadMiniApp(appId: string): Promise<void> {
    try {
      await invoke('unload_miniapp', { appId });
      if (this.activeAppId === appId) {
        this.activeAppId = null;
      }
      this.refreshStates();
    } catch (error) {
      console.error('Failed to unload mini-app:', error);
      throw error;
    }
  }

  /**
   * Set a mini-app as the active one (bring to front for z-order management)
   * @param appId The mini-app ID
   */
  public async setActiveMiniApp(appId: string): Promise<void> {
    try {
      await invoke('set_active_miniapp', { appId });
      this.activeAppId = appId;
    } catch (error) {
      console.error('Failed to set active mini-app:', error);
      throw error;
    }
  }

  /**
   * Update mini-app positions on window resize
   */
  public async resizeAllMiniApps(): Promise<void> {
    try {
      await invoke('resize_all_miniapps');
    } catch (error) {
      console.error('Failed to resize all mini-apps:', error);
      throw error;
    }
  }

  /**
   * Get the state of a mini-app
   * @param appId The mini-app ID
   * @returns The mini-app state or null if not found
   */
  public async getMiniAppState(appId: string): Promise<MiniAppState | null> {
    try {
      const state = await invoke<MiniAppState | null>('get_miniapp_state', { appId });
      if (state) {
        this.miniAppStates.set(appId, state);
      }
      return state;
    } catch (error) {
      console.error('Failed to get mini-app state:', error);
      return null;
    }
  }

  /**
   * Get the currently active mini-app ID
   * @returns The active mini-app ID or null if none is active
   */
  public async getActiveMiniAppId(): Promise<string | null> {
    try {
      const appId = await invoke<string | null>('get_active_miniapp_id');
      this.activeAppId = appId;
      return appId;
    } catch (error) {
      console.error('Failed to get active mini-app ID:', error);
      return null;
    }
  }

  /**
   * Get all mini-app states
   * @returns A map of mini-app IDs to their states
   */
  public async getAllMiniAppStates(): Promise<Map<string, MiniAppState>> {
    try {
      const states = await invoke<Record<string, MiniAppState>>('get_all_miniapp_states');
      this.miniAppStates = new Map(Object.entries(states));
      return this.miniAppStates;
    } catch (error) {
      console.error('Failed to get all mini-app states:', error);
      return new Map();
    }
  }

  /**
   * Refresh the states of all mini-apps
   */
  private async refreshStates(): Promise<void> {
    await this.getAllMiniAppStates();
    await this.getActiveMiniAppId();
  }

  /**
   * Register a callback for mini-app state changes
   * @param callback The callback function
   * @returns A function to unregister the callback
   */
  public onStateChange(callback: (appId: string, state: MiniAppState) => void): () => void {
    this.stateChangeCallbacks.push(callback);
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback);
      if (index !== -1) {
        this.stateChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Calculate the bounds for a mini-app based on the content area
   * @param contentArea The content area dimensions
   * @returns The bounds for the mini-app
   */
  public calculateMiniAppBounds(contentArea: { 
    top: number; 
    left: number; 
    width: number; 
    height: number;
  }): MiniAppBounds {
    return {
      x: contentArea.left,
      y: contentArea.top,
      width: contentArea.width,
      height: contentArea.height
    };
  }

  /**
   * Load and show a mini-app in one operation
   * @param appId The mini-app ID
   * @param bounds The bounds of the mini-app webview
   */
  public async loadAndShowMiniApp(appId: string, bounds: MiniAppBounds): Promise<void> {
    try {
      // First check if the mini-app is already loaded
      const state = await this.getMiniAppState(appId);
      
      if (!state || state === MiniAppState.NotLoaded) {
        // Load the mini-app first
        await this.loadMiniApp(appId);
        
        // Wait a bit for the webview to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Then show it
      await this.showMiniApp(appId, bounds);
    } catch (error) {
      console.error('Failed to load and show mini-app:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const miniAppManager = MiniAppManager.getInstance();