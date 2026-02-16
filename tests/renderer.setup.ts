import '@testing-library/jest-dom/vitest'

import { createRequire } from 'node:module'
import { styleSheetSerializer } from 'jest-styled-components/serializer'
import { expect, vi } from 'vitest'

const require = createRequire(import.meta.url)
const bufferModule = require('buffer')
if (!bufferModule.SlowBuffer) {
  bufferModule.SlowBuffer = bufferModule.Buffer
}

expect.addSnapshotSerializer(styleSheetSerializer)

// JSDOM/CSSOM compatibility:
// Some libraries (e.g. @stitches/core via Sandpack) attempt to insert CSS rules that
// older CSSOM parsers can't handle, causing tests to crash.
// We defensively ignore insertRule parse errors in the test environment.
if (typeof CSSStyleSheet !== 'undefined' && CSSStyleSheet.prototype?.insertRule) {
  const originalInsertRule = CSSStyleSheet.prototype.insertRule
  // biome-ignore lint/suspicious/noExplicitAny: monkeypatching a DOM API for tests
  CSSStyleSheet.prototype.insertRule = function (rule: string, index?: number): any {
    try {
      return originalInsertRule.call(this, rule, index)
    } catch {
      return 0
    }
  }
}

// Mock LoggerService globally for renderer tests
vi.mock('@logger', async () => {
  const { MockRendererLoggerService, mockRendererLoggerService } = await import('./__mocks__/RendererLoggerService')
  return {
    LoggerService: MockRendererLoggerService,
    loggerService: mockRendererLoggerService
  }
})

// Mock uuid globally for renderer tests
let uuidCounter = 0
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-' + ++uuidCounter
}))

// Mock AssistantService globally for renderer tests
vi.mock('@renderer/services/AssistantService', async () => {
  const actual = await vi.importActual('@renderer/services/AssistantService')
  return {
    ...actual,
    getSkillsCreatorAssistant: vi.fn(() => ({
      id: 'skills-creator',
      name: 'Skills Creator',
      emoji: '🛠️',
      prompt: 'Test skills creator prompt',
      topics: [
        {
          id: 'test-topic',
          assistantId: 'skills-creator',
          name: 'Test Topic',
          messages: [],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          isNameManuallyEdited: false
        }
      ],
      messages: [],
      type: 'assistant',
      regularPhrases: [],
      settings: {
        temperature: 0.7,
        contextCount: 20,
        enableTemperature: true,
        enableMaxTokens: false,
        maxTokens: 0,
        streamOutput: true,
        topP: 1,
        enableTopP: false,
        toolUseMode: 'function',
        reasoning_effort: 'default',
        customParameters: []
      }
    })),
    getDefaultAssistant: vi.fn(() => ({
      id: 'default',
      name: 'Default Assistant',
      emoji: '😀',
      prompt: '',
      topics: [
        {
          id: 'test-topic',
          assistantId: 'default',
          name: 'Test Topic',
          messages: [],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          isNameManuallyEdited: false
        }
      ],
      messages: [],
      type: 'assistant',
      regularPhrases: [],
      settings: {
        temperature: 0.7,
        contextCount: 8,
        enableTemperature: true,
        enableMaxTokens: false,
        maxTokens: 0,
        streamOutput: true,
        topP: 1,
        enableTopP: false,
        toolUseMode: 'function',
        reasoning_effort: 'default',
        customParameters: []
      }
    })),
    getProviderByModel: vi.fn(() => ({ id: 'test-provider', name: 'Test Provider', type: 'openai' })),
    getAssistantSettings: vi.fn(
      (assistant) =>
        assistant?.settings || {
          temperature: 0.7,
          contextCount: 8,
          enableTemperature: true,
          enableMaxTokens: false,
          maxTokens: 0,
          streamOutput: true,
          topP: 1,
          enableTopP: false,
          toolUseMode: 'function',
          reasoning_effort: 'default',
          customParameters: []
        }
    )
  }
})

vi.mock('axios', () => {
  const defaultAxiosMock = {
    get: vi.fn().mockResolvedValue({ data: {} }), // Mocking axios GET request
    post: vi.fn().mockResolvedValue({ data: {} }) // Mocking axios POST request
    // You can add other axios methods like put, delete etc. as needed
  }

  const isAxiosError = (error: unknown): error is { isAxiosError?: boolean } =>
    Boolean((error as { isAxiosError?: boolean } | undefined)?.isAxiosError)

  return {
    default: defaultAxiosMock,
    isAxiosError
  }
})

vi.stubGlobal('electron', {
  ipcRenderer: {
    on: vi.fn(),
    send: vi.fn(),
    invoke: vi.fn().mockResolvedValue(undefined)
  }
})
vi.stubGlobal('api', {
  getAppInfo: vi.fn().mockResolvedValue({
    version: '1.0.0',
    isPackaged: false,
    appPath: '/mock/app',
    filesPath: '/mock/files',
    notesPath: '/mock/notes',
    configPath: '/mock/config',
    appDataPath: '/mock/userData',
    resourcesPath: '/mock/resources',
    logsPath: '/mock/logs',
    arch: 'x64',
    isPortable: false,
    installPath: '/mock/install'
  }),
  file: {
    read: vi.fn().mockResolvedValue('[]'),
    writeWithId: vi.fn().mockResolvedValue(undefined)
  },
  skill: {
    getList: vi.fn().mockResolvedValue([]),
    getEnabledForAgent: vi.fn().mockResolvedValue([]),
    toggle: vi.fn().mockResolvedValue(undefined),
    executeScript: vi.fn().mockResolvedValue(''),
    refresh: vi.fn().mockResolvedValue(undefined),
    getMatchingConfig: vi.fn().mockResolvedValue({}),
    setMatchingConfig: vi.fn().mockResolvedValue(undefined),
    setAgentSkills: vi.fn().mockResolvedValue(undefined)
  },
  skillStorage: {
    getProviders: vi.fn().mockResolvedValue([])
  },
  skillCreator: {
    validate: vi.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] }),
    initTemplate: vi.fn().mockResolvedValue({ name: 'new-skill', description: '', instructions: '' }),
    saveToProvider: vi.fn().mockResolvedValue(true),
    testScript: vi.fn().mockResolvedValue('')
  }
})

// Mock IPC channel constants for skills tests
vi.stubGlobal('IpcChannel', {
  Skill_GetList: 'skill:get-list',
  Skill_GetAgentSkills: 'skill:get-agent-skills',
  Skill_SetAgentSkills: 'skill:set-agent-skills',
  Skill_Toggle: 'skill:toggle',
  Skill_ExecuteScript: 'skill:execute-script',
  Skill_Refresh: 'skill:refresh',
  Skill_GetMatchingConfig: 'skill:get-matching-config',
  Skill_SetMatchingConfig: 'skill:set-matching-config',
  Skill_AddToAgent: 'skill:add-to-agent',
  Skill_RemoveFromAgent: 'skill:remove-from-agent',
  Skill_GetEnabledForAgent: 'skill:get-enabled-for-agent',
  SkillStorage_GetProviders: 'skill-storage:get-providers',
  SkillCreator_Validate: 'skill-creator:validate',
  SkillCreator_InitTemplate: 'skill-creator:init-template',
  SkillCreator_SaveToProvider: 'skill-creator:save-to-provider',
  SkillCreator_TestScript: 'skill-creator:test-script'
})

// Sandpack (and its styling stack) isn't compatible with JSDOM in a few cases.
// Mock it globally to avoid CSSOM/runtime issues in unit tests.
vi.mock('@codesandbox/sandpack-react', () => ({
  SandpackCodeEditor: () => null,
  SandpackConsole: () => null,
  SandpackLayout: ({ children }: any) => children ?? null,
  SandpackPreview: () => null,
  SandpackProvider: ({ children }: any) => children ?? null
}))

if (typeof globalThis.localStorage === 'undefined' || typeof (globalThis.localStorage as any).getItem !== 'function') {
  let store = new Map<string, string>()

  const localStorageMock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    }
  }

  vi.stubGlobal('localStorage', localStorageMock)
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
  }
}
