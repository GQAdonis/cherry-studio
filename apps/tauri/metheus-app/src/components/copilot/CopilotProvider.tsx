/**
 * CopilotProvider.tsx
 * 
 * Provider component for CoPilotKit integration.
 * This component sets up the CoPilotKit runtime and provides it to the application.
 */

import React, { ReactNode, useEffect, useState } from "react";
import { CopilotKit } from "@copilotkit/react-core";
import { MastraAGUIAdapter } from "../../utils/agui/MastraAGUIAdapter";

interface CopilotProviderProps {
  children: ReactNode;
  mastraAgentId?: string;
  mastraApiUrl?: string;
}

/**
 * CopilotProvider component
 * Sets up the CoPilotKit runtime with Mastra agent integration
 */
export const CopilotProvider: React.FC<CopilotProviderProps> = ({
  children,
  mastraAgentId = "default-agent",
  mastraApiUrl = "http://localhost:4111",
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentConfig, setAgentConfig] = useState<{
    id: string;
    name: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    const initializeCopilot = async () => {
      try {
        setIsLoading(true);
        
        // Create Mastra AG-UI adapter
        const adapter = await MastraAGUIAdapter.createFromResourceId(
          mastraAgentId,
          mastraApiUrl
        );

        // Get agent configuration
        const config = adapter.getAgentConfig();
        setAgentConfig({
          id: config.id,
          name: config.name,
          description: config.description
        });
        
        setError(null);
      } catch (err) {
        console.error("Failed to initialize CopilotKit:", err);
        setError(`Failed to initialize CopilotKit: ${err}`);
      } finally {
        setIsLoading(false);
      }
    };

    initializeCopilot();
  }, [mastraAgentId, mastraApiUrl]);

  if (isLoading) {
    return <div className="flex items-center justify-center p-4">Loading Copilot...</div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4 text-red-500">
        Error: {error}
      </div>
    );
  }

  if (!agentConfig) {
    return <div className="flex items-center justify-center p-4">Copilot not available</div>;
  }

  // Use the runtimeUrl prop instead of directly passing a runtime object
  return (
    <CopilotKit runtimeUrl={mastraApiUrl}>
      {children}
    </CopilotKit>
  );
};

export default CopilotProvider;
