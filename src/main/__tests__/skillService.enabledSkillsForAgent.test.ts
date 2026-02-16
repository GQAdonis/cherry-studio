import { beforeEach, describe, expect, it, vi } from 'vitest'

const configValues = new Map<string, any>()

const storageManagerMock = {
  bootstrap: vi.fn(),
  getAllSkills: vi.fn().mockResolvedValue([
    { id: 'ui-ux-pro-max', name: 'UI/UX Pro Max', instructions: 'design', enabled: true },
    { id: 'artifact-refiner', name: 'Artifact Refiner', instructions: 'refine', enabled: true },
    { id: 'disabled-skill', name: 'Disabled', instructions: 'off', enabled: false }
  ])
}

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/test-user-data')
  },
  dialog: {
    showMessageBox: vi.fn()
  }
}))

vi.mock('@main/services/ConfigManager', () => ({
  configManager: {
    get: vi.fn((key: string) => configValues.get(key)),
    set: vi.fn()
  }
}))

vi.mock('../services/skillStorage', () => ({
  SkillStorageManager: {
    getInstance: vi.fn(() => storageManagerMock)
  }
}))

vi.mock('../services/skillMatching', () => ({
  createSkillMatchingProvider: vi.fn(() => null),
  DEFAULT_SKILL_MATCHING_CONFIG: {
    strategy: 'none',
    threshold: 0.5,
    maxMatched: 3,
    minSkillsForMatching: 3
  }
}))

describe('SkillService.getEnabledSkillsForAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configValues.clear()
    configValues.set('enabledSkills', ['ui-ux-pro-max', 'artifact-refiner'])
  })

  it('falls back to globally enabled skills when no agent mapping exists', async () => {
    const { skillService } = await import('../services/SkillService')

    const enabledSkills = await skillService.getEnabledSkillsForAgent('agent-1')

    expect(enabledSkills.map((skill) => skill.id)).toEqual(['ui-ux-pro-max', 'artifact-refiner'])
  })

  it('uses explicit agent mapping when present', async () => {
    configValues.set('agentSkills.agent-1', ['artifact-refiner'])
    const { skillService } = await import('../services/SkillService')

    const enabledSkills = await skillService.getEnabledSkillsForAgent('agent-1')

    expect(enabledSkills.map((skill) => skill.id)).toEqual(['artifact-refiner'])
  })
})
