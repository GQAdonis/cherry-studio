/**
 * @theboss/sdk/webview
 *
 * Lightweight entry point for apps embedded in Cherry Studio webviews.
 * Uses only the WebView transport.
 *
 * @example
 * ```typescript
 * import { createCherryClient } from '@theboss/sdk/webview';
 *
 * const client = createCherryClient({
 *   appId: 'my-embedded-app',
 *   appName: 'My Embedded App',
 *   capabilities: { ai: true }
 * });
 *
 * await client.connect();
 * ```
 */

import { CherryClient } from './core/CherryClient'
import type { CherryClientConfig } from './types'

/**
 * Create a Cherry client configured for webview transport
 */
export function createCherryClient(config: Omit<CherryClientConfig, 'transport' | 'serverUrl'>): CherryClient {
  return new CherryClient({
    ...config,
    transport: 'webview'
  })
}

export { CherryClient }
export { WebViewTransport } from './core/WebViewTransport'

// Re-export types
export type {
  CherryClientConfig,
  AppCapabilities,
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
  AIStreamChunk,
  AIEmbeddingResult,
  KnowledgeBase,
  KnowledgeSearchOptions,
  KnowledgeSearchResult,
  KnowledgeAddOptions,
  MemoryEntry,
  MemorySearchOptions,
  MCPTool,
  MCPToolCallResult,
  ToolDefinition,
  CherryEventType,
  CherryEvent,
  CherryEventHandler,
  AIService,
  KnowledgeService,
  MemoryService,
  MCPService,
  ToolService
} from './types'

