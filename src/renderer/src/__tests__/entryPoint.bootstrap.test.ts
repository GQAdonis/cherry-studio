import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

describe('entryPoint bootstrap order', () => {
  it('imports logger bootstrap before other modules', () => {
    const entryPointPath = path.resolve(process.cwd(), 'src/renderer/src/entryPoint.tsx')
    const source = fs.readFileSync(entryPointPath, 'utf8')
    const firstImport = source
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('import '))

    expect(firstImport).toBe("import './loggerBootstrap'")
  })
})
