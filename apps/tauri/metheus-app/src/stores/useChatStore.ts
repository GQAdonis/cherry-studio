import { create } from 'zustand';

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
}

interface ChatMessage {
  content: string;
  sender: 'user' | 'assistant';
}

interface ChatStore {
  // Chat state
  messages: ChatMessage[];
  currentTopic: string;
  isWebSearchEnabled: boolean;
  reasoningEffort: 'default' | 'more' | 'less';
  selectedModel: string;
  isInputExpanded: boolean;
  knowledgeBases: KnowledgeBase[];
  
  // Token and context counts
  currentTokenCount: number;
  maxTokenCount: number;
  currentContextCount: number;
  maxContextCount: number;
  
  // Actions
  addMessage: (message: ChatMessage, updateExisting?: boolean) => void;
  clearMessages: () => void;
  setCurrentTopic: (topic: string) => void;
  toggleWebSearch: () => void;
  setReasoningEffort: (effort: 'default' | 'more' | 'less') => void;
  setSelectedModel: (model: string) => void;
  toggleInputExpanded: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  // Initial state
  messages: [],
  currentTopic: 'New Chat',
  isWebSearchEnabled: false,
  reasoningEffort: 'default',
  selectedModel: 'gpt-4',
  isInputExpanded: false,
  knowledgeBases: [
    {
      id: 'kb-1',
      name: 'Project Documentation',
      description: 'Documentation for the current project',
      isEnabled: false
    },
    {
      id: 'kb-2',
      name: 'API References',
      description: 'API documentation and references',
      isEnabled: false
    }
  ],
  
  // Token and context counts (placeholder values)
  currentTokenCount: 0,
  maxTokenCount: 4000,
  currentContextCount: 0,
  maxContextCount: 16000,
  
  // Actions
  addMessage: (message, updateExisting = false) => set(state => {
    if (updateExisting && state.messages.length > 0 && state.messages[state.messages.length - 1].sender === message.sender) {
      // Update the last message if it's from the same sender
      const updatedMessages = [...state.messages];
      updatedMessages[updatedMessages.length - 1] = message;
      
      return { 
        messages: updatedMessages,
        currentTokenCount: Math.min(state.currentTokenCount + message.content.length / 4, state.maxTokenCount),
        currentContextCount: Math.min(state.currentContextCount + message.content.length / 4, state.maxContextCount)
      };
    } else {
      // Add a new message
      return { 
        messages: [...state.messages, message],
        currentTokenCount: Math.min(state.currentTokenCount + message.content.length / 4, state.maxTokenCount),
        currentContextCount: Math.min(state.currentContextCount + message.content.length / 4, state.maxContextCount)
      };
    }
  }),
  
  clearMessages: () => set({
    messages: [],
    currentTokenCount: 0,
    currentContextCount: 0
  }),
  
  setCurrentTopic: (topic) => set({ currentTopic: topic }),
  
  toggleWebSearch: () => set(state => ({ 
    isWebSearchEnabled: !state.isWebSearchEnabled 
  })),
  
  setReasoningEffort: (effort) => set({ reasoningEffort: effort }),
  
  setSelectedModel: (model) => set({ selectedModel: model }),
  
  toggleInputExpanded: () => set(state => ({ 
    isInputExpanded: !state.isInputExpanded 
  }))
}));