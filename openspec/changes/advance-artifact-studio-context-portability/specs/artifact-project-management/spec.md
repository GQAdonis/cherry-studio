## ADDED Requirements
### Requirement: Artifact Project Lifecycle Management
The system SHALL provide first-class Artifact Studio project management for seeded and from-scratch projects.

#### Scenario: Create and manage from-scratch project
- **WHEN** a user creates a new Artifact Studio project from scratch
- **THEN** the project is created with its own persistent identity and configuration baseline
- **AND** the user can reopen and continue work independent of any source conversation

#### Scenario: Manage project lifecycle state
- **WHEN** a user archives or unarchives an Artifact Studio project
- **THEN** project state is persisted and reflected in project listings
- **AND** archived projects remain recoverable with full project history

### Requirement: Reusable Project Operations
The system SHALL support reusable operations on Artifact Studio projects for continuity and experimentation.

#### Scenario: Clone project for alternative refinement path
- **WHEN** a user clones an existing Artifact Studio project
- **THEN** a new project is created with copied artifact/runtime baseline
- **AND** subsequent edits in one project do not mutate the other project

#### Scenario: Rebind project to source context
- **WHEN** a user invokes source-context rebind for a project
- **THEN** the project refreshes source-derived context categories according to configured override policy
- **AND** project-specific explicit overrides remain intact where policy forbids replacement
