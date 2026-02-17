import type { ArtifactValidationState } from '../types'

function hasDomParser(): boolean {
  return typeof DOMParser !== 'undefined'
}

function validateWithDomParser(content: string): string[] {
  const parser = new DOMParser()
  const parsed = parser.parseFromString(content, 'application/xhtml+xml')
  const parserErrors = parsed.getElementsByTagName('parsererror')
  const issues: string[] = []

  if (parserErrors.length > 0) {
    for (const node of Array.from(parserErrors)) {
      const text = (node.textContent || '').trim()
      if (text) {
        issues.push(text)
      }
    }
  }

  return issues
}

export function validateXhtmlContent(content: string): ArtifactValidationState {
  const issues: string[] = []

  if (!content.trim()) {
    issues.push('XHTML content is empty.')
  }

  if (!content.includes('<html')) {
    issues.push('XHTML document must include an <html> root element.')
  }

  if (!content.includes('xmlns="http://www.w3.org/1999/xhtml"')) {
    issues.push('XHTML root element must declare xmlns="http://www.w3.org/1999/xhtml".')
  }

  if (hasDomParser()) {
    issues.push(...validateWithDomParser(content))
  }

  return {
    isValid: issues.length === 0,
    issues,
    validatedAt: new Date().toISOString()
  }
}
