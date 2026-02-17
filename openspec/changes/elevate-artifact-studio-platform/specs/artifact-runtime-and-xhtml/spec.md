## ADDED Requirements
### Requirement: Multi-Level Runtime Profiles
The artifact runtime SHALL support at least three capability profiles (basic, standard, advanced) to serve novice through advanced builders.

#### Scenario: Basic profile enforces safe defaults
- **WHEN** runtime profile is set to `basic`
- **THEN** the runtime uses managed dependencies and guarded execution defaults
- **AND** advanced runtime controls are hidden or disabled

#### Scenario: Advanced profile enables full runtime controls
- **WHEN** runtime profile is set to `advanced`
- **THEN** users can configure supported runtime options (such as bundler/runtime controls and dependency behavior)
- **AND** all advanced controls remain subject to security governance rules

### Requirement: XHTML Artifact Authoring and Validation
The system SHALL support XHTML artifacts as first-class editable assets with validation prior to publish/package.

#### Scenario: Validate XHTML before publish
- **WHEN** a user attempts to publish or package an XHTML artifact
- **THEN** the system validates XHTML well-formedness and required metadata
- **AND** blocks publish/package with actionable validation feedback if invalid

#### Scenario: Reopen XHTML artifact for iterative editing
- **WHEN** a saved XHTML artifact is reopened from library or studio
- **THEN** the original XHTML source and metadata are restored for editing
- **AND** subsequent saves preserve XHTML fidelity
