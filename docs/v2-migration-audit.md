# v2 Migration Audit

> **Status**: Living document — update on each major upstream v2 commit.
> **Branch**: `features/boss` | **Base**: `upstream/main` (post-merge) | **Target**: upstream v2 (PR #10162)
> **Last updated**: 2026-03-21

---

## Summary

| Area | Custom Files Affected | Migration Effort | Priority |
|---|---|---|---|
| Router (react-router-dom → tanstack) | 9 custom files | Medium | Phase 3 |
| Dexie DB (separate instance → main db) | 1 file + all consumers | Medium-High | Phase 4 |
| Redux artifacts.studio.* → PreferenceService | 1 slice + settings page | Medium | Phase 4 |
| Agent API (direct client → hooks) | 1 service file | Low | Phase 5 |
| Custom IPC channels (Skills, Artifacts) | 25+ channels | Low (additive) | Phase 5 |
| Settings routes (react-router nested) | SettingsPage.tsx | Medium | Phase 3 |

---

## 1. Router Migration

v2 replaces `react-router-dom` with `@tanstack/react-router` and a file-based route tree
(`routeTree.gen.ts` auto-generated from `src/renderer/src/routes/`).

### 1.1 Custom files that use `react-router-dom` (our additions only)

These are files we added that will need migration when v2 lands:

| File | Hooks/Components Used | Notes |
|---|---|---|
| `features/artifacts/utils/studioNavigation.ts` | `NavigateFunction` (type only) | Wrap in abstraction layer |
| `features/artifacts/components/ArtifactCard.tsx` | `useNavigate` | Navigate to `/artifacts/:id` |
| `pages/artifacts/ArtifactPage.tsx` | `useNavigate`, `useParams` | Needs route param `artifactId` |
| `pages/artifacts/ArtifactLibraryPage.tsx` | `useNavigate` | Navigate to artifact page |
| `pages/settings/SkillSettings.tsx` | `useNavigate` | Navigate to `skills/create` |
| `pages/settings/SkillCreator/index.tsx` | `useNavigate` | Navigate back after save |
| `components/CodeBlockView/ReactArtifactsCard.tsx` | `useNavigate` | Open artifact page |
| `components/CodeBlockView/HtmlArtifactsCard.tsx` | `useNavigate` | Open artifact page |

### 1.2 `SettingsPage.tsx` — custom routes added

We added 4 nested routes inside the upstream `SettingsPage`:

```tsx
// Current (react-router-dom nested Routes)
<Route path="skills"        element={<SkillSettings />} />
<Route path="skills/create" element={<SkillCreator />} />
<Route path="context"       element={<ContextManagementSettings />} />
<Route path="artifacts"     element={<ArtifactSettings />} />
```

**v2 migration**: Create route files under `src/renderer/src/routes/settings/`:
```
routes/settings/skills.tsx         → <SkillSettings />
routes/settings/skills.create.tsx  → <SkillCreator />
routes/settings/context.tsx        → <ContextManagementSettings />
routes/settings/artifacts.tsx      → <ArtifactSettings />
```

And update sidebar links in `SettingsPage.tsx` to use `<Link from="/settings" to="/settings/skills">`.

### 1.3 `@tanstack/react-router` equivalents

| react-router-dom | @tanstack/react-router |
|---|---|
| `useNavigate()` → `navigate('/path')` | `useNavigate()` → `navigate({ to: '/path' })` |
| `useParams()` | `useParams()` (same, but typed via route) |
| `useSearchParams()` | `useSearch()` |
| `useLocation()` | `useLocation()` |
| `<Link to="...">` | `<Link to="..." from="...">` |
| `<Routes><Route path="" element={} /></Routes>` | File-based routes (no JSX needed) |

### 1.4 Upstream files using react-router-dom (DO NOT touch — v2 will migrate these)

These exist in upstream and v2 will migrate them; we should not change them to avoid conflicts:
- `src/renderer/src/Router.tsx`
- `src/renderer/src/components/app/Sidebar.tsx`
- `src/renderer/src/pages/home/HomePage.tsx`
- `src/renderer/src/pages/paintings/` (all 8 files)
- `src/renderer/src/pages/minapps/` (2 files)
- `src/renderer/src/handler/NavigationHandler.tsx`
- `src/renderer/src/services/NavigationService.ts`
- `src/renderer/src/hooks/useMinAppContextActions.ts`

---

## 2. Data Layer Migrations

### 2.1 Artifact Dexie DB — separate instance (HIGH RISK)

**File**: `src/renderer/src/features/artifacts/db/artifactDb.ts`

We created a **separate** `Dexie` instance (`ArtifactDatabase extends Dexie`) with 6 schema versions.
This is **not** integrated into the main `src/renderer/src/databases/index.ts` (which is at v10).

**Problem**: v2 may consolidate all app data into one Dexie instance or tighten the upgrade path.
Two separate Dexie DBs targeting the same origin can cause storage fragmentation.

**Tables in our custom DB**:
- `artifacts` — core artifact records (id, content, type, version, conversationId…)
- `artifactVersions` — version history
- `artifactLibraryItems` — saved/starred artifacts
- `artifactProjects` — project groupings
- `artifactStudioSessions` — active studio session metadata
- `refinementMessages` — chat messages for artifact studio
- `diagnosticSnapshots` — compilation error history

**Migration plan (Phase 4)**:
- Add our tables to main `databases/index.ts` as `db.version(11).stores({...})`
- Follow the `upgradeToV*` pattern in `databases/upgrades.ts`
- Replace `getArtifactDb()` calls with the main `db` import

### 2.2 Redux `artifacts` slice — blacklisted from persist

**File**: `src/renderer/src/store/artifacts.ts`  
**Store registration**: `store/index.ts` line 60 and blacklisted at line 94

The `artifacts` slice holds **ephemeral UI state** only (streaming flags, refinement messages, active session ID). It is correctly blacklisted from `redux-persist`. No data-layer migration needed here.

### 2.3 Redux `settings.artifacts.*` — BLOCKED until v2

**Risk**: `state.settings.artifacts` holds all artifact configuration (enabled types, runtime profile, studio defaults, governance policy). These are **locked** by AGENTS.md contribution restrictions.

**v2 path**: Move to `PreferenceService` (Dexie `settings` table) once v2 unlocks this area.

**Affected settings reducers** (do not add new ones until v2):
- `setArtifactsEnabled`, `setArtifactEnabledTypes`, `setArtifactRuntimeProfile`
- `setArtifactReact*` (5 reducers)
- `setArtifactStudioDefaultLlm`, `setArtifactStudioOverridePolicy` (+ 4 more studio reducers)

---

## 3. Agent Architecture Gaps

### 3.1 `ArtifactStudioRuntimeService` — direct `AgentApiClient` usage

**File**: `src/renderer/src/features/artifacts/services/ArtifactStudioRuntimeService.ts`

Current pattern (our code):
```ts
import { AgentApiClient } from '@renderer/api/agent'
// Direct REST calls:
client.getAgent(id)
client.createAgent({...})
client.updateAgent({...})
client.getSession(agentId, sessionId)
client.createSession(agentId, form)
```

v2 pattern (upstream agent pages use):
```ts
import { useAgent, useUpdateAgent } from '@renderer/hooks/agents'
// Hook-based with cache invalidation
```

**Risk**: Low — `AgentApiClient` is stable; hooks are wrappers around the same REST layer.
**Action (Phase 5)**: Refactor `ensureArtifactStudioSession` to use `upsertAgent` from `AgentService`
instead of the get-or-create workaround.

### 3.2 Custom IPC channels

We added 25+ IPC channels to `packages/shared/IpcChannel.ts`. These are **additive** and do not
conflict with upstream. However, v2 may introduce a different IPC channel naming convention.

**Custom channel groups**:
| Group | Count | Purpose |
|---|---|---|
| `Skill_*` | 12 | Skill CRUD, matching config, agent assignment |
| `SkillStorage_*` | 7 | Storage provider management |
| `SkillCreator_*` | 6 | Skill creation wizard |
| `Artifact_*` | 7 | Artifact server lifecycle, state |

**Action**: No changes needed now. Monitor v2 for any channel renaming patterns.

### 3.3 `initializeArtifactStudioAgent.ts` — non-standard agent init

**File**: `src/main/services/agents/services/initializeArtifactStudioAgent.ts`

Uses a custom initialization path that is called from `ApiServerService`. In v2, the `AgentService.upsertAgent` method provides a cleaner pattern.

**Action (Phase 5)**: Replace manual get/create logic with `agentService.upsertAgent`.

---

## 4. Settings Page Routing

### 4.1 Custom settings sections added

We added these to `SettingsPage.tsx` sidebar and route list:

```tsx
// Sidebar menu items (lines ~106-145)
<MenuItemLink to="/settings/skills">Skills</MenuItemLink>
<MenuItemLink to="/settings/artifacts">Artifacts</MenuItemLink>
<MenuItemLink to="/settings/context">Context Management</MenuItemLink>

// Route definitions (lines ~211-224)
<Route path="skills"        element={<SkillSettings />} />
<Route path="skills/create" element={<SkillCreator />} />
<Route path="context"       element={<ContextManagementSettings />} />
<Route path="artifacts"     element={<ArtifactSettings />} />
```

**v2 conflict risk**: `SettingsPage.tsx` will be rewritten in v2 to use tanstack routes.
Our additions will create merge conflicts unless we pre-migrate to route files first.

### 4.2 `ContextManagementSettings` — no react-router-dom usage

`src/renderer/src/pages/settings/ContextManagementSettings/` does **not** import `react-router-dom`
directly. Only parent `SettingsPage.tsx` routes to it. Low migration effort.

---

## 5. Icon System

Searched `features/artifacts`, `pages/artifacts`, `pages/settings/SkillSettings.tsx`, and
`pages/settings/SkillCreator` for `getProviderLogo`, `ProviderIcon`, `CompoundIcon`.

**Result**: No usage found in our custom files. ✅ No action needed.

---

## 6. Phase Sequencing Recommendation

Based on this audit, the recommended sequencing is:

```
Phase 3 (Router) — Do SettingsPage routes first, then artifact/skill pages
  ├── Create 4 route files under routes/settings/
  ├── Update SettingsPage sidebar links
  └── Migrate useNavigate/useParams in 8 custom files

Phase 4 (Data API)
  ├── Merge artifactDb tables into databases/index.ts as v11
  ├── Replace getArtifactDb() with main db
  └── Plan artifact settings migration to PreferenceService (post-v2 unlock)

Phase 5 (Agents)
  ├── Replace ensureArtifactStudioSession with upsertAgent pattern
  └── Verify SkillService IPC handlers are stable
```

---

## 7. Files That Will Have Merge Conflicts with v2

Highest conflict probability when v2 merges:

| File | Reason | Mitigation |
|---|---|---|
| `pages/settings/SettingsPage.tsx` | We added 4 routes + 3 sidebar items | Pre-migrate to route files (Phase 3) |
| `packages/shared/IpcChannel.ts` | We added 25+ channels | Keep as additive; monitor v2 naming |
| `src/renderer/src/store/migrate.ts` | We added migrations 200, 206 | BLOCKED until v2 unlocks |
| `src/renderer/src/store/index.ts` | Version bumped to 206 | BLOCKED until v2 unlocks |
| `src/renderer/src/databases/index.ts` | Will need artifact tables added at v11 | Phase 4 |

---

## 8. v2 Tracking

- **v2 PR**: https://github.com/CherryHQ/cherry-studio/pull/10162
- **Contribution hold**: https://github.com/CherryHQ/cherry-studio/issues/10954
- **Re-audit trigger**: Any v2 commit touching `Router.tsx`, `databases/index.ts`, `store/index.ts`, or `pages/settings/SettingsPage.tsx`
