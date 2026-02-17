import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ArtifactChatPanel from '../components/ArtifactChatPanel'

const useArtifactRefinementMock = vi.hoisted(() => vi.fn())

vi.mock('@renderer/features/artifacts/hooks/useArtifactRefinement', () => ({
  useArtifactRefinement: useArtifactRefinementMock
}))

vi.mock('@renderer/components/Scrollbar', () => ({
  default: ({ children }: any) => <div>{children}</div>
}))

vi.mock('../components/RefinementToolbar', () => ({
  default: () => <div>toolbar</div>
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

describe('ArtifactChatPanel skill activation stream blocks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Element.prototype.scrollIntoView = vi.fn()
    useArtifactRefinementMock.mockReturnValue({
      messages: [
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Running refinement...',
          timestamp: new Date().toISOString(),
          isStreaming: true,
          skillActivations: [
            {
              skillName: 'artifact-refiner',
              action: 'activated',
              toolName: 'apply-style'
            }
          ]
        }
      ],
      isRefining: true,
      sendRefinement: vi.fn(),
      clearMessages: vi.fn(),
      contextMessages: []
    })
  })

  it('renders streamed skill activation blocks in chat', () => {
    render(
      <ArtifactChatPanel
        artifact={{
          id: 'artifact-1',
          identifier: 'artifact-1',
          type: 'html',
          title: 'Artifact 1',
          content: '<div />',
          version: 1,
          conversationId: 'conv-1',
          messageId: 'msg-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          saved: false,
          tags: [],
          metadata: {
            tailwind: true,
            theme: 'auto'
          },
          status: 'complete' as any
        }}
      />
    )

    expect(screen.getByText('artifact-refiner')).toBeInTheDocument()
    expect(screen.getByText(/activated · apply-style/i)).toBeInTheDocument()
  })
})
