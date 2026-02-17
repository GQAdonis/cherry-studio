import type { PMPOPhaseEvent } from '../types'

interface PMPOReflectResult {
  pass: boolean
  summary: string
}

interface PMPOExecutionResult {
  summary?: string
}

export interface PMPOWorkflowOptions {
  request: string
  maxCorrectiveLoops?: number
  onPhaseEvent?: (event: PMPOPhaseEvent) => void
  execute: () => Promise<PMPOExecutionResult>
  reflect: (result: PMPOExecutionResult) => PMPOReflectResult
}

function emitPhase(
  phase: PMPOPhaseEvent['phase'],
  status: PMPOPhaseEvent['status'],
  onPhaseEvent?: (event: PMPOPhaseEvent) => void,
  summary?: string
) {
  onPhaseEvent?.({
    phase,
    status,
    summary,
    timestamp: new Date().toISOString()
  })
}

export async function runPMPOWorkflow(options: PMPOWorkflowOptions): Promise<{
  execution: PMPOExecutionResult
  correctiveLoops: number
}> {
  const maxCorrectiveLoops = options.maxCorrectiveLoops ?? 1

  emitPhase('spec', 'in_progress', options.onPhaseEvent, 'Collecting requirements and constraints')
  emitPhase('spec', 'completed', options.onPhaseEvent, `Spec complete: ${options.request}`)

  emitPhase('plan', 'in_progress', options.onPhaseEvent, 'Preparing execution plan')
  emitPhase('plan', 'completed', options.onPhaseEvent, 'Plan complete')

  let correctiveLoops = 0
  let latestExecution: PMPOExecutionResult = {}

  while (true) {
    emitPhase('execute', 'in_progress', options.onPhaseEvent, 'Applying artifact updates')
    latestExecution = await options.execute()
    emitPhase('execute', 'completed', options.onPhaseEvent, latestExecution.summary || 'Execution complete')

    emitPhase('reflect', 'in_progress', options.onPhaseEvent, 'Running validation and reflection checks')
    const reflection = options.reflect(latestExecution)

    if (reflection.pass) {
      emitPhase('reflect', 'completed', options.onPhaseEvent, reflection.summary)
      return {
        execution: latestExecution,
        correctiveLoops
      }
    }

    emitPhase('reflect', 'failed', options.onPhaseEvent, reflection.summary)

    if (correctiveLoops >= maxCorrectiveLoops) {
      return {
        execution: latestExecution,
        correctiveLoops
      }
    }

    correctiveLoops += 1
  }
}
