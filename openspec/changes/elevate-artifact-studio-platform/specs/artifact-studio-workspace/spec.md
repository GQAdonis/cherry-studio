## ADDED Requirements
### Requirement: Dedicated Artifact Studio Workspace
The system SHALL provide an artifact-first workspace that can be created, opened, and edited independently from the conversation that originally created the artifact.

#### Scenario: Open artifact in standalone studio
- **WHEN** a user opens an artifact from chat or library in studio mode
- **THEN** the artifact opens in a dedicated editor workspace
- **AND** the workspace remains available after the originating conversation is closed or archived

#### Scenario: Create new studio artifact without conversation dependency
- **WHEN** a user starts a new artifact directly from the studio surface
- **THEN** the artifact receives its own persistent project identity
- **AND** it can be saved, reopened, and iterated without requiring a parent conversation

### Requirement: Artifact Session Persistence
Artifact studio state SHALL persist editor context needed for later continuation.

#### Scenario: Reopen previous studio session
- **WHEN** a user reopens a studio artifact project
- **THEN** the previous editing state (content, selected view mode, and revision pointer) is restored
- **AND** no content loss occurs from conversation lifecycle changes
