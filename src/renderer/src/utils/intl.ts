import { getLanguage } from '@renderer/i18n'

/**
 * Utility functions for internationalization using the Intl API
 * These functions provide locale-aware formatting for dates, times, and numbers
 */

/**
 * Get the current locale from i18n settings
 * Falls back to 'en-US' if no locale is available
 */
export const getCurrentLocale = (): string => {
  return getLanguage() || 'en-US'
}

/**
 * Format a date according to the current locale
 * 
 * @param date - Date to format (Date object or timestamp)
 * @param options - Intl.DateTimeFormatOptions to customize the format
 * @param locale - Optional locale override (defaults to current locale)
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | number,
  options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  },
  locale?: string
): string => {
  const dateObj = date instanceof Date ? date : new Date(date)
  const currentLocale = locale || getCurrentLocale()
  
  try {
    return new Intl.DateTimeFormat(currentLocale, options).format(dateObj)
  } catch (error) {
    console.error('Error formatting date:', error)
    // Fallback to ISO string if formatting fails
    return dateObj.toISOString().split('T')[0]
  }
}

/**
 * Format a time according to the current locale
 * 
 * @param date - Date/time to format (Date object or timestamp)
 * @param options - Intl.DateTimeFormatOptions to customize the format
 * @param locale - Optional locale override (defaults to current locale)
 * @returns Formatted time string
 */
export const formatTime = (
  date: Date | number,
  options: Intl.DateTimeFormatOptions = { 
    hour: 'numeric', 
    minute: 'numeric',
    second: 'numeric',
    hour12: true // Use 12-hour clock for English locales
  },
  locale?: string
): string => {
  const dateObj = date instanceof Date ? date : new Date(date)
  const currentLocale = locale || getCurrentLocale()
  
  try {
    return new Intl.DateTimeFormat(currentLocale, options).format(dateObj)
  } catch (error) {
    console.error('Error formatting time:', error)
    // Fallback to ISO time if formatting fails
    return dateObj.toISOString().split('T')[1].split('.')[0]
  }
}

/**
 * Format a date and time according to the current locale
 * 
 * @param date - Date/time to format (Date object or timestamp)
 * @param options - Intl.DateTimeFormatOptions to customize the format
 * @param locale - Optional locale override (defaults to current locale)
 * @returns Formatted date and time string
 */
export const formatDateTime = (
  date: Date | number,
  options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: 'numeric', 
    minute: 'numeric',
    hour12: true // Use 12-hour clock for English locales
  },
  locale?: string
): string => {
  const dateObj = date instanceof Date ? date : new Date(date)
  const currentLocale = locale || getCurrentLocale()
  
  try {
    return new Intl.DateTimeFormat(currentLocale, options).format(dateObj)
  } catch (error) {
    console.error('Error formatting date and time:', error)
    // Fallback to ISO format if formatting fails
    return dateObj.toISOString().replace('T', ' ').split('.')[0]
  }
}

/**
 * Format a relative time (e.g., "2 days ago", "in 3 hours")
 * 
 * @param value - The number of units
 * @param unit - The unit of time
 * @param options - Intl.RelativeTimeFormatOptions to customize the format
 * @param locale - Optional locale override (defaults to current locale)
 * @returns Formatted relative time string
 */
export const formatRelativeTime = (
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  options: Intl.RelativeTimeFormatOptions = { numeric: 'auto' },
  locale?: string
): string => {
  const currentLocale = locale || getCurrentLocale()
  
  try {
    return new Intl.RelativeTimeFormat(currentLocale, options).format(value, unit)
  } catch (error) {
    console.error('Error formatting relative time:', error)
    // Simple fallback for relative time
    const absValue = Math.abs(value)
    const suffix = value < 0 ? ' ago' : ' from now'
    return `${absValue} ${unit}${absValue !== 1 ? 's' : ''}${suffix}`
  }
}

/**
 * Format a number according to the current locale
 * 
 * @param number - Number to format
 * @param options - Intl.NumberFormatOptions to customize the format
 * @param locale - Optional locale override (defaults to current locale)
 * @returns Formatted number string
 */
export const formatNumber = (
  number: number,
  options: Intl.NumberFormatOptions = { 
    maximumFractionDigits: 2 
  },
  locale?: string
): string => {
  const currentLocale = locale || getCurrentLocale()
  
  try {
    return new Intl.NumberFormat(currentLocale, options).format(number)
  } catch (error) {
    console.error('Error formatting number:', error)
    // Fallback to basic number formatting
    return number.toString()
  }
}

/**
 * Format a currency amount according to the current locale
 * 
 * @param amount - Amount to format
 * @param currency - Currency code (e.g., 'USD', 'EUR')
 * @param options - Intl.NumberFormatOptions to customize the format
 * @param locale - Optional locale override (defaults to current locale)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  options: Intl.NumberFormatOptions = {},
  locale?: string
): string => {
  const currentLocale = locale || getCurrentLocale()
  const formatOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    ...options
  }
  
  try {
    return new Intl.NumberFormat(currentLocale, formatOptions).format(amount)
  } catch (error) {
    console.error('Error formatting currency:', error)
    // Fallback to basic currency formatting
    return `${currency} ${amount.toFixed(2)}`
  }
}

/**
 * Format a percentage according to the current locale
 * 
 * @param value - Value to format as percentage (0.1 = 10%)
 * @param options - Intl.NumberFormatOptions to customize the format
 * @param locale - Optional locale override (defaults to current locale)
 * @returns Formatted percentage string
 */
export const formatPercent = (
  value: number,
  options: Intl.NumberFormatOptions = {},
  locale?: string
): string => {
  const currentLocale = locale || getCurrentLocale()
  const formatOptions: Intl.NumberFormatOptions = {
    style: 'percent',
    ...options
  }
  
  try {
    return new Intl.NumberFormat(currentLocale, formatOptions).format(value)
  } catch (error) {
    console.error('Error formatting percentage:', error)
    // Fallback to basic percentage formatting
    return `${(value * 100).toFixed(2)}%`
  }
}

/**
 * Format a file size in a human-readable way (KB, MB, GB)
 * 
 * @param bytes - Size in bytes
 * @param locale - Optional locale override (defaults to current locale)
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number, locale?: string): string => {
  const currentLocale = locale || getCurrentLocale()
  
  const KB = 1024
  const MB = KB * 1024
  const GB = MB * 1024
  
  let size: number
  let unit: string
  
  if (bytes >= GB) {
    size = bytes / GB
    unit = 'GB'
  } else if (bytes >= MB) {
    size = bytes / MB
    unit = 'MB'
  } else if (bytes >= KB) {
    size = bytes / KB
    unit = 'KB'
  } else {
    size = bytes
    unit = 'bytes'
  }
  
  try {
    const formattedSize = new Intl.NumberFormat(currentLocale, {
      maximumFractionDigits: size >= 10 ? 0 : 1
    }).format(size)
    
    return `${formattedSize} ${unit}`
  } catch (error) {
    console.error('Error formatting file size:', error)
    // Fallback to basic file size formatting
    return `${size.toFixed(size >= 10 ? 0 : 1)} ${unit}`
  }
}