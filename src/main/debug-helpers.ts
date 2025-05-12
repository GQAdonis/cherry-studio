/**
 * Debug helpers for Electron application
 * This file provides utilities for debugging and troubleshooting
 */

import { app, WebContents } from 'electron'
import Logger from 'electron-log'

// Debug configuration with default values
interface DebugConfig {
  forceShowWindow: boolean
  disableLaunchToTray: boolean
  openDevTools: boolean
  debugForceWindowVisible: boolean
  suppressSourcemapErrors: boolean
  suppressSecurityWarnings: boolean
  suppressRouterWarnings: boolean
  verboseLogging: boolean
  logWebContentsViewEvents: boolean
  logIpcEvents: boolean
  logPerformance: boolean
  logMemoryUsage: boolean
}

// Default debug configuration
let debugConfig: DebugConfig = {
  forceShowWindow: false,
  disableLaunchToTray: false,
  openDevTools: false,
  debugForceWindowVisible: false,
  suppressSourcemapErrors: false,
  suppressSecurityWarnings: false,
  suppressRouterWarnings: false,
  verboseLogging: false,
  logWebContentsViewEvents: false,
  logIpcEvents: false,
  logPerformance: false,
  logMemoryUsage: false
}

/**
 * Initialize debug configuration from environment variables
 */
export function setupDebugOverrides(): void {
  // Read environment variables and update debug configuration
  debugConfig = {
    forceShowWindow: process.env.FORCE_SHOW_WINDOW === 'true',
    disableLaunchToTray: process.env.DISABLE_LAUNCH_TO_TRAY === 'true',
    openDevTools: process.env.OPEN_DEVTOOLS === 'true',
    debugForceWindowVisible: process.env.DEBUG_FORCE_WINDOW_VISIBLE === 'true',
    suppressSourcemapErrors: process.env.SUPPRESS_SOURCEMAP_ERRORS === 'true',
    suppressSecurityWarnings: process.env.SUPPRESS_SECURITY_WARNINGS === 'true',
    suppressRouterWarnings: process.env.SUPPRESS_ROUTER_WARNINGS === 'true',
    verboseLogging: process.env.VERBOSE_LOGGING === 'true',
    logWebContentsViewEvents: process.env.LOG_WEBCONTENTSVIEW_EVENTS === 'true',
    logIpcEvents: process.env.LOG_IPC_EVENTS === 'true',
    logPerformance: process.env.LOG_PERFORMANCE === 'true',
    logMemoryUsage: process.env.LOG_MEMORY_USAGE === 'true'
  }

  // Log debug configuration
  Logger.info('Debug configuration:', debugConfig)

  // Apply debug settings
  if (debugConfig.forceShowWindow || debugConfig.disableLaunchToTray) {
    Logger.info('Debug override: Forcing window visibility')
    process.env.DEBUG_FORCE_WINDOW_VISIBLE = 'true'
  }

  // Force show dock icon on macOS during debugging
  if (process.platform === 'darwin' && debugConfig.forceShowWindow) {
    Logger.info('Debug override: Ensuring dock icon is visible')
    app.dock?.show()
  }

  // Suppress Electron security warnings if requested
  if (debugConfig.suppressSecurityWarnings) {
    process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
  }
}

/**
 * Get the current debug configuration
 */
export function getDebugConfig(): DebugConfig {
  return { ...debugConfig }
}

/**
 * Set a specific debug configuration option
 */
export function setDebugConfigOption<K extends keyof DebugConfig>(key: K, value: DebugConfig[K]): void {
  debugConfig[key] = value
}

/**
 * Create a component-specific logger
 * @param componentName Name of the component for prefixing log messages
 */
export function createComponentLogger(componentName: string) {
  return {
    info: (message: string, ...args: any[]) => {
      if (debugConfig.verboseLogging) {
        Logger.info(`[${componentName}] ${message}`, ...args)
      }
    },
    error: (message: string, ...args: any[]) => {
      Logger.error(`[${componentName}] ${message}`, ...args)
    },
    warn: (message: string, ...args: any[]) => {
      Logger.warn(`[${componentName}] ${message}`, ...args)
    },
    debug: (message: string, ...args: any[]) => {
      if (debugConfig.verboseLogging) {
        Logger.debug(`[${componentName}] ${message}`, ...args)
      }
    }
  }
}

/**
 * Attach debug event listeners to a WebContents instance
 * @param webContents WebContents to attach listeners to
 * @param id Identifier for the WebContents (e.g., window name or app ID)
 */
export function attachDebugListeners(webContents: WebContents, id: string): void {
  if (!debugConfig.logWebContentsViewEvents) {
    return
  }

  const logger = createComponentLogger(`WebContents-${id}`)

  // Navigation events
  webContents.on('did-start-loading', () => {
    logger.debug('did-start-loading')
  })

  webContents.on('did-finish-load', () => {
    logger.debug('did-finish-load')
  })

  webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    logger.error(`did-fail-load: ${errorDescription} (${errorCode})`)
  })

  webContents.on('did-navigate', (_event, url) => {
    logger.debug(`did-navigate: ${url}`)
  })

  // Error events
  webContents.on('render-process-gone', (_event, details) => {
    logger.error(`render-process-gone: ${details.reason}`)
  })

  webContents.on('unresponsive', () => {
    logger.error('unresponsive')
  })

  webContents.on('responsive', () => {
    logger.debug('responsive')
  })

  // Console messages
  webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levels = ['debug', 'info', 'warning', 'error']
    logger.debug(`console-${levels[level]}: ${message} (${sourceId}:${line})`)
  })
}