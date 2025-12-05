#!/usr/bin/env node
/**
 * Extended E2B MCP Server
 *
 * This server extends the standard E2B MCP server with file operations:
 * - run_code: Execute Python code in the sandbox
 * - list_files: List files in a directory
 * - read_file: Read file contents (returns base64 for binary files)
 * - write_file: Write content to a file
 * - download_file: Get a download URL for a file
 * - upload_file: Upload file content to sandbox
 * - delete_file: Delete a file from sandbox
 * - make_directory: Create a directory
 */

import { Sandbox } from '@e2b/code-interpreter'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool as ToolSchema
} from '@modelcontextprotocol/sdk/types.js'
import * as z from 'zod'

// Schema definitions for tool inputs
const RunCodeSchema = z.object({
  code: z.string().describe('Python code to execute')
})

const ListFilesSchema = z.object({
  path: z.string().default('/').describe('Directory path to list')
})

const ReadFileSchema = z.object({
  path: z.string().describe('Path to the file to read'),
  encoding: z.enum(['utf8', 'base64']).default('utf8').describe('Encoding for output')
})

const WriteFileSchema = z.object({
  path: z.string().describe('Path to write the file'),
  content: z.string().describe('Content to write (string or base64)'),
  encoding: z.enum(['utf8', 'base64']).default('utf8').describe('Encoding of the content')
})

const DownloadFileSchema = z.object({
  path: z.string().describe('Path to the file to get download URL for')
})

const DeleteFileSchema = z.object({
  path: z.string().describe('Path to the file to delete')
})

const MakeDirectorySchema = z.object({
  path: z.string().describe('Path of the directory to create')
})

// Sandbox management
let sandbox: Sandbox | null = null

async function getSandbox(): Promise<Sandbox> {
  if (!sandbox) {
    sandbox = await Sandbox.create()
    console.error(`Created new sandbox: ${sandbox.sandboxId}`)
  }
  return sandbox
}

// Tool definitions
const tools: ToolSchema[] = [
  {
    name: 'run_code',
    description:
      'Execute Python code in a secure E2B sandbox. The code runs in a Jupyter-like environment with persistent state.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Python code to execute' }
      },
      required: ['code']
    }
  },
  {
    name: 'list_files',
    description: 'List files and directories in the sandbox at the specified path',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path to list', default: '/' }
      }
    }
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file from the sandbox. Returns text for text files, base64 for binary files.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to read' },
        encoding: { type: 'string', enum: ['utf8', 'base64'], default: 'utf8', description: 'Output encoding' }
      },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description: 'Write content to a file in the sandbox',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to write the file' },
        content: { type: 'string', description: 'Content to write' },
        encoding: { type: 'string', enum: ['utf8', 'base64'], default: 'utf8', description: 'Encoding of the content' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'download_url',
    description:
      'Get a public download URL for a file in the sandbox. This URL can be used to download the file directly.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file' }
      },
      required: ['path']
    }
  },
  {
    name: 'delete_file',
    description: 'Delete a file from the sandbox',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to delete' }
      },
      required: ['path']
    }
  },
  {
    name: 'make_directory',
    description: 'Create a directory in the sandbox',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path of the directory to create' }
      },
      required: ['path']
    }
  },
  {
    name: 'get_sandbox_info',
    description: 'Get information about the current sandbox including its ID and host',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
]

// Create MCP server
const server = new Server(
  {
    name: 'e2b-extended-mcp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
)

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools }
})

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    const sbx = await getSandbox()

    switch (name) {
      case 'run_code': {
        const { code } = RunCodeSchema.parse(args)
        const result = await sbx.runCode(code)

        // Format the result
        const output: any = {
          text: result.text,
          stdout: result.logs.stdout.join('\n'),
          stderr: result.logs.stderr.join('\n')
        }

        // Include any results (charts, images, etc.)
        if (result.results && result.results.length > 0) {
          output.results = result.results.map((r: any) => {
            if (r.png) return { type: 'image/png', data: r.png }
            if (r.jpeg) return { type: 'image/jpeg', data: r.jpeg }
            if (r.svg) return { type: 'image/svg+xml', data: r.svg }
            if (r.html) return { type: 'text/html', data: r.html }
            if (r.json) return { type: 'application/json', data: r.json }
            return r
          })
        }

        // Handle errors
        if (result.error) {
          output.error = {
            name: result.error.name,
            value: result.error.value,
            traceback: result.error.traceback
          }
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }]
        }
      }

      case 'list_files': {
        const { path } = ListFilesSchema.parse(args)
        const files = await sbx.files.list(path)
        return {
          content: [{ type: 'text', text: JSON.stringify(files, null, 2) }]
        }
      }

      case 'read_file': {
        const { path, encoding } = ReadFileSchema.parse(args)
        const content = await sbx.files.read(path)

        if (encoding === 'base64') {
          // Convert to base64 if requested
          const base64 = Buffer.from(content).toString('base64')
          return {
            content: [{ type: 'text', text: base64 }]
          }
        }

        // Try to return as text, fall back to base64 for binary
        try {
          const text = typeof content === 'string' ? content : new TextDecoder().decode(content)
          return {
            content: [{ type: 'text', text }]
          }
        } catch {
          const base64 = Buffer.from(content).toString('base64')
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ encoding: 'base64', data: base64 })
              }
            ]
          }
        }
      }

      case 'write_file': {
        const { path, content, encoding } = WriteFileSchema.parse(args)
        const data = encoding === 'base64' ? Buffer.from(content, 'base64') : content
        await sbx.files.write(path, data)
        return {
          content: [{ type: 'text', text: `Successfully wrote to ${path}` }]
        }
      }

      case 'download_url': {
        const { path } = DownloadFileSchema.parse(args)
        const url = sbx.downloadUrl(path)
        return {
          content: [{ type: 'text', text: JSON.stringify({ url, path }) }]
        }
      }

      case 'delete_file': {
        const { path } = DeleteFileSchema.parse(args)
        await sbx.files.remove(path)
        return {
          content: [{ type: 'text', text: `Successfully deleted ${path}` }]
        }
      }

      case 'make_directory': {
        const { path } = MakeDirectorySchema.parse(args)
        await sbx.files.makeDir(path)
        return {
          content: [{ type: 'text', text: `Successfully created directory ${path}` }]
        }
      }

      case 'get_sandbox_info': {
        const info = {
          sandboxId: sbx.sandboxId,
          host: sbx.getHost(3000)
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(info, null, 2) }]
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    }
  }
})

// Cleanup on exit
async function cleanup() {
  if (sandbox) {
    console.error('Cleaning up sandbox...')
    await sandbox.kill()
    sandbox = null
  }
}

process.on('SIGINT', async () => {
  await cleanup()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await cleanup()
  process.exit(0)
})

// Start server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('E2B Extended MCP Server started')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
