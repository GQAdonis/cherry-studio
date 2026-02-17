## ADDED Requirements
### Requirement: Artifact Studio Governance Settings
The system SHALL expose Artifact Studio governance controls in settings for default context behavior and override policy.

#### Scenario: Configure default context behavior for new projects
- **WHEN** a user updates Artifact settings for Studio defaults
- **THEN** new Artifact Studio projects inherit these defaults unless explicitly overridden during project creation
- **AND** default behavior applies to model, skill, context-management, and knowledge categories

#### Scenario: Configure override policy boundaries
- **WHEN** a user or administrator configures override rules in Artifact settings
- **THEN** Studio runtime enforces whether project-level and conversation-level overrides are allowed per category
- **AND** disallowed overrides are ignored with visible diagnostics

### Requirement: Migration-Safe Settings Rollout
The system SHALL migrate existing user settings safely when introducing Artifact Studio governance fields.

#### Scenario: Existing installations receive compatible defaults
- **WHEN** the application loads with pre-change settings data
- **THEN** migration initializes missing Artifact Studio governance fields with safe defaults
- **AND** existing artifact workflows remain functional without manual repair
