import "./load-env.js";
import { suite } from "../index.js";

await suite()
  .sqs({
    queueUrl: process.env.SQS_QUEUE_URL!,
    region: process.env.AWS_REGION!,
  })
  .step("send-message", async (ctx) => {
    const result = await ctx.services.sqs.sendMessage(
      JSON.stringify({ event: "test", timestamp: new Date().toISOString() })
    );
    console.log("messageId:", result.messageId);
    return result;
  })
  .run();
