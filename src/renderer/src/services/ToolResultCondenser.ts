import { estimateTextTokens } from '@renderer/services/TokenService'

// Thresholds for tool outputs
export const TOOL_RESULT_THRESHOLDS = {
  // Safe to include as is
  SAFE: 500,
  
  // Consider summarizing
  WARNING: 2000,
  
  // Implementation should aggressively condense
  CRITICAL: 5000,
  
  // Hard limit (emergency truncation)
  MAXIMUM: 10000
}

export interface CondenseResult {
  condensed: any
  originalTokens: number
  condensedTokens: number
  wasCondensed: boolean
  summary: string
}

function isJSON(content: any): boolean {
  return typeof content === 'object' && content !== null
}

/**
 * Condenses a tool result if it exceeds the maxTokens threshold.
 * 
 * @param content The raw tool output (string or object)
 * @param toolName The name of the tool (for specific strategies)
 * @param maxTokens The token threshold to enforce (default: WARNING level)
 */
export function condenseToolResult(
  content: any,
  _toolName: string,
  maxTokens: number = TOOL_RESULT_THRESHOLDS.WARNING
): CondenseResult {
  const stringifiedContent = typeof content === 'string' ? content : JSON.stringify(content)
  const originalTokens = estimateTextTokens(stringifiedContent)

  // If within limits, return as is
  if (originalTokens <= maxTokens) {
    return {
      condensed: content,
      originalTokens,
      condensedTokens: originalTokens,
      wasCondensed: false,
      summary: ''
    }
  }

  let condensed: any
  let summary = ''

  // Strategy 1: JSON Handling
  if (isJSON(content)) {
    if (Array.isArray(content)) {
      // For arrays (often lists of records), keep the first few items
      // Estimate how many items we can fit.
      // A simple heuristic: Keep top 3-5 items depending on size, or just fixed small number.
      // Let's try to keep 5 items or 10% of items if it's huge, but simpler to just cap.
      const previewCount = 5
      
      if (content.length <= previewCount) {
         // If short array but still huge tokens (e.g. 5 huge strings), fall back to string truncation on the JSON
         // This is tricky. Let's just treat as string if array logic fails to reduce enough?
         // For now, simpler approach:
         condensed = [
            ...content.slice(0, previewCount),
            `... ${content.length - previewCount} more items omitted to save context.`
         ]
         summary = `Summarized list: kept first ${previewCount} of ${content.length} items.`
      } else {
         condensed = [
            ...content.slice(0, previewCount),
            `... ${content.length - previewCount} more items omitted to save context.`
         ]
         summary = `Summarized list: kept first ${previewCount} of ${content.length} items.`
      }
    } else {
      // For Objects
      // Simple strategy: Keep keys, but truncate values? 
      // Or just a metadata summary.
      const keys = Object.keys(content)
      condensed = {
        _info: 'Object content summarized due to size',
        _keys: keys.slice(0, 20), // Show first 20 keys
        _keyCount: keys.length,
        _preview: stringifiedContent.slice(0, 500) + '...'
      }
      summary = `Condensed large object result (original: ${originalTokens} tokens).`
    }
  } 
  
  // Strategy 2: Text Handling (or fallback if JSON condensation didn't happen/wasn't applicable)
  // If we didn't condense yet (because it was a string), do text truncation
  if (condensed === undefined) {
    // Keep head and tail, truncate middle
    // 1 token approx 4 chars. unique to english but okay estimate.
    const charLimit = maxTokens * 3 
    const headChars = Math.floor(charLimit * 0.6) // Keep slightly more context at start
    const tailChars = Math.floor(charLimit * 0.4)
    
    if (stringifiedContent.length > charLimit) {
        condensed = stringifiedContent.slice(0, headChars) + 
          `\n\n... [${originalTokens - maxTokens} tokens truncated for context efficiency] ...\n\n` + 
          stringifiedContent.slice(-tailChars)
        summary = `Truncated large text output (kept ~${headChars + tailChars} chars).`
    } else {
        // It was within char limit but estimated as high tokens? Unusual but possible with non-ascii.
        // Just slice it anyway to be safe.
        condensed = stringifiedContent.slice(0, charLimit) + '... (truncated)'
        summary = `Truncated text output.`
    }
  }

  // Final check / re-measurement
  const condensedString = typeof condensed === 'string' ? condensed : JSON.stringify(condensed)
  const condensedTokens = estimateTextTokens(condensedString)

  return {
    condensed,
    originalTokens,
    condensedTokens,
    wasCondensed: true,
    summary: summary || `Condensed tool output (${originalTokens} -> ${condensedTokens} tokens)`
  }
}
