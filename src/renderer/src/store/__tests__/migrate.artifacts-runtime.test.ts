import { describe, expect, it } from 'vitest'

import migrate from '../migrate'

describe('settings migration 200 (artifacts runtime)', () => {
  it('initializes missing artifacts runtime settings and required types', async () => {
    const inboundState: any = {
      _persist: { version: 199, rehydrated: true },
      settings: {
        artifacts: {
          enabled: true,
          autoOpen: false,
          enabledTypes: ['html', 'react'],
          storageLimit: 50,
          react: {
            useSandpack: true,
            showEditor: false,
            showConsole: false,
            customBundlerUrl: '',
            dependencies: {}
          }
        }
      }
    }

    const migrated: any = await migrate(inboundState, 200)

    expect(migrated.settings.artifacts.enabledTypes).toContain('htmx')
    expect(migrated.settings.artifacts.enabledTypes).toContain('xhtml')
    expect(migrated.settings.artifacts.runtime).toEqual({
      profile: 'standard',
      allowCustomBundlerUrl: true,
      allowDynamicDependencies: true,
      allowExternalResources: true
    })
  })

  it('enforces basic profile guardrails during migration', async () => {
    const inboundState: any = {
      _persist: { version: 199, rehydrated: true },
      settings: {
        artifacts: {
          enabled: true,
          autoOpen: false,
          enabledTypes: ['htmx', 'html', 'xhtml', 'react'],
          storageLimit: 100,
          runtime: {
            profile: 'basic',
            allowCustomBundlerUrl: true,
            allowDynamicDependencies: true,
            allowExternalResources: true
          },
          react: {
            useSandpack: true,
            showEditor: false,
            showConsole: false,
            customBundlerUrl: '',
            dependencies: {}
          }
        }
      }
    }

    const migrated: any = await migrate(inboundState, 200)

    expect(migrated.settings.artifacts.runtime).toEqual({
      profile: 'basic',
      allowCustomBundlerUrl: false,
      allowDynamicDependencies: false,
      allowExternalResources: false
    })
  })
})
