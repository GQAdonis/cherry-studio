use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, WebviewWindowBuilder, WebviewUrl};
use std::path::PathBuf;

/// Represents a mini-app configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MiniAppConfig {
    /// Unique identifier for the mini-app
    pub id: String,
    /// Display name of the mini-app
    pub name: String,
    /// URL or HTML content of the mini-app
    pub url: String,
    /// Optional icon for the mini-app
    pub icon: Option<String>,
    /// Additional metadata for the mini-app
    pub metadata: MiniAppMetadata,
}

/// Represents the metadata for a mini-app
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MiniAppMetadata {
    /// Fallback URLs to try if the primary URL fails to load
    #[serde(default)]
    pub fallback_urls: Vec<String>,
    /// Web preferences for the webview
    #[serde(default)]
    pub web_preferences: WebPreferences,
    /// Loading behavior configuration
    #[serde(default)]
    pub loading_behavior: LoadingBehavior,
    /// Link handling configuration
    #[serde(default)]
    pub link_handling: LinkHandling,
    /// UI configuration
    #[serde(default)]
    pub ui: UiConfig,
    /// Browser capabilities configuration
    #[serde(default)]
    pub browser_capabilities: BrowserCapabilities,
    /// Additional app-specific settings
    #[serde(default)]
    pub settings: HashMap<String, serde_json::Value>,
}

/// Web preferences for the webview
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WebPreferences {
    /// Whether to enable sandbox
    #[serde(default)]
    pub sandbox: bool,
    /// Whether to enable context isolation
    #[serde(default = "default_true")]
    pub context_isolation: bool,
    /// Whether to enable web security
    #[serde(default = "default_true")]
    pub web_security: bool,
    /// Whether to allow running insecure content
    #[serde(default)]
    pub allow_running_insecure_content: bool,
    /// Whether to enable node integration
    #[serde(default)]
    pub node_integration: bool,
    /// Whether to enable node integration in subframes
    #[serde(default)]
    pub node_integration_in_subframes: bool,
    /// Whether to enable plugins
    #[serde(default)]
    pub plugins: bool,
    /// Whether to enable experimental features
    #[serde(default)]
    pub experimental_features: bool,
    /// Whether to enable background throttling
    #[serde(default = "default_true")]
    pub background_throttling: bool,
    /// Whether to enable offscreen rendering
    #[serde(default)]
    pub offscreen: bool,
}

/// Loading behavior configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LoadingBehavior {
    /// Whether to prioritize file:// URLs when loading
    #[serde(default)]
    pub prioritize_file_urls: bool,
    /// Special load options for URLs
    #[serde(default)]
    pub load_options: HashMap<String, serde_json::Value>,
    /// JavaScript to execute after loading to ensure content visibility
    #[serde(default)]
    pub visibility_script: String,
    /// Whether to load a blank page first before loading the actual URL
    #[serde(default)]
    pub load_blank_first: bool,
    /// Whether to inject custom CSS
    #[serde(default)]
    pub inject_css: String,
    /// Whether to attach the view immediately after creation
    #[serde(default)]
    pub attach_immediately: bool,
    /// Whether to periodically check visibility and ensure content is displayed
    #[serde(default)]
    pub periodic_visibility_check: bool,
}

/// Link handling configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LinkHandling {
    /// Special handling for navigation events
    #[serde(default)]
    pub handle_navigation: bool,
    /// URL patterns that should always open externally
    #[serde(default)]
    pub external_url_patterns: Vec<String>,
    /// URL patterns that should always open internally
    #[serde(default)]
    pub internal_url_patterns: Vec<String>,
}

/// UI configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UiConfig {
    /// Center the content in the window
    #[serde(default)]
    pub center_content: bool,
    /// Set max width for the content
    pub max_content_width: Option<u32>,
    /// Background color
    #[serde(default = "default_background_color")]
    pub background_color: String,
    /// Content padding
    #[serde(default)]
    pub content_padding: ContentPadding,
}

/// Content padding configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ContentPadding {
    /// Top padding
    #[serde(default)]
    pub top: u32,
    /// Right padding
    #[serde(default)]
    pub right: u32,
    /// Bottom padding
    #[serde(default)]
    pub bottom: u32,
    /// Left padding
    #[serde(default)]
    pub left: u32,
}

/// Browser capabilities configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct BrowserCapabilities {
    /// Allow localStorage API
    #[serde(default = "default_true")]
    pub allow_local_storage: bool,
    /// Allow IndexedDB API
    #[serde(default = "default_true")]
    pub allow_indexed_db: bool,
    /// Allow all browser APIs without restrictions
    #[serde(default)]
    pub allow_all_apis: bool,
}

/// Represents the bounds of a mini-app webview
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MiniAppBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// Represents the state of a mini-app
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MiniAppState {
    /// Mini-app is not loaded
    NotLoaded,
    /// Mini-app is loading
    Loading,
    /// Mini-app is loaded but hidden
    Loaded,
    /// Mini-app is visible
    Visible,
    /// Mini-app has encountered an error
    Error(String),
}

/// MiniAppManager is responsible for managing mini-apps in a Tauri application.
/// It handles creation, loading, showing, hiding, and unloading of mini-apps.
/// This implementation is thread-safe and can be used with Tauri commands.
pub struct MiniAppManager {
    /// The Tauri app handle
    app_handle: AppHandle,
    /// Map of mini-app IDs to their configurations
    configs: Arc<Mutex<HashMap<String, MiniAppConfig>>>,
    /// Map of mini-app IDs to their states
    states: Arc<Mutex<HashMap<String, MiniAppState>>>,
    /// Map of mini-app IDs to their bounds
    bounds: Arc<Mutex<HashMap<String, MiniAppBounds>>>,
    /// The currently active mini-app ID
    active_miniapp_id: Arc<Mutex<Option<String>>>,
}

// Explicitly implement Send and Sync for MiniAppManager
unsafe impl Send for MiniAppManager {}
unsafe impl Sync for MiniAppManager {}

impl MiniAppManager {
    /// Create a new MiniAppManager instance
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            configs: Arc::new(Mutex::new(HashMap::new())),
            states: Arc::new(Mutex::new(HashMap::new())),
            bounds: Arc::new(Mutex::new(HashMap::new())),
            active_miniapp_id: Arc::new(Mutex::new(None)),
        }
    }

    /// Register a mini-app configuration
    pub fn register_miniapp(&self, config: MiniAppConfig) -> Result<(), String> {
        let mut configs = self.configs.lock().unwrap();
        let mut states = self.states.lock().unwrap();

        // Store the configuration
        configs.insert(config.id.clone(), config.clone());
        // Initialize the state as NotLoaded
        states.insert(config.id.clone(), MiniAppState::NotLoaded);

        Ok(())
    }

    /// Get a mini-app configuration by ID
    pub fn get_miniapp_config(&self, app_id: &str) -> Option<MiniAppConfig> {
        self.configs.lock().unwrap().get(app_id).cloned()
    }

    /// Get all registered mini-app configurations
    pub fn get_all_miniapp_configs(&self) -> Vec<MiniAppConfig> {
        self.configs.lock().unwrap().values().cloned().collect()
    }

    /// Load a mini-app into a webview
    pub fn load_miniapp(&self, app_id: &str) -> Result<(), String> {
        // Check if the mini-app is already loaded
        let state = self.states.lock().unwrap().get(app_id).cloned();
        match state {
            Some(MiniAppState::Loaded) | Some(MiniAppState::Visible) => {
                return Err(format!("Mini-app {} is already loaded", app_id));
            }
            _ => {}
        }

        // Get the mini-app configuration
        let config = self.get_miniapp_config(app_id)
            .ok_or_else(|| format!("Mini-app configuration for {} not found", app_id))?;

        // Update the state to Loading
        self.states.lock().unwrap().insert(app_id.to_string(), MiniAppState::Loading);

        // Create the webview window
        let webview = WebviewWindowBuilder::new(&self.app_handle, app_id, WebviewUrl::App(PathBuf::from(config.url.clone())))
            .title(config.name.clone())
            .visible(false) // Start hidden until explicitly shown
            .decorations(false) // No window decorations
            .always_on_top(false) // Not always on top by default
            .build()
            .map_err(|e| {
                // Update the state to Error
                self.states.lock().unwrap().insert(app_id.to_string(), MiniAppState::Error(e.to_string()));
                format!("Failed to create webview: {}", e)
            })?;

        // Get the main window to set as parent
        if let Some(main_window) = self.app_handle.get_webview_window("main") {
            // Set the parent window - Note: set_parent is not available in Tauri 2.x
            // Instead, we'll position it relative to the main window
            let _ = webview.set_focus();
        }

        // Execute the visibility script if provided
        if !config.metadata.loading_behavior.visibility_script.is_empty() {
            let script = config.metadata.loading_behavior.visibility_script.clone();
            webview.eval(&script)
                .map_err(|e| format!("Failed to execute visibility script: {}", e))?;
        }

        // Inject CSS if provided
        if !config.metadata.loading_behavior.inject_css.is_empty() {
            let css = config.metadata.loading_behavior.inject_css.clone();
            let script = format!(
                r#"
                (function() {{
                    const style = document.createElement('style');
                    style.textContent = `{}`;
                    document.head.appendChild(style);
                }})();
                "#,
                css
            );
            webview.eval(&script)
                .map_err(|e| format!("Failed to inject CSS: {}", e))?;
        }

        // Update the state to Loaded
        self.states.lock().unwrap().insert(app_id.to_string(), MiniAppState::Loaded);

        Ok(())
    }

    /// Show a mini-app with specific positioning
    pub fn show_miniapp(&self, app_id: &str, bounds: MiniAppBounds) -> Result<(), String> {
        // Check if the mini-app is loaded
        let state = self.states.lock().unwrap().get(app_id).cloned();
        match state {
            Some(MiniAppState::NotLoaded) | Some(MiniAppState::Loading) | None => {
                return Err(format!("Mini-app {} is not loaded", app_id));
            }
            Some(MiniAppState::Error(e)) => {
                return Err(format!("Mini-app {} has an error: {}", app_id, e));
            }
            _ => {}
        }

        // Store the bounds for future reference
        self.bounds.lock().unwrap().insert(app_id.to_string(), bounds.clone());

        // Get the webview window
        let webview = self.app_handle.get_webview_window(app_id)
            .ok_or_else(|| format!("Webview for mini-app {} not found", app_id))?;

        // Get the main window to calculate relative position
        let main_window = self.app_handle.get_webview_window("main")
            .ok_or_else(|| "Main window not found".to_string())?;

        // Get the main window position
        let main_position = main_window.outer_position()
            .map_err(|e| format!("Failed to get main window position: {}", e))?;

        // Calculate absolute position
        let absolute_x = main_position.x as f64 + bounds.x;
        let absolute_y = main_position.y as f64 + bounds.y;

        // Set position and size
        webview.set_position(tauri::PhysicalPosition::new(absolute_x, absolute_y))
            .map_err(|e| format!("Failed to set position: {}", e))?;
        webview.set_size(tauri::PhysicalSize::new(bounds.width, bounds.height))
            .map_err(|e| format!("Failed to set size: {}", e))?;

        // Make the webview visible
        webview.set_visible_on_all_workspaces(true)
            .map_err(|e| format!("Failed to set visibility on all workspaces: {}", e))?;
        
        // Show the webview
        webview.show()
            .map_err(|e| format!("Failed to show webview: {}", e))?;

        // Update the state to Visible
        self.states.lock().unwrap().insert(app_id.to_string(), MiniAppState::Visible);

        // Set this as the active mini-app
        self.set_active_miniapp(app_id)?;

        Ok(())
    }

    /// Hide a mini-app
    pub fn hide_miniapp(&self, app_id: &str) -> Result<(), String> {
        // Check if the mini-app is visible
        let state = self.states.lock().unwrap().get(app_id).cloned();
        match state {
            Some(MiniAppState::Visible) => {}
            _ => {
                return Err(format!("Mini-app {} is not visible", app_id));
            }
        }

        // Get the webview window
        let webview = self.app_handle.get_webview_window(app_id)
            .ok_or_else(|| format!("Webview for mini-app {} not found", app_id))?;

        // Hide the webview
        webview.hide()
            .map_err(|e| format!("Failed to hide webview: {}", e))?;

        // Update the state to Loaded
        self.states.lock().unwrap().insert(app_id.to_string(), MiniAppState::Loaded);

        // If this was the active mini-app, clear the active mini-app ID
        let mut active_id = self.active_miniapp_id.lock().unwrap();
        if active_id.as_ref().map_or(false, |id| id == app_id) {
            *active_id = None;
        }

        Ok(())
    }

    /// Unload a mini-app
    pub fn unload_miniapp(&self, app_id: &str) -> Result<(), String> {
        // Check if the mini-app is loaded or visible
        let state = self.states.lock().unwrap().get(app_id).cloned();
        match state {
            Some(MiniAppState::Loaded) | Some(MiniAppState::Visible) => {}
            _ => {
                return Err(format!("Mini-app {} is not loaded", app_id));
            }
        }

        // Get the webview window
        let webview = self.app_handle.get_webview_window(app_id)
            .ok_or_else(|| format!("Webview for mini-app {} not found", app_id))?;

        // Close the webview
        webview.close()
            .map_err(|e| format!("Failed to close webview: {}", e))?;

        // Update the state to NotLoaded
        self.states.lock().unwrap().insert(app_id.to_string(), MiniAppState::NotLoaded);

        // Remove the bounds
        self.bounds.lock().unwrap().remove(app_id);

        // If this was the active mini-app, clear the active mini-app ID
        let mut active_id = self.active_miniapp_id.lock().unwrap();
        if active_id.as_ref().map_or(false, |id| id == app_id) {
            *active_id = None;
        }

        Ok(())
    }

    /// Set a mini-app as the active one (bring to front for z-order management)
    pub fn set_active_miniapp(&self, app_id: &str) -> Result<(), String> {
        // Check if the mini-app is visible
        let state = self.states.lock().unwrap().get(app_id).cloned();
        match state {
            Some(MiniAppState::Visible) => {}
            _ => {
                return Err(format!("Mini-app {} is not visible", app_id));
            }
        }

        // Get the webview window
        let webview = self.app_handle.get_webview_window(app_id)
            .ok_or_else(|| format!("Webview for mini-app {} not found", app_id))?;

        // First, lower the z-order of all other webviews
        for (id, state) in self.states.lock().unwrap().iter() {
            if id != app_id && matches!(state, MiniAppState::Visible) {
                if let Some(window) = self.app_handle.get_webview_window(id) {
                    // Set a lower z-order
                    let _ = window.set_always_on_bottom(true);
                }
            }
        }

        // Then, raise the z-order of the active webview
        webview.set_always_on_bottom(false)
            .map_err(|e| format!("Failed to set z-order: {}", e))?;
        webview.set_focus()
            .map_err(|e| format!("Failed to set focus: {}", e))?;

        // Update the active mini-app ID
        *self.active_miniapp_id.lock().unwrap() = Some(app_id.to_string());

        Ok(())
    }

    /// Update mini-app positions on window resize
    pub fn resize_all_miniapps(&self) -> Result<(), String> {
        // First collect all the information we need without holding locks
        let resize_info: Vec<(String, MiniAppBounds)> = {
            let bounds = self.bounds.lock().map_err(|e| format!("Failed to lock bounds: {}", e))?;
            let states = self.states.lock().map_err(|e| format!("Failed to lock states: {}", e))?;
            
            states.iter()
                .filter_map(|(app_id, state)| {
                    // Only include visible mini-apps
                    if matches!(state, MiniAppState::Visible) {
                        if let Some(app_bounds) = bounds.get(app_id) {
                            Some((app_id.clone(), app_bounds.clone()))
                        } else {
                            None
                        }
                    } else {
                        None
                    }
                })
                .collect()
        };
        
        // Get the main window position once
        let main_position = if let Some(_main_window) = self.app_handle.get_webview_window("main") {
            _main_window.outer_position().ok()
        } else {
            None
        };
        
        // Now apply the resizing without holding any locks
        for (app_id, bounds) in resize_info {
            if let Some(webview) = self.app_handle.get_webview_window(&app_id) {
                if let Some(main_pos) = &main_position {
                    // Calculate absolute position
                    let absolute_x = main_pos.x as f64 + bounds.x;
                    let absolute_y = main_pos.y as f64 + bounds.y;
                    
                    // Set position and size
                    let _ = webview.set_position(tauri::PhysicalPosition::new(absolute_x, absolute_y));
                    let _ = webview.set_size(tauri::PhysicalSize::new(bounds.width, bounds.height));
                }
            }
        }
        
        Ok(())
    }

    /// Get the state of a mini-app
    pub fn get_miniapp_state(&self, app_id: &str) -> Result<Option<MiniAppState>, String> {
        let states = self.states.lock().map_err(|e| format!("Failed to lock states: {}", e))?;
        Ok(states.get(app_id).cloned())
    }

    /// Get the currently active mini-app ID
    pub fn get_active_miniapp_id(&self) -> Result<Option<String>, String> {
        let active_id = self.active_miniapp_id.lock().map_err(|e| format!("Failed to lock active_miniapp_id: {}", e))?;
        Ok(active_id.clone())
    }

    /// Get all mini-app states
    pub fn get_all_miniapp_states(&self) -> Result<HashMap<String, MiniAppState>, String> {
        let states = self.states.lock().map_err(|e| format!("Failed to lock states: {}", e))?;
        Ok(states.clone())
    }
}

// Helper functions for default values
fn default_true() -> bool {
    true
}

fn default_background_color() -> String {
    "#ffffff".to_string()
}