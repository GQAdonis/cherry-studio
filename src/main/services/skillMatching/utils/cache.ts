/**
 * Embedding cache management for skill matching.
 *
 * Caches pre-computed skill embeddings to disk so they don't need to be
 * re-computed on every application start. Invalidation is hash-based:
 * if a skill's content changes, its embedding is recomputed.
 */

import { loggerService } from '@logger'
import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

const logger = loggerService.withContext('SkillEmbeddingCache')

/**
 * A cached embedding entry for a single skill.
 */
export interface CachedSkillEmbedding {
  skillId: string
  /** Hash of the skill's matchable content (description + examples + instructions) */
  contentHash: string
  /** Pre-computed embeddings for the skill's description */
  descriptionEmbedding: number[]
  /** Pre-computed embeddings for each example utterance */
  exampleEmbeddings: number[][]
}

/**
 * The on-disk cache format.
 */
export interface EmbeddingCacheData {
  version: number
  /** Identifier for the embedding model used */
  modelId: string
  /** Embedding dimensionality */
  dimensions: number
  entries: CachedSkillEmbedding[]
  updatedAt: string
}

const CACHE_VERSION = 1

/**
 * Compute a content hash for a skill's matchable fields.
 * Used to detect when a skill's content has changed and needs re-embedding.
 */
export function computeSkillContentHash(skill: {
  description: string
  examples?: string[]
  instructions: string
}): string {
  const content = [skill.description, ...(skill.examples || []), skill.instructions].join('\n---\n')

  return createHash('sha256').update(content).digest('hex').slice(0, 16)
}

/**
 * Manages the on-disk embedding cache for skills.
 */
export class SkillEmbeddingCache {
  private cachePath: string
  private data: EmbeddingCacheData | null = null

  constructor(skillsDir: string) {
    this.cachePath = path.join(skillsDir, '.embeddings-cache.json')
  }

  /**
   * Load the cache from disk. Returns null if the cache doesn't exist
   * or is corrupted/incompatible.
   */
  async load(expectedModelId: string): Promise<EmbeddingCacheData | null> {
    try {
      const raw = await fs.readFile(this.cachePath, 'utf-8')
      const parsed = JSON.parse(raw) as EmbeddingCacheData

      if (parsed.version !== CACHE_VERSION) {
        logger.info('Cache version mismatch, will rebuild')
        return null
      }

      if (parsed.modelId !== expectedModelId) {
        logger.info(`Cache model mismatch (cached: ${parsed.modelId}, expected: ${expectedModelId}), will rebuild`)
        return null
      }

      this.data = parsed
      return parsed
    } catch {
      // File doesn't exist or is invalid
      return null
    }
  }

  /**
   * Save the cache to disk.
   */
  async save(data: EmbeddingCacheData): Promise<void> {
    this.data = data
    try {
      const dir = path.dirname(this.cachePath)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(this.cachePath, JSON.stringify(data, null, 2), 'utf-8')
      logger.info(`Saved embedding cache with ${data.entries.length} entries`)
    } catch (error) {
      logger.error('Failed to save embedding cache', error as Error)
    }
  }

  /**
   * Look up a cached embedding by skill ID and content hash.
   * Returns the cached entry if the content hasn't changed, null otherwise.
   */
  getCachedEntry(skillId: string, contentHash: string): CachedSkillEmbedding | null {
    if (!this.data) return null
    const entry = this.data.entries.find((e) => e.skillId === skillId)
    if (!entry) return null
    if (entry.contentHash !== contentHash) return null
    return entry
  }

  /**
   * Invalidate the entire cache (e.g., when the embedding model changes).
   */
  async invalidate(): Promise<void> {
    this.data = null
    try {
      await fs.unlink(this.cachePath)
      logger.info('Embedding cache invalidated')
    } catch {
      // File may not exist, that's fine
    }
  }

  /**
   * Get the path to the cache file (for testing / inspection).
   */
  getCachePath(): string {
    return this.cachePath
  }
}
