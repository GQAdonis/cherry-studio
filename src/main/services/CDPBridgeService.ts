/**
 * CDPBridgeService - Chrome DevTools Protocol Bridge for Webview Automation
 *
 * This service provides high-level methods for automating Electron webviews
 * using the Chrome DevTools Protocol (CDP). It enables screenshot capture,
 * DOM interaction, JavaScript evaluation, and navigation control.
 */

import { loggerService } from '@logger'
import { EventEmitter } from 'events'
import { webContents, type WebContents } from 'electron'

const logger = loggerService.withContext('CDPBridgeService')

export interface CDPSession {
  webContentsId: number
  attached: boolean
}

export interface ScreenshotOptions {
  format?: 'jpeg' | 'png' | 'webp'
  quality?: number
  clip?: {
    x: number
    y: number
    width: number
    height: number
  }
  fullPage?: boolean
}

export interface ClickOptions {
  button?: 'left' | 'right' | 'middle'
  clickCount?: number
  delay?: number
}

export interface TypeOptions {
  delay?: number
}

export interface ScrollOptions {
  x?: number
  y?: number
  deltaX?: number
  deltaY?: number
}

export interface ElementInfo {
  selector: string
  x: number
  y: number
  width: number
  height: number
  text?: string
  tagName: string
  attributes: Record<string, string>
}

export interface CDPCommandResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

class CDPBridgeService extends EventEmitter {
  private sessions: Map<number, CDPSession> = new Map()

  constructor() {
    super()
    logger.info('CDPBridgeService initialized')
  }

  /**
   * Get WebContents by ID
   */
  private getWebContents(webContentsId: number): WebContents | null {
    const contents = webContents.fromId(webContentsId)
    if (!contents || contents.isDestroyed()) {
      return null
    }
    return contents
  }

  /**
   * Attach CDP debugger to a webview
   */
  async attach(webContentsId: number): Promise<CDPCommandResult<void>> {
    try {
      const contents = this.getWebContents(webContentsId)
      if (!contents) {
        return { success: false, error: `WebContents ${webContentsId} not found` }
      }

      // Check if already attached
      if (this.sessions.has(webContentsId)) {
        return { success: true }
      }

      // Attach debugger
      contents.debugger.attach('1.3')

      this.sessions.set(webContentsId, {
        webContentsId,
        attached: true
      })

      // Listen for debugger events
      contents.debugger.on('message', (_event, method, params) => {
        this.emit('cdp-message', { webContentsId, method, params })
      })

      contents.debugger.on('detach', (_event, reason) => {
        logger.info(`Debugger detached from ${webContentsId}: ${reason}`)
        this.sessions.delete(webContentsId)
        this.emit('detached', { webContentsId, reason })
      })

      logger.info(`Attached CDP debugger to webContents ${webContentsId}`)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Failed to attach CDP debugger: ${message}`)
      return { success: false, error: message }
    }
  }

  /**
   * Detach CDP debugger from a webview
   */
  async detach(webContentsId: number): Promise<CDPCommandResult<void>> {
    try {
      const contents = this.getWebContents(webContentsId)
      if (!contents) {
        this.sessions.delete(webContentsId)
        return { success: true }
      }

      if (contents.debugger.isAttached()) {
        contents.debugger.detach()
      }

      this.sessions.delete(webContentsId)
      logger.info(`Detached CDP debugger from webContents ${webContentsId}`)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Failed to detach CDP debugger: ${message}`)
      return { success: false, error: message }
    }
  }

  /**
   * Send a CDP command to a webview
   */
  async sendCommand<T = unknown>(
    webContentsId: number,
    method: string,
    params: Record<string, unknown> = {}
  ): Promise<CDPCommandResult<T>> {
    try {
      const contents = this.getWebContents(webContentsId)
      if (!contents) {
        return { success: false, error: `WebContents ${webContentsId} not found` }
      }

      // Auto-attach if not attached
      if (!contents.debugger.isAttached()) {
        const attachResult = await this.attach(webContentsId)
        if (!attachResult.success) {
          return { success: false, error: attachResult.error }
        }
      }

      const result = await contents.debugger.sendCommand(method, params)
      return { success: true, data: result as T }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`CDP command ${method} failed: ${message}`)
      return { success: false, error: message }
    }
  }

  /**
   * Take a screenshot of the webview
   */
  async screenshot(
    webContentsId: number,
    options: ScreenshotOptions = {}
  ): Promise<CDPCommandResult<string>> {
    try {
      const { format = 'png', quality = 80, clip, fullPage = false } = options

      // If fullPage, get the full document dimensions first
      let captureParams: Record<string, unknown> = {
        format,
        quality: format === 'jpeg' ? quality : undefined
      }

      if (fullPage) {
        // Get page dimensions
        const metricsResult = await this.sendCommand<{
          contentSize: { width: number; height: number }
        }>(webContentsId, 'Page.getLayoutMetrics')

        if (metricsResult.success && metricsResult.data) {
          const { width, height } = metricsResult.data.contentSize
          captureParams.clip = { x: 0, y: 0, width, height, scale: 1 }
        }
      } else if (clip) {
        captureParams.clip = { ...clip, scale: 1 }
      }

      const result = await this.sendCommand<{ data: string }>(
        webContentsId,
        'Page.captureScreenshot',
        captureParams
      )

      if (!result.success) {
        return { success: false, error: result.error }
      }

      return { success: true, data: result.data?.data }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * Click at specific coordinates
   */
  async click(
    webContentsId: number,
    x: number,
    y: number,
    options: ClickOptions = {}
  ): Promise<CDPCommandResult<void>> {
    try {
      const { button = 'left', clickCount = 1, delay = 50 } = options
      const buttonMap = { left: 0, right: 2, middle: 1 }

      // Mouse down
      await this.sendCommand(webContentsId, 'Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x,
        y,
        button: button,
        clickCount,
        buttons: 1 << buttonMap[button]
      })

      // Wait for delay
      await new Promise((resolve) => setTimeout(resolve, delay))

      // Mouse up
      await this.sendCommand(webContentsId, 'Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x,
        y,
        button: button,
        clickCount,
        buttons: 0
      })

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * Click an element by CSS selector
   */
  async clickElement(
    webContentsId: number,
    selector: string,
    options: ClickOptions = {}
  ): Promise<CDPCommandResult<void>> {
    try {
      const elementInfo = await this.getElementInfo(webContentsId, selector)
      if (!elementInfo.success || !elementInfo.data) {
        return { success: false, error: `Element not found: ${selector}` }
      }

      const { x, y, width, height } = elementInfo.data
      const centerX = x + width / 2
      const centerY = y + height / 2

      return await this.click(webContentsId, centerX, centerY, options)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * Type text into the focused element
   */
  async type(
    webContentsId: number,
    text: string,
    options: TypeOptions = {}
  ): Promise<CDPCommandResult<void>> {
    try {
      const { delay = 0 } = options

      for (const char of text) {
        await this.sendCommand(webContentsId, 'Input.dispatchKeyEvent', {
          type: 'keyDown',
          text: char,
          key: char,
          code: `Key${char.toUpperCase()}`
        })

        await this.sendCommand(webContentsId, 'Input.dispatchKeyEvent', {
          type: 'keyUp',
          key: char,
          code: `Key${char.toUpperCase()}`
        })

        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * Insert text (faster than typing character by character)
   */
  async insertText(webContentsId: number, text: string): Promise<CDPCommandResult<void>> {
    try {
      await this.sendCommand(webContentsId, 'Input.insertText', { text })
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * Scroll the page
   */
  async scroll(webContentsId: number, options: ScrollOptions = {}): Promise<CDPCommandResult<void>> {
    try {
      const { x = 0, y = 0, deltaX = 0, deltaY = 0 } = options

      await this.sendCommand(webContentsId, 'Input.dispatchMouseEvent', {
        type: 'mouseWheel',
        x,
        y,
        deltaX,
        deltaY
      })

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * Navigate to a URL
   */
  async navigate(webContentsId: number, url: string): Promise<CDPCommandResult<void>> {
    try {
      await this.sendCommand(webContentsId, 'Page.navigate', { url })
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * Reload the page
   */
  async reload(webContentsId: number, ignoreCache = false): Promise<CDPCommandResult<void>> {
    try {
      await this.sendCommand(webContentsId, 'Page.reload', { ignoreCache })
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * Go back in history
   */
  async goBack(webContentsId: number): Promise<CDPCommandResult<void>> {
    try {
      const contents = this.getWebContents(webContentsId)
      if (!contents) {
        return { success: false, error: `WebContents ${webContentsId} not found` }
      }

      if (contents.canGoBack()) {
        contents.goBack()
        return { success: true }
      }
      return { success: false, error: 'Cannot go back' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * Go forward in history
   */
  async goForward(webContentsId: number): Promise<CDPCommandResult<void>> {
    try {
      const contents = this.getWebContents(webContentsId)
      if (!contents) {
        return { success: false, error: `WebContents ${webContentsId} not found` }
      }

      if (contents.canGoForward()) {
        contents.goForward()
        return { success: true }
      }
      return { success: false, error: 'Cannot go forward' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * Evaluate JavaScript in the page context
   */
  async evaluate<T = unknown>(
    webContentsId: number,
    expression: string,
    awaitPromise = true
  ): Promise<CDPCommandResult<T>> {
    try {
      const result = await this.sendCommand<{
        result: { value: T; type: string }
        exceptionDetails?: { text: string }
      }>(webContentsId, 'Runtime.evaluate', {
        expression,
        awaitPromise,
        returnByValue: true
      })

      if (!result.success) {
        return { success: false, error: result.error }
      }

      if (result.data?.exceptionDetails) {
        return { success: false, error: result.data.exceptionDetails.text }
      }

      return { success: true, data: result.data?.result.value }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * Get element information by selector
   */
  async getElementInfo(webContentsId: number, selector: string): Promise<CDPCommandResult<ElementInfo>> {
    try {
      const script = `
        (function() {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          const attrs = {};
          for (const attr of el.attributes) {
            attrs[attr.name] = attr.value;
          }
          return {
            selector: ${JSON.stringify(selector)},
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            text: el.textContent?.trim().substring(0, 100),
            tagName: el.tagName.toLowerCase(),
            attributes: attrs
          };
        })()
      `

      const result = await this.evaluate<ElementInfo | null>(webContentsId, script)
      if (!result.success) {
        return { success: false, error: result.error }
      }

      if (!result.data) {
        return { success: false, error: `Element not found: ${selector}` }
      }

      return { success: true, data: result.data }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * Wait for an element to appear
   */
  async waitForElement(
    webContentsId: number,
    selector: string,
    timeout = 30000
  ): Promise<CDPCommandResult<ElementInfo>> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const result = await this.getElementInfo(webContentsId, selector)
      if (result.success && result.data) {
        return result
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    return { success: false, error: `Timeout waiting for element: ${selector}` }
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(webContentsId: number, timeout = 30000): Promise<CDPCommandResult<void>> {
    try {
      const contents = this.getWebContents(webContentsId)
      if (!contents) {
        return { success: false, error: `WebContents ${webContentsId} not found` }
      }

      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          contents.removeListener('did-finish-load', onFinish)
          resolve({ success: false, error: 'Navigation timeout' })
        }, timeout)

        const onFinish = () => {
          clearTimeout(timer)
          resolve({ success: true })
        }

        contents.once('did-finish-load', onFinish)
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * Get the current URL
   */
  async getURL(webContentsId: number): Promise<CDPCommandResult<string>> {
    try {
      const contents = this.getWebContents(webContentsId)
      if (!contents) {
        return { success: false, error: `WebContents ${webContentsId} not found` }
      }
      return { success: true, data: contents.getURL() }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * Get the page title
   */
  async getTitle(webContentsId: number): Promise<CDPCommandResult<string>> {
    try {
      const contents = this.getWebContents(webContentsId)
      if (!contents) {
        return { success: false, error: `WebContents ${webContentsId} not found` }
      }
      return { success: true, data: contents.getTitle() }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * Get page text content
   */
  async getTextContent(webContentsId: number): Promise<CDPCommandResult<string>> {
    const script = `document.body.innerText`
    return await this.evaluate<string>(webContentsId, script)
  }

  /**
   * Get page HTML content
   */
  async getHTML(webContentsId: number): Promise<CDPCommandResult<string>> {
    const script = `document.documentElement.outerHTML`
    return await this.evaluate<string>(webContentsId, script)
  }

  /**
   * Focus an element by selector
   */
  async focus(webContentsId: number, selector: string): Promise<CDPCommandResult<void>> {
    const script = `
      (function() {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (el) {
          el.focus();
          return true;
        }
        return false;
      })()
    `

    const result = await this.evaluate<boolean>(webContentsId, script)
    if (!result.success) {
      return { success: false, error: result.error }
    }

    if (!result.data) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    return { success: true }
  }

  /**
   * Get all attached sessions
   */
  getSessions(): CDPSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Check if a webview has an attached session
   */
  isAttached(webContentsId: number): boolean {
    return this.sessions.has(webContentsId)
  }

  /**
   * Cleanup all sessions
   */
  async cleanup(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys())
    for (const id of sessionIds) {
      await this.detach(id)
    }
    logger.info('All CDP sessions cleaned up')
  }
}

// Export singleton instance
export const cdpBridgeService = new CDPBridgeService()
export default cdpBridgeService

