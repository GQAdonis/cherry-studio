import { afterEach, describe, expect, it } from 'vitest'

import {
  clearAllArtifacts,
  cloneArtifactProject,
  createArtifact,
  createArtifactVersion,
  getArtifactProject,
  getArtifactStudioSession,
  getArtifactVersions,
  saveArtifact,
  saveArtifactProject,
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
          chatSnapshot: [],
          intent: 'extend'
        }
      ],
      currentVersionIndex: 0,
      activeIntent: 'fix',
      diagnostics: [
        {
          source: 'compiler',
          severity: 'error',
          message: 'Unexpected token',
          timestamp: new Date().toISOString()
        }
      ],
      updatedAt: new Date().toISOString()
    })

    const restored = await getArtifactStudioSession('project-1')

    expect(restored).toBeTruthy()
    expect(restored?.refinementMessages?.[0].skillActivations?.[0].skillName).toBe('artifact-refiner')
    expect(restored?.versionHistory?.[0].version).toBe(1)
    expect(restored?.currentVersionIndex).toBe(0)
    expect(restored?.activeIntent).toBe('fix')
    expect(restored?.diagnostics?.[0].message).toBe('Unexpected token')
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

  it('clones projects with artifact lineage and session history', async () => {
    const artifact = createArtifact({
      identifier: 'artifact-1',
      type: 'html',
      title: 'Artifact',
      content: '<div>hello</div>',
      conversationId: 'conv-1',
      messageId: 'msg-1',
      artifactProjectId: 'project-1'
    })
    await saveArtifact(artifact)
    await saveArtifactVersion(
      createArtifactVersion({
        artifactId: artifact.id,
        version: 1,
        content: artifact.content,
        intent: 'extend'
      })
    )
    await saveArtifactProject({
      id: 'project-1',
      title: 'Artifact Project',
      artifactType: 'html',
      source: 'chat',
      artifactId: artifact.id,
      runtimeProfile: 'standard',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastViewMode: 'preview',
      lastArtifactVersion: 1
    })
    await upsertArtifactStudioSession({
      id: 'session-project-1',
      projectId: 'project-1',
      artifactId: artifact.id,
      viewMode: 'preview',
      content: artifact.content,
      revisionPointer: 1,
      versionHistory: await getArtifactVersions(artifact.id),
      currentVersionIndex: 1,
      updatedAt: new Date().toISOString()
    })

    const cloned = await cloneArtifactProject('project-1', 'Artifact Fork')
    const clonedProject = cloned ? await getArtifactProject(cloned.id) : null
    const clonedSession = cloned ? await getArtifactStudioSession(cloned.id) : null

    expect(cloned).toBeTruthy()
    expect(clonedProject?.forkedFromProjectId).toBe('project-1')
    expect(clonedProject?.artifactId).not.toBe(artifact.id)
    expect(clonedSession?.artifactId).toBe(clonedProject?.artifactId)
    expect(clonedSession?.versionHistory?.every((version) => version.artifactId === clonedProject?.artifactId)).toBe(
      true
    )
  })
})
