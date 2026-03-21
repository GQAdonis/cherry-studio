import { describe, expect, it } from 'vitest'

import type { Artifact, ArtifactStatus, RenderOptions } from '../types'
import { buildDocument, buildPreviewDocument } from '../utils/documentBuilder'

// Helper to create a test artifact
function createTestArtifact(overrides: Partial<Artifact> = {}): Artifact {
  return {
    id: 'test-artifact-id',
    identifier: 'test-artifact',
    type: 'html',
    title: 'Test Artifact',
    content: '<div>Hello World</div>',
    version: 1,
    conversationId: 'conv-1',
    messageId: 'msg-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    saved: false,
    tags: [],
    metadata: {
      tailwind: true,
      theme: 'light'
    },
    status: 'complete' as ArtifactStatus,
    ...overrides
  }
}

describe('documentBuilder', () => {
  describe('buildDocument', () => {
    it('should build a basic HTML document', () => {
      const artifact = createTestArtifact()
      const options: RenderOptions = {
        theme: 'light',
        interactive: true
      }

      const doc = buildDocument(artifact, options)

      expect(doc).toContain('<!DOCTYPE html>')
      expect(doc).toContain('<html')
      expect(doc).toContain('<head>')
      expect(doc).toContain('<body>')
      expect(doc).toContain('<div>Hello World</div>')
    })

    it('should include Tailwind CDN when enabled', () => {
      const artifact = createTestArtifact({
        metadata: { tailwind: true, theme: 'light' }
      })
      const options: RenderOptions = { theme: 'light', interactive: true }

      const doc = buildDocument(artifact, options)

      expect(doc).toContain('cdn.tailwindcss.com')
    })

    it('should not include Tailwind CDN when disabled', () => {
      const artifact = createTestArtifact({
        metadata: { tailwind: false, theme: 'light' }
      })
      const options: RenderOptions = { theme: 'light', interactive: true }

      const doc = buildDocument(artifact, options)

      expect(doc).not.toContain('cdn.tailwindcss.com')
    })

    it('should include HTMX CDN for HTMX artifacts with server port', () => {
      const artifact = createTestArtifact({
        type: 'htmx',
        content: '<button hx-get="/api/test">Click</button>'
      })
      const options: RenderOptions = {
        theme: 'light',
        interactive: true,
        htmxServerPort: 3456
      }

      const doc = buildDocument(artifact, options)

      expect(doc).toContain('htmx.org')
      expect(doc).toContain('3456')
    })

    it('should set dark theme CSS variables', () => {
      const artifact = createTestArtifact({
        metadata: { tailwind: false, theme: 'dark' }
      })
      const options: RenderOptions = { theme: 'dark', interactive: true }

      const doc = buildDocument(artifact, options)

      expect(doc).toContain('class="dark"')
      expect(doc).toContain('--color-background: #1a1a1a')
    })

    it('should include the bridge script with artifact ID', () => {
      const artifact = createTestArtifact({ id: 'unique-id-123' })
      const options: RenderOptions = { theme: 'light', interactive: true }

      const doc = buildDocument(artifact, options)

      expect(doc).toContain('window.artifactBridge')
      expect(doc).toContain('unique-id-123')
    })

    it('should build React document with esm.sh and shadcn/ui support', () => {
      const artifact = createTestArtifact({
        type: 'react',
        content: 'function App() { return <div>React Component</div>; }'
      })
      const options: RenderOptions = { theme: 'light', interactive: true }

      const doc = buildDocument(artifact, options)

      // Now uses esm.sh for React artifacts with full shadcn/ui support
      expect(doc).toContain('esm.sh/react')
      expect(doc).toContain('esm.sh/react-dom')
      expect(doc).toContain('type="module"')
    })

    it('should build A2UI document with structured schema renderer', () => {
      const artifact = createTestArtifact({
        type: 'a2ui',
        content: JSON.stringify({
          version: 1,
          type: 'page',
          title: 'Structured UI',
          children: [{ id: 'title', type: 'heading', props: { level: 1, text: 'Hello A2UI' } }]
        })
      })
      const options: RenderOptions = { theme: 'light', interactive: true }

      const doc = buildDocument(artifact, options)

      expect(doc).toContain('A2UI Artifact Preview')
      expect(doc).toContain('safeParseSchema')
      expect(doc).toContain('Hello A2UI')
    })

    it('should build SVG document', () => {
      const artifact = createTestArtifact({
        type: 'svg',
        content: '<svg><circle cx="50" cy="50" r="40"/></svg>'
      })
      const options: RenderOptions = { theme: 'light', interactive: true }

      const doc = buildDocument(artifact, options)

      expect(doc).toContain('<circle')
      expect(doc).toContain('cx="50"')
    })

    it('should build Mermaid document', () => {
      const artifact = createTestArtifact({
        type: 'mermaid',
        content: 'graph TD\n    A-->B'
      })
      const options: RenderOptions = { theme: 'light', interactive: true }

      const doc = buildDocument(artifact, options)

      expect(doc).toContain('mermaid')
      expect(doc).toContain('graph TD')
    })

    it('should build Markdown document', () => {
      const artifact = createTestArtifact({
        type: 'markdown',
        content: '# Hello\n\nThis is **markdown**'
      })
      const options: RenderOptions = { theme: 'light', interactive: true }

      const doc = buildDocument(artifact, options)

      expect(doc).toContain('marked')
      expect(doc).toContain('hljs')
      expect(doc).toContain('markdown-body')
    })

    it('should build code document with syntax highlighting', () => {
      const artifact = createTestArtifact({
        type: 'code',
        content: 'const hello = "world";',
        metadata: { tailwind: false, theme: 'light', language: 'javascript' }
      })
      const options: RenderOptions = { theme: 'light', interactive: true }

      const doc = buildDocument(artifact, options)

      expect(doc).toContain('highlight')
      expect(doc).toContain('language-javascript')
      expect(doc).toContain('const hello')
    })

    it('should include custom styles from metadata', () => {
      const artifact = createTestArtifact({
        metadata: {
          tailwind: false,
          theme: 'light',
          customStyles: '.custom { color: red; }'
        }
      })
      const options: RenderOptions = { theme: 'light', interactive: true }

      const doc = buildDocument(artifact, options)

      expect(doc).toContain('.custom { color: red; }')
    })
  })

  describe('buildPreviewDocument', () => {
    it('should build a preview document with minimal content', () => {
      const doc = buildPreviewDocument('<div>Preview</div>', 'html')

      expect(doc).toContain('<!DOCTYPE html>')
      expect(doc).toContain('<div>Preview</div>')
    })

    it('should use specified theme', () => {
      const doc = buildPreviewDocument('<div>Dark</div>', 'html', 'dark')

      expect(doc).toContain('class="dark"')
    })

    it('should handle different artifact types', () => {
      const reactDoc = buildPreviewDocument('function App() { return <div/>; }', 'react')
      expect(reactDoc).toContain('react')
      // Now uses esm.sh instead of babel for React artifacts
      expect(reactDoc).toContain('esm.sh')

      const mermaidDoc = buildPreviewDocument('graph TD\n    A-->B', 'mermaid')
      expect(mermaidDoc).toContain('mermaid')

      const a2uiDoc = buildPreviewDocument('{"version":1,"type":"page","title":"Preview","children":[]}', 'a2ui')
      expect(a2uiDoc).toContain('A2UI Artifact Preview')
    })
  })

  describe('sandbox attributes', () => {
    it('should build document that can run in sandboxed iframe', () => {
      const artifact = createTestArtifact()
      const options: RenderOptions = { theme: 'light', interactive: true }

      const doc = buildDocument(artifact, options)

      // Document should be self-contained (no external dependencies except CDNs)
      expect(doc).toContain('<!DOCTYPE html>')
      // Should include inline scripts
      expect(doc).toContain('<script>')
      // Should include inline styles
      expect(doc).toContain('<style>')
    })
  })

  describe('error handling', () => {
    it('should handle empty content', () => {
      const artifact = createTestArtifact({ content: '' })
      const options: RenderOptions = { theme: 'light', interactive: true }

      const doc = buildDocument(artifact, options)

      expect(doc).toContain('<!DOCTYPE html>')
      expect(doc).toContain('<body>')
    })

    it('should escape HTML special characters in code artifacts', () => {
      const artifact = createTestArtifact({
        type: 'code',
        content: '<script>alert("xss")</script>',
        metadata: { tailwind: false, theme: 'light', language: 'html' }
      })
      const options: RenderOptions = { theme: 'light', interactive: true }

      const doc = buildDocument(artifact, options)

      // The content should be escaped to prevent XSS
      expect(doc).toContain('&lt;script&gt;')
    })
  })
})
