import { loggerService } from '@logger'
import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import type { BuiltinMCPServerName } from '@types'
import { BuiltinMCPServerNames } from '@types'

import BraveSearchServer from './brave-search'
import BrowserServer from './browser'
import BrowserAutomationServer from './browser-automation'
import DiDiMcpServer from './didi-mcp'
import DifyKnowledgeServer from './dify-knowledge'
import E2BServer from './e2b'
import FetchServer from './fetch'
import FileSystemServer from './filesystem'
import MemoryServer from './memory'
import MinAppControllerServer from './minapp-controller'
import PythonServer from './python'
import SDKBridgeServer from './sdk-bridge'
import ThinkingServer from './sequentialthinking'
import UnstructuredServer from './unstructured'


const logger = loggerService.withContext('MCPFactory')

export function createInMemoryMCPServer(
  name: BuiltinMCPServerName,
  args: string[] = [],
  envs: Record<string, string> = {}
): Server {
  logger.debug(`[MCP] Creating in-memory MCP server: ${name} with args: ${args} and envs: ${JSON.stringify(envs)}`)
  switch (name) {
    case BuiltinMCPServerNames.memory: {
      const envPath = envs.MEMORY_FILE_PATH
      return new MemoryServer(envPath).server
    }
    case BuiltinMCPServerNames.sequentialThinking: {
      return new ThinkingServer().server
    }
    case BuiltinMCPServerNames.braveSearch: {
      return new BraveSearchServer(envs.BRAVE_API_KEY).server
    }
    case BuiltinMCPServerNames.fetch: {
      return new FetchServer().server
    }
    case BuiltinMCPServerNames.filesystem: {
      return new FileSystemServer(envs.WORKSPACE_ROOT).server
    }
    case BuiltinMCPServerNames.difyKnowledge: {
      const difyKey = envs.DIFY_KEY
      return new DifyKnowledgeServer(difyKey, args).server
    }
    case BuiltinMCPServerNames.python: {
      return new PythonServer().server
    }
    case BuiltinMCPServerNames.didiMCP: {
      const apiKey = envs.DIDI_API_KEY
      return new DiDiMcpServer(apiKey).server
    }
    case BuiltinMCPServerNames.minappController: {
      return new MinAppControllerServer().server
    }
    case BuiltinMCPServerNames.browserAutomation: {
      return new BrowserAutomationServer().server
    }
    case BuiltinMCPServerNames.sdkBridge: {
      return new SDKBridgeServer().server
    }
    case BuiltinMCPServerNames.e2b: {
      const apiKey = envs.E2B_API_KEY || ''
      const apiUrl = envs.E2B_API_URL
      return new E2BServer(apiKey, apiUrl).server
    }
    case BuiltinMCPServerNames.unstructured: {
      const apiKey = envs.UNSTRUCTURED_API_KEY || ''
      const apiHost = envs.UNSTRUCTURED_API_URL
      return new UnstructuredServer(apiKey, apiHost).server
    }

    case BuiltinMCPServerNames.browser: {
      return new BrowserServer().server
    }
    default:
      throw new Error(`Unknown in-memory MCP server: ${name}`)
  }
}
