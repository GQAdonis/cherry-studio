## ADDED Requirements
### Requirement: Skill Activation Chunk Visibility in Artifact Flows
The stream layer SHALL emit explicit skill-activation chunks whenever artifact orchestration uses skills.

#### Scenario: Emit skill activation chunks during artifact generation
- **WHEN** the runtime activates one or more skills during artifact creation/refinement
- **THEN** `skill.activation` chunks are emitted in-stream with skill identity and action
- **AND** artifact UI surfaces these events in execution history

### Requirement: Context Action Chunk Visibility in Artifact Flows
The stream layer SHALL emit explicit context-action chunks whenever context management changes active payload context.

#### Scenario: Emit context action chunk on context pruning/summarization
- **WHEN** context management prunes, summarizes, or otherwise transforms payload context in artifact flows
- **THEN** `context.action` chunks are emitted with action summary and relevant counts
- **AND** artifact UI surfaces these actions in execution history

### Requirement: Unified Chunk Contract Across Assistant and Agent Paths
Chunk emission behavior for artifact-related skill/context events SHALL be consistent across assistant and agent execution paths.

#### Scenario: Assistant and agent parity for chunk emission
- **WHEN** equivalent artifact tasks are executed via assistant path and agent path
- **THEN** both streams emit equivalent chunk categories for skill/context lifecycle events
- **AND** missing chunk categories fail integration verification
