use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Emitter};

/// Represents a structured event payload for inter-window communication
#[derive(Clone, Serialize, Deserialize)]
pub struct EventPayload {
    /// The type of event being sent
    pub event_type: String,
    /// The data associated with the event
    pub data: serde_json::Value,
}

/// EventManager is responsible for handling event broadcasting between windows
/// in a Tauri application. It provides methods for sending events to specific
/// windows or broadcasting to all windows.
pub struct EventManager {
    /// The Tauri app handle
    app_handle: AppHandle,
}

impl EventManager {
    /// Create a new EventManager instance
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }

    /// Broadcast an event to all windows
    ///
    /// # Arguments
    ///
    /// * `event_name` - The name of the event to emit
    /// * `payload` - The event payload to send
    ///
    /// # Returns
    ///
    /// * `Result<(), String>` - Ok if successful, Err with error message otherwise
    pub fn emit_to_all(&self, event_name: &str, payload: EventPayload) -> Result<(), String> {
        self.app_handle
            .emit(event_name, payload)
            .map_err(|e| format!("Failed to emit event: {}", e))
    }

    /// Send an event to a specific window
    ///
    /// # Arguments
    ///
    /// * `window_label` - The label of the target window
    /// * `event_name` - The name of the event to emit
    /// * `payload` - The event payload to send
    ///
    /// # Returns
    ///
    /// * `Result<(), String>` - Ok if successful, Err with error message otherwise
    pub fn emit_to_window(&self, window_label: &str, event_name: &str, payload: EventPayload) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window(window_label) {
            window
                .emit(event_name, payload)
                .map_err(|e| format!("Failed to emit event to window {}: {}", window_label, e))
        } else {
            Err(format!("Window {} not found", window_label))
        }
    }
}