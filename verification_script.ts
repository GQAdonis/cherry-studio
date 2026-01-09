import fs from 'fs'

import { CONTEXT_SAFETY_MARGIN, getAvailableInputBudget } from './src/renderer/src/config/models/contextLimits'

const model = { id: 'gpt-4o', name: 'GPT-4o' }
// gpt-4o limit is 128,000
// Old margin 0.9 -> ~115,200
// New margin 0.85 -> ~108,800

const budget = getAvailableInputBudget(model)
const expected = Math.floor(128000 * 0.85) - 4096

let output = `Current Margin: ${CONTEXT_SAFETY_MARGIN}\n`
output += `Budget for gpt-4o: ${budget}\n`
output += `Expected budget (~): ${expected}\n`

if (budget === expected) {
  output += 'VERIFICATION PASSED: Margin is effectively 0.85\n'
} else {
  output += 'VERIFICATION FAILED: Budget does not match expected 0.85 margin\n'
}

fs.writeFileSync('verification_result.txt', output)
