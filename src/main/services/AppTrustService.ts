/**
 * AppTrustService
 *
 * Manages trust relationships with external applications using the SDK.
 * Stores trusted app IDs, capability grants, and handles trust prompts.
 */

import { loggerService } from '@logger'
import { EventEmitter } from 'events'

import { configManager } from './ConfigManager'

const logger = loggerService.withContext('AppTrustService')

export interface AppCapabilities {
  ai?: boolean // Access to AI completion
  knowledge?: boolean // Access to knowledge bases
  memory?: boolean // Access to memory storage
  mcp?: boolean // Access to MCP tools
  files?: boolean // Sandboxed file access
  settings?: boolean // Read app settings
  clipboard?: boolean // Clipboard access
  notifications?: boolean // Show notifications
  tools?: boolean // Register as MCP tool
}

export interface TrustedApp {
  appId: string
  appName: string
  origin: string // Origin URL or identifier
  capabilities: AppCapabilities
  trustedAt: Date
  lastConnected?: Date
  version?: string
}

export interface TrustRequest {
  appId: string
  appName: string
  origin: string
  requestedCapabilities: AppCapabilities
  version?: string
  description?: string
}

export interface TrustResponse {
  approved: boolean
  grantedCapabilities?: AppCapabilities
}

const TRUSTED_APPS_KEY = 'trustedApps'

class AppTrustService extends EventEmitter {
  private trustedApps: Map<string, TrustedApp> = new Map()
  private pendingRequests: Map<string, { resolve: (response: TrustResponse) => void }> = new Map()

  constructor() {
    super()
    this.loadTrustedApps()
    logger.info('AppTrustService initialized')
  }

  /**
   * Load trusted apps from config
   */
  private loadTrustedApps(): void {
    try {
      const stored = configManager.get(TRUSTED_APPS_KEY) as TrustedApp[] | undefined
      if (stored && Array.isArray(stored)) {
        stored.forEach((app) => {
          this.trustedApps.set(app.appId, {
            ...app,
            trustedAt: new Date(app.trustedAt),
            lastConnected: app.lastConnected ? new Date(app.lastConnected) : undefined
          })
        })
        logger.info(`Loaded ${this.trustedApps.size} trusted apps`)
      }
    } catch (error) {
      logger.error('Failed to load trusted apps:', error as Error)
    }
  }

  /**
   * Save trusted apps to config
   */
  private saveTrustedApps(): void {
    try {
      const apps = Array.from(this.trustedApps.values())
      configManager.set(TRUSTED_APPS_KEY, apps)
    } catch (error) {
      logger.error('Failed to save trusted apps:', error as Error)
    }
  }

  /**
   * Check if an app is trusted
   */
  isTrusted(appId: string): boolean {
    return this.trustedApps.has(appId)
  }

  /**
   * Get trusted app info
   */
  getTrustedApp(appId: string): TrustedApp | undefined {
    return this.trustedApps.get(appId)
  }

  /**
   * Check if an app has a specific capability
   */
  hasCapability(appId: string, capability: keyof AppCapabilities): boolean {
    const app = this.trustedApps.get(appId)
    if (!app) return false
    return app.capabilities[capability] === true
  }

  /**
   * Get all capabilities for an app
   */
  getCapabilities(appId: string): AppCapabilities | undefined {
    return this.trustedApps.get(appId)?.capabilities
  }

  /**
   * Request trust for an app (shows prompt to user)
   */
  async requestTrust(request: TrustRequest): Promise<TrustResponse> {
    // Check if already trusted
    const existing = this.trustedApps.get(request.appId)
    if (existing) {
      // Check if all requested capabilities are already granted
      const allGranted = Object.entries(request.requestedCapabilities).every(
        ([cap, requested]) => !requested || existing.capabilities[cap as keyof AppCapabilities]
      )

      if (allGranted) {
        // Update last connected time
        existing.lastConnected = new Date()
        this.saveTrustedApps()
        return { approved: true, grantedCapabilities: existing.capabilities }
      }
    }

    // Create pending request
    return new Promise((resolve) => {
      const requestId = `${request.appId}-${Date.now()}`
      this.pendingRequests.set(requestId, { resolve })

      // Emit event for UI to show trust dialog
      this.emit('trust-request', {
        requestId,
        ...request
      })

      // Timeout after 5 minutes
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId)
          resolve({ approved: false })
        }
      }, 5 * 60 * 1000)
    })
  }

  /**
   * Handle trust response from UI
   */
  handleTrustResponse(requestId: string, response: TrustResponse, request: TrustRequest): void {
    const pending = this.pendingRequests.get(requestId)
    if (!pending) {
      logger.warn(`No pending request found for ${requestId}`)
      return
    }

    this.pendingRequests.delete(requestId)

    if (response.approved && response.grantedCapabilities) {
      // Store trusted app
      const trustedApp: TrustedApp = {
        appId: request.appId,
        appName: request.appName,
        origin: request.origin,
        capabilities: response.grantedCapabilities,
        trustedAt: new Date(),
        lastConnected: new Date(),
        version: request.version
      }

      this.trustedApps.set(request.appId, trustedApp)
      this.saveTrustedApps()

      logger.info(`Trusted app: ${request.appName} (${request.appId})`)
      this.emit('app-trusted', trustedApp)
    }

    pending.resolve(response)
  }

  /**
   * Update capabilities for a trusted app
   */
  updateCapabilities(appId: string, capabilities: Partial<AppCapabilities>): boolean {
    const app = this.trustedApps.get(appId)
    if (!app) return false

    app.capabilities = { ...app.capabilities, ...capabilities }
    this.saveTrustedApps()

    logger.info(`Updated capabilities for ${appId}`)
    this.emit('capabilities-updated', { appId, capabilities: app.capabilities })

    return true
  }

  /**
   * Revoke trust for an app
   */
  revokeTrust(appId: string): boolean {
    const app = this.trustedApps.get(appId)
    if (!app) return false

    this.trustedApps.delete(appId)
    this.saveTrustedApps()

    logger.info(`Revoked trust for ${appId}`)
    this.emit('trust-revoked', { appId })

    return true
  }

  /**
   * List all trusted apps
   */
  listTrustedApps(): TrustedApp[] {
    return Array.from(this.trustedApps.values())
  }

  /**
   * Update last connected time
   */
  updateLastConnected(appId: string): void {
    const app = this.trustedApps.get(appId)
    if (app) {
      app.lastConnected = new Date()
      this.saveTrustedApps()
    }
  }

  /**
   * Clear all trusted apps
   */
  clearAll(): void {
    this.trustedApps.clear()
    this.saveTrustedApps()
    logger.info('Cleared all trusted apps')
    this.emit('all-cleared')
  }
}

export const appTrustService = new AppTrustService()
export default appTrustService

