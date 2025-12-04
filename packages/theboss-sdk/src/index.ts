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
export { WebSocketTransport } from './core/WebSocketTransport'
export { WebViewTransport } from './core/WebViewTransport'

// Services
export { createAIService } from './services/ai'
export { createKnowledgeService } from './services/knowledge'
export { createMCPService } from './services/mcp'
export { createMemoryService } from './services/memory'
export { createToolService } from './services/tools'

// Types
export type {
  AICompletionOptions,
  AICompletionResult,
  AIEmbeddingResult,
  AIMessage,
  AIService,
  AIStreamChunk,
  AppCapabilities,
  CherryClientConfig,
  CherryEvent,
  CherryEventHandler,
  CherryEventType,
  KnowledgeAddOptions,
  KnowledgeBase,
  KnowledgeSearchOptions,
  KnowledgeSearchResult,
  KnowledgeService,
  MCPService,
  MCPTool,
  MCPToolCallResult,
  MemoryEntry,
  MemorySearchOptions,
  MemoryService,
  ToolDefinition,
  ToolService,
  Transport
} from './types'
