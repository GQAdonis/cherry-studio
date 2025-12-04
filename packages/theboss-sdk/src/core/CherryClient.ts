/**
 * CherryClient - Main SDK Client
 *
 * The primary interface for interacting with Cherry Studio from external applications.
 */

import { createAIService } from '../services/ai'
import { createKnowledgeService } from '../services/knowledge'
import { createMCPService } from '../services/mcp'
import { createMemoryService } from '../services/memory'
import { createToolService } from '../services/tools'
import type {
  AIService,
  AppCapabilities,
  CherryClientConfig,
  CherryEventHandler,
  CherryEventType,
  KnowledgeService,
  MCPService,
  MemoryService,
  ToolDefinition,
  ToolService,
  Transport
} from '../types'
import { WebSocketTransport } from './WebSocketTransport'
import { WebViewTransport } from './WebViewTransport'

export class CherryClient {
  private config: CherryClientConfig
  private transport: Transport | null = null
  private eventHandlers: Map<CherryEventType, Set<CherryEventHandler>> = new Map()
  private _capabilities: Partial<AppCapabilities> = {}
  private _connected = false

  // Services
  public ai: AIService | null = null
  public knowledge: KnowledgeService | null = null
  public memory: MemoryService | null = null
  public mcp: MCPService | null = null
  public tools: ToolService | null = null

  constructor(config: CherryClientConfig) {
    this.config = {
      transport: 'webview',
      ...config
    }
  }

  /**
   * Initialize and connect to Cherry Studio
   */
  async connect(): Promise<void> {
    if (this._connected) {
      return
    }

    // Create appropriate transport
    if (this.config.transport === 'websocket') {
      this.transport = new WebSocketTransport(this.config.serverUrl || 'ws://localhost:23847')
    } else {
      this.transport = new WebViewTransport()
    }

    // Set up message handler
    this.transport.onMessage((type, payload) => {
      this.handleMessage(type, payload)
    })

    // Connect transport
    await this.transport.connect()

    // Authenticate and request capabilities
    const authResult = await this.transport.request<{
      grantedCapabilities: Partial<AppCapabilities>
    }>('auth', {
      appId: this.config.appId,
      appName: this.config.appName,
      version: this.config.version,
      requestedCapabilities: this.config.capabilities || {}
    })

    this._capabilities = authResult.grantedCapabilities
    this._connected = true

    // Initialize services based on granted capabilities
    this.initializeServices()

    // Emit connected event
    this.emit('connected', { capabilities: this._capabilities })
  }

  /**
   * Disconnect from Cherry Studio
   */
  async disconnect(): Promise<void> {
    if (!this._connected || !this.transport) {
      return
    }

    await this.transport.disconnect()
    this._connected = false
    this.emit('disconnected', {})
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this._connected
  }

  /**
   * Get granted capabilities
   */
  get capabilities(): Partial<AppCapabilities> {
    return { ...this._capabilities }
  }

  /**
   * Check if a specific capability is granted
   */
  hasCapability(capability: keyof AppCapabilities): boolean {
    return this._capabilities[capability] === true
  }

  /**
   * Subscribe to events
   */
  on<T = unknown>(event: CherryEventType, handler: CherryEventHandler<T>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler as CherryEventHandler)

    return () => {
      this.eventHandlers.get(event)?.delete(handler as CherryEventHandler)
    }
  }

  /**
   * Emit an event
   */
  private emit<T>(type: CherryEventType, data: T): void {
    const handlers = this.eventHandlers.get(type)
    if (handlers) {
      const event = { type, data }
      handlers.forEach((handler) => {
        try {
          handler(event)
        } catch (error) {
          console.error(`Error in ${type} event handler:`, error)
        }
      })
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(type: string, payload: unknown): void {
    switch (type) {
      case 'tool-call':
        this.emit('tool-call', payload)
        break
      case 'capabilities-changed':
        this._capabilities = payload as Partial<AppCapabilities>
        this.initializeServices()
        this.emit('capabilities-changed', payload)
        break
      default:
        this.emit('message', { type, payload })
    }
  }

  /**
   * Initialize services based on capabilities
   */
  private initializeServices(): void {
    if (!this.transport) return

    if (this._capabilities.ai) {
      this.ai = createAIService(this.transport)
    }

    if (this._capabilities.knowledge) {
      this.knowledge = createKnowledgeService(this.transport)
    }

    if (this._capabilities.memory) {
      this.memory = createMemoryService(this.transport)
    }

    if (this._capabilities.mcp) {
      this.mcp = createMCPService(this.transport)
    }

    if (this._capabilities.tools) {
      this.tools = createToolService(this.transport, this.config.appId, this.config.appName)
    }
  }

  /**
   * Register a tool (convenience method)
   */
  async registerTool(definition: ToolDefinition): Promise<void> {
    if (!this.tools) {
      throw new Error('Tools capability not granted')
    }
    await this.tools.register(definition)
  }

  /**
   * Send a custom message
   */
  send(type: string, payload?: unknown): void {
    if (!this.transport) {
      throw new Error('Not connected')
    }
    this.transport.send(type, payload)
  }

  /**
   * Send a request and wait for response
   */
  async request<T>(type: string, payload?: unknown): Promise<T> {
    if (!this.transport) {
      throw new Error('Not connected')
    }
    return this.transport.request<T>(type, payload)
  }
}

/**
 * Create a new CherryClient instance
 */
export function createCherryClient(config: CherryClientConfig): CherryClient {
  return new CherryClient(config)
}

export default CherryClient
