/**
 * Extraction Adapters Index
 *
 * Provides adapters for extracting content from various AI chat applications.
 * Each adapter knows how to extract conversations, projects, and content
 * from a specific platform.
 */

import { loggerService } from '@logger'
import { cdpBridgeService, type CDPCommandResult } from '../../services/CDPBridgeService'
import { chatGPTAdapter } from './chatgpt'
import { claudeAdapter } from './claude'
import { perplexityAdapter } from './perplexity'
import { geminiAdapter } from './gemini'
import { genericAdapter } from './generic'

const logger = loggerService.withContext('ExtractionAdapters')

export interface Conversation {
  id: string
  title: string
  messages: ConversationMessage[]
  createdAt?: string
  updatedAt?: string
  metadata?: Record<string, unknown>
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

export interface ExtractionOptions {
  limit?: number
  currentOnly?: boolean
}

export interface ExtractionAdapter {
  name: string
  urlPatterns: RegExp[]
  getConversationsScript: (limit: number) => string
  getCurrentChatScript: () => string
  getProjectsScript?: () => string
}

// All available adapters
const adapters: ExtractionAdapter[] = [chatGPTAdapter, claudeAdapter, perplexityAdapter, geminiAdapter, genericAdapter]

/**
 * Get the appropriate adapter for a URL
 */
export function getAdapter(url: string): ExtractionAdapter {
  for (const adapter of adapters) {
    for (const pattern of adapter.urlPatterns) {
      if (pattern.test(url)) {
        return adapter
      }
    }
  }
  // Fall back to generic adapter
  return genericAdapter
}

/**
 * Extract conversations from a webview
 */
export async function extractConversations(
  webContentsId: number,
  url: string,
  options: ExtractionOptions = {}
): Promise<CDPCommandResult<Conversation[]>> {
  try {
    const { limit = 10, currentOnly = false } = options
    const adapter = getAdapter(url)

    logger.debug(`Using adapter: ${adapter.name} for URL: ${url}`)

    const script = currentOnly ? adapter.getCurrentChatScript() : adapter.getConversationsScript(limit)

    const result = await cdpBridgeService.evaluate<Conversation[]>(webContentsId, script)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return { success: true, data: result.data || [] }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to extract conversations:', error as Error)
    return { success: false, error: message }
  }
}

/**
 * Extract page content in various formats
 */
export async function extractPageContent(
  webContentsId: number,
  format: 'text' | 'html' | 'markdown' = 'text'
): Promise<CDPCommandResult<string>> {
  try {
    let script: string

    switch (format) {
      case 'html':
        script = `document.documentElement.outerHTML`
        break
      case 'markdown':
        script = `
          (function() {
            // Simple HTML to Markdown conversion
            const html = document.body.innerHTML;
            let md = html;
            
            // Headers
            md = md.replace(/<h1[^>]*>(.*?)<\\/h1>/gi, '# $1\\n');
            md = md.replace(/<h2[^>]*>(.*?)<\\/h2>/gi, '## $1\\n');
            md = md.replace(/<h3[^>]*>(.*?)<\\/h3>/gi, '### $1\\n');
            md = md.replace(/<h4[^>]*>(.*?)<\\/h4>/gi, '#### $1\\n');
            
            // Bold and italic
            md = md.replace(/<strong[^>]*>(.*?)<\\/strong>/gi, '**$1**');
            md = md.replace(/<b[^>]*>(.*?)<\\/b>/gi, '**$1**');
            md = md.replace(/<em[^>]*>(.*?)<\\/em>/gi, '*$1*');
            md = md.replace(/<i[^>]*>(.*?)<\\/i>/gi, '*$1*');
            
            // Links
            md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\\/a>/gi, '[$2]($1)');
            
            // Lists
            md = md.replace(/<li[^>]*>(.*?)<\\/li>/gi, '- $1\\n');
            md = md.replace(/<\\/?(ul|ol)[^>]*>/gi, '\\n');
            
            // Paragraphs and breaks
            md = md.replace(/<p[^>]*>(.*?)<\\/p>/gi, '$1\\n\\n');
            md = md.replace(/<br[^>]*>/gi, '\\n');
            md = md.replace(/<hr[^>]*>/gi, '---\\n');
            
            // Code
            md = md.replace(/<code[^>]*>(.*?)<\\/code>/gi, '\`$1\`');
            md = md.replace(/<pre[^>]*>(.*?)<\\/pre>/gis, '\`\`\`\\n$1\\n\`\`\`\\n');
            
            // Remove remaining tags
            md = md.replace(/<[^>]+>/g, '');
            
            // Clean up whitespace
            md = md.replace(/&nbsp;/g, ' ');
            md = md.replace(/&lt;/g, '<');
            md = md.replace(/&gt;/g, '>');
            md = md.replace(/&amp;/g, '&');
            md = md.replace(/\\n{3,}/g, '\\n\\n');
            
            return md.trim();
          })()
        `
        break
      case 'text':
      default:
        script = `
          (function() {
            // Remove script and style elements
            const clone = document.body.cloneNode(true);
            const scripts = clone.querySelectorAll('script, style, noscript');
            scripts.forEach(el => el.remove());
            
            // Get text content
            let text = clone.innerText || clone.textContent || '';
            
            // Clean up whitespace
            text = text.replace(/\\s+/g, ' ').trim();
            
            return text;
          })()
        `
        break
    }

    const result = await cdpBridgeService.evaluate<string>(webContentsId, script)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return { success: true, data: result.data || '' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to extract page content:', error as Error)
    return { success: false, error: message }
  }
}

export { chatGPTAdapter } from './chatgpt'
export { claudeAdapter } from './claude'
export { perplexityAdapter } from './perplexity'
export { geminiAdapter } from './gemini'
export { genericAdapter } from './generic'

