/**
 * Keyword-based skill matcher using regex trigger patterns and TF-IDF keyword overlap.
 *
 * This is the fastest matcher (sub-millisecond) with zero external dependencies.
 * Best used as a fast-path in the hybrid matcher for obvious matches.
 */

import { loggerService } from '@logger'
import type { Skill, SkillMatchResult } from '@types'

import type { SkillMatchingProvider } from './SkillMatchingProvider'

const logger = loggerService.withContext('KeywordSkillMatcher')

/** Stop words to exclude from TF-IDF computation */
const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'shall',
  'can',
  'to',
  'of',
  'in',
  'for',
  'on',
  'with',
  'at',
  'by',
  'from',
  'as',
  'into',
  'about',
  'like',
  'through',
  'after',
  'over',
  'between',
  'out',
  'against',
  'during',
  'without',
  'before',
  'under',
  'around',
  'among',
  'and',
  'but',
  'or',
  'nor',
  'not',
  'so',
  'yet',
  'both',
  'either',
  'neither',
  'each',
  'every',
  'all',
  'any',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'only',
  'own',
  'same',
  'than',
  'too',
  'very',
  'just',
  'because',
  'if',
  'when',
  'while',
  'where',
  'how',
  'what',
  'which',
  'who',
  'whom',
  'this',
  'that',
  'these',
  'those',
  'i',
  'me',
  'my',
  'myself',
  'we',
  'our',
  'ours',
  'you',
  'your',
  'yours',
  'he',
  'him',
  'his',
  'she',
  'her',
  'hers',
  'it',
  'its',
  'they',
  'them',
  'their',
  'theirs',
  'up',
  'down',
  'then',
  'once',
  'here',
  'there',
  'also',
  'please',
  'help',
  'want',
  'need',
  'get',
  'make',
  'let',
  'know'
])

/**
 * Tokenize a string into lowercase words, filtering stop words.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
}

/**
 * Build a term frequency map for a list of tokens.
 */
function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1)
  }
  // Normalize by total token count
  const total = tokens.length || 1
  for (const [term, count] of tf) {
    tf.set(term, count / total)
  }
  return tf
}

interface SkillIndex {
  compiledPatterns: RegExp[]
  keywords: Map<string, number> // term -> TF value
  allTerms: Set<string>
}

export class KeywordSkillMatcher implements SkillMatchingProvider {
  readonly name = 'keyword'

  private skillIndices = new Map<string, SkillIndex>()
  /** IDF values computed across all skill documents */
  private idf = new Map<string, number>()

  async initialize(skills: Skill[]): Promise<void> {
    this.buildIndex(skills)
    logger.info(`Initialized keyword matcher with ${skills.length} skills`)
  }

  async match(query: string, skills: Skill[], topK = 3): Promise<SkillMatchResult[]> {
    const results: SkillMatchResult[] = []

    for (const skill of skills) {
      const score = this.scoreSkill(query, skill)
      if (score > 0) {
        results.push({ skill, score: Math.min(score, 1), method: this.name })
      }
    }

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, topK)
  }

  async onSkillsChanged(skills: Skill[]): Promise<void> {
    this.buildIndex(skills)
  }

  async dispose(): Promise<void> {
    this.skillIndices.clear()
    this.idf.clear()
  }

  /**
   * Score a skill against a query using:
   * 1. Regex trigger patterns (high confidence if matched)
   * 2. TF-IDF keyword overlap
   */
  private scoreSkill(query: string, skill: Skill): number {
    const index = this.skillIndices.get(skill.id)
    if (!index) return 0

    // Phase 1: Check regex trigger patterns (fast-path, high confidence)
    const queryLower = query.toLowerCase()
    for (const pattern of index.compiledPatterns) {
      if (pattern.test(queryLower)) {
        return 0.95 // High confidence for explicit pattern match
      }
    }

    // Phase 2: TF-IDF cosine similarity between query and skill document
    const queryTokens = tokenize(query)
    if (queryTokens.length === 0) return 0

    const queryTf = termFrequency(queryTokens)

    // Compute TF-IDF dot product (cosine similarity in TF-IDF space)
    let dotProduct = 0
    let queryNorm = 0
    let skillNorm = 0

    const allTerms = new Set([...queryTf.keys(), ...index.keywords.keys()])

    for (const term of allTerms) {
      const idfVal = this.idf.get(term) || 0
      const queryTfIdf = (queryTf.get(term) || 0) * idfVal
      const skillTfIdf = (index.keywords.get(term) || 0) * idfVal

      dotProduct += queryTfIdf * skillTfIdf
      queryNorm += queryTfIdf * queryTfIdf
      skillNorm += skillTfIdf * skillTfIdf
    }

    const denom = Math.sqrt(queryNorm) * Math.sqrt(skillNorm)
    if (denom === 0) return 0

    // Scale TF-IDF similarity to a 0-0.8 range (below trigger pattern confidence)
    return (dotProduct / denom) * 0.8
  }

  /**
   * Build the keyword index for all skills and compute IDF values.
   */
  private buildIndex(skills: Skill[]): void {
    this.skillIndices.clear()
    this.idf.clear()

    // Collect all documents for IDF computation
    const documentTermSets: Set<string>[] = []

    for (const skill of skills) {
      // Compile regex trigger patterns
      const compiledPatterns: RegExp[] = []
      if (skill.triggerPatterns) {
        for (const pattern of skill.triggerPatterns) {
          try {
            compiledPatterns.push(new RegExp(pattern, 'i'))
          } catch {
            logger.warn(`Invalid trigger pattern for skill ${skill.id}: ${pattern}`)
          }
        }
      }

      // Build term frequency from skill's matchable content
      const contentParts = [skill.name, skill.description, ...(skill.examples || []), ...(skill.tags || [])]
      const tokens = tokenize(contentParts.join(' '))
      const keywords = termFrequency(tokens)
      const allTerms = new Set(tokens)

      this.skillIndices.set(skill.id, { compiledPatterns, keywords, allTerms })
      documentTermSets.push(allTerms)
    }

    // Compute IDF across all skill documents
    const numDocs = documentTermSets.length || 1
    const allUniqueTerms = new Set<string>()
    for (const termSet of documentTermSets) {
      for (const term of termSet) {
        allUniqueTerms.add(term)
      }
    }

    for (const term of allUniqueTerms) {
      const docCount = documentTermSets.filter((s) => s.has(term)).length
      // Standard IDF formula: log(N / df)
      this.idf.set(term, Math.log(numDocs / (docCount || 1)))
    }
  }
}
