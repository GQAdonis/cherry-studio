# WebContentsView Test Suite

This test suite is designed to test the WebContentsView implementation in Cherry Studio, particularly with mini apps like Bolt.diy. The tests verify that the migration from BrowserView to WebContentsView is working correctly and that all required functionality is supported.

## Test Files

The test suite consists of the following files:

- `test-runner.html` - Main entry point for running all tests
- `test-bolt-diy.html` - Tests for the Bolt.diy mini app
- `test-multi-apps.html` - Tests for multiple mini apps running simultaneously
- `test-web-capabilities.html` - Tests for web capabilities like localStorage and IndexedDB
- `test-webcontentsview.html` - Comprehensive test suite for all WebContentsView functionality

## How to Run the Tests

1. Start the Cherry Studio application in development mode:
   ```
   yarn dev
   ```

2. Open the test runner in a browser:
   ```
   open test-runner.html
   ```

3. Click on the test you want to run, or run them all sequentially.

## Test Descriptions

### Bolt.diy Mini App Test

This test focuses on testing the WebContentsView implementation with the Bolt.diy mini app. It tests:

- Creating and showing the Bolt.diy mini app
- Hiding and showing the mini app
- Opening DevTools for the mini app
- Getting the current URL of the mini app
- Reloading the mini app
- Destroying the mini app

### Multiple Mini Apps Test

This test focuses on testing multiple mini apps running simultaneously. It tests:

- Creating multiple mini apps
- Showing multiple mini apps with different positions
- Z-order management (bringing each app to the front)
- Hiding all mini apps
- Showing all mini apps again
- Destroying all mini apps

### Web Capabilities Test

This test focuses on testing various web capabilities in the WebContentsView implementation. It tests:

- localStorage
- sessionStorage
- IndexedDB
- Cookies
- Web Workers
- Fetch API

### WebContentsView Test Suite

This is a comprehensive test suite that tests all aspects of the WebContentsView implementation, including:

- Creating and showing a mini app
- Hiding and showing a mini app
- Destroying a mini app
- Multiple mini apps running simultaneously
- Z-order management
- Web capabilities

## Test Results

The test results are displayed in the test log on each test page. Successful tests are shown in green, and failed tests are shown in red. The test log also includes detailed information about each test step.

## Troubleshooting

If you encounter any issues while running the tests, check the following:

1. Make sure the Cherry Studio application is running in development mode.
2. Check the browser console for any errors.
3. Make sure the WebContentsView implementation is properly initialized.
4. Check the electron-log for any errors in the main process.

## Notes

- The tests are designed to be run one at a time, not concurrently.
- Some tests may take a few seconds to complete due to waiting for views to load.
- The tests use the WebContentsView API exposed through the preload script.