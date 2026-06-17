import { createMongoService } from './service.js';

jest.mock('mongodb');
import { MongoClient } from 'mongodb';

const mockToArray = jest.fn();
const mockInsertOne = jest.fn();
const mockInsertMany = jest.fn();
const mockFindOne = jest.fn();
const mockFind = jest.fn();
const mockUpdateOne = jest.fn();
const mockUpdateMany = jest.fn();
const mockDeleteOne = jest.fn();
const mockDeleteMany = jest.fn();

const mockCollection = {
  insertOne: mockInsertOne,
  insertMany: mockInsertMany,
  findOne: mockFindOne,
  find: mockFind,
  updateOne: mockUpdateOne,
  updateMany: mockUpdateMany,
  deleteOne: mockDeleteOne,
  deleteMany: mockDeleteMany,
};

const mockDb = {
  collection: jest.fn().mockReturnValue(mockCollection),
};

const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockClose = jest.fn().mockResolvedValue(undefined);

const mockClientInstance = {
  connect: mockConnect,
  close: mockClose,
  db: jest.fn().mockReturnValue(mockDb),
};

beforeEach(() => {
  jest.clearAllMocks();
  (MongoClient as unknown as jest.Mock).mockImplementation(() => mockClientInstance);
  mockConnect.mockResolvedValue(undefined);
  mockClose.mockResolvedValue(undefined);
  mockFind.mockReturnValue({ toArray: mockToArray });
  mockDb.collection.mockReturnValue(mockCollection);
  mockClientInstance.db.mockReturnValue(mockDb);
});

describe('createMongoService', () => {
  describe('configuration', () => {
    it('throws when any method is called without config', async () => {
      const mongo = createMongoService();
      await expect(mongo.find('users')).rejects.toThrow('mongodb service is not configured');
    });

    it('connects to MongoDB with the provided URI on first call', async () => {
      mockToArray.mockResolvedValue([]);
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      await mongo.find('users');
      expect(MongoClient).toHaveBeenCalledWith('mongodb://localhost:27017');
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('reuses the same client across multiple calls', async () => {
      mockToArray.mockResolvedValue([]);
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      await mongo.find('users');
      await mongo.find('accounts');
      expect(MongoClient).toHaveBeenCalledTimes(1);
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('uses the configured database name', async () => {
      mockToArray.mockResolvedValue([]);
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'mydb' });
      await mongo.find('users');
      expect(mockClientInstance.db).toHaveBeenCalledWith('mydb');
    });
  });

  describe('insertOne', () => {
    it('returns the insertedId as a string', async () => {
      const fakeId = { toString: () => 'abc123' };
      mockInsertOne.mockResolvedValue({ insertedId: fakeId });
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      const result = await mongo.insertOne('users', { name: 'Alice' });
      expect(result).toEqual({ insertedId: 'abc123' });
    });

    it('passes the document to the collection', async () => {
      const fakeId = { toString: () => '1' };
      mockInsertOne.mockResolvedValue({ insertedId: fakeId });
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      const doc = { name: 'Bob', email: 'bob@example.com' };
      await mongo.insertOne('users', doc);
      expect(mockInsertOne).toHaveBeenCalledWith(doc);
    });
  });

  describe('insertMany', () => {
    it('returns insertedCount and insertedIds as strings', async () => {
      const fakeIds = { 0: { toString: () => 'id1' }, 1: { toString: () => 'id2' } };
      mockInsertMany.mockResolvedValue({ insertedCount: 2, insertedIds: fakeIds });
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      const result = await mongo.insertMany('users', [{ name: 'Alice' }, { name: 'Bob' }]);
      expect(result).toEqual({ insertedCount: 2, insertedIds: ['id1', 'id2'] });
    });

    it('passes the documents array to the collection', async () => {
      const fakeIds = { 0: { toString: () => 'id1' } };
      mockInsertMany.mockResolvedValue({ insertedCount: 1, insertedIds: fakeIds });
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      const docs = [{ name: 'Charlie' }];
      await mongo.insertMany('users', docs);
      expect(mockInsertMany).toHaveBeenCalledWith(docs);
    });
  });

  describe('findOne', () => {
    it('returns the matched document', async () => {
      const doc = { name: 'Alice', email: 'alice@example.com' };
      mockFindOne.mockResolvedValue(doc);
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      const result = await mongo.findOne('users', { name: 'Alice' });
      expect(result).toEqual(doc);
    });

    it('returns null when no document matches', async () => {
      mockFindOne.mockResolvedValue(null);
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      const result = await mongo.findOne('users', { name: 'nobody' });
      expect(result).toBeNull();
    });

    it('passes the filter to the collection', async () => {
      mockFindOne.mockResolvedValue(null);
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      const filter = { active: true };
      await mongo.findOne('users', filter);
      expect(mockFindOne).toHaveBeenCalledWith(filter);
    });
  });

  describe('find', () => {
    it('returns all matched documents as an array', async () => {
      const docs = [{ name: 'Alice' }, { name: 'Bob' }];
      mockToArray.mockResolvedValue(docs);
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      const result = await mongo.find('users', { active: true });
      expect(result).toEqual(docs);
    });

    it('defaults filter to empty object when omitted', async () => {
      mockToArray.mockResolvedValue([]);
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      await mongo.find('users');
      expect(mockFind).toHaveBeenCalledWith({});
    });

    it('calls toArray on the cursor', async () => {
      mockToArray.mockResolvedValue([]);
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      await mongo.find('users', {});
      expect(mockToArray).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateOne', () => {
    it('returns matchedCount and modifiedCount', async () => {
      mockUpdateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      const result = await mongo.updateOne('users', { name: 'Alice' }, { $set: { active: false } });
      expect(result).toEqual({ matchedCount: 1, modifiedCount: 1 });
    });

    it('returns modifiedCount of 0 when filter matches but value is unchanged', async () => {
      mockUpdateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 0 });
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      const result = await mongo.updateOne('users', { name: 'Alice' }, { $set: { active: true } });
      expect(result).toEqual({ matchedCount: 1, modifiedCount: 0 });
    });

    it('passes filter and update to the collection', async () => {
      mockUpdateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      const filter = { name: 'Alice' };
      const update = { $set: { active: false } };
      await mongo.updateOne('users', filter, update);
      expect(mockUpdateOne).toHaveBeenCalledWith(filter, update);
    });
  });

  describe('updateMany', () => {
    it('returns matchedCount and modifiedCount', async () => {
      mockUpdateMany.mockResolvedValue({ matchedCount: 3, modifiedCount: 3 });
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      const result = await mongo.updateMany('users', { active: true }, { $set: { active: false } });
      expect(result).toEqual({ matchedCount: 3, modifiedCount: 3 });
    });

    it('passes filter and update to the collection', async () => {
      mockUpdateMany.mockResolvedValue({ matchedCount: 2, modifiedCount: 2 });
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      const filter = { active: false };
      const update = { $set: { archived: true } };
      await mongo.updateMany('users', filter, update);
      expect(mockUpdateMany).toHaveBeenCalledWith(filter, update);
    });
  });

  describe('deleteOne', () => {
    it('returns deletedCount', async () => {
      mockDeleteOne.mockResolvedValue({ deletedCount: 1 });
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      const result = await mongo.deleteOne('users', { name: 'Alice' });
      expect(result).toEqual({ deletedCount: 1 });
    });

    it('returns deletedCount of 0 when no document matches', async () => {
      mockDeleteOne.mockResolvedValue({ deletedCount: 0 });
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      const result = await mongo.deleteOne('users', { name: 'nobody' });
      expect(result).toEqual({ deletedCount: 0 });
    });

    it('passes the filter to the collection', async () => {
      mockDeleteOne.mockResolvedValue({ deletedCount: 1 });
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      const filter = { name: 'Bob' };
      await mongo.deleteOne('users', filter);
      expect(mockDeleteOne).toHaveBeenCalledWith(filter);
    });
  });

  describe('deleteMany', () => {
    it('returns deletedCount', async () => {
      mockDeleteMany.mockResolvedValue({ deletedCount: 5 });
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      const result = await mongo.deleteMany('users', { active: false });
      expect(result).toEqual({ deletedCount: 5 });
    });

    it('passes the filter to the collection', async () => {
      mockDeleteMany.mockResolvedValue({ deletedCount: 2 });
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      const filter = { archived: true };
      await mongo.deleteMany('users', filter);
      expect(mockDeleteMany).toHaveBeenCalledWith(filter);
    });
  });

  describe('disconnect', () => {
    it('closes the client and clears the reference', async () => {
      mockToArray.mockResolvedValue([]);
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      await mongo.find('users');
      await mongo.disconnect();
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('is a no-op when never connected', async () => {
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      await expect(mongo.disconnect()).resolves.toBeUndefined();
      expect(mockClose).not.toHaveBeenCalled();
    });

    it('creates a new client after reconnecting following disconnect', async () => {
      mockToArray.mockResolvedValue([]);
      const mongo = createMongoService({ uri: 'mongodb://localhost:27017', database: 'test' });
      await mongo.find('users');
      await mongo.disconnect();
      await mongo.find('users');
      expect(MongoClient).toHaveBeenCalledTimes(2);
      expect(mockConnect).toHaveBeenCalledTimes(2);
    });
  });
});
