import "../load-env.js";
import { suite } from "../suite.js";

await suite()
  .openAi({
    apiKey: process.env.OPENAI_API_KEY!,
  })
  .step("list-models", async (ctx) => {
    const result = await ctx.services.openAi.listModels();
    console.log(`Available models (${result.data.length}):`);
    result.data.slice(0, 5).forEach((m) => console.log(" -", m.id));
    return result;
  })
  .step("send-response", async (ctx) => {
    const result = await ctx.services.openAi.response(
      "gpt-4.1-nano",
      "text",
      "Say hello in one sentence."
    );
    const firstOutput = result.output[0];
    const firstContent = firstOutput?.type === 'message' ? firstOutput.content[0] : undefined;
    const text = firstContent?.type === 'output_text' ? firstContent.text : undefined;
    console.log("response:", text);
    return result;
  })
  .run("throwOnError");
