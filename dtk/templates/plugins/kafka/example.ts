import "../load-env.js";
import { suite } from "../suite.js";

await suite()
  .kafka({
    brokers: process.env.KAFKA_BROKERS!.split(",").map((b) => b.trim()).filter(Boolean),
    clientId: process.env.KAFKA_CLIENT_ID ?? "dtk-client",
  })
  .step("produce-message", async (ctx) => {
    await ctx.services.kafka.produce({
      topic: "example-topic",
      messages: [{ value: "hello from dtk" }],
    });
    console.log("message produced to example-topic");
  })
  .step("consume-message", async (ctx) => {
    await ctx.services.kafka.consume({
      topic: "example-topic",
      groupId: "dtk-group",
      fromBeginning: true,
      handler: async (payload) => {
        console.log(
          "received:",
          payload.message.value?.toString(),
          "partition:",
          payload.partition,
          "offset:",
          payload.message.offset
        );
      },
    });
  })
  .step("disconnect", async (ctx) => {
    await ctx.services.kafka.disconnect();
  })
  .run("stopOnError");
