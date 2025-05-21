import React, { useState, useCallback, useEffect } from "react";
import { CopilotKit } from "@copilotkit/react-core";
import { useChatStore } from "../../../stores/useChatStore";
import { useSettingsStore } from "../../../stores/useSettingsStore";
import { copilotConfig } from "../../../config/copilot-config";
import { CoPilotMessage, CoPilotProviderProps } from "./types";
import { CoPilotProvider as CoPilotContextProvider } from "../../../hooks/use-copilot";

/**
 * CoPilotProvider component that provides CoPilotKit functionality to child components
 * 
 * This component wraps the CoPilotKit provider from @copilotkit/react-core and provides
 * a simplified interface for interacting with the AI assistant. It handles message format
 * conversion between the internal format and CoPilotKit's format.
 * 
 * @param props Component props
 * @returns JSX element
 */
const CoPilotProvider: React.FC<CoPilotProviderProps> = ({
  children,
}) => {
  const apiKey = copilotConfig.apiKey;
  const runtimeUrl = copilotConfig.runtimeUrl;
  const showDevConsole = copilotConfig.showDevConsole;
  const systemPrompt = copilotConfig.defaultSystemPrompt;

  // Access chat store
  const {
    addMessage,
    clearMessages: clearInternalMessages,
    selectedModel,
  } = useChatStore();

  // Access settings store
  const { theme } = useSettingsStore();

  // Local state for CoPilotKit messages
  const [copilotMessages, setCopilotMessages] = useState<CoPilotMessage[]>([
    {
      role: "system",
      content: systemPrompt,
      id: "system-1",
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  /**
   * Send a message to the AI assistant using CoPilotKit
   * @param message Message content
   * @returns Promise that resolves when the message is sent
   */
  const sendMessage = useCallback(
    async (message: string): Promise<void> => {
      if (!message.trim()) return;

      setIsLoading(true);

      try {
        // Create a user message
        const userMessage: CoPilotMessage = {
          role: "user",
          content: message,
          id: Date.now().toString(),
        };

        // Add user message to internal store
        addMessage({
          content: message,
          sender: "user",
        });

        // Update CoPilotKit messages
        const updatedMessages = [...copilotMessages, userMessage];
        setCopilotMessages(updatedMessages);

        // Create an initial empty assistant message for streaming
        const assistantMessageId = Date.now().toString();
        const initialAssistantMessage: CoPilotMessage = {
          role: "assistant",
          content: "",
          id: assistantMessageId,
          isStreaming: true,
        };

        // Add initial empty assistant message to store
        addMessage({
          content: "",
          sender: "assistant",
        });

        // Update CoPilotKit messages with empty assistant message
        setCopilotMessages([...updatedMessages, initialAssistantMessage]);
        setIsStreaming(true);

        // Make streaming API request to our self-hosted Hono-based CoPilotKit endpoint
        const response = await fetch(`${runtimeUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            messages: updatedMessages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            model: selectedModel,
            stream: true, // Enable streaming
          })
        });

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        // Process the streaming response
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable");
        }

        let accumulatedContent = "";
        
        // Read the stream
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Convert the chunk to text
          const chunk = new TextDecoder().decode(value);
          
          // Parse the SSE data
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              
              // Check if it's the [DONE] message
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content || '';
                
                if (content) {
                  // Accumulate the content
                  accumulatedContent += content;
                  
                  // Update the message in the state
                  setCopilotMessages(prevMessages => {
                    const newMessages = [...prevMessages];
                    const lastIndex = newMessages.length - 1;
                    
                    if (lastIndex >= 0 && newMessages[lastIndex].id === assistantMessageId) {
                      newMessages[lastIndex] = {
                        ...newMessages[lastIndex],
                        content: accumulatedContent,
                      };
                    }
                    
                    return newMessages;
                  });
                  
                  // Update the message in the internal store with updateExisting=true
                  addMessage({
                    content: accumulatedContent,
                    sender: "assistant",
                  }, true);
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
            }
          }
        }
        
        // Finalize the message when streaming is complete
        setCopilotMessages(prevMessages => {
          const newMessages = [...prevMessages];
          const lastIndex = newMessages.length - 1;
          
          if (lastIndex >= 0 && newMessages[lastIndex].id === assistantMessageId) {
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              content: accumulatedContent,
              isStreaming: false,
            };
          }
          
          return newMessages;
        });
        
      } catch (error) {
        console.error("Error sending message:", error);
        
        // Create an error message
        const errorMessage: CoPilotMessage = {
          role: "assistant",
          content: "Sorry, there was an error processing your request.",
          id: Date.now().toString(),
        };

        // Add error message to internal store
        addMessage({
          content: errorMessage.content,
          sender: "assistant",
        }, false);

        // Update CoPilotKit messages
        setCopilotMessages([...copilotMessages, errorMessage]);
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
      }
    },
    [addMessage, selectedModel, copilotMessages, apiKey, runtimeUrl]
  );

  /**
   * Regenerate the last assistant response using CoPilotKit
   * @returns Promise that resolves when the response is regenerated
   */
  const regenerateResponse = useCallback(async (): Promise<void> => {
    // Find the last assistant message
    const lastAssistantIndex = [...copilotMessages]
      .reverse()
      .findIndex((msg) => msg.role === "assistant");

    if (lastAssistantIndex === -1) return;

    setIsLoading(true);

    try {
      // Get all messages up to the last user message
      const actualIndex = copilotMessages.length - 1 - lastAssistantIndex;
      const messagesUpToLastUser = copilotMessages.slice(0, actualIndex);

      // Create an initial empty assistant message for streaming
      const assistantMessageId = Date.now().toString();
      const initialAssistantMessage: CoPilotMessage = {
        role: "assistant",
        content: "",
        id: assistantMessageId,
        isStreaming: true,
      };

      // Add initial empty assistant message to store
      addMessage({
        content: "",
        sender: "assistant",
      });

      // Update CoPilotKit messages with empty assistant message
      setCopilotMessages([...messagesUpToLastUser, initialAssistantMessage]);
      setIsStreaming(true);

      // Make streaming API request to our Hono-based CoPilotKit endpoint
      const response = await fetch(`${runtimeUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          messages: messagesUpToLastUser.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          model: selectedModel,
          stream: true, // Enable streaming
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      // Process the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      let accumulatedContent = "";
      
      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Convert the chunk to text
        const chunk = new TextDecoder().decode(value);
        
        // Parse the SSE data
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            
            // Check if it's the [DONE] message
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              
              if (content) {
                // Accumulate the content
                accumulatedContent += content;
                
                // Update the message in the state
                setCopilotMessages(prevMessages => {
                  const newMessages = [...prevMessages];
                  const lastIndex = newMessages.length - 1;
                  
                  if (lastIndex >= 0 && newMessages[lastIndex].id === assistantMessageId) {
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      content: accumulatedContent,
                    };
                  }
                  
                  return newMessages;
                });
                
                // Update the message in the internal store with updateExisting=true
                addMessage({
                  content: accumulatedContent,
                  sender: "assistant",
                }, true);
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e);
            }
          }
        }
      }
      
      // Finalize the message when streaming is complete
      setCopilotMessages(prevMessages => {
        const newMessages = [...prevMessages];
        const lastIndex = newMessages.length - 1;
        
        if (lastIndex >= 0 && newMessages[lastIndex].id === assistantMessageId) {
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: accumulatedContent,
            isStreaming: false,
          };
        }
        
        return newMessages;
      });
    } catch (error) {
      console.error("Error regenerating response:", error);
      
      // Create an error message
      const errorMessage: CoPilotMessage = {
        role: "assistant",
        content: "Sorry, there was an error regenerating the response.",
        id: Date.now().toString(),
      };

      // Add error message to internal store
      addMessage({
        content: errorMessage.content,
        sender: "assistant",
      }, false);

      // Update CoPilotKit messages with the error message
      setCopilotMessages([...copilotMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [copilotMessages, addMessage, selectedModel, apiKey, runtimeUrl]);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    clearInternalMessages();
    setCopilotMessages([
      {
        role: "system",
        content: systemPrompt,
        id: "system-1",
      }
    ]);
  }, [clearInternalMessages, systemPrompt]);

  // Create context value
  const contextValue = {
    messages: copilotMessages,
    copilotApi: {
      sendMessage,
      regenerateResponse,
      clearMessages,
    },
    isLoading,
    isStreaming,
  };

  // Verify endpoint connection when the component mounts or runtimeUrl changes
  useEffect(() => {
    const verifyEndpoint = async () => {
      try {
        // Check the endpoint health
        const response = await fetch(`${runtimeUrl}/health`);
        if (response.ok) {
          console.log(`Successfully connected to Copilot endpoint at ${runtimeUrl}`);
        } else {
          console.warn(`Endpoint health check failed at ${runtimeUrl}`);
        }
      } catch (error) {
        console.warn(`Could not connect to Copilot endpoint at ${runtimeUrl}:`, error);
      }
    };
    
    verifyEndpoint();
  }, [runtimeUrl]);

  return (
    <CoPilotContextProvider value={contextValue}>
      <CopilotKit
        publicApiKey={apiKey}
        runtimeUrl={runtimeUrl}
        showDevConsole={showDevConsole}
        properties={{
          selectedModel,
          theme,
          systemPrompt,
        }}
      >
        {children}
      </CopilotKit>
    </CoPilotContextProvider>
  );
};

export default CoPilotProvider;