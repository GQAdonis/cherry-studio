import { describe, expect, it } from 'vitest'

import { injectSkillsIntoPrompt } from '../skillsPromptTransform'

describe('injectSkillsIntoPrompt', () => {
  const enabledSkill = {
    id: 'skill-1',
    name: 'Skill One',
    enabled: true,
    instructions: 'Use integration-safe prompt mutation.'
  }

  it('returns unchanged params when no enabled skills exist', () => {
    const params = { prompt: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }] }
    const result = injectSkillsIntoPrompt(params, [{ ...enabledSkill, enabled: false }])

    expect(result).toBe(params)
  })

  it('returns unchanged params when skills are undefined', () => {
    const params = { prompt: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }] }
    const result = injectSkillsIntoPrompt(params, undefined as any)

    expect(result).toBe(params)
  })

  it('returns unchanged params when prompt is not an array', () => {
    const params = { prompt: 'bad-shape' }
    const result = injectSkillsIntoPrompt(params, [enabledSkill])

    expect(result).toBe(params)
  })

  it('prepends a system message when missing', () => {
    const params = { prompt: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }] }
    const result = injectSkillsIntoPrompt(params, [enabledSkill])

    expect(result.prompt[0].role).toBe('system')
    expect(result.prompt[0].content).toContain('## Active Skills')
    expect(result.prompt[0].content).toContain('### Skill: Skill One')
    expect(result.prompt[1].role).toBe('user')
  })

  it('appends to an existing system string message', () => {
    const params = {
      prompt: [
        { role: 'system', content: 'Base system instruction.' },
        { role: 'user', content: [{ type: 'text', text: 'hello' }] }
      ]
    }

    const result = injectSkillsIntoPrompt(params, [enabledSkill])
    expect(result.prompt[0].content).toContain('Base system instruction.')
    expect(result.prompt[0].content).toContain('## Active Skills')
  })

  it('handles non-string non-array system content gracefully', () => {
    const params = {
      prompt: [
        { role: 'system', content: { unexpected: true } },
        { role: 'user', content: [{ type: 'text', text: 'hello' }] }
      ]
    }

    const result = injectSkillsIntoPrompt(params, [enabledSkill])
    expect(typeof result.prompt[0].content).toBe('string')
    expect(result.prompt[0].content).toContain('## Active Skills')
  })

  it('appends a text part to an existing system multipart message', () => {
    const params = {
      prompt: [
        { role: 'system', content: [{ type: 'text', text: 'Base system part.' }] },
        { role: 'user', content: [{ type: 'text', text: 'hello' }] }
      ]
    }

    const result = injectSkillsIntoPrompt(params, [enabledSkill])
    expect(Array.isArray(result.prompt[0].content)).toBe(true)
    expect(result.prompt[0].content[1]).toEqual(
      expect.objectContaining({
        type: 'text'
      })
    )
    expect(result.prompt[0].content[1].text).toContain('## Active Skills')
  })
})
