/**
 * SDKWebSocketService
 *
 * WebSocket server for external application communication via @theboss/sdk.
 * Handles authentication, message routing, and tool call forwarding.
 */

import { loggerService } from '@logger'
import { EventEmitter } from 'events'
import { createServer, type Server as HttpServer } from 'http'
import { type WebSocket, WebSocketServer } from 'ws'

import {
  handleSDKToolResponse,
  registerSDKTool,
  type SDKTool,
  type SDKToolCallRequest,
  type SDKToolCallResponse,
  sdkToolEvents,
  unregisterAllToolsForApp
} from '../mcpServers/sdk-bridge'
import { type AppCapabilities, appTrustService, type TrustRequest } from './AppTrustService'

const logger = loggerService.withContext('SDKWebSocketService')

const DEFAULT_PORT = 23847
const HEARTBEAT_INTERVAL = 30000

export interface SDKClient {
  ws: WebSocket
  appId: string
  appName: string
  origin: string
  authenticated: boolean
  capabilities: AppCapabilities
  connectedAt: Date
  lastHeartbeat: Date
}

export interface SDKMessage {
  type: string
  id?: string
  payload?: unknown
}

export interface AuthMessage extends SDKMessage {
  type: 'auth'
  payload: {
    appId: string
    appName: string
    origin: string
    version?: string
    requestedCapabilities: AppCapabilities
  }
}

export interface ToolRegisterMessage extends SDKMessage {
  type: 'tool-register'
  payload: {
    name: string
    description: string
    inputSchema: Record<string, unknown>
  }
}

export interface ToolCallResultMessage extends SDKMessage {
  type: 'tool-call-result'
  payload: SDKToolCallResponse
}

class SDKWebSocketService extends EventEmitter {
  private server: HttpServer | null = null
  private wss: WebSocketServer | null = null
  private clients: Map<string, SDKClient> = new Map()
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private port: number = DEFAULT_PORT
  private isRunning = false

  constructor() {
    super()
    this.setupToolCallHandler()
  }

  /**
   * Setup handler for tool calls from SDK Bridge
   */
  private setupToolCallHandler(): void {
    sdkToolEvents.on('tool-call', (request: SDKToolCallRequest) => {
      this.forwardToolCall(request)
    })
  }

  /**
   * Start the WebSocket server
   */
  async start(port: number = DEFAULT_PORT): Promise<void> {
    if (this.isRunning) {
      logger.warn('SDK WebSocket server already running')
      return
    }

    this.port = port

    return new Promise((resolve, reject) => {
      try {
        this.server = createServer()
        this.wss = new WebSocketServer({ server: this.server })

        this.wss.on('connection', (ws, request) => {
          this.handleConnection(ws, request)
        })

        this.wss.on('error', (error) => {
          logger.error('WebSocket server error:', error)
          this.emit('error', error)
        })

        this.server.listen(this.port, () => {
          this.isRunning = true
          this.startHeartbeat()
          logger.info(`SDK WebSocket server started on port ${this.port}`)
          this.emit('started', { port: this.port })
          resolve()
        })

        this.server.on('error', (error: NodeJS.ErrnoException) => {
          if (error.code === 'EADDRINUSE') {
            logger.error(`Port ${this.port} is already in use`)
          }
          reject(error)
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return

    this.stopHeartbeat()

    // Close all client connections
    for (const [appId, client] of this.clients) {
      client.ws.close(1000, 'Server shutting down')
      unregisterAllToolsForApp(appId)
    }
    this.clients.clear()

    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close(() => {
          if (this.server) {
            this.server.close(() => {
              this.isRunning = false
              logger.info('SDK WebSocket server stopped')
              this.emit('stopped')
              resolve()
            })
          } else {
            resolve()
          }
        })
      } else {
        resolve()
      }
    })
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, request: { headers: { origin?: string } }): void {
    const tempId = `pending-${Date.now()}`
    logger.debug(`New connection from ${request.headers.origin || 'unknown'}`)

    // Set up message handler
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString()) as SDKMessage
        await this.handleMessage(ws, tempId, message)
      } catch (error) {
        logger.error('Failed to parse message:', error as Error)
        this.sendError(ws, 'Invalid message format')
      }
    })

    ws.on('close', () => {
      this.handleDisconnection(ws)
    })

    ws.on('error', (error) => {
      logger.error('WebSocket error:', error)
    })

    // Send welcome message
    this.send(ws, { type: 'welcome', payload: { version: '1.0.0' } })
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(ws: WebSocket, _tempId: string, message: SDKMessage): Promise<void> {
    const client = this.getClientByWs(ws)

    switch (message.type) {
      case 'auth':
        await this.handleAuth(ws, message as AuthMessage)
        break

      case 'tool-register':
        if (!client?.authenticated) {
          this.sendError(ws, 'Not authenticated', message.id)
          return
        }
        this.handleToolRegister(client, message as ToolRegisterMessage)
        break

      case 'tool-unregister':
        if (!client?.authenticated) {
          this.sendError(ws, 'Not authenticated', message.id)
          return
        }
        this.handleToolUnregister(client, message)
        break

      case 'tool-call-result':
        this.handleToolCallResult(message as ToolCallResultMessage)
        break

      case 'ping':
        if (client) {
          client.lastHeartbeat = new Date()
        }
        this.send(ws, { type: 'pong', id: message.id })
        break

      default:
        // Forward to event handlers
        if (client?.authenticated) {
          this.emit('message', { client, message })
        }
    }
  }

  /**
   * Handle authentication message
   */
  private async handleAuth(ws: WebSocket, message: AuthMessage): Promise<void> {
    const { appId, appName, origin, version, requestedCapabilities } = message.payload

    logger.info(`Auth request from ${appName} (${appId})`)

    // Request trust from user
    const trustRequest: TrustRequest = {
      appId,
      appName,
      origin,
      version,
      requestedCapabilities
    }

    const response = await appTrustService.requestTrust(trustRequest)

    if (response.approved && response.grantedCapabilities) {
      // Create client record
      const client: SDKClient = {
        ws,
        appId,
        appName,
        origin,
        authenticated: true,
        capabilities: response.grantedCapabilities,
        connectedAt: new Date(),
        lastHeartbeat: new Date()
      }

      this.clients.set(appId, client)

      this.send(ws, {
        type: 'auth-success',
        id: message.id,
        payload: {
          grantedCapabilities: response.grantedCapabilities
        }
      })

      logger.info(`Client authenticated: ${appName} (${appId})`)
      this.emit('client-connected', client)
    } else {
      this.send(ws, {
        type: 'auth-failed',
        id: message.id,
        payload: { reason: 'Trust request denied' }
      })

      ws.close(4001, 'Authentication failed')
    }
  }

  /**
   * Handle tool registration
   */
  private handleToolRegister(client: SDKClient, message: ToolRegisterMessage): void {
    if (!client.capabilities.tools) {
      this.sendError(client.ws, 'Tool registration not allowed', message.id)
      return
    }

    const { name, description, inputSchema } = message.payload

    const tool: SDKTool = {
      name,
      description,
      inputSchema,
      appId: client.appId,
      appName: client.appName
    }

    registerSDKTool(tool)

    this.send(client.ws, {
      type: 'tool-registered',
      id: message.id,
      payload: { name }
    })

    logger.info(`Tool registered: ${name} by ${client.appName}`)
  }

  /**
   * Handle tool unregistration
   */
  private handleToolUnregister(client: SDKClient, message: SDKMessage): void {
    const toolName = (message.payload as { name: string })?.name
    if (toolName) {
      // Note: We'd need to add unregisterSDKTool function
      this.send(client.ws, {
        type: 'tool-unregistered',
        id: message.id,
        payload: { name: toolName }
      })
    }
  }

  /**
   * Handle tool call result from client
   */
  private handleToolCallResult(message: ToolCallResultMessage): void {
    handleSDKToolResponse(message.payload)
  }

  /**
   * Forward tool call to appropriate client
   */
  private forwardToolCall(request: SDKToolCallRequest): void {
    const client = this.clients.get(request.appId)
    if (!client) {
      // Send error response
      handleSDKToolResponse({
        callId: request.callId,
        success: false,
        error: `Client ${request.appId} not connected`
      })
      return
    }

    this.send(client.ws, {
      type: 'tool-call',
      payload: request
    })
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(ws: WebSocket): void {
    for (const [appId, client] of this.clients) {
      if (client.ws === ws) {
        this.clients.delete(appId)
        unregisterAllToolsForApp(appId)
        logger.info(`Client disconnected: ${client.appName} (${appId})`)
        this.emit('client-disconnected', { appId, appName: client.appName })
        break
      }
    }
  }

  /**
   * Get client by WebSocket
   */
  private getClientByWs(ws: WebSocket): SDKClient | undefined {
    for (const client of this.clients.values()) {
      if (client.ws === ws) {
        return client
      }
    }
    return undefined
  }

  /**
   * Send message to client
   */
  private send(ws: WebSocket, message: SDKMessage): void {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  /**
   * Send error message
   */
  private sendError(ws: WebSocket, error: string, id?: string): void {
    this.send(ws, { type: 'error', id, payload: { error } })
  }

  /**
   * Start heartbeat timer
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = new Date()
      for (const [appId, client] of this.clients) {
        const timeSinceHeartbeat = now.getTime() - client.lastHeartbeat.getTime()
        if (timeSinceHeartbeat > HEARTBEAT_INTERVAL * 2) {
          logger.warn(`Client ${appId} heartbeat timeout, disconnecting`)
          client.ws.close(4000, 'Heartbeat timeout')
        }
      }
    }, HEARTBEAT_INTERVAL)
  }

  /**
   * Stop heartbeat timer
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /**
   * Get connected clients
   */
  getClients(): SDKClient[] {
    return Array.from(this.clients.values())
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning
  }

  /**
   * Get server port
   */
  getPort(): number {
    return this.port
  }
}

export const sdkWebSocketService = new SDKWebSocketService()
export default sdkWebSocketService
