/**
 * WebviewTagWrapper.ts
 * 
 * This file provides a wrapper for the WebviewTag interface to ensure
 * that all methods and properties are safely accessed at runtime.
 * It helps prevent crashes when direct 'electron' imports are removed.
 */

import { WebviewTag } from '@renderer/types/electron-renderer';

/**
 * Safely access a method on a WebviewTag element
 * @param element The WebviewTag element
 * @param methodName The name of the method to call
 * @param args Arguments to pass to the method
 * @returns The result of the method call, or undefined if the method doesn't exist
 */
export function safeCallMethod<T>(
  element: WebviewTag | null | undefined,
  methodName: string,
  ...args: any[]
): T | undefined {
  if (!element) {
    console.warn(`WebviewTagWrapper: Cannot call ${methodName} on null element`);
    return undefined;
  }

  const method = (element as any)[methodName];
  if (typeof method !== 'function') {
    console.warn(`WebviewTagWrapper: Method ${methodName} is not available on WebviewTag element`);
    return undefined;
  }

  try {
    return method.apply(element, args) as T;
  } catch (error) {
    console.error(`WebviewTagWrapper: Error calling ${methodName}:`, error);
    return undefined;
  }
}

/**
 * Safely get a property from a WebviewTag element
 * @param element The WebviewTag element
 * @param propName The name of the property to get
