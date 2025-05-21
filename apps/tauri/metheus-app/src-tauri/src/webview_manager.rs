use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, WebviewWindowBuilder, WebviewUrl};
use serde::{Deserialize, Serialize};

/// Represents the bounds of a webview
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebviewBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// WebviewManager is responsible for managing multiple webviews in a Tauri application.
/// It handles creation, positioning, z-order management, and resizing of webviews.
pub struct WebviewManager {
    /// The Tauri app handle
    app_handle: AppHandle,
    /// Map of webview IDs to WebviewWindow instances
    webviews: Arc<Mutex<HashMap<String, bool>>>, // bool represents if the webview is visible
    /// The currently active webview ID (for z-order management)
    active_webview_id: Arc<Mutex<Option<String>>>,
    /// Last known bounds for each webview (for resizing)
    last_known_bounds: Arc<Mutex<HashMap<String, WebviewBounds>>>,
}

impl WebviewManager {
    /// Create a new WebviewManager instance
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            webviews: Arc::new(Mutex::new(HashMap::new())),
            active_webview_id: Arc::new(Mutex::new(None)),
            last_known_bounds: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Create a new webview with the specified ID and URL
    pub fn create_webview(&self, app_id: &str, url: &str) -> Result<(), String> {
        // Check if a webview with this ID already exists
        if self.webviews.lock().unwrap().contains_key(app_id) {
            return Err(format!("Webview with ID {} already exists", app_id));
        }

        // Create the webview window
        let webview = WebviewWindowBuilder::new(&self.app_handle, app_id, WebviewUrl::App(url.into()))
            .title(app_id)
            .visible(false) // Start hidden until explicitly shown
            .decorations(false) // No window decorations
            .always_on_top(false) // Not always on top by default
            .build()
            .map_err(|e| format!("Failed to create webview: {}", e))?;

        // Get the main window to set as parent
        if let Some(main_window) = self.app_handle.get_webview_window("main") {
            // Set the parent window - Note: set_parent is not available in Tauri 2.x
            // Instead, we'll position it relative to the main window
            let _ = webview.set_focus();
        }

        // Store the webview in our map
        self.webviews.lock().unwrap().insert(app_id.to_string(), false);

        Ok(())
    }

    /// Show a webview with specific positioning
    pub fn show_webview(&self, app_id: &str, bounds: WebviewBounds) -> Result<(), String> {
        // Store the bounds for future reference
        self.last_known_bounds.lock().unwrap().insert(app_id.to_string(), bounds.clone());

        // Get the webview window
        let webview = self.app_handle.get_webview_window(app_id)
            .ok_or_else(|| format!("Webview with ID {} not found", app_id))?;

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
        webview.set_position(PhysicalPosition::new(absolute_x, absolute_y))
            .map_err(|e| format!("Failed to set position: {}", e))?;
        webview.set_size(PhysicalSize::new(bounds.width, bounds.height))
            .map_err(|e| format!("Failed to set size: {}", e))?;

        // Make the webview visible
        webview.set_visible_on_all_workspaces(true)
            .map_err(|e| format!("Failed to set visibility on all workspaces: {}", e))?;
        
        // Show the webview
        webview.show()
            .map_err(|e| format!("Failed to show webview: {}", e))?;

        // Mark this webview as visible in our map
        self.webviews.lock().unwrap().insert(app_id.to_string(), true);

        // Set this as the active webview
        self.set_active_webview(app_id)?;

        Ok(())
    }

    /// Hide a webview
    pub fn hide_webview(&self, app_id: &str) -> Result<(), String> {
        // Get the webview window
        let webview = self.app_handle.get_webview_window(app_id)
            .ok_or_else(|| format!("Webview with ID {} not found", app_id))?;

        // Hide the webview
        webview.hide()
            .map_err(|e| format!("Failed to hide webview: {}", e))?;

        // Mark this webview as not visible in our map
        self.webviews.lock().unwrap().insert(app_id.to_string(), false);

        // If this was the active webview, clear the active webview ID
        let mut active_id = self.active_webview_id.lock().unwrap();
        if active_id.as_ref().map_or(false, |id| id == app_id) {
            *active_id = None;
        }

        Ok(())
    }

    /// Set a webview as the active one (bring to front for z-order management)
    pub fn set_active_webview(&self, app_id: &str) -> Result<(), String> {
        // Get the webview window
        let webview = self.app_handle.get_webview_window(app_id)
            .ok_or_else(|| format!("Webview with ID {} not found", app_id))?;

        // First, lower the z-order of all other webviews
        for (id, &visible) in self.webviews.lock().unwrap().iter() {
            if id != app_id && visible {
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

        // Update the active webview ID
        *self.active_webview_id.lock().unwrap() = Some(app_id.to_string());

        Ok(())
    }

    /// Update webview positions on window resize
    pub fn resize_all_webviews(&self) -> Result<(), String> {
        let bounds = self.last_known_bounds.lock().unwrap();
        let webviews = self.webviews.lock().unwrap();

        for (app_id, &visible) in webviews.iter() {
            // Only resize visible webviews
            if visible {
                if let Some(bounds) = bounds.get(app_id) {
                    // Get the webview window
                    if let Some(webview) = self.app_handle.get_webview_window(app_id) {
                        // Get the main window to calculate relative position
                        if let Some(main_window) = self.app_handle.get_webview_window("main") {
                            // Get the main window position
                            if let Ok(main_position) = main_window.outer_position() {
                                // Calculate absolute position
                                let absolute_x = main_position.x as f64 + bounds.x;
                                let absolute_y = main_position.y as f64 + bounds.y;

                                // Set position and size
                                let _ = webview.set_position(PhysicalPosition::new(absolute_x, absolute_y));
                                let _ = webview.set_size(PhysicalSize::new(bounds.width, bounds.height));
                            }
                        }
                    }
                }
            }
        }

        Ok(())
    }

    /// Close and destroy a webview
    pub fn destroy_webview(&self, app_id: &str) -> Result<(), String> {
        // Get the webview window
        let webview = self.app_handle.get_webview_window(app_id)
            .ok_or_else(|| format!("Webview with ID {} not found", app_id))?;

        // Close the webview
        webview.close()
            .map_err(|e| format!("Failed to close webview: {}", e))?;

        // Remove from our maps
        self.webviews.lock().unwrap().remove(app_id);
        self.last_known_bounds.lock().unwrap().remove(app_id);

        // If this was the active webview, clear the active webview ID
        let mut active_id = self.active_webview_id.lock().unwrap();
        if active_id.as_ref().map_or(false, |id| id == app_id) {
            *active_id = None;
        }

        Ok(())
    }

    /// Get the currently active webview ID
    pub fn get_active_webview_id(&self) -> Option<String> {
        self.active_webview_id.lock().unwrap().clone()
    }

    /// Check if a webview exists
    pub fn has_webview(&self, app_id: &str) -> bool {
        self.webviews.lock().unwrap().contains_key(app_id)
    }

    /// Check if a webview is visible
    pub fn is_webview_visible(&self, app_id: &str) -> bool {
        self.webviews.lock().unwrap().get(app_id).copied().unwrap_or(false)
    }
}