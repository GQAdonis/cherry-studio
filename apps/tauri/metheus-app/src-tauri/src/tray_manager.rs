use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, Wry, Emitter};
use tauri::menu::{Menu, MenuItem, Submenu};
use tauri::tray::{TrayIcon, TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState};

/// TrayManager is responsible for managing the system tray functionality
/// in a Tauri application. It handles creating the tray icon, building the
/// tray menu, and responding to tray events.
#[derive(Clone)]
pub struct TrayManager {
    /// The Tauri app handle
    app_handle: AppHandle,
    /// Whether the app should launch to tray
    launch_to_tray: Arc<Mutex<bool>>,
    /// Whether the app is currently minimized to tray
    is_minimized_to_tray: Arc<Mutex<bool>>,
}

impl TrayManager {
    /// Create a new TrayManager instance
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            launch_to_tray: Arc::new(Mutex::new(false)),
            is_minimized_to_tray: Arc::new(Mutex::new(false)),
        }
    }

    /// Build the system tray menu
    pub fn build_tray_menu(&self) -> Result<Menu<Wry>, tauri::Error> {
        let show_text = "Show Window";
        let hide_text = "Hide Window";
        let quit_text = "Quit";
        let preferences_text = "Preferences";
        let launch_to_tray_text = if *self.launch_to_tray.lock().unwrap() {
            "Launch to Tray ✓"
        } else {
            "Launch to Tray"
        };

        // Create menu items
        let show = MenuItem::with_id(&self.app_handle, "show", show_text, true, None::<&str>)?;
        let hide = MenuItem::with_id(&self.app_handle, "hide", hide_text, true, None::<&str>)?;
        let quit = MenuItem::with_id(&self.app_handle, "quit", quit_text, true, None::<&str>)?;
        let launch_to_tray = MenuItem::with_id(
            &self.app_handle,
            "launch_to_tray",
            launch_to_tray_text,
            true,
            None::<&str>,
        )?;

        // Create preferences submenu
        let preferences_menu = Menu::with_items(&self.app_handle, &[&launch_to_tray])?;
        let preferences_submenu = Submenu::with_id(
            &self.app_handle,
            "preferences_submenu",
            preferences_text,
            true,
        )?;
        
        // Create a new menu with all items
        let separator1 = MenuItem::with_id(&self.app_handle, "separator1", "", false, None::<&str>)?;
        let separator2 = MenuItem::with_id(&self.app_handle, "separator2", "", false, None::<&str>)?;

        // Build the menu with all items
        let mut menu = Menu::with_items(
            &self.app_handle,
            &[
                &show,
                &hide,
                &separator1,
            ],
        )?;
        
        // Add the submenu and remaining items
        menu.append(&preferences_submenu)?;
        menu.append(&separator2)?;
        menu.append(&quit)?;
        
        Ok(menu)
    }

    /// Create the system tray
    pub fn create_tray(&self) -> Result<TrayIcon, tauri::Error> {
        let tray_menu = self.build_tray_menu()?;
        
        let tray_icon = TrayIconBuilder::new()
            .menu(&tray_menu)
            .build(&self.app_handle)?;
            
        // Set up menu event handler
        let app_handle_clone = self.app_handle.clone();
        tray_icon.on_menu_event(move |app, event| {
            let tray_manager = app_handle_clone.state::<TrayManager>();
            match event.id().as_ref() {
                "show" => {
                    tray_manager.show_window();
                }
                "hide" => {
                    tray_manager.hide_window();
                }
                "launch_to_tray" => {
                    tray_manager.toggle_launch_to_tray();
                }
                "quit" => {
                    tray_manager.quit_app();
                }
                _ => {}
            }
        });
        
        // Set up tray icon event handler
        let app_handle_clone = self.app_handle.clone();
        tray_icon.on_tray_icon_event(move |tray, event| {
            let tray_manager = app_handle_clone.state::<TrayManager>();
            match event {
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } => {
                    tray_manager.toggle_window_visibility();
                }
                _ => {}
            }
        });
        
        Ok(tray_icon)
    }

    /// Toggle the window visibility
    fn toggle_window_visibility(&self) {
        if *self.is_minimized_to_tray.lock().unwrap() {
            self.show_window();
        } else {
            self.hide_window();
        }
    }

    /// Show the main window
    pub fn show_window(&self) {
        if let Some(window) = self.app_handle.get_webview_window("main") {
            window.show().unwrap_or_else(|e| {
                eprintln!("Failed to show window: {}", e);
            });
            window.set_focus().unwrap_or_else(|e| {
                eprintln!("Failed to focus window: {}", e);
            });
            *self.is_minimized_to_tray.lock().unwrap() = false;
        }
    }

    /// Hide the main window
    pub fn hide_window(&self) {
        if let Some(window) = self.app_handle.get_webview_window("main") {
            window.hide().unwrap_or_else(|e| {
                eprintln!("Failed to hide window: {}", e);
            });
            *self.is_minimized_to_tray.lock().unwrap() = true;
        }
    }

    /// Toggle the launch to tray setting
    fn toggle_launch_to_tray(&self) {
        let mut launch_to_tray = self.launch_to_tray.lock().unwrap();
        *launch_to_tray = !*launch_to_tray;

        // Update the tray menu
        if let Some(tray_handle) = self.app_handle.tray_by_id("main-tray") {
            if let Ok(tray_menu) = self.build_tray_menu() {
                let _ = tray_handle.set_menu(Some(tray_menu));
            }
        }

        // Emit an event to notify the frontend
        let _ = self.app_handle.emit(
            "tray-setting-changed",
            serde_json::json!({
                "launch_to_tray": *launch_to_tray
            }),
        );
    }

    /// Quit the application
    fn quit_app(&self) {
        self.app_handle.exit(0);
    }

    /// Get the current launch to tray setting
    pub fn get_launch_to_tray(&self) -> bool {
        *self.launch_to_tray.lock().unwrap()
    }

    /// Set the launch to tray setting
    pub fn set_launch_to_tray(&self, value: bool) {
        *self.launch_to_tray.lock().unwrap() = value;

        // Update the tray menu
        if let Some(tray_handle) = self.app_handle.tray_by_id("main-tray") {
            if let Ok(tray_menu) = self.build_tray_menu() {
                let _ = tray_handle.set_menu(Some(tray_menu));
            }
        }
    }

    /// Update the tray icon (for light/dark mode)
    pub fn update_tray_icon(&self, _is_dark_mode: bool) {
        // In a real implementation, you might use different icons for light/dark mode
        // For now, we'll just use the same icon
        // This method is left as a placeholder for future implementation
    }
}
