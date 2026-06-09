import { createSqlService } from './service.js';

jest.mock('knex');
import knexLib from 'knex';

const mockTrxRaw = jest.fn();
const mockTrx = { raw: mockTrxRaw };

const mockRaw = jest.fn();
const mockDestroy = jest.fn().mockResolvedValue(undefined);
const mockTransaction = jest.fn();

const mockDb = {
  raw: mockRaw,
  destroy: mockDestroy,
  transaction: mockTransaction,
};

beforeEach(() => {
  jest.clearAllMocks();
  (knexLib as unknown as jest.Mock).mockReturnValue(mockDb);
  mockDestroy.mockResolvedValue(undefined);
});

describe('createSqlService', () => {
  describe('configuration', () => {
    it('throws when any method is called without config', async () => {
      const sql = createSqlService();
      await expect(sql.query('SELECT 1')).rejects.toThrow('sql service is not configured');
    });

    it('creates a knex instance with the provided client and connection', async () => {
      mockRaw.mockResolvedValue({ rows: [] });
      const sql = createSqlService({ client: 'pg', connection: 'postgresql://localhost/test' });
      await sql.query('SELECT 1');
      expect(knexLib).toHaveBeenCalledWith({ client: 'pg', connection: 'postgresql://localhost/test' });
    });

    it('reuses the same knex instance across multiple calls', async () => {
      mockRaw.mockResolvedValue({ rows: [] });
      const sql = createSqlService({ client: 'pg', connection: 'postgresql://localhost/test' });
      await sql.query('SELECT 1');
      await sql.query('SELECT 2');
      expect(knexLib).toHaveBeenCalledTimes(1);
    });
  });

  describe('query', () => {
    it('returns result.rows for pg', async () => {
      mockRaw.mockResolvedValue({ rows: [{ id: 1 }] });
      const sql = createSqlService({ client: 'pg', connection: '' });
      const result = await sql.query('SELECT * FROM users');
      expect(result).toEqual([{ id: 1 }]);
    });

    it('returns result[0] for mysql2', async () => {
      mockRaw.mockResolvedValue([[{ id: 1 }], []]);
      const sql = createSqlService({ client: 'mysql2', connection: '' });
      const result = await sql.query('SELECT * FROM users');
      expect(result).toEqual([{ id: 1 }]);
    });

    it('returns result[0] for mssql', async () => {
      mockRaw.mockResolvedValue([[{ id: 1 }]]);
      const sql = createSqlService({ client: 'mssql', connection: '' });
      const result = await sql.query('SELECT * FROM users');
      expect(result).toEqual([{ id: 1 }]);
    });

    it('passes sql and params to raw', async () => {
      mockRaw.mockResolvedValue({ rows: [] });
      const sql = createSqlService({ client: 'pg', connection: '' });
      await sql.query('SELECT * FROM users WHERE id = ?', [42]);
      expect(mockRaw).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [42]);
    });

    it('defaults params to empty array when omitted', async () => {
      mockRaw.mockResolvedValue({ rows: [] });
      const sql = createSqlService({ client: 'pg', connection: '' });
      await sql.query('SELECT 1');
      expect(mockRaw).toHaveBeenCalledWith('SELECT 1', []);
    });
  });

  describe('execute', () => {
    it('returns rowCount for pg', async () => {
      mockRaw.mockResolvedValue({ rowCount: 3 });
      const sql = createSqlService({ client: 'pg', connection: '' });
      const result = await sql.execute('DELETE FROM users WHERE active = ?', [false]);
      expect(result).toBe(3);
    });

    it('returns affectedRows for mysql2', async () => {
      mockRaw.mockResolvedValue([{ affectedRows: 2 }]);
      const sql = createSqlService({ client: 'mysql2', connection: '' });
      const result = await sql.execute('UPDATE users SET active = ?', [true]);
      expect(result).toBe(2);
    });

    it('returns rowsAffected[0] for mssql', async () => {
      mockRaw.mockResolvedValue({ rowsAffected: [5] });
      const sql = createSqlService({ client: 'mssql', connection: '' });
      const result = await sql.execute('INSERT INTO logs (msg) VALUES (?)', ['test']);
      expect(result).toBe(5);
    });

    it('returns 0 when pg rowCount is null', async () => {
      mockRaw.mockResolvedValue({ rowCount: null });
      const sql = createSqlService({ client: 'pg', connection: '' });
      const result = await sql.execute('SELECT 1');
      expect(result).toBe(0);
    });
  });

  describe('callProc', () => {
    it('uses CALL syntax for pg', async () => {
      mockRaw.mockResolvedValue({ rows: [] });
      const sql = createSqlService({ client: 'pg', connection: '' });
      await sql.callProc('my_proc', [1, 'test']);
      expect(mockRaw).toHaveBeenCalledWith('CALL my_proc(?, ?)', [1, 'test']);
    });

    it('uses CALL syntax for mysql2', async () => {
      mockRaw.mockResolvedValue([[[]], {}]);
      const sql = createSqlService({ client: 'mysql2', connection: '' });
      await sql.callProc('my_proc', [1]);
      expect(mockRaw).toHaveBeenCalledWith('CALL my_proc(?)', [1]);
    });

    it('uses EXEC syntax for mssql', async () => {
      mockRaw.mockResolvedValue([[{ result: 1 }]]);
      const sql = createSqlService({ client: 'mssql', connection: '' });
      await sql.callProc('usp_my_proc', [1, 2]);
      expect(mockRaw).toHaveBeenCalledWith('EXEC usp_my_proc ?, ?', [1, 2]);
    });

    it('uses EXEC without params for mssql when no params given', async () => {
      mockRaw.mockResolvedValue([[{ result: 1 }]]);
      const sql = createSqlService({ client: 'mssql', connection: '' });
      await sql.callProc('usp_my_proc');
      expect(mockRaw).toHaveBeenCalledWith('EXEC usp_my_proc', []);
    });

    it('returns result.rows for pg', async () => {
      mockRaw.mockResolvedValue({ rows: [{ status: 'ok' }] });
      const sql = createSqlService({ client: 'pg', connection: '' });
      const result = await sql.callProc('my_proc', []);
      expect(result).toEqual([{ status: 'ok' }]);
    });

    it('returns result[0] for mssql', async () => {
      mockRaw.mockResolvedValue([[{ status: 'ok' }]]);
      const sql = createSqlService({ client: 'mssql', connection: '' });
      const result = await sql.callProc('usp_my_proc', []);
      expect(result).toEqual([{ status: 'ok' }]);
    });

    it('returns the first result set for mysql2', async () => {
      mockRaw.mockResolvedValue([[[{ status: 'ok' }], {}], []]);
      const sql = createSqlService({ client: 'mysql2', connection: '' });
      const result = await sql.callProc('my_proc', []);
      expect(result).toEqual([{ status: 'ok' }]);
    });
  });

  describe('transaction', () => {
    it('calls knex transaction and passes SqlOps to fn', async () => {
      mockTrxRaw.mockResolvedValue({ rows: [{ id: 1 }] });
      mockTransaction.mockImplementation((fn: (trx: typeof mockTrx) => Promise<unknown>) => fn(mockTrx));

      const sql = createSqlService({ client: 'pg', connection: '' });
      const result = await sql.transaction(async (ops) => ops.query('SELECT 1'));

      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual([{ id: 1 }]);
    });

    it('ops.execute within transaction uses the transaction executor', async () => {
      mockTrxRaw.mockResolvedValue({ rowCount: 2 });
      mockTransaction.mockImplementation((fn: (trx: typeof mockTrx) => Promise<unknown>) => fn(mockTrx));

      const sql = createSqlService({ client: 'pg', connection: '' });
      const affected = await sql.transaction(async (ops) => ops.execute('DELETE FROM tmp'));

      expect(mockTrxRaw).toHaveBeenCalledWith('DELETE FROM tmp', []);
      expect(affected).toBe(2);
    });

    it('ops.callProc within transaction uses the transaction executor', async () => {
      mockTrxRaw.mockResolvedValue({ rows: [] });
      mockTransaction.mockImplementation((fn: (trx: typeof mockTrx) => Promise<unknown>) => fn(mockTrx));

      const sql = createSqlService({ client: 'pg', connection: '' });
      await sql.transaction(async (ops) => ops.callProc('my_proc', [1]));

      expect(mockTrxRaw).toHaveBeenCalledWith('CALL my_proc(?)', [1]);
    });
  });

  describe('disconnect', () => {
    it('destroys the knex instance and clears the reference', async () => {
      mockRaw.mockResolvedValue({ rows: [] });
      const sql = createSqlService({ client: 'pg', connection: '' });
      await sql.query('SELECT 1');
      await sql.disconnect();
      expect(mockDestroy).toHaveBeenCalledTimes(1);
    });

    it('is a no-op when never connected', async () => {
      const sql = createSqlService({ client: 'pg', connection: '' });
      await expect(sql.disconnect()).resolves.toBeUndefined();
      expect(mockDestroy).not.toHaveBeenCalled();
    });

    it('creates a new knex instance after reconnecting following disconnect', async () => {
      mockRaw.mockResolvedValue({ rows: [] });
      const sql = createSqlService({ client: 'pg', connection: '' });
      await sql.query('SELECT 1');
      await sql.disconnect();
      await sql.query('SELECT 1');
      expect(knexLib).toHaveBeenCalledTimes(2);
    });
  });
});
