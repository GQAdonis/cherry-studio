# Metheus App - Tauri Migration

This project represents the successful migration of the Cherry Studio application from Electron to Tauri. It integrates all the key components into a cohesive application, demonstrating the viability of Tauri as a replacement for Electron in production applications.

## Migration Overview

The migration from Electron to Tauri involved several key phases:

1. **Analysis and Planning**
   - Identifying core components and dependencies
   - Mapping Electron APIs to Tauri equivalents
   - Creating a migration roadmap with prioritized tasks

2. **Core Infrastructure Migration**
   - Implementing the Rust backend with Tauri
   - Creating the WebView management system
   - Setting up IPC communication between frontend and backend

3. **Component Migration**
   - Migrating layout components (sidebar, top navigation, content area)
   - Implementing mini-app management system
   - Porting file system operations
   - Adapting settings management
   - Integrating CoPilotKit with AG-UI adapter

4. **Integration and Testing**
   - Creating a unified application entry point
   - Implementing comprehensive testing
   - Ensuring all components work seamlessly together

## Technologies Used

- **Tauri 2.5.0** - A framework for building lightweight, secure desktop applications
- **React 19** - A JavaScript library for building user interfaces
- **Vite 6** - A build tool that provides a faster development experience
- **shadcn-ui** - A collection of reusable UI components built with Radix UI and Tailwind CSS
- **CoPilotKit** - A toolkit for integrating AI assistants into applications
- **Rust** - A systems programming language for the backend

## Architecture

The migrated application follows a modular architecture with clear separation of concerns:

### Frontend (React)

```
src/
├── components/         # UI components
│   ├── copilot/        # CoPilotKit integration components
│   ├── file/           # File system components
│   ├── layout/         # Layout components (sidebar, top nav, content area)
│   ├── miniapp/        # Mini-app components
│   ├── settings/       # Settings components
│   └── ui/             # shadcn-ui components
├── pages/              # Application pages
│   └── AgentDemo.tsx   # Mastra agent demo page
├── utils/              # Utility functions
│   ├── eventBus.ts     # Event management
│   ├── fileManager.ts  # File system operations
│   ├── miniAppManager.ts # Mini-app management
│   ├── settingsManager.ts # Settings management
│   ├── syncDatabase.ts # Database synchronization
│   └── agui/           # AG-UI adapter for Mastra agents
├── types/              # TypeScript type definitions
├── App.tsx             # Main application component
├── globals.css         # Global styles
└── main.tsx            # Entry point
```

### Backend (Rust)

```
src-tauri/
├── src/
│   ├── lib.rs          # Core functionality
│   ├── main.rs         # Entry point
│   ├── miniapp_manager.rs # Mini-app management
│   ├── v8_agent_runner.rs # V8 engine for running Mastra agents
│   └── webview_manager.rs # WebView management
├── Cargo.toml          # Rust dependencies
└── tauri.conf.json     # Tauri configuration
```

### Communication Flow

1. **Frontend to Backend**
   - Commands: Invoke Rust functions from JavaScript
   - Events: Subscribe to events emitted by the Rust backend

2. **Backend to Frontend**
   - Events: Emit events from Rust to JavaScript
   - State: Share state between Rust and JavaScript

3. **Mini-App Communication**
   - WebView messaging: Communicate between the main application and mini-apps
   - IPC: Inter-process communication for secure data exchange

## Features

### 1. Layout System

The application uses a flexible layout system with:
- Collapsible sidebar for navigation
- Top navigation bar for global actions
- Content area for displaying the active component
- Responsive design that adapts to window size

### 2. Mini-App Management

The mini-app system allows running multiple web applications within the main application:
- Loading and unloading mini-apps on demand
- Managing mini-app lifecycle (load, show, hide, unload)
- Secure isolation between mini-apps
- WebContentsView implementation for optimal performance and compatibility
- Support for localStorage, IndexedDB, and other web APIs

### 3. File System Management

Comprehensive file system operations:
- File browsing and navigation
- File creation, reading, writing, and deletion
- File metadata handling
- Secure access to the file system through Tauri's API

### 4. Settings Management

A robust settings system:
- Persistent settings storage
- Type-safe settings access
- Settings categories and schemas
- Real-time settings synchronization
- Default values and validation

### 5. CoPilotKit Integration

Integration with AI assistants:
- Mastra agent support through V8 engine
- AG-UI adapter for standardized UI components
- Chat interface for interacting with agents
- Action handling for agent-initiated actions

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- **Rust (v1.82.0 or later)** - **REQUIRED** for ICU dependencies
  - The application uses International Components for Unicode (ICU) libraries that specifically require Rust 1.82.0 or later
  - See [Rust Version Requirements](#rust-version-requirements) section below for detailed update instructions
- Tauri CLI

### Installation

1. Install dependencies:
   ```bash
   # Navigate to the project directory
   cd apps/tauri/metheus-app
   
   # Install all dependencies (including dev dependencies)
   yarn install
   ```

2. Verify all dependencies are installed:
   ```bash
   # Check if any dependencies are missing
   yarn check --verify-tree
   
   # If any dependencies are missing, run yarn install again
   yarn install
   ```

3. Run the development server:
   ```bash
   yarn tauri dev
   ```

4. Build for production:
   ```bash
   yarn tauri build
   ```

### Troubleshooting

If you encounter dependency-related errors like:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@vitejs/plugin-react'
```

Try the following steps:

1. Clear yarn cache:
   ```bash
   yarn cache clean
   ```

2. Reinstall dependencies:
   ```bash
   yarn install --force
   ```

3. If specific packages are still missing, install them manually:
   ```bash
   yarn add @vitejs/plugin-react@4.2.1 --dev
   ```

### Rust Version Requirements

This application requires **Rust version 1.82.0 or later** due to dependencies on the International Components for Unicode (ICU) libraries. These libraries provide essential internationalization features but have specific Rust version requirements.

#### Why Rust 1.82.0 is Required

Several ICU-related packages used by Tauri in this project require Rust 1.82.0 or later:
- `icu_collections@2.0.0`
- `icu_locale_core@2.0.0`
- `icu_normalizer@2.0.0`
- And other ICU-related packages

These dependencies provide critical internationalization support including Unicode normalization, locale handling, and text processing capabilities.

#### How to Update Rust

**On all platforms (using rustup - recommended):**
```bash
# Check your current Rust version
rustc --version

# Update Rust to the latest stable version
rustup update stable

# Verify the update
rustc --version  # Should show 1.82.0 or later
```

**On macOS (using Homebrew):**
```bash
brew update
brew upgrade rust
```

**On Linux (using package manager):**
```bash
# For Debian/Ubuntu
sudo apt update
sudo apt upgrade rust

# For Fedora
sudo dnf upgrade rust
```

**On Windows (without rustup):**
Download and run the latest installer from https://www.rust-lang.org/tools/install

#### Alternative: Downgrading Dependencies

If updating Rust is not possible in your environment, you can attempt to downgrade the ICU dependencies (not recommended):
```bash
cd src-tauri
cargo update icu_collections@2.0.0 --precise 1.9.0
cargo update icu_locale_core@2.0.0 --precise 1.9.0
# Repeat for other ICU packages that require newer Rust versions
```

Note that downgrading dependencies may lead to compatibility issues or missing features.

#### Rust Version Issues

If you encounter Rust version compatibility errors like:
```
error: rustc 1.81.0 is not supported by the following packages:
  icu_collections@2.0.0 requires rustc 1.82
  icu_locale_core@2.0.0 requires rustc 1.82
  icu_normalizer@2.0.0 requires rustc 1.82
  [and several other ICU-related packages]
```

Follow the update instructions above to resolve the issue.

#### Tauri Plugin Issues

If you encounter errors with Tauri plugins:
```
error: no matching package named `tauri-plugin-webview-window` found
```

Check the Cargo.toml file and ensure all plugin dependencies are using the correct names and versions for Tauri 2.x. Some plugin names and features have changed in Tauri 2.x compared to earlier versions.

### Running Tests

To verify that all components work together correctly, run the integration test:

```typescript
import { runAndLogIntegrationTest } from "./utils/integrationTest";

// Run the test
runAndLogIntegrationTest().then(() => {
  console.log("Integration test completed");
});
```

This will test:
- Settings management
- File system operations
- Mini-app management
- Agent integration

## Usage Guide

### Navigating the Application

The application has several main sections:
- **Home**: Overview and quick access to features
- **Mini Apps**: Launch and manage mini-apps
- **Files**: Browse and manage files
- **Settings**: Configure application settings
- **Agents**: Interact with Mastra agents

### Working with Mini-Apps

1. Navigate to the Mini Apps section
2. Select a mini-app from the list
3. The mini-app will load in the content area
4. Use the mini-app as you would a normal web application

### File Operations

1. Navigate to the Files section
2. Browse directories using the file explorer
3. Click on a file to open it
4. Use the toolbar to create, save, or delete files

### Configuring Settings

1. Navigate to the Settings section
2. Browse settings by category
3. Modify settings as needed
4. Changes are saved automatically

### Using Agents

1. Navigate to the Agents section
2. Load an agent using the control panel
3. Interact with the agent through the chat interface
4. Execute agent actions as needed

## Future Improvements

1. **Performance Optimization**
   - Optimize WebView rendering
   - Implement lazy loading for components
   - Improve startup time

2. **Feature Enhancements**
   - Add support for more mini-app types
   - Enhance file system capabilities
   - Expand settings options

3. **Security Improvements**
   - Implement permission system for mini-apps
   - Add sandboxing for agents
   - Enhance encryption for sensitive data

4. **User Experience**
   - Improve accessibility
   - Add more themes and customization options
   - Enhance keyboard shortcuts

5. **Platform Support**
   - Optimize for different operating systems
   - Add mobile support through responsive design
   - Implement platform-specific features

## References

- [Tauri Documentation](https://tauri.app/docs/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [shadcn-ui Documentation](https://ui.shadcn.com/)
- [CoPilotKit Documentation](https://docs.copilotkit.ai/)
