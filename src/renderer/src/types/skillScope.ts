export type SkillAvailabilityMode = 'inherit' | 'all' | 'selected' | 'none'

export type ScopedSkillMatchingStrategy = 'none' | 'keyword' | 'embedding' | 'local-embedding' | 'llm' | 'hybrid'

export interface SkillScopeConfig {
  /**
   * Availability policy for this scope.
   * - inherit: defer to parent scope
   * - all: all discovered skills are available
   * - selected: only selectedSkillIds are available
   * - none: no skills available
   */
  mode: SkillAvailabilityMode
  /**
   * Selected skills when mode = selected
   */
  selectedSkillIds?: string[]
  /**
   * Optional override for intent classification strategy at this scope.
   * Undefined means inherit global strategy.
   */
  strategy?: ScopedSkillMatchingStrategy
}
