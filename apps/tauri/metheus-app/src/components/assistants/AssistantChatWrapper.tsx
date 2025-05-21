import React from "react";
import AssistantChat from "./chat/AssistantChat";
import CoPilotProvider from "./chat/CoPilotProvider";

/**
 * AssistantChatWrapper component that wraps the AssistantChat component with the CoPilotProvider
 *
 * This component provides the CoPilotKit functionality to the AssistantChat component
 * by wrapping it with the CoPilotProvider.
 *
 * @returns JSX element
 */
const AssistantChatWrapper = () => {
  return (
    <CoPilotProvider>
      <AssistantChat />
    </CoPilotProvider>
  );
};

export default AssistantChatWrapper;