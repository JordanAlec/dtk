import "../load-env.js";
import { suite } from "../suite.js";

await suite()
  .sns({
    topicArn: process.env.SNS_TOPIC_ARN!,
    region: process.env.AWS_REGION!,
  })
  .step("publish-message", async (ctx) => {
    const result = await ctx.services.sns.publish(
      "Hello from dtk",
      "dtk example notification",
      { source: "dtk-example" }
    );
    console.log("messageId:", result.messageId);
    return result;
  })
  .run("throwOnError");
