import { Sandbox } from '@e2b/code-interpreter'
import { loggerService } from '@logger'
import type { E2BOptions } from '@types'
import type { IpcMainInvokeEvent } from 'electron'

import { reduxService } from './ReduxService'

const logger = loggerService.withContext('E2BService')

interface E2BExecuteOptions {
  code: string
  sessionId?: string
  timeout?: number
  envVars?: Record<string, string>
}

interface E2BFileOptions {
  path: string
  encoding?: 'utf8' | 'base64'
}

interface E2BWriteFileOptions {
  path: string
  content: string
  encoding?: 'utf8' | 'base64'
}

interface ExecuteCodeResult {
  text: string
  stdout: string
  stderr: string
  results?: Array<{
    type: string
    data: string
  }>
  error?: {
    name: string
    value: string
    traceback: string
  }
  files?: Array<{
    path: string
    downloadUrl: string
  }>
}

interface SandboxInfo {
  sandboxId: string
  host: string
  mode: 'per-session' | 'persistent'
}

class E2BService {
  private static instance: E2BService
  private sandboxes: Map<string, Sandbox> = new Map()
  private persistentSandbox: Sandbox | null = null

  private constructor() {}

  public static getInstance(): E2BService {
    if (!E2BService.instance) {
      E2BService.instance = new E2BService()
    }
    return E2BService.instance
  }

  /**
   * Get E2B configuration from Redux state
   */
  private async getProviderConfig(): Promise<{ apiKey?: string; apiUrl?: string; options?: E2BOptions }> {
    const state = await reduxService.getState()
    const e2bConfig = state.e2b || {}

    return {
      apiKey: e2bConfig.apiKey,
      apiUrl: e2bConfig.apiHost,
      options: e2bConfig.options as E2BOptions | undefined
    }
  }

  /**
   * Create or get a sandbox based on configuration
   */
  private async getSandbox(sessionId?: string): Promise<Sandbox> {
    const { apiKey, apiUrl, options } = await this.getProviderConfig()

    if (!apiKey) {
      throw new Error('E2B API key is required. Please configure it in settings.')
    }

    const sandboxMode = options?.sandboxMode || 'per-session'
    const timeout = options?.timeout || 300000 // 5 minutes default
    const template = options?.template

    // Configuration for E2B client
    const config: any = {
      apiKey,
      timeoutMs: timeout
    }

    // Add custom API URL if provided (for self-hosted)
    if (apiUrl && apiUrl !== 'https://api.e2b.dev') {
      config.baseUrl = apiUrl
    }

    // Add custom template if provided
    if (template) {
      config.template = template
    }

    // Persistent mode: reuse sandbox across sessions
    if (sandboxMode === 'persistent') {
      if (!this.persistentSandbox) {
        logger.info('Creating persistent E2B sandbox')
        this.persistentSandbox = await Sandbox.create(config)
        logger.info(`Persistent sandbox created: ${this.persistentSandbox.sandboxId}`)
      }
      return this.persistentSandbox
    }

    // Per-session mode: one sandbox per session
    if (sessionId) {
      let sandbox = this.sandboxes.get(sessionId)
      if (!sandbox) {
        logger.info(`Creating E2B sandbox for session: ${sessionId}`)
        sandbox = await Sandbox.create(config)
        this.sandboxes.set(sessionId, sandbox)
        logger.info(`Sandbox created for session ${sessionId}: ${sandbox.sandboxId}`)
      }
      return sandbox
    }

    // Fallback: create temporary sandbox
    logger.info('Creating temporary E2B sandbox')
    const sandbox = await Sandbox.create(config)
    logger.info(`Temporary sandbox created: ${sandbox.sandboxId}`)
    return sandbox
  }

  /**
   * Execute Python code in E2B sandbox
   */
  public async executeCode(
    _event: IpcMainInvokeEvent,
    codeOrOptions: string | E2BExecuteOptions
  ): Promise<ExecuteCodeResult> {
    try {
      // Handle both string and object parameters for backward compatibility
      const code = typeof codeOrOptions === 'string' ? codeOrOptions : codeOrOptions.code
      const sessionId = typeof codeOrOptions === 'object' ? codeOrOptions.sessionId : undefined
      const timeout = typeof codeOrOptions === 'object' ? codeOrOptions.timeout : undefined
      const envVars = typeof codeOrOptions === 'object' ? codeOrOptions.envVars : undefined

      logger.info(`Executing code in E2B sandbox${sessionId ? ` (session: ${sessionId})` : ''}`)

      const sandbox = await this.getSandbox(sessionId)

      // Execute code with optional environment variables
      const execution = await sandbox.runCode(code, {
        onStderr: (data) => logger.debug('E2B stderr:', data),
        onStdout: (data) => logger.debug('E2B stdout:', data),
        envs: envVars,
        timeoutMs: timeout
      })

      // Process results (charts, images, etc.)
      const results = execution.results?.map((r: any) => {
        if (r.png) return { type: 'image/png', data: r.png }
        if (r.jpeg) return { type: 'image/jpeg', data: r.jpeg }
        if (r.svg) return { type: 'image/svg+xml', data: r.svg }
        if (r.html) return { type: 'text/html', data: r.html }
        if (r.json) return { type: 'application/json', data: JSON.stringify(r.json) }
        return { type: 'unknown', data: JSON.stringify(r) }
      })

      const result: ExecuteCodeResult = {
        text: execution.text || '',
        stdout: execution.logs.stdout.join('\n'),
        stderr: execution.logs.stderr.join('\n'),
        results
      }

      // Add error info if execution failed
      if (execution.error) {
        result.error = {
          name: execution.error.name,
          value: execution.error.value,
          traceback: execution.error.traceback
        }
      }

      logger.info('Code execution completed successfully')
      return result
    } catch (error) {
      logger.error('Code execution failed:', error as Error)
      throw error
    }
  }

  /**
   * List files in sandbox directory
   */
  public async listFiles(
    _event: IpcMainInvokeEvent,
    path: string = '/',
    sessionId?: string
  ): Promise<Array<{ name: string; type: 'file' | 'dir' }>> {
    try {
      logger.info(`Listing files in: ${path}`)
      const sandbox = await this.getSandbox(sessionId)
      const files = await sandbox.files.list(path)
      // Map E2B EntryInfo to our expected format
      return files.map((f) => ({
        name: f.name,
        type: (f.type === 'dir' ? 'dir' : 'file') as 'file' | 'dir'
      }))
    } catch (error) {
      logger.error('Failed to list files:', error as Error)
      throw error
    }
  }

  /**
   * Read file content from sandbox
   */
  public async readFile(_event: IpcMainInvokeEvent, options: E2BFileOptions, sessionId?: string): Promise<string> {
    try {
      logger.info(`Reading file: ${options.path}`)
      const sandbox = await this.getSandbox(sessionId)
      const content = await sandbox.files.read(options.path)

      if (options.encoding === 'base64') {
        return Buffer.from(content).toString('base64')
      }

      // Try to return as text, fall back to base64 for binary
      try {
        return typeof content === 'string' ? content : new TextDecoder().decode(content)
      } catch {
        return Buffer.from(content).toString('base64')
      }
    } catch (error) {
      logger.error('Failed to read file:', error as Error)
      throw error
    }
  }

  /**
   * Write content to file in sandbox
   */
  public async writeFile(
    _event: IpcMainInvokeEvent,
    options: E2BWriteFileOptions,
    sessionId?: string
  ): Promise<{ success: boolean; path: string }> {
    try {
      logger.info(`Writing file: ${options.path}`)
      const sandbox = await this.getSandbox(sessionId)
      const data = options.encoding === 'base64' ? Buffer.from(options.content, 'base64').buffer : options.content
      await sandbox.files.write(options.path, data)
      return { success: true, path: options.path }
    } catch (error) {
      logger.error('Failed to write file:', error as Error)
      throw error
    }
  }

  /**
   * Get public download URL for a file
   */
  public async getDownloadUrl(
    _event: IpcMainInvokeEvent,
    path: string,
    sessionId?: string
  ): Promise<{ url: string; path: string }> {
    try {
      logger.info(`Getting download URL for: ${path}`)
      const sandbox = await this.getSandbox(sessionId)
      const url = await sandbox.downloadUrl(path)
      return { url, path }
    } catch (error) {
      logger.error('Failed to get download URL:', error as Error)
      throw error
    }
  }

  /**
   * Delete file from sandbox
   */
  public async deleteFile(
    _event: IpcMainInvokeEvent,
    path: string,
    sessionId?: string
  ): Promise<{ success: boolean; path: string }> {
    try {
      logger.info(`Deleting file: ${path}`)
      const sandbox = await this.getSandbox(sessionId)
      await sandbox.files.remove(path)
      return { success: true, path }
    } catch (error) {
      logger.error('Failed to delete file:', error as Error)
      throw error
    }
  }

  /**
   * Create directory in sandbox
   */
  public async makeDirectory(
    _event: IpcMainInvokeEvent,
    path: string,
    sessionId?: string
  ): Promise<{ success: boolean; path: string }> {
    try {
      logger.info(`Creating directory: ${path}`)
      const sandbox = await this.getSandbox(sessionId)
      await sandbox.files.makeDir(path)
      return { success: true, path }
    } catch (error) {
      logger.error('Failed to create directory:', error as Error)
      throw error
    }
  }

  /**
   * Get sandbox information
   */
  public async getSandboxInfo(_event: IpcMainInvokeEvent, sessionId?: string): Promise<SandboxInfo> {
    try {
      const { options } = await this.getProviderConfig()
      const sandbox = await this.getSandbox(sessionId)
      return {
        sandboxId: sandbox.sandboxId,
        host: sandbox.getHost(3000),
        mode: options?.sandboxMode || 'per-session'
      }
    } catch (error) {
      logger.error('Failed to get sandbox info:', error as Error)
      throw error
    }
  }

  /**
   * Close a specific sandbox
   */
  public async closeSandbox(_event: IpcMainInvokeEvent, sessionId?: string): Promise<{ success: boolean }> {
    try {
      if (sessionId) {
        const sandbox = this.sandboxes.get(sessionId)
        if (sandbox) {
          logger.info(`Closing sandbox for session: ${sessionId}`)
          await sandbox.kill()
          this.sandboxes.delete(sessionId)
        }
      } else if (this.persistentSandbox) {
        logger.info('Closing persistent sandbox')
        await this.persistentSandbox.kill()
        this.persistentSandbox = null
      }
      return { success: true }
    } catch (error) {
      logger.error('Failed to close sandbox:', error as Error)
      throw error
    }
  }

  /**
   * Test connection to E2B API
   */
  public async testConnection(_event: IpcMainInvokeEvent, apiKey?: string, apiUrl?: string): Promise<boolean> {
    try {
      const config = await this.getProviderConfig()
      const testApiKey = apiKey || config.apiKey
      const testApiUrl = apiUrl || config.apiUrl

      if (!testApiKey) {
        throw new Error('API key is required')
      }

      logger.info('Testing E2B connection...')

      const clientConfig: any = {
        apiKey: testApiKey,
        timeoutMs: 30000
      }

      if (testApiUrl && testApiUrl !== 'https://api.e2b.dev') {
        clientConfig.baseUrl = testApiUrl
      }

      // Create a temporary sandbox to test connection
      const testSandbox = await Sandbox.create(clientConfig)

      // Run a simple test
      const execution = await testSandbox.runCode('print("E2B connection test successful")')

      // Clean up
      await testSandbox.kill()

      logger.info('E2B connection test successful')

      // Check if execution was successful
      // The execution object has logs.stdout and logs.stderr arrays
      const stdout = execution.logs?.stdout?.join('\n') || execution.text || ''
      return stdout.includes('E2B connection test successful')
    } catch (error) {
      logger.error('E2B connection test failed:', error as Error)
      throw error
    }
  }

  /**
   * Execute code for chat tool use
   */
  public async executeCodeForTool(
    _event: IpcMainInvokeEvent,
    params: {
      code: string
      session_id?: string
      timeout?: number
      env_vars?: Record<string, string>
    }
  ): Promise<ExecuteCodeResult> {
    try {
      // Check if chat tool is enabled
      const { options } = await this.getProviderConfig()

      if (!options?.enableChatTool) {
        throw new Error('E2B chat tool is not enabled. Please enable it in settings.')
      }

      const result = await this.executeCode(_event, {
        code: params.code,
        sessionId: params.session_id,
        timeout: params.timeout,
        envVars: params.env_vars
      })

      // Automatically get download URLs for any files created
      if (params.session_id) {
        try {
          const files = await this.listFiles(_event, '/tmp', params.session_id)
          const fileUrls = await Promise.all(
            files
              .filter((f) => f.type === 'file')
              .map(async (f) => {
                const { url } = await this.getDownloadUrl(_event, `/tmp/${f.name}`, params.session_id)
                return { path: `/tmp/${f.name}`, downloadUrl: url }
              })
          )
          result.files = fileUrls
        } catch (error) {
          logger.warn('Failed to get file download URLs:', error as Error)
        }
      }

      return result
    } catch (error) {
      logger.error('Tool execution failed:', error as Error)
      throw error
    }
  }

  /**
   * Cleanup all sandboxes
   */
  public async cleanup(): Promise<void> {
    logger.info('Cleaning up E2B sandboxes...')

    // Close all per-session sandboxes
    for (const [sessionId, sandbox] of this.sandboxes.entries()) {
      try {
        await sandbox.kill()
        logger.info(`Closed sandbox for session: ${sessionId}`)
      } catch (error) {
        logger.error(`Failed to close sandbox for session ${sessionId}:`, error as Error)
      }
    }
    this.sandboxes.clear()

    // Close persistent sandbox
    if (this.persistentSandbox) {
      try {
        await this.persistentSandbox.kill()
        logger.info('Closed persistent sandbox')
      } catch (error) {
        logger.error('Failed to close persistent sandbox:', error as Error)
      }
      this.persistentSandbox = null
    }
  }
}

export const e2bService = E2BService.getInstance()
