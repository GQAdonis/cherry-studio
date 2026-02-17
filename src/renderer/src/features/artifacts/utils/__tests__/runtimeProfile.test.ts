import { describe, expect, it } from 'vitest'

import { resolveArtifactRuntimePolicy } from '../runtimeProfile'

describe('resolveArtifactRuntimePolicy', () => {
  it('locks risky controls in basic profile', () => {
    const policy = resolveArtifactRuntimePolicy({ profile: 'basic' })

    expect(policy.allowCustomBundlerUrl).toBe(false)
    expect(policy.allowDynamicDependencies).toBe(false)
    expect(policy.allowExternalResources).toBe(false)
  })

  it('allows advanced controls only when advanced profile is selected', () => {
    const standard = resolveArtifactRuntimePolicy({ profile: 'standard', allowCustomBundlerUrl: true })
    const advanced = resolveArtifactRuntimePolicy({ profile: 'advanced', allowCustomBundlerUrl: true })

    expect(standard.allowCustomBundlerUrl).toBe(false)
    expect(advanced.allowCustomBundlerUrl).toBe(true)
  })
})
