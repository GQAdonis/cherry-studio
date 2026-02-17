## Context
Current Artifact Studio bootstrap (`artifact-project-seed:*`) carries artifact payload + limited conversation metadata and a small context window, but does not persist full runtime control-plane context:
- LLM/provider/model parameters,
- skill enablement/scope and selection strategy,
- context-management strategy/settings,
- knowledge-base selection/configuration and source provenance.

Project persistence exists, but project policy and lifecycle management are minimal and not represented as a first-class configurable domain.

## Goals
- Make Studio projects context-portable and behaviorally reproducible from their source execution context.
- Enable full from-scratch project creation with explicit control selection before generation.
- Add project management and settings governance to keep behavior predictable at scale.
- Support knowledge bridge workflows so source chat context can become durable, manageable project knowledge.

## Non-Goals
- Replacing existing chat artifact creation flows.
- Redesigning unrelated settings surfaces.
- Forcing one global strategy; policy must support inheritance and override boundaries.

## Architecture
### 1. Project Context Envelope
Introduce a normalized `ArtifactProjectContextEnvelope` persisted with project metadata.

Envelope sections:
- `llm`: provider/model/temperature/top_p/max_tokens and execution mode metadata.
- `skills`: availability scope, allow-all flag, selected set, intent-classification strategy, effective resolved list.
- `contextManagement`: strategy id, config options, and inheritance source.
- `knowledge`: referenced knowledge bases, source origin, and optional project-managed derived knowledge asset ids.
- `source`: link to originating conversation/assistant/agent plus snapshot timestamp.

This envelope is written on seed and used as the runtime baseline for all Studio refinement operations.

### 2. Deterministic Inheritance and Precedence
Define precedence for effective project behavior:
1. Conversation-level overrides (when reopening from source conversation and override is enabled)
2. Project-level explicit overrides
3. Source snapshot baseline captured at project creation
4. Global defaults from settings

Project settings record the source of each resolved value for traceability.

### 3. From-Scratch Setup Wizard
Add Studio project creation flow with stepwise configuration:
1. Artifact mode and template (`react`, `htmx`, `xhtml`, etc.)
2. Model/runtime configuration
3. Skill policy and strategy
4. Context-management strategy
5. Knowledge setup (none, select existing, create from imported history/text)

Wizard output writes both project metadata and context envelope before first chat/run.

### 4. Artifact Project Management Domain
Extend Artifact project records with management metadata:
- status (`active`, `archived`),
- last-run summary,
- linked source references,
- linked knowledge assets,
- created-from mode (`chat-seeded`, `library-seeded`, `scratch`).

Provide management actions: create, clone, rename, archive/unarchive, and rebind source context.

### 5. Knowledge Bridge
Add project-scoped knowledge bridge behavior:
- If project is seeded from conversation, user may generate a derived project knowledge asset from source chat history.
- Derived asset is editable and manageable via existing knowledge management paths.
- Project stores knowledge linkage metadata for reuse by Studio chat and optional reuse by external chats.

### 6. Observability
Require stream/runtime diagnostics to include context resolution details at run start and action visibility when skill/context/knowledge bridge operations are applied. Existing `skill.activation` and `context.action` requirements remain; this change adds project-context resolution visibility requirements in project/runtime events.

## Data and Migration Strategy
- Add migration for artifact project records to store context envelope + management metadata.
- Add settings migration for new Artifact Studio governance defaults.
- Backfill legacy projects with safe defaults and `source: legacy` provenance.

## UX Principles (Research-Derived)
- “Project as durable unit” (v0/Replit pattern): one project can host many iterative chats/sessions.
- “Hybrid editing loop” (Lovable/Spark/Canvas pattern): prompt, direct visual/code edits, and quick rollback/version navigation.
- “Safe advanced runtime” (Sandpack/WebContainer pattern): powerful controls gated by explicit capability policies.
- “Portable provenance” (Claude publish/share pattern): clear source, version, and sharing scope boundaries.

## Risks and Mitigations
- Risk: Configuration complexity overwhelms users.
  - Mitigation: sensible presets, progressive disclosure, and wizard defaults.
- Risk: Context mismatch between source and Studio.
  - Mitigation: deterministic precedence, displayed provenance, and explicit override indicators.
- Risk: Knowledge duplication and stale chat-derived assets.
  - Mitigation: link metadata, refresh/rebuild actions, and stale-state warnings.

## Validation Strategy
- Integration tests for seeded context carryover and effective runtime resolution.
- Integration tests for scratch project setup path and first-run behavior.
- Migration tests for legacy project/settings upgrades.
- UI tests for project management actions and settings persistence.
- End-to-end tests for knowledge bridge creation and reuse in Studio refinement.
