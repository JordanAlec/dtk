import { createRedisService } from './redis.js';

jest.mock('redis');
import { createClient } from 'redis';

const mockClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  hSet: jest.fn(),
  hGet: jest.fn(),
  keys: jest.fn(),
  quit: jest.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  jest.clearAllMocks();
  (createClient as jest.Mock).mockReturnValue(mockClient);
  mockClient.connect.mockResolvedValue(undefined);
});

describe('createRedisService', () => {
  const config = { url: 'redis://localhost:6379' };

  it('connects to redis using the provided url', async () => {
    mockClient.get.mockResolvedValue('value');
    const redis = createRedisService(config);
    await redis.get('key');
    expect(createClient).toHaveBeenCalledWith({ url: config.url });
    expect(mockClient.connect).toHaveBeenCalledTimes(1);
  });

  it('reuses the same client across multiple calls', async () => {
    mockClient.get.mockResolvedValue('value');
    const redis = createRedisService(config);
    await redis.get('key1');
    await redis.get('key2');
    expect(mockClient.connect).toHaveBeenCalledTimes(1);
  });

  it('get returns the value for an existing key', async () => {
    mockClient.get.mockResolvedValue('hello');
    const redis = createRedisService(config);
    const result = await redis.get('greeting');
    expect(result).toBe('hello');
    expect(mockClient.get).toHaveBeenCalledWith('greeting');
  });

  it('get returns null for a missing key', async () => {
    mockClient.get.mockResolvedValue(null);
    const redis = createRedisService(config);
    const result = await redis.get('missing');
    expect(result).toBeNull();
  });

  it('set calls client.set without EX when no ttl is given', async () => {
    const redis = createRedisService(config);
    await redis.set('key', 'value');
    expect(mockClient.set).toHaveBeenCalledWith('key', 'value');
  });

  it('set calls client.set with EX option when ttl is given', async () => {
    const redis = createRedisService(config);
    await redis.set('key', 'value', 60);
    expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 60 });
  });

  it('del returns the number of deleted keys', async () => {
    mockClient.del.mockResolvedValue(1);
    const redis = createRedisService(config);
    const result = await redis.del('key');
    expect(result).toBe(1);
    expect(mockClient.del).toHaveBeenCalledWith('key');
  });

  it('exists returns true when key is present', async () => {
    mockClient.exists.mockResolvedValue(1);
    const redis = createRedisService(config);
    const result = await redis.exists('key');
    expect(result).toBe(true);
  });

  it('exists returns false when key is absent', async () => {
    mockClient.exists.mockResolvedValue(0);
    const redis = createRedisService(config);
    const result = await redis.exists('missing');
    expect(result).toBe(false);
  });

  it('expire returns true when the timeout was set', async () => {
    mockClient.expire.mockResolvedValue(true);
    const redis = createRedisService(config);
    const result = await redis.expire('key', 300);
    expect(result).toBe(true);
    expect(mockClient.expire).toHaveBeenCalledWith('key', 300);
  });

  it('hset returns the number of new fields added', async () => {
    mockClient.hSet.mockResolvedValue(1);
    const redis = createRedisService(config);
    const result = await redis.hset('hash', 'field', 'value');
    expect(result).toBe(1);
    expect(mockClient.hSet).toHaveBeenCalledWith('hash', 'field', 'value');
  });

  it('hget returns the field value', async () => {
    mockClient.hGet.mockResolvedValue('stored');
    const redis = createRedisService(config);
    const result = await redis.hget('hash', 'field');
    expect(result).toBe('stored');
  });

  it('hget returns null when field is undefined', async () => {
    mockClient.hGet.mockResolvedValue(undefined);
    const redis = createRedisService(config);
    const result = await redis.hget('hash', 'missing');
    expect(result).toBeNull();
  });

  it('keys returns matching key names', async () => {
    mockClient.keys.mockResolvedValue(['user:1', 'user:2']);
    const redis = createRedisService(config);
    const result = await redis.keys('user:*');
    expect(result).toEqual(['user:1', 'user:2']);
    expect(mockClient.keys).toHaveBeenCalledWith('user:*');
  });

  it('quit disconnects the client and clears it', async () => {
    mockClient.get.mockResolvedValue('value');
    mockClient.quit = jest.fn().mockResolvedValue(undefined);
    const redis = createRedisService(config);
    await redis.get('key');
    await redis.quit();
    expect(mockClient.quit).toHaveBeenCalledTimes(1);
  });

  it('quit is a no-op when client was never connected', async () => {
    const redis = createRedisService(config);
    await expect(redis.quit()).resolves.toBeUndefined();
  });

  it('throws when any method is called without config', async () => {
    const redis = createRedisService();
    await expect(redis.get('key')).rejects.toThrow('redis service is not configured');
  });
});
