# Migration Plan: Electron to Tauri with React 19, Vite 6, and shadcn-ui

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Migration Strategy](#migration-strategy)
4. [Technical Implementation Plan](#technical-implementation-plan)
5. [Mini-App Migration](#mini-app-migration)
6. [Performance Optimization](#performance-optimization)
7. [Testing Strategy](#testing-strategy)
8. [Timeline and Milestones](#timeline-and-milestones)
9. [Risk Assessment and Mitigation](#risk-assessment-and-mitigation)
10. [Conclusion](#conclusion)

## Introduction

This document outlines a comprehensive plan for migrating the Cherry Studio application from Electron to Tauri 2.5.0, while upgrading to React 19, Vite 6, and implementing shadcn-ui. The migration aims to address performance concerns with the current Electron implementation, particularly memory usage and startup time, while preserving all existing functionality.

### Key Objectives

- Preserve critical functionality: mini-apps with WebContentsView, MCP service integration, and overall UI/UX
- Ensure full support for localStorage, IndexedDB, PGLite, and network access with extensions
- Enable embedding of Flutter interfaces (both native and web)
- Improve performance: reduce memory usage and startup time
- Implement a phased migration approach to minimize risk
- Upgrade to React 19, Vite 6, and implement shadcn-ui for modern UI components

## Architecture Overview

### Current Architecture (Electron)

The current architecture is based on Electron with a main process (Node.js) and renderer process (React). The main process includes services like WindowService, TrayService, WebContentsViewService, MCPService, and FileStorage. The renderer process contains React components, Redux store, and MinAppContainer. Mini-apps are implemented using WebContentsView.

### Target Architecture (Tauri)

The target architecture will be based on Tauri with a core process (Rust) and frontend (React). The core process will include services like WindowManager, TrayManager, WebviewManager, MCPService, and FileStorage. The frontend will contain React components, Redux store, and WebviewContainer. Mini-apps will be implemented using Tauri's webview capabilities.

## Migration Strategy

The migration will follow a phased approach with four main phases:

### Phase 1: Proof of Concept and Foundation (4-6 weeks)

- Create a basic Tauri application with React 19, Vite 6, and shadcn-ui
- Implement a simple webview proof of concept to validate the approach
- Verify support for critical web APIs (localStorage, IndexedDB, PGLite)
- Test Flutter embedding capabilities
- Set up the project structure and build configuration
- Create a prototype of the core UI with shadcn-ui components

### Phase 2: Core Infrastructure (8-10 weeks)

- Implement core Rust backend services
- Create the IPC bridge between Rust and frontend using Tauri commands
- Implement window management and system tray functionality
- Set up the basic application shell with navigation
- Develop the WebviewManager service in Rust

### Phase 3: Feature Migration (12-16 weeks)

- Migrate WebContentsView functionality to Tauri's webview capabilities
- Implement MCP service in Rust
- Port remaining services (file storage, backup, etc.)
- Migrate mini-apps to the new architecture
- Implement Flutter integration

### Phase 4: Optimization and Polish (4-6 weeks)

- Optimize performance of critical paths
- Enhance security using Tauri's capability system
- Polish UI and UX to ensure consistency across platforms
- Comprehensive testing and bug fixing
- Finalize documentation and deployment pipeline

## Technical Implementation Plan

### Project Setup

#### Initialize Tauri Project

```bash
# Create a new Tauri project with Vite and React
yarn create tauri-app cherry-studio-tauri --template vite-react-ts

# Navigate to the project directory
cd cherry-studio-tauri

# Install dependencies
yarn install
```

#### Configure Vite and React 19

Update `package.json` to use React 19 and Vite 6:

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "vite": "^6.2.6",
    "@vitejs/plugin-react-swc": "^3.9.0"
## WebContentsView to Tauri Webview Migration

The migration from Electron's WebContentsView to Tauri's webview capabilities is one of the most critical aspects of this project. This section provides detailed information on how we'll handle this migration, with particular focus on Z-order management and positioning.

### Z-Order Management

#### Current Implementation (Electron)

In the current Electron implementation, WebContentsView instances are managed within the same window and have a natural Z-order based on when they were added to the window. The `WebContentsViewService` maintains an `activeViewId` to track which view should be on top, and uses `setContentView` to bring a specific view to the foreground:

```typescript
// Current Electron implementation
this.mainWindow.setContentView(view);
this.activeViewId = appId;
```

This approach allows for seamless Z-order management within a single window.

#### Tauri Implementation

Tauri's architecture differs from Electron in that it doesn't have a direct equivalent to WebContentsView. Instead, we have two main approaches:

1. **Multiple Windows Approach**: Create separate Tauri windows for each mini-app
2. **WebView API Approach**: Use Tauri's webview API to create multiple webviews

For our implementation, we'll use the Multiple Windows Approach with careful management to make them appear as embedded views. Here's how we'll handle Z-order:

```rust
// src-tauri/src/webview_manager.rs
pub fn set_active_webview(&self, app_id: &str) -> Result<(), String> {
    // First, lower the z-order of all other webviews
    for (id, _) in self.webviews.lock().unwrap().iter() {
        if id != app_id {
            if let Some(window) = self.app_handle.get_webview_window(id) {
                // Set a lower z-order
                let _ = window.set_always_on_bottom(true);
            }
        }
    }
    
    // Then, raise the z-order of the active webview
    if let Some(window) = self.app_handle.get_webview_window(app_id) {
        let _ = window.set_always_on_bottom(false);
        let _ = window.set_focus();
        
        // Update the active webview ID
        *self.active_webview_id.lock().unwrap() = Some(app_id.to_string());
        
        Ok(())
    } else {
        Err(format!("Webview with ID {} not found", app_id))
    }
}
```

On the frontend side, we'll maintain a similar API to the current implementation:

```typescript
// src/services/WebviewService.ts
export const setActiveWebview = async (appId: string): Promise<void> => {
  try {
    await invoke('set_active_webview', { appId });
  } catch (error) {
    console.error(`Failed to set active webview ${appId}:`, error);
  }
};
```

### Precise Positioning

#### Current Implementation (Electron)

In the current implementation, WebContentsView instances are positioned within the main window using the `setBounds` method:

```typescript
// Current Electron implementation
const adjustedBounds = {
  x: sidebarWidth, // Position exactly at the right edge of the sidebar
  y: bounds.y, // Use the y position provided by the content area
  width: bounds.width, // Use the width provided by the content area
  height: bounds.height // Use the height provided by the content area
};

view.setBounds(adjustedBounds);
```

This ensures that mini-apps are positioned flush against the sidebar and don't overlap with the top navigation.

#### Tauri Implementation

In Tauri, we'll use a combination of window positioning and size management to achieve the same effect:

```rust
// src-tauri/src/webview_manager.rs
pub fn position_webview(&self, app_id: &str, x: f64, y: f64, width: f64, height: f64) -> Result<(), String> {
    if let Some(window) = self.app_handle.get_webview_window(app_id) {
        // Store the bounds for future reference
        let mut bounds = self.last_known_bounds.lock().unwrap();
        bounds.insert(app_id.to_string(), (x, y, width, height));
        
        // Set position relative to the main window
        let main_window = self.app_handle.get_webview_window("main").unwrap();
        let main_position = main_window.outer_position().unwrap();
        
        // Calculate absolute position
        let absolute_x = main_position.x as f64 + x;
        let absolute_y = main_position.y as f64 + y;
        
        // Set position and size
        let _ = window.set_position(tauri::PhysicalPosition::new(absolute_x, absolute_y));
        let _ = window.set_size(tauri::PhysicalSize::new(width, height));
        
        // Ensure the window is properly decorated (or not)
        let _ = window.set_decorations(false);
        
        // Make sure it's a child of the main window
        let _ = window.set_parent(&main_window);
        
        Ok(())
    } else {
        Err(format!("Webview with ID {} not found", app_id))
    }
}
```

On the frontend side, we'll calculate the correct position based on the sidebar width and top navigation height:

```typescript
// src/components/MinApp/MinappContainer.tsx
useEffect(() => {
  // Calculate bounds based on container size
  const updateBounds = () => {
    const container = document.getElementById('content-area');
    if (container) {
      const rect = container.getBoundingClientRect();
      // Ensure the webview is positioned flush against the left sidebar
      // and doesn't overlap with the top navigation
      const sidebarWidth = 26; // Sidebar width in pixels
      const topNavHeight = 41; // Top navigation height in pixels
      
      setBounds({
        x: sidebarWidth,
        y: topNavHeight,
        width: rect.width - sidebarWidth,
        height: rect.height - topNavHeight,
      });
    }
  };

  // Update bounds initially and on resize
  updateBounds();
  window.addEventListener('resize', updateBounds);

  return () => {
    window.removeEventListener('resize', updateBounds);
  };
}, []);
```

### Window Resize Handling

#### Current Implementation (Electron)

In the current implementation, WebContentsView instances automatically resize with the main window. The `WebContentsViewService` updates the bounds of the active view when the window is resized.

#### Tauri Implementation

In Tauri, we need to explicitly handle window resize events:

```rust
// src-tauri/src/main.rs
fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Initialize services
            let app_handle = app.handle();
            let window_manager = WindowManager::new(app_handle.clone());
            let webview_manager = WebviewManager::new(app_handle.clone());
            
            // Set up resize event handler
            let webview_manager_clone = webview_manager.clone();
            let main_window = window_manager.create_main_window()?;
            main_window.listen("tauri://resize", move |_| {
                webview_manager_clone.resize_all_webviews();
            });
            
            // Store services in app state
            app.manage(webview_manager);
            
            Ok(())
        })
        // ...
}
```

The `WebviewManager` will implement a method to resize all webviews based on their last known bounds:

```rust
// src-tauri/src/webview_manager.rs
pub fn resize_all_webviews(&self) {
    let bounds = self.last_known_bounds.lock().unwrap();
    let webviews = self.webviews.lock().unwrap();
    
    for (app_id, _) in webviews.iter() {
        if let Some(&(x, y, width, height)) = bounds.get(app_id) {
            // Only resize visible webviews
            if let Some(window) = self.app_handle.get_webview_window(app_id) {
                if window.is_visible().unwrap_or(false) {
                    let _ = self.position_webview(app_id, x, y, width, height);
                }
            }
        }
    }
}
```

On the frontend side, we'll emit a custom resize event to ensure all components update properly:

```typescript
// src/hooks/useWindowResize.ts
import { useEffect } from 'react';
import { appWindow } from '@tauri-apps/api/window';

export const useWindowResize = (callback: () => void) => {
  useEffect(() => {
    const handleResize = () => {
      callback();
    };

    // Listen for window resize events
    const unlisten = appWindow.listen('tauri://resize', handleResize);

    // Call once initially
    callback();

    return () => {
      unlisten.then(fn => fn());
    };
  }, [callback]);
};
```

### Challenges and Solutions

#### Challenge 1: Parent-Child Window Relationship

**Challenge**: Tauri's window API doesn't provide the same level of integration as Electron's WebContentsView.

**Solution**: We'll use a combination of window parenting, precise positioning, and custom event handling to create a seamless experience:

```rust
// src-tauri/src/window_manager.rs
pub fn create_child_window(&self, parent_label: &str, child_label: &str, url: &str) -> Result<WebviewWindow, tauri::Error> {
    let parent = self.app_handle.get_webview_window(parent_label).unwrap();
    
    let window = WebviewWindowBuilder::new(
        &self.app_handle,
        child_label,
        WebviewUrl::App(url.into()),
    )
    .title(child_label)
    .visible(false)
    .decorations(false) // No window decorations
    .always_on_top(false) // Not always on top by default
    .build()?;
    
    // Set the parent window
    window.set_parent(&parent)?;
    
    Ok(window)
}
```

#### Challenge 2: Z-Order Management Across Platforms

**Challenge**: Z-order management works differently across platforms (Windows, macOS, Linux).

**Solution**: We'll implement platform-specific code where necessary:

```rust
// src-tauri/src/webview_manager.rs
pub fn set_active_webview(&self, app_id: &str) -> Result<(), String> {
    // Platform-specific z-order management
    #[cfg(target_os = "windows")]
    {
        // Windows-specific implementation
        // ...
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS-specific implementation
        // ...
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux-specific implementation
        // ...
    }
### Inter-Window Communication

A critical aspect of the migration is ensuring seamless communication between the main window and mini-app windows. In Electron, this is handled through the IPC system within a single process. In Tauri, we need to implement a robust communication system across multiple windows.

#### Current Implementation (Electron)

In the current Electron implementation, communication between the main process and WebContentsView instances happens through the IPC system:

```typescript
// Main process sending message to a specific WebContentsView
view.webContents.send('message-channel', data);

// WebContentsView sending message to main process
ipcRenderer.send('message-channel', data);

// Main process listening for messages
ipcMain.on('message-channel', (event, data) => {
  // Handle message
});
```

This allows for direct communication between the main process and each WebContentsView.

#### Tauri Implementation

In Tauri, we'll use a combination of Tauri's event system and commands to achieve similar functionality:

1. **Event System for Broadcasting**:

```rust
// src-tauri/src/event_manager.rs
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Clone, Serialize, Deserialize)]
pub struct EventPayload {
    pub event_type: String,
    pub data: serde_json::Value,
}

pub struct EventManager {
    app_handle: AppHandle,
}

impl EventManager {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }

    pub fn emit_to_all(&self, event_name: &str, payload: EventPayload) -> Result<(), String> {
        self.app_handle
            .emit_all(event_name, payload)
            .map_err(|e| format!("Failed to emit event: {}", e))
    }

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
```

2. **Commands for Request-Response Pattern**:

```rust
// src-tauri/src/commands.rs
#[tauri::command]
pub async fn send_message_to_window(
    app_handle: AppHandle,
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

#[tauri::command]
pub async fn broadcast_message(
    app_handle: AppHandle,
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
```

3. **Frontend Event Handling**:

```typescript
// src/utils/eventBus.ts
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';
import { appWindow } from '@tauri-apps/api/window';

type EventHandler = (data: any) => void;
type EventUnsubscribe = () => void;

class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.initialized) return;

    // Listen for app-message events
    await listen('app-message', (event) => {
      const { event_type, data } = event.payload as { event_type: string; data: any };
      this.notifyHandlers(event_type, data);
    });

    this.initialized = true;
  }

  public subscribe(eventType: string, handler: EventHandler): EventUnsubscribe {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    const handlers = this.handlers.get(eventType)!;
    handlers.add(handler);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  private notifyHandlers(eventType: string, data: any) {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  public async sendToWindow(windowLabel: string, eventType: string, data: any): Promise<void> {
    await invoke('send_message_to_window', {
      windowLabel,
      messageType: eventType,
      messageData: data,
    });
  }

  public async broadcast(eventType: string, data: any): Promise<void> {
    await invoke('broadcast_message', {
      messageType: eventType,
      messageData: data,
    });
  }

  public async sendToMain(eventType: string, data: any): Promise<void> {
    await this.sendToWindow('main', eventType, data);
  }
}

export const eventBus = new EventBus();
```

4. **Usage in Components**:

```typescript
// In a mini-app component
import { eventBus } from '../utils/eventBus';
import { useEffect, useState } from 'react';

const MiniAppComponent = () => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Subscribe to events from the main window
    const unsubscribe = eventBus.subscribe('main-to-miniapp', (data) => {
      setMessage(data.message);
    });

    // Send a message to the main window when the component mounts
    eventBus.sendToMain('miniapp-ready', { appId: 'my-mini-app' });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleButtonClick = () => {
    // Send a message to the main window
    eventBus.sendToMain('miniapp-action', { action: 'button-clicked' });
  };

  return (
    <div>
      <p>Message from main: {message}</p>
      <button onClick={handleButtonClick}>Send Message to Main</button>
    </div>
  );
};
```

### Data Sharing Between Windows

In addition to event-based communication, we need mechanisms for sharing data between windows:

#### 1. Shared State Service

For global state that needs to be accessible across windows, we'll implement a shared state service in Rust:

```rust
// src-tauri/src/shared_state.rs
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Default)]
pub struct SharedState {
    data: Mutex<HashMap<String, Value>>,
}

impl SharedState {
    pub fn new() -> Self {
        Self {
            data: Mutex::new(HashMap::new()),
        }
    }

    pub fn set(&self, key: &str, value: Value) -> Result<(), String> {
        let mut data = self.data.lock().map_err(|_| "Failed to lock shared state")?;
        data.insert(key.to_string(), value);
        Ok(())
    }

    pub fn get(&self, key: &str) -> Result<Option<Value>, String> {
        let data = self.data.lock().map_err(|_| "Failed to lock shared state")?;
        Ok(data.get(key).cloned())
    }

    pub fn remove(&self, key: &str) -> Result<(), String> {
        let mut data = self.data.lock().map_err(|_| "Failed to lock shared state")?;
        data.remove(key);
        Ok(())
    }
}
```

With corresponding Tauri commands:

```rust
// src-tauri/src/commands.rs
#[tauri::command]
pub fn set_shared_state(
    state: State<'_, SharedState>,
    key: String,
    value: Value,
) -> Result<(), String> {
    state.set(&key, value)
}

#[tauri::command]
pub fn get_shared_state(
    state: State<'_, SharedState>,
    key: String,
) -> Result<Option<Value>, String> {
    state.get(&key)
}
```

#### 2. LocalStorage Synchronization

For cases where we need to synchronize localStorage across windows:

```typescript
// src/utils/syncStorage.ts
import { eventBus } from './eventBus';

class SyncStorage {
  private prefix: string = 'sync:';
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (this.isInitialized) return;

    // Listen for storage sync events
    eventBus.subscribe('storage-sync', (data) => {
      const { key, value, source } = data;
      
      // Only update if the event came from another window
      if (source !== window.location.href) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    });

    this.isInitialized = true;
  }

  public setItem(key: string, value: any): void {
    // Store the value in localStorage
    const fullKey = this.prefix + key;
    localStorage.setItem(fullKey, JSON.stringify(value));

    // Broadcast the change to other windows
    eventBus.broadcast('storage-sync', {
      key: fullKey,
      value,
      source: window.location.href,
    });
  }

  public getItem(key: string): any {
    const fullKey = this.prefix + key;
    const value = localStorage.getItem(fullKey);
    return value ? JSON.parse(value) : null;
  }

  public removeItem(key: string): void {
    const fullKey = this.prefix + key;
    localStorage.removeItem(fullKey);

    // Broadcast the removal to other windows
    eventBus.broadcast('storage-sync', {
      key: fullKey,
      value: null,
      source: window.location.href,
    });
  }
}

export const syncStorage = new SyncStorage();
```

#### 3. IndexedDB Synchronization

For more complex data that needs to be stored in IndexedDB and synchronized across windows:

```typescript
// src/utils/syncDatabase.ts
import { eventBus } from './eventBus';
import Dexie from 'dexie';

class SyncDatabase extends Dexie {
  public items: Dexie.Table<any, string>;

  constructor() {
    super('SyncDatabase');
    this.version(1).stores({
      items: 'key',
    });
    this.items = this.table('items');

    this.initialize();
  }

  private initialize() {
    // Listen for database sync events
    eventBus.subscribe('db-sync', async (data) => {
      const { operation, key, value, source } = data;
      
      // Only update if the event came from another window
      if (source !== window.location.href) {
        if (operation === 'put') {
          await this.items.put(value, key);
        } else if (operation === 'delete') {
          await this.items.delete(key);
        }
      }
    });
  }

  public async putItem(key: string, value: any): Promise<void> {
    // Store the value in IndexedDB
    await this.items.put(value, key);

    // Broadcast the change to other windows
    eventBus.broadcast('db-sync', {
      operation: 'put',
      key,
      value,
      source: window.location.href,
    });
  }

  public async getItem(key: string): Promise<any> {
    return await this.items.get(key);
  }

  public async deleteItem(key: string): Promise<void> {
    await this.items.delete(key);

    // Broadcast the removal to other windows
    eventBus.broadcast('db-sync', {
      operation: 'delete',
      key,
      value: null,
      source: window.location.href,
    });
  }
}

export const syncDb = new SyncDatabase();
```

### Handling Mini-App Communication

For mini-apps that need to communicate with each other or with the main application, we'll implement a message bus system:

```typescript
// src/utils/miniAppBus.ts
import { eventBus } from './eventBus';

class MiniAppBus {
  // Send a message to a specific mini-app
  public async sendToMiniApp(appId: string, messageType: string, data: any): Promise<void> {
    await eventBus.sendToWindow(appId, messageType, data);
  }

  // Send a message to all mini-apps
  public async broadcastToMiniApps(messageType: string, data: any): Promise<void> {
    await eventBus.broadcast(`miniapp:${messageType}`, data);
  }

  // Listen for messages from mini-apps
  public subscribeMiniAppMessages(messageType: string, handler: (data: any, source: string) => void): () => void {
    return eventBus.subscribe(`miniapp:${messageType}`, (event) => {
      handler(event.data, event.source);
    });
  }

  // Send a message from a mini-app to the main application
  public async sendToMain(messageType: string, data: any): Promise<void> {
    await eventBus.sendToMain(`miniapp:${messageType}`, {
      data,
      source: window.tauri?.window?.label || 'unknown',
    });
  }
}

export const miniAppBus = new MiniAppBus();
```

By implementing these communication mechanisms, we can ensure seamless interaction between the main window and mini-app windows in the Tauri architecture, maintaining the same level of integration that exists in the current Electron implementation.
    
    // Common implementation
    // ...
}
```

#### Challenge 3: Seamless Visual Integration

**Challenge**: Making separate windows appear as a single integrated UI.

**Solution**: We'll use careful styling and positioning to create a seamless experience:

```typescript
// src/components/MinApp/MinappContainer.tsx
const MinAppContainer: React.FC<MinAppContainerProps> = ({
  appId,
  url,
  visible,
}) => {
  // ...
  
  useEffect(() => {
    if (visible) {
      // Apply custom styling to make the window appear integrated
      invoke('style_webview', { 
        appId,
        styles: {
          borderRadius: '0px',
          boxShadow: 'none',
          backgroundColor: 'transparent',
        }
      }).catch(console.error);
      
      // Show the webview with the calculated bounds
      invoke('show_webview', { 
        appId, 
        x: bounds.x, 
        y: bounds.y, 
        width: bounds.width, 
        height: bounds.height 
      }).catch(console.error);
    } else {
      // Hide the webview
      invoke('hide_webview', { appId }).catch(console.error);
    }
  }, [appId, visible, bounds]);
  
  // ...
};
```

By implementing these strategies, we can achieve a WebContentsView-like experience in Tauri while maintaining the critical requirements for Z-order management and positioning of mini-apps.
  }
}
```

#### Set Up Tailwind CSS and shadcn-ui

```bash
# Install Tailwind CSS
yarn add tailwindcss @tailwindcss/vite

# Install shadcn-ui CLI
yarn add -D @shadcn/ui
```

Configure Tailwind CSS:

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Initialize shadcn-ui:

```bash
npx shadcn@canary init
```

### Tauri Configuration

Configure Tauri to allow unrestricted webview access for mini-apps:

```json
// tauri.conf.json
{
  "tauri": {
    "security": {
      "csp": null
    },
    "windows": [
      {
        "label": "main",
        "title": "Cherry Studio",
        "width": 1200,
        "height": 800
      }
    ]
  }
}
```

## Mini-App Migration

### Web API Support

Ensuring full support for web APIs in mini-apps is critical for the migration. Tauri's webview is based on the system's native webview, which has different capabilities depending on the platform:

- **Windows**: WebView2 (Chromium-based)
- **macOS**: WKWebView (WebKit-based)
- **Linux**: WebKitGTK

To ensure consistent behavior across platforms, we need to:

1. Configure webviews with unrestricted permissions
2. Configure Tauri's capabilities system to allow unrestricted access
3. Implement a compatibility layer for platform-specific differences

### LocalStorage and IndexedDB Support

Tauri's webview should support localStorage and IndexedDB by default, but we need to ensure they work correctly by implementing test utilities to verify functionality.

### PGLite Support

PGLite requires WebAssembly support, which should be available in modern webviews. We need to ensure it works correctly by implementing test utilities to verify functionality.

### Flutter Integration

Supporting Flutter integration in Tauri requires special handling, as Flutter can be used in two ways:

1. **Flutter Web**: Embedding Flutter web applications in webviews
2. **Flutter Native**: Integrating with native Flutter components

For Flutter web, we can embed the applications in Tauri webviews like any other web content. For Flutter native, we need to create a bridge between Tauri and Flutter.

## Performance Optimization

### Memory Usage

- Leverage Tauri's smaller memory footprint by using the system's native webview
- Implement proper resource cleanup for webviews that are not in use
- Use lazy loading for components and resources

### Startup Time

- Optimize Rust code for faster initialization
- Implement progressive loading of UI components
- Use code splitting to reduce initial bundle size

## Testing Strategy

### Unit Testing

- Write unit tests for Rust backend services
- Implement Jest tests for React components
- Create mock services for testing isolated components

### Integration Testing

- Test the interaction between Rust backend and React frontend
- Verify that Tauri commands work as expected
- Test mini-app loading and interaction

### End-to-End Testing

- Implement E2E tests for critical user flows
- Test across different platforms (Windows, macOS, Linux)
- Verify performance metrics meet targets

## Timeline and Milestones

### Phase 1: Proof of Concept and Foundation (Weeks 1-6)

- Week 1-2: Set up basic Tauri project with React 19, Vite 6, and shadcn-ui
- Week 3-4: Implement webview proof of concept
- Week 5-6: Create basic application shell and UI components

### Phase 2: Core Infrastructure (Weeks 7-16)

- Week 7-9: Implement window management and system tray
- Week 10-12: Create webview management service
- Week 13-16: Implement MCP service in Rust

### Phase 3: Feature Migration (Weeks 17-32)

- Week 17-20: Migrate mini-app functionality
- Week 21-24: Implement frontend components with shadcn-ui
- Week 25-28: Port remaining services
- Week 29-32: Integrate all components

### Phase 4: Optimization and Polish (Weeks 33-38)

- Week 33-34: Performance optimization
- Week 35-36: Security enhancements
- Week 37-38: UI/UX polish and final testing

## Risk Assessment and Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|------------|
| Tauri webview limitations | High | Medium | Research alternative approaches, contribute to Tauri if needed |
| Performance issues | Medium | Low | Regular performance testing, optimize critical paths |
| API incompatibilities | Medium | Medium | Create compatibility layers, update documentation |
| Learning curve for Rust | Medium | Medium | Provide training, start with simpler components |
| Migration timeline delays | Medium | Medium | Build buffer into schedule, prioritize critical features |

## Conclusion

This migration plan provides a comprehensive approach to converting the current Electron application to Tauri while upgrading to React 19, Vite 6, and implementing shadcn-ui. The phased approach minimizes risk while ensuring that critical functionality is preserved.

The plan addresses the key concerns of:
- Preserving mini-apps functionality with WebContentsView
- Maintaining MCP service integration
- Ensuring consistent UI/UX
- Improving performance (memory usage and startup time)
- Supporting critical web APIs like localStorage, IndexedDB, and PGLite
- Enabling Flutter integration

By following this plan, the migration can be executed in a controlled manner, with clear milestones and deliverables at each phase.