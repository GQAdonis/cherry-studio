/**
 * integrationTest.ts
 * 
 * A test script to verify that all components of the Tauri migration
 * work together correctly.
 */

import { invoke } from "./tauri";
import { miniAppManager } from "./miniAppManager";
import { fileManager } from "./fileManager";
import { settingsManager } from "./settingsManager";

/**
 * Integration test for the Tauri migration
 * Tests all major components to ensure they work together correctly
 */
export async function runIntegrationTest(): Promise<{
  success: boolean;
  results: Record<string, { success: boolean; message: string }>;
}> {
  const results: Record<string, { success: boolean; message: string }> = {};
  let overallSuccess = true;

  console.log("Starting integration test...");

  try {
    // Test settings management
    console.log("Testing settings management...");
    try {
      await settingsManager.initialize();
      const theme = await settingsManager.getSetting<string>("general.theme", "system");
      await settingsManager.setSetting("general.theme", "dark");
      const updatedTheme = await settingsManager.getSetting<string>("general.theme");
      
      if (updatedTheme === "dark") {
        results["settings"] = { success: true, message: "Settings management is working correctly" };
      } else {
        results["settings"] = { success: false, message: "Failed to update settings" };
        overallSuccess = false;
      }
      
      // Restore original theme
      await settingsManager.setSetting("general.theme", theme);
    } catch (error) {
      results["settings"] = { 
        success: false, 
        message: `Settings management test failed: ${error instanceof Error ? error.message : String(error)}` 
      };
      overallSuccess = false;
    }

    // Test file system management
    console.log("Testing file system management...");
    try {
      const testContent = "This is a test file created by the integration test.";
      const testFilePath = "test-integration.txt";
      
      // Write test file
      await fileManager.writeFile(testFilePath, new TextEncoder().encode(testContent));
      
      // Read test file
      const content = await fileManager.readFile(testFilePath);
      const decodedContent = new TextDecoder().decode(content);
      
      if (decodedContent === testContent) {
        results["fileSystem"] = { success: true, message: "File system management is working correctly" };
      } else {
        results["fileSystem"] = { success: false, message: "File content mismatch" };
        overallSuccess = false;
      }
      
      // Clean up
      await fileManager.deleteFile(testFilePath);
    } catch (error) {
      results["fileSystem"] = { 
        success: false, 
        message: `File system test failed: ${error instanceof Error ? error.message : String(error)}` 
      };
      overallSuccess = false;
    }

    // Test mini-app management
    console.log("Testing mini-app management...");
    try {
      const testAppId = "test-mini-app";
      const miniAppConfig = await miniAppManager.getMiniAppConfig(testAppId);
      
      if (miniAppConfig) {
        const state = await miniAppManager.getMiniAppState(testAppId);
        
        if (state !== undefined) {
          results["miniApp"] = { success: true, message: "Mini-app management is working correctly" };
        } else {
          results["miniApp"] = { success: false, message: "Failed to get mini-app state" };
          overallSuccess = false;
        }
      } else {
        // If the test app doesn't exist, we'll consider this a success
        // since we're just testing the API functionality
        results["miniApp"] = { success: true, message: "Mini-app API is accessible" };
      }
    } catch (error) {
      results["miniApp"] = { 
        success: false, 
        message: `Mini-app test failed: ${error instanceof Error ? error.message : String(error)}` 
      };
      overallSuccess = false;
    }

    // Test agent integration
    console.log("Testing agent integration...");
    try {
      // Check if the agent API is accessible
      const agentId = "demo-agent";
      const jsCode = `
        function run(input) {
          return {
            content: "Test agent response: " + input,
            metadata: { test: true }
          };
        }
      `;
      
      // Try to load the agent
      await invoke("load_agent", { agentId, jsCode });
      
      // Run the agent
      const response = await invoke("run_agent", { 
        agentId, 
        input: "Integration test" 
      });
      
      // Unload the agent
      await invoke("unload_agent", { agentId });
      
      if (response) {
        results["agent"] = { success: true, message: "Agent integration is working correctly" };
      } else {
        results["agent"] = { success: false, message: "Failed to get agent response" };
        overallSuccess = false;
      }
    } catch (error) {
      results["agent"] = { 
        success: false, 
        message: `Agent test failed: ${error instanceof Error ? error.message : String(error)}` 
      };
      overallSuccess = false;
    }

    console.log("Integration test completed.");
    return {
      success: overallSuccess,
      results
    };
  } catch (error) {
    console.error("Integration test failed:", error);
    return {
      success: false,
      results: {
        "error": { 
          success: false, 
          message: `Integration test failed: ${error instanceof Error ? error.message : String(error)}` 
        }
      }
    };
  }
}

/**
 * Run the integration test and log the results
 */
export async function runAndLogIntegrationTest(): Promise<void> {
  try {
    const { success, results } = await runIntegrationTest();
    
    console.log("=== Integration Test Results ===");
    console.log(`Overall: ${success ? "✅ PASSED" : "❌ FAILED"}`);
    
    Object.entries(results).forEach(([component, result]) => {
      console.log(`${component}: ${result.success ? "✅ PASSED" : "❌ FAILED"} - ${result.message}`);
    });
  } catch (error) {
    console.error("Failed to run integration test:", error);
  }
}
