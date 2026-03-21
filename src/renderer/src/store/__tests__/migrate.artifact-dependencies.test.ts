import { describe, expect, it } from 'vitest'

import migrate from '../migrate'

describe('settings migration 205 (artifact dependency cleanup)', () => {
  it('removes malformed artifact dependency entries and restores defaults', async () => {
    const inboundState: any = {
      _persist: { version: 204, rehydrated: true },
      settings: {
        artifacts: {
          react: {
            dependencies: {
              'framer-motion': '^11.0.0',
              'bad dependency': 'latest',
              axios: '\ncorrupted\n',
              '@scope/pkg': '^1.2.3'
            }
          }
        }
      }
    }

    const migrated: any = await migrate(inboundState, 205)

    expect(migrated.settings.artifacts.react.dependencies['framer-motion']).toBe('^11.0.0')
    expect(migrated.settings.artifacts.react.dependencies['@scope/pkg']).toBe('^1.2.3')
    expect(migrated.settings.artifacts.react.dependencies['@radix-ui/react-icons']).toBe('latest')
    expect(migrated.settings.artifacts.react.dependencies).not.toHaveProperty('bad dependency')
    expect(migrated.settings.artifacts.react.dependencies.axios).toBe('latest')
  })
})
