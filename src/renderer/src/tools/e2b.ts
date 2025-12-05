import type { MCPTool } from '@renderer/types'

export const e2bTool: MCPTool = {
  id: 'builtin-e2b',
  serverId: 'builtin',
  serverName: 'Built-in Tools',
  name: 'execute_code_in_e2b',
  description:
    'Execute Python code in a secure E2B cloud sandbox. Perfect for data analysis, creating visualizations, running calculations, processing files, and any Python-based tasks. The sandbox provides a persistent Jupyter-like environment with common data science libraries pre-installed. Any files created can be downloaded via URLs provided in the response.',
  isBuiltIn: true,
  type: 'mcp',
  inputSchema: {
    type: 'object',
    title: 'E2B Code Execution',
    description: 'Execute Python code in a secure E2B sandbox',
    required: ['code'],
    properties: {
      code: {
        type: 'string',
        description:
          'Python code to execute in the sandbox. Can use common libraries like pandas, numpy, matplotlib, etc.'
      },
      session_id: {
        type: 'string',
        description:
          'Optional session identifier for persistent sandboxes. Use the same session_id to reuse the same sandbox and maintain state across multiple executions.'
      },
      timeout: {
        type: 'number',
        description:
          'Optional execution timeout in milliseconds. Overrides the default timeout configured in settings.',
        default: 300000
      },
      env_vars: {
        type: 'object',
        description:
          'Optional environment variables to set for this execution. Useful for passing configuration or secrets.',
        additionalProperties: {
          type: 'string'
        }
      }
    }
  }
}
