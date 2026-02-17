import type { Artifact } from '../types'
import type {
  ArtifactPackageManifest,
  ArtifactPackagePayload,
  ArtifactRuntimeProfile,
  ArtifactValidationState
} from '../types'
import { getArtifactExtension, getArtifactMimeType } from '../types'
import { validateXhtmlContent } from '../utils/xhtmlValidation'

export function validateArtifactForDelivery(artifact: Artifact): ArtifactValidationState {
  if (artifact.type === 'xhtml') {
    return validateXhtmlContent(artifact.content)
  }

  return {
    isValid: true,
    issues: [],
    validatedAt: new Date().toISOString()
  }
}

export function buildArtifactPackagePayload(params: {
  artifact: Artifact
  runtimeProfile: ArtifactRuntimeProfile
  dependencies?: Record<string, string>
}): ArtifactPackagePayload {
  const { artifact, runtimeProfile, dependencies = {} } = params
  const extension = getArtifactExtension(artifact.type, artifact.metadata.language)

  const manifest: ArtifactPackageManifest = {
    packageVersion: 1,
    artifactId: artifact.id,
    projectId: artifact.artifactProjectId || artifact.metadata.artifactProjectId,
    title: artifact.title,
    type: artifact.type,
    mimeType: artifact.metadata.mimeType || getArtifactMimeType(artifact.type),
    runtimeProfile,
    dependencies,
    artifactVersion: artifact.version,
    createdAt: artifact.createdAt,
    updatedAt: artifact.updatedAt,
    provenance: artifact.metadata.provenance
  }

  return {
    manifest,
    files: {
      [`artifact.${extension}`]: artifact.content
    }
  }
}

export function serializeArtifactPackage(payload: ArtifactPackagePayload): string {
  return JSON.stringify(payload, null, 2)
}

export function parseArtifactPackage(serialized: string): ArtifactPackagePayload {
  const parsed = JSON.parse(serialized) as ArtifactPackagePayload
  if (!parsed.manifest || !parsed.files) {
    throw new Error('Invalid artifact package payload.')
  }
  return parsed
}
