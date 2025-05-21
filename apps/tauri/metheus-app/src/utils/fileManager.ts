import { invoke } from './tauri';

/**
 * Represents file metadata
 */
export interface FileMetadata {
  name: string;
  path: string;
  size: number;
  isDir: boolean;
  createdAt: number;
  modifiedAt: number;
  fileType: string;
}

/**
 * FileManager provides a clean API for file system operations
 */
export class FileManager {
  /**
   * Cache for file metadata
   */
  private metadataCache: Map<string, FileMetadata> = new Map();

  /**
   * Cache for file content
   */
  private contentCache: Map<string, Uint8Array> = new Map();

  /**
   * Maximum number of items to keep in cache
   */
  private maxCacheSize: number = 100;

  /**
   * Create a new FileManager instance
   * @param maxCacheSize Maximum number of items to keep in cache
   */
  constructor(maxCacheSize: number = 100) {
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * Read a file from the file system
   * @param path Path to the file
   * @param useCache Whether to use the cache
   * @returns File content as a Uint8Array
   */
  async readFile(path: string, useCache: boolean = true): Promise<Uint8Array> {
    // Check cache first if enabled
    if (useCache && this.contentCache.has(path)) {
      return this.contentCache.get(path)!;
    }

    try {
      // Invoke Tauri command to read file
      const result = await invoke<number[]>('read_file', { path });
      
      // Convert to Uint8Array
      const content = new Uint8Array(result);
      
      // Update cache
      if (useCache) {
        this.updateContentCache(path, content);
      }
      
      return content;
    } catch (error) {
      console.error('Error reading file:', error);
      throw new Error(`Failed to read file: ${error}`);
    }
  }

  /**
   * Read a file as text
   * @param path Path to the file
   * @param useCache Whether to use the cache
   * @returns File content as a string
   */
  async readTextFile(path: string, useCache: boolean = true): Promise<string> {
    const content = await this.readFile(path, useCache);
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(content);
  }

  /**
   * Write a file to the file system
   * @param path Path to the file
   * @param content File content as a Uint8Array or string
   * @returns Promise that resolves when the file is written
   */
  async writeFile(path: string, content: Uint8Array | string): Promise<void> {
    try {
      let binaryContent: Uint8Array;
      
      // Convert string to Uint8Array if needed
      if (typeof content === 'string') {
        const encoder = new TextEncoder();
        binaryContent = encoder.encode(content);
      } else {
        binaryContent = content;
      }
      
      // Invoke Tauri command to write file
      await invoke('write_file', { 
        path, 
        content: Array.from(binaryContent) 
      });
      
      // Update cache
      this.updateContentCache(path, binaryContent);
      
      // Invalidate metadata cache for this file
      this.metadataCache.delete(path);
    } catch (error) {
      console.error('Error writing file:', error);
      throw new Error(`Failed to write file: ${error}`);
    }
  }

  /**
   * List files in a directory
   * @param path Path to the directory
   * @returns Array of file metadata
   */
  async listDirectory(path: string): Promise<FileMetadata[]> {
    try {
      // Invoke Tauri command to list directory
      const files = await invoke<FileMetadata[]>('list_directory', { path });
      
      // Update metadata cache
      for (const file of files) {
        this.metadataCache.set(file.path, file);
      }
      
      return files;
    } catch (error) {
      console.error('Error listing directory:', error);
      throw new Error(`Failed to list directory: ${error}`);
    }
  }

  /**
   * Create a new directory
   * @param path Path to the directory
   * @returns Promise that resolves when the directory is created
   */
  async createDirectory(path: string): Promise<void> {
    try {
      // Invoke Tauri command to create directory
      await invoke('create_directory', { path });
    } catch (error) {
      console.error('Error creating directory:', error);
      throw new Error(`Failed to create directory: ${error}`);
    }
  }

  /**
   * Delete a file or directory
   * @param path Path to the file or directory
   * @returns Promise that resolves when the file or directory is deleted
   */
  async deleteFile(path: string): Promise<void> {
    try {
      // Invoke Tauri command to delete file
      await invoke('delete_file', { path });
      
      // Remove from caches
      this.contentCache.delete(path);
      this.metadataCache.delete(path);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  /**
   * Get metadata for a file
   * @param path Path to the file
   * @param useCache Whether to use the cache
   * @returns File metadata
   */
  async getFileMetadata(path: string, useCache: boolean = true): Promise<FileMetadata> {
    // Check cache first if enabled
    if (useCache && this.metadataCache.has(path)) {
      return this.metadataCache.get(path)!;
    }

    try {
      // Invoke Tauri command to get file metadata
      const metadata = await invoke<FileMetadata>('get_file_metadata', { path });
      
      // Update cache
      if (useCache) {
        this.updateMetadataCache(path, metadata);
      }
      
      return metadata;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error(`Failed to get file metadata: ${error}`);
    }
  }

  /**
   * Copy a file
   * @param source Source path
   * @param destination Destination path
   * @returns Promise that resolves when the file is copied
   */
  async copyFile(source: string, destination: string): Promise<void> {
    try {
      // Invoke Tauri command to copy file
      await invoke('copy_file', { source, destination });
      
      // Invalidate caches for destination
      this.contentCache.delete(destination);
      this.metadataCache.delete(destination);
    } catch (error) {
      console.error('Error copying file:', error);
      throw new Error(`Failed to copy file: ${error}`);
    }
  }

  /**
   * Move a file
   * @param source Source path
   * @param destination Destination path
   * @returns Promise that resolves when the file is moved
   */
  async moveFile(source: string, destination: string): Promise<void> {
    try {
      // Invoke Tauri command to move file
      await invoke('move_file', { source, destination });
      
      // Update caches
      if (this.contentCache.has(source)) {
        const content = this.contentCache.get(source)!;
        this.contentCache.set(destination, content);
        this.contentCache.delete(source);
      }
      
      if (this.metadataCache.has(source)) {
        const metadata = this.metadataCache.get(source)!;
        const updatedMetadata = { ...metadata, path: destination };
        this.metadataCache.set(destination, updatedMetadata);
        this.metadataCache.delete(source);
      }
    } catch (error) {
      console.error('Error moving file:', error);
      throw new Error(`Failed to move file: ${error}`);
    }
  }

  /**
   * Check if a file exists
   * @param path Path to the file
   * @returns True if the file exists, false otherwise
   */
  async fileExists(path: string): Promise<boolean> {
    try {
      // Invoke Tauri command to check if file exists
      return await invoke<boolean>('file_exists', { path });
    } catch (error) {
      console.error('Error checking if file exists:', error);
      throw new Error(`Failed to check if file exists: ${error}`);
    }
  }

  /**
   * Check if a path is a directory
   * @param path Path to check
   * @returns True if the path is a directory, false otherwise
   */
  async isDirectory(path: string): Promise<boolean> {
    try {
      // Invoke Tauri command to check if path is a directory
      return await invoke<boolean>('is_directory', { path });
    } catch (error) {
      console.error('Error checking if path is a directory:', error);
      throw new Error(`Failed to check if path is a directory: ${error}`);
    }
  }

  /**
   * Clear the file cache
   * @returns Promise that resolves when the cache is cleared
   */
  async clearCache(): Promise<void> {
    try {
      // Clear local caches
      this.contentCache.clear();
      this.metadataCache.clear();
      
      // Invoke Tauri command to clear backend cache
      await invoke('clear_file_cache');
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw new Error(`Failed to clear cache: ${error}`);
    }
  }

  /**
   * Update the content cache
   * @param path File path
   * @param content File content
   */
  private updateContentCache(path: string, content: Uint8Array): void {
    // Check if cache is full
    if (this.contentCache.size >= this.maxCacheSize) {
      // Remove oldest entry (first key)
      const firstKey = this.contentCache.keys().next().value;
      this.contentCache.delete(firstKey);
    }
    
    // Add to cache
    this.contentCache.set(path, content);
  }

  /**
   * Update the metadata cache
   * @param path File path
   * @param metadata File metadata
   */
  private updateMetadataCache(path: string, metadata: FileMetadata): void {
    // Check if cache is full
    if (this.metadataCache.size >= this.maxCacheSize) {
      // Remove oldest entry (first key)
      const firstKey = this.metadataCache.keys().next().value;
      this.metadataCache.delete(firstKey);
    }
    
    // Add to cache
    this.metadataCache.set(path, metadata);
  }
}

// Export singleton instance
export const fileManager = new FileManager();
export default fileManager;
