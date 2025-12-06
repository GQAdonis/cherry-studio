# Azure Foundry Provider Fix

## Issue
Azure AI Foundry provider was not appearing in the provider list in the UI despite being configured in the system.

## Root Cause
The provider was added to `SYSTEM_PROVIDERS` configuration but was missing:
1. **Migration script** to add the provider for existing users
2. **Additional embedding models** beyond just `text-embedding-3-large`

## Changes Made

### 1. Added Migration (v185)
**File**: `src/renderer/src/store/migrate.ts`

Added migration version 185 to automatically add `azure-foundry` provider for existing users:

```typescript
'185': (state: RootState) => {
  try {
    addProvider(state, 'azure-foundry')
    logger.info('migrate 185 success - Added Azure AI Foundry provider')
    return state
  } catch (error) {
    logger.error('migrate 185 error', error as Error)
    return state
  }
}
```

### 2. Updated Store Version
**File**: `src/renderer/src/store/index.ts`

Updated the persist reducer version from `184` to `185` to trigger the migration:

```typescript
const persistedReducer = persistReducer(
  {
    key: 'cherry-studio',
    storage,
    version: 185, // Updated from 184
    blacklist: ['runtime', 'messages', 'messageBlocks', 'tabs', 'toolPermissions', 'artifacts'],
    migrate
  },
  rootReducer
)
```

### 3. Enhanced Embedding Models
**File**: `src/renderer/src/config/models/default.ts`

Added comprehensive embedding model support for Azure Foundry:

#### OpenAI Embeddings
- ✅ `text-embedding-3-large` (already existed)
- ✅ `text-embedding-3-small` (NEW)
- ✅ `text-embedding-ada-002` (NEW)

#### Cohere Embeddings
- ✅ `embed-v3-english` (already existed, group updated)
- ✅ `embed-v3-multilingual` (NEW)

## What This Fixes

### Before
- Azure Foundry provider did not appear in the provider list for existing users
- Only one embedding model was available (`text-embedding-3-large`)
- New installations would see the provider, but upgrades would not

### After
- ✅ Azure Foundry provider automatically appears after app restart/update
- ✅ All major embedding models from OpenAI and Cohere are available
- ✅ Migration applies automatically on app startup
- ✅ Works for both new installations and existing users upgrading

## How It Works

### Migration Process
1. When the app starts, it detects the stored state version (184)
2. The migration system runs all migrations from 184 to 185
3. Migration 185 calls `addProvider(state, 'azure-foundry')`
4. The provider is added to the user's provider list
5. The state version is updated to 185

### Migration Safety
- Uses the existing `addProvider()` helper which checks if provider already exists
- If the provider already exists, it's not duplicated
- Wrapped in try/catch for error handling
- Logs success/failure for debugging

## Embedding Models Available

All embedding models are accessed through the **Azure AI Model Inference API** (`/models` endpoint) and support the same unified interface:

### OpenAI Embeddings (3 models)
- **text-embedding-3-large**: Most capable OpenAI embedding model
- **text-embedding-3-small**: Efficient, smaller OpenAI embedding model
- **text-embedding-ada-002**: Legacy OpenAI embedding model

### Cohere Embeddings (2 models)
- **embed-v3-english**: English-only embedding model
- **embed-v3-multilingual**: Multilingual embedding support

## Testing

All quality checks pass:
- ✅ TypeScript compilation (`yarn typecheck:web`)
- ✅ Linting (`yarn lint`)
- ✅ Code formatting (`yarn format`)
- ✅ i18n checks

## Usage

After this fix, users can:

1. **See Azure Foundry in provider list** - No manual configuration needed
2. **Configure their Azure endpoint**:
   ```
   API Host: https://YourProjectName.services.ai.azure.com/api/projects/your-project
   API Key: your-azure-api-key
   API Version: 2024-10-21 (or latest)
   ```
3. **Select from all available models** including chat and embedding models
4. **Use the unified inference API** for seamless model access

## Important Notes

### For Knowledge Base / RAG
All embedding models work with:
- Knowledge bases
- Document search
- Semantic similarity
- RAG (Retrieval-Augmented Generation) pipelines

### Model Selection
Users can now choose the best embedding model for their use case:
- **Large models** (text-embedding-3-large): Best accuracy, higher cost
- **Small models** (text-embedding-3-small): Good balance of speed and accuracy
- **Multilingual** (embed-v3-multilingual): For non-English content

## Related Files

All related implementation files from the original Azure Foundry PR:
- `src/renderer/src/types/provider.ts` - Type definitions
- `src/renderer/src/aiCore/provider/config/azure-foundry.ts` - 3-tier routing
- `src/renderer/src/utils/model.ts` - Model family detection
- `src/renderer/src/config/providers.ts` - Provider configuration
- `src/renderer/src/i18n/locales/*.json` - Translations

## Build Status

✅ macOS ARM64 build completed successfully (`yarn build:mac:arm64`)
