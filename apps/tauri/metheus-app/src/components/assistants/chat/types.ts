import { ReactNode } from "react";

// Message types compatible with CopilotKit
export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id?: string;
  role: MessageRole;
  content: string;
  createdAt?: Date;
}

export interface Document {
  id: string;
  title: string;
  preview: string;
  content?: string;
  url?: string;
}

export interface ChatInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e?: React.FormEvent) => void;
  isThinking: boolean;
}

export interface ChatControlsProps {
  onRegenerate: () => void;
}

export interface ChatMessagesProps {
  messages: Message[];
}

export interface ChatHeaderProps {
  title?: string;
  currentTopic: string;
  attachedDocuments: Document[];
  handleRegenerateResponse: () => void;
  messagesLength: number;
}

export interface CoPilotProviderProps {
  children: ReactNode;
}

export interface CoPilotMessage {
  role: "user" | "assistant" | "system";
  content: string;
  id?: string;
  isStreaming?: boolean;
}