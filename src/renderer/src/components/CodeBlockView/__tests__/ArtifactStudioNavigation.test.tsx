import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import HtmlArtifactsCard from '../HtmlArtifactsCard'
import ReactArtifactsCard from '../ReactArtifactsCard'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  getTopicMessages: vi.fn().mockResolvedValue([])
}))

vi.mock('@renderer/hooks/useAppNavigate', () => ({
  useAppNavigate: () => mocks.navigate,
  useAppParams: () => ({})
}))

vi.mock('@renderer/context/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'dark' })
}))

vi.mock('@renderer/hooks/useTopic', () => ({
  TopicManager: {
    getTopicMessages: mocks.getTopicMessages
  }
}))

vi.mock('../HtmlArtifactsPopup', () => ({
  default: () => null
}))

vi.mock('../ReactArtifactsPopup', () => ({
  default: () => null
}))

describe('Artifact Studio navigation from code artifact cards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('opens Artifact Studio from HTML card and seeds HTMX artifact context', async () => {
    mocks.getTopicMessages.mockResolvedValueOnce([
      { id: 'm1', role: 'user', content: 'hello' },
      { id: 'm2', role: 'assistant', content: 'world' }
    ])

    render(
      <HtmlArtifactsCard
        html={'<button hx-get="/api/items">Load</button>'}
        conversationId="topic-1"
        messageId="block-1"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /artifact studio|文物工作室/i }))

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledOnce()
    })
    const studioPath = mocks.navigate.mock.calls[0][0] as string
    expect(studioPath).toMatch(/^\/artifacts\/studio\/chat-/)
    expect(mocks.getTopicMessages).toHaveBeenCalledWith('topic-1')

    const projectId = studioPath.split('/').pop()!
    const seed = JSON.parse(sessionStorage.getItem(`artifact-project-seed:${projectId}`) || '{}')

    expect(seed.conversationId).toBe('topic-1')
    expect(seed.messageId).toBe('block-1')
    expect(seed.artifact.type).toBe('htmx')
    expect(seed.artifact.content).toContain('hx-get')
    expect(seed.contextEnvelope).toBeDefined()
    expect(seed.contextEnvelope.source.conversationId).toBe('topic-1')
    expect(seed.contextEnvelope.source.messageId).toBe('block-1')
    expect(Array.isArray(seed.sourceKnowledgeBaseIds)).toBe(true)
  })

  it('opens Artifact Studio from React card and seeds React artifact context', async () => {
    mocks.getTopicMessages.mockResolvedValueOnce([{ id: 'm1', role: 'user', content: 'refine this component' }])

    render(
      <ReactArtifactsCard
        code={'export default function App(){ return <div>Hello</div> }'}
        language="tsx"
        conversationId="topic-2"
        messageId="block-2"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /artifact studio|文物工作室/i }))

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledOnce()
    })
    const studioPath = mocks.navigate.mock.calls[0][0] as string
    expect(studioPath).toMatch(/^\/artifacts\/studio\/chat-/)
    expect(mocks.getTopicMessages).toHaveBeenCalledWith('topic-2')

    const projectId = studioPath.split('/').pop()!
    const seed = JSON.parse(sessionStorage.getItem(`artifact-project-seed:${projectId}`) || '{}')

    expect(seed.conversationId).toBe('topic-2')
    expect(seed.messageId).toBe('block-2')
    expect(seed.artifact.type).toBe('react')
    expect(seed.artifact.content).toContain('export default')
    expect(seed.contextEnvelope).toBeDefined()
    expect(seed.contextEnvelope.source.conversationId).toBe('topic-2')
    expect(seed.contextEnvelope.source.messageId).toBe('block-2')
  })
})
