import { IpcChannel } from '@shared/IpcChannel'
import { Rectangle, ipcMain } from 'electron'
import Logger from 'electron-log'

import webContentsViewService from '../services/WebContentsViewService'

/**
 * Register IPC handlers for WebContentsView operations
 */
export function registerWebContentsViewIpc() {
  // Create a new WebContentsView
  ipcMain.handle(IpcChannel.WebContentsView_Create, async (_event, appId: string, url: string) => {
    try {
      const view = webContentsViewService.createView(appId, url)
      return { success: !!view }
    } catch (error) {
      Logger.error('Error creating WebContentsView:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Show a WebContentsView
  ipcMain.handle(IpcChannel.WebContentsView_Show, (_event, appId: string, bounds: Rectangle) => {
    try {
      webContentsViewService.showView(appId, bounds)
      return { success: true }
    } catch (error) {
      Logger.error('Error showing WebContentsView:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Hide a WebContentsView
  ipcMain.handle(IpcChannel.WebContentsView_Hide, (_event, appId: string) => {
    try {
      webContentsViewService.hideView(appId)
      return { success: true }
    } catch (error) {
      Logger.error('Error hiding WebContentsView:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Hide all WebContentsViews
  ipcMain.handle(IpcChannel.WebContentsView_HideAll, () => {
    try {
      webContentsViewService.hideAllViews()
      return { success: true }
    } catch (error) {
      Logger.error('Error hiding all WebContentsViews:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Destroy a WebContentsView
  ipcMain.handle(IpcChannel.WebContentsView_Destroy, (_event, appId: string) => {
    try {
      webContentsViewService.destroyView(appId)
      return { success: true }
    } catch (error) {
      Logger.error('Error destroying WebContentsView:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Open DevTools for a WebContentsView
  ipcMain.handle(IpcChannel.WebContentsView_OpenDevTools, (_event, appId: string) => {
    try {
      webContentsViewService.openDevTools(appId)
      return { success: true }
    } catch (error) {
      Logger.error('Error opening DevTools for WebContentsView:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Set whether links should open externally
  ipcMain.handle(
    IpcChannel.WebContentsView_SetOpenLinksExternally,
    (_event, appId: string, openExternal: boolean) => {
      try {
        webContentsViewService.setOpenLinksExternally(appId, openExternal)
        return { success: true }
      } catch (error) {
        Logger.error('Error setting open links externally for WebContentsView:', error)
        return { success: false, error: (error as Error).message }
      }
    }
  )

  // Reload a WebContentsView
  ipcMain.handle(IpcChannel.WebContentsView_Reload, async (_event, appId: string, url?: string) => {
    try {
      const success = await webContentsViewService.reloadView(appId, url)
      return { success }
    } catch (error) {
      Logger.error('Error reloading WebContentsView:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Get the current URL of a WebContentsView
  ipcMain.handle(IpcChannel.WebContentsView_GetURL, (_event, appId: string) => {
    try {
      const url = webContentsViewService.getCurrentUrl(appId)
      if (!url) {
        return { success: false, error: 'WebContentsView not found or URL not available' }
      }
      return { success: true, url }
    } catch (error) {
      Logger.error('Error getting URL for WebContentsView:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Get the WebContents ID for a WebContentsView
  ipcMain.handle(IpcChannel.WebContentsView_GetWebContentsId, (_event, appId: string) => {
    try {
      const id = webContentsViewService.getWebContentsId(appId)
      if (id === null) {
        return { success: false, error: 'WebContentsView not found or ID not available' }
      }
      return { success: true, id }
    } catch (error) {
      Logger.error('Error getting WebContents ID for WebContentsView:', error)
      return { success: false, error: (error as Error).message }
    }
  })
}