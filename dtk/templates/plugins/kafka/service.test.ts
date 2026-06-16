import { createKafkaService } from './service.js';

jest.mock('kafkajs');
import { Kafka } from 'kafkajs';

const mockProducer = {
  connect: jest.fn().mockResolvedValue(undefined),
  send: jest.fn(),
  disconnect: jest.fn().mockResolvedValue(undefined),
};

const mockConsumer = {
  connect: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn().mockResolvedValue(undefined),
  run: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  jest.clearAllMocks();
  (Kafka as jest.Mock).mockImplementation(() => ({
    producer: jest.fn(() => mockProducer),
    consumer: jest.fn(() => mockConsumer),
  }));
  mockProducer.connect.mockResolvedValue(undefined);
  mockProducer.send.mockResolvedValue([{ topicName: 'orders', partition: 0, errorCode: 0 }]);
  mockProducer.disconnect.mockResolvedValue(undefined);
  mockConsumer.connect.mockResolvedValue(undefined);
  mockConsumer.subscribe.mockResolvedValue(undefined);
  mockConsumer.run.mockResolvedValue(undefined);
  mockConsumer.disconnect.mockResolvedValue(undefined);
});

describe('createKafkaService', () => {
  const config = { clientId: 'dtk-test', brokers: ['localhost:9092'], groupId: 'dtk-group' };

  it('creates a Kafka client using the provided config', async () => {
    const kafka = createKafkaService(config);
    await kafka.produce('orders', { value: 'created' });
    expect(Kafka).toHaveBeenCalledWith({ clientId: 'dtk-test', brokers: ['localhost:9092'] });
  });

  it('uses default clientId when one is not provided', async () => {
    const kafka = createKafkaService({ brokers: ['localhost:9092'] });
    await kafka.produce('orders', { value: 'created' });
    expect(Kafka).toHaveBeenCalledWith({ clientId: 'dtk', brokers: ['localhost:9092'] });
  });

  it('connects producer lazily and sends a single message', async () => {
    const kafka = createKafkaService(config);
    const result = await kafka.produce('orders', { key: 'order-1', value: 'created' });
    expect(mockProducer.connect).toHaveBeenCalledTimes(1);
    expect(mockProducer.send).toHaveBeenCalledWith({
      topic: 'orders',
      messages: [{ key: 'order-1', value: 'created' }],
    });
    expect(result).toEqual([{ topicName: 'orders', partition: 0, errorCode: 0 }]);
  });

  it('sends multiple messages', async () => {
    const kafka = createKafkaService(config);
    await kafka.produce('orders', [{ value: 'created' }, { value: 'paid' }]);
    expect(mockProducer.send).toHaveBeenCalledWith({
      topic: 'orders',
      messages: [{ value: 'created' }, { value: 'paid' }],
    });
  });

  it('reuses the same producer across produce calls', async () => {
    const kafka = createKafkaService(config);
    await kafka.produce('orders', { value: 'one' });
    await kafka.produce('orders', { value: 'two' });
    expect(mockProducer.connect).toHaveBeenCalledTimes(1);
  });

  it('subscribes and runs consumer with config groupId', async () => {
    const eachMessage = jest.fn();
    const kafka = createKafkaService(config);
    await kafka.consume({ topic: 'orders', fromBeginning: true, eachMessage });
    expect(mockConsumer.connect).toHaveBeenCalledTimes(1);
    expect(mockConsumer.subscribe).toHaveBeenCalledWith({ topic: 'orders', fromBeginning: true });
    expect(mockConsumer.run).toHaveBeenCalledWith({ eachMessage: expect.any(Function) });
  });

  it('maps kafkajs messages before passing them to callback', async () => {
    const eachMessage = jest.fn();
    const kafka = createKafkaService(config);
    await kafka.consume({ topic: 'orders', eachMessage });

    const runArg = mockConsumer.run.mock.calls[0][0];
    await runArg.eachMessage({
      topic: 'orders',
      partition: 2,
      message: {
        offset: '7',
        key: Buffer.from('order-1'),
        value: Buffer.from('created'),
        headers: { source: Buffer.from('test') },
      },
    });

    expect(eachMessage).toHaveBeenCalledWith({
      topic: 'orders',
      partition: 2,
      offset: '7',
      key: 'order-1',
      value: 'created',
      headers: { source: 'test' },
    });
  });

  it('allows groupId to be provided per consume call', async () => {
    const kafka = createKafkaService({ brokers: ['localhost:9092'] });
    await kafka.consume({ topic: 'orders', groupId: 'custom-group', eachMessage: jest.fn() });
    const instance = (Kafka as jest.Mock).mock.results[0].value;
    expect(instance.consumer).toHaveBeenCalledWith({ groupId: 'custom-group' });
  });

  it('throws when consuming without a groupId', async () => {
    const kafka = createKafkaService({ brokers: ['localhost:9092'] });
    await expect(kafka.consume({ topic: 'orders', eachMessage: jest.fn() })).rejects.toThrow('kafka consumer groupId is required');
  });

  it('disconnects producer and consumer and clears clients', async () => {
    const kafka = createKafkaService(config);
    await kafka.produce('orders', { value: 'created' });
    await kafka.consume({ topic: 'orders', eachMessage: jest.fn() });
    await kafka.disconnect();
    expect(mockConsumer.disconnect).toHaveBeenCalledTimes(1);
    expect(mockProducer.disconnect).toHaveBeenCalledTimes(1);
  });

  it('disconnect is a no-op when clients were never connected', async () => {
    const kafka = createKafkaService(config);
    await expect(kafka.disconnect()).resolves.toBeUndefined();
  });

  it('throws when any method is called without config', async () => {
    const kafka = createKafkaService();
    await expect(kafka.produce('orders', { value: 'created' })).rejects.toThrow('kafka service is not configured');
  });
});
