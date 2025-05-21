# CoPilotKit Integration with Mastra Agents

This document describes the implementation of CoPilotKit integration with Mastra agents in the Tauri application.

## Overview

The integration allows for chat communication with Mastra agents using an AG-UI adapter. The implementation includes:

1. **AG-UI Adapter for Mastra Agents**: Converts Mastra agent responses to AG-UI format
2. **CoPilotKit React Components**: Provides UI for chat interaction
3. **V8 Engine Integration**: Runs JavaScript agents in a V8 engine embedded in Rust

## Components

### AG-UI Adapter

- `AGUIAdapter.ts`: Base adapter for converting agent responses to AG-UI format
- `MastraAGUIAdapter.ts`: Specific adapter for Mastra agents

### CoPilotKit React Components

- `CopilotProvider.tsx`: Provider component for CoPilotKit
- `CopilotSidebar.tsx`: Sidebar component for chat interface
- `CopilotDemo.tsx`: Demo component showcasing the integration

### V8 Engine Integration

- `v8_agent_runner.rs`: Rust implementation of V8 engine for running JavaScript agents
- Tauri commands for agent execution:
  - `run_agent`: Run a JavaScript agent with input
  - `load_agent`: Load a JavaScript agent into the V8 engine
  - `unload_agent`: Unload a JavaScript agent from the V8 engine

## Usage

### Running a Mastra Agent

```typescript
// Load the agent
await invoke("load_agent", {
  agentId: "demo-agent",
  jsCode: agentCode,
});

// Run the agent
const result = await invoke("run_agent", {
  agentId: "demo-agent",
  input: "Hello from the test function!",
});

console.log("Agent response:", result);
```

### Using the CoPilotKit Components

```tsx
// In your React component
import { CopilotDemo } from "../components/copilot/CopilotDemo";

function MyComponent() {
  return (
    <CopilotDemo 
      mastraAgentId="demo-agent" 
      mastraApiUrl="http://localhost:4111" 
    />
  );
}
```

## Architecture

The implementation follows the approach outlined in the `docs/tauri/AGENTS.md` file:

1. **Frontend**: React components using CoPilotKit for chat UI
2. **Backend**: V8 engine embedded in Rust for running JavaScript agents
3. **Communication**: Tauri commands for communication between frontend and backend
4. **Adaptation**: AG-UI adapter for converting Mastra agent responses to AG-UI format

## Dependencies

- `@copilotkit/react-ui`: UI components for CoPilotKit
- `@copilotkit/runtime`: Runtime for CoPilotKit
- `@mastra/client-js`: Client for Mastra agents
- `deno_core`: Rust crate for embedding V8 engine