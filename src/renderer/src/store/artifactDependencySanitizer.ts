const MAX_ARTIFACT_DEPENDENCY_NAME_LENGTH = 214
const MAX_ARTIFACT_DEPENDENCY_VERSION_LENGTH = 120

const ARTIFACT_DEPENDENCY_NAME_REGEX = /^(?:@[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?\/)?[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/i

export function sanitizeArtifactDependencyName(name: unknown): string | undefined {
  if (typeof name !== 'string') {
    return undefined
  }

  const trimmedName = name.trim()
  if (
    !trimmedName ||
    trimmedName.length > MAX_ARTIFACT_DEPENDENCY_NAME_LENGTH ||
    !ARTIFACT_DEPENDENCY_NAME_REGEX.test(trimmedName)
  ) {
    return undefined
  }

  return trimmedName
}

export function sanitizeArtifactDependencyVersion(version: unknown): string | undefined {
  if (typeof version !== 'string') {
    return undefined
  }

  if (/[\r\n\t]/.test(version)) {
    return undefined
  }

  const trimmedVersion = version.trim()
  if (!trimmedVersion || trimmedVersion.length > MAX_ARTIFACT_DEPENDENCY_VERSION_LENGTH) {
    return undefined
  }

  return trimmedVersion
}

export function sanitizeArtifactDependencies(
  dependencies: unknown,
  fallbackDependencies: Record<string, string> = {}
): Record<string, string> {
  if (!dependencies || typeof dependencies !== 'object' || Array.isArray(dependencies)) {
    return { ...fallbackDependencies }
  }

  const sanitizedDependencies: Record<string, string> = {}

  for (const [name, version] of Object.entries(dependencies)) {
    const sanitizedName = sanitizeArtifactDependencyName(name)
    const sanitizedVersion = sanitizeArtifactDependencyVersion(version)

    if (!sanitizedName || !sanitizedVersion) {
      continue
    }

    sanitizedDependencies[sanitizedName] = sanitizedVersion
  }

  return {
    ...fallbackDependencies,
    ...sanitizedDependencies
  }
}
