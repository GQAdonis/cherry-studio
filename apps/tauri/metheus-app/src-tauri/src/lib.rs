use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tauri::{Manager, State, Emitter, Listener};
use serde_json::Value;

// Import the modules
mod webview_manager;
mod event_manager;
mod tray_manager;
mod shared_state;
mod miniapp_manager;
mod file_manager;
mod settings_manager;
mod v8_agent_runner;
use webview_manager::{WebviewManager, WebviewBounds};
use event_manager::{EventManager, EventPayload};
use tray_manager::TrayManager;
use shared_state::SharedState;
use miniapp_manager::{MiniAppManager, MiniAppConfig, MiniAppBounds, MiniAppState};
use file_manager::{FileManager, FileMetadata};
use settings_manager::{SettingsManager, SettingSchema, SettingCategory};
use v8_agent_runner::{V8AgentRunner, AgentResult, run_agent, load_agent, unload_agent};

// Basic greeting command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// WebviewManager commands

/// Create a new webview with the specified ID and URL
#[tauri::command]
fn create_webview(app_handle: tauri::AppHandle, app_id: String, url: String) -> Result<(), String> {
    let webview_manager = app_handle.state::<WebviewManager>();
    webview_manager.create_webview(&app_id, &url)
}

/// Show a webview with specific positioning
#[tauri::command]
fn show_webview(app_handle: tauri::AppHandle, app_id: String, bounds: WebviewBounds) -> Result<(), String> {
    let webview_manager = app_handle.state::<WebviewManager>();
    webview_manager.show_webview(&app_id, bounds)
}

/// Hide a webview
#[tauri::command]
fn hide_webview(app_handle: tauri::AppHandle, app_id: String) -> Result<(), String> {
    let webview_manager = app_handle.state::<WebviewManager>();
    webview_manager.hide_webview(&app_id)
}

/// Set a webview as the active one (bring to front for z-order management)
#[tauri::command]
fn set_active_webview(app_handle: tauri::AppHandle, app_id: String) -> Result<(), String> {
    let webview_manager = app_handle.state::<WebviewManager>();
    webview_manager.set_active_webview(&app_id)
}

/// Update webview positions on window resize
#[tauri::command]
fn resize_all_webviews(app_handle: tauri::AppHandle) -> Result<(), String> {
    let webview_manager = app_handle.state::<WebviewManager>();
    webview_manager.resize_all_webviews()
}

/// Close and destroy a webview
#[tauri::command]
fn destroy_webview(app_handle: tauri::AppHandle, app_id: String) -> Result<(), String> {
    let webview_manager = app_handle.state::<WebviewManager>();
    webview_manager.destroy_webview(&app_id)
}

/// Get the currently active webview ID
#[tauri::command]
fn get_active_webview_id(app_handle: tauri::AppHandle) -> Option<String> {
    let webview_manager = app_handle.state::<WebviewManager>();
    webview_manager.get_active_webview_id()
}

/// Check if a webview exists
#[tauri::command]
fn has_webview(app_handle: tauri::AppHandle, app_id: String) -> bool {
    let webview_manager = app_handle.state::<WebviewManager>();
    webview_manager.has_webview(&app_id)
}

/// Check if a webview is visible
#[tauri::command]
fn is_webview_visible(app_handle: tauri::AppHandle, app_id: String) -> bool {
    let webview_manager = app_handle.state::<WebviewManager>();
    webview_manager.is_webview_visible(&app_id)
}

// Event communication commands

/// Send a message to a specific window
#[tauri::command]
async fn send_message_to_window(
    app_handle: tauri::AppHandle,
    window_label: String,
    message_type: String,
    message_data: serde_json::Value,
) -> Result<(), String> {
    let event_manager = EventManager::new(app_handle);
    let payload = EventPayload {
        event_type: message_type,
        data: message_data,
    };
    event_manager.emit_to_window(&window_label, "app-message", payload)
}

/// Broadcast a message to all windows
#[tauri::command]
async fn broadcast_message(
    app_handle: tauri::AppHandle,
    message_type: String,
    message_data: serde_json::Value,
) -> Result<(), String> {
    let event_manager = EventManager::new(app_handle);
    let payload = EventPayload {
        event_type: message_type,
        data: message_data,
    };
    event_manager.emit_to_all("app-message", payload)
}

// Store application state
struct AppState {
    active_webview: Mutex<Option<String>>,
}

// Tray-related commands

/// Set the launch to tray setting
#[tauri::command]
fn set_launch_to_tray(app_handle: tauri::AppHandle, value: bool) -> Result<(), String> {
    let tray_manager = app_handle.state::<TrayManager>();
    tray_manager.set_launch_to_tray(value);
    Ok(())
}

/// Get the current launch to tray setting
#[tauri::command]
fn get_launch_to_tray(app_handle: tauri::AppHandle) -> bool {
    let tray_manager = app_handle.state::<TrayManager>();
    tray_manager.get_launch_to_tray()
}

/// Show the main window
#[tauri::command]
fn show_main_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    let tray_manager = app_handle.state::<TrayManager>();
    tray_manager.show_window();
    Ok(())
}

/// Hide the main window
#[tauri::command]
fn hide_main_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    let tray_manager = app_handle.state::<TrayManager>();
    tray_manager.hide_window();
    Ok(())
}

/// Update the tray icon based on the theme
#[tauri::command]
fn update_tray_icon(app_handle: tauri::AppHandle, is_dark_mode: bool) -> Result<(), String> {
    let tray_manager = app_handle.state::<TrayManager>();
    tray_manager.update_tray_icon(is_dark_mode);
    Ok(())
}

// Shared state commands

/// Set a value in the shared state
#[tauri::command]
fn set_shared_state(
    state: State<'_, SharedState>,
    key: String,
    value: serde_json::Value,
) -> Result<(), String> {
    state.set(&key, value)
}

/// Get a value from the shared state
#[tauri::command]
fn get_shared_state(
    state: State<'_, SharedState>,
    key: String,
) -> Result<Option<serde_json::Value>, String> {
    state.get(&key)
}

/// Remove a value from the shared state
#[tauri::command]
fn remove_shared_state(
    state: State<'_, SharedState>,
    key: String,
) -> Result<(), String> {
    state.remove(&key)
}

/// Get all keys in the shared state
#[tauri::command]
fn get_shared_state_keys(
    state: State<'_, SharedState>,
) -> Result<Vec<String>, String> {
    state.get_keys()
}

/// Clear all values from the shared state
#[tauri::command]
fn clear_shared_state(
    state: State<'_, SharedState>,
) -> Result<(), String> {
    state.clear()
}

// MiniAppManager commands

/// Register a mini-app configuration
#[tauri::command]
fn register_miniapp(app_handle: tauri::AppHandle, config: MiniAppConfig) -> Result<(), String> {
    let miniapp_manager = app_handle.state::<MiniAppManager>();
    miniapp_manager.register_miniapp(config)
}

/// Get a mini-app configuration by ID
#[tauri::command]
fn get_miniapp_config(app_handle: tauri::AppHandle, app_id: String) -> Option<MiniAppConfig> {
    let miniapp_manager = app_handle.state::<MiniAppManager>();
    miniapp_manager.get_miniapp_config(&app_id)
}

/// Get all registered mini-app configurations
#[tauri::command]
fn get_all_miniapp_configs(app_handle: tauri::AppHandle) -> Vec<MiniAppConfig> {
    let miniapp_manager = app_handle.state::<MiniAppManager>();
    miniapp_manager.get_all_miniapp_configs()
}

/// Load a mini-app into a webview
#[tauri::command]
fn load_miniapp(app_handle: tauri::AppHandle, app_id: String) -> Result<(), String> {
    let miniapp_manager = app_handle.state::<MiniAppManager>();
    miniapp_manager.load_miniapp(&app_id)
}

/// Show a mini-app with specific positioning
#[tauri::command]
fn show_miniapp(app_handle: tauri::AppHandle, app_id: String, bounds: MiniAppBounds) -> Result<(), String> {
    let miniapp_manager = app_handle.state::<MiniAppManager>();
    miniapp_manager.show_miniapp(&app_id, bounds)
}

/// Hide a mini-app
#[tauri::command]
fn hide_miniapp(app_handle: tauri::AppHandle, app_id: String) -> Result<(), String> {
    let miniapp_manager = app_handle.state::<MiniAppManager>();
    miniapp_manager.hide_miniapp(&app_id)
}

/// Unload a mini-app
#[tauri::command]
fn unload_miniapp(app_handle: tauri::AppHandle, app_id: String) -> Result<(), String> {
    let miniapp_manager = app_handle.state::<MiniAppManager>();
    miniapp_manager.unload_miniapp(&app_id)
}

/// Set a mini-app as the active one (bring to front for z-order management)
#[tauri::command]
fn set_active_miniapp(app_handle: tauri::AppHandle, app_id: String) -> Result<(), String> {
    let miniapp_manager = app_handle.state::<MiniAppManager>();
    miniapp_manager.set_active_miniapp(&app_id)
}

/// Update mini-app positions on window resize
#[tauri::command]
fn resize_all_miniapps(app_handle: tauri::AppHandle) -> Result<(), String> {
    let miniapp_manager = app_handle.state::<MiniAppManager>();
    miniapp_manager.resize_all_miniapps()
}

/// Get the state of a mini-app
#[tauri::command]
fn get_miniapp_state(app_handle: tauri::AppHandle, app_id: String) -> Result<Option<MiniAppState>, String> {
    let miniapp_manager = app_handle.state::<MiniAppManager>();
    miniapp_manager.get_miniapp_state(&app_id)
}

/// Get the currently active mini-app ID
#[tauri::command]
fn get_active_miniapp_id(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    let miniapp_manager = app_handle.state::<MiniAppManager>();
    miniapp_manager.get_active_miniapp_id()
}

/// Get all mini-app states
#[tauri::command]
fn get_all_miniapp_states(app_handle: tauri::AppHandle) -> Result<HashMap<String, MiniAppState>, String> {
    let miniapp_manager = app_handle.state::<MiniAppManager>();
    miniapp_manager.get_all_miniapp_states()
}

// FileManager commands

/// Read a file from the file system
#[tauri::command]
fn read_file(app_handle: tauri::AppHandle, path: String) -> Result<Vec<u8>, String> {
    let file_manager = app_handle.state::<FileManager>();
    file_manager.read_file(&path)
}

/// Write a file to the file system
#[tauri::command]
fn write_file(app_handle: tauri::AppHandle, path: String, content: Vec<u8>) -> Result<(), String> {
    let file_manager = app_handle.state::<FileManager>();
    file_manager.write_file(&path, &content)
}

/// List files in a directory
#[tauri::command]
fn list_directory(app_handle: tauri::AppHandle, path: String) -> Result<Vec<FileMetadata>, String> {
    let file_manager = app_handle.state::<FileManager>();
    file_manager.list_directory(&path)
}

/// Create a new directory
#[tauri::command]
fn create_directory(app_handle: tauri::AppHandle, path: String) -> Result<(), String> {
    let file_manager = app_handle.state::<FileManager>();
    file_manager.create_directory(&path)
}

/// Delete a file or directory
#[tauri::command]
fn delete_file(app_handle: tauri::AppHandle, path: String) -> Result<(), String> {
    let file_manager = app_handle.state::<FileManager>();
    file_manager.delete_file(&path)
}

/// Get metadata for a file
#[tauri::command]
fn get_file_metadata(app_handle: tauri::AppHandle, path: String) -> Result<FileMetadata, String> {
    let file_manager = app_handle.state::<FileManager>();
    file_manager.get_file_metadata(&path)
}

/// Copy a file
#[tauri::command]
fn copy_file(app_handle: tauri::AppHandle, source: String, destination: String) -> Result<(), String> {
    let file_manager = app_handle.state::<FileManager>();
    file_manager.copy_file(&source, &destination)
}

/// Move a file
#[tauri::command]
fn move_file(app_handle: tauri::AppHandle, source: String, destination: String) -> Result<(), String> {
    let file_manager = app_handle.state::<FileManager>();
    file_manager.move_file(&source, &destination)
}

/// Check if a file exists
#[tauri::command]
fn file_exists(app_handle: tauri::AppHandle, path: String) -> bool {
    let file_manager = app_handle.state::<FileManager>();
    file_manager.file_exists(&path)
}

/// Check if a path is a directory
#[tauri::command]
fn is_directory(app_handle: tauri::AppHandle, path: String) -> bool {
    let file_manager = app_handle.state::<FileManager>();
    file_manager.is_directory(&path)
}

/// Clear the file cache
#[tauri::command]
fn clear_file_cache(app_handle: tauri::AppHandle) -> Result<(), String> {
    let file_manager = app_handle.state::<FileManager>();
    file_manager.clear_cache()
}

// Settings-related commands

/// Get a setting value
#[tauri::command]
fn get_setting(app_handle: tauri::AppHandle, key: String) -> Result<Option<Value>, String> {
    let settings_manager = app_handle.state::<SettingsManager>();
    settings_manager.get_setting(&key)
}

/// Set a setting value
#[tauri::command]
fn set_setting(app_handle: tauri::AppHandle, key: String, value: Value) -> Result<(), String> {
    let settings_manager = app_handle.state::<SettingsManager>();
    settings_manager.set_setting(&key, value)
}

/// Reset a setting to its default value
#[tauri::command]
fn reset_setting(app_handle: tauri::AppHandle, key: String) -> Result<(), String> {
    let settings_manager = app_handle.state::<SettingsManager>();
    settings_manager.reset_setting(&key)
}

/// Get all settings
#[tauri::command]
fn get_all_settings(app_handle: tauri::AppHandle) -> Result<HashMap<String, Value>, String> {
    let settings_manager = app_handle.state::<SettingsManager>();
    settings_manager.get_all_settings()
}

/// Reset all settings to their default values
#[tauri::command]
fn reset_all_settings(app_handle: tauri::AppHandle) -> Result<(), String> {
    let settings_manager = app_handle.state::<SettingsManager>();
    settings_manager.reset_all_settings()
}

/// Get the schema for a specific setting
#[tauri::command]
fn get_setting_schema(app_handle: tauri::AppHandle, key: String) -> Result<Option<SettingSchema>, String> {
    let settings_manager = app_handle.state::<SettingsManager>();
    settings_manager.get_setting_schema(&key)
}

/// Get the schema for all settings
#[tauri::command]
fn get_all_setting_schemas(app_handle: tauri::AppHandle) -> Result<HashMap<String, SettingSchema>, String> {
    let settings_manager = app_handle.state::<SettingsManager>();
    settings_manager.get_schema()
}

/// Get all setting categories
#[tauri::command]
fn get_setting_categories(app_handle: tauri::AppHandle) -> Result<HashMap<String, SettingCategory>, String> {
    let settings_manager = app_handle.state::<SettingsManager>();
    settings_manager.get_categories()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = Arc::new(AppState {
        active_webview: Mutex::new(None),
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_window::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .manage(app_state)
        .manage(SharedState::new())
        .setup(|app| {
            // Initialize the WebviewManager
            let webview_manager = WebviewManager::new(app.handle().clone());
            app.manage(webview_manager);
            
            // Initialize the MiniAppManager
            let miniapp_manager = MiniAppManager::new(app.handle().clone());
            app.manage(miniapp_manager);
            
            // Initialize the TrayManager
            let tray_manager = TrayManager::new(app.handle().clone());
            app.manage(tray_manager.clone());
            
            // Initialize the FileManager
            let file_manager = FileManager::new(app.handle().clone());
            app.manage(file_manager);
            
            // Initialize the SettingsManager
            let settings_manager = SettingsManager::new(app.handle().clone());
            app.manage(settings_manager);
            
            // Initialize the V8AgentRunner (now thread-safe)
            let v8_agent_runner = V8AgentRunner::new();
            app.manage(v8_agent_runner);
            
            // Create the system tray
            let _ = tray_manager.create_tray();
            
            // Set up resize event handler for the main window
            let app_handle = app.handle();
            if let Some(main_window) = app.get_webview_window("main") {
                // Set window decorations to false on macOS
                #[cfg(target_os = "macos")]
                main_window.set_decorations(false).expect("Failed to set window decorations");
                
                let app_handle_clone = app_handle.clone();
                main_window.listen("tauri://resize", move |_| {
                    let _ = resize_all_webviews(app_handle_clone.clone());
                    let _ = resize_all_miniapps(app_handle_clone.clone());
                });
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            create_webview,
            show_webview,
            hide_webview,
            set_active_webview,
            resize_all_webviews,
            destroy_webview,
            get_active_webview_id,
            has_webview,
            is_webview_visible,
            send_message_to_window,
            broadcast_message,
            // Tray-related commands
            set_launch_to_tray,
            get_launch_to_tray,
            show_main_window,
            hide_main_window,
            update_tray_icon,
            // Shared state commands
            set_shared_state,
            get_shared_state,
            remove_shared_state,
            get_shared_state_keys,
            clear_shared_state,
            // MiniApp-related commands
            register_miniapp,
            get_miniapp_config,
            get_all_miniapp_configs,
            load_miniapp,
            show_miniapp,
            hide_miniapp,
            unload_miniapp,
            set_active_miniapp,
            resize_all_miniapps,
            get_miniapp_state,
            get_active_miniapp_id,
            get_all_miniapp_states,
            // File-related commands
            read_file,
            write_file,
            list_directory,
            create_directory,
            delete_file,
            get_file_metadata,
            copy_file,
            move_file,
            file_exists,
            is_directory,
            clear_file_cache,
            // Settings-related commands
            get_setting,
            set_setting,
            reset_setting,
            get_all_settings,
            reset_all_settings,
            get_setting_schema,
            get_all_setting_schemas,
            get_setting_categories,
            // V8 agent runner commands
            run_agent,
            load_agent,
            unload_agent
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
