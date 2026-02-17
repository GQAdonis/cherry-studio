export type ArtifactRuntimeProfile = 'basic' | 'standard' | 'advanced'

export interface ArtifactRuntimeSettings {
  profile?: ArtifactRuntimeProfile
  allowCustomBundlerUrl?: boolean
  allowDynamicDependencies?: boolean
  allowExternalResources?: boolean
}

export interface ResolvedArtifactRuntimePolicy {
  profile: ArtifactRuntimeProfile
  allowCustomBundlerUrl: boolean
  allowDynamicDependencies: boolean
  allowExternalResources: boolean
}

export function resolveArtifactRuntimePolicy(settings?: ArtifactRuntimeSettings): ResolvedArtifactRuntimePolicy {
  const profile = settings?.profile || 'standard'
  const allowDynamicDependencies = settings?.allowDynamicDependencies ?? profile !== 'basic'
  const allowExternalResources = settings?.allowExternalResources ?? profile !== 'basic'

  // Custom bundler access is restricted to advanced profile.
  const allowCustomBundlerUrl = profile === 'advanced' && (settings?.allowCustomBundlerUrl ?? true)

  return {
    profile,
    allowCustomBundlerUrl,
    allowDynamicDependencies,
    allowExternalResources
  }
}
