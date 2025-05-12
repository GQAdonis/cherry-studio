# WebContentsView Architecture for Cherry Studio

## 1. Overview

This document outlines a new metadata-driven architecture for implementing WebContentsView in Cherry Studio. The goal is to ensure all mini apps, including bolt.diy, are handled consistently without app-specific code.

## 2. Core Principles

1. **Metadata-Driven Approach**: All mini app behavior is controlled through configuration metadata.
2. **Consistent Loading Process**: All mini apps follow the same loading process with no special cases.
3. **Visibility Guarantees**: The architecture ensures mini apps are visible without relying on timeouts or hacks.
4. **Performance Optimization**: Efficient resource usage and rendering performance.
5. **Security First**: Proper isolation and security boundaries between mini apps and the main application.

## 3. Architecture Components

### 3.1 Main Process Components

#### WebContentsViewService

The central service responsible for managing WebContentsView instances:

```typescript
class WebContentsViewService {
  // Maps app IDs to their WebContentsView instances
  private views: Map<string, WebContentsView>
  
  // Core methods
  createView(appId: string, url: string): WebContentsView | null
  showView(appId: string, bounds: Rectangle): boolean
  hideView(appId: string): boolean
  destroyView(appId: string): boolean
  
  // Additional methods
  getWebContentsId(appId: string): number | null
  getCurrentUrl(appId: string): string | null
  openDevTools(appId: string): boolean
  reloadView(appId: string): boolean
}
```

#### IPC Handlers

Expose WebContentsViewService methods to the renderer process:

```typescript
// Register IPC handlers
ipcMain.handle(IpcChannel.WebContentsView_Create, (event, appId: string, url: string) => {
  return webContentsViewService.createView(appId, url)
})

ipcMain.handle(IpcChannel.WebContentsView_Show, (event, appId: string, bounds: Rectangle) => {
  return webContentsViewService.showView(appId, bounds)
})

// Additional handlers for other methods
```

### 3.2 Renderer Process Components

#### WebContentsViewContainer

React component that manages WebContentsView instances:

```typescript
const WebContentsViewContainer: React.FC<{
  appid: string
  url: string
  onSetRefCallback: (appid: string, element: any | null) => void
  onLoadedCallback: (appid: string) => void
  onNavigateCallback: (appid: string, url: string) => void
}> = ({ appid, url, onSetRefCallback, onLoadedCallback, onNavigateCallback }) => {
  // Implementation
}
```

#### Preload API

Exposes WebContentsView methods to the renderer process:

```typescript
contextBridge.exposeInMainWorld('api', {
  webContentsView: {
    create: (appId: string, url: string) => ipcRenderer.invoke(IpcChannel.WebContentsView_Create, appId, url),
    show: (appId: string, bounds: Rectangle) => ipcRenderer.invoke(IpcChannel.WebContentsView_Show, appId, bounds),
    // Additional methods
  }
})
```

### 3.3 Configuration System

#### Mini App Configuration

Centralized configuration for all mini apps:

```typescript
export const META_CONFIG: Record<string, MiniAppConfig> = {
  'bolt.diy': {
    id: 'bolt.diy',
    metadata: {
      fallbackUrls: [...],
      webPreferences: {...},
      loadingBehavior: {...},
      linkHandling: {...},
      ui: {...}
    }
  },
  // Other mini apps
}
```

## 4. Loading Process

1. **Initialization**: WebContentsViewContainer renders and creates a container div
2. **View Creation**: WebContentsViewService creates a WebContentsView with configuration from miniapps.ts
3. **Loading Indicator**: Display a loading indicator with the mini app icon
4. **URL Loading**: Load the URL with fallback mechanism if needed
5. **Visibility Setup**: Apply visibility scripts and CSS from configuration
6. **Ready Event**: Fire onLoadedCallback when the mini app is ready
7. **Position Updates**: Update position when container size changes

## 5. Implementation Plan

### Phase 1: Core Infrastructure

1. Update WebContentsViewService to use metadata-driven approach
2. Implement proper error handling and logging
3. Create a robust loading process with fallback URLs

### Phase 2: UI Components

1. Update WebContentsViewContainer to handle visibility properly
2. Implement loading indicators with mini app icons
3. Ensure proper positioning and resizing

### Phase 3: Testing and Optimization

1. Test with all mini apps, especially bolt.diy
2. Optimize performance and resource usage
3. Implement monitoring and debugging tools

## 6. Security Considerations

1. Proper sandbox configuration for each mini app
2. Context isolation to prevent access to Node.js APIs
3. Content Security Policy implementation
4. Secure handling of navigation events

## 7. Monitoring and Debugging

1. Comprehensive logging throughout the loading process
2. DevTools integration for debugging mini apps
3. Performance monitoring for WebContentsView instances