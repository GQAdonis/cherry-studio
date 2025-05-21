use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tauri::{AppHandle, Manager, Emitter};

/// Represents a setting schema with validation rules
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingSchema {
    /// The type of the setting (string, number, boolean, etc.)
    pub setting_type: String,
    /// The default value for the setting
    pub default_value: Value,
    /// Optional minimum value for number settings
    pub min: Option<f64>,
    /// Optional maximum value for number settings
    pub max: Option<f64>,
    /// Optional allowed values for enum settings
    pub allowed_values: Option<Vec<Value>>,
    /// Optional description of the setting
    pub description: Option<String>,
}

/// Represents a category of settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingCategory {
    /// The name of the category
    pub name: String,
    /// The icon for the category
    pub icon: Option<String>,
    /// The description of the category
    pub description: Option<String>,
    /// The order of the category in the UI
    pub order: Option<i32>,
}

/// The main settings manager that handles reading, writing, and validating settings
pub struct SettingsManager {
    /// The app handle for accessing Tauri app resources
    app_handle: AppHandle,
    /// The current settings values
    settings: Mutex<HashMap<String, Value>>,
    /// The schema for validating settings
    schema: Mutex<HashMap<String, SettingSchema>>,
    /// The categories for organizing settings
    categories: Mutex<HashMap<String, SettingCategory>>,
    /// The path to the settings file
    settings_file_path: PathBuf,
}

impl SettingsManager {
    /// Create a new SettingsManager instance
    pub fn new(app_handle: AppHandle) -> Self {
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .expect("Failed to get app data directory");
        
        // Create the app data directory if it doesn't exist
        fs::create_dir_all(&app_dir).expect("Failed to create app data directory");
        
        let settings_file_path = app_dir.join("settings.json");
        
        let manager = Self {
            app_handle,
            settings: Mutex::new(HashMap::new()),
            schema: Mutex::new(HashMap::new()),
            categories: Mutex::new(HashMap::new()),
            settings_file_path,
        };
        
        // Initialize default settings and schema
        manager.initialize_default_settings();
        
        // Try to load settings from disk
        if let Err(e) = manager.load_settings() {
            println!("Failed to load settings: {}", e);
            // If loading fails, save the default settings
            if let Err(e) = manager.save_settings() {
                println!("Failed to save default settings: {}", e);
            }
        }
        
        manager
    }
    
    /// Initialize default settings and schema
    fn initialize_default_settings(&self) {
        // Initialize categories
        let mut categories = self.categories.lock().expect("Failed to lock categories");
        
        categories.insert("general".to_string(), SettingCategory {
            name: "General".to_string(),
            icon: Some("settings".to_string()),
            description: Some("General application settings".to_string()),
            order: Some(1),
        });
        
        categories.insert("window".to_string(), SettingCategory {
            name: "Window".to_string(),
            icon: Some("window".to_string()),
            description: Some("Window behavior settings".to_string()),
            order: Some(2),
        });
        
        categories.insert("miniapp".to_string(), SettingCategory {
            name: "Mini Apps".to_string(),
            icon: Some("apps".to_string()),
            description: Some("Mini-app settings and permissions".to_string()),
            order: Some(3),
        });
        
        categories.insert("filesystem".to_string(), SettingCategory {
            name: "File System".to_string(),
            icon: Some("folder".to_string()),
            description: Some("File system settings".to_string()),
            order: Some(4),
        });
        
        // Initialize schema
        let mut schema = self.schema.lock().expect("Failed to lock schema");
        
        // General settings
        schema.insert("general.theme".to_string(), SettingSchema {
            setting_type: "string".to_string(),
            default_value: json!("system"),
            min: None,
            max: None,
            allowed_values: Some(vec![json!("light"), json!("dark"), json!("system")]),
            description: Some("Application theme".to_string()),
        });
        
        schema.insert("general.language".to_string(), SettingSchema {
            setting_type: "string".to_string(),
            default_value: json!("en"),
            min: None,
            max: None,
            allowed_values: Some(vec![json!("en"), json!("fr"), json!("es"), json!("de"), json!("zh")]),
            description: Some("Application language".to_string()),
        });
        
        schema.insert("general.notifications".to_string(), SettingSchema {
            setting_type: "boolean".to_string(),
            default_value: json!(true),
            min: None,
            max: None,
            allowed_values: None,
            description: Some("Enable notifications".to_string()),
        });
        
        // Window settings
        schema.insert("window.startMinimized".to_string(), SettingSchema {
            setting_type: "boolean".to_string(),
            default_value: json!(false),
            min: None,
            max: None,
            allowed_values: None,
            description: Some("Start application minimized".to_string()),
        });
        
        schema.insert("window.rememberSize".to_string(), SettingSchema {
            setting_type: "boolean".to_string(),
            default_value: json!(true),
            min: None,
            max: None,
            allowed_values: None,
            description: Some("Remember window size and position".to_string()),
        });
        
        schema.insert("window.launchToTray".to_string(), SettingSchema {
            setting_type: "boolean".to_string(),
            default_value: json!(false),
            min: None,
            max: None,
            allowed_values: None,
            description: Some("Launch application to system tray".to_string()),
        });
        
        // Mini-app settings
        schema.insert("miniapp.defaultApp".to_string(), SettingSchema {
            setting_type: "string".to_string(),
            default_value: json!(""),
            min: None,
            max: None,
            allowed_values: None,
            description: Some("Default mini-app to open on startup".to_string()),
        });
        
        schema.insert("miniapp.allowNotifications".to_string(), SettingSchema {
            setting_type: "boolean".to_string(),
            default_value: json!(true),
            min: None,
            max: None,
            allowed_values: None,
            description: Some("Allow mini-apps to send notifications".to_string()),
        });
        
        schema.insert("miniapp.allowStorage".to_string(), SettingSchema {
            setting_type: "boolean".to_string(),
            default_value: json!(true),
            min: None,
            max: None,
            allowed_values: None,
            description: Some("Allow mini-apps to use local storage".to_string()),
        });
        
        // File system settings
        schema.insert("filesystem.defaultDirectory".to_string(), SettingSchema {
            setting_type: "string".to_string(),
            default_value: json!(""),
            min: None,
            max: None,
            allowed_values: None,
            description: Some("Default directory for file operations".to_string()),
        });
        
        schema.insert("filesystem.rememberLastDirectory".to_string(), SettingSchema {
            setting_type: "boolean".to_string(),
            default_value: json!(true),
            min: None,
            max: None,
            allowed_values: None,
            description: Some("Remember last used directory".to_string()),
        });
        
        schema.insert("filesystem.showHiddenFiles".to_string(), SettingSchema {
            setting_type: "boolean".to_string(),
            default_value: json!(false),
            min: None,
            max: None,
            allowed_values: None,
            description: Some("Show hidden files in file browser".to_string()),
        });
        
        // Initialize settings with default values
        let mut settings = self.settings.lock().expect("Failed to lock settings");
        
        for (key, schema_item) in schema.iter() {
            settings.insert(key.clone(), schema_item.default_value.clone());
        }
    }
    
    /// Load settings from disk
    pub fn load_settings(&self) -> Result<(), String> {
        if !self.settings_file_path.exists() {
            return Ok(());
        }
        
        let settings_str = fs::read_to_string(&self.settings_file_path)
            .map_err(|e| format!("Failed to read settings file: {}", e))?;
        
        let loaded_settings: HashMap<String, Value> = serde_json::from_str(&settings_str)
            .map_err(|e| format!("Failed to parse settings JSON: {}", e))?;
        
        let mut settings = self.settings.lock().map_err(|_| "Failed to lock settings")?;
        let schema = self.schema.lock().map_err(|_| "Failed to lock schema")?;
        
        // Only load settings that are in the schema
        for (key, value) in loaded_settings {
            if schema.contains_key(&key) {
                // Validate the setting before loading it
                if let Err(err) = self.validate_setting(&key, &value, &schema) {
                    eprintln!("Invalid setting {}: {}. Using default value.", key, err);
                    continue;
                }
                settings.insert(key, value);
            }
        }
        
        Ok(())
    }
    
    /// Save settings to disk
    pub fn save_settings(&self) -> Result<(), String> {
        let settings = self.settings.lock().map_err(|_| "Failed to lock settings")?;
        
        let settings_str = serde_json::to_string_pretty(&*settings)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;
        
        fs::write(&self.settings_file_path, settings_str)
            .map_err(|e| format!("Failed to write settings file: {}", e))?;
        
        Ok(())
    }
    
    /// Validate a setting against its schema
    fn validate_setting(
        &self,
        key: &str,
        value: &Value,
        schema: &HashMap<String, SettingSchema>,
    ) -> Result<(), String> {
        let schema_item = schema.get(key).ok_or_else(|| format!("No schema for setting: {}", key))?;
        
        match schema_item.setting_type.as_str() {
            "string" => {
                if !value.is_string() {
                    return Err(format!("Setting {} must be a string", key));
                }
                
                if let Some(allowed_values) = &schema_item.allowed_values {
                    if !allowed_values.contains(value) {
                        return Err(format!(
                            "Setting {} must be one of the allowed values: {:?}",
                            key,
                            allowed_values
                        ));
                    }
                }
            }
            "number" => {
                if !value.is_number() {
                    return Err(format!("Setting {} must be a number", key));
                }
                
                let num_value = value.as_f64().unwrap();
                
                if let Some(min) = schema_item.min {
                    if num_value < min {
                        return Err(format!("Setting {} must be at least {}", key, min));
                    }
                }
                
                if let Some(max) = schema_item.max {
                    if num_value > max {
                        return Err(format!("Setting {} must be at most {}", key, max));
                    }
                }
                
                if let Some(allowed_values) = &schema_item.allowed_values {
                    if !allowed_values.contains(value) {
                        return Err(format!(
                            "Setting {} must be one of the allowed values: {:?}",
                            key,
                            allowed_values
                        ));
                    }
                }
            }
            "boolean" => {
                if !value.is_boolean() {
                    return Err(format!("Setting {} must be a boolean", key));
                }
            }
            "array" => {
                if !value.is_array() {
                    return Err(format!("Setting {} must be an array", key));
                }
            }
            "object" => {
                if !value.is_object() {
                    return Err(format!("Setting {} must be an object", key));
                }
            }
            _ => {
                return Err(format!("Unknown setting type: {}", schema_item.setting_type));
            }
        }
        
        Ok(())
    }
    
    /// Get a setting value
    pub fn get_setting(&self, key: &str) -> Result<Option<Value>, String> {
        let settings = self.settings.lock().map_err(|_| "Failed to lock settings")?;
        Ok(settings.get(key).cloned())
    }
    
    /// Set a setting value
    pub fn set_setting(&self, key: &str, value: Value) -> Result<(), String> {
        let schema = self.schema.lock().map_err(|_| "Failed to lock schema")?;
        
        // Validate the setting
        self.validate_setting(key, &value, &schema)?;
        
        // Update the setting
        let mut settings = self.settings.lock().map_err(|_| "Failed to lock settings")?;
        settings.insert(key.to_string(), value);
        
        // Save settings to disk
        drop(settings); // Release the lock before saving
        self.save_settings()?;
        
        // Emit an event to notify all windows of the setting change
        let setting_value = self.get_setting(key)?;
        let event_payload = json!({
            "key": key,
            "value": setting_value
        });
        
        self.app_handle.emit("setting-changed", event_payload)
            .map_err(|e| format!("Failed to emit setting-changed event: {}", e))?;
        
        Ok(())
    }
    
    /// Reset a setting to its default value
    pub fn reset_setting(&self, key: &str) -> Result<(), String> {
        let schema = self.schema.lock().map_err(|_| "Failed to lock schema")?;
        
        let default_value = schema
            .get(key)
            .ok_or_else(|| format!("No schema for setting: {}", key))?
            .default_value
            .clone();
        
        self.set_setting(key, default_value)
    }
    
    /// Get all settings
    pub fn get_all_settings(&self) -> Result<HashMap<String, Value>, String> {
        let settings = self.settings.lock().map_err(|_| "Failed to lock settings")?;
        Ok(settings.clone())
    }
    
    /// Reset all settings to their default values
    pub fn reset_all_settings(&self) -> Result<(), String> {
        let schema = self.schema.lock().unwrap();
        let mut settings = self.settings.lock().unwrap();
        
        // Reset all settings to their default values
        for (key, schema_entry) in schema.iter() {
            settings.insert(key.clone(), schema_entry.default_value.clone());
        }
        
        // Save the settings
        drop(settings);
        self.save_settings()?;
        
        // Emit an event to notify the frontend
        self.app_handle.emit("settings-reset", json!({}))
            .map_err(|e| format!("Failed to emit settings-reset event: {}", e))?;
        
        Ok(())
    }
    
    /// Get the schema for all settings
    pub fn get_schema(&self) -> Result<HashMap<String, SettingSchema>, String> {
        let schema = self.schema.lock().unwrap();
        Ok(schema.clone())
    }
    
    /// Get the schema for a specific setting
    pub fn get_setting_schema(&self, key: &str) -> Result<Option<SettingSchema>, String> {
        let schema = self.schema.lock().unwrap();
        Ok(schema.get(key).cloned())
    }
    
    /// Get all setting categories
    pub fn get_categories(&self) -> Result<HashMap<String, SettingCategory>, String> {
        let categories = self.categories.lock().unwrap();
        Ok(categories.clone())
    }
    
    /// Get a specific setting category
    pub fn get_category(&self, key: &str) -> Result<Option<SettingCategory>, String> {
        let categories = self.categories.lock().unwrap();
        Ok(categories.get(key).cloned())
    }
}
