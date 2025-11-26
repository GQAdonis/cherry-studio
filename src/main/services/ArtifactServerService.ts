/**
 * Artifact Server Service
 *
 * Provides a local Express server for handling HTMX requests from artifact iframes.
 * The server runs on a random available port and provides endpoints for:
 * - HTMX form submissions and interactions
 * - Dynamic content updates
 * - State management for artifact components
 */

import { createServer, type Server } from 'node:http'

import { IpcChannel } from '@shared/IpcChannel'
import cors from 'cors'
import { ipcMain } from 'electron'
import express, { type Express, type Request, type Response } from 'express'

import { loggerService } from './LoggerService'
import { windowService } from './WindowService'

const logger = loggerService.withContext('ArtifactServerService')

/**
 * HTMX request context
 */
interface HtmxContext {
  artifactId: string
  trigger?: string
  target?: string
  prompt?: string
  currentContent?: string
}

/**
 * Registered HTMX handler
 */
type HtmxHandler = (ctx: HtmxContext, req: Request) => Promise<string>

/**
 * Artifact Server for HTMX communication
 */
export class ArtifactServerService {
  private app: Express | null = null
  private server: Server | null = null
  private port: number | null = null
  private handlers: Map<string, HtmxHandler> = new Map()
  private artifactStates: Map<string, Record<string, unknown>> = new Map()

  constructor() {
    this.setupDefaultHandlers()
  }

  /**
   * Start the artifact server on a random available port
   */
  async start(): Promise<number> {
    if (this.server && this.server.listening) {
      logger.warn('Artifact server already running', { port: this.port })
      return this.port!
    }

    // Clean up any failed server instance
    if (this.server && !this.server.listening) {
      logger.warn('Cleaning up failed artifact server instance')
      this.server = null
      this.app = null
    }

    // Create Express app
    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()

    // Create HTTP server
    this.server = createServer(this.app)

    // Start server on random available port
    return new Promise((resolve, reject) => {
      this.server!.listen(0, '127.0.0.1', () => {
        const address = this.server!.address()
        if (typeof address === 'object' && address !== null) {
          this.port = address.port
          logger.info('Artifact server started', { port: this.port })

          // Notify renderer
          this.notifyRenderer('started', this.port)
          resolve(this.port)
        } else {
          reject(new Error('Failed to get server port'))
        }
      })

      this.server!.on('error', (error) => {
        logger.error('Artifact server error:', error)
        this.server = null
        this.app = null
        reject(error)
      })
    })
  }

  /**
   * Stop the artifact server
   */
  async stop(): Promise<void> {
    if (!this.server) return

    return new Promise((resolve) => {
      this.server!.close(() => {
        logger.info('Artifact server stopped')
        this.server = null
        this.app = null
        this.port = null
        this.notifyRenderer('stopped', null)
        resolve()
      })
    })
  }

  /**
   * Get the current server port
   */
  getPort(): number | null {
    return this.port
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.server !== null && this.server.listening
  }

  /**
   * Register a custom HTMX handler
   */
  registerHandler(path: string, handler: HtmxHandler): void {
    this.handlers.set(path, handler)
    logger.debug('Registered HTMX handler', { path })
  }

  /**
   * Get or create artifact state
   */
  getArtifactState(artifactId: string): Record<string, unknown> {
    if (!this.artifactStates.has(artifactId)) {
      this.artifactStates.set(artifactId, {})
    }
    return this.artifactStates.get(artifactId)!
  }

  /**
   * Update artifact state
   */
  updateArtifactState(artifactId: string, updates: Record<string, unknown>): void {
    const current = this.getArtifactState(artifactId)
    this.artifactStates.set(artifactId, { ...current, ...updates })
  }

  /**
   * Clear artifact state
   */
  clearArtifactState(artifactId: string): void {
    this.artifactStates.delete(artifactId)
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    if (!this.app) return

    // CORS - allow requests from any origin (iframes)
    this.app.use(
      cors({
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'HX-Request', 'HX-Trigger', 'HX-Target', 'HX-Current-URL', 'X-Artifact-Id'],
        exposedHeaders: ['HX-Trigger', 'HX-Redirect', 'HX-Refresh', 'HX-Push-Url']
      })
    )

    // Parse JSON and URL-encoded bodies
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }))

    // Log all requests in development
    this.app.use((req, _res, next) => {
      logger.debug(`HTMX Request: ${req.method} ${req.path}`, {
        artifactId: req.headers['x-artifact-id'],
        trigger: req.headers['hx-trigger'],
        target: req.headers['hx-target']
      })
      next()
    })
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    if (!this.app) return

    // Health check
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', port: this.port })
    })

    // Generic HTMX handler endpoint
    this.app.all('/htmx/:action', async (req: Request, res: Response) => {
      const action = req.params.action
      const artifactId = (req.headers['x-artifact-id'] as string) || req.body?.artifactId || ''

      const ctx: HtmxContext = {
        artifactId,
        trigger: req.headers['hx-trigger'] as string,
        target: req.headers['hx-target'] as string,
        prompt: req.body?.prompt,
        currentContent: req.body?.content
      }

      try {
        // Check for registered handler
        const handler = this.handlers.get(action)
        if (handler) {
          const html = await handler(ctx, req)
          res.setHeader('Content-Type', 'text/html')
          res.send(html)
          return
        }

        // Default handlers
        const html = await this.handleDefaultAction(action, ctx, req)
        res.setHeader('Content-Type', 'text/html')
        res.send(html)
      } catch (error) {
        logger.error('HTMX handler error', error as Error)
        res.status(500).send(`<div class="error">Error: ${(error as Error).message}</div>`)
      }
    })

    // State management endpoints
    this.app.get('/state/:artifactId', (req: Request, res: Response) => {
      const state = this.getArtifactState(req.params.artifactId)
      res.json(state)
    })

    this.app.post('/state/:artifactId', (req: Request, res: Response) => {
      this.updateArtifactState(req.params.artifactId, req.body)
      res.json({ success: true })
    })

    this.app.delete('/state/:artifactId', (req: Request, res: Response) => {
      this.clearArtifactState(req.params.artifactId)
      res.json({ success: true })
    })

    // Echo endpoint for testing
    this.app.post('/echo', (req: Request, res: Response) => {
      const content = req.body?.content || req.body?.value || ''
      res.setHeader('Content-Type', 'text/html')
      res.send(`<div class="echo-response">${escapeHtml(content)}</div>`)
    })

    // Form submission endpoint
    this.app.post('/form/:formId', async (req: Request, res: Response) => {
      const formId = req.params.formId
      const artifactId = (req.headers['x-artifact-id'] as string) || ''

      // Store form data in artifact state
      this.updateArtifactState(artifactId, {
        [`form_${formId}`]: req.body,
        lastFormSubmit: new Date().toISOString()
      })

      // Send success response
      res.setHeader('Content-Type', 'text/html')
      res.send(`<div class="form-success" data-form-id="${formId}">Form submitted successfully!</div>`)
    })

    // Catch-all for unhandled routes
    this.app.use((_req, res) => {
      res.status(404).send('<div class="error">Not Found</div>')
    })
  }

  /**
   * Handle default HTMX actions
   */
  private async handleDefaultAction(action: string, ctx: HtmxContext, req: Request): Promise<string> {
    switch (action) {
      case 'click':
        // Simple click handler - just acknowledge
        return `<div class="click-response" data-trigger="${ctx.trigger || 'unknown'}">Clicked!</div>`

      case 'toggle':
        // Toggle visibility/state
        const currentState = this.getArtifactState(ctx.artifactId)
        const toggleKey = ctx.trigger || 'toggle'
        const newState = !currentState[toggleKey]
        this.updateArtifactState(ctx.artifactId, { [toggleKey]: newState })
        return `<div class="toggle-response" data-state="${newState}">${newState ? 'On' : 'Off'}</div>`

      case 'increment':
        // Increment a counter
        const state = this.getArtifactState(ctx.artifactId)
        const counterKey = ctx.trigger || 'counter'
        const count = ((state[counterKey] as number) || 0) + 1
        this.updateArtifactState(ctx.artifactId, { [counterKey]: count })
        return `<span class="counter">${count}</span>`

      case 'decrement':
        // Decrement a counter
        const decState = this.getArtifactState(ctx.artifactId)
        const decKey = ctx.trigger || 'counter'
        const decCount = Math.max(0, ((decState[decKey] as number) || 0) - 1)
        this.updateArtifactState(ctx.artifactId, { [decKey]: decCount })
        return `<span class="counter">${decCount}</span>`

      case 'load':
        // Load content (could be extended to load from various sources)
        return `<div class="loaded-content">Content loaded at ${new Date().toLocaleTimeString()}</div>`

      case 'refresh':
        // Trigger a refresh signal
        return `<div class="refresh-signal" hx-trigger="load" hx-swap="none"></div>`

      default:
        // Return the raw body as HTML if provided
        if (req.body?.html) {
          return req.body.html
        }
        return `<div class="unknown-action">Unknown action: ${escapeHtml(action)}</div>`
    }
  }

  /**
   * Setup default handlers
   */
  private setupDefaultHandlers(): void {
    // Handler for dynamic list operations
    this.registerHandler('list-add', async (ctx, req) => {
      const item = req.body?.item || 'New Item'
      const listId = req.body?.listId || 'default'
      const state = this.getArtifactState(ctx.artifactId)
      const list = (state[`list_${listId}`] as string[]) || []
      list.push(item)
      this.updateArtifactState(ctx.artifactId, { [`list_${listId}`]: list })
      return `<li class="list-item">${escapeHtml(item)}</li>`
    })

    // Handler for tab switching
    this.registerHandler('tab-switch', async (ctx, req) => {
      const tabId = req.body?.tabId || ctx.trigger
      this.updateArtifactState(ctx.artifactId, { activeTab: tabId })
      return `<div class="tab-content active" data-tab="${tabId}">Tab ${tabId} content</div>`
    })

    // Handler for modal operations
    this.registerHandler('modal', async (_ctx, req) => {
      const action = req.body?.action || 'open'
      const modalId = req.body?.modalId || 'default'

      if (action === 'close') {
        return '' // Return empty to clear the modal target
      }

      const title = req.body?.title || 'Modal'
      const content = req.body?.content || ''

      return `
        <div class="modal-backdrop" id="${modalId}">
          <div class="modal-content">
            <div class="modal-header">
              <h3>${escapeHtml(title)}</h3>
              <button hx-post="/htmx/modal" hx-vals='{"action":"close","modalId":"${modalId}"}' hx-target="#${modalId}" hx-swap="outerHTML">&times;</button>
            </div>
            <div class="modal-body">${content}</div>
          </div>
        </div>
      `
    })
  }

  /**
   * Notify renderer process of server state changes
   */
  private notifyRenderer(event: 'started' | 'stopped', port: number | null): void {
    const mainWindow = windowService.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IpcChannel.Artifact_ServerStatus, { event, port })
    }
  }

  /**
   * Register IPC handlers
   */
  registerIpcHandlers(): void {
    ipcMain.handle(IpcChannel.Artifact_StartServer, async () => {
      try {
        const port = await this.start()
        return { success: true, port }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle(IpcChannel.Artifact_StopServer, async () => {
      try {
        await this.stop()
        return { success: true }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle(IpcChannel.Artifact_GetServerStatus, () => {
      return {
        running: this.isRunning(),
        port: this.port
      }
    })

    ipcMain.handle(IpcChannel.Artifact_GetState, (_event, artifactId: string) => {
      return this.getArtifactState(artifactId)
    })

    ipcMain.handle(IpcChannel.Artifact_UpdateState, (_event, artifactId: string, updates: Record<string, unknown>) => {
      this.updateArtifactState(artifactId, updates)
      return { success: true }
    })

    ipcMain.handle(IpcChannel.Artifact_ClearState, (_event, artifactId: string) => {
      this.clearArtifactState(artifactId)
      return { success: true }
    })
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}

// Export singleton instance
export const artifactServerService = new ArtifactServerService()
