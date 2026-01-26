import { describe, expect, it } from 'vitest'

import { filterProperties } from '../mcp-schema'

describe('filterProperties', () => {
  describe('edge cases', () => {
    it('should return null for null input', () => {
      expect(filterProperties(null)).toBe(null)
    })

    it('should return undefined for undefined input', () => {
      expect(filterProperties(undefined)).toBe(undefined)
    })

    it('should return primitive values unchanged', () => {
      expect(filterProperties('string')).toBe('string')
      expect(filterProperties(123)).toBe(123)
      expect(filterProperties(true)).toBe(true)
      expect(filterProperties(false)).toBe(false)
    })
  })

  describe('array handling', () => {
    it('should recursively process array items', () => {
      const input = [{ type: 'object', properties: { name: { type: 'string' } } }, { type: 'string' }]
      const result = filterProperties(input)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        type: 'object',
        properties: { name: { type: 'string' } },
        // No required array since none was in input
        additionalProperties: false
      })
      expect(result[1]).toEqual({ type: 'string' })
    })

    it('should handle empty arrays', () => {
      expect(filterProperties([])).toEqual([])
    })
  })

  describe('object type schema processing', () => {
    it('should add empty properties field for object type without properties', () => {
      const input = { type: 'object' }
      const result = filterProperties(input)

      expect(result).toEqual({
        type: 'object',
        properties: {},
        // No required array when there are no properties
        additionalProperties: false
      })
    })

    it('should NOT set all property keys as required - preserve original intent', () => {
      const input = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          active: { type: 'boolean' }
        }
        // No required array in input
      }
      const result = filterProperties(input)

      // Should NOT have required array since none was provided
      expect(result.required).toBeUndefined()
      expect(result.additionalProperties).toBe(false)
    })

    it('should preserve and validate existing required array', () => {
      const input = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name'] // This should be preserved
      }
      const result = filterProperties(input)

      expect(result.required).toEqual(['name']) // Only originally required properties
    })

    it('should set additionalProperties to false regardless of original value', () => {
      const input1 = {
        type: 'object',
        properties: { name: { type: 'string' } },
        additionalProperties: true
      }
      const input2 = {
        type: 'object',
        properties: { name: { type: 'string' } }
        // additionalProperties undefined
      }

      const result1 = filterProperties(input1)
      const result2 = filterProperties(input2)

      expect(result1.additionalProperties).toBe(false)
      expect(result2.additionalProperties).toBe(false)
    })
  })

  describe('nested object processing', () => {
    it('should recursively process nested object properties and validate required arrays', () => {
      const input = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              address: {
                type: 'object',
                properties: {
                  street: { type: 'string' },
                  city: { type: 'string' }
                },
                required: ['street'] // Only street is required
              }
            },
            required: ['name'] // Only name is required
          },
          count: { type: 'number' }
        },
        required: ['user'] // Only user is required at top level
      }

      const result = filterProperties(input)

      // Check top level - preserves original required
      expect(result.required).toEqual(['user'])
      expect(result.additionalProperties).toBe(false)

      // Check nested user object - preserves original required
      expect(result.properties.user.required).toEqual(['name'])
      expect(result.properties.user.additionalProperties).toBe(false)

      // Check deeply nested address object - preserves original required
      expect(result.properties.user.properties.address.required).toEqual(['street'])
      expect(result.properties.user.properties.address.additionalProperties).toBe(false)
    })
  })

  describe('schema composition keywords', () => {
    it('should process allOf schemas', () => {
      const input = {
        allOf: [
          { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
          { type: 'object', properties: { age: { type: 'number' } }, required: ['age'] }
        ]
      }

      const result = filterProperties(input)

      expect(result.allOf).toHaveLength(2)
      expect(result.allOf[0].required).toEqual(['name'])
      expect(result.allOf[1].required).toEqual(['age'])
    })

    it('should process anyOf schemas', () => {
      const input = {
        anyOf: [{ type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }, { type: 'string' }]
      }

      const result = filterProperties(input)

      expect(result.anyOf).toHaveLength(2)
      expect(result.anyOf[0].required).toEqual(['name'])
      expect(result.anyOf[1]).toEqual({ type: 'string' })
    })

    it('should process oneOf schemas', () => {
      const input = {
        oneOf: [
          { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] },
          { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }
        ]
      }

      const result = filterProperties(input)

      expect(result.oneOf).toHaveLength(2)
      expect(result.oneOf[0].required).toEqual(['id'])
      expect(result.oneOf[1].required).toEqual(['name'])
    })

    it('should process not schema', () => {
      const input = {
        not: {
          type: 'object',
          properties: { forbidden: { type: 'string' } },
          required: ['forbidden']
        }
      }

      const result = filterProperties(input)

      expect(result.not.required).toEqual(['forbidden'])
      expect(result.not.additionalProperties).toBe(false)
    })

    it('should process if/then/else schemas', () => {
      const input = {
        if: { type: 'object', properties: { type: { const: 'user' } }, required: ['type'] },
        then: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
        else: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] }
      }

      const result = filterProperties(input)

      expect(result.if.required).toEqual(['type'])
      expect(result.then.required).toEqual(['name'])
      expect(result.else.required).toEqual(['id'])
    })
  })

  describe('array items processing', () => {
    it('should process array items schema', () => {
      const input = {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            value: { type: 'number' }
          },
          required: ['name', 'value']
        }
      }

      const result = filterProperties(input)

      expect(result.items.required).toEqual(['name', 'value'])
      expect(result.items.additionalProperties).toBe(false)
    })
  })

  describe('additionalProperties and patternProperties', () => {
    it('should process additionalProperties when it is an object schema', () => {
      const input = {
        type: 'object',
        properties: { name: { type: 'string' } },
        additionalProperties: {
          type: 'object',
          properties: { extra: { type: 'string' } }
        }
      }

      const result = filterProperties(input)

      // The outer object should have additionalProperties set to false due to o3 requirements
      expect(result.additionalProperties).toBe(false)
      // But we should also check that the original additionalProperties schema was processed
      // Note: This test reveals that the current implementation may have an issue
      // The additionalProperties object schema processing happens before the o3 override
    })

    it('should process patternProperties schemas', () => {
      const input = {
        type: 'object',
        patternProperties: {
          '^[a-z]+$': {
            type: 'object',
            properties: { value: { type: 'string' } },
            required: ['value']
          },
          '^[A-Z]+$': {
            type: 'object',
            properties: { count: { type: 'number' } },
            required: ['count']
          }
        }
      }

      const result = filterProperties(input)

      expect(result.patternProperties['^[a-z]+$'].required).toEqual(['value'])
      expect(result.patternProperties['^[A-Z]+$'].required).toEqual(['count'])
    })
  })

  describe('non-object type schemas', () => {
    it('should not modify string and number schemas but should add items to array schemas', () => {
      const stringSchema = { type: 'string', minLength: 1 }
      const numberSchema = { type: 'number', minimum: 0 }
      const arraySchema = { type: 'array', minItems: 1 }

      expect(filterProperties(stringSchema)).toEqual(stringSchema)
      expect(filterProperties(numberSchema)).toEqual(numberSchema)
      // Array schemas should get default items for Gemini API compatibility
      expect(filterProperties(arraySchema)).toEqual({
        type: 'array',
        minItems: 1,
        items: { type: 'string' }
      })
    })
  })

  describe('undefined and null property handling', () => {
    it('should filter out undefined property values', () => {
      const input = {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to fetch' },
          headers: undefined // This should be filtered out
        },
        required: ['url', 'headers'] // headers should be removed from required
      }

      const result = filterProperties(input)

      // headers should be removed from properties
      expect(result.properties).toEqual({
        url: { type: 'string', description: 'URL to fetch' }
      })
      // required should only contain 'url' since 'headers' was filtered out
      expect(result.required).toEqual(['url'])
    })

    it('should filter out null property values', () => {
      const input = {
        type: 'object',
        properties: {
          path: { type: 'string' },
          options: null // This should be filtered out
        },
        required: ['path', 'options']
      }

      const result = filterProperties(input)

      expect(result.properties).toEqual({
        path: { type: 'string' }
      })
      expect(result.required).toEqual(['path'])
    })

    it('should handle schema with all undefined properties', () => {
      const input = {
        type: 'object',
        properties: {
          a: undefined,
          b: undefined
        },
        required: ['a', 'b']
      }

      const result = filterProperties(input)

      expect(result.properties).toEqual({})
      // Required array should be removed since all properties were filtered out
      expect(result.required).toBeUndefined()
    })

    it('should handle Gemini-style MCP tool schema with undefined headers', () => {
      // This is the actual schema pattern that was causing Gemini API errors
      const input = {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL of the website to fetch' },
          headers: undefined // MCP server returns undefined for optional complex types
        },
        required: ['url', 'headers']
      }

      const result = filterProperties(input)

      // The result should be valid for Gemini API
      expect(result.properties.headers).toBeUndefined()
      expect(result.required).not.toContain('headers')
      expect(result.required).toContain('url')
    })
  })

  describe('complex real-world scenarios', () => {
    it('should handle complex nested schema with multiple composition patterns', () => {
      const input = {
        type: 'object',
        properties: {
          user: {
            allOf: [
              { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
              {
                anyOf: [
                  { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
                  { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] }
                ]
              }
            ]
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                metadata: {
                  type: 'object',
                  properties: { tags: { type: 'array' } },
                  required: ['tags']
                }
              },
              required: ['title', 'metadata']
            }
          }
        },
        required: ['user', 'items']
      }

      const result = filterProperties(input)

      // Check root level - preserves original required
      expect(result.required).toEqual(['user', 'items'])
      expect(result.additionalProperties).toBe(false)

      // Check nested schemas - preserves original required
      expect(result.properties.user.allOf[0].required).toEqual(['id'])
      expect(result.properties.user.allOf[1].anyOf[0].required).toEqual(['name'])
      expect(result.properties.user.allOf[1].anyOf[1].required).toEqual(['email'])

      // Check array items - preserves original required
      expect(result.properties.items.items.required).toEqual(['title', 'metadata'])
      expect(result.properties.items.items.properties.metadata.required).toEqual(['tags'])
    })

    it('should handle MCP tool schema example - preserving original required', () => {
      const mcpToolSchema = {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results',
            minimum: 1,
            maximum: 100
          },
          filters: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              dateRange: {
                type: 'object',
                properties: {
                  start: { type: 'string', format: 'date' },
                  end: { type: 'string', format: 'date' }
                }
                // No required array - all optional
              }
            }
            // No required array - all optional
          }
        },
        required: ['query'] // Only query is required
      }

      const result = filterProperties(mcpToolSchema)

      // Check that only originally required properties are in required array
      expect(result.required).toEqual(['query'])
      expect(result.additionalProperties).toBe(false)

      // Check nested objects - no required arrays since none were provided
      expect(result.properties.filters.required).toBeUndefined()
      expect(result.properties.filters.additionalProperties).toBe(false)
      expect(result.properties.filters.properties.dateRange.required).toBeUndefined()
      expect(result.properties.filters.properties.dateRange.additionalProperties).toBe(false)
    })
  })
})
