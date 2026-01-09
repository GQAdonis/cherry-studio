# Yarn to pnpm Migration Plan

## Overview
This project is migrating from Yarn to pnpm. The migration is already partially complete (pnpm-lock.yaml exists, package.json specifies pnpm@10.27.0), but we need to clean up yarn artifacts and ensure everything works correctly.

## Current State
- ✅ `pnpm-lock.yaml` exists
- ✅ `package.json` has `"packageManager": "pnpm@10.27.0"`
- ✅ `pnpm-workspace.yaml` is configured
- ❌ `.yarnrc.yml` still exists (needs cleanup)
- ❌ `.yarn/` directory may still exist (needs verification)
- ❌ `yarn.lock` may exist (needs verification)
- ❓ `node_modules/` state unknown (may need cleaning)

## Migration Steps

### Phase 1: Verification & Cleanup
1. **Verify pnpm Installation**
   - Check if pnpm is installed
   - Verify version matches package.json requirement (10.27.0)
   - Install pnpm if needed

2. **Identify Yarn Artifacts**
   - Check for `.yarn/` directory
   - Check for `yarn.lock` file
   - Identify any yarn cache or temp files

3. **Clean Existing Installation**
   - Remove `node_modules/` directories (root and workspace packages)
   - Remove yarn artifacts:
     - `.yarn/` directory
     - `.yarnrc.yml` file
     - `yarn.lock` file
   - Clean build artifacts:
     - `out/` directory
     - `dist/` directory
     - `.tsbuildinfo/` directory

### Phase 2: pnpm Installation
4. **Run pnpm Install**
   - Execute `pnpm install` in project root
   - Monitor for errors related to:
     - Package resolution conflicts
     - Binary dependencies (sharp, electron, etc.)
     - Patched dependencies
     - Workspace dependencies

5. **Handle Installation Errors**
   - Address any peer dependency issues
   - Fix patched dependencies if needed
   - Resolve workspace reference issues
   - Handle binary dependency issues

### Phase 3: Verification
6. **Verify Installation**
   - Check that all dependencies are installed
   - Verify workspace packages are linked correctly
   - Confirm patches are applied

7. **Run Build Check**
   - Execute `pnpm build:check` (lint + test)
   - Fix any linting issues
   - Fix any test failures

8. **Run Full Build**
   - Execute `pnpm build`
   - Verify typecheck passes
   - Verify electron-vite build succeeds
   - Check for any build errors

### Phase 4: Post-Migration
9. **Update Documentation**
   - Update README.md if it references yarn
   - Update CONTRIBUTING.md if needed
   - Document any issues encountered

10. **Verify Key Commands**
    - `pnpm dev` - Development mode
    - `pnpm test` - Run tests
    - `pnpm lint` - Linting
    - `pnpm format` - Code formatting

## Known Considerations

### Binary Dependencies
The project uses several binary dependencies that may need rebuilding:
- `electron@38.7.0`
- `sharp@0.34.3`
- `@napi-rs/system-ocr@1.0.2`
- `@paymoapp/electron-shutdown-handler@1.1.2`
- `selection-hook@1.0.12`
- `tesseract.js@6.0.1`

The `package.json` already specifies `onlyBuiltDependencies` which should help pnpm handle these correctly.

### Patched Dependencies
The project has 19 patched dependencies in `patches/` directory. pnpm should automatically apply these during installation if configured correctly in `pnpm.patchedDependencies`.

### Workspace Packages
- `@cherrystudio/ai-core` (workspace:^1.0.9)
- `@cherrystudio/extension-table-plus` (workspace:^)

These should be linked correctly by pnpm's workspace feature.

### Custom Registry
The `.npmrc` file specifies:
```
electron_mirror=https://npmmirror.com/mirrors/electron/
```
This should be respected by pnpm.

## Rollback Plan
If critical issues arise:
1. Restore from git if changes were committed
2. Reinstall yarn if needed
3. Run `yarn install` with original configuration

## Success Criteria
- ✅ No yarn artifacts remaining
- ✅ `pnpm install` completes successfully
- ✅ `pnpm build:check` passes (lint + test)
- ✅ `pnpm build` completes successfully
- ✅ All workspace packages linked correctly
- ✅ Development mode (`pnpm dev`) works
