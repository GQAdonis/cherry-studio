/**
 * @theboss/sdk Type Definitions
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface CherryClientConfig {
  /** Unique identifier for your app */
  appId: string
  /** Display name for your app */
  appName: string
  /** App version */
  version?: string
  /** App description */
  description?: string
  /** Capabilities your app needs */
  capabilities?: Partial<AppCapabilities>
  /** Transport type: 'webview' for embedded apps, 'websocket' for external apps */
  transport?: 'webview' | 'websocket'
  /** WebSocket server URL (for external apps) */
  serverUrl?: string
}

export interface AppCapabilities {
  /** Access to AI completion services */
  ai: boolean
  /** Access to knowledge base operations */
  knowledge: boolean
  /** Access to memory storage */
  memory: boolean
  /** Access to MCP tools */
  mcp: boolean
  /** Sandboxed file access */
  files: boolean
  /** Read app settings */
  settings: boolean
  /** Clipboard access */
  clipboard: boolean
  /** Show notifications */
  notifications: boolean
  /** Register as MCP tool */
  tools: boolean
}

// ============================================================================
// AI Service Types
// ============================================================================

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AICompletionOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  stopSequences?: string[]
  stream?: boolean
}

export interface AICompletionResult {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason?: string
}

export interface AIStreamChunk {
  content: string
  done: boolean
}

export interface AIEmbeddingResult {
  embedding: number[]
  model: string
}

// ============================================================================
// Knowledge Base Types
// ============================================================================

export interface KnowledgeBase {
  id: string
  name: string
  description?: string
  documentCount?: number
}

export interface KnowledgeSearchOptions {
  limit?: number
  threshold?: number
}

export interface KnowledgeSearchResult {
  content: string
  score: number
  metadata?: Record<string, unknown>
}

export interface KnowledgeAddOptions {
  metadata?: Record<string, unknown>
  chunkSize?: number
}

// ============================================================================
// Memory Types
// ============================================================================

export interface MemoryEntry {
  id: string
  content: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt?: string
}

export interface MemorySearchOptions {
  limit?: number
  userId?: string
}

// ============================================================================
// MCP Types
// ============================================================================

export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  serverId?: string
  serverName?: string
}

export interface MCPToolCallResult {
  content: Array<{
    type: string
    text?: string
    data?: string
    mimeType?: string
  }>
  isError?: boolean
}

// ============================================================================
// Tool Registration Types
// ============================================================================

export interface ToolDefinition {
  /** Unique tool name */
  name: string
  /** Tool description for AI */
  description: string
  /** JSON Schema for input parameters */
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
  /** Handler function */
  handler: (args: Record<string, unknown>) => Promise<unknown>
}

// ============================================================================
// Event Types
// ============================================================================

export type CherryEventType =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'tool-call'
  | 'message'
  | 'capabilities-changed'

export interface CherryEvent<T = unknown> {
  type: CherryEventType
  data: T
}

export type CherryEventHandler<T = unknown> = (event: CherryEvent<T>) => void

// ============================================================================
// Transport Types
// ============================================================================

export interface Transport {
  connect(): Promise<void>
  disconnect(): Promise<void>
  send(type: string, payload?: unknown): void
  request<T>(type: string, payload?: unknown): Promise<T>
  onMessage(handler: (type: string, payload: unknown) => void): () => void
  isConnected(): boolean
}

// ============================================================================
// Service Interfaces
// ============================================================================

export interface AIService {
  complete(messages: AIMessage[], options?: AICompletionOptions): Promise<AICompletionResult>
  streamComplete(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): AsyncGenerator<AIStreamChunk, AICompletionResult, unknown>
  embed(text: string): Promise<AIEmbeddingResult>
}

export interface KnowledgeService {
  list(): Promise<KnowledgeBase[]>
  search(knowledgeBaseId: string, query: string, options?: KnowledgeSearchOptions): Promise<KnowledgeSearchResult[]>
  add(knowledgeBaseId: string, content: string, options?: KnowledgeAddOptions): Promise<{ id: string }>
}

export interface MemoryService {
  search(query: string, options?: MemorySearchOptions): Promise<MemoryEntry[]>
  add(content: string, metadata?: Record<string, unknown>): Promise<MemoryEntry>
  get(id: string): Promise<MemoryEntry | null>
  delete(id: string): Promise<boolean>
}

export interface MCPService {
  listTools(): Promise<MCPTool[]>
  callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<MCPToolCallResult>
}

export interface ToolService {
  register(definition: ToolDefinition): Promise<void>
  unregister(name: string): Promise<void>
  list(): ToolDefinition[]
}

