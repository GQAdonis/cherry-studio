/**
 * useArtifactStorage Hook
 *
 * Interface with Dexie database for artifact persistence.
 * Provides CRUD operations and version history management.
 */

import { useCallback, useEffect, useState } from 'react'

import {
  createArtifact as createArtifactRecord,
  createArtifactVersion,
  deleteArtifact as deleteArtifactFromDb,
  getArtifact,
  getArtifactsByConversation,
  getArtifactsByMessage,
  getArtifactVersions,
  getSavedArtifacts,
  saveArtifact,
  saveArtifactVersion,
  updateArtifact
} from '../db/artifactDb'
import type { Artifact, ArtifactLibraryItem, ArtifactMetadata, ArtifactType, ArtifactVersion } from '../types'

interface UseArtifactStorageResult {
  /** Whether the storage is loading */
  isLoading: boolean
  /** Current error if any */
  error: Error | null
  /** Save an artifact */
  save: (artifact: Artifact) => Promise<void>
  /** Load an artifact by ID */
  load: (id: string) => Promise<Artifact | null>
  /** Delete an artifact */
  remove: (id: string) => Promise<void>
  /** Update an artifact */
  update: (id: string, updates: Partial<Artifact>) => Promise<void>
  /** Get artifacts by conversation */
  getByConversation: (conversationId: string) => Promise<Artifact[]>
  /** Get artifacts by message */
  getByMessage: (messageId: string) => Promise<Artifact[]>
  /** Get saved artifacts for library */
  getSaved: () => Promise<ArtifactLibraryItem[]>
  /** Save a version of an artifact */
  saveVersion: (artifact: Artifact, refinementPrompt?: string) => Promise<ArtifactVersion>
  /** Get version history */
  getVersions: (artifactId: string) => Promise<ArtifactVersion[]>
  /** Create a new artifact from parsed data */
  create: (params: {
    identifier: string
    type: ArtifactType
    title: string
    content: string
    conversationId: string
    messageId: string
    metadata?: Partial<ArtifactMetadata>
  }) => Artifact
}

/**
 * Hook for managing artifact storage
 *
 * @returns Storage methods and state
 */
export function useArtifactStorage(): UseArtifactStorageResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Clear error after a delay
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [error])

  // Save artifact
  const save = useCallback(async (artifact: Artifact): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      await saveArtifact(artifact)
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load artifact
  const load = useCallback(async (id: string): Promise<Artifact | null> => {
    setIsLoading(true)
    setError(null)
    try {
      return await getArtifact(id)
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Delete artifact
  const remove = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      await deleteArtifactFromDb(id)
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Update artifact
  const update = useCallback(async (id: string, updates: Partial<Artifact>): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      await updateArtifact(id, updates)
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Get by conversation
  const getByConversation = useCallback(async (conversationId: string): Promise<Artifact[]> => {
    setIsLoading(true)
    setError(null)
    try {
      return await getArtifactsByConversation(conversationId)
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Get by message
  const getByMessage = useCallback(async (messageId: string): Promise<Artifact[]> => {
    setIsLoading(true)
    setError(null)
    try {
      return await getArtifactsByMessage(messageId)
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Get saved artifacts
  const getSaved = useCallback(async (): Promise<ArtifactLibraryItem[]> => {
    setIsLoading(true)
    setError(null)
    try {
      return await getSavedArtifacts()
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save version
  const saveVersionFn = useCallback(async (artifact: Artifact, refinementPrompt?: string): Promise<ArtifactVersion> => {
    setIsLoading(true)
    setError(null)
    try {
      const version = createArtifactVersion({
        artifactId: artifact.id,
        version: artifact.version,
        content: artifact.content,
        refinementPrompt,
        metadata: artifact.metadata
      })
      await saveArtifactVersion(version)
      return version
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Get versions
  const getVersions = useCallback(async (artifactId: string): Promise<ArtifactVersion[]> => {
    setIsLoading(true)
    setError(null)
    try {
      return await getArtifactVersions(artifactId)
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Create artifact
  const create = useCallback(createArtifactRecord, [])

  return {
    isLoading,
    error,
    save,
    load,
    remove,
    update,
    getByConversation,
    getByMessage,
    getSaved,
    saveVersion: saveVersionFn,
    getVersions,
    create
  }
}

export default useArtifactStorage
