import { describe, expect, it, vi } from 'vitest'

import { runPMPOWorkflow } from '../pmpoEngine'

describe('runPMPOWorkflow', () => {
  it('emits PMPO sequence and supports one corrective loop', async () => {
    const events: string[] = []
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ summary: 'first pass' })
      .mockResolvedValueOnce({ summary: 'second pass' })

    const result = await runPMPOWorkflow({
      request: 'Build a landing page',
      maxCorrectiveLoops: 1,
      onPhaseEvent: (event) => {
        events.push(`${event.phase}:${event.status}`)
      },
      execute,
      reflect: () => {
        if (execute.mock.calls.length === 1) {
          return { pass: false, summary: 'Needs correction' }
        }
        return { pass: true, summary: 'Looks good' }
      }
    })

    expect(result.correctiveLoops).toBe(1)
    expect(execute).toHaveBeenCalledTimes(2)
    expect(events).toContain('spec:completed')
    expect(events).toContain('plan:completed')
    expect(events.filter((entry) => entry === 'execute:completed').length).toBe(2)
    expect(events).toContain('reflect:completed')
  })
})
