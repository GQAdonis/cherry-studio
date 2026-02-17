## 1. Architecture Baseline
- [ ] 1.1 Define shared contracts for `artifactProject`, PMPO phase state, and artifact stream event schemas.
- [ ] 1.2 Confirm compatibility and migration impact across existing artifact, assistant, and agent stores.

## 2. Dedicated Artifact Studio
- [ ] 2.1 Add studio entry points from chat artifacts, library items, and blank templates.
- [ ] 2.2 Implement standalone studio session persistence decoupled from conversation lifecycle.
- [ ] 2.3 Add reopen behavior tests for independent studio sessions.

## 3. Runtime Profiles and Sandpack Expansion
- [ ] 3.1 Implement runtime profiles (`basic`, `standard`, `advanced`) and scoped settings storage.
- [ ] 3.2 Implement advanced runtime controls with security guardrails (bundler/runtime/dependency governance).
- [ ] 3.3 Add integration tests covering profile behavior and runtime option enforcement.

## 4. XHTML Artifact Capability
- [ ] 4.1 Add XHTML artifact editor/renderer support with explicit validation workflow.
- [ ] 4.2 Add publish/package blocking and actionable error reporting for invalid XHTML.
- [ ] 4.3 Add reopen/save fidelity tests for XHTML source and metadata.

## 5. PMPO Artifact Agent
- [ ] 5.1 Implement PMPO phase engine (`spec -> plan -> execute -> reflect`) for artifact sessions.
- [ ] 5.2 Integrate skill-intent and context-management strategies into PMPO phase execution.
- [ ] 5.3 Add integration tests validating phase progression, reflection gating, and corrective loops.

## 6. Stream Chunk Observability
- [ ] 6.1 Emit `skill.activation` chunks for artifact flows whenever skills are used.
- [ ] 6.2 Emit `context.action` chunks for artifact flows whenever context management mutates payload context.
- [ ] 6.3 Add assistant/agent parity tests ensuring equivalent artifact chunk categories across both execution paths.

## 7. Library and Delivery Packaging
- [ ] 7.1 Implement library-first editing flow with revision provenance metadata.
- [ ] 7.2 Implement artifact packaging/export with manifest metadata for downstream delivery.
- [ ] 7.3 Add integration tests for package reopen/validation and provenance retrieval.

## 8. End-to-End Verification
- [ ] 8.1 Add integration scenarios covering standalone studio creation, PMPO refinement, chunk visibility, and packaging.
- [ ] 8.2 Add regressions for prior missing skill/context visibility and prompt-shape failures in artifact-related paths.
- [ ] 8.3 Run `pnpm lint`, `pnpm test`, `pnpm format`, and `pnpm build:mac:arm64` with zero touched-scope warnings/errors.

## 9. OpenSpec Validation
- [ ] 9.1 Run `openspec validate elevate-artifact-studio-platform --strict` and resolve all findings.

## Dependencies / Parallelization
- 2.x can begin after 1.x.
- 3.x and 4.x can run in parallel after 1.x.
- 5.x depends on 1.x and can overlap with late 3.x/4.x.
- 6.x depends on 5.x integration points and can overlap with 7.x.
- 8.x depends on completion of 2.x through 7.x.
