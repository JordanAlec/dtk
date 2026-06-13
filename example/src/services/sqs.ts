import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import type { SqsConfig, SendMessageResult } from "../types/aws-sqs.js";

export function createSqsService(config?: SqsConfig) {
  const ensureConfig = () => {
    if (!config) throw new Error("sqs service is not configured -- call .sqs(config) on the suite");
  };
  const client = config ? new SQSClient({ region: config.region }) : null;

  return {
    sendMessage: async (body: string, attributes?: Record<string, string>): Promise<SendMessageResult> => {
      ensureConfig();
      const response = await client!.send(
        new SendMessageCommand({
          QueueUrl: config!.queueUrl,
          MessageBody: body,
          ...(attributes && {
            MessageAttributes: Object.fromEntries(
              Object.entries(attributes).map(([k, v]) => [k, { DataType: "String", StringValue: v }])
            ),
          }),
        })
      );
      return { messageId: response.MessageId ?? null };
    },
  };
}
