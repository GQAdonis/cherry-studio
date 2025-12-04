/**
 * WebViewRegistryService - Tracks all mini-app webviews and their state
 *
 * This service maintains a registry of all embedded webviews (mini-apps),
 * tracking their webContentsId, appId, URL, title, and loading state.
 * It enables other services to look up webviews by appId or webContentsId.
 */

import { loggerService } from '@logger'
import { app, type WebContents, webContents } from 'electron'
import { EventEmitter } from 'events'

const logger = loggerService.withContext('WebViewRegistryService')

export interface WebViewInfo {
  webContentsId: number
  appId: string
  url: string
  title: string
  loaded: boolean
  registeredAt: Date
  favicon?: string
}

export interface WebViewUpdatePayload {
  url?: string
  title?: string
  loaded?: boolean
  favicon?: string
}

class WebViewRegistryService extends EventEmitter {
  private registry: Map<number, WebViewInfo> = new Map()
  private appIdToWebContentsId: Map<string, number> = new Map()

  constructor() {
    super()
    this.setupCleanupHandlers()
    logger.info('WebViewRegistryService initialized')
  }

  /**
   * Setup handlers to clean up destroyed webviews
   */
  private setupCleanupHandlers(): void {
    app.on('web-contents-created', (_, contents) => {
      if (contents.getType() === 'webview') {
        contents.once('destroyed', () => {
          this.unregisterByWebContentsId(contents.id)
        })
      }
    })
  }

  /**
   * Register a webview
   */
  register(webContentsId: number, appId: string, initialUrl: string = ''): WebViewInfo {
    // Remove any existing registration for this appId
    const existingId = this.appIdToWebContentsId.get(appId)
    if (existingId !== undefined && existingId !== webContentsId) {
      this.unregisterByWebContentsId(existingId)
    }

    const info: WebViewInfo = {
      webContentsId,
      appId,
      url: initialUrl,
      title: '',
      loaded: false,
      registeredAt: new Date()
    }

    this.registry.set(webContentsId, info)
    this.appIdToWebContentsId.set(appId, webContentsId)

    // Setup event listeners for this webview
    this.setupWebViewListeners(webContentsId)

    logger.info(`Registered webview: appId=${appId}, webContentsId=${webContentsId}`)
    this.emit('registered', info)

    return info
  }

  /**
   * Setup event listeners for a webview to track state changes
   */
  private setupWebViewListeners(webContentsId: number): void {
    const contents = webContents.fromId(webContentsId)
    if (!contents || contents.isDestroyed()) return

    // Track URL changes
    contents.on('did-navigate', (_, url) => {
      this.update(webContentsId, { url })
    })

    contents.on('did-navigate-in-page', (_, url) => {
      this.update(webContentsId, { url })
    })

    // Track title changes
    contents.on('page-title-updated', (_, title) => {
      this.update(webContentsId, { title })
    })

    // Track load state
    contents.on('did-start-loading', () => {
      this.update(webContentsId, { loaded: false })
    })

    contents.on('did-finish-load', () => {
      this.update(webContentsId, { loaded: true })
    })

    contents.on('did-fail-load', () => {
      this.update(webContentsId, { loaded: true })
    })

    // Track favicon
    contents.on('page-favicon-updated', (_, favicons) => {
      if (favicons.length > 0) {
        this.update(webContentsId, { favicon: favicons[0] })
      }
    })
  }

  /**
   * Update webview info
   */
  update(webContentsId: number, payload: WebViewUpdatePayload): void {
    const info = this.registry.get(webContentsId)
    if (!info) return

    const updatedInfo = { ...info, ...payload }
    this.registry.set(webContentsId, updatedInfo)

    this.emit('updated', updatedInfo)
  }

  /**
   * Unregister a webview by webContentsId
   */
  unregisterByWebContentsId(webContentsId: number): boolean {
    const info = this.registry.get(webContentsId)
    if (!info) return false

    this.registry.delete(webContentsId)
    this.appIdToWebContentsId.delete(info.appId)

    logger.info(`Unregistered webview: appId=${info.appId}, webContentsId=${webContentsId}`)
    this.emit('unregistered', info)

    return true
  }

  /**
   * Unregister a webview by appId
   */
  unregisterByAppId(appId: string): boolean {
    const webContentsId = this.appIdToWebContentsId.get(appId)
    if (webContentsId === undefined) return false

    return this.unregisterByWebContentsId(webContentsId)
  }

  /**
   * Get webview info by webContentsId
   */
  getByWebContentsId(webContentsId: number): WebViewInfo | undefined {
    return this.registry.get(webContentsId)
  }

  /**
   * Get webview info by appId
   */
  getByAppId(appId: string): WebViewInfo | undefined {
    const webContentsId = this.appIdToWebContentsId.get(appId)
    if (webContentsId === undefined) return undefined

    return this.registry.get(webContentsId)
  }

  /**
   * Get WebContents by appId
   */
  getWebContentsByAppId(appId: string): WebContents | null {
    const webContentsId = this.appIdToWebContentsId.get(appId)
    if (webContentsId === undefined) return null

    const contents = webContents.fromId(webContentsId)
    if (!contents || contents.isDestroyed()) {
      // Clean up stale reference
      this.unregisterByAppId(appId)
      return null
    }

    return contents
  }

  /**
   * List all registered webviews
   */
  listAll(): WebViewInfo[] {
    // Validate and clean up stale entries
    const validEntries: WebViewInfo[] = []

    for (const [webContentsId, info] of this.registry) {
      const contents = webContents.fromId(webContentsId)
      if (contents && !contents.isDestroyed()) {
        validEntries.push(info)
      } else {
        // Clean up stale entry
        this.unregisterByWebContentsId(webContentsId)
      }
    }

    return validEntries
  }

  /**
   * Check if an appId is registered
   */
  isRegistered(appId: string): boolean {
    return this.appIdToWebContentsId.has(appId)
  }

  /**
   * Get the count of registered webviews
   */
  count(): number {
    return this.registry.size
  }

  /**
   * Find webviews by URL pattern
   */
  findByUrlPattern(pattern: string | RegExp): WebViewInfo[] {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
    return this.listAll().filter((info) => regex.test(info.url))
  }

  /**
   * Get webview info with current state from WebContents
   */
  getFullInfo(appId: string): (WebViewInfo & { canGoBack: boolean; canGoForward: boolean }) | null {
    const info = this.getByAppId(appId)
    if (!info) return null

    const contents = webContents.fromId(info.webContentsId)
    if (!contents || contents.isDestroyed()) return null

    return {
      ...info,
      url: contents.getURL(),
      title: contents.getTitle(),
      canGoBack: contents.canGoBack(),
      canGoForward: contents.canGoForward()
    }
  }

  /**
   * Clear all registered webviews
   */
  clear(): void {
    const count = this.registry.size
    this.registry.clear()
    this.appIdToWebContentsId.clear()
    logger.info(`Cleared ${count} registered webviews`)
    this.emit('cleared')
  }
}

// Export singleton instance
export const webViewRegistryService = new WebViewRegistryService()
export default webViewRegistryService
