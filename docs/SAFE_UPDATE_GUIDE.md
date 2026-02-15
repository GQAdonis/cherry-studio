# Safe Update Guide: Cherry Studio Without Data Loss

This guide explains how to update your Cherry Studio installation from an old version to the latest codebase **without losing your data**.

## 🎯 The Problem

When building from the latest code after running an older version for a long time:
- **Redux state schema** might have changed (new fields, renamed properties)
- **SQLite database schema** might need new tables/columns
- **UI components** expect new data structures
- **Settings format** may have evolved

## 📊 Understanding Cherry Studio's Storage

### 1. Redux-Persist (UI State)
- **Location**: `~/Library/Application Support/CherryStudio/Local Storage/leveldb/`
- **Current Version**: 198 (see `src/renderer/src/store/index.ts:93`)
- **Contains**: Assistants, settings, providers, MCP configs, etc.
- **Migration**: Handled automatically by `src/renderer/src/store/migrate.ts`

### 2. SQLite Database (Agents)
- **Location**: `~/Library/Application Support/CherryStudio/Data/agents.db`
- **Migration**: Handled by Drizzle ORM on app startup
- **Contains**: Agents, sessions, messages

### 3. Other Data
- **Logs**: `~/Library/Application Support/CherryStudio/logs/`
- **Config**: `~/Library/Application Support/CherryStudio/config.json`

## ✅ Safe Update Process

### Step 1: Backup Everything

```bash
# Create backup directory
mkdir -p ~/Desktop/cherry-studio-backup-$(date +%Y%m%d)

# Backup application data
cp -r ~/Library/Application\ Support/CherryStudio \
  ~/Desktop/cherry-studio-backup-$(date +%Y%m%d)/

# Backup the app itself (optional)
cp -r /Applications/The\ Boss.app \
  ~/Desktop/cherry-studio-backup-$(date +%Y%m%d)/
```

### Step 2: Check Current State

```bash
# Check Redux version
# Open DevTools in The Boss
# Run: localStorage.getItem('persist:cherry-studio')
# Look for "_persist":{"version":198}

# Check SQLite database
sqlite3 ~/Library/Application\ Support/CherryStudio/Data/agents.db \
  "SELECT * FROM migrations ORDER BY version DESC LIMIT 5;"
```

### Step 3: Build the Latest Code

```bash
cd /Users/gqadonis/Projects/cherry-studio

# Install dependencies
pnpm install

# Run migrations for agents database (if needed)
pnpm agents:migrate

# Build the app
pnpm build:mac
```

### Step 4: Test in Development First

```bash
# Run in dev mode to test migrations
pnpm dev
```

**Watch for**:
- Console errors about missing fields
- Migration logs in DevTools console
- Database migration logs in terminal

### Step 5: Install Production Build

```bash
# Close the old app
# Install the new build from dist/
open dist/The\ Boss.app
```

## 🔍 How Migrations Work

### Redux-Persist Migrations

The `migrate.ts` file contains migrations from version to version:

```typescript
// Example structure (simplified)
const migrations = {
  198: (state) => {
    // Transform state from v197 to v198
    return {
      ...state,
      newField: defaultValue
    }
  }
}
```

**Key Points:**
- Migrations run automatically on app start
- Each version transformation is idempotent
- State is upgraded incrementally (197 → 198 → 199, etc.)
- Current version: **198**

### Drizzle/SQLite Migrations

Located in `src/main/services/agents/database/`:

```typescript
// Migrations run on app startup
migrate(db, { migrationsFolder: './migrations' })
```

**Key Points:**
- Auto-runs pending migrations
- Tracked in `migrations` table
- SQL files in migration folder
- Data migrations handled by `DataMigrationService.ts`

## 🚨 Common Issues & Solutions

### Issue 1: "Cannot read property of undefined"

**Cause**: Redux state is missing new required fields

**Solution**:
```bash
# Option A: Let migrations handle it (preferred)
# Just restart the app, migrations should add missing fields

# Option B: Reset Redux state (DESTRUCTIVE)
# Open DevTools Console:
localStorage.removeItem('persist:cherry-studio')
# Then reload
```

### Issue 2: SQLite Schema Mismatch

**Cause**: Database schema out of sync with code

**Solution**:
```bash
# Check what migrations are pending
cd /Users/gqadonis/Projects/cherry-studio
pnpm agents:health

# Apply migrations manually (if needed)
pnpm agents:migrate

# Or reset database (DESTRUCTIVE - loses agents)
pnpm agents:drop
```

### Issue 3: UI Shows Old Layout

**Cause**: Redux state has old UI configuration

**Solution**:
```typescript
// In DevTools Console:
const state = store.getState()
console.log('Settings version:', state.settings)

// Check if settings need reset
// Settings should auto-migrate, but you can manually update:
store.dispatch({
  type: 'settings/updateSetting',
  payload: { key: 'version', value: '2.0' }
})
```

### Issue 4: Missing Provider Configuration

**Cause**: New providers added to system but not in your state

**Solution**:
The migration system has a `fixMissingProvider()` function that should auto-add them.
If not:

```typescript
// DevTools Console:
const { SYSTEM_PROVIDERS } = await import('./config/providers')
SYSTEM_PROVIDERS.forEach(p => {
  store.dispatch({
    type: 'llm/addProvider',
    payload: p
  })
})
```

## 🛠️ Manual Migration (Last Resort)

If automatic migrations fail, here's a manual process:

### Export Your Data

```bash
# Export assistants
# Open DevTools Console in old app:
copy(JSON.stringify(JSON.parse(localStorage.getItem('persist:cherry-studio')).assistants, null, 2))
# Save to file: assistants-backup.json

# Export settings
copy(JSON.stringify(JSON.parse(localStorage.getItem('persist:cherry-studio')).settings, null, 2))
# Save to file: settings-backup.json

# Backup agents database
cp ~/Library/Application\ Support/CherryStudio/Data/agents.db \
  ~/Desktop/agents-backup.db
```

### Clean Install

```bash
# Close app
# Remove app data
rm -rf ~/Library/Application\ Support/CherryStudio

# Remove app
rm -rf /Applications/The\ Boss.app

# Install new version
cd /Users/gqadonis/Projects/cherry-studio
pnpm build:mac
# Install from dist/
```

### Restore Data

```typescript
// Open new app, then DevTools Console:

// Restore assistants
const assistants = /* paste JSON from assistants-backup.json */
store.dispatch({
  type: 'assistants/updateAssistants',
  payload: assistants.assistants
})

// Restore settings (be careful, some may be incompatible)
const settings = /* paste JSON from settings-backup.json */
Object.entries(settings).forEach(([key, value]) => {
  store.dispatch({
    type: 'settings/updateSetting',
    payload: { key, value }
  })
})
```

## 📋 Checklist Before Update

- [ ] Backup `~/Library/Application Support/CherryStudio/`
- [ ] Check current Redux version
- [ ] Test in development mode first
- [ ] Verify migrations run successfully
- [ ] Check logs for errors
- [ ] Test critical workflows (create assistant, chat, etc.)
- [ ] Verify all providers still work
- [ ] Check agents are accessible
- [ ] Confirm MCP servers connect

## 🎓 Best Practices

1. **Always backup before updating**
2. **Test in dev mode first** (`pnpm dev`)
3. **Read migration logs** to understand changes
4. **Keep old version** until new one is stable
5. **Document custom configurations** for easy restoration
6. **Update incrementally** rather than jumping many versions

## 📚 Related Documentation

- Redux-Persist: `src/renderer/src/store/index.ts`
- Migrations: `src/renderer/src/store/migrate.ts`
- Agents Service: `src/main/services/agents/README.md`
- Database Migrations: `src/main/services/agents/database/`

## 🆘 If Something Goes Wrong

1. **Restore from backup**:
   ```bash
   rm -rf ~/Library/Application\ Support/CherryStudio
   cp -r ~/Desktop/cherry-studio-backup-YYYYMMDD/CherryStudio \
     ~/Library/Application\ Support/
   ```

2. **Reinstall old version** from backup

3. **Open issue** on GitHub with:
   - Error logs from `~/Library/Application Support/CherryStudio/logs/`
   - Redux version
   - Steps to reproduce

---

**Remember**: The migration system is designed to preserve your data. If it's not working, it's usually a bug that should be reported, not a reason to lose your data!
