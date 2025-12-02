# @theboss/sdk

SDK for integrating external applications with Cherry Studio.

## Installation

```bash
npm install @theboss/sdk
# or
yarn add @theboss/sdk
# or
pnpm add @theboss/sdk
```

## Quick Start

### For Embedded Apps (Mini-Apps)

If your app runs inside a Cherry Studio webview:

```typescript
import { createCherryClient } from '@theboss/sdk/webview';

const client = createCherryClient({
  appId: 'my-app',
  appName: 'My App',
  version: '1.0.0',
  capabilities: {
    ai: true,
    knowledge: true,
    tools: true
  }
});

await client.connect();

// Use AI services
const result = await client.ai.complete([
  { role: 'user', content: 'Hello!' }
]);

console.log(result.content);
```

### For External Apps

If your app runs as a separate process:

```typescript
import { createCherryClient } from '@theboss/sdk';

const client = createCherryClient({
  appId: 'my-external-app',
  appName: 'My External App',
  transport: 'websocket',
  serverUrl: 'ws://localhost:23847',
  capabilities: {
    ai: true,
    knowledge: true,
    mcp: true,
    tools: true
  }
});

await client.connect();
```

## Capabilities

When connecting, you can request the following capabilities:

| Capability | Description |
|------------|-------------|
| `ai` | Access to AI completion, streaming, and embedding services |
| `knowledge` | Access to knowledge base search and add operations |
| `memory` | Access to memory storage for persistent data |
| `mcp` | Access to call MCP tools |
| `files` | Sandboxed file system access |
| `settings` | Read app settings |
| `clipboard` | Clipboard read/write access |
| `notifications` | Show system notifications |
| `tools` | Register your app as an MCP tool |

## Services

### AI Service

```typescript
// Chat completion
const result = await client.ai.complete([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello!' }
], {
  model: 'gpt-4',
  temperature: 0.7
});

// Streaming completion
for await (const chunk of client.ai.streamComplete(messages)) {
  process.stdout.write(chunk.content);
}

// Embeddings
const embedding = await client.ai.embed('Some text to embed');
```

### Knowledge Service

```typescript
// List knowledge bases
const kbs = await client.knowledge.list();

// Search
const results = await client.knowledge.search(kbId, 'query', {
  limit: 10
});

// Add content
await client.knowledge.add(kbId, 'Content to add', {
  metadata: { source: 'my-app' }
});
```

### Memory Service

```typescript
// Search memories
const memories = await client.memory.search('query');

// Add memory
const entry = await client.memory.add('Important fact', {
  category: 'facts'
});

// Get/Delete
const memory = await client.memory.get(id);
await client.memory.delete(id);
```

### MCP Service

```typescript
// List available tools
const tools = await client.mcp.listTools();

// Call a tool
const result = await client.mcp.callTool('@cherry/fetch', 'fetch_html', {
  url: 'https://example.com'
});
```

## Registering as a Tool

Your app can register itself as an MCP tool that AI assistants can use:

```typescript
await client.registerTool({
  name: 'search-my-data',
  description: 'Search data in My App',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query'
      },
      limit: {
        type: 'number',
        description: 'Max results'
      }
    },
    required: ['query']
  },
  handler: async (args) => {
    const { query, limit = 10 } = args;
    // Perform search in your app
    const results = await mySearchFunction(query, limit);
    return { results };
  }
});
```

## Events

```typescript
// Connection events
client.on('connected', ({ capabilities }) => {
  console.log('Connected with capabilities:', capabilities);
});

client.on('disconnected', () => {
  console.log('Disconnected');
});

// Tool calls
client.on('tool-call', ({ toolName, args }) => {
  console.log('Tool called:', toolName);
});

// Errors
client.on('error', ({ message }) => {
  console.error('Error:', message);
});
```

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import type {
  CherryClientConfig,
  AIMessage,
  ToolDefinition,
  KnowledgeSearchResult
} from '@theboss/sdk';
```

## License

MIT

