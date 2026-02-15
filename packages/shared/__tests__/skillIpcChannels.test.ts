import { describe, expect, it } from 'vitest'

import { IpcChannel } from '../../shared/IpcChannel'

// =============================================================================
// IpcChannel Skill Enum Integrity Tests
// =============================================================================

describe('IpcChannel Skill Enums', () => {
  // Collect all skill-related enum entries
  const skillChannels = Object.entries(IpcChannel).filter(
    ([key]) => key.startsWith('Skill_') || key.startsWith('SkillStorage_') || key.startsWith('SkillCreator_')
  )

  const skillKeys = skillChannels.map(([key]) => key)
  const skillValues = skillChannels.map(([, value]) => value)

  it('should have all expected Skill_ IPC enum entries', () => {
    const expectedSkillKeys = [
      'Skill_GetList',
      'Skill_Refresh',
      'Skill_Toggle',
      'Skill_ExecuteScript',
      'Skill_GetMatchingConfig',
      'Skill_SetMatchingConfig',
      'Skill_InitializeMatching',
      'Skill_GetAgentSkills',
      'Skill_SetAgentSkills',
      'Skill_AddToAgent',
      'Skill_RemoveFromAgent',
      'Skill_GetEnabledForAgent'
    ]

    for (const key of expectedSkillKeys) {
      expect(skillKeys, `Missing IpcChannel entry: ${key}`).toContain(key)
    }
  })

  it('should have all expected SkillStorage_ IPC enum entries', () => {
    const expectedStorageKeys = [
      'SkillStorage_GetProviders',
      'SkillStorage_AddProvider',
      'SkillStorage_UpdateProvider',
      'SkillStorage_RemoveProvider',
      'SkillStorage_TestConnection',
      'SkillStorage_SelectDirectory'
    ]

    for (const key of expectedStorageKeys) {
      expect(skillKeys, `Missing IpcChannel entry: ${key}`).toContain(key)
    }
  })

  it('should have no duplicate channel string values among skill entries', () => {
    const seen = new Set<string>()
    const duplicates: string[] = []

    for (const value of skillValues) {
      if (seen.has(value)) {
        duplicates.push(value)
      }
      seen.add(value)
    }

    expect(duplicates, `Duplicate IPC channel values found: ${duplicates.join(', ')}`).toEqual([])
  })

  it('should have all channel values follow naming convention', () => {
    for (const [key, value] of skillChannels) {
      expect(value, `${key} should use colon-separated lowercase format`).toMatch(/^skill(-storage|-creator)?:/)
    }
  })

  it('should have correct string values for agent-skill channels', () => {
    expect(IpcChannel.Skill_GetAgentSkills).toBe('skill:get-agent-skills')
    expect(IpcChannel.Skill_SetAgentSkills).toBe('skill:set-agent-skills')
    expect(IpcChannel.Skill_AddToAgent).toBe('skill:add-to-agent')
    expect(IpcChannel.Skill_RemoveFromAgent).toBe('skill:remove-from-agent')
    expect(IpcChannel.Skill_GetEnabledForAgent).toBe('skill:get-enabled-for-agent')
  })
})

// =============================================================================
// No duplicate channel values across the ENTIRE IpcChannel enum
// =============================================================================

describe('IpcChannel Global Uniqueness', () => {
  it('should have no duplicate channel values across all entries', () => {
    const seen = new Map<string, string>()
    const duplicates: string[] = []

    for (const [key, value] of Object.entries(IpcChannel)) {
      const existing = seen.get(value)
      if (existing) {
        duplicates.push(`"${value}" is used by both ${existing} and ${key}`)
      }
      seen.set(value, key)
    }

    expect(duplicates, 'Found duplicate IPC channel values').toEqual([])
  })
})
