# 🖥️ Develop

## IDE Setup

[Cursor](https://www.cursor.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
yarn
```

### Development

### Setup Node.js

Download and install [Node.js v20.x.x](https://nodejs.org/en/download)

### Setup Yarn

```bash
corepack enable
corepack prepare yarn@4.6.0 --activate
```

### Install Dependencies

```bash
yarn install
```

### Start

```bash
yarn dev
```

### Test

```bash
yarn test
```

### Debugging

The project is configured for debugging both the main and renderer processes:

1. **VS Code Debugging**:
   - Use the "Debug All" configuration to debug both main and renderer processes
   - Use "Debug Main Process" to debug only the main process
   - Use "Debug Renderer Process" to debug only the renderer process

2. **WebStorm Debugging**:
   - Use the "Debug All" configuration to debug both main and renderer processes
   - Use "Debug Main Process" to debug only the main process
   - Use "Debug Renderer Process" to debug only the renderer process
   - See [WebStorm Debugging Guide](./webstorm-debug.md) for detailed instructions

3. **Environment Variables**:
   - `FORCE_SHOW_WINDOW`: Forces the window to be visible during debugging
   - `DISABLE_LAUNCH_TO_TRAY`: Prevents the app from launching to tray
   - `OPEN_DEVTOOLS`: Automatically opens DevTools when the app starts

4. **To start debugging in VS Code**:
   - Open VS Code
   - Press F5 or select Run > Start Debugging
   - Select the appropriate debug configuration

5. **To start debugging in WebStorm**:
   - Open WebStorm
   - Click on the "Run" menu and select "Debug..."
   - Select the appropriate debug configuration

6. **Debug Utilities**:

   The project includes debug utilities in `src/main/utils/debugUtils.ts` that provide helpful functions for debugging:

   ```typescript
   // Check if debugging is enabled
   isDebuggingEnabled()

   // Log objects with proper formatting
   debugLog('User data', userData, true)

   // Measure execution time of a function
   const result = measureTime(() => expensiveOperation(), 'Data processing')

   // Create performance markers and measure between them
   markPerformance('start-operation')
   // ... code to measure ...
   markPerformance('end-operation')
   measurePerformance('start-operation', 'end-operation', 'Operation duration')
   ```

   These utilities automatically check if debugging is enabled before executing, so they can be left in production code without performance impact.

### Build

```bash
# For windows
$ yarn build:win

# For macOS
$ yarn build:mac

# For Linux
$ yarn build:linux
```
