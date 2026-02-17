import { describe, expect, it } from 'vitest'

import { filterSkillsForScope, resolveEffectiveSkillScope } from '../scopePolicy'

describe('scopePolicy', () => {
  const skills = [
    { id: 'a', enabled: true, name: 'A' },
    { id: 'b', enabled: false, name: 'B' },
    { id: 'c', enabled: true, name: 'C' }
  ] as any[]

  it('uses globally enabled skills in inherit mode', () => {
    const result = filterSkillsForScope(skills as any, { mode: 'inherit' })
    expect(result.map((skill) => skill.id)).toEqual(['a', 'c'])
  })

  it('returns all skills in all mode', () => {
    const result = filterSkillsForScope(skills as any, { mode: 'all' })
    expect(result.map((skill) => skill.id)).toEqual(['a', 'b', 'c'])
  })

  it('returns no skills in none mode', () => {
    const result = filterSkillsForScope(skills as any, { mode: 'none' })
    expect(result).toEqual([])
  })

  it('returns selected skills regardless of global enabled flag', () => {
    const result = filterSkillsForScope(skills as any, {
      mode: 'selected',
      selectedSkillIds: ['b', 'c']
    })
    expect(result.map((skill) => skill.id)).toEqual(['b', 'c'])
  })

  it('resolves topic scope over assistant scope', () => {
    const result = resolveEffectiveSkillScope(
      { id: 'topic', skillScope: { mode: 'none' } } as any,
      { id: 'assistant', settings: { skillScope: { mode: 'all' } } } as any
    )
    expect(result.mode).toBe('none')
  })
})
