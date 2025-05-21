import { eventBus } from './eventBus';

/**
 * Type definition for storage sync event data
 */
interface StorageSyncEvent {
  key: string;
  value: any;
  source: string;
}

/**
 * SyncStorage provides a mechanism for synchronizing localStorage across
 * multiple windows in a Tauri application.
 * 
 * It uses the eventBus to broadcast changes to other windows and listen
 * for changes from other windows.
 */
class SyncStorage {
  /**
   * Prefix for synchronized storage keys
   */
  private prefix: string = 'sync:';
  
  /**
   * Flag to track if the storage sync is initialized
   */
  private isInitialized: boolean = false;

  /**
   * Constructor initializes the storage sync
   */
  constructor() {
    this.initialize();
  }

  /**
   * Initialize the storage sync by setting up event listeners
   */
  private initialize() {
    if (this.isInitialized) return;

    // Listen for storage sync events
    eventBus.subscribe('storage-sync', (data: StorageSyncEvent) => {
      const { key, value, source } = data;
      
      // Only update if the event came from another window
      if (source !== window.location.href) {
        if (value === null) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(value));
        }
      }
    });

    this.isInitialized = true;
    console.log('SyncStorage initialized successfully');
  }

  /**
   * Set an item in synchronized storage
   * 
   * @param key - The key to store the value under
   * @param value - The value to store
   */
  public setItem(key: string, value: any): void {
    // Store the value in localStorage
    const fullKey = this.prefix + key;
    localStorage.setItem(fullKey, JSON.stringify(value));

    // Broadcast the change to other windows
    eventBus.broadcast('storage-sync', {
      key: fullKey,
      value,
      source: window.location.href,
    });
  }

  /**
   * Get an item from synchronized storage
   * 
   * @param key - The key to retrieve the value for
   * @returns The stored value, or null if not found
   */
  public getItem<T = any>(key: string): T | null {
    const fullKey = this.prefix + key;
    const value = localStorage.getItem(fullKey);
    return value ? JSON.parse(value) : null;
  }

  /**
   * Remove an item from synchronized storage
   * 
   * @param key - The key to remove
   */
  public removeItem(key: string): void {
    const fullKey = this.prefix + key;
    localStorage.removeItem(fullKey);

    // Broadcast the removal to other windows
    eventBus.broadcast('storage-sync', {
      key: fullKey,
      value: null,
      source: window.location.href,
    });
  }

  /**
   * Clear all synchronized storage items
   */
  public clear(): void {
    // Get all sync keys
    const syncKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        syncKeys.push(key);
      }
    }

    // Remove all sync keys
    syncKeys.forEach(key => {
      localStorage.removeItem(key);
      
      // Broadcast the removal to other windows
      eventBus.broadcast('storage-sync', {
        key,
        value: null,
        source: window.location.href,
      });
    });
  }

  /**
   * Get all synchronized storage keys
   * 
   * @returns Array of keys (without the prefix)
   */
  public getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }
    return keys;
  }
}

// Export a singleton instance of the SyncStorage
export const syncStorage = new SyncStorage();