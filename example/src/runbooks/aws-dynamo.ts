import "../load-env.js";
import { suite } from "../suite.js";

await suite()
  .dynamo({
    region: process.env.AWS_REGION!,
  })
  .step("create-item", async (ctx) => {
    const result = await ctx.services.dynamo.putItem(
      process.env.DYNAMO_TABLE_NAME!,
      {
        id: "user-123",
        name: "John Doe",
        email: "john@example.com",
        timestamp: new Date().toISOString(),
      }
    );
    console.log("Item created:", result);
    return result;
  })
  .step("retrieve-item", async (ctx) => {
    const result = await ctx.services.dynamo.getItem(
      process.env.DYNAMO_TABLE_NAME!,
      { id: "user-123" }
    );
    console.log("Item retrieved:", result);
    return result;
  })
  .step("update-item", async (ctx) => {
    const result = await ctx.services.dynamo.updateItem(
      process.env.DYNAMO_TABLE_NAME!,
      { id: "user-123" },
      {
        UpdateExpression: "SET #n = :n, #e = :e",
        ExpressionAttributeNames: { "#n": "name", "#e": "email" },
        ExpressionAttributeValues: {
          ":n": { S: "Jane Doe" },
          ":e": { S: "jane@example.com" },
        },
      }
    );
    console.log("Item updated:", result);
    return result;
  })
  .step("query-items", async (ctx) => {
    const result = await ctx.services.dynamo.queryItems(
      process.env.DYNAMO_TABLE_NAME!,
      {
        KeyConditionExpression: "#pk = :pk",
        ExpressionAttributeNames: { "#pk": "id" },
        ExpressionAttributeValues: { ":pk": { S: "user-123" } },
      }
    );
    console.log("Items found:", result.count);
    console.log("Items:", result.items);
    return result;
  })
  .step("scan-items", async (ctx) => {
    const result = await ctx.services.dynamo.scanItems(
      process.env.DYNAMO_TABLE_NAME!,
      { Limit: 10 }
    );
    console.log("Items scanned:", result.count);
    console.log("Items:", result.items);
    return result;
  })
  .step("delete-item", async (ctx) => {
    const result = await ctx.services.dynamo.deleteItem(
      process.env.DYNAMO_TABLE_NAME!,
      { id: "user-123" }
    );
    console.log("Item deleted:", result);
    return result;
  })
  .run("throwOnError");
