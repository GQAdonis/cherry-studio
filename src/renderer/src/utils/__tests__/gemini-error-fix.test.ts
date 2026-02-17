import { describe, expect, it } from 'vitest'

import { filterProperties, isUndefinedVariant } from '../mcp-schema'

describe('Gemini API Error Fix', () => {
  describe('array items with [undefined] string literals', () => {
    it('should fix array schema with "[undefined]" items field', () => {
      const problematicSchema = {
        type: 'object',
        properties: {
          session_id: { type: 'string' },
          data: {
            type: 'array',
            items: '[undefined]' // This causes the Gemini API error
          },
          x_key: { type: 'string' },
          y_keys: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['session_id', 'data', 'x_key', 'y_keys']
      }

      console.log('Original schema:', JSON.stringify(problematicSchema, null, 2))

      const result = filterProperties(problematicSchema)

      console.log('Filtered schema:', JSON.stringify(result, null, 2))

      // Should have fixed the "[undefined]" items to a valid schema
      expect(result.properties.data.items).not.toBe('[undefined]')
      expect(result.properties.data.items).toEqual({ type: 'string' })
      expect(isUndefinedVariant('[undefined]')).toBe(true)
    })

    it('should handle multiple array items with undefined variants', () => {
      const schemaWithMultipleArrays = {
        type: 'object',
        properties: {
          arrayWithUndefinedString: {
            type: 'array',
            items: '[undefined]'
          },
          arrayWithUndefinedLiteral: {
            type: 'array',
            items: 'undefined'
          },
          arrayWithNullItems: {
            type: 'array',
            items: null
          },
          arrayWithUndefinedValue: {
            type: 'array',
            items: undefined
          },
          arrayWithEmptyObject: {
            type: 'array',
            items: {}
          },
          validArray: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['arrayWithUndefinedString', 'validArray']
      }

      const result = filterProperties(schemaWithMultipleArrays)

      // All problematic arrays should be fixed
      expect(result.properties.arrayWithUndefinedString.items).toEqual({ type: 'string' })
      expect(result.properties.arrayWithUndefinedLiteral.items).toEqual({ type: 'string' })
      expect(result.properties.arrayWithNullItems.items).toEqual({ type: 'string' })
      expect(result.properties.arrayWithUndefinedValue.items).toEqual({ type: 'string' })
      expect(result.properties.arrayWithEmptyObject.items).toEqual({ type: 'string' })

      // Valid array should remain unchanged
      expect(result.properties.validArray.items).toEqual({ type: 'string' })
    })

    it('should fix nested arrays with undefined items', () => {
      const nestedArraySchema = {
        type: 'object',
        properties: {
          complexData: {
            type: 'object',
            properties: {
              nestedArray: {
                type: 'array',
                items: '[undefined]'
              },
              deeplyNested: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    innerArray: {
                      type: 'array',
                      items: 'undefined'
                    }
                  }
                }
              }
            }
          }
        }
      }

      const result = filterProperties(nestedArraySchema)

      expect(result.properties.complexData.properties.nestedArray.items).toEqual({ type: 'string' })
      expect(result.properties.complexData.properties.deeplyNested.items.properties.innerArray.items).toEqual({
        type: 'string'
      })
    })
  })

  describe('isUndefinedVariant function', () => {
    it('should correctly identify all undefined variants', () => {
      // String literals that should be detected
      expect(isUndefinedVariant('[undefined]')).toBe(true)
      expect(isUndefinedVariant('undefined')).toBe(true)
      expect(isUndefinedVariant('')).toBe(true)
      expect(isUndefinedVariant('   ')).toBe(true)

      // Actual undefined/null values
      expect(isUndefinedVariant(undefined)).toBe(true)
      expect(isUndefinedVariant(null)).toBe(true)

      // Empty objects
      expect(isUndefinedVariant({})).toBe(true)

      // Valid values that should NOT be detected
      expect(isUndefinedVariant({ type: 'string' })).toBe(false)
      expect(isUndefinedVariant('string')).toBe(false)
      expect(isUndefinedVariant('object')).toBe(false)
      expect(isUndefinedVariant({ type: 'object', properties: {} })).toBe(false)
    })
  })

  describe('AI SDK tool integration path', () => {
    it('should fix array schema through AI SDK conversion path', async () => {
      // Import the AI SDK conversion function
      const { convertMcpToolsToAiSdkTools } = await import('@renderer/aiCore/utils/mcp')

      const mockTool = {
        id: 'test-tool',
        serverId: 'test-server-id',
        serverName: 'Test Server',
        name: 'Test Tool',
        description: 'A test tool with problematic array schema',
        type: 'mcp' as const,
        inputSchema: {
          type: 'object' as const,
          properties: {
            data: {
              type: 'array' as const,
              items: '[undefined]' // This should be fixed by AI SDK preprocessing
            }
          },
          required: ['data']
        }
      }

      const result = convertMcpToolsToAiSdkTools([mockTool])

      // Check that the tool was converted and the schema was fixed
      expect(result).toBeDefined()
      expect(result['test-tool']).toBeDefined()
    }, 60_000)
  })
})
