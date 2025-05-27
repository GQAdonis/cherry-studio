// Copyright 2019-2023 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

use serde::{Deserialize, Serialize, Serializer};
use tauri::{
    utils::config::{WindowConfig, WindowEffectsConfig},
    AppHandle, CursorIcon, Manager, Monitor, PhysicalPosition, PhysicalSize, Position,
    Runtime, Size, Theme, UserAttentionType, Window,
};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("window not found")]
    WindowNotFound,
    #[error(transparent)]
    Tauri(#[from] tauri::Error),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

type Result<T> = std::result::Result<T, Error>;

#[derive(Deserialize)]
#[serde(untagged)]
pub enum IconDto {
    Rgba {
        rgba: Vec<u8>,
        width: u32,
        height: u32,
    },
}

// Stub commands that do nothing but return success
// These are just to satisfy the API requirements

#[tauri::command]
pub async fn create<R: Runtime>(_app: AppHandle<R>, _options: WindowConfig) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_title<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: &str) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_size<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: Size) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_min_size<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: Option<Size>) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_max_size<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: Option<Size>) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_position<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: Position) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_fullscreen<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: bool) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_focus<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_skip_taskbar<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: bool) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_always_on_top<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: bool) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_decorations<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: bool) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_shadow<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: bool) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_effects<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: Option<WindowEffectsConfig>) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_resizable<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: bool) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_maximizable<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: bool) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_minimizable<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: bool) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_closable<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: bool) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_cursor_grab<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: bool) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_cursor_visible<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: bool) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_cursor_icon<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: CursorIcon) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_cursor_position<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: Position) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_ignore_cursor_events<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: bool) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_content_protected<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: bool) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn set_icon<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: IconDto) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn maximize<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn unmaximize<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn toggle_maximize<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn minimize<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn unminimize<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn show<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn hide<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn close<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn center<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn request_user_attention<R: Runtime>(_window: Window<R>, _label: Option<String>, _value: Option<UserAttentionType>) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn start_dragging<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn internal_toggle_maximize<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<()> {
    Ok(())
}

#[tauri::command]
pub async fn scale_factor<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<f64> {
    Ok(1.0)
}

#[tauri::command]
pub async fn inner_position<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<PhysicalPosition<i32>> {
    Ok(PhysicalPosition::new(0, 0))
}

#[tauri::command]
pub async fn outer_position<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<PhysicalPosition<i32>> {
    Ok(PhysicalPosition::new(0, 0))
}

#[tauri::command]
pub async fn inner_size<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<PhysicalSize<u32>> {
    Ok(PhysicalSize::new(800, 600))
}

#[tauri::command]
pub async fn outer_size<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<PhysicalSize<u32>> {
    Ok(PhysicalSize::new(800, 600))
}

#[tauri::command]
pub async fn is_fullscreen<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<bool> {
    Ok(false)
}

#[tauri::command]
pub async fn is_maximized<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<bool> {
    Ok(false)
}

#[tauri::command]
pub async fn is_minimized<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<bool> {
    Ok(false)
}

#[tauri::command]
pub async fn is_focused<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<bool> {
    Ok(true)
}

#[tauri::command]
pub async fn is_decorated<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<bool> {
    Ok(true)
}

#[tauri::command]
pub async fn is_resizable<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<bool> {
    Ok(true)
}

#[tauri::command]
pub async fn is_maximizable<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<bool> {
    Ok(true)
}

#[tauri::command]
pub async fn is_minimizable<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<bool> {
    Ok(true)
}

#[tauri::command]
pub async fn is_closable<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<bool> {
    Ok(true)
}

#[tauri::command]
pub async fn is_visible<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<bool> {
    Ok(true)
}

#[tauri::command]
pub async fn title<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<String> {
    Ok("Window Title".to_string())
}

#[tauri::command]
pub async fn current_monitor<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<Option<Monitor>> {
    Ok(None)
}

#[tauri::command]
pub async fn primary_monitor<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<Option<Monitor>> {
    Ok(None)
}

#[tauri::command]
pub async fn available_monitors<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<Vec<Monitor>> {
    Ok(Vec::new())
}

#[tauri::command]
pub async fn theme<R: Runtime>(_window: Window<R>, _label: Option<String>) -> Result<Theme> {
    Ok(Theme::Light)
}
