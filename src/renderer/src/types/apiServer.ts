export type ApiServerConfig = {
  enabled: boolean
  host: string
  port: number
  apiKey: string
  /** Whether to expose selected resources as MCP tool servers for external AI tools */
  mcpExposureEnabled?: boolean
}

export type GetApiServerStatusResult = {
  running: boolean
  config: ApiServerConfig | null
}

export type StartApiServerStatusResult =
  | {
      success: true
    }
  | {
      success: false
      error: string
    }

export type RestartApiServerStatusResult =
  | {
      success: true
    }
  | {
      success: false
      error: string
    }

export type StopApiServerStatusResult =
  | {
      success: true
    }
  | {
      success: false
      error: string
    }
