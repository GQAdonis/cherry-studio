# Agent Specification Schema

## 3.1. JSON Schema for Agent Definitions

The intent-based agent selection system relies on a well-defined agent specification schema to identify agent capabilities and map user intents to the most appropriate agent. This section defines the JSON schema used for agent definitions.

```typescript
/**
 * Agent Definition Schema
 * 
 * Defines the structure for agent specifications in the Mastra orchestrator.
 * These definitions are used for both agent registration and intent classification.
 */
export interface AgentDefinition {
  /** Unique identifier for the agent */
  id: string;
  
  /** Human-readable name of the agent */
  name: string;
  
  /** Detailed description of the agent's purpose and capabilities */
  description: string;
  
  /** Version information */
  version: {
    /** Semantic version of the agent */
    semantic: string;
    /** Timestamp of the last update */
    lastUpdated: string;
  };
  
  /** Agent capabilities */
  capabilities: AgentCapability[];
  
  /** Intent mapping configuration */
  intents: AgentIntent[];
  
  /** Example queries for training */
  examples: AgentExample[];
  
  /** Additional configuration options */
  config: AgentConfig;
  
  /** Metadata for agent selection and management */
  metadata: AgentMetadata;
}
```

The JSON Schema implementation in JSON Schema Draft 2020-12 format:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Agent Definition",
  "description": "Schema for defining agents in the Mastra orchestrator",
  "type": "object",
  "required": ["id", "name", "description", "version", "capabilities", "intents"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier for the agent"
    },
    "name": {
      "type": "string",
      "description": "Human-readable name of the agent"
    },
    "description": {
      "type": "string",
      "description": "Detailed description of the agent's purpose and capabilities"
    },
    "version": {
      "type": "object",
      "required": ["semantic", "lastUpdated"],
      "properties": {
        "semantic": {
          "type": "string",
          "description": "Semantic version of the agent"
        },
        "lastUpdated": {
          "type": "string",
          "format": "date-time",
          "description": "Timestamp of the last update"
        }
      }
    },
    "capabilities": {
      "type": "array",
      "description": "List of agent capabilities",
      "items": {
        "$ref": "#/definitions/AgentCapability"
      }
    },
    "intents": {
      "type": "array",
      "description": "Intent mapping configuration",
      "items": {
        "$ref": "#/definitions/AgentIntent"
      }
    },
    "examples": {
      "type": "array",
      "description": "Example queries for training",
      "items": {
        "$ref": "#/definitions/AgentExample"
      }
    },
    "config": {
      "$ref": "#/definitions/AgentConfig"
    },
    "metadata": {
      "$ref": "#/definitions/AgentMetadata"
    }
  },
  "definitions": {
    "AgentCapability": {
      "type": "object",
      "required": ["name", "description"],
      "properties": {
        "name": {
          "type": "string",
          "description": "Name of the capability"
        },
        "description": {
          "type": "string",
          "description": "Description of the capability"
        },
        "parameters": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/CapabilityParameter"
          }
        }
      }
    },
    "CapabilityParameter": {
      "type": "object",
      "required": ["name", "type", "description"],
      "properties": {
        "name": {
          "type": "string"
        },
        "type": {
          "type": "string",
          "enum": ["string", "number", "boolean", "object", "array"]
        },
        "description": {
          "type": "string"
        },
        "required": {
          "type": "boolean",
          "default": false
        }
      }
    },
    "AgentIntent": {
      "type": "object",
      "required": ["name", "description", "variations"],
      "properties": {
        "name": {
          "type": "string",
          "description": "Unique name of the intent"
        },
        "description": {
          "type": "string",
          "description": "Description of the intent"
        },
        "variations": {
          "type": "array",
          "description": "Example phrases for this intent",
          "items": {
            "type": "string"
          }
        },
        "priority": {
          "type": "number",
          "description": "Priority level for this intent (higher values have higher priority)",
          "default": 1
        },
        "requiredEntities": {
          "type": "array",
          "description": "Entities that must be present for this intent",
          "items": {
            "type": "string"
          }
        }
      }
    },
    "AgentExample": {
      "type": "object",
      "required": ["query", "intent"],
      "properties": {
        "query": {
          "type": "string",
          "description": "Example user query"
        },
        "intent": {
          "type": "string",
          "description": "Associated intent name"
        },
        "entities": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/ExampleEntity"
          }
        }
      }
    },
    "ExampleEntity": {
      "type": "object",
      "required": ["text", "label", "start", "end"],
      "properties": {
        "text": {
          "type": "string",
          "description": "Entity text"
        },
        "label": {
          "type": "string",
          "description": "Entity label"
        },
        "start": {
          "type": "integer",
          "description": "Start position in the text"
        },
        "end": {
          "type": "integer",
          "description": "End position in the text"
        }
      }
    },
    "AgentConfig": {
      "type": "object",
      "properties": {
        "allowFallback": {
          "type": "boolean",
          "description": "Whether this agent can be used as a fallback",
          "default": true
        },
        "confidenceThreshold": {
          "type": "number",
          "description": "Minimum confidence threshold for this agent to handle a request",
          "minimum": 0,
          "maximum": 1,
          "default": 0.6
        },
        "maxContextLength": {
          "type": "integer",
          "description": "Maximum context length for this agent",
          "default": 10000
        }
      }
    },
    "AgentMetadata": {
      "type": "object",
      "properties": {
        "tags": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "category": {
          "type": "string"
        },
        "author": {
          "type": "string"
        },
        "createdAt": {
          "type": "string",
          "format": "date-time"
        },
        "modelType": {
          "type": "string"
        },
        "supportedLanguages": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      }
    }
  }
}
```

## 3.2. Required and Optional Parameters

The agent specification schema includes both required and optional parameters, ensuring flexibility while maintaining structural integrity.

### Required Parameters

| Parameter | Description | Purpose in Intent Classification |
|-----------|-------------|-----------------------------------|
| `id` | Unique identifier | Used as a reference for agent selection |
| `name` | Human-readable name | Used for display and debugging |
| `description` | Detailed purpose | Used for semantic matching and training |
| `version.semantic` | Semantic version | Enables versioning and updates |
| `version.lastUpdated` | Update timestamp | Tracks freshness of agent definitions |
| `capabilities` | Agent functionality | Maps intents to capabilities |
| `intents` | Intent configuration | Core component for training and matching |

### Optional Parameters

| Parameter | Description | Default Value | Purpose |
|-----------|-------------|---------------|---------|
| `examples` | Training examples | `[]` | Enhances training data |
| `config.allowFallback` | Fallback eligibility | `true` | Controls agent usage in fallback scenarios |
| `config.confidenceThreshold` | Minimum confidence | `0.6` | Sets selection threshold |
| `metadata.tags` | Categorization tags | `[]` | Improves searchability |
| `metadata.category` | Primary category | `null` | Helps with agent organization |

## 3.3. Agent Metadata Structure

The agent metadata structure contains information about the agent that isn't directly related to its functionality but is useful for management, discovery, and organization.

```typescript
export interface AgentMetadata {
  /** Categorization tags for the agent */
  tags?: string[];
  
  /** Primary category for the agent */
  category?: string;
  
  /** Author or owner of the agent */
  author?: string;
  
  /** Creation timestamp */
  createdAt?: string;
  
  /** Type of model used by the agent */
  modelType?: string;
  
  /** Languages supported by the agent */
  supportedLanguages?: string[];
  
  /** Performance metrics */
  performance?: {
    /** Average latency in milliseconds */
    avgLatency?: number;
    /** Success rate as a percentage */
    successRate?: number;
    /** Number of requests processed */
    requestCount?: number;
  };
  
  /** Custom metadata fields */
  [key: string]: unknown;
}
```

The metadata structure allows for:
- Categorization and filtering of agents
- Performance tracking and monitoring
- Language and regionalization support
- Custom metadata for specialized agents

## 3.4. Agent Capabilities Specification

Agent capabilities define what an agent can do and are directly tied to the intents it can handle. This forms the core mapping mechanism between user intents and agent selection.

```typescript
export interface AgentCapability {
  /** Name of the capability */
  name: string;
  
  /** Description of what the capability does */
  description: string;
  
  /** Parameters required by the capability, if any */
  parameters?: CapabilityParameter[];
  
  /** Example usages of this capability */
  examples?: string[];
  
  /** Related intents that map to this capability */
  relatedIntents?: string[];
  
  /** Whether this is a primary capability */
  isPrimary?: boolean;
}

export interface CapabilityParameter {
  /** Parameter name */
  name: string;
  
  /** Parameter data type */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  
  /** Description of the parameter */
  description: string;
  
  /** Whether the parameter is required */
  required?: boolean;
  
  /** Default value if not provided */
  defaultValue?: string | number | boolean | object | unknown[];
  
  /** Validation constraints */
  constraints?: {
    /** Minimum value (for numbers) */
    min?: number;
    /** Maximum value (for numbers) */
    max?: number;
    /** Allowed values (for any type) */
    enum?: Array<string | number | boolean>;
    /** Regex pattern (for strings) */
    pattern?: string;
  };
}
```

### Capability-to-Intent Mapping

Capabilities are mapped to intents in a many-to-many relationship:
- Each intent can relate to multiple capabilities
- Each capability can be associated with multiple intents

This flexible mapping allows for more nuanced agent selection based on the specific capabilities required by a user's intent.

## 3.5. Intent Mapping Configuration

The intent mapping configuration defines the intents an agent can recognize and how they map to its capabilities.

```typescript
export interface AgentIntent {
  /** Unique name of the intent */
  name: string;
  
  /** Description of the intent */
  description: string;
  
  /** Example phrases for this intent */
  variations: string[];
  
  /** Priority level for this intent (higher values have higher priority) */
  priority?: number;
  
  /** Entities that must be present for this intent */
  requiredEntities?: string[];
  
  /** Capabilities this intent maps to */
  capabilities?: string[];
  
  /** Context requirements for this intent */
  contextRequirements?: {
    /** Required previous intents for context */
    requiredPreviousIntents?: string[];
    /** Number of conversation turns to consider */
    conversationTurns?: number;
  };
}
```

### Intent Priority System

The priority system helps resolve ambiguities when multiple intents are detected with similar confidence scores:

- Higher priority intents are preferred in ambiguous situations
- Default priority is 1 if not specified
- Priority values are relative within an agent's context
- Global priority normalization occurs during model training

## 3.6. Example Agent Definitions

Below is an example of a complete agent definition for a code generation agent:

```json
{
  "id": "code-generation-agent",
  "name": "Code Generation Agent",
  "description": "Specialized agent for generating and explaining code across multiple programming languages",
  "version": {
    "semantic": "1.0.0",
    "lastUpdated": "2025-05-15T12:00:00Z"
  },
  "capabilities": [
    {
      "name": "generateCode",
      "description": "Generates code based on user requirements",
      "parameters": [
        {
          "name": "language",
          "type": "string",
          "description": "Programming language to generate code in",
          "required": true
        },
        {
          "name": "requirements",
          "type": "string",
          "description": "Detailed requirements for the code",
          "required": true
        }
      ],
      "relatedIntents": ["code_generation", "create_script", "build_function"],
      "isPrimary": true
    },
    {
      "name": "explainCode",
      "description": "Explains existing code in detail",
      "parameters": [
        {
          "name": "code",
          "type": "string",
          "description": "Code to explain",
          "required": true
        },
        {
          "name": "detailLevel",
          "type": "string",
          "description": "Level of detail for explanation",
          "required": false,
          "defaultValue": "medium"
        }
      ],
      "relatedIntents": ["code_explanation", "understand_code", "code_review"],
      "isPrimary": true
    }
  ],
  "intents": [
    {
      "name": "code_generation",
      "description": "User wants to generate code",
      "variations": [
        "Write a function that {requirement}",
        "Create a script for {requirement}",
        "Generate code to {requirement}",
        "Implement a solution for {requirement}",
        "Code a {language} program that {requirement}"
      ],
      "priority": 5,
      "capabilities": ["generateCode"]
    },
    {
      "name": "code_explanation",
      "description": "User wants code explained",
      "variations": [
        "Explain this code",
        "What does this code do?",
        "Help me understand this function",
        "Walk me through this implementation",
        "What's happening in this {language} code?"
      ],
      "priority": 4,
      "capabilities": ["explainCode"]
    }
  ],
  "examples": [
    {
      "query": "Write a Python function to find prime numbers",
      "intent": "code_generation",
      "entities": [
        {
          "text": "Python",
          "label": "language",
          "start": 8,
          "end": 14
        },
        {
          "text": "find prime numbers",
          "label": "requirement",
          "start": 27,
          "end": 45
        }
      ]
    },
    {
      "query": "Can you explain how this regular expression works?",
      "intent": "code_explanation",
      "entities": [
        {
          "text": "regular expression",
          "label": "code_element",
          "start": 21,
          "end": 39
        }
      ]
    }
  ],
  "config": {
    "allowFallback": true,
    "confidenceThreshold": 0.7,
    "maxContextLength": 15000
  },
  "metadata": {
    "tags": ["code", "programming", "development", "software"],
    "category": "Development",
    "author": "Flame Agent Team",
    "createdAt": "2025-04-01T10:30:00Z",
    "modelType": "mastra-code-specialized",
    "supportedLanguages": [
      "python", "javascript", "typescript", "java", "c#", "rust", "go"
    ]
  }
}
```

### Database Agent Example 

Here's a partial example of a database query agent definition:

```json
{
  "id": "database-query-agent",
  "name": "Database Query Agent",
  "description": "Specialized agent for handling database queries and operations",
  "version": {
    "semantic": "1.2.0",
    "lastUpdated": "2025-05-10T09:15:00Z"
  },
  "capabilities": [
    {
      "name": "generateSqlQuery",
      "description": "Generates SQL queries based on natural language descriptions",
      "parameters": [
        {
          "name": "databaseType",
          "type": "string",
          "description": "Type of database (MySQL, PostgreSQL, etc.)",
          "required": true
        },
        {
          "name": "queryDescription",
          "type": "string",
          "description": "Natural language description of the query",
          "required": true
        }
      ],
      "relatedIntents": ["generate_sql", "create_query", "database_search"],
      "isPrimary": true
    }
  ],
  "intents": [
    {
      "name": "generate_sql",
      "description": "User wants to generate a SQL query",
      "variations": [
        "Write a SQL query to {queryDescription}",
        "Generate SQL for {queryDescription}",
        "Create a {databaseType} query that {queryDescription}",
        "Help me with a database query to {queryDescription}",
        "SQL to {queryDescription}"
      ],
      "priority": 4
    }
  ]
}
```

These agent definitions form the foundation of the intent classification system by providing clear mappings between user intents and agent capabilities, enabling accurate agent selection based on natural language input.