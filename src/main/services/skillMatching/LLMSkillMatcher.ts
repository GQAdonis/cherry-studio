/**
 * LLM-based skill matcher using Vercel AI SDK's generateObject().
 *
 * Uses structured output with a Zod schema to classify user queries
 * into the most relevant skills. Most accurate approach but requires
 * an API call per classification (latency + token cost).
 */

import { loggerService } from '@logger'
import type { Skill, SkillMatchResult } from '@types'
import type { LanguageModel } from 'ai'
import { generateObject } from 'ai'
import * as z from 'zod'

import type { SkillMatchingProvider } from './SkillMatchingProvider'

const logger = loggerService.withContext('LLMSkillMatcher')

export interface LLMSkillMatcherOptions {
  /**
   * Function to resolve a LanguageModel instance for classification.
   * This allows the caller to provide any configured model from the
   * existing provider registry without coupling to specific providers.
   */
  getModel: () => Promise<LanguageModel>
  /** Maximum number of skills to return */
  maxResults?: number
}

/**
 * Build the classification schema dynamically from the available skills.
 */
function buildClassificationSchema(_skills: Skill[]) {
  return z.object({
    matches: z.array(
      z.object({
        skillId: z.string().describe('The ID of the matched skill'),
        confidence: z.number().min(0).max(1).describe('Confidence score from 0 to 1'),
        reasoning: z.string().describe('Brief explanation of why this skill was matched')
      })
    )
  })
}

/**
 * Build the system prompt for classification.
 */
function buildClassificationPrompt(skills: Skill[]): string {
  const skillDescriptions = skills
    .map((s) => {
      const parts = [`- ID: "${s.id}" | Name: "${s.name}" | Description: "${s.description}"`]
      if (s.tags && s.tags.length > 0) {
        parts.push(`  Tags: ${s.tags.join(', ')}`)
      }
      if (s.examples && s.examples.length > 0) {
        parts.push(`  Example queries: ${s.examples.map((e) => `"${e}"`).join(', ')}`)
      }
      return parts.join('\n')
    })
    .join('\n')

  return [
    'You are a skill classification system. Given a user query, determine which of the available skills are most relevant.',
    'Return only the skills that are clearly relevant to the query. If no skill is relevant, return an empty matches array.',
    'Order matches by relevance (most relevant first) and assign confidence scores.',
    '',
    'Available skills:',
    skillDescriptions,
    '',
    'Rules:',
    '- Only match skills that are genuinely relevant to the query',
    '- Assign confidence 0.9+ for strong matches, 0.7-0.9 for moderate, 0.5-0.7 for weak',
    '- Do not force a match if no skill is relevant',
    '- Consider skill descriptions, tags, and example queries when matching'
  ].join('\n')
}

export class LLMSkillMatcher implements SkillMatchingProvider {
  readonly name = 'llm'

  private getModel: () => Promise<LanguageModel>
  private maxResults: number

  constructor(options: LLMSkillMatcherOptions) {
    this.getModel = options.getModel
    this.maxResults = options.maxResults || 3
  }

  async initialize(_skills: Skill[]): Promise<void> {
    logger.info('LLM skill matcher initialized')
  }

  async match(query: string, skills: Skill[], topK?: number): Promise<SkillMatchResult[]> {
    if (skills.length === 0) return []

    const k = topK ?? this.maxResults

    try {
      const model = await this.getModel()
      const schema = buildClassificationSchema(skills)
      const systemPrompt = buildClassificationPrompt(skills)

      const { object } = await generateObject({
        model,
        schema,
        system: systemPrompt,
        prompt: `Classify this user query: "${query}"`,
        temperature: 0.1 // Low temperature for deterministic classification
      })

      // Map results back to Skill objects
      const results: SkillMatchResult[] = []
      const skillMap = new Map(skills.map((s) => [s.id, s]))

      for (const match of object.matches) {
        const skill = skillMap.get(match.skillId)
        if (skill) {
          results.push({
            skill,
            score: match.confidence,
            method: this.name
          })
        }
      }

      // Sort by score descending and limit to topK
      results.sort((a, b) => b.score - a.score)
      return results.slice(0, k)
    } catch (error) {
      logger.error('LLM skill classification failed', error as Error)
      // Return empty results on failure (caller should fall back)
      return []
    }
  }

  async onSkillsChanged(_skills: Skill[]): Promise<void> {
    // No pre-computation needed for LLM-based matching
  }

  async dispose(): Promise<void> {
    // Nothing to clean up
  }
}
