import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import type { SqsConfig, SendMessageResult } from "./types.js";

export function createSqsService(config?: SqsConfig) {
  return {
    sendMessage: async (body: string, attributes?: Record<string, string>): Promise<SendMessageResult> => {
      const client = new SQSClient({ region: config!.region });
      const response = await client.send(
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
      return { messageId: response.MessageId! };
    },
  };
}
