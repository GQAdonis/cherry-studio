/**
 * CopilotDemo.tsx
 * 
 * Demo component showcasing the CoPilotKit integration with Mastra agents.
 * This component demonstrates how to use the CopilotProvider and CopilotSidebar.
 */

import React, { useState } from "react";
import { Button } from "../ui/button";
import CopilotProvider from "./CopilotProvider";
import CopilotSidebar from "./CopilotSidebar";

interface CopilotDemoProps {
  mastraAgentId?: string;
  mastraApiUrl?: string;
}

/**
 * CopilotDemo component
 * Demonstrates the CoPilotKit integration with Mastra agents
 */
export const CopilotDemo: React.FC<CopilotDemoProps> = ({
  mastraAgentId = "default-agent",
  mastraApiUrl = "http://localhost:4111",
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <CopilotProvider mastraAgentId={mastraAgentId} mastraApiUrl={mastraApiUrl}>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-slate-800 text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold">Mastra Agent Demo</h1>
            <Button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              variant="outline"
              className="text-white border-white hover:bg-slate-700"
            >
              {sidebarOpen ? "Close Chat" : "Open Chat"}
            </Button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 container mx-auto p-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">Welcome to the Mastra Agent Demo</h2>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">About this Demo</h3>
              <p className="text-gray-700">
                This demo showcases the integration of CoPilotKit with Mastra agents using an AG-UI adapter.
                You can interact with the Mastra agent through the chat sidebar.
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Agent Information</h3>
              <div className="bg-slate-50 p-4 rounded-md">
                <p><strong>Agent ID:</strong> {mastraAgentId}</p>
                <p><strong>API URL:</strong> {mastraApiUrl}</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Try It Out</h3>
              <p className="text-gray-700 mb-4">
                Click the button below to open the chat sidebar and start interacting with the Mastra agent.
              </p>
              <Button 
                onClick={() => setSidebarOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Chat with Mastra Agent
              </Button>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-slate-100 p-4 text-center text-gray-600">
          <p>CoPilotKit Integration with Mastra Agents Demo</p>
        </footer>
      </div>

      {/* Copilot Sidebar */}
      <CopilotSidebar defaultOpen={sidebarOpen} />
    </CopilotProvider>
  );
};

export default CopilotDemo;