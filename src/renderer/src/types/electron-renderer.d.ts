/**
 * Type definitions for Electron's WebviewTag
 * This file provides type definitions for the WebviewTag interface
 * to avoid direct imports from 'electron' in renderer process files.
 *
 * IMPORTANT: This is a custom interface definition that doesn't import from 'electron'
 * at all, ensuring no runtime dependencies on the electron module.
 */

// Define our own WebviewTag interface that matches what we need
export interface WebviewTag extends HTMLElement {
  // Properties
  src: string;
  nodeintegration?: boolean;
  disablewebsecurity?: boolean;
  allowpopups?: boolean;
  preload?: string;
  httpreferrer?: string;
  useragent?: string;
  partition?: string;
  
  // Methods
  addEventListener(event: string, listener: (event: any) => void): void;
  removeEventListener(event: string, listener: (event: any) => void): void;
  getWebContentsId(): number | null;
  openDevTools(): void;
  
  // Style property
  style: CSSStyleDeclaration;
}

// Add a console message to help with debugging
console.log('Custom WebviewTag interface loaded without electron dependency');