/**
 * AgentDemo.tsx
 * 
 * Demo page showcasing the CoPilotKit integration with Mastra agents.
 * This page demonstrates loading and running a Mastra agent, chat communication,
 * and agent responses in the AG-UI format.
 */

import React, { useState, useEffect } from "react";
import { invoke } from "../utils/tauri";
import { CopilotDemo } from "../components/copilot/CopilotDemo";
import { Button } from "../components/ui/button";

// Define the AgentResult interface to match the Rust struct
interface AgentResult {
  content: string;
  metadata?: Record<string, any>;
  actions?: Array<{
    action_type: string;
    name: string;
    parameters?: Record<string, any>;
  }>;
}

// Sample agent code
const SAMPLE_AGENT_CODE = `
// Mastra Agent Example
function run(input) {
  // Process the input
  const response = {
    content: "Hello! I'm a Mastra agent running in the V8 engine. You said: " + input,
    metadata: {
      timestamp: new Date().toISOString(),
      agentVersion: "1.0.0"
    },
    actions: [
      {
        type: "button",
        name: "greeting",
        parameters: {
          message: "Hello there!"
        }
      }
    ]
  };
  
  return response;
}
`;

/**
 * AgentDemo component
 * Demonstrates the CoPilotKit integration with Mastra agents
 */
export const AgentDemo: React.FC = () => {
  const [agentId, setAgentId] = useState<string>("demo-agent");
  const [agentLoaded, setAgentLoaded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load the agent on component mount
  useEffect(() => {
    loadAgent();
  }, []);

  // Load the agent into the V8 engine
  const loadAgent = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load the agent using the Tauri command
      await invoke("load_agent", {
        agentId,
        jsCode: SAMPLE_AGENT_CODE,
      });

      setAgentLoaded(true);
      console.log(`Agent ${agentId} loaded successfully`);
    } catch (err) {
      console.error("Failed to load agent:", err);
      setError(`Failed to load agent: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Unload the agent from the V8 engine
  const unloadAgent = async () => {
    try {
      setLoading(true);
      setError(null);

      // Unload the agent using the Tauri command
      await invoke("unload_agent", {
        agentId,
      });

      setAgentLoaded(false);
      console.log(`Agent ${agentId} unloaded successfully`);
    } catch (err) {
      console.error("Failed to unload agent:", err);
      setError(`Failed to unload agent: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Test the agent with a simple message
  const testAgent = async () => {
    try {
      setLoading(true);
      setError(null);

      // Run the agent using the Tauri command
      const result = await invoke<AgentResult>("run_agent", {
        agentId,
        input: "Hello from the test function!",
      });

      console.log("Agent response:", result);
      alert(`Agent response: ${JSON.stringify(result, null, 2)}`);
    } catch (err) {
      console.error("Failed to run agent:", err);
      setError(`Failed to run agent: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-slate-800 text-white p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Mastra Agent Demo</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Agent Control Panel */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Agent Control Panel</h2>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            <div className="mb-4">
              <label id="agent-id-label" className="block text-gray-700 mb-2">Agent ID</label>
              <input
                type="text"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={loading || agentLoaded}
                id="agent-id-input"
                aria-labelledby="agent-id-label"
                placeholder="Enter agent ID"
              />
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                onClick={loadAgent}
                disabled={loading || agentLoaded}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? "Loading..." : "Load Agent"}
              </Button>
              
              <Button
                onClick={unloadAgent}
                disabled={loading || !agentLoaded}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? "Unloading..." : "Unload Agent"}
              </Button>
              
              <Button
                onClick={testAgent}
                disabled={loading || !agentLoaded}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? "Testing..." : "Test Agent"}
              </Button>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-md">
              <h3 className="font-semibold mb-2">Agent Status</h3>
              <p>
                <span className="font-medium">Status:</span>{" "}
                {agentLoaded ? (
                  <span className="text-green-600">Loaded</span>
                ) : (
                  <span className="text-red-600">Not Loaded</span>
                )}
              </p>
            </div>
          </div>

          {/* Agent Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Agent Information</h2>
            
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Sample Agent Code</h3>
              <pre className="bg-slate-50 p-4 rounded-md overflow-auto text-sm">
                {SAMPLE_AGENT_CODE}
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">How It Works</h3>
              <p className="text-gray-700">
                This demo showcases the integration of Mastra agents with CoPilotKit using an AG-UI adapter.
                The agent runs in a V8 engine embedded in the Tauri application.
              </p>
            </div>
          </div>
        </div>

        {/* CoPilot Demo */}
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4">CoPilot Integration</h2>
          <div className="bg-white rounded-lg shadow-md p-6">
            {agentLoaded ? (
              <CopilotDemo mastraAgentId={agentId} mastraApiUrl="http://localhost:4111" />
            ) : (
              <div className="text-center p-8">
                <p className="text-gray-700 mb-4">
                  Please load the agent first to see the CoPilot integration.
                </p>
                <Button
                  onClick={loadAgent}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? "Loading..." : "Load Agent"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-100 p-4 text-center text-gray-600">
        <p>CoPilotKit Integration with Mastra Agents Demo</p>
      </footer>
    </div>
  );
};

export default AgentDemo;
