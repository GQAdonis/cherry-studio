import type { Skill, SkillMatchResult } from '@types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock logger
vi.mock('@logger', () => ({
  loggerService: {
    withContext: vi.fn().mockReturnValue({
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn()
    })
  }
}))

// Mock Electron
vi.mock('electron', () => ({
  app: { getPath: vi.fn().mockReturnValue('/tmp/test-user-data') },
  dialog: { showMessageBox: vi.fn() },
  net: { fetch: vi.fn() }
}))

// Mock config manager
vi.mock('@main/services/ConfigManager', () => ({
  configManager: { get: vi.fn(), set: vi.fn() }
}))

// Mock child_process
vi.mock('child_process', () => ({ spawn: vi.fn() }))

// =============================================================================
// Test utilities
// =============================================================================

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: 'test-skill',
    name: 'Test Skill',
    description: 'A test skill for unit testing',
    path: '/tmp/skills/test-skill',
    instructions: 'You are a test skill.',
    tools: [],
    enabled: true,
    examples: [],
    tags: [],
    triggerPatterns: [],
    ...overrides
  }
}

// =============================================================================
// Cosine utility tests
// =============================================================================

describe('cosine utilities', () => {
  // Dynamic import to avoid hoisting issues with mocks
  let cosine: typeof import('../services/skillMatching/utils/cosine')

  beforeEach(async () => {
    cosine = await import('../services/skillMatching/utils/cosine')
  })

  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      expect(cosine.cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1)
    })

    it('should return 0 for orthogonal vectors', () => {
      expect(cosine.cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
    })

    it('should return -1 for opposite vectors', () => {
      expect(cosine.cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1)
    })

    it('should handle normalized vectors', () => {
      const a = [0.6, 0.8]
      const b = [0.8, 0.6]
      const result = cosine.cosineSimilarity(a, b)
      expect(result).toBeGreaterThan(0.9)
      expect(result).toBeLessThan(1)
    })

    it('should return 0 for zero vectors', () => {
      expect(cosine.cosineSimilarity([0, 0], [1, 1])).toBe(0)
    })

    it('should throw for dimension mismatch', () => {
      expect(() => cosine.cosineSimilarity([1, 2], [1, 2, 3])).toThrow('dimension mismatch')
    })

    it('should return 0 for empty vectors', () => {
      expect(cosine.cosineSimilarity([], [])).toBe(0)
    })
  })

  describe('meanVector', () => {
    it('should compute mean of vectors', () => {
      const result = cosine.meanVector([
        [2, 4],
        [4, 8]
      ])
      expect(result).toEqual([3, 6])
    })

    it('should return empty for no vectors', () => {
      expect(cosine.meanVector([])).toEqual([])
    })

    it('should return the vector itself for single vector', () => {
      expect(cosine.meanVector([[1, 2, 3]])).toEqual([1, 2, 3])
    })
  })

  describe('normalizeVector', () => {
    it('should produce unit length vector', () => {
      const result = cosine.normalizeVector([3, 4])
      const magnitude = Math.sqrt(result[0] ** 2 + result[1] ** 2)
      expect(magnitude).toBeCloseTo(1)
    })

    it('should handle zero vector', () => {
      expect(cosine.normalizeVector([0, 0])).toEqual([0, 0])
    })
  })

  describe('maxSimilarity', () => {
    it('should return max similarity across candidates', () => {
      const query = [1, 0]
      const candidates = [
        [0, 1], // orthogonal
        [0.9, 0.1], // very similar
        [-1, 0] // opposite
      ]
      const result = cosine.maxSimilarity(query, candidates)
      expect(result).toBeGreaterThan(0.9)
    })

    it('should return 0 for empty candidates', () => {
      expect(cosine.maxSimilarity([1, 0], [])).toBe(0)
    })
  })

  describe('avgSimilarity', () => {
    it('should return average similarity', () => {
      const query = [1, 0]
      const candidates = [
        [1, 0], // sim = 1
        [0, 1] // sim = 0
      ]
      const result = cosine.avgSimilarity(query, candidates)
      expect(result).toBeCloseTo(0.5)
    })

    it('should return 0 for empty candidates', () => {
      expect(cosine.avgSimilarity([1, 0], [])).toBe(0)
    })
  })

  describe('topK', () => {
    it('should return top-K items sorted by score', () => {
      const items = [1, 5, 3, 7, 2]
      const result = cosine.topK(items, (x) => x, 3)
      expect(result.map((r) => r.item)).toEqual([7, 5, 3])
    })

    it('should handle K larger than array', () => {
      const items = [1, 2]
      const result = cosine.topK(items, (x) => x, 5)
      expect(result).toHaveLength(2)
    })
  })
})

// =============================================================================
// Embedding cache tests
// =============================================================================

describe('SkillEmbeddingCache', () => {
  let cache: typeof import('../services/skillMatching/utils/cache')

  beforeEach(async () => {
    cache = await import('../services/skillMatching/utils/cache')
  })

  describe('computeSkillContentHash', () => {
    it('should produce consistent hashes for same content', () => {
      const skill = { description: 'test', examples: ['a', 'b'], instructions: 'do stuff' }
      const hash1 = cache.computeSkillContentHash(skill)
      const hash2 = cache.computeSkillContentHash(skill)
      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different content', () => {
      const skill1 = { description: 'test', examples: ['a'], instructions: 'do stuff' }
      const skill2 = { description: 'test changed', examples: ['a'], instructions: 'do stuff' }
      expect(cache.computeSkillContentHash(skill1)).not.toBe(cache.computeSkillContentHash(skill2))
    })

    it('should handle missing examples', () => {
      const skill = { description: 'test', instructions: 'do stuff' }
      const hash = cache.computeSkillContentHash(skill)
      expect(hash).toBeTruthy()
      expect(hash.length).toBe(16)
    })
  })
})

// =============================================================================
// KeywordSkillMatcher tests
// =============================================================================

describe('KeywordSkillMatcher', () => {
  let KeywordSkillMatcher: typeof import('../services/skillMatching/KeywordSkillMatcher').KeywordSkillMatcher

  beforeEach(async () => {
    const mod = await import('../services/skillMatching/KeywordSkillMatcher')
    KeywordSkillMatcher = mod.KeywordSkillMatcher
  })

  it('should have name "keyword"', async () => {
    const matcher = new KeywordSkillMatcher()
    expect(matcher.name).toBe('keyword')
  })

  it('should match skills by trigger patterns', async () => {
    const matcher = new KeywordSkillMatcher()

    const skills = [
      makeSkill({
        id: 'code-review',
        name: 'Code Review',
        description: 'Reviews code for bugs and issues',
        triggerPatterns: ['review.*code', 'code.*review']
      }),
      makeSkill({
        id: 'web-search',
        name: 'Web Search',
        description: 'Searches the web',
        triggerPatterns: ['search.*web', 'look.*up']
      })
    ]

    await matcher.initialize(skills)

    const results = await matcher.match('please review this code', skills)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].skill.id).toBe('code-review')
    expect(results[0].score).toBe(0.95) // Trigger pattern match
  })

  it('should match skills by keyword overlap (TF-IDF)', async () => {
    const matcher = new KeywordSkillMatcher()

    const skills = [
      makeSkill({
        id: 'python-helper',
        name: 'Python Helper',
        description: 'Helps write Python code and scripts',
        examples: ['write python script', 'python function', 'python class']
      }),
      makeSkill({
        id: 'math-solver',
        name: 'Math Solver',
        description: 'Solves mathematical equations and problems',
        examples: ['solve equation', 'calculate integral', 'math problem']
      })
    ]

    await matcher.initialize(skills)

    const results = await matcher.match('write a python script to sort a list', skills)
    expect(results.length).toBeGreaterThan(0)
    // Python helper should rank higher due to keyword overlap
    expect(results[0].skill.id).toBe('python-helper')
  })

  it('should return empty results for unrelated queries', async () => {
    const matcher = new KeywordSkillMatcher()

    const skills = [
      makeSkill({
        id: 'cooking',
        name: 'Cooking',
        description: 'Recipes and cooking instructions',
        tags: ['food', 'cooking']
      })
    ]

    await matcher.initialize(skills)

    const results = await matcher.match('explain quantum physics', skills)
    // Score should be very low or zero due to no keyword overlap
    const highScoringResults = results.filter((r) => r.score > 0.3)
    expect(highScoringResults.length).toBe(0)
  })

  it('should handle skill with invalid trigger pattern gracefully', async () => {
    const matcher = new KeywordSkillMatcher()

    const skills = [
      makeSkill({
        id: 'broken',
        name: 'Broken Skill',
        description: 'Has invalid regex',
        triggerPatterns: ['[invalid(regex']
      })
    ]

    // Should not throw
    await matcher.initialize(skills)
    const results = await matcher.match('test query', skills)
    expect(Array.isArray(results)).toBe(true)
  })

  it('should respect topK parameter', async () => {
    const matcher = new KeywordSkillMatcher()

    const skills = Array.from({ length: 10 }, (_, i) =>
      makeSkill({
        id: `skill-${i}`,
        name: `Skill ${i}`,
        description: `Skill number ${i} for testing`,
        triggerPatterns: [`skill.*${i}`]
      })
    )

    await matcher.initialize(skills)

    const results = await matcher.match('skill 5', skills, 2)
    expect(results.length).toBeLessThanOrEqual(2)
  })

  it('should re-index on skills changed', async () => {
    const matcher = new KeywordSkillMatcher()

    const skills = [
      makeSkill({
        id: 'initial',
        name: 'Initial',
        description: 'Initial skill',
        triggerPatterns: ['initial']
      })
    ]

    await matcher.initialize(skills)

    const newSkills = [
      makeSkill({
        id: 'updated',
        name: 'Updated',
        description: 'Updated skill',
        triggerPatterns: ['updated']
      })
    ]

    await matcher.onSkillsChanged(newSkills)

    const results = await matcher.match('updated', newSkills)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].skill.id).toBe('updated')
  })
})

// =============================================================================
// HybridSkillMatcher tests
// =============================================================================

describe('HybridSkillMatcher', () => {
  let HybridSkillMatcher: typeof import('../services/skillMatching/HybridSkillMatcher').HybridSkillMatcher

  beforeEach(async () => {
    const mod = await import('../services/skillMatching/HybridSkillMatcher')
    HybridSkillMatcher = mod.HybridSkillMatcher
  })

  it('should use primary results when confidence is high', async () => {
    const primary: any = {
      name: 'mock-primary',
      initialize: vi.fn(),
      match: vi
        .fn()
        .mockResolvedValue([
          { skill: makeSkill({ id: 'primary-match' }), score: 0.9, method: 'primary' }
        ] as SkillMatchResult[])
    }

    const fallback: any = {
      name: 'mock-fallback',
      initialize: vi.fn(),
      match: vi.fn()
    }

    const hybrid = new HybridSkillMatcher({
      primaryMatcher: primary,
      fallbackMatcher: fallback,
      confidenceThreshold: 0.7
    })

    await hybrid.initialize([])
    const results = await hybrid.match('test', [makeSkill()])

    expect(results[0].skill.id).toBe('primary-match')
    expect(fallback.match).not.toHaveBeenCalled() // Should NOT call fallback
  })

  it('should fall back to secondary when primary confidence is low', async () => {
    const primary: any = {
      name: 'mock-primary',
      initialize: vi.fn(),
      match: vi
        .fn()
        .mockResolvedValue([
          { skill: makeSkill({ id: 'primary-match' }), score: 0.3, method: 'primary' }
        ] as SkillMatchResult[])
    }

    const fallback: any = {
      name: 'mock-fallback',
      initialize: vi.fn(),
      match: vi
        .fn()
        .mockResolvedValue([
          { skill: makeSkill({ id: 'fallback-match' }), score: 0.85, method: 'fallback' }
        ] as SkillMatchResult[])
    }

    const hybrid = new HybridSkillMatcher({
      primaryMatcher: primary,
      fallbackMatcher: fallback,
      confidenceThreshold: 0.7
    })

    await hybrid.initialize([])
    const results = await hybrid.match('test', [makeSkill()])

    expect(results[0].skill.id).toBe('fallback-match')
    expect(fallback.match).toHaveBeenCalled()
  })

  it('should return primary results if no fallback is configured', async () => {
    const primary: any = {
      name: 'mock-primary',
      initialize: vi.fn(),
      match: vi
        .fn()
        .mockResolvedValue([
          { skill: makeSkill({ id: 'primary-match' }), score: 0.4, method: 'primary' }
        ] as SkillMatchResult[])
    }

    const hybrid = new HybridSkillMatcher({
      primaryMatcher: primary,
      confidenceThreshold: 0.7
    })

    await hybrid.initialize([])
    const results = await hybrid.match('test', [makeSkill()])

    expect(results[0].skill.id).toBe('primary-match')
  })

  it('should return primary results if fallback fails', async () => {
    const primary: any = {
      name: 'mock-primary',
      initialize: vi.fn(),
      match: vi
        .fn()
        .mockResolvedValue([
          { skill: makeSkill({ id: 'primary-match' }), score: 0.3, method: 'primary' }
        ] as SkillMatchResult[])
    }

    const fallback: any = {
      name: 'mock-fallback',
      initialize: vi.fn(),
      match: vi.fn().mockRejectedValue(new Error('API error'))
    }

    const hybrid = new HybridSkillMatcher({
      primaryMatcher: primary,
      fallbackMatcher: fallback,
      confidenceThreshold: 0.7
    })

    await hybrid.initialize([])
    const results = await hybrid.match('test', [makeSkill()])

    expect(results[0].skill.id).toBe('primary-match')
  })

  it('should return empty for empty skills', async () => {
    const primary: any = {
      name: 'mock-primary',
      initialize: vi.fn(),
      match: vi.fn()
    }

    const hybrid = new HybridSkillMatcher({
      primaryMatcher: primary,
      confidenceThreshold: 0.7
    })

    await hybrid.initialize([])
    const results = await hybrid.match('test', [])

    expect(results).toEqual([])
  })

  it('should propagate onSkillsChanged to both matchers', async () => {
    const primary: any = {
      name: 'mock-primary',
      initialize: vi.fn(),
      onSkillsChanged: vi.fn()
    }

    const fallback: any = {
      name: 'mock-fallback',
      initialize: vi.fn(),
      onSkillsChanged: vi.fn()
    }

    const hybrid = new HybridSkillMatcher({
      primaryMatcher: primary,
      fallbackMatcher: fallback,
      confidenceThreshold: 0.7
    })

    const skills = [makeSkill()]
    await hybrid.initialize(skills)
    await hybrid.onSkillsChanged(skills)

    expect(primary.onSkillsChanged).toHaveBeenCalledWith(skills)
    expect(fallback.onSkillsChanged).toHaveBeenCalledWith(skills)
  })

  it('should propagate dispose to both matchers', async () => {
    const primary: any = {
      name: 'mock-primary',
      initialize: vi.fn(),
      dispose: vi.fn()
    }

    const fallback: any = {
      name: 'mock-fallback',
      initialize: vi.fn(),
      dispose: vi.fn()
    }

    const hybrid = new HybridSkillMatcher({
      primaryMatcher: primary,
      fallbackMatcher: fallback,
      confidenceThreshold: 0.7
    })

    await hybrid.initialize([])
    await hybrid.dispose()

    expect(primary.dispose).toHaveBeenCalled()
    expect(fallback.dispose).toHaveBeenCalled()
  })
})

// =============================================================================
// LLMSkillMatcher tests
// =============================================================================

describe('LLMSkillMatcher', () => {
  let LLMSkillMatcher: typeof import('../services/skillMatching/LLMSkillMatcher').LLMSkillMatcher

  beforeEach(async () => {
    const mod = await import('../services/skillMatching/LLMSkillMatcher')
    LLMSkillMatcher = mod.LLMSkillMatcher
  })

  it('should have name "llm"', () => {
    const matcher = new LLMSkillMatcher({
      getModel: vi.fn()
    })
    expect(matcher.name).toBe('llm')
  })

  it('should return empty for empty skills', async () => {
    const matcher = new LLMSkillMatcher({
      getModel: vi.fn()
    })
    await matcher.initialize([])
    const results = await matcher.match('test', [])
    expect(results).toEqual([])
  })
})

// =============================================================================
// SkillPlugin integration tests (using inline reimplementation since
// the aiCore package cannot be imported from main process tests)
// =============================================================================

/**
 * Minimal reimplementation of the skill plugin logic for testing.
 * Mirrors the logic in packages/aiCore/src/core/plugins/built-in/skillPlugin.ts.
 */
function createSkillPluginForTest(config: {
  getSkills: () => Promise<Skill[]>
  matchingProvider?: { name: string; match: (q: string, s: Skill[], k?: number) => Promise<SkillMatchResult[]> }
  matchThreshold?: number
  maxMatchedSkills?: number
  minSkillsForMatching?: number
}) {
  const matchThreshold = config.matchThreshold ?? 0.5
  const maxMatchedSkills = config.maxMatchedSkills ?? 3
  const minSkillsForMatching = config.minSkillsForMatching ?? 3

  return {
    transformParams: async (params: any) => {
      const skills = await config.getSkills()
      const enabledSkills = skills.filter((s) => s.enabled)
      if (enabledSkills.length === 0) return params

      let activeSkills: Skill[]

      if (config.matchingProvider && enabledSkills.length >= minSkillsForMatching) {
        const userMsg = params.messages?.findLast?.((m: any) => m.role === 'user')
        const userQuery = typeof userMsg?.content === 'string' ? userMsg.content : null

        if (userQuery) {
          try {
            const matches = await config.matchingProvider.match(userQuery, enabledSkills, maxMatchedSkills)
            activeSkills = matches.filter((m) => m.score >= matchThreshold).map((m) => m.skill)
            if (activeSkills.length === 0) activeSkills = enabledSkills
          } catch {
            activeSkills = enabledSkills
          }
        } else {
          activeSkills = enabledSkills
        }
      } else {
        activeSkills = enabledSkills
      }

      const skillInstructions = activeSkills.map((s) => `### Skill: ${s.name}\n${s.instructions}`).join('\n\n')
      const systemPrompt = params.messages?.find((m: any) => m.role === 'system')?.content || ''
      const newSystemPrompt = systemPrompt
        ? `${systemPrompt}\n\n## Active Skills\n${skillInstructions}`
        : `## Active Skills\n${skillInstructions}`

      if (params.messages) {
        const idx = params.messages.findIndex((m: any) => m.role === 'system')
        if (idx !== -1) {
          params.messages[idx].content = newSystemPrompt
        } else {
          params.messages.unshift({ role: 'system', content: newSystemPrompt })
        }
      }
      return params
    }
  }
}

describe('createSkillPlugin with matching', () => {
  it('should inject all skills when no matching provider is set', async () => {
    const skills = [
      makeSkill({ id: 'a', name: 'Skill A', instructions: 'Do A' }),
      makeSkill({ id: 'b', name: 'Skill B', instructions: 'Do B' })
    ]

    const plugin = createSkillPluginForTest({
      getSkills: async () => skills
    })

    const params = {
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hello' }
      ]
    }

    const result = await plugin.transformParams(params)
    const systemMsg = result.messages.find((m: any) => m.role === 'system')
    expect(systemMsg.content).toContain('### Skill: Skill A')
    expect(systemMsg.content).toContain('### Skill: Skill B')
  })

  it('should use matching provider when enough skills are enabled', async () => {
    const skills = [
      makeSkill({ id: 'a', name: 'Skill A', instructions: 'Do A' }),
      makeSkill({ id: 'b', name: 'Skill B', instructions: 'Do B' }),
      makeSkill({ id: 'c', name: 'Skill C', instructions: 'Do C' }),
      makeSkill({ id: 'd', name: 'Skill D', instructions: 'Do D' })
    ]

    const mockMatcher = {
      name: 'mock',
      initialize: vi.fn(),
      match: vi.fn().mockResolvedValue([{ skill: skills[1], score: 0.9, method: 'mock' }] as SkillMatchResult[])
    }

    const plugin = createSkillPluginForTest({
      getSkills: async () => skills,
      matchingProvider: mockMatcher,
      matchThreshold: 0.5,
      maxMatchedSkills: 3,
      minSkillsForMatching: 3
    })

    const params = {
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Do something with B' }
      ]
    }

    const result = await plugin.transformParams(params)
    const systemMsg = result.messages.find((m: any) => m.role === 'system')

    expect(systemMsg.content).toContain('### Skill: Skill B')
    expect(systemMsg.content).not.toContain('### Skill: Skill A')
    expect(systemMsg.content).not.toContain('### Skill: Skill C')
    expect(systemMsg.content).not.toContain('### Skill: Skill D')
  })

  it('should fall back to all skills if matcher returns below threshold', async () => {
    const skills = [
      makeSkill({ id: 'a', name: 'Skill A', instructions: 'Do A' }),
      makeSkill({ id: 'b', name: 'Skill B', instructions: 'Do B' }),
      makeSkill({ id: 'c', name: 'Skill C', instructions: 'Do C' })
    ]

    const mockMatcher = {
      name: 'mock',
      initialize: vi.fn(),
      match: vi.fn().mockResolvedValue([{ skill: skills[0], score: 0.2, method: 'mock' }] as SkillMatchResult[])
    }

    const plugin = createSkillPluginForTest({
      getSkills: async () => skills,
      matchingProvider: mockMatcher,
      matchThreshold: 0.5,
      minSkillsForMatching: 2
    })

    const params = {
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Do something random' }
      ]
    }

    const result = await plugin.transformParams(params)
    const systemMsg = result.messages.find((m: any) => m.role === 'system')

    expect(systemMsg.content).toContain('### Skill: Skill A')
    expect(systemMsg.content).toContain('### Skill: Skill B')
    expect(systemMsg.content).toContain('### Skill: Skill C')
  })

  it('should inject all skills when fewer than minSkillsForMatching', async () => {
    const skills = [
      makeSkill({ id: 'a', name: 'Skill A', instructions: 'Do A' }),
      makeSkill({ id: 'b', name: 'Skill B', instructions: 'Do B' })
    ]

    const mockMatcher = {
      name: 'mock',
      initialize: vi.fn(),
      match: vi.fn()
    }

    const plugin = createSkillPluginForTest({
      getSkills: async () => skills,
      matchingProvider: mockMatcher,
      minSkillsForMatching: 5
    })

    const params = {
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'test' }
      ]
    }

    const result = await plugin.transformParams(params)
    const systemMsg = result.messages.find((m: any) => m.role === 'system')

    expect(systemMsg.content).toContain('### Skill: Skill A')
    expect(systemMsg.content).toContain('### Skill: Skill B')
    expect(mockMatcher.match).not.toHaveBeenCalled()
  })

  it('should handle matcher errors gracefully', async () => {
    const skills = [
      makeSkill({ id: 'a', name: 'Skill A', instructions: 'Do A' }),
      makeSkill({ id: 'b', name: 'Skill B', instructions: 'Do B' }),
      makeSkill({ id: 'c', name: 'Skill C', instructions: 'Do C' })
    ]

    const mockMatcher = {
      name: 'mock',
      initialize: vi.fn(),
      match: vi.fn().mockRejectedValue(new Error('Matcher crashed'))
    }

    const plugin = createSkillPluginForTest({
      getSkills: async () => skills,
      matchingProvider: mockMatcher,
      minSkillsForMatching: 2
    })

    const params = {
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'test' }
      ]
    }

    const result = await plugin.transformParams(params)
    const systemMsg = result.messages.find((m: any) => m.role === 'system')

    expect(systemMsg.content).toContain('### Skill: Skill A')
    expect(systemMsg.content).toContain('### Skill: Skill B')
    expect(systemMsg.content).toContain('### Skill: Skill C')
  })
})

// =============================================================================
// Factory tests
// =============================================================================

describe('createSkillMatchingProvider factory', () => {
  let createSkillMatchingProvider: typeof import('../services/skillMatching').createSkillMatchingProvider

  beforeEach(async () => {
    const mod = await import('../services/skillMatching')
    createSkillMatchingProvider = mod.createSkillMatchingProvider
  })

  it('should return null for "none" strategy', () => {
    const result = createSkillMatchingProvider({
      config: { strategy: 'none', threshold: 0.5, maxMatched: 3, minSkillsForMatching: 3 },
      skillsDir: '/tmp/skills'
    })
    expect(result).toBeNull()
  })

  it('should create KeywordSkillMatcher for "keyword" strategy', () => {
    const result = createSkillMatchingProvider({
      config: { strategy: 'keyword', threshold: 0.5, maxMatched: 3, minSkillsForMatching: 3 },
      skillsDir: '/tmp/skills'
    })
    expect(result).not.toBeNull()
    expect(result!.name).toBe('keyword')
  })

  it('should fall back to keyword when embedding strategy has no API client', () => {
    const result = createSkillMatchingProvider({
      config: { strategy: 'embedding', threshold: 0.5, maxMatched: 3, minSkillsForMatching: 3 },
      skillsDir: '/tmp/skills'
    })
    expect(result).not.toBeNull()
    expect(result!.name).toBe('keyword')
  })

  it('should create EmbeddingSkillMatcher for "embedding" strategy with API client', async () => {
    const result = createSkillMatchingProvider({
      config: {
        strategy: 'embedding',
        threshold: 0.5,
        maxMatched: 3,
        minSkillsForMatching: 3,
        embeddingApiClient: {
          model: 'text-embedding-3-small',
          provider: 'openai',
          apiKey: 'test-key',
          baseURL: 'https://api.openai.com/v1'
        }
      },
      skillsDir: '/tmp/skills'
    })
    expect(result).not.toBeNull()
    expect(result!.name).toBe('embedding')
  })

  it('should create HybridSkillMatcher for "hybrid" strategy', () => {
    const result = createSkillMatchingProvider({
      config: { strategy: 'hybrid', threshold: 0.6, maxMatched: 3, minSkillsForMatching: 3 },
      skillsDir: '/tmp/skills',
      getModel: vi.fn()
    })
    expect(result).not.toBeNull()
    expect(result!.name).toBe('hybrid')
  })

  it('should fall back to keyword for LLM strategy without getModel', () => {
    const result = createSkillMatchingProvider({
      config: { strategy: 'llm', threshold: 0.5, maxMatched: 3, minSkillsForMatching: 3 },
      skillsDir: '/tmp/skills'
    })
    expect(result).not.toBeNull()
    expect(result!.name).toBe('keyword')
  })

  it('should create LLMSkillMatcher for "llm" strategy with getModel', () => {
    const result = createSkillMatchingProvider({
      config: { strategy: 'llm', threshold: 0.5, maxMatched: 3, minSkillsForMatching: 3 },
      skillsDir: '/tmp/skills',
      getModel: vi.fn()
    })
    expect(result).not.toBeNull()
    expect(result!.name).toBe('llm')
  })
})
