/**
 * Cherry Studio Artifact Viewer System
 *
 * This module provides the complete artifact viewer functionality including:
 * - Detection and parsing of <cs-artifact> tags in AI responses
 * - Interactive artifact cards in chat messages
 * - Full-screen modal with live preview and refinement chat
 * - Persistence to IndexedDB
 *
 * Usage:
 * 1. Import ArtifactModal and add it to your app root
 * 2. Use parseArtifacts() to detect artifacts in message content
 * 3. Use ArtifactCard to display artifacts in chat
 * 4. Use the Redux actions to control the artifact viewer
 */

// Types
export * from './types'

// Components
export {
  ArtifactBlock,
  ArtifactCard,
  ArtifactChatPanel,
  ArtifactCodeEditor,
  ArtifactModal,
  ArtifactRenderer,
  ArtifactWorkspace
} from './components'

// Utils
export {
  buildDocument,
  buildPreviewDocument,
  countArtifacts,
  extractArtifactContent,
  getArtifactMetadata,
  hasArtifacts,
  hasIncompleteArtifact,
  parseArtifacts,
  serializeArtifact,
  updateArtifactContent
} from './utils'

// Database
export {
  clearAllArtifacts,
  createArtifact,
  createArtifactVersion,
  deleteArtifact,
  getArtifact,
  getArtifactByIdentifier,
  getArtifactDb,
  getArtifactsByConversation,
  getArtifactsByMessage,
  getArtifactStats,
  getArtifactVersion,
  getArtifactVersions,
  getSavedArtifacts,
  saveArtifact,
  saveArtifactVersion,
  updateArtifact
} from './db'

// Hooks
export {
  useArtifactParser,
  useArtifactRefinement,
  useArtifactRenderer,
  useArtifactStorage
} from './hooks'
