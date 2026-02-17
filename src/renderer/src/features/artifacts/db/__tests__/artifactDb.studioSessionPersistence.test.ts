import { afterEach, describe, expect, it } from 'vitest'

import {
  clearAllArtifacts,
  createArtifactVersion,
  getArtifactStudioSession,
  getArtifactVersions,
  saveArtifactVersion,
  upsertArtifactStudioSession
} from '../artifactDb'

describe('artifactDb studio persistence', () => {
  afterEach(async () => {
    await clearAllArtifacts()
  })

  it('persists refinement chat and version navigation state in studio session', async () => {
    await upsertArtifactStudioSession({
      id: 'session-1',
      projectId: 'project-1',
      artifactId: 'artifact-1',
      viewMode: 'split',
      content: '<div>hello</div>',
      revisionPointer: 3,
      refinementMessages: [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'hello',
          timestamp: new Date().toISOString(),
          skillActivations: [{ skillName: 'artifact-refiner', action: 'activated' }]
        }
      ],
      versionHistory: [
        {
          id: 'v-1',
          artifactId: 'artifact-1',
          version: 1,
          content: '<div>v1</div>',
          createdAt: new Date().toISOString(),
          chatSnapshot: []
        }
      ],
      currentVersionIndex: 0,
      updatedAt: new Date().toISOString()
    })

    const restored = await getArtifactStudioSession('project-1')

    expect(restored).toBeTruthy()
    expect(restored?.refinementMessages?.[0].skillActivations?.[0].skillName).toBe('artifact-refiner')
    expect(restored?.versionHistory?.[0].version).toBe(1)
    expect(restored?.currentVersionIndex).toBe(0)
  })

  it('persists version chatSnapshot metadata for version-linked history', async () => {
    const version = createArtifactVersion({
      artifactId: 'artifact-1',
      version: 2,
      content: '<div>v2</div>',
      refinementPrompt: 'refine',
      chatSnapshot: [
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Applied refinement',
          timestamp: new Date().toISOString()
        }
      ]
    })

    await saveArtifactVersion(version)

    const versions = await getArtifactVersions('artifact-1')
    expect(versions).toHaveLength(1)
    expect(versions[0].chatSnapshot?.[0].content).toBe('Applied refinement')
  })
})
