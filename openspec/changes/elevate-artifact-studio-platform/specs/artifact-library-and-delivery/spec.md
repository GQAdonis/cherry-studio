## ADDED Requirements
### Requirement: Library-Centric Artifact Lifecycle
The system SHALL treat artifacts as durable library assets that can be independently revised and delivered.

#### Scenario: Edit library artifact without returning to source conversation
- **WHEN** a user selects a saved library artifact for editing
- **THEN** the system opens it in studio and creates a new revision path
- **AND** no source-conversation navigation is required

#### Scenario: Preserve revision provenance
- **WHEN** a library artifact revision is saved
- **THEN** the system records provenance metadata (source artifact, revision ancestry, timestamp, validation state)
- **AND** provenance is retrievable for later audit

### Requirement: Delivery Packaging
The system SHALL support packaging artifacts for downstream delivery and application use.

#### Scenario: Package artifact with manifest
- **WHEN** a user exports an artifact for delivery
- **THEN** the output includes artifact files and a manifest describing runtime/dependency/version metadata
- **AND** the export result can be reopened and validated by the system later
