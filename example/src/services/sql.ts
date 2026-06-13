import knex, { Knex } from 'knex';
import type { SqlConfig, SqlOps } from '../types/sql.js';

export function createSqlService(config?: SqlConfig) {
  const ensureConfig = () => {
    if (!config) throw new Error("sql service is not configured -- call .sql(config) on the suite");
  };

  let db: Knex | null = null;

  const getDb = (): Knex => {
    ensureConfig();
    if (!db) {
      db = knex({ client: config!.client, connection: config!.connection });
    }
    return db;
  };

  const extractRows = <T>(result: unknown): T[] => {
    if (config!.client === 'pg') return (result as { rows: T[] }).rows;
    return ((result as unknown[])[0] as T[]) ?? [];
  };

  const extractAffected = (result: unknown): number => {
    if (config!.client === 'pg') return (result as { rowCount: number }).rowCount ?? 0;
    if (config!.client === 'mssql') return (result as { rowsAffected: number[] }).rowsAffected?.[0] ?? 0;
    return ((result as [{ affectedRows: number }])[0]?.affectedRows) ?? 0;
  };

  const buildCallSql = (name: string, params: unknown[]): string => {
    const placeholders = params.map(() => '?').join(', ');
    return config!.client === 'mssql'
      ? `EXEC ${name}${params.length ? ` ${placeholders}` : ''}`
      : `CALL ${name}(${placeholders})`;
  };

  const extractProcRows = <T>(result: unknown): T[] => {
    if (config!.client === 'pg') return (result as { rows: T[] }).rows;
    if (config!.client === 'mssql') return ((result as unknown[])[0] as T[]) ?? [];
    // mysql2 procs return [[resultSet, OkPacket], fields] -- first element of resultSet is the rows
    const first = ((result as unknown[][])[0])?.[0];
    return (Array.isArray(first) ? first : (result as unknown[])[0]) as T[];
  };

  const bind = (params?: unknown[]) => (params ?? []) as any[];

  const makeOps = (executor: Knex | Knex.Transaction): SqlOps => ({
    async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
      const result = await executor.raw(sql, bind(params));
      return extractRows<T>(result);
    },
    async execute(sql: string, params?: unknown[]): Promise<number> {
      const result = await executor.raw(sql, bind(params));
      return extractAffected(result);
    },
    async callProc<T = Record<string, unknown>>(name: string, params?: unknown[]): Promise<T[]> {
      const bound = bind(params);
      const result = await executor.raw(buildCallSql(name, bound), bound);
      return extractProcRows<T>(result);
    },
  });

  return {
    async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
      const result = await getDb().raw(sql, bind(params));
      return extractRows<T>(result);
    },
    async execute(sql: string, params?: unknown[]): Promise<number> {
      const result = await getDb().raw(sql, bind(params));
      return extractAffected(result);
    },
    async callProc<T = Record<string, unknown>>(name: string, params?: unknown[]): Promise<T[]> {
      const bound = bind(params);
      const result = await getDb().raw(buildCallSql(name, bound), bound);
      return extractProcRows<T>(result);
    },
    async transaction<T>(fn: (ops: SqlOps) => Promise<T>): Promise<T> {
      return getDb().transaction(trx => fn(makeOps(trx)));
    },
    async disconnect(): Promise<void> {
      if (db) {
        await db.destroy();
        db = null;
      }
    },
  };
}
