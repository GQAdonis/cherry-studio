## ADDED Requirements
### Requirement: PMPO Orchestration for Artifact Agent
Artifact creation/refinement agents SHALL execute through explicit PMPO phases (`spec`, `plan`, `execute`, `reflect`).

#### Scenario: PMPO phase progression
- **WHEN** an artifact agent session starts in studio or chat refinement mode
- **THEN** the session progresses through the PMPO phase sequence
- **AND** each phase records structured outputs used by later phases

#### Scenario: Reflection enforces quality checks
- **WHEN** execution phase produces artifact updates
- **THEN** the reflection phase evaluates outputs against requirements and validation checks
- **AND** the system can trigger a corrective execute phase when checks fail

### Requirement: Skill and Context Strategy Integration in PMPO
PMPO orchestration SHALL apply configured skill-intent and context-management strategies during artifact agent execution.

#### Scenario: Skills/context strategy applied during planning and execution
- **WHEN** PMPO planning or execution requires specialized behavior
- **THEN** configured skills and context strategy are consulted and applied
- **AND** resulting actions remain traceable in runtime events
