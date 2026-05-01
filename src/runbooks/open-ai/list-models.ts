import "../load-env.js";
import { OpenAiListModels, suite, SuiteRunOption } from "../../index.js";


await suite()
  .bearerToken({
    token: process.env.OPENAI_API_KEY!,
    prefix: 'Bearer'
  })
  .openAi({
    baseUrl: process.env.OPENAI_BASE_URL!,
  })
  .step("get-bearer-token",  async (ctx) => ctx.auth.bearerToken())
  .step("get-models", async (ctx) => {
    const bearerToken = ctx.outputs["get-bearer-token"] as string;
    return ctx.services.openAi.listModels(bearerToken);
  })
  .step("log-models", async (ctx) => {
    const response = ctx.outputs["get-models"] as OpenAiListModels ;
    response?.data.forEach((model) => console.log(`Id: ${model.id}`));
  })
  .run(SuiteRunOption.ThrowOnError);
