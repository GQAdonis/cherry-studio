/**
 * Artifact Database Module
 *
 * Manages artifact persistence using Dexie.js (IndexedDB wrapper)
 * Provides CRUD operations for artifacts and their version history
 */

import { nanoid } from '@reduxjs/toolkit'
import { Dexie, type EntityTable } from 'dexie'

import {
  type Artifact,
  type ArtifactKind,
  type ArtifactLibraryItem,
  type ArtifactMetadata,
  type ArtifactReference,
  type ArtifactSchema,
  ArtifactStatus,
  type ArtifactType,
  type ArtifactVersion,
  DEFAULT_ARTIFACT_METADATA,
  type StoredArtifact
} from '../types'

/**
 * Artifact database record (stored in IndexedDB)
 * Extended to support PAS 4.1 fields
 */
export interface ArtifactRecord {
  id: string
  identifier: string
  type: ArtifactType
  kind?: ArtifactKind
  title: string
  content: string
  version: number
  conversationId: string
  messageId: string
  createdAt: string
  updatedAt: string
  saved: boolean
  starred: boolean
  tags: string[]
  metadata: ArtifactMetadata
  status: ArtifactStatus
  schema?: ArtifactSchema
  references?: ArtifactReference[]
  // Embedding support
  descriptionEmbedding?: number[]
  contentEmbedding?: number[]
  // Usage tracking
  usageCount: number
  lastUsedAt?: string
  // Version tracking
  previousVersionId?: string
  thumbnail?: string
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
 * Version 2 adds PAS 4.1 fields and embedding support
 */
class ArtifactDatabase extends Dexie {
  artifacts!: EntityTable<ArtifactRecord, 'id'>
  artifactVersions!: EntityTable<ArtifactVersionRecord, 'id'>

  constructor() {
    super('CherryStudioArtifacts', {
      chromeTransactionDurability: 'strict'
    })

    // Version 1: Original schema
    this.version(1).stores({
      artifacts: 'id, identifier, conversationId, messageId, type, saved, updatedAt, [conversationId+messageId]',
      artifactVersions: 'id, artifactId, version, [artifactId+version]'
    })

    // Version 2: PAS 4.1 support with embeddings and extended fields
    this.version(2)
      .stores({
        artifacts:
          'id, identifier, conversationId, messageId, type, kind, saved, starred, updatedAt, usageCount, *tags, [conversationId+messageId]',
        artifactVersions: 'id, artifactId, version, [artifactId+version]'
      })
      .upgrade((tx) => {
        // Migrate existing records to have new fields
        return tx
          .table('artifacts')
          .toCollection()
          .modify((artifact) => {
            if (artifact.starred === undefined) {
              artifact.starred = false
            }
            if (artifact.usageCount === undefined) {
              artifact.usageCount = 0
            }
          })
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
    kind: artifact.kind,
    title: artifact.title,
    content: artifact.content,
    version: artifact.version,
    conversationId: artifact.conversationId,
    messageId: artifact.messageId,
    createdAt: artifact.createdAt,
    updatedAt: artifact.updatedAt,
    saved: artifact.saved,
    starred: false, // Default to not starred
    tags: artifact.tags,
    metadata: artifact.metadata,
    status: artifact.status,
    schema: artifact.schema,
    references: artifact.references,
    usageCount: 0
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
export async function getArtifactByIdentifier(identifier: string, messageId: string): Promise<Artifact | null> {
  const db = getArtifactDb()
  const record = await db.artifacts.where({ identifier, messageId }).first()

  if (!record) return null

  return recordToArtifact(record)
}

/**
 * Get all artifacts for a conversation
 */
export async function getArtifactsByConversation(conversationId: string): Promise<Artifact[]> {
  const db = getArtifactDb()
  const records = await db.artifacts.where('conversationId').equals(conversationId).toArray()

  return records.map(recordToArtifact)
}

/**
 * Get all artifacts for a message
 */
export async function getArtifactsByMessage(messageId: string): Promise<Artifact[]> {
  const db = getArtifactDb()
  const records = await db.artifacts.where('messageId').equals(messageId).toArray()

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
    const versionCount = await db.artifactVersions.where('artifactId').equals(record.id).count()

    items.push({
      id: record.id,
      title: record.title,
      type: record.type,
      kind: record.kind,
      tags: record.tags,
      description: record.metadata?.description,
      updatedAt: record.updatedAt,
      versionCount: versionCount + 1, // +1 for current version
      starred: record.starred,
      usageCount: record.usageCount,
      thumbnail: record.thumbnail
    })
  }

  return items
}

/**
 * Get starred artifacts
 */
export async function getStarredArtifacts(): Promise<ArtifactLibraryItem[]> {
  const db = getArtifactDb()
  const records = await db.artifacts.where('starred').equals(1).reverse().sortBy('updatedAt')

  const items: ArtifactLibraryItem[] = []

  for (const record of records) {
    const versionCount = await db.artifactVersions.where('artifactId').equals(record.id).count()

    items.push({
      id: record.id,
      title: record.title,
      type: record.type,
      kind: record.kind,
      tags: record.tags,
      description: record.metadata?.description,
      updatedAt: record.updatedAt,
      versionCount: versionCount + 1,
      starred: record.starred,
      usageCount: record.usageCount,
      thumbnail: record.thumbnail
    })
  }

  return items
}

/**
 * Toggle starred status for an artifact
 */
export async function toggleArtifactStar(id: string): Promise<boolean> {
  const db = getArtifactDb()
  const record = await db.artifacts.get(id)

  if (!record) return false

  const newStarred = !record.starred
  await db.artifacts.update(id, { starred: newStarred })

  return newStarred
}

/**
 * Increment usage count for an artifact
 */
export async function incrementArtifactUsage(id: string): Promise<void> {
  const db = getArtifactDb()
  const record = await db.artifacts.get(id)

  if (record) {
    await db.artifacts.update(id, {
      usageCount: (record.usageCount || 0) + 1,
      lastUsedAt: new Date().toISOString()
    })
  }
}

/**
 * Save artifact with embedding
 */
export async function saveArtifactWithEmbedding(artifact: StoredArtifact): Promise<void> {
  const db = getArtifactDb()

  const record: ArtifactRecord = {
    id: artifact.id,
    identifier: artifact.identifier,
    type: artifact.type,
    kind: artifact.kind,
    title: artifact.title,
    content: artifact.content,
    version: artifact.version,
    conversationId: artifact.conversationId,
    messageId: artifact.messageId,
    createdAt: artifact.createdAt,
    updatedAt: artifact.updatedAt,
    saved: artifact.saved,
    starred: artifact.starred,
    tags: artifact.tags,
    metadata: artifact.metadata,
    status: artifact.status,
    schema: artifact.schema,
    references: artifact.references,
    descriptionEmbedding: artifact.descriptionEmbedding,
    contentEmbedding: artifact.contentEmbedding,
    usageCount: artifact.usageCount || 0,
    lastUsedAt: artifact.lastUsedAt,
    previousVersionId: artifact.previousVersionId,
    thumbnail: artifact.thumbnail
  }

  await db.artifacts.put(record)
}

/**
 * Search artifacts by description embedding similarity
 * Uses cosine similarity for vector search
 */
export async function searchArtifactsByEmbedding(
  queryEmbedding: number[],
  limit: number = 10
): Promise<ArtifactLibraryItem[]> {
  const db = getArtifactDb()
  const allRecords = await db.artifacts.where('saved').equals(1).toArray()

  // Calculate cosine similarity for each record with embeddings
  const scoredRecords = allRecords
    .filter((record) => record.descriptionEmbedding && record.descriptionEmbedding.length > 0)
    .map((record) => ({
      record,
      score: cosineSimilarity(queryEmbedding, record.descriptionEmbedding!)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  const items: ArtifactLibraryItem[] = []

  for (const { record } of scoredRecords) {
    const versionCount = await db.artifactVersions.where('artifactId').equals(record.id).count()

    items.push({
      id: record.id,
      title: record.title,
      type: record.type,
      kind: record.kind,
      tags: record.tags,
      description: record.metadata?.description,
      updatedAt: record.updatedAt,
      versionCount: versionCount + 1,
      starred: record.starred,
      usageCount: record.usageCount,
      thumbnail: record.thumbnail
    })
  }

  return items
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) return 0

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Update an artifact
 */
export async function updateArtifact(id: string, updates: Partial<Omit<Artifact, 'id' | 'createdAt'>>): Promise<void> {
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
  const records = await db.artifactVersions.where('artifactId').equals(artifactId).sortBy('version')

  return records.map(recordToVersion)
}

/**
 * Get a specific version of an artifact
 */
export async function getArtifactVersion(artifactId: string, version: number): Promise<ArtifactVersion | null> {
  const db = getArtifactDb()
  const record = await db.artifactVersions.where({ artifactId, version }).first()

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
    status: ArtifactStatus.COMPLETE
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
    kind: record.kind,
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
    status: record.status,
    schema: record.schema,
    references: record.references
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
