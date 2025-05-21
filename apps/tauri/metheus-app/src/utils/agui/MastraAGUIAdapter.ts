/**
 * MastraAGUIAdapter.ts
 * 
 * This file implements a specific AG-UI adapter for Mastra agents.
 * It handles the conversion between Mastra agent responses and the AG-UI format.
 */

import { MastraClient } from "@mastra/client-js";
import { AGUIAdapter, AgentConfig, AgentResponse, AgentAction } from "./AGUIAdapter";

/**
 * Interface for Mastra agent configuration
 */
export interface MastraAgentConfig extends AgentConfig {
  resourceId: string;
  apiUrl?: string;
}

/**
 * Interface for Mastra agent response
 */
export interface MastraAgentResponse {
  content: string;
  metadata?: Record<string, any>;
  actions?: MastraAgentAction[];
}

/**
 * Interface for Mastra agent action
 */
export interface MastraAgentAction {
  type: string;
  name: string;
  parameters?: Record<string, any>;
}

/**
 * Mastra AG-UI Adapter class
 * Converts Mastra agent responses to AG-UI format for CoPilotKit
 */
export class MastraAGUIAdapter extends AGUIAdapter {
  private client: MastraClient;
  private resourceId: string;

  /**
   * Constructor
   * @param config - Configuration for the Mastra agent
   */
  constructor(config: MastraAgentConfig) {
    super(config);
    this.resourceId = config.resourceId;
    this.client = new MastraClient({
      baseUrl: config.apiUrl || "http://localhost:4111", // Default Mastra server URL
    });
  }

  /**
   * Process user message for the Mastra agent
   * @param message - The user message to process
   * @returns Promise resolving to agent response
   */
  public async processMessage(message: string): Promise<AgentResponse> {
    try {
      // Call the Mastra agent with the user message
      const response = await this.client.runAgent({
        resourceId: this.resourceId,
        input: message,
      });

      // Convert Mastra response to AgentResponse format
      return this.convertMastraResponse(response);
    } catch (error) {
      console.error("Error processing message with Mastra agent:", error);
      return {
        content: "Sorry, there was an error processing your message. Please try again later.",
      };
    }
  }

  /**
   * Convert Mastra response to AgentResponse format
   * @param mastraResponse - The Mastra response to convert
   * @returns Converted AgentResponse
   */
  private convertMastraResponse(mastraResponse: any): AgentResponse {
    // Extract content from Mastra response
    const content = mastraResponse.output || mastraResponse.content || "No response content";
    
    // Extract actions if present
    const actions: AgentAction[] = [];
    if (mastraResponse.actions && Array.isArray(mastraResponse.actions)) {
      mastraResponse.actions.forEach((action: MastraAgentAction) => {
        actions.push({
          type: action.type,
          name: action.name,
          parameters: action.parameters,
        });
      });
    }

    // Extract metadata if present
    const metadata = mastraResponse.metadata || {};

    return {
      content,
      actions,
      metadata,
    };
  }

  /**
   * Create a Mastra AG-UI adapter from a resource ID
   * @param resourceId - The resource ID of the Mastra agent
   * @param apiUrl - Optional API URL for the Mastra server
   * @returns Promise resolving to MastraAGUIAdapter
   */
  public static async createFromResourceId(
    resourceId: string,
    apiUrl?: string
  ): Promise<MastraAGUIAdapter> {
    try {
      const client = new MastraClient({
        baseUrl: apiUrl || "http://localhost:4111",
      });

      // Get the agent configuration from Mastra
      const agentInfo = await client.getAgent({ resourceId });

      // Create agent config
      const config: MastraAgentConfig = {
        id: resourceId,
        name: agentInfo.name || "Mastra Agent",
        description: agentInfo.description || "A Mastra-powered agent",
        capabilities: agentInfo.capabilities || [],
        resourceId,
        apiUrl,
        metadata: agentInfo.metadata || {},
      };

      return new MastraAGUIAdapter(config);
    } catch (error) {
      console.error("Error creating Mastra AG-UI adapter:", error);
      throw new Error(`Failed to create Mastra AG-UI adapter: ${error}`);
    }
  }
}