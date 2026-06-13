import { createDynamoService } from './dynamo.js';

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/util-dynamodb');
import { DynamoDBClient, PutItemCommand, GetItemCommand, QueryCommand, DeleteItemCommand, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import type { QueryCommandInput, ScanCommandInput, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const mockSend = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (DynamoDBClient as jest.Mock).mockImplementation(() => ({ send: mockSend }));
  (marshall as jest.Mock).mockImplementation((obj) => obj);
  (unmarshall as jest.Mock).mockImplementation((obj) => obj);
});

describe('createDynamoService', () => {
  const config = { region: 'us-east-1' };

  describe('putItem', () => {
    it('sends a PutItemCommand with the table name and marshalled item', async () => {
      mockSend.mockResolvedValue({});
      const dynamo = createDynamoService(config);
      const item = { id: 'abc', name: 'test' };
      await dynamo.putItem('my-table', item);
      const commandArg = (PutItemCommand as unknown as jest.Mock).mock.calls[0][0];
      expect(commandArg.TableName).toBe('my-table');
      expect(commandArg.Item).toEqual(item);
    });

    it('returns success with the table name and item field count', async () => {
      mockSend.mockResolvedValue({});
      const dynamo = createDynamoService(config);
      const result = await dynamo.putItem('my-table', { id: '1', name: 'test' });
      expect(result).toEqual({ success: true, tableName: 'my-table', itemCount: 2 });
    });

  });

  describe('getItem', () => {
    it('sends a GetItemCommand with the table name and marshalled key', async () => {
      mockSend.mockResolvedValue({ Item: { id: 'abc' } });
      const dynamo = createDynamoService(config);
      await dynamo.getItem('my-table', { id: 'abc' });
      const commandArg = (GetItemCommand as unknown as jest.Mock).mock.calls[0][0];
      expect(commandArg.TableName).toBe('my-table');
      expect(commandArg.Key).toEqual({ id: 'abc' });
    });

    it('returns the unmarshalled item and found: true when item exists', async () => {
      const rawItem = { id: 'abc', name: 'test' };
      mockSend.mockResolvedValue({ Item: rawItem });
      const dynamo = createDynamoService(config);
      const result = await dynamo.getItem('my-table', { id: 'abc' });
      expect(result).toEqual({ item: rawItem, found: true });
    });

    it('returns null and found: false when item does not exist', async () => {
      mockSend.mockResolvedValue({});
      const dynamo = createDynamoService(config);
      const result = await dynamo.getItem('my-table', { id: 'missing' });
      expect(result).toEqual({ item: null, found: false });
    });

  });

  describe('queryItems', () => {
    const params: Omit<QueryCommandInput, 'TableName'> = {
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: { '#pk': 'userId' },
      ExpressionAttributeValues: { ':pk': { S: 'user-123' } },
    };

    it('sends a QueryCommand with the table name and provided params', async () => {
      mockSend.mockResolvedValue({ Items: [] });
      const dynamo = createDynamoService(config);
      await dynamo.queryItems('my-table', params);
      const commandArg = (QueryCommand as unknown as jest.Mock).mock.calls[0][0];
      expect(commandArg.TableName).toBe('my-table');
      expect(commandArg.KeyConditionExpression).toBe('#pk = :pk');
    });

    it('returns unmarshalled items and count', async () => {
      const raw = [{ userId: 'user-123', sk: 'order-1' }];
      mockSend.mockResolvedValue({ Items: raw });
      const dynamo = createDynamoService(config);
      const result = await dynamo.queryItems('my-table', params);
      expect(result).toEqual({ items: raw, count: 1 });
    });

    it('returns empty items when response has no Items', async () => {
      mockSend.mockResolvedValue({});
      const dynamo = createDynamoService(config);
      const result = await dynamo.queryItems('my-table', params);
      expect(result).toEqual({ items: [], count: 0 });
    });

  });

  describe('updateItem', () => {
    const key = { id: 'abc' };
    const params: Omit<UpdateItemCommandInput, 'TableName' | 'Key'> = {
      UpdateExpression: 'SET #n = :n',
      ExpressionAttributeNames: { '#n': 'name' },
      ExpressionAttributeValues: { ':n': { S: 'Jane Doe' } },
    };

    it('sends an UpdateItemCommand with the table name, marshalled key, and params', async () => {
      mockSend.mockResolvedValue({});
      const dynamo = createDynamoService(config);
      await dynamo.updateItem('my-table', key, params);
      const commandArg = (UpdateItemCommand as unknown as jest.Mock).mock.calls[0][0];
      expect(commandArg.TableName).toBe('my-table');
      expect(commandArg.Key).toEqual(key);
      expect(commandArg.UpdateExpression).toBe('SET #n = :n');
    });

    it('returns success and the table name', async () => {
      mockSend.mockResolvedValue({});
      const dynamo = createDynamoService(config);
      const result = await dynamo.updateItem('my-table', key, params);
      expect(result).toEqual({ success: true, tableName: 'my-table' });
    });

  });

  describe('deleteItem', () => {
    it('sends a DeleteItemCommand with the table name and marshalled key', async () => {
      mockSend.mockResolvedValue({});
      const dynamo = createDynamoService(config);
      await dynamo.deleteItem('my-table', { id: 'abc' });
      const commandArg = (DeleteItemCommand as unknown as jest.Mock).mock.calls[0][0];
      expect(commandArg.TableName).toBe('my-table');
      expect(commandArg.Key).toEqual({ id: 'abc' });
    });

    it('returns success and the table name', async () => {
      mockSend.mockResolvedValue({});
      const dynamo = createDynamoService(config);
      const result = await dynamo.deleteItem('my-table', { id: 'abc' });
      expect(result).toEqual({ success: true, tableName: 'my-table' });
    });

  });

  describe('scanItems', () => {
    it('sends a ScanCommand with the table name and provided params', async () => {
      mockSend.mockResolvedValue({ Items: [] });
      const dynamo = createDynamoService(config);
      const scanParams: Omit<ScanCommandInput, 'TableName'> = { Limit: 10 };
      await dynamo.scanItems('my-table', scanParams);
      const commandArg = (ScanCommand as unknown as jest.Mock).mock.calls[0][0];
      expect(commandArg.TableName).toBe('my-table');
      expect(commandArg.Limit).toBe(10);
    });

    it('returns unmarshalled items and count', async () => {
      const raw = [{ id: 'a' }, { id: 'b' }];
      mockSend.mockResolvedValue({ Items: raw });
      const dynamo = createDynamoService(config);
      const result = await dynamo.scanItems('my-table');
      expect(result).toEqual({ items: raw, count: 2 });
    });

    it('returns empty items when response has no Items', async () => {
      mockSend.mockResolvedValue({});
      const dynamo = createDynamoService(config);
      const result = await dynamo.scanItems('my-table');
      expect(result).toEqual({ items: [], count: 0 });
    });

  });

  it('throws error when a method is called without config', async () => {
    const dynamo = createDynamoService();
    await expect(dynamo.putItem('my-table', { id: '1' })).rejects.toThrow('dynamo service is not configured');
  });

});
