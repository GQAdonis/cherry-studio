# Debugging Prometheus Studio in WebStorm

This guide explains how to debug the Prometheus Studio Electron application in WebStorm.

## Setup

The project has been configured with WebStorm run configurations for debugging both the main and renderer processes of the Electron application.

### Available Debug Configurations

1. **Debug Main Process** - Debugs the main Electron process (Node.js)
2. **Debug Renderer Process** - Debugs the renderer process (Chromium)
3. **Debug All** - Debugs both the main and renderer processes simultaneously

## How to Debug

1. Open the project in WebStorm
2. Click on the "Run" menu and select "Edit Configurations..."
3. You should see the three debug configurations listed above
4. Select the configuration you want to use and click "OK"
5. Click on the "Debug" button (green bug icon) or press Shift+F9 to start debugging

## Debugging the Main Process

The main process is the Node.js process that runs the Electron application. To debug the main process:

1. Set breakpoints in your main process code (files in `src/main`)
2. Select the "Debug Main Process" configuration
3. Start debugging
4. The application will launch with the debugger attached to the main process

## Debugging the Renderer Process

The renderer process is the Chromium process that displays the UI. To debug the renderer process:

1. Set breakpoints in your renderer process code (files in `src/renderer`)
2. Select the "Debug Renderer Process" configuration
3. Start debugging
4. The application will launch with the debugger attached to the renderer process

## Debugging Both Processes

To debug both the main and renderer processes simultaneously:

1. Set breakpoints in both your main and renderer process code
2. Select the "Debug All" configuration
3. Start debugging
4. The application will launch with debuggers attached to both processes

## Environment Variables

The debug configurations set the following environment variables:

- `FORCE_SHOW_WINDOW`: Forces the window to be visible during debugging
- `DISABLE_LAUNCH_TO_TRAY`: Prevents the app from launching to tray
- `OPEN_DEVTOOLS`: Automatically opens DevTools when the app starts

## Troubleshooting

If you encounter issues with debugging:

1. Make sure the ports 9229 (main process) and 9222 (renderer process) are available
2. Try restarting WebStorm
3. Check the WebStorm event log for any errors
