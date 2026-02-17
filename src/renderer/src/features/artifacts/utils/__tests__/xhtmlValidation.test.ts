import { describe, expect, it } from 'vitest'

import { validateXhtmlContent } from '../xhtmlValidation'

describe('validateXhtmlContent', () => {
  it('accepts well-formed XHTML documents', () => {
    const result = validateXhtmlContent(
      '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>t</title></head><body><p>Hello</p></body></html>'
    )

    expect(result.isValid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('rejects invalid XHTML and reports actionable issues', () => {
    const result = validateXhtmlContent('<html><body><p>Broken</body></html>')

    expect(result.isValid).toBe(false)
    expect(result.issues.length).toBeGreaterThan(0)
  })
})
