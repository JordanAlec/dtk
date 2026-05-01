export interface SqsConfig {
  queueUrl: string;
  region: string;
}

export interface SendMessageResult {
  messageId: string;
}

export interface SnsConfig {
  topicArn: string;
  region: string;
}

export interface PublishResult {
  messageId: string;
}
