import { createKafkaService } from './service.js';

jest.mock('kafkajs');
import { Kafka } from 'kafkajs';

// Plain jest.fn() at the top — return values are set in beforeEach after clearAllMocks()
const mockProducer = {
  connect: jest.fn(),
  send: jest.fn(),
  disconnect: jest.fn(),
};

const mockConsumer = {
  connect: jest.fn(),
  subscribe: jest.fn(),
  run: jest.fn(),
  disconnect: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockProducer.connect.mockResolvedValue(undefined);
  mockProducer.send.mockResolvedValue(undefined);
  mockProducer.disconnect.mockResolvedValue(undefined);
  mockConsumer.connect.mockResolvedValue(undefined);
  mockConsumer.subscribe.mockResolvedValue(undefined);
  mockConsumer.run.mockResolvedValue(undefined);
  mockConsumer.disconnect.mockResolvedValue(undefined);
  (Kafka as jest.Mock).mockImplementation(() => ({
    producer: () => mockProducer,
    consumer: () => mockConsumer,
  }));
});

describe('createKafkaService', () => {
  const config = {
    brokers: ['localhost:9092'],
    clientId: 'test-client',
  };

  describe('produce', () => {
    it('connects the producer and sends a message', async () => {
      const kafka = createKafkaService(config);
      await kafka.produce({ topic: 'test-topic', messages: [{ value: 'hello' }] });
      expect(mockProducer.connect).toHaveBeenCalledTimes(1);
      expect(mockProducer.send).toHaveBeenCalledWith({
        topic: 'test-topic',
        messages: [{ value: 'hello' }],
      });
    });

    it('reuses the producer on subsequent produce calls', async () => {
      const kafka = createKafkaService(config);
      await kafka.produce({ topic: 'test-topic', messages: [{ value: 'first' }] });
      await kafka.produce({ topic: 'test-topic', messages: [{ value: 'second' }] });
      expect(mockProducer.connect).toHaveBeenCalledTimes(1);
      expect(mockProducer.send).toHaveBeenCalledTimes(2);
    });

    it('throws when called without config', async () => {
      const kafka = createKafkaService();
      await expect(kafka.produce({ topic: 'test-topic', messages: [] })).rejects.toThrow(
        'kafka service is not configured'
      );
    });
  });

  describe('consume', () => {
    it('connects the consumer, subscribes, and runs with the provided handler', async () => {
      const handler = jest.fn();
      const kafka = createKafkaService(config);
      await kafka.consume({ topic: 'test-topic', groupId: 'test-group', handler });
      expect(mockConsumer.connect).toHaveBeenCalledTimes(1);
      expect(mockConsumer.subscribe).toHaveBeenCalledWith({
        topic: 'test-topic',
        fromBeginning: false,
      });
      expect(mockConsumer.run).toHaveBeenCalledWith({ eachMessage: handler });
    });

    it('subscribes fromBeginning when the option is true', async () => {
      const kafka = createKafkaService(config);
      await kafka.consume({ topic: 'test-topic', groupId: 'test-group', fromBeginning: true, handler: jest.fn() });
      expect(mockConsumer.subscribe).toHaveBeenCalledWith({
        topic: 'test-topic',
        fromBeginning: true,
      });
    });

    it('throws if consume is called a second time while the consumer is running', async () => {
      const kafka = createKafkaService(config);
      await kafka.consume({ topic: 'test-topic', groupId: 'test-group', handler: jest.fn() });
      await expect(
        kafka.consume({ topic: 'other-topic', groupId: 'test-group', handler: jest.fn() })
      ).rejects.toThrow('kafka consumer is already running');
    });

    it('throws when called without config', async () => {
      const kafka = createKafkaService();
      await expect(
        kafka.consume({ topic: 'test-topic', groupId: 'test-group', handler: jest.fn() })
      ).rejects.toThrow('kafka service is not configured');
    });
  });

  describe('disconnect', () => {
    it('disconnects both producer and consumer', async () => {
      const kafka = createKafkaService(config);
      await kafka.produce({ topic: 'test-topic', messages: [{ value: 'hi' }] });
      await kafka.consume({ topic: 'test-topic', groupId: 'test-group', handler: jest.fn() });
      await kafka.disconnect();
      expect(mockProducer.disconnect).toHaveBeenCalledTimes(1);
      expect(mockConsumer.disconnect).toHaveBeenCalledTimes(1);
    });

    it('is a no-op when neither producer nor consumer was created', async () => {
      const kafka = createKafkaService(config);
      await expect(kafka.disconnect()).resolves.toBeUndefined();
      expect(mockProducer.disconnect).not.toHaveBeenCalled();
      expect(mockConsumer.disconnect).not.toHaveBeenCalled();
    });

    it('resets state so consume can be called again after disconnect', async () => {
      const kafka = createKafkaService(config);
      await kafka.consume({ topic: 'test-topic', groupId: 'test-group', handler: jest.fn() });
      await kafka.disconnect();
      // Should not throw after disconnect resets consumerStarted
      await expect(
        kafka.consume({ topic: 'test-topic', groupId: 'test-group', handler: jest.fn() })
      ).resolves.toBeUndefined();
    });
  });
});
