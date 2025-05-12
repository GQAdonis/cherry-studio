import { WebContentsView, BrowserWindow, Rectangle, WebPreferences, app, shell, session } from 'electron'
import Logger from 'electron-log'
import path from 'path'
import fs from 'fs'
import { getMinAppConfig } from '../../../packages/shared/config/miniapps'
import { createComponentLogger, attachDebugListeners, getDebugConfig } from '../debug-helpers'

// Create a component-specific logger
const logger = createComponentLogger('WebContentsViewService')

/**
 * Service for managing WebContentsView instances in the main process.
 * Provides methods for creating, showing, hiding, and destroying WebContentsView instances.
 * All mini app behavior is driven by configuration metadata to ensure consistent handling.
 */
class WebContentsViewService {
  private views: Map<string, WebContentsView> = new Map()
  private mainWindow: BrowserWindow | null = null
  // Track the currently active view for z-order management
  private activeViewId: string | null = null
  // Store last known good bounds for each view
  private lastKnownBounds: Map<string, Rectangle> = new Map()
  // Track loading state for each view
  private loadingStates: Map<string, boolean> = new Map()
  // Store WebContents IDs for quick lookup
  private webContentsIds: Map<string, number> = new Map()
  // Track current URLs for each view
  private currentUrls: Map<string, string> = new Map()
  // Track visibility state for each view
  private isVisible: Map<string, boolean> = new Map()
  // Empty view for when no content is shown
  private emptyView: WebContentsView | null = null

  constructor() {
    logger.info('Initialized')
    
    // Increase default max listeners to avoid warnings
    // This is needed because we attach multiple listeners to WebContents
    require('events').EventEmitter.defaultMaxListeners = 20
  }

  /**
   * Set the main window reference
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
    // Create an empty view to use when hiding content
    this.emptyView = new WebContentsView({})
    logger.info('Main window set')
  }

  /**
   * Get a WebContentsView by app ID
   */
  getView(appId: string): WebContentsView | undefined {
    return this.views.get(appId)
  }

  /**
   * Create a new WebContentsView for a mini app using metadata configuration
   */
  createView(appId: string, url: string): WebContentsView | null {
    logger.info(`Creating view for appId: ${appId}, url: ${url}`)

    if (!this.mainWindow) {
      logger.error('Cannot create view, main window not set')
      return null
    }

    // Check if a view already exists for this appId
    if (this.views.has(appId)) {
      logger.info(`View already exists for appId: ${appId}, reusing existing view`)
      return this.views.get(appId) || null
    }

    try {
      // Get app config for this mini app
      const appConfig = getMinAppConfig(appId)
      
      // Create a custom session for this WebContentsView to avoid sandbox issues
      const customSession = session.fromPartition(`persist:miniapp-${appId}`, { cache: true })
      
      // Configure session permissions
      customSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
        // Allow all permissions for mini apps
        callback(true)
      })
      
      // CRITICAL: Set up WebPreferences to ensure full browser capabilities
      // All mini apps MUST have access to localStorage, IndexedDB, and all browser APIs
      const webPreferences: WebPreferences = {
        // Default settings for all mini apps
        nodeIntegration: false,
        contextIsolation: true,
        // CRITICAL: Ensure sandbox is disabled to allow full browser capabilities
        sandbox: false,
        // Use the custom session
        session: customSession,
        // CRITICAL: Allow web security to be configured per app
        webSecurity: appConfig?.metadata?.webPreferences?.webSecurity ?? true,
        // CRITICAL: Allow running insecure content if needed
        allowRunningInsecureContent: appConfig?.metadata?.webPreferences?.allowRunningInsecureContent ?? false,
        // CRITICAL: Enable plugins for better compatibility
        plugins: true,
        // CRITICAL: Enable experimental features for better compatibility
        experimentalFeatures: true,
        // CRITICAL: Disable background throttling for better performance
        backgroundThrottling: false,
        // Ensure JavaScript is enabled
        javascript: true,
        // Ensure webgl is enabled
        webgl: true,
        // Disable the sandbox renderer bundle that's causing issues
        additionalArguments: ['--disable-sandboxed-renderer'],
        // Apply any additional app-specific web preferences
        ...appConfig?.metadata?.webPreferences
      }

      // Add preload script if specified in config
      // Use a default preload script path for mini apps
      const preloadScriptPath = path.join(app.getAppPath(), 'src/preload/miniapp-preload.js')
      if (fs.existsSync(preloadScriptPath)) {
        webPreferences.preload = preloadScriptPath
        Logger.info(`WebContentsViewService: Using preload script at ${preloadScriptPath}`)
      } else {
        Logger.warn(`WebContentsViewService: Default preload script not found at ${preloadScriptPath}`)
        // Try to find the preload script in the resources directory as a fallback
        const resourcePreloadPath = path.join(app.getAppPath(), 'resources/js/miniapp-preload.js')
        if (fs.existsSync(resourcePreloadPath)) {
          webPreferences.preload = resourcePreloadPath
          Logger.info(`WebContentsViewService: Using fallback preload script at ${resourcePreloadPath}`)
        }
      }

      // Create the WebContentsView with enhanced web preferences
      // Ensure we're creating a valid WebContentsView instance
      try {
        // Disable the sandbox renderer bundle that's causing issues
        app.commandLine.appendSwitch('disable-sandboxed-renderer')
        
        const view = new WebContentsView({ webPreferences })
        
        // Verify the WebContentsView was created successfully
        if (!view || !view.webContents) {
          throw new Error('WebContentsView or webContents is null')
        }
        
        // Disable the sandbox for this specific webContents
        view.webContents.setBackgroundThrottling(false)
        
        // Set user agent to ensure full compatibility
        const userAgent = view.webContents.getUserAgent()
        view.webContents.setUserAgent(userAgent.replace('Electron', 'Chrome'))
      
      // Store the view and its initial state
      this.views.set(appId, view)
      this.loadingStates.set(appId, true)
      this.webContentsIds.set(appId, view.webContents.id)
      this.currentUrls.set(appId, url)
      this.isVisible.set(appId, false)
      
      // Log successful creation
      logger.info(`Successfully created WebContentsView for appId: ${appId} with webContentsId: ${view.webContents.id}`)
      
      // Set up event handlers
      this.setupEventHandlers(appId, view, appConfig)
      
      // Attach debug listeners if enabled
      if (getDebugConfig().logWebContentsViewEvents) {
        attachDebugListeners(view.webContents, `WebContentsView-${appId}`)
      }
      
      // Load the URL
      this.loadUrlWithFallbacks(appId, url)
        .then(success => {
          if (!success) {
            Logger.error(`WebContentsViewService: Failed to load URL for appId: ${appId}`)
          }
        })
        .catch(error => {
          Logger.error(`WebContentsViewService: Error loading URL for appId: ${appId}:`, error)
        })

      return view
      } catch (error) {
        logger.error(`Failed to create WebContentsView for appId: ${appId}:`, error)
        return null
      }
    } catch (error) {
      Logger.error(`WebContentsViewService: Error creating view for appId: ${appId}:`, error)
      return null
    }
  }

  /**
   * Set up event handlers for a WebContentsView
   */
  private setupEventHandlers(appId: string, view: WebContentsView, appConfig: any): void {
    // Set up permission handling for the view
    view.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
      // Allow all permissions for mini apps
      callback(true)
    })
    
    // Handle console messages for debugging
    view.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      const levels = ['debug', 'info', 'warn', 'error']
      const logLevel = levels[level] || 'info'
      
      // Use the correct logger method based on level
      switch(logLevel) {
        case 'debug':
          logger.debug(`Console [${appId}]: ${message} (${sourceId}:${line})`)
          break
        case 'warn':
          logger.warn(`Console [${appId}]: ${message} (${sourceId}:${line})`)
          break
        case 'error':
          logger.error(`Console [${appId}]: ${message} (${sourceId}:${line})`)
          break
        case 'info':
        default:
          logger.info(`Console [${appId}]: ${message} (${sourceId}:${line})`)
          break
      }
    })
    // Handle navigation events
    view.webContents.on('did-start-loading', () => {
      this.loadingStates.set(appId, true)
      logger.info(`View started loading for appId: ${appId}`)
    })

    view.webContents.on('did-finish-load', () => {
      this.loadingStates.set(appId, false)
      const url = view.webContents.getURL()
      this.currentUrls.set(appId, url)
      logger.info(`View finished loading for appId: ${appId}, url: ${url}`)
      
      // Apply visibility scripts after loading
      this.applyVisibilityScripts(appId, view, appConfig)
    })

    view.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      this.loadingStates.set(appId, false)
      logger.error(`View failed to load for appId: ${appId}, error: ${errorDescription} (${errorCode})`)
    })

    view.webContents.on('did-navigate', (_event, url) => {
      this.currentUrls.set(appId, url)
      logger.info(`View navigated for appId: ${appId}, url: ${url}`)
    })

    // Handle crashes and errors
    view.webContents.on('render-process-gone', (_event, details) => {
      logger.error(`Render process gone for appId: ${appId}, reason: ${details.reason}`)
      this.loadingStates.set(appId, false)
    })

    // Use a different approach for crash detection
    view.webContents.on('unresponsive', () => {
      logger.error(`View became unresponsive for appId: ${appId}`)
      this.loadingStates.set(appId, false)
    })
  }

  /**
   * Apply visibility scripts and CSS from configuration
   */
  private applyVisibilityScripts(appId: string, view: WebContentsView, appConfig: any): void {
    try {
      // Apply CSS if specified in the config
      if (appConfig?.metadata?.loadingBehavior?.injectCSS) {
        view.webContents.insertCSS(appConfig.metadata.loadingBehavior.injectCSS).catch(error => {
          logger.error(`Error inserting CSS for appId: ${appId}:`, error)
        })
      }
      
      // Apply visibility script if specified in the config
      if (appConfig?.metadata?.loadingBehavior?.visibilityScript) {
        view.webContents.executeJavaScript(appConfig.metadata.loadingBehavior.visibilityScript).catch(error => {
          logger.error(`Error executing visibility script for appId: ${appId}:`, error)
        })
      }
    } catch (error) {
      logger.error(`Error applying visibility scripts for appId: ${appId}:`, error)
    }
  }

  /**
   * Ensure a view is visible by applying visibility scripts and restoring bounds
   */
  private ensureViewIsVisible(appId: string): void {
    const view = this.views.get(appId)
    const appConfig = getMinAppConfig(appId)
    
    if (!view || !appConfig) return
    
    this.applyVisibilityScripts(appId, view, appConfig)
    
    // Set up periodic visibility check if needed
    if (appConfig?.metadata?.loadingBehavior?.periodicVisibilityCheck) {
      // Default to 1000ms if not specified
      const interval = 1000
      setTimeout(() => {
        if (this.isVisible.get(appId)) {
          this.ensureViewIsVisible(appId)
        }
      }, interval)
    }
  }

  /**
   * Load URL with fallback options for better error handling
   */
  async loadUrlWithFallbacks(appId: string, primaryUrl: string): Promise<boolean> {
    const view = this.views.get(appId)
    if (!view) return false

    try {
      // Try to load the primary URL
      await view.webContents.loadURL(primaryUrl)
      this.currentUrls.set(appId, primaryUrl)
      return true
    } catch (error) {
      logger.error(`Error loading primary URL for appId: ${appId}:`, error)
      
      // Get app config for fallback URLs
      const appConfig = getMinAppConfig(appId)
      const fallbackUrls = appConfig?.metadata?.fallbackUrls || []
      
      // Try fallback URLs if available
      for (const fallbackUrl of fallbackUrls) {
        try {
          await view.webContents.loadURL(fallbackUrl)
          this.currentUrls.set(appId, fallbackUrl)
          logger.info(`Loaded fallback URL for appId: ${appId}, url: ${fallbackUrl}`)
          return true
        } catch (fallbackError) {
          logger.error(`Error loading fallback URL for appId: ${appId}:`, fallbackError)
        }
      }
      
      return false
    }
  }

  /**
   * Show a WebContentsView
   */
  showView(appId: string, bounds: Rectangle): boolean {
    logger.info(`Showing view for appId: ${appId}`)
    
    const view = this.views.get(appId)
    if (!view) {
      logger.error(`Cannot show view for appId: ${appId}, view not found`)
      return false
    }
    
    if (!this.mainWindow) {
      logger.error('Cannot show view, main window not set')
      return false
    }
    
    // Store the bounds for future reference
    this.lastKnownBounds.set(appId, bounds)
    
    // Get app config for this mini app
    const appConfig = getMinAppConfig(appId)
    
    try {
      // First hide any currently visible views
      for (const existingAppId of this.views.keys()) {
        if (existingAppId !== appId && this.isVisible.get(existingAppId)) {
          // Hide the view without destroying it
          this.isVisible.set(existingAppId, false)
        }
      }
      
      // Make this the active view
      this.activeViewId = appId

      // Set the window open handler for the view
      view.webContents.setWindowOpenHandler(({ url }) => {
        // Check if the URL should be opened externally based on app config
        const shouldOpenExternally = appConfig?.metadata?.linkHandling?.externalUrlPatterns?.some(
          pattern => url.includes(pattern)
        ) ?? false

        if (shouldOpenExternally) {
          // Open links externally
          shell.openExternal(url).catch(error => {
            Logger.error(`WebContentsViewService: Error opening external URL: ${url}`, error)
          })
          return { action: 'deny' }
        }
        return { action: 'allow' }
      })
      
      // CRITICAL: For drawer-based mini apps, use the bounds provided by the drawer
      // This ensures the WebContentsView is positioned correctly within the drawer
      // and doesn't overlap with the sidebar or top navigation
      let adjustedBounds = {
        x: bounds.x, // Use the x position provided by the drawer
        y: bounds.y, // Use the y position provided by the drawer
        width: bounds.width, // Use the width provided by the drawer
        height: bounds.height // Use the height provided by the drawer
      }
      
      // Log the original bounds for debugging
      logger.info(`Original bounds for ${appId}:`, bounds);
      
      // CRITICAL: Set the bounds for the view to make it visible
      // This ensures the WebContentsView is positioned exactly at 26px from left and 41px from top
      view.setBounds(adjustedBounds)
      
      // Log the adjusted bounds for debugging with precise positioning information
      logger.info(`Set bounds for ${appId} with precise positioning:`, {
        ...adjustedBounds,
        timestamp: new Date().toISOString()
      })
      
      // CRITICAL: Use setContentView for WebContentsView
      // But we'll ensure it's properly positioned within the drawer
      // by using the exact bounds provided by the drawer
      this.mainWindow.setContentView(view)
      logger.info(`Set WebContentsView for window for appId: ${appId}`)
      
      // Set properties to ensure proper rendering
      view.webContents.setZoomFactor(1.0) // Reset zoom to ensure proper rendering
      
      // Store the active view ID for proper management
      this.activeViewId = appId
      
      // Mark this view as visible
      this.isVisible.set(appId, true)
      
      // Apply visibility scripts again to ensure content is visible
      if (appConfig) {
        this.applyVisibilityScripts(appId, view, appConfig)
      }

      // Set up periodic visibility check if configured
      if (appConfig?.metadata?.loadingBehavior?.periodicVisibilityCheck) {
        this.ensureViewIsVisible(appId)
      }

      return true
    } catch (error) {
      Logger.error(`WebContentsViewService: Error showing view for appId: ${appId}:`, error)
      return false
    }
  }

  /**
   * Hide a specific WebContentsView
   */
  hideView(appId: string): boolean {
    logger.info(`Hiding view for appId: ${appId}`)
    
    const view = this.views.get(appId)
    if (!view) {
      logger.error(`Cannot hide view for appId: ${appId}, view not found`)
      return false
    }
    
    if (!this.mainWindow) {
      logger.error('Cannot hide view, main window not set')
      return false
    }
    
    try {
      // If this is the active view, clear the active view ID
      if (this.activeViewId === appId) {
        this.activeViewId = null
        
        // Create an empty WebContentsView to replace the current one if needed
        if (this.emptyView) {
          // Set bounds to zero to ensure it doesn't interfere with UI
          const zeroBounds = { x: 0, y: 0, width: 0, height: 0 }
          view.setBounds(zeroBounds)
          
          // Replace with empty view
          this.mainWindow.setContentView(this.emptyView)
          logger.info(`Replaced active view with empty view for appId: ${appId}`)
        }
      }
      
      // Mark this view as not visible
      this.isVisible.set(appId, false)
      
      return true
    } catch (error) {
      Logger.error(`WebContentsViewService: Error hiding view for appId: ${appId}:`, error)
      return false
    }
  }

  /**
   * Hide all WebContentsViews
   */
  hideAllViews(): boolean {
    logger.info('Hiding all views')
    
    if (!this.mainWindow) {
      logger.error('Cannot hide all views, main window not set')
      return false
    }
    
    try {
      // Hide each view
      for (const appId of this.views.keys()) {
        if (this.isVisible.get(appId)) {
          this.hideView(appId)
        }
      }
      
      // Clear the active view ID
      this.activeViewId = null
      
      return true
    } catch (error) {
      Logger.error('WebContentsViewService: Error hiding all views:', error)
      return false
    }
  }

  /**
   * Destroy a WebContentsView
   */
  destroyView(appId: string): boolean {
    logger.info(`Destroying view for appId: ${appId}`)
    
    const view = this.views.get(appId)
    if (!view) {
      logger.error(`Cannot destroy view for appId: ${appId}, view not found`)
      return false
    }
    
    try {
      // Hide the view first
      this.hideView(appId)
      
      // Close the WebContents
      view.webContents.close()
      
      // Remove from our maps
      this.views.delete(appId)
      this.lastKnownBounds.delete(appId)
      this.loadingStates.delete(appId)
      this.webContentsIds.delete(appId)
      this.currentUrls.delete(appId)
      this.isVisible.delete(appId)
      
      return true
    } catch (error) {
      Logger.error(`WebContentsViewService: Error destroying view for appId: ${appId}:`, error)
      return false
    }
  }

  /**
   * Destroy all WebContentsViews
   */
  destroyAllViews(): boolean {
    logger.info('Destroying all views')
    
    try {
      // Destroy each view
      for (const appId of this.views.keys()) {
        this.destroyView(appId)
      }
      
      return true
    } catch (error) {
      Logger.error('WebContentsViewService: Error destroying all views:', error)
      return false
    }
  }

  /**
   * Set whether links should open externally
   */
  setOpenLinksExternally(appId: string, openExternal: boolean): boolean {
    const view = this.views.get(appId)
    if (!view) {
      logger.error(`Cannot set open links externally for appId: ${appId}, view not found`)
      return false
    }

    try {
      // Set up a handler for new window events
      view.webContents.setWindowOpenHandler(({ url }) => {
        if (openExternal) {
          // Open links externally
          shell.openExternal(url).catch(error => {
            logger.error(`Error opening external URL: ${url}`, error)
          })
          return { action: 'deny' }
        }
        return { action: 'allow' }
      })
      return true
    } catch (error) {
      logger.error(`Error setting open links externally for ${appId}:`, error)
      return false
    }
  }

  /**
   * Open DevTools for a specific WebContentsView
   */
  openDevTools(appId: string): boolean {
    const view = this.views.get(appId)
    if (!view) {
      logger.error(`Cannot open DevTools for appId: ${appId}, view not found`)
      return false
    }

    try {
      view.webContents.openDevTools()
      logger.info(`Opened DevTools for appId: ${appId}`)
      return true
    } catch (error) {
      logger.error(`Error opening DevTools for ${appId}:`, error)
      return false
    }
  }

  /**
   * Reload a WebContentsView
   */
  async reloadView(appId: string, url?: string): Promise<boolean> {
    const view = this.views.get(appId)
    if (!view) {
      logger.error(`Cannot reload view for appId: ${appId}, view not found`)
      return false
    }

    try {
      if (url) {
        // Load a new URL
        return this.loadUrlWithFallbacks(appId, url)
      } else {
        // Reload the current URL
        view.webContents.reload()
        logger.info(`Reloaded view for appId: ${appId}`)
        return true
      }
    } catch (error) {
      logger.error(`Error reloading view for appId: ${appId}:`, error)
      return false
    }
  }

  /**
   * Get the current URL of a WebContentsView
   */
  getCurrentUrl(appId: string): string | null {
    const view = this.views.get(appId)
    if (!view) {
      logger.error(`Cannot get URL for appId: ${appId}, view not found`)
      return null
    }

    try {
      const url = view.webContents.getURL()
      return url
    } catch (error) {
      logger.error(`Error getting URL for appId: ${appId}:`, error)
      return null
    }
  }

  /**
   * Get the WebContents ID of a WebContentsView
   */
  getWebContentsId(appId: string): number | null {
    const id = this.webContentsIds.get(appId)
    return id !== undefined ? id : null
  }
}

// Export a singleton instance
export default new WebContentsViewService()
