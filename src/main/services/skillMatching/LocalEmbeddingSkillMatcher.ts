/**
 * Local embedding-based skill matcher using @huggingface/transformers.
 *
 * Runs the all-MiniLM-L6-v2 model (or similar) entirely locally via ONNX Runtime.
 * No API calls, no network, no cost. ~23MB model, 384 dimensions, ~100ms per query.
 *
 * Falls back gracefully if @huggingface/transformers is not installed.
 */

import { loggerService } from '@logger'
import type { Skill, SkillMatchResult } from '@types'

import type { SkillMatchingProvider } from './SkillMatchingProvider'
import {
  type CachedSkillEmbedding,
  computeSkillContentHash,
  type EmbeddingCacheData,
  SkillEmbeddingCache
} from './utils/cache'
import { maxSimilarity } from './utils/cosine'

const logger = loggerService.withContext('LocalEmbeddingSkillMatcher')

const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2'

export interface LocalEmbeddingSkillMatcherOptions {
  /** HuggingFace model ID (default: Xenova/all-MiniLM-L6-v2) */
  modelId?: string
  /** Directory where skills are stored (for cache file location) */
  skillsDir: string
}

/**
 * Wrapper around the feature-extraction pipeline from @huggingface/transformers.
 * Lazily loaded to avoid startup costs and to gracefully handle missing dependency.
 */
class LocalEmbedder {
  private pipeline: any = null
  private modelId: string

  constructor(modelId: string) {
    this.modelId = modelId
  }

  async init(): Promise<void> {
    try {
      // Dynamic import to avoid hard dependency
      // @ts-expect-error - @huggingface/transformers is an optional peer dependency
      const { pipeline } = await import('@huggingface/transformers')
      this.pipeline = await pipeline('feature-extraction', this.modelId, {
        dtype: 'fp32'
      })
      logger.info(`Local embedding model loaded: ${this.modelId}`)
    } catch (error) {
      logger.error(`Failed to load local embedding model ${this.modelId}`, error as Error)
      throw new Error(
        `Failed to load @huggingface/transformers model "${this.modelId}". ` +
          'Ensure @huggingface/transformers is installed: pnpm add @huggingface/transformers'
      )
    }
  }

  async embed(text: string): Promise<number[]> {
    if (!this.pipeline) {
      throw new Error('Local embedder not initialized. Call init() first.')
    }
    const output = await this.pipeline(text, { pooling: 'mean', normalize: true })
    return Array.from(output.data as Float32Array)
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = []
    // Process sequentially to avoid memory pressure in Electron
    for (const text of texts) {
      results.push(await this.embed(text))
    }
    return results
  }

  dispose(): void {
    this.pipeline = null
  }
}

export class LocalEmbeddingSkillMatcher implements SkillMatchingProvider {
  readonly name = 'local-embedding'

  private embedder: LocalEmbedder
  private cache: SkillEmbeddingCache
  private modelId: string

  /** In-memory map of skill ID -> cached embeddings */
  private skillEmbeddings = new Map<string, CachedSkillEmbedding>()

  constructor(options: LocalEmbeddingSkillMatcherOptions) {
    this.modelId = options.modelId || DEFAULT_MODEL
    this.embedder = new LocalEmbedder(this.modelId)
    this.cache = new SkillEmbeddingCache(options.skillsDir)
  }

  async initialize(skills: Skill[]): Promise<void> {
    logger.info(`Initializing local embedding matcher with model ${this.modelId}`)

    // Initialize the local model
    await this.embedder.init()

    // Load cache from disk
    const cached = await this.cache.load(this.modelId)
    const entriesToCompute: Skill[] = []

    for (const skill of skills) {
      const contentHash = computeSkillContentHash(skill)
      const cachedEntry = cached ? this.findCachedEntry(cached, skill.id, contentHash) : null

      if (cachedEntry) {
        this.skillEmbeddings.set(skill.id, cachedEntry)
      } else {
        entriesToCompute.push(skill)
      }
    }

    if (entriesToCompute.length > 0) {
      logger.info(`Computing local embeddings for ${entriesToCompute.length} skills`)
      await this.computeEmbeddings(entriesToCompute)
    }

    await this.saveCache()
    logger.info(`Local embedding matcher ready with ${this.skillEmbeddings.size} skill embeddings`)
  }

  async match(query: string, skills: Skill[], topK = 3): Promise<SkillMatchResult[]> {
    if (skills.length === 0) return []

    const queryEmbedding = await this.embedder.embed(query)

    const results: SkillMatchResult[] = []

    for (const skill of skills) {
      const cached = this.skillEmbeddings.get(skill.id)
      if (!cached) continue

      const allEmbeddings = [cached.descriptionEmbedding, ...cached.exampleEmbeddings]
      const score = maxSimilarity(queryEmbedding, allEmbeddings)

      results.push({ skill, score, method: this.name })
    }

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, topK)
  }

  async onSkillsChanged(skills: Skill[]): Promise<void> {
    const toRecompute: Skill[] = []

    for (const skill of skills) {
      const contentHash = computeSkillContentHash(skill)
      const existing = this.skillEmbeddings.get(skill.id)

      if (!existing || existing.contentHash !== contentHash) {
        toRecompute.push(skill)
      }
    }

    // Remove deleted skills
    const currentIds = new Set(skills.map((s) => s.id))
    for (const id of this.skillEmbeddings.keys()) {
      if (!currentIds.has(id)) {
        this.skillEmbeddings.delete(id)
      }
    }

    if (toRecompute.length > 0) {
      logger.info(`Re-computing local embeddings for ${toRecompute.length} changed skills`)
      await this.computeEmbeddings(toRecompute)
      await this.saveCache()
    }
  }

  async dispose(): Promise<void> {
    this.embedder.dispose()
    this.skillEmbeddings.clear()
  }

  private async computeEmbeddings(skills: Skill[]): Promise<void> {
    for (const skill of skills) {
      try {
        const contentHash = computeSkillContentHash(skill)

        const descriptionText = `${skill.name}: ${skill.description}`
        const descriptionEmbedding = await this.embedder.embed(descriptionText)

        const exampleEmbeddings: number[][] = []
        if (skill.examples && skill.examples.length > 0) {
          const embeddings = await this.embedder.embedBatch(skill.examples)
          exampleEmbeddings.push(...embeddings)
        }

        this.skillEmbeddings.set(skill.id, {
          skillId: skill.id,
          contentHash,
          descriptionEmbedding,
          exampleEmbeddings
        })
      } catch (error) {
        logger.error(`Failed to compute local embeddings for skill ${skill.id}`, error as Error)
      }
    }
  }

  private async saveCache(): Promise<void> {
    const dims = this.skillEmbeddings.size > 0 ? this.getFirstEmbeddingDim() : 384

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
    if (!entry || entry.contentHash !== contentHash) return null
    return entry
  }

  private getFirstEmbeddingDim(): number {
    for (const entry of this.skillEmbeddings.values()) {
      if (entry.descriptionEmbedding.length > 0) {
        return entry.descriptionEmbedding.length
      }
    }
    return 384
  }
}
