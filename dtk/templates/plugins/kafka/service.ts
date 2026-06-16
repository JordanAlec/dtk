import { Kafka, type Consumer, type Producer } from "kafkajs";
import type { KafkaConfig, KafkaConsumeOptions, KafkaMessage, KafkaProduceResult } from "./types.js";

export function createKafkaService(config?: KafkaConfig) {
  const ensureConfig = () => {
    if (!config) throw new Error("kafka service is not configured -- call .kafka(config) on the suite");
  };

  let kafka: Kafka | null = null;
  let producer: Producer | null = null;
  let consumer: Consumer | null = null;

  const getKafka = () => {
    ensureConfig();
    if (!kafka) {
      kafka = new Kafka({
        clientId: config!.clientId ?? "dtk",
        brokers: config!.brokers,
      });
    }
    return kafka;
  };

  const getProducer = async () => {
    if (!producer) {
      producer = getKafka().producer();
      await producer.connect();
    }
    return producer;
  };

  const getConsumer = async (groupId?: string) => {
    const resolvedGroupId = groupId ?? config?.groupId;
    if (!resolvedGroupId) {
      throw new Error("kafka consumer groupId is required -- provide config.groupId or consume({ groupId })");
    }
    if (!consumer) {
      consumer = getKafka().consumer({ groupId: resolvedGroupId });
      await consumer.connect();
    }
    return consumer;
  };

  return {
    produce: async (topic: string, messages: KafkaMessage | KafkaMessage[]): Promise<KafkaProduceResult[]> => {
      const p = await getProducer();
      const batch = Array.isArray(messages) ? messages : [messages];
      return p.send({ topic, messages: batch });
    },

    consume: async (options: KafkaConsumeOptions): Promise<void> => {
      const c = await getConsumer(options.groupId);
      await c.subscribe({ topic: options.topic, fromBeginning: options.fromBeginning ?? false });
      await c.run({
        eachMessage: async ({ topic, partition, message }) => {
          await options.eachMessage({
            topic,
            partition,
            offset: message.offset,
            key: message.key?.toString() ?? null,
            value: message.value?.toString() ?? null,
            headers: Object.fromEntries(
              Object.entries(message.headers ?? {}).map(([key, value]) => [
                key,
                Array.isArray(value)
                  ? value.map((v) => v?.toString() ?? "").join(",")
                  : value?.toString() ?? "",
              ])
            ),
          });
        },
      });
    },

    disconnect: async (): Promise<void> => {
      if (consumer) {
        await consumer.disconnect();
        consumer = null;
      }
      if (producer) {
        await producer.disconnect();
        producer = null;
      }
      kafka = null;
    },
  };
}
