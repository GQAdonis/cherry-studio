//! V8 Agent Runner
//!
//! This module provides functionality for running JavaScript agents in a V8 engine.
//! It uses the deno_core crate to embed the V8 engine in Rust.

use deno_core::error::AnyError;
use deno_core::{JsRuntime, RuntimeOptions, FastString};
use deno_core::v8;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, RwLock};
use std::collections::HashMap;
use tokio::sync::Mutex as AsyncMutex;
use std::fs;

/// Result of running an agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResult {
    /// Output content from the agent
    pub content: String,
    /// Optional metadata from the agent
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
    /// Optional actions from the agent
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actions: Option<Vec<AgentAction>>,
}

/// Action that an agent can perform
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentAction {
    /// Type of action
    #[serde(rename = "type")]
    pub action_type: String,
    /// Name of action
    pub name: String,
    /// Optional parameters for the action
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parameters: Option<serde_json::Value>,
}

/// Agent code cache entry
struct AgentCodeCache {
    /// JavaScript code for the agent
    code: String,
    /// Last time the agent was used
    last_used: std::time::Instant,
}

/// Thread-safe V8 Agent Runner
///
/// This struct provides functionality for running JavaScript agents in a V8 engine.
/// It is designed to be thread-safe and can be used with Tauri commands.
pub struct V8AgentRunner {
    /// Runtime options
    runtime_options: RuntimeOptions,
    /// Cached agent code for reuse
    agent_code_cache: Arc<RwLock<HashMap<String, AgentCodeCache>>>,
    /// Mutex for runtime operations to ensure thread safety
    runtime_mutex: Arc<AsyncMutex<()>>,
}

// Explicitly implement Send and Sync for V8AgentRunner
// This is safe because we use proper synchronization with AsyncMutex
// to ensure thread safety when accessing the V8 runtime
unsafe impl Send for V8AgentRunner {}
unsafe impl Sync for V8AgentRunner {}

impl V8AgentRunner {
    /// Create a new V8AgentRunner
    pub fn new() -> Self {
        Self {
            runtime_options: RuntimeOptions::default(),
            agent_code_cache: Arc::new(RwLock::new(HashMap::new())),
            runtime_mutex: Arc::new(AsyncMutex::new(())),
        }
    }

    /// Run a JavaScript agent
    ///
    /// # Arguments
    ///
    /// * `agent_id` - ID of the agent
    /// * `js_code` - JavaScript code to run
    /// * `input` - Input to the agent
    ///
    /// # Returns
    ///
    /// Result containing the agent's output or an error
    pub async fn run_agent(
        &self,
        agent_id: &str,
        js_code: &str,
        input: &str,
    ) -> Result<AgentResult, AnyError> {
        // Cache the agent code
        {
            let mut cache = self.agent_code_cache.write().unwrap();
            cache.insert(agent_id.to_string(), AgentCodeCache {
                code: js_code.to_string(),
                last_used: std::time::Instant::now(),
            });
        }

        // Acquire the runtime mutex to ensure thread safety
        let _guard = self.runtime_mutex.lock().await;
        
        // Create a new runtime for this execution
        let mut runtime = JsRuntime::new(RuntimeOptions::default());
        
        // Initialize the runtime with the agent code
        runtime.execute_script("[agent]", FastString::from(js_code.to_string()))?;

        // Prepare input for the agent
        let input_code = format!(
            r#"
            (function() {{
                const input = {};
                
                // Call the agent's run function with the input
                if (typeof run !== "function") {{
                    throw new Error("Agent must export a 'run' function");
                }}
                
                return JSON.stringify(run(input));
            }})();
            "#,
            serde_json::to_string(input)?
        );

        // Execute the agent with the input
        let result = runtime.execute_script("[agent-run]", FastString::from(input_code))?;
        
        // Get the result from the runtime
        let scope = &mut runtime.handle_scope();
        let local = v8::Local::new(scope, result);
        let result_str = local.to_string(scope).unwrap();
        let rust_str = result_str.to_rust_string_lossy(scope);
        
        // Parse the result
        let agent_result: AgentResult = serde_json::from_str(&rust_str)?;
        
        Ok(agent_result)
    }

    /// Load a JavaScript agent from a file
    ///
    /// # Arguments
    ///
    /// * `agent_id` - ID of the agent
    /// * `file_path` - Path to the JavaScript file
    ///
    /// # Returns
    ///
    /// Result indicating success or an error
    pub async fn load_agent_from_file(&self, agent_id: &str, file_path: &str) -> Result<(), AnyError> {
        let js_code = fs::read_to_string(file_path)?;
        self.load_agent(agent_id, &js_code).await
    }

    /// Load a JavaScript agent from code
    ///
    /// # Arguments
    ///
    /// * `agent_id` - ID of the agent
    /// * * `js_code` - JavaScript code of the agent
    ///
    /// # Returns
    ///
    /// Result indicating success or an error
    pub async fn load_agent(&self, agent_id: &str, js_code: &str) -> Result<(), AnyError> {
        // Validate the agent code by creating a test runtime
        let _guard = self.runtime_mutex.lock().await;
        let mut runtime = JsRuntime::new(RuntimeOptions::default());
        runtime.execute_script("[agent-validation]", FastString::from(js_code.to_string()))?;
        
        // If validation succeeds, cache the code
        let mut cache = self.agent_code_cache.write().unwrap();
        cache.insert(agent_id.to_string(), AgentCodeCache {
            code: js_code.to_string(),
            last_used: std::time::Instant::now(),
        });
        
        Ok(())
    }

    /// Unload a JavaScript agent
    ///
    /// # Arguments
    ///
    /// * `agent_id` - ID of the agent to unload
    pub fn unload_agent(&self, agent_id: &str) {
        let mut cache = self.agent_code_cache.write().unwrap();
        cache.remove(agent_id);
    }
    
    /// Get the cached agent code
    ///
    /// # Arguments
    ///
    /// * `agent_id` - ID of the agent
    ///
    /// # Returns
    ///
    /// Option containing the agent code if found
    pub fn get_agent_code(&self, agent_id: &str) -> Option<String> {
        let cache = self.agent_code_cache.read().unwrap();
        cache.get(agent_id).map(|entry| entry.code.clone())
    }
}

/// Register Tauri commands for agent execution
#[tauri::command]
pub fn run_agent(
    agent_id: String,
    input: String,
    state: tauri::State<'_, V8AgentRunner>,
) -> Result<AgentResult, String> {
    let runtime = tokio::runtime::Runtime::new().unwrap();
    runtime.block_on(async {
        state.run_agent(&agent_id, &state.get_agent_code(&agent_id).unwrap_or_default(), &input)
            .await
            .map_err(|e| format!("Failed to run agent: {}", e))
    })
}

#[tauri::command]
pub fn load_agent(
    agent_id: String,
    js_code: String,
    state: tauri::State<'_, V8AgentRunner>,
) -> Result<(), String> {
    let runtime = tokio::runtime::Runtime::new().unwrap();
    runtime.block_on(async {
        state.load_agent(&agent_id, &js_code)
            .await
            .map_err(|e| format!("Failed to load agent: {}", e))
    })
}

#[tauri::command]
pub fn unload_agent(
    agent_id: String,
    state: tauri::State<'_, V8AgentRunner>,
) -> Result<(), String> {
    state.unload_agent(&agent_id);
    Ok(())
}
