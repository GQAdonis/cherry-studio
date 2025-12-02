# Material Zones Design System: Complete Agent Integration Guide

**Version:** 1.0.0  
**Last Updated:** December 2024  
**Purpose:** Practical guide for integrating Material Zones metaprompts with 12 popular AI agent platforms

---

## Table of Contents

1. [Cline AI Agent](#1-cline-ai-agent) - VSCode Extension
2. [Claude Code](#2-claude-code) - CLI Tool
3. [Codex CLI](#3-codex-cli) - Terminal Interface
4. [Roo Code](#4-roo-code) - VSCode Extension
5. [Rust MCP Server](#5-rust-mcp-server) - Production Server
6. [Mastra Agents](#6-mastra-agents) - Custom Framework
7. [Cherry Studio](#7-cherry-studio) - Desktop IDE
8. [AgentKit](#8-agentkit) - iOS Development
9. [DeepAgents/LangGraph.js](#9-deepagents-langgraphjs) - Multi-Agent
10. [Kilo Code](#10-kilo-code) - Web IDE
11. [Zed](#11-zed) - Modern Editor
12. [Antigravity](#12-antigravity) - Google IDE

---

## Quick Setup Matrix

| Agent | Config File | Template | Docs Access |
|-------|------------|----------|-------------|
| Cline | `.clinerules` | File-Based | `docs/ui/` |
| Claude Code | `claude-code-system.md` | File-Based | File system |
| Codex CLI | `.codex/instructions.md` | File-Based | File system |
| Roo Code | `.roo/system-prompt.md` | File-Based | Project aware |
| Rust MCP | `mcp-config.json` | MCP/GraphRAG | SurrealDB |
| Mastra | `system-prompts.ts` | General | Context/Functions |
| Cherry Studio | Settings → Custom Prompt | General | Context window |
| AgentKit | `AgentConfig.swift` | General | Embedded |
| DeepAgents | `agent-config.ts` | MCP/GraphRAG | MCP tools |
| Kilo Code | `.kilo/config.yaml` | File-Based | Project files |
| Zed | `.zed/settings.json` | File-Based | Workspace |
| Antigravity | Workspace Settings | General | Context |

---

## 1. Cline AI Agent

**Platform:** VSCode Extension | **Template:** File-Based | **Complexity:** ⭐ Low

### Quick Setup

```bash
# 1. Install extension
code --install-extension saoudrizwan.cline

# 2. Create config
cat > .clinerules << 'EOF'
{{PROJECT_NAME}} = "Prometheus AI Platform"
{{PRIMARY_FRAMEWORK}} = "React"
{{DOCS_PATH}} = "docs/ui/"

[PASTE: metaprompt_file_based_ui_agent.md]
EOF

# 3. Copy documentation
mkdir -p docs/ui
cp DESIGN_SYSTEM.md CHUNK_IMPLEMENTATIONS.md ARTIFACT_VIEWERS.md docs/ui/
```

### VSCode Settings

```json
{
  "cline.customInstructions": ".clinerules",
  "cline.alwaysAllowReadOnly": true,
  "cline.modelPreference": "claude-sonnet-4"
}
```

### Usage

```
User: Create a text chunk component in React
Cline: [Reads docs/ui/CHUNK_IMPLEMENTATIONS.md]
Cline: [Generates component following exact pattern]
```

---

## 2. Claude Code

**Platform:** CLI Tool | **Template:** File-Based | **Complexity:** ⭐ Low

### Quick Setup

```bash
# 1. Install
npm install -g claude-code

# 2. Create system prompt
cat > claude-code-system.md << 'EOF'
{{PROJECT_NAME}} = "Prometheus AI Platform"
{{PRIMARY_FRAMEWORK}} = "React"
{{DOCS_PATH}} = "docs/ui/"

[PASTE: metaprompt_file_based_ui_agent.md]
EOF

# 3. Configure
claude-code config set system-prompt-file ./claude-code-system.md
claude-code config set allow-file-read true
```

### Usage

```bash
# Interactive
claude-code

# Command mode
claude-code "Create React text chunk with copy functionality"

# From file
claude-code --file task.txt --output src/components/
```

---

## 3. Codex CLI

**Platform:** Terminal | **Template:** File-Based | **Complexity:** ⭐ Low

### Quick Setup

```bash
# 1. Install
pip install codex-cli

# 2. Initialize
codex init

# 3. Create instructions
cat > .codex/instructions.md << 'EOF'
{{PROJECT_NAME}} = "Prometheus AI Platform"
{{PRIMARY_FRAMEWORK}} = "React"

[PASTE: metaprompt_file_based_ui_agent.md]
EOF

# 4. Configure
codex config set instructions .codex/instructions.md
```

### Usage

```bash
# Generate component
codex generate "React text chunk with markdown rendering"

# With template
codex generate --template ui-component "Citation chunk"

# Watch mode
codex watch src/components/ --on-change "verify design system compliance"
```

---

## 4. Roo Code

**Platform:** VSCode Extension | **Template:** File-Based | **Complexity:** ⭐ Low

### Quick Setup

```bash
# 1. Install from VSCode Marketplace
code --install-extension roocode.roo-code

# 2. Create config
mkdir .roo
cat > .roo/config.json << 'EOF'
{
  "systemPrompt": ".roo/system-prompt.md",
  "documentationPaths": ["docs/ui/"],
  "framework": "react",
  "autoReadDocs": true
}
EOF

# 3. Create system prompt
cat > .roo/system-prompt.md << 'EOF'
[PASTE: metaprompt_file_based_ui_agent.md WITH PARAMETERS]
EOF
```

### Usage

```
1. Open Roo Chat (Ctrl+Shift+R)
2. Type: "Create artifact viewer with Sandpack"
3. Roo reads docs automatically
4. Review diff preview
5. Click "Apply"
```

---

## 5. Rust MCP Server (SurrealDB + pgvector)

**Platform:** Custom Server | **Template:** MCP/GraphRAG | **Complexity:** ⭐⭐⭐ High

### Architecture

```
AI Agent → MCP Protocol → Rust Server → SurrealDB (Graph) + pgvector (Semantic)
```

### Minimal Implementation

```rust
// Cargo.toml
[dependencies]
mcp-sdk = "0.1"
surrealdb = "1.0"
pgvector = "0.3"
sqlx = { version = "0.7", features = ["postgres"] }
tokio = { version = "1.35", features = ["full"] }

// main.rs
#[tokio::main]
async fn main() -> Result<()> {
    let surreal = SurrealDBStore::new("ws://localhost:8000").await?;
    let pgvector = PgVectorStore::new("postgresql://localhost/docs").await?;
    let server = MCPServer::new(surreal, pgvector).await?;
    server.run().await
}
```

### MCP Tool Example

```rust
async fn query_design_system(args: QueryArgs) -> Result<Response> {
    // 1. Generate embedding for query
    let embedding = embedder.generate(&args.topic).await?;
    
    // 2. Semantic search in pgvector
    let relevant_ids = pgvector.search_similar(embedding, 5).await?;
    
    // 3. Query graph relationships in SurrealDB
    let concepts = surreal
        .query("SELECT * FROM design_concepts WHERE id IN $ids")
        .bind("ids", relevant_ids)
        .await?;
    
    // 4. Get related via graph edges
    let related = surreal
        .query("SELECT ->related_to->* FROM design_concepts WHERE id IN $ids")
        .await?;
    
    Ok(Response { concepts, related })
}
```

### Agent Configuration

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "material_zones_docs": {
      "command": "/path/to/material-zones-mcp",
      "args": [],
      "env": {
        "SURREALDB_URL": "ws://localhost:8000",
        "POSTGRES_URL": "postgresql://localhost/docs"
      }
    }
  }
}
```

### System Prompt

```markdown
[PASTE: metaprompt_mcp_graphrag_ui_agent.md WITH PARAMETERS]

{{MCP_SERVER_NAME}} = "material_zones_docs"
{{TOOL_PREFIX}} = "ui_docs"
```

---

## 6. Mastra-based UI Agents

**Platform:** Mastra Framework | **Template:** General | **Complexity:** ⭐⭐ Medium

### Project Setup

```bash
# 1. Create project
npx create-mastra-app@latest mastra-ui-agent
cd mastra-ui-agent

# 2. Install dependencies
npm install @mastra/core @mastra/memory openai zod

# 3. Copy documentation to docs/ui/
```

### System Prompt with Documentation

```typescript
// src/prompts/system-prompts.ts
import fs from 'fs';
import path from 'path';

// Load documentation
const DOCS_PATH = path.join(__dirname, '../../docs/ui');
const DESIGN_SYSTEM = fs.readFileSync(path.join(DOCS_PATH, 'DESIGN_SYSTEM.md'), 'utf-8');
const CHUNK_IMPLEMENTATIONS = fs.readFileSync(path.join(DOCS_PATH, 'CHUNK_IMPLEMENTATIONS.md'), 'utf-8');

// Load metaprompt template
const METAPROMPT = fs.readFileSync('./templates/metaprompt_general_ui_agent.md', 'utf-8');

// Configure parameters
const PARAMETERS = {
  PROJECT_NAME: 'Prometheus AI Platform',
  PRIMARY_FRAMEWORK: 'React',
  ACCESS_METHOD: 'context_window',
  DOCUMENTATION_SCOPE: 'all'
};

// Replace parameters
function replaceParams(template: string, params: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

// Generate final prompt
export const UI_AGENT_PROMPT = replaceParams(METAPROMPT, PARAMETERS) + `

--- DOCUMENTATION ---

${DESIGN_SYSTEM}

${CHUNK_IMPLEMENTATIONS}

--- END DOCUMENTATION ---
`;
```

### Create Agent

```typescript
// src/agents/ui-generator.ts
import { Agent } from '@mastra/core';
import { openai } from '@mastra/core/providers';
import { UI_AGENT_PROMPT } from '../prompts/system-prompts';

export const uiAgent = new Agent({
  name: 'UI Generator',
  instructions: UI_AGENT_PROMPT,
  model: openai('gpt-4-turbo-preview'),
  memory: { type: 'conversation', maxMessages: 20 }
});

// Usage
const response = await uiAgent.generate(
  'Create a text chunk component with copy functionality'
);
```

### With Tools

```typescript
// src/tools/documentation.ts
import { createTool } from '@mastra/core';
import { z } from 'zod';

export const readDocsTool = createTool({
  id: 'read-docs',
  description: 'Read Material Zones documentation',
  inputSchema: z.object({
    section: z.enum(['design_system', 'chunks', 'viewers'])
  }),
  execute: async ({ input }) => {
    const content = fs.readFileSync(`docs/ui/${input.section}.md`, 'utf-8');
    return { content };
  }
});

// Add to agent
const uiAgent = new Agent({
  // ...
  tools: [readDocsTool]
});
```

---

## 7. Cherry Studio

**Platform:** Desktop IDE | **Template:** General | **Complexity:** ⭐ Low

### Setup

```
1. Open Cherry Studio
2. Settings → AI → Custom System Prompt
3. Paste metaprompt_general_ui_agent.md with parameters filled
4. Paste full documentation below
5. Save
```

### System Prompt Configuration

```markdown
{{PROJECT_NAME}} = "Prometheus AI Platform"
{{PRIMARY_FRAMEWORK}} = "React"
{{ACCESS_METHOD}} = "context_window"
{{DOCUMENTATION_SCOPE}} = "all"

[PASTE: metaprompt_general_ui_agent.md]

--- DOCUMENTATION ---

[PASTE: DESIGN_SYSTEM.md]
[PASTE: CHUNK_IMPLEMENTATIONS.md]
[PASTE: ARTIFACT_VIEWERS.md]

--- END DOCUMENTATION ---
```

### Usage

```
1. New Chat
2. Type: "Create artifact viewer with Sandpack support"
3. Cherry Studio uses documentation from system prompt
4. Review generated code
5. Copy to project
```

### Project Workspace

```json
// .cherry/workspace.json
{
  "systemPrompt": "material-zones-prompt.md",
  "documentationPaths": ["docs/ui/"],
  "autoLoadDocs": true
}
```

---

## 8. AgentKit

**Platform:** iOS Development | **Template:** General | **Complexity:** ⭐⭐ Medium

### Swift Configuration

```swift
// AgentConfig.swift
import AgentKit

struct MaterialZonesAgent: AgentConfiguration {
    let systemPrompt: String = """
    \(MaterialZonesPrompt.metaprompt)
    
    --- DOCUMENTATION ---
    
    \(MaterialZonesPrompt.designSystem)
    \(MaterialZonesPrompt.chunkImplementations)
    
    --- END DOCUMENTATION ---
    """
    
    let model = "gpt-4-turbo-preview"
    let temperature: Double = 0.2
}

// MaterialZonesPrompt.swift
enum MaterialZonesPrompt {
    static let metaprompt = """
    {{PROJECT_NAME}} = "Prometheus AI Platform"
    {{PRIMARY_FRAMEWORK}} = "React"
    {{ACCESS_METHOD}} = "embedded_data"
    
    [PASTE: metaprompt_general_ui_agent.md]
    """
    
    static let designSystem = """
    [PASTE: DESIGN_SYSTEM.md CONTENT]
    """
    
    static let chunkImplementations = """
    [PASTE: CHUNK_IMPLEMENTATIONS.md CONTENT]
    """
}
```

### Usage

```swift
let agent = Agent(configuration: MaterialZonesAgent())

let response = await agent.generate(
    prompt: "Create a text chunk component for React"
)

print(response.text)
```

---

## 9. DeepAgents with LangGraph.js

**Platform:** Multi-Agent Framework | **Template:** MCP/GraphRAG | **Complexity:** ⭐⭐ Medium

### Graph Configuration

```typescript
// agent-graph.ts
import { StateGraph } from "@langchain/langgraph";
import { MCPClient } from "@modelcontextprotocol/sdk";

// Define agent state
interface UIAgentState {
  task: string;
  documentation: string;
  code: string;
  validation: { valid: boolean; issues: string[] };
}

// Create graph
const workflow = new StateGraph<UIAgentState>({
  channels: {
    task: { value: null },
    documentation: { value: "" },
    code: { value: "" },
    validation: { value: { valid: false, issues: [] } }
  }
});

// Node 1: Query Documentation
workflow.addNode("query_docs", async (state) => {
  const mcp = new MCPClient("material_zones_docs");
  const docs = await mcp.callTool("ui_docs_get_chunk_implementation", {
    chunk_type: state.task,
    framework: "react"
  });
  return { documentation: docs.implementation };
});

// Node 2: Generate Code
workflow.addNode("generate_code", async (state) => {
  const prompt = `
  Task: ${state.task}
  Documentation: ${state.documentation}
  
  Generate code following the documentation patterns exactly.
  `;
  const response = await llm.invoke(prompt);
  return { code: response.text };
});

// Node 3: Validate
workflow.addNode("validate", async (state) => {
  const validation = await validateCode(state.code);
  return { validation };
});

// Add edges
workflow.addEdge("query_docs", "generate_code");
workflow.addEdge("generate_code", "validate");

// Compile
const app = workflow.compile();
```

### System Prompt

```typescript
const SYSTEM_PROMPT = `
[PASTE: metaprompt_mcp_graphrag_ui_agent.md WITH PARAMETERS]

{{MCP_SERVER_NAME}} = "material_zones_docs"
{{TOOL_PREFIX}} = "ui_docs"
`;
```

### Usage

```typescript
const result = await app.invoke({
  task: "text chunk component"
});

console.log(result.code);
console.log(result.validation);
```

---

## 10. Kilo Code

**Platform:** Web IDE | **Template:** File-Based | **Complexity:** ⭐ Low

### Configuration

```yaml
# .kilo/config.yaml
project:
  name: "Prometheus AI Platform"
  framework: "react"

documentation:
  paths:
    - "docs/ui/"
  auto_load: true

agent:
  system_prompt: ".kilo/system-prompt.md"
  model: "claude-sonnet-4"
  temperature: 0.2
```

### System Prompt

```markdown
# .kilo/system-prompt.md

{{PROJECT_NAME}} = "Prometheus AI Platform"
{{PRIMARY_FRAMEWORK}} = "React"
{{DOCS_PATH}} = "docs/ui/"

[PASTE: metaprompt_file_based_ui_agent.md]
```

### Usage

```
1. Open project in Kilo Code
2. Chat: "Create text chunk component"
3. Kilo reads docs/ui/ automatically
4. Generates code in editor
5. Review and accept
```

---

## 11. Zed

**Platform:** Modern Editor | **Template:** File-Based | **Complexity:** ⭐ Low

### Configuration

```json
// .zed/settings.json
{
  "assistant": {
    "default_model": {
      "provider": "anthropic",
      "model": "claude-sonnet-4"
    },
    "custom_instructions_file": ".zed/instructions.md",
    "documentation_paths": ["docs/ui/"]
  }
}
```

### Instructions

```markdown
# .zed/instructions.md

{{PROJECT_NAME}} = "Prometheus AI Platform"
{{PRIMARY_FRAMEWORK}} = "React"
{{DOCS_PATH}} = "docs/ui/"

[PASTE: metaprompt_file_based_ui_agent.md]
```

### Usage

```
1. Open Zed Assistant (Cmd+Shift+A)
2. Type: "Generate artifact viewer"
3. Zed reads documentation automatically
4. Code appears in editor
5. Review and save
```

---

## 12. Antigravity (Google IDE)

**Platform:** Google IDE | **Template:** General | **Complexity:** ⭐⭐ Medium

### Workspace Settings

```
Settings → AI Assistant → Custom Prompt

[PASTE: metaprompt_general_ui_agent.md WITH PARAMETERS]

{{PROJECT_NAME}} = "Prometheus AI Platform"
{{PRIMARY_FRAMEWORK}} = "React"
{{ACCESS_METHOD}} = "context_window"
{{DOCUMENTATION_SCOPE}} = "all"

--- DOCUMENTATION ---

[Documentation loaded via workspace files]
```

### Workspace Files

```
project/
├── .antigravity/
│   ├── config.json
│   └── prompts/
│       └── material-zones.md
└── docs/
    └── ui/
        ├── DESIGN_SYSTEM.md
        ├── CHUNK_IMPLEMENTATIONS.md
        └── ARTIFACT_VIEWERS.md
```

### Config

```json
// .antigravity/config.json
{
  "assistant": {
    "customPromptFile": ".antigravity/prompts/material-zones.md",
    "contextFiles": [
      "docs/ui/DESIGN_SYSTEM.md",
      "docs/ui/CHUNK_IMPLEMENTATIONS.md",
      "docs/ui/ARTIFACT_VIEWERS.md"
    ],
    "autoLoadContext": true
  }
}
```

### Usage

```
1. Open Antigravity Assistant
2. Documentation auto-loaded from context files
3. Type: "Create artifact editor with dual streaming"
4. Review generated code
5. Insert into project
```

---

## Common Troubleshooting

### Issue: Agent doesn't follow patterns

**Solution:**
```markdown
# In system prompt, add:
CRITICAL REQUIREMENT: You MUST read documentation and follow 
patterns EXACTLY. Any deviation is an error. Copy patterns verbatim.
```

### Issue: Documentation not found

**Solution:**
```bash
# Verify files exist
ls -la docs/ui/

# Check paths in config
grep -r "docs/ui" .
```

### Issue: Generated code missing features

**Solution:**
```markdown
# Add to system prompt:
COMPLETENESS CHECK: Before finalizing code, verify it includes:
- Event dispatching
- Material 3 theming
- Accessibility attributes
- All requested features
```

---

## Best Practices

1. **Always Test** - Run generated code before committing
2. **Version Control** - Track metaprompt changes alongside code
3. **Update Docs** - Keep documentation in sync
4. **Monitor Output** - Review agent-generated code for compliance
5. **Iterate** - Refine prompts based on results

---

## Support Resources

- **Documentation:** `/tmp/DESIGN_SYSTEM.md` and related files
- **Templates:** `/tmp/metaprompt_*.md` files
- **Usage Guide:** `/tmp/metaprompt_templates_usage_guide.md`

---

**Version:** 1.0.0  
**Last Updated:** December 2024
