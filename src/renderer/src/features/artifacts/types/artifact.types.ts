/**
 * Artifact Viewer Type Definitions
 *
 * These types define the structure for AI-generated interactive content
 * that can be rendered, refined, and saved within Cherry Studio.
 *
 * Aligned with Prometheus Artifact Specification (PAS) 4.1
 */

import type { KnowledgeReference, MCPToolResponse, NormalToolResponse, WebSearchResponse } from '@renderer/types'
import type { JSONSchema7 } from 'json-schema'

/**
 * Supported artifact types for rendering (simple artifacts)
 */
export type ArtifactType = 'html' | 'htmx' | 'react' | 'svg' | 'mermaid' | 'markdown' | 'code'

/**
 * PAS 4.1 Artifact kinds for rich application artifacts
 */
export type ArtifactKind = 'application' | 'page' | 'fragment' | 'agent' | 'workflow' | 'component' | 'markdown'

/**
 * View modes for the artifact workspace
 */
export type ViewMode = 'preview' | 'code' | 'split'

/**
 * Theme options for artifact rendering
 */
export type ArtifactTheme = 'light' | 'dark' | 'auto'

/**
 * Status of an artifact during processing
 */
export enum ArtifactStatus {
  PENDING = 'pending',
  STREAMING = 'streaming',
  COMPLETE = 'complete',
  ERROR = 'error'
}

/**
 * PAS 4.1 Schema ports for data flow
 */
export interface ArtifactSchema {
  /** Input schema for artifact */
  inputs?: JSONSchema7
  /** Output schema for artifact */
  outputs?: JSONSchema7
}

/**
 * PAS 4.1 Reference to another artifact
 */
export interface ArtifactReference {
  /** Referenced artifact ID */
  id: string
  /** Kind of referenced artifact */
  kind: ArtifactKind
}

/**
 * Metadata associated with an artifact
 */
export interface ArtifactMetadata {
  /** Whether to include Tailwind CSS */
  tailwind: boolean
  /** Theme preference for rendering */
  theme: ArtifactTheme
  /** Programming language for code artifacts */
  language?: string
  /** Framework used (e.g., 'react', 'vue') */
  framework?: string
  /** External dependencies to load */
  dependencies?: string[]
  /** HTMX-specific: server endpoint for interactions */
  htmxEndpoint?: string
  /** HTMX-specific: allowed HTMX attributes */
  htmxAllowedAttributes?: string[]
  /** Custom CSS to inject */
  customStyles?: string
  /** Width constraint for rendering */
  width?: number
  /** Height constraint for rendering */
  height?: number
  /** Human-readable description for search/embeddings (PAS 4.1) */
  description?: string
  /** Author of the artifact (PAS 4.1) */
  author?: string
}

/**
 * Core artifact interface representing a parsed and stored artifact
 */
export interface Artifact {
  /** Unique identifier */
  id: string
  /** Human-readable identifier from the AI */
  identifier: string
  /** Type of artifact (simple) */
  type: ArtifactType
  /** PAS 4.1 kind for rich artifacts */
  kind?: ArtifactKind
  /** Display title */
  title: string
  /** Raw content of the artifact */
  content: string
  /** Current version number */
  version: number
  /** Associated conversation ID */
  conversationId: string
  /** Associated message ID */
  messageId: string
  /** Creation timestamp */
  createdAt: string
  /** Last update timestamp */
  updatedAt: string
  /** Whether the artifact is saved to library */
  saved: boolean
  /** User-defined tags for organization */
  tags: string[]
  /** Artifact metadata */
  metadata: ArtifactMetadata
  /** Current status */
  status: ArtifactStatus
  /** PAS 4.1 schema for data flow */
  schema?: ArtifactSchema
  /** PAS 4.1 references to other artifacts */
  references?: ArtifactReference[]
}

/**
 * Extended artifact for library storage with embeddings
 */
export interface StoredArtifact extends Artifact {
  /** Vector embedding of description for semantic search */
  descriptionEmbedding?: number[]
  /** Vector embedding of content (optional, for code search) */
  contentEmbedding?: number[]
  /** Whether artifact is starred/favorited */
  starred: boolean
  /** Previous version ID for version history */
  previousVersionId?: string
  /** Usage count for popularity sorting */
  usageCount?: number
  /** Last time the artifact was used */
  lastUsedAt?: string
  /** Preview thumbnail as base64 data URL */
  thumbnail?: string
}

/**
 * Parsed artifact from message content (before storage)
 */
export interface ParsedArtifact {
  /** Identifier attribute from the tag */
  identifier: string
  /** Type of artifact */
  type: ArtifactType
  /** Title attribute */
  title: string
  /** Content between tags */
  content: string
  /** All parsed attributes */
  attributes: Record<string, string>
  /** Start index in original content */
  startIndex: number
  /** End index in original content */
  endIndex: number
}

/**
 * Result of parsing message content for artifacts
 */
export interface ParseResult {
  /** All artifacts found */
  artifacts: ParsedArtifact[]
  /** Content segments (text and artifact references) */
  segments: TextSegment[]
  /** Whether any artifacts were found */
  hasArtifacts: boolean
}

/**
 * A segment of text or artifact reference in parsed content
 */
export interface TextSegment {
  /** Segment type */
  type: 'text' | 'artifact'
  /** Text content (for text segments) */
  content: string
  /** Artifact reference (for artifact segments) */
  artifact?: ParsedArtifact
  /** Index in original content */
  index: number
}

/**
 * Version history entry for an artifact
 */
export interface ArtifactVersion {
  /** Unique version ID */
  id: string
  /** Parent artifact ID */
  artifactId: string
  /** Version number */
  version: number
  /** Content at this version */
  content: string
  /** Creation timestamp */
  createdAt: string
  /** Refinement prompt that led to this version */
  refinementPrompt?: string
  /** Metadata at this version */
  metadata?: Partial<ArtifactMetadata>
}

/**
 * Message in artifact refinement chat
 * Extended to support rich content like thinking, web search, knowledge base, and MCP tools
 */
export interface RefinementMessage {
  /** Unique message ID */
  id: string
  /** Message role */
  role: 'user' | 'assistant' | 'system'
  /** Message content (text response) */
  content: string
  /** Timestamp */
  timestamp: string
  /** Associated artifact version after this message */
  artifactVersion?: number
  /** Whether the message is still streaming */
  isStreaming?: boolean

  // Thinking/Reasoning content
  /** Thinking/reasoning content from AI */
  thinking?: string
  /** Thinking time in milliseconds */
  thinkingTime?: number
  /** Whether thinking is currently in progress */
  isThinking?: boolean

  // Web Search content
  /** Web search results */
  webSearchResults?: WebSearchResponse
  /** Whether web search is in progress */
  isSearching?: boolean

  // Knowledge Base content
  /** Knowledge base search results */
  knowledgeResults?: KnowledgeReference[]
  /** Whether knowledge search is in progress */
  isKnowledgeSearching?: boolean

  // MCP Tool content
  /** MCP tool call responses */
  mcpTools?: (MCPToolResponse | NormalToolResponse)[]
  /** Whether MCP tools are currently being called */
  isMcpToolRunning?: boolean

  // Skill activation diagnostics
  /** Skill activation events emitted during refinement */
  skillActivations?: RefinementSkillActivation[]

  // Context management diagnostics
  /** Context management actions emitted during refinement */
  contextActions?: RefinementContextAction[]

  // Artifact lifecycle diagnostics
  /** Artifact refinement lifecycle events */
  artifactLifecycle?: ArtifactLifecycleEvent[]
}

export interface RefinementSkillActivation {
  skillName: string
  action: 'activated' | 'completed' | 'failed'
  toolName?: string
  result?: string
  error?: string
}

export interface RefinementContextAction {
  action: 'pruned' | 'summarized' | 'cleared'
  summary?: string
  removedCount?: number
}

export interface ArtifactLifecycleEvent {
  stage: 'started' | 'completed' | 'failed'
  summary?: string
  timestamp: string
}

/**
 * Options for rendering an artifact
 */
export interface RenderOptions {
  /** Theme to use */
  theme: ArtifactTheme
  /** Container width */
  width?: number
  /** Container height */
  height?: number
  /** Whether the artifact is interactive */
  interactive: boolean
  /** Whether to show loading state */
  showLoading?: boolean
  /** HTMX server port for interactions */
  htmxServerPort?: number
}

/**
 * Error information from artifact rendering
 */
export interface ArtifactError {
  /** Error message */
  message: string
  /** Line number where error occurred */
  line?: number
  /** Column number where error occurred */
  column?: number
  /** Stack trace if available */
  stack?: string
  /** Error type/code */
  code?: string
}

/**
 * Event types for artifact iframe communication
 */
export type ArtifactEventType =
  | 'ready'
  | 'error'
  | 'resize'
  | 'htmx:request'
  | 'htmx:response'
  | 'htmx:error'
  | 'console'
  | 'click'
  | 'submit'

/**
 * Message sent between iframe and parent
 */
export interface ArtifactBridgeMessage {
  /** Event type */
  type: ArtifactEventType
  /** Artifact ID */
  artifactId: string
  /** Event payload */
  payload?: Record<string, unknown>
  /** Error information if applicable */
  error?: ArtifactError
  /** Timestamp */
  timestamp: number
}

/**
 * HTMX request intercepted from artifact
 */
export interface HtmxRequest {
  /** Request ID */
  id: string
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  /** Request URL/path */
  url: string
  /** Request headers */
  headers: Record<string, string>
  /** Request body */
  body?: string | Record<string, unknown>
  /** Trigger element info */
  trigger?: {
    id?: string
    name?: string
    value?: string
  }
}

/**
 * HTMX response to send back to artifact
 */
export interface HtmxResponse {
  /** Request ID this responds to */
  requestId: string
  /** HTTP status code */
  status: number
  /** Response headers */
  headers: Record<string, string>
  /** Response body (HTML content) */
  body: string
  /** Error message if failed */
  error?: string
}

/**
 * Artifact library item for saved artifacts list (summary view)
 */
export interface ArtifactLibraryItem {
  /** Artifact ID */
  id: string
  /** Display title */
  title: string
  /** Artifact type */
  type: ArtifactType
  /** PAS 4.1 kind */
  kind?: ArtifactKind
  /** Preview thumbnail (data URL) */
  thumbnail?: string
  /** Tags */
  tags: string[]
  /** Description for search */
  description?: string
  /** Last updated */
  updatedAt: string
  /** Version count */
  versionCount: number
  /** Whether starred */
  starred?: boolean
  /** Usage count */
  usageCount?: number
}

/**
 * Redux state for artifacts
 */
export interface ArtifactsState {
  /** Whether the modal is open */
  isModalOpen: boolean
  /** Currently active artifact in modal */
  activeArtifact: Artifact | null
  /** Current view mode */
  viewMode: ViewMode
  /** List of saved artifacts */
  savedArtifacts: ArtifactLibraryItem[]
  /** Refinement chat messages */
  refinementMessages: RefinementMessage[]
  /** Whether refinement is in progress */
  isRefining: boolean
  /** Whether artifact content is currently being streamed (incomplete <cs-artifact> tag) */
  isArtifactStreaming: boolean
  /** Streaming artifact content for real-time code view updates */
  streamingArtifactContent: string | null
  /** Version history for active artifact */
  versionHistory: ArtifactVersion[]
  /** Current version index (for undo/redo) */
  currentVersionIndex: number
  /** Whether artifact content is being loaded */
  isLoading: boolean
  /** Current error if any */
  error: ArtifactError | null
  /** HTMX server port */
  htmxServerPort: number | null
  /** Model ID from parent conversation for refinement */
  parentModelId: string | null
  /** Context messages from the original conversation for refinement context */
  contextMessages: ContextMessage[]
}

/** Context message for artifact refinement */
export interface ContextMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/**
 * Default metadata values
 */
export const DEFAULT_ARTIFACT_METADATA: ArtifactMetadata = {
  tailwind: true,
  theme: 'auto',
  language: undefined,
  framework: undefined,
  dependencies: [],
  htmxEndpoint: undefined,
  htmxAllowedAttributes: ['hx-get', 'hx-post', 'hx-put', 'hx-delete', 'hx-patch', 'hx-trigger', 'hx-target', 'hx-swap'],
  customStyles: undefined,
  width: undefined,
  height: undefined
}

/**
 * Type guard to check if a string is a valid ArtifactType
 */
export function isValidArtifactType(type: string): type is ArtifactType {
  return ['html', 'htmx', 'react', 'svg', 'mermaid', 'markdown', 'code'].includes(type)
}

/**
 * Get file extension for artifact type
 */
export function getArtifactExtension(type: ArtifactType, language?: string): string {
  switch (type) {
    case 'html':
    case 'htmx':
      return 'html'
    case 'react':
      return 'tsx'
    case 'svg':
      return 'svg'
    case 'mermaid':
      return 'mmd'
    case 'markdown':
      return 'md'
    case 'code':
      return language || 'txt'
    default:
      return 'txt'
  }
}

/**
 * Get MIME type for artifact type
 */
export function getArtifactMimeType(type: ArtifactType): string {
  switch (type) {
    case 'html':
    case 'htmx':
      return 'text/html'
    case 'react':
      return 'text/javascript'
    case 'svg':
      return 'image/svg+xml'
    case 'mermaid':
    case 'markdown':
      return 'text/plain'
    case 'code':
      return 'text/plain'
    default:
      return 'text/plain'
  }
}
