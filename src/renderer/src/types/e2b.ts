export interface E2BOptions {
  sandboxMode?: 'per-session' | 'persistent'
  timeout?: number
  template?: string
  enableChatTool?: boolean
}

export interface E2BConfig {
  apiKey?: string
  apiHost?: string
  options?: E2BOptions
}
