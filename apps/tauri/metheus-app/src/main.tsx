/**
 * main.tsx
 * 
 * Entry point for the Tauri application.
 * Renders the main App component.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./globals.css";

// Add a class to the body to help with styling
document.body.classList.add("tauri-app");

// Create root element and render the app
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
