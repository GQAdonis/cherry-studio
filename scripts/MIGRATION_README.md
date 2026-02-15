# Assistant to Agent Migration Guide

This guide will help you migrate your existing **Assistants** (legacy) to **Agents** (new API system) in The Boss (Cherry Studio).

## 🎯 Why Migrate?

The Boss has two separate systems:

- **Assistants (Legacy)**: Stored in localStorage, shown in UI only
- **Agents (New)**: Stored in SQLite database, accessible via REST API

To use the external API (`/v1/agents`), you need to create **Agents**.

## 📋 Prerequisites

1. **The Boss must be running** with API server enabled
2. **Node.js** installed (for running the migration script)
3. **API Token** from The Boss settings

## 🚀 Migration Steps

### Step 1: Export Your Assistants

Run the export helper script:

```bash
./scripts/export-assistants.sh
```

Or manually:

1. Open The Boss
2. Open DevTools: `View → Toggle Developer Tools`
3. Go to Console tab
4. Run:
   ```javascript
   JSON.stringify(
     JSON.parse(localStorage.getItem("persist:cherry-studio")).assistants,
     null,
     2
   )
   ```
5. Copy the output
6. Save to `assistants-export.json` in the project root

### Step 2: Run Migration Script

```bash
# Using default API token
npx tsx scripts/migrate-assistants-to-agents.ts

# Or with custom token
BOSS_API_TOKEN="your-token-here" npx tsx scripts/migrate-assistants-to-agents.ts
```

### Step 3: Verify

Check that agents were created:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:23333/v1/agents
```

## ⚙️ Configuration

Edit the migration script to customize:

- **API_BASE_URL**: Default is `http://127.0.0.1:23333`
- **API_TOKEN**: Set via env var `BOSS_API_TOKEN`
- **DEFAULT_ACCESSIBLE_PATH**: Default is your home directory

## 🔧 How It Works

The migration script:

1. Reads your assistants from `assistants-export.json`
2. Converts each assistant to agent format:
   - Maps model IDs to `provider:model` format
   - Sets type to `claude-code`
   - Includes instructions (from assistant prompt)
   - Configures accessible paths
   - Transfers MCP server IDs
3. Creates agents via POST to `/v1/agents`

## 📝 Assistant → Agent Mapping

| Assistant Field | Agent Field | Notes |
|----------------|-------------|-------|
| `name` | `name` | Direct copy |
| `prompt` | `instructions` | System prompt |
| `description` | `description` | Direct copy |
| `model.id` | `model` | Normalized to `provider:model` |
| `mcpServers` | `mcps` | Array of MCP IDs |
| — | `type` | Always `claude-code` |
| — | `accessible_paths` | Set to home directory |
| — | `configuration` | Default settings |

## ⚠️ Important Notes

### Model ID Format

Agents require model IDs in `provider:model` format:

- ✅ Good: `openrouter:anthropic/claude-sonnet-4.5`
- ✅ Good: `anthropic:claude-sonnet-4`
- ❌ Bad: `claude-sonnet-4`

The script auto-converts if needed.

### Agent Types

Currently only `claude-code` type is supported. All assistants are converted to this type.

### Accessible Paths

By default, agents get access to your home directory. You can modify this in the script or via the API after creation.

## 🐛 Troubleshooting

### "No assistants found"

- Make sure you exported the data correctly
- Check that `assistants-export.json` exists
- Verify the JSON format is correct

### "Failed to create agent: Invalid model"

- The model ID must be in `provider:model` format
- Check that the provider is configured in The Boss
- Verify the model exists in the provider

### API Connection Error

- Ensure The Boss is running
- Check API server is enabled in settings
- Verify the API token is correct
- Confirm the port (default: 23333)

## 📚 Related Documentation

- Agent API: `src/main/services/agents/README.md`
- API Tests: `tests/apis/agents/agents.http`
- Agent Types: `src/renderer/src/types/agent.ts`

## 💡 Tips

1. **Backup First**: The migration doesn't delete assistants, but backup your data
2. **Test One**: Try migrating one assistant first to verify
3. **Check Models**: Ensure all models are properly configured
4. **Verify Paths**: Check accessible_paths match your needs
5. **Update Instructions**: Review and update instructions after migration

## 🎉 After Migration

Once migrated, your agents will be:

- ✅ Accessible via REST API at `/v1/agents`
- ✅ Stored in SQLite database
- ✅ Usable by external applications
- ✅ Available in The Boss UI (if you create them via UI with "Agent" type)

---

**Questions?** Check the main README or open an issue.
