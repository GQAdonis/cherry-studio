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
  file: {
    read: vi.fn().mockResolvedValue('[]'),
    writeWithId: vi.fn().mockResolvedValue(undefined)
  }
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
