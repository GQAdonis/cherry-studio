## Why
Artifact Studio already supports standalone editing and basic seed handoff from chat/library, but it does not reliably transfer the full source execution context (model configuration, skill strategy/scope, context-management strategy, and knowledge-base configuration) into the studio project. It also lacks a complete “start from scratch” project setup path that lets users configure these controls before first generation.

This creates quality and continuity gaps:
- refinement behavior in Studio can differ from the source assistant/agent/conversation,
- users cannot audit or reuse the originating context as a portable project baseline,
- there is no first-class artifact project management surface and policy model for governing defaults.

## What Changes
- Add full context portability from source assistant/agent/conversation into Artifact Studio project seed state.
- Add a new-project setup flow for Artifact Studio that supports creating projects from scratch with explicit model, skill, context-management, and knowledge-base setup.
- Add artifact project management UX and lifecycle actions (create, clone, rename, archive, reopen, and source-context rebind).
- Extend Artifact settings with governance controls for default inheritance, override behavior, and onboarding defaults.
- Add knowledge bridge capability so chat history can be captured as a managed, editable knowledge asset linked to artifact projects.

## Capabilities
1. `artifact-studio-context-portability`
- Persist and apply source conversation/assistant/agent runtime context in Studio projects.
- Define deterministic precedence rules when source and Studio overrides conflict.

2. `artifact-project-management`
- Provide project-level management for Artifact Studio with reusable project identity and metadata.
- Support both seeded projects and from-scratch project creation.

3. `artifact-studio-settings-governance`
- Extend settings UI/data model to govern Studio defaults and inheritance/override policy.
- Ensure migration-safe rollout for existing users.

4. `artifact-studio-knowledge-bridge`
- Carry knowledge-base configuration from source context.
- Support optional auto-generation of a project knowledge asset from source chat history and expose lifecycle management.

## Scope Notes
- This proposal extends (does not replace) the completed `elevate-artifact-studio-platform` change.
- This proposal is implementation-ready but does not include implementation code in proposal stage.
- `openspec/project.md` and `openspec/AGENTS.md` are missing in this repository; this proposal proceeds using existing change artifacts and codebase inspection as baseline.

## Research Basis (Tavily + Primary Product Docs)
This proposal is grounded in current patterns from leading artifact/app-builder products:
- ChatGPT Canvas: version history, diff visibility, sharing model, and code/document iteration controls.
  - https://help.openai.com/en/articles/9930697-what-is-the-canvas-feature-in-chatgpt-and-how-do-i-use-it
- Claude Artifacts: dedicated artifact workspace behavior, publish/share lifecycle, persistent storage constraints, and MCP access model.
  - https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them
  - https://support.claude.com/en/articles/9547008-publishing-and-sharing-artifacts
- v0: project-vs-folder model, multi-chat contribution to one project, integrated editor/preview/deploy settings model.
  - https://v0.app/docs/projects
  - https://v0.app/docs/faqs
  - https://v0.app/docs/github
- Replit Agent: checkpoint/rollback model capturing workspace + AI context, app-testing loops, and recovery UX.
  - https://docs.replit.com/replitai/checkpoints-and-rollbacks
  - https://docs.replit.com/replitai/app-testing
- Sandpack: runtime isolation and dependency/registry governance for safe advanced editing.
  - https://sandpack.codesandbox.io/docs/guides/hosting-the-bundler
  - https://sandpack.codesandbox.io/docs/advanced-usage/bundlers
- Lovable/GitHub Spark: visual editing + prompt/code hybrid workflow and project handoff ergonomics.
  - https://lovable.dev/blog/introducing-visual-edits
  - https://docs.lovable.dev/
  - https://docs.github.com/en/copilot/concepts/spark

## Expected Impact
- Affected code areas (planned):
  - `src/renderer/src/features/artifacts/**`
  - `src/renderer/src/pages/artifacts/**`
  - `src/renderer/src/pages/settings/ArtifactSettings.tsx`
  - `src/renderer/src/store/artifacts.ts`
  - `src/renderer/src/store/settings.ts`
  - `src/renderer/src/features/artifacts/db/artifactDb.ts`
  - source context providers in assistant/agent/conversation settings and runtime services
- Affected data contracts (planned): artifact project seed payload, project settings/inheritance policy, project knowledge linkage metadata.
