## ADDED Requirements

### Requirement: Active Studio route compile/error recovery
Compile and render error recovery SHALL be wired in the active Artifact Studio page route, including HTMX error signals.

#### Scenario: Compile error is surfaced in active route
- **WHEN** preview compilation fails in the active Artifact Studio route
- **THEN** the active route surfaces structured error status to the user
- **AND** recovery hooks run from the active route components, not only inactive modal-only paths

#### Scenario: HTMX error is recoverable
- **WHEN** an `htmx:error` event is emitted by artifact rendering runtime
- **THEN** the event is converted to an actionable refinement recovery input
- **AND** the user can trigger automatic or manual fix workflow from the active route

### Requirement: Bounded automatic fix workflow
Artifact Studio SHALL support bounded auto-fix retries for compile/render failures.

#### Scenario: Auto-fix request loop
- **WHEN** auto-fix is enabled and an eligible compile/render error occurs
- **THEN** the system submits an error-aware follow-up refinement request
- **AND** retry attempts stop at a configured maximum to prevent infinite loops

#### Scenario: Retry state visibility
- **WHEN** auto-fix attempts are made
- **THEN** attempt count and error status are visible to the user
- **AND** retry state resets appropriately after successful compilation

### Requirement: Unified timeline and compilation status UX
The active Artifact Studio route SHALL provide version timeline navigation and compilation status indicators in one coherent workspace experience.

#### Scenario: Version timeline visible in active route
- **WHEN** artifact history contains multiple versions
- **THEN** users can navigate previous/next versions from the active Studio route UI
- **AND** current historical position is clearly indicated

#### Scenario: Compilation status visibility
- **WHEN** artifact generation or preview compilation state changes
- **THEN** users can see compiling/success/error status in the active Studio route
- **AND** status reflects actual runtime state transitions
