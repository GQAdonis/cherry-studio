/**
 * AGUIAdapter.ts
 * 
 * This file defines the base adapter for converting agent responses to AG-UI format.
 * AG-UI (Agent-User Interaction Protocol) is a standardized event-driven protocol
 * that acts as a universal translator between intelligent agents and front-end applications.
 */

import { CopilotMessage, CopilotAction, CopilotChunk } from "@copilotkit/runtime";

/**
 * Interface for agent configuration
 */
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  metadata?: Record<string, any>;
}

/**
 * Interface for agent response
 */
export interface AgentResponse {
  content: string;
  metadata?: Record<string, any>;
  actions?: AgentAction[];
}

/**
 * Interface for agent action
 */
export interface AgentAction {
  type: string;
  name: string;
  parameters?: Record<string, any>;
}

/**
 * Base AG-UI Adapter class
 * Converts agent responses to AG-UI format for CoPilotKit
 */
export class AGUIAdapter {
  protected agentConfig: AgentConfig;

  /**
   * Constructor
   * @param agentConfig - Configuration for the agent
   */
  constructor(agentConfig: AgentConfig) {
    this.agentConfig = agentConfig;
  }

  /**
   * Convert agent response to CoPilotKit message format
   * @param response - The agent response to convert
   * @returns CoPilotKit formatted message
   */
  public convertToCopilotMessage(response: AgentResponse): CopilotMessage {
    // Create message chunks
    const chunks: CopilotChunk[] = [
      {
        content: response.content,
        role: "assistant",
      },
    ];

    // Convert actions if present
    const actions: CopilotAction[] = response.actions
      ? response.actions.map(this.convertAction.bind(this))
      : [];

    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content: response.content,
      chunks,
      actions,
      metadata: {
        agentId: this.agentConfig.id,
        ...response.metadata,
      },
    };
  }

  /**
   * Convert agent action to CoPilotKit action format
   * @param action - The agent action to convert
   * @returns CoPilotKit formatted action
   */
  protected convertAction(action: AgentAction): CopilotAction {
    return {
      id: crypto.randomUUID(),
      type: action.type,
      name: action.name,
      parameters: action.parameters || {},
    };
  }

  /**
   * Process user message for the agent
   * This method should be implemented by specific agent adapters
   * @param message - The user message to process
   * @returns Promise resolving to agent response
   */
  /**
   * Process user message for the agent
   * This method should be implemented by specific agent adapters
   * @param message - The user message to process
   * @returns Promise resolving to agent response
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async processMessage(message: string): Promise<AgentResponse> {
    throw new Error("Method not implemented. Should be overridden by specific agent adapters.");
  }

  /**
   * Get agent configuration
   * @returns The agent configuration
   */
  public getAgentConfig(): AgentConfig {
    return this.agentConfig;
  }
}