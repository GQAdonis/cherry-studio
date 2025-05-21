/**
 * Configuration for CopilotKit integration
 */
export const copilotConfig = {
  apiKey: process.env.COPILOT_API_KEY || 'default-api-key',
  runtimeUrl: process.env.COPILOT_RUNTIME_URL || 'http://localhost:4111',
  showDevConsole: false,
  defaultSystemPrompt: `You are a helpful AI assistant. Answer questions concisely and accurately.
  
If you don't know the answer to a question, don't make up an answer - just say you don't know.

Current date: ${new Date().toLocaleDateString()}`,
};