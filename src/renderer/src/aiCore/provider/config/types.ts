import type { Model, Provider } from '@renderer/types'

export interface RuleSet {
  rules: Array<{
    match: (model: Model) => boolean
    provider: (provider: Provider, model?: Model) => Provider
  }>
  fallbackRule: (provider: Provider, model?: Model) => Provider
}
