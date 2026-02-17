import { describe, expect, it } from 'vitest'

import migrate from '../migrate'

describe('settings migration 201 (artifact studio governance)', () => {
  it('initializes missing artifact studio settings', async () => {
    const inboundState: any = {
      _persist: { version: 200, rehydrated: true },
      settings: {
        artifacts: {
          enabled: true,
          autoOpen: false,
          enabledTypes: ['htmx', 'html'],
          storageLimit: 50,
          runtime: {
            profile: 'standard',
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

    const migrated: any = await migrate(inboundState, 201)

    expect(migrated.settings.artifacts.studio).toBeDefined()
    expect(migrated.settings.artifacts.studio.overridePolicy).toEqual({
      allowConversationOverride: true,
      allowProjectOverride: true
    })
    expect(migrated.settings.artifacts.studio.defaults.skills).toEqual({ mode: 'inherit' })
    expect(migrated.settings.artifacts.studio.defaults.knowledge).toEqual({
      knowledgeBaseIds: [],
      autoCreateFromChatHistory: false
    })
  })

  it('merges partial studio settings without dropping existing values', async () => {
    const inboundState: any = {
      _persist: { version: 200, rehydrated: true },
      settings: {
        artifacts: {
          studio: {
            overridePolicy: {
              allowConversationOverride: false
            },
            defaults: {
              skills: {
                mode: 'selected',
                selectedSkillIds: ['skill-a']
              },
              knowledge: {
                autoCreateFromChatHistory: true
              }
            }
          }
        }
      }
    }

    const migrated: any = await migrate(inboundState, 201)

    expect(migrated.settings.artifacts.studio.overridePolicy.allowConversationOverride).toBe(false)
    expect(migrated.settings.artifacts.studio.overridePolicy.allowProjectOverride).toBe(true)
    expect(migrated.settings.artifacts.studio.defaults.skills).toEqual({
      mode: 'selected',
      selectedSkillIds: ['skill-a']
    })
    expect(migrated.settings.artifacts.studio.defaults.knowledge).toEqual({
      knowledgeBaseIds: [],
      autoCreateFromChatHistory: true
    })
  })
})
