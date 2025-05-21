import React, { useRef, useEffect } from "react";
import { CoPilotMessage } from "./types";
import { cn } from "../../../lib/utils";

interface ChatMessagesProps {
  messages: CoPilotMessage[];
  isLoading?: boolean;
  isStreaming?: boolean;
}

/**
 * ChatMessages component that displays chat messages
 * 
 * This component renders the chat messages with appropriate styling based on the sender.
 * It also handles automatic scrolling to the latest message and displays a loading indicator
 * when a response is being generated.
 * 
 * @param props Component props
 * @returns JSX element
 */
export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isLoading = false,
  isStreaming = false
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to the bottom when messages change or when loading/streaming state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isStreaming]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {messages.map((message) => (
        <div
          key={message.id || `${message.role}-${message.content.substring(0, 10)}`}
          className={cn(
            "flex",
            message.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          <div
            className={cn(
              "max-w-3xl rounded-lg px-4 py-3",
              message.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-white border border-gray-700"
            )}
          >
            {/* Render message content with proper formatting */}
            <div className="whitespace-pre-wrap break-words">
              {message.content}
              {message.isStreaming && (
                <span className="inline-block ml-1 animate-pulse">▌</span>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Loading indicator when not streaming but waiting for response */}
      {isLoading && !isStreaming && (
        <div className="flex justify-start">
          <div className="max-w-3xl rounded-lg px-4 py-3 bg-gray-800 text-white border border-gray-700">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="h-2 w-2 rounded-full bg-gray-400 animate-pulse" />
                <div className="h-2 w-2 rounded-full bg-gray-400 animate-pulse delay-150" />
                <div className="h-2 w-2 rounded-full bg-gray-400 animate-pulse delay-300" />
              </div>
              <span className="text-sm text-gray-400">Thinking...</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Invisible element to scroll to */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;