/**
 * CopilotSidebar.tsx
 * 
 * Sidebar component for CoPilotKit chat interface.
 * This component provides a chat interface for interacting with Mastra agents.
 */

import React, { useState } from "react";
import { CopilotSidebar as CopilotKitSidebar } from "@copilotkit/react-ui";
import { Button } from "../ui/button";

interface CopilotSidebarProps {
  defaultOpen?: boolean;
  width?: number;
  position?: "left" | "right";
  className?: string;
}

/**
 * CopilotSidebar component
 * Provides a chat interface for interacting with Mastra agents
 */
export const CopilotSidebar: React.FC<CopilotSidebarProps> = ({
  defaultOpen = false,
  width = 400,
  position = "right",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <>
      {/* Toggle button for mobile */}
      <div className="fixed bottom-4 right-4 z-50 md:hidden">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full w-12 h-12 flex items-center justify-center"
          variant="default"
        >
          {isOpen ? (
            <span className="text-lg">×</span>
          ) : (
            <span className="text-lg">AI</span>
          )}
        </Button>
      </div>

      {/* CoPilotKit Sidebar */}
      <CopilotKitSidebar
        open={isOpen}
        onOpenChange={setIsOpen}
        defaultOpen={defaultOpen}
        className={`copilot-sidebar ${className}`}
        style={{
          width: `${width}px`,
          [position]: 0,
        }}
        customStyles={{
          header: {
            title: "Mastra Agent",
            subtitle: "Ask me anything about the application",
            iconUrl: "", // Add icon URL if available
          },
          chatInput: {
            placeholder: "Message Mastra...",
            sendButtonColor: "#0284c7", // Sky blue color
          },
          messageStyles: {
            userMessage: {
              backgroundColor: "#f1f5f9", // Slate-100
              textColor: "#0f172a", // Slate-900
            },
            assistantMessage: {
              backgroundColor: "#e0f2fe", // Sky-100
              textColor: "#0f172a", // Slate-900
            },
          },
        }}
      />
    </>
  );
};

export default CopilotSidebar;