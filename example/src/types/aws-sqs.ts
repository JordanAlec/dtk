export interface SqsConfig {
  queueUrl: string;
  region: string;
}

export interface SendMessageResult {
  messageId: string | null;
}
