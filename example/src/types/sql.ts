export interface SqlConfig {
  client: 'pg' | 'mysql2' | 'mssql';
  connection: string | Record<string, unknown>;
}

export interface SqlOps {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<number>;
  callProc<T = Record<string, unknown>>(name: string, params?: unknown[]): Promise<T[]>;
}
