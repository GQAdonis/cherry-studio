# artifact-studio-format-parity Specification

## Purpose
TBD - created by archiving change stabilize-artifact-studio-agent-runtime. Update Purpose after archive.
## Requirements
### Requirement: React artifact refinement parity
Artifact Studio SHALL support full-file React refinement with TypeScript/TSX-oriented output conventions.

#### Scenario: React full-file turn output
- **WHEN** a React artifact refinement request is executed
- **THEN** the generated code payload is a complete file-level replacement suitable for compile/preview
- **AND** response protocol avoids fragment-only diff output as primary artifact payload

#### Scenario: React compile workflow
- **WHEN** React code is streamed and finalized in Studio
- **THEN** preview compilation runs against the full finalized code payload
- **AND** compile errors enter the same recovery workflow as other artifact types

### Requirement: XHTML artifact refinement parity
Artifact Studio SHALL support XHTML artifact refinement with explicit well-formedness validation in refinement and delivery flows.

#### Scenario: XHTML refinement validation
- **WHEN** XHTML refinement output is finalized
- **THEN** XHTML validation is applied before accepting refined content as valid output
- **AND** validation failures are surfaced with actionable feedback

#### Scenario: XHTML delivery validation
- **WHEN** users attempt publish/package/export for XHTML artifacts
- **THEN** delivery is blocked for invalid XHTML
- **AND** users receive validation issues that can drive follow-up refinement fixes

