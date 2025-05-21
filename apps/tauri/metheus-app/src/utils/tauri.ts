/**
 * tauri.ts
 * 
 * This file centralizes the Tauri API imports for use throughout the application.
 * It provides a single point of import for Tauri API functions.
 */

// Import Tauri API functions for Tauri v2
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

// Export the Tauri API functions
export { invoke, listen };

// Create a Window object that mimics the Tauri v1 API
export const Window = {
  getCurrent: async () => {
    // In Tauri v2, we use getCurrentWindow() to get the current window instance
    const window = await getCurrentWindow();
    
    // Add the window control methods and other expected methods
    return {
      label: window.label,
      listeners: window.listeners,
      once: (event: string, callback: () => void) => {
        window.once(event, callback);
      },
      minimize: async () => {
        try {
          await window.minimize();
        } catch (error) {
          console.error("Failed to minimize window:", error);
        }
      },
      maximize: async () => {
        try {
          await window.maximize();
        } catch (error) {
          console.error("Failed to maximize window:", error);
        }
      },
      unmaximize: async () => {
        try {
          await window.unmaximize();
        } catch (error) {
          console.error("Failed to unmaximize window:", error);
        }
      },
      isMaximized: async () => {
        try {
          return await window.isMaximized();
        } catch (error) {
          console.error("Failed to check if window is maximized:", error);
          return false;
        }
      },
      close: async () => {
        try {
          await window.close();
        } catch (error) {
          console.error("Failed to close window:", error);
        }
      }
    };
  }
};

// Export the original modules for advanced usage
export const tauri = {
  invoke,
  listen,
  Window
};
