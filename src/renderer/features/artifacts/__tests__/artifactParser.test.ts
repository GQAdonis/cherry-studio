import { describe, expect, it } from 'vitest'

import {
  countArtifacts,
  extractArtifactContent,
  hasArtifacts,
  hasIncompleteArtifact,
  parseArtifacts,
  serializeArtifact,
  updateArtifactContent
} from '../utils/artifactParser'

describe('artifactParser', () => {
  describe('parseArtifacts', () => {
    it('should return empty result for empty content', () => {
      const result = parseArtifacts('')
      expect(result.artifacts).toHaveLength(0)
      expect(result.hasArtifacts).toBe(false)
    })

    it('should return empty result for content without artifacts', () => {
      const result = parseArtifacts('Hello, this is just regular text.')
      expect(result.artifacts).toHaveLength(0)
      expect(result.hasArtifacts).toBe(false)
      expect(result.segments).toHaveLength(1)
      expect(result.segments[0].type).toBe('text')
    })

    it('should parse a single HTML artifact', () => {
      const content = `
<cs-artifact identifier="test-html" type="html" title="Test HTML">
<div>Hello World</div>
</cs-artifact>
      `
      const result = parseArtifacts(content)

      expect(result.artifacts).toHaveLength(1)
      expect(result.hasArtifacts).toBe(true)

      const artifact = result.artifacts[0]
      expect(artifact.identifier).toBe('test-html')
      expect(artifact.type).toBe('html')
      expect(artifact.title).toBe('Test HTML')
      expect(artifact.content).toBe('<div>Hello World</div>')
    })

    it('should parse a single HTMX artifact', () => {
      const content = `
<cs-artifact identifier="test-htmx" type="htmx" title="HTMX Example">
<button hx-get="/api/data" hx-target="#result">Load</button>
<div id="result"></div>
</cs-artifact>
      `
      const result = parseArtifacts(content)

      expect(result.artifacts).toHaveLength(1)
      expect(result.artifacts[0].type).toBe('htmx')
    })

    it('should parse multiple artifacts', () => {
      const content = `
Here's an HTML component:
<cs-artifact identifier="component-1" type="html" title="Component 1">
<div>Component 1</div>
</cs-artifact>

And here's another:
<cs-artifact identifier="component-2" type="react" title="Component 2">
function App() { return <div>React</div>; }
</cs-artifact>
      `
      const result = parseArtifacts(content)

      expect(result.artifacts).toHaveLength(2)
      expect(result.artifacts[0].identifier).toBe('component-1')
      expect(result.artifacts[1].identifier).toBe('component-2')
    })

    it('should handle artifacts with all attributes', () => {
      const content = `
<cs-artifact identifier="full-example" type="html" title="Full Example" tailwind="true" theme="dark" language="html">
<div class="p-4 bg-gray-800">Dark mode content</div>
</cs-artifact>
      `
      const result = parseArtifacts(content)

      expect(result.artifacts).toHaveLength(1)
      const artifact = result.artifacts[0]
      expect(artifact.attributes.tailwind).toBe('true')
      expect(artifact.attributes.theme).toBe('dark')
      expect(artifact.attributes.language).toBe('html')
    })

    it('should create segments for text between artifacts', () => {
      const content = `
Text before artifact.
<cs-artifact identifier="middle" type="html" title="Middle">
<div>Middle</div>
</cs-artifact>
Text after artifact.
      `
      const result = parseArtifacts(content)

      expect(result.segments).toHaveLength(3)
      expect(result.segments[0].type).toBe('text')
      expect(result.segments[1].type).toBe('artifact')
      expect(result.segments[2].type).toBe('text')
    })

    it('should infer type from language attribute', () => {
      const content = `
<cs-artifact identifier="tsx-code" language="tsx" title="TSX Code">
const App = () => <div>Hello</div>;
</cs-artifact>
      `
      const result = parseArtifacts(content)

      expect(result.artifacts[0].type).toBe('react')
    })

    it('should generate identifier if not provided', () => {
      const content = `
<cs-artifact type="html" title="No ID">
<div>Content</div>
</cs-artifact>
      `
      const result = parseArtifacts(content)

      expect(result.artifacts[0].identifier).toMatch(/^artifact-/)
    })
  })

  describe('hasArtifacts', () => {
    it('should return true when artifacts exist', () => {
      const content = '<cs-artifact type="html">content</cs-artifact>'
      expect(hasArtifacts(content)).toBe(true)
    })

    it('should return false when no artifacts exist', () => {
      const content = 'Just regular text'
      expect(hasArtifacts(content)).toBe(false)
    })

    it('should return false for empty content', () => {
      expect(hasArtifacts('')).toBe(false)
    })
  })

  describe('hasIncompleteArtifact', () => {
    it('should detect incomplete artifact tags', () => {
      const content = '<cs-artifact type="html">Incomplete content without closing tag'
      expect(hasIncompleteArtifact(content)).toBe(true)
    })

    it('should return false for complete artifacts', () => {
      const content = '<cs-artifact type="html">Complete</cs-artifact>'
      expect(hasIncompleteArtifact(content)).toBe(false)
    })

    it('should return false for content without artifacts', () => {
      const content = 'No artifacts here'
      expect(hasIncompleteArtifact(content)).toBe(false)
    })
  })

  describe('extractArtifactContent', () => {
    it('should extract content from artifact', () => {
      const content = '<cs-artifact type="html"><div>Extracted</div></cs-artifact>'
      expect(extractArtifactContent(content)).toBe('<div>Extracted</div>')
    })

    it('should return null when no artifact found', () => {
      const content = 'No artifact here'
      expect(extractArtifactContent(content)).toBeNull()
    })

    it('should extract first artifact when multiple exist', () => {
      const content = `
<cs-artifact type="html">First</cs-artifact>
<cs-artifact type="html">Second</cs-artifact>
      `
      expect(extractArtifactContent(content)).toBe('First')
    })
  })

  describe('countArtifacts', () => {
    it('should count zero artifacts', () => {
      expect(countArtifacts('No artifacts')).toBe(0)
    })

    it('should count one artifact', () => {
      const content = '<cs-artifact type="html">One</cs-artifact>'
      expect(countArtifacts(content)).toBe(1)
    })

    it('should count multiple artifacts', () => {
      const content = `
<cs-artifact type="html">One</cs-artifact>
<cs-artifact type="html">Two</cs-artifact>
<cs-artifact type="html">Three</cs-artifact>
      `
      expect(countArtifacts(content)).toBe(3)
    })
  })

  describe('serializeArtifact', () => {
    it('should serialize an artifact to tag format', () => {
      const artifact = {
        identifier: 'test-id',
        type: 'html' as const,
        title: 'Test Title',
        content: '<div>Content</div>'
      }

      const result = serializeArtifact(artifact)

      expect(result).toContain('identifier="test-id"')
      expect(result).toContain('type="html"')
      expect(result).toContain('title="Test Title"')
      expect(result).toContain('<div>Content</div>')
      expect(result).toContain('<cs-artifact')
      expect(result).toContain('</cs-artifact>')
    })

    it('should include metadata in serialized output', () => {
      const artifact = {
        identifier: 'with-meta',
        type: 'html' as const,
        title: 'With Metadata',
        content: '<div>Content</div>',
        metadata: {
          tailwind: false,
          theme: 'dark' as const,
          language: 'html'
        }
      }

      const result = serializeArtifact(artifact)

      expect(result).toContain('tailwind="false"')
      expect(result).toContain('theme="dark"')
      expect(result).toContain('language="html"')
    })
  })

  describe('updateArtifactContent', () => {
    it('should update artifact content by identifier', () => {
      const original = `
Text before
<cs-artifact identifier="update-me" type="html" title="Update Me">
<div>Original Content</div>
</cs-artifact>
Text after
      `

      const result = updateArtifactContent(original, 'update-me', '<div>New Content</div>')

      expect(result).toContain('<div>New Content</div>')
      expect(result).not.toContain('<div>Original Content</div>')
      expect(result).toContain('Text before')
      expect(result).toContain('Text after')
    })

    it('should not modify content if identifier not found', () => {
      const original = '<cs-artifact identifier="other" type="html">Content</cs-artifact>'
      const result = updateArtifactContent(original, 'not-found', 'New Content')

      expect(result).toBe(original)
    })
  })
})

