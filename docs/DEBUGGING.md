# Debugging Guide for Prometheus Studio

This guide provides detailed information on how to debug Prometheus Studio effectively. It covers various debugging techniques, tools, and configurations to help you identify and fix issues in the application.

## Table of Contents

- [Debug Environment Variables](#debug-environment-variables)
- [Debug Scripts](#debug-scripts)
- [VSCode Debugging](#vscode-debugging)
- [Common Issues and Solutions](#common-issues-and-solutions)
- [WebContentsView Debugging](#webcontentsview-debugging)
- [Logging](#logging)
- [Performance Profiling](#performance-profiling)

## Debug Environment Variables

Prometheus Studio supports various environment variables to control debugging behavior. These can be set in the launch configuration or passed directly to the application when running from the command line.

| Environment Variable | Description |
|----------------------|-------------|
| `FORCE_SHOW_WINDOW` | Forces the application window to be visible, even when launched to tray |
| `DISABLE_LAUNCH_TO_TRAY` | Disables the launch to tray feature |
| `OPEN_DEVTOOLS` | Automatically opens DevTools when the application starts |
| `DEBUG_FORCE_WINDOW_VISIBLE` | Forces the window to be visible in all cases |
| `SUPPRESS_SOURCEMAP_ERRORS` | Suppresses source map errors in the console |
| `SUPPRESS_SECURITY_WARNINGS` | Suppresses Electron security warnings in the console |
| `SUPPRESS_ROUTER_WARNINGS` | Suppresses React Router future flag warnings in the console |
| `VERBOSE_LOGGING` | Enables verbose logging for all components |
| `LOG_WEBCONTENTSVIEW_EVENTS` | Logs all WebContentsView events |
| `LOG_IPC_EVENTS` | Logs all IPC events |
| `LOG_PERFORMANCE` | Logs performance measurements |
| `LOG_MEMORY_USAGE` | Logs memory usage at regular intervals |

## Debug Scripts

The following npm scripts are available for debugging:

```bash
# Standard debug mode
yarn debug

# Debug with focus on renderer process
yarn debug:renderer

# Debug with focus on main process
yarn debug:main

# Debug with suppressed warnings and errors
yarn debug:quiet

# Debug with verbose logging
yarn debug:verbose

# Debug with focus on WebContentsView
yarn debug:webcontentsview
```

## VSCode Debugging

Prometheus Studio includes VSCode launch configurations for debugging both the main and renderer processes. To use these configurations:

1. Open the Debug panel in VSCode (Ctrl+Shift+D or Cmd+Shift+D)
2. Select the desired launch configuration from the dropdown
3. Click the green play button or press F5 to start debugging

### Available Launch Configurations

- **Debug Main Process**: Debugs the Electron main process
- **Debug Renderer Process**: Debugs the Electron renderer process
- **Debug All**: Debugs both main and renderer processes simultaneously
- **Debug Main Process (Direct)**: Directly debugs the main process without using electron-vite

## Common Issues and Solutions

### Source Map Errors

If you see errors like "Could not read source map for file:///path/to/file.js", you can:

1. Use the `SUPPRESS_SOURCEMAP_ERRORS=true` environment variable
2. Run the application with `yarn debug:quiet`

### Security Warnings

If you see Electron security warnings related to webSecurity, allowRunningInsecureContent, or Content-Security-Policy, you can:

1. Use the `SUPPRESS_SECURITY_WARNINGS=true` environment variable
2. Run the application with `yarn debug:quiet`

### React Router Warnings

If you see React Router future flag warnings, you can:

1. Use the `SUPPRESS_ROUTER_WARNINGS=true` environment variable
2. Run the application with `yarn debug:quiet`

## WebContentsView Debugging

WebContentsView is a critical component in Prometheus Studio for rendering mini apps. To debug WebContentsView issues:

1. Run the application with `yarn debug:webcontentsview`
2. Check the logs for WebContentsView events and errors
3. Use the DevTools to inspect the WebContentsView content

### Common WebContentsView Issues

- **Positioning Issues**: Check the bounds calculation in WebContentsViewContainer.tsx and WebContentsViewService.ts
- **Loading Issues**: Check the URL loading and fallback mechanism in WebContentsViewService.ts
- **Visibility Issues**: Check the visibility scripts and CSS injection in WebContentsViewService.ts

## Logging

Prometheus Studio uses electron-log for logging. Logs are written to the following locations:

- **Windows**: `%USERPROFILE%\AppData\Roaming\Prometheus Studio\logs\main.log`
- **macOS**: `~/Library/Logs/Prometheus Studio/main.log`
- **Linux**: `~/.config/Prometheus Studio/logs/main.log`

### Log Levels

The following log levels are available:

- **error**: Critical errors that prevent the application from functioning
- **warn**: Warnings that don't prevent the application from functioning but indicate potential issues
- **info**: Informational messages about the application's operation
- **debug**: Detailed debugging information

### Component-Specific Logging

You can enable component-specific logging by setting the `VERBOSE_LOGGING=true` environment variable. This will log detailed information for each component, including:

- WebContentsViewService
- MainProcess
- WindowService
- TrayService
- And more...

## Performance Profiling

Prometheus Studio includes built-in performance profiling tools. To use these tools:

1. Set the `LOG_PERFORMANCE=true` environment variable
2. Run the application
3. Check the logs for performance measurements

### Performance Markers

Performance markers are used to measure the time between two points in the code. The following markers are available:

- **app-ready**: When the app is ready to create windows
- **main-window-created**: When the main window is created
- **app-initialized**: When the app is fully initialized

### Memory Usage Logging

You can enable memory usage logging by setting the `LOG_MEMORY_USAGE=true` environment variable. This will log memory usage at regular intervals, including:

- **RSS**: Resident Set Size (total memory allocated to the process)
- **Heap Total**: Total size of the JavaScript heap
- **Heap Used**: Used size of the JavaScript heap
- **External**: Memory used by C++ objects bound to JavaScript objects

## Advanced Debugging Techniques

### Debugging IPC Communication

To debug IPC communication between the main and renderer processes:

1. Set the `LOG_IPC_EVENTS=true` environment variable
2. Run the application
3. Check the logs for IPC events

### Debugging WebContentsView Events

To debug WebContentsView events:

1. Set the `LOG_WEBCONTENTSVIEW_EVENTS=true` environment variable
2. Run the application
3. Check the logs for WebContentsView events

### Debugging with Chrome DevTools

You can use Chrome DevTools to debug the renderer process:

1. Run the application with `yarn debug` or `yarn debug:renderer`
2. Open Chrome and navigate to `chrome://inspect`
3. Click on "Open dedicated DevTools for Node"
4. Connect to the running Electron process

## Conclusion

This debugging guide provides a comprehensive overview of the debugging capabilities in Prometheus Studio. By using these tools and techniques, you can effectively identify and fix issues in the application.

If you encounter any issues that are not covered in this guide, please refer to the [Electron Documentation](https://www.electronjs.org/docs/latest/) or the [React Documentation](https://reactjs.org/docs/getting-started.html) for more information.
