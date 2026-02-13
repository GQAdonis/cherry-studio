/**
 * Skill Matching Provider - Factory and exports.
 *
 * Provides a unified factory to create skill matching providers
 * based on the user's configuration.
 */

import { loggerService } from '@logger'
import type { SkillMatchingConfig } from '@types'
import type { LanguageModel } from 'ai'

import { EmbeddingSkillMatcher, type EmbeddingSkillMatcherOptions } from './EmbeddingSkillMatcher'
import { HybridSkillMatcher } from './HybridSkillMatcher'
import { KeywordSkillMatcher } from './KeywordSkillMatcher'
import { LLMSkillMatcher, type LLMSkillMatcherOptions } from './LLMSkillMatcher'
import { LocalEmbeddingSkillMatcher, type LocalEmbeddingSkillMatcherOptions } from './LocalEmbeddingSkillMatcher'
import type { SkillMatchingProvider } from './SkillMatchingProvider'

const logger = loggerService.withContext('SkillMatchingFactory')

export interface SkillMatchingFactoryOptions {
  /** The matching configuration from user settings */
  config: SkillMatchingConfig
  /** Directory where skills are stored */
  skillsDir: string
  /**
   * Function to resolve an LLM LanguageModel instance for the LLM / hybrid matchers.
   * Only required when strategy is 'llm' or 'hybrid'.
   */
  getModel?: () => Promise<LanguageModel>
}

/**
 * Create a SkillMatchingProvider based on the user's configuration.
 *
 * @returns A configured SkillMatchingProvider, or null if strategy is 'none'.
 */
export function createSkillMatchingProvider(options: SkillMatchingFactoryOptions): SkillMatchingProvider | null {
  const { config, skillsDir } = options

  switch (config.strategy) {
    case 'none':
      logger.info('Skill matching disabled (strategy: none)')
      return null

    case 'keyword':
      logger.info('Creating keyword skill matcher')
      return new KeywordSkillMatcher()

    case 'embedding': {
      if (!config.embeddingApiClient) {
        logger.warn('Embedding strategy selected but no embedding API client configured, falling back to keyword')
        return new KeywordSkillMatcher()
      }
      logger.info('Creating API-based embedding skill matcher')
      const embeddingOptions: EmbeddingSkillMatcherOptions = {
        embedApiClient: config.embeddingApiClient,
        skillsDir
      }
      return new EmbeddingSkillMatcher(embeddingOptions)
    }

    case 'local-embedding': {
      logger.info('Creating local embedding skill matcher')
      const localOptions: LocalEmbeddingSkillMatcherOptions = {
        skillsDir
      }
      return new LocalEmbeddingSkillMatcher(localOptions)
    }

    case 'llm': {
      if (!options.getModel) {
        logger.warn('LLM strategy selected but no model resolver provided, falling back to keyword')
        return new KeywordSkillMatcher()
      }
      logger.info('Creating LLM skill matcher')
      const llmOptions: LLMSkillMatcherOptions = {
        getModel: options.getModel,
        maxResults: config.maxMatched
      }
      return new LLMSkillMatcher(llmOptions)
    }

    case 'hybrid': {
      logger.info('Creating hybrid skill matcher')

      // Primary: use embedding-based matcher if configured, otherwise keyword
      let primaryMatcher: SkillMatchingProvider
      if (config.embeddingApiClient) {
        primaryMatcher = new EmbeddingSkillMatcher({
          embedApiClient: config.embeddingApiClient,
          skillsDir
        })
      } else {
        primaryMatcher = new KeywordSkillMatcher()
      }

      // Fallback: use LLM if available
      let fallbackMatcher: SkillMatchingProvider | undefined
      if (options.getModel) {
        fallbackMatcher = new LLMSkillMatcher({
          getModel: options.getModel,
          maxResults: config.maxMatched
        })
      }

      return new HybridSkillMatcher({
        primaryMatcher,
        fallbackMatcher,
        confidenceThreshold: config.threshold
      })
    }

    default: {
      const _exhaustive: never = config.strategy
      logger.warn(`Unknown skill matching strategy: ${_exhaustive}, disabled`)
      return null
    }
  }
}

/**
 * Default skill matching configuration.
 */
export const DEFAULT_SKILL_MATCHING_CONFIG: SkillMatchingConfig = {
  strategy: 'none',
  threshold: 0.5,
  maxMatched: 3,
  minSkillsForMatching: 3
}

// Re-export types and implementations
export { EmbeddingSkillMatcher } from './EmbeddingSkillMatcher'
export { HybridSkillMatcher } from './HybridSkillMatcher'
export { KeywordSkillMatcher } from './KeywordSkillMatcher'
export { LLMSkillMatcher } from './LLMSkillMatcher'
export { LocalEmbeddingSkillMatcher } from './LocalEmbeddingSkillMatcher'
export type { SkillMatchingProvider } from './SkillMatchingProvider'
