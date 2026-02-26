import { type ChildProcess, spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { loggerService } from '@logger'
import axios from 'axios'
import { app } from 'electron'

const logger = loggerService.withContext('UarSidecarService')

interface OllamaModel {
  name: string
  model: string
  modified_at: string
  size: number
  digest: string
  details: {
    parent_model: string
    format: string
    family: string
    families: string[]
    parameter_size: string
    quantization_level: string
  }
}

interface OllamaTagsResponse {
  models: OllamaModel[]
}

class UarSidecarService {
  private uarProcess: ChildProcess | null = null
  private isShuttingDown = false

  private async detectOllama(): Promise<{ baseUrl: string; model: string } | null> {
    try {
      const baseUrl = 'http://localhost:11434'
      const response = await axios.get<OllamaTagsResponse>(`${baseUrl}/api/tags`, {
        timeout: 1000 // Short timeout to avoid blocking startup
      })

      if (response.status === 200 && response.data?.models?.length > 0) {
        const models = response.data.models
        logger.info(`Ollama detected with ${models.length} models`)

        // Priority list for auto-selection
        const preferredModels = ['llama3', 'mistral', 'gemma', 'qwen']

        let selectedModel = models[0].name

        // Try to find a preferred model
        for (const pref of preferredModels) {
          const found = models.find((m) => m.name.toLowerCase().includes(pref))
          if (found) {
            selectedModel = found.name
            break
          }
        }

        logger.info(`Selected Ollama model: ${selectedModel}`)

        return {
          baseUrl: `${baseUrl}/v1`, // Use OpenAI compatible endpoint
          model: selectedModel
        }
      }
    } catch (err) {
      logger.debug('Ollama not detected or unreachable', { error: (err as Error).message })
    }
    return null
  }

  public async start(): Promise<void> {
    if (this.uarProcess) {
      logger.warn('UAR sidecar is already running')
      return
    }

    // TODO: support production build path where binary is in resources
    // For now, we point to the local dev build as per plan
    const devBinaryPath =
      '/Users/gqadonis/Projects/prometheus/universal-agent-runtime/target/release/universal-agent-runtime'

    // Determine binary name based on platform and arch
    let platform = process.platform as string
    if (platform === 'darwin') platform = 'macos'
    if (platform === 'win32') platform = 'win'

    let arch = process.arch as string
    if (arch === 'x64') arch = 'x64'
    if (arch === 'arm64') arch = 'arm64'

    const binaryName = `universal-agent-runtime-${platform}-${arch}${platform === 'win' ? '.exe' : ''}`

    // In production, the binary is in the resources/bin folder
    const prodBinaryPath = join(process.resourcesPath, 'bin', binaryName)

    // Check if we are in production or if the dev binary exists
    // If dev binary exists and we are not packaged, use it (for faster dev loop)
    // Otherwise try to find the platform specific binary in resources (even in dev if copied)
    let binaryPath = devBinaryPath

    if (app.isPackaged) {
      binaryPath = prodBinaryPath
    } else {
      // In dev, prefer the built binary if available, otherwise check for the staged platform binary
      if (!existsSync(devBinaryPath)) {
        // Fallback to trying the staged binary in resources/bin if local build missing
        if (existsSync(join(__dirname, '../../resources/bin', binaryName))) {
          binaryPath = join(__dirname, '../../resources/bin', binaryName)
        } else if (existsSync(join(process.resourcesPath, 'bin', binaryName))) {
          // Also check process.resourcesPath in dev (sometimes points to different place)
          binaryPath = join(process.resourcesPath, 'bin', binaryName)
        }
      }
    }

    if (!existsSync(binaryPath)) {
      logger.error(`UAR binary not found at ${binaryPath}. Sidecar will not start.`)
      return
    }

    const userDataPath = app.getPath('userData')
    const uarDataPath = join(userDataPath, 'uar-data')

    // Ensure data directory exists
    if (!existsSync(uarDataPath)) {
      try {
        mkdirSync(uarDataPath, { recursive: true })
      } catch (err) {
        logger.error(`Failed to create UAR data directory at ${uarDataPath}`, err as Error)
        return
      }
    }

    // Default configuration
    let llmConfig = {
      baseUrl: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
      model: process.env.LLM_MODEL || 'llama3',
      protocol: 'auto'
    }

    // Attempt auto-detection
    const ollamaConfig = await this.detectOllama()
    if (ollamaConfig) {
      llmConfig = {
        baseUrl: ollamaConfig.baseUrl,
        model: ollamaConfig.model,
        protocol: 'openai' // Enforce openai protocol for Ollama v1 compat
      }
    }

    const env = {
      ...process.env,
      // Network Config
      UAR_SERVER__PORT: '3928',
      UAR_SERVER__HOST: '127.0.0.1',

      // Persistence Config
      UAR_PERSISTENCE__PROVIDER: 'surreal',
      UAR_PERSISTENCE__DATABASE_URL: `rocksdb://${uarDataPath}`,

      // Security Config (Disabled for local sidecar)
      UAR_SECURITY__JWT_REQUIRED: 'false',

      // Resilience Config (Disabled to prevent friction)
      UAR_RESILIENCE__RATE_LIMIT_ENABLED: 'false',
      UAR_RESILIENCE__TIMEOUT_DISABLED: 'true',

      // LLM Defaults
      LLM_BASE_URL: llmConfig.baseUrl,
      LLM_MODEL: llmConfig.model,
      LLM_PROTOCOL: llmConfig.protocol,

      // Vision
      UAR_VISION__AUTO_DETECT: 'true'
    }

    logger.info('Starting UAR sidecar...', {
      binaryPath,
      port: 3928,
      dataPath: uarDataPath,
      llm: llmConfig
    })

    try {
      this.uarProcess = spawn(binaryPath, [], {
        env,
        stdio: ['ignore', 'pipe', 'pipe'], // Ignore stdin, pipe stdout/stderr
        windowsHide: true
      })

      this.uarProcess.stdout?.on('data', (data) => {
        const line = data.toString().trim()
        if (line) logger.info(`[UAR] ${line}`)
      })

      this.uarProcess.stderr?.on('data', (data) => {
        const line = data.toString().trim()
        if (line) logger.warn(`[UAR STDERR] ${line}`)
      })

      this.uarProcess.on('error', (err) => {
        logger.error('Failed to spawn UAR process', err)
        this.uarProcess = null
      })

      this.uarProcess.on('exit', (code, signal) => {
        if (!this.isShuttingDown) {
          logger.warn(`UAR process exited unexpectedly with code ${code} and signal ${signal}`)
          this.uarProcess = null
          // Optional: Retry logic could go here
        } else {
          logger.info(`UAR process exited with code ${code}`)
        }
      })

      // Unref the child process so it doesn't prevent the parent from exiting
      // (Though we handle kill explicitly in stop())
      this.uarProcess.unref()
    } catch (err) {
      logger.error('Exception while spawning UAR', err as Error)
    }
  }

  public stop(): void {
    if (this.uarProcess) {
      this.isShuttingDown = true
      logger.info('Stopping UAR sidecar...')
      const killed = this.uarProcess.kill()
      if (!killed) {
        logger.warn('Failed to kill UAR process immediately, it might have already exited')
      }
      this.uarProcess = null
    }
  }
}

export const uarSidecarService = new UarSidecarService()
