## ADDED Requirements
### Requirement: Agent-Skill Assignment Consistency
The system SHALL keep agent-skill assignments consistent across persistence, IPC handlers, preload APIs, and renderer consumers.

#### Scenario: Persist and retrieve assigned skills through IPC
- **WHEN** assigned skill IDs are set for an agent through the IPC assignment endpoint
- **THEN** a subsequent read for the same agent returns the same set in deterministic order
- **AND** `getEnabledForAgent` resolves only enabled skills from the assigned set

#### Scenario: Add and remove single skill assignment
- **WHEN** a single skill is added to or removed from an agent through dedicated IPC handlers
- **THEN** the persisted assignment set is updated exactly once
- **AND** subsequent renderer retrieval reflects the change without stale entries

#### Scenario: Preload API surface matches IPC contract
- **WHEN** the renderer accesses skill assignment functions through preload bindings
- **THEN** each exposed function maps to a valid IPC channel and handler
- **AND** missing channel mappings fail test validation

### Requirement: Skill Script Execution Integration
Skill script execution SHALL function end-to-end from tool request to result propagation with deterministic error handling.

#### Scenario: Successful script execution via skill tool path
- **WHEN** a skill tool requests script execution with valid skill ID, script name, and arguments
- **THEN** the request reaches the main-process execution handler
- **AND** the renderer receives a successful structured result payload

#### Scenario: Script execution failure returns controlled error
- **WHEN** script execution fails due to missing script, permission denial, or runtime exception
- **THEN** the system returns a structured error response
- **AND** chat/runtime flow continues without crashing the process boundary
