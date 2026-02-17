import { describe, expect, it } from 'vitest'

import reducer, {
  addRefinementMessage,
  openExistingArtifact,
  setActiveProjectId,
  setActiveStudioSessionId,
  setRefinementMessages,
  setVersionHistoryState,
  updateRefinementMessage
} from '../artifacts'

describe('artifacts refinement message identity', () => {
  it('preserves provided assistant message id so streaming updates can target it', () => {
    const created = reducer(
      undefined,
      addRefinementMessage({
        id: 'assistant-stream-1',
        role: 'assistant',
        content: '',
        isStreaming: true
      } as any)
    )

    const updated = reducer(
      created,
      updateRefinementMessage({
        id: 'assistant-stream-1',
        content: 'streamed update'
      })
    )

    expect(updated.refinementMessages).toHaveLength(1)
    expect(updated.refinementMessages[0].id).toBe('assistant-stream-1')
    expect(updated.refinementMessages[0].content).toBe('streamed update')
  })

  it('tracks standalone studio project/session identifiers for reopen flow', () => {
    const artifact = {
      id: 'artifact-1',
      identifier: 'artifact-1',
      type: 'html',
      title: 'Artifact',
      content: '<div />',
      version: 1,
      conversationId: 'conv-1',
      messageId: 'msg-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      saved: false,
      tags: [],
      metadata: { tailwind: true, theme: 'auto' as const, artifactProjectId: 'project-1' },
      status: 'complete'
    } as any

    const opened = reducer(undefined, openExistingArtifact(artifact))
    const withProject = reducer(opened, setActiveProjectId('project-1'))
    const withSession = reducer(withProject, setActiveStudioSessionId('session-1'))

    expect(withSession.activeProjectId).toBe('project-1')
    expect(withSession.activeStudioSessionId).toBe('session-1')
    expect(withSession.activeArtifact?.metadata.artifactProjectId).toBe('project-1')
  })

  it('hydrates persisted refinement messages and version navigation state', () => {
    const withMessages = reducer(
      undefined,
      setRefinementMessages([
        {
          id: 'assistant-restore-1',
          role: 'assistant',
          content: 'restored',
          timestamp: new Date().toISOString()
        } as any
      ])
    )

    const withVersions = reducer(
      withMessages,
      setVersionHistoryState({
        versionHistory: [
          {
            id: 'v-1',
            artifactId: 'artifact-1',
            version: 1,
            content: '<div>v1</div>',
            createdAt: new Date().toISOString()
          }
        ],
        currentVersionIndex: 0
      } as any)
    )

    expect(withVersions.refinementMessages).toHaveLength(1)
    expect(withVersions.refinementMessages[0].id).toBe('assistant-restore-1')
    expect(withVersions.versionHistory).toHaveLength(1)
    expect(withVersions.currentVersionIndex).toBe(0)
  })
})
