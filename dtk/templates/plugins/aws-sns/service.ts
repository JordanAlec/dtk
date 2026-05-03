import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import type { SnsConfig, PublishResult } from "./types.js";

export function createSnsService(config?: SnsConfig) {
  if (!config) throw new Error("sns service is not configured -- call .sns(config) on the suite");
  const client = new SNSClient({ region: config.region });

  return {
    publish: async (message: string, subject?: string, attributes?: Record<string, string>): Promise<PublishResult> => {
      const response = await client.send(
        new PublishCommand({
          TopicArn: config.topicArn,
          Message: message,
          ...(subject && { Subject: subject }),
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
