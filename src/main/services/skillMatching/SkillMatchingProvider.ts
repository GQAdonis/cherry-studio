import type { Skill, SkillMatchResult } from '@types'

/**
 * Abstract interface for skill matching providers.
 *
 * Implementations use different algorithms to determine which skills
 * are most relevant to a given user query, avoiding the need to inject
 * all enabled skills into every request.
 */
export interface SkillMatchingProvider {
  /** Human-readable name of the matching strategy */
  readonly name: string

  /**
   * Initialize the provider with the current set of skills.
   * Called once at startup and whenever the skill set changes.
   * Implementations should pre-compute any indices (embeddings, TF-IDF, etc.).
   */
  initialize(skills: Skill[]): Promise<void>

  /**
   * Match a user query against available skills and return the top-K results.
   *
   * @param query - The user's message / query text
   * @param skills - The pool of enabled skills to match against
   * @param topK - Maximum number of results to return (default: 3)
   * @returns Sorted array of matches with scores, highest first
   */
  match(query: string, skills: Skill[], topK?: number): Promise<SkillMatchResult[]>

  /**
   * Notification that the skill set has changed (added/removed/updated).
   * Implementations should re-index as needed.
   */
  onSkillsChanged?(skills: Skill[]): Promise<void>

  /**
   * Clean up resources (models, caches, connections).
   */
  dispose?(): Promise<void>
}
