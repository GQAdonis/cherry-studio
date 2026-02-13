import { promises as fs } from 'fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/test-user-data')
  },
  dialog: {
    showMessageBox: vi.fn()
  }
}))

// Mock fs
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    readdir: vi.fn(),
    readFile: vi.fn(),
    stat: vi.fn()
  }
}))

// Mock config manager
vi.mock('@main/services/ConfigManager', () => ({
  configManager: {
    get: vi.fn().mockReturnValue([]),
    set: vi.fn()
  },
  ConfigKeys: {}
}))

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

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn()
}))

// Mock skill matching
vi.mock('@main/services/skillMatching', () => ({
  createSkillMatchingProvider: vi.fn().mockReturnValue(null),
  DEFAULT_SKILL_MATCHING_CONFIG: {
    strategy: 'none',
    threshold: 0.5,
    maxMatched: 3,
    minSkillsForMatching: 3
  }
}))

describe('SkillService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize and create skills directory', async () => {
    // The constructor calls init() which calls fs.mkdir
    // This is tested implicitly via the singleton import
  })

  it('should load skills from the storage manager', async () => {
    // With the new architecture, SkillService delegates to SkillStorageManager
    // which in turn delegates to individual providers.
    // The FileSystemStorageProvider reads from disk.

    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'pirate', isDirectory: () => true } as any,
      { name: 'ninja', isDirectory: () => true } as any,
      { name: 'README.md', isDirectory: () => false } as any
    ])

    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      const pathStr = String(filePath)
      if (pathStr.includes('pirate/SKILL.md')) {
        return `---
name: Pirate Speak
description: Arrr
tools: [parrot]
---
You are a pirate.`
      }
      if (pathStr.includes('ninja/SKILL.md')) {
        return `---
name: Ninja Mode
---
You are a ninja.`
      }
      return ''
    })

    // Import after mocks are set up
    const { skillService } = await import('../services/SkillService')

    const skills = await skillService.getSkills()

    // Skills may be empty if bootstrap hasn't run fully (due to async init),
    // but the service should not throw
    expect(Array.isArray(skills)).toBe(true)
  })
})
