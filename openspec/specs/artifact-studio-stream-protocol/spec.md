# artifact-studio-stream-protocol Specification

## Purpose
TBD - created by archiving change stabilize-artifact-studio-agent-runtime. Update Purpose after archive.
## Requirements
### Requirement: Strict studio stream partitioning
Artifact Studio SHALL strictly separate code-targeted stream chunks from chat-targeted stream chunks using `<cs-studio-code>` as the primary protocol marker.

#### Scenario: Code appears only in code view
- **WHEN** a response includes a `<cs-studio-code>` block
- **THEN** block content streams into the code view only
- **AND** that code block content is not rendered in chat content

#### Scenario: Non-code appears only in chat view
- **WHEN** response chunks are outside `<cs-studio-code>` tags
- **THEN** those chunks stream into chat view only
- **AND** non-code chunks are not rendered in the code view

#### Scenario: Non-targeted code blocks remain in chat
- **WHEN** a response includes code that is not marked as `<cs-studio-code>`
- **THEN** that code is rendered in chat as normal chat content
- **AND** it is not treated as code-view compilation input

### Requirement: Cumulative streaming behavior
Artifact Studio chat and code streaming SHALL be cumulative and monotonic within a turn.

#### Scenario: Chat delta accumulation
- **WHEN** text deltas arrive during a turn
- **THEN** chat view displays cumulative content growth for the active assistant message
- **AND** previously streamed chat text is not overwritten by partial fragments

#### Scenario: Code delta accumulation
- **WHEN** code deltas arrive inside an active `<cs-studio-code>` block
- **THEN** code view displays cumulative source content for the active artifact
- **AND** compiled content corresponds to the complete final block after close tag

### Requirement: Studio protocol is the primary reflection contract
Reflection and final extraction SHALL validate `<cs-studio-code>` output as the primary artifact contract, with legacy parsing only as bounded fallback.

#### Scenario: Studio-tagged output passes reflection
- **WHEN** a response includes a complete valid `<cs-studio-code>` block
- **THEN** reflection validates against studio-tagged content
- **AND** refinement is not marked failed due to absence of legacy `<cs-artifact>` tags

#### Scenario: Legacy fallback only when studio tags absent
- **WHEN** a response contains no usable `<cs-studio-code>` block
- **THEN** the system may apply legacy extraction fallback for compatibility
- **AND** fallback does not supersede valid studio-tagged extraction

