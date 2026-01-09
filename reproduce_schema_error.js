/**
 * UPDATED filterProperties with Gemini array fix
 * (COPIED FROM src/renderer/src/utils/mcp-schema.ts for testing)
 */
function filterProperties(schema) {
  if (!schema || typeof schema !== 'object') {
    return schema
  }

  if (Array.isArray(schema)) {
    return schema.map(filterProperties)
  }

  const filtered = { ...schema }

  if (filtered.properties && typeof filtered.properties === 'object') {
    const newProperties = {}
    for (const [key, value] of Object.entries(filtered.properties)) {
      if (value === undefined || value === null) {
        continue
      }
      newProperties[key] = filterProperties(value)
    }
    filtered.properties = newProperties
  }

  // GEMINI FIX: Enforce 'items' for array schemas.
  if (filtered.type === 'array' && !filtered.items) {
    filtered.items = { type: 'string' }
  }

  if (filtered.items) {
    filtered.items = filterProperties(filtered.items)
  }
  if (filtered.additionalProperties && typeof filtered.additionalProperties === 'object') {
    filtered.additionalProperties = filterProperties(filtered.additionalProperties)
  }
  if (filtered.patternProperties) {
    const newPatternProperties = {}
    for (const [pattern, value] of Object.entries(filtered.patternProperties)) {
      newPatternProperties[pattern] = filterProperties(value)
    }
    filtered.patternProperties = newPatternProperties
  }

  const arrayCompositionKeywords = ['allOf', 'anyOf', 'oneOf']
  for (const keyword of arrayCompositionKeywords) {
    if (filtered[keyword]) {
      filtered[keyword] = filtered[keyword].map(filterProperties)
    }
  }

  const singleSchemaKeywords = ['not', 'if', 'then', 'else']
  for (const keyword of singleSchemaKeywords) {
    if (filtered[keyword]) {
      filtered[keyword] = filterProperties(filtered[keyword])
    }
  }

  if (filtered.type === 'object') {
    if (!filtered.properties) {
      filtered.properties = {}
    }
    if (filtered.properties) {
      const validPropertyKeys = new Set(Object.keys(filtered.properties))
      if (filtered.required && Array.isArray(filtered.required)) {
        filtered.required = filtered.required.filter((key) => validPropertyKeys.has(key))
        if (filtered.required.length === 0) {
          delete filtered.required
        }
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

if (filtered.properties.tags.type === 'array' && filtered.properties.tags.items) {
  console.log('PASS: Array schema has "items" property:', JSON.stringify(filtered.properties.tags.items))
} else {
  console.log('FAIL: Array schema is missing "items" property')
  process.exit(1)
}
