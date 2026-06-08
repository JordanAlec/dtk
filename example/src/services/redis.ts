import { createClient } from "redis";
import type { RedisConfig } from "../types/redis.js";

export function createRedisService(config?: RedisConfig) {
  const ensureConfig = () => {
    if (!config) throw new Error("redis service is not configured -- call .redis(config) on the suite");
  };

  let client: ReturnType<typeof createClient> | null = null;

  const getClient = async () => {
    ensureConfig();
    if (!client) {
      client = createClient({ url: config!.url });
      await client.connect();
    }
    return client;
  };

  return {
    get: async (key: string): Promise<string | null> => {
      const c = await getClient();
      return c.get(key);
    },
    set: async (key: string, value: string, ttlSeconds?: number): Promise<void> => {
      const c = await getClient();
      if (ttlSeconds !== undefined) {
        await c.set(key, value, { EX: ttlSeconds });
      } else {
        await c.set(key, value);
      }
    },
    del: async (key: string): Promise<number> => {
      const c = await getClient();
      return c.del(key);
    },
    exists: async (key: string): Promise<boolean> => {
      const c = await getClient();
      const count = await c.exists(key);
      return count > 0;
    },
    expire: async (key: string, ttlSeconds: number): Promise<boolean> => {
      const c = await getClient();
      return c.expire(key, ttlSeconds);
    },
    hset: async (key: string, field: string, value: string): Promise<number> => {
      const c = await getClient();
      return c.hSet(key, field, value);
    },
    hget: async (key: string, field: string): Promise<string | null> => {
      const c = await getClient();
      const result = await c.hGet(key, field);
      return result ?? null;
    },
    keys: async (pattern: string): Promise<string[]> => {
      const c = await getClient();
      return c.keys(pattern);
    },
    quit: async (): Promise<void> => {
      if (client) {
        await client.quit();
        client = null;
      }
    },
  };
}
