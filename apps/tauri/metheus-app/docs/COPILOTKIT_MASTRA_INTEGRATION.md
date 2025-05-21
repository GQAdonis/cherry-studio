# CoPilotKit Integration with Mastra Orchestrator Agent

## Overview

This document outlines the approach for integrating CoPilotKit with the Mastra orchestrator agent in the Flame Agent Studio project. This integration enables the use of Mastra's powerful orchestration capabilities with CoPilotKit's UI components in a self-hosted environment.

## Architecture

The implementation follows a modular architecture that ensures:

1. **Separation of concerns**: The flame-agent project serves as the middleware between the Flame Agent Studio main application and Mastra.
2. **Compatibility with both desktop and web environments**: The same communication pattern works regardless of whether the application is running in Electron or as a web application.
3. **Security**: No API keys are exposed directly to the client.

```
┌───────────────────┐          ┌───────────────────┐          ┌───────────────────┐
│                   │          │                   │          │                   │
│  Flame Agent      │  HTTP    │  Flame Agent      │  API     │  Mastra           │
│  Studio (Client)  │◄────────►│  (Server)         │◄────────►│  Orchestrator     │
│                   │          │                   │          │                   │
└───────────────────┘          └───────────────────┘          └───────────────────┘
```

## Implementation Strategy

### 1. Hono CoPilotKit Endpoint

We'll implement a Hono endpoint in the flame-agent project that:

- Follows the CoPilotKit API specification
- Uses the Mastra client to communicate with the Mastra orchestrator agent
- Handles authentication and session management
- Manages streaming responses

This endpoint will be compatible with the CoPilotKit JavaScript SDK and will seamlessly replace the existing CoPilotKit API endpoint.

### 2. Mastra Client Adapter

We'll create a Mastra client adapter that:

- Translates CoPilotKit requests into Mastra agent calls
- Converts Mastra responses into CoPilotKit-compatible format
- Handles error states and edge cases
- Supports streaming responses for a better user experience

### 3. Main Application Integration

The main Flame Agent Studio application will be refactored to:

- Use the self-hosted CoPilotKit endpoint instead of the CoPilotKit service
- Connect to the local flame-agent instance in Electron or a cloud instance in web mode
- Maintain the same UI and user experience

### 4. Docker Containerization

We'll create a Docker image for the Mastra project that:

- Packages all dependencies
- Configures the necessary environment
- Exposes the CoPilotKit-compatible API
- Can be deployed alongside the main application

## Benefits

1. **Self-hosted solution**: No reliance on external CoPilotKit API services
2. **Greater control**: Full control over the AI orchestration logic
3. **Cost-effective**: Reduced API costs by using self-hosted models
4. **Consistent architecture**: Maintains the same architecture across both desktop and web environments
5. **Future extensibility**: Easy to extend with new capabilities as Mastra evolves

## Implementation Plan

1. Add the CoPilotKit endpoint to the flame-agent project using Hono (aligned with Mastra's architecture)
2. Create the Mastra client adapter for CoPilotKit
3. Update the main application to use the new endpoint
4. Create the Docker configuration for deployment
5. Update documentation and tests

## Technical Considerations

### Why Hono?

We chose Hono as the HTTP framework for our implementation because:

1. **Consistency with Mastra**: Mastra already uses Hono as its underlying HTTP framework, which ensures seamless integration
2. **Performance**: Hono is designed to be lightweight and fast
3. **TypeScript Support**: Provides excellent TypeScript support and type safety
4. **Middleware Ecosystem**: Rich middleware ecosystem that aligns with our needs
5. **Modern Architecture**: Uses modern JavaScript and follows best practices for API design

## Security Considerations

- The flame-agent will handle authentication and not expose sensitive credentials
- Proper validation of inputs and outputs
- Rate limiting to prevent abuse
- Logging for audit purposes