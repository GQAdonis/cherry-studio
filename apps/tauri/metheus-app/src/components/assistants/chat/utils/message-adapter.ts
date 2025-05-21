import { CoPilotMessage } from "../types";

/**
 * Utility class for adapting messages between different formats
 */
export class MessageAdapter {
  /**
   * Convert a message from the internal format to the CoPilotKit format
   * @param message Internal message format
   * @returns CoPilotKit message format
   */
  static toCoPilotMessage(message: { content: string; sender: 'user' | 'assistant' | 'system' }): CoPilotMessage {
    return {
      role: message.sender,
      content: message.content,
      id: Date.now().toString(),
    };
  }

  /**
   * Convert a message from the CoPilotKit format to the internal format
   * @param message CoPilotKit message format
   * @returns Internal message format
   */
  static fromCoPilotMessage(message: CoPilotMessage): { content: string; sender: 'user' | 'assistant' | 'system' } {
    return {
      content: message.content,
      sender: message.role,
    };
  }
}