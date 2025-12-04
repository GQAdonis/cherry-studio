/**
 * useMinAppBridge Hook
 *
 * Handles postMessage communication from mini-app webviews.
 * Routes SDK calls to appropriate services and validates capabilities.
 */

import { useCallback, useEffect, useRef } from 'react'

export interface MinAppMessage {
  source: 'cherry-minapp'
  appId: string
  type: string
  id?: number
  payload?: unknown
}

export interface MinAppBridgeHandlers {
  onReady?: (appId: string, data: { url: string; title: string }) => void
  onSelectionChange?: (appId: string, data: { text: string; hasSelection: boolean }) => void
  onNavigation?: (appId: string, data: { url: string; title: string; type: string }) => void
  onMessage?: (appId: string, type: string, payload: unknown) => void
}

export function useMinAppBridge(handlers: MinAppBridgeHandlers = {}) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  /**
   * Send a response to a mini-app request
   */
  const sendResponse = useCallback((appId: string, id: number, payload: unknown, error?: string) => {
    // Find the webview by appId and send response
    const webview = document.querySelector(`webview[data-minapp-id="${appId}"]`) as Electron.WebviewTag | null

    if (webview) {
      const message = {
        source: 'cherry-host',
        id,
        payload,
        error
      }

      // Use executeJavaScript to send message to webview
      webview.executeJavaScript(`
        window.postMessage(${JSON.stringify(message)}, '*');
      `)
    }
  }, [])

  /**
   * Send a message to a mini-app
   */
  const sendMessage = useCallback((appId: string, type: string, payload: unknown) => {
    const webview = document.querySelector(`webview[data-minapp-id="${appId}"]`) as Electron.WebviewTag | null

    if (webview) {
      const message = {
        source: 'cherry-host',
        type,
        payload
      }

      webview.executeJavaScript(`
        window.postMessage(${JSON.stringify(message)}, '*');
      `)
    }
  }, [])

  /**
   * Handle incoming message from mini-app
   */
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Validate message structure
      const data = event.data as MinAppMessage
      if (!data || data.source !== 'cherry-minapp' || !data.appId) {
        return
      }

      const { appId, type, id, payload } = data

      switch (type) {
        case 'ready':
          handlersRef.current.onReady?.(appId, payload as { url: string; title: string })
          break

        case 'selection-change':
          handlersRef.current.onSelectionChange?.(appId, payload as { text: string; hasSelection: boolean })
          break

        case 'navigation':
          handlersRef.current.onNavigation?.(appId, payload as { url: string; title: string; type: string })
          break

        // API requests that need responses
        case 'api-call':
          handleApiCall(appId, id!, payload as { method: string; args: unknown[] })
          break

        default:
          // Forward to generic handler
          handlersRef.current.onMessage?.(appId, type, payload)
      }
    },
    [sendResponse]
  )

  /**
   * Handle API calls from mini-apps
   */
  const handleApiCall = useCallback(
    async (appId: string, requestId: number, request: { method: string; args: unknown[] }) => {
      const { method, args } = request

      try {
        // Check if method is allowed
        const allowedMethods = [
          'getSelectedText',
          'getPageMetadata',
          'quoteToMainWindow'
          // Add more allowed methods as needed
        ]

        if (!allowedMethods.includes(method)) {
          sendResponse(appId, requestId, null, `Method not allowed: ${method}`)
          return
        }

        // Execute the method
        let result: unknown

        switch (method) {
          case 'quoteToMainWindow':
            if (window.api?.quoteToMainWindow) {
              window.api.quoteToMainWindow(args[0] as string)
            }
            result = { success: true }
            break

          default:
            result = { success: false, error: 'Method not implemented' }
        }

        sendResponse(appId, requestId, result)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        sendResponse(appId, requestId, null, message)
      }
    },
    [sendResponse]
  )

  /**
   * Set up message listener
   */
  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [handleMessage])

  return {
    sendMessage,
    sendResponse
  }
}

export default useMinAppBridge
