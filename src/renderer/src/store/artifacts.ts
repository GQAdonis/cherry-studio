/**
 * Artifacts Redux Slice
 *
 * Manages state for the artifact viewer system including:
 * - Modal open/close state
 * - Active artifact and view mode
 * - Refinement chat messages
 * - Version history and undo/redo
 */

import type { PayloadAction } from '@reduxjs/toolkit'
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { nanoid } from '@reduxjs/toolkit'
import {
  createArtifact as createArtifactRecord,
  createArtifactVersion,
  deleteArtifact as deleteArtifactFromDb,
  getArtifact as getArtifactFromDb,
  getArtifactVersions,
  getSavedArtifacts as getSavedArtifactsFromDb,
  saveArtifact as saveArtifactToDb,
  saveArtifactVersion,
  updateArtifact as updateArtifactInDb
} from '@renderer/features/artifacts/db/artifactDb'
import type {
  Artifact,
  ArtifactError,
  ArtifactMetadata,
  ArtifactProjectContextEnvelope,
  ArtifactProjectRuntimeResolvedContext,
  ArtifactsState,
  ArtifactStatus,
  CompilationStatus,
  ContextMessage,
  ParsedArtifact,
  RefinementMessage,
  ViewMode
} from '@renderer/features/artifacts/types'
import { DEFAULT_ARTIFACT_METADATA } from '@renderer/features/artifacts/types'

/**
 * Initial state
 */
const initialState: ArtifactsState = {
  isModalOpen: false,
  activeArtifact: null,
  viewMode: 'preview',
  savedArtifacts: [],
  refinementMessages: [],
  isRefining: false,
  isArtifactStreaming: false, // Whether artifact content is currently being streamed
  streamingArtifactContent: null, // Partial artifact content during streaming for code view
  isCodeStreaming: false, // Whether studio code is actively streaming via <cs-studio-code> protocol
  compilationStatus: 'idle', // Current compilation status for the preview
  compilationError: null, // Compilation error message
  autoFixAttempts: 0, // Number of auto-fix attempts in current refinement turn
  versionHistory: [],
  currentVersionIndex: -1,
  isLoading: false,
  error: null,
  htmxServerPort: null,
  parentModelId: null, // Model ID from parent conversation for refinement
  contextMessages: [], // Context from original conversation
  activeProjectId: null,
  activeStudioSessionId: null,
  activeProjectContextEnvelope: null,
  activeProjectResolvedContext: null
}

/**
 * Async thunk: Load saved artifacts from database
 */
export const loadSavedArtifacts = createAsyncThunk('artifacts/loadSavedArtifacts', async () => {
  return await getSavedArtifactsFromDb()
})

/**
 * Async thunk: Save artifact to database
 */
export const saveArtifactToLibrary = createAsyncThunk(
  'artifacts/saveToLibrary',
  async (artifact: Artifact, { rejectWithValue }) => {
    try {
      const savedArtifact = { ...artifact, saved: true, updatedAt: new Date().toISOString() }
      await saveArtifactToDb(savedArtifact)
      return savedArtifact
    } catch (error) {
      return rejectWithValue({ message: (error as Error).message })
    }
  }
)

/**
 * Async thunk: Delete artifact from database
 */
export const deleteArtifactFromLibrary = createAsyncThunk(
  'artifacts/deleteFromLibrary',
  async (artifactId: string, { rejectWithValue }) => {
    try {
      await deleteArtifactFromDb(artifactId)
      return artifactId
    } catch (error) {
      return rejectWithValue({ message: (error as Error).message })
    }
  }
)

/**
 * Async thunk: Load artifact by ID
 */
export const loadArtifact = createAsyncThunk(
  'artifacts/loadArtifact',
  async (artifactId: string, { rejectWithValue }) => {
    try {
      const artifact = await getArtifactFromDb(artifactId)
      if (!artifact) {
        return rejectWithValue({ message: 'Artifact not found' })
      }
      const versions = await getArtifactVersions(artifactId)
      return { artifact, versions }
    } catch (error) {
      return rejectWithValue({ message: (error as Error).message })
    }
  }
)

/**
 * Async thunk: Save current version and create new version
 */
export const saveVersion = createAsyncThunk(
  'artifacts/saveVersion',
  async (
    {
      artifact,
      newContent,
      refinementPrompt
    }: {
      artifact: Artifact
      newContent: string
      refinementPrompt?: string
    },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as { artifacts: ArtifactsState }

      // Save current content as a version
      const version = createArtifactVersion({
        artifactId: artifact.id,
        version: artifact.version,
        content: artifact.content,
        refinementPrompt,
        metadata: artifact.metadata,
        chatSnapshot: state.artifacts.refinementMessages
      })
      await saveArtifactVersion(version)

      // Update artifact with new content
      const updatedArtifact: Artifact = {
        ...artifact,
        content: newContent,
        version: artifact.version + 1,
        updatedAt: new Date().toISOString()
      }
      await updateArtifactInDb(artifact.id, {
        content: newContent,
        version: artifact.version + 1
      })

      return { artifact: updatedArtifact, version }
    } catch (error) {
      return rejectWithValue({ message: (error as Error).message })
    }
  }
)

/**
 * Artifacts slice
 */
const artifactsSlice = createSlice({
  name: 'artifacts',
  initialState,
  reducers: {
    /**
     * Open the artifact modal with an artifact
     */
    openArtifact: (
      state,
      action: PayloadAction<{
        parsedArtifact: ParsedArtifact
        conversationId: string
        messageId: string
        artifactProjectId?: string
        contextMessages?: ContextMessage[]
        contextEnvelope?: ArtifactProjectContextEnvelope
      }>
    ) => {
      const {
        parsedArtifact,
        conversationId,
        messageId,
        artifactProjectId,
        contextMessages = [],
        contextEnvelope
      } = action.payload

      // Create artifact from parsed data
      const artifact = createArtifactRecord({
        identifier: parsedArtifact.identifier,
        type: parsedArtifact.type,
        title: parsedArtifact.title,
        content: parsedArtifact.content,
        conversationId,
        messageId,
        artifactProjectId,
        metadata: {
          ...DEFAULT_ARTIFACT_METADATA,
          tailwind: parsedArtifact.attributes.tailwind !== 'false',
          theme: (['light', 'dark', 'auto'].includes(parsedArtifact.attributes.theme)
            ? parsedArtifact.attributes.theme
            : 'auto') as 'light' | 'dark' | 'auto',
          language: parsedArtifact.attributes.language
        }
      })

      state.isModalOpen = true
      state.activeArtifact = artifact
      state.viewMode = 'preview'
      state.refinementMessages = []
      state.versionHistory = []
      state.currentVersionIndex = -1
      state.error = null
      state.contextMessages = contextMessages
      state.parentModelId = null
      state.activeProjectId = artifactProjectId || null
      state.activeProjectContextEnvelope = contextEnvelope || null
    },

    /**
     * Open modal with existing artifact
     */
    openExistingArtifact: (state, action: PayloadAction<Artifact>) => {
      state.isModalOpen = true
      state.activeArtifact = action.payload
      state.viewMode = 'preview'
      state.refinementMessages = []
      state.error = null
      state.parentModelId = null
      state.activeProjectId = action.payload.artifactProjectId || action.payload.metadata?.artifactProjectId || null
    },

    /**
     * Close the artifact modal
     */
    closeModal: (state) => {
      state.isModalOpen = false
      state.activeArtifact = null
      state.refinementMessages = []
      state.isRefining = false
      state.isArtifactStreaming = false
      state.streamingArtifactContent = null
      state.isCodeStreaming = false
      state.compilationStatus = 'idle'
      state.compilationError = null
      state.autoFixAttempts = 0
      state.versionHistory = []
      state.currentVersionIndex = -1
      state.error = null
      state.parentModelId = null
      state.activeProjectId = null
      state.activeStudioSessionId = null
      state.activeProjectContextEnvelope = null
      state.activeProjectResolvedContext = null
    },

    /**
     * Set the view mode
     */
    setViewMode: (state, action: PayloadAction<ViewMode>) => {
      state.viewMode = action.payload
    },

    /**
     * Update artifact content directly
     */
    updateContent: (state, action: PayloadAction<string>) => {
      if (state.activeArtifact) {
        state.activeArtifact.content = action.payload
        state.activeArtifact.updatedAt = new Date().toISOString()
      }
    },

    /**
     * Update artifact metadata
     */
    updateMetadata: (state, action: PayloadAction<Partial<ArtifactMetadata>>) => {
      if (state.activeArtifact) {
        state.activeArtifact.metadata = {
          ...state.activeArtifact.metadata,
          ...action.payload
        }
        state.activeArtifact.updatedAt = new Date().toISOString()
      }
    },

    /**
     * Update artifact title
     */
    updateTitle: (state, action: PayloadAction<string>) => {
      if (state.activeArtifact) {
        state.activeArtifact.title = action.payload
        state.activeArtifact.updatedAt = new Date().toISOString()
      }
    },

    /**
     * Update artifact tags
     */
    updateTags: (state, action: PayloadAction<string[]>) => {
      if (state.activeArtifact) {
        state.activeArtifact.tags = action.payload
        state.activeArtifact.updatedAt = new Date().toISOString()
      }
    },

    /**
     * Add a refinement message
     */
    addRefinementMessage: (
      state,
      action: PayloadAction<
        Omit<RefinementMessage, 'id' | 'timestamp'> & {
          id?: string
          timestamp?: string
        }
      >
    ) => {
      const newMessage = {
        ...action.payload,
        id: action.payload.id || nanoid(),
        timestamp: action.payload.timestamp || new Date().toISOString()
      } as RefinementMessage
      ;(state.refinementMessages as RefinementMessage[]).push(newMessage)
    },

    /**
     * Update a streaming refinement message with all rich content fields
     */
    updateRefinementMessage: (
      state,
      action: PayloadAction<{
        id: string
        content?: string
        isStreaming?: boolean
        // Thinking/reasoning
        thinking?: string
        thinkingTime?: number
        isThinking?: boolean
        // Web search
        webSearchResults?: RefinementMessage['webSearchResults']
        isSearching?: boolean
        // Knowledge base
        knowledgeResults?: RefinementMessage['knowledgeResults']
        isKnowledgeSearching?: boolean
        // MCP tools
        mcpTools?: RefinementMessage['mcpTools']
        isMcpToolRunning?: boolean
        // Skill activations
        skillActivations?: RefinementMessage['skillActivations']
        // Context actions
        contextActions?: RefinementMessage['contextActions']
        // Artifact lifecycle
        artifactLifecycle?: RefinementMessage['artifactLifecycle']
        // PMPO diagnostics
        pmpoPhases?: RefinementMessage['pmpoPhases']
        // Strategy diagnostics
        contextStrategy?: RefinementMessage['contextStrategy']
        skillStrategy?: RefinementMessage['skillStrategy']
      }>
    ) => {
      const message = state.refinementMessages.find((m) => m.id === action.payload.id)
      if (message) {
        const updates = { ...action.payload } as Record<string, unknown>
        delete updates.id
        // Only update fields that are explicitly provided
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined) {
            ;(message as any)[key] = value
          }
        })
      }
    },

    /**
     * Clear refinement messages
     */
    clearRefinementMessages: (state) => {
      state.refinementMessages = []
    },

    /**
     * Hydrate persisted refinement messages for studio reopen.
     */
    setRefinementMessages: (state, action: PayloadAction<RefinementMessage[]>) => {
      state.refinementMessages = action.payload
    },

    /**
     * Set refining state
     */
    setIsRefining: (state, action: PayloadAction<boolean>) => {
      state.isRefining = action.payload
    },

    /**
     * Set artifact streaming state
     * True when an artifact tag is being streamed (incomplete)
     */
    setIsArtifactStreaming: (state, action: PayloadAction<boolean>) => {
      state.isArtifactStreaming = action.payload
      // Clear streaming content when streaming ends
      if (!action.payload) {
        state.streamingArtifactContent = null
      }
    },

    /**
     * Update streaming artifact content for real-time code view updates
     * This allows the code view to show partial artifact content during streaming
     */
    updateStreamingArtifactContent: (state, action: PayloadAction<string | null>) => {
      state.streamingArtifactContent = action.payload
    },

    /**
     * Undo to previous version
     */
    undo: (state) => {
      if (state.currentVersionIndex > 0 && state.activeArtifact) {
        state.currentVersionIndex -= 1
        const version = state.versionHistory[state.currentVersionIndex]
        if (version) {
          state.activeArtifact.content = version.content
          if (version.metadata) {
            state.activeArtifact.metadata = {
              ...state.activeArtifact.metadata,
              ...version.metadata
            }
          }
        }
      }
    },

    /**
     * Redo to next version
     */
    redo: (state) => {
      if (state.currentVersionIndex < state.versionHistory.length - 1 && state.activeArtifact) {
        state.currentVersionIndex += 1
        const version = state.versionHistory[state.currentVersionIndex]
        if (version) {
          state.activeArtifact.content = version.content
          if (version.metadata) {
            state.activeArtifact.metadata = {
              ...state.activeArtifact.metadata,
              ...version.metadata
            }
          }
        }
      }
    },

    /**
     * Hydrate persisted version navigation state for studio reopen.
     */
    setVersionHistoryState: (
      state,
      action: PayloadAction<{
        versionHistory: ArtifactsState['versionHistory']
        currentVersionIndex: number
      }>
    ) => {
      state.versionHistory = action.payload.versionHistory
      state.currentVersionIndex = action.payload.currentVersionIndex
    },

    /**
     * Set error state
     */
    setError: (state, action: PayloadAction<ArtifactError | null>) => {
      state.error = action.payload
    },

    /**
     * Set HTMX server port
     */
    setHtmxServerPort: (state, action: PayloadAction<number | null>) => {
      state.htmxServerPort = action.payload
    },

    /**
     * Set loading state
     */
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },

    /**
     * Update artifact status
     */
    setArtifactStatus: (state, action: PayloadAction<ArtifactStatus>) => {
      if (state.activeArtifact) {
        state.activeArtifact.status = action.payload
      }
    },

    /**
     * Set parent model ID for refinement
     */
    setParentModelId: (state, action: PayloadAction<string | null>) => {
      state.parentModelId = action.payload
    },

    setActiveProjectId: (state, action: PayloadAction<string | null>) => {
      state.activeProjectId = action.payload
      if (state.activeArtifact) {
        state.activeArtifact.artifactProjectId = action.payload || undefined
        state.activeArtifact.metadata = {
          ...state.activeArtifact.metadata,
          artifactProjectId: action.payload || undefined
        }
      }
    },

    setActiveStudioSessionId: (state, action: PayloadAction<string | null>) => {
      state.activeStudioSessionId = action.payload
    },

    setActiveProjectContextEnvelope: (state, action: PayloadAction<ArtifactProjectContextEnvelope | null>) => {
      state.activeProjectContextEnvelope = action.payload
    },

    setActiveProjectResolvedContext: (state, action: PayloadAction<ArtifactProjectRuntimeResolvedContext | null>) => {
      state.activeProjectResolvedContext = action.payload
    },

    /**
     * Set studio code streaming state (from <cs-studio-code> protocol)
     */
    setIsCodeStreaming: (state, action: PayloadAction<boolean>) => {
      state.isCodeStreaming = action.payload
      if (!action.payload) {
        // When code streaming ends, reset auto-fix counter for next turn
        state.autoFixAttempts = 0
      }
    },

    /**
     * Set compilation status from the preview iframe
     */
    setCompilationStatus: (state, action: PayloadAction<CompilationStatus>) => {
      state.compilationStatus = action.payload
      if (action.payload !== 'error') {
        state.compilationError = null
      }
    },

    /**
     * Set compilation error message
     */
    setCompilationError: (state, action: PayloadAction<string | null>) => {
      state.compilationError = action.payload
      if (action.payload) {
        state.compilationStatus = 'error'
      }
    },

    /**
     * Increment auto-fix attempt counter
     */
    incrementAutoFixAttempts: (state) => {
      state.autoFixAttempts += 1
    },

    /**
     * Reset auto-fix attempt counter
     */
    resetAutoFixAttempts: (state) => {
      state.autoFixAttempts = 0
    }
  },
  extraReducers: (builder) => {
    // Load saved artifacts
    builder
      .addCase(loadSavedArtifacts.pending, (state) => {
        state.isLoading = true
      })
      .addCase(loadSavedArtifacts.fulfilled, (state, action) => {
        state.savedArtifacts = action.payload
        state.isLoading = false
      })
      .addCase(loadSavedArtifacts.rejected, (state, action) => {
        state.isLoading = false
        state.error = { message: action.error.message || 'Failed to load saved artifacts' }
      })

    // Save artifact to library
    builder
      .addCase(saveArtifactToLibrary.fulfilled, (state, action) => {
        state.activeArtifact = action.payload
        // Add to saved list if not already there
        const exists = state.savedArtifacts.some((a) => a.id === action.payload.id)
        if (!exists) {
          state.savedArtifacts.unshift({
            id: action.payload.id,
            title: action.payload.title,
            type: action.payload.type,
            tags: action.payload.tags,
            updatedAt: action.payload.updatedAt,
            versionCount: action.payload.version
          })
        }
      })
      .addCase(saveArtifactToLibrary.rejected, (state, action) => {
        state.error = action.payload as ArtifactError
      })

    // Delete artifact from library
    builder.addCase(deleteArtifactFromLibrary.fulfilled, (state, action) => {
      state.savedArtifacts = state.savedArtifacts.filter((a) => a.id !== action.payload)
      if (state.activeArtifact?.id === action.payload) {
        state.activeArtifact = null
        state.isModalOpen = false
      }
    })

    // Load artifact
    builder
      .addCase(loadArtifact.pending, (state) => {
        state.isLoading = true
      })
      .addCase(loadArtifact.fulfilled, (state, action) => {
        state.activeArtifact = action.payload.artifact
        state.versionHistory = action.payload.versions
        state.currentVersionIndex = action.payload.versions.length - 1
        state.isLoading = false
        state.isModalOpen = true
      })
      .addCase(loadArtifact.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as ArtifactError
      })

    // Save version
    builder
      .addCase(saveVersion.fulfilled, (state, action) => {
        state.activeArtifact = action.payload.artifact
        state.versionHistory.push(action.payload.version)
        state.currentVersionIndex = state.versionHistory.length - 1
      })
      .addCase(saveVersion.rejected, (state, action) => {
        state.error = action.payload as ArtifactError
      })
  }
})

export const {
  openArtifact,
  openExistingArtifact,
  closeModal,
  setViewMode,
  updateContent,
  updateMetadata,
  updateTitle,
  updateTags,
  addRefinementMessage,
  updateRefinementMessage,
  clearRefinementMessages,
  setRefinementMessages,
  setIsRefining,
  setIsArtifactStreaming,
  updateStreamingArtifactContent,
  setIsCodeStreaming,
  setCompilationStatus,
  setCompilationError,
  incrementAutoFixAttempts,
  resetAutoFixAttempts,
  undo,
  redo,
  setVersionHistoryState,
  setError,
  setHtmxServerPort,
  setIsLoading,
  setArtifactStatus,
  setParentModelId,
  setActiveProjectId,
  setActiveStudioSessionId,
  setActiveProjectContextEnvelope,
  setActiveProjectResolvedContext
} = artifactsSlice.actions

export default artifactsSlice.reducer

// Selectors
export const selectIsModalOpen = (state: { artifacts: ArtifactsState }) => state.artifacts.isModalOpen
export const selectActiveArtifact = (state: { artifacts: ArtifactsState }) => state.artifacts.activeArtifact
export const selectViewMode = (state: { artifacts: ArtifactsState }) => state.artifacts.viewMode
export const selectSavedArtifacts = (state: { artifacts: ArtifactsState }) => state.artifacts.savedArtifacts
export const selectRefinementMessages = (state: { artifacts: ArtifactsState }) => state.artifacts.refinementMessages
export const selectIsRefining = (state: { artifacts: ArtifactsState }) => state.artifacts.isRefining
export const selectIsArtifactStreaming = (state: { artifacts: ArtifactsState }) => state.artifacts.isArtifactStreaming
export const selectStreamingArtifactContent = (state: { artifacts: ArtifactsState }) =>
  state.artifacts.streamingArtifactContent
export const selectVersionHistory = (state: { artifacts: ArtifactsState }) => state.artifacts.versionHistory
export const selectCurrentVersionIndex = (state: { artifacts: ArtifactsState }) => state.artifacts.currentVersionIndex
export const selectCanUndo = (state: { artifacts: ArtifactsState }) => state.artifacts.currentVersionIndex > 0
export const selectCanRedo = (state: { artifacts: ArtifactsState }) =>
  state.artifacts.currentVersionIndex < state.artifacts.versionHistory.length - 1
export const selectArtifactError = (state: { artifacts: ArtifactsState }) => state.artifacts.error
export const selectHtmxServerPort = (state: { artifacts: ArtifactsState }) => state.artifacts.htmxServerPort
export const selectIsLoading = (state: { artifacts: ArtifactsState }) => state.artifacts.isLoading
export const selectParentModelId = (state: { artifacts: ArtifactsState }) => state.artifacts.parentModelId
export const selectContextMessages = (state: { artifacts: ArtifactsState }) => state.artifacts.contextMessages
export const selectActiveProjectId = (state: { artifacts: ArtifactsState }) => state.artifacts.activeProjectId
export const selectActiveStudioSessionId = (state: { artifacts: ArtifactsState }) =>
  state.artifacts.activeStudioSessionId
export const selectActiveProjectContextEnvelope = (state: { artifacts: ArtifactsState }) =>
  state.artifacts.activeProjectContextEnvelope
export const selectActiveProjectResolvedContext = (state: { artifacts: ArtifactsState }) =>
  state.artifacts.activeProjectResolvedContext
export const selectIsCodeStreaming = (state: { artifacts: ArtifactsState }) => state.artifacts.isCodeStreaming
export const selectCompilationStatus = (state: { artifacts: ArtifactsState }) => state.artifacts.compilationStatus
export const selectCompilationError = (state: { artifacts: ArtifactsState }) => state.artifacts.compilationError
export const selectAutoFixAttempts = (state: { artifacts: ArtifactsState }) => state.artifacts.autoFixAttempts
export const selectVersionNavigation = (state: { artifacts: ArtifactsState }) => ({
  currentVersion: state.artifacts.currentVersionIndex + 1,
  totalVersions: state.artifacts.versionHistory.length,
  canGoBack: state.artifacts.currentVersionIndex > 0,
  canGoForward: state.artifacts.currentVersionIndex < state.artifacts.versionHistory.length - 1
})
