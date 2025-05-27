// Type definitions for Jest
declare const jest: any
declare const describe: (name: string, fn: () => void) => void
declare const it: (name: string, fn: () => void) => void
declare const expect: any
declare const beforeEach: (fn: () => void) => void
declare const afterEach: (fn: () => void) => void
declare const beforeAll: (fn: () => void) => void
declare const afterAll: (fn: () => void) => void