# Finalized CommonJS to ESM Migration Plan

## Project Context
- **Project Type**: Electron + TypeScript + Yarn
- **Build Tool**: electron-vite
- **Primary Issue**: `TypeError: Store is not a constructor` due to incorrect import of `electron-store`.
- **Goal**: Complete migration to ESM, resolving the immediate error and ensuring all modules use ESM syntax.

## Migration Strategy
- Perform a **complete migration** in one go.
- Convert `src/preload/miniapp-preload.js` to TypeScript (`src/preload/miniapp-preload.ts`).
- Conduct a **general smoke test** of all major application features post-migration.

## Detailed Implementation Steps

```mermaid
graph TD
    A[Start: Mixed CJS/ESM Project] --> B(Phase 1: Fix Core `electron-store` Import);
    B --> C(Phase 2: Convert Other CommonJS `require` to ESM `import`);
    C --> D(Phase 3: Convert Preload Script to TypeScript & ESM);
    D --> E(Phase 4: Verify Configurations);
    E --> F(Phase 5: Build & Test);
    F --> G[End: ESM Migration Complete];

    subgraph B["Phase 1: Fix `electron-store`"]
        B1[Modify `ConfigManager.ts`];
        B1 --> B2[Change `import Store from 'electron-store'` to `import { Store } from 'electron-store'`];
    end

    subgraph C["Phase 2: Convert Other `require` Calls"]
        C1[Modify `SelectionService.ts`];
        C1 --> C1a[Convert conditional `require('selection-hook')` to dynamic `await import('selection-hook')`];
        C2[Modify `ipc.ts`];
        C2 --> C2a[Convert `require('os')` to `import os from 'os'`];
    end

    subgraph D["Phase 3: Convert Preload Script"]
        D1[Rename `miniapp-preload.js` to `miniapp-preload.ts`];
        D2[Update `miniapp-preload.ts` content];
        D2 --> D2a[Change `require('electron')` to `import { contextBridge, ipcRenderer, webFrame } from 'electron'`];
        D3[Update `electron.vite.config.ts` if necessary to correctly reference the new preload file name/path];
    end
    
    subgraph E["Phase 4: Verify Configurations"]
        E1["Ensure `package.json` has `\"type\": \"module\"`"];
        E2["Verify `electron.vite.config.ts` handles `.ts` preload files and ESM output"];
        E3["Check `tsconfig.node.json` and `tsconfig.web.json` for ESM compatibility (e.g., `module: ESNext` or similar, `moduleResolution: nodeNext` or `bundler`)"];
    end

    subgraph F["Phase 5: Build & Test"]
        F1[Run `yarn typecheck` to catch TypeScript errors];
        F2[Run `yarn dev` to build and start the application];
        F3[Perform general smoke test of all major application features];
        F4[Address any runtime errors or unexpected behavior];
    end
```

## Implementation Details by File

1.  **`src/main/services/ConfigManager.ts`**:
    *   Change line 4:
        ```diff
        - import Store from 'electron-store'
        + import { Store } from 'electron-store'
        ```

2.  **`src/main/services/SelectionService.ts`**:
    *   Modify the conditional import of `selection-hook` (around line 22):
        ```diff
        -  if (isWin) {
        -    SelectionHook = require('selection-hook')
        -  }
        +  if (isWin) {
        +    const selectionHookModule = await import('selection-hook');
        +    SelectionHook = selectionHookModule.default; // Or specific named export if applicable
        +  }
        ```
        *(Note: The exact way to access the export from `selection-hook` might need verification based on its actual ESM export structure. It might be `selectionHookModule.SelectionHook` or similar if it's a named export.)*

3.  **`src/main/ipc.ts`**:
    *   Change `require('os')` (around line 218) to an import statement at the top of the file:
        ```typescript
        import os from 'os';
        // ...
        // ipcMain.handle(IpcChannel.System_GetHostname, () => {
        //   return os.hostname()
        // })
        ```

4.  **`src/preload/miniapp-preload.js`**:
    *   **Rename** to `src/preload/miniapp-preload.ts`.
    *   **Update content**:
        ```diff
        - const { contextBridge, ipcRenderer, webFrame } = require('electron')
        + import { contextBridge, ipcRenderer, webFrame } from 'electron'
        
        // Add type safety if desired, e.g.:
        // contextBridge.exposeInMainWorld('myAPI', { /* ... */ });
        ```
    *   **Update `electron.vite.config.ts`**:
        *   Ensure the `preload` section correctly references the new `.ts` file if it was explicitly naming the `.js` file. Often, `electron-vite` handles this automatically if the input in `preload` configuration points to the `src/preload/index.ts` which then might import `miniapp-preload.ts`. If `miniapp-preload.js` was a direct entry point, this path needs updating.
            *   The `electron.vite.config.ts` preload section does not explicitly list `miniapp-preload.js`. It likely relies on an `index.ts` in the preload directory or a glob pattern. `tsconfig.node.json` includes `src/preload/**/*`. This part should be fine.

5.  **Verify `tsconfig.json` files**:
    *   **`tsconfig.node.json`**:
        *   It extends `@electron-toolkit/tsconfig/tsconfig.node.json`. We should assume this base config is ESM-friendly.
        *   The `compilerOptions` already seem reasonable. `moduleResolution` is likely `NodeNext` or `Bundler` via the extend, which is good for ESM.
    *   **`tsconfig.web.json`** (for renderer):
        *   This will also extend a base config. Ensure its `module` and `moduleResolution` settings are appropriate for Vite and ESM. (Vite usually handles this well).

6.  **Review Default Imports**:
    *   The search for `import \w+ from` yielded 273 results. Many of these are likely correct (e.g., `import React from 'react'`, `import styled from 'styled-components'`).
    *   During the "Code" mode implementation, each of these will be implicitly checked as the TypeScript compiler and ESLint will flag incorrect default imports for packages that only offer named exports in an ESM context. The primary one of concern was `electron-store`. Others like `dayjs`, `lodash`, `i18next` usually have proper default exports or are handled correctly by build tools.

## Testing Phase
1.  **Build**: Run `yarn build` (or `yarn dev` for development build).
2.  **Launch**: Start the application.
3.  **Smoke Test**:
    *   Verify application settings load and save correctly (tests `electron-store` usage).
    *   Verify mini-apps load and function (tests the converted preload script).
    *   Test text selection features (tests `selection-hook` dynamic import).
    *   Test any IPC calls that might use the `os` module.
    *   Navigate through different parts of the application.
    *   Check for console errors in both main and renderer processes.