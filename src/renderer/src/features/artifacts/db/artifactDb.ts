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
  type ArtifactDiagnosticSnapshot,
  type ArtifactKind,
  type ArtifactLibraryItem,
  type ArtifactMetadata,
  type ArtifactProject,
  type ArtifactProjectContextEnvelope,
  type ArtifactProjectContextOverridePolicy,
  type ArtifactProjectCreatedFrom,
  type ArtifactProjectStatus,
  type ArtifactReference,
  type ArtifactRefinementIntent,
  type ArtifactRuntimeProfile,
  type ArtifactSchema,
  type ArtifactSelection,
  ArtifactStatus,
  type ArtifactStudioSession,
  type ArtifactType,
  type ArtifactVersion,
  DEFAULT_ARTIFACT_METADATA,
  type RefinementMessage,
  type StoredArtifact
} from '../types'
import { deserializeContextEnvelope, serializeContextEnvelope } from '../utils/projectContext'

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
  artifactProjectId?: string
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
  chatSnapshot?: RefinementMessage[]
  parentVersionId?: string
  branchId?: string
  summary?: string
  intent?: ArtifactRefinementIntent
  diagnostics?: ArtifactDiagnosticSnapshot[]
}

export interface ArtifactProjectRecord {
  id: string
  title: string
  artifactType: ArtifactType
  source: 'chat' | 'library' | 'template' | 'standalone' | 'scratch'
  conversationId?: string
  messageId?: string
  artifactId?: string
  runtimeProfile: ArtifactRuntimeProfile
  createdAt: string
  updatedAt: string
  lastViewMode: 'preview' | 'code' | 'split'
  lastArtifactVersion: number
  status?: ArtifactProjectStatus
  createdFrom?: ArtifactProjectCreatedFrom
  contextEnvelope?: ArtifactProjectContextEnvelope
  overridePolicy?: ArtifactProjectContextOverridePolicy
  lastRunSummary?: string
  rootArtifactId?: string
  headArtifactId?: string
  forkedFromProjectId?: string
  forkedFromArtifactId?: string
  forkedFromVersionId?: string
  preferredOutputType?: 'react' | 'htmx' | 'a2ui'
}

export interface ArtifactStudioSessionRecord {
  id: string
  projectId: string
  artifactId: string
  viewMode: 'preview' | 'code' | 'split'
  content: string
  revisionPointer: number
  refinementMessages?: RefinementMessage[]
  versionHistory?: ArtifactVersion[]
  currentVersionIndex?: number
  activeIntent?: ArtifactRefinementIntent
  selection?: ArtifactSelection
  diagnostics?: ArtifactDiagnosticSnapshot[]
  updatedAt: string
}

/**
 * Artifact database instance
 * Version 2 adds PAS 4.1 fields and embedding support
 */
class ArtifactDatabase extends Dexie {
  artifacts!: EntityTable<ArtifactRecord, 'id'>
  artifactVersions!: EntityTable<ArtifactVersionRecord, 'id'>
  artifactProjects!: EntityTable<ArtifactProjectRecord, 'id'>
  artifactStudioSessions!: EntityTable<ArtifactStudioSessionRecord, 'id'>

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

    // Version 3: Standalone studio projects/sessions
    this.version(3).stores({
      artifacts:
        'id, identifier, conversationId, messageId, type, kind, saved, starred, updatedAt, usageCount, *tags, [conversationId+messageId]',
      artifactVersions: 'id, artifactId, version, [artifactId+version]',
      artifactProjects: 'id, updatedAt, source, artifactType, artifactId',
      artifactStudioSessions: 'id, projectId, artifactId, updatedAt'
    })

    // Version 4: project context envelope + lifecycle metadata
    this.version(4)
      .stores({
        artifacts:
          'id, identifier, conversationId, messageId, type, kind, saved, starred, updatedAt, usageCount, *tags, [conversationId+messageId]',
        artifactVersions: 'id, artifactId, version, [artifactId+version]',
        artifactProjects: 'id, updatedAt, source, artifactType, artifactId, status, createdFrom',
        artifactStudioSessions: 'id, projectId, artifactId, updatedAt'
      })
      .upgrade((tx) => {
        return tx
          .table('artifactProjects')
          .toCollection()
          .modify((project: ArtifactProjectRecord) => {
            if (!project.status) {
              project.status = 'active'
            }
            if (!project.createdFrom) {
              project.createdFrom = 'legacy'
            }
            if (!project.contextEnvelope) {
              project.contextEnvelope = {
                source: {
                  sourceType: 'unknown',
                  conversationId: project.conversationId,
                  messageId: project.messageId,
                  capturedAt: new Date().toISOString()
                }
              }
            }
          })
      })

    // Version 5: durable studio session chat + version navigation snapshots
    this.version(5)
      .stores({
        artifacts:
          'id, identifier, conversationId, messageId, type, kind, saved, starred, updatedAt, usageCount, *tags, [conversationId+messageId]',
        artifactVersions: 'id, artifactId, version, [artifactId+version]',
        artifactProjects: 'id, updatedAt, source, artifactType, artifactId, status, createdFrom',
        artifactStudioSessions: 'id, projectId, artifactId, updatedAt'
      })
      .upgrade((tx) => {
        return tx
          .table('artifactStudioSessions')
          .toCollection()
          .modify((session: ArtifactStudioSessionRecord) => {
            if (!Array.isArray(session.refinementMessages)) {
              session.refinementMessages = []
            }
            if (!Array.isArray(session.versionHistory)) {
              session.versionHistory = []
            }
            if (typeof session.currentVersionIndex !== 'number') {
              session.currentVersionIndex = -1
            }
          })
      })

    // Version 6: revision lineage, fork metadata, and scoped refinement diagnostics
    this.version(6)
      .stores({
        artifacts:
          'id, identifier, conversationId, messageId, type, kind, saved, starred, updatedAt, usageCount, *tags, [conversationId+messageId]',
        artifactVersions: 'id, artifactId, version, branchId, intent, [artifactId+version]',
        artifactProjects:
          'id, updatedAt, source, artifactType, artifactId, headArtifactId, status, createdFrom, preferredOutputType',
        artifactStudioSessions: 'id, projectId, artifactId, activeIntent, updatedAt'
      })
      .upgrade((tx) => {
        return Promise.all([
          tx
            .table('artifactProjects')
            .toCollection()
            .modify((project: ArtifactProjectRecord) => {
              if (!project.rootArtifactId) {
                project.rootArtifactId = project.artifactId
              }
              if (!project.headArtifactId) {
                project.headArtifactId = project.artifactId
              }
              if (!project.preferredOutputType) {
                project.preferredOutputType =
                  project.artifactType === 'htmx' ? 'htmx' : project.artifactType === 'a2ui' ? 'a2ui' : 'react'
              }
            }),
          tx
            .table('artifactStudioSessions')
            .toCollection()
            .modify((session: ArtifactStudioSessionRecord) => {
              if (!session.activeIntent) {
                session.activeIntent = 'extend'
              }
              if (!Array.isArray(session.diagnostics)) {
                session.diagnostics = []
              }
            }),
          tx
            .table('artifactVersions')
            .toCollection()
            .modify((version: ArtifactVersionRecord) => {
              if (!version.intent) {
                version.intent = 'extend'
              }
              if (!Array.isArray(version.diagnostics)) {
                version.diagnostics = []
              }
            })
        ])
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
    artifactProjectId: artifact.artifactProjectId || artifact.metadata?.artifactProjectId,
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
    artifactProjectId: artifact.artifactProjectId || artifact.metadata?.artifactProjectId,
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
    artifactProjectId: updates.artifactProjectId || updates.metadata?.artifactProjectId,
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
    metadata: version.metadata,
    chatSnapshot: version.chatSnapshot,
    parentVersionId: version.parentVersionId,
    branchId: version.branchId,
    summary: version.summary,
    intent: version.intent,
    diagnostics: version.diagnostics
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
  artifactProjectId?: string
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
    artifactProjectId: params.artifactProjectId || params.metadata?.artifactProjectId,
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
  chatSnapshot?: RefinementMessage[]
  parentVersionId?: string
  branchId?: string
  summary?: string
  intent?: ArtifactRefinementIntent
  diagnostics?: ArtifactDiagnosticSnapshot[]
}): ArtifactVersion {
  return {
    id: nanoid(),
    artifactId: params.artifactId,
    version: params.version,
    content: params.content,
    createdAt: new Date().toISOString(),
    refinementPrompt: params.refinementPrompt,
    metadata: params.metadata,
    chatSnapshot: params.chatSnapshot,
    parentVersionId: params.parentVersionId,
    branchId: params.branchId,
    summary: params.summary,
    intent: params.intent,
    diagnostics: params.diagnostics
  }
}

/**
 * Clear all artifact data (for testing/reset)
 */
export async function clearAllArtifacts(): Promise<void> {
  const db = getArtifactDb()
  await db.transaction(
    'rw',
    [db.artifacts, db.artifactVersions, db.artifactProjects, db.artifactStudioSessions],
    async () => {
      await db.artifacts.clear()
      await db.artifactVersions.clear()
      await db.artifactProjects.clear()
      await db.artifactStudioSessions.clear()
    }
  )
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

export async function saveArtifactProject(project: ArtifactProject): Promise<void> {
  const db = getArtifactDb()
  await db.artifactProjects.put({
    ...project,
    source: project.source === 'scratch' ? 'scratch' : project.source,
    status: project.status || 'active',
    createdFrom: project.createdFrom || 'legacy',
    contextEnvelope: serializeContextEnvelope(project.contextEnvelope),
    overridePolicy: project.overridePolicy,
    lastRunSummary: project.lastRunSummary,
    rootArtifactId: project.rootArtifactId || project.artifactId,
    headArtifactId: project.headArtifactId || project.artifactId,
    forkedFromProjectId: project.forkedFromProjectId,
    forkedFromArtifactId: project.forkedFromArtifactId,
    forkedFromVersionId: project.forkedFromVersionId,
    preferredOutputType:
      project.preferredOutputType ||
      (project.artifactType === 'htmx' ? 'htmx' : project.artifactType === 'a2ui' ? 'a2ui' : 'react'),
    updatedAt: new Date().toISOString()
  })
}

export async function getArtifactProject(projectId: string): Promise<ArtifactProject | null> {
  const db = getArtifactDb()
  const project = await db.artifactProjects.get(projectId)
  if (!project) {
    return null
  }
  return projectRecordToProject(project)
}

export async function getArtifactProjects(limit: number = 100): Promise<ArtifactProject[]> {
  const db = getArtifactDb()
  const records = await db.artifactProjects.orderBy('updatedAt').reverse().limit(limit).toArray()
  return records.map(projectRecordToProject)
}

export async function updateArtifactProject(
  projectId: string,
  updates: Partial<ArtifactProject>
): Promise<ArtifactProject | null> {
  const db = getArtifactDb()
  const current = await db.artifactProjects.get(projectId)
  if (!current) {
    return null
  }

  const next: ArtifactProjectRecord = {
    ...current,
    ...updates,
    source: (updates.source as ArtifactProjectRecord['source']) || current.source,
    status: updates.status || current.status,
    createdFrom: updates.createdFrom || current.createdFrom,
    contextEnvelope: updates.contextEnvelope
      ? serializeContextEnvelope(updates.contextEnvelope)
      : current.contextEnvelope,
    overridePolicy: updates.overridePolicy || current.overridePolicy,
    rootArtifactId: updates.rootArtifactId || current.rootArtifactId,
    headArtifactId: updates.headArtifactId || current.headArtifactId,
    forkedFromProjectId: updates.forkedFromProjectId || current.forkedFromProjectId,
    forkedFromArtifactId: updates.forkedFromArtifactId || current.forkedFromArtifactId,
    forkedFromVersionId: updates.forkedFromVersionId || current.forkedFromVersionId,
    preferredOutputType: updates.preferredOutputType || current.preferredOutputType,
    updatedAt: new Date().toISOString()
  }

  await db.artifactProjects.put(next)
  return projectRecordToProject(next)
}

export async function setArtifactProjectArchived(
  projectId: string,
  archived: boolean
): Promise<ArtifactProject | null> {
  return updateArtifactProject(projectId, {
    status: archived ? 'archived' : 'active'
  })
}

export async function cloneArtifactProject(sourceProjectId: string, title?: string): Promise<ArtifactProject | null> {
  const source = await getArtifactProject(sourceProjectId)
  if (!source) {
    return null
  }

  const db = getArtifactDb()
  const now = new Date().toISOString()
  const id = `studio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  return db.transaction(
    'rw',
    [db.artifacts, db.artifactVersions, db.artifactProjects, db.artifactStudioSessions],
    async () => {
      const sourceArtifact = source.artifactId ? await getArtifact(source.artifactId) : null
      const sourceVersions = source.artifactId ? await getArtifactVersions(source.artifactId) : []
      const sourceSession = await getArtifactStudioSession(sourceProjectId)

      let clonedArtifactId = source.artifactId
      if (sourceArtifact) {
        clonedArtifactId = nanoid()
        const clonedArtifact: Artifact = {
          ...sourceArtifact,
          id: clonedArtifactId,
          title: title || `${sourceArtifact.title} Copy`,
          updatedAt: now,
          artifactProjectId: id,
          metadata: {
            ...sourceArtifact.metadata,
            artifactProjectId: id,
            provenance: {
              ...sourceArtifact.metadata.provenance,
              sourceArtifactId: sourceArtifact.id,
              sourceProjectId: sourceProjectId,
              forkedFromArtifactId: sourceArtifact.id,
              forkedFromVersionId: sourceVersions.at(-1)?.id,
              forkedAt: now,
              timestamp: now
            }
          }
        }
        await saveArtifact(clonedArtifact)

        for (const version of sourceVersions) {
          await saveArtifactVersion({
            ...version,
            id: nanoid(),
            artifactId: clonedArtifactId,
            parentVersionId: version.parentVersionId,
            diagnostics: version.diagnostics || [],
            intent: version.intent || 'extend'
          })
        }
      }

      const cloned: ArtifactProject = {
        ...source,
        id,
        title: title || `${source.title} Copy`,
        artifactId: clonedArtifactId,
        headArtifactId: clonedArtifactId,
        rootArtifactId: source.rootArtifactId || source.artifactId || clonedArtifactId,
        forkedFromProjectId: source.id,
        forkedFromArtifactId: source.artifactId,
        forkedFromVersionId: sourceVersions.at(-1)?.id,
        status: 'active',
        createdFrom: source.createdFrom || 'legacy',
        createdAt: now,
        updatedAt: now
      }
      await saveArtifactProject(cloned)

      if (sourceSession && clonedArtifactId) {
        await upsertArtifactStudioSession({
          ...sourceSession,
          id: `session-${id}`,
          projectId: id,
          artifactId: clonedArtifactId,
          versionHistory: (sourceSession.versionHistory || []).map((version) => ({
            ...version,
            id: nanoid(),
            artifactId: clonedArtifactId
          })),
          updatedAt: now
        })
      }

      return cloned
    }
  )
}

export async function upsertArtifactStudioSession(session: ArtifactStudioSession): Promise<void> {
  const db = getArtifactDb()
  await db.artifactStudioSessions.put({
    ...session,
    refinementMessages: session.refinementMessages || [],
    versionHistory: session.versionHistory || [],
    currentVersionIndex: session.currentVersionIndex ?? -1,
    activeIntent: session.activeIntent || 'extend',
    selection: session.selection,
    diagnostics: session.diagnostics || [],
    updatedAt: new Date().toISOString()
  })
}

export async function getArtifactStudioSession(projectId: string): Promise<ArtifactStudioSession | null> {
  const db = getArtifactDb()
  const record = await db.artifactStudioSessions.where('projectId').equals(projectId).last()
  if (!record) {
    return null
  }
  return studioSessionRecordToSession(record)
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
    artifactProjectId: record.artifactProjectId,
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
    metadata: record.metadata,
    chatSnapshot: record.chatSnapshot,
    parentVersionId: record.parentVersionId,
    branchId: record.branchId,
    summary: record.summary,
    intent: record.intent,
    diagnostics: record.diagnostics
  }
}

function projectRecordToProject(record: ArtifactProjectRecord): ArtifactProject {
  return {
    id: record.id,
    title: record.title,
    artifactType: record.artifactType,
    source: record.source,
    conversationId: record.conversationId,
    messageId: record.messageId,
    artifactId: record.artifactId,
    runtimeProfile: record.runtimeProfile,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastViewMode: record.lastViewMode,
    lastArtifactVersion: record.lastArtifactVersion,
    status: record.status || 'active',
    createdFrom: record.createdFrom || 'legacy',
    contextEnvelope: deserializeContextEnvelope(record.contextEnvelope),
    overridePolicy: record.overridePolicy,
    lastRunSummary: record.lastRunSummary,
    rootArtifactId: record.rootArtifactId,
    headArtifactId: record.headArtifactId,
    forkedFromProjectId: record.forkedFromProjectId,
    forkedFromArtifactId: record.forkedFromArtifactId,
    forkedFromVersionId: record.forkedFromVersionId,
    preferredOutputType: record.preferredOutputType
  }
}

function studioSessionRecordToSession(record: ArtifactStudioSessionRecord): ArtifactStudioSession {
  return {
    id: record.id,
    projectId: record.projectId,
    artifactId: record.artifactId,
    viewMode: record.viewMode,
    content: record.content,
    revisionPointer: record.revisionPointer,
    refinementMessages: record.refinementMessages || [],
    versionHistory: record.versionHistory || [],
    currentVersionIndex: record.currentVersionIndex ?? -1,
    activeIntent: record.activeIntent || 'extend',
    selection: record.selection,
    diagnostics: record.diagnostics || [],
    updatedAt: record.updatedAt
  }
}

export default getArtifactDb
