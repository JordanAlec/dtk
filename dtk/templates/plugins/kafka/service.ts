import { Kafka } from 'kafkajs';
import type { Producer, Consumer } from 'kafkajs';
import type { KafkaConfig, KafkaProduceOptions, KafkaConsumeOptions } from './types.js';

export function createKafkaService(config?: KafkaConfig) {
  const ensureConfig = () => {
    if (!config) throw new Error('kafka service is not configured -- call .kafka(config) on the suite');
  };

  let producer: Producer | null = null;
  let consumer: Consumer | null = null;
  let consumerStarted = false;

  const getProducer = async (): Promise<Producer> => {
    ensureConfig();
    if (!producer) {
      const kafka = new Kafka({ brokers: config!.brokers, clientId: config!.clientId, ssl: config!.ssl, sasl: config!.sasl });
      producer = kafka.producer();
      await producer.connect();
    }
    return producer;
  };

  const getConsumer = async (groupId: string): Promise<Consumer> => {
    ensureConfig();
    if (!consumer) {
      const kafka = new Kafka({ brokers: config!.brokers, clientId: config!.clientId, ssl: config!.ssl, sasl: config!.sasl });
      consumer = kafka.consumer({ groupId });
      await consumer.connect();
    }
    return consumer;
  };

  return {
    produce: async (options: KafkaProduceOptions): Promise<void> => {
      const p = await getProducer();
      await p.send({ topic: options.topic, messages: options.messages });
    },

    consume: async (options: KafkaConsumeOptions): Promise<void> => {
      if (consumerStarted) {
        throw new Error(
          'kafka consumer is already running -- call disconnect() before consuming again'
        );
      }
      const c = await getConsumer(options.groupId);
      await c.subscribe({ topic: options.topic, fromBeginning: options.fromBeginning ?? false });
      await c.run({ eachMessage: options.handler });
      consumerStarted = true;
    },

    disconnect: async (): Promise<void> => {
      if (producer) {
        await producer.disconnect();
        producer = null;
      }
      if (consumer) {
        await consumer.disconnect();
        consumer = null;
      }
      consumerStarted = false;
    },
  };
}
