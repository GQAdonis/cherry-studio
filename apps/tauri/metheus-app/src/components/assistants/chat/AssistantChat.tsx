import React, { useState, useEffect } from "react";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInputArea from "./ChatInputArea";
import { Document } from "./types";
import { useCopilot } from "../../../hooks/use-copilot";
import { useChatStore } from "../../../stores/useChatStore";

/**
 * AssistantChat component that provides the main chat interface
 *
 * This component uses the CoPilotProvider to interact with the AI assistant
 * and displays the chat interface with messages, input area, and controls.
 *
 * @returns JSX element
 */
const AssistantChat = () => {
  // State for the chat interface
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [currentTopic, setCurrentTopic] = useState("New Chat");
  const attachedDocuments = useState<Document[]>([])[0];
  
  // Access the CoPilot context
  const copilotContext = useCopilot();
  const { messages, copilotApi, isLoading, isStreaming } = copilotContext;
  
  // Access chat store for additional state
  const {
    isInputExpanded,
    currentTokenCount,
    maxTokenCount,
    toggleInputExpanded,
    setCurrentTopic: updateCurrentTopic
  } = useChatStore();
  
  // Update isThinking when isLoading changes
  useEffect(() => {
    setIsThinking(isLoading);
  }, [isLoading]);
  

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!inputValue.trim() || isThinking) return;
    
    const userMessage = inputValue.trim();
    setInputValue("");
    setIsThinking(true);
    
    try {
      // Send message using copilotContext
      await copilotApi.sendMessage(userMessage);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsThinking(false);
    }
  };

  const handleRegenerateResponse = async () => {
    setIsThinking(true);
    try {
      // Regenerate response using copilotContext
      await copilotApi.regenerateResponse();
    } catch (error) {
      console.error("Error regenerating response:", error);
    } finally {
      setIsThinking(false);
    }
  };

  const messagesLength = messages.length;

  // Handlers for props
  const handleNewTopic = () => {
    setCurrentTopic("New Chat");
    updateCurrentTopic("New Chat");
    copilotApi.clearMessages();
  };

  const handleClearContext = () => {
    copilotApi.clearMessages();
  };

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        currentTopic={currentTopic}
        attachedDocuments={attachedDocuments}
        handleRegenerateResponse={handleRegenerateResponse}
        messagesLength={messagesLength}
      />
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-400">Loading chat...</p>
          </div>
        ) : (
          <ChatMessages messages={messages} isLoading={isLoading} isStreaming={isStreaming} />
        )}
      </div>
      <div className="border-t border-gray-800">
        <ChatInputArea
          input={inputValue}
          setInput={setInputValue}
          isInputExpanded={isInputExpanded}
          currentTokenCount={currentTokenCount}
          maxTokenCount={maxTokenCount}
          
          handleSendMessage={handleSubmit}
          handleNewTopic={handleNewTopic}
          toggleInputExpanded={toggleInputExpanded}
          handleClearContext={handleClearContext}
        />
      </div>
    </div>
  );
};

export default AssistantChat;