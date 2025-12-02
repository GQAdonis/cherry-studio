/**
 * WebViewTransport
 *
 * Transport implementation for apps embedded in Cherry Studio webviews.
 * Uses postMessage for communication.
 */

import type { Transport } from '../types'

export class WebViewTransport implements Transport {
  private connected = false
  private messageHandler: ((type: string, payload: unknown) => void) | null = null
  private pendingRequests: Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> }
  > = new Map()
  private requestId = 0
  private removeMessageListener: (() => void) | null = null

  async connect(): Promise<void> {
    if (this.connected) return

    // Check if we're in a webview context
    if (typeof window === 'undefined') {
      throw new Error('WebViewTransport requires a browser/webview environment')
    }

    // Check if Cherry Bridge is available
    if (!(window as any).cherryBridge) {
      throw new Error('Cherry Bridge not available. Make sure this app is running inside Cherry Studio.')
    }

    // Set up message listener
    const handleMessage = (event: MessageEvent) => {
      const data = event.data
      if (!data || data.source !== 'cherry-host') return

      // Handle response to pending request
      if (data.id !== undefined && this.pendingRequests.has(data.id)) {
        const { resolve, reject, timeout } = this.pendingRequests.get(data.id)!
        clearTimeout(timeout)
        this.pendingRequests.delete(data.id)

        if (data.error) {
          reject(new Error(data.error))
        } else {
          resolve(data.payload)
        }
        return
      }

      // Forward to message handler
      if (this.messageHandler && data.type) {
        this.messageHandler(data.type, data.payload)
      }
    }

    window.addEventListener('message', handleMessage)
    this.removeMessageListener = () => window.removeEventListener('message', handleMessage)

    this.connected = true
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return

    // Clear pending requests
    for (const [, { reject, timeout }] of this.pendingRequests) {
      clearTimeout(timeout)
      reject(new Error('Disconnected'))
    }
    this.pendingRequests.clear()

    // Remove listener
    if (this.removeMessageListener) {
      this.removeMessageListener()
      this.removeMessageListener = null
    }

    this.connected = false
  }

  send(type: string, payload?: unknown): void {
    if (!this.connected) {
      throw new Error('Not connected')
    }

    window.parent.postMessage(
      {
        source: 'cherry-minapp',
        type,
        payload
      },
      '*'
    )
  }

  request<T>(type: string, payload?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected'))
        return
      }

      const id = ++this.requestId
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error('Request timeout'))
      }, 30000)

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout
      })

      window.parent.postMessage(
        {
          source: 'cherry-minapp',
          type,
          id,
          payload
        },
        '*'
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
}

export default WebViewTransport

