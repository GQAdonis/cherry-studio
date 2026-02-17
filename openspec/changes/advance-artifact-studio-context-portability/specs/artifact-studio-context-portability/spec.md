## ADDED Requirements
### Requirement: Source Context Portability Into Artifact Studio
The system SHALL carry source runtime configuration from the originating assistant, agent, or conversation into the Artifact Studio project baseline.

#### Scenario: Seeded project captures source execution context
- **WHEN** a user opens Artifact Studio from a chat/library artifact with source context available
- **THEN** the project stores a context envelope containing LLM configuration, skills configuration, context-management strategy, and knowledge-base configuration
- **AND** the envelope is persisted with source provenance metadata

### Requirement: Deterministic Effective Context Resolution
The system SHALL resolve effective Studio runtime context using deterministic precedence across source snapshot, project overrides, conversation overrides, and global defaults.

#### Scenario: Project-level overrides take precedence over source snapshot
- **WHEN** a project contains explicit override values for settings that were also captured from source context
- **THEN** Studio runtime uses project override values
- **AND** the runtime records resolved source-of-truth metadata for each resolved category

#### Scenario: Fallback to defaults when source context is incomplete
- **WHEN** the seed source lacks one or more context categories
- **THEN** missing categories resolve from configured Artifact Studio defaults
- **AND** project creation still succeeds without blocking
