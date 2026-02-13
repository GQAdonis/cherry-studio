/**
 * Embedding-based skill matcher using the existing EmbeddingsFactory infrastructure.
 *
 * Pre-computes embedding vectors for each skill's description + example utterances,
 * then at query time embeds the user query and finds the closest skills via
 * cosine similarity. Supports OpenAI, Ollama, and VoyageAI embedding providers.
 */

import { loggerService } from '@logger'
import type { ApiClient, Skill, SkillMatchResult } from '@types'

import Embeddings from '../../knowledge/embedjs/embeddings/Embeddings'
import type { SkillMatchingProvider } from './SkillMatchingProvider'
import {
  type CachedSkillEmbedding,
  computeSkillContentHash,
  type EmbeddingCacheData,
  SkillEmbeddingCache
} from './utils/cache'
import { maxSimilarity } from './utils/cosine'

const logger = loggerService.withContext('EmbeddingSkillMatcher')

export interface EmbeddingSkillMatcherOptions {
  /** API client configuration for the embedding model */
  embedApiClient: ApiClient
  /** Embedding dimensions (optional, depends on model) */
  dimensions?: number
  /** Directory where skills are stored (for cache file location) */
  skillsDir: string
}

export class EmbeddingSkillMatcher implements SkillMatchingProvider {
  readonly name = 'embedding'

  private embeddings: Embeddings
  private cache: SkillEmbeddingCache
  private modelId: string
  private dimensions?: number

  /** In-memory map of skill ID -> cached embeddings */
  private skillEmbeddings = new Map<string, CachedSkillEmbedding>()

  constructor(options: EmbeddingSkillMatcherOptions) {
    this.embeddings = new Embeddings({
      embedApiClient: options.embedApiClient,
      dimensions: options.dimensions
    })
    this.cache = new SkillEmbeddingCache(options.skillsDir)
    this.modelId = `${options.embedApiClient.provider}/${options.embedApiClient.model}`
    this.dimensions = options.dimensions
  }

  async initialize(skills: Skill[]): Promise<void> {
    logger.info(`Initializing embedding matcher with model ${this.modelId}`)

    // Load cache from disk
    const cached = await this.cache.load(this.modelId)
    const entriesToCompute: Skill[] = []

    // Check which skills need (re)embedding
    for (const skill of skills) {
      const contentHash = computeSkillContentHash(skill)
      const cachedEntry = cached ? this.findCachedEntry(cached, skill.id, contentHash) : null

      if (cachedEntry) {
        this.skillEmbeddings.set(skill.id, cachedEntry)
      } else {
        entriesToCompute.push(skill)
      }
    }

    // Compute embeddings for new/changed skills
    if (entriesToCompute.length > 0) {
      logger.info(`Computing embeddings for ${entriesToCompute.length} skills`)
      await this.computeEmbeddings(entriesToCompute)
    }

    // Save updated cache
    await this.saveCache()

    logger.info(`Embedding matcher ready with ${this.skillEmbeddings.size} skill embeddings`)
  }

  async match(query: string, skills: Skill[], topK = 3): Promise<SkillMatchResult[]> {
    if (skills.length === 0) return []

    // Embed the query
    const queryEmbedding = await this.embeddings.embedQuery(query)

    // Score each skill
    const results: SkillMatchResult[] = []

    for (const skill of skills) {
      const cached = this.skillEmbeddings.get(skill.id)
      if (!cached) continue

      // Collect all embeddings for this skill (description + examples)
      const allEmbeddings = [cached.descriptionEmbedding, ...cached.exampleEmbeddings]

      // Use max similarity across all embeddings
      const score = maxSimilarity(queryEmbedding, allEmbeddings)

      results.push({ skill, score, method: this.name })
    }

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, topK)
  }

  async onSkillsChanged(skills: Skill[]): Promise<void> {
    // Determine which skills need re-embedding
    const toRecompute: Skill[] = []

    for (const skill of skills) {
      const contentHash = computeSkillContentHash(skill)
      const existing = this.skillEmbeddings.get(skill.id)

      if (!existing || existing.contentHash !== contentHash) {
        toRecompute.push(skill)
      }
    }

    // Remove embeddings for deleted skills
    const currentIds = new Set(skills.map((s) => s.id))
    for (const id of this.skillEmbeddings.keys()) {
      if (!currentIds.has(id)) {
        this.skillEmbeddings.delete(id)
      }
    }

    if (toRecompute.length > 0) {
      logger.info(`Re-computing embeddings for ${toRecompute.length} changed skills`)
      await this.computeEmbeddings(toRecompute)
      await this.saveCache()
    }
  }

  async dispose(): Promise<void> {
    this.skillEmbeddings.clear()
  }

  /**
   * Compute and store embeddings for a list of skills.
   */
  private async computeEmbeddings(skills: Skill[]): Promise<void> {
    for (const skill of skills) {
      try {
        const contentHash = computeSkillContentHash(skill)

        // Embed the description
        const descriptionText = `${skill.name}: ${skill.description}`
        const descriptionEmbedding = await this.embeddings.embedQuery(descriptionText)

        // Embed each example utterance
        const exampleEmbeddings: number[][] = []
        if (skill.examples && skill.examples.length > 0) {
          const examples = await this.embeddings.embedDocuments(skill.examples)
          exampleEmbeddings.push(...examples)
        }

        this.skillEmbeddings.set(skill.id, {
          skillId: skill.id,
          contentHash,
          descriptionEmbedding,
          exampleEmbeddings
        })
      } catch (error) {
        logger.error(`Failed to compute embeddings for skill ${skill.id}`, error as Error)
      }
    }
  }

  /**
   * Save the current in-memory embeddings to disk cache.
   */
  private async saveCache(): Promise<void> {
    const dims = this.dimensions || (this.skillEmbeddings.size > 0 ? this.getFirstEmbeddingDim() : 0)

    const data: EmbeddingCacheData = {
      version: 1,
      modelId: this.modelId,
      dimensions: dims,
      entries: Array.from(this.skillEmbeddings.values()),
      updatedAt: new Date().toISOString()
    }

    await this.cache.save(data)
  }

  private findCachedEntry(
    cache: EmbeddingCacheData,
    skillId: string,
    contentHash: string
  ): CachedSkillEmbedding | null {
    const entry = cache.entries.find((e) => e.skillId === skillId)
    if (!entry) return null
    if (entry.contentHash !== contentHash) return null
    return entry
  }

  private getFirstEmbeddingDim(): number {
    for (const entry of this.skillEmbeddings.values()) {
      if (entry.descriptionEmbedding.length > 0) {
        return entry.descriptionEmbedding.length
      }
    }
    return 0
  }
}
