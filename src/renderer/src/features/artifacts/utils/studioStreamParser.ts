/**
 * Studio Stream Parser
 *
 * Real-time streaming parser that separates LLM output into:
 * - **Code blocks** → routed to the code editor view
 * - **Everything else** → routed to the chat panel
 *
 * Modeled after bolt.diy's StreamingMessageParser, adapted for Cherry Studio's
 * `<cs-studio-code>` tag protocol.
 *
 * Protocol:
 * ```
 * Chat text here...
 * <cs-studio-code identifier="my-app" type="react" title="Landing Page">
 * // full code streams to editor
 * </cs-studio-code>
 * More chat text...
 * ```
 */

import type { ArtifactType } from '../types'
import { isValidArtifactType } from '../types'

// ── Tag Constants ────────────────────────────────────────────────────────────

const CODE_TAG_OPEN = '<cs-studio-code'
const CODE_TAG_CLOSE = '</cs-studio-code>'

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Metadata extracted from the opening `<cs-studio-code>` tag attributes.
 */
export interface StudioCodeMetadata {
  /** Human-readable identifier (e.g., "landing-page") */
  identifier: string
  /** Artifact type for rendering/syntax highlighting */
  type: ArtifactType
  /** Display title for the artifact version */
  title: string
}

/**
 * Emitted when the opening `<cs-studio-code>` tag is fully parsed.
 */
export interface CodeStartEvent {
  /** Parsed tag metadata */
  metadata: StudioCodeMetadata
  /** Unique message ID for correlation */
  messageId: string
}

/**
 * Emitted as code content streams in — may fire many times per code block.
 */
export interface CodeStreamEvent {
  /** Accumulated code content so far (full buffer, not delta) */
  content: string
  /** The new chunk of code added in this event (delta) */
  delta: string
  /** Message ID for correlation */
  messageId: string
}

/**
 * Emitted when the closing `</cs-studio-code>` tag is found.
 */
export interface CodeCompleteEvent {
  /** Final, complete code content */
  content: string
  /** Tag metadata */
  metadata: StudioCodeMetadata
  /** Message ID for correlation */
  messageId: string
}

/**
 * Callbacks invoked during streaming parse.
 */
export interface StudioStreamCallbacks {
  /** Opening tag fully parsed — code section starting */
  onCodeStart?: (event: CodeStartEvent) => void
  /** New code content chunk available */
  onCodeStream?: (event: CodeStreamEvent) => void
  /** Code section fully closed */
  onCodeComplete?: (event: CodeCompleteEvent) => void
  /** Chat text chunk available (everything outside code tags) */
  onChatText?: (text: string, messageId: string) => void
}

/**
 * Per-message parse state, persisted across incremental `parse()` calls.
 */
interface MessageState {
  /** Current scan position in the input buffer */
  position: number
  /** Whether we're currently inside a `<cs-studio-code>` block */
  insideCode: boolean
  /** Metadata from the opening tag (set when insideCode is true) */
  codeMetadata?: StudioCodeMetadata
  /** Accumulated code content while inside the code block */
  codeBuffer: string
}

// ── Attribute extractor ──────────────────────────────────────────────────────

function extractAttribute(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`, 'i'))
  return match ? match[1] : undefined
}

// ── Parser class ─────────────────────────────────────────────────────────────

/**
 * Streaming-aware parser for `<cs-studio-code>` tags.
 *
 * Usage:
 * ```ts
 * const parser = new StudioStreamParser({ callbacks: { ... } })
 *
 * // Called repeatedly as chunks arrive
 * const chatText = parser.parse(messageId, accumulatedInput)
 * ```
 *
 * The parser processes one character at a time from `state.position` to the end
 * of the input. It maintains per-message state so incremental calls with a
 * growing input buffer work correctly (same pattern as bolt.diy).
 */
export class StudioStreamParser {
  #messages = new Map<string, MessageState>()

  constructor(private _options: { callbacks?: StudioStreamCallbacks } = {}) {}

  /**
   * Parse the (possibly growing) input for a given message.
   *
   * @param messageId - Unique message identifier
   * @param input     - **Full accumulated input** (not just the delta)
   * @returns Chat-destined text produced in this parse pass
   */
  parse(messageId: string, input: string): string {
    let state = this.#messages.get(messageId)

    if (!state) {
      state = {
        position: 0,
        insideCode: false,
        codeBuffer: ''
      }
      this.#messages.set(messageId, state)
    }

    let output = '' // chat text to return
    let i = state.position

    while (i < input.length) {
      if (state.insideCode) {
        // ─── Inside code block: accumulate until close tag ──────────────
        const closeIndex = input.indexOf(CODE_TAG_CLOSE, i)

        if (closeIndex !== -1) {
          // Found closing tag — flush remaining code
          const codeChunk = input.slice(i, closeIndex)
          state.codeBuffer += codeChunk

          // Emit final code stream delta
          if (codeChunk.length > 0) {
            this._options.callbacks?.onCodeStream?.({
              content: state.codeBuffer,
              delta: codeChunk,
              messageId
            })
          }

          // Emit code complete
          const finalContent = cleanCodeContent(state.codeBuffer)
          this._options.callbacks?.onCodeComplete?.({
            content: finalContent,
            metadata: state.codeMetadata!,
            messageId
          })

          // Reset code state
          state.insideCode = false
          state.codeMetadata = undefined
          state.codeBuffer = ''
          i = closeIndex + CODE_TAG_CLOSE.length
        } else {
          // No closing tag yet — buffer everything and emit stream event
          const codeChunk = input.slice(i)
          state.codeBuffer += codeChunk

          this._options.callbacks?.onCodeStream?.({
            content: state.codeBuffer,
            delta: codeChunk,
            messageId
          })

          // Consumed all remaining input, will resume next call
          i = input.length
        }
      } else {
        // ─── Outside code block: emit chat text until we hit an open tag ─
        if (input[i] === '<' && input[i + 1] !== '/') {
          // Potential opening tag — try to match <cs-studio-code
          let potentialTag = ''
          let j = i
          let awaitingOpenTagCompletion = false

          while (j < input.length && potentialTag.length < CODE_TAG_OPEN.length) {
            potentialTag += input[j]

            if (potentialTag === CODE_TAG_OPEN) {
              // Validate next char — must be '>' or ' ' (not a different tag name)
              const nextChar = input[j + 1]
              if (nextChar && nextChar !== '>' && nextChar !== ' ') {
                // Not our tag — emit as regular text
                output += input.slice(i, j + 1)
                i = j + 1
                break
              }

              // Found opening tag — find the end of it
              const openTagEnd = input.indexOf('>', j)

              if (openTagEnd !== -1) {
                // Full opening tag available — parse attributes
                const fullTag = input.slice(i, openTagEnd + 1)
                const metadata = this.#parseOpenTag(fullTag)

                state.insideCode = true
                state.codeMetadata = metadata
                state.codeBuffer = ''

                // Emit code start
                this._options.callbacks?.onCodeStart?.({
                  metadata,
                  messageId
                })

                i = openTagEnd + 1
              } else {
                // Tag not fully received yet — break and wait for more input.
                // DO NOT advance position so we re-scan next time.
                awaitingOpenTagCompletion = true
                break
              }

              // In either case we've handled this `<` — break inner loop
              break
            } else if (!CODE_TAG_OPEN.startsWith(potentialTag)) {
              // Definitely not our tag — emit text normally
              output += input.slice(i, j + 1)
              i = j + 1
              break
            }

            j++
          }

          if (awaitingOpenTagCompletion) {
            break
          }

          // If j reached end of input while still a potential prefix,
          // don't advance — wait for more data
          if (j === input.length && CODE_TAG_OPEN.startsWith(potentialTag)) {
            break
          }
        } else {
          // Regular character — add to chat output
          output += input[i]
          i++
        }
      }
    }

    state.position = i

    // Emit chat text callback if we have any
    if (output.length > 0) {
      this._options.callbacks?.onChatText?.(output, messageId)
    }

    return output
  }

  /**
   * Get the current streaming code content for a message, if any.
   */
  getStreamingCode(messageId: string): string | null {
    const state = this.#messages.get(messageId)
    if (state?.insideCode) {
      return state.codeBuffer
    }
    return null
  }

  /**
   * Check if parser is currently inside a code block for the given message.
   */
  isInsideCode(messageId: string): boolean {
    return this.#messages.get(messageId)?.insideCode ?? false
  }

  /**
   * Get code metadata for the current streaming code block.
   */
  getCodeMetadata(messageId: string): StudioCodeMetadata | undefined {
    return this.#messages.get(messageId)?.codeMetadata
  }

  /**
   * Reset state for a specific message.
   */
  resetMessage(messageId: string): void {
    this.#messages.delete(messageId)
  }

  /**
   * Reset all parser state.
   */
  reset(): void {
    this.#messages.clear()
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  #parseOpenTag(tag: string): StudioCodeMetadata {
    const identifier = extractAttribute(tag, 'identifier') || extractAttribute(tag, 'id') || 'unnamed'
    const rawType = extractAttribute(tag, 'type')?.toLowerCase() || 'html'
    const type: ArtifactType = isValidArtifactType(rawType) ? rawType : 'html'
    const title = extractAttribute(tag, 'title') || 'Untitled'

    return { identifier, type, title }
  }
}

// ── Utilities ────────────────────────────────────────────────────────────────

/**
 * Clean code content: strip wrapping markdown fences if present,
 * unescape HTML entities that some models produce.
 */
function cleanCodeContent(content: string): string {
  let cleaned = content.trim()

  // Remove wrapping markdown code fences (```lang ... ```)
  const fenceRegex = /^\s*```\w*\n([\s\S]*?)\n\s*```\s*$/
  const fenceMatch = cleaned.match(fenceRegex)
  if (fenceMatch) {
    cleaned = fenceMatch[1]
  }

  // Unescape common HTML entities
  cleaned = cleaned.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

  return cleaned
}

/**
 * Quick check: does the text contain any `<cs-studio-code` tag?
 */
export function hasStudioCodeTag(content: string): boolean {
  return content.includes(CODE_TAG_OPEN)
}

/**
 * Quick check: does the text have a complete (closed) studio code block?
 */
export function hasCompleteStudioCode(content: string): boolean {
  return content.includes(CODE_TAG_OPEN) && content.includes(CODE_TAG_CLOSE)
}

/**
 * Extract the final code content from a completed response.
 * Returns null if no complete code block found.
 */
export function extractStudioCode(content: string): {
  code: string
  metadata: StudioCodeMetadata
  chatText: string
} | null {
  const openMatch = content.match(/<cs-studio-code\s+([^>]*)>/i)
  if (!openMatch) return null

  const closeIndex = content.indexOf(CODE_TAG_CLOSE)
  if (closeIndex === -1) return null

  const openEnd = content.indexOf('>', openMatch.index!) + 1
  const code = cleanCodeContent(content.slice(openEnd, closeIndex))

  // Parse metadata from attributes
  const attrString = openMatch[1]
  const identifier =
    extractAttribute(`<tag ${attrString}>`, 'identifier') || extractAttribute(`<tag ${attrString}>`, 'id') || 'unnamed'
  const rawType = extractAttribute(`<tag ${attrString}>`, 'type')?.toLowerCase() || 'html'
  const type: ArtifactType = isValidArtifactType(rawType) ? rawType : 'html'
  const title = extractAttribute(`<tag ${attrString}>`, 'title') || 'Untitled'

  // Chat text = everything outside the code block
  const textBefore = content.slice(0, openMatch.index!).trim()
  const textAfter = content.slice(closeIndex + CODE_TAG_CLOSE.length).trim()
  const chatText = [textBefore, textAfter].filter(Boolean).join('\n\n')

  return {
    code,
    metadata: { identifier, type, title },
    chatText
  }
}
