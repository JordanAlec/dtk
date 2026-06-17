import { MongoClient } from 'mongodb';
import type { MongoConfig, MongoDocument, MongoFilter, MongoUpdate } from '../types/mongodb.js';

export function createMongoService(config?: MongoConfig) {
  const ensureConfig = () => {
    if (!config) throw new Error("mongodb service is not configured -- call .mongodb(config) on the suite");
  };

  let client: MongoClient | null = null;

  const getClient = async (): Promise<MongoClient> => {
    ensureConfig();
    if (!client) {
      client = new MongoClient(config!.uri);
      await client.connect();
    }
    return client;
  };

  const getCollection = async (collection: string) => {
    const c = await getClient();
    return c.db(config!.database).collection(collection);
  };

  return {
    async insertOne(collection: string, doc: MongoDocument): Promise<{ insertedId: string }> {
      const col = await getCollection(collection);
      const result = await col.insertOne(doc);
      return { insertedId: result.insertedId.toString() };
    },

    async insertMany(collection: string, docs: MongoDocument[]): Promise<{ insertedCount: number; insertedIds: string[] }> {
      const col = await getCollection(collection);
      const result = await col.insertMany(docs);
      return {
        insertedCount: result.insertedCount,
        insertedIds: Object.values(result.insertedIds).map(id => id.toString()),
      };
    },

    async findOne<T = MongoDocument>(collection: string, filter: MongoFilter): Promise<T | null> {
      const col = await getCollection(collection);
      return col.findOne(filter) as Promise<T | null>;
    },

    async find<T = MongoDocument>(collection: string, filter: MongoFilter = {}): Promise<T[]> {
      const col = await getCollection(collection);
      return col.find(filter).toArray() as unknown as Promise<T[]>;
    },

    async updateOne(collection: string, filter: MongoFilter, update: MongoUpdate): Promise<{ matchedCount: number; modifiedCount: number }> {
      const col = await getCollection(collection);
      const result = await col.updateOne(filter, update);
      return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount };
    },

    async updateMany(collection: string, filter: MongoFilter, update: MongoUpdate): Promise<{ matchedCount: number; modifiedCount: number }> {
      const col = await getCollection(collection);
      const result = await col.updateMany(filter, update);
      return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount };
    },

    async deleteOne(collection: string, filter: MongoFilter): Promise<{ deletedCount: number }> {
      const col = await getCollection(collection);
      const result = await col.deleteOne(filter);
      return { deletedCount: result.deletedCount };
    },

    async deleteMany(collection: string, filter: MongoFilter): Promise<{ deletedCount: number }> {
      const col = await getCollection(collection);
      const result = await col.deleteMany(filter);
      return { deletedCount: result.deletedCount };
    },

    async disconnect(): Promise<void> {
      if (client) {
        await client.close();
        client = null;
      }
    },
  };
}
