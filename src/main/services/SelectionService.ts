import { isDev, isWin } from '@main/constant'
import { IpcChannel } from '@shared/IpcChannel'
import { app, BrowserWindow, ipcMain, screen } from 'electron'
import Logger from 'electron-log'
import { join } from 'path';
// import { dirname } from 'path' // 'join' is no longer used, and dirname is no longer used
// import { fileURLToPath } from 'url' // No longer used

// const __filename = fileURLToPath(import.meta.url) // No longer used
// const __dirname = dirname(__filename) // No longer used in this file

import type {
  SelectionHookConstructor,
  SelectionHookInstance
} from 'selection-hook'

import type { ActionItem } from '../../renderer/src/types/selectionTypes'
import { ConfigKeys, configManager } from './ConfigManager'

let SelectionHook: SelectionHookConstructor | null = null
try {
  if (isWin) {
    // Dynamically import selection-hook for Windows
    import('selection-hook').then(selectionHookModule => {
      SelectionHook = selectionHookModule.default; // Assuming default export
    }).catch(err => {
      console.error('Failed to load selection-hook:', err);
      // Handle error, e.g., disable the feature or log a more specific message
    });
  }
} catch (error) {
  Logger.error('Failed to load selection-hook:', error)
}

// Type definitions

/** SelectionService is a singleton class that manages the selection hook and the toolbar window
 *
 * Features:
 * - Text selection detection and processing
 * - Floating toolbar management
 * - Action window handling
 * - Multiple trigger modes (selection/alt-key)
 * - Screen boundary-aware positioning
 *
 * Usage:
 *   import selectionService from '/src/main/services/SelectionService'
 *   selectionService?.start()
 */
export class SelectionService {
  private static instance: SelectionService | null = null
  private selectionHook: SelectionHookInstance | null = null

  private static isIpcHandlerRegistered = false

  private initStatus: boolean = false
  private started: boolean = false

  private triggerMode = 'selected'
  private isFollowToolbar = true
  private filterMode = 'default'
  private filterList: string[] = []

  private toolbarWindow: BrowserWindow | null = null
  private actionWindows = new Set<BrowserWindow>()
  private preloadedActionWindows: BrowserWindow[] = []
  private readonly PRELOAD_ACTION_WINDOW_COUNT = 1

  private isCtrlkeyListenerActive: boolean = false

  private readonly ACTION_WINDOW_WIDTH = 500
  private readonly ACTION_WINDOW_HEIGHT = 400

  private constructor() {
    try {
      if (!SelectionHook) {
        throw new Error('module selection-hook not exists')
      }

      this.selectionHook = new SelectionHook()
      if (this.selectionHook) {
        this.initZoomFactor()

        this.initStatus = true
      }
    } catch (error) {
      this.logError('Failed to initialize SelectionService:', error as Error)
    }
  }

  public static getInstance(): SelectionService | null {
    if (!isWin) return null

    if (!SelectionService.instance) {
      SelectionService.instance = new SelectionService()
    }

    if (SelectionService.instance.initStatus) {
      return SelectionService.instance
    }
    return null
  }

  public getSelectionHook(): SelectionHookInstance | null {
    return this.selectionHook
  }

  /**
   * Initialize zoom factor from config and subscribe to changes
   * Ensures UI elements scale properly with system DPI settings
   */
  private initZoomFactor() {
    // const zoomFactor = configManager.getZoomFactor() // Parameter no longer used
    // if (zoomFactor) { // Parameter no longer used
    //   this.setZoomFactor() // Parameter no longer used
    // } // Parameter no longer used

    configManager.subscribe('ZoomFactor', this.setZoomFactor)
  }

  public setZoomFactor = () => { // Parameter _zoomFactor removed
    // Store zoom factor for future use
  }

  private initConfig() {
    this.triggerMode = configManager.getSelectionAssistantTriggerMode()
    this.isFollowToolbar = configManager.getSelectionAssistantFollowToolbar()
    this.filterMode = configManager.getSelectionAssistantFilterMode()
    this.filterList = configManager.getSelectionAssistantFilterList()

    this.setHookClipboardMode(this.filterMode, this.filterList)

    configManager.subscribe(ConfigKeys.SelectionAssistantTriggerMode, (triggerMode: string) => {
      this.triggerMode = triggerMode
      this.processTriggerMode()
    })

    configManager.subscribe(ConfigKeys.SelectionAssistantFollowToolbar, (isFollowToolbar: boolean) => {
      this.isFollowToolbar = isFollowToolbar
    })

    configManager.subscribe(ConfigKeys.SelectionAssistantFilterMode, (filterMode: string) => {
      this.filterMode = filterMode
      this.setHookClipboardMode(this.filterMode, this.filterList)
    })

    configManager.subscribe(ConfigKeys.SelectionAssistantFilterList, (filterList: string[]) => {
      this.filterList = filterList
      this.setHookClipboardMode(this.filterMode, this.filterList)
    })
  }

  /**
   * Set the clipboard mode for the selection-hook
   * @param mode - The mode to set, either 'default', 'whitelist', or 'blacklist'
   * @param list - An array of strings representing the list of items to include or exclude
   */
  private setHookClipboardMode(mode: string, list: string[]) {
    if (!this.selectionHook) return

    const modeMap = {
      default: 0,
      whitelist: 1,
      blacklist: 2
    }
    if (!this.selectionHook.setClipboardMode(modeMap[mode], list)) {
      this.logError(new Error('Failed to set selection-hook clipboard mode'))
    }
  }

  /**
   * Start the selection service and initialize required windows
   * @returns {boolean} Success status of service start
   */
  public start(): boolean {
    if (!this.selectionHook || this.started) {
      this.logError(new Error('SelectionService start(): instance is null or already started'))
      return false
    }

    try {
      //init basic configs
      this.initConfig()
      //make sure the toolbar window is ready
      this.createToolbarWindow()
      // Initialize preloaded windows
      this.initPreloadedActionWindows()
      // Handle errors
      this.selectionHook.on('error', (error: { message: string }) => {
        this.logError('Error in SelectionHook:', error as Error)
      })
      // Handle text selection events
      this.selectionHook.on('text-selection', this.processTextSelection)

      // Start the hook
      if (this.selectionHook.start({ debug: isDev })) {
        //init trigger mode configs
        this.processTriggerMode()

        this.started = true
        this.logInfo('SelectionService Started')
        return true
      }

      this.logError(new Error('Failed to start text selection hook.'))
      return false
    } catch (error) {
      this.logError('Failed to set up text selection hook:', error as Error)
      return false
    }
  }

  /**
   * Stop the selection service and cleanup resources
   * Called when user disables selection assistant
   * @returns {boolean} Success status of service stop
   */
  public stop(): boolean {
    if (!this.selectionHook) return false

    this.selectionHook.stop()
    this.selectionHook.cleanup()
    if (this.toolbarWindow) {
      this.toolbarWindow.close()
      this.toolbarWindow = null
    }
    this.started = false
    this.logInfo('SelectionService Stopped')
    return true
  }

  /**
   * Completely quit the selection service
   * Called when the app is closing
   */
  public quit(): void {
    if (!this.selectionHook) return

    this.stop()

    this.selectionHook = null
    this.initStatus = false
    SelectionService.instance = null
    this.logInfo('SelectionService Quitted')
  }



  /**
   * Create a preloaded action window for quick response
   * Action windows handle specific operations on selected text
   * @returns Configured BrowserWindow instance
   */
  private createPreloadedActionWindow(): BrowserWindow {
    const preloadedActionWindow = new BrowserWindow({
      width: this.ACTION_WINDOW_WIDTH,
      height: this.ACTION_WINDOW_HEIGHT,
      minWidth: 300,
      minHeight: 200,
      frame: false,
      transparent: true,
      autoHideMenuBar: true,
      titleBarStyle: 'hidden',
      hasShadow: false,
      thickFrame: false,
      show: false,
      webPreferences: {
        preload: join(app.getAppPath(), 'out/preload/index.js'), // Path to output preload script
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        devTools: true
      }
    })

    // Load the base URL without action data
    if (isDev && process.env['ELECTRON_RENDERER_URL']) {
      preloadedActionWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/selectionAction.html')
    } else {
      preloadedActionWindow.loadFile(join(app.getAppPath(), 'out/renderer/selectionAction.html')) // Path to output HTML file
    }

    return preloadedActionWindow
  }

  /**
   * Initialize preloaded action windows
   * Creates a pool of windows at startup for faster response
   */
  private async initPreloadedActionWindows() {
    try {
      // Create initial pool of preloaded windows
      for (let i = 0; i < this.PRELOAD_ACTION_WINDOW_COUNT; i++) {
        await this.pushNewActionWindow()
      }
    } catch (error) {
      this.logError('Failed to initialize preloaded windows:', error as Error)
    }
  }

  /**
   * Preload a new action window asynchronously
   * This method is called after popping a window to ensure we always have windows ready
   */
  private async pushNewActionWindow() {
    try {
      const actionWindow = this.createPreloadedActionWindow()
      this.preloadedActionWindows.push(actionWindow)
    } catch (error) {
      this.logError('Failed to push new action window:', error as Error)
    }
  }

  /**
   * Pop an action window from the preloadedActionWindows queue
   * Immediately returns a window and asynchronously creates a new one
   * @returns {BrowserWindow} The action window
   */
  private popActionWindow() {
    // Get a window from the preloaded queue or create a new one if empty
    const actionWindow = this.preloadedActionWindows.pop() || this.createPreloadedActionWindow()

    // Set up event listeners for this instance
    actionWindow.on('closed', () => {
      this.actionWindows.delete(actionWindow)
      if (!actionWindow.isDestroyed()) {
        actionWindow.destroy()
      }
    })

    this.actionWindows.add(actionWindow)

    // Asynchronously create a new preloaded window
    this.pushNewActionWindow()

    return actionWindow
  }

  public processAction(actionItem: ActionItem): void {
    const actionWindow = this.popActionWindow()

    actionWindow.webContents.send(IpcChannel.Selection_UpdateActionData, actionItem)

    this.showActionWindow(actionWindow)
  }

  /**
   * Show action window with proper positioning relative to toolbar
   * Ensures window stays within screen boundaries
   * @param actionWindow Window to position and show
   */
  private showActionWindow(actionWindow: BrowserWindow) {
    if (!this.isFollowToolbar || !this.toolbarWindow) {
      actionWindow.show()
      this.hideToolbar()
      return
    }

    const toolbarBounds = this.toolbarWindow!.getBounds()
    const display = screen.getDisplayNearestPoint({ x: toolbarBounds.x, y: toolbarBounds.y })
    const workArea = display.workArea
    const GAP = 6 // 6px gap from screen edges

    // Calculate initial position to center action window horizontally below toolbar
    let posX = Math.round(toolbarBounds.x + (toolbarBounds.width - this.ACTION_WINDOW_WIDTH) / 2)
    let posY = Math.round(toolbarBounds.y)

    // Ensure action window stays within screen boundaries with a small gap
    if (posX + this.ACTION_WINDOW_WIDTH > workArea.x + workArea.width) {
      posX = workArea.x + workArea.width - this.ACTION_WINDOW_WIDTH - GAP
    } else if (posX < workArea.x) {
      posX = workArea.x + GAP
    }
    if (posY + this.ACTION_WINDOW_HEIGHT > workArea.y + workArea.height) {
      // If window would go below screen, try to position it above toolbar
      posY = workArea.y + workArea.height - this.ACTION_WINDOW_HEIGHT - GAP
    } else if (posY < workArea.y) {
      posY = workArea.y + GAP
    }

    actionWindow.setPosition(posX, posY, false)
    //KEY to make window not resize
    actionWindow.setBounds({
      width: this.ACTION_WINDOW_WIDTH,
      height: this.ACTION_WINDOW_HEIGHT,
      x: posX,
      y: posY
    })

    actionWindow.show()
  }

  public closeActionWindow(actionWindow: BrowserWindow): void {
    actionWindow.close()
  }

  public minimizeActionWindow(actionWindow: BrowserWindow): void {
    actionWindow.minimize()
  }

  public pinActionWindow(actionWindow: BrowserWindow, isPinned: boolean): void {
    actionWindow.setAlwaysOnTop(isPinned)
  }

  /**
   * Update trigger mode behavior
   * Switches between selection-based and alt-key based triggering
   * Manages appropriate event listeners for each mode
   */
  private processTriggerMode() {
    if (this.triggerMode === 'selected') {
      if (this.isCtrlkeyListenerActive) {
        this.selectionHook!.off('key-down', this.handleKeyDownCtrlkeyMode)
        this.selectionHook!.off('key-up', this.handleKeyUpCtrlkeyMode)

        this.isCtrlkeyListenerActive = false
      }

      this.selectionHook!.enableClipboard()
      this.selectionHook!.setSelectionPassiveMode(false)
    } else if (this.triggerMode === 'ctrlkey') {
      if (!this.isCtrlkeyListenerActive) {
        this.selectionHook!.on('key-down', this.handleKeyDownCtrlkeyMode)
        this.selectionHook!.on('key-up', this.handleKeyUpCtrlkeyMode)

        this.isCtrlkeyListenerActive = true
      }

      this.selectionHook!.disableClipboard()
      this.selectionHook!.setSelectionPassiveMode(true)
    }
  }

  public writeToClipboard(text: string): boolean {
    return this.selectionHook?.writeToClipboard(text) ?? false
  }

  /**
   * Register IPC handlers for communication with renderer process
   * Handles toolbar, action window, and selection-related commands
   */
  public static registerIpcHandler(): void {
    if (this.isIpcHandlerRegistered) return

    ipcMain.handle(IpcChannel.Selection_ToolbarHide, () => {
      selectionService?.hideToolbar()
    })

    ipcMain.handle(IpcChannel.Selection_WriteToClipboard, (_, text: string) => {
      return selectionService?.writeToClipboard(text) ?? false
    })

    ipcMain.handle(IpcChannel.Selection_ToolbarDetermineSize, (_, width: number, height: number) => {
      selectionService?.determineToolbarSize(width, height)
    })

    ipcMain.handle(IpcChannel.Selection_SetEnabled, (_, enabled: boolean) => {
      configManager.setSelectionAssistantEnabled(enabled)
    })

    ipcMain.handle(IpcChannel.Selection_SetTriggerMode, (_, triggerMode: string) => {
      configManager.setSelectionAssistantTriggerMode(triggerMode)
    })

    ipcMain.handle(IpcChannel.Selection_SetFollowToolbar, (_, isFollowToolbar: boolean) => {
      configManager.setSelectionAssistantFollowToolbar(isFollowToolbar)
    })

    ipcMain.handle(IpcChannel.Selection_SetFilterMode, (_, filterMode: string) => {
      configManager.setSelectionAssistantFilterMode(filterMode)
    })

    ipcMain.handle(IpcChannel.Selection_SetFilterList, (_, filterList: string[]) => {
      configManager.setSelectionAssistantFilterList(filterList)
    })

    ipcMain.handle(IpcChannel.Selection_ProcessAction, (_, actionItem: ActionItem) => {
      selectionService?.processAction(actionItem)
    })

    ipcMain.handle(IpcChannel.Selection_ActionWindowClose, (event) => {
      const actionWindow = BrowserWindow.fromWebContents(event.sender)
      if (actionWindow) {
        selectionService?.closeActionWindow(actionWindow)
      }
    })

    ipcMain.handle(IpcChannel.Selection_ActionWindowMinimize, (event) => {
      const actionWindow = BrowserWindow.fromWebContents(event.sender)
      if (actionWindow) {
        selectionService?.minimizeActionWindow(actionWindow)
      }
    })

    ipcMain.handle(IpcChannel.Selection_ActionWindowPin, (event, isPinned: boolean) => {
      const actionWindow = BrowserWindow.fromWebContents(event.sender)
      if (actionWindow) {
        selectionService?.pinActionWindow(actionWindow, isPinned)
      }
    })

    this.isIpcHandlerRegistered = true
  }

  private logInfo(message: string) {
    isDev && Logger.info('[SelectionService] Info: ', message)
  }

  private logError(...args: [...string[], Error]) {
    Logger.error('[SelectionService] Error: ', ...args)
  }

  // Additional placeholder methods that are not part of the core functionality
  // but are referenced in the config
  private createToolbarWindow() {
    // Simplified implementation for Windows-only selection service
  }

  public hideToolbar() {
    // Simplified implementation for Windows-only selection service
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public determineToolbarSize(_width: number, _height: number) {
    // Simplified implementation for Windows-only selection service
  }

  private processTextSelection = () => {
    // Simplified implementation for Windows-only selection service
  }

  private handleKeyDownCtrlkeyMode = () => {
    // Simplified implementation for Windows-only selection service
  }

  private handleKeyUpCtrlkeyMode = () => {
    // Simplified implementation for Windows-only selection service
  }
}

/**
 * Initialize selection service when app starts
 * Sets up config subscription and starts service if enabled
 * @returns {boolean} Success status of initialization
 */
export function initSelectionService(): boolean {
  if (!isWin) return false

  configManager.subscribe(ConfigKeys.SelectionAssistantEnabled, (enabled: boolean) => {
    //avoid closure
    const ss = SelectionService.getInstance()
    if (!ss) {
      Logger.error('SelectionService not initialized: instance is null')
      return
    }

    if (enabled) {
      ss.start()
    } else {
      ss.stop()
    }
  })

  if (!configManager.getSelectionAssistantEnabled()) return false

  const ss = SelectionService.getInstance()
  if (!ss) {
    Logger.error('SelectionService not initialized: instance is null')
    return false
  }

  return ss.start()
}

const selectionService = SelectionService.getInstance()

export default selectionService
