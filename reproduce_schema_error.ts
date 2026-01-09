/**
 * Recursively filters and validates properties for OpenAI o3 strict schema validation
 * (COPIED FROM src/renderer/src/utils/mcp-schema.ts for testing)
 */
function filterProperties(schema: any): any {
  if (!schema || typeof schema !== 'object') {
    return schema
  }

  // Handle arrays by recursively processing items
  if (Array.isArray(schema)) {
    return schema.map(filterProperties)
  }

  const filtered = { ...schema }

  // Process all properties recursively first
  if (filtered.properties && typeof filtered.properties === 'object') {
    const newProperties: any = {}
    for (const [key, value] of Object.entries(filtered.properties)) {
      if (value === undefined || value === null) {
        continue
      }
      newProperties[key] = filterProperties(value)
    }
    filtered.properties = newProperties
  }

  // Process other schema fields that might contain nested schemas
  if (filtered.items) {
    filtered.items = filterProperties(filtered.items)
  }
  if (filtered.additionalProperties && typeof filtered.additionalProperties === 'object') {
    filtered.additionalProperties = filterProperties(filtered.additionalProperties)
  }
  if (filtered.patternProperties) {
    const newPatternProperties: any = {}
    for (const [pattern, value] of Object.entries(filtered.patternProperties)) {
      newPatternProperties[pattern] = filterProperties(value)
    }
    filtered.patternProperties = newPatternProperties
  }

  // Handle schema composition keywords (array-based)
  const arrayCompositionKeywords = ['allOf', 'anyOf', 'oneOf']
  for (const keyword of arrayCompositionKeywords) {
    if (filtered[keyword]) {
      filtered[keyword] = filtered[keyword].map(filterProperties)
    }
  }

  // Handle single schema keywords
  const singleSchemaKeywords = ['not', 'if', 'then', 'else']
  for (const keyword of singleSchemaKeywords) {
    if (filtered[keyword]) {
      filtered[keyword] = filterProperties(filtered[keyword])
    }
  }

  // For ALL object schemas, ensure proper schema compliance
  if (filtered.type === 'object') {
    if (!filtered.properties) {
      filtered.properties = {}
    }

    const validPropertyKeys = new Set(Object.keys(filtered.properties))
    if (filtered.required && Array.isArray(filtered.required)) {
      filtered.required = filtered.required.filter((key: string) => validPropertyKeys.has(key))
      if (filtered.required.length === 0) {
        delete filtered.required
      }
    }

    filtered.additionalProperties = false
  }

  return filtered
}

const schema = {
  type: 'object',
  properties: {
    tags: {
      type: 'array',
      description: 'A list of tags'
    }
  }
}

const filtered = filterProperties(schema)
console.log('Processed Schema:', JSON.stringify(filtered, null, 2))

if (filtered.properties.tags.type === 'array' && !filtered.properties.tags.items) {
  console.log('FAIL: Array schema is missing "items" property')
} else {
  console.log('PASS: Array schema has "items" property')
}
