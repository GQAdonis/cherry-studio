// Type declarations for JSON imports
declare module '*.json' {
  const content: any
  export default content
}

// Specific declarations for i18n JSON files
declare module '@renderer/i18n/locales/*.json' {
  const content: Record<string, any>
  export default content
}

declare module '@renderer/i18n/translate/*.json' {
  const content: Record<string, any>
  export default content
}