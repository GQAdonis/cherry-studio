/**
 * Artifact Database Module
 *
 * Manages artifact persistence using Dexie.js (IndexedDB wrapper)
 * Provides CRUD operations for artifacts and their version history
 */

import { nanoid } from '@reduxjs/toolkit'
import { Dexie, type EntityTable } from 'dexie'

import type {
  Artifact,
  ArtifactLibraryItem,
  ArtifactMetadata,
  ArtifactStatus,
  ArtifactType,
  ArtifactVersion
} from '../types'
import { DEFAULT_ARTIFACT_METADATA } from '../types'

/**
 * Artifact database record (stored in IndexedDB)
 */
export interface ArtifactRecord {
  id: string
  identifier: string
  type: ArtifactType
  title: string
  content: string
  version: number
  conversationId: string
  messageId: string
  createdAt: string
  updatedAt: string
  saved: boolean
  tags: string[]
  metadata: ArtifactMetadata
  status: ArtifactStatus
}

/**
 * Artifact version record (stored in IndexedDB)
 */
export interface ArtifactVersionRecord {
  id: string
  artifactId: string
  version: number
  content: string
  createdAt: string
  refinementPrompt?: string
  metadata?: Partial<ArtifactMetadata>
}

/**
 * Artifact database instance
 */
class ArtifactDatabase extends Dexie {
  artifacts!: EntityTable<ArtifactRecord, 'id'>
  artifactVersions!: EntityTable<ArtifactVersionRecord, 'id'>

  constructor() {
    super('CherryStudioArtifacts', {
      chromeTransactionDurability: 'strict'
    })

    this.version(1).stores({
      artifacts: 'id, identifier, conversationId, messageId, type, saved, updatedAt, [conversationId+messageId]',
      artifactVersions: 'id, artifactId, version, [artifactId+version]'
    })
  }
}

// Singleton instance
let dbInstance: ArtifactDatabase | null = null

/**
 * Get the artifact database instance
 */
export function getArtifactDb(): ArtifactDatabase {
  if (!dbInstance) {
    dbInstance = new ArtifactDatabase()
  }
  return dbInstance
}

/**
 * Save an artifact to the database
 */
export async function saveArtifact(artifact: Artifact): Promise<void> {
  const db = getArtifactDb()

  const record: ArtifactRecord = {
    id: artifact.id,
    identifier: artifact.identifier,
    type: artifact.type,
    title: artifact.title,
    content: artifact.content,
    version: artifact.version,
    conversationId: artifact.conversationId,
    messageId: artifact.messageId,
    createdAt: artifact.createdAt,
    updatedAt: artifact.updatedAt,
    saved: artifact.saved,
    tags: artifact.tags,
    metadata: artifact.metadata,
    status: artifact.status
  }

  await db.artifacts.put(record)
}

/**
 * Get an artifact by ID
 */
export async function getArtifact(id: string): Promise<Artifact | null> {
  const db = getArtifactDb()
  const record = await db.artifacts.get(id)

  if (!record) return null

  return recordToArtifact(record)
}

/**
 * Get an artifact by identifier and message ID
 */
export async function getArtifactByIdentifier(
  identifier: string,
  messageId: string
): Promise<Artifact | null> {
  const db = getArtifactDb()
  const record = await db.artifacts
    .where({ identifier, messageId })
    .first()

  if (!record) return null

  return recordToArtifact(record)
}

/**
 * Get all artifacts for a conversation
 */
export async function getArtifactsByConversation(conversationId: string): Promise<Artifact[]> {
  const db = getArtifactDb()
  const records = await db.artifacts
    .where('conversationId')
    .equals(conversationId)
    .toArray()

  return records.map(recordToArtifact)
}

/**
 * Get all artifacts for a message
 */
export async function getArtifactsByMessage(messageId: string): Promise<Artifact[]> {
  const db = getArtifactDb()
  const records = await db.artifacts
    .where('messageId')
    .equals(messageId)
    .toArray()

  return records.map(recordToArtifact)
}

/**
 * Get all saved artifacts
 */
export async function getSavedArtifacts(): Promise<ArtifactLibraryItem[]> {
  const db = getArtifactDb()
  const records = await db.artifacts
    .where('saved')
    .equals(1) // Dexie uses 1 for true in indexes
    .reverse()
    .sortBy('updatedAt')

  const items: ArtifactLibraryItem[] = []

  for (const record of records) {
    const versionCount = await db.artifactVersions
      .where('artifactId')
      .equals(record.id)
      .count()

    items.push({
      id: record.id,
      title: record.title,
      type: record.type,
      tags: record.tags,
      updatedAt: record.updatedAt,
      versionCount: versionCount + 1 // +1 for current version
    })
  }

  return items
}

/**
 * Update an artifact
 */
export async function updateArtifact(
  id: string,
  updates: Partial<Omit<Artifact, 'id' | 'createdAt'>>
): Promise<void> {
  const db = getArtifactDb()

  await db.artifacts.update(id, {
    ...updates,
    updatedAt: new Date().toISOString()
  })
}

/**
 * Delete an artifact and its versions
 */
export async function deleteArtifact(id: string): Promise<void> {
  const db = getArtifactDb()

  await db.transaction('rw', [db.artifacts, db.artifactVersions], async () => {
    await db.artifactVersions.where('artifactId').equals(id).delete()
    await db.artifacts.delete(id)
  })
}

/**
 * Save a version of an artifact
 */
export async function saveArtifactVersion(version: ArtifactVersion): Promise<void> {
  const db = getArtifactDb()

  const record: ArtifactVersionRecord = {
    id: version.id,
    artifactId: version.artifactId,
    version: version.version,
    content: version.content,
    createdAt: version.createdAt,
    refinementPrompt: version.refinementPrompt,
    metadata: version.metadata
  }

  await db.artifactVersions.put(record)
}

/**
 * Get version history for an artifact
 */
export async function getArtifactVersions(artifactId: string): Promise<ArtifactVersion[]> {
  const db = getArtifactDb()
  const records = await db.artifactVersions
    .where('artifactId')
    .equals(artifactId)
    .sortBy('version')

  return records.map(recordToVersion)
}

/**
 * Get a specific version of an artifact
 */
export async function getArtifactVersion(
  artifactId: string,
  version: number
): Promise<ArtifactVersion | null> {
  const db = getArtifactDb()
  const record = await db.artifactVersions
    .where({ artifactId, version })
    .first()

  if (!record) return null

  return recordToVersion(record)
}

/**
 * Create a new artifact from parsed data
 */
export function createArtifact(params: {
  identifier: string
  type: ArtifactType
  title: string
  content: string
  conversationId: string
  messageId: string
  metadata?: Partial<ArtifactMetadata>
}): Artifact {
  const now = new Date().toISOString()

  return {
    id: nanoid(),
    identifier: params.identifier,
    type: params.type,
    title: params.title,
    content: params.content,
    version: 1,
    conversationId: params.conversationId,
    messageId: params.messageId,
    createdAt: now,
    updatedAt: now,
    saved: false,
    tags: [],
    metadata: {
      ...DEFAULT_ARTIFACT_METADATA,
      ...params.metadata
    },
    status: 'complete' as ArtifactStatus
  }
}

/**
 * Create a new version entry
 */
export function createArtifactVersion(params: {
  artifactId: string
  version: number
  content: string
  refinementPrompt?: string
  metadata?: Partial<ArtifactMetadata>
}): ArtifactVersion {
  return {
    id: nanoid(),
    artifactId: params.artifactId,
    version: params.version,
    content: params.content,
    createdAt: new Date().toISOString(),
    refinementPrompt: params.refinementPrompt,
    metadata: params.metadata
  }
}

/**
 * Clear all artifact data (for testing/reset)
 */
export async function clearAllArtifacts(): Promise<void> {
  const db = getArtifactDb()
  await db.transaction('rw', [db.artifacts, db.artifactVersions], async () => {
    await db.artifacts.clear()
    await db.artifactVersions.clear()
  })
}

/**
 * Get database statistics
 */
export async function getArtifactStats(): Promise<{
  totalArtifacts: number
  savedArtifacts: number
  totalVersions: number
}> {
  const db = getArtifactDb()

  const [totalArtifacts, savedArtifacts, totalVersions] = await Promise.all([
    db.artifacts.count(),
    db.artifacts.where('saved').equals(1).count(),
    db.artifactVersions.count()
  ])

  return {
    totalArtifacts,
    savedArtifacts,
    totalVersions
  }
}

// Helper functions

function recordToArtifact(record: ArtifactRecord): Artifact {
  return {
    id: record.id,
    identifier: record.identifier,
    type: record.type,
    title: record.title,
    content: record.content,
    version: record.version,
    conversationId: record.conversationId,
    messageId: record.messageId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    saved: record.saved,
    tags: record.tags,
    metadata: record.metadata,
    status: record.status
  }
}

function recordToVersion(record: ArtifactVersionRecord): ArtifactVersion {
  return {
    id: record.id,
    artifactId: record.artifactId,
    version: record.version,
    content: record.content,
    createdAt: record.createdAt,
    refinementPrompt: record.refinementPrompt,
    metadata: record.metadata
  }
}

export default getArtifactDb

