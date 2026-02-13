import { IpcChannel } from '@shared/IpcChannel'
import { tool } from 'ai'
import * as z from 'zod'

export const createScriptExecutionTool = (skillId: string) => {
  return tool({
    description: 'Execute a script defined in the skill',
    inputSchema: z.object({
      scriptName: z.string().describe('The name of the script to execute (e.g., script.py, run.sh)'),
      args: z.array(z.string()).optional().describe('Arguments to pass to the script')
    }),
    execute: async ({ scriptName, args }) => {
      try {
        const result = await (window.api as any).invoke(IpcChannel.Skill_ExecuteScript, skillId, scriptName, args || [])
        return {
          success: true,
          output: result
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  })
}
