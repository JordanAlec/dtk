export interface SnsConfig {
  topicArn: string;
  region: string;
}

export interface PublishResult {
  messageId: string | null;
}
