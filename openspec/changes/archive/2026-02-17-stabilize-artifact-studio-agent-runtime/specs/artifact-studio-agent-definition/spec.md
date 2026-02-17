## ADDED Requirements

### Requirement: Deterministic Artifact Studio agent identity
The system SHALL maintain exactly one built-in Artifact Studio agent with deterministic identity `artifact-studio`.

#### Scenario: Startup idempotency
- **WHEN** application startup runs Artifact Studio agent initialization multiple times across restarts
- **THEN** the persisted agent record remains a single logical agent with id `artifact-studio`
- **AND** duplicate Artifact Studio agents are not created

#### Scenario: API visibility
- **WHEN** clients query the agent list endpoint
- **THEN** the response includes the built-in `artifact-studio` agent
- **AND** the returned payload remains stable enough for clients to target that agent by id

### Requirement: Editable Artifact Studio agent defaults
The Artifact Studio agent SHALL be initialized with system defaults and SHALL remain user-editable for model and strategy settings.

#### Scenario: Default initialization
- **WHEN** the Artifact Studio agent is first created
- **THEN** it is assigned default model and runtime settings appropriate for Artifact Studio refinement
- **AND** defaults are persisted for future sessions

#### Scenario: Saved editability
- **WHEN** a user updates model selection, skill strategy, or context strategy for `artifact-studio`
- **THEN** the updated configuration is persisted
- **AND** subsequent Artifact Studio sessions use the saved configuration

### Requirement: Default artifact-refiner skill binding
The system SHALL bind `artifact-refiner` as the default enabled skill for the Artifact Studio agent.

#### Scenario: Skill resolution for artifact-studio
- **WHEN** enabled skills are resolved for agent `artifact-studio`
- **THEN** `artifact-refiner` is included in the effective skill set by default
- **AND** Artifact Studio refinement can invoke artifact-refiner without manual per-session setup
