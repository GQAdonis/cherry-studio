import settingsReducer, {
  initialState,
  setArtifactReactDependencies,
  setArtifactReactDependency
} from '@renderer/store/settings'
import { describe, expect, it } from 'vitest'

describe('settings artifact dependency sanitization', () => {
  it('sanitizes bulk dependency updates and preserves defaults', () => {
    const state = settingsReducer(
      initialState,
      setArtifactReactDependencies({
        'framer-motion': '^11.0.0',
        ' bad dependency ': 'latest',
        [Array.from({ length: 400 }, () => 'x').join('')]: 'latest',
        axios: '   ',
        '@scope/pkg': '^1.2.3'
      })
    )

    expect(state.artifacts.react.dependencies['framer-motion']).toBe('^11.0.0')
    expect(state.artifacts.react.dependencies['@scope/pkg']).toBe('^1.2.3')
    expect(state.artifacts.react.dependencies['@radix-ui/react-icons']).toBe('latest')
    expect(state.artifacts.react.dependencies).not.toHaveProperty(' bad dependency ')
    expect(state.artifacts.react.dependencies).not.toHaveProperty('axios', '   ')
  })

  it('ignores invalid single dependency updates', () => {
    const state = settingsReducer(
      initialState,
      setArtifactReactDependency({
        name: 'invalid dependency name with spaces',
        version: '^1.0.0'
      })
    )

    expect(state.artifacts.react.dependencies).toEqual(initialState.artifacts.react.dependencies)
  })
})
