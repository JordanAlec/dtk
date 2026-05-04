import "../load-env.js";
import { suite } from "../suite.js";

await suite()
  .openAi({
    baseUrl: "https://api.openai.com",
  })
  .step("list-models", async (ctx) => {
    const token = `Bearer ${process.env.OPENAI_API_KEY!}`;
    const result = await ctx.services.openAi.listModels(token);
    console.log(`Available models (${result.data.length}):`);
    result.data.slice(0, 5).forEach((m) => console.log(" -", m.id));
    return result;
  })
  .step("send-response", async (ctx) => {
    const token = `Bearer ${process.env.OPENAI_API_KEY!}`;
    const result = await ctx.services.openAi.response(
      token,
      "gpt-4o-mini",
      "text",
      "Say hello in one sentence."
    );
    const text = result.output[0]?.content[0]?.text;
    console.log("response:", text);
    return result;
  })
  .run("throwOnError");
