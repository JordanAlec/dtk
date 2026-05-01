import "./load-env.js";
import { suite, SuiteRunOption } from "../index.js";

await suite()
  .sns({
    topicArn: process.env.SNS_TOPIC_ARN!,
    region: process.env.AWS_REGION!,
  })
  .step("publish-message", async (ctx) => {
    const result = await ctx.services.sns.publish(
      JSON.stringify({ event: "test", timestamp: new Date().toISOString() }),
      "Test notification"
    );
    console.log("messageId:", result.messageId);
    return result;
  })
  .run(SuiteRunOption.ThrowOnError);
