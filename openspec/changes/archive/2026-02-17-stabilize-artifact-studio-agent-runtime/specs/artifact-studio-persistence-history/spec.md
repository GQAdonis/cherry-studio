## ADDED Requirements

### Requirement: Durable refinement chat persistence
Artifact Studio SHALL durably persist refinement chat history per project and restore it when the project is reopened.

#### Scenario: Reopen restores chat history
- **WHEN** a user reopens an existing Artifact Studio project
- **THEN** prior refinement messages are restored in chronological order
- **AND** restored messages preserve role, timestamp, and associated runtime diagnostics metadata

#### Scenario: Persistence survives app restart
- **WHEN** the application is restarted after Artifact Studio refinements were saved
- **THEN** reopening the project restores persisted refinement chat history
- **AND** no in-memory-only dependency is required for restoration

### Requirement: Version-linked navigation persistence
Artifact Studio SHALL persist version history and version-linked navigation context.

#### Scenario: Version history restoration
- **WHEN** an artifact with multiple revisions is reopened
- **THEN** prior revision records are restored with content and version metadata
- **AND** version navigation controls reflect the restored history bounds

#### Scenario: Version-linked chat context
- **WHEN** a user navigates artifact history in Studio
- **THEN** the UI can associate visible context with the selected version
- **AND** version-linked navigation state remains consistent across reopen

### Requirement: Seed initialization continuity
Artifact Studio SHALL preserve context continuity for both seeded-from-existing and new-from-scratch project initialization paths.

#### Scenario: Existing source seed
- **WHEN** Studio is initialized from a conversation/library artifact seed
- **THEN** project persistence captures source linkage and initialized content
- **AND** subsequent reopen maintains the seeded context continuity

#### Scenario: Scratch initialization
- **WHEN** Studio is initialized as a new project without prior source artifact
- **THEN** project persistence captures initial artifact state and runtime context
- **AND** reopen resumes from that persisted initial baseline
