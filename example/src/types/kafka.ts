import type { Message, EachMessagePayload, KafkaConfig as KafkaJSConfig } from 'kafkajs';

export interface KafkaConfig {
  brokers: string[];
  clientId?: string;
  ssl?: KafkaJSConfig['ssl'];
  sasl?: KafkaJSConfig['sasl'];
}

export interface KafkaProduceOptions {
  topic: string;
  messages: Message[];
}

export interface KafkaConsumeOptions {
  topic: string;
  groupId: string;
  fromBeginning?: boolean;
  handler: (payload: EachMessagePayload) => Promise<void>;
}
