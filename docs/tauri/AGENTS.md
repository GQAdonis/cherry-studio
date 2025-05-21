# Mastra Agents and CoPilotKit Integration in Tauri

## Table of Contents

1. [Introduction](#introduction)
2. [CoPilotKit Integration](#copilotkit-integration)
3. [AG-UI Adapter for Mastra Agents](#ag-ui-adapter-for-mastra-agents)
4. [JavaScript Agent Execution Approaches](#javascript-agent-execution-approaches)
5. [Comparison and Recommendation](#comparison-and-recommendation)
6. [Implementation Plan](#implementation-plan)

## Introduction

This document outlines the approach for integrating Mastra agents and CoPilotKit into the Tauri-based Cherry Studio application. The goal is to support chat communication using an AG-UI adapter for Mastra agents and to enable the execution of agents written in JavaScript/TypeScript using the Mastra framework.

## CoPilotKit Integration

[CoPilotKit](https://docs.copilotkit.ai/) is a framework for building AI copilots into applications. It provides React components for quickly integrating customizable AI assistants with features like:

- Chat interfaces
- Document context
- Tool use
- UI control

In our Tauri migration, we'll integrate CoPilotKit to handle chat communication with Mastra agents. This will involve:

1. Setting up the CoPilotKit runtime in our Tauri application
2. Configuring the runtime to work with Mastra agents
3. Implementing the necessary UI components for chat interaction

```typescript
// Example of CoPilotKit integration with Mastra
import { CopilotKit, CopilotSidebar } from "@copilotkit/react-ui";
import { CopilotRuntime } from "@copilotkit/runtime";
import { MastraClient } from "@mastra/client-js";

// Setup in the main React component
function App() {
  return (
    <CopilotKit
      runtime={new CopilotRuntime({
        agents: mastraAgents, // Agents from Mastra
      })}
    >
      <AppContent />
      <CopilotSidebar />
    </CopilotKit>
  );
}
```

## AG-UI Adapter for Mastra Agents

AG-UI (Agent-User Interaction Protocol) is a standardized event-driven protocol that acts as a universal translator between intelligent agents and front-end applications. It defines a structured way for agents to send updates, receive input, and control interfaces in real-time.

We'll implement an AG-UI adapter for Mastra agents to enable seamless integration with CoPilotKit:

1. The adapter will convert Mastra agent responses to the AG-UI format expected by CoPilotKit
2. It will handle bidirectional communication between the UI and the agents
3. It will support all AG-UI features like streaming responses, tool use, and UI control

```typescript
// Example of AG-UI adapter for Mastra agents
import { MastraClient } from "@mastra/client-js";
import { AGUIAdapter } from "./AGUIAdapter";

export async function createMastraAGUIAdapter(resourceId: string) {
  const client = new MastraClient({
    baseUrl: "http://localhost:4111", // Mastra server URL
  });
  
  // Get the agent from Mastra and convert to AG-UI format
  const agentConfig = await client.getAgent({ resourceId });
  return new AGUIAdapter(agentConfig);
}
```

## JavaScript Agent Execution Approaches

For executing JavaScript/TypeScript agents written with the Mastra framework in our Tauri application, we've researched three potential approaches:

### 1. WASM Compilation Approach

This approach involves compiling TypeScript agents to WebAssembly (WASM) and executing them within the Rust backend:

**Pros:**
- Good performance (though not as fast as native V8)
- Strong sandboxing and security
- No need for external processes
- Cross-platform compatibility

**Cons:**
- Not all JavaScript features are well-supported in WASM
- Dynamic features of JavaScript may be limited
- Compilation step adds complexity
- Potential compatibility issues with existing Mastra code

**Implementation:**
```rust
// src-tauri/src/wasm_agent_runner.rs
use wasmtime::{Engine, Module, Store, Instance};

pub struct WasmAgentRunner {
    engine: Engine,
    store: Store<()>,
}

impl WasmAgentRunner {
    pub fn new() -> Self {
        let engine = Engine::default();
        let store = Store::new(&engine, ());
        Self { engine, store }
    }
    
    pub fn run_agent(&mut self, wasm_bytes: &[u8], input: &str) -> Result<String, String> {
        let module = Module::new(&self.engine, wasm_bytes)
            .map_err(|e| format!("Failed to create module: {}", e))?;
        
        let instance = Instance::new(&mut self.store, &module, &[])
            .map_err(|e| format!("Failed to instantiate module: {}", e))?;
        
        // Call the agent's entry point function
        let run_func = instance.get_func(&mut self.store, "run")
            .ok_or_else(|| "Function 'run' not found".to_string())?;
        
        // Execute the agent
        // (Implementation details would depend on the specific WASM interface)
        
        Ok("Agent response".to_string())
    }
}
```

### 2. V8 Engine Embedded in Rust Approach

This approach involves embedding the V8 JavaScript engine directly in the Rust backend:

**Pros:**
- Full JavaScript language support
- Better performance than WASM for JavaScript code
- No need to modify existing agent code
- Direct integration with Rust backend

**Cons:**
- Larger binary size due to V8 engine
- More complex setup and maintenance
- Potential security concerns if not properly sandboxed

**Implementation:**
```rust
// src-tauri/src/v8_agent_runner.rs
use v8::{HandleScope, Context, Script, V8};

pub struct V8AgentRunner {
    isolate: v8::OwnedIsolate,
}

impl V8AgentRunner {
    pub fn new() -> Self {
        // Initialize V8
        let platform = v8::new_default_platform().unwrap();
        v8::V8::initialize_platform(platform);
        v8::V8::initialize();
        
        // Create isolate
        let isolate = v8::Isolate::new(Default::default());
        
        Self { isolate }
    }
    
    pub fn run_agent(&mut self, js_code: &str, input: &str) -> Result<String, String> {
        // Create handle scope
        let handle_scope = &mut v8::HandleScope::new(&mut self.isolate);
        
        // Create context
        let context = v8::Context::new(handle_scope);
        let scope = &mut v8::ContextScope::new(handle_scope, context);
        
        // Set up input in global object
        let global = context.global(scope);
        let input_key = v8::String::new(scope, "input").unwrap();
        let input_value = v8::String::new(scope, input).unwrap();
        global.set(scope, input_key.into(), input_value.into());
        
        // Compile and run the agent code
        let code = v8::String::new(scope, js_code).unwrap();
        let script = v8::Script::compile(scope, code, None).unwrap();
        let result = script.run(scope).unwrap();
        
        // Convert result to string
        let result_str = result.to_string(scope).unwrap();
        let rust_str = result_str.to_rust_string_lossy(scope);
        
        Ok(rust_str)
    }
}
```

### 3. Separate JavaScript Process Approach

This approach involves running the JavaScript agents in a separate process that communicates with the Tauri application:

**Pros:**
- Complete isolation of agent execution
- No need to modify existing agent code
- Easier to update and maintain agent runtime
- Full JavaScript language support

**Cons:**
- Inter-process communication overhead
- More complex deployment and process management
- Potential security concerns with separate processes

**Implementation:**
```rust
// src-tauri/src/js_process_agent_runner.rs
use std::process::{Command, Stdio};
use std::io::{Write, Read};
use serde::{Serialize, Deserialize};

#[derive(Serialize)]
struct AgentRequest {
    code: String,
    input: String,
}

#[derive(Deserialize)]
struct AgentResponse {
    output: String,
}

pub struct JsProcessAgentRunner {
    node_path: String,
    runner_script_path: String,
}

impl JsProcessAgentRunner {
    pub fn new(node_path: String, runner_script_path: String) -> Self {
        Self { node_path, runner_script_path }
    }
    
    pub fn run_agent(&self, js_code: &str, input: &str) -> Result<String, String> {
        // Create request payload
        let request = AgentRequest {
            code: js_code.to_string(),
            input: input.to_string(),
        };
        let request_json = serde_json::to_string(&request)
            .map_err(|e| format!("Failed to serialize request: {}", e))?;
        
        // Start Node.js process
        let mut child = Command::new(&self.node_path)
            .arg(&self.runner_script_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start Node.js process: {}", e))?;
        
        // Send request to process
        let mut stdin = child.stdin.take().unwrap();
        stdin.write_all(request_json.as_bytes())
            .map_err(|e| format!("Failed to write to stdin: {}", e))?;
        drop(stdin);
        
        // Read response from process
        let mut stdout = child.stdout.take().unwrap();
        let mut output = String::new();
        stdout.read_to_string(&mut output)
            .map_err(|e| format!("Failed to read from stdout: {}", e))?;
        
        // Parse response
        let response: AgentResponse = serde_json::from_str(&output)
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        
        Ok(response.output)
    }
}
```

## Comparison and Recommendation

After researching the three approaches for running JavaScript/TypeScript agents in Tauri, we recommend the **V8 Engine Embedded in Rust** approach for the following reasons:

1. **Performance**: V8 is highly optimized for JavaScript execution and will provide better performance than WASM for JavaScript code.
2. **Compatibility**: Full JavaScript language support ensures compatibility with existing Mastra agents without modification.
3. **Integration**: Direct integration with the Rust backend allows for efficient communication between agents and the application.
4. **Maturity**: V8 is a mature and well-tested JavaScript engine with extensive documentation and community support.

For implementation, we recommend using the [deno_core](https://crates.io/crates/deno_core) crate, which provides a high-level API for embedding V8 in Rust applications. This approach has been successfully used in projects like Deno and offers a good balance of performance, security, and ease of use.

## Implementation Plan

### Phase 1: CoPilotKit Integration (2-3 weeks)

1. Add CoPilotKit dependencies to the frontend
2. Implement basic chat UI components
3. Set up CoPilotKit runtime in the React application
4. Create initial AG-UI adapter for Mastra agents

### Phase 2: V8 Engine Integration (3-4 weeks)

1. Add deno_core as a dependency to the Rust backend
2. Implement V8AgentRunner using deno_core
3. Create Tauri commands for agent execution
4. Set up sandboxing and security measures

### Phase 3: Mastra Framework Integration (2-3 weeks)

1. Implement TypeScript agent loader
2. Create Mastra runtime environment in V8
3. Set up API for agent registration and management
4. Implement agent state persistence

### Phase 4: Testing and Optimization (2 weeks)

1. Comprehensive testing of agent execution
2. Performance optimization
3. Security auditing
4. Documentation

This implementation plan will be integrated into the overall Tauri migration timeline, with agent support being developed in parallel with the core application migration.