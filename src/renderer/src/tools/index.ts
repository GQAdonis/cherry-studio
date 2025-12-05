import type { MCPTool } from '@renderer/types'

import { e2bTool } from './e2b'
import { thinkTool } from './think'
import { unstructuredTool } from './unstructured'

export const BUILT_IN_TOOLS: MCPTool[] = [thinkTool, unstructuredTool, e2bTool]

export function getBuiltInTool(name: string): MCPTool | undefined {
  return BUILT_IN_TOOLS.find((tool) => tool.name === name || tool.id === name)
}

export function isBuiltInTool(tool: MCPTool): boolean {
  return tool.isBuiltIn === true
}

export * from './e2b'
export * from './think'
export * from './unstructured'
