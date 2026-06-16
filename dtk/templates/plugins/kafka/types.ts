export interface KafkaConfig {
  clientId?: string;
  brokers: string[];
  groupId?: string;
}

export interface KafkaMessage {
  key?: string | Buffer | null;
  value: string | Buffer | null;
  headers?: Record<string, string | Buffer | string[] | undefined>;
  partition?: number;
}

export interface KafkaConsumedMessage {
  topic: string;
  partition: number;
  offset: string;
  key: string | null;
  value: string | null;
  headers: Record<string, string>;
}

export interface KafkaConsumeOptions {
  topic: string;
  fromBeginning?: boolean;
  groupId?: string;
  eachMessage: (message: KafkaConsumedMessage) => Promise<void> | void;
}

export interface KafkaProduceResult {
  topicName: string;
  partition: number;
  errorCode: number;
  baseOffset?: string;
  logAppendTime?: string;
  logStartOffset?: string;
}
