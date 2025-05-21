use std::collections::HashMap;
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

/// Represents file metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
    pub created_at: u64,
    pub modified_at: u64,
    pub file_type: String,
}

/// Represents a cached file
#[derive(Debug, Clone)]
struct CachedFile {
    pub metadata: FileMetadata,
    pub content: Option<Vec<u8>>,
    pub last_accessed: u64,
}

/// FileManager is responsible for managing file system operations in a Tauri application.
/// It handles reading, writing, and managing files and directories.
/// This implementation is thread-safe and can be used with Tauri commands.
pub struct FileManager {
    /// The Tauri app handle
    app_handle: AppHandle,
    /// Cache of recently accessed files
    file_cache: Arc<Mutex<HashMap<String, CachedFile>>>,
    /// Maximum number of files to keep in cache
    max_cache_size: usize,
}

impl FileManager {
    /// Create a new FileManager instance
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            file_cache: Arc::new(Mutex::new(HashMap::new())),
            max_cache_size: 100, // Default cache size
        }
    }

    /// Set the maximum cache size
    pub fn set_max_cache_size(&mut self, size: usize) -> Result<(), String> {
        if size == 0 {
            return Err("Cache size cannot be zero".to_string());
        }
        
        // Update the max cache size
        self.max_cache_size = size;
        
        // Then trim the cache if needed
        self.ensure_cache_size();
        
        Ok(())
    }

    /// Read a file from the file system
    pub fn read_file(&self, path: &str) -> Result<Vec<u8>, String> {
        let path_str = path.to_string();
        
        // Check if file is in cache
        {
            let mut cache = self.file_cache.lock().map_err(|e| format!("Failed to lock file_cache: {}", e))?;
            if let Some(cached_file) = cache.get_mut(&path_str) {
                // Update last accessed time
                cached_file.last_accessed = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();
                
                // Return cached content if available
                if let Some(content) = &cached_file.content {
                    return Ok(content.clone());
                }
            }
        }
        
        // Read file from disk
        let path = Path::new(path);
        let mut file = File::open(path)
            .map_err(|e| format!("Failed to open file: {}", e))?;
        
        let mut content = Vec::new();
        file.read_to_end(&mut content)
            .map_err(|e| format!("Failed to read file: {}", e))?;
        
        // Add to cache
        self.add_to_cache(&path_str, content.clone(), true)?;
        
        Ok(content)
    }

    /// Write a file to the file system
    pub fn write_file(&self, path: &str, content: &[u8]) -> Result<(), String> {
        // Create parent directories if they don't exist
        if let Some(parent) = Path::new(path).parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directories: {}", e))?;
        }
        
        // Write file to disk
        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(path)
            .map_err(|e| format!("Failed to open file for writing: {}", e))?;
        
        file.write_all(content)
            .map_err(|e| format!("Failed to write file: {}", e))?;
        
        // Update cache
        self.add_to_cache(path, content.to_vec(), true)?;
        
        Ok(())
    }

    /// List files in a directory
    pub fn list_directory(&self, path: &str) -> Result<Vec<FileMetadata>, String> {
        let path = Path::new(path);
        
        // Check if path exists and is a directory
        if !path.exists() {
            return Err(format!("Path does not exist: {}", path.display()));
        }
        
        if !path.is_dir() {
            return Err(format!("Path is not a directory: {}", path.display()));
        }
        
        // Read directory entries
        let entries = fs::read_dir(path)
            .map_err(|e| format!("Failed to read directory: {}", e))?;
        
        let mut files = Vec::new();
        
        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
            let metadata = entry.metadata()
                .map_err(|e| format!("Failed to read file metadata: {}", e))?;
            
            let file_path = entry.path();
            let file_name = file_path.file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("Unknown")
                .to_string();
            
            let file_type = if metadata.is_dir() {
                "directory".to_string()
            } else {
                file_path.extension()
                    .and_then(|ext| ext.to_str())
                    .unwrap_or("unknown")
                    .to_string()
            };
            
            let created_at = metadata.created()
                .map(|time| time.duration_since(UNIX_EPOCH).unwrap_or_default().as_secs())
                .unwrap_or(0);
            
            let modified_at = metadata.modified()
                .map(|time| time.duration_since(UNIX_EPOCH).unwrap_or_default().as_secs())
                .unwrap_or(0);
            
            let file_metadata = FileMetadata {
                name: file_name,
                path: file_path.to_string_lossy().to_string(),
                size: metadata.len(),
                is_dir: metadata.is_dir(),
                created_at,
                modified_at,
                file_type,
            };
            
            files.push(file_metadata);
        }
        
        Ok(files)
    }

    /// Create a new directory
    pub fn create_directory(&self, path: &str) -> Result<(), String> {
        fs::create_dir_all(path)
            .map_err(|e| format!("Failed to create directory: {}", e))
    }

    /// Delete a file or directory
    pub fn delete_file(&self, path: &str) -> Result<(), String> {
        let path = Path::new(path);
        
        if !path.exists() {
            return Err(format!("Path does not exist: {}", path.display()));
        }
        
        if path.is_dir() {
            fs::remove_dir_all(path)
                .map_err(|e| format!("Failed to delete directory: {}", e))?;
        } else {
            fs::remove_file(path)
                .map_err(|e| format!("Failed to delete file: {}", e))?;
        }
        
        // Remove from cache if present
        let mut cache = self.file_cache.lock().map_err(|e| format!("Failed to lock file_cache: {}", e))?;
        cache.remove(path.to_string_lossy().as_ref());
        
        Ok(())
    }

    /// Get metadata for a file
    pub fn get_file_metadata(&self, path: &str) -> Result<FileMetadata, String> {
        let path = Path::new(path);
        
        if !path.exists() {
            return Err(format!("Path does not exist: {}", path.display()));
        }
        
        let metadata = fs::metadata(path)
            .map_err(|e| format!("Failed to read file metadata: {}", e))?;
        
        let file_name = path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("Unknown")
            .to_string();
        
        let file_type = if metadata.is_dir() {
            "directory".to_string()
        } else {
            path.extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("unknown")
                .to_string()
        };
        
        let created_at = metadata.created()
            .map(|time| time.duration_since(UNIX_EPOCH).unwrap_or_default().as_secs())
            .unwrap_or(0);
        
        let modified_at = metadata.modified()
            .map(|time| time.duration_since(UNIX_EPOCH).unwrap_or_default().as_secs())
            .unwrap_or(0);
        
        let file_metadata = FileMetadata {
            name: file_name,
            path: path.to_string_lossy().to_string(),
            size: metadata.len(),
            is_dir: metadata.is_dir(),
            created_at,
            modified_at,
            file_type,
        };
        
        Ok(file_metadata)
    }

    /// Add a file to the cache
    fn add_to_cache(&self, path: &str, content: Vec<u8>, store_content: bool) -> Result<(), String> {
        // First get the file metadata without holding the cache lock
        let metadata = self.get_file_metadata(path)?;
        
        // Create cached file
        let cached_file = CachedFile {
            metadata,
            content: if store_content { Some(content) } else { None },
            last_accessed: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        };
        
        // Now acquire the cache lock
        let mut cache = self.file_cache.lock().map_err(|e| format!("Failed to lock file_cache: {}", e))?;
        
        // Check if cache is full
        if cache.len() >= self.max_cache_size && !cache.contains_key(path) {
            // Remove oldest entry
            let oldest = cache.iter()
                .min_by_key(|(_, cached_file)| cached_file.last_accessed)
                .map(|(key, _)| key.clone());
            
            if let Some(key) = oldest {
                cache.remove(&key);
            }
        }
        
        // Add to cache
        cache.insert(path.to_string(), cached_file);
        
        Ok(())
    }

    /// Clear the file cache
    pub fn clear_cache(&self) -> Result<(), String> {
        let mut cache = self.file_cache.lock().map_err(|e| format!("Failed to lock file_cache: {}", e))?;
        cache.clear();
        Ok(())
    }

    /// Ensure the cache doesn't grow too large by removing the oldest entries
    fn ensure_cache_size(&self) {
        let mut cache = match self.file_cache.lock() {
            Ok(cache) => cache,
            Err(e) => {
                eprintln!("Failed to lock file_cache: {}", e);
                return;
            }
        };
        
        // If the cache is not larger than the maximum size, we don't need to do anything
        if cache.len() <= self.max_cache_size {
            return;
        }
        
        // Create a vector of (key, last_accessed) pairs
        let mut entries: Vec<(String, u64)> = cache
            .iter()
            .map(|(k, v)| (k.clone(), v.last_accessed))
            .collect();
        
        // Sort by last accessed time (oldest first)
        entries.sort_by_key(|(_k, last_accessed)| *last_accessed);
        
        // Take the oldest entries that exceed our cache size
        let to_remove = cache.len() - self.max_cache_size;
        let oldest_keys: Vec<String> = entries.iter()
            .take(to_remove)
            .map(|(k, _)| k.clone())
            .collect();
        
        // Remove the oldest entries from the cache
        for key in oldest_keys {
            cache.remove(&key);
        }
    }

    /// Copy a file
    pub fn copy_file(&self, source: &str, destination: &str) -> Result<(), String> {
        // Create parent directories if they don't exist
        if let Some(parent) = Path::new(destination).parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directories: {}", e))?;
        }
        
        fs::copy(source, destination)
            .map_err(|e| format!("Failed to copy file: {}", e))?;
        
        // Update cache if source is cached - using a separate scope to limit the lock duration
        let content_to_cache = {
            let cache = self.file_cache.lock().map_err(|e| format!("Failed to lock file_cache: {}", e))?;
            if let Some(cached_file) = cache.get(source) {
                cached_file.content.clone()
            } else {
                None
            }
        };
        
        // If we have content to cache, add it to the destination cache
        if let Some(content) = content_to_cache {
            self.add_to_cache(destination, content, true)?;
        }
        
        Ok(())
    }

    /// Move a file
    pub fn move_file(&self, source: &str, destination: &str) -> Result<(), String> {
        // Create parent directories if they don't exist
        if let Some(parent) = Path::new(destination).parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directories: {}", e))?;
        }
        
        fs::rename(source, destination)
            .map_err(|e| format!("Failed to move file: {}", e))?;
        
        // Update cache - using a separate scope to limit the lock duration
        {
            let mut cache = self.file_cache.lock().map_err(|e| format!("Failed to lock file_cache: {}", e))?;
            if let Some(cached_file) = cache.remove(source) {
                cache.insert(destination.to_string(), cached_file);
            }
        }
        
        Ok(())
    }

    /// Check if a file exists
    pub fn file_exists(&self, path: &str) -> bool {
        Path::new(path).exists()
    }

    /// Check if a path is a directory
    pub fn is_directory(&self, path: &str) -> bool {
        Path::new(path).is_dir()
    }
}
