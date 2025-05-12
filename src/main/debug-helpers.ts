/**
 * Debug helpers for Prometheus Studio
 * This file contains utility functions for debugging purposes
 */

import Logger from 'electron-log'
import { app } from 'electron'

/**
 * Setup debug overrides for window visibility and behavior
 * This function is called when debug environment variables are set
 */
export function setupDebugOverrides(): void {
  Logger.info('Setting up debug overrides')

  // Override app.dock.hide to prevent hiding the dock icon during debugging
  if (process.platform === 'darwin' && app.dock) {
    const originalHide = app.dock.hide
    app.dock.hide = function () {
      Logger.info('Debug override: Prevented dock icon from hiding')
      // In debug mode, don't actually hide the dock icon
      if (process.env.FORCE_SHOW_WINDOW !== 'true') {
        originalHide.call(app.dock)
      }
    }
  }

  // Override app quit behavior for debugging
  const originalQuit = app.quit
  app.quit = function () {
    Logger.info('Debug override: App quit requested')
    // Allow normal quit behavior
    return originalQuit.call(app)
  }

  // Store debug state in a variable that can be accessed by other components
  // const isDebuggingEnabled = true

  // Add a method to check debug status
  app.whenReady().then(() => {
    Logger.info('Debug mode is enabled')
  })

  // Log that debug overrides are active
  Logger.info('Debug overrides active with environment variables:')
  Logger.info(`- FORCE_SHOW_WINDOW: ${process.env.FORCE_SHOW_WINDOW}`)
  Logger.info(`- DISABLE_LAUNCH_TO_TRAY: ${process.env.DISABLE_LAUNCH_TO_TRAY}`)
  Logger.info(`- OPEN_DEVTOOLS: ${process.env.OPEN_DEVTOOLS}`)
  Logger.info(`- DEBUG_FORCE_WINDOW_VISIBLE: ${process.env.DEBUG_FORCE_WINDOW_VISIBLE}`)
}

/**
 * Check if the app is running in debug mode
 * @returns {boolean} True if the app is running in debug mode
 */
export function isDebugMode(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG === 'true' ||
    process.env.FORCE_SHOW_WINDOW === 'true' ||
    process.env.DISABLE_LAUNCH_TO_TRAY === 'true' ||
    process.env.OPEN_DEVTOOLS === 'true' ||
    process.env.DEBUG_FORCE_WINDOW_VISIBLE === 'true'
  )
}
