/**
 * Browser Automation MCP Server
 *
 * Higher-level browser automation tools optimized for vision AI models.
 * Provides simplified commands for common browser automation tasks.
 */

import { loggerService } from '@logger'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'

import { cdpBridgeService } from '../services/CDPBridgeService'
import { webViewRegistryService } from '../services/WebViewRegistryService'

const logger = loggerService.withContext('BrowserAutomationServer')

const server = new Server(
  {
    name: '@cherry/browser-automation',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
)

// Tool definitions - simplified for vision-based AI interaction
const TOOLS = [
  {
    name: 'browser_screenshot',
    description:
      'Take a screenshot of the current mini-app. Use this to see what is on the screen before taking actions.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
          description: 'The mini-app to screenshot. Use list_minapps to find available apps.'
        },
        fullPage: {
          type: 'boolean',
          description: 'Capture the entire scrollable page instead of just the viewport'
        }
      },
      required: ['appId']
    }
  },
  {
    name: 'browser_click_at',
    description: 'Click at specific x,y coordinates on the page. Use after taking a screenshot to identify positions.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
          description: 'The mini-app to click in'
        },
        x: {
          type: 'number',
          description: 'X coordinate (pixels from left)'
        },
        y: {
          type: 'number',
          description: 'Y coordinate (pixels from top)'
        },
        double: {
          type: 'boolean',
          description: 'Perform a double-click'
        }
      },
      required: ['appId', 'x', 'y']
    }
  },
  {
    name: 'browser_type',
    description: 'Type text. If coordinates are provided, clicks there first. Otherwise types into focused element.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
          description: 'The mini-app to type in'
        },
        text: {
          type: 'string',
          description: 'Text to type'
        },
        x: {
          type: 'number',
          description: 'Optional X coordinate to click before typing'
        },
        y: {
          type: 'number',
          description: 'Optional Y coordinate to click before typing'
        },
        pressEnter: {
          type: 'boolean',
          description: 'Press Enter after typing'
        }
      },
      required: ['appId', 'text']
    }
  },
  {
    name: 'browser_scroll',
    description: 'Scroll the page up, down, left, or right.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
          description: 'The mini-app to scroll'
        },
        direction: {
          type: 'string',
          enum: ['up', 'down', 'left', 'right'],
          description: 'Scroll direction'
        },
        amount: {
          type: 'number',
          description: 'Scroll amount in pixels (default: 300)'
        }
      },
      required: ['appId', 'direction']
    }
  },
  {
    name: 'browser_navigate',
    description: 'Navigate to a URL in the mini-app.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
          description: 'The mini-app to navigate'
        },
        url: {
          type: 'string',
          description: 'URL to navigate to'
        }
      },
      required: ['appId', 'url']
    }
  },
  {
    name: 'browser_get_text',
    description: 'Get all visible text content from the page. Useful for understanding page content without vision.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
          description: 'The mini-app to get text from'
        }
      },
      required: ['appId']
    }
  },
  {
    name: 'browser_wait',
    description: 'Wait for a specified number of seconds. Use after actions that trigger page changes.',
    inputSchema: {
      type: 'object',
      properties: {
        seconds: {
          type: 'number',
          description: 'Number of seconds to wait (max 30)'
        }
      },
      required: ['seconds']
    }
  },
  {
    name: 'browser_back',
    description: 'Go back to the previous page.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
          description: 'The mini-app to navigate back'
        }
      },
      required: ['appId']
    }
  },
  {
    name: 'browser_forward',
    description: 'Go forward to the next page.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
          description: 'The mini-app to navigate forward'
        }
      },
      required: ['appId']
    }
  },
  {
    name: 'browser_reload',
    description: 'Reload the current page.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
          description: 'The mini-app to reload'
        }
      },
      required: ['appId']
    }
  }
]

// Helper to get webContentsId from appId
function getWebContentsId(appId: string): number | null {
  const info = webViewRegistryService.getByAppId(appId)
  return info?.webContentsId ?? null
}

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS }
})

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  logger.debug(`Tool called: ${name}`, args as Record<string, unknown>)

  try {
    switch (name) {
      case 'browser_screenshot': {
        const { appId, fullPage = false } = args as { appId: string; fullPage?: boolean }
        const webContentsId = getWebContentsId(appId)
        if (!webContentsId) {
          return {
            content: [{ type: 'text', text: `Mini-app not found: ${appId}` }],
            isError: true
          }
        }

        const result = await cdpBridgeService.screenshot(webContentsId, { fullPage, format: 'png' })
        if (!result.success || !result.data) {
          return {
            content: [{ type: 'text', text: result.error || 'Screenshot failed' }],
            isError: true
          }
        }

        return {
          content: [
            {
              type: 'image',
              data: result.data,
              mimeType: 'image/png'
            }
          ]
        }
      }

      case 'browser_click_at': {
        const { appId, x, y, double: isDouble = false } = args as {
          appId: string
          x: number
          y: number
          double?: boolean
        }
        const webContentsId = getWebContentsId(appId)
        if (!webContentsId) {
          return {
            content: [{ type: 'text', text: `Mini-app not found: ${appId}` }],
            isError: true
          }
        }

        const clickCount = isDouble ? 2 : 1
        const result = await cdpBridgeService.click(webContentsId, x, y, { clickCount })
        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error || 'Click failed' }],
            isError: true
          }
        }

        return {
          content: [{ type: 'text', text: `Clicked at (${x}, ${y})${isDouble ? ' (double-click)' : ''}` }]
        }
      }

      case 'browser_type': {
        const { appId, text, x, y, pressEnter = false } = args as {
          appId: string
          text: string
          x?: number
          y?: number
          pressEnter?: boolean
        }
        const webContentsId = getWebContentsId(appId)
        if (!webContentsId) {
          return {
            content: [{ type: 'text', text: `Mini-app not found: ${appId}` }],
            isError: true
          }
        }

        // Click at position if coordinates provided
        if (x !== undefined && y !== undefined) {
          await cdpBridgeService.click(webContentsId, x, y)
          await new Promise((resolve) => setTimeout(resolve, 100))
        }

        // Type the text
        const result = await cdpBridgeService.insertText(webContentsId, text)
        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error || 'Type failed' }],
            isError: true
          }
        }

        // Press Enter if requested
        if (pressEnter) {
          await cdpBridgeService.sendCommand(webContentsId, 'Input.dispatchKeyEvent', {
            type: 'keyDown',
            key: 'Enter',
            code: 'Enter',
            windowsVirtualKeyCode: 13,
            nativeVirtualKeyCode: 13
          })
          await cdpBridgeService.sendCommand(webContentsId, 'Input.dispatchKeyEvent', {
            type: 'keyUp',
            key: 'Enter',
            code: 'Enter',
            windowsVirtualKeyCode: 13,
            nativeVirtualKeyCode: 13
          })
        }

        return {
          content: [
            { type: 'text', text: `Typed: "${text.substring(0, 30)}..."${pressEnter ? ' and pressed Enter' : ''}` }
          ]
        }
      }

      case 'browser_scroll': {
        const { appId, direction, amount = 300 } = args as {
          appId: string
          direction: 'up' | 'down' | 'left' | 'right'
          amount?: number
        }
        const webContentsId = getWebContentsId(appId)
        if (!webContentsId) {
          return {
            content: [{ type: 'text', text: `Mini-app not found: ${appId}` }],
            isError: true
          }
        }

        const scrollMap = {
          up: { deltaX: 0, deltaY: -amount },
          down: { deltaX: 0, deltaY: amount },
          left: { deltaX: -amount, deltaY: 0 },
          right: { deltaX: amount, deltaY: 0 }
        }

        const result = await cdpBridgeService.scroll(webContentsId, scrollMap[direction])
        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error || 'Scroll failed' }],
            isError: true
          }
        }

        return {
          content: [{ type: 'text', text: `Scrolled ${direction} by ${amount}px` }]
        }
      }

      case 'browser_navigate': {
        const { appId, url } = args as { appId: string; url: string }
        const webContentsId = getWebContentsId(appId)
        if (!webContentsId) {
          return {
            content: [{ type: 'text', text: `Mini-app not found: ${appId}` }],
            isError: true
          }
        }

        const result = await cdpBridgeService.navigate(webContentsId, url)
        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error || 'Navigation failed' }],
            isError: true
          }
        }

        return {
          content: [{ type: 'text', text: `Navigating to: ${url}` }]
        }
      }

      case 'browser_get_text': {
        const { appId } = args as { appId: string }
        const webContentsId = getWebContentsId(appId)
        if (!webContentsId) {
          return {
            content: [{ type: 'text', text: `Mini-app not found: ${appId}` }],
            isError: true
          }
        }

        const result = await cdpBridgeService.getTextContent(webContentsId)
        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error || 'Failed to get text' }],
            isError: true
          }
        }

        return {
          content: [{ type: 'text', text: result.data || '' }]
        }
      }

      case 'browser_wait': {
        const { seconds } = args as { seconds: number }
        const waitTime = Math.min(Math.max(seconds, 0), 30) * 1000

        await new Promise((resolve) => setTimeout(resolve, waitTime))

        return {
          content: [{ type: 'text', text: `Waited ${seconds} seconds` }]
        }
      }

      case 'browser_back': {
        const { appId } = args as { appId: string }
        const webContentsId = getWebContentsId(appId)
        if (!webContentsId) {
          return {
            content: [{ type: 'text', text: `Mini-app not found: ${appId}` }],
            isError: true
          }
        }

        const result = await cdpBridgeService.goBack(webContentsId)
        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error || 'Cannot go back' }],
            isError: true
          }
        }

        return {
          content: [{ type: 'text', text: 'Navigated back' }]
        }
      }

      case 'browser_forward': {
        const { appId } = args as { appId: string }
        const webContentsId = getWebContentsId(appId)
        if (!webContentsId) {
          return {
            content: [{ type: 'text', text: `Mini-app not found: ${appId}` }],
            isError: true
          }
        }

        const result = await cdpBridgeService.goForward(webContentsId)
        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error || 'Cannot go forward' }],
            isError: true
          }
        }

        return {
          content: [{ type: 'text', text: 'Navigated forward' }]
        }
      }

      case 'browser_reload': {
        const { appId } = args as { appId: string }
        const webContentsId = getWebContentsId(appId)
        if (!webContentsId) {
          return {
            content: [{ type: 'text', text: `Mini-app not found: ${appId}` }],
            isError: true
          }
        }

        const result = await cdpBridgeService.reload(webContentsId)
        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error || 'Reload failed' }],
            isError: true
          }
        }

        return {
          content: [{ type: 'text', text: 'Page reloaded' }]
        }
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true
        }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error(`Tool ${name} failed:`, error as Error)
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true
    }
  }
})

class BrowserAutomationServer {
  public server: Server

  constructor() {
    this.server = server
    logger.info('BrowserAutomationServer initialized')
  }
}

export default BrowserAutomationServer

