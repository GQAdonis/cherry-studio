# artifact-studio-agent-runtime-execution Specification

## Purpose
TBD - created by archiving change stabilize-artifact-studio-agent-runtime. Update Purpose after archive.
## Requirements
### Requirement: Artifact Studio execution uses agent/session runtime
Artifact Studio refinement requests SHALL execute through agent/session runtime flows instead of direct LLM completion calls.

#### Scenario: Agent-backed refinement request
- **WHEN** a user submits a refinement prompt from Artifact Studio
- **THEN** the request is associated with agent `artifact-studio` and an agent session identity
- **AND** streamed responses are produced by the agent/session runtime path

#### Scenario: No direct LLM bypass
- **WHEN** Artifact Studio refinement executes
- **THEN** the runtime does not dispatch the refinement through a direct non-agent LLM completion shortcut
- **AND** observability metadata can trace the response to the agent/session execution path

### Requirement: Runtime strategy persistence and inheritance
Artifact Studio runtime behavior SHALL honor persisted agent configuration and project-level overrides according to configured precedence rules.

#### Scenario: Persisted model selection applied
- **WHEN** an Artifact Studio session starts
- **THEN** the resolved model configuration reflects saved agent/project settings
- **AND** the execution uses the resolved configuration without silent fallback to unrelated defaults

#### Scenario: Strategy controls are applied
- **WHEN** a user saves updated skill scope or context strategy for Artifact Studio
- **THEN** new refinement turns use those saved strategy values
- **AND** strategy values are visible in runtime diagnostics for that turn

