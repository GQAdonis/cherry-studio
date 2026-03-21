import type { Artifact } from '../types'
import type {
  ArtifactPackageManifest,
  ArtifactPackagePayload,
  ArtifactRuntimeProfile,
  ArtifactValidationState
} from '../types'
import { getArtifactExtension, getArtifactMimeType } from '../types'
import { validateXhtmlContent } from '../utils/xhtmlValidation'

function validateA2uiContent(content: string): ArtifactValidationState {
  try {
    const parsed = JSON.parse(content) as { version?: number; type?: string; children?: unknown[] }
    const issues: string[] = []
    if (parsed.version !== 1) {
      issues.push('A2UI schema version must be 1.')
    }
    if (parsed.type !== 'page') {
      issues.push('A2UI root node must be of type "page".')
    }
    if (!Array.isArray(parsed.children)) {
      issues.push('A2UI root node must define a children array.')
    }
    return {
      isValid: issues.length === 0,
      issues,
      validatedAt: new Date().toISOString()
    }
  } catch {
    return {
      isValid: false,
      issues: ['A2UI artifact content must be valid JSON.'],
      validatedAt: new Date().toISOString()
    }
  }
}

export function validateArtifactForDelivery(artifact: Artifact): ArtifactValidationState {
  if (artifact.type === 'xhtml') {
    return validateXhtmlContent(artifact.content)
  }

  if (artifact.type === 'a2ui') {
    return validateA2uiContent(artifact.content)
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
  const exportFormat =
    artifact.type === 'react' || artifact.type === 'htmx' || artifact.type === 'a2ui' ? artifact.type : 'html'

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
    artifactVersionId: artifact.metadata.provenance?.sourceRevisionId || artifact.metadata.provenance?.revisionParentId,
    selectedExportTarget: `${artifact.type}-package`,
    exportTargets:
      artifact.metadata.exportTargets && artifact.metadata.exportTargets.length > 0
        ? artifact.metadata.exportTargets
        : [
            {
              id: `${artifact.type}-package`,
              label: `Package ${artifact.type.toUpperCase()} artifact`,
              format: exportFormat,
              recommended: true
            }
          ],
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
