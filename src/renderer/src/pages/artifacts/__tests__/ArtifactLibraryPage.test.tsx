import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ArtifactLibraryPage from '../ArtifactLibraryPage'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  dispatch: vi.fn().mockResolvedValue(undefined),
  getArtifactProjects: vi.fn().mockResolvedValue([]),
  cloneArtifactProject: vi.fn(),
  setArtifactProjectArchived: vi.fn(),
  updateArtifactProject: vi.fn()
}))

vi.mock('@renderer/components/app/Navbar', () => ({
  Navbar: ({ children }: any) => <div>{children}</div>,
  NavbarCenter: ({ children }: any) => <div>{children}</div>
}))

vi.mock('@renderer/components/Scrollbar', () => ({
  default: ({ children }: any) => <div>{children}</div>
}))

vi.mock('@renderer/features/artifacts/db/artifactDb', () => ({
  getArtifactProjects: mocks.getArtifactProjects,
  cloneArtifactProject: mocks.cloneArtifactProject,
  setArtifactProjectArchived: mocks.setArtifactProjectArchived,
  updateArtifactProject: mocks.updateArtifactProject
}))

vi.mock('@renderer/store/artifacts', async () => {
  const actual = await vi.importActual<any>('@renderer/store/artifacts')
  return {
    ...actual,
    loadSavedArtifacts: vi.fn(() => ({ type: 'artifacts/loadSavedArtifacts' })),
    selectSavedArtifacts: (state: any) => state.artifacts.savedArtifacts
  }
})

vi.mock('@renderer/store/settings', async () => {
  const actual = await vi.importActual<any>('@renderer/store/settings')
  return {
    ...actual,
    selectArtifactStudioSettings: (state: any) => state.settings.artifacts.studio
  }
})

const mockState = {
  artifacts: { savedArtifacts: [] },
  settings: {
    artifacts: {
      studio: {
        overridePolicy: {
          allowConversationOverride: true,
          allowProjectOverride: true
        },
        defaults: {
          llm: {
            modelId: undefined,
            providerId: undefined,
            temperature: 0.7,
            topP: 1,
            maxTokens: undefined,
            streamOutput: true
          },
          skills: {
            mode: 'inherit'
          },
          contextManagement: {
            type: 'sliding_window'
          },
          knowledge: {
            knowledgeBaseIds: [],
            autoCreateFromChatHistory: false
          }
        }
      }
    }
  },
  llm: { providers: [] },
  knowledge: { bases: [] },
  assistants: { assistants: [] }
}

vi.mock('@renderer/store', () => ({
  useAppDispatch: () => mocks.dispatch,
  useAppSelector: (selector: any) => selector(mockState)
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => ({})
}))

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as Record<string, unknown>),
    useTranslation: () => ({
      t: (key: string, defaultValue?: string) => defaultValue || key
    })
  }
})

describe('ArtifactLibraryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    mocks.dispatch.mockResolvedValue(undefined)
    mocks.getArtifactProjects.mockResolvedValue([])
    ;(window as any).api = {
      skill: {
        getList: vi.fn().mockResolvedValue([])
      }
    }
  })

  it('creates a scratch project seed with context envelope and navigates to studio', async () => {
    render(<ArtifactLibraryPage />)

    await waitFor(() => {
      expect(mocks.dispatch).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByRole('button', { name: /artifacts\.new_artifact|new artifact/i }))

    const nameInput = screen.getByPlaceholderText(/Marketing landing page/i)
    fireEvent.change(nameInput, { target: { value: 'Studio Seeded Project' } })

    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledOnce()
    })

    const studioPath = mocks.navigate.mock.calls[0][0] as string
    expect(studioPath).toMatch(/^\/artifacts\/studio\/scratch-/)

    const projectId = studioPath.split('/').pop() as string
    const seedRaw = sessionStorage.getItem(`artifact-project-seed:${projectId}`)
    expect(seedRaw).toBeTruthy()

    const seed = JSON.parse(seedRaw || '{}')
    expect(seed.source).toBe('template')
    expect(seed.contextEnvelope).toBeDefined()
    expect(seed.contextEnvelope.source.conversationId).toBe(`studio-${projectId}`)
    expect(seed.artifact.title).toBe('Studio Seeded Project')
  })
})
