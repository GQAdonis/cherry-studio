/**
 * Hybrid skill matcher that composes multiple matching strategies in tiers.
 *
 * Tier 1: Fast local matching (keyword or embedding-based)
 *   - If the top match score exceeds a confidence threshold, return immediately
 *
 * Tier 2: LLM fallback
 *   - If Tier 1 confidence is low, use LLM structured output for high-accuracy classification
 *
 * This provides the best balance of speed, accuracy, and cost:
 *   - ~70-80% of queries are handled in <100ms by Tier 1
 *   - Remaining ~20-30% get near-perfect accuracy via the LLM
 */

import { loggerService } from '@logger'
import type { Skill, SkillMatchResult } from '@types'

import type { SkillMatchingProvider } from './SkillMatchingProvider'

const logger = loggerService.withContext('HybridSkillMatcher')

export interface HybridSkillMatcherOptions {
  /** Primary (fast) matcher - typically embedding-based or keyword */
  primaryMatcher: SkillMatchingProvider
  /** Fallback matcher - typically LLM-based, used when primary confidence is low */
  fallbackMatcher?: SkillMatchingProvider
  /** Minimum score from the primary matcher to accept without fallback (default: 0.7) */
  confidenceThreshold?: number
}

export class HybridSkillMatcher implements SkillMatchingProvider {
  readonly name = 'hybrid'

  private primary: SkillMatchingProvider
  private fallback: SkillMatchingProvider | undefined
  private confidenceThreshold: number

  constructor(options: HybridSkillMatcherOptions) {
    this.primary = options.primaryMatcher
    this.fallback = options.fallbackMatcher
    this.confidenceThreshold = options.confidenceThreshold ?? 0.7
  }

  async initialize(skills: Skill[]): Promise<void> {
    logger.info(
      `Initializing hybrid matcher: primary=${this.primary.name}, ` +
        `fallback=${this.fallback?.name ?? 'none'}, threshold=${this.confidenceThreshold}`
    )

    await this.primary.initialize(skills)
    if (this.fallback) {
      await this.fallback.initialize(skills)
    }
  }

  async match(query: string, skills: Skill[], topK = 3): Promise<SkillMatchResult[]> {
    if (skills.length === 0) return []

    // Tier 1: Try the primary (fast) matcher
    const primaryResults = await this.primary.match(query, skills, topK)

    // Check if the top result exceeds our confidence threshold
    const topScore = primaryResults.length > 0 ? primaryResults[0].score : 0

    if (topScore >= this.confidenceThreshold) {
      logger.info(
        `Hybrid: primary matcher (${this.primary.name}) confident enough ` +
          `(score=${topScore.toFixed(3)} >= threshold=${this.confidenceThreshold})`
      )
      return primaryResults
    }

    // Tier 2: Fall back to the more accurate (but slower) matcher
    if (this.fallback) {
      logger.info(
        `Hybrid: primary confidence too low (score=${topScore.toFixed(3)}), ` + `falling back to ${this.fallback.name}`
      )

      try {
        const fallbackResults = await this.fallback.match(query, skills, topK)

        if (fallbackResults.length > 0) {
          return fallbackResults
        }
      } catch (error) {
        logger.error(`Hybrid: fallback matcher (${this.fallback.name}) failed`, error as Error)
      }
    }

    // If fallback also returned nothing or failed, return primary results (if any)
    return primaryResults
  }

  async onSkillsChanged(skills: Skill[]): Promise<void> {
    await this.primary.onSkillsChanged?.(skills)
    if (this.fallback) {
      await this.fallback.onSkillsChanged?.(skills)
    }
  }

  async dispose(): Promise<void> {
    await this.primary.dispose?.()
    if (this.fallback) {
      await this.fallback.dispose?.()
    }
  }
}
