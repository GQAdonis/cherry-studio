import { WebContentsView, BrowserWindow, Rectangle, WebPreferences, app, shell } from 'electron'
import Logger from 'electron-log'
import path from 'path'
import fs from 'fs'
import { getMinAppConfig } from '../../../packages/shared/config/miniapps'

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
    Logger.info('WebContentsViewService: Initialized')
  }

  /**
   * Set the main window reference
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
    // Create an empty view to use when hiding content
    this.emptyView = new WebContentsView({})
    Logger.info('WebContentsViewService: Main window set')
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
    Logger.info(`WebContentsViewService: Creating view for appId: ${appId}, url: ${url}`)

    if (!this.mainWindow) {
      Logger.error('WebContentsViewService: Cannot create view, main window not set')
      return null
    }

    // Check if a view already exists for this appId
    if (this.views.has(appId)) {
      Logger.info(`WebContentsViewService: View already exists for appId: ${appId}, reusing existing view`)
      return this.views.get(appId) || null
    }

    try {
      // Get app config for this mini app
      const appConfig = getMinAppConfig(appId)
      
      // CRITICAL: Set up WebPreferences to ensure full browser capabilities
      // All mini apps MUST have access to localStorage, IndexedDB, and all browser APIs
      const webPreferences: WebPreferences = {
        // Default settings for all mini apps
        nodeIntegration: false,
        contextIsolation: true,
        // CRITICAL: Ensure sandbox is disabled to allow full browser capabilities
        sandbox: false,
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
      }

      // Create the WebContentsView with enhanced web preferences
      const view = new WebContentsView({ webPreferences })
      
      // Store the view and its initial state
      this.views.set(appId, view)
      this.loadingStates.set(appId, true)
      this.webContentsIds.set(appId, view.webContents.id)
      this.currentUrls.set(appId, url)
      this.isVisible.set(appId, false)
      
      // Set up event handlers
      this.setupEventHandlers(appId, view, appConfig)
      
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
      Logger.error(`WebContentsViewService: Error creating view for appId: ${appId}:`, error)
      return null
    }
  }

  /**
   * Set up event handlers for a WebContentsView
   */
  private setupEventHandlers(appId: string, view: WebContentsView, appConfig: any): void {
    // Handle navigation events
    view.webContents.on('did-start-loading', () => {
      this.loadingStates.set(appId, true)
      Logger.info(`WebContentsViewService: View started loading for appId: ${appId}`)
    })

    view.webContents.on('did-finish-load', () => {
      this.loadingStates.set(appId, false)
      const url = view.webContents.getURL()
      this.currentUrls.set(appId, url)
      Logger.info(`WebContentsViewService: View finished loading for appId: ${appId}, url: ${url}`)
      
      // Apply visibility scripts after loading
      this.applyVisibilityScripts(appId, view, appConfig)
    })

    view.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      this.loadingStates.set(appId, false)
      Logger.error(`WebContentsViewService: View failed to load for appId: ${appId}, error: ${errorDescription} (${errorCode})`)
    })

    view.webContents.on('did-navigate', (event, url) => {
      this.currentUrls.set(appId, url)
      Logger.info(`WebContentsViewService: View navigated for appId: ${appId}, url: ${url}`)
    })

    // Handle crashes and errors
    view.webContents.on('render-process-gone', (event, details) => {
      Logger.error(`WebContentsViewService: Render process gone for appId: ${appId}, reason: ${details.reason}`)
      this.loadingStates.set(appId, false)
    })

    // Use a different approach for crash detection
    view.webContents.on('unresponsive', () => {
      Logger.error(`WebContentsViewService: View became unresponsive for appId: ${appId}`)
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
          Logger.error(`WebContentsViewService: Error inserting CSS for appId: ${appId}:`, error)
        })
      }
      
      // Apply visibility script if specified in the config
      if (appConfig?.metadata?.loadingBehavior?.visibilityScript) {
        view.webContents.executeJavaScript(appConfig.metadata.loadingBehavior.visibilityScript).catch(error => {
          Logger.error(`WebContentsViewService: Error executing visibility script for appId: ${appId}:`, error)
        })
      }
    } catch (error) {
      Logger.error(`WebContentsViewService: Error applying visibility scripts for appId: ${appId}:`, error)
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
      Logger.error(`WebContentsViewService: Error loading primary URL for appId: ${appId}:`, error)
      
      // Get app config for fallback URLs
      const appConfig = getMinAppConfig(appId)
      const fallbackUrls = appConfig?.metadata?.fallbackUrls || []
      
      // Try fallback URLs if available
      for (const fallbackUrl of fallbackUrls) {
        try {
          await view.webContents.loadURL(fallbackUrl)
          this.currentUrls.set(appId, fallbackUrl)
          Logger.info(`WebContentsViewService: Loaded fallback URL for appId: ${appId}, url: ${fallbackUrl}`)
          return true
        } catch (fallbackError) {
          Logger.error(`WebContentsViewService: Error loading fallback URL for appId: ${appId}:`, fallbackError)
        }
      }
      
      return false
    }
  }

  /**
   * Show a WebContentsView
   */
  showView(appId: string, bounds: Rectangle): boolean {
    Logger.info(`WebContentsViewService: Showing view for appId: ${appId}`)
    
    const view = this.views.get(appId)
    if (!view) {
      Logger.error(`WebContentsViewService: Cannot show view for appId: ${appId}, view not found`)
      return false
    }
    
    if (!this.mainWindow) {
      Logger.error('WebContentsViewService: Cannot show view, main window not set')
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
      
      // CRITICAL: Ensure mini app is flush with sidebar and top navigation without overlap
      // Define exact sidebar width and top navigation height
      const SIDEBAR_WIDTH = 26; // Width of the sidebar in pixels - MUST be exactly 26px
      const TOP_NAV_HEIGHT = 41; // Height of the top navigation in pixels - MUST be exactly 41px
      
      // CRITICAL: For ALL mini apps, ensure they are flush with the sidebar and top navigation
      // Do not use any special case for bolt.diy or other apps
      let adjustedBounds = {
        x: SIDEBAR_WIDTH, // CRITICAL: Start exactly at the right edge of sidebar (26px)
        y: TOP_NAV_HEIGHT, // CRITICAL: Start exactly at the bottom edge of top navigation (41px)
        width: bounds.width, // Use the width provided by the content area
        height: bounds.height // Use the height provided by the content area
      }
      
      // Log the original bounds for debugging
      Logger.info(`WebContentsViewService: Original bounds for ${appId}:`, bounds);
      
      // CRITICAL: Set the bounds for the view to make it visible
      // This ensures the WebContentsView is positioned exactly at 26px from left and 41px from top
      view.setBounds(adjustedBounds)
      
      // Log the adjusted bounds for debugging with precise positioning information
      Logger.info(`WebContentsViewService: Set bounds for ${appId} with precise positioning:`, {
        ...adjustedBounds,
        leftOffset: `${SIDEBAR_WIDTH}px from left edge`,
        topOffset: `${TOP_NAV_HEIGHT}px from top edge`
      })
      
      // CRITICAL: Attach the WebContentsView to the BrowserWindow
      // This is the key step - WebContentsView must be attached to the window
      this.mainWindow.setContentView(view)
      Logger.info(`WebContentsViewService: Attached WebContentsView to window for appId: ${appId}`)
      
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
    Logger.info(`WebContentsViewService: Hiding view for appId: ${appId}`)
    
    const view = this.views.get(appId)
    if (!view) {
      Logger.error(`WebContentsViewService: Cannot hide view for appId: ${appId}, view not found`)
      return false
    }
    
    if (!this.mainWindow) {
      Logger.error('WebContentsViewService: Cannot hide view, main window not set')
      return false
    }
    
    try {
      // If this is the active view, clear the active view ID
      if (this.activeViewId === appId) {
        this.activeViewId = null
        
        // Create an empty WebContentsView to replace the current one
        // This effectively hides the current view without destroying it
        if (this.emptyView) {
          this.mainWindow.setContentView(this.emptyView)
          Logger.info(`WebContentsViewService: Replaced active view with empty view for appId: ${appId}`)
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
    Logger.info('WebContentsViewService: Hiding all views')
    
    if (!this.mainWindow) {
      Logger.error('WebContentsViewService: Cannot hide all views, main window not set')
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
    Logger.info(`WebContentsViewService: Destroying view for appId: ${appId}`)
    
    const view = this.views.get(appId)
    if (!view) {
      Logger.error(`WebContentsViewService: Cannot destroy view for appId: ${appId}, view not found`)
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
    Logger.info('WebContentsViewService: Destroying all views')
    
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
      Logger.error(`WebContentsViewService: Cannot set open links externally for appId: ${appId}, view not found`)
      return false
    }

    try {
      // Set up a handler for new window events
      view.webContents.setWindowOpenHandler(({ url }) => {
        if (openExternal) {
          // Open links externally
          shell.openExternal(url).catch(error => {
            Logger.error(`WebContentsViewService: Error opening external URL: ${url}`, error)
          })
          return { action: 'deny' }
        }
        return { action: 'allow' }
      })
      return true
    } catch (error) {
      Logger.error(`WebContentsViewService: Error setting open links externally for ${appId}:`, error)
      return false
    }
  }

  /**
   * Open DevTools for a specific WebContentsView
   */
  openDevTools(appId: string): boolean {
    const view = this.views.get(appId)
    if (!view) {
      Logger.error(`WebContentsViewService: Cannot open DevTools for appId: ${appId}, view not found`)
      return false
    }

    try {
      view.webContents.openDevTools()
      Logger.info(`WebContentsViewService: Opened DevTools for appId: ${appId}`)
      return true
    } catch (error) {
      Logger.error(`WebContentsViewService: Error opening DevTools for ${appId}:`, error)
      return false
    }
  }

  /**
   * Reload a WebContentsView
   */
  async reloadView(appId: string, url?: string): Promise<boolean> {
    const view = this.views.get(appId)
    if (!view) {
      Logger.error(`WebContentsViewService: Cannot reload view for appId: ${appId}, view not found`)
      return false
    }

    try {
      if (url) {
        // Load a new URL
        return this.loadUrlWithFallbacks(appId, url)
      } else {
        // Reload the current URL
        view.webContents.reload()
        Logger.info(`WebContentsViewService: Reloaded view for appId: ${appId}`)
        return true
      }
    } catch (error) {
      Logger.error(`WebContentsViewService: Error reloading view for appId: ${appId}:`, error)
      return false
    }
  }

  /**
   * Get the current URL of a WebContentsView
   */
  getCurrentUrl(appId: string): string | null {
    const view = this.views.get(appId)
    if (!view) {
      Logger.error(`WebContentsViewService: Cannot get URL for appId: ${appId}, view not found`)
      return null
    }

    try {
      const url = view.webContents.getURL()
      return url
    } catch (error) {
      Logger.error(`WebContentsViewService: Error getting URL for appId: ${appId}:`, error)
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
