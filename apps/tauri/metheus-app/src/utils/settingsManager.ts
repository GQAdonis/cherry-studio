import { invoke, listen, Window } from "./tauri";

/**
 * Interface for setting schema
 */
export interface SettingSchema {
  /** The type of the setting (string, number, boolean, etc.) */
  setting_type: string;
  /** The default value for the setting */
  default_value: any;
  /** Optional minimum value for number settings */
  min?: number;
  /** Optional maximum value for number settings */
  max?: number;
  /** Optional allowed values for enum settings */
  allowed_values?: any[];
  /** Optional description of the setting */
  description?: string;
}

/**
 * Interface for setting category
 */
export interface SettingCategory {
  /** The name of the category */
  name: string;
  /** The icon for the category */
  icon?: string;
  /** The description of the category */
  description?: string;
  /** The order of the category in the UI */
  order?: number;
}

/**
 * Interface for setting change event
 */
export interface SettingChangeEvent {
  /** The key of the setting that changed */
  key: string;
  /** The new value of the setting */
  value: any;
}

/**
 * Type for settings change listener
 */
export type SettingsChangeListener = (event: SettingChangeEvent) => void;

/**
 * Class for managing application settings
 */
export class SettingsManager {
  private static instance: SettingsManager;
  private settings: Record<string, any> = {};
  private schemas: Record<string, SettingSchema> = {};
  private categories: Record<string, SettingCategory> = {};
  private listeners: SettingsChangeListener[] = [];
  private initialized = false;

  /**
   * Private constructor to enforce singleton pattern
   * Empty because no initialization is needed at instance creation time
   */
  private constructor() {
    // Initialization is done in the initialize method
  }

  /**
   * Get the singleton instance of SettingsManager
   */
  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  /**
   * Initialize the settings manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Load all settings
      this.settings = await invoke<Record<string, any>>("get_all_settings");

      // Load all schemas
      this.schemas = await invoke<Record<string, SettingSchema>>("get_all_setting_schemas");

      // Load all categories
      this.categories = await invoke<Record<string, SettingCategory>>("get_setting_categories");

      // Listen for setting changes
      await this.setupEventListeners();

      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize settings manager:", error);
      throw error;
    }
  }

  /**
   * Set up event listeners for settings changes
   */
  private async setupEventListeners(): Promise<void> {
    // Listen for setting changes from other windows
    const unlisten = await listen<SettingChangeEvent>("setting-changed", (event) => {
      const { key, value } = event.payload;
      this.settings[key] = value;
      this.notifyListeners({ key, value });
    });

    // Listen for settings reset
    const unlistenReset = await listen("settings-reset", async () => {
      // Reload all settings
      this.settings = await invoke<Record<string, any>>("get_all_settings");
      this.notifyListeners({ key: "*", value: null });
    });

    // Clean up listeners when window is closed
    const currentWindow = await Window.getCurrent();
    currentWindow.once("close", () => {
      unlisten();
      unlistenReset();
    });
  }

  /**
   * Notify all listeners of a setting change
   */
  private notifyListeners(event: SettingChangeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in settings change listener:", error);
      }
    }
  }

  /**
   * Get a setting value
   * @param key The key of the setting to get
   * @param defaultValue The default value to return if the setting is not found
   */
  public async getSetting<T>(key: string, defaultValue?: T): Promise<T> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // If we have the setting cached, return it
      if (key in this.settings) {
        return this.settings[key] as T;
      }

      // Otherwise, get it from the backend
      const value = await invoke<T | null>("get_setting", { key });
      
      if (value !== null) {
        this.settings[key] = value;
        return value as T;
      }

      // If the setting is not found, return the default value
      return defaultValue as T;
    } catch (error) {
      console.error(`Failed to get setting ${key}:`, error);
      return defaultValue as T;
    }
  }

  /**
   * Set a setting value
   * @param key The key of the setting to set
   * @param value The value to set
   */
  public async setSetting<T>(key: string, value: T): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await invoke("set_setting", { key, value });
      this.settings[key] = value;
    } catch (error) {
      console.error(`Failed to set setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Reset a setting to its default value
   * @param key The key of the setting to reset
   */
  public async resetSetting(key: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await invoke("reset_setting", { key });
      
      // Update the cached value
      const value = await invoke<any>("get_setting", { key });
      this.settings[key] = value;
    } catch (error) {
      console.error(`Failed to reset setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Reset all settings to their default values
   */
  public async resetAllSettings(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await invoke("reset_all_settings");
      
      // Reload all settings
      this.settings = await invoke<Record<string, any>>("get_all_settings");
    } catch (error) {
      console.error("Failed to reset all settings:", error);
      throw error;
    }
  }

  /**
   * Get all settings
   */
  public async getAllSettings(): Promise<Record<string, any>> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Refresh the settings from the backend
      this.settings = await invoke<Record<string, any>>("get_all_settings");
      return this.settings;
    } catch (error) {
      console.error("Failed to get all settings:", error);
      throw error;
    }
  }

  /**
   * Get the schema for a setting
   * @param key The key of the setting to get the schema for
   */
  public async getSettingSchema(key: string): Promise<SettingSchema | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // If we have the schema cached, return it
      if (key in this.schemas) {
        return this.schemas[key];
      }

      // Otherwise, get it from the backend
      const schema = await invoke<SettingSchema | null>("get_setting_schema", { key });
      
      if (schema) {
        this.schemas[key] = schema;
      }
      
      return schema;
    } catch (error) {
      console.error(`Failed to get schema for setting ${key}:`, error);
      return null;
    }
  }

  /**
   * Get all setting schemas
   */
  public async getAllSettingSchemas(): Promise<Record<string, SettingSchema>> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.schemas;
  }

  /**
   * Get all setting categories
   */
  public async getSettingCategories(): Promise<Record<string, SettingCategory>> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.categories;
  }

  /**
   * Add a listener for setting changes
   * @param listener The listener function to add
   * @returns A function to remove the listener
   */
  public addChangeListener(listener: SettingsChangeListener): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get settings by category
   * @param categoryKey The key of the category to get settings for
   */
  public async getSettingsByCategory(categoryKey: string): Promise<Record<string, any>> {
    if (!this.initialized) {
      await this.initialize();
    }

    const result: Record<string, any> = {};
    
    // Find all settings that start with the category key
    for (const [key, value] of Object.entries(this.settings)) {
      if (key.startsWith(`${categoryKey}.`)) {
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Get schemas by category
   * @param categoryKey The key of the category to get schemas for
   */
  public async getSchemasByCategory(categoryKey: string): Promise<Record<string, SettingSchema>> {
    if (!this.initialized) {
      await this.initialize();
    }

    const result: Record<string, SettingSchema> = {};
    
    // Find all schemas that start with the category key
    for (const [key, schema] of Object.entries(this.schemas)) {
      if (key.startsWith(`${categoryKey}.`)) {
        result[key] = schema;
      }
    }
    
    return result;
  }
}

// Export a singleton instance
export const settingsManager = SettingsManager.getInstance();
