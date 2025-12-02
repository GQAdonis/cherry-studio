/**
 * WebSocketTransport
 *
 * Transport implementation for external apps connecting to Cherry Studio
 * via WebSocket.
 */

import type { Transport } from '../types'

export class WebSocketTransport implements Transport {
  private serverUrl: string
  private ws: WebSocket | null = null
  private connected = false
  private messageHandler: ((type: string, payload: unknown) => void) | null = null
  private pendingRequests: Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> }
  > = new Map()
  private requestId = 0
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor(serverUrl: string = 'ws://localhost:23847') {
    this.serverUrl = serverUrl
  }

  async connect(): Promise<void> {
    if (this.connected) return

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl)

        this.ws.onopen = () => {
          this.connected = true
          this.reconnectAttempts = 0
          resolve()
        }

        this.ws.onerror = () => {
          if (!this.connected) {
            reject(new Error('WebSocket connection failed'))
          }
        }

        this.ws.onclose = () => {
          this.connected = false
          this.attemptReconnect()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  async disconnect(): Promise<void> {
    if (!this.connected || !this.ws) return

    // Clear pending requests
    for (const [, { reject, timeout }] of this.pendingRequests) {
      clearTimeout(timeout)
      reject(new Error('Disconnected'))
    }
    this.pendingRequests.clear()

    this.ws.close(1000, 'Client disconnect')
    this.ws = null
    this.connected = false
  }

  send(type: string, payload?: unknown): void {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected')
    }

    this.ws.send(
      JSON.stringify({
        type,
        payload
      })
    )
  }

  request<T>(type: string, payload?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.ws) {
        reject(new Error('Not connected'))
        return
      }

      const id = `req_${++this.requestId}_${Date.now()}`
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error('Request timeout'))
      }, 30000)

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout
      })

      this.ws.send(
        JSON.stringify({
          type,
          id,
          payload
        })
      )
    })
  }

  onMessage(handler: (type: string, payload: unknown) => void): () => void {
    this.messageHandler = handler
    return () => {
      this.messageHandler = null
    }
  }

  isConnected(): boolean {
    return this.connected
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data)

      // Handle response to pending request
      if (message.id && this.pendingRequests.has(message.id)) {
        const { resolve, reject, timeout } = this.pendingRequests.get(message.id)!
        clearTimeout(timeout)
        this.pendingRequests.delete(message.id)

        if (message.error) {
          reject(new Error(message.error))
        } else {
          resolve(message.payload)
        }
        return
      }

      // Forward to message handler
      if (this.messageHandler && message.type) {
        this.messageHandler(message.type, message.payload)
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`)

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error)
      })
    }, delay)
  }
}

export default WebSocketTransport

