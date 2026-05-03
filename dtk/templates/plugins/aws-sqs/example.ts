import "../load-env.js";
import { suite, SuiteRunOption } from "../suite.js";

await suite()
  .sqs({
    queueUrl: process.env.SQS_QUEUE_URL!,
    region: process.env.AWS_REGION!,
  })
  .step("send-message", async (ctx) => {
    const result = await ctx.services.sqs.sendMessage("Hello from dtk", {
      source: "dtk-example",
    });
    console.log("messageId:", result.messageId);
    return result;
  })
  .run(SuiteRunOption.ThrowOnError);
