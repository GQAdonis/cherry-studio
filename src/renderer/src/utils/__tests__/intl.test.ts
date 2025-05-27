import {
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatFileSize
} from '../intl'

// Mock the getCurrentLocale function to return a fixed locale for testing
jest.mock('@renderer/i18n', () => ({
  getLanguage: () => 'en-US'
}))

describe('intl utilities', () => {
  // Use a fixed date for consistent testing
  const testDate = new Date('2023-05-15T14:30:45.000Z')
  
  describe('formatDate', () => {
    it('should format date according to locale', () => {
      const result = formatDate(testDate)
      // Format will be like "May 15, 2023" in en-US
      expect(result).toContain('2023')
      expect(result).toContain('15')
    })
    
    it('should accept custom options', () => {
      const result = formatDate(testDate, { 
        year: '2-digit', 
        month: 'numeric', 
        day: 'numeric' 
      })
      // Format will be like "5/15/23" in en-US
      expect(result.length).toBeLessThan(10)
    })
  })
  
  describe('formatTime', () => {
    it('should format time according to locale', () => {
      const result = formatTime(testDate)
      // Format will include hours and minutes
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })
  })
  
  describe('formatDateTime', () => {
    it('should format date and time together', () => {
      const result = formatDateTime(testDate)
      // Should contain both date and time parts
      expect(result).toContain('2023')
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })
  })
  
  describe('formatRelativeTime', () => {
    it('should format relative time in the past', () => {
      const result = formatRelativeTime(-2, 'day')
      expect(result).toContain('day')
    })
    
    it('should format relative time in the future', () => {
      const result = formatRelativeTime(3, 'hour')
      expect(result).toContain('hour')
    })
  })
  
  describe('formatNumber', () => {
    it('should format numbers according to locale', () => {
      const result = formatNumber(1234567.89)
      // In en-US, thousands are separated by commas
      expect(result).toContain(',')
    })
  })
  
  describe('formatCurrency', () => {
    it('should format currency with symbol', () => {
      const result = formatCurrency(1234.56, 'USD')
      // In en-US, USD is formatted with $ symbol
      expect(result).toContain('$')
      expect(result).toContain('1,234.56')
    })
    
    it('should handle different currencies', () => {
      const result = formatCurrency(1234.56, 'EUR')
      // Should contain the amount and currency indicator
      expect(result).toContain('1,234.56')
      expect(result).toMatch(/€|EUR/)
    })
  })
  
  describe('formatPercent', () => {
    it('should format decimal as percentage', () => {
      const result = formatPercent(0.3456)
      // 0.3456 should be formatted as 34.56%
      expect(result).toContain('%')
      expect(result).toContain('34')
    })
  })
  
  describe('formatFileSize', () => {
    it('should format bytes as human-readable size', () => {
      expect(formatFileSize(1024)).toContain('KB')
      expect(formatFileSize(1024 * 1024)).toContain('MB')
      expect(formatFileSize(1024 * 1024 * 1024)).toContain('GB')
    })
  })
})