/**
 * Artifact Viewer Type Definitions
 *
 * These types define the structure for AI-generated interactive content
 * that can be rendered, refined, and saved within Cherry Studio.
 */

/**
 * Supported artifact types for rendering
 */
export type ArtifactType = 'html' | 'htmx' | 'react' | 'svg' | 'mermaid' | 'markdown' | 'code'

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
}

/**
 * Core artifact interface representing a parsed and stored artifact
 */
export interface Artifact {
  /** Unique identifier */
  id: string
  /** Human-readable identifier from the AI */
  identifier: string
  /** Type of artifact */
  type: ArtifactType
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
 */
export interface RefinementMessage {
  /** Unique message ID */
  id: string
  /** Message role */
  role: 'user' | 'assistant' | 'system'
  /** Message content */
  content: string
  /** Timestamp */
  timestamp: string
  /** Associated artifact version after this message */
  artifactVersion?: number
  /** Whether the message is still streaming */
  isStreaming?: boolean
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
 * Artifact library item for saved artifacts list
 */
export interface ArtifactLibraryItem {
  /** Artifact ID */
  id: string
  /** Display title */
  title: string
  /** Artifact type */
  type: ArtifactType
  /** Preview thumbnail (data URL) */
  thumbnail?: string
  /** Tags */
  tags: string[]
  /** Last updated */
  updatedAt: string
  /** Version count */
  versionCount: number
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
