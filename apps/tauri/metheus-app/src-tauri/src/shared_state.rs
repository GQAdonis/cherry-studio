use std::collections::HashMap;
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// SharedState provides a thread-safe mechanism for storing and retrieving
/// global state that can be accessed across windows in a Tauri application.
/// 
/// It uses a Mutex to ensure thread-safe access to the underlying HashMap.
#[derive(Default)]
pub struct SharedState {
    data: Mutex<HashMap<String, Value>>,
}

impl SharedState {
    /// Create a new SharedState instance
    pub fn new() -> Self {
        Self {
            data: Mutex::new(HashMap::new()),
        }
    }

    /// Set a value in the shared state
    /// 
    /// # Arguments
    /// * `key` - The key to store the value under
    /// * `value` - The value to store
    /// 
    /// # Returns
    /// * `Ok(())` if successful
    /// * `Err(String)` if there was an error acquiring the lock
    pub fn set(&self, key: &str, value: Value) -> Result<(), String> {
        let mut data = self.data.lock().map_err(|_| "Failed to lock shared state")?;
        data.insert(key.to_string(), value);
        Ok(())
    }

    /// Get a value from the shared state
    /// 
    /// # Arguments
    /// * `key` - The key to retrieve the value for
    /// 
    /// # Returns
    /// * `Ok(Some(Value))` if the key exists
    /// * `Ok(None)` if the key does not exist
    /// * `Err(String)` if there was an error acquiring the lock
    pub fn get(&self, key: &str) -> Result<Option<Value>, String> {
        let data = self.data.lock().map_err(|_| "Failed to lock shared state")?;
        Ok(data.get(key).cloned())
    }

    /// Remove a value from the shared state
    /// 
    /// # Arguments
    /// * `key` - The key to remove
    /// 
    /// # Returns
    /// * `Ok(())` if successful
    /// * `Err(String)` if there was an error acquiring the lock
    pub fn remove(&self, key: &str) -> Result<(), String> {
        let mut data = self.data.lock().map_err(|_| "Failed to lock shared state")?;
        data.remove(key);
        Ok(())
    }

    /// Get all keys in the shared state
    /// 
    /// # Returns
    /// * `Ok(Vec<String>)` with all keys
    /// * `Err(String)` if there was an error acquiring the lock
    pub fn get_keys(&self) -> Result<Vec<String>, String> {
        let data = self.data.lock().map_err(|_| "Failed to lock shared state")?;
        Ok(data.keys().cloned().collect())
    }

    /// Clear all values from the shared state
    /// 
    /// # Returns
    /// * `Ok(())` if successful
    /// * `Err(String)` if there was an error acquiring the lock
    pub fn clear(&self) -> Result<(), String> {
        let mut data = self.data.lock().map_err(|_| "Failed to lock shared state")?;
        data.clear();
        Ok(())
    }
}