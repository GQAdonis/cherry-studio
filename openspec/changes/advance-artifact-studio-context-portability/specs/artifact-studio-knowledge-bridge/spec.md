## ADDED Requirements
### Requirement: Knowledge Configuration Portability
The system SHALL transfer knowledge-base configuration from source assistant, agent, or conversation into Artifact Studio project context.

#### Scenario: Seeded project inherits source knowledge configuration
- **WHEN** a user opens Studio from an artifact whose source context includes knowledge-base selections
- **THEN** the project context envelope stores those knowledge-base references
- **AND** Studio refinement requests use those references unless overridden by project policy

### Requirement: Chat-History Knowledge Bridge
The system SHALL support optional creation of a managed project knowledge asset from source conversation history.

#### Scenario: Create project knowledge asset from source chat history
- **WHEN** a user enables knowledge-bridge creation during seed or project setup
- **THEN** source chat history is transformed into a project-linked knowledge asset
- **AND** the asset is available to Studio refinement and editable through knowledge management UI

#### Scenario: Reuse project knowledge asset in other chats
- **WHEN** a user elects to expose a project-linked knowledge asset outside Studio
- **THEN** the asset can be selected by other chats or assistants according to access rules
- **AND** provenance metadata indicates its originating Artifact Studio project
