/**
 * Debug utilities for Prometheus Studio
 * This file contains utility functions for debugging purposes
 */

import Logger from 'electron-log'

/**
 * Check if debugging is enabled
 * @returns {boolean} True if debugging is enabled
 */
export function isDebuggingEnabled(): boolean {
  return process.env.NODE_ENV === 'development' ||
         process.env.DEBUG === 'true' ||
         process.env.OPEN_DEVTOOLS === 'true'
}

/**
 * Log an object with proper formatting for debugging
 * @param {string} label - Label for the object
 * @param {any} obj - Object to log
 * @param {boolean} [expanded=false] - Whether to expand the object in console
 */
export function debugLog(label: string, obj: any, expanded: boolean = false): void {
  if (!isDebuggingEnabled()) return

  try {
    if (expanded) {
      Logger.debug(`[DEBUG] ${label}:`)
      Logger.debug(JSON.stringify(obj, null, 2))
    } else {
      Logger.debug(`[DEBUG] ${label}:`, obj)
    }
  } catch (error) {
    Logger.debug(`[DEBUG] ${label}: [Object could not be stringified]`, error)
  }
}

/**
 * Measure execution time of a function
 * @param {Function} fn - Function to measure
 * @param {string} [label] - Label for the measurement
 * @returns {any} Result of the function
 */
export function measureTime<T>(fn: () => T, label?: string): T {
  if (!isDebuggingEnabled()) return fn()

  const start = performance.now()
  const result = fn()
  const end = performance.now()

  Logger.debug(`[PERFORMANCE] ${label || 'Function'} took ${(end - start).toFixed(2)}ms`)
  return result
}

/**
 * Create a performance marker for debugging
 * @param {string} name - Name of the marker
 */
export function markPerformance(name: string): void {
  if (!isDebuggingEnabled()) return

  const markName = `prometheus-studio-${name}`
  performance.mark(markName)
  Logger.debug(`[PERFORMANCE] Marked: ${name}`)
}

/**
 * Measure time between two performance markers
 * @param {string} startName - Name of the start marker
 * @param {string} endName - Name of the end marker
 * @param {string} [measureName] - Name for the measurement
 */
export function measurePerformance(startName: string, endName: string, measureName?: string): void {
  if (!isDebuggingEnabled()) return

  const start = `prometheus-studio-${startName}`
  const end = `prometheus-studio-${endName}`
  const measure = measureName || `${startName} to ${endName}`

  try {
    performance.measure(measure, start, end)
    const entries = performance.getEntriesByName(measure)
    if (entries.length > 0) {
      Logger.debug(`[PERFORMANCE] ${measure}: ${entries[0].duration.toFixed(2)}ms`)
    }
  } catch (error) {
    Logger.debug(`[PERFORMANCE] Failed to measure ${measure}:`, error)
  }
}
