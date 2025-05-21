import React, { useRef, useEffect } from "react";
import { Textarea } from "../../../components/ui/textarea";
import { useCopilot } from "../../../hooks/use-copilot";
import { Button } from "../../../components/ui/button";
import { Send } from "lucide-react";

interface ChatInputAreaProps {
  input: string;
  setInput: (value: string) => void;
  isInputExpanded: boolean;
  currentTokenCount: number;
  maxTokenCount: number;
  
  handleSendMessage: () => void;
  handleNewTopic: () => void;
  toggleInputExpanded: () => void;
  handleClearContext: () => void;
}

/**
 * ChatInputArea component that provides the input area for the chat
 * 
 * This component renders the input area for the chat, including the text input
 * and controls for sending messages and managing the chat.
 * 
 * @param props Component props
 * @returns JSX element
 */
export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  input,
  setInput,
  isInputExpanded,
  currentTokenCount,
  maxTokenCount,
  
  handleSendMessage,
  handleNewTopic,
  toggleInputExpanded,
  handleClearContext,
}) => {
  const { isLoading } = useCopilot();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus the input when it's expanded
  useEffect(() => {
    if (isInputExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isInputExpanded]);

  // Handle key press for sending messages
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="border-t border-gray-800 p-4">
      <div className="relative">
        {isInputExpanded ? (
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here..."
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-md text-white resize-none min-h-24 pr-12"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
              size="icon"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here..."
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-md text-white pr-12"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
              size="icon"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewTopic}
          >
            New Topic
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleInputExpanded}
          >
            {isInputExpanded ? "Collapse" : "Expand"}
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="text-xs text-gray-400">
            {currentTokenCount}/{maxTokenCount} tokens
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearContext}
          >
            Clear Context
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInputArea;