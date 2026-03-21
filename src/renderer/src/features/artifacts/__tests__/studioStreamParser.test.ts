/**
 * StudioStreamParser Tests
 *
 * Tests for the real-time streaming parser that separates
 * `<cs-studio-code>` blocks from chat text during LLM streaming.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StudioStreamCallbacks } from '../utils/studioStreamParser'
import {
  extractStudioCode,
  hasCompleteStudioCode,
  hasStudioCodeTag,
  StudioStreamParser
} from '../utils/studioStreamParser'

describe('StudioStreamParser', () => {
  let parser: StudioStreamParser
  let callbacks: Required<StudioStreamCallbacks>

  beforeEach(() => {
    callbacks = {
      onCodeStart: vi.fn(),
      onCodeStream: vi.fn(),
      onCodeComplete: vi.fn(),
      onChatText: vi.fn()
    }
    parser = new StudioStreamParser({ callbacks })
  })

  describe('basic stream separation', () => {
    it('should route pure text to chat', () => {
      const result = parser.parse('msg1', 'Hello, this is explanatory text.')
      expect(result).toBe('Hello, this is explanatory text.')
      expect(callbacks.onChatText).toHaveBeenCalledWith('Hello, this is explanatory text.', 'msg1')
      expect(callbacks.onCodeStart).not.toHaveBeenCalled()
    })

    it('should route code block to code callbacks', () => {
      const input = '<cs-studio-code identifier="app" type="react" title="My App">const x = 1;</cs-studio-code>'
      const result = parser.parse('msg1', input)

      // No chat text returned
      expect(result).toBe('')

      // Code start should fire
      expect(callbacks.onCodeStart).toHaveBeenCalledWith({
        metadata: { identifier: 'app', type: 'react', title: 'My App' },
        messageId: 'msg1'
      })

      // Code complete should fire with content
      expect(callbacks.onCodeComplete).toHaveBeenCalledWith({
        content: 'const x = 1;',
        metadata: { identifier: 'app', type: 'react', title: 'My App' },
        messageId: 'msg1'
      })
    })

    it('should separate chat text before and after code block', () => {
      const input =
        'Here is the code:\n<cs-studio-code identifier="app" type="html" title="Page">Hello</cs-studio-code>\nDone!'
      const result = parser.parse('msg1', input)

      expect(result).toBe('Here is the code:\n\nDone!')
      expect(callbacks.onCodeStart).toHaveBeenCalled()
      expect(callbacks.onCodeComplete).toHaveBeenCalledWith(expect.objectContaining({ content: 'Hello' }))
    })
  })

  describe('incremental streaming', () => {
    it('should handle partial input across multiple parse calls', () => {
      // First chunk: partial chat text
      let result = parser.parse('msg1', 'Here is ')
      expect(result).toBe('Here is ')

      // Second chunk: more chat + start of tag
      result = parser.parse('msg1', 'Here is the code:\n<cs-studio-code identifier="app" type="react" title="App">')
      // Only new chat text from position after first parse
      expect(callbacks.onCodeStart).toHaveBeenCalled()

      // Third chunk: code content
      result = parser.parse(
        'msg1',
        'Here is the code:\n<cs-studio-code identifier="app" type="react" title="App">const x = 1;'
      )
      expect(callbacks.onCodeStream).toHaveBeenCalled()

      // Fourth chunk: closing tag
      result = parser.parse(
        'msg1',
        'Here is the code:\n<cs-studio-code identifier="app" type="react" title="App">const x = 1;</cs-studio-code>'
      )
      expect(callbacks.onCodeComplete).toHaveBeenCalledWith(expect.objectContaining({ content: 'const x = 1;' }))
    })

    it('should handle incomplete opening tag gracefully', () => {
      // Tag partially received
      parser.parse('msg1', 'Text <cs-studio-code')
      // Should emit text before the potential tag but not the tag itself
      expect(callbacks.onCodeStart).not.toHaveBeenCalled()
      // Parser should wait for more input
      expect(parser.isInsideCode('msg1')).toBe(false)
    })
  })

  describe('state tracking', () => {
    it('should track insideCode state correctly', () => {
      expect(parser.isInsideCode('msg1')).toBe(false)

      parser.parse('msg1', '<cs-studio-code identifier="x" type="html" title="T">code here')
      expect(parser.isInsideCode('msg1')).toBe(true)

      parser.parse('msg1', '<cs-studio-code identifier="x" type="html" title="T">code here</cs-studio-code>')
      expect(parser.isInsideCode('msg1')).toBe(false)
    })

    it('should return streaming code content', () => {
      expect(parser.getStreamingCode('msg1')).toBeNull()

      parser.parse('msg1', '<cs-studio-code identifier="x" type="html" title="T">partial code')
      expect(parser.getStreamingCode('msg1')).toBe('partial code')
    })

    it('should return code metadata during streaming', () => {
      parser.parse('msg1', '<cs-studio-code identifier="my-app" type="react" title="Dashboard">code')
      const meta = parser.getCodeMetadata('msg1')
      expect(meta).toEqual({
        identifier: 'my-app',
        type: 'react',
        title: 'Dashboard'
      })
    })
  })

  describe('message isolation', () => {
    it('should maintain separate state per message ID', () => {
      parser.parse('msg1', '<cs-studio-code identifier="x" type="html" title="T">code1')
      parser.parse('msg2', 'Just chat text')

      expect(parser.isInsideCode('msg1')).toBe(true)
      expect(parser.isInsideCode('msg2')).toBe(false)
    })

    it('should reset individual message state', () => {
      parser.parse('msg1', '<cs-studio-code identifier="x" type="html" title="T">code')
      parser.resetMessage('msg1')
      expect(parser.isInsideCode('msg1')).toBe(false)
      expect(parser.getStreamingCode('msg1')).toBeNull()
    })

    it('should reset all state', () => {
      parser.parse('msg1', '<cs-studio-code identifier="x" type="html" title="T">code')
      parser.parse('msg2', '<cs-studio-code identifier="y" type="html" title="T">code')
      parser.reset()
      expect(parser.isInsideCode('msg1')).toBe(false)
      expect(parser.isInsideCode('msg2')).toBe(false)
    })
  })

  describe('attribute parsing', () => {
    it('should extract identifier attribute', () => {
      parser.parse(
        'msg1',
        '<cs-studio-code identifier="landing-page" type="react" title="Landing">code</cs-studio-code>'
      )
      expect(callbacks.onCodeStart).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ identifier: 'landing-page' })
        })
      )
    })

    it('should fall back to id attribute', () => {
      parser.parse('msg1', '<cs-studio-code id="fallback-id" type="html" title="Page">code</cs-studio-code>')
      expect(callbacks.onCodeStart).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ identifier: 'fallback-id' })
        })
      )
    })

    it('should default invalid types to html', () => {
      parser.parse('msg1', '<cs-studio-code identifier="x" type="invalid" title="T">code</cs-studio-code>')
      expect(callbacks.onCodeStart).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ type: 'html' })
        })
      )
    })

    it('should accept all valid artifact types', () => {
      const validTypes = ['html', 'xhtml', 'htmx', 'react', 'a2ui', 'svg', 'mermaid', 'markdown', 'code']
      for (const type of validTypes) {
        const p = new StudioStreamParser({
          callbacks: { onCodeStart: vi.fn() }
        })
        p.parse('msg', `<cs-studio-code identifier="x" type="${type}" title="T">c</cs-studio-code>`)
      }
    })
  })

  describe('content cleaning', () => {
    it('should trim whitespace from code content', () => {
      parser.parse('msg1', '<cs-studio-code identifier="x" type="html" title="T">\n  hello  \n</cs-studio-code>')
      expect(callbacks.onCodeComplete).toHaveBeenCalledWith(expect.objectContaining({ content: 'hello' }))
    })

    it('should strip wrapping markdown fences', () => {
      const code = '```tsx\nconst x = 1;\n```'
      parser.parse('msg1', `<cs-studio-code identifier="x" type="react" title="T">${code}</cs-studio-code>`)
      expect(callbacks.onCodeComplete).toHaveBeenCalledWith(expect.objectContaining({ content: 'const x = 1;' }))
    })

    it('should unescape HTML entities', () => {
      parser.parse(
        'msg1',
        '<cs-studio-code identifier="x" type="html" title="T">&lt;div&gt;text&lt;/div&gt;</cs-studio-code>'
      )
      expect(callbacks.onCodeComplete).toHaveBeenCalledWith(expect.objectContaining({ content: '<div>text</div>' }))
    })
  })

  describe('edge cases', () => {
    it('should handle non-studio HTML tags without matching', () => {
      const result = parser.parse('msg1', '<div>hello</div> <span>world</span>')
      expect(result).toBe('<div>hello</div> <span>world</span>')
      expect(callbacks.onCodeStart).not.toHaveBeenCalled()
    })

    it('should handle empty code block', () => {
      parser.parse('msg1', '<cs-studio-code identifier="x" type="html" title="T"></cs-studio-code>')
      expect(callbacks.onCodeComplete).toHaveBeenCalledWith(expect.objectContaining({ content: '' }))
    })

    it('should handle multiline code content', () => {
      const code = 'import { useState } from "react";\n\nexport default function App() {\n  return <div>Hello</div>;\n}'
      parser.parse('msg1', `<cs-studio-code identifier="x" type="react" title="T">${code}</cs-studio-code>`)
      expect(callbacks.onCodeComplete).toHaveBeenCalledWith(expect.objectContaining({ content: code }))
    })
  })
})

describe('Utility functions', () => {
  describe('hasStudioCodeTag', () => {
    it('should return true when tag is present', () => {
      expect(hasStudioCodeTag('text <cs-studio-code identifier="x"')).toBe(true)
    })

    it('should return false when tag is not present', () => {
      expect(hasStudioCodeTag('text <cs-artifact id="x">')).toBe(false)
    })
  })

  describe('hasCompleteStudioCode', () => {
    it('should return true for complete code block', () => {
      expect(hasCompleteStudioCode('<cs-studio-code identifier="x" type="html" title="T">code</cs-studio-code>')).toBe(
        true
      )
    })

    it('should return false for incomplete code block', () => {
      expect(hasCompleteStudioCode('<cs-studio-code identifier="x" type="html" title="T">code')).toBe(false)
    })
  })

  describe('extractStudioCode', () => {
    it('should extract code and metadata from complete response', () => {
      const input =
        'Here is the component.\n\n<cs-studio-code identifier="app" type="react" title="App">const App = () => <div>Hi</div>;\nexport default App;</cs-studio-code>\n\nEnjoy!'
      const result = extractStudioCode(input)

      expect(result).not.toBeNull()
      expect(result!.code).toBe('const App = () => <div>Hi</div>;\nexport default App;')
      expect(result!.metadata).toEqual({
        identifier: 'app',
        type: 'react',
        title: 'App'
      })
      expect(result!.chatText).toBe('Here is the component.\n\nEnjoy!')
    })

    it('should return null for incomplete code block', () => {
      expect(extractStudioCode('text <cs-studio-code identifier="x">code')).toBeNull()
    })

    it('should return null for no code block', () => {
      expect(extractStudioCode('just regular text')).toBeNull()
    })
  })
})
