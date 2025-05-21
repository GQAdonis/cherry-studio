import { useContext, createContext } from 'react';
import { CoPilotMessage } from '../components/assistants/chat/types';

/**
 * Context interface for CoPilot functionality
 */
export interface CoPilotContextType {
  messages: CoPilotMessage[];
  copilotApi: {
    sendMessage: (message: string) => Promise<void>;
    regenerateResponse: () => Promise<void>;
    clearMessages: () => void;
  };
  isLoading: boolean;
  isStreaming: boolean;
}

// Create context with a default value
const CoPilotContext = createContext<CoPilotContextType | null>(null);

/**
 * Provider component for the CoPilot context
 */
export const CoPilotProvider = CoPilotContext.Provider;

/**
 * Hook to access the CoPilot context
 * @returns The CoPilot context
 * @throws Error if used outside of CoPilotProvider
 */
export const useCopilot = (): CoPilotContextType => {
  const context = useContext(CoPilotContext);
  if (!context) {
    throw new Error("useCopilot must be used within a CoPilotProvider");
  }
  return context;
};