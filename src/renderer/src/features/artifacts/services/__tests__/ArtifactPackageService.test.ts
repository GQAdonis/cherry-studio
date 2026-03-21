import type { Artifact } from '@renderer/features/artifacts/types'
import { describe, expect, it } from 'vitest'

import {
  buildArtifactPackagePayload,
  parseArtifactPackage,
  serializeArtifactPackage,
  validateArtifactForDelivery
} from '../ArtifactPackageService'

function createArtifact(partial: Partial<Artifact> = {}): Artifact {
  return {
    id: 'artifact-1',
    identifier: 'artifact-1',
    type: 'html',
    title: 'Artifact',
    content: '<div>Hello</div>',
    version: 2,
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
    status: 'complete' as any,
    ...partial
  }
}

describe('ArtifactPackageService', () => {
  it('builds and parses package payload with manifest', () => {
    const payload = buildArtifactPackagePayload({
      artifact: createArtifact({ artifactProjectId: 'project-1' }),
      runtimeProfile: 'advanced',
      dependencies: { axios: 'latest' }
    })

    const serialized = serializeArtifactPackage(payload)
    const parsed = parseArtifactPackage(serialized)

    expect(parsed.manifest.artifactId).toBe('artifact-1')
    expect(parsed.manifest.projectId).toBe('project-1')
    expect(parsed.manifest.runtimeProfile).toBe('advanced')
    expect(parsed.manifest.exportTargets?.[0].id).toBe('html-package')
    expect(parsed.files['artifact.html']).toContain('Hello')
  })

  it('blocks invalid xhtml payloads from delivery', () => {
    const validation = validateArtifactForDelivery(
      createArtifact({
        type: 'xhtml',
        content: '<html><body><p>Broken</body></html>'
      })
    )

    expect(validation.isValid).toBe(false)
    expect(validation.issues.length).toBeGreaterThan(0)
  })

  it('validates structured A2UI delivery payloads', () => {
    const validation = validateArtifactForDelivery(
      createArtifact({
        type: 'a2ui',
        content: JSON.stringify({
          version: 1,
          type: 'page',
          title: 'Structured UI',
          children: []
        })
      })
    )

    expect(validation.isValid).toBe(true)
    expect(validation.issues).toEqual([])
  })
})
