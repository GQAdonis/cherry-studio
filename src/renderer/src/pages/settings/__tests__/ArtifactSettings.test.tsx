import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import ArtifactSettings from '../ArtifactSettings'

const malformedDependencyName =
  'atrixQ|support.function.builtin.wolfram|essagePacket|MoonPhase|System`PolynomialQ|System`Rationalize'

const mockState = {
  settings: {
    artifacts: {
      enabled: true,
      autoOpen: false,
      enabledTypes: ['htmx', 'react'],
      storageLimit: 100,
      runtime: {
        profile: 'standard',
        allowCustomBundlerUrl: true,
        allowDynamicDependencies: true,
        allowExternalResources: true
      },
      react: {
        useSandpack: true,
        showEditor: false,
        showConsole: false,
        customBundlerUrl: '',
        dependencies: {
          'framer-motion': '^11.0.0',
          [malformedDependencyName]: 'latest'
        }
      },
      studio: {
        overridePolicy: {
          allowConversationOverride: true,
          allowProjectOverride: true
        },
        defaults: {
          llm: {},
          skills: { mode: 'inherit' },
          contextManagement: { type: 'sliding_window' },
          knowledge: {
            knowledgeBaseIds: [],
            autoCreateFromChatHistory: false
          }
        }
      }
    }
  },
  llm: {
    providers: [
      {
        id: 'openai',
        enabled: true,
        name: 'OpenAI',
        models: [{ id: 'gpt-4o', name: 'GPT-4o' }]
      }
    ],
    defaultModel: { provider: 'openai', id: 'gpt-4o' }
  },
  knowledge: {
    bases: []
  }
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | { defaultValue?: string }) =>
      typeof fallback === 'string' ? fallback : fallback?.defaultValue || key
  })
}))

vi.mock('antd', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('antd')

  return {
    ...actual,
    Table: ({ dataSource = [] }: { dataSource?: Array<{ key: string; name: string; version: string }> }) => (
      <div>
        {dataSource.map((row) => (
          <div key={row.key}>
            <span>{row.name}</span>
            <span>{row.version}</span>
          </div>
        ))}
      </div>
    ),
    Select: ({ children }: { children?: ReactNode }) => <div>{children}</div>
  }
})

vi.mock('@renderer/context/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light' })
}))

vi.mock('@renderer/features/artifacts/services/ArtifactStudioRuntimeService', () => ({
  ARTIFACT_STUDIO_AGENT_ID: 'artifact-studio'
}))

vi.mock('@renderer/pages/settings/AgentSettings', () => ({
  AgentSettingsPopup: {
    show: vi.fn()
  }
}))

vi.mock('@renderer/store', () => ({
  useAppDispatch: () => vi.fn(),
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState)
}))

describe('ArtifactSettings', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    })
  })

  it('filters malformed dependency names from the rendered table', () => {
    render(<ArtifactSettings />)

    expect(screen.getByText('framer-motion')).toBeInTheDocument()
    expect(screen.queryByText(/support\.function\.builtin\.wolfram/i)).not.toBeInTheDocument()
  })
})
