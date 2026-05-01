import "../load-env.js";
import { OpenAiResponse, suite, SuiteRunOption } from "../../index.js";

const MODEL = "gpt-4.1-nano";

await suite()
  .bearerToken({
    token: process.env.OPENAI_API_KEY!,
    prefix: 'Bearer'
  })
  .openAi({
    baseUrl: process.env.OPENAI_BASE_URL!,
  })
  .step("get-bearer-token",  async (ctx) => ctx.auth.bearerToken())
  .step("response-chat", async (ctx) => {
    const bearerToken = ctx.outputs["get-bearer-token"] as string;
    return ctx.services.openAi.response(bearerToken, MODEL, 
      "json_object", 
      "Hi JSON!");
  })
  .step("log-response", async (ctx) => {
    const response = ctx.outputs["response-chat"] as OpenAiResponse;
    const responseTextJson = JSON.parse(response.output[0].content[0].text);
    console.log(responseTextJson);
    return responseTextJson;
  })
  .run(SuiteRunOption.ThrowOnError);
