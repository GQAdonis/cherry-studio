import { eventBus } from './eventBus';
import Dexie from 'dexie';

/**
 * Type definition for database sync event data
 */
interface DbSyncEvent {
  operation: 'put' | 'delete' | 'clear';
  table: string;
  key?: string;
  value?: any;
  source: string;
}

/**
 * Type definition for a generic item with a key
 */
interface SyncItem {
  key: string;
  value: any;
}

/**
 * SyncDatabase provides a mechanism for synchronizing IndexedDB data across
 * multiple windows in a Tauri application.
 * 
 * It extends Dexie to provide synchronized database operations and uses
 * the eventBus to broadcast changes to other windows.
 */
class SyncDatabase extends Dexie {
  /**
   * Table for storing synchronized items
   */
  public items: Dexie.Table<SyncItem, string>;

  /**
   * Flag to track if the database sync is initialized
   */
  private isInitialized: boolean = false;

  /**
   * Constructor initializes the database and sets up tables
   */
  constructor() {
    super('SyncDatabase');
    
    // Define the database schema
    this.version(1).stores({
      items: 'key',
    });
    
    // Initialize the items table
    this.items = this.table('items');
    
    // Initialize the database sync
    this.initialize();
  }

  /**
   * Initialize the database sync by setting up event listeners
   */
  private initialize() {
    if (this.isInitialized) return;

    // Listen for database sync events
    eventBus.subscribe('db-sync', async (data: DbSyncEvent) => {
      const { operation, table, key, value, source } = data;
      
      // Only update if the event came from another window
      if (source !== window.location.href) {
        try {
          if (table === 'items') {
            if (operation === 'put' && key) {
              await this.items.put({ key, value });
            } else if (operation === 'delete' && key) {
              await this.items.delete(key);
            } else if (operation === 'clear') {
              await this.items.clear();
            }
          }
        } catch (error) {
          console.error('Error processing database sync event:', error);
        }
      }
    });

    this.isInitialized = true;
    console.log('SyncDatabase initialized successfully');
  }

  /**
   * Put an item in the database and synchronize across windows
   * 
   * @param key - The key to store the value under
   * @param value - The value to store
   * @returns Promise that resolves when the operation is complete
   */
  public async putItem(key: string, value: any): Promise<void> {
    try {
      // Store the value in IndexedDB
      await this.items.put({ key, value });

      // Broadcast the change to other windows
      await eventBus.broadcast('db-sync', {
        operation: 'put',
        table: 'items',
        key,
        value,
        source: window.location.href,
      });
    } catch (error) {
      console.error('Error putting item in database:', error);
      throw error;
    }
  }

  /**
   * Get an item from the database
   * 
   * @param key - The key to retrieve the value for
   * @returns Promise that resolves with the value, or undefined if not found
   */
  public async getItem<T = any>(key: string): Promise<T | undefined> {
    try {
      const item = await this.items.get(key);
      return item?.value as T | undefined;
    } catch (error) {
      console.error('Error getting item from database:', error);
      throw error;
    }
  }

  /**
   * Delete an item from the database and synchronize across windows
   * 
   * @param key - The key to delete
   * @returns Promise that resolves when the operation is complete
   */
  public async deleteItem(key: string): Promise<void> {
    try {
      // Delete the value from IndexedDB
      await this.items.delete(key);

      // Broadcast the deletion to other windows
      await eventBus.broadcast('db-sync', {
        operation: 'delete',
        table: 'items',
        key,
        source: window.location.href,
      });
    } catch (error) {
      console.error('Error deleting item from database:', error);
      throw error;
    }
  }

  /**
   * Clear all items from the database and synchronize across windows
   * 
   * @returns Promise that resolves when the operation is complete
   */
  public async clearItems(): Promise<void> {
    try {
      // Clear all items from IndexedDB
      await this.items.clear();

      // Broadcast the clear operation to other windows
      await eventBus.broadcast('db-sync', {
        operation: 'clear',
        table: 'items',
        source: window.location.href,
      });
    } catch (error) {
      console.error('Error clearing items from database:', error);
      throw error;
    }
  }

  /**
   * Get all items from the database
   * 
   * @returns Promise that resolves with an array of all items
   */
  public async getAllItems(): Promise<SyncItem[]> {
    try {
      return await this.items.toArray();
    } catch (error) {
      console.error('Error getting all items from database:', error);
      throw error;
    }
  }

  /**
   * Get all keys from the database
   * 
   * @returns Promise that resolves with an array of all keys
   */
  public async getAllKeys(): Promise<string[]> {
    try {
      const keys = await this.items.toCollection().keys();
      // Convert IndexableTypeArray to string[]
      return keys.map(key => String(key));
    } catch (error) {
      console.error('Error getting all keys from database:', error);
      throw error;
    }
  }
}

// Export a singleton instance of the SyncDatabase
export const syncDb = new SyncDatabase();