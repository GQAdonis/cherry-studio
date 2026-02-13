// Type declarations for pg module when not yet installed
declare module 'pg' {
  export class Pool {
    constructor(options: { connectionString: string })
    query(sql: string, params?: any[]): Promise<{ rows: any[] }>
    end(): Promise<void>
  }
}
