/**
 * Mini-App Controller MCP Server
 *
 * Provides CDP-based webview automation tools for AI assistants.
 * This server enables AI to control embedded mini-apps (webviews) in Cherry Studio.
 */

import { loggerService } from '@logger'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'

import { cdpBridgeService } from '../services/CDPBridgeService'
import { webViewRegistryService } from '../services/WebViewRegistryService'
import { extractConversations, extractPageContent } from './adapters'

const logger = loggerService.withContext('MinAppControllerServer')

const server = new Server(
  {
    name: '@cherry/minapp-controller',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
)

// Tool definitions
const TOOLS = [
  {
    name: 'list_minapps',
    description:
      'List all open mini-apps (embedded webviews) in Cherry Studio. Returns appId, URL, title, and loading state for each.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'open_minapp',
    description: 'Focus and bring to front a specific mini-app by its appId.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
          description: 'The unique identifier of the mini-app to open/focus'
        }
      },
      required: ['appId']
    }
  },
  {
    name: 'extract_page_content',
    description: 'Extract the text content from a mini-app page. Returns the main text content, useful for analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
          description: 'The mini-app to extract content from'
        },
        format: {
          type: 'string',
          enum: ['text', 'html', 'markdown'],
          description: 'Output format (default: text)'
        }
      },
      required: ['appId']
    }
  },
  {
    name: 'extract_conversations',
    description:
      'Extract conversations from AI chat apps like ChatGPT, Claude, Perplexity. Returns structured conversation data.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
          description: 'The mini-app to extract conversations from'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of conversations to extract (default: 10)'
        },
        currentOnly: {
          type: 'boolean',
          description: 'If true, only extract the currently visible conversation'
        }
      },
      required: ['appId']
    }
  },
  {
    name: 'navigate',
    description: 'Navigate a mini-app to a specific URL.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
          description: 'The mini-app to navigate'
        },
        url: {
          type: 'string',
          description: 'The URL to navigate to'
        }
      },
      required: ['appId', 'url']
    }
  },
  {
    name: 'screenshot',
    description: 'Take a screenshot of a mini-app. Returns base64-encoded image for vision AI analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
          description: 'The mini-app to screenshot'
        },
        fullPage: {
          type: 'boolean',
          description: 'If true, capture the full scrollable page'
        },
        format: {
          type: 'string',
          enum: ['png', 'jpeg', 'webp'],
          description: 'Image format (default: png)'
        }
      },
      required: ['appId']
    }
  },
  {
    name: 'click',
    description: 'Click at specific coordinates in a mini-app.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
          description: 'The mini-app to click in'
        },
        x: {
          type: 'number',
          description: 'X coordinate'
        },
        y: {
          type: 'number',
          description: 'Y coordinate'
        },
        button: {
          type: 'string',
          enum: ['left', 'right', 'middle'],
          description: 'Mouse button (default: left)'
        }
      },
      required: ['appId', 'x', 'y']
    }
  },
  {
    name: 'click_element',
    description: 'Click an element by CSS selector in a mini-app.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
          description: 'The mini-app to click in'
        },
        selector: {
          type: 'string',
          description: 'CSS selector for the element to click'
        }
      },
      required: ['appId', 'selector']
    }
  },
  {
    name: 'type_text',
    description: 'Type text into the focused element or a specific element in a mini-app.',
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
        selector: {
          type: 'string',
          description: 'Optional CSS selector to focus first'
        },
        clear: {
          type: 'boolean',
          description: 'If true, clear the field before typing'
        }
      },
      required: ['appId', 'text']
    }
  },
  {
    name: 'scroll',
    description: 'Scroll the page in a mini-app.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
          description: 'The mini-app to scroll'
        },
        deltaX: {
          type: 'number',
          description: 'Horizontal scroll amount (pixels)'
        },
        deltaY: {
          type: 'number',
          description: 'Vertical scroll amount (pixels, positive = down)'
        }
      },
      required: ['appId']
    }
  },
  {
    name: 'execute_script',
    description: 'Execute JavaScript in the page context of a mini-app. Use with caution.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
          description: 'The mini-app to execute script in'
        },
        script: {
          type: 'string',
          description: 'JavaScript code to execute'
        }
      },
      required: ['appId', 'script']
    }
  },
  {
    name: 'wait_for_element',
    description: 'Wait for an element to appear in a mini-app.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
          description: 'The mini-app to wait in'
        },
        selector: {
          type: 'string',
          description: 'CSS selector for the element to wait for'
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 30000)'
        }
      },
      required: ['appId', 'selector']
    }
  },
  {
    name: 'get_element_info',
    description: 'Get information about an element by CSS selector.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
          description: 'The mini-app to query'
        },
        selector: {
          type: 'string',
          description: 'CSS selector for the element'
        }
      },
      required: ['appId', 'selector']
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
      case 'list_minapps': {
        const minapps = webViewRegistryService.listAll()
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                minapps.map((m) => ({
                  appId: m.appId,
                  url: m.url,
                  title: m.title,
                  loaded: m.loaded
                })),
                null,
                2
              )
            }
          ]
        }
      }

      case 'open_minapp': {
        const { appId } = args as { appId: string }
        const info = webViewRegistryService.getByAppId(appId)
        if (!info) {
          return {
            content: [{ type: 'text', text: `Mini-app not found: ${appId}` }],
            isError: true
          }
        }
        // The actual focusing is handled by the renderer
        return {
          content: [{ type: 'text', text: `Mini-app ${appId} is ready. Send focus command to renderer.` }]
        }
      }

      case 'extract_page_content': {
        const { appId, format = 'text' } = args as { appId: string; format?: string }
        const webContentsId = getWebContentsId(appId)
        if (!webContentsId) {
          return {
            content: [{ type: 'text', text: `Mini-app not found: ${appId}` }],
            isError: true
          }
        }

        const result = await extractPageContent(webContentsId, format as 'text' | 'html' | 'markdown')
        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error || 'Failed to extract content' }],
            isError: true
          }
        }

        return {
          content: [{ type: 'text', text: result.data || '' }]
        }
      }

      case 'extract_conversations': {
        const {
          appId,
          limit = 10,
          currentOnly = false
        } = args as {
          appId: string
          limit?: number
          currentOnly?: boolean
        }
        const webContentsId = getWebContentsId(appId)
        if (!webContentsId) {
          return {
            content: [{ type: 'text', text: `Mini-app not found: ${appId}` }],
            isError: true
          }
        }

        const info = webViewRegistryService.getByAppId(appId)
        const result = await extractConversations(webContentsId, info?.url || '', { limit, currentOnly })

        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error || 'Failed to extract conversations' }],
            isError: true
          }
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }]
        }
      }

      case 'navigate': {
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
          content: [{ type: 'text', text: `Navigated to ${url}` }]
        }
      }

      case 'screenshot': {
        const {
          appId,
          fullPage = false,
          format = 'png'
        } = args as {
          appId: string
          fullPage?: boolean
          format?: 'png' | 'jpeg' | 'webp'
        }
        const webContentsId = getWebContentsId(appId)
        if (!webContentsId) {
          return {
            content: [{ type: 'text', text: `Mini-app not found: ${appId}` }],
            isError: true
          }
        }

        const result = await cdpBridgeService.screenshot(webContentsId, { fullPage, format })
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
              mimeType: `image/${format}`
            }
          ]
        }
      }

      case 'click': {
        const {
          appId,
          x,
          y,
          button = 'left'
        } = args as {
          appId: string
          x: number
          y: number
          button?: 'left' | 'right' | 'middle'
        }
        const webContentsId = getWebContentsId(appId)
        if (!webContentsId) {
          return {
            content: [{ type: 'text', text: `Mini-app not found: ${appId}` }],
            isError: true
          }
        }

        const result = await cdpBridgeService.click(webContentsId, x, y, { button })
        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error || 'Click failed' }],
            isError: true
          }
        }

        return {
          content: [{ type: 'text', text: `Clicked at (${x}, ${y})` }]
        }
      }

      case 'click_element': {
        const { appId, selector } = args as { appId: string; selector: string }
        const webContentsId = getWebContentsId(appId)
        if (!webContentsId) {
          return {
            content: [{ type: 'text', text: `Mini-app not found: ${appId}` }],
            isError: true
          }
        }

        const result = await cdpBridgeService.clickElement(webContentsId, selector)
        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error || 'Click failed' }],
            isError: true
          }
        }

        return {
          content: [{ type: 'text', text: `Clicked element: ${selector}` }]
        }
      }

      case 'type_text': {
        const {
          appId,
          text,
          selector,
          clear = false
        } = args as {
          appId: string
          text: string
          selector?: string
          clear?: boolean
        }
        const webContentsId = getWebContentsId(appId)
        if (!webContentsId) {
          return {
            content: [{ type: 'text', text: `Mini-app not found: ${appId}` }],
            isError: true
          }
        }

        // Focus element if selector provided
        if (selector) {
          const focusResult = await cdpBridgeService.focus(webContentsId, selector)
          if (!focusResult.success) {
            return {
              content: [{ type: 'text', text: focusResult.error || 'Failed to focus element' }],
              isError: true
            }
          }
        }

        // Clear field if requested
        if (clear) {
          await cdpBridgeService.evaluate(
            webContentsId,
            `document.activeElement.value = ''; document.activeElement.textContent = '';`
          )
        }

        const result = await cdpBridgeService.insertText(webContentsId, text)
        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error || 'Type failed' }],
            isError: true
          }
        }

        return {
          content: [{ type: 'text', text: `Typed: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"` }]
        }
      }

      case 'scroll': {
        const {
          appId,
          deltaX = 0,
          deltaY = 0
        } = args as {
          appId: string
          deltaX?: number
          deltaY?: number
        }
        const webContentsId = getWebContentsId(appId)
        if (!webContentsId) {
          return {
            content: [{ type: 'text', text: `Mini-app not found: ${appId}` }],
            isError: true
          }
        }

        const result = await cdpBridgeService.scroll(webContentsId, { deltaX, deltaY })
        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error || 'Scroll failed' }],
            isError: true
          }
        }

        return {
          content: [{ type: 'text', text: `Scrolled by (${deltaX}, ${deltaY})` }]
        }
      }

      case 'execute_script': {
        const { appId, script } = args as { appId: string; script: string }
        const webContentsId = getWebContentsId(appId)
        if (!webContentsId) {
          return {
            content: [{ type: 'text', text: `Mini-app not found: ${appId}` }],
            isError: true
          }
        }

        const result = await cdpBridgeService.evaluate(webContentsId, script)
        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error || 'Script execution failed' }],
            isError: true
          }
        }

        return {
          content: [
            {
              type: 'text',
              text:
                result.data !== undefined ? JSON.stringify(result.data, null, 2) : 'Script executed (no return value)'
            }
          ]
        }
      }

      case 'wait_for_element': {
        const {
          appId,
          selector,
          timeout = 30000
        } = args as {
          appId: string
          selector: string
          timeout?: number
        }
        const webContentsId = getWebContentsId(appId)
        if (!webContentsId) {
          return {
            content: [{ type: 'text', text: `Mini-app not found: ${appId}` }],
            isError: true
          }
        }

        const result = await cdpBridgeService.waitForElement(webContentsId, selector, timeout)
        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error || 'Wait timeout' }],
            isError: true
          }
        }

        return {
          content: [{ type: 'text', text: `Element found: ${selector}` }]
        }
      }

      case 'get_element_info': {
        const { appId, selector } = args as { appId: string; selector: string }
        const webContentsId = getWebContentsId(appId)
        if (!webContentsId) {
          return {
            content: [{ type: 'text', text: `Mini-app not found: ${appId}` }],
            isError: true
          }
        }

        const result = await cdpBridgeService.getElementInfo(webContentsId, selector)
        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error || 'Element not found' }],
            isError: true
          }
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }]
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

class MinAppControllerServer {
  public server: Server

  constructor() {
    this.server = server
    logger.info('MinAppControllerServer initialized')
  }
}

export default MinAppControllerServer
