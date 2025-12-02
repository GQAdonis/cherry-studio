/**
 * @theboss/sdk
 *
 * SDK for integrating external applications with Cherry Studio.
 *
 * @example
 * ```typescript
 * import { createCherryClient } from '@theboss/sdk';
 *
 * const client = createCherryClient({
 *   appId: 'my-app',
 *   appName: 'My App',
 *   capabilities: {
 *     ai: true,
 *     knowledge: true,
 *     tools: true
 *   }
 * });
 *
 * await client.connect();
 *
 * // Use AI services
 * const result = await client.ai.complete([
 *   { role: 'user', content: 'Hello!' }
 * ]);
 *
 * // Register as a tool
 * await client.registerTool({
 *   name: 'search-my-data',
 *   description: 'Search my app data',
 *   inputSchema: {
 *     type: 'object',
 *     properties: {
 *       query: { type: 'string' }
 *     },
 *     required: ['query']
 *   },
 *   handler: async (args) => {
 *     // Handle the tool call
 *     return { results: [] };
 *   }
 * });
 * ```
 */

// Core
export { CherryClient, createCherryClient } from './core/CherryClient'
export { WebViewTransport } from './core/WebViewTransport'
export { WebSocketTransport } from './core/WebSocketTransport'

// Services
export { createAIService } from './services/ai'
export { createKnowledgeService } from './services/knowledge'
export { createMemoryService } from './services/memory'
export { createMCPService } from './services/mcp'
export { createToolService } from './services/tools'

// Types
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
  Transport,
  AIService,
  KnowledgeService,
  MemoryService,
  MCPService,
  ToolService
} from './types'

